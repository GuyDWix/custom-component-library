Create a custom element called "Service Area Rings". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: rings (distance label, time, fee), neighbourhoods per ring, centre label. Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface ServiceAreaRing {
  distance: string;
  time: string;
  fee: string;
}

export interface ServiceAreaNeighbourhood {
  name: string;
  /** 1 = innermost ring */
  ring: number;
}

export interface ServiceAreaRingsProps {
  rings?: ServiceAreaRing[];
  neighbourhoods?: ServiceAreaNeighbourhood[];
  centreLabel?: string;
  distanceLabel?: string;
  feeLabel?: string;
  className?: string;
}

export const defaultRings: ServiceAreaRing[] = [
  { distance: '1 km', time: '10–15 min', fee: 'Free' },
  { distance: '2.5 km', time: '20–25 min', fee: '$2.50' },
  { distance: '4 km', time: '30–40 min', fee: '$4.00' },
  { distance: '6 km', time: '45–55 min', fee: '$6.50' },
];

export const defaultNeighbourhoods: ServiceAreaNeighbourhood[] = [
  { name: 'Quay Street', ring: 1 },
  { name: 'Old Dock', ring: 1 },
  { name: 'Fishmarket Row', ring: 1 },
  { name: 'Lighthouse Hill', ring: 2 },
  { name: 'Ropewalk', ring: 2 },
  { name: 'The Saltings', ring: 2 },
  { name: 'Marlow Heights', ring: 3 },
  { name: 'Tidewater Park', ring: 3 },
  { name: 'Gull Lane', ring: 3 },
  { name: 'Northgate', ring: 4 },
  { name: 'Brightwater', ring: 4 },
  { name: 'Cove Road', ring: 4 },
];

/* ---------- geometry (pure, deterministic) ---------- */

const NEAT = 14;
const NEAT_BAND = 6;
const INSET = NEAT + NEAT_BAND;
const D2R = Math.PI / 180;
const DEFAULT_WIDTH = 1200;

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const r1 = (n: number) => Math.round(n * 10) / 10;
const pt = (cx: number, cy: number, r: number, deg: number) => ({
  x: cx + r * Math.cos(deg * D2R),
  y: cy - r * Math.sin(deg * D2R),
});

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface Geometry {
  width: number;
  height: number;
  compact: boolean;
  pinX: number;
  pinY: number;
  roseR: number;
  radii: number[];
  cardW: number;
  card: Rect | null;
}

interface Size {
  w: number;
  h: number;
}

interface Placed {
  x: number;
  y: number;
  side: 'right' | 'left';
  order: number;
  maxW: number;
  /** true when the full label could not be placed without a collision; only the dot shows (name appears on hover/focus) */
  dotOnly: boolean;
}

/** widest a wide-layout label may grow before its text wraps at word boundaries */
const LABEL_MAX = 176;
const sizeFor = (text: string): 'L' | 'M' | 'S' => (text.length <= 11 ? 'L' : text.length <= 20 ? 'M' : 'S');
const SIZE_PX = { L: 44, M: 32, S: 24 };

function computeGeometry(width: number, rings: ServiceAreaRing[]): Geometry {
  const n = rings.length;
  const compact = width < 760;
  let height: number;
  let pinX: number;
  let pinY: number;
  let rMax: number;
  if (compact) {
    const pad = 92;
    pinX = Math.round(clamp(width * 0.17, 56, 96));
    rMax = Math.max(60, width - pinX - 26);
    height = Math.round(Math.min(rMax + 30, width * 0.95) + pad);
    pinY = height - pad;
  } else {
    const pad = 88;
    height = clamp(Math.round(width * 0.46), 440, 640);
    pinY = height - pad;
    pinX = Math.round(width * 0.2);
    rMax = width - pinX - 26;
  }
  const radii = rings.map((_, i) => r1((rMax * (i + 1)) / n));

  let card: Rect | null = null;
  const cardW = clamp(Math.round(width * 0.27), 250, 340);
  if (!compact) {
    let maxH = 0;
    rings.forEach((ring) => {
      const size = SIZE_PX[sizeFor(ring.time)];
      const lines = Math.max(1, Math.ceil((ring.time.length * size * 0.54) / (cardW - 120)));
      const factsExtra = Math.max(ring.distance.length, ring.fee.length) > 13 ? 22 : 0;
      maxH = Math.max(maxH, 44 + lines * size * 1.1 + 18 + 52 + factsExtra + 40);
    });
    card = { x0: 20, y0: 20, x1: INSET + 14 + cardW + 14, y1: INSET + 14 + maxH + 14 };
  }
  return { width, height, compact, pinX, pinY, roseR: compact ? 26 : 44, radii, cardW, card };
}

const overlaps = (a: Rect, b: Rect, pad = 0) =>
  a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;

/** nearest / farthest distance from a point to a rectangle */
function rectSpan(px: number, py: number, r: Rect): [number, number] {
  const dx = Math.max(r.x0 - px, 0, px - r.x1);
  const dy = Math.max(r.y0 - py, 0, py - r.y1);
  const fx = Math.max(Math.abs(px - r.x0), Math.abs(px - r.x1));
  const fy = Math.max(Math.abs(py - r.y0), Math.abs(py - r.y1));
  return [Math.hypot(dx, dy), Math.hypot(fx, fy)];
}

/**
 * Collision-aware label layout. Every label is placed from its MEASURED size: the dot sits on its
 * ring and the text body must fit inside one band (never straddling a ring line), clear of the
 * compass, the facts card, the chart frame and every other label. A label that cannot fit falls back
 * to a dot (name on hover/focus), so text never overlaps and never breaks letter by letter.
 */
