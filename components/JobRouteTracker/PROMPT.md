Create a custom element called "Job Route Tracker". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: title, stages (name, short description), current stage, marker icon, status labels (you are here, next stop, done, coming up). Add other settings if they help.

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
    <section className={styles.root} ref={rootRef} aria-labelledby={`${uid}t`}>
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
.root {
  --jr-font: 'Bricolage Grotesque', 'Avenir Next', 'Segoe UI', system-ui, sans-serif;

  position: relative;
  box-sizing: border-box;
  inline-size: 100%;
  container-type: inline-size;
  isolation: isolate;
  overflow: hidden;
  border-radius: 26px;
  background: #e6e4da;
  border: 1px solid color-mix(in srgb, #1b2a22 14%, transparent);
  box-shadow:
    0 1px 2px color-mix(in srgb, #1b2a22 10%, transparent),
    0 22px 44px -26px color-mix(in srgb, #1b2a22 38%, transparent);
  color: #1b2a22;
  font-family: var(--jr-font);
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.root::selection {
  background: color-mix(in srgb, #dba421 55%, transparent);
  color: #1b2a22;
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
  fill: #c4d5cb;
  opacity: 0.75;
}

.river {
  fill: none;
  stroke: #c4d5cb;
  stroke-width: 15;
  stroke-linecap: round;
  opacity: 0.8;
}

.contour {
  fill: none;
  stroke: #1b2a22;
  stroke-width: 1.1;
  opacity: 0.1;
}

.contourMajor {
  fill: none;
  stroke: #1b2a22;
  stroke-width: 1.6;
  opacity: 0.18;
}

.tree {
  fill: color-mix(in srgb, #2b6a46 22%, transparent);
  stroke: color-mix(in srgb, #2b6a46 50%, transparent);
  stroke-width: 1.4;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.ridge {
  fill: color-mix(in srgb, #f2f0e8 60%, transparent);
  stroke: color-mix(in srgb, #1b2a22 38%, transparent);
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
    color-mix(in srgb, #1b2a22 6%, transparent) 44%,
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
  fill: #f2f0e8;
  opacity: 0.75;
}

.cInk {
  fill: none;
  stroke: #1b2a22;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.cInkThin {
  fill: none;
  stroke: #1b2a22;
  stroke-width: 1.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.7;
}

.cNorth {
  fill: #dba421;
  stroke: #1b2a22;
  stroke-width: 1.8;
  stroke-linejoin: round;
}

.cSouth {
  fill: #d6d4c7;
  stroke: #1b2a22;
  stroke-width: 1.8;
  stroke-linejoin: round;
}

.cHub {
  fill: #1b2a22;
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
  stroke: #2b6a46;
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-dasharray: 8 10;
  opacity: 0.9;
}

.routeWalked {
  fill: none;
  stroke: #2b6a46;
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
  border: 2px dashed #2b6a46;
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
  fill: #1b2a22;
  opacity: 0.2;
}

.pinBodyOn {
  fill: #dba421;
  stroke: color-mix(in srgb, #1b2a22 38%, transparent);
  stroke-width: 1.2;
  stroke-linejoin: round;
  transition: fill 260ms ease;
}

.pinBodyOff {
  fill: #f2f0e8;
  stroke: #dba421;
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
  color: #1b2a22;
}

.headFocus {
  outline: 2.5px solid #17402b;
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
  background: #1b2a22;
}

.flagCloth {
  padding-block: 3px;
  padding-inline: 8px 15px;
  background: #dba421;
  color: #1b2a22;
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
  background-image: linear-gradient(transparent 62%, color-mix(in srgb, #dba421 62%, transparent) 62%);
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.nameDone {
  color: #1b2a22;
}

.nameLater {
  color: #435249;
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
  background: color-mix(in srgb, #2b6a46 68%, #07130c);
  color: #f6f2e4;
}

.chipDone {
  background: color-mix(in srgb, #2b6a46 16%, transparent);
  border-color: color-mix(in srgb, #2b6a46 40%, transparent);
  color: #1b2a22;
}

.chipNext {
  background: color-mix(in srgb, #dba421 40%, transparent);
  border-color: #dba421;
  color: #1b2a22;
}

.chipLater {
  border-color: color-mix(in srgb, #1b2a22 30%, transparent);
  color: #435249;
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
  background: color-mix(in srgb, #1b2a22 32%, transparent);
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
  border: 3px solid #dba421;
  background: color-mix(in srgb, #2b6a46 68%, #07130c);
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
  border: 2px solid #dba421;
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
  color: #435249;
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
  color: #435249;
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
  border-block-start: 1.5px dashed color-mix(in srgb, #1b2a22 26%, transparent);
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
  color: #435249;
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
  color: #435249;
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
  stroke: #2b6a46;
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
  color: #435249;
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
