Create a custom element called "Job Route Tracker". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: title, stages (name, short description), current stage, marker icon, route color, status labels (you are here, next stop, done, coming up). Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, KeyboardEvent, PointerEvent, ReactElement } from 'react';
import styles from './Component.module.css';

export type JobRouteMarkerIcon = 'van' | 'parcel' | 'bike' | 'boat' | 'arrow' | 'flag';

export interface JobRouteStage {
  name: string;
  description: string;
}

export interface JobRouteTrackerProps {
  title?: string;
  stages?: JobRouteStage[];
  /** 1-based number of the stage the job has reached. */
  currentStage?: number;
  markerIcon?: JobRouteMarkerIcon;
  routeColor?: string;
  hereLabel?: string;
  nextLabel?: string;
  doneLabel?: string;
  upcomingLabel?: string;
}

export const defaultStages: JobRouteStage[] = [
  {
    name: 'Site visit',
    description: 'We measure up, check the plumbing and wiring, and talk through how you cook and live in the room.',
  },
  {
    name: 'Design and quote',
    description: 'A 3D plan, a fixed price and a materials list you can keep changing until you love it.',
  },
  {
    name: 'Order and lead time',
    description: 'Cabinets, worktops and appliances are ordered. Most arrive within three weeks.',
  },
  {
    name: 'Strip out',
    description: 'Old units come out, walls are made good and the first-fix plumbing and electrics go in.',
  },
  {
    name: 'Installation',
    description: 'Cabinets, worktop and splashback go in over about a week, with a daily tidy-up.',
  },
  {
    name: 'Finishing touches',
    description: 'Lighting, handles, sealant and a deep clean, so the room is ready to cook in.',
  },
  {
    name: 'Handover walkthrough',
    description: 'We walk through everything with you, sign off together and leave the care guide on the counter.',
  },
];

/* ───────────────────────────── geometry ───────────────────────────── */

interface Pt {
  x: number;
  y: number;
}
interface Seg {
  p0: Pt;
  c1: Pt;
  c2: Pt;
  p3: Pt;
  start: number;
  len: number;
  lut: number[];
}
interface Route {
  d: string;
  segs: Seg[];
  stopLens: number[];
  total: number;
  first: Pt;
}

const LUT = 20;
const PIN_HEAD = 27;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r1 = (v: number) => Math.round(v * 10) / 10;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function bez(s: Seg, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * s.p0.x + b * s.c1.x + c * s.c2.x + d * s.p3.x,
    y: a * s.p0.y + b * s.c1.y + c * s.c2.y + d * s.p3.y,
  };
}

function buildRoute(pts: Pt[]): Route {
  const segs: Seg[] = [];
  const stopLens = [0];
  let total = 0;
  let d = pts.length ? `M${r1(pts[0].x)} ${r1(pts[0].y)}` : '';
  const k = 0.2;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) * k, y: p1.y + (p2.y - p0.y) * k };
    const c2 = { x: p2.x - (p3.x - p1.x) * k, y: p2.y - (p3.y - p1.y) * k };
    const seg: Seg = { p0: p1, c1, c2, p3: p2, start: total, len: 0, lut: [0] };
    let prev = p1;
    let acc = 0;
    for (let j = 1; j <= LUT; j++) {
      const q = bez(seg, j / LUT);
      acc += Math.hypot(q.x - prev.x, q.y - prev.y);
      seg.lut.push(acc);
      prev = q;
    }
    seg.len = acc;
    total += acc;
    stopLens.push(total);
    segs.push(seg);
    d += `C${r1(c1.x)} ${r1(c1.y)} ${r1(c2.x)} ${r1(c2.y)} ${r1(p2.x)} ${r1(p2.y)}`;
  }
  return { d, segs, stopLens, total, first: pts[0] ?? { x: 0, y: 0 } };
}

function posToLen(r: Route, pos: number): number {
  if (r.stopLens.length < 2) return 0;
  const p = clamp(pos, 0, r.stopLens.length - 1);
  const i = Math.min(Math.floor(p), r.stopLens.length - 2);
  return r.stopLens[i] + (r.stopLens[i + 1] - r.stopLens[i]) * (p - i);
}

function pointAtLen(r: Route, len: number): Pt {
  if (!r.segs.length) return r.first;
  const L = clamp(len, 0, r.total);
  let s = r.segs[r.segs.length - 1];
  for (const c of r.segs) {
    if (L <= c.start + c.len) {
      s = c;
      break;
    }
  }
  const local = L - s.start;
  let j = 1;
  while (j < s.lut.length - 1 && s.lut[j] < local) j++;
  const span = s.lut[j] - s.lut[j - 1] || 1;
  const t = (j - 1 + clamp((local - s.lut[j - 1]) / span, 0, 1)) / LUT;
  return bez(s, t);
}

interface WideGeo {
  pts: Pt[];
  H: number;
  lw: number;
  lo: number[];
}

function wideGeo(W: number, names: string[]): WideGeo {
  const n = names.length;
  const edge = 64;
  const span = Math.max(W - edge * 2, 1);
  const s = n > 1 ? span / (n - 1) : span;
  const lw = Math.round(Math.min(236, Math.max(96, 2 * s - 28)));
  const maxLen = Math.max(1, ...names.map((x) => x.length));
  const lines = Math.min(7, Math.max(2, Math.ceil((maxLen * 9) / (lw - 6))));
  const lab = lines * 21 + 6;
  const yUp = lab + 52 + 14;
  const amp = Math.round(clamp(W * 0.16, 130, 210));
  const yDn = yUp + amp;
  const H = Math.round(yDn + 16 + lab + 14);
  const pts: Pt[] = [];
  const lo: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = n > 1 ? edge + s * i : W / 2;
    const y = i % 2 === 0 ? yUp + 12 * Math.sin(i * 2.3) : yDn + 12 * Math.sin(i * 1.7);
    pts.push({ x: r1(x), y: r1(y) });
    lo.push(Math.round(clamp(x - lw / 2, 6, Math.max(6, W - 6 - lw)) - x));
  }
  return { pts, H, lw, lo };
}