function placeNeighbourhoods(g: Geometry, hoods: ServiceAreaNeighbourhood[], n: number, sizes: Size[] | null): Placed[] {
  const out: Placed[] = new Array(hoods.length);
  const taken: Rect[] = [];
  const byRing: number[][] = Array.from({ length: n }, () => []);
  hoods.forEach((h, i) => byRing[clamp(Math.round(h.ring) - 1, 0, n - 1)].push(i));

  const DOT = 15; // half the dot cell
  const sideOf = (x: number) => (x < g.width * 0.52 ? 'right' : 'left');
  const dotOk = (x: number, y: number) => {
    if (g.compact) return x >= 34 && x <= g.width - 34 && y >= 42 && y <= g.pinY - 30;
    if (x < 56 || x > g.width - 44 || y < 54 || y > g.pinY - 36) return false;
    if (g.card && overlaps({ x0: x - 4, y0: y - 4, x1: x + 4, y1: y + 4 }, g.card, 8)) return false;
    return true;
  };

  /** full box + text-body box for a label whose dot centre is (x, y) */
  const boxesOf = (x: number, y: number, side: 'right' | 'left', size: Size | null) => {
    if (!size) {
      const dot = { x0: x - DOT, y0: y - DOT, x1: x + DOT, y1: y + DOT };
      return { box: dot, body: null as Rect | null };
    }
    const { w, h } = size;
    const box =
      side === 'right'
        ? { x0: x - 14, y0: y - h / 2, x1: x - 14 + w, y1: y + h / 2 }
        : { x0: x + 14 - w, y0: y - h / 2, x1: x + 14, y1: y + h / 2 };
    const body = side === 'right' ? { ...box, x0: x + DOT } : { ...box, x1: x - DOT };
    return { box, body };
  };

  const frame: Rect = { x0: INSET + 6, y0: INSET + 6, x1: g.width - INSET - 6, y1: g.pinY - 10 };
  const inside = (b: Rect) => b.x0 >= frame.x0 && b.x1 <= frame.x1 && b.y0 >= frame.y0 && b.y1 <= frame.y1;

  const feasible = (x: number, y: number, side: 'right' | 'left', size: Size | null, pad = 4) => {
    const { box, body } = boxesOf(x, y, side, size);
    if (g.compact) {
      if (box.x0 < 8 || box.x1 > g.width - 8) return false;
    } else if (!inside(box)) {
      return false;
    }
    if (taken.some((t) => overlaps(box, t, pad))) return false;
    if (g.card && overlaps(box, g.card, 6)) return false;
    if (!g.compact) {
      // keep clear of the compass rose and the pin
      if (rectSpan(g.pinX, g.pinY, box)[0] < g.roseR + 10) return false;
      // the text body may not straddle any ring line
      if (body) {
        const [mn, mx] = rectSpan(g.pinX, g.pinY, body);
        if (g.radii.some((r) => mn - 2 < r && r < mx + 2)) return false;
      }
    }
    return true;
  };

  byRing.forEach((list, ri) => {
    const radius = g.radii[ri];
    const valid: number[] = [];
    for (let d = 1; d < 180; d += 1) {
      const p = pt(g.pinX, g.pinY, radius, d);
      if (dotOk(p.x, p.y)) valid.push(d);
    }
    const k = list.length;
    const targetOf = (j: number) =>
      valid.length ? valid[Math.min(valid.length - 1, Math.floor(((j + 0.5) * valid.length) / k))] : 50;

    // widest labels choose first: they have the fewest places to go
    const order = list.map((hi, j) => ({ hi, j })).sort((a, b) => (sizes?.[b.hi]?.w ?? 0) - (sizes?.[a.hi]?.w ?? 0) || a.j - b.j);

    order.forEach(({ hi, j }) => {
      const target = targetOf(j);
      const size = !g.compact && sizes ? sizes[hi] ?? null : null;
      const tryPlace = (sz: Size | null, pad = 4) => {
        let best: { d: number; side: 'right' | 'left'; cost: number } | null = null;
        for (const d of valid) {
          const p = pt(g.pinX, g.pinY, radius, d);
          const sides: Array<'right' | 'left'> = g.compact ? [sideOf(p.x)] : ['left', 'right'];
          for (const side of sides) {
            // prefer the inward body (towards the pin column), then the outward one
            const inward = p.x > g.pinX ? 'left' : 'right';
            const cost = Math.abs(d - target) + (side === inward ? 0 : 2);
            if (best && cost >= best.cost) continue;
            if (feasible(p.x, p.y, side, sz, pad)) best = { d, side, cost };
          }
        }
        return best;
      };
      let dotOnly = g.compact || !size;
      let pick = tryPlace(dotOnly ? null : size);
      if (!pick && !dotOnly) {
        dotOnly = true;
        pick = tryPlace(null);
      }
      // overcrowded ring: let the dots sit edge to edge rather than on top of each other
      if (!pick) pick = tryPlace(null, 0);
      const d = pick ? pick.d : target;
      const p = pt(g.pinX, g.pinY, radius, d);
      const side = pick ? pick.side : sideOf(p.x);
      taken.push(boxesOf(p.x, p.y, side, dotOnly ? null : size).box);
      const avail = side === 'right' ? g.width - p.x - 22 : p.x - 22;
      out[hi] = {
        x: r1(p.x),
        y: r1(p.y),
        side,
        order: j,
        maxW: Math.round(clamp(avail, 96, g.compact ? 190 : LABEL_MAX)),
        dotOnly,
      };
    });
  });
  return out;
}

/* ---------- SVG path builders ---------- */

const arcPath = (cx: number, cy: number, r: number) => `M${r1(cx + r)} ${r1(cy)}A${r1(r)} ${r1(r)} 0 0 0 ${r1(cx - r)} ${r1(cy)}`;

const bandPath = (cx: number, cy: number, ro: number, ri: number) =>
  ri <= 0
    ? `${arcPath(cx, cy, ro)}Z`
    : `${arcPath(cx, cy, ro)}L${r1(cx - ri)} ${r1(cy)}A${r1(ri)} ${r1(ri)} 0 0 1 ${r1(cx + ri)} ${r1(cy)}Z`;

function contourPath(cx: number, cy: number, r: number, seed: number): string {
  const step = clamp(7 / (r * D2R), 0.6, 4);
  let d = '';
  for (let a = 0; a <= 180.0001; a += step) {
    const t = a * D2R;
    const k =
      1 +
      0.012 * Math.sin(t * (2.2 + (seed % 3) * 0.9) + seed * 1.7) +
      0.007 * Math.sin(t * (5.3 + (seed % 4) * 0.7) + seed * 0.9);
    const p = pt(cx, cy, r * k, a);
    d += `${d ? 'L' : 'M'}${r1(p.x)} ${r1(p.y)}`;
  }
  return d;
}

