import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export type SandTimeFrameStyle = 'columns' | 'rods' | 'open';

export interface SandTimeCountdownProps {
  targetDate?: string;
  startDate?: string;
  heading?: string;
  finishedMessage?: string;
  sandColor?: string;
  frameStyle?: SandTimeFrameStyle;
  daysLabel?: string;
  hoursLabel?: string;
  minutesLabel?: string;
  className?: string;
}

/* ---------- time ---------- */

const MIN = 60000;
const HOUR = 3600000;
const DAY = 86400000;

function resolveTiming(targetDate: string | undefined, startDate: string | undefined, mountMs: number) {
  let target = Date.parse(targetDate ?? '');
  const fallback = !Number.isFinite(target);
  if (fallback) target = mountMs + 12 * DAY + 6 * HOUR + 24 * MIN;
  let start = Date.parse(startDate ?? '');
  if (!Number.isFinite(start) || start >= target) start = target - (fallback ? 17 : 30) * DAY;
  return { target, start };
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (p: number) => 1 - Math.pow(1 - clamp01(p), 3);

/* ---------- glass geometry (design units: 400 x 580, y runs down) ---------- */

const GW = 400;
const GH = 580;
const CX = 200;
const MID = 300;
const IN_TOP = 78;
const IN_BOT = 522;
const R_IN = 116;
const R_TOP = 72;
const NECK = 4.5;
const TM = 0.52;
const WALL = 6;
const DEG = Math.PI / 180;

function innerHalf(y: number): number {
  const t = Math.min(1, Math.abs(y - MID) / (MID - IN_TOP));
  if (t <= TM) {
    const u = t / TM;
    return NECK + (R_IN - NECK) * Math.pow(Math.sin((u * Math.PI) / 2), 0.8);
  }
  const v = (t - TM) / (1 - TM);
  return R_IN - (R_IN - R_TOP) * Math.pow(Math.sin((v * Math.PI) / 2), 2);
}

function outline(offset: number, cx: number, y0: number, y1: number, step = 3): string {
  const ys: number[] = [];
  for (let y = y0; y < y1; y += step) ys.push(y);
  ys.push(y1);
  const left = ys.map((y) => `${(cx - innerHalf(y) - offset).toFixed(2)} ${y}`);
  const right = ys
    .slice()
    .reverse()
    .map((y) => `${(cx + innerHalf(y) + offset).toFixed(2)} ${y}`);
  return `M${left.join('L')}L${right.join('L')}Z`;
}

function band(side: -1 | 1, y0: number, y1: number, inset0: number, inset1: number): string {
  const ys: number[] = [];
  for (let y = y0; y <= y1; y += 4) ys.push(y);
  const a = ys.map((y) => `${(CX + side * (innerHalf(y) - inset0)).toFixed(2)} ${y}`);
  const b = ys
    .slice()
    .reverse()
    .map((y) => `${(CX + side * (innerHalf(y) - inset1)).toFixed(2)} ${y}`);
  return `M${a.join('L')}L${b.join('L')}Z`;
}

function edgeLine(side: -1 | 1, y0: number, y1: number, inset: number): string {
  const pts: string[] = [];
  for (let y = y0; y <= y1; y += 4) pts.push(`${(CX + side * (innerHalf(y) - inset)).toFixed(2)} ${y}`);
  return `M${pts.join('L')}`;
}

const OUTER_PATH = outline(WALL, CX, 70, 530);
const INNER_PATH = outline(0, CX, IN_TOP, IN_BOT);
const INNER_LOCAL = outline(0, 0, IN_TOP, IN_BOT, 2);

const UP_CUM: number[] = (() => {
  const out = [0];
  for (let i = 0; i < MID - IN_TOP; i++) {
    const w = innerHalf(MID - i - 0.5);
    out.push(out[i] + Math.PI * w * w);
  }
  return out;
})();
const SAND_VOL = UP_CUM[UP_CUM.length - 1] * 0.6;
const REPOSE = 0.66;
const APEX = 7;

function levelFor(volume: number): number {
  if (volume <= 0) return MID;
  let lo = 0;
  let hi = UP_CUM.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (UP_CUM[m] >= volume) hi = m;
    else lo = m;
  }
  const span = UP_CUM[hi] - UP_CUM[lo] || 1;
  return MID - (lo + (volume - UP_CUM[lo]) / span);
}

function pileVolume(h0: number): number {
  let v = 0;
  for (let hp = 1; hp < h0; hp += 2) {
    const r = Math.min(innerHalf(IN_BOT - hp), (h0 - hp) / REPOSE);
    v += Math.PI * r * r * 2;
  }
  return v;
}