const narrowX = (i: number) => r1(22 + 17 * (1 + Math.sin(i * 1.9 + 0.6)));
const NARROW_FIRST_Y = 46;
const narrowFallback = (n: number): Pt[] =>
  Array.from({ length: n }, (_, i) => ({ x: narrowX(i) + 0, y: NARROW_FIRST_Y + i * 88 }));

/* ───────────────────────────── pieces ───────────────────────────── */

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function MarkerIcon({ kind }: { kind: JobRouteMarkerIcon }): ReactElement {
  const p = { className: styles.icon, viewBox: '0 0 24 24', 'aria-hidden': true } as const;
  switch (kind) {
    case 'parcel':
      return (
        <svg {...p}>
          <path d="M12 3 20 7v10l-8 4-8-4V7z" />
          <path d="m4 7 8 4 8-4M12 11v10" />
        </svg>
      );
    case 'bike':
      return (
        <svg {...p}>
          <circle cx="6" cy="16.5" r="3.5" />
          <circle cx="18" cy="16.5" r="3.5" />
          <path d="m6 16.5 4-8h5l3 8M10 8.5l3 8M8.5 6h3M15 8.5l-1.5-3h2" />
        </svg>
      );
    case 'boat':
      return (
        <svg {...p}>
          <path d="M12 3v12M12 4.5 19 14H12z" />
          <path d="M3 16h18l-3 4H6z" />
        </svg>
      );
    case 'arrow':
      return (
        <svg {...p}>
          <path d="m12 3 7 17-7-4-7 4z" />
        </svg>
      );
    case 'flag':
      return (
        <svg {...p}>
          <path d="M6 21V4M6 5h11l-2.5 4 2.5 4H6" />
        </svg>
      );
    case 'van':
    default:
      return (
        <svg {...p}>
          <path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z" />
          <circle cx="7" cy="17.5" r="2" />
          <circle cx="17" cy="17.5" r="2" />
        </svg>
      );
  }
}

function Compass({ swing }: { swing: boolean }): ReactElement {
  return (
    <svg className={styles.compass} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="41" className={styles.cFill} />
      <path
        className={styles.cInk}
        d="M50 5.5C75 4.6 95.6 24.6 94.6 50.3C93.7 75.8 73.5 95.6 48.9 94.5C24.4 93.5 5 73.4 5.4 49.2C5.8 25.1 26.2 6.3 50 5.5Z"
      />
      <path
        className={styles.cInkThin}
        d="M50.8 9.6C72.6 9.9 90.4 27.5 90.1 49.6C89.8 72.3 71.9 90.2 50.4 90.1C27.6 89.9 9.7 72.6 9.9 50.2C10.2 28.6 28.4 9.4 50.8 9.6Z"
      />
      <path className={styles.cInkThin} d="M90 50h-6M10 50h6M50 90v-6M78.5 21.5l-3 3M21.5 21.5l3 3M78.5 78.5l-3-3M21.5 78.5l3-3" />
      <path className={styles.cInk} d="M44.5 25V15l11 10V15" />
      <g className={swing ? styles.needleSwing : styles.needle}>
        <path className={styles.cNorth} d="M50 29 57 50 50 47 43 50Z" />
        <path className={styles.cSouth} d="M50 71 57 50 50 53 43 50Z" />
        <circle cx="50" cy="50" r="3" className={styles.cHub} />
      </g>
    </svg>
  );
}

/* Hand-drawn trail-map scenery: contours, water, trees, ridges. Deterministic, so SSR-safe. */
interface Peak {
  cx: number;
  cy: number;
  rx: number;
  step: number;
  rings: number;
  seed: number;
}
const PEAKS: Peak[] = [
  { cx: 170, cy: 640, rx: 26, step: 30, rings: 10, seed: 1.3 },
  { cx: 985, cy: 150, rx: 22, step: 33, rings: 9, seed: 4.1 },
  { cx: 640, cy: 790, rx: 18, step: 28, rings: 6, seed: 2.2 },
  { cx: 1120, cy: 690, rx: 18, step: 30, rings: 7, seed: 5.6 },
  { cx: 420, cy: 70, rx: 16, step: 28, rings: 5, seed: 3.4 },
];

function closedSmooth(pts: Pt[]): string {
  const n = pts.length;
  let d = `M${r1(pts[0].x)} ${r1(pts[0].y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += `C${r1(p1.x + (p2.x - p0.x) / 6)} ${r1(p1.y + (p2.y - p0.y) / 6)} ${r1(p2.x - (p3.x - p1.x) / 6)} ${r1(
      p2.y - (p3.y - p1.y) / 6,
    )} ${r1(p2.x)} ${r1(p2.y)}`;
  }
  return `${d}Z`;
}

const CONTOURS: { d: string; major: boolean }[] = (() => {
  const out: { d: string; major: boolean }[] = [];
  for (const pk of PEAKS) {
    for (let k = 0; k < pk.rings; k++) {
      const pts: Pt[] = [];
      for (let a = 0; a < 26; a++) {
        const th = (Math.PI * 2 * a) / 26;
        const wob = 1 + 0.13 * Math.sin(2 * th + pk.seed) + 0.08 * Math.sin(3 * th + pk.seed * 2) + 0.04 * Math.sin(5 * th + pk.seed * 3);
        const rad = (pk.rx + k * pk.step) * wob;
        pts.push({ x: pk.cx + Math.cos(th) * rad, y: pk.cy + Math.sin(th) * rad * 0.76 });
      }
      out.push({ d: closedSmooth(pts), major: k % 4 === 3 });
    }
  }
  return out;
})();

const TREES: [number, number, number][] = [
  [90, 150, 1],
  [118, 168, 0.8],
  [74, 186, 0.9],
  [140, 140, 0.7],
  [250, 300, 0.8],
  [276, 320, 1],
  [232, 326, 0.7],
  [560, 120, 0.9],
  [590, 136, 0.7],
  [535, 142, 0.8],
  [820, 745, 1],
  [850, 760, 0.8],
  [800, 770, 0.7],
  [1085, 420, 0.9],
  [1110, 440, 0.7],
  [1064, 446, 0.8],
  [480, 450, 0.8],
  [505, 468, 0.6],
  [930, 560, 0.8],
  [955, 576, 0.7],
  [340, 740, 0.9],
  [366, 758, 0.7],
  [1150, 300, 0.8],
];

const RIDGES: [number, number, number][] = [
  [700, 90, 1.1],
  [790, 120, 0.8],
  [60, 430, 0.9],
  [900, 470, 0.7],
];

function MapDecor({ uid }: { uid: string }): ReactElement {
  return (
    <svg className={styles.decor} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <filter id={`${uid}n`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0.1  0 0 0 0 0.16  0 0 0 0 0.12  0 0 0 0.6 0" />
        </filter>
      </defs>
      <path
        className={styles.water}
        d="M-20 612C62 556 196 566 258 628C322 700 226 782 110 792C16 802 -44 742 -20 612Z"
      />
      <path
        className={styles.river}
        d="M1090 -10C1012 118 1124 204 1002 322S880 480 782 560 560 650 470 810"
      />
      {CONTOURS.map((c, i) => (
        <path key={i} className={c.major ? styles.contourMajor : styles.contour} d={c.d} />
      ))}
      {TREES.map(([x, y, s], i) => (
        <path
          key={i}
          className={styles.tree}
          transform={`translate(${x} ${y}) scale(${s})`}
          d="M0 0 5-11 10 0zM5 0v5M-1 -6 5-16 11-6z"
        />
      ))}
      {RIDGES.map(([x, y, s], i) => (
        <path
          key={i}
          className={styles.ridge}
          transform={`translate(${x} ${y}) scale(${s})`}
          d="M0 0 20-30 31-15 41-26 62 0M20-30 24-6M20-30 12-8M41-26 38-4M41-26 47-9"
        />
      ))}
      <rect className={styles.grain} width="1200" height="800" filter={`url(#${uid}n)`} />
    </svg>
  );
}

