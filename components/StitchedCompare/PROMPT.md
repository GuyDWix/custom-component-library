Create a custom element called "Stitched Compare". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: before image, before image description, before label, after image, after image description, after label, thread colour. Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface StitchedCompareProps {
  beforeImage?: string;
  beforeAlt?: string;
  beforeLabel?: string;
  afterImage?: string;
  afterAlt?: string;
  afterLabel?: string;
  threadColor?: string;
  className?: string;
}

const STIFFNESS = 170;
const DAMPING = 21;
const KEY_STEP = 3;
const VIEW_W = 1000;
const VIEW_H = 625;
const STITCH_N = 12;

const SEAM_HELP =
  'Drag the stitched seam to compare the two photos; left and right arrow keys nudge it, Escape recentres it.';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (x: number) => {
  const c = clamp(x, 0, 1);
  return c * c * (3 - 2 * c);
};
const f1 = (v: number) => v.toFixed(1);
const frac = (v: number) => v - Math.floor(v);
const rnd = (i: number, k: number) => frac(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453);
const zeros = (n: number) => new Array<number>(n).fill(0);

// Every SVG path of the seam, in paint order (bottom to top).
const PATH_KEYS = [
  'gapShade',
  'selvBase',
  'selvPicks',
  'selvStripe',
  'selvEdge',
  'selvGleam',
  'creaseDark',
  'creaseLight',
  'ringDark',
  'ringLight',
  'uShadowSoft',
  'uShadow',
  'uBase',
  'uMid',
  'uBands',
  'uRidges',
  'uSheen',
  'oShadowSoft',
  'oShadow',
  'oBase',
  'oMid',
  'oBands',
  'oRidges',
  'oSheen',
  'holes',
  'holeLip',
  'fray',
] as const;
type PathKey = (typeof PATH_KEYS)[number];

interface Seam {
  paths: Record<PathKey, string>;
  clipL: string;
  clipR: string;
  hw: number;
  gap: number;
  cut: number;
  tw: number;
  sheen: number;
  pk: number;
}

interface Hole {
  x: number;
  y: number;
  ux: number;
  uy: number;
  t: number;
}

const hemWidth = (w: number) => clamp(Math.round(w * 0.02), 16, 26);
const baseGap = (w: number) => clamp(w * 0.0095, 7, 12);

// <geo>
const ell = (cx: number, cy: number, rx: number, ry: number, rot: number, segs: number) => {
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  let d = '';
  for (let s = 0; s < segs; s++) {
    const a = (Math.PI * 2 * s) / segs;
    const ex = Math.cos(a) * rx;
    const ey = Math.sin(a) * ry;
    d += `${s ? 'L' : 'M'}${f1(cx + ex * cr - ey * sr)} ${f1(cy + ex * sr + ey * cr)}`;
  }
  return `${d}Z`;
};

const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, segs: number) => {
  let d = '';
  for (let s = 0; s <= segs; s++) {
    const a = a0 + ((a1 - a0) * s) / segs;
    d += `${s ? 'L' : 'M'}${f1(cx + Math.cos(a) * rx)} ${f1(cy + Math.sin(a) * ry)}`;
  }
  return d;
};

