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
    alt: 'Court Runner sneaker in onyx black',
  },
  {
    name: 'Powder',
    color: '#8ea4e8',
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
      im.src = v.image;
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
        const g = c.createRadialGradient(W * 0.3, H * 0.22, 0, W * 0.3, H * 0.22, Math.max(W, H));
        g.addColorStop(0, `rgb(${Math.min(255, pr + (255 - pr) * 0.45)},${Math.min(255, pg + (255 - pg) * 0.45)},${Math.min(255, pb + (255 - pb) * 0.45)})`);
        g.addColorStop(0.62, `rgb(${pr},${pg},${pb})`);
        g.addColorStop(1, `rgb(${pr * 0.8},${pg * 0.8},${pb * 0.8})`);
        c.fillStyle = g;
        c.fillRect(0, 0, W, H);
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
            {base?.image ? (
              <img className={styles.photo} src={base.image} alt={altFor(base)} />
            ) : (
              <div
                className={styles.pigment}
                style={{ '--pig': pigmentOf(base) } as CSSProperties}
                role="img"
                aria-label={altFor(base)}
              />
            )}
            {fadeV &&
              (fadeV.image ? (
                <img
                  className={[styles.fadeImg, fadeOn ? styles.fadeImgOn : ''].filter(Boolean).join(' ')}
                  src={fadeV.image}
                  alt=""
                />
              ) : (
                <div
                  className={[styles.pigment, styles.fadeImg, fadeOn ? styles.fadeImgOn : '']
                    .filter(Boolean)
                    .join(' ')}
                  style={{ '--pig': pigmentOf(fadeV) } as CSSProperties}
                  aria-hidden="true"
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
