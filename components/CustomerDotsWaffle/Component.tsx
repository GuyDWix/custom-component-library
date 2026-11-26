import { useEffect, useId, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import styles from './Component.module.css';

export interface CustomerDotsWaffleProps {
  percentage?: number;
  statement?: string;
  highlightLabel?: string;
  otherLabel?: string;
  className?: string;
}

type Group = 'hi' | 'lo';
type RGB = [number, number, number];

interface Layout {
  w: number;
  h: number;
  dpr: number;
  p: number;
  cx: number;
  cy: number;
  sinP: number;
  cosP: number;
}

interface Tokens {
  ground: RGB;
  slate: RGB;
  ink: RGB;
  hi: RGB;
}

interface Engine {
  hit: (clientX: number, clientY: number) => Group | null;
  anchor: (group: Group) => { x: number; y: number } | null;
}

const COUNT = 100;
const COLS = 10;
const ALPHA = (38 * Math.PI) / 180;
const COS_A = Math.cos(ALPHA);
const SIN_A = Math.sin(ALPHA);
const SLAB = 5.38;
const SLAB_R = 0.8;
const SLAB_T = 0.62;
const WELL_R = 0.47;
const DOT_R = 0.385;
const DOT_H = 0.34;
const INTRO_END = 3.5;

const WHITE: RGB = [255, 255, 255];
const FALLBACK: Tokens = {
  ground: [241, 245, 242],
  slate: [127, 142, 154],
  ink: [28, 40, 50],
  hi: [242, 80, 63],
};

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgba = (c: RGB, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
const hash = (i: number, s: number) => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const resolveColor = (ctx: CanvasRenderingContext2D, raw: string, fallback: RGB): RGB => {
  ctx.save();
  ctx.fillStyle = '#010203';
  if (raw) ctx.fillStyle = raw;
  const out = String(ctx.fillStyle);
  ctx.restore();
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(out);
  if (hex) {
    const c: RGB = [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)];
    return c[0] === 1 && c[1] === 2 && c[2] === 3 ? fallback : c;
  }
  const fn = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(out);
  return fn ? [Number(fn[1]), Number(fn[2]), Number(fn[3])] : fallback;
};

const computeLayout = (w: number, h: number, dpr: number): Layout => {
  const wide = w >= 640;
  const phi = ((wide ? 52 : 60) * Math.PI) / 180;
  const sinP = Math.sin(phi);
  const cosP = Math.cos(phi);
  const ext = SLAB * (COS_A + SIN_A);
  const x0 = wide ? w * 0.35 : w * 0.03;
  const x1 = wide ? w * 0.985 : w * 0.97;
  const availH = h * (wide ? 0.9 : 0.94);
  const p = Math.min((x1 - x0) / (2 * ext), availH / (2 * ext * sinP + SLAB_T * cosP + 1.2));
  return { w, h, dpr, p, cx: (x0 + x1) / 2, cy: h / 2 - (SLAB_T * cosP * p) / 2, sinP, cosP };
};

const slabOutline = (): Array<[number, number]> => {
  const pts: Array<[number, number]> = [];
  const c = SLAB - SLAB_R;
  const corners: Array<[number, number]> = [
    [c, c],
    [-c, c],
    [-c, -c],
    [c, -c],
  ];
  corners.forEach(([cu, cv], k) => {
    for (let s = 0; s <= 8; s++) {
      const ang = ((k + s / 8) * Math.PI) / 2;
      pts.push([cu + SLAB_R * Math.cos(ang), cv + SLAB_R * Math.sin(ang)]);
    }
  });
  return pts;
};

const OUTLINE = slabOutline();

export default function CustomerDotsWaffle({
  percentage = 92,
  statement = 'of first-time clients book a second visit within the year.',
  highlightLabel = 'Came back',
  otherLabel = 'Not yet',
  className,
}: CustomerDotsWaffleProps) {
  const uid = useId();
  const statementId = `${uid}-statement`;
  const nLit = Number.isFinite(percentage) ? Math.round(Math.min(100, Math.max(0, percentage))) : 0;
  const nOther = COUNT - nLit;

  const [active, setActive] = useState<Group | null>(null);
  const lastGroup = useRef<Group>('hi');
  if (active) lastGroup.current = active;
  const tipGroup: Group = active ?? lastGroup.current;

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<HTMLSpanElement>(null);
  const engine = useRef<Engine | null>(null);
  const kickRef = useRef<() => void>(() => {});
  const dirtyRef = useRef<() => void>(() => {});
  const pointerDriven = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });
  const live = useRef({ nLit, active: null as Group | null });
  live.current.nLit = nLit;
  live.current.active = active;

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!root || !stage || !canvas) return;
    const ctx = canvas.getContext('2d');
    const layer = document.createElement('canvas');
    const lctx = layer.getContext('2d');
    if (!ctx || !lctx) return;

    const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    let reduced = !!mq?.matches;

    // per-dot state, in pitch units on the tray plane
    const TU = new Float64Array(COUNT);
    const TV = new Float64Array(COUNT);
    const U = new Float64Array(COUNT);
    const V = new Float64Array(COUNT);
    const Z = new Float64Array(COUNT);
    const VU = new Float64Array(COUNT);
    const VV = new Float64Array(COUNT);
    const VZ = new Float64Array(COUNT);
    const ZP = new Float64Array(COUNT);
    const VZP = new Float64Array(COUNT);
    const E = new Float64Array(COUNT);
    const VE = new Float64Array(COUNT);
    const LP = new Float64Array(COUNT);
    const REL = new Float64Array(COUNT);
    const LAT = new Float64Array(COUNT);
    const HID = new Uint8Array(COUNT);
    const PULSED = new Uint8Array(COUNT);
    const SPECK = new Float64Array(COUNT * 6);
    for (let i = 0; i < COUNT; i++) {
      TU[i] = (i % COLS) - (COLS - 1) / 2;
      TV[i] = Math.floor(i / COLS) - (COLS - 1) / 2;
      REL[i] = 0.2 + i * 0.0105 + hash(i, 5) * 0.02;
      LAT[i] = 1.35 + i * 0.0125;
      for (let k = 0; k < 3; k++) {
        const a = hash(i, 20 + k) * Math.PI * 2;
        const d = Math.sqrt(hash(i, 40 + k)) * 0.82;
        SPECK[i * 6 + k * 2] = Math.cos(a) * d;
        SPECK[i * 6 + k * 2 + 1] = Math.sin(a) * d;
      }
    }

    let layout: Layout | null = null;
    let tokens: Tokens = FALLBACK;
    let dirty = true;
    let inView = false;
    let started = false;
    let introActive = false;
    let t = 0;
    let lastCount = -1;
    let raf = 0;
    let running = false;
    let last = 0;

    const px = (u: number, v: number, p: number, cx: number) => cx + (u * COS_A - v * SIN_A) * p;

    const readTokens = () => {
      const cs = getComputedStyle(root);
      const swatch = root.querySelector(`.${styles.swatch}:not(.${styles.swatchHi})`);
      tokens = {
        ground: resolveColor(ctx, cs.backgroundColor, FALLBACK.ground),
        slate: resolveColor(ctx, swatch ? getComputedStyle(swatch).backgroundColor : '', FALLBACK.slate),
        ink: resolveColor(ctx, cs.color, FALLBACK.ink),
        hi: resolveColor(ctx, cs.getPropertyValue('--accent').trim(), FALLBACK.hi),
      };
    };

    const buildLayer = () => {
      if (!layout) return;
      const { w, h, dpr, p, cx, cy, sinP, cosP } = layout;
      layer.width = Math.max(1, Math.round(w * dpr));
      layer.height = Math.max(1, Math.round(h * dpr));
      const c = lctx;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);
      const { ground, ink } = tokens;
      const slabTop = mix(ground, WHITE, 0.62);
      const thick = SLAB_T * cosP * p;
      const outline = (dy: number) => {
        c.beginPath();
        OUTLINE.forEach(([u, v], k) => {
          const x = px(u, v, p, cx);
          const y = cy + (u * SIN_A + v * COS_A) * p * sinP + dy;
          if (k === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        });
        c.closePath();
      };

      // soft contact shadow under the whole slab
      c.save();
      c.shadowColor = rgba(ink, 0.3);
      c.shadowBlur = p * 1.7 * dpr;
      c.shadowOffsetY = p * 0.8 * dpr;
      c.fillStyle = rgba(mix(slabTop, ink, 0.2), 1);
      outline(thick);
      c.fill();
      c.restore();

      // slab thickness
      for (let k = Math.ceil(thick); k >= 0; k--) {
        c.fillStyle = rgba(mix(slabTop, ink, 0.1 + 0.1 * (k / Math.max(1, thick))), 1);
        outline(k);
        c.fill();
      }

      // slab top face with a soft light falloff from the upper left
      const g = c.createLinearGradient(cx - 6 * p, cy - 5 * p * sinP, cx + 6 * p, cy + 6 * p * sinP);
      g.addColorStop(0, rgba(mix(slabTop, WHITE, 0.55), 1));
      g.addColorStop(0.55, rgba(slabTop, 1));
      g.addColorStop(1, rgba(mix(slabTop, ink, 0.05), 1));
      c.fillStyle = g;
      outline(0);
      c.fill();
      c.lineWidth = 1;
      c.strokeStyle = rgba(ink, 0.12);
      c.stroke();
      c.save();
      c.clip();
      c.lineWidth = 2.4;
      c.strokeStyle = 'rgba(255,255,255,0.9)';
      outline(0);
      c.stroke();
      c.restore();

      // wells
      for (let i = 0; i < COUNT; i++) {
        const x = px(TU[i], TV[i], p, cx);
        const y = cy + (TU[i] * SIN_A + TV[i] * COS_A) * p * sinP;
        const rx = WELL_R * p;
        const ry = rx * sinP;
        const wg = c.createLinearGradient(0, y - ry, 0, y + ry);
        wg.addColorStop(0, rgba(ink, 0.24));
        wg.addColorStop(1, rgba(ink, 0.05));
        c.fillStyle = wg;
        c.beginPath();
        c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        c.fill();
        c.lineWidth = 1.2;
        c.strokeStyle = 'rgba(255,255,255,0.95)';
        c.beginPath();
        c.ellipse(x, y + 0.8, rx, ry, 0, 0.12 * Math.PI, 0.88 * Math.PI);
        c.stroke();
        c.strokeStyle = rgba(ink, 0.16);
        c.beginPath();
        c.ellipse(x, y, rx, ry, 0, 1.06 * Math.PI, 1.94 * Math.PI);
        c.stroke();
      }
    };

    const dotBase = (i: number): RGB => {
      const base = mix(tokens.slate, tokens.hi, LP[i]);
      const dim = Math.max(-E[i], 0);
      return dim > 0.001 ? mix(base, tokens.ground, dim * 0.62) : base;
    };

    const draw = () => {
      const L = layout;
      if (!L) return;
      if (dirty) {
        readTokens();
        buildLayer();
        dirty = false;
      }
      const { p, cx, cy, sinP, cosP, dpr } = L;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(layer, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { ink, hi, ground } = tokens;
      const order: number[] = [];
      const key = new Float64Array(COUNT);
      for (let i = 0; i < COUNT; i++) {
        if (HID[i]) continue;
        order.push(i);
        key[i] = U[i] * SIN_A + V[i] * COS_A + (Z[i] > 0.9 ? 1000 : 0);
      }
      order.sort((a, b) => key[a] - key[b]);

      // pass 1: ground shadows and pulse halos
      for (const i of order) {
        const dim = Math.max(-E[i], 0);
        const zt = Z[i] + ZP[i] + Math.max(E[i], 0) * 0.2;
        const x = px(U[i], V[i], p, cx);
        const y = cy + (U[i] * SIN_A + V[i] * COS_A) * p * sinP;
        const rx = DOT_R * p * (1.04 + zt * 0.09);
        const a = (0.26 / (1 + zt * 0.9)) * (1 - dim * 0.6);
        ctx.fillStyle = rgba(ink, a);
        ctx.beginPath();
        ctx.ellipse(x + zt * p * 0.2, y + zt * p * 0.17 * sinP + 0.04 * p, rx, rx * sinP, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(ink, 0.2 * (1 - dim * 0.6) / (1 + zt * 4));
        ctx.beginPath();
        ctx.ellipse(x, y + 0.03 * p, rx * 0.8, rx * 0.8 * sinP, 0, 0, Math.PI * 2);
        ctx.fill();
        const env = Math.min(1, Math.max(0, ZP[i] / 0.32));
        if (env > 0.02 && Z[i] < 0.5) {
          const rr = DOT_R * p * (1.5 + 0.9 * (1 - env));
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(1, sinP);
          const hg = ctx.createRadialGradient(0, 0, DOT_R * p * 0.6, 0, 0, rr);
          hg.addColorStop(0, rgba(hi, 0.4 * env));
          hg.addColorStop(1, rgba(hi, 0));
          ctx.fillStyle = hg;
          ctx.beginPath();
          ctx.arc(0, 0, rr, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // pass 2: ceramic discs, far to near
      for (const i of order) {
        const zt = Z[i] + ZP[i] + Math.max(E[i], 0) * 0.2;
        const x = px(U[i], V[i], p, cx);
        const y = cy + (U[i] * SIN_A + V[i] * COS_A) * p * sinP;
        const by = y - zt * p * cosP;
        const ty = by - DOT_H * p * cosP;
        const rx = DOT_R * p;
        const base = dotBase(i);
        const side = mix(base, ink, 0.3);

        const vxs = (VU[i] * COS_A - VV[i] * SIN_A) * p;
        const vys = (VU[i] * SIN_A + VV[i] * COS_A) * p * sinP - VZ[i] * p * cosP;
        const speed = Math.hypot(vxs, vys);
        if (Z[i] > 0.3 && speed > 220) {
          ctx.strokeStyle = rgba(mix(tokens.slate, ground, 0.2), Math.min(0.32, speed / 2600));
          ctx.lineWidth = rx * 1.15;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x, ty);
          ctx.lineTo(x - vxs * 0.05, ty - vys * 0.05);
          ctx.stroke();
        }

        ctx.fillStyle = rgba(side, 1);
        ctx.fillRect(x - rx, ty, rx * 2, by - ty);
        ctx.beginPath();
        ctx.ellipse(x, by, rx, rx * sinP, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(x, ty);
        ctx.scale(1, sinP);
        const g = ctx.createRadialGradient(-rx * 0.3, -rx * 0.36, 0, 0, 0, rx * 1.18);
        g.addColorStop(0, rgba(mix(base, WHITE, 0.26), 1));
        g.addColorStop(0.5, rgba(base, 1));
        g.addColorStop(1, rgba(mix(base, ink, 0.08), 1));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, rx, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(mix(base, ink, 0.45), 0.22);
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(SPECK[i * 6 + k * 2] * rx, SPECK[i * 6 + k * 2 + 1] * rx, 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.34)';
        ctx.beginPath();
        ctx.ellipse(x, ty, rx - 0.5, (rx - 0.5) * sinP, 0, Math.PI, Math.PI * 1.62);
        ctx.stroke();
      }
    };

    const showLive = (on: boolean) => {
      const num = numRef.current;
      const liveEl = liveRef.current;
      if (num) num.style.visibility = on ? 'hidden' : '';
      if (liveEl && !on) liveEl.textContent = '';
    };

    const release = (i: number) => {
      const L = layout;
      const p = L ? L.p : 40;
      const w = L ? L.w : 800;
      // the stream arrives from the upper right, outside the card
      let du = 1 * COS_A + -0.5 * SIN_A;
      let dv = -1 * SIN_A + -0.5 * COS_A;
      const len = Math.hypot(du, dv);
      du /= len;
      dv /= len;
      const R = ((w + 60) / p) * 0.6 + 5 * hash(i, 1);
      const lat = Math.sin(i * 0.31) * 2.6 + (hash(i, 2) - 0.5) * 2.2;
      U[i] = TU[i] + du * R - dv * lat;
      V[i] = TV[i] + dv * R + du * lat;
      Z[i] = 5 + 4 * hash(i, 3);
      VU[i] = -du * 4;
      VV[i] = -dv * 4;
      VZ[i] = 0;
      HID[i] = 0;
    };

    const settle = () => {
      const { nLit: n, active: act } = live.current;
      for (let i = 0; i < COUNT; i++) {
        U[i] = TU[i];
        V[i] = TV[i];
        Z[i] = 0;
        VU[i] = VV[i] = VZ[i] = 0;
        ZP[i] = VZP[i] = 0;
        E[i] = act === null ? 0 : (i < n) === (act === 'hi') ? 1 : -1;
        VE[i] = 0;
        LP[i] = i < n ? 1 : 0;
        HID[i] = 0;
        PULSED[i] = 1;
      }
      introActive = false;
      started = true;
      lastCount = -1;
      showLive(false);
    };

    const beginIntro = () => {
      started = true;
      introActive = true;
      t = 0;
      lastCount = -1;
      for (let i = 0; i < COUNT; i++) {
        HID[i] = 1;
        PULSED[i] = 0;
        LP[i] = 0;
        E[i] = 0;
        VE[i] = 0;
        ZP[i] = VZP[i] = 0;
      }
      const liveEl = liveRef.current;
      if (liveEl) liveEl.textContent = '0';
      showLive(true);
    };

    const step = (dt: number): boolean => {
      const n = live.current.nLit;
      const act = live.current.active;
      if (introActive) t += dt;
      const sub = Math.max(1, Math.ceil(dt * 120));
      const h = dt / sub;
      let busy = introActive;
      let count = 0;
      for (let i = 0; i < COUNT; i++) {
        const lit = i < n;
        if (HID[i]) {
          if (introActive && t >= REL[i]) release(i);
          else continue;
        }
        for (let s = 0; s < sub; s++) {
          VU[i] += (36 * (TU[i] - U[i]) - 6.6 * VU[i]) * h;
          VV[i] += (36 * (TV[i] - V[i]) - 6.6 * VV[i]) * h;
          VZ[i] += (30 * (0 - Z[i]) - 5 * VZ[i]) * h;
          VZP[i] += (150 * (0 - ZP[i]) - 9.5 * VZP[i]) * h;
          U[i] += VU[i] * h;
          V[i] += VV[i] * h;
          Z[i] += VZ[i] * h;
          ZP[i] += VZP[i] * h;
          if (ZP[i] < 0) {
            ZP[i] = 0;
            VZP[i] = Math.max(VZP[i], 0);
          }
          if (Z[i] < 0) {
            Z[i] = 0;
            if (VZ[i] < 0) VZ[i] = -VZ[i] * 0.38;
            if (VZ[i] < 0.6) VZ[i] = 0;
          }
          const et = act === null ? 0 : lit === (act === 'hi') ? 1 : -1;
          if (reduced) {
            E[i] = et;
            VE[i] = 0;
          } else {
            VE[i] += (260 * (et - E[i]) - 24 * VE[i]) * h;
            E[i] += VE[i] * h;
          }
        }
        const flying = Z[i] > 0.002 || Math.abs(VZ[i]) > 0.05 || Math.abs(U[i] - TU[i]) > 0.002 || Math.abs(V[i] - TV[i]) > 0.002 || Math.abs(VU[i]) > 0.05 || Math.abs(VV[i]) > 0.05;
        if (!flying) {
          U[i] = TU[i];
          V[i] = TV[i];
          Z[i] = 0;
          VU[i] = VV[i] = VZ[i] = 0;
        }
        const target = lit ? 1 : 0;
        if (!lit || !introActive || t >= LAT[i]) {
          LP[i] += (target - LP[i]) * (1 - Math.exp(-dt * 10));
          if (lit && !PULSED[i]) {
            PULSED[i] = 1;
            VZP[i] += 6;
          }
        }
        if (lit && introActive && t >= LAT[i]) count++;
        const et2 = act === null ? 0 : lit === (act === 'hi') ? 1 : -1;
        if (flying || Math.abs(ZP[i]) > 0.003 || Math.abs(VZP[i]) > 0.02 || Math.abs(et2 - E[i]) > 0.002 || Math.abs(VE[i]) > 0.02 || Math.abs(target - LP[i]) > 0.004) busy = true;
      }
      if (introActive) {
        if (count !== lastCount) {
          lastCount = count;
          const liveEl = liveRef.current;
          if (liveEl) liveEl.textContent = String(count);
        }
        if (t >= INTRO_END) {
          introActive = false;
          showLive(false);
        }
      }
      return busy;
    };

    const frame = (now: number) => {
      raf = 0;
      if (!inView) {
        running = false;
        return;
      }
      const dt = Math.min(Math.max((now - last) / 1000, 0), 1 / 30);
      last = now;
      const busy = step(dt);
      draw();
      if (busy) raf = requestAnimationFrame(frame);
      else running = false;
    };

    const kick = () => {
      if (!layout || running) return;
      if (!inView) {
        draw();
        return;
      }
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    kickRef.current = kick;
    dirtyRef.current = () => {
      dirty = true;
      kick();
      if (!running && layout) draw();
    };

    const maybeStart = () => {
      if (started || !layout || !inView) return;
      if (reduced) settle();
      else beginIntro();
      kick();
      if (reduced) draw();
    };

    const onResize = () => {
      const rect = stage.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w < 2 || h < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      layout = computeLayout(w, h, dpr);
      dirty = true;
      maybeStart();
      draw();
      kick();
    };

    const ro = new ResizeObserver(onResize);
    ro.observe(stage);

    let io: IntersectionObserver | null = null;
    const onVisible = (visible: boolean) => {
      inView = visible;
      if (visible) {
        maybeStart();
        kick();
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        running = false;
      }
    };
    if (typeof IntersectionObserver === 'undefined') {
      onVisible(true);
    } else {
      io = new IntersectionObserver(([entry]) => onVisible(entry.isIntersecting), { threshold: 0.15 });
      io.observe(root);
    }

    const onMq = () => {
      reduced = !!mq?.matches;
      if (reduced && started) {
        settle();
        draw();
      }
    };
    mq?.addEventListener('change', onMq);

    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.target === root) dirtyRef.current();
    };
    root.addEventListener('transitionend', onTransitionEnd);

    engine.current = {
      hit: (clientX, clientY) => {
        const L = layout;
        if (!L) return null;
        const rect = canvas.getBoundingClientRect();
        const xr = (clientX - rect.left - L.cx) / L.p;
        const yr = (clientY - rect.top - L.cy) / (L.p * L.sinP);
        const u = xr * COS_A + yr * SIN_A;
        const v = -xr * SIN_A + yr * COS_A;
        const col = Math.round(u + (COLS - 1) / 2);
        const row = Math.round(v + (COLS - 1) / 2);
        if (col < 0 || col >= COLS || row < 0 || row >= COLS) return null;
        const i = row * COLS + col;
        if (HID[i]) return null;
        return i < live.current.nLit ? 'hi' : 'lo';
      },
      anchor: (group) => {
        const L = layout;
        if (!L) return null;
        const n = live.current.nLit;
        let sx = 0;
        let sy = 0;
        let top = Infinity;
        let c = 0;
        for (let i = 0; i < COUNT; i++) {
          if ((i < n) !== (group === 'hi')) continue;
          const x = px(TU[i], TV[i], L.p, L.cx);
          const y = L.cy + (TU[i] * SIN_A + TV[i] * COS_A) * L.p * L.sinP;
          sx += x;
          sy += y;
          top = Math.min(top, y);
          c++;
        }
        if (!c) return null;
        return { x: sx / c, y: Math.max(top, sy / c - L.p * 2.2) };
      },
    };

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io?.disconnect();
      mq?.removeEventListener('change', onMq);
      root.removeEventListener('transitionend', onTransitionEnd);
      engine.current = null;
      kickRef.current = () => {};
      dirtyRef.current = () => {};
    };
  }, []);

  useEffect(() => {
    kickRef.current();
  }, [nLit, active]);

  const placeTip = (x: number, y: number) => {
    const tip = tipRef.current;
    const stage = stageRef.current;
    if (!tip || !stage) return;
    const sw = stage.clientWidth;
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const left = Math.min(Math.max(x - tw / 2, 8), Math.max(8, sw - tw - 8));
    const top = Math.max(y - th - 18, 6);
    tip.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`;
  };

  // keyboard and legend activation parks the label on the group; pointer follows the cursor
  useEffect(() => {
    if (!active) return;
    if (pointerDriven.current) {
      placeTip(lastPoint.current.x, lastPoint.current.y);
      return;
    }
    const a = engine.current?.anchor(active);
    if (a) placeTip(a.x, a.y);
  }, [active]);

  const pointAt = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = engine.current?.hit(e.clientX, e.clientY) ?? null;
    const rect = e.currentTarget.getBoundingClientRect();
    pointerDriven.current = true;
    lastPoint.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (g) placeTip(lastPoint.current.x, lastPoint.current.y);
    return g;
  };

  const onStageMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    setActive(pointAt(e));
  };

  const onStageLeave = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') setActive(null);
  };

  const onStageDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = pointAt(e);
    if (e.pointerType === 'mouse') setActive(g);
    else setActive((prev) => (g && g !== prev ? g : null));
  };

  const legendProps = (group: Group) => ({
    onPointerEnter: (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.pointerType !== 'mouse') return;
      pointerDriven.current = false;
      setActive(group);
    },
    onPointerLeave: (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === 'mouse') setActive(null);
    },
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === 'mouse') return;
      pointerDriven.current = false;
      setActive((prev) => (prev === group ? null : group));
    },
    onFocus: () => {
      pointerDriven.current = false;
      setActive(group);
    },
    onBlur: () => setActive(null),
  });

  const tipCount = tipGroup === 'hi' ? nLit : nOther;
  const tipLabel = tipGroup === 'hi' ? highlightLabel : otherLabel;

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      role="group"
      aria-labelledby={statementId}
    >
      <div className={styles.frame}>
        <div
          ref={stageRef}
          className={styles.stage}
          onPointerMove={onStageMove}
          onPointerLeave={onStageLeave}
          onPointerDown={onStageDown}
        >
          <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
          <div ref={tipRef} className={[styles.tip, active ? styles.tipOn : ''].filter(Boolean).join(' ')} aria-hidden="true">
            <span className={styles.tipCount}>{tipCount}</span>
            <span className={styles.tipLabel}>{tipLabel}</span>
          </div>
        </div>

        <div className={styles.copy}>
          <p className={styles.figure}>
            <span className={styles.numWrap}>
              <span ref={numRef} className={styles.num}>
                {nLit}
              </span>
              <span ref={liveRef} className={styles.numLive} aria-hidden="true" />
            </span>
            <span className={styles.pct} aria-hidden="true">
              %
            </span>
          </p>
          <p id={statementId} className={styles.statement}>
            {statement}
          </p>
        </div>

        <div className={styles.legend}>
          <button
            type="button"
            className={[styles.legendBtn, active === 'hi' ? styles.legendBtnOn : ''].filter(Boolean).join(' ')}
            aria-pressed={active === 'hi'}
            aria-label={`${highlightLabel}, ${nLit} of 100`}
            {...legendProps('hi')}
          >
            <span className={[styles.swatch, styles.swatchHi].join(' ')} aria-hidden="true" />
            <span className={styles.legendLabel}>{highlightLabel}</span>
          </button>
          {nOther > 0 && (
            <button
              type="button"
              className={[styles.legendBtn, active === 'lo' ? styles.legendBtnOn : ''].filter(Boolean).join(' ')}
              aria-pressed={active === 'lo'}
              aria-label={`${otherLabel}, ${nOther} of 100`}
              {...legendProps('lo')}
            >
              <span className={styles.swatch} aria-hidden="true" />
              <span className={styles.legendLabel}>{otherLabel}</span>
            </button>
          )}
        </div>
      </div>

      <span className={styles.grain} aria-hidden="true" />
      <p className={styles.srOnly}>
        {nLit} of 100: {highlightLabel}. {nOther} of 100: {otherLabel}.
      </p>
    </div>
  );
}
