import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface HoneycombLensPhoto {
  image: string;
  caption?: string;
  alt?: string;
}

export interface HoneycombLensProps {
  photos?: HoneycombLensPhoto[];
  cellSize?: number;
  lensStrength?: number;
  className?: string;
}

const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=640&h=640&fit=crop&auto=format&q=70`;

export const defaultPhotos: HoneycombLensPhoto[] = [
  { image: img('1558642452-9d2a7deb7f62'), caption: 'Wildflower honey, poured slow' },
  { image: img('1509440159596-0249088772ff'), caption: 'Rye and spelt loaves' },
  { image: img('1567620905732-2d1ec7ab7445'), caption: 'Buttermilk stack' },
  { image: img('1495474472287-4d71bcdd2085'), caption: 'Flat whites for two' },
  { image: img('1499636136210-6f4ee915583e'), caption: 'Brown butter cookies' },
  { image: img('1490750967868-88aa4486c946'), caption: 'Poppies from the hive field' },
  { image: img('1484723091739-30a097e8f929'), caption: 'Brioche French toast' },
  { image: img('1488477181946-6428a0291777'), caption: 'Strawberry cream pots' },
  { image: img('1482049016688-2d3e1b311543'), caption: 'Soft eggs on greens' },
  { image: img('1563729784474-d77dbb933a9e'), caption: 'Rose cupcakes' },
  { image: img('1476224203421-9ac39bcb3327'), caption: 'The brunch board' },
  { image: img('1517248135467-4c7edcad34c4'), caption: 'Our dining room' },
  { image: img('1546069901-ba9599a7e63c'), caption: 'Salmon harvest bowl' },
  { image: img('1414235077428-338989a2e8c0'), caption: 'Supper club, Fridays' },
  { image: img('1506354666786-959d6d497f1a'), caption: 'Wood-fired pizza' },
  { image: img('1551218808-94e220e084d2'), caption: 'Prep at first light' },
];

type Cell = { x: number; y: number; r: number; photo: number; hero: boolean };
type Layout = { cells: Cell[]; width: number; height: number; floor: number };
type LensState = { x: number; y: number; p: number; vx: number; vy: number; vp: number };
type CellAnim = { e: number; ve: number; delay: number; fade: number; vfade: number };
type ImageRec = { img: HTMLImageElement | null; ok: boolean };

const SQRT3 = Math.sqrt(3);
const GROUND = '#0b0d12';
const STIFFNESS = 150;
const DAMPING = 20;
const REST_PRESENCE = 0.34;
const ENTRANCE_STIFF = 120;
const ENTRANCE_DAMP = 13;
const FADE_STIFF = 90;
const FADE_DAMP = 20;
const LENS_GROWTH = 1.2;
const GRID_HELP =
  'A photo collection shown through glass lenses. Move across it to magnify a lens. Arrow keys move between lenses; Enter opens a photo.';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function hexPolygon(): string {
  const pts: string[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k - Math.PI / 2;
    pts.push(`${(50 + 50 * Math.cos(a)).toFixed(2)}% ${(50 + 50 * Math.sin(a)).toFixed(2)}%`);
  }
  return `polygon(${pts.join(', ')})`;
}
const HEX_CLIP = hexPolygon();

function computeLayout(avail: number, count: number, cellSize: number): Layout {
  if (count <= 0) return { cells: [], width: avail, height: 140, floor: 140 };
  const margin = avail < 520 ? 14 : clamp(avail * 0.05, 18, 56);
  const inner = avail - margin * 2;
  const want = SQRT3 * (clamp(cellSize, 56, 300) / SQRT3);
  const cols = clamp(avail < 520 ? 3 : Math.round(inner / want), 2, Math.max(2, count));
  const hexW = Math.min(want * 1.35, inner / (cols + 0.5));
  const baseR = hexW / SQRT3;
  const cellR = baseR * 0.965;
  const rows = Math.ceil(count / cols);
  const padY = baseR * 1.05;
  const blockW = cols * hexW + (rows > 1 ? hexW / 2 : 0);
  const x0 = (avail - blockW) / 2 + hexW / 2;

  const cellAt = (idx: number) => {
    const row = Math.floor(idx / cols);
    const rowCount = row === rows - 1 ? count - row * cols : cols;
    const lead = ((cols - rowCount) * hexW) / 2;
    return { x: x0 + lead + (idx % cols) * hexW + (row % 2 ? hexW / 2 : 0), y: padY + baseR + row * baseR * 1.5 };
  };

  const focusX = avail * 0.42;
  const focusY = padY + baseR + ((rows - 1) * baseR * 1.5) / 2;
  let holeIdx = 0;
  let heroD = Infinity;
  for (let i = 0; i < count; i++) {
    const p = cellAt(i);
    const d = Math.hypot(p.x - focusX, p.y - focusY);
    if (d < heroD) {
      heroD = d;
      holeIdx = i;
    }
  }

  const hp = cellAt(holeIdx);
  const cells: Cell[] = [{ x: hp.x, y: hp.y, r: cellR, photo: 0, hero: true }];
  let photo = 1;
  for (let i = 0; i < count; i++) {
    if (i === holeIdx) continue;
    const p = cellAt(i);
    cells.push({ x: p.x, y: p.y, r: cellR, photo: photo++, hero: false });
  }

  const floor = padY + baseR * 2 + (rows - 1) * baseR * 1.5;
  return { cells, width: avail, height: floor + padY, floor };
}

/* lens falloff: the cell under the lens swells, neighbours ease back smoothly */
function falloff(c: Cell, x: number, y: number) {
  const q = Math.hypot(c.x - x, c.y - y) / (c.r * 1.35);
  return Math.exp(-q * q * 1.1);
}

function growthAt(c: Cell, x: number, y: number, presence: number, strength: number) {
  return LENS_GROWTH * strength * clamp(presence / REST_PRESENCE, 0, 1) * falloff(c, x, y);
}

/* fisheye displacement: cells move radially off the lens, smoothly, so swollen cells clear their neighbours */
function displaced(c: Cell, lx: number, ly: number, p: number, strength: number) {
  const dx = c.x - lx;
  const dy = c.y - ly;
  const d = Math.hypot(dx, dy);
  if (d < 1) return { x: c.x, y: c.y };
  const s = c.r * 3.4;
  const amp = c.r * 1.15 * strength * clamp(p / REST_PRESENCE, 0, 1) * clamp(d / (c.r * 0.7), 0, 1);
  const k = (amp * Math.exp(-((d / s) ** 2))) / d;
  return { x: c.x + dx * k, y: c.y + dy * k };
}

function pick(cells: Cell[], x: number, y: number, strength: number, slack = 1) {
  let best = -1;
  let bestD = Infinity;
  cells.forEach((c, i) => {
    const d = Math.hypot(c.x - x, c.y - y) / (c.r * (1 + growthAt(c, x, y, 1, strength)));
    if (d < bestD && d <= slack) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k - Math.PI / 2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (k) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

/* photo drawn through a convex lens — strip-based barrel magnification */
function drawPhoto(ctx: CanvasRenderingContext2D, im: HTMLImageElement, x: number, y: number, r: number, M: number) {
  const iw = im.naturalWidth;
  const ih = im.naturalHeight;
  if (!iw || !ih) return;
  const faceR = r;
  const drawW = SQRT3 * faceR;
  const drawH = 2 * faceR;
  const s = Math.max(drawW / iw, drawH / ih);
  const sw = drawW / s;
  const sh = drawH / s;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  const dx = x - drawW / 2;

  if (M < 1.03) {
    ctx.drawImage(im, sx, sy, sw, sh, dx, y - faceR, drawW, drawH);
    return;
  }
  const N = 16;
  const stripH = drawH / N;
  for (let j = 0; j < N; j++) {
    const y0 = y - faceR + j * stripH;
    const y1 = y0 + stripH + 0.7;
    const v = (y0 + stripH / 2 - y) / faceR;
    const m = 1 + (M - 1) * Math.max(0, 1 - v * v) - 0.14 * (M - 1) * v * v;
    const srcYFlat = sy + ((y0 + stripH / 2 - (y - faceR)) / drawH) * sh;
    const srcY = sy + sh / 2 + (srcYFlat - sy - sh / 2) / m;
    const srcH = (stripH / drawH) * sh / m;
    const sw2 = sw / m;
    const srcX = sx + (sw - sw2) / 2;
    ctx.drawImage(im, srcX, srcY - srcH / 2, sw2, srcH, dx, y0, drawW, y1 - y0);
  }
}

function drawFrosted(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number, noise: CanvasPattern | null) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#161a22';
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  if (noise) {
    ctx.save();
    hexPath(ctx, x, y, r);
    ctx.clip();
    ctx.globalAlpha *= 0.2;
    ctx.fillStyle = noise;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  const sheen = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, 0, x - r * 0.25, y - r * 0.3, r * 0.9);
  sheen.addColorStop(0, 'rgba(214,226,248,0.12)');
  sheen.addColorStop(1, 'rgba(214,226,248,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

export default function HoneycombLens({
  photos = defaultPhotos,
  cellSize = 150,
  lensStrength = 60,
  className,
}: HoneycombLensProps) {
  const uid = useId();
  const [avail, setAvail] = useState(900);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [focusIndex, setFocusIndex] = useState(0);
  const [focusIn, setFocusIn] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const strength = clamp(lensStrength, 0, 100) / 100;
  const layout = useMemo(() => computeLayout(avail, photos.length, cellSize), [avail, photos.length, cellSize]);

  const eng = useRef({
    layout,
    strength,
    reduced,
    inView,
    focusIndex,
    focusIn,
    photos,
    started: false,
    touched: false,
    frame: 0,
    needDraw: true,
    start: 0,
    sweepStart: 0,
    sweepT: -1,
    sweepX: 0,
    lens: { x: 0, y: 0, p: 0, vx: 0, vy: 0, vp: 0 } as LensState,
    target: { x: 0, y: 0, p: 0 },
    cellAnim: [] as CellAnim[],
    images: [] as ImageRec[],
    noise: null as CanvasPattern | null,
    active: -1,
    lastPoll: 0,
    srcKey: '',
    wake: null as (() => void) | null,
  });
  const E = eng.current;
  E.layout = layout;
  E.strength = strength;
  E.reduced = reduced;
  E.inView = inView;
  E.focusIndex = focusIndex;
  E.focusIn = focusIn;
  E.photos = photos;

  const canvasStyle = { inlineSize: layout.width, blockSize: layout.height } as CSSProperties;

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
    const ro = new ResizeObserver(([entry]) => setAvail(Math.max(280, entry.contentRect.width)));
    ro.observe(root);
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(root);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openIndex !== null && !dialog.open) dialog.showModal();
    if (openIndex === null && dialog.open) dialog.close();
  }, [openIndex]);

  const drawCell = useCallback((ctx: CanvasRenderingContext2D, c: Cell, idx: number, a: CellAnim, b: number, grow: number, flare: number) => {
    const { lens } = eng.current;
    const pos = displaced(c, lens.x, lens.y, lens.p, eng.current.strength);
    const x = pos.x;
    const y = pos.y + (1 - a.e) * c.r * 0.35;
    const r = c.r * (1 + grow) * (0.6 + 0.4 * a.e);
    const alpha = clamp(a.e * 1.7, 0, 1);
    if (alpha <= 0.01 || r <= 1) return;

    const E2 = eng.current;
    ctx.save();
    ctx.globalAlpha = alpha;

    // crisp gap: a ground-coloured keyline cuts whatever sits beneath this cell
    hexPath(ctx, x, y, r + 1.6);
    ctx.strokeStyle = GROUND;
    ctx.lineWidth = 3.2;
    ctx.stroke();

    // photo (or frosted glass) through the lens — a lens always refracts a little
    ctx.save();
    hexPath(ctx, x, y, r);
    ctx.clip();
    const rec = E2.images[c.photo];
    if (rec?.ok && rec.img) {
      const M = 1 + 0.62 * b + 0.07;
      drawPhoto(ctx, rec.img, x, y, r, M);
      if (a.fade < 0.99) drawFrosted(ctx, x, y, r, 1 - a.fade, E2.noise);
    } else {
      drawFrosted(ctx, x, y, r, 1, E2.noise);
    }
    // unifying tone: receding cells share one cool, muted grade; the focused cell keeps its true colour
    const sMax = LENS_GROWTH * Math.max(eng.current.strength, 0.01);
    const calm = 1 - clamp(grow / sMax, 0, 1);
    if (calm > 0.01) {
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = `rgba(112,128,158,${(0.5 * calm).toFixed(3)})`;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(8,11,18,${(0.24 * calm).toFixed(3)})`;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // glass tint — thicker and darker at the edges
    const tint = ctx.createRadialGradient(x - r * 0.18, y - r * 0.22, r * 0.1, x, y, r * 1.05);
    tint.addColorStop(0, 'rgba(255,255,255,0.03)');
    tint.addColorStop(0.6, 'rgba(10,13,20,0.07)');
    tint.addColorStop(1, 'rgba(4,6,10,0.55)');
    ctx.fillStyle = tint;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);

    // chromatic edges — a warm fringe on the lit side, cool opposite, plus a second inner fringe
    ctx.globalCompositeOperation = 'screen';
    const lw = Math.max(1.5, r * 0.026);
    ctx.lineWidth = lw;
    const rimA = (0.16 + b * 0.3 + flare * 0.2) * alpha;
    for (let k = 0; k < 6; k++) {
      const a1 = (Math.PI / 3) * k - Math.PI / 2;
      const a2 = (Math.PI / 3) * (k + 1) - Math.PI / 2;
      const x1 = x + r * Math.cos(a1);
      const y1 = y + r * Math.sin(a1);
      const x2 = x + r * Math.cos(a2);
      const y2 = y + r * Math.sin(a2);
      const lit = Math.max(0, Math.cos((a1 + a2) / 2 + 2.3));
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      const warm = rimA * (0.35 + lit * 0.75);
      const cool = rimA * (0.35 + (1 - lit) * 0.75);
      g.addColorStop(0, `rgba(255,108,52,${warm.toFixed(3)})`);
      g.addColorStop(0.5, `rgba(255,186,104,${(warm * 0.4).toFixed(3)})`);
      g.addColorStop(1, `rgba(80,124,255,${cool.toFixed(3)})`);
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      // inner fringe — reversed colours, thinner, the classic lens doublet
      const ix1 = x + (r - lw * 2.6) * Math.cos(a1);
      const iy1 = y + (r - lw * 2.6) * Math.sin(a1);
      const ix2 = x + (r - lw * 2.6) * Math.cos(a2);
      const iy2 = y + (r - lw * 2.6) * Math.sin(a2);
      const gi = ctx.createLinearGradient(ix1, iy1, ix2, iy2);
      gi.addColorStop(0, `rgba(84,128,255,${(cool * 0.6).toFixed(3)})`);
      gi.addColorStop(1, `rgba(255,118,62,${(warm * 0.55).toFixed(3)})`);
      ctx.strokeStyle = gi;
      ctx.lineWidth = Math.max(1, lw * 0.6);
      ctx.beginPath();
      ctx.moveTo(ix1, iy1);
      ctx.lineTo(ix2, iy2);
      ctx.stroke();
      ctx.lineWidth = lw;
    }
    ctx.restore();

    // specular streak — slides with the pointer, light on glass
    const px = clamp((lens.x - c.x) / (c.r * 3), -1, 1);
    const py = clamp((lens.y - c.y) / (c.r * 3), -1, 1);
    const specA = (0.1 + b * 0.1 + flare * 0.3) * alpha;
    ctx.save();
    ctx.translate(x - r * 0.3 - px * r * 0.09, y - r * 0.34 - py * r * 0.07);
    ctx.rotate(-0.55);
    const spec = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.45);
    spec.addColorStop(0, `rgba(255,252,244,${(specA * 1.25).toFixed(3)})`);
    spec.addColorStop(0.55, `rgba(238,244,255,${(specA * 0.32).toFixed(3)})`);
    spec.addColorStop(1, 'rgba(238,244,255,0)');
    ctx.fillStyle = spec;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.45, r * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // hot-spot glint — the macro light itself
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const glint = ctx.createRadialGradient(x - r * 0.22 - px * r * 0.06, y - r * 0.26 - py * r * 0.05, 0, x - r * 0.22 - px * r * 0.06, y - r * 0.26 - py * r * 0.05, Math.max(2, r * 0.045));
    glint.addColorStop(0, `rgba(255,255,250,${((0.3 + b * 0.2 + flare * 0.4) * alpha).toFixed(3)})`);
    glint.addColorStop(1, 'rgba(255,255,250,0)');
    ctx.fillStyle = glint;
    ctx.beginPath();
    ctx.arc(x - r * 0.22 - px * r * 0.06, y - r * 0.26 - py * r * 0.05, Math.max(2, r * 0.045), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // rim catching the key light
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const rimG = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    rimG.addColorStop(0, `rgba(230,240,255,${(0.18 + b * 0.3 + flare * 0.25).toFixed(3)})`);
    rimG.addColorStop(0.55, 'rgba(206,224,255,0.04)');
    rimG.addColorStop(1, 'rgba(206,224,255,0.07)');
    ctx.strokeStyle = rimG;
    ctx.lineWidth = 1.4;
    hexPath(ctx, x, y, r - 0.7);
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    if (eng.current.focusIn && eng.current.focusIndex === idx && eng.current.focusIndex >= 0) {
      ctx.save();
      hexPath(ctx, x, y, r + 3.5);
      ctx.strokeStyle = 'rgba(127,212,255,0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
      hexPath(ctx, x, y, r + 7);
      ctx.strokeStyle = 'rgba(127,212,255,0.16)';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();
    }
  }, []);

  const draw = useCallback(
    (now: number) => {
      const canvas = canvasRef.current;
      const lay = eng.current.layout;
      if (!canvas || !lay.cells.length) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = lay.width;
      const H = lay.height;
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // black ground with a soft key-light pool
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0b0d12');
      g.addColorStop(1, '#07080c');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const hero = lay.cells[0];
      const pool = ctx.createRadialGradient(hero.x, hero.y, 0, hero.x, hero.y, Math.max(W * 0.55, 260));
      pool.addColorStop(0, 'rgba(228,236,255,0.055)');
      pool.addColorStop(0.55, 'rgba(228,236,255,0.018)');
      pool.addColorStop(1, 'rgba(228,236,255,0)');
      ctx.fillStyle = pool;
      ctx.fillRect(0, 0, W, H);

      // entrance light sweep
      const E2 = eng.current;
      let sweepOn = false;
      if (E2.sweepT >= 0) {
        const p = clamp(E2.sweepT / 1350, 0, 1);
        const eased = p * p * (3 - 2 * p);
        E2.sweepX = -W * 0.15 + eased * W * 1.3;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const band = ctx.createLinearGradient(E2.sweepX - W * 0.13, 0, E2.sweepX + W * 0.13, 0);
        band.addColorStop(0, 'rgba(190,210,255,0)');
        band.addColorStop(0.5, 'rgba(190,210,255,0.07)');
        band.addColorStop(1, 'rgba(190,210,255,0)');
        ctx.fillStyle = band;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        sweepOn = true;
      }

      const { lens } = E2;

      // shadow layer — one soft pass under everything
      ctx.save();
      ctx.filter = 'blur(9px)';
      for (const c of lay.cells) {
        const a = E2.cellAnim[c.photo];
        if (!a || a.e < 0.05) continue;
        const b = lens.p * E2.strength * falloff(c, lens.x, lens.y);
        const grow = growthAt(c, lens.x, lens.y, lens.p, E2.strength);
        const rec = E2.images[c.photo];
        const lift = 1 + b * 0.9;
        const vis = rec?.ok ? clamp(a.fade, 0, 1) : 1;
        ctx.globalAlpha = clamp((0.26 + b * 0.22) * a.e * vis, 0, 1);
        const sp = displaced(c, lens.x, lens.y, lens.p, E2.strength);
        hexPath(ctx, sp.x + 3.5 * lift, sp.y + (5 + b * 9) * lift, c.r * (1 + grow) * 0.97 * (0.6 + 0.4 * a.e));
        ctx.fillStyle = '#000';
        ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;

      // lenses — bigger and lifted ones in front
      const order = lay.cells
        .map((c, i) => {
          const b = lens.p * E2.strength * falloff(c, lens.x, lens.y);
          const grow = growthAt(c, lens.x, lens.y, lens.p, E2.strength);
          const flare = sweepOn ? Math.exp(-(((c.x - E2.sweepX) ** 2) / (2 * (c.r * 1.6) ** 2))) : 0;
          return { c, i, b, grow, flare };
        })
        .sort((m, n2) => m.c.r * (1 + m.grow) - n2.c.r * (1 + n2.grow));
      for (const { c, i, b, grow, flare } of order) {
        const a = E2.cellAnim[c.photo];
        if (!a) continue;
        drawCell(ctx, c, i, a, b, grow, flare);
      }

      // reflection on the black glass floor
      const floor = lay.floor + 4;
      if (floor < H - 6) {
        const bandH = H - floor;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, floor, W, bandH);
        ctx.clip();
        ctx.globalAlpha = 0.19;
        ctx.translate(0, floor * 2);
        ctx.scale(1, -1);
        ctx.filter = 'blur(3px)';
        const srcY = Math.max(0, floor - bandH * 1.6) * dpr;
        const srcH = Math.min(canvas.height - srcY, bandH * 1.6 * dpr);
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, floor - bandH * 1.6, W, bandH * 1.6);
        ctx.restore();
        const fadeG = ctx.createLinearGradient(0, floor, 0, H);
        fadeG.addColorStop(0, 'rgba(7,8,12,0.25)');
        fadeG.addColorStop(1, 'rgba(7,8,12,1)');
        ctx.fillStyle = fadeG;
        ctx.fillRect(0, floor, W, bandH);
      }
      void now;
    },
    [drawCell],
  );

  // engine: springs, entrance, sweep, on-demand frames
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const E2 = eng.current;
    const lay = E2.layout;

    // grain pattern for frosted glass
    if (!E2.noise) {
      const nc = document.createElement('canvas');
      nc.width = 64;
      nc.height = 64;
      const nctx = nc.getContext('2d');
      if (nctx) {
        const id = nctx.createImageData(64, 64);
        for (let i = 0; i < id.data.length; i += 4) {
          const v = 120 + Math.random() * 135;
          id.data[i] = v;
          id.data[i + 1] = v + 6;
          id.data[i + 2] = v + 14;
          id.data[i + 3] = 255;
        }
        nctx.putImageData(id, 0, 0);
        E2.noise = ctx.createPattern(nc, 'repeat');
      }
    }

    // images — reload only when the set changes
    const srcKey = photos.map((p) => p.image).join('|');
    if (srcKey !== E2.srcKey) {
      E2.srcKey = srcKey;
      E2.images = photos.map((p) => {
        if (!p.image) return { img: null, ok: false };
        const im = new Image();
        const rec: ImageRec = { img: im, ok: false };
        im.onload = () => {
          rec.ok = true;
          E2.wake?.();
        };
        im.onerror = () => {
          E2.wake?.();
        };
        im.src = p.image;
        return rec;
      });
    }

    // per-cell anim state follows the current layout
    if (E2.cellAnim.length !== lay.cells.length) {
      const first = !E2.started;
      E2.cellAnim = lay.cells.map((c, i) => ({
        e: first && !reduced ? 0 : 1,
        ve: 0,
        delay: first && !reduced ? (Math.hypot(c.x - lay.cells[0].x, c.y - lay.cells[0].y) / Math.max(lay.width, 1)) * 420 + i * 14 : 0,
        fade: first ? 0 : 0,
        vfade: 0,
      }));
      if (first) {
        E2.started = true;
        E2.start = performance.now();
        E2.sweepT = reduced ? -1 : 0;
        E2.sweepStart = E2.start + 700;
        const hero = lay.cells[0];
        E2.lens = { x: hero.x, y: hero.y, p: 0, vx: 0, vy: 0, vp: 0 };
        E2.target = { x: hero.x, y: hero.y, p: REST_PRESENCE };
      }
    }

    if (!E2.touched) {
      const hero = lay.cells[0];
      if (hero) E2.target = { x: hero.x, y: hero.y, p: REST_PRESENCE };
    }

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const l = E2.lens;
      const t2 = E2.target;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      let moving = E2.needDraw;
      E2.needDraw = false;

      if (!E2.reduced) {
        for (let n = 0; n < steps; n++) {
          l.vx += (STIFFNESS * (t2.x - l.x) - DAMPING * l.vx) * h;
          l.vy += (STIFFNESS * (t2.y - l.y) - DAMPING * l.vy) * h;
          l.vp += (STIFFNESS * 0.6 * (t2.p - l.p) - DAMPING * 0.8 * l.vp) * h;
          l.x += l.vx * h;
          l.y += l.vy * h;
          l.p += l.vp * h;
        }
        moving =
          moving ||
          Math.abs(l.vx) + Math.abs(l.vy) > 0.4 ||
          Math.abs(t2.x - l.x) + Math.abs(t2.y - l.y) > 0.25 ||
          Math.abs(l.vp) + Math.abs(t2.p - l.p) > 0.002;
      } else {
        l.x = t2.x;
        l.y = t2.y;
        l.p = t2.p;
      }

      E2.layout.cells.forEach((c) => {
        const a = E2.cellAnim[c.photo];
        if (!a) return;
        if (!E2.reduced) {
          if (now >= E2.start + a.delay && a.e < 1) {
            for (let n = 0; n < steps; n++) {
              a.ve += (ENTRANCE_STIFF * (1 - a.e) - ENTRANCE_DAMP * a.ve) * h;
              a.e += a.ve * h;
            }
            moving = true;
          }
          const rec = E2.images[c.photo];
          const want = rec?.ok ? 1 : 0;
          if (Math.abs(a.fade - want) > 0.003 || Math.abs(a.vfade) > 0.003) {
            for (let n = 0; n < steps; n++) {
              a.vfade += (FADE_STIFF * (want - a.fade) - FADE_DAMP * a.vfade) * h;
              a.fade += a.vfade * h;
            }
            moving = true;
          }
          if (a.fade > 0.995 && want === 1) {
            a.fade = 1;
            a.vfade = 0;
          }
          if (a.e > 0.9995 && Math.abs(a.ve) < 0.015) {
            a.e = 1;
            a.ve = 0;
          }
        } else {
          a.e = 1;
          a.fade = E2.images[c.photo]?.ok ? 1 : 0;
        }
      });

      if (E2.sweepT >= 0) {
        E2.sweepT = now - E2.sweepStart;
        if (E2.sweepT > 1350) E2.sweepT = -1;
        moving = true;
      }

      if (now - E2.lastPoll > 140) {
        E2.lastPoll = now;
        const i = l.p > 0.18 ? pick(E2.layout.cells, E2.target.x, E2.target.y, E2.strength, 1.25) : -1;
        if (i !== E2.active) {
          E2.active = i;
          setActiveIndex(i);
        }
      }

      if (moving && E2.inView) {
        draw(now);
        raf = requestAnimationFrame(loop);
      } else {
        raf = 0;
      }
      E2.frame = raf;
    };
    E2.wake = () => {
      E2.needDraw = true;
      if (!E2.frame) {
        last = performance.now();
        E2.frame = requestAnimationFrame(loop);
      }
    };
    E2.wake();
    return () => {
      cancelAnimationFrame(E2.frame);
      E2.frame = 0;
      E2.wake = null;
    };
  }, [layout, reduced, draw, photos]);

  // re-draw when visibility or focus changes while the loop is parked
  useEffect(() => {
    eng.current.wake?.();
  }, [inView, focusIndex]);

  const aimAt = useCallback((x: number, y: number, p: number) => {
    const E2 = eng.current;
    E2.touched = true;
    E2.target = { x, y, p };
    E2.wake?.();
  }, []);

  const settle = useCallback(() => {
    const hero = eng.current.layout.cells[0];
    if (hero) aimAt(hero.x, hero.y, REST_PRESENCE);
  }, [aimAt]);

  const localPoint = (ev: PointerEvent<HTMLElement> | MouseEvent<HTMLElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  };

  const onPointerMove = (ev: PointerEvent<HTMLDivElement>) => {
    if (ev.pointerType !== 'mouse' && ev.buttons === 0) return;
    const { x, y } = localPoint(ev);
    aimAt(x, y, 1);
  };

  const onPointerDown = (ev: PointerEvent<HTMLDivElement>) => {
    if (ev.pointerType === 'mouse') return;
    const { x, y } = localPoint(ev);
    aimAt(x, y, 1);
  };

  const onPointerEnd = (ev: PointerEvent<HTMLDivElement>) => {
    if (ev.type === 'pointerleave' && ev.pointerType !== 'mouse') return;
    settle();
  };

  const onRootClick = (ev: MouseEvent<HTMLDivElement>) => {
    const { x, y } = localPoint(ev);
    const i = pick(layout.cells, x, y, strength);
    if (i >= 0) setOpenIndex(layout.cells[i].photo);
  };

  const focusCell = (i: number) => {
    setFocusIndex(i);
    cellRefs.current[i]?.focus();
  };

  const onCellFocus = (i: number) => {
    setFocusIndex(i);
    setFocusIn(true);
    const c = layout.cells[i];
    if (c) aimAt(c.x, c.y, 1);
  };

  const onRootBlur = (ev: FocusEvent<HTMLDivElement>) => {
    if (!ev.currentTarget.contains(ev.relatedTarget as Node | null)) {
      setFocusIn(false);
      settle();
    }
  };

  const onKeyDown = (ev: KeyboardEvent<HTMLDivElement>) => {
    const cells = layout.cells;
    const here = cells[focusIndex];
    if (!here) return;
    let next = -1;
    if (ev.key === 'ArrowRight') next = Math.min(cells.length - 1, focusIndex + 1);
    else if (ev.key === 'ArrowLeft') next = Math.max(0, focusIndex - 1);
    else if (ev.key === 'Home') next = 0;
    else if (ev.key === 'End') next = cells.length - 1;
    else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      const wantY = here.y + (ev.key === 'ArrowDown' ? 1 : -1) * here.r * 1.55;
      let best = -1;
      let bestD = Infinity;
      cells.forEach((c, i) => {
        if (i === focusIndex || Math.abs(c.y - wantY) > c.r * 1.1) return;
        const d = Math.hypot(c.x - here.x, c.y - wantY);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      next = best;
    }
    if (next < 0) return;
    ev.preventDefault();
    focusCell(next);
  };

  const open = openIndex !== null ? photos[openIndex] : undefined;
  const activeCell = activeIndex >= 0 ? layout.cells[activeIndex] : null;
  const activePhoto = activeCell ? photos[activeCell.photo] : null;
  const activeCaption = activePhoto ? activePhoto.caption || activePhoto.alt || '' : '';
  const captionBound = Math.min(layout.width, avail);
  const activeR = activeCell ? activeCell.r * (1 + growthAt(activeCell, E.target.x, E.target.y, 1, strength)) : 0;
  const captionStyle: CSSProperties | undefined = activeCell
    ? {
        insetInlineStart: clamp(activeCell.x, 110, captionBound - 110),
        insetBlockStart: activeCell.y + activeR * 0.8,
      }
    : undefined;

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={onPointerEnd}
      onClick={onRootClick}
      onKeyDown={onKeyDown}
      onBlur={onRootBlur}
    >
      <span className={styles.pool} aria-hidden="true" />
      <span className={styles.vignette} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />
      <span id={`${uid}-help`} className={styles.srHelp}>
        {GRID_HELP}
      </span>
      <canvas ref={canvasRef} className={styles.canvas} style={canvasStyle} />
      {layout.cells.map((c, i) => {
        const photo = photos[c.photo];
        if (!photo) return null;
        const label = photo.alt || photo.caption || `Photo ${c.photo + 1}`;
        const boxStyle = {
          insetInlineStart: c.x - c.r,
          insetBlockStart: c.y - c.r,
          inlineSize: c.r * 2,
          blockSize: c.r * 2,
          clipPath: HEX_CLIP,
        } as CSSProperties;
        return (
          <button
            key={`${i}-${c.photo}`}
            ref={(el) => {
              cellRefs.current[i] = el;
            }}
            type="button"
            className={styles.hit}
            style={boxStyle}
            tabIndex={i === focusIndex ? 0 : -1}
            aria-label={label}
            aria-describedby={`${uid}-help`}
            aria-haspopup="dialog"
            onFocus={() => onCellFocus(i)}
            onClick={(ev) => {
              ev.stopPropagation();
              setOpenIndex(c.photo);
            }}
          />
        );
      })}
      {activeCaption && captionStyle && (
        <span
          className={styles.caption}
          style={captionStyle}
          aria-hidden="true"
        >
          {activeCaption}
        </span>
      )}

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={open?.caption ? `${uid}-cap` : undefined}
        aria-label={open?.caption ? undefined : open?.alt || 'Photo'}
        onClose={() => {
          const i = openIndex;
          setOpenIndex(null);
          if (i !== null) {
            const cellI = layout.cells.findIndex((c) => c.photo === i);
            if (cellI >= 0) cellRefs.current[cellI]?.focus();
          }
        }}
        onClick={(ev) => {
          if (ev.target === ev.currentTarget) setOpenIndex(null);
        }}
      >
        {open && (
          <figure className={styles.sheet}>
            <span className={styles.sheetFrame}>
              {open.image ? (
                <img className={styles.sheetPhoto} src={open.image} alt={open.alt || open.caption || ''} />
              ) : (
                <span className={styles.sheetEmpty} aria-hidden="true" />
              )}
            </span>
            {open.caption && (
              <figcaption id={`${uid}-cap`} className={styles.sheetCaption}>
                {open.caption}
              </figcaption>
            )}
            <button type="button" className={styles.close} aria-label="Close" onClick={() => setOpenIndex(null)}>
              <svg className={styles.closeIcon} viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
              </svg>
            </button>
          </figure>
        )}
      </dialog>
    </div>
  );
}
