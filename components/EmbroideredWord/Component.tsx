import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export type StitchStyle = 'filled' | 'outline';

export interface EmbroideredWordProps {
  text?: string;
  threadColor?: string;
  outlineColor?: string;
  fabricColor?: string;
  stitchStyle?: StitchStyle;
  resewOnHover?: boolean;
  className?: string;
}

type RGB = [number, number, number];
type Pt = [number, number];
type Tone = 0 | 1;
type Wrinkle = { x: number; y: number; nx: number; ny: number; len: number };
type Link = { ax: number; ay: number; bx: number; by: number; mx: number; my: number; ang: number; glyph: number; tone: Tone; sew: boolean; v: number; wr?: Wrinkle };
type Box = { x0: number; y0: number; x1: number; y1: number };
type Palette = { base: RGB; shade: RGB; hi: RGB };
type Scene = {
  w: number;
  h: number;
  dpr: number;
  row: number;
  needleLen: number;
  links: Link[];
  boxes: Box[];
  glyphLinks: number[][];
  firstSew: number;
  lastSew: number;
  spool: Pt;
  denim: HTMLCanvasElement;
  sprites: HTMLCanvasElement[][][];
  spriteSize: number;
  dark: HTMLCanvasElement;
  light: HTMLCanvasElement;
  beds: [HTMLCanvasElement, HTMLCanvasElement];
  tones: [Palette, Palette];
};
type Node = { x: number; y: number; px: number; py: number };
type Fiber = { x: number; y: number; vx: number; vy: number; a: number; life: number };
type Phase = 'idle' | 'enter' | 'sew' | 'finish' | 'done';

const TAU = Math.PI * 2;
const ANGLES = 32;
const VARIANTS = [0.93, 1, 1.06];
const TIGHTEN_MS = 300;
const LIGHT: Pt = [-0.5, -0.866];
const NEEDLE_AXIS: Pt = [0.38, -0.925];
const ROPE_EYE = 6;
const ROPE_END = 26;
const HELP = 'Chain-stitched lettering on denim. Press Enter to sew the whole word again.';
const HELP_RESEW = 'Chain-stitched lettering on denim. Hover or tap a letter to sew it again; press Enter to sew the whole word again.';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const scaleRGB = (a: RGB, k: number): RGB => [clamp(a[0] * k, 0, 255), clamp(a[1] * k, 0, 255), clamp(a[2] * k, 0, 255)];
const rgba = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const rot = (p: Pt, a: number): Pt => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
const makeCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};
const ctx2d = (c: HTMLCanvasElement) => c.getContext('2d') as CanvasRenderingContext2D;

function parseColor(value: string, fallback: string): RGB {
  const c = ctx2d(makeCanvas(1, 1));
  c.fillStyle = fallback;
  c.fillStyle = value.trim() || fallback;
  c.fillRect(0, 0, 1, 1);
  const d = c.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

const palette = (base: RGB): Palette => ({ base, shade: mix(base, [20, 18, 30], 0.42), hi: mix(base, [255, 252, 242], 0.7) });

/* ---------- lettering layout ---------- */

type Placed = { ch: string; x: number; y: number; rot: number; cx: number; cy: number };

function layoutText(c: CanvasRenderingContext2D, text: string, family: string, availW: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const maxF = clamp(availW * 0.3, 44, 210);
  const minF = clamp(availW * 0.075, 30, 62);
  let f = maxF;
  let lines: string[] = [];
  const setFont = (size: number) => {
    c.font = `800 ${size}px ${family}`;
  };
  const width = (s: string) => {
    let wsum = 0;
    for (const ch of Array.from(s)) wsum += c.measureText(ch).width + f * 0.012;
    return wsum - f * 0.012;
  };
  for (let i = 0; i < 40 && words.length; i++) {
    setFont(f);
    const widest = Math.max(...words.map(width));
    if (widest > availW) {
      f = (f * availW * 0.97) / widest;
      continue;
    }
    lines = [];
    let cur = '';
    for (const wd of words) {
      const next = cur ? `${cur} ${wd}` : wd;
      if (cur && width(next) > availW) {
        lines.push(cur);
        cur = wd;
      } else cur = next;
    }
    if (cur) lines.push(cur);
    if (lines.length <= 3 || f <= minF) break;
    f = Math.max(minF, f * 0.9);
  }
  setFont(f);
  const asc = c.measureText('Hdlkb').actualBoundingBoxAscent || f * 0.74;
  const desc = c.measureText('gjpqy').actualBoundingBoxDescent || f * 0.22;
  const sag = f * 0.15;
  const lineW = lines.map(width);
  const maxW = Math.max(1, ...lineW);
  const R = (maxW * maxW) / (8 * sag) + sag / 2;
  const adv = asc + desc * 0.55 + f * 0.1 + sag * 0.6;
  const blockH = asc + (lines.length - 1) * adv + desc + sag * 0.6;
  const placed: Placed[] = [];
  lines.forEach((line, li) => {
    const yb = asc + li * adv;
    let x = -lineW[li] / 2;
    for (const ch of Array.from(line)) {
      const cw = c.measureText(ch).width;
      const u = x + cw / 2;
      const th = u / R;
      const px = R * Math.sin(th);
      const py = yb + R * (1 - Math.cos(th));
      if (ch.trim()) {
        const [ox, oy] = rot([0, -asc * 0.45], th);
        placed.push({ ch, x: px, y: py, rot: th, cx: px + ox, cy: py + oy });
      }
      x += cw + f * 0.012;
    }
  });
  return { font: f, placed, blockH };
}

/* ---------- distance field + contours ---------- */

function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -1e20;
  z[1] = 1e20;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = 1e20;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

function distanceField(alpha: Uint8ClampedArray, gw: number, gh: number) {
  const grid = new Float32Array(gw * gh);
  for (let i = 0; i < gw * gh; i++) grid[i] = alpha[i * 4 + 3] > 127 ? 1e20 : 0;
  const n = Math.max(gw, gh);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < gw; x++) {
    for (let y = 0; y < gh; y++) f[y] = grid[y * gw + x];
    edt1d(f, gh, d, v, z);
    for (let y = 0; y < gh; y++) grid[y * gw + x] = d[y];
  }
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) f[x] = grid[y * gw + x];
    edt1d(f, gw, d, v, z);
    for (let x = 0; x < gw; x++) grid[y * gw + x] = Math.sqrt(d[x]);
  }
  return grid;
}