const buildSeam = (pos: number, w: number, h: number, n: number, tens: number[], tg0: number): Seam => {
  const p: Record<string, string> = {};
  for (const k of PATH_KEYS) p[k] = '';

  const tg = clamp(tg0, 0, 1);
  const hw = hemWidth(w);
  const W = clamp(w * 0.0034, 2.6, 3.8);
  const sc = W / 3.4;
  const g0 = baseGap(w);
  const gap = g0 * (1 + 0.75 * tg);
  const inset = hw * 0.42;
  const x = (pos / 100) * w;
  const xl = x - gap / 2;
  const xr = x + gap / 2;
  const sp = h / n;
  const vh = sp * 0.27;
  const pitch = W * 1.05 * (1 + 0.3 * tg);
  const ampK = clamp(w / 1000, 0.65, 1.15);

  const ten = (i: number) => tens[clamp(i, 0, n - 1)] ?? 0;
  const amp = (i: number) => (0.7 + 4.3 * clamp(ten(i), 0, 1)) * (0.85 + 0.3 * rnd(i, 1)) * ampK;

  // How far the cut edge retreats between stitches (fabric balloons away from the thread).
  const retreat = (y: number) => {
    const c = clamp(Math.floor(y / sp), 0, n - 1);
    const u = y / sp - (c + 0.5);
    const a = u < 0 ? lerp(amp(c - 1), amp(c), u + 1) : lerp(amp(c), amp(c + 1), u);
    return a * smooth((Math.abs(u) - 0.28) / 0.22);
  };

  const ys: number[] = [];
  for (let i = 0; i < n; i++) for (let k = 0; k < 6; k++) ys.push(sp * (i + k / 6));
  ys.push(h);
  const rs = ys.map(retreat);
  const xsL = rs.map((r) => xl - r);
  const xsR = rs.map((r) => xr + r);
  const line = (xs: number[], dx: number) =>
    xs.map((v, k) => `${k ? 'L' : 'M'}${f1(v + dx)} ${f1(ys[k])}`).join('');

  p.gapShade = line(xsL, 1.6) + line(xsR, -1.6);
  p.selvBase = line(xsL, -1.6) + line(xsR, 1.6);
  p.selvPicks = p.selvBase;
  const sd = inset * 0.52 + 1;
  p.selvStripe = line(xsL, -sd) + line(xsR, sd);
  p.selvEdge = line(xsL, 0.2) + line(xsR, -0.2);
  p.selvGleam = line(xsL, -0.9) + line(xsR, 0.9);

  const clipL = `polygon(${rs.map((r, k) => `${f1(hw - r)}px ${f1(ys[k])}px`).join(',')},0px ${f1(h)}px,0px 0px)`;
  const clipR = `polygon(${rs.map((r, k) => `${f1(r)}px ${f1(ys[k])}px`).join(',')},${hw}px ${f1(h)}px,${hw}px 0px)`;

  const holes: Hole[] = [];
  const addHole = (hx: number, hy: number, ox: number, oy: number) => {
    const dx = ox - hx;
    const dy = oy - hy;
    const l = Math.hypot(dx, dy) || 1;
    holes.push({ x: hx, y: hy, ux: dx / l, uy: dy / l, t: clamp(ten(Math.floor(hy / sp)), -0.6, 1) });
  };

  const shadowK = [1.2 * sc, 1.9 * sc];
  const thread = (g: 'u' | 'o', ax: number, ay: number, bx: number, by: number, sag: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len;
    let ny = dx / len;
    if (ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    const cx = (ax + bx) / 2 + nx * sag * 2;
    const cy = (ay + by) / 2 + ny * sag * 2;
    const shifted = (ox: number, oy: number) =>
      `M${f1(ax + ox)} ${f1(ay + oy)}Q${f1(cx + ox)} ${f1(cy + oy)} ${f1(bx + ox)} ${f1(by + oy)}`;
    const body = shifted(0, 0);
    p[`${g}ShadowSoft`] += shifted(shadowK[0] * 1.7, shadowK[1] * 1.7);
    p[`${g}Shadow`] += shifted(shadowK[0], shadowK[1]);
    p[`${g}Base`] += body;
    p[`${g}Mid`] += body;

    // Highlight rides the lit side (light from the top-left).
    let hx = -dy / len;
    let hy = dx / len;
    if (hx + hy > 0) {
      hx = -hx;
      hy = -hy;
    }
    const hl = shifted(hx * W * 0.2, hy * W * 0.2);
    p[`${g}Sheen`] += hl;

    // Ply twist: oblique grooves and crests across the thread.
    const arcLen = len + (8 * sag * sag) / (3 * len);
    const m = Math.max(3, Math.round(arcLen / pitch));
    const at = (u: number): [number, number, number, number] => {
      const a = (1 - u) * (1 - u);
      const b = 2 * u * (1 - u);
      const c = u * u;
      const tx = 2 * (1 - u) * (cx - ax) + 2 * u * (bx - cx);
      const ty = 2 * (1 - u) * (cy - ay) + 2 * u * (by - cy);
      const tl = Math.hypot(tx, ty) || 1;
      return [a * ax + b * cx + c * bx, a * ay + b * cy + c * by, tx / tl, ty / tl];
    };
    const hwt = W * 0.47;
    const al = pitch * 0.36;
    for (let k = 0; k < m; k++) {
      const [px, py, tx, ty] = at((k + 0.5) / m);
      const qx = -ty;
      const qy = tx;
      p[`${g}Bands`] += `M${f1(px + qx * hwt - tx * al)} ${f1(py + qy * hwt - ty * al)}L${f1(px - qx * hwt + tx * al)} ${f1(py - qy * hwt + ty * al)}`;
      const [rx, ry, rtx, rty] = at(Math.min(0.97, (k + 1) / m));
      const sx = -rty;
      const sy = rtx;
      p[`${g}Ridges`] += `M${f1(rx + sx * hwt * 0.8 - rtx * al * 0.8)} ${f1(ry + sy * hwt * 0.8 - rty * al * 0.8)}L${f1(rx - sx * hwt * 0.8 + rtx * al * 0.8)} ${f1(ry - sy * hwt * 0.8 + rty * al * 0.8)}`;
    }
    const [, , etx, ety] = at(1);
    return [etx, ety] as const;
  };

  const frayEnd = (ex: number, ey: number, tx: number, ty: number) => {
    const angs = [-0.42, -0.14, 0.16, 0.44];
    const lens = [3.6, 5.6, 4.4, 6.4];
    for (let j = 0; j < angs.length; j++) {
      const ca = Math.cos(angs[j]);
      const sa = Math.sin(angs[j]);
      const dx = tx * ca - ty * sa;
      const dy = tx * sa + ty * ca;
      const l = lens[j] * sc * (0.85 + 0.3 * rnd(j, 9));
      p.fray += `M${f1(ex)} ${f1(ey)}Q${f1(ex + dx * l * 0.6 - dy * 0.8)} ${f1(ey + dy * l * 0.6 + dx * 0.8)} ${f1(ex + dx * l)} ${f1(ey + dy * l)}`;
    }
  };

  const restChord = Math.hypot(2 * inset + g0, 2 * vh);
  const sagRest = restChord * 0.106;
  const slackF = (t: number) => (t < 0 ? 1 - t * 1.3 : Math.max(0, 1 - t * 1.7));
  const pull = 1.7 * ampK;

  // Lead-in hole and tail at the top.
  const yTop0 = sp * 0.5 - vh;
  const yH0 = Math.max(6, yTop0 - sp * 0.4);
  const tailUp = clamp(w * 0.018, 9, 20);
  const hx0 = xl - inset - retreat(yH0) + pull * clamp(ten(0), 0, 1);
  const tailTop: [number, number] = [hx0 - W * 2.2, -tailUp];
  addHole(hx0, yH0, tailTop[0], tailTop[1]);
  const topTan = thread('o', hx0, yH0, tailTop[0], tailTop[1], 4.5 * sc);
  frayEnd(tailTop[0], tailTop[1], topTan[0], topTan[1]);

  for (let i = 0; i < n; i++) {
    const t = ten(i);
    const yc = sp * (i + 0.5);
    const yT = yc - vh + (rnd(i, 2) - 0.5) * sp * 0.07;
    const yB = yc + vh + (rnd(i, 7) - 0.5) * sp * 0.07;
    const e = pull * clamp(t, 0, 1);
    const hxL = (y: number, j: number) => xl - inset - retreat(y) + e + (rnd(i, j) - 0.5) * 1.0;
    const hxR = (y: number, j: number) => xr + inset + retreat(y) - e + (rnd(i, j + 4) - 0.5) * 1.0;
    const tl: [number, number] = [hxL(yT, 10), yT];
    const bl: [number, number] = [hxL(yB, 11), yB];
    const tr: [number, number] = [hxR(yT, 12), yT];
    const br: [number, number] = [hxR(yB, 13), yB];
    addHole(tl[0], tl[1], br[0], br[1]);
    addHole(br[0], br[1], tl[0], tl[1]);
    addHole(tr[0], tr[1], bl[0], bl[1]);
    addHole(bl[0], bl[1], tr[0], tr[1]);

    const sagA = sagRest * (0.75 + 0.5 * rnd(i, 20)) * slackF(t);
    const sagB = sagRest * (0.75 + 0.5 * rnd(i, 21)) * slackF(t);
    const aOver = i % 2 === 1;
    thread(aOver ? 'o' : 'u', tl[0], tl[1], br[0], br[1], sagA);
    thread(aOver ? 'u' : 'o', tr[0], tr[1], bl[0], bl[1], sagB);
  }

  // Tail and lead-out hole at the bottom.
  const yBot = sp * (n - 0.5) + vh;
  const yH1 = Math.min(h - 6, yBot + sp * 0.4);
  const tailDown = clamp(w * 0.018, 9, 20);
  const hx1 = xr + inset + retreat(yH1) - pull * clamp(ten(n - 1), 0, 1);
  const tailBot: [number, number] = [hx1 + W * 2.4, h + tailDown];
  addHole(hx1, yH1, tailBot[0], tailBot[1]);
  const botTan = thread('o', hx1, yH1, tailBot[0], tailBot[1], -4.5 * sc);
  frayEnd(tailBot[0], tailBot[1], botTan[0], botTan[1]);

  // Needle holes with puckered fabric rings and pull creases.
  for (const hl of holes) {
    const tp = clamp(hl.t, 0, 1);
    const ang = Math.atan2(hl.uy, hl.ux);
    const rx = W * 0.62 * (1 + 0.5 * tp);
    const ry = W * 0.6 * (1 - 0.12 * tp);
    p.holes += ell(hl.x, hl.y, rx, ry, ang, 10);
    p.holeLip += arc(hl.x, hl.y, rx * 1.2 + 0.3, ry * 1.2 + 0.3, Math.PI * 0.8, Math.PI * 1.7, 5);

    const ringRx = W * (1.2 + 0.35 * tp) * (1 + 0.4 * tp);
    const ringRy = W * (1.2 + 0.35 * tp);
    p.ringDark += arc(hl.x, hl.y, ringRx, ringRy, -Math.PI * 0.3, Math.PI * 0.8, 6);
    p.ringLight += arc(hl.x, hl.y, ringRx, ringRy, Math.PI * 0.75, Math.PI * 1.75, 7);

    const cl = Math.min(inset * 0.8, W * (0.9 + 2.4 * (0.2 + 0.8 * tp)));
    const das = [-0.62, 0.05, 0.66];
    for (let j = 0; j < das.length; j++) {
      const a = ang + das[j];
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const r0 = W * 0.95;
      const r1 = r0 + cl * (j === 1 ? 1.15 : 0.85);
      const x0 = hl.x + dx * r0;
      const y0 = hl.y + dy * r0;
      const x1 = hl.x + dx * r1;
      const y1 = hl.y + dy * r1;
      p.creaseDark += `M${f1(x0 + 0.5)} ${f1(y0 + 0.6)}L${f1(x1 + 0.5)} ${f1(y1 + 0.6)}`;
      p.creaseLight += `M${f1(x0 - 0.5)} ${f1(y0 - 0.6)}L${f1(x1 - 0.5)} ${f1(y1 - 0.6)}`;
    }
  }

  return {
    paths: p as Record<PathKey, string>,
    clipL,
    clipR,
    hw,
    gap,
    cut: gap / 2 + hw - 8,
    tw: W * (1 - 0.14 * tg),
    sheen: 0.22 + 0.2 * tg,
    pk: 0.45 + 0.55 * tg,
  };
};
// </geo>

const initialSeam = buildSeam(50, VIEW_W, VIEW_H, STITCH_N, zeros(STITCH_N), 0);

const cx = (...c: (string | undefined)[]) => c.filter(Boolean).join(' ');

export default function StitchedCompare({
  beforeImage = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1400&h=900&fit=crop&auto=format&q=80',
  beforeAlt = 'The sitting room before the re-upholstery refresh',
  beforeLabel = 'Before — the sitting room',
  afterImage = 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1400&h=900&fit=crop&auto=format&q=80',
  afterAlt = 'The restored armchair after the re-upholstery refresh',
  afterLabel = 'After — restyled & re-upholstered',
  threadColor = '#9b2d2b',
  className,
}: StitchedCompareProps) {
  const [reduced, setReduced] = useState(false);
  const uid = useId().replace(/:/g, '');

  const rootRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const hemLRef = useRef<HTMLSpanElement>(null);
  const hemRRef = useRef<HTMLSpanElement>(null);
  const pathEls = useRef<Record<string, SVGPathElement | null>>({});

  const posRef = useRef(50);
  const velRef = useRef(0);
  const targetRef = useRef(50);
  const tenRef = useRef(0);
  const tensRef = useRef<number[]>(zeros(STITCH_N));
  const tvelRef = useRef<number[]>(zeros(STITCH_N));
  const sizeRef = useRef({ w: VIEW_W, h: VIEW_H });
  const limRef = useRef({ min: 3, max: 97 });
  const nRef = useRef(STITCH_N);
  const rafRef = useRef(0);
  const dragRef = useRef(false);
  const reducedRef = useRef(false);
  const inViewRef = useRef(true);

  const resetThread = useCallback(() => {
    tenRef.current = 0;
    tensRef.current.fill(0);
    tvelRef.current.fill(0);
  }, []);

  const paint = useCallback(() => {
    const plate = plateRef.current;
    if (!plate) return;
    const { w, h } = sizeRef.current;
    const pos = posRef.current;
    const d = buildSeam(pos, w, h, nRef.current, tensRef.current, tenRef.current);

    const s = plate.style;
    s.setProperty('--sc-pos', `${pos.toFixed(3)}%`);
    s.setProperty('--sc-hw', `${d.hw}px`);
    s.setProperty('--sc-gw', `${d.gap.toFixed(2)}px`);
    s.setProperty('--sc-hl', `${(-(d.gap / 2 + d.hw)).toFixed(2)}px`);
    s.setProperty('--sc-hr', `${(d.gap / 2).toFixed(2)}px`);
    s.setProperty('--sc-cut', `${d.cut.toFixed(2)}px`);
    s.setProperty('--sc-tw', `${d.tw.toFixed(2)}px`);
    s.setProperty('--sc-sheen', d.sheen.toFixed(3));
    s.setProperty('--sc-pk', d.pk.toFixed(3));
    s.setProperty('--sc-grab', tenRef.current.toFixed(3));
    handleRef.current?.setAttribute('aria-valuenow', String(Math.round(pos)));

    if (hemLRef.current) hemLRef.current.style.clipPath = d.clipL;
    if (hemRRef.current) hemRRef.current.style.clipPath = d.clipR;
    for (const k of PATH_KEYS) pathEls.current[k]?.setAttribute('d', d.paths[k]);
  }, []);

  const ensureLoop = useCallback(() => {
    if (reducedRef.current || !inViewRef.current) return;
    if (rafRef.current) return;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const hh = dt / steps;
      for (let i = 0; i < steps; i++) {
        velRef.current += (STIFFNESS * (targetRef.current - posRef.current) - DAMPING * velRef.current) * hh;
        posRef.current += velRef.current * hh;
      }
      const v = velRef.current;

      // Global pull follows the seam's speed: quick to bite, slower to let go.
      const goal = Math.min(1, Math.abs(v) / 26);
      const rate = goal > tenRef.current ? 14 : 6;
      tenRef.current += (goal - tenRef.current) * (1 - Math.exp(-rate * dt));

      // Each stitch is its own under-damped spring, so the threads twang when released.
      const n = nRef.current;
      const ten = tensRef.current;
      const tv = tvelRef.current;
      let live = 0;
      for (let st = 0; st < steps; st++) {
        for (let i = 0; i < n; i++) {
          const om = Math.PI * 2 * (5 + 1.6 * rnd(i, 3));
          tv[i] += (om * om * (tenRef.current - ten[i]) - 2 * 0.3 * om * tv[i]) * hh;
          ten[i] += tv[i] * hh;
        }
      }
      for (let i = 0; i < n; i++) live = Math.max(live, Math.abs(ten[i]), Math.abs(tv[i]) * 0.1);
      paint();

      const settled =
        Math.abs(targetRef.current - posRef.current) < 0.05 &&
        Math.abs(v) < 0.05 &&
        tenRef.current < 0.01 &&
        live < 0.012;
      if (settled) {
        posRef.current = targetRef.current;
        velRef.current = 0;
        resetThread();
        paint();
        rafRef.current = 0;
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [paint, resetThread]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const seek = useCallback(
    (p: number, instant = false) => {
      const c = clamp(p, limRef.current.min, limRef.current.max);
      targetRef.current = c;
      if (instant || reducedRef.current) {
        posRef.current = c;
        velRef.current = 0;
        resetThread();
        paint();
      } else {
        ensureLoop();
      }
    },
    [ensureLoop, paint, resetThread]
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      reducedRef.current = mq.matches;
      setReduced(mq.matches);
      if (mq.matches) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
        posRef.current = targetRef.current;
        velRef.current = 0;
        resetThread();
        paint();
      }
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [paint, resetThread]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting) ensureLoop();
      },
      { threshold: 0.05 }
    );
    io.observe(root);
    return () => io.disconnect();
  }, [ensureLoop]);

  useEffect(() => {
    const plate = plateRef.current;
    if (!plate) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      const h = entry.contentRect.height;
      if (w < 2 || h < 2) return;
      sizeRef.current = { w, h };
      svgRef.current?.setAttribute('viewBox', `0 0 ${w} ${h}`);
      const n = clamp(Math.round(h / 54), 5, 13);
      if (nRef.current !== n) {
        nRef.current = n;
        tensRef.current = zeros(n);
        tvelRef.current = zeros(n);
      }
      const room = hemWidth(w) + (baseGap(w) * 1.75) / 2 + 4;
      const min = Math.max(3, (room / w) * 100);
      limRef.current = { min, max: 100 - min };
      targetRef.current = clamp(targetRef.current, min, 100 - min);
      posRef.current = clamp(posRef.current, min, 100 - min);
      paint();
    });
    ro.observe(plate);
    return () => ro.disconnect();
  }, [paint]);

  const xToPos = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width < 2) return posRef.current;
    return ((e.clientX - rect.left) / rect.width) * 100;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = true;
    handleRef.current?.focus({ preventScroll: true });
    seek(xToPos(e));
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    seek(xToPos(e));
  };

  const onPointerEnd = () => {
    dragRef.current = false;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : KEY_STEP;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      seek(targetRef.current - step);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      seek(targetRef.current + step);
    } else if (e.key === 'Home') {
      e.preventDefault();
      seek(0, reduced);
    } else if (e.key === 'End') {
      e.preventDefault();
      seek(100, reduced);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      seek(50);
    }
  };

  const rootStyle = { '--sc-thread': threadColor } as CSSProperties;

  // Button thread: one leg of the cross through the four holes.
  const btnLeg = (x1: number, y1: number, x2: number, y2: number, shadow: boolean) => (
    <>
      {shadow ? <line className={styles.btnShadow} x1={x1 + 0.7} y1={y1 + 1} x2={x2 + 0.7} y2={y2 + 1} /> : null}
      <line className={styles.btnLo} x1={x1} y1={y1} x2={x2} y2={y2} />
      <line className={styles.btnMid} x1={x1} y1={y1} x2={x2} y2={y2} />
      <line className={styles.btnBands} x1={x1} y1={y1} x2={x2} y2={y2} />
      <line className={styles.btnHi} x1={x1 - 0.5} y1={y1 - 0.5} x2={x2 - 0.5} y2={y2 - 0.5} />
    </>
  );

  return (
    <div ref={rootRef} className={cx(styles.root, className)} style={rootStyle}>
      <span className={styles.grain} aria-hidden="true" />
      <div className={styles.table}>
        <div
          ref={plateRef}
          className={styles.plate}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          <span className={styles.gap} aria-hidden="true" />

          <div className={cx(styles.layer, styles.layerBefore)}>
            {beforeImage ? (
              <img className={styles.photo} src={beforeImage} alt={beforeAlt} draggable={false} />
            ) : (
              <span className={styles.swatch} role="img" aria-label={beforeAlt} />
            )}
            <div className={cx(styles.tag, styles.tagBefore)}>
              <span className={styles.slip}>
                <span className={styles.ink}>{beforeLabel}</span>
              </span>
              <span className={cx(styles.pin, styles.pinBefore)} aria-hidden="true">
                <span className={cx(styles.pinHead, styles.pinHeadRed)} />
              </span>
            </div>
          </div>

          <div className={cx(styles.layer, styles.layerAfter)}>
            {afterImage ? (
              <img className={styles.photo} src={afterImage} alt={afterAlt} draggable={false} />
            ) : (
              <span className={styles.swatch} role="img" aria-label={afterAlt} />
            )}
            <div className={cx(styles.tag, styles.tagAfter)}>
              <span className={styles.slip}>
                <span className={styles.ink}>{afterLabel}</span>
              </span>
              <span className={cx(styles.pin, styles.pinAfter)} aria-hidden="true">
                <span className={cx(styles.pinHead, styles.pinHeadPearl)} />
              </span>
            </div>
          </div>

          <span className={styles.plateShade} aria-hidden="true" />

          <span className={cx(styles.hem, styles.hemL)} aria-hidden="true">
            <span className={cx(styles.hemShade, styles.hemShadeL)} />
            <span ref={hemLRef} className={cx(styles.hemBody, styles.hemBodyL)} />
          </span>
          <span className={cx(styles.hem, styles.hemR)} aria-hidden="true">
            <span className={cx(styles.hemShade, styles.hemShadeR)} />
            <span ref={hemRRef} className={cx(styles.hemBody, styles.hemBodyR)} />
          </span>

          <svg ref={svgRef} className={styles.seam} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden="true">
            {PATH_KEYS.map((k) => (
              <path
                key={k}
                ref={(el) => {
                  pathEls.current[k] = el;
                }}
                className={styles[k]}
                d={initialSeam.paths[k]}
              />
            ))}
          </svg>

          <div
            ref={handleRef}
            className={styles.handle}
            role="slider"
            tabIndex={0}
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={50}
            aria-label="Comparison seam"
            aria-description={SEAM_HELP}
            onKeyDown={onKeyDown}
          >
            <svg className={styles.btn} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
              <defs>
                <radialGradient id={`${uid}-r`} cx="0.34" cy="0.3" r="0.9">
                  <stop offset="0" stopColor="#fdf8ea" />
                  <stop offset="0.5" stopColor="#e9dfc6" />
                  <stop offset="1" stopColor="#b8a884" />
                </radialGradient>
                <radialGradient id={`${uid}-f`} cx="0.62" cy="0.68" r="0.85">
                  <stop offset="0" stopColor="#f3ecd9" />
                  <stop offset="0.7" stopColor="#e2d7bb" />
                  <stop offset="1" stopColor="#cdbf9b" />
                </radialGradient>
              </defs>
              <circle cx="24" cy="24" r="23" fill={`url(#${uid}-r)`} />
              <circle cx="24" cy="24" r="22.6" fill="none" stroke="rgba(52,34,12,0.42)" strokeWidth="0.8" />
              <path d="M5.3 34.8A21.6 21.6 0 0 1 34.8 5.3" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.7" strokeLinecap="round" />
              <circle cx="24" cy="24" r="18.2" fill={`url(#${uid}-f)`} stroke="rgba(110,84,46,0.38)" strokeWidth="0.9" />
              <path d="M10 31.5A17.6 17.6 0 0 1 31.5 10" fill="none" stroke="rgba(80,58,28,0.3)" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M39.2 15.2A17.6 17.6 0 0 1 15.2 39.2" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.9" strokeLinecap="round" />
              {btnLeg(18.6, 18.6, 29.4, 29.4, false)}
              {btnLeg(29.4, 18.6, 18.6, 29.4, true)}
              {[
                [18.6, 18.6],
                [29.4, 18.6],
                [18.6, 29.4],
                [29.4, 29.4],
              ].map(([hx, hy]) => (
                <g key={`${hx}-${hy}`}>
                  <circle className={styles.btnHoleRim} cx={hx} cy={hy} r="3" />
                  <circle className={styles.btnHole} cx={hx} cy={hy} r="2.5" />
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
```

```css
@font-face {
  font-family: 'SC Caveat';
  src: url('./fonts/caveat.woff2') format('woff2');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}

.root {
  --sc-thread: #9b2d2b;
  --sc-thread-lo: color-mix(in srgb, var(--sc-thread) 52%, #1c0b06);
  --sc-thread-dk: color-mix(in srgb, var(--sc-thread) 30%, #140805);
  --sc-thread-hi: color-mix(in srgb, var(--sc-thread) 46%, #ffe3c4);
  --sc-linen-hi: #eee5d0;
  --sc-linen: #e4d8bd;
  --sc-linen-lo: #d3c4a0;
  --sc-tape-hi: #f2eadb;
  --sc-tape-lo: #e0d4b4;
  --sc-ink: #2a2017;
  --sc-paper: #f8f1de;
  --sc-weave: rgba(100, 74, 40, 0.2);
  --sc-font-note: 'SC Caveat', 'Segoe Print', 'Bradley Hand', cursive;
  --sc-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.26  0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --sc-slub-h: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='h'><feTurbulence type='fractalNoise' baseFrequency='.004 .32' numOctaves='3' seed='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.36  0 0 0 0 0.27  0 0 0 0 0.15  0 0 0 1.2 -.4'/></filter><rect width='100%' height='100%' filter='url(%23h)'/></svg>");
  --sc-slub-v: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='v'><feTurbulence type='fractalNoise' baseFrequency='.32 .004' numOctaves='3' seed='9' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.36  0 0 0 0 0.27  0 0 0 0 0.15  0 0 0 1.2 -.4'/></filter><rect width='100%' height='100%' filter='url(%23v)'/></svg>");

  position: relative;
  isolation: isolate;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 24px;
  overflow: clip;
  color: var(--sc-ink);
  background-color: var(--sc-linen);
  background-image:
    radial-gradient(90% 70% at 18% -5%, rgba(255, 251, 238, 0.8), transparent 60%),
    radial-gradient(110% 90% at 100% 110%, rgba(84, 60, 28, 0.2), transparent 62%),
    conic-gradient(rgba(255, 255, 255, 0.1) 25%, rgba(70, 48, 20, 0.05) 0 50%, rgba(255, 255, 255, 0.1) 0 75%, rgba(70, 48, 20, 0.05) 0),
    repeating-linear-gradient(90deg, var(--sc-weave) 0 0.7px, transparent 0.7px 2px),
    repeating-linear-gradient(0deg, rgba(100, 74, 40, 0.15) 0 0.7px, transparent 0.7px 2px),
    var(--sc-slub-h),
    var(--sc-slub-v),
    linear-gradient(180deg, var(--sc-linen-hi) 0%, var(--sc-linen) 48%, var(--sc-linen-lo) 100%);
  background-size:
    auto,
    auto,
    4px 4px,
    auto,
    auto,
    260px 260px,
    260px 260px,
    auto;
  box-shadow: inset 0 0 0 1px rgba(122, 94, 56, 0.2);
}

.grain {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: var(--sc-noise);
  opacity: 0.14;
  mix-blend-mode: multiply;
}

.table {
  position: relative;
  z-index: 1;
  padding-block: 32px;
  padding-inline: clamp(18px, 4cqw, 42px);
}

.plate {
  --sc-pos: 50%;
  --sc-hw: 24px;
  --sc-hl: -30px;
  --sc-hr: 6px;
  --sc-cut: 22px;
  --sc-gw: 12px;
  --sc-grab: 0;
  --sc-tw: 3.4px;
  --sc-sheen: 0.55;
  --sc-pk: 0.45;

  position: relative;
  direction: ltr;
  inline-size: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 3px;
  touch-action: pan-y;
  cursor: ew-resize;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  box-shadow:
    0 0 0 0.5px rgba(36, 24, 10, 0.3),
    6px 12px 24px rgba(36, 24, 10, 0.18);
}

/* The cut between the panels: the table showing through, in shade. */
.gap {
  position: absolute;
  inset-block: 0;
  inset-inline-start: var(--sc-pos);
  inline-size: var(--sc-gw);
  translate: -50% 0;
  z-index: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(34, 22, 8, 0.58), rgba(34, 22, 8, 0.36) 50%, rgba(34, 22, 8, 0.5)),
    var(--sc-noise);
}

.layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: 3px;
}

.layerBefore {
  clip-path: inset(0 calc(100% - var(--sc-pos) + var(--sc-cut)) 0 0);
}

.layerAfter {
  clip-path: inset(0 0 0 calc(var(--sc-pos) + var(--sc-cut)));
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

.swatch {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  background:
    repeating-linear-gradient(45deg, rgba(122, 94, 56, 0.1) 0 2px, transparent 2px 14px),
    repeating-linear-gradient(-45deg, rgba(122, 94, 56, 0.08) 0 2px, transparent 2px 14px),
    linear-gradient(180deg, #efe6d0, #ddd0ae);
}

.plateShade {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  border-radius: 3px;
  box-shadow:
    inset 0 0 0 1px rgba(36, 24, 10, 0.22),
    inset 0 0 38px rgba(36, 24, 10, 0.14);
}

/* Selvedge tape sewn over each photo's cut edge. */
.hem {
  position: absolute;
  inset-block: 0;
  inset-inline-start: var(--sc-pos);
  inline-size: var(--sc-hw);
  z-index: 3;
  pointer-events: none;
}

.hemL {
  translate: var(--sc-hl) 0;
}

.hemR {
  translate: var(--sc-hr) 0;
}

.hemBody {
  position: absolute;
  inset: 0;
  background-color: var(--sc-tape-lo);
  background-repeat: no-repeat, no-repeat, no-repeat, repeat, repeat, repeat, repeat, no-repeat;
  background-size:
    1.4px 100%,
    100% 100%,
    100% 100%,
    4px 4px,
    auto,
    auto,
    260px 260px,
    100% 100%;
}

.hemBodyL {
  background-image:
    repeating-linear-gradient(180deg, color-mix(in srgb, var(--sc-thread) 70%, #3a1a10) 0 3.5px, transparent 3.5px 7px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.6) 0 1px, rgba(60, 40, 16, 0.24) 1px 2.6px, transparent 2.6px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.16), transparent 45%, rgba(60, 40, 16, 0.12)),
    conic-gradient(rgba(255, 255, 255, 0.2) 25%, rgba(70, 48, 20, 0.07) 0 50%, rgba(255, 255, 255, 0.2) 0 75%, rgba(70, 48, 20, 0.07) 0),
    repeating-linear-gradient(90deg, var(--sc-weave) 0 0.7px, transparent 0.7px 2px),
    repeating-linear-gradient(0deg, rgba(100, 74, 40, 0.16) 0 0.7px, transparent 0.7px 2px),
    var(--sc-slub-v),
    linear-gradient(180deg, var(--sc-tape-hi), var(--sc-tape-lo));
  background-position: 4px 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0;
}

.hemBodyR {
  background-image:
    repeating-linear-gradient(180deg, color-mix(in srgb, var(--sc-thread) 70%, #3a1a10) 0 3.5px, transparent 3.5px 7px),
    linear-gradient(270deg, rgba(255, 255, 255, 0.35) 0 1px, rgba(60, 40, 16, 0.3) 1px 2.6px, transparent 2.6px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.16), transparent 45%, rgba(60, 40, 16, 0.12)),
    conic-gradient(rgba(255, 255, 255, 0.2) 25%, rgba(70, 48, 20, 0.07) 0 50%, rgba(255, 255, 255, 0.2) 0 75%, rgba(70, 48, 20, 0.07) 0),
    repeating-linear-gradient(90deg, var(--sc-weave) 0 0.7px, transparent 0.7px 2px),
    repeating-linear-gradient(0deg, rgba(100, 74, 40, 0.16) 0 0.7px, transparent 0.7px 2px),
    var(--sc-slub-v),
    linear-gradient(180deg, var(--sc-tape-hi), var(--sc-tape-lo));
  background-position: calc(100% - 4px) 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0;
}

/* Shadow the tape's thickness throws onto the photo (light from the top-left). */
.hemShade {
  position: absolute;
  inset-block: 0;
  inline-size: 11px;
}

.hemShadeL {
  inset-inline-end: 100%;
  background: linear-gradient(90deg, transparent, rgba(30, 20, 8, 0.2));
}

.hemShadeR {
  inset-inline-start: 100%;
  background: linear-gradient(90deg, rgba(30, 20, 8, 0.42), transparent);
}

/* The seam: needle holes, puckered cloth and waxed thread. */
.seam {
  position: absolute;
  inset: 0;
  z-index: 4;
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
  pointer-events: none;
}

.gapShade,
.selvBase,
.selvPicks,
.selvStripe,
.selvEdge,
.selvGleam,
.creaseDark,
.creaseLight,
.ringDark,
.ringLight,
.uShadowSoft,
.uShadow,
.uBase,
.uMid,
.uBands,
.uRidges,
.uSheen,
.oShadowSoft,
.oShadow,
.oBase,
.oMid,
.oBands,
.oRidges,
.oSheen,
.holeLip,
.fray {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.gapShade {
  stroke: rgba(30, 18, 6, 0.24);
  stroke-width: 3.4px;
  stroke-linecap: butt;
}

.selvBase {
  stroke: #d8c9a7;
  stroke-width: 3.2px;
  stroke-linecap: butt;
}

.selvPicks {
  stroke: rgba(255, 250, 233, 0.6);
  stroke-width: 3.2px;
  stroke-dasharray: 0.9 1.6;
  stroke-linecap: butt;
}

.selvStripe {
  stroke: var(--sc-thread);
  stroke-width: 1.1px;
  opacity: 0.72;
  stroke-linecap: butt;
}

.selvEdge {
  stroke: rgba(40, 26, 10, 0.55);
  stroke-width: 0.9px;
}

.selvGleam {
  stroke: rgba(255, 255, 250, 0.7);
  stroke-width: 0.7px;
}

.creaseDark {
  stroke: rgba(60, 40, 16, 0.4);
  stroke-width: 0.8px;
  opacity: var(--sc-pk);
}

.creaseLight {
  stroke: rgba(255, 252, 240, 0.7);
  stroke-width: 0.8px;
  opacity: var(--sc-pk);
}

.ringDark {
  stroke: rgba(60, 40, 16, 0.2);
  stroke-width: calc(var(--sc-tw) * 0.7);
}

.ringLight {
  stroke: rgba(255, 252, 240, 0.55);
  stroke-width: calc(var(--sc-tw) * 0.55);
}

.uShadowSoft,
.oShadowSoft {
  stroke: rgba(30, 18, 6, 0.08);
  stroke-width: calc(var(--sc-tw) * 2);
}

.uShadow,
.oShadow {
  stroke: rgba(30, 18, 6, 0.24);
  stroke-width: calc(var(--sc-tw) * 1.1);
}

.uBase,
.oBase {
  stroke: var(--sc-thread-lo);
  stroke-width: var(--sc-tw);
}

.uMid,
.oMid {
  stroke: var(--sc-thread);
  stroke-width: calc(var(--sc-tw) * 0.78);
}

.uBands,
.oBands {
  stroke: var(--sc-thread-dk);
  stroke-width: calc(var(--sc-tw) * 0.24);
  stroke-linecap: butt;
  opacity: 0.58;
}

.uRidges,
.oRidges {
  stroke: var(--sc-thread-hi);
  stroke-width: calc(var(--sc-tw) * 0.16);
  stroke-linecap: butt;
  opacity: 0.2;
}

.uSheen,
.oSheen {
  stroke: var(--sc-thread-hi);
  stroke-width: calc(var(--sc-tw) * 0.3);
  opacity: var(--sc-sheen);
}

.holes {
  fill: rgba(24, 14, 5, 0.92);
  stroke: none;
}

.holeLip {
  stroke: rgba(255, 250, 235, 0.55);
  stroke-width: 0.7px;
}

.fray {
  stroke: var(--sc-thread-hi);
  stroke-width: 0.6px;
  opacity: 0.85;
}

/* Pinned paper labels. */
.tag {
  position: absolute;
  inset-block-start: 16px;
  z-index: 2;
  pointer-events: none;
}

.tagBefore {
  inset-inline-start: 16px;
  rotate: -1deg;
  transform-origin: 22px 13px;
}

.tagAfter {
  inset-inline-end: 16px;
  rotate: 0.8deg;
  transform-origin: calc(100% - 22px) 13px;
}

.slip {
  display: block;
  max-inline-size: 34cqw;
  min-inline-size: 76px;
  box-sizing: border-box;
  padding-block: 17px 10px;
  padding-inline: 15px;
  border-radius: 1.5px 2px 1px 3px;
  background: var(--sc-paper);
  box-shadow:
    0 0 0 0.5px rgba(60, 40, 16, 0.2),
    1px 2px 4px rgba(36, 24, 10, 0.18);
}

.ink {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-family: var(--sc-font-note);
  font-size: 22px;
  line-height: 1.12;
  letter-spacing: 0.01em;
  color: var(--sc-ink);
  text-wrap: balance;
}

/* A plain pin head holds each label. */
.pin {
  position: absolute;
  inset-block-start: 13px;
  inline-size: 0;
  block-size: 0;
}

.pinBefore {
  --sc-pa: 220deg;
  --sc-hx: -6px;
  --sc-hy: -5px;
  inset-inline-start: 22px;
}

.pinAfter {
  --sc-pa: 320deg;
  --sc-hx: 6px;
  --sc-hy: -5px;
  inset-inline-end: 22px;
}

.pinHead {
  position: absolute;
  inset-inline-start: var(--sc-hx);
  inset-block-start: var(--sc-hy);
  inline-size: 9px;
  block-size: 9px;
  translate: -50% -50%;
  border-radius: 50%;
  box-shadow: 1px 2px 2.5px rgba(30, 18, 6, 0.28);
}

.pinHeadRed {
  background: var(--sc-thread);
}

.pinHeadPearl {
  background: #ece3cf;
  box-shadow:
    0 0 0 0.5px rgba(90, 66, 36, 0.35),
    1px 2px 2.5px rgba(30, 18, 6, 0.28);
}

/* The button sewn on the seam is the handle. */
.handle {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: var(--sc-pos);
  z-index: 9;
  translate: -50% -50%;
  scale: calc(1 + var(--sc-grab) * 0.08);
  inline-size: 46px;
  block-size: 46px;
  border-radius: 50%;
  cursor: ew-resize;
  box-shadow:
    0 0.5px 1px rgba(36, 24, 10, 0.5),
    calc(1.5px + var(--sc-grab) * 1.5px) calc(3px + var(--sc-grab) * 4px) calc(5px + var(--sc-grab) * 6px) rgba(36, 24, 10, 0.38);
}

.handle:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--sc-thread) 75%, #241309);
  outline-offset: 4px;
}

.btn {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
}

.btnShadow,
.btnLo,
.btnMid,
.btnBands,
.btnHi {
  fill: none;
  stroke-linecap: round;
}

.btnShadow {
  stroke: rgba(30, 18, 6, 0.4);
  stroke-width: 2.8px;
}

.btnLo {
  stroke: var(--sc-thread-lo);
  stroke-width: 2.8px;
}

.btnMid {
  stroke: var(--sc-thread);
  stroke-width: 2.1px;
}

.btnBands {
  stroke: var(--sc-thread-dk);
  stroke-width: 2.1px;
  stroke-dasharray: 0.5 1.1;
  stroke-linecap: butt;
  opacity: 0.5;
}

.btnHi {
  stroke: var(--sc-thread-hi);
  stroke-width: 0.7px;
  opacity: 0.85;
}

.btnHole {
  fill: rgba(24, 14, 5, 0.93);
}

.btnHoleRim {
  fill: rgba(255, 255, 255, 0.5);
  stroke: rgba(80, 58, 28, 0.35);
  stroke-width: 0.5px;
}

@container (min-width: 980px) {
  .table {
    padding-block: 38px 46px;
    padding-inline: 44px;
  }

  .slip {
    padding-inline: 18px;
  }

  .ink {
    font-size: 25px;
  }
}

@container (max-width: 540px) {
  .table {
    padding-block: 20px;
    padding-inline: 14px;
  }

  .plate {
    aspect-ratio: 4 / 3;
  }

  /* Small screens: tags tuck into the top corners, narrow enough to stay clear of the seam. */
  .tag {
    inset-block-start: 6px;
  }

  .tagBefore {
    inset-inline-start: 6px;
  }

  .tagAfter {
    inset-inline-end: 6px;
  }

  .slip {
    max-inline-size: 30cqw;
    min-inline-size: 60px;
    padding-block: 13px 6px;
    padding-inline: 9px;
  }

  .ink {
    font-size: 16px;
    line-height: 1.08;
  }

  .handle {
    inline-size: 54px;
    block-size: 54px;
  }
}
```
