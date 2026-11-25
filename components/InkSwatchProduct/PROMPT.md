Create a custom element called "Ink Swatch Product". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: product title, colour variants (image, colour name, swatch colour), default variant, swatch shape (circle or square). Add other settings if they help.

```tsx
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export interface InkSwatchVariant {
  image?: string;
  name: string;
  color?: string;
  alt?: string;
}

export interface InkSwatchProductProps {
  title?: string;
  variants?: InkSwatchVariant[];
  defaultIndex?: number;
  swatchShape?: 'circle' | 'square';
  className?: string;
}

import powderShoeImg from './images/powder-shoe.jpg';
import onyxShoeImg from './images/onyx-shoe.png';

export const defaultVariants: InkSwatchVariant[] = [
  {
    name: 'Ember',
    color: '#c8321f',
    image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=1400&h=1200&fit=crop&q=80',
    alt: 'Court Runner sneakers with ember red laces and accents',
  },
  {
    name: 'Onyx',
    color: '#1b1d26',
    image: onyxShoeImg,
    alt: 'Court Runner sneaker in onyx black',
  },
  {
    name: 'Powder',
    color: '#8ea4e8',
    image: powderShoeImg,
    alt: 'Court Runner sneaker in powder blue',
  },
  {
    name: 'Tangerine',
    color: '#f26a2e',
    image: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=1400&h=1200&fit=crop&q=80',
    alt: 'Court Runner sneaker in tangerine and tan',
  },
];

const PIGMENT_FALLBACK = '#84796a';
// Spring on bloom progress 0 -> 1, integrated in seconds (underdamped just enough to feel viscous).
const SPRING_K = 30;
const SPRING_C = 9.6;

/* ───────────────────────── noise (for the organic ink front) ───────────────────────── */

const hash2 = (ix: number, iy: number, seed: number) => {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed + 1, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

const vnoise = (x: number, y: number, seed: number) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

const fbm = (x: number, y: number, seed: number, oct: number) => {
  let amp = 0.5;
  let f = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < oct; o++) {
    sum += amp * vnoise(x * f, y * f, seed + o * 17);
    norm += amp;
    f *= 2.03;
    amp *= 0.5;
  }
  return sum / norm;
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (t: number) => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};

type Field = {
  gw: number;
  gh: number;
  n: Float32Array; // distortion of the front
  line: Float32Array; // thin pigment veins
  reach: Float32Array; // how far each vein runs ahead of the front
  grain: Float32Array;
};

const buildField = (gw: number, gh: number): Field => {
  const size = gw * gh;
  const n = new Float32Array(size);
  const line = new Float32Array(size);
  const reach = new Float32Array(size);
  const grain = new Float32Array(size);
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const i = y * gw + x;
      const u = x / gh;
      const v = y / gh;
      const wx = fbm(u * 1.7 + 3.1, v * 1.7 + 1.7, 5, 2);
      const wy = fbm(u * 1.7 + 8.2, v * 1.7 + 4.4, 11, 2);
      const qx = u + 1.15 * (wx - 0.5);
      const qy = v + 1.15 * (wy - 0.5);
      n[i] = clamp01(0.5 + (fbm(qx * 2.5, qy * 2.5, 23, 3) - 0.5) * 2.1);
      const f2 = fbm(qx * 6.2 + 20, qy * 6.2, 41, 2);
      const t = clamp01(1 - Math.abs(f2 - 0.5) * 15);
      line[i] = t * t;
      reach[i] = 0.2 + 0.8 * fbm(qx * 3.1 + 40, qy * 3.1 + 9, 59, 2);
      grain[i] = vnoise(x * 0.8, y * 0.8, 71);
    }
  }
  return { gw, gh, n, line, reach, grain };
};

/* ───────────────────────── helpers ───────────────────────── */

let scratchCtx: CanvasRenderingContext2D | null = null;
const resolveRgb = (css: string): [number, number, number] => {
  if (typeof document === 'undefined') return [132, 121, 106];
  if (!scratchCtx) {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    scratchCtx = c.getContext('2d', { willReadFrequently: true });
  }
  const ctx = scratchCtx;
  if (!ctx) return [132, 121, 106];
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#84796a';
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
};

const pigmentOf = (v: InkSwatchVariant | undefined) => v?.color || PIGMENT_FALLBACK;

/* ───────────────────────── painted fallback (no photo / photo failed) ─────────────────────────
   A flat-colour painted sneaker silhouette on a composed, pigment-tinted stage (horizon, sun disc,
   cast shadow). One scene description feeds both the SVG (resting state) and the canvas (ink bloom),
   so the reveal paints exactly what the frame ends up showing. Never a gradient, never a bloom. */

type RGB = [number, number, number];
type Shape = { d: string; fill?: string; stroke?: string; sw?: number; shoe?: boolean };

const SHOE_SX = 1.14;
const SHOE_SY = 1.06;
const SHOE_M: [number, number, number, number, number, number] = [SHOE_SX, 0, 0, SHOE_SY, 320 * (1 - SHOE_SX), 392 * (1 - SHOE_SY)];
const SCENE_W = 600;
const SCENE_H = 500;
const CREAM: RGB = [239, 234, 224];
const INK: RGB = [31, 27, 22];
const WHITE: RGB = [255, 255, 255];

const mixRgb = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const rgbCss = (c: RGB) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;

const UPPER = 'M140 362C132 322 134 272 148 238C154 224 168 216 186 218C208 222 226 238 240 256C252 244 264 220 284 210C296 204 308 210 316 222C332 248 352 268 386 282C428 298 480 302 504 334C512 344 514 354 514 362Z';
const HEEL = 'M140 362C132 322 134 272 148 238C154 226 166 220 176 220C186 252 192 300 194 362Z';
const QUARTER = 'M196 236C222 240 254 268 298 306C312 318 322 332 328 362L196 362Z';
const TOE_CAP = 'M440 296C466 300 492 310 508 338L514 362L442 362C450 340 450 314 440 296Z';
const COLLAR = 'M148 238C154 224 168 216 186 218C208 222 226 238 240 256C228 252 214 250 200 252C180 252 160 248 148 238Z';
const TONGUE = 'M240 256C252 244 264 220 284 210C296 204 308 210 316 222C322 232 328 242 336 250C320 242 304 240 292 244C276 248 260 256 250 268Z';
const SOLE = 'M132 374C132 363 138 356 150 356L488 356C506 356 516 366 514 376C512 386 500 392 486 392L152 392C140 392 132 386 132 374Z';
const OUTSOLE = 'M133 380H513C510 388 500 392 486 392H152C142 392 135 388 133 380Z';

// Lace bars straddle the eyestay line that runs from the tongue down to the vamp.
const laceBars = (() => {
  const dx = 0.818;
  const dy = 0.576;
  const px = -dy;
  const py = dx;
  const out: string[] = [];
  for (let i = 0; i < 4; i++) {
    const x = 302 + i * 28;
    const y = 226 + i * 20;
    const x0 = x + px * 2;
    const y0 = y + py * 2;
    const x1 = x + px * 26;
    const y1 = y + py * 26;
    out.push(`M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`);
  }
  return out;
})();

const sceneCache = new Map<string, Shape[]>();

const buildScene = (p: RGB): Shape[] => {
  const key = p.map(Math.round).join(',');
  const hit = sceneCache.get(key);
  if (hit) return hit;
  const lum = (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
  const dark = lum < 0.4;
  // Dark pigments get a pale stage, light pigments a deep one: the shoe always separates cleanly.
  const stage = dark ? mixRgb(p, CREAM, 0.78) : mixRgb(p, INK, 0.66);
  const disc = dark ? mixRgb(p, CREAM, 0.9) : mixRgb(p, INK, 0.5);
  const floor = dark ? mixRgb(p, CREAM, 0.6) : mixRgb(p, INK, 0.78);
  const shadow = dark ? mixRgb(p, CREAM, 0.42) : mixRgb(p, INK, 0.9);
  const toward = dark ? WHITE : INK;
  const scene: Shape[] = [
    { d: 'M-900 -700H1500V1200H-900Z', fill: rgbCss(stage) },
    { d: 'M100 290a230 230 0 1 0 460 0a230 230 0 1 0 -460 0Z', fill: rgbCss(disc) },
    { d: 'M-900 384H1500V1200H-900Z', fill: rgbCss(floor) },
    { d: 'M110 395a215 11 0 1 0 430 0a215 11 0 1 0 -430 0Z', fill: rgbCss(shadow), shoe: true },
    { d: UPPER, fill: rgbCss(p), shoe: true },
    { d: QUARTER, fill: rgbCss(mixRgb(p, toward, 0.14)), shoe: true },
    { d: HEEL, fill: rgbCss(mixRgb(p, toward, 0.3)), shoe: true },
    { d: TOE_CAP, fill: rgbCss(mixRgb(p, WHITE, 0.38)), shoe: true },
    { d: TONGUE, fill: rgbCss(mixRgb(p, WHITE, 0.38)), shoe: true },
    { d: COLLAR, fill: rgbCss(mixRgb(p, INK, 0.62)), shoe: true },
    ...laceBars.map((d) => ({ d, stroke: rgbCss(mixRgb(p, WHITE, 0.9)), sw: 9, shoe: true })),
    { d: SOLE, fill: rgbCss(mixRgb(p, WHITE, 0.84)), shoe: true },
    { d: OUTSOLE, fill: rgbCss(mixRgb(p, INK, 0.5)), shoe: true },
  ];
  sceneCache.set(key, scene);
  return scene;
};

// Same scene on a canvas, fitted like the SVG (xMidYMid meet; the stage rects overshoot so any aspect ratio is filled).
const paintScene = (c: CanvasRenderingContext2D, W: number, H: number, p: RGB) => {
  const s = Math.min(W / SCENE_W, H / SCENE_H);
  c.save();
  c.setTransform(s, 0, 0, s, (W - SCENE_W * s) / 2, (H - SCENE_H * s) / 2);
  c.lineCap = 'round';
  for (const sh of buildScene(p)) {
    const path = new Path2D(sh.d);
    c.save();
    if (sh.shoe) c.transform(...SHOE_M);
    if (sh.fill) {
      c.fillStyle = sh.fill;
      c.fill(path);
    }
    if (sh.stroke) {
      c.strokeStyle = sh.stroke;
      c.lineWidth = sh.sw ?? 1;
      c.stroke(path);
    }
    c.restore();
  }
  c.restore();
};

function PaintedFallback({
  pigment,
  label,
  className,
  decorative,
}: {
  pigment: string;
  label?: string;
  className?: string;
  decorative?: boolean;
}) {
  const shapes = buildScene(resolveRgb(pigment));
  return (
    <svg
      className={className}
      viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
      preserveAspectRatio="xMidYMid meet"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
    >
      {shapes.map((sh, i) => (
        <path
          key={i}
          d={sh.d}
          fill={sh.fill ?? 'none'}
          stroke={sh.stroke}
          strokeWidth={sh.sw}
          strokeLinecap="round"
          transform={sh.shoe ? `matrix(${SHOE_M.join(' ')})` : undefined}
        />
      ))}
    </svg>
  );
}

type Layer = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; data: ImageData };

const makeLayer = (gw: number, gh: number): Layer | null => {
  const canvas = document.createElement('canvas');
  canvas.width = gw;
  canvas.height = gh;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  return { canvas, ctx, data: ctx.createImageData(gw, gh) };
};

type Anim = {
  raf: number;
  clearRaf: number;
  running: boolean;
  hasSnap: boolean;
  finish: (() => void) | null;
};

export default function InkSwatchProduct({
  title = 'Court Runner 04',
  variants = defaultVariants,
  defaultIndex = 0,
  swatchShape = 'circle',
  className,
}: InkSwatchProductProps) {
  const clampIdx = (i: number) => {
    const n = variants.length;
    return n ? Math.min(Math.max(0, Math.floor(i) || 0), n - 1) : 0;
  };

  const [reduced, setReduced] = useState(false);
  const [selected, setSelected] = useState(() => clampIdx(defaultIndex));
  const [active, setActive] = useState(() => clampIdx(defaultIndex));
  const [fadeIdx, setFadeIdx] = useState<number | null>(null);
  const [fadeOn, setFadeOn] = useState(false);
  const [failed, setFailed] = useState<Record<string, true>>({});

  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapRef = useRef<HTMLCanvasElement | null>(null);
  const swatchRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const imgsRef = useRef<Array<HTMLImageElement | null>>([]);
  const fieldRef = useRef<Field | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, cssW: 0, cssH: 0, gw: 0, gh: 0 });
  const animRef = useRef<Anim>({ raf: 0, clearRaf: 0, running: false, hasSnap: false, finish: null });
  const fadeTimerRef = useRef(0);
  const canvasHasInk = useRef(false);
  const inViewRef = useRef(true);
  const reducedRef = useRef(false);
  const selectedRef = useRef(selected);
  const variantsRef = useRef(variants);
  variantsRef.current = variants;

  const imageKey = variants.map((v) => v.image || '').join('|');

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

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
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
      },
      { threshold: 0.05 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  // Preload every variant photo so the bloom never waits on the network.
  useEffect(() => {
    imgsRef.current = variantsRef.current.map((v) => {
      if (!v.image) return null;
      const im = new Image();
      im.decoding = 'async';
      const url = v.image;
      im.onerror = () => setFailed((f) => (f[url] ? f : { ...f, [url]: true }));
      im.src = url;
      return im;
    });
  }, [imageKey]);

  // Keep the canvas pixel-matched to the frame and warm the noise field.
  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    let warm = 0;
    const measure = () => {
      const cssW = box.clientWidth;
      const cssH = box.clientHeight;
      if (!cssW || !cssH) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.round(cssW * dpr);
      const h = Math.round(cssH * dpr);
      const s = sizeRef.current;
      if (s.w === w && s.h === h) return;
      if (animRef.current.running && animRef.current.finish) animRef.current.finish();
      const gw = Math.max(96, Math.min(380, Math.round(cssW / 2.8)));
      const gh = Math.max(64, Math.round((gw * cssH) / cssW));
      sizeRef.current = { w, h, cssW, cssH, gw, gh };
      canvas.width = w;
      canvas.height = h;
      animRef.current.hasSnap = false;
      fieldRef.current = null;
      window.clearTimeout(warm);
      warm = window.setTimeout(() => {
        const z = sizeRef.current;
        if (!fieldRef.current && z.gw) fieldRef.current = buildField(z.gw, z.gh);
      }, 160);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => {
      ro.disconnect();
      window.clearTimeout(warm);
    };
  }, []);

  useEffect(
    () => () => {
      const a = animRef.current;
      if (a.raf) cancelAnimationFrame(a.raf);
      if (a.clearRaf) cancelAnimationFrame(a.clearRaf);
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
    },
    [],
  );

  // If the owner edits the variant list, snap everything back into range.
  useEffect(() => {
    const n = variants.length;
    if (!n) return;
    if (selectedRef.current > n - 1 || active > n - 1) {
      const a = animRef.current;
      if (a.raf) cancelAnimationFrame(a.raf);
      a.raf = 0;
      a.running = false;
      const next = Math.min(selectedRef.current, n - 1);
      selectedRef.current = next;
      setSelected(next);
      setActive(next);
    }
  }, [variants.length, active]);

  /* ───────────────────────── the ink bloom ───────────────────────── */

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    animRef.current.hasSnap = false;
  };

  const startBloom = (idx: number, el: HTMLElement | null) => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    const ctx = canvas?.getContext('2d');
    const size = sizeRef.current;
    const a = animRef.current;
    if (!canvas || !box || !ctx || !size.w) {
      setActive(idx);
      return;
    }

    // Interrupt: freeze what is on screen right now, and bloom the next colour over it.
    if (a.raf) cancelAnimationFrame(a.raf);
    a.raf = 0;
    if (a.clearRaf) {
      cancelAnimationFrame(a.clearRaf);
      a.clearRaf = 0;
    }
    if (a.running || a.hasSnap || canvasHasInk.current) {
      let snap = snapRef.current;
      if (!snap) {
        snap = document.createElement('canvas');
        snapRef.current = snap;
      }
      if (snap.width !== canvas.width || snap.height !== canvas.height) {
        snap.width = canvas.width;
        snap.height = canvas.height;
      }
      const sctx = snap.getContext('2d');
      if (sctx) {
        sctx.clearRect(0, 0, snap.width, snap.height);
        sctx.drawImage(canvas, 0, 0);
        a.hasSnap = true;
      }
    }

    const { w: W, h: H, gw, gh } = size;
    if (!fieldRef.current || fieldRef.current.gw !== gw || fieldRef.current.gh !== gh) {
      fieldRef.current = buildField(gw, gh);
    }
    const field = fieldRef.current;

    const mkLayers = () => {
      const l = [makeLayer(gw, gh), makeLayer(gw, gh), makeLayer(gw, gh), makeLayer(gw, gh)];
      return l.every(Boolean) ? (l as Layer[]) : null;
    };
    const layers = mkLayers();
    const tmp = document.createElement('canvas');
    tmp.width = W;
    tmp.height = H;
    const tctx = tmp.getContext('2d');
    if (!layers || !tctx) {
      setActive(idx);
      return;
    }
    const [maskL, underL, washL, rimL] = layers;

    // Origin = the tapped swatch, in frame space (may sit outside the frame: the ink flows in from it).
    const boxRect = box.getBoundingClientRect();
    let ox: number;
    let oy: number;
    if (el) {
      const r = el.getBoundingClientRect();
      ox = ((r.left + r.width / 2 - boxRect.left) / boxRect.width) * gw;
      oy = ((r.top + r.height / 2 - boxRect.top) / boxRect.height) * gh;
    } else {
      ox = gw * 0.5;
      oy = gh * 1.1;
    }

    // Distorted distance field from the origin: the organic, fingered shape of the front.
    const dd = new Float32Array(gw * gh);
    let minDD = Infinity;
    let maxDD = 0;
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x;
        const d = Math.hypot(x - ox, y - oy) * (1 + 0.72 * (field.n[i] - 0.5));
        dd[i] = d;
        if (d < minDD) minDD = d;
        if (d > maxDD) maxDD = d;
      }
    }

    const [pr, pg, pb] = resolveRgb(pigmentOf(variantsRef.current[idx]));
    const darkRgb: [number, number, number] = [pr * 0.45, pg * 0.45, pb * 0.45];
    const veinRgb: [number, number, number] = [pr * 0.72, pg * 0.72, pb * 0.72];
    for (let i = 0; i < gw * gh; i++) {
      const o = i * 4;
      underL.data.data[o] = pr;
      underL.data.data[o + 1] = pg;
      underL.data.data[o + 2] = pb;
      washL.data.data[o] = Math.min(255, pr * 1.04);
      washL.data.data[o + 1] = Math.min(255, pg * 1.04);
      washL.data.data[o + 2] = Math.min(255, pb * 1.04);
    }

    const R0 = Math.max(0, minDD - 2);
    const span0 = Math.max(10, maxDD - R0);
    const Rmax = maxDD + 14;
    const span = Rmax - R0;

    const src = imgsRef.current[idx];
    const paintSource = (c: CanvasRenderingContext2D) => {
      if (src && src.complete && src.naturalWidth) {
        const sc = Math.max(W / src.naturalWidth, H / src.naturalHeight);
        const dw = src.naturalWidth * sc;
        const dh = src.naturalHeight * sc;
        c.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
      } else {
        paintScene(c, W, H, [pr, pg, pb]);
      }
    };

    const maskA = maskL.data.data;
    const underA = underL.data.data;
    const washA = washL.data.data;
    const rimA = rimL.data.data;

    const render = (p: number) => {
      const pc = Math.max(0, p);
      const R = R0 + span * pc;
      const grow = R - R0;
      const D = 6 + 0.15 * grow;
      const invD = 1 / D;
      const Wd = 5 + 0.12 * grow;
      const L = 8 + 0.24 * grow;
      const Dv = 1.6 * D;
      const fade = 1 - smooth((pc - 0.66) / 0.34);
      const SOFT = 2.2;

      for (let i = 0, n = gw * gh; i < n; i++) {
        const o = i * 4 + 3;
        const s = R - dd[i];
        let m = 0;
        let ua = 0;
        let wa = 0;
        let ra = 0;
        if (s > 0) {
          m = s >= SOFT ? 1 : smooth(s / SOFT);
          wa = 0.74 * Math.exp(-s * invD) * fade * m;
        } else if (s > -Wd) {
          const q = 1 + s / Wd;
          ua = q * q * 0.82 * (0.55 + 0.45 * field.grain[i]);
        }
        // wet rim + shine hugging the front
        let rimW = 0;
        let shineW = 0;
        if (s > -2.5 && s < 9) {
          const e = s - 1.4;
          rimW = 0.62 * Math.exp(-(e * e) * 0.41);
          const e2 = s - 4.6;
          shineW = s > 0 ? 0.34 * Math.exp(-(e2 * e2) * 0.26) : 0;
        }
        // pigment veins: run ahead of the front, thin out behind it
        let veinW = 0;
        const ln = field.line[i];
        if (ln > 0.03) {
          const sv = s + L * field.reach[i];
          if (sv > 0) {
            const decay = s <= 0 ? 1 : 1 - smooth(s / Dv);
            veinW = ln * smooth(sv / 4) * decay * 0.9 * fade;
          }
        }
        maskA[o] = m * 255;
        underA[o] = ua * 255;
        washA[o] = wa * 255;
        const tot = rimW + shineW + veinW;
        if (tot > 0.004) {
          const rr = (darkRgb[0] * rimW + veinRgb[0] * veinW + 255 * shineW) / tot;
          const rg = (darkRgb[1] * rimW + veinRgb[1] * veinW + 255 * shineW) / tot;
          const rb = (darkRgb[2] * rimW + veinRgb[2] * veinW + 255 * shineW) / tot;
          ra = 1 - (1 - Math.min(1, rimW)) * (1 - Math.min(1, veinW)) * (1 - Math.min(1, shineW));
          rimA[o - 3] = rr;
          rimA[o - 2] = rg;
          rimA[o - 1] = rb;
        }
        rimA[o] = ra * 255;
      }

      maskL.ctx.putImageData(maskL.data, 0, 0);
      underL.ctx.putImageData(underL.data, 0, 0);
      washL.ctx.putImageData(washL.data, 0, 0);
      rimL.ctx.putImageData(rimL.data, 0, 0);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      if (a.hasSnap && snapRef.current) ctx.drawImage(snapRef.current, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(underL.canvas, 0, 0, gw, gh, 0, 0, W, H);

      tctx.setTransform(1, 0, 0, 1, 0, 0);
      tctx.globalCompositeOperation = 'source-over';
      tctx.clearRect(0, 0, W, H);
      paintSource(tctx);
      tctx.globalCompositeOperation = 'destination-in';
      tctx.imageSmoothingEnabled = true;
      tctx.imageSmoothingQuality = 'high';
      tctx.drawImage(maskL.canvas, 0, 0, gw, gh, 0, 0, W, H);
      ctx.drawImage(tmp, 0, 0);

      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(washL.canvas, 0, 0, gw, gh, 0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(rimL.canvas, 0, 0, gw, gh, 0, 0, W, H);
      canvasHasInk.current = true;
    };

    let prog = 0;
    let vel = 0.95;
    let last = 0;
    a.running = true;

    const finish = () => {
      if (!a.running) return;
      a.running = false;
      if (a.raf) cancelAnimationFrame(a.raf);
      a.raf = 0;
      a.finish = null;
      // Final frame = the full new photo; commit it as the base, then drop the canvas two frames later.
      render(1.4);
      setActive(idx);
      a.clearRaf = requestAnimationFrame(() => {
        a.clearRaf = requestAnimationFrame(() => {
          a.clearRaf = 0;
          clearCanvas();
          canvasHasInk.current = false;
        });
      });
    };
    a.finish = finish;

    const step = (now: number) => {
      if (!a.running) return;
      if (!inViewRef.current) {
        finish();
        return;
      }
      const dt = last ? Math.min(0.034, (now - last) / 1000) : 1 / 60;
      last = now;
      vel += ((1 - prog) * SPRING_K - vel * SPRING_C) * dt;
      prog += vel * dt;
      if (Math.abs(1 - prog) < 0.002 && Math.abs(vel) < 0.02) {
        finish();
        return;
      }
      render(prog);
      a.raf = requestAnimationFrame(step);
    };

    render(0);
    a.raf = requestAnimationFrame(step);
  };

  const select = (next: number, el: HTMLElement | null) => {
    const n = variants.length;
    if (!n) return;
    const idx = ((Math.floor(next) % n) + n) % n;
    if (idx === selectedRef.current) return;
    selectedRef.current = idx;
    setSelected(idx);

    if (reducedRef.current) {
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
      setFadeIdx(idx);
      setFadeOn(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFadeOn(true));
      });
      fadeTimerRef.current = window.setTimeout(() => {
        fadeTimerRef.current = 0;
        setActive(idx);
        setFadeIdx(null);
        setFadeOn(false);
      }, 200);
      return;
    }
    startBloom(idx, el);
  };

  const onGroupKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = variants.length;
    if (!n) return;
    const cur = selectedRef.current;
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (cur + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (cur - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next === null) return;
    e.preventDefault();
    const el = swatchRefs.current[next];
    if (el) el.focus();
    select(next, el);
  };

  const sel = Math.min(selected, Math.max(0, variants.length - 1));
  const base = variants[Math.min(active, Math.max(0, variants.length - 1))];
  const fadeV = fadeIdx !== null ? variants[fadeIdx] : undefined;
  const pigActive = pigmentOf(variants[sel]);
  const hasPhoto = (v: InkSwatchVariant | undefined) => !!v?.image && !failed[v.image];
  const markFailed = (url: string) => setFailed((f) => (f[url] ? f : { ...f, [url]: true }));
  const altFor = (v: InkSwatchVariant | undefined) => (v ? v.alt || `${title} in ${v.name}` : title);
  const square = swatchShape === 'square';
  const titleLen = title.length;
  const titleCls = titleLen > 46 ? styles.titleLong : titleLen > 22 ? styles.titleMid : '';

  const rootStyle = { '--pig-active': pigActive } as CSSProperties;

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <div className={styles.tint} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.layout}>
        <figure className={styles.figure}>
          <div className={styles.halo} aria-hidden="true">
            <div className={styles.haloShape} />
          </div>
          <div className={styles.frame} ref={boxRef}>
            {hasPhoto(base) ? (
              <img
                className={styles.photo}
                src={base?.image}
                alt={altFor(base)}
                onError={() => base?.image && markFailed(base.image)}
              />
            ) : (
              <PaintedFallback className={styles.pigment} pigment={pigmentOf(base)} label={altFor(base)} />
            )}
            {fadeV &&
              (hasPhoto(fadeV) ? (
                <img
                  className={[styles.fadeImg, fadeOn ? styles.fadeImgOn : ''].filter(Boolean).join(' ')}
                  src={fadeV.image}
                  alt=""
                  onError={() => fadeV.image && markFailed(fadeV.image)}
                />
              ) : (
                <PaintedFallback
                  className={[styles.pigment, styles.fadeImg, fadeOn ? styles.fadeImgOn : ''].filter(Boolean).join(' ')}
                  pigment={pigmentOf(fadeV)}
                  decorative
                />
              ))}
            <canvas ref={canvasRef} className={styles.bloom} aria-hidden="true" />
          </div>
        </figure>

        <div className={styles.meta}>
          {title ? <h3 className={[styles.title, titleCls].filter(Boolean).join(' ')}>{title}</h3> : null}
          <div className={styles.picker}>
            <p className={styles.colorRow} aria-live="polite">
              <span key={`name-${sel}`} className={styles.colorName}>
                {variants[sel]?.name}
              </span>
            </p>
            <div
              className={styles.swatches}
              role="radiogroup"
              aria-label={title ? `${title}, colour` : 'Colour variants'}
              onKeyDown={onGroupKeyDown}
            >
              {variants.map((v, i) => {
                const checked = i === sel;
                return (
                  <button
                    key={`${v.name}-${i}`}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    tabIndex={checked ? 0 : -1}
                    title={v.name}
                    className={styles.swatch}
                    ref={(node) => {
                      swatchRefs.current[i] = node;
                    }}
                    onClick={(e) => select(i, e.currentTarget)}
                  >
                    <span
                      className={[
                        styles.chip,
                        square ? styles.chipSquare : '',
                        checked ? styles.chipChecked : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{ '--pig': pigmentOf(v) } as CSSProperties}
                      aria-hidden="true"
                    >
                      <span
                        className={[
                          styles.ripple,
                          square ? styles.rippleSquare : '',
                          checked ? styles.rippleOn : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      />
                    </span>
                    <span className={[styles.swatchName, checked ? styles.swatchNameChecked : ''].filter(Boolean).join(' ')}>
                      {v.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

```css
.root {
  --stage: #efeae0;
  --ink: #1f1b16;
  --muted: #5c5444;
  --hairline: rgba(31, 27, 22, 0.16);
  --pig-active: #c8321f;
  --focus: color-mix(in srgb, var(--pig-active) 60%, var(--ink));
  --font-display: 'Bricolage Grotesque', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --font-ui: 'Instrument Sans', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --edge-wide: polygon(100% 0, 100% 100%, 9.62% 100.0%, 10.44% 96.4%, 10.94% 92.9%, 12.2% 89.3%, 12.28% 85.7%, 9.77% 82.1%, 6.99% 78.6%, 6.18% 75.0%, 6.01% 71.4%, 5.04% 67.9%, 4.71% 64.3%, 5.83% 60.7%, 6.06% 57.1%, 4.11% 53.6%, 2.35% 50.0%, 2.63% 46.4%, 3.43% 42.9%, 3.76% 39.3%, 5.34% 35.7%, 8.52% 32.1%, 10.49% 28.6%, 9.98% 25.0%, 9.27% 21.4%, 9.69% 17.9%, 9.62% 14.3%, 8.68% 10.7%, 9.04% 7.1%, 10.86% 3.6%, 11.25% 0.0%);
  --edge-narrow: polygon(0 0, 100% 0, 100.0% 97.44%, 96.4% 97.89%, 92.9% 98.17%, 89.3% 98.86%, 85.7% 98.9%, 82.1% 97.52%, 78.6% 95.99%, 75.0% 95.55%, 71.4% 95.46%, 67.9% 94.92%, 64.3% 94.74%, 60.7% 95.36%, 57.1% 95.48%, 53.6% 94.41%, 50.0% 93.44%, 46.4% 93.6%, 42.9% 94.04%, 39.3% 94.22%, 35.7% 95.09%, 32.1% 96.84%, 28.6% 97.92%, 25.0% 97.64%, 21.4% 97.25%, 17.9% 97.48%, 14.3% 97.44%, 10.7% 96.93%, 7.1% 97.12%, 3.6% 98.12%, 0.0% 98.34%);
  --noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  container-type: inline-size;
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 20px;
  overflow: clip;
  background: var(--stage);
  color: var(--ink);
  font-family: var(--font-ui);
}