function isoContours(F: Float32Array, gw: number, gh: number, lv: number): Pt[][] {
  const adj = new Map<number, number[]>();
  const link = (a: number, b: number) => {
    (adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
    (adj.get(b) ?? adj.set(b, []).get(b)!).push(a);
  };
  for (let y = 0; y < gh - 1; y++) {
    for (let x = 0; x < gw - 1; x++) {
      const i = y * gw + x;
      const idx = (F[i] > lv ? 8 : 0) | (F[i + 1] > lv ? 4 : 0) | (F[i + gw + 1] > lv ? 2 : 0) | (F[i + gw] > lv ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const T = i * 2;
      const B = (i + gw) * 2;
      const L = i * 2 + 1;
      const R = (i + 1) * 2 + 1;
      const center = (F[i] + F[i + 1] + F[i + gw] + F[i + gw + 1]) / 4 > lv;
      switch (idx) {
        case 1: case 14: link(L, B); break;
        case 2: case 13: link(B, R); break;
        case 3: case 12: link(L, R); break;
        case 4: case 11: link(T, R); break;
        case 6: case 9: link(T, B); break;
        case 7: case 8: link(L, T); break;
        case 5:
          if (center) { link(T, L); link(B, R); } else { link(T, R); link(L, B); }
          break;
        case 10:
          if (center) { link(T, R); link(L, B); } else { link(T, L); link(B, R); }
          break;
      }
    }
  }
  const pt = (e: number): Pt => {
    const cell = e >> 1;
    const x = cell % gw;
    const y = (cell - x) / gw;
    const v0 = F[cell];
    const v1 = e & 1 ? F[cell + gw] : F[cell + 1];
    const t = clamp((lv - v0) / (v1 - v0 || 1), 0, 1);
    return e & 1 ? [x, y + t] : [x + t, y];
  };
  const seen = new Set<number>();
  const polys: Pt[][] = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const poly: Pt[] = [];
    let prev = -1;
    let cur = start;
    for (;;) {
      seen.add(cur);
      poly.push(pt(cur));
      const ns = adj.get(cur)!;
      const nxt = ns[0] === prev ? ns[1] : ns[0];
      if (nxt === undefined || seen.has(nxt)) break;
      prev = cur;
      cur = nxt;
    }
    if (poly.length > 6) polys.push(poly);
  }
  return polys;
}

function resampleClosed(poly: Pt[], step: number): Pt[] {
  const n = poly.length;
  const cum = [0];
  for (let i = 1; i <= n; i++) {
    const a = poly[i - 1];
    const b = poly[i % n];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[n];
  const count = Math.max(3, Math.round(total / step));
  const out: Pt[] = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const d = (k / count) * total;
    while (cum[j + 1] < d) j++;
    const a = poly[j];
    const b = poly[(j + 1) % n];
    const t = (d - cum[j]) / (cum[j + 1] - cum[j] || 1);
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  for (let pass = 0; pass < 2; pass++) {
    const src = out.map((p) => [...p] as Pt);
    for (let k = 0; k < count; k++) {
      const p = src[(k + count - 1) % count];
      const q = src[(k + 1) % count];
      out[k] = [(p[0] + 2 * src[k][0] + q[0]) / 4, (p[1] + 2 * src[k][1] + q[1]) / 4];
    }
  }
  return out;
}

/* ---------- fabric ---------- */

function makeDenim(w: number, h: number, dpr: number, fab: RGB, seamY: (x: number) => number, row: number, top: Palette) {
  const W = Math.ceil(w * dpr);
  const H = Math.ceil(h * dpr);
  const cv = makeCanvas(W, H);
  const c = ctx2d(cv);
  const img = c.createImageData(W, H);
  const d = img.data;
  const p = 2.4 * dpr;
  const weft = mix(fab, [226, 223, 212], 0.56);
  const cols = Math.ceil(W / p) + 2;
  const rowsN = Math.ceil(H / p) + 2;
  const colTone = new Float32Array(cols);
  const colPhase = new Float32Array(cols);
  const colFreq = new Float32Array(cols);
  const rowTone = new Float32Array(rowsN);
  for (let i = 0; i < cols; i++) {
    colTone[i] = 0.84 + 0.28 * hash(i * 1.7) ** 1.6;
    colPhase[i] = hash(i * 3.1) * TAU;
    colFreq[i] = (0.006 + 0.02 * hash(i * 5.3)) / dpr;
  }
  for (let j = 0; j < rowsN; j++) rowTone[j] = 0.88 + 0.18 * hash(j * 2.9 + 7);
  const seam = new Float32Array(W);
  for (let x = 0; x < W; x++) seam[x] = seamY(x / dpr) * dpr;
  let seed = 1234567;
  let o = 0;
  for (let y = 0; y < H; y++) {
    const yj = y / p;
    const j = Math.floor(yj);
    const fy = yj - j;
    const weftShade = (0.5 + 0.55 * Math.sin(Math.PI * fy)) * rowTone[j];
    for (let x = 0; x < W; x++, o += 4) {
      const xi = x / p;
      const i = Math.floor(xi);
      const fx = xi - i;
      const yoke = y < seam[x];
      const m = yoke ? (((i - j) % 4) + 4) % 4 : (i + j) % 4;
      seed = (seed * 1664525 + 1013904223) | 0;
      const n = ((seed >>> 24) / 255 - 0.5) * 16;
      if (m === 0) {
        d[o] = weft[0] * weftShade + n;
        d[o + 1] = weft[1] * weftShade + n;
        d[o + 2] = weft[2] * weftShade + n;
      } else {
        const along = ((yoke ? 3 - m : m - 1) + fy) / 3;
        const slub = 0.9 + 0.1 * Math.sin(y * colFreq[i] + colPhase[i]);
        const s = (0.52 + 0.56 * Math.sin(Math.PI * fx)) * (0.76 + 0.28 * Math.sin(Math.PI * along)) * colTone[i] * slub;
        d[o] = fab[0] * s + n;
        d[o + 1] = fab[1] * s + n;
        d[o + 2] = fab[2] * s + n;
      }
      d[o + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);

  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const seamPath = (off: number) => {
    c.beginPath();
    for (let x = -4; x <= w + 4; x += 6) c.lineTo(x, seamY(x) + off);
  };

  c.save();
  seamPath(0);
  c.lineTo(w + 4, -4);
  c.lineTo(-4, -4);
  c.closePath();
  c.globalCompositeOperation = 'multiply';
  c.fillStyle = 'rgb(214,220,234)';
  c.fill();
  c.restore();

  c.globalCompositeOperation = 'screen';
  for (let k = 0; k < 7; k++) {
    c.save();
    c.translate(w * (0.08 + 0.84 * hash(k * 9.1)), h * (0.15 + 0.8 * hash(k * 4.7)));
    c.rotate(-0.5 + 0.25 * hash(k * 2.3));
    c.scale(1, 0.12 + 0.1 * hash(k));
    const r = w * (0.12 + 0.16 * hash(k * 6.6));
    const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, 'rgba(120,150,210,0.1)');
    g.addColorStop(1, 'rgba(120,150,210,0)');
    c.fillStyle = g;
    c.fillRect(-r, -r, r * 2, r * 2);
    c.restore();
  }
  const key = c.createRadialGradient(w * 0.26, -h * 0.1, 0, w * 0.26, -h * 0.1, Math.max(w, h) * 0.95);
  key.addColorStop(0, 'rgba(150,178,235,0.2)');
  key.addColorStop(1, 'rgba(150,178,235,0)');
  c.fillStyle = key;
  c.fillRect(0, 0, w, h);

  c.globalCompositeOperation = 'multiply';
  const vig = c.createRadialGradient(w * 0.5, h * 0.48, Math.min(w, h) * 0.3, w * 0.5, h * 0.48, Math.hypot(w, h) * 0.6);
  vig.addColorStop(0, 'rgb(255,255,255)');
  vig.addColorStop(1, 'rgb(112,118,138)');
  c.fillStyle = vig;
  c.fillRect(0, 0, w, h);
  const fold = c.createLinearGradient(0, 0, w, h);
  [0, 0.22, 0.4, 0.63, 0.8, 1].forEach((s, k) => fold.addColorStop(s, k % 2 ? 'rgb(255,255,255)' : 'rgb(226,230,240)'));
  c.fillStyle = fold;
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-over';

  c.lineCap = 'round';
  c.lineJoin = 'round';
  [[2.4, 0.16], [1.4, 0.26], [0.6, 0.5]].forEach(([wd, a]) => {
    seamPath(0);
    c.strokeStyle = `rgba(0,5,18,${a})`;
    c.lineWidth = row * wd;
    c.stroke();
  });
  c.globalCompositeOperation = 'screen';
  seamPath(row * 1.1);
  c.strokeStyle = 'rgba(150,175,230,0.16)';
  c.lineWidth = row * 1.6;
  c.stroke();
  c.globalCompositeOperation = 'source-over';
  [[1.5, 0.12], [0.7, 0.22]].forEach(([wd, a]) => {
    seamPath(row * 5.6);
    c.strokeStyle = `rgba(0,5,18,${a})`;
    c.lineWidth = row * wd;
    c.stroke();
  });

  const tw = row * 0.62;
  [row * 2.0, row * 4.1].forEach((off) => {
    const dash = row * 2.3;
    const gap = row * 1.05;
    let x = 4 + (off % gap);
    while (x < w - 4) {
      const x2 = Math.min(w - 2, x + dash * 0.96);
      const a: Pt = [x, seamY(x) + off];
      const b: Pt = [x2, seamY(x2) + off];
      threadStroke(c, [a, b], tw, top, row);
      c.fillStyle = 'rgba(0,4,16,0.55)';
      [a, b].forEach((q) => {
        c.beginPath();
        c.arc(q[0], q[1] + tw * 0.15, tw * 0.32, 0, TAU);
        c.fill();
      });
      x += dash + gap;
    }
  });
  return cv;
}

function threadStroke(c: CanvasRenderingContext2D, pts: Pt[], tw: number, pal: Palette, row: number) {
  const path = (dx: number, dy: number) => {
    c.beginPath();
    c.moveTo(pts[0][0] + dx, pts[0][1] + dy);
    if (pts.length === 3) c.quadraticCurveTo(pts[1][0] + dx, pts[1][1] + dy, pts[2][0] + dx, pts[2][1] + dy);
    else for (let k = 1; k < pts.length; k++) c.lineTo(pts[k][0] + dx, pts[k][1] + dy);
  };
  c.lineCap = 'round';
  path(row * 0.22, row * 0.4);
  c.strokeStyle = 'rgba(1,4,16,0.5)';
  c.lineWidth = tw * 1.3;
  c.stroke();
  path(0, 0);
  c.strokeStyle = rgba(pal.shade);
  c.lineWidth = tw;
  c.stroke();
  path(-tw * 0.06, -tw * 0.1);
  c.strokeStyle = rgba(pal.base);
  c.lineWidth = tw * 0.72;
  c.stroke();
  path(-tw * 0.16, -tw * 0.24);
  c.strokeStyle = rgba(pal.hi, 0.8);
  c.lineWidth = tw * 0.26;
  c.stroke();
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / (len || 1);
  const uy = (b[1] - a[1]) / (len || 1);
  const [dx, dy] = rot([ux, uy], 0.75);
  c.lineWidth = tw * 0.13;
  for (let s = tw * 0.5; s < len - tw * 0.4; s += tw * 0.7) {
    const x = a[0] + ux * s;
    const y = a[1] + uy * s;
    c.strokeStyle = rgba(pal.shade, 0.55);
    c.beginPath();
    c.moveTo(x - dx * tw * 0.4 + ux * tw * 0.3, y - dy * tw * 0.4 + uy * tw * 0.3);
    c.lineTo(x + dx * tw * 0.4 + ux * tw * 0.3, y + dy * tw * 0.4 + uy * tw * 0.3);
    c.stroke();
    c.strokeStyle = rgba(pal.hi, 0.45);
    c.beginPath();
    c.moveTo(x - dx * tw * 0.4, y - dy * tw * 0.4);
    c.lineTo(x + dx * tw * 0.4, y + dy * tw * 0.4);
    c.stroke();
  }
}

/* ---------- chain-stitch link sprites ---------- */

function bez(p: Pt[], t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
    u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1],
  ];
}

function makeSprites(row: number, dpr: number, tones: [Palette, Palette]) {
  const W = row * 1.08;
  const L = row * 1.46;
  const t = W * 0.42;
  const hh = W / 2 - t / 2;
  const S = Math.ceil(L + W + row * 1.8);
  const px = Math.ceil(S * dpr);
  const sprites = tones.map((tone) =>
    VARIANTS.map((k) => {
      const base = scaleRGB(tone.base, k);
      const deep = mix(base, [16, 12, 20], 0.62);
      const shade = scaleRGB(tone.shade, k);
      const hi = tone.hi;
      return Array.from({ length: ANGLES }, (_, a) => {
        const th = (a / ANGLES) * TAU;
        const cv = makeCanvas(px, px);
        const c = ctx2d(cv);
        c.setTransform(dpr, 0, 0, dpr, px / 2, px / 2);
        c.rotate(th);
        c.lineCap = 'round';
        const ll = rot(LIGHT, -th);
        const B: Pt = [-L / 2 + t * 0.5, 0];
        const Fp: Pt = [L / 2 - t * 0.5, 0];
        const upper: Pt[] = [B, [B[0] + L * 0.3, -hh * 1.42], [Fp[0], -hh * 1.38], Fp];
        const lower: Pt[] = upper.map(([x, y]) => [x, -y]);
        const strand = (p: Pt[], dx = 0, dy = 0) => {
          c.beginPath();
          c.moveTo(p[0][0] + dx, p[0][1] + dy);
          c.bezierCurveTo(p[1][0] + dx, p[1][1] + dy, p[2][0] + dx, p[2][1] + dy, p[3][0] + dx, p[3][1] + dy);
        };
        c.save();
        c.shadowColor = 'rgba(1,4,16,0.62)';
        c.shadowBlur = row * 0.5 * dpr;
        c.shadowOffsetX = row * 0.2 * dpr;
        c.shadowOffsetY = row * 0.36 * dpr;
        c.beginPath();
        c.moveTo(B[0], 0);
        c.bezierCurveTo(upper[1][0], upper[1][1] - t * 0.5, upper[2][0] + t * 0.5, upper[2][1] - t * 0.5, Fp[0] + t * 0.5, 0);
        c.bezierCurveTo(lower[2][0] + t * 0.5, lower[2][1] + t * 0.5, lower[1][0], lower[1][1] + t * 0.5, B[0], 0);
        c.fillStyle = rgba(deep);
        c.fill();
        c.restore();
        [upper, lower].forEach((p, si) => {
          const facing = (si ? 1 : -1) * ll[1];
          const lit = 0.9 + 0.16 * -facing;
          strand(p);
          c.strokeStyle = rgba(shade);
          c.lineWidth = t * 1.05;
          c.stroke();
          strand(p, ll[0] * t * 0.1, ll[1] * t * 0.1);
          c.strokeStyle = rgba(scaleRGB(base, lit));
          c.lineWidth = t * 0.74;
          c.stroke();
          strand(p, ll[0] * t * 0.27, ll[1] * t * 0.27);
          c.strokeStyle = rgba(hi, 0.55 + 0.3 * -facing);
          c.lineWidth = t * 0.26;
          c.stroke();
          c.lineWidth = t * 0.15;
          for (let k = 1; k < 8; k++) {
            const u = k / 8;
            const q = bez(p, u);
            const q2 = bez(p, Math.min(1, u + 0.01));
            const tg = Math.atan2(q2[1] - q[1], q2[0] - q[0]);
            const [dx, dy] = rot([Math.cos(tg), Math.sin(tg)], 0.7);
            c.strokeStyle = rgba(deep, 0.4);
            c.beginPath();
            c.moveTo(q[0] - dx * t * 0.36 + 0.4 * t * Math.cos(tg), q[1] - dy * t * 0.36 + 0.4 * t * Math.sin(tg));
            c.lineTo(q[0] + dx * t * 0.36 + 0.4 * t * Math.cos(tg), q[1] + dy * t * 0.36 + 0.4 * t * Math.sin(tg));
            c.stroke();
            c.strokeStyle = rgba(hi, 0.42);
            c.beginPath();
            c.moveTo(q[0] - dx * t * 0.36, q[1] - dy * t * 0.36);
            c.lineTo(q[0] + dx * t * 0.36, q[1] + dy * t * 0.36);
            c.stroke();
          }
        });
        return cv;
      });
    }),
  );
  return { sprites, size: px / dpr };
}

function softDot(dpr: number, size: number, color: string) {
  const px = Math.ceil(size * dpr);
  const cv = makeCanvas(px, px);
  const c = ctx2d(cv);
  const g = c.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
  g.addColorStop(0, color);
  g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  c.fillStyle = g;
  c.fillRect(0, 0, px, px);
  return cv;
}

/* ---------- scene ---------- */

type SceneInput = { w: number; text: string; family: string; fab: RGB; fill: RGB; outline: RGB; style: StitchStyle; dpr: number };

function buildScene({ w, text, family, fab, fill, outline, style, dpr }: SceneInput): Scene {
  const padX = clamp(w * 0.06, 18, 72);
  const padTop = clamp(w * 0.095, 46, 104);
  const padBottom = clamp(w * 0.075, 36, 88);
  const probe = ctx2d(makeCanvas(1, 1));
  const lay = layoutText(probe, text, family, w - padX * 2);
  const h = Math.ceil(padTop + lay.blockH + padBottom);
  const row = clamp(lay.font * 0.036, 2.8, 6.2);
  const tones: [Palette, Palette] = [palette(outline), palette(fill)];

  const G = clamp(Math.sqrt(1.1e6 / (w * h)), 1, 2);
  const gw = Math.ceil(w * G);
  const gh = Math.ceil(h * G);
  const mask = makeCanvas(gw, gh);
  const mc = ctx2d(mask);
  mc.font = `800 ${lay.font}px ${family}`;
  mc.fillStyle = '#fff';
  mc.textBaseline = 'alphabetic';
  lay.placed.forEach((g) => {
    mc.setTransform(G, 0, 0, G, (w / 2 + g.x) * G, (padTop + g.y) * G);
    mc.rotate(g.rot);
    mc.fillText(g.ch, -mc.measureText(g.ch).width / 2, 0);
  });
  const F = distanceField(mc.getImageData(0, 0, gw, gh).data, gw, gh);

  const centers = lay.placed.map((g) => [w / 2 + g.cx, padTop + g.cy] as Pt);
  const levels = style === 'outline' ? 2 : 14;
  const byGlyph: { level: number; pts: Pt[] }[][] = centers.map(() => []);
  for (let k = 0; k < levels; k++) {
    const polys = isoContours(F, gw, gh, (k + 0.5) * row * G + 0.5);
    if (!polys.length) break;
    polys.forEach((poly) => {
      const pts = resampleClosed(poly, row * 1.1 * G).map(([x, y]) => [x / G, y / G] as Pt);
      if (pts.length < 5) return;
      let cx = 0;
      let cy = 0;
      pts.forEach((q) => {
        cx += q[0];
        cy += q[1];
      });
      cx /= pts.length;
      cy /= pts.length;
      let best = 0;
      let bd = Infinity;
      centers.forEach((c, gi) => {
        const dd = (c[0] - cx) ** 2 + ((c[1] - cy) * 1.6) ** 2;
        if (dd < bd) {
          bd = dd;
          best = gi;
        }
      });
      byGlyph[best]?.push({ level: k, pts });
    });
  }

  const inside = (x: number, y: number) => {
    const gx = Math.round(x * G);
    const gy = Math.round(y * G);
    return gx >= 0 && gy >= 0 && gx < gw && gy < gh && F[gy * gw + gx] > 0.5;
  };

  const links: Link[] = [];
  const glyphLinks: number[][] = [];
  let cursor: Pt | null = null;
  const push = (a: Pt, b: Pt, glyph: number, tone: Tone, sew: boolean) => {
    const idx = links.length;
    links.push({
      ax: a[0], ay: a[1], bx: b[0], by: b[1],
      mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2,
      ang: Math.atan2(b[1] - a[1], b[0] - a[0]),
      glyph, tone, sew, v: Math.floor(hash(idx * 0.73) * VARIANTS.length),
    });
    glyphLinks[glyph].push(idx);
    return links[idx];
  };
  byGlyph.forEach((list, gi) => {
    glyphLinks[gi] = [];
    list.sort((p, q) => p.level - q.level);
    const remaining = [...list];
    while (remaining.length) {
      const lvl = remaining[0].level;
      let pick = 0;
      let start = 0;
      if (cursor) {
        let bd = Infinity;
        remaining.forEach((c, ci) => {
          if (c.level !== lvl) return;
          c.pts.forEach((q, qi) => {
            const dd = (q[0] - cursor![0]) ** 2 + (q[1] - cursor![1]) ** 2;
            if (dd < bd) {
              bd = dd;
              pick = ci;
              start = qi;
            }
          });
        });
      }
      const { level, pts: raw } = remaining.splice(pick, 1)[0];
      const pts = [...raw.slice(start), ...raw.slice(0, start)];
      const tone: Tone = level === 0 ? 0 : 1;
      if (cursor) push(cursor, pts[0], gi, tone, false);
      pts.forEach((a, k) => {
        const b = pts[(k + 1) % pts.length];
        const l = push(a, b, gi, tone, true);
        if (level === 0 && hash(links.length * 1.37) < 0.075) {
          let nx = -(b[1] - a[1]);
          let ny = b[0] - a[0];
          const nl = Math.hypot(nx, ny) || 1;
          nx /= nl;
          ny /= nl;
          if (inside(l.mx + nx * row * 1.3, l.my + ny * row * 1.3)) {
            nx = -nx;
            ny = -ny;
          }
          l.wr = { x: l.mx + nx * row * 0.9, y: l.my + ny * row * 0.9, nx, ny, len: row * (1.8 + 2.2 * hash(links.length)) };
        }
      });
      cursor = pts[0];
    }
  });

  const boxes = glyphLinks.map((ids) => {
    const b: Box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    ids.forEach((i) => {
      const l = links[i];
      if (!l.sew) return;
      b.x0 = Math.min(b.x0, l.mx - row * 2);
      b.x1 = Math.max(b.x1, l.mx + row * 2);
      b.y0 = Math.min(b.y0, l.my - row * 2);
      b.y1 = Math.max(b.y1, l.my + row * 2);
    });
    return b;
  });
  const sewIdx = links.map((l, i) => (l.sew ? i : -1)).filter((i) => i >= 0);
  const { sprites, size } = makeSprites(row, dpr, tones);
  const seamY = (x: number) => padTop * 0.2 + padTop * 0.09 * (1 - ((2 * x) / w - 1) ** 2);

  return {
    w, h, dpr, row,
    needleLen: clamp(lay.font * 0.62, 58, 118),
    links, boxes, glyphLinks,
    firstSew: sewIdx[0] ?? -1,
    lastSew: sewIdx[sewIdx.length - 1] ?? -1,
    spool: [w + 50, -70],
    denim: makeDenim(w, h, dpr, fab, seamY, row, tones[0]),
    sprites, spriteSize: size,
    dark: softDot(dpr, row * 3.4, 'rgba(0,3,14,0.9)'),
    light: softDot(dpr, row * 3, 'rgba(170,195,250,0.9)'),
    beds: [0, 1].map((t) => softDot(dpr, row * 2.6, rgba(mix(tones[t].shade, [10, 8, 16], 0.25), 0.95))) as [HTMLCanvasElement, HTMLCanvasElement],
    tones,
  };
}

/* ---------- engine ---------- */

function createEngine(sc: Scene, fabric: HTMLCanvasElement, stitches: HTMLCanvasElement, live: HTMLCanvasElement) {
  const { dpr, row, links } = sc;
  [fabric, stitches, live].forEach((c) => {
    c.width = Math.ceil(sc.w * dpr);
    c.height = Math.ceil(sc.h * dpr);
  });
  const fx = ctx2d(fabric);
  const sx = ctx2d(stitches);
  const lx = ctx2d(live);
  const all = links.map((_, i) => i);
  const done = new Uint8Array(links.length);
  const born = new Float64Array(links.length).fill(-1);

  let seq: number[] = [];
  let s = 0;
  let bornN = 0;
  let commitN = 0;
  let tSew = 0;
  let r0 = 2.4;
  let rmax = 600;
  let phase: Phase = 'idle';
  let phaseT = 0;
  let pending = false;
  let visible = false;
  let raf = 0;
  let last = 0;
  let hoverGlyph = -1;
  let runGlyph = -1;
  let ropeTone: Tone = 0;
  let pinned0 = false;
  let fibers: Fiber[] = [];
  let endTailShown = false;
  const nd = { x: sc.spool[0], y: sc.spool[1], vx: 0, vy: 0, z: -sc.needleLen, alpha: 0, amp: 1, pierce: 0 };
  let rope: Node[] = [];

  const drawLink = (c: CanvasRenderingContext2D, l: Link, scale: number, lift: number, alpha: number) => {
    const a = ((l.ang % TAU) + TAU) % TAU;
    const ai = Math.round((a / TAU) * ANGLES) % ANGLES;
    const res = a - (ai * TAU) / ANGLES;
    const k = dpr * scale;
    const cs = Math.cos(res) * k;
    const sn = Math.sin(res) * k;
    const S = sc.spriteSize;
    c.setTransform(cs, sn, -sn, cs, l.mx * dpr, (l.my + lift) * dpr);
    c.globalAlpha = alpha;
    c.drawImage(sc.sprites[l.tone][l.v][ai], -S / 2, -S / 2, S, S);
    c.globalAlpha = 1;
  };

  const pucker = (l: Link) => {
    fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const D = row * 3.4;
    fx.globalAlpha = 0.13;
    fx.drawImage(sc.dark, l.mx + row * 0.3 - D / 2, l.my + row * 0.5 - D / 2, D, D);
    fx.globalCompositeOperation = 'screen';
    fx.globalAlpha = 0.05;
    const E = row * 3;
    fx.drawImage(sc.light, l.mx - row * 0.9 - E / 2, l.my - row * 1.3 - E / 2, E, E);
    fx.globalCompositeOperation = 'source-over';
    fx.globalAlpha = 1;
    const Bd = row * 2.6;
    fx.drawImage(sc.beds[l.tone], l.mx - Bd / 2, l.my - Bd / 2, Bd, Bd);
    const wr = l.wr;
    if (!wr) return;
    const ex = wr.x + wr.nx * wr.len;
    const ey = wr.y + wr.ny * wr.len;
    const bend = wr.len * 0.18;
    fx.lineCap = 'round';
    const stroke = (dx: number, dy: number, color: string, width: number) => {
      fx.beginPath();
      fx.moveTo(wr.x + dx, wr.y + dy);
      fx.quadraticCurveTo((wr.x + ex) / 2 - wr.ny * bend + dx, (wr.y + ey) / 2 + wr.nx * bend + dy, ex + dx, ey + dy);
      fx.strokeStyle = color;
      fx.lineWidth = width;
      fx.stroke();
    };
    stroke(row * 0.25, row * 0.35, 'rgba(0,4,16,0.26)', row * 0.7);
    stroke(-row * 0.2, -row * 0.3, 'rgba(160,185,240,0.13)', row * 0.45);
  };

  const tail = (c: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number, tone: Tone) => {
    const pal = sc.tones[tone];
    const len = row * 3.6;
    const nx = -dy;
    const ny = dx;
    const end: Pt = [x + dx * len + nx * len * 0.45, y + dy * len + ny * len * 0.45];
    const mid: Pt = [x + dx * len * 0.65 - nx * len * 0.1, y + dy * len * 0.65 - ny * len * 0.1];
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    threadStroke(c, [[x, y], mid, end], row * 0.58, pal, row);
    c.lineCap = 'round';
    c.strokeStyle = rgba(pal.hi, 0.75);
    c.lineWidth = row * 0.14;
    [-0.6, -0.1, 0.45].forEach((da, k) => {
      const [ux, uy] = rot([end[0] - mid[0], end[1] - mid[1]], da);
      const ul = Math.hypot(ux, uy) || 1;
      const fl = row * (0.9 + 0.35 * k);
      c.beginPath();
      c.moveTo(end[0], end[1]);
      c.quadraticCurveTo(end[0] + (ux / ul) * fl * 0.6, end[1] + (uy / ul) * fl * 0.6 + row * 0.2, end[0] + (ux / ul) * fl, end[1] + (uy / ul) * fl + row * 0.4);
      c.stroke();
    });
  };

  const linkDir = (l: Link): Pt => {
    const d = Math.hypot(l.bx - l.ax, l.by - l.ay) || 1;
    return [(l.bx - l.ax) / d, (l.by - l.ay) / d];
  };
  const startTail = () => {
    const l = links[sc.firstSew];
    const [dx, dy] = linkDir(l);
    tail(sx, l.ax - dx * row * 0.3, l.ay - dy * row * 0.3, -dx, -dy, l.tone);
  };
  const endTail = () => {
    const l = links[sc.lastSew];
    const [dx, dy] = linkDir(l);
    tail(sx, l.bx, l.by, dx, -Math.abs(dy) - 0.4, l.tone);
  };

  const stray = (l: Link, i: number) => {
    if (!l.wr || hash(i * 2.17) > 0.35) return;
    const pal = sc.tones[l.tone];
    const len = row * (1.4 + 1.6 * hash(i * 4.1));
    const ex = l.mx + l.wr.nx * len;
    const ey = l.my + l.wr.ny * len;
    const bend = (hash(i * 9.7) - 0.5) * len;
    sx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sx.lineCap = 'round';
    [[row * 0.18, row * 0.28, 'rgba(1,4,16,0.35)', row * 0.16], [0, 0, rgba(pal.hi, 0.8), row * 0.1]].forEach(([dx, dy, color, width]) => {
      sx.beginPath();
      sx.moveTo(l.mx + +dx, l.my + +dy);
      sx.quadraticCurveTo((l.mx + ex) / 2 - l.wr!.ny * bend + +dx, (l.my + ey) / 2 + l.wr!.nx * bend + +dy, ex + +dx, ey + +dy);
      sx.strokeStyle = color as string;
      sx.lineWidth = width as number;
      sx.stroke();
    });
  };

  const commit = (i: number) => {
    done[i] = 1;
    const l = links[i];
    if (!l.sew) return;
    drawLink(sx, l, 1, 0, 1);
    stray(l, i);
    pucker(l);
    if (i === sc.firstSew) startTail();
  };

  const repaint = () => {
    fx.setTransform(1, 0, 0, 1, 0, 0);
    fx.drawImage(sc.denim, 0, 0);
    sx.setTransform(1, 0, 0, 1, 0, 0);
    sx.clearRect(0, 0, stitches.width, stitches.height);
    links.forEach((l, i) => {
      if (!done[i] || !l.sew) return;
      drawLink(sx, l, 1, 0, 1);
      stray(l, i);
      pucker(l);
    });
    if (sc.firstSew >= 0 && done[sc.firstSew]) startTail();
    if (endTailShown) endTail();
  };

  const clearLive = () => {
    lx.setTransform(1, 0, 0, 1, 0, 0);
    lx.clearRect(0, 0, live.width, live.height);
  };

  const eye = (): Pt => [nd.x - NEEDLE_AXIS[0] * nd.z + NEEDLE_AXIS[0] * sc.needleLen * 0.86, nd.y - NEEDLE_AXIS[1] * nd.z + NEEDLE_AXIS[1] * sc.needleLen * 0.86];

  const resetRope = () => {
    const e = eye();
    rope = Array.from({ length: ROPE_END + 1 }, (_, k) => {
      const t = k <= ROPE_EYE ? 0 : (k - ROPE_EYE) / (ROPE_END - ROPE_EYE);
      const x = k <= ROPE_EYE ? e[0] - (ROPE_EYE - k) * row * 0.8 * 0.3 : e[0] + (sc.spool[0] - e[0]) * t;
      const y = k <= ROPE_EYE ? e[1] + (ROPE_EYE - k) * row * 0.8 : e[1] + (sc.spool[1] - e[1]) * t;
      return { x, y, px: x, py: y };
    });
  };

  const stepRope = (dt: number, anchor: Pt | null, slack: number) => {
    const g = 1400 * dt * dt;
    rope.forEach((p) => {
      const vx = (p.x - p.px) * 0.982;
      const vy = (p.y - p.py) * 0.982;
      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy + g;
    });
    const e = eye();
    const free = row * 0.9;
    const l1 = anchor ? (Math.hypot(e[0] - anchor[0], e[1] - anchor[1]) * slack) / ROPE_EYE : free;
    const l2 = (Math.hypot(sc.spool[0] - e[0], sc.spool[1] - e[1]) * (1.02 + (slack - 1) * 0.3)) / (ROPE_END - ROPE_EYE);
    for (let it = 0; it < 14; it++) {
      if (anchor) {
        rope[0].x = anchor[0];
        rope[0].y = anchor[1];
      }
      rope[ROPE_EYE].x = e[0];
      rope[ROPE_EYE].y = e[1];
      rope[ROPE_END].x = sc.spool[0];
      rope[ROPE_END].y = sc.spool[1];
      for (let k = 0; k < ROPE_END; k++) {
        const a = rope[k];
        const b = rope[k + 1];
        const rest = k < ROPE_EYE ? l1 : l2;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1e-6;
        const diff = (d - rest) / d / 2;
        a.x += dx * diff;
        a.y += dy * diff;
        b.x -= dx * diff;
        b.y -= dy * diff;
      }
    }
    if (anchor) {
      rope[0].x = anchor[0];
      rope[0].y = anchor[1];
    }
    rope[ROPE_EYE].x = e[0];
    rope[ROPE_EYE].y = e[1];
  };

  const drawRope = (alpha: number) => {
    if (!rope.length || alpha < 0.01) return;
    const pal = sc.tones[ropeTone];
    const tw = row * 0.46;
    const path = (dx: number, dy: number) => {
      lx.beginPath();
      lx.moveTo(rope[0].x + dx, rope[0].y + dy);
      for (let k = 1; k < rope.length - 1; k++) {
        const a = rope[k];
        const b = rope[k + 1];
        lx.quadraticCurveTo(a.x + dx, a.y + dy, (a.x + b.x) / 2 + dx, (a.y + b.y) / 2 + dy);
      }
      lx.lineTo(rope[rope.length - 1].x + dx, rope[rope.length - 1].y + dy);
    };
    lx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lx.globalAlpha = alpha;
    lx.lineCap = 'round';
    lx.lineJoin = 'round';
    path(row * 1.6, row * 2.8);
    lx.strokeStyle = 'rgba(1,4,16,0.22)';
    lx.lineWidth = tw * 1.8;
    lx.stroke();
    path(0, 0);
    lx.strokeStyle = rgba(pal.shade);
    lx.lineWidth = tw;
    lx.stroke();
    path(-tw * 0.12, -tw * 0.16);
    lx.strokeStyle = rgba(pal.base);
    lx.lineWidth = tw * 0.62;
    lx.stroke();
    path(-tw * 0.2, -tw * 0.26);
    lx.setLineDash([tw * 0.5, tw * 0.55]);
    lx.strokeStyle = rgba(pal.hi, 0.85);
    lx.lineWidth = tw * 0.24;
    lx.stroke();
    lx.setLineDash([]);
    lx.globalAlpha = 1;
  };

  const drawNeedleAt = (z: number, alpha: number) => {
    const len = sc.needleLen;
    const [ax, ay] = NEEDLE_AXIS;
    const nx = -ay;
    const ny = ax;
    const nw = clamp(len * 0.036, 1.8, 3.6);
    const u0 = Math.max(0, z);
    const P: Pt = [nd.x, nd.y];
    const at = (u: number): Pt => [P[0] + ax * (u - z), P[1] + ay * (u - z)];
    const shadowAt = (u: number): Pt => {
      const e = Math.max(0, u - z);
      return [P[0] + ax * e * 0.3 + 0.55 * e * 0.55, P[1] + ay * e * 0.3 + 0.85 * e * 0.55];
    };
    const width = (u: number) => nw * clamp(u / (len * 0.32), 0.08, 1);
    lx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lx.globalAlpha = alpha;
    lx.lineCap = 'round';
    const s0 = shadowAt(u0);
    const s1 = shadowAt(len);
    [[2.4, 0.12], [1.1, 0.2]].forEach(([k, a]) => {
      lx.beginPath();
      lx.moveTo(s0[0], s0[1]);
      lx.lineTo(s1[0], s1[1]);
      lx.strokeStyle = `rgba(1,4,16,${a})`;
      lx.lineWidth = nw * k;
      lx.stroke();
    });
    const pts: Pt[] = [];
    const us = [u0, Math.max(u0, len * 0.32), len * 0.97];
    us.forEach((u) => {
      const c = at(u);
      pts.push([c[0] + nx * width(u), c[1] + ny * width(u)]);
    });
    const top = at(len);
    const back = [...us].reverse().map((u) => {
      const c = at(u);
      return [c[0] - nx * width(u), c[1] - ny * width(u)] as Pt;
    });
    const mid = at(len * 0.6);
    const grad = lx.createLinearGradient(mid[0] + nx * nw, mid[1] + ny * nw, mid[0] - nx * nw, mid[1] - ny * nw);
    grad.addColorStop(0, '#4c5259');
    grad.addColorStop(0.32, '#f5f7f9');
    grad.addColorStop(0.6, '#a4abb3');
    grad.addColorStop(1, '#3f444a');
    lx.beginPath();
    lx.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach((p) => lx.lineTo(p[0], p[1]));
    lx.quadraticCurveTo(top[0] + nx * nw, top[1] + ny * nw, top[0], top[1]);
    lx.quadraticCurveTo(top[0] - nx * nw, top[1] - ny * nw, back[0][0], back[0][1]);
    back.slice(1).forEach((p) => lx.lineTo(p[0], p[1]));
    lx.closePath();
    lx.fillStyle = grad;
    lx.fill();
    const e0 = at(len * 0.8);
    const e1 = at(len * 0.93);
    lx.beginPath();
    lx.moveTo(e0[0], e0[1]);
    lx.lineTo(e1[0], e1[1]);
    lx.strokeStyle = 'rgba(20,24,30,0.85)';
    lx.lineWidth = nw * 0.55;
    lx.stroke();
    const h0 = at(u0 + len * 0.06);
    const h1 = at(len * 0.78);
    lx.beginPath();
    lx.moveTo(h0[0] + nx * nw * 0.3, h0[1] + ny * nw * 0.3);
    lx.lineTo(h1[0] + nx * nw * 0.3, h1[1] + ny * nw * 0.3);
    lx.strokeStyle = 'rgba(255,255,255,0.75)';
    lx.lineWidth = nw * 0.28;
    lx.stroke();
    lx.globalAlpha = 1;
  };

  const drawDimple = (k: number) => {
    if (k < 0.02) return;
    lx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = row * 2.6;
    const g = lx.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, r);
    g.addColorStop(0, `rgba(0,3,14,${0.55 * k})`);
    g.addColorStop(0.45, `rgba(0,3,14,${0.18 * k})`);
    g.addColorStop(0.75, `rgba(150,175,235,${0.08 * k})`);
    g.addColorStop(1, 'rgba(150,175,235,0)');
    lx.fillStyle = g;
    lx.beginPath();
    lx.ellipse(nd.x, nd.y, r, r * 0.8, 0, 0, TAU);
    lx.fill();
  };

  const pointAt = (pos: number): Pt => {
    const n = seq.length;
    const i = clamp(Math.floor(pos), 0, n - 1);
    const l = links[seq[i]];
    const f = clamp(pos - i, 0, 1);
    return [l.ax + (l.bx - l.ax) * f, l.ay + (l.by - l.ay) * f];
  };

  const tick = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    phaseT += dt;
    const n = seq.length;
    const len = sc.needleLen;
    let anchor: Pt | null = pinned0 ? [rope[0].x, rope[0].y] : null;
    let slack = 1.04;

    if (phase === 'enter') {
      const target = pointAt(0);
      const k = 120;
      nd.vx += (k * (target[0] - nd.x) - 2 * 0.9 * Math.sqrt(k) * nd.vx) * dt;
      nd.vy += (k * (target[1] - nd.y) - 2 * 0.9 * Math.sqrt(k) * nd.vy) * dt;
      nd.x += nd.vx * dt;
      nd.y += nd.vy * dt;
      nd.z += (-len * 0.3 - nd.z) * Math.min(1, dt * 8);
      nd.alpha = Math.min(1, nd.alpha + dt * 5);
      ropeTone = links[seq[0]].tone;
      if (phaseT > 0.42) {
        phase = 'sew';
        phaseT = 0;
        pinned0 = true;
        anchor = target;
        rope[0].x = target[0];
        rope[0].y = target[1];
      }
    } else if (phase === 'sew') {
      tSew += dt;
      let r = Math.min(rmax, r0 * Math.exp(4.3 * tSew));
      r = Math.min(r, 3 + Math.sqrt(2 * 2600 * Math.max(0, n - s)));
      s = Math.min(n, s + r * dt);
      while (bornN < Math.floor(s) && bornN < n) born[seq[bornN++]] = now;
      nd.amp += (clamp(1 - (r - 2) / 24, 0, 1) - nd.amp) * Math.min(1, dt * 10);
      const phi = s - Math.floor(s);
      nd.pierce = 0.5 - 0.5 * Math.cos(TAU * phi);
      const P = pointAt(s);
      nd.x = P[0];
      nd.y = P[1];
      nd.z = nd.amp * (-len * 0.3 + (len * 0.52) * nd.pierce) + (1 - nd.amp) * -len * 0.06;
      slack = 1 + 0.22 * nd.amp * nd.pierce + 0.04 * (1 - nd.amp);
      anchor = pointAt(Math.max(0, Math.floor(s) - (nd.pierce > 0.5 ? 0 : 0)));
      const cur = links[seq[Math.min(n - 1, Math.floor(s))]];
      if (cur.sew) ropeTone = cur.tone;
      if (s >= n) {
        while (bornN < n) born[seq[bornN++]] = now;
        phase = 'finish';
        phaseT = 0;
        anchor = pointAt(n);
      }
    } else if (phase === 'finish') {
      nd.amp = 1;
      nd.pierce = 0;
      nd.z += (-len * 1.1 - nd.z) * Math.min(1, dt * 6);
      if (phaseT > 0.3) {
        const k = 40;
        const tx = sc.spool[0] - len * 0.4;
        const ty = sc.spool[1] + len * 0.2;
        nd.vx += (k * (tx - nd.x) - 2 * 0.95 * Math.sqrt(k) * nd.vx) * dt;
        nd.vy += (k * (ty - nd.y) - 2 * 0.95 * Math.sqrt(k) * nd.vy) * dt;
        nd.x += nd.vx * dt;
        nd.y += nd.vy * dt;
        nd.alpha = Math.max(0, nd.alpha - dt * 1.6);
      }
      if (pinned0 && phaseT > 0.34) {
        pinned0 = false;
        anchor = null;
        const cut = rope[0];
        for (let k = 0; k < 7; k++) {
          const a = hash(k * 3.3 + now) * TAU;
          const sp = 40 + 90 * hash(k * 7.1 + now);
          fibers.push({ x: cut.x, y: cut.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, a: a, life: 1 });
        }
        if (seq.includes(sc.lastSew)) {
          endTailShown = true;
          endTail();
        }
      }
      if (phaseT > 1.25) phase = 'done';
    }

    if (rope.length) {
      if (!pinned0 && phase === 'finish') {
        const e = eye();
        rope.slice(0, ROPE_EYE).forEach((p, k) => {
          const t = (ROPE_EYE - k) / ROPE_EYE;
          p.x += (e[0] - p.x) * Math.min(1, dt * 3.5 * t);
          p.y += (e[1] - p.y) * Math.min(1, dt * 2.2 * t);
        });
      }
      stepRope(dt, anchor, slack);
    }

    while (commitN < bornN && (now - born[seq[commitN]] >= TIGHTEN_MS || phase === 'done')) commit(seq[commitN++]);

    clearLive();
    if (phase === 'sew') drawDimple(nd.amp * Math.max(0, (nd.pierce - 0.35) / 0.65) + (1 - nd.amp) * 0.55);
    for (let c = commitN; c < bornN; c++) {
      const l = links[seq[c]];
      if (!l.sew) continue;
      const age = clamp((now - born[seq[c]]) / TIGHTEN_MS, 0, 1);
      const sc2 = 1 + 0.3 * Math.exp(-5 * age) * Math.cos(9 * age);
      drawLink(lx, l, sc2, -(sc2 - 1) * row * 1.4, 1);
    }
    if (phase === 'sew' && bornN < n && nd.amp > 0.2) {
      const l = links[seq[bornN]];
      if (l.sew) {
        const f = s - Math.floor(s);
        const up = f > 0.5 ? (f - 0.5) * 2 : 0;
        drawLink(lx, l, 0.55 + 0.75 * f, -row * 1.6 * up, nd.amp * Math.min(1, f * 3));
      }
    }
    drawRope(nd.alpha);
    if (phase === 'sew' && nd.amp < 0.9) {
      const ghost = (1 - nd.amp) * 0.3;
      drawNeedleAt(len * 0.18, ghost);
      drawNeedleAt(-len * 0.28, ghost);
    }
    if (nd.alpha > 0.01) drawNeedleAt(nd.z, nd.alpha * (phase === 'sew' ? 0.55 + 0.45 * nd.amp : 1));

    fibers = fibers.filter((p) => p.life > 0);
    if (fibers.length) {
      const pal = sc.tones[ropeTone];
      lx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lx.lineCap = 'round';
      lx.lineWidth = row * 0.16;
      fibers.forEach((p) => {
        p.vy += 260 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.a += dt * 6;
        p.life -= dt * 2.4;
        lx.strokeStyle = rgba(pal.hi, Math.max(0, p.life));
        lx.beginPath();
        lx.moveTo(p.x, p.y);
        lx.lineTo(p.x + Math.cos(p.a) * row * 1.1, p.y + Math.sin(p.a) * row * 1.1);
        lx.stroke();
      });
    }

    if (phase === 'done' && commitN >= bornN && !fibers.length) {
      clearLive();
      raf = 0;
      runGlyph = -1;
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  const kick = () => {
    if (raf || !visible) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };

  const settleNow = () => {
    if (phase === 'idle' || phase === 'done') return;
    const now = performance.now() - TIGHTEN_MS;
    while (bornN < seq.length) born[seq[bornN++]] = now;
    while (commitN < bornN) commit(seq[commitN++]);
    if (seq.includes(sc.lastSew) && !endTailShown) {
      endTailShown = true;
      endTail();
    }
    phase = 'done';
    nd.alpha = 0;
    fibers = [];
    clearLive();
  };

  const start = (ids: number[], fast: boolean) => {
    settleNow();
    seq = ids;
    ids.forEach((i) => {
      done[i] = 0;
      born[i] = -1;
    });
    if (ids.includes(sc.lastSew)) endTailShown = false;
    repaint();
    s = 0;
    bornN = 0;
    commitN = 0;
    tSew = 0;
    r0 = fast ? 6 : 2.4;
    rmax = Math.max(500, (ids.length - 260) / 1.9);
    phase = 'enter';
    phaseT = 0;
    pinned0 = false;
    if (nd.alpha < 0.05) {
      nd.x = sc.spool[0] - sc.needleLen;
      nd.y = Math.max(0, sc.spool[1] + sc.needleLen);
      nd.vx = 0;
      nd.vy = 0;
      nd.z = -sc.needleLen * 0.5;
      resetRope();
    }
    kick();
  };

  return {
    play() {
      if (visible) start(all, false);
      else pending = true;
    },
    finished() {
      links.forEach((_, i) => {
        done[i] = 1;
      });
      endTailShown = sc.lastSew >= 0;
      phase = 'done';
      repaint();
      clearLive();
    },
    replay() {
      if (!links.length) return;
      start(all, false);
    },
    setVisible(v: boolean) {
      visible = v;
      if (v && pending) {
        pending = false;
        start(all, false);
      } else if (v && phase !== 'done' && phase !== 'idle') kick();
      else if (!v && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    hover(x: number, y: number) {
      const g = sc.boxes.findIndex((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);
      if (g === hoverGlyph) return;
      hoverGlyph = g;
      const idle = phase === 'done' || (runGlyph >= 0 && phase !== 'idle');
      if (g < 0 || !idle || g === runGlyph || !sc.glyphLinks[g]?.length) return;
      runGlyph = g;
      start(sc.glyphLinks[g], true);
    },
    leave() {
      hoverGlyph = -1;
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}

type Engine = ReturnType<typeof createEngine>;

/* ---------- component ---------- */

export default function EmbroideredWord({
  text = 'Made by hand',
  threadColor = '#efe4c8',
  outlineColor = '#eaa233',
  fabricColor = '#253f69',
  stitchStyle = 'filled',
  resewOnHover = false,
  className,
}: EmbroideredWordProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<HTMLCanvasElement>(null);
  const stitchRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);
  const sheenRef = useRef<HTMLCanvasElement>(null);
  const sheenFrame = useRef(0);
  const [sheenOn, setSheenOn] = useState(false);
  const engine = useRef<Engine | null>(null);
  const inView = useRef(false);
  const played = useRef(false);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);
  const helpId = `${useId()}-help`;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => setWidth(Math.round(root.clientWidth)));
    ro.observe(root);
    const io = new IntersectionObserver(
      ([e]) => {
        inView.current = e.isIntersecting;
        engine.current?.setVisible(e.isIntersecting);
      },
      { threshold: 0.25 },
    );
    io.observe(root);
    return () => {
      ro.disconnect();
      io.disconnect();
      engine.current?.destroy();
      cancelAnimationFrame(sheenFrame.current);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !width) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      await document.fonts?.ready;
      const fab = fabricRef.current;
      const sti = stitchRef.current;
      const live = liveRef.current;
      if (cancelled || !fab || !sti || !live) return;
      const cs = getComputedStyle(root);
      const scene = buildScene({
        w: width,
        text: text.trim() || ' ',
        family: cs.getPropertyValue('--ew-font').trim() || 'sans-serif',
        fab: parseColor(cs.getPropertyValue('--ew-fabric'), fabricColor),
        fill: parseColor(cs.getPropertyValue('--ew-thread'), threadColor),
        outline: parseColor(cs.getPropertyValue('--ew-outline'), outlineColor),
        style: stitchStyle === 'outline' ? 'outline' : 'filled',
        dpr: Math.min(2, window.devicePixelRatio || 1),
      });
      engine.current?.destroy();
      const eng = createEngine(scene, fab, sti, live);
      engine.current = eng;
      setHeight(scene.h);
      eng.setVisible(inView.current);
      if (reduced || played.current) eng.finished();
      else {
        played.current = true;
        eng.play();
      }
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [width, text, threadColor, outlineColor, fabricColor, stitchStyle, reduced]);

  useEffect(() => {
    played.current = false;
  }, [text, stitchStyle]);

  const local = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const drawSheen = (x: number, y: number) => {
    const sheen = sheenRef.current;
    const src = stitchRef.current;
    if (!sheen || !src || sheenFrame.current) return;
    sheenFrame.current = requestAnimationFrame(() => {
      sheenFrame.current = 0;
      if (sheen.width !== src.width || sheen.height !== src.height) {
        sheen.width = src.width;
        sheen.height = src.height;
      }
      const c = ctx2d(sheen);
      const k = src.width / Math.max(1, src.clientWidth);
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, sheen.width, sheen.height);
      c.drawImage(src, 0, 0);
      c.globalCompositeOperation = 'source-in';
      c.setTransform(k, 0, 0, k * 0.55, 0, y * k * 0.45);
      const r = Math.max(120, src.clientWidth * 0.32);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,246,222,0.42)');
      g.addColorStop(0.5, 'rgba(255,246,222,0.12)');
      g.addColorStop(1, 'rgba(255,246,222,0)');
      c.fillStyle = g;
      c.fillRect(x - r, y - r * 3, r * 2, r * 6);
      c.setTransform(1, 0, 0, 1, 0, 0);
    });
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || reduced) return;
    const [x, y] = local(e);
    if (resewOnHover) engine.current?.hover(x, y);
    drawSheen(x, y);
    if (!sheenOn) setSheenOn(true);
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' || reduced || !resewOnHover) return;
    engine.current?.leave();
    engine.current?.hover(...local(e));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (reduced || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    engine.current?.replay();
  };

  const rootStyle = {
    '--ew-thread': threadColor,
    '--ew-outline': outlineColor,
    '--ew-fabric': fabricColor,
    blockSize: height ? `${height}px` : undefined,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
      role="img"
      aria-label={text}
      aria-describedby={helpId}
      tabIndex={0}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerLeave={() => {
        engine.current?.leave();
        setSheenOn(false);
      }}
      onKeyDown={onKeyDown}
    >
      <span id={helpId} className={styles.srOnly}>
        {resewOnHover ? HELP_RESEW : HELP}
      </span>
      {height === null && (
        <span className={styles.fallback} aria-hidden="true">
          {text}
        </span>
      )}
      <canvas ref={fabricRef} className={styles.layer} aria-hidden="true" />
      <canvas ref={stitchRef} className={styles.layer} aria-hidden="true" />
      <canvas ref={sheenRef} className={[styles.sheen, sheenOn ? styles.sheenOn : ''].filter(Boolean).join(' ')} aria-hidden="true" />
      <canvas ref={liveRef} className={styles.layer} aria-hidden="true" />
    </div>
  );
}