function tickPath(cx: number, cy: number, r: number): string {
  const step = r < 120 ? 5 : 2.5;
  let d = '';
  for (let i = 0; i * step <= 180.0001; i += 1) {
    const a = i * step;
    const tens = a / 10;
    const major = Math.abs(tens - Math.round(tens)) < 1e-6;
    const a1 = pt(cx, cy, r, a);
    const a2 = pt(cx, cy, r - (major ? 9 : 4), a);
    d += `M${r1(a1.x)} ${r1(a1.y)}L${r1(a2.x)} ${r1(a2.y)}`;
  }
  return d;
}

function bearingPath(cx: number, cy: number, r0: number, r: number): string {
  let d = '';
  for (let a = 15; a < 180; a += 15) {
    const p0 = pt(cx, cy, r0, a);
    const p1 = pt(cx, cy, r, a);
    d += `M${r1(p0.x)} ${r1(p0.y)}L${r1(p1.x)} ${r1(p1.y)}`;
  }
  return d;
}

function rosePaths(cx: number, cy: number, R: number): { solid: string; hollow: string } {
  let solid = '';
  let hollow = '';
  const inner = R * 0.24;
  for (let k = 0; k < 8; k += 1) {
    const a = k * 45;
    const tip = pt(cx, cy, k % 2 === 0 ? R : R * 0.62, a);
    const left = pt(cx, cy, inner, a + 45 / 2);
    const right = pt(cx, cy, inner, a - 45 / 2);
    solid += `M${r1(tip.x)} ${r1(tip.y)}L${r1(left.x)} ${r1(left.y)}L${r1(cx)} ${r1(cy)}Z`;
    hollow += `M${r1(tip.x)} ${r1(tip.y)}L${r1(right.x)} ${r1(right.y)}L${r1(cx)} ${r1(cy)}Z`;
  }
  return { solid, hollow };
}

function neatlinePath(w: number, h: number): string {
  const seg = 16;
  let d = '';
  const x0 = NEAT;
  const x1 = w - NEAT;
  const y0 = NEAT;
  const y1 = h - NEAT;
  for (let i = 0, x = x0 + NEAT_BAND; x + seg <= x1 - NEAT_BAND; x += seg, i += 1) {
    if (i % 2 === 0) {
      d += `M${x} ${y0}h${seg}v${NEAT_BAND}h${-seg}Z`;
      d += `M${x} ${y1 - NEAT_BAND}h${seg}v${NEAT_BAND}h${-seg}Z`;
    }
  }
  for (let i = 0, y = y0 + NEAT_BAND; y + seg <= y1 - NEAT_BAND; y += seg, i += 1) {
    if (i % 2 === 0) {
      d += `M${x0} ${y}h${NEAT_BAND}v${seg}h${-NEAT_BAND}Z`;
      d += `M${x1 - NEAT_BAND} ${y}h${NEAT_BAND}v${seg}h${-NEAT_BAND}Z`;
    }
  }
  return d;
}

function scatterPath(g: Geometry): string {
  const rMax = g.radii[g.radii.length - 1];
  let d = '';
  for (let k = 1; k <= 46; k += 1) {
    const a = (k * 137.508) % 180;
    const r = rMax * (0.1 + 0.9 * Math.sqrt(k / 46));
    const p = pt(g.pinX, g.pinY, r, a);
    if (p.x < INSET + 10 || p.x > g.width - INSET - 10 || p.y < INSET + 10 || p.y > g.pinY - 12) continue;
    if (g.radii.some((rr) => Math.abs(rr - r) < 10)) continue;
    if (g.card && overlaps({ x0: p.x - 4, y0: p.y - 4, x1: p.x + 4, y1: p.y + 4 }, g.card, 6)) continue;
    d += `M${r1(p.x - 3)} ${r1(p.y)}h6M${r1(p.x)} ${r1(p.y - 3)}v6`;
  }
  return d;
}

/* ---------- component ---------- */

type Focus = { ring: number; hood: number | null };

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ');