.tint {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-color: var(--pig-active);
  opacity: 0.2;
  -webkit-mask-image: radial-gradient(70% 90% at 0% 100%, #000 0%, transparent 100%);
  mask-image: radial-gradient(70% 90% at 0% 100%, #000 0%, transparent 100%);
  transition: background-color 900ms cubic-bezier(0.22, 1, 0.36, 1) 120ms;
}

.grain {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background-image: var(--noise);
  opacity: 0.07;
  mix-blend-mode: multiply;
}

.layout {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

.figure {
  position: relative;
  margin: 0;
  display: grid;
  aspect-ratio: 5 / 6;
}

.halo {
  position: absolute;
  inset: 0;
  filter: blur(18px);
  opacity: 0.55;
  transform: translateY(10px);
}

.haloShape {
  position: absolute;
  inset: 0;
  background-color: var(--pig-active);
  clip-path: var(--edge-narrow);
  transition: background-color 700ms cubic-bezier(0.22, 1, 0.36, 1) 100ms;
}

.frame {
  position: relative;
  overflow: hidden;
  background: color-mix(in srgb, var(--pig-active) 30%, var(--stage));
  clip-path: var(--edge-narrow);
}

.photo {
  position: absolute;
  inset: 0;
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

.pigment {
  position: absolute;
  inset: 0;
  display: block;
  inline-size: 100%;
  block-size: 100%;
}

.fadeImg {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 150ms ease;
}

.fadeImgOn {
  opacity: 1;
}

.bloom {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  pointer-events: none;
}

.meta {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 26px;
  padding: 24px clamp(20px, 5cqw, 36px) 30px;
}

.title {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(44px, 14cqw, 64px);
  line-height: 0.92;
  letter-spacing: -0.035em;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.titleMid {
  font-size: clamp(32px, 10cqw, 46px);
  line-height: 0.96;
}

.titleLong {
  font-size: clamp(24px, 7cqw, 32px);
  line-height: 1.02;
  letter-spacing: -0.025em;
}

.picker {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.colorRow {
  margin: 0;
  min-block-size: 1.2em;
}

.colorName {
  position: relative;
  display: inline-block;
  padding-block-end: 7px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(22px, 6cqw, 30px);
  line-height: 1.1;
  letter-spacing: -0.015em;
  overflow-wrap: anywhere;
  animation: nameRise 520ms cubic-bezier(0.22, 1, 0.36, 1) 160ms both;
}

.colorName::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  block-size: 4px;
  border-radius: 999px;
  background: var(--pig-active);
  transform-origin: left center;
  animation: barWipe 760ms cubic-bezier(0.2, 0.8, 0.2, 1) 120ms both;
}

.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
}

.swatch {
  appearance: none;
  border: 0;
  margin: 0;
  padding: 6px 4px 2px;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  -webkit-tap-highlight-color: transparent;
}

.swatch:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 3px;
  border-radius: 14px;
}

.chip {
  position: relative;
  display: block;
  inline-size: 48px;
  block-size: 48px;
  border-radius: 999px;
  background: var(--pig);
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.14),
    0 0 0 0 var(--stage),
    0 0 0 0 var(--ink);
  transition:
    transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 260ms ease;
}

.chipSquare {
  border-radius: 13px;
}

.swatch:hover .chip {
  transform: scale(1.07);
}

.swatch:active .chip {
  transform: scale(0.9);
}

.chipChecked {
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.14),
    0 0 0 3px var(--stage),
    0 0 0 5px var(--ink);
}

.ripple {
  position: absolute;
  inset: -9px;
  border-radius: 999px;
  border: 2px solid var(--pig);
  opacity: 0;
  pointer-events: none;
}

.rippleSquare {
  border-radius: 20px;
}

.rippleOn {
  animation: rippleOut 760ms cubic-bezier(0.22, 1, 0.36, 1) 40ms both;
}

.swatchName {
  max-inline-size: 76px;
  overflow-wrap: anywhere;
  text-align: center;
  font-size: 13px;
  line-height: 1.3;
  color: var(--muted);
  transition: color 200ms ease;
}

.swatchNameChecked {
  color: var(--ink);
  font-weight: 700;
}

@container (min-width: 760px) {
  .layout {
    grid-template-columns: minmax(0, 5fr) minmax(0, 8fr);
    align-items: stretch;
  }

  .figure {
    grid-column: 2;
    grid-row: 1;
    aspect-ratio: 6 / 5;
    /* A tall meta column (long title, many swatches) must not stretch the figure: the aspect ratio
       would then widen it past its grid track and clip the artwork off the right edge. */
    align-self: center;
    min-inline-size: 0;
  }

  .halo {
    transform: translateX(-12px);
  }

  .haloShape,
  .frame {
    clip-path: var(--edge-wide);
  }

  .frame {
    border-start-end-radius: 20px;
    border-end-end-radius: 20px;
  }

  .meta {
    grid-column: 1;
    grid-row: 1;
    justify-content: space-between;
    gap: 32px;
    padding: clamp(28px, 3.6cqw, 48px) 0 clamp(28px, 3.6cqw, 48px) clamp(28px, 3.8cqw, 52px);
    padding-inline-end: clamp(8px, 1cqw, 16px);
  }

  .title {
    font-size: clamp(56px, 8.4cqw, 104px);
  }

  .titleMid {
    font-size: clamp(42px, 6cqw, 68px);
  }

  .titleLong {
    font-size: clamp(28px, 3.4cqw, 40px);
  }

  .colorName {
    font-size: clamp(26px, 3cqw, 38px);
  }

  .picker {
    gap: 18px;
  }
}

@keyframes nameRise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes barWipe {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

@keyframes rippleOut {
  from {
    opacity: 0.9;
    transform: scale(0.6);
  }
  to {
    opacity: 0;
    transform: scale(1.35);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tint,
  .haloShape {
    transition: none;
  }

  .colorName,
  .colorName::after,
  .rippleOn {
    animation: none;
  }

  .ripple {
    display: none;
  }

  .chip {
    transition: none;
  }

  .swatch:hover .chip,
  .swatch:active .chip {
    transform: none;
  }
}
```