function solvePile(volume: number): number {
  if (volume <= 0) return 0;
  let lo = 0;
  let hi = IN_BOT - MID - 8;
  for (let i = 0; i < 18; i++) {
    const m = (lo + hi) / 2;
    if (pileVolume(m) < volume) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

/* ---------- turned brass posts ---------- */

const ellipse = (e: number, c: number, half: number, amp: number) =>
  amp * Math.sqrt(Math.max(0, 1 - Math.pow((e - c) / half, 2)));

function columnHW(e: number): number {
  if (e < 7) return 8;
  if (e < 9) return 8 - (e - 7);
  if (e >= 16 && e <= 26) return 6 + ellipse(e, 21, 5, 3.4);
  if (e >= 119 && e <= 127) return 6 + ellipse(e, 123, 4, 1.6);
  if (e >= 190) return 6 + 2.6 * Math.pow(Math.sin(((e - 190) / 38) * (Math.PI / 2)), 2);
  return 6;
}

function rodHW(e: number): number {
  if (e < 9) return 2.8 + ellipse(e, 4.5, 4.5, 2.4);
  return 2.8;
}

function postPath(cx: number, y0: number, len: number, hw: (e: number) => number): string {
  const ds: number[] = [];
  for (let d = 0; d < len; d += 1.5) ds.push(d);
  ds.push(len);
  const e = (d: number) => Math.min(d, len - d);
  const left = ds.map((d) => `${(cx - hw(e(d))).toFixed(2)} ${(y0 + d).toFixed(2)}`);
  const right = ds
    .slice()
    .reverse()
    .map((d) => `${(cx + hw(e(d))).toFixed(2)} ${(y0 + d).toFixed(2)}`);
  return `M${left.join('L')}L${right.join('L')}Z`;
}

const POST_Y0 = 72;
const POST_LEN = 456;
const POSTS = {
  columns: [postPath(66, POST_Y0, POST_LEN, columnHW), postPath(334, POST_Y0, POST_LEN, columnHW)],
  rods: [postPath(64, POST_Y0, POST_LEN, rodHW), postPath(336, POST_Y0, POST_LEN, rodHW)],
} as const;
const CAP_HALF: Record<SandTimeFrameStyle, number> = { columns: 152, rods: 146, open: 136 };

const CAP_PIECES = [
  { dy: 0, h: 6, inset: 34, rx: 3, dark: false },
  { dy: 6, h: 20, inset: 0, rx: 2.5, dark: false },
  { dy: 26, h: 4, inset: 4, rx: 1, dark: true },
  { dy: 30, h: 4, inset: 24, rx: 1.5, dark: true },
] as const;

/* ---------- colour helpers ---------- */

type RGB = [number, number, number];
const DEFAULT_SAND: RGB = [236, 212, 155];

function parseColor(input: string): RGB | null {
  const s = input.trim();
  const rgb = s.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  return null;
}
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- sand simulation (canvas, runs inside one effect) ---------- */

type Grain = { x: number; y: number; vx: number; vy: number; r: number; hi: boolean; splash: boolean; life: number };
type Slider = { u: number; side: number; speed: number };
type Glint = { region: 0 | 1; u: number; depth: number; phase: number; speed: number; size: number };

interface Sim {
  start: () => void;
  stop: () => void;
  drawStatic: () => void;
  refresh: () => void;
  kick: () => void;
}

interface Inputs {
  targetDate?: string;
  startDate?: string;
}

const GRAVITY = 1000;

export default function SandTimeCountdown({
  targetDate = '',
  startDate = '',
  heading = 'Meteor Night opens in',
  finishedMessage = 'The doors are open. Come on in.',
  sandColor = '#ecd49b',
  frameStyle = 'columns',
  daysLabel = 'Days',
  hoursLabel = 'Hours',
  minutesLabel = 'Minutes',
  className,
}: SandTimeCountdownProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gid = (n: string) => `${uid}${n}`;
  const url = (n: string) => `url(#${uid}${n})`;
  const headingId = `${uid}head`;

  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [clock, setClock] = useState<number | null>(null);
  const [intro, setIntro] = useState(0);

  const rootRef = useRef<HTMLElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Sim | null>(null);
  const mountRef = useRef(0);
  const inputs = useRef<Inputs>({});
  inputs.current = { targetDate, startDate };

  const staticMode = reduced || paused;

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
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    mountRef.current = Date.now();
    setClock(mountRef.current);
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  /* the canvas: created once, driven through simRef */
  useEffect(() => {
    const root = rootRef.current;
    const box = glassRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!root || !box || !canvas || !ctx) return;

    const glassIn = new Path2D(INNER_LOCAL);
    const rand = rng(7311);

    const sim = {
      w: 0,
      k: 1,
      dpr: 1,
      r: 1,
      rTarget: 1,
      done: false,
      th: 0,
      thV: 0,
      sl: 0,
      slV: 0,
      kickE: 0,
      energy: 0,
      impact: 0,
      spawnDebt: 0,
      introT0: -1,
      introDone: false,
      kickDir: 1,
      lastKick: 0,
      yL: MID,
      h0: 0,
    };
    let pal = { base: DEFAULT_SAND, hi: mix(DEFAULT_SAND, [255, 250, 228], 0.55), lo: mix(DEFAULT_SAND, [74, 50, 16], 0.5) };
    let raf = 0;
    let last = 0;
    const grains: Grain[] = [];
    const sliders: Slider[] = Array.from({ length: 28 }, () => ({ u: rand(), side: rand() < 0.5 ? -1 : 1, speed: 0.16 + rand() * 0.22 }));
    const glints: Glint[] = Array.from({ length: 22 }, (_, i) => ({
      region: (i % 2) as 0 | 1,
      u: rand() * 2 - 1,
      depth: rand() * 9,
      phase: rand() * Math.PI * 2,
      speed: 1.2 + rand() * 2.2,
      size: 2.2 + rand() * 3.2,
    }));

    /* grain texture, drawn once at 2x */
    const tex = document.createElement('canvas');
    tex.width = 256;
    tex.height = 256;
    let pattern: CanvasPattern | null = null;
    const buildTexture = () => {
      const t = tex.getContext('2d');
      if (!t) return;
      t.clearRect(0, 0, 256, 256);
      const r2 = rng(99);
      for (let i = 0; i < 2600; i++) {
        const light = r2() < 0.5;
        t.fillStyle = light ? css(pal.hi, 0.34 + r2() * 0.3) : css(pal.lo, 0.3 + r2() * 0.3);
        const s = 0.7 + r2() * 1.5;
        t.beginPath();
        t.arc(r2() * 256, r2() * 256, s, 0, Math.PI * 2);
        t.fill();
      }
      pattern = ctx.createPattern(tex, 'repeat');
      pattern?.setTransform(new DOMMatrix().scale(0.5));
    };

    const readPalette = () => {
      const c = parseColor(getComputedStyle(root).getPropertyValue('--stc-sand')) ?? DEFAULT_SAND;
      pal = { base: c, hi: mix(c, [255, 250, 228], 0.55), lo: mix(c, [74, 50, 16], 0.5) };
      buildTexture();
    };

    const timing = (now: number) => {
      const { target, start } = resolveTiming(inputs.current.targetDate, inputs.current.startDate, mountRef.current || now);
      const remain = target - now;
      return { r: clamp01(remain / (target - start)), done: remain <= 0 };
    };

    const resize = () => {
      const w = box.clientWidth;
      if (!w) return;
      sim.w = w;
      sim.dpr = Math.min(2, window.devicePixelRatio || 1);
      sim.k = w / GW;
      canvas.width = Math.round(w * sim.dpr);
      canvas.height = Math.round(w * sim.dpr * (GH / GW));
    };

    /* surfaces, in glass-local x (0 = centre) */
    const tanSlosh = () => Math.tan(sim.sl * DEG);
    const craterWidth = () => Math.min(innerHalf(sim.yL) * 0.92, 26 + (MID - sim.yL) * 0.8);
    const upperY = (x: number, t: number, ripple: boolean) => {
      const hs = MID - sim.yL;
      const cw = craterWidth();
      const depth = Math.min(cw * 0.6, hs * 0.9);
      const q = Math.max(0, 1 - Math.abs(x) / cw);
      let y = sim.yL + depth * Math.pow(q, 1.5);
      if (ripple) y += 0.55 * Math.sin(x * 0.26 + t * 1.1) * (1 - q * 0.6);
      y -= x * tanSlosh();
      return Math.min(y, MID + 3);
    };
    const pileY = (x: number, t: number, ripple: boolean) => {
      let hp = Math.max(0, sim.h0 - REPOSE * (Math.sqrt(x * x + APEX * APEX) - APEX));
      if (ripple && hp > 0) hp += sim.impact * 2.4 * Math.sin(x * 0.6 - t * 14) * Math.exp(-Math.abs(x) / 14);
      hp += x * tanSlosh() * 0.45;
      return IN_BOT - Math.max(0, hp);
    };

    const fillSand = (poly: Path2D, y0: number, y1: number, strata: ((c: CanvasRenderingContext2D) => void) | null) => {
      ctx.save();
      ctx.clip(glassIn);
      ctx.clip(poly);
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, css(pal.hi));
      g.addColorStop(0.1, css(mix(pal.hi, pal.base, 0.6)));
      g.addColorStop(0.4, css(pal.base));
      g.addColorStop(1, css(pal.lo));
      ctx.fillStyle = g;
      ctx.fillRect(-140, y0 - 6, 280, y1 - y0 + 12);
      const h = ctx.createLinearGradient(-R_IN, 0, R_IN, 0);
      h.addColorStop(0, 'rgba(30,16,2,0.6)');
      h.addColorStop(0.22, 'rgba(30,16,2,0)');
      h.addColorStop(0.58, 'rgba(255,240,200,0.07)');
      h.addColorStop(0.78, 'rgba(30,16,2,0)');
      h.addColorStop(1, 'rgba(30,16,2,0.55)');
      ctx.fillStyle = h;
      ctx.fillRect(-140, y0 - 6, 280, y1 - y0 + 12);
      if (strata) strata(ctx);
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(-140, y0 - 6, 280, y1 - y0 + 12);
      }
      ctx.restore();
    };

    const crest = (pts: number[][]) => {
      ctx.save();
      ctx.clip(glassIn);
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.lineJoin = 'round';
      ctx.strokeStyle = css(mix(pal.hi, [255, 255, 255], 0.35), 0.85);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.translate(0, 1.6);
      ctx.strokeStyle = css(pal.lo, 0.3);
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();
    };

    const draw = (t: number, live: boolean) => {
      const k = sim.k * sim.dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(k, 0, 0, k, CX * k, 0);

      const r = sim.r;
      const upperOn = r > 0.002;
      const lowerOn = 1 - r > 0.002;
      sim.yL = levelFor(r * SAND_VOL);
      sim.h0 = solvePile((1 - r) * SAND_VOL);
      const xs: number[] = [];
      for (let x = -128; x <= 128; x += 3) xs.push(x);

      if (lowerOn) {
        const pts = xs.map((x) => [x, pileY(x, t, live)]);
        const poly = new Path2D();
        pts.forEach((p, i) => (i ? poly.lineTo(p[0], p[1]) : poly.moveTo(p[0], p[1])));
        poly.lineTo(128, 540);
        poly.lineTo(-128, 540);
        poly.closePath();
        fillSand(poly, IN_BOT - sim.h0, IN_BOT, null);
        crest(pts);
      }

      if (upperOn) {
        const pts = xs.map((x) => [x, upperY(x, t, live)]);
        const poly = new Path2D();
        pts.forEach((p, i) => (i ? poly.lineTo(p[0], p[1]) : poly.moveTo(p[0], p[1])));
        poly.lineTo(128, MID + 3);
        poly.lineTo(-128, MID + 3);
        poly.closePath();
        fillSand(poly, sim.yL, MID + 3, (c) => {
          /* strata that bend into the funnel: sand layers dragged toward the neck */
          for (let n = 1; n <= 5; n++) {
            c.beginPath();
            xs.forEach((x, i) => {
              const y = upperY(x, t, false) + n * 17 * (1 - 0.25 * Math.min(1, Math.abs(x) / 90));
              if (i) c.lineTo(x, y);
              else c.moveTo(x, y);
            });
            c.strokeStyle = css(n % 2 ? pal.lo : pal.hi, n % 2 ? 0.2 : 0.16);
            c.lineWidth = 2.2;
            c.stroke();
          }
        });
        crest(pts);
      }

      const streaming = upperOn && !sim.done;
      if (streaming) {
        const land = pileY(0, t, false);
        const th = sim.th * DEG;
        const dist = Math.max(0, land - MID);
        const fall = Math.sqrt((2 * dist) / GRAVITY);
        const xLand = 0.5 * GRAVITY * Math.sin(th) * fall * fall;
        ctx.save();
        const core = ctx.createLinearGradient(0, MID - 6, 0, land);
        core.addColorStop(0, css(pal.hi, 0.9));
        core.addColorStop(1, css(pal.base, live ? 0.3 + sim.energy * 0.3 : 0.7));
        ctx.strokeStyle = core;
        ctx.lineWidth = live ? 1.1 + sim.energy * 0.8 : 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, MID - 6);
        ctx.quadraticCurveTo(0, MID + dist * 0.5, xLand, land);
        ctx.stroke();
        const glow = ctx.createRadialGradient(0, MID, 0, 0, MID, 15);
        glow.addColorStop(0, css(pal.hi, 0.55 + sim.energy * 0.25));
        glow.addColorStop(1, css(pal.hi, 0));
        ctx.fillStyle = glow;
        ctx.fillRect(-16, MID - 16, 32, 32);
        ctx.restore();
      }

      if (live) {
        ctx.save();
        ctx.clip(glassIn);
        const hiCss = css(pal.hi);
        const baseCss = css(pal.base);
        for (const g of grains) {
          ctx.globalAlpha = g.splash ? 0.6 : 0.95;
          ctx.fillStyle = g.hi ? hiCss : baseCss;
          const len = g.splash ? 0 : Math.min(8, g.vy * 0.011);
          ctx.fillRect(g.x - g.r / 2, g.y - len, g.r, g.r + len);
        }
        ctx.globalAlpha = 1;
        if (upperOn && MID - sim.yL > 14) {
          ctx.fillStyle = css(pal.hi, 0.9);
          const cw = craterWidth();
          const n = sim.w < 280 ? 12 : sliders.length;
          for (let i = 0; i < n; i++) {
            const s = sliders[i];
            const x = s.side * cw * (1 - s.u);
            ctx.fillRect(x - 0.6, upperY(x, t, false) - 1.2, 1.4, 1.4);
          }
        }
        ctx.restore();
      }

      /* warm glints on both surfaces */
      ctx.save();
      ctx.clip(glassIn);
      const boost = live ? 0.55 + sim.energy * 0.9 : 0.8;
      for (const g of glints) {
        let x: number;
        let y: number;
        if (g.region === 0) {
          if (!upperOn) continue;
          x = g.u * Math.min(craterWidth() * 1.6, innerHalf(sim.yL) * 0.85);
          y = upperY(x, t, false) + 1 + g.depth;
        } else {
          if (!lowerOn || sim.h0 < 6) continue;
          x = g.u * Math.min(sim.h0 / REPOSE, 92) * 0.8;
          y = pileY(x, t, false) + 1 + g.depth;
          if (IN_BOT - y < 1) continue;
        }
        if (Math.abs(x) > innerHalf(y) - 3) continue;
        const a = Math.pow(Math.max(0, Math.sin(g.phase + (live ? t * g.speed : 0.7))), 8) * boost;
        if (a < 0.05) continue;
        const L = g.size * (0.5 + a);
        ctx.strokeStyle = `rgba(255,238,196,${Math.min(1, a)})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(x - L, y);
        ctx.lineTo(x + L, y);
        ctx.moveTo(x, y - L * 0.8);
        ctx.lineTo(x, y + L * 0.8);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,248,226,${Math.min(1, a + 0.15)})`;
        ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
      }
      ctx.restore();
    };

    const setFinal = () => {
      const tm = timing(Date.now());
      sim.rTarget = tm.r;
      sim.done = tm.done;
      sim.r = tm.done ? 0 : tm.r;
      sim.th = 0;
      sim.thV = 0;
      sim.sl = 0;
      sim.slV = 0;
      sim.energy = 0;
      sim.kickE = 0;
      sim.impact = 0;
    };

    const step = (dt: number, now: number, t: number) => {
      /* time and the intro: sand starts full and drains to the true level */
      const tm = timing(Date.now());
      sim.done = tm.done;
      sim.rTarget = tm.done ? 0 : tm.r;
      if (sim.introT0 < 0) {
        sim.introT0 = sim.introDone ? now - 10 : now;
        if (!sim.introDone) sim.thV = -58;
      }
      const p = clamp01((now - sim.introT0) / 2.6);
      const drain = 1 - Math.pow(1 - p, 2.4);
      sim.r = p < 1 ? 1 + (sim.rTarget - 1) * drain : sim.rTarget;
      if (!sim.introDone) {
        setIntro(p);
        if (p >= 1) sim.introDone = true;
      }
      const introE = p < 1 ? 0.95 * Math.pow(1 - p, 0.7) : 0;
      sim.kickE *= Math.exp(-dt / 1.5);
      sim.energy = Math.max(introE, sim.kickE);
      sim.impact *= Math.exp(-dt / 0.25);

      /* the glass rocks on its plinth (spring) and the sand sloshes behind it (slower spring) */
      const sub = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / sub;
      for (let n = 0; n < sub; n++) {
        sim.thV += (-120 * sim.th - 5.2 * sim.thV) * h;
        sim.th += sim.thV * h;
        sim.slV += (60 * (sim.th - sim.sl) - 3.6 * sim.slV) * h;
        sim.sl += sim.slV * h;
      }
      box.style.transform = `rotate(${sim.th.toFixed(3)}deg)`;

      /* grains: the stream through the neck, splashes where it lands */
      const upperOn = sim.r > 0.002 && !sim.done;
      const thr = sim.th * DEG;
      const gx = GRAVITY * Math.sin(thr);
      const gy = GRAVITY * Math.cos(thr);
      const lite = clamp01(sim.w / 360) * 0.55 + 0.45;
      if (upperOn) {
        sim.spawnDebt += 120 * lite * (1 + sim.energy * 1.1) * dt;
        while (sim.spawnDebt >= 1 && grains.length < 260) {
          sim.spawnDebt -= 1;
          grains.push({
            x: (rand() - 0.5) * 2.2,
            y: MID - 5 - rand() * 4,
            vx: (rand() - 0.5) * 8,
            vy: 40 + rand() * 60,
            r: 0.9 + rand() * 0.9,
            hi: rand() < 0.35,
            splash: false,
            life: 0,
          });
        }
      } else sim.spawnDebt = 0;
      for (let i = grains.length - 1; i >= 0; i--) {
        const g = grains[i];
        g.vx += gx * dt;
        g.vy += gy * dt;
        g.vx *= 1 - 1.6 * dt;
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.life += dt;
        const wall = innerHalf(g.y) - 1.2;
        if (Math.abs(g.x) > wall) {
          g.x = Math.sign(g.x) * wall;
          g.vx *= -0.3;
        }
        const floor = pileY(g.x, t, false);
        if (g.y >= floor - 0.3 || g.life > 2.2) {
          if (!g.splash && g.y >= floor - 0.3) {
            sim.impact = Math.min(1, sim.impact + 0.08);
            if (rand() < 0.42) {
              grains.push({
                x: g.x,
                y: floor - 1,
                vx: (rand() - 0.5) * (50 + sim.energy * 70),
                vy: -(14 + rand() * 40),
                r: 0.8,
                hi: true,
                splash: true,
                life: 1.8,
              });
            }
          }
          grains.splice(i, 1);
        }
      }
      for (const s of sliders) {
        s.u += s.speed * dt * (0.5 + s.u * 1.8) * (1 + sim.energy);
        if (s.u >= 1) {
          s.u = rand() * 0.2;
          s.side = rand() < 0.5 ? -1 : 1;
        }
      }
    };

    const tick = (nowMs: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.033, (nowMs - last) / 1000);
      last = nowMs;
      step(dt, nowMs / 1000, nowMs / 1000);
      draw(nowMs / 1000, true);
    };

    const ro = new ResizeObserver(() => {
      resize();
      if (!raf) {
        setFinal();
        draw(0, false);
      }
    });
    ro.observe(box);
    resize();
    readPalette();

    simRef.current = {
      start: () => {
        if (raf) return;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      },
      stop: () => {
        cancelAnimationFrame(raf);
        raf = 0;
      },
      drawStatic: () => {
        box.style.transform = '';
        grains.length = 0;
        setFinal();
        sim.introDone = true;
        setIntro(1);
        draw(0, false);
      },
      refresh: () => {
        readPalette();
        if (!raf) {
          setFinal();
          draw(0, false);
        }
      },
      kick: () => {
        const now = performance.now();
        if (!raf || now - sim.lastKick < 650) return;
        sim.lastKick = now;
        sim.kickDir = -sim.kickDir;
        sim.thV += 72 * sim.kickDir;
        sim.kickE = 1;
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      simRef.current = null;
    };
  }, []);

  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    if (staticMode) {
      sim.stop();
      sim.drawStatic();
      return;
    }
    if (!inView) {
      sim.stop();
      return;
    }
    sim.start();
    return () => sim.stop();
  }, [staticMode, inView]);

  const minuteKey = clock === null ? 0 : Math.floor(clock / MIN);
  useEffect(() => {
    simRef.current?.refresh();
  }, [sandColor, targetDate, startDate, minuteKey]);

  /* ---------- derived numbers ---------- */

  const { target, start } = resolveTiming(targetDate, startDate, mountRef.current || clock || 0);
  const remain = clock === null ? 0 : Math.max(0, target - clock);
  const finished = clock !== null && remain <= 0;
  const real = [Math.floor(remain / DAY), Math.floor((remain % DAY) / HOUR), Math.floor((remain % HOUR) / MIN)];
  const progress = clock === null ? 0 : clamp01(1 - (target - clock) / Math.max(1, target - start));
  const p = staticMode ? 1 : intro;
  const shown = real.map((v, i) => Math.round(v * easeOut((p - i * 0.1) / 0.8)));
  const units = [daysLabel, hoursLabel, minutesLabel];
  const spoken = `${real[0]} ${daysLabel}, ${real[1]} ${hoursLabel}, ${real[2]} ${minutesLabel}`;

  const frame: SandTimeFrameStyle = frameStyle === 'rods' || frameStyle === 'open' ? frameStyle : 'columns';
  const capHalf = CAP_HALF[frame];

  const rootStyle = { '--stc-sand': sandColor, '--stc-progress': progress.toFixed(4), '--stc-play': paused ? 'paused' : 'running' } as CSSProperties;

  const kick = () => simRef.current?.kick();
  const onPointerEnter = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') kick();
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') kick();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      kick();
    }
  };

  const brushedFilters = (sfx: string) => (
    <>
      <filter id={gid('bl' + sfx)} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.75" numOctaves="2" seed="5" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 0.93  0 0 0 0 0.72  1.1 0 0 0 -0.34" result="c" />
        <feComposite in="c" in2="SourceAlpha" operator="in" />
      </filter>
      <filter id={gid('bd' + sfx)} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.75" numOctaves="2" seed="5" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.1  0 0 0 0 0.03  -1.1 0 0 0 0.72" result="c" />
        <feComposite in="c" in2="SourceAlpha" operator="in" />
      </filter>
    </>
  );

  const slab = (key: string, x: number, y: number, w: number, h: number, rx: number, dark: boolean) => (
    <g key={key}>
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={dark ? url('plateDk') : url('plate')} />
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={url('slabV')} />
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="#fff" filter={url('bl')} opacity={dark ? 0.2 : 0.55} />
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="#fff" filter={url('bd')} opacity={0.5} />
      <rect x={x + rx} y={y + 0.4} width={Math.max(0, w - rx * 2)} height="0.9" fill="rgba(255,247,214,0.7)" />
      <rect x={x + rx} y={y + h - 1.1} width={Math.max(0, w - rx * 2)} height="1" fill="rgba(28,16,2,0.55)" />
    </g>
  );

  const capSlabs = (top: boolean) =>
    CAP_PIECES.map((c, i) => {
      const hw = capHalf - c.inset;
      const y = top ? 38 + c.dy : 562 - c.dy - c.h;
      return slab(`${top ? 't' : 'b'}${i}`, CX - hw, y, hw * 2, c.h, c.rx, c.dark);
    });

  return (
    <section
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
      data-static={staticMode ? 'true' : undefined}
      aria-labelledby={heading ? headingId : undefined}
      aria-label={heading ? undefined : 'Countdown'}
    >
      <span className={styles.stars} aria-hidden="true" />
      <span className={styles.vignette} aria-hidden="true" />

      {heading && (
        <h2 id={headingId} className={styles.heading}>
          {heading}
        </h2>
      )}

      {!reduced && (
        <button
          type="button"
          className={styles.pause}
          aria-pressed={paused}
          aria-label={paused ? 'Resume the falling sand' : 'Pause the falling sand'}
          onClick={() => setPaused((v) => !v)}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
            {paused ? <path d="M4.5 2.5v11l9-5.5z" fill="currentColor" /> : <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor" />}
          </svg>
        </button>
      )}

      <div className={styles.stage}>
        <div className={styles.assembly}>
          <span className={styles.glow} aria-hidden="true" />
          <span className={styles.dial} aria-hidden="true">
            <span className={styles.ring} />
            <span className={styles.ringArc} />
            <span className={styles.ringInner} />
          </span>

          <div className={styles.rise}>
            <div className={styles.glassFrame}>
              <div
                ref={glassRef}
                className={styles.glass}
                tabIndex={0}
                role="img"
                aria-label="Hourglass"
                aria-description="Press Enter or Space to rock the glass."
                onPointerEnter={onPointerEnter}
                onPointerDown={onPointerDown}
                onKeyDown={onKeyDown}
              >
                <svg className={styles.layer} viewBox={`0 0 ${GW} ${GH}`} aria-hidden="true" focusable="false">
                  <defs>
                    <linearGradient id={gid('wall')} x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0" stopColor="#bff0f2" stopOpacity="0.55" />
                      <stop offset="0.12" stopColor="#8fd3d8" stopOpacity="0.22" />
                      <stop offset="0.5" stopColor="#6fb8c0" stopOpacity="0.1" />
                      <stop offset="0.88" stopColor="#8fd3d8" stopOpacity="0.2" />
                      <stop offset="1" stopColor="#bff0f2" stopOpacity="0.5" />
                    </linearGradient>
                    <linearGradient id={gid('void')} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="#0a3a42" stopOpacity="0.5" />
                      <stop offset="1" stopColor="#031a1f" stopOpacity="0.62" />
                    </linearGradient>
                  </defs>
                  <path d={INNER_PATH} fill={url('void')} />
                  <path d={OUTER_PATH + INNER_PATH} fillRule="evenodd" fill={url('wall')} />
                  <path d={OUTER_PATH} fill="none" stroke="rgba(205,245,248,0.42)" strokeWidth="1.1" />
                  <path d={INNER_PATH} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.8" />
                </svg>

                <canvas ref={canvasRef} className={styles.sandCanvas} aria-hidden="true" />

                <svg className={styles.layer} viewBox={`0 0 ${GW} ${GH}`} aria-hidden="true" focusable="false">
                  <defs>
                    {brushedFilters('')}
                    <clipPath id={gid('clip')}>
                      <path d={INNER_PATH} />
                    </clipPath>
                    <linearGradient id={gid('plate')} x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0" style={{ stopColor: 'var(--stc-brass-dk)' }} />
                      <stop offset="0.04" style={{ stopColor: 'var(--stc-brass-lo)' }} />
                      <stop offset="0.16" style={{ stopColor: 'var(--stc-brass)' }} />
                      <stop offset="0.3" style={{ stopColor: 'var(--stc-brass-hi)' }} />
                      <stop offset="0.43" style={{ stopColor: 'var(--stc-brass)' }} />
                      <stop offset="0.58" style={{ stopColor: 'var(--stc-brass-lo)' }} />
                      <stop offset="0.74" style={{ stopColor: 'var(--stc-brass)' }} />
                      <stop offset="0.86" style={{ stopColor: 'var(--stc-brass-hi)', stopOpacity: 0.85 }} />
                      <stop offset="0.96" style={{ stopColor: 'var(--stc-brass-lo)' }} />
                      <stop offset="1" style={{ stopColor: 'var(--stc-brass-dk)' }} />
                    </linearGradient>
                    <linearGradient id={gid('plateDk')} x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0" style={{ stopColor: 'var(--stc-brass-dk)' }} />
                      <stop offset="0.3" style={{ stopColor: 'var(--stc-brass-lo)' }} />
                      <stop offset="0.5" style={{ stopColor: 'var(--stc-brass-dk)' }} />
                      <stop offset="0.8" style={{ stopColor: 'var(--stc-brass-lo)' }} />
                      <stop offset="1" style={{ stopColor: 'var(--stc-brass-dk)' }} />
                    </linearGradient>
                    <linearGradient id={gid('slabV')} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="#fff6d6" stopOpacity="0.28" />
                      <stop offset="0.45" stopColor="#000" stopOpacity="0" />
                      <stop offset="1" stopColor="#031a1f" stopOpacity="0.42" />
                    </linearGradient>
                    <linearGradient id={gid('post')} x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0" style={{ stopColor: 'var(--stc-brass-dk)' }} />
                      <stop offset="0.16" style={{ stopColor: 'var(--stc-brass-lo)' }} />
                      <stop offset="0.34" style={{ stopColor: 'var(--stc-brass-hi)' }} />
                      <stop offset="0.48" style={{ stopColor: 'var(--stc-brass)' }} />
                      <stop offset="0.7" style={{ stopColor: 'var(--stc-brass-lo)' }} />
                      <stop offset="0.88" style={{ stopColor: 'var(--stc-brass)', stopOpacity: 0.9 }} />
                      <stop offset="1" style={{ stopColor: 'var(--stc-brass-dk)' }} />
                    </linearGradient>
                    <linearGradient id={gid('postV')} x1="0" x2="0" y1={POST_Y0} y2={POST_Y0 + POST_LEN} gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#000" stopOpacity="0.45" />
                      <stop offset="0.07" stopColor="#000" stopOpacity="0" />
                      <stop offset="0.93" stopColor="#000" stopOpacity="0" />
                      <stop offset="1" stopColor="#000" stopOpacity="0.45" />
                    </linearGradient>
                    <linearGradient id={gid('spec')} x1="0" x2="0" y1="96" y2="272" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#fff" stopOpacity="0" />
                      <stop offset="0.25" stopColor="#fff" stopOpacity="0.85" />
                      <stop offset="0.7" stopColor="#fff" stopOpacity="0.3" />
                      <stop offset="1" stopColor="#fff" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id={gid('spec2')} x1="0" x2="0" y1="330" y2="506" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#fff" stopOpacity="0" />
                      <stop offset="0.3" stopColor="#fff" stopOpacity="0.4" />
                      <stop offset="0.8" stopColor="#fff" stopOpacity="0.14" />
                      <stop offset="1" stopColor="#fff" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id={gid('warm')} x1="0" x2="0" y1="110" y2="272" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#ffd98a" stopOpacity="0" />
                      <stop offset="0.5" stopColor="#ffd98a" stopOpacity="0.5" />
                      <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id={gid('capShade')} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="#021418" stopOpacity="0.6" />
                      <stop offset="1" stopColor="#021418" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  <g clipPath={url('clip')}>
                    <rect x="60" y={IN_TOP} width="280" height="30" fill={url('capShade')} />
                    <rect x="60" y={IN_BOT - 30} width="280" height="30" fill={url('capShade')} transform={`rotate(180 ${CX} ${IN_BOT - 15})`} />
                  </g>
                  <path d={band(-1, 96, 272, 9, 19)} fill={url('spec')} opacity="0.5" />
                  <path d={edgeLine(-1, 96, 272, 6)} fill="none" stroke={url('spec')} strokeWidth="1.3" strokeLinecap="round" />
                  <path d={band(-1, 332, 506, 10, 17)} fill={url('spec2')} opacity="0.5" />
                  <path d={edgeLine(-1, 332, 506, 6)} fill="none" stroke={url('spec2')} strokeWidth="1.1" strokeLinecap="round" />
                  <path d={edgeLine(1, 110, 272, 5)} fill="none" stroke={url('warm')} strokeWidth="1.6" strokeLinecap="round" />

                  {frame !== 'open' &&
                    POSTS[frame].map((d, i) => (
                      <g key={i}>
                        <path d={d} fill={url('post')} />
                        <path d={d} fill={url('postV')} />
                        <path d={d} fill="#fff" filter={url('bl')} opacity="0.4" />
                        <path d={d} fill="#fff" filter={url('bd')} opacity="0.45" />
                      </g>
                    ))}

                  {capSlabs(true)}
                  {capSlabs(false)}
                </svg>
              </div>
            </div>

            <div className={styles.plinth}>
              <span className={styles.table} aria-hidden="true" />
              <span className={styles.cast} aria-hidden="true" />
              <svg className={styles.plinthGrain} aria-hidden="true" focusable="false">
                <defs>{brushedFilters('p')}</defs>
                <rect width="100%" height="100%" fill="#fff" filter={url('blp')} opacity="0.5" />
                <rect width="100%" height="100%" fill="#fff" filter={url('bdp')} opacity="0.5" />
              </svg>
              <span className={styles.plinthBevel} aria-hidden="true" />
            </div>

            <div className={[styles.readout, clock === null && styles.pending].filter(Boolean).join(' ')} role="timer" aria-label={finished ? finishedMessage : spoken}>
              {finished ? (
                <p className={styles.done}>{finishedMessage}</p>
              ) : (
                units.map((label, i) => (
                  <div key={i} className={styles.cell} aria-hidden="true">
                    <span key={`${i}-${real[i]}`} className={styles.num}>
                      {pad2(shown[i])}
                    </span>
                    <span className={styles.unit}>{label}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <span className={styles.rake} aria-hidden="true" />
        </div>
      </div>

      <svg className={styles.grain} aria-hidden="true" focusable="false">
        <defs>
          <filter id={gid('grain')} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.9  0 0 0 0 0.85  0 0 0 0 0.7  0 0 0 0.55 0" />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter={url('grain')} />
      </svg>
    </section>
  );
}