/* ───────────────────────────── component ───────────────────────────── */

type Phase = 'done' | 'staged' | 'travelling' | 'landed';

const DWELL = 110;
const HOP = 18;

export default function JobRouteTracker({
  title = 'Your kitchen, stop by stop',
  stages = defaultStages,
  currentStage = 4,
  markerIcon = 'van',
  routeColor = '#2b6a46',
  hereLabel = 'You are here',
  nextLabel = 'Next stop',
  doneLabel = 'Done',
  upcomingLabel = 'Coming up',
}: JobRouteTrackerProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const n = stages.length;
  const cur = n ? clamp(Math.round(currentStage) - 1, 0, n - 1) : 0;

  const rootRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const anchors = useRef<(HTMLSpanElement | null)[]>([]);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const markerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const walkedRef = useRef<SVGPathElement | null>(null);
  const routeRef = useRef<Route | null>(null);
  const posRef = useRef<number | null>(null);
  const reachedRef = useRef(cur);
  const animRef = useRef({ raf: 0 });
  const phaseRef = useRef<Phase>('done');
  const curRef = useRef(cur);
  const prevCur = useRef(cur);

  const [size, setSize] = useState({ W: 1000, wide: true, narrowH: 420 });
  const [narrowPts, setNarrowPts] = useState<Pt[]>([]);
  const [picked, setPicked] = useState(cur);
  const [hover, setHover] = useState<number | null>(null);
  const [kbd, setKbd] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('done');
  const [reached, setReached] = useState(cur);

  const names = useMemo(() => stages.map((s) => s.name), [stages]);
  const wide = size.wide;
  const geo = useMemo(() => wideGeo(size.W, names), [size.W, names]);
  const pts = useMemo<Pt[]>(
    () => (wide ? geo.pts : narrowPts.length === n ? narrowPts : narrowFallback(n)),
    [wide, geo, narrowPts, n],
  );
  const route = useMemo(() => buildRoute(pts), [pts]);
  routeRef.current = route;
  phaseRef.current = phase;
  curRef.current = cur;
  const H = wide ? geo.H : size.narrowH;

  const safePicked = n ? clamp(picked, 0, n - 1) : 0;
  const shown = hover ?? safePicked;

  /* paint the marker, shadow and walked line straight on the DOM (no per-frame re-render) */
  const paint = useCallback((pos: number, hop: number, sx: number, sy: number) => {
    const r = routeRef.current;
    if (!r) return;
    posRef.current = pos;
    const len = posToLen(r, pos);
    const p = pointAtLen(r, len);
    if (markerRef.current) markerRef.current.style.transform = `translate3d(${r1(p.x)}px, ${r1(p.y)}px, 0)`;
    if (innerRef.current) innerRef.current.style.transform = `translateY(${r1(-hop)}px) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
    if (shadowRef.current) {
      const k = Math.max(0.35, 1 - hop / 38);
      shadowRef.current.style.transform = `translate3d(${r1(p.x)}px, ${r1(p.y)}px, 0) scale(${k.toFixed(3)})`;
      shadowRef.current.style.opacity = String(Math.max(0.25, 1 - hop / 34));
    }
    if (walkedRef.current) walkedRef.current.setAttribute('stroke-dasharray', `${r1(len)} ${r1(r.total + 10)}`);
  }, []);

  const runAnim = useCallback(
    (from: number, to: number, intro: boolean) => {
      if (animRef.current.raf) cancelAnimationFrame(animRef.current.raf);
      const dir = to >= from ? 1 : -1;
      const wps = [from];
      if (from !== to) {
        let v = dir > 0 ? Math.floor(from) + 1 : Math.ceil(from) - 1;
        while (dir > 0 ? v < to : v > to) {
          wps.push(v);
          v += dir;
        }
        wps.push(to);
      }
      const hops = Math.max(wps.length - 1, 1);
      const base = clamp(2100 / hops, 300, 640);
      const introDur = intro ? 480 : 0;
      const segs: { a: number; b: number; dur: number; start: number }[] = [];
      let t = introDur;
      for (let j = 0; j < wps.length - 1; j++) {
        const dur = base * Math.max(Math.abs(wps[j + 1] - wps[j]), 0.55);
        segs.push({ a: wps[j], b: wps[j + 1], dur, start: t });
        t += dur + (j < wps.length - 2 ? DWELL : 0);
      }
      const end = t + 360;
      const last = segs[segs.length - 1];
      const arriveAt = last ? last.start + last.dur * 0.72 : introDur;
      let landed = false;
      const t0 = performance.now();
      phaseRef.current = 'travelling';
      setPhase('travelling');

      const frame = (now: number) => {
        const el = now - t0;
        let pos = from;
        let hop = 0;
        let sx = 1;
        let sy = 1;
        if (el < introDur) {
          hop = 38 * (1 - easeOutCubic(el / introDur));
        } else if (segs.length) {
          let s = last;
          for (const c of segs) {
            if (el < c.start + c.dur + DWELL) {
              s = c;
              break;
            }
          }
          const local = el - s.start;
          if (local < 0) {
            pos = s.a;
          } else if (local < s.dur) {
            const q = local / s.dur;
            pos = s.a + (s.b - s.a) * easeInOutCubic(q);
            hop = Math.sin(Math.PI * q) * HOP;
            const st = Math.sin(Math.PI * q);
            sx = 1 - 0.05 * st;
            sy = 1 + 0.09 * st;
          } else {
            pos = s.b;
            const win = s === last ? 360 : DWELL;
            const q = Math.min(1, (local - s.dur) / win);
            const sq = Math.sin(Math.PI * q) * (1 - 0.5 * q) * 0.15;
            sx = 1 + sq;
            sy = 1 - sq;
          }
        } else {
          const q = Math.min(1, (el - introDur) / 360);
          const sq = Math.sin(Math.PI * q) * (1 - 0.5 * q) * 0.15;
          sx = 1 + sq;
          sy = 1 - sq;
        }
        if (!intro || el >= introDur * 0.85) {
          const rr = dir > 0 ? Math.floor(pos + 0.04) : Math.ceil(pos - 0.04);
          if (rr !== reachedRef.current) {
            reachedRef.current = rr;
            setReached(rr);
          }
        }
        if (!landed && el >= arriveAt) {
          landed = true;
          phaseRef.current = 'landed';
          setPhase('landed');
        }
        if (el >= end) {
          paint(to, 0, 1, 1);
          reachedRef.current = to;
          setReached(to);
          phaseRef.current = 'landed';
          setPhase('landed');
          animRef.current.raf = 0;
          return;
        }
        paint(pos, hop, sx, sy);
        animRef.current.raf = requestAnimationFrame(frame);
      };
      animRef.current.raf = requestAnimationFrame(frame);
    },
    [paint],
  );

  /* measure: container width decides route direction; narrow reads stop positions from the DOM */
  const measure = useCallback(() => {
    const el = stageRef.current;
    if (!el || !n) return;
    const box = el.getBoundingClientRect();
    const W = Math.round(box.width);
    if (W <= 0) return;
    const nextWide = W >= 560 && W / n >= 80;
    setSize((p) => {
      const nh = nextWide ? p.narrowH : Math.round(box.height);
      return p.W === W && p.wide === nextWide && Math.abs(p.narrowH - nh) < 1 ? p : { W, wide: nextWide, narrowH: nh };
    });
    if (!nextWide) {
      const list: Pt[] = [];
      for (let i = 0; i < n; i++) {
        const a = anchors.current[i];
        if (!a) return;
        const rc = a.getBoundingClientRect();
        list.push({ x: r1(rc.left - box.left + rc.width / 2), y: r1(rc.top - box.top + rc.height / 2) });
      }
      setNarrowPts((prev) =>
        prev.length === list.length && prev.every((q, i) => Math.abs(q.x - list[i].x) < 0.6 && Math.abs(q.y - list[i].y) < 0.6)
          ? prev
          : list,
      );
    }
  }, [n]);

  useIsoLayoutEffect(() => {
    measure();
  }, [measure, wide, safePicked]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    if (fonts && fonts.ready) fonts.ready.then(measure).catch(() => undefined);
    return () => ro.disconnect();
  }, [measure]);

  /* stage the choreography before first paint (client only); reduced motion stays on the static final state */
  useIsoLayoutEffect(() => {
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !n) return;
    reachedRef.current = -1;
    setReached(-1);
    phaseRef.current = 'staged';
    setPhase('staged');
    paint(0, 0, 1, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* play the journey once it is on screen */
  useEffect(() => {
    if (phase !== 'staged') return undefined;
    const el = rootRef.current;
    let timer = 0;
    const start = () => {
      timer = window.setTimeout(() => runAnim(0, curRef.current, true), 260);
    };
    if (!el || typeof IntersectionObserver === 'undefined') {
      start();
      return () => window.clearTimeout(timer);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          start();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [phase, runAnim, cur]);

  /* the owner moves the current stage: hop the marker to it */
  useEffect(() => {
    if (prevCur.current === cur) return;
    prevCur.current = cur;
    setPicked(cur);
    const ph = phaseRef.current;
    if (ph === 'done') {
      reachedRef.current = cur;
      setReached(cur);
      paint(cur, 0, 1, 1);
    } else if (ph !== 'staged') {
      runAnim(posRef.current ?? cur, cur, false);
    }
  }, [cur, paint, runAnim]);

  useEffect(
    () => () => {
      if (animRef.current.raf) cancelAnimationFrame(animRef.current.raf);
    },
    [],
  );

  const statusOf = (i: number): { label: string; kind: 'here' | 'done' | 'next' | 'later' } => {
    if (i === cur) return { label: hereLabel, kind: 'here' };
    if (i < cur) return { label: doneLabel, kind: 'done' };
    if (i === cur + 1) return { label: nextLabel, kind: 'next' };
    return { label: upcomingLabel, kind: 'later' };
  };

  const focusStop = (i: number) => {
    setPicked(i);
    buttons.current[i]?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let t = i;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') t = Math.min(n - 1, i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') t = Math.max(0, i - 1);
    else if (e.key === 'Home') t = 0;
    else if (e.key === 'End') t = n - 1;
    else return;
    e.preventDefault();
    if (t !== i) focusStop(t);
  };

  const animated = phase !== 'done';
  const rootStyle = { '--jr-route': routeColor } as CSSProperties;

  const pos = posRef.current ?? cur;
  const len = posToLen(route, pos);
  const mp = pointAtLen(route, len);
  const markerStyle: CSSProperties = { transform: `translate3d(${r1(mp.x)}px, ${r1(mp.y)}px, 0)` };
  const shadowStyle: CSSProperties = { transform: `translate3d(${r1(mp.x)}px, ${r1(mp.y)}px, 0)` };

  const chipClass = (kind: 'here' | 'done' | 'next' | 'later') =>
    `${styles.chip} ${
      kind === 'here' ? styles.chipHere : kind === 'done' ? styles.chipDone : kind === 'next' ? styles.chipNext : styles.chipLater
    }`;

  const stopButtons = stages.map((s, i) => {
    const st = statusOf(i);
    const on = i <= reached;
    const hot = wide ? i === shown : i === safePicked;
    const pinClass = [styles.pin, hot ? styles.pinHot : '', on && animated ? styles.pinStamp : ''].filter(Boolean).join(' ');
    const isNext = i === cur + 1 && (phase === 'landed' || phase === 'done');
    const aria = `${i + 1} of ${n}. ${s.name}. ${st.label}`;
    const common = {
      type: 'button' as const,
      ref: (el: HTMLButtonElement | null) => {
        buttons.current[i] = el;
      },
      tabIndex: i === safePicked ? 0 : -1,
      'aria-label': aria,
      'aria-current': i === cur ? ('step' as const) : undefined,
      onClick: () => setPicked(i),
      onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => onKey(e, i),
      onFocus: (e: FocusEvent<HTMLButtonElement>) => {
        let vis = false;
        try {
          vis = e.currentTarget.matches(':focus-visible');
        } catch {
          vis = false;
        }
        setKbd(vis ? i : null);
      },
      onBlur: () => setKbd((k) => (k === i ? null : k)),
      onPointerEnter: (e: PointerEvent<HTMLButtonElement>) => {
        if (e.pointerType === 'mouse') setHover(i);
      },
      onPointerLeave: () => setHover((h) => (h === i ? null : h)),
    };
    const pin = (
      <span
        className={styles.anchor}
        ref={(el) => {
          anchors.current[i] = el;
        }}
        style={wide ? undefined : { insetInlineStart: narrowX(i) }}
      >
        <span className={`${styles.ring} ${hot ? styles.ringHot : ''}`} />
        <span className={pinClass}>
          <svg className={styles.pinShape} viewBox="0 0 32 44" aria-hidden="true">
            <ellipse cx="16" cy="42" rx="7.5" ry="2.4" className={styles.pinGround} />
            <path
              className={on ? styles.pinBodyOn : styles.pinBodyOff}
              d="M16 42.5C16 42.5 3 28.5 3 16A13 13 0 0 1 29 16C29 28.5 16 42.5 16 42.5Z"
            />
          </svg>
          <span className={`${styles.head} ${kbd === i ? styles.headFocus : ''}`}>{i + 1}</span>
        </span>
        {wide && isNext ? (
          <span className={phase === 'landed' ? styles.flagIn : styles.flag}>
            <span className={styles.flagPole} />
            <span className={styles.flagCloth}>{nextLabel}</span>
          </span>
        ) : null}
      </span>
    );

    if (wide) {
      const up = i % 2 === 0;
      const style = {
        insetInlineStart: pts[i]?.x ?? 0,
        insetBlockStart: pts[i]?.y ?? 0,
        '--jr-lw': `${geo.lw}px`,
        '--jr-lo': `${geo.lo[i] ?? 0}px`,
        '--jr-d': `${i * 55}ms`,
      } as CSSProperties;
      const labelClass = [
        up ? styles.labelUp : styles.labelDown,
        phase === 'staged' ? styles.labelStaged : '',
      ]
        .filter(Boolean)
        .join(' ');
      const nameClass = i === cur ? styles.nameHere : i < cur ? styles.nameDone : styles.nameLater;
      return (
        <li key={i} className={styles.stopWide} style={style}>
          <button {...common} className={styles.btnWide}>
            {pin}
            <span className={labelClass}>
              <span className={nameClass}>{s.name}</span>
            </span>
          </button>
        </li>
      );
    }

    const open = i === safePicked;
    const showChip = st.kind === 'here' || st.kind === 'next' || open;
    return (
      <li key={i} className={styles.stopNarrow}>
        <button {...common} className={styles.btnNarrow}>
          {pin}
          <span className={styles.nText}>
            <span className={styles.nHead}>
              <span className={i === cur ? styles.nameHere : i < cur ? styles.nameDone : styles.nameLater}>{s.name}</span>
              {showChip ? <span className={chipClass(st.kind)}>{st.label}</span> : null}
            </span>
            {s.description ? (
              <span className={open ? styles.nDescOpen : styles.nDesc} aria-hidden={!open}>
                <span className={styles.nDescInner}>{s.description}</span>
              </span>
            ) : null}
          </span>
        </button>
      </li>
    );
  });

  const sel = stages[shown];
  const selStatus = sel ? statusOf(shown) : null;
  const nextStage = n && cur + 1 < n ? stages[cur + 1] : null;
  const waiting = phase === 'staged' || phase === 'travelling';
  const pad2 = (v: number) => String(v).padStart(2, '0');

  return (
    <section className={styles.root} style={rootStyle} ref={rootRef} aria-labelledby={`${uid}t`}>
      <MapDecor uid={uid} />
      {wide ? (
        <>
          <span className={styles.creaseA} aria-hidden="true" />
          <span className={styles.creaseB} aria-hidden="true" />
        </>
      ) : null}
      <div className={styles.sheet}>
        <header className={styles.header}>
          <h2 className={styles.title} id={`${uid}t`}>
            {title}
          </h2>
          <Compass swing={phase === 'landed'} />
        </header>

        {n ? (
          <div
            className={wide ? styles.stageWide : styles.stageNarrow}
            ref={stageRef}
            style={wide ? { blockSize: H } : undefined}
          >
            <svg
              className={`${styles.routeSvg} ${phase === 'staged' ? styles.routeStaged : ''}`}
              viewBox={`0 0 ${Math.max(1, size.W)} ${Math.max(1, H)}`}
              aria-hidden="true"
            >
              {n > 1 ? (
                <>
                  <path className={styles.routeAhead} d={route.d} pathLength={r1(route.total)} />
                  <path
                    ref={walkedRef}
                    className={styles.routeWalked}
                    d={route.d}
                    pathLength={r1(route.total)}
                    strokeDasharray={`${r1(len)} ${r1(route.total + 10)}`}
                  />
                </>
              ) : null}
            </svg>
            <div className={styles.markerShadow} ref={shadowRef} style={shadowStyle} aria-hidden="true" />
            <ol
              className={wide ? styles.stopsWide : styles.stopsNarrow}
              aria-label="Route stops. Use the arrow keys to move between stops."
            >
              {stopButtons}
            </ol>
            <div
              className={`${styles.marker} ${phase === 'staged' ? styles.markerHidden : ''}`}
              ref={markerRef}
              style={markerStyle}
              aria-hidden="true"
            >
              <div className={styles.markerInner} ref={innerRef}>
                {phase === 'landed' ? (
                  <>
                    <span className={styles.ripple} />
                    <span className={styles.rippleLate} />
                  </>
                ) : null}
                <span className={styles.disc}>
                  <MarkerIcon kind={markerIcon} />
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {wide && sel && selStatus ? (
          <div className={`${styles.readout} ${waiting ? styles.readoutWait : ''}`}>
            <div className={styles.rMain} aria-live="polite">
              <div className={styles.rIn} key={shown}>
                <h3 className={styles.rName}>
                  {sel.name}
                  <span className={chipClass(selStatus.kind)}>{selStatus.label}</span>
                </h3>
                {sel.description ? <p className={styles.rDesc}>{sel.description}</p> : null}
              </div>
            </div>
            <div className={styles.rSide}>
              {nextStage ? (
                <div className={styles.rNext}>
                  <span className={styles.rNextLabel}>{nextLabel}</span>
                  <span className={styles.rNextName}>
                    <svg className={styles.rArrow} viewBox="0 0 24 12" aria-hidden="true">
                      <path d="M1 6h20M16 1.5 21.5 6 16 10.5" />
                    </svg>
                    {nextStage.name}
                  </span>
                </div>
              ) : null}
              <div className={styles.rCount} aria-hidden="true">
                <span className={styles.rNow}>{pad2(cur + 1)}</span>
                <span className={styles.rTotal}>/{pad2(n)}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
```

```css
/* Trail map: stone paper, forest-green dashed route, mustard pins, hand-drawn compass. Bricolage Grotesque (OFL) is embedded below. */
@font-face {
  font-family: 'JobRouteTracker Bricolage';
  src: url(data:font/woff2;base64,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) format('woff2');
  font-weight: 400 800;
  font-style: normal;
  font-display: swap;
}

.root {
  --jr-paper: #e6e4da;
  --jr-paper-hi: #f2f0e8;
  --jr-paper-lo: #d6d4c7;
  --jr-ink: #1b2a22;
  --jr-quiet: #435249;
  --jr-route: #2b6a46;
  --jr-marker: color-mix(in srgb, var(--jr-route) 68%, #07130c);
  --jr-pin: #dba421;
  --jr-water: #c4d5cb;
  --jr-focus: #17402b;
  --jr-font: 'JobRouteTracker Bricolage', 'Avenir Next', 'Segoe UI', system-ui, sans-serif;

  position: relative;
  box-sizing: border-box;
  inline-size: 100%;
  container-type: inline-size;
  isolation: isolate;
  overflow: hidden;
  border-radius: 26px;
  background: var(--jr-paper);
  border: 1px solid color-mix(in srgb, var(--jr-ink) 14%, transparent);
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--jr-ink) 10%, transparent),
    0 22px 44px -26px color-mix(in srgb, var(--jr-ink) 38%, transparent);
  color: var(--jr-ink);
  font-family: var(--jr-font);
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.root::selection {
  background: color-mix(in srgb, var(--jr-pin) 55%, transparent);
  color: var(--jr-ink);
}

/* ── scenery ── */
.decor {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  z-index: 0;
  pointer-events: none;
}

.water {
  fill: var(--jr-water);
  opacity: 0.75;
}

.river {
  fill: none;
  stroke: var(--jr-water);
  stroke-width: 15;
  stroke-linecap: round;
  opacity: 0.8;
}

.contour {
  fill: none;
  stroke: var(--jr-ink);
  stroke-width: 1.1;
  opacity: 0.1;
}

.contourMajor {
  fill: none;
  stroke: var(--jr-ink);
  stroke-width: 1.6;
  opacity: 0.18;
}

.tree {
  fill: color-mix(in srgb, var(--jr-route) 22%, transparent);
  stroke: color-mix(in srgb, var(--jr-route) 50%, transparent);
  stroke-width: 1.4;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.ridge {
  fill: color-mix(in srgb, var(--jr-paper-hi) 60%, transparent);
  stroke: color-mix(in srgb, var(--jr-ink) 38%, transparent);
  stroke-width: 1.6;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.grain {
  fill: #000;
  opacity: 0.2;
  mix-blend-mode: multiply;
}

.creaseA,
.creaseB {
  position: absolute;
  inset-block: 0;
  inline-size: 18px;
  margin-inline-start: -9px;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--jr-ink) 6%, transparent) 44%,
    color-mix(in srgb, #fff 60%, transparent) 52%,
    transparent 100%
  );
}

.creaseA {
  inset-inline-start: 33.333%;
}

.creaseB {
  inset-inline-start: 66.666%;
}

/* ── sheet ── */
.sheet {
  position: relative;
  z-index: 2;
  padding-block: clamp(22px, 4.4cqi, 54px) clamp(20px, 3.4cqi, 42px);
  padding-inline: clamp(18px, 4.4cqi, 56px);
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: clamp(14px, 3cqi, 40px);
  margin-block-end: clamp(6px, 1.6cqi, 18px);
}

.title {
  flex: 1 1 auto;
  min-inline-size: 0;
  max-inline-size: 15ch;
  margin: 0;
  font-size: clamp(30px, 6cqi, 68px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.compass {
  flex: none;
  inline-size: clamp(60px, 9cqi, 112px);
  block-size: auto;
  aspect-ratio: 1;
  transform: rotate(-8deg);
}

.cFill {
  fill: var(--jr-paper-hi);
  opacity: 0.75;
}

.cInk {
  fill: none;
  stroke: var(--jr-ink);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.cInkThin {
  fill: none;
  stroke: var(--jr-ink);
  stroke-width: 1.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.7;
}

.cNorth {
  fill: var(--jr-pin);
  stroke: var(--jr-ink);
  stroke-width: 1.8;
  stroke-linejoin: round;
}

.cSouth {
  fill: var(--jr-paper-lo);
  stroke: var(--jr-ink);
  stroke-width: 1.8;
  stroke-linejoin: round;
}

.cHub {
  fill: var(--jr-ink);
}

.needle {
  transform-box: view-box;
  transform-origin: 50px 50px;
  transform: rotate(18deg);
}

.needleSwing {
  transform-box: view-box;
  transform-origin: 50px 50px;
  transform: rotate(18deg);
  animation: needleSwing 1600ms cubic-bezier(0.3, 0.7, 0.3, 1) backwards;
}

@keyframes needleSwing {
  0% {
    transform: rotate(-88deg);
  }
  28% {
    transform: rotate(46deg);
  }
  50% {
    transform: rotate(5deg);
  }
  72% {
    transform: rotate(24deg);
  }
  100% {
    transform: rotate(18deg);
  }
}

/* ── route ── */
.stageWide {
  position: relative;
  inline-size: 100%;
}

.stageNarrow {
  position: relative;
  inline-size: 100%;
  margin-block-start: 4px;
}

.routeSvg {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  z-index: 0;
  overflow: visible;
  pointer-events: none;
  opacity: 1;
  transition: opacity 700ms ease;
}

.routeStaged {
  opacity: 0;
}

.routeAhead {
  fill: none;
  stroke: var(--jr-route);
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-dasharray: 8 10;
  opacity: 0.9;
}

.routeWalked {
  fill: none;
  stroke: var(--jr-route);
  stroke-width: 5.5;
  stroke-linecap: round;
}

.stopsWide {
  position: absolute;
  inset: 0;
  z-index: 2;
  margin: 0;
  padding: 0;
  list-style: none;
}

.stopsNarrow {
  position: relative;
  z-index: 2;
  margin: 0;
  padding: 0;
  list-style: none;
}

.stopWide {
  position: absolute;
  inline-size: 0;
  block-size: 0;
}

.btnWide {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  inline-size: 0;
  block-size: 0;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  overflow: visible;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.stopNarrow {
  display: block;
}

.btnNarrow {
  --jr-ay: 46px;
  position: relative;
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr);
  inline-size: 100%;
  min-block-size: 88px;
  margin: 0;
  padding-block: 8px 14px;
  padding-inline: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-align: start;
  cursor: pointer;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.anchor {
  position: absolute;
  inset-block-start: var(--jr-ay, 0px);
  inset-inline-start: 0;
  inline-size: 0;
  block-size: 0;
}

.ring {
  position: absolute;
  inset-inline-start: -15px;
  inset-block-start: -6px;
  inline-size: 30px;
  block-size: 12px;
  box-sizing: border-box;
  border-radius: 50%;
  border: 2px dashed var(--jr-route);
  opacity: 0;
  transform: scale(0.6);
  transition:
    opacity 240ms ease,
    transform 360ms cubic-bezier(0.2, 0.9, 0.3, 1.3);
}

.ringHot {
  opacity: 0.9;
  transform: scale(1);
}

.pin {
  position: absolute;
  inset-inline-start: -16px;
  inset-block-start: -44px;
  inline-size: 32px;
  block-size: 44px;
  transform-origin: 50% 100%;
  transition: transform 320ms cubic-bezier(0.2, 0.9, 0.3, 1.25);
}

.pinHot {
  transform: translateY(-3px) scale(1.08);
}

.pinStamp {
  animation: pinStamp 560ms cubic-bezier(0.2, 0.9, 0.3, 1.3) backwards;
}

@keyframes pinStamp {
  0% {
    transform: translateY(-12px) scale(0.4);
    opacity: 0;
  }
  55% {
    transform: translateY(0) scale(1.2);
    opacity: 1;
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

.pinShape {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
}

.pinGround {
  fill: var(--jr-ink);
  opacity: 0.2;
}

.pinBodyOn {
  fill: var(--jr-pin);
  stroke: color-mix(in srgb, var(--jr-ink) 38%, transparent);
  stroke-width: 1.2;
  stroke-linejoin: round;
  transition: fill 260ms ease;
}

.pinBodyOff {
  fill: var(--jr-paper-hi);
  stroke: var(--jr-pin);
  stroke-width: 2.4;
  stroke-linejoin: round;
  transition: fill 260ms ease;
}

.head {
  position: absolute;
  inset-inline-start: 3px;
  inset-block-start: 3px;
  display: grid;
  place-items: center;
  inline-size: 26px;
  block-size: 26px;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  color: var(--jr-ink);
}

.headFocus {
  outline: 2.5px solid var(--jr-focus);
  outline-offset: 3px;
}

.flag,
.flagIn {
  position: absolute;
  inset-inline-start: 17px;
  inset-block-start: -50px;
  display: flex;
  align-items: flex-start;
  transform-origin: 0 100%;
  pointer-events: none;
}

.flagIn {
  animation: flagUnfurl 620ms cubic-bezier(0.2, 0.9, 0.3, 1.2) 160ms backwards;
}

@keyframes flagUnfurl {
  0% {
    transform: scale(0.2, 0.55) rotate(-8deg);
    opacity: 0;
  }
  100% {
    transform: none;
    opacity: 1;
  }
}

.flagPole {
  flex: none;
  inline-size: 2px;
  block-size: 32px;
  border-radius: 1px;
  background: var(--jr-ink);
}

.flagCloth {
  padding-block: 3px;
  padding-inline: 8px 15px;
  background: var(--jr-pin);
  color: var(--jr-ink);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
  clip-path: polygon(0 0, 100% 0, calc(100% - 8px) 50%, 100% 100%, 0 100%);
}

/* ── labels ── */
.labelUp,
.labelDown {
  position: absolute;
  inset-inline-start: var(--jr-lo);
  inline-size: var(--jr-lw);
  text-align: center;
  transition:
    opacity 520ms ease var(--jr-d),
    transform 560ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--jr-d);
}

.labelUp {
  inset-block-end: 52px;
}

.labelDown {
  inset-block-start: 16px;
}

.labelStaged {
  opacity: 0;
  transform: translateY(10px);
}

.nameHere,
.nameDone,
.nameLater {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.nameHere {
  font-size: 17px;
  font-weight: 700;
  background-image: linear-gradient(transparent 62%, color-mix(in srgb, var(--jr-pin) 62%, transparent) 62%);
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.nameDone {
  color: var(--jr-ink);
}

.nameLater {
  color: var(--jr-quiet);
}

/* ── chips ── */
.chip {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  block-size: 26px;
  margin-inline-start: 12px;
  padding-inline: 11px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 650;
  line-height: 1;
  letter-spacing: 0.01em;
  vertical-align: middle;
  white-space: nowrap;
}

.chipHere {
  background: var(--jr-marker);
  color: #f6f2e4;
}

.chipDone {
  background: color-mix(in srgb, var(--jr-route) 16%, transparent);
  border-color: color-mix(in srgb, var(--jr-route) 40%, transparent);
  color: var(--jr-ink);
}

.chipNext {
  background: color-mix(in srgb, var(--jr-pin) 40%, transparent);
  border-color: var(--jr-pin);
  color: var(--jr-ink);
}

.chipLater {
  border-color: color-mix(in srgb, var(--jr-ink) 30%, transparent);
  color: var(--jr-quiet);
}

/* ── marker ── */
.marker,
.markerShadow {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  inline-size: 0;
  block-size: 0;
  pointer-events: none;
  will-change: transform;
}

.marker {
  z-index: 4;
  opacity: 1;
  transition: opacity 240ms ease;
}

.markerHidden {
  opacity: 0;
}

.markerShadow {
  z-index: 1;
}

.markerShadow::after {
  content: '';
  position: absolute;
  inset-inline-start: -12px;
  inset-block-start: -4px;
  inline-size: 24px;
  block-size: 8px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--jr-ink) 32%, transparent);
  filter: blur(2px);
}

.markerInner {
  position: absolute;
  inset-inline-start: -23px;
  inset-block-start: -50px;
  inline-size: 46px;
  block-size: 46px;
  transform-origin: 50% 100%;
}

.disc {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  border-radius: 50%;
  border: 3px solid var(--jr-pin);
  background: var(--jr-marker);
  box-shadow: 0 3px 8px color-mix(in srgb, #07130c 30%, transparent);
}

.icon {
  inline-size: 24px;
  block-size: 24px;
  fill: none;
  stroke: #f7dd85;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ripple,
.rippleLate {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border-radius: 50%;
  border: 2px solid var(--jr-pin);
  animation: ripple 1500ms cubic-bezier(0.2, 0.6, 0.3, 1) 2 backwards;
}

.rippleLate {
  animation-delay: 450ms;
}

@keyframes ripple {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(2.3);
    opacity: 0;
  }
}

/* ── narrow route: stops stack down the line ── */
.nText {
  grid-column: 2;
  display: block;
  min-inline-size: 0;
  padding-inline-end: 4px;
}

.nHead {
  display: block;
  padding-block-end: 2px;
}

.nDesc {
  display: grid;
  grid-template-rows: 0fr;
  visibility: hidden;
  opacity: 0;
  color: var(--jr-quiet);
  font-size: 15px;
  line-height: 1.5;
  transition:
    grid-template-rows 380ms cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 260ms ease,
    visibility 0s linear 380ms;
}

.nDescOpen {
  display: grid;
  grid-template-rows: 1fr;
  visibility: visible;
  opacity: 1;
  color: var(--jr-quiet);
  font-size: 15px;
  line-height: 1.5;
  transition:
    grid-template-rows 380ms cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 320ms ease 80ms,
    visibility 0s linear 0s;
}

.nDescInner {
  display: block;
  min-block-size: 0;
  overflow: hidden;
  overflow-wrap: anywhere;
}

/* ── readout (wide) ── */
.readout {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
  align-items: end;
  gap: clamp(20px, 4cqi, 56px);
  min-block-size: 11rem;
  margin-block-start: 6px;
  padding-block-start: clamp(18px, 2.4cqi, 28px);
  border-block-start: 1.5px dashed color-mix(in srgb, var(--jr-ink) 26%, transparent);
  opacity: 1;
  transition:
    opacity 560ms ease 80ms,
    transform 600ms cubic-bezier(0.2, 0.8, 0.2, 1) 80ms;
}

.readoutWait {
  opacity: 0;
  transform: translateY(12px);
}

.rMain {
  min-inline-size: 0;
}

.rIn {
  animation: readoutIn 380ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
}

@keyframes readoutIn {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: none;
  }
}

.rName {
  margin: 0;
  font-size: clamp(26px, 3.6cqi, 44px);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -0.035em;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.rDesc {
  max-inline-size: 56ch;
  margin: 12px 0 0;
  color: var(--jr-quiet);
  font-size: 17px;
  line-height: 1.5;
  text-wrap: pretty;
  overflow-wrap: anywhere;
}

.rSide {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 18px;
  min-inline-size: 0;
  padding-inline-start: clamp(14px, 3cqi, 40px);
}

.rNext {
  min-inline-size: 0;
}

.rNextLabel {
  display: block;
  margin-block-end: 4px;
  color: var(--jr-quiet);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
}

.rNextName {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 20px;
  font-weight: 650;
  line-height: 1.25;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.rArrow {
  flex: none;
  inline-size: 24px;
  block-size: 12px;
  margin-block-start: 0.45em;
  fill: none;
  stroke: var(--jr-route);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.rCount {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.rNow {
  font-size: clamp(48px, 6cqi, 76px);
  font-weight: 800;
  line-height: 0.9;
  letter-spacing: -0.05em;
}

.rTotal {
  color: var(--jr-quiet);
  font-size: 20px;
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .pinStamp,
  .flagIn,
  .ripple,
  .rippleLate,
  .rIn,
  .needleSwing {
    animation: none;
  }

  .routeSvg,
  .labelUp,
  .labelDown,
  .readout,
  .marker,
  .pin,
  .ring,
  .nDesc,
  .nDescOpen {
    transition: none;
  }
}
```