export default function ServiceAreaRings({
  rings: ringsProp = defaultRings,
  neighbourhoods = defaultNeighbourhoods,
  centreLabel = 'Pier Nine Kitchen',
  distanceLabel = 'Distance',
  feeLabel = 'Delivery fee',
  className,
}: ServiceAreaRingsProps) {
  const rings = ringsProp.length ? ringsProp : defaultRings;
  const n = rings.length;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const rootRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lastHood = useRef('');

  const [width, setWidth] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [started, setStarted] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [pinned, setPinned] = useState<Focus>({ ring: Math.min(1, n - 1), hood: null });
  const [hover, setHover] = useState<Focus | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || started) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [started]);

  useEffect(() => {
    if (reduced) {
      setIntroDone(true);
      return;
    }
    if (!started) return;
    const t = window.setTimeout(() => setIntroDone(true), 1350);
    return () => window.clearTimeout(t);
  }, [started, reduced]);

  const ready = width > 0;
  const geo = useMemo(() => computeGeometry(ready ? width : DEFAULT_WIDTH, rings), [ready, width, rings]);
  const [sizes, setSizes] = useState<Size[] | null>(null);
  const [fontTick, setFontTick] = useState(0);
  const measureRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const namesKey = neighbourhoods.map((h) => h.name).join('\u0001');

  useEffect(() => {
    const f = typeof document !== 'undefined' ? document.fonts : undefined;
    if (!f) return;
    let live = true;
    const bump = () => live && setFontTick((t) => t + 1);
    f.ready.then(bump);
    f.addEventListener?.('loadingdone', bump);
    return () => {
      live = false;
      f.removeEventListener?.('loadingdone', bump);
    };
  }, []);

  // measure the real rendered label boxes (wide layout); re-measure when text or fonts change
  useIsoLayoutEffect(() => {
    if (!ready || geo.compact) return;
    const next = neighbourhoods.map((_, i) => {
      const el = measureRefs.current[i];
      return { w: el ? el.offsetWidth : 120, h: el ? el.offsetHeight : 30 };
    });
    setSizes((prev) =>
      prev && prev.length === next.length && prev.every((s, i) => s.w === next[i].w && s.h === next[i].h) ? prev : next,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, geo.compact, namesKey, fontTick]);

  const sizesOk = !geo.compact && sizes != null && sizes.length === neighbourhoods.length ? sizes : null;
  const placed = useMemo(
    () => placeNeighbourhoods(geo, neighbourhoods, n, sizesOk),
    [geo, neighbourhoods, n, sizesOk],
  );

  const art = useMemo(() => {
    const { pinX, pinY, radii, roseR } = geo;
    const rMax = radii[radii.length - 1];
    const contours: string[] = [];
    radii.forEach((r, i) => {
      const prev = i === 0 ? 0 : radii[i - 1];
      const fracs = i === 0 ? [0.5, 0.75] : [0.25, 0.5, 0.75];
      let d = '';
      fracs.forEach((f, m) => {
        d += contourPath(pinX, pinY, prev + (r - prev) * f, i * 4 + m + 1);
      });
      contours.push(d);
    });
    return {
      contours,
      ticks: radii.map((r) => tickPath(pinX, pinY, r)),
      bands: radii.map((r, i) => bandPath(pinX, pinY, r, i === 0 ? 0 : radii[i - 1])),
      arcs: radii.map((r) => arcPath(pinX, pinY, r)),
      bearings: bearingPath(pinX, pinY, roseR + 4, rMax),
      rose: rosePaths(pinX, pinY, roseR),
      neat: neatlinePath(geo.width, geo.height),
      marks: scatterPath(geo),
    };
  }, [geo]);

  const clampRing = (i: number) => clamp(i, 0, n - 1);
  const shown: Focus = hover ?? pinned;
  const hoodShown = shown.hood != null && shown.hood < neighbourhoods.length ? shown.hood : null;
  const ringIdx = clampRing(
    hoodShown != null ? Math.round(neighbourhoods[hoodShown].ring) - 1 : shown.ring,
  );
  const ring = rings[ringIdx];
  const hoodName = hoodShown != null ? neighbourhoods[hoodShown].name : '';
  if (hoodName) lastHood.current = hoodName;

  const phase = !ready ? 'pending' : reduced ? 'static' : started ? 'play' : 'armed';

  const hoverOk = (e: PointerEvent) => e.pointerType !== 'touch';
  const previewRing = (i: number) => (e: PointerEvent) => hoverOk(e) && setHover({ ring: i, hood: null });
  const previewHood = (i: number) => (e: PointerEvent) =>
    hoverOk(e) && setHover({ ring: clampRing(Math.round(neighbourhoods[i].ring) - 1), hood: i });
  const clearHover = () => setHover(null);
  const pickRing = (i: number) => setPinned({ ring: i, hood: null });
  const pickHood = (i: number) => {
    const r = clampRing(Math.round(neighbourhoods[i].ring) - 1);
    setPinned((p) => (p.hood === i ? { ring: r, hood: null } : { ring: r, hood: i }));
  };

  const onTabKey = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
      let next = i;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % n;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + n) % n;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = n - 1;
      else return;
      e.preventDefault();
      setPinned({ ring: next, hood: null });
      tabRefs.current[next]?.focus();
    },
    [n],
  );

  const ringSummary = (r: ServiceAreaRing) => `${r.distance}: ${r.time}, ${feeLabel} ${r.fee}`;
  const pinRing = clampRing(pinned.ring);

  const tabs = (
    <div
      role="radiogroup"
      aria-label="Service ring"
      className={geo.compact ? styles.tabs : styles.scale}
    >
      {rings.map((r, i) => {
        const x = geo.pinX + geo.radii[i];
        const style: CSSProperties = geo.compact
          ? {}
          : ({
              insetInlineStart: r1(x),
              insetBlockStart: geo.pinY + 14,
              maxInlineSize: Math.max(72, Math.round(geo.radii[0] - 14)),
              '--d': `${760 + i * 90}ms`,
            } as CSSProperties);
        return (
          <button
            key={i}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={pinRing === i}
            aria-label={ringSummary(r)}
            tabIndex={pinRing === i ? 0 : -1}
            data-active={ringIdx === i}
            className={geo.compact ? styles.tab : styles.pill}
            style={style}
            onClick={() => pickRing(i)}
            onKeyDown={(e) => onTabKey(e, i)}
            onPointerEnter={previewRing(i)}
            onPointerLeave={clearHover}
          >
            {r.distance}
          </button>
        );
      })}
    </div>
  );

  const mini = (
    <svg className={styles.mini} viewBox="0 0 44 44" aria-hidden="true" focusable="false">
      {rings.map((_, i) => {
        const rr = ((i + 1) * 36) / n;
        return <path key={i} className={styles.miniArc} data-active={ringIdx === i} d={`M${4 + rr} 40A${rr} ${rr} 0 0 0 4 ${40 - rr}`} />;
      })}
      <circle className={styles.miniPin} cx={4} cy={40} r={3.2} />
    </svg>
  );

  const facts = (
    <div className={styles.swap} key={ringIdx}>
      <div className={styles.head}>
        <p className={cx(styles.time, styles[`time${sizeFor(ring.time)}`])}>{ring.time}</p>
        {mini}
      </div>
      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>{distanceLabel}</dt>
          <dd>{ring.distance}</dd>
        </div>
        <div className={styles.fact}>
          <dt>{feeLabel}</dt>
          <dd>{ring.fee}</dd>
        </div>
      </dl>
    </div>
  );

  const ringHoods = neighbourhoods
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => clampRing(Math.round(h.ring) - 1) === ringIdx);

  const rootStyle = {
    '--px': `${r1((geo.pinX / geo.width) * 100)}%`,
    '--py': `${r1((geo.pinY / geo.height) * 100)}%`,
  } as CSSProperties;

  const clipId = `${uid}-clip`;
  const origin: CSSProperties = { transformOrigin: `${geo.pinX}px ${geo.pinY}px` };
  const hoodLine = hoodShown != null && placed[hoodShown];

  return (
    <div
      ref={rootRef}
      className={cx(styles.root, className)}
      style={rootStyle}
      data-phase={phase}
      role="group"
      aria-label={`Service area around ${centreLabel}`}
    >
      <div className={styles.chart} style={{ blockSize: geo.height }}>
        {ready && (
          <>
            <svg
              className={styles.svg}
              width={geo.width}
              height={geo.height}
              viewBox={`0 0 ${geo.width} ${geo.height}`}
              aria-hidden="true"
              focusable="false"
            >
              <defs>
                <clipPath id={clipId}>
                  <rect x={INSET} y={INSET} width={geo.width - INSET * 2} height={geo.pinY - INSET} />
                </clipPath>
              </defs>

              <g className={styles.fadeIn}>
                <rect className={styles.strip} x={INSET} y={geo.pinY} width={geo.width - INSET * 2} height={geo.height - INSET - geo.pinY} />
              </g>

              <g clipPath={`url(#${clipId})`}>
                {geo.radii.map((_, i) => (
                  <g key={`r${i}`} className={styles.ringIn} style={{ ...origin, '--i': i } as CSSProperties}>
                    <path className={styles.depth} d={art.bands[i]} style={{ fillOpacity: 0.02 + i * 0.018 }} />
                  </g>
                ))}

                {geo.radii.map((_, i) => (
                  <path key={`t${i}`} className={styles.tint} d={art.bands[i]} data-on={ringIdx === i && (introDone || phase === 'static')} />
                ))}

                {geo.radii.map((_, i) => (
                  <g key={`c${i}`} className={styles.contourIn} style={{ ...origin, '--i': i } as CSSProperties}>
                    <path className={styles.contour} d={art.contours[i]} />
                  </g>
                ))}

                <g className={styles.fadeLate}>
                  <path className={styles.bearing} d={art.bearings} />
                  <path className={styles.mark} d={art.marks} />
                </g>

                {geo.radii.map((_, i) => (
                  <g key={`l${i}`} className={styles.ringIn} style={{ ...origin, '--i': i } as CSSProperties}>
                    <path className={styles.ring} d={art.arcs[i]} />
                  </g>
                ))}

                {geo.radii.map((_, i) => (
                  <g key={`k${i}`} className={styles.tickIn} style={{ ...origin, '--i': i } as CSSProperties}>
                    <path className={styles.ticks} d={art.ticks[i]} />
                  </g>
                ))}

                {geo.radii.map((_, i) => (
                  <path key={`e${i}`} className={styles.edge} d={art.arcs[i]} data-on={ringIdx === i && (introDone || phase === 'static')} />
                ))}

                {introDone && (
                  <path
                    key={`rip${ringIdx}`}
                    className={styles.ripple}
                    d={art.arcs[ringIdx]}
                    style={origin}
                  />
                )}

                {introDone && hoodLine && (
                  <g key={`line${hoodShown}`}>
                    <line
                      className={styles.route}
                      x1={geo.pinX}
                      y1={geo.pinY}
                      x2={hoodLine.x}
                      y2={hoodLine.y}
                      pathLength={1}
                    />
                  </g>
                )}
              </g>

              <g className={styles.fadeIn}>
                <line className={styles.baseline} x1={INSET} y1={geo.pinY} x2={geo.width - INSET} y2={geo.pinY} />
                {geo.radii.map((r, i) => (
                  <path key={i} className={styles.crossTick} d={`M${r1(geo.pinX + r)} ${geo.pinY}v9`} />
                ))}
                <path className={styles.neat} d={art.neat} />
                <rect className={styles.neatLine} x={NEAT} y={NEAT} width={geo.width - NEAT * 2} height={geo.height - NEAT * 2} />
                <rect
                  className={styles.neatLine}
                  x={INSET}
                  y={INSET}
                  width={geo.width - INSET * 2}
                  height={geo.height - INSET * 2}
                />
              </g>

              <g className={styles.roseIn} style={origin}>
                <path className={styles.roseHollow} d={art.rose.hollow} />
                <path className={styles.roseSolid} d={art.rose.solid} />
              </g>

              <g className={styles.pinIn} style={origin}>
                <circle className={styles.halo} cx={geo.pinX} cy={geo.pinY} r={geo.compact ? 18 : 22} style={origin} />
                <circle className={styles.pinRing} cx={geo.pinX} cy={geo.pinY} r={geo.compact ? 9.5 : 11} />
                <circle className={styles.pinCore} cx={geo.pinX} cy={geo.pinY} r={geo.compact ? 3 : 3.6} />
              </g>

              <g>
                {geo.radii.map((r, i) => (
                  <path
                    key={i}
                    className={styles.hit}
                    d={art.bands[i]}
                    onPointerEnter={previewRing(i)}
                    onPointerLeave={clearHover}
                    onClick={() => pickRing(i)}
                  />
                ))}
              </g>
            </svg>

            <div className={styles.grain} aria-hidden="true" />

            <div className={styles.layer}>
              <p
                className={styles.centre}
                style={{
                  insetInlineStart: INSET + 16,
                  insetBlockStart: geo.pinY + 20,
                  maxInlineSize: geo.compact
                    ? geo.width - INSET * 2 - 32
                    : Math.max(90, geo.pinX - geo.roseR - 6 - (INSET + 16)),
                }}
              >
                {centreLabel}
              </p>

              {!geo.compact && (
                <div className={styles.measure} aria-hidden="true">
                  {neighbourhoods.map((h, i) => (
                    <span
                      key={i}
                      ref={(el) => {
                        measureRefs.current[i] = el;
                      }}
                      className={styles.hood}
                    >
                      <span className={styles.hoodMark} />
                      <span className={styles.hoodText}>{h.name}</span>
                    </span>
                  ))}
                </div>
              )}

              {(geo.compact || sizesOk) &&
                neighbourhoods.map((h, i) => {
                  const p = placed[i];
                  const active = hoodShown === i;
                  const r = clampRing(Math.round(h.ring) - 1);
                  const delay = 980 + r * 140 + p.order * 70;
                  const dot = geo.compact || p.dotOnly;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={cx(styles.hood, p.side === 'left' && styles.hoodLeft, dot && styles.hoodCompact)}
                      style={
                        {
                          insetInlineStart: p.x,
                          insetBlockStart: p.y,
                          ...(dot ? { maxInlineSize: p.maxW } : {}),
                          '--d': `${delay}ms`,
                        } as CSSProperties
                      }
                      data-active={active}
                      aria-pressed={pinned.hood === i}
                      aria-label={`${h.name}, ${ringSummary(rings[r])}`}
                      onClick={() => pickHood(i)}
                      onPointerEnter={previewHood(i)}
                      onPointerLeave={clearHover}
                      onFocus={() => setHover({ ring: r, hood: i })}
                      onBlur={clearHover}
                    >
                      <span className={styles.hoodMark} aria-hidden="true" />
                      {(!dot || active) && <span className={styles.hoodText}>{h.name}</span>}
                    </button>
                  );
                })}

              {!geo.compact && tabs}
            </div>

            {!geo.compact && (
              <div
                className={styles.cartouche}
                style={{ inlineSize: geo.cardW }}
                aria-live="polite"
                aria-atomic="true"
              >
                {facts}
                <div className={styles.hoodRow} data-open={hoodName !== ''}>
                  <div className={styles.hoodRowInner}>
                    <span className={styles.hoodRowText}>
                      <span className={styles.hoodRowMark} aria-hidden="true" />
                      {hoodName || lastHood.current}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {ready && geo.compact && (
        <div className={styles.card}>
          {tabs}
          <div aria-live="polite" aria-atomic="true">
            {facts}
          </div>
          <ul className={styles.chips} aria-label={ring.distance}>
            {ringHoods.map(({ h, i }) => (
              <li key={i} className={styles.chipItem}>
                <button
                  type="button"
                  className={styles.chip}
                  data-active={hoodShown === i}
                  aria-pressed={pinned.hood === i}
                  onClick={() => pickHood(i)}
                  onPointerEnter={previewHood(i)}
                  onPointerLeave={clearHover}
                >
                  {h.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

```css
.root {
  --sar-font: 'Instrument Sans', 'Avenir Next', 'Segoe UI', 'Helvetica Neue', system-ui, sans-serif;
  --accent: #ff5a1f;
  --sar-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --sar-spring: cubic-bezier(0.34, 1.45, 0.5, 1);
  --sar-play: paused;

  position: relative;
  isolation: isolate;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, #14284b 24%, transparent);
  background: #e1eee7;
  color: #14284b;
  font-family: var(--sar-font);
  font-variant-numeric: tabular-nums;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset, 0 28px 60px -40px rgba(20, 40, 75, 0.55);
}

.root[data-phase='play'] {
  --sar-play: running;
}

.root ::selection {
  background: color-mix(in srgb, var(--accent) 30%, transparent);
}

.root button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ---------- chart ---------- */

.chart {
  position: relative;
  direction: ltr;
  overflow: hidden;
  background:
    radial-gradient(120% 95% at var(--px, 20%) var(--py, 85%), #f2f9f5 0%, #e1eee7 52%, #d3e5dc 100%);
}

.svg {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  display: block;
  overflow: visible;
}

.grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: multiply;
  opacity: 0.42;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .08 0 0 0 0 .16 0 0 0 0 .3 0 0 0 .5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}

.layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* chart ink */

.strip {
  fill: #d4e6dd;
}

.baseline {
  stroke: #14284b;
  stroke-opacity: 0.55;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.crossTick {
  fill: none;
  stroke: #14284b;
  stroke-opacity: 0.7;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.depth {
  fill: #14284b;
}

.contour {
  fill: none;
  stroke: #14284b;
  stroke-opacity: 0.3;
  stroke-width: 0.8;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.ring {
  fill: none;
  stroke: #14284b;
  stroke-opacity: 0.82;
  stroke-width: 1.25;
  vector-effect: non-scaling-stroke;
}

.ticks {
  fill: none;
  stroke: #14284b;
  stroke-opacity: 0.55;
  stroke-width: 0.9;
  vector-effect: non-scaling-stroke;
}

.bearing {
  fill: none;
  stroke: #14284b;
  stroke-opacity: 0.22;
  stroke-width: 0.8;
  stroke-dasharray: 2 5;
  vector-effect: non-scaling-stroke;
}

.mark {
  fill: none;
  stroke: #14284b;
  stroke-opacity: 0.34;
  stroke-width: 0.9;
  vector-effect: non-scaling-stroke;
}

.tint {
  fill: var(--accent);
  opacity: 0;
  pointer-events: none;
  transition: opacity 320ms var(--sar-ease);
}

.tint[data-on='true'] {
  opacity: 0.17;
}

.edge {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2.4;
  opacity: 0;
  pointer-events: none;
  vector-effect: non-scaling-stroke;
  transition: opacity 260ms var(--sar-ease);
}

.edge[data-on='true'] {
  opacity: 1;
}

.ripple {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2;
  pointer-events: none;
  vector-effect: non-scaling-stroke;
  transform-box: view-box;
  animation: sar-ripple 820ms var(--sar-ease) both;
  animation-play-state: var(--sar-play);
}

.route {
  stroke: var(--accent);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-dasharray: 1;
  pointer-events: none;
  vector-effect: non-scaling-stroke;
  animation: sar-route 520ms var(--sar-ease) both;
  animation-play-state: var(--sar-play);
}

.neat {
  fill: #14284b;
  fill-opacity: 0.82;
}

.neatLine {
  fill: none;
  stroke: #14284b;
  stroke-opacity: 0.85;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.roseSolid {
  fill: #14284b;
  stroke: #14284b;
  stroke-width: 0.8;
  stroke-linejoin: round;
}

.roseHollow {
  fill: #f2f9f5;
  stroke: #14284b;
  stroke-width: 0.8;
  stroke-linejoin: round;
}

.halo {
  fill: var(--accent);
  fill-opacity: 0.22;
  transform-box: view-box;
  animation: sar-halo 1500ms var(--sar-ease) 520ms backwards;
  animation-play-state: var(--sar-play);
}

.pinRing {
  fill: var(--accent);
  stroke: #f2f9f5;
  stroke-width: 3;
}

.pinCore {
  fill: #f2f9f5;
}

.hit {
  fill: transparent;
  pointer-events: all;
  cursor: pointer;
}

/* intro choreography: every layer rests in its final state; `data-phase` only
   holds the "from" state until the component scrolls into view */

.ringIn,
.contourIn,
.tickIn,
.roseIn,
.pinIn {
  transform-box: view-box;
}

.ringIn {
  animation: sar-ring 1150ms var(--sar-ease) calc(280ms + var(--i, 0) * 130ms) backwards;
  animation-play-state: var(--sar-play);
}

.contourIn {
  animation: sar-contour 1250ms var(--sar-ease) calc(480ms + var(--i, 0) * 130ms) backwards;
  animation-play-state: var(--sar-play);
}

.tickIn {
  animation: sar-ticks 1300ms var(--sar-ease) calc(560ms + var(--i, 0) * 130ms) backwards;
  animation-play-state: var(--sar-play);
}

.roseIn {
  animation: sar-rose 1000ms var(--sar-ease) 340ms backwards;
  animation-play-state: var(--sar-play);
}

.pinIn {
  animation: sar-pin 760ms var(--sar-spring) 120ms backwards;
  animation-play-state: var(--sar-play);
}

.fadeIn {
  animation: sar-fade 700ms var(--sar-ease) backwards;
  animation-play-state: var(--sar-play);
}

.fadeLate {
  animation: sar-fade 900ms var(--sar-ease) 700ms backwards;
  animation-play-state: var(--sar-play);
}

/* ---------- labels ---------- */

.centre {
  position: absolute;
  margin: 0;
  box-sizing: border-box;
  color: #14284b;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.25;
  letter-spacing: -0.01em;
  overflow-wrap: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  pointer-events: none;
  animation: sar-fade 800ms var(--sar-ease) 600ms backwards;
  animation-play-state: var(--sar-play);
}

.centre::before {
  content: '';
  display: inline-block;
  inline-size: 9px;
  block-size: 9px;
  margin-inline-end: 9px;
  border-radius: 50%;
  background: var(--accent);
  vertical-align: 0.05em;
}

.hood {
  position: absolute;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 6px 12px 6px 9px;
  border: 1px solid rgba(20, 40, 75, 0.2);
  border-radius: 16px;
  background: color-mix(in srgb, #f2f9f5 90%, transparent);
  box-shadow: 0 1px 2px rgba(20, 40, 75, 0.08), 0 8px 18px -12px rgba(20, 40, 75, 0.4);
  color: #14284b;
  font: inherit;
  font-size: 13px;
  font-weight: 560;
  line-height: 1.25;
  text-align: start;
  cursor: pointer;
  pointer-events: auto;
  translate: -14px -50%;
  /* sized by its own text, never by the room left to the right edge */
  inline-size: max-content;
  max-inline-size: 176px;
  transition:
    background-color 200ms var(--sar-ease),
    color 200ms var(--sar-ease),
    border-color 200ms var(--sar-ease),
    box-shadow 200ms var(--sar-ease);
  animation: sar-hood 640ms var(--sar-spring) var(--d, 0ms) backwards;
  animation-play-state: var(--sar-play);
}

.hoodLeft {
  flex-direction: row-reverse;
  padding: 6px 9px 6px 12px;
  translate: calc(-100% + 14px) -50%;
}

.hoodMark {
  flex: none;
  inline-size: 10px;
  block-size: 10px;
  border-radius: 50%;
  background: #14284b;
  box-shadow: 0 0 0 3px color-mix(in srgb, #14284b 14%, transparent);
  transition:
    background-color 200ms var(--sar-ease),
    box-shadow 200ms var(--sar-ease);
}

.hoodText {
  min-inline-size: 0;
  overflow-wrap: break-word;
  text-wrap: balance;
}

/* hidden twin layer: the real label boxes are measured here so layout never guesses text width */
.measure {
  position: absolute;
  inset: 0;
  overflow: hidden;
  visibility: hidden;
  pointer-events: none;
}

.measure .hood {
  inset-inline-start: 0;
  inset-block-start: 0;
  translate: none;
  animation: none;
}

.hood:hover,
.hood[data-active='true'] {
  border-color: #14284b;
  background: #14284b;
  color: #f2f9f5;
}

.hood:hover .hoodMark,
.hood[data-active='true'] .hoodMark {
  background: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent);
}

.hoodCompact {
  padding: 0;
  gap: 8px;
  min-inline-size: 30px;
  min-block-size: 30px;
  justify-content: center;
  border-radius: 15px;
  translate: -15px -50%;
}

.hoodCompact:has(.hoodText) {
  justify-content: flex-start;
  padding: 6px 12px 6px 10px;
}

.hoodCompact.hoodLeft {
  translate: calc(-100% + 15px) -50%;
}

.hoodCompact.hoodLeft:has(.hoodText) {
  justify-content: flex-start;
  padding: 6px 10px 6px 12px;
}

/* ring scale on the legend strip (wide) */

.scale {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.pill {
  position: absolute;
  box-sizing: border-box;
  margin: 0;
  padding: 4px 11px;
  min-block-size: 28px;
  border: 1px solid rgba(20, 40, 75, 0.2);
  border-radius: 14px;
  background: #f2f9f5;
  color: #14284b;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
  text-align: center;
  inline-size: max-content;
  overflow-wrap: break-word;
  cursor: pointer;
  pointer-events: auto;
  translate: calc(-100% + 3px) 0;
  transition:
    background-color 200ms var(--sar-ease),
    color 200ms var(--sar-ease),
    border-color 200ms var(--sar-ease);
  animation: sar-hood 600ms var(--sar-ease) var(--d, 0ms) backwards;
  animation-play-state: var(--sar-play);
}

.pill:hover,
.pill[data-active='true'] {
  border-color: #14284b;
  background: #14284b;
  color: #f2f9f5;
}

/* ---------- cartouche (wide) and card (compact) ---------- */

.cartouche {
  position: absolute;
  inset-inline-start: 34px;
  inset-block-start: 34px;
  box-sizing: border-box;
  padding: 22px 22px 20px;
  border: 1px solid color-mix(in srgb, #14284b 38%, transparent);
  border-radius: 6px;
  background: #f6fbf8;
  box-shadow: 0 1px 2px rgba(20, 40, 75, 0.1), 0 22px 40px -24px rgba(20, 40, 75, 0.5);
  animation: sar-cart 800ms var(--sar-ease) 1100ms backwards;
  animation-play-state: var(--sar-play);
}

.cartouche::after {
  content: '';
  position: absolute;
  inset: 4px;
  border: 1px solid color-mix(in srgb, #14284b 18%, transparent);
  border-radius: 3px;
  pointer-events: none;
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.time {
  margin: 0;
  min-inline-size: 0;
  font-weight: 620;
  line-height: 1.05;
  letter-spacing: -0.035em;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.timeL {
  font-size: 44px;
}

.timeM {
  font-size: 32px;
}

.timeS {
  font-size: 24px;
  letter-spacing: -0.02em;
  line-height: 1.12;
}

.mini {
  flex: none;
  inline-size: 40px;
  block-size: 40px;
  margin-block-start: 4px;
  overflow: visible;
}

.miniArc {
  fill: none;
  stroke: #14284b;
  stroke-opacity: 0.4;
  stroke-width: 1.4;
  stroke-linecap: round;
  transition:
    stroke 260ms var(--sar-ease),
    stroke-opacity 260ms var(--sar-ease),
    stroke-width 260ms var(--sar-ease);
}

.miniArc[data-active='true'] {
  stroke: var(--accent);
  stroke-opacity: 1;
  stroke-width: 3;
}

.miniPin {
  fill: var(--accent);
}

.swap {
  animation: sar-swap 440ms var(--sar-ease) backwards;
  animation-play-state: var(--sar-play);
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 28px;
  margin: 16px 0 0;
  padding: 14px 0 0;
  border-block-start: 1px solid rgba(20, 40, 75, 0.2);
}

.fact {
  min-inline-size: 0;
}

.fact dt {
  margin: 0 0 3px;
  color: rgba(20, 40, 75, 0.68);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
}

.fact dd {
  margin: 0;
  font-size: 19px;
  font-weight: 620;
  line-height: 1.15;
  letter-spacing: -0.015em;
  overflow-wrap: anywhere;
}

.hoodRow {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 320ms var(--sar-ease),
    opacity 240ms var(--sar-ease);
}

.hoodRow[data-open='true'] {
  grid-template-rows: 1fr;
  opacity: 1;
}

.hoodRowInner {
  min-block-size: 0;
  overflow: hidden;
}

.hoodRowText {
  display: flex;
  align-items: center;
  gap: 9px;
  padding-block-start: 14px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.hoodRowMark {
  flex: none;
  inline-size: 9px;
  block-size: 9px;
  border-radius: 50%;
  background: var(--accent);
}

.card {
  box-sizing: border-box;
  padding: 18px 18px 22px;
  border-block-start: 1px solid color-mix(in srgb, #14284b 30%, transparent);
  background: #f6fbf8;
}

.card .facts {
  margin-block-start: 14px;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-block-end: 18px;
}

.tab {
  box-sizing: border-box;
  min-block-size: 36px;
  margin: 0;
  padding: 6px 14px;
  border: 1px solid rgba(20, 40, 75, 0.2);
  border-radius: 18px;
  background: transparent;
  color: #14284b;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  overflow-wrap: anywhere;
  cursor: pointer;
  transition:
    background-color 200ms var(--sar-ease),
    color 200ms var(--sar-ease),
    border-color 200ms var(--sar-ease);
}

.tab[data-active='true'] {
  border-color: #14284b;
  background: #14284b;
  color: #f2f9f5;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
}

.chipItem {
  display: contents;
}

.chip {
  box-sizing: border-box;
  min-block-size: 36px;
  max-inline-size: 100%;
  margin: 0;
  padding: 6px 13px;
  border: 1px solid rgba(20, 40, 75, 0.2);
  border-radius: 18px;
  background: #f2f9f5;
  color: #14284b;
  font: inherit;
  font-size: 14px;
  font-weight: 540;
  line-height: 1.25;
  text-align: start;
  overflow-wrap: anywhere;
  cursor: pointer;
  transition:
    background-color 200ms var(--sar-ease),
    color 200ms var(--sar-ease),
    border-color 200ms var(--sar-ease);
}

.chip[data-active='true'],
.chip:hover {
  border-color: #14284b;
  background: #14284b;
  color: #f2f9f5;
}

.card .time.timeL {
  font-size: clamp(32px, 11cqi, 44px);
}

/* ---------- keyframes ---------- */

@keyframes sar-ring {
  from {
    transform: scale(0.02);
    opacity: 0;
  }
  35% {
    opacity: 1;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes sar-contour {
  from {
    transform: scale(0.6);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes sar-ticks {
  from {
    transform: rotate(-16deg) scale(0.94);
    opacity: 0;
  }
  to {
    transform: rotate(0) scale(1);
    opacity: 1;
  }
}

@keyframes sar-rose {
  from {
    transform: rotate(-70deg) scale(0.4);
    opacity: 0;
  }
  to {
    transform: rotate(0) scale(1);
    opacity: 1;
  }
}

@keyframes sar-pin {
  from {
    transform: scale(2.6);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes sar-halo {
  from {
    transform: scale(0.3);
    opacity: 0.9;
  }
  to {
    transform: scale(2.6);
    opacity: 0;
  }
}

@keyframes sar-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes sar-hood {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.88);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes sar-cart {
  from {
    opacity: 0;
    transform: translateX(-16px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes sar-swap {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes sar-ripple {
  from {
    transform: scale(0.04);
    opacity: 0.7;
  }
  to {
    transform: scale(1);
    opacity: 0;
  }
}

@keyframes sar-route {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* reduced motion: every layer simply rests in its final state */

.root[data-phase='static'] .ripple {
  display: none;
}

.root[data-phase='static'] *,
.root[data-phase='static'] *::before,
.root[data-phase='static'] *::after {
  animation: none !important;
  transition-duration: 0.01ms !important;
}
```
