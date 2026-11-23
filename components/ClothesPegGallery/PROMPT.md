Create a custom element called "Clothes Peg Gallery". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: photos (image, caption), breeze strength, string colour. Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface ClothesPegPhoto {
  image: string;
  caption?: string;
  alt?: string;
}

export interface ClothesPegGalleryProps {
  photos?: ClothesPegPhoto[];
  breezeStrength?: number;
  stringColor?: string;
  className?: string;
}

const img = (id: string) => `https://images.unsplash.com/${id}?w=900&h=900&fit=crop&auto=format&q=70`;

export const defaultPhotos: ClothesPegPhoto[] = [
  { image: img('photo-1507525428034-b723cf961d3e'), caption: 'First swim of the summer' },
  { image: img('photo-1414235077428-338989a2e8c0'), caption: 'Long table, late lunch' },
  { image: img('photo-1490750967868-88aa4486c946'), caption: 'Tulips from the market' },
  { image: img('photo-1511632765486-a01980e01a18'), caption: 'The whole crew, finally' },
  { image: img('photo-1504674900247-0877df9cc836'), caption: 'Supper on the terrace' },
  { image: img('photo-1501785888041-af3ef285b470'), caption: 'Lake road at golden hour' },
];

/* geometry + physics constants */
type Pt = { x: number; y: number; px: number; py: number; m: number };
type RowSim = { pts: Pt[]; rest: number[]; y0: number; vh: number };
type Geo = { x: number; y: number; w: number; h: number; row: number; idx: number };
type Layout = { rows: number; geo: Geo[]; sims: RowSim[]; height: number; width: number };
type Swing = { a: number; v: number; curl: number; cv: number };
type Rect = { x: number; y: number; w: number; h: number };
type Pulse = { x: number; dir: number; amp: number; sigma: number; speed: number };

const PAD_TOP = 64;
const GRIP = 14;
const BORDER = 10;
const CAP_H = 36;
const OPEN_CAP_H = 96;
const X_BLEED = 48;
const GRAV = 640;
const SWING_K = 30;
const SWING_C = 2.4;
const CURL_K = 46;
const CURL_C = 7;
const FLIGHT_K = 150;
const FLIGHT_C = 19;
const SIZE_CYCLE = [1.14, 0.85, 1.03, 0.92, 1.1, 0.88];

const HELP =
  'Photos hang on a washing line in the noon sun. Press Enter on a photo to unclip it to a large view; Escape re-hangs it.';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const restTilt = (i: number) => (((i * 37) % 7) - 3) * 0.6;
const massFor = (g: Geo) => 1 + ((g.w * g.h) / 26000) * 3.4;
const minHeight = (width: number, h: number) => Math.max(h, width >= 640 ? 480 : 420);

function cordPath(sim: RowSim): string {
  let d = '';
  for (let k = 0; k < sim.pts.length; k++) {
    const p = sim.pts[k];
    d += `${k ? ' L ' : 'M '}${p.x.toFixed(1)} ${(p.y - sim.y0).toFixed(1)}`;
  }
  return d;
}

/* Verlet rope: settle to rest sag (print weights deepened) at layout time */
function settleRow(width: number, y0: number, anchors: { x: number; m: number }[], sagMax: number, vh: number): RowSim {
  const x0 = -X_BLEED;
  const x1 = width + X_BLEED;
  const n = Math.max(19, anchors.length * 6 + 1);
  const pts: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const u = k / (n - 1);
    const x = x0 + (x1 - x0) * u;
    const y = y0 + sagMax * 4 * u * (1 - u);
    pts.push({ x, y, px: x, py: y, m: 1 });
  }
  for (const a of anchors) {
    const idx = clamp(Math.round(((a.x - x0) / (x1 - x0)) * (n - 1)), 1, n - 2);
    pts[idx].m = a.m;
  }
  const rest: number[] = [];
  for (let k = 0; k < n - 1; k++) {
    rest.push(Math.hypot(pts[k + 1].x - pts[k].x, pts[k + 1].y - pts[k].y));
  }
  const g = GRAV / 3600; /* (1/60)^2 */
  for (let it = 0; it < 240; it++) {
    for (let k = 1; k < n - 1; k++) {
      const p = pts[k];
      const vx = (p.x - p.px) * 0.99;
      const vy = (p.y - p.py) * 0.99;
      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy + g;
    }
    for (let s = 0; s < 2; s++) {
      for (let k = 0; k < n - 1; k++) {
        const a = pts[k];
        const b = pts[k + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d > rest[k] && d > 0) {
          const diff = (d - rest[k]) / d;
          const wa = 1 / a.m;
          const wb = 1 / b.m;
          const tw = wa + wb;
          const ox = (dx * diff) / tw;
          const oy = (dy * diff) / tw;
          a.x += ox * wa;
          a.y += oy * wa;
          b.x -= ox * wb;
          b.y -= oy * wb;
        }
      }
    }
    pts[0].x = x0;
    pts[0].y = y0;
    pts[0].px = x0;
    pts[0].py = y0;
    pts[n - 1].x = x1;
    pts[n - 1].y = y0;
    pts[n - 1].px = x1;
    pts[n - 1].py = y0;
  }
  return { pts, rest, y0, vh };
}

function layoutFor(width: number, count: number): Layout {
  const perRow = clamp(Math.floor(width / 190), 2, 6);
  const rows = Math.max(1, Math.ceil(count / perRow));
  const balanced = Math.ceil(count / rows);
  const slot = (width - 28) / balanced;
  const basePw = clamp(slot * 0.8, 100, 235);
  const sagMax = clamp(width * 0.05, 22, 58);
  const geo: Geo[] = [];
  const rowMaxPh: number[] = [];
  for (let r = 0; r < rows; r++) rowMaxPh.push(0);
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / balanced);
    const inRow = Math.min(balanced, count - row * balanced);
    const j = i - row * balanced;
    const t = ((j + 0.5) / inRow) * 0.84 + 0.08;
    const w = clamp(basePw * SIZE_CYCLE[i % SIZE_CYCLE.length], 92, 248);
    const h = BORDER + (w - 2 * BORDER) * 1.08 + CAP_H;
    rowMaxPh[row] = Math.max(rowMaxPh[row], h);
    geo.push({ x: t * width, y: 0, w, h, row, idx: 0 });
  }
  const y0s: number[] = [];
  for (let r = 0; r < rows; r++) {
    y0s.push(r === 0 ? PAD_TOP : y0s[r - 1] + rowMaxPh[r - 1] + sagMax + 46);
  }
  const sims: RowSim[] = [];
  for (let r = 0; r < rows; r++) {
    const anchors = geo.filter((g) => g.row === r).map((g) => ({ x: g.x, m: massFor(g) }));
    sims.push(settleRow(width, y0s[r], anchors, sagMax, sagMax + 56));
  }
  for (const g of geo) {
    const sim = sims[g.row];
    const span = width + 2 * X_BLEED;
    g.idx = clamp(Math.round(((g.x + X_BLEED) / span) * (sim.pts.length - 1)), 1, sim.pts.length - 2);
    g.y = sim.pts[g.idx].y;
  }
  const height = (y0s[rows - 1] ?? PAD_TOP) + (rowMaxPh[rows - 1] || 200) + sagMax + 58;
  return { rows, geo, sims, height, width };
}

function openRect(width: number, height: number, ph: number): Rect & { frame: number } {
  const wide = width >= 640;
  const aspect = wide ? 1.35 : 0.9;
  const frame = wide ? 36 : 24;
  const maxW = Math.min(width - (wide ? 140 : 24), 780);
  const maxH = Math.max(height - (wide ? 70 : 28), ph * 1.4);
  const iw = Math.min(maxW - frame, (maxH - frame - OPEN_CAP_H) * aspect);
  const w = iw + frame;
  const h = iw / aspect + frame + OPEN_CAP_H;
  return { x: (width - w) / 2, y: Math.max(14, (height - h) / 2), w, h, frame };
}

export default function ClothesPegGallery({
  photos = defaultPhotos,
  breezeStrength = 4,
  stringColor = '#7d93a3',
  className,
}: ClothesPegGalleryProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [width, setWidth] = useState(960);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [active, setActive] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const hangerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const stringRefs = useRef<(SVGPathElement | null)[]>([]);
  const flyRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const swings = useRef<Swing[]>([]);
  const flight = useRef({ p: 0, v: 0, target: 0 });
  const breeze = useRef(breezeStrength);
  const sims = useRef<RowSim[] | null>(null);

  breeze.current = clamp(breezeStrength, 0, 10);
  const L = useMemo(() => layoutFor(width, photos.length), [width, photos.length]);
  const pathD = useMemo(() => L.sims.map(cordPath), [L]);
  const farCord = useMemo(() => {
    const y = Math.max(46, PAD_TOP * 0.55);
    const dip = clamp(width * 0.03, 12, 38);
    return `M -48 ${y} Q ${width / 2} ${(y + dip * 2).toFixed(1)} ${width + 48} ${y}`;
  }, [width]);

  const resetSims = useCallback(() => {
    sims.current = L.sims.map((s) => ({ ...s, pts: s.pts.map((p) => ({ ...p })) }));
  }, [L]);

  useEffect(() => {
    resetSims();
  }, [resetSims]);

  while (swings.current.length < photos.length) {
    const i = swings.current.length;
    swings.current.push({ a: restTilt(i), v: 0, curl: 0.3, cv: 0 });
  }

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
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.02 });
    ro.observe(root);
    io.observe(root);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const paintFlight = useCallback(
    (i: number) => {
      const fly = flyRef.current;
      if (!fly) return;
      const f = flight.current;
      const p = clamp(f.p, 0, 1);
      const g = L.geo[i];
      const anchor = sims.current?.[g.row]?.pts[g.idx];
      const sx = (anchor ? anchor.x : g.x) - g.w / 2;
      const sy = (anchor ? anchor.y : g.y) + GRIP;
      const e = openRect(width, minHeight(width, L.height), g.h);
      const set = (k: string, v: string) => fly.style.setProperty(k, v);
      set('left', `${lerp(sx, e.x, p)}px`);
      set('top', `${lerp(sy, e.y, p)}px`);
      set('width', `${Math.max(40, lerp(g.w, e.w, p))}px`);
      set('height', `${Math.max(40, lerp(g.h, e.h, p))}px`);
      set('--cpg-rot', `${lerp(swings.current[i]?.a ?? 0, 0, p) - Math.sin(p * Math.PI) * 4}deg`);
      set('--cpg-lift', p.toFixed(3));
      set('--cpg-pad', `${lerp(BORDER, e.frame / 2, p)}px`);
      set('--cpg-foot', `${lerp(CAP_H, OPEN_CAP_H, p)}px`);
      scrimRef.current?.style.setProperty('opacity', p.toFixed(3));
    },
    [L, width],
  );

  useEffect(() => {
    if (active === null) return;
    if (reduced) paintFlight(active);
  }, [active, reduced, paintFlight, width]);

  /* the noon breeze: Verlet cord + swing + curl, gusts ripple along the line */
  useEffect(() => {
    if (reduced || !inView) return;
    const live = sims.current;
    if (!live) return;
    let last = performance.now();
    let raf = 0;
    let nextGust = 0.7 + Math.random() * 2.6;
    const pulses: Pulse[] = [];
    const blowing = () => playing && breeze.current > 0;
    const windAt = (x: number, s: number) => {
      const b = playing ? breeze.current : 0;
      const gust = 0.55 + 0.45 * Math.sin(s * 0.21) * Math.sin(s * 0.13 + 1.2);
      const ripple = 0.5 * Math.sin(x * 0.012 - s * 2.5) + 0.3 * Math.sin(x * 0.026 - s * 1.15 + 2.1);
      let f = b * 16 * gust * ripple;
      if (blowing()) {
        for (const pu of pulses) {
          const dx = x - pu.x;
          f += pu.amp * Math.exp(-(dx * dx) / (2 * pu.sigma * pu.sigma)) * pu.dir;
        }
      }
      return f;
    };
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const s = now / 1000;
      const steps = 2;
      const h = dt / steps || 1 / 120;
      const wind = blowing();
      if (wind) {
        nextGust -= dt;
        if (nextGust <= 0 && pulses.length < 3) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          const amp = (26 + Math.random() * 30) * (0.5 + breeze.current / 10);
          pulses.push({
            x: dir > 0 ? -80 : width + 80,
            dir,
            amp,
            sigma: 120 + Math.random() * 60,
            speed: (260 + Math.random() * 160) * dir,
          });
          nextGust = 2.2 + Math.random() * 3.8;
        }
        for (let k = pulses.length - 1; k >= 0; k--) {
          pulses[k].x += pulses[k].speed * dt;
          if (pulses[k].x < -260 || pulses[k].x > width + 260) pulses.splice(k, 1);
        }
      }
      /* cord: verlet + rope constraints (pins at both bleeds) */
      const gStep = GRAV * h * h;
      for (const sim of live) {
        const pts = sim.pts;
        const rest = sim.rest;
        const n = pts.length;
        for (let k = 1; k < n - 1; k++) {
          const p = pts[k];
          const vx = (p.x - p.px) * 0.988;
          const vy = (p.y - p.py) * 0.988;
          p.px = p.x;
          p.py = p.y;
          p.x += vx + windAt(p.x, s) * h * h;
          p.y += vy + gStep;
        }
        for (let it = 0; it < 3; it++) {
          for (let k = 0; k < n - 1; k++) {
            const a = pts[k];
            const b = pts[k + 1];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d = Math.hypot(dx, dy);
            if (d > rest[k] && d > 0) {
              const diff = (d - rest[k]) / d;
              const wa = 1 / a.m;
              const wb = 1 / b.m;
              const tw = wa + wb;
              const ox = (dx * diff) / tw;
              const oy = (dy * diff) / tw;
              a.x += ox * wa;
              a.y += oy * wa;
              b.x -= ox * wb;
              b.y -= oy * wb;
            }
          }
        }
        pts[0].x = -X_BLEED;
        pts[0].y = sim.y0;
        pts[0].px = pts[0].x;
        pts[0].py = pts[0].y;
        pts[n - 1].x = width + X_BLEED;
        pts[n - 1].y = sim.y0;
        pts[n - 1].px = pts[n - 1].x;
        pts[n - 1].py = pts[n - 1].y;
      }
      /* redraw cord strokes */
      for (let r = 0; r < live.length; r++) {
        const d = cordPath(live[r]);
        for (let k = 0; k < 3; k++) stringRefs.current[r * 3 + k]?.setAttribute('d', d);
      }
      /* prints: pendulum + paper curl, forced by cord movement and wind */
      let energy = 0;
      for (let i = 0; i < L.geo.length; i++) {
        const g = L.geo[i];
        const anchor = live[g.row].pts[g.idx];
        const ax = (anchor.x - anchor.px) / h;
        const wf = windAt(anchor.x, s);
        const sw = swings.current[i];
        const curlT = 0.3 + Math.min(9, Math.abs(sw.v) * 1.3 + Math.abs(wf) * 0.012);
        for (let n = 0; n < steps; n++) {
          sw.v += (-SWING_K * (sw.a - restTilt(i) * 0.7) - SWING_C * sw.v + (wf * 0.05 + ax * 1.6)) * h;
          sw.a += sw.v * h;
          sw.cv += (CURL_K * (curlT - sw.curl) - CURL_C * sw.cv) * h;
          sw.curl = clamp(sw.curl + sw.cv * h, 0, 10);
        }
        energy += Math.abs(sw.v) + Math.abs(anchor.x - anchor.px);
        if (active === i) continue;
        const el = hangerRefs.current[i];
        if (el) {
          el.style.setProperty('--cpg-tx', `${(anchor.x - g.x).toFixed(2)}px`);
          el.style.setProperty('--cpg-ty', `${(anchor.y - g.y).toFixed(2)}px`);
          el.style.setProperty('--cpg-swing', `${sw.a.toFixed(2)}deg`);
          el.style.setProperty('--cpg-swingN', sw.a.toFixed(3));
          el.style.setProperty('--cpg-curlN', sw.curl.toFixed(3));
        }
      }
      /* unclipped print: spring flight to the lightbox */
      if (active !== null) {
        const f = flight.current;
        for (let n = 0; n < steps; n++) {
          f.v += (FLIGHT_K * (f.target - f.p) - FLIGHT_C * f.v) * h;
          f.p += f.v * h;
        }
        paintFlight(active);
        energy += Math.abs(f.v) + Math.abs(f.target - f.p);
        if (f.target === 0 && Math.abs(f.p) < 0.005 && Math.abs(f.v) < 0.06) {
          const g = L.geo[active];
          const anchor = live[g.row].pts[g.idx];
          anchor.m = massFor(g); /* the weight returns: cord dips and rebounds */
          anchor.py = anchor.y - 5;
          const sw = swings.current[active];
          if (sw) sw.v += 24;
          setActive(null);
        }
      }
      if (!playing && energy < 0.05 && active === null) return;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced, inView, playing, active, paintFlight, L, width]);

  useEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true });
  }, [open]);

  const unclip = (i: number) => {
    const g = L.geo[i];
    const anchor = sims.current?.[g.row]?.pts[g.idx];
    if (anchor) anchor.m = 1; /* cord loses the weight: it springs up */
    flight.current = { p: 0, v: 0, target: 1 };
    if (reduced) flight.current.p = 1;
    const sw = swings.current[i];
    if (sw) sw.v += 20;
    setActive(i);
    setOpen(true);
  };

  const rehang = () => {
    if (active === null) return;
    flight.current.target = 0;
    setOpen(false);
    triggerRefs.current[active]?.focus({ preventScroll: true });
    if (reduced) {
      flight.current.p = 0;
      const g = L.geo[active];
      const anchor = sims.current?.[g.row]?.pts[g.idx];
      if (anchor) anchor.m = massFor(g);
      setActive(null);
    } else if (!inView) {
      const g = L.geo[active];
      const anchor = sims.current?.[g.row]?.pts[g.idx];
      if (anchor) anchor.m = massFor(g);
      flight.current.p = 0;
      setActive(null);
    }
  };

  const nudge = (i: number) => (e: PointerEvent<HTMLButtonElement>) => {
    if (reduced || e.pointerType !== 'mouse') return;
    const sw = swings.current[i];
    if (sw) sw.v += clamp(e.movementX, -12, 12) * 2.2;
    const g = L.geo[i];
    const anchor = sims.current?.[g.row]?.pts[g.idx];
    if (anchor) anchor.px -= clamp(e.movementX, -10, 10) * 0.35;
  };

  const onDialogKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      rehang();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      closeRef.current?.focus();
    }
  };

  const rootStyle = {
    '--cpg-string': stringColor,
    minBlockSize: `${minHeight(width, L.height)}px`,
  } as CSSProperties;

  const shown = active !== null ? photos[active] : null;
  const dialogLabel = shown ? shown.caption || shown.alt || 'Photo' : '';
  const steelId = `cpg${uid}steel`;
  const wireId = `cpg${uid}wire`;

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
      data-still={reduced || !playing || !inView ? '' : undefined}
    >
      <span className={styles.sun} aria-hidden="true" />
      <span className={styles.cloudA} aria-hidden="true" />
      <span className={styles.cloudB} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />

      <svg className={styles.defs} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={steelId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#7c8b96" />
            <stop offset="0.16" stopColor="#dfe8ee" />
            <stop offset="0.5" stopColor="#f7fafc" />
            <stop offset="0.84" stopColor="#bcc8d1" />
            <stop offset="1" stopColor="#677680" />
          </linearGradient>
          <linearGradient id={wireId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8d9aa5" />
            <stop offset="0.5" stopColor="#f1f6f8" />
            <stop offset="1" stopColor="#8d9aa5" />
          </linearGradient>
        </defs>
      </svg>

      <svg className={styles.farCord} aria-hidden="true" viewBox={`-48 0 ${width + 96} 200`} preserveAspectRatio="none">
        <path className={styles.farBase} d={farCord} vectorEffect="non-scaling-stroke" />
        <path className={styles.farTwist} d={farCord} vectorEffect="non-scaling-stroke" />
      </svg>

      <ul className={styles.line} aria-label="Photo gallery" aria-description={HELP} aria-hidden={open || undefined}>
        {L.sims.map((sim, r) => (
          <li
            key={`s${r}`}
            className={styles.stringRow}
            aria-hidden="true"
            style={{ insetBlockStart: sim.y0, blockSize: sim.vh }}
          >
            <svg
              className={styles.stringSvg}
              viewBox={`-48 0 ${width + 96} ${sim.vh}`}
              preserveAspectRatio="none"
            >
              {[styles.stringShadow, styles.stringBase, styles.stringTwist].map((cls, k) => (
                <path
                  key={cls}
                  ref={(el) => {
                    stringRefs.current[r * 3 + k] = el;
                  }}
                  className={cls}
                  d={pathD[r] ?? cordPath(sim)}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          </li>
        ))}
        {photos.map((p, i) => {
          const g = L.geo[i];
          if (!g) return null;
          const label = p.caption || p.alt || `Photo ${i + 1}`;
          const away = active === i;
          return (
            <li
              key={i}
              className={styles.slot}
              data-away={away ? '' : undefined}
              style={{ insetInlineStart: g.x, insetBlockStart: g.y }}
            >
              <div
                ref={(el) => {
                  hangerRefs.current[i] = el;
                }}
                className={styles.hanger}
                style={
                  {
                    '--cpg-pw': `${g.w}px`,
                    '--cpg-ph': `${g.h}px`,
                    '--cpg-swing': `${restTilt(i)}deg`,
                  } as CSSProperties
                }
              >
                <span className={styles.shadow} aria-hidden="true" />
                <button
                  ref={(el) => {
                    triggerRefs.current[i] = el;
                  }}
                  type="button"
                  className={styles.print}
                  aria-label={label}
                  aria-haspopup="dialog"
                  tabIndex={!away && !open ? 0 : -1}
                  onClick={() => unclip(i)}
                  onPointerMove={nudge(i)}
                >
                  <span className={styles.photoWell}>
                    {p.image ? (
                      <img className={styles.photo} src={p.image} alt="" draggable={false} />
                    ) : (
                      <span className={styles.blank} aria-hidden="true">
                        {label.charAt(0)}
                      </span>
                    )}
                    <span className={styles.bleed} aria-hidden="true" />
                  </span>
                  {p.caption && <span className={styles.caption}>{p.caption}</span>}
                  <span className={styles.gloss} aria-hidden="true" />
                  <span className={styles.paper} aria-hidden="true" />
                </button>
                <svg
                  className={styles.peg}
                  viewBox="0 0 22 58"
                  data-open={away ? '' : undefined}
                  aria-hidden="true"
                  focusable="false"
                >
                  <g className={styles.pegJawL}>
                    <rect x="4.9" y="14.2" width="5.4" height="37" rx="2.7" fill={`url(#${steelId})`} />
                    <rect x="9.4" y="15.8" width="0.9" height="33.6" rx="0.45" fill="rgba(35,55,69,0.38)" />
                    <rect x="5.7" y="15.6" width="0.9" height="34.4" rx="0.45" fill="rgba(255,255,255,0.75)" />
                  </g>
                  <g className={styles.pegJawR}>
                    <rect x="11.7" y="14.2" width="5.4" height="37" rx="2.7" fill={`url(#${steelId})`} />
                    <rect x="11.7" y="15.8" width="0.9" height="33.6" rx="0.45" fill="rgba(35,55,69,0.38)" />
                    <rect x="15.4" y="15.6" width="0.9" height="34.4" rx="0.45" fill="rgba(255,255,255,0.75)" />
                  </g>
                  <g className={styles.pegCoil}>
                    <ellipse cx="11" cy="8.1" rx="6.4" ry="2.7" fill="none" stroke="rgba(35,55,69,0.3)" strokeWidth="1.7" />
                    <ellipse cx="11" cy="7.4" rx="6.4" ry="2.7" fill="none" stroke={`url(#${wireId})`} strokeWidth="1.6" />
                    <ellipse cx="11" cy="11.6" rx="6.4" ry="2.7" fill="none" stroke="rgba(35,55,69,0.3)" strokeWidth="1.7" />
                    <ellipse cx="11" cy="10.9" rx="6.4" ry="2.7" fill="none" stroke={`url(#${wireId})`} strokeWidth="1.6" />
                    <ellipse cx="11" cy="15.1" rx="6.4" ry="2.7" fill="none" stroke="rgba(35,55,69,0.3)" strokeWidth="1.7" />
                    <ellipse cx="11" cy="14.4" rx="6.4" ry="2.7" fill="none" stroke={`url(#${wireId})`} strokeWidth="1.6" />
                  </g>
                  <circle cx="11" cy="17.4" r="1.6" fill="#8d9aa5" />
                </svg>
              </div>
            </li>
          );
        })}
      </ul>

      {!reduced && (
        <button
          type="button"
          className={styles.pause}
          aria-label={playing ? 'Pause the breeze' : 'Resume the breeze'}
          aria-pressed={!playing}
          onClick={() => setPlaying((v) => !v)}
        >
          <svg viewBox="0 0 16 16" className={styles.pauseIcon} aria-hidden="true">
            {playing ? <path d="M4.5 3h2.4v10H4.5zM9.1 3h2.4v10H9.1z" /> : <path d="M5 3l8 5-8 5z" />}
          </svg>
        </button>
      )}

      {shown && (
        <>
          <div
            ref={scrimRef}
            className={styles.scrim}
            onClick={rehang}
            aria-hidden="true"
            style={{ opacity: reduced ? 1 : 0 }}
          />
          <div
            ref={flyRef}
            className={styles.fly}
            role="dialog"
            aria-modal="true"
            aria-label={dialogLabel}
            aria-describedby={`${uid}-cap`}
            onKeyDown={onDialogKey}
            onClick={rehang}
          >
            <span className={styles.flyWell}>
              {shown.image ? (
                <img className={styles.photo} src={shown.image} alt={shown.alt || shown.caption || ''} draggable={false} />
              ) : (
                <span className={styles.blank} aria-hidden="true">
                  {dialogLabel.charAt(0)}
                </span>
              )}
              <span className={styles.bleed} aria-hidden="true" />
            </span>
            <span className={styles.flyFoot}>
              <span id={`${uid}-cap`} className={styles.flyCaption}>
                {shown.caption}
              </span>
              <span className={styles.flyCount} aria-hidden="true">
                {String((active ?? 0) + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
              </span>
            </span>
            <span className={styles.paper} aria-hidden="true" />
            <button ref={closeRef} type="button" className={styles.close} aria-label="Re-hang photo" onClick={rehang}>
              <svg viewBox="0 0 16 16" className={styles.closeIcon} aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

```css
/* Bright noon line — Verlet cord, spring-steel pegs, backlit prints */

@font-face {
  font-family: 'Caveat';
  src: url('./fonts/caveat.woff2') format('woff2');
  font-weight: 560;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Familjen Grotesk';
  src: url('./fonts/familjen.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

.root {
  --cpg-string: #7d93a3;
  --cpg-sky-top: #b7d9ec;
  --cpg-sky-mid: #dcebf1;
  --cpg-sky-low: #fdfcf5;
  --cpg-sun: #ffe9a8;
  --cpg-paper: #fefdf8;
  --cpg-paper-shade: #ece6d6;
  --cpg-ink: #233745;
  --cpg-muted: rgba(35, 55, 69, 0.66);
  --cpg-steel-hi: #f4f8fa;
  --cpg-steel: #aab7c1;
  --cpg-steel-lo: #64737e;
  --cpg-font-caption: 'Caveat', 'Segoe Print', 'Bradley Hand', cursive;
  --cpg-font-ui: 'Familjen Grotesk', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --cpg-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  container-type: inline-size;
  overflow: clip;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 28px;
  background:
    radial-gradient(46% 36% at 86% -8%, #ffffff 0%, #fffcf0 26%, rgba(255, 244, 200, 0) 66%),
    linear-gradient(180deg, var(--cpg-sky-top) 0%, var(--cpg-sky-mid) 34%, #eff0e9 62%, var(--cpg-sky-low) 100%);
  color: var(--cpg-ink);
  font-family: var(--cpg-font-ui);
}

.root::selection {
  background: color-mix(in srgb, var(--cpg-sky-top) 55%, #fff);
  color: var(--cpg-ink);
}

.sun,
.cloudA,
.cloudB,
.grain {
  position: absolute;
  pointer-events: none;
  z-index: -1;
}

.sun {
  inset-block-start: -230px;
  inset-inline-end: -150px;
  inline-size: 580px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(closest-side, #fff 0%, #fffdf2 16%, color-mix(in srgb, var(--cpg-sun) 50%, transparent) 40%, transparent 72%);
}

.cloudA,
.cloudB {
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0));
  filter: blur(13px);
  animation: cloud 80s ease-in-out infinite alternate;
}

.cloudA {
  inset-block-start: 6%;
  inset-inline-start: 5%;
  inline-size: 34%;
  block-size: 72px;
}

.cloudB {
  inset-block-end: 11%;
  inset-inline-start: 54%;
  inline-size: 30%;
  block-size: 62px;
  opacity: 0.65;
  animation-duration: 110s;
  animation-delay: -40s;
}

.root[data-still] .cloudA,
.root[data-still] .cloudB {
  animation-play-state: paused;
}

@keyframes cloud {
  from {
    transform: translate3d(-4%, 0, 0);
  }
  to {
    transform: translate3d(10%, 4px, 0);
  }
}

.grain {
  inset: 0;
  background-image: var(--cpg-noise);
  opacity: 0.14;
  mix-blend-mode: overlay;
}

.defs {
  position: absolute;
  inline-size: 0;
  block-size: 0;
  overflow: hidden;
}

.farCord {
  position: absolute;
  inset-inline: -48px;
  block-size: 200px;
  z-index: -1;
  pointer-events: none;
  opacity: 0.5;
  filter: blur(0.4px);
}

.farBase {
  fill: none;
  stroke: #c3d2da;
  stroke-width: 2px;
}

.farTwist {
  fill: none;
  stroke: rgba(255, 255, 255, 0.55);
  stroke-width: 0.8px;
  stroke-dasharray: 2 4;
}

.line {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.stringRow {
  position: absolute;
  inset-inline: 0;
  pointer-events: none;
}

.stringSvg {
  display: block;
  inline-size: calc(100% + 96px);
  block-size: 100%;
  margin-inline-start: -48px;
  overflow: visible;
}

.stringShadow,
.stringBase,
.stringTwist {
  fill: none;
  stroke-linecap: round;
}

.stringShadow {
  stroke: rgba(35, 55, 69, 0.13);
  stroke-width: 4px;
  transform: translateY(4px);
  filter: blur(2px);
}

.stringBase {
  stroke: var(--cpg-string);
  stroke-width: 2.8px;
}

.stringTwist {
  stroke: color-mix(in srgb, var(--cpg-string) 38%, #fff);
  stroke-width: 1.1px;
  stroke-dasharray: 2 3.4;
  opacity: 0.9;
}

.slot {
  position: absolute;
  inline-size: 0;
  block-size: 0;
}

.hanger {
  position: absolute;
  inset: 0;
  transform-origin: 0 0;
  transform: translate3d(var(--cpg-tx, 0px), var(--cpg-ty, 0px), 0) rotate(var(--cpg-swing, 0deg));
  will-change: transform;
}

.shadow {
  position: absolute;
  inset-inline-start: calc(var(--cpg-pw) / -2 + 6px);
  inset-block-start: calc(var(--cpg-ph) + 18px);
  inline-size: calc(var(--cpg-pw) - 12px);
  block-size: 18px;
  border-radius: 50%;
  background: rgba(35, 55, 69, 0.22);
  filter: blur(4px);
  pointer-events: none;
  transform: translate3d(calc(var(--cpg-swingN, 0) * -22px), 0, 0) scaleX(calc(1 - var(--cpg-curlN, 0.3) * 0.03));
  transition: opacity 280ms ease;
}

.slot[data-away] .shadow {
  opacity: 0;
}

.print {
  position: absolute;
  inset-block-start: 14px;
  inset-inline-start: calc(var(--cpg-pw) / -2);
  box-sizing: border-box;
  display: grid;
  grid-template-rows: 1fr 36px;
  inline-size: var(--cpg-pw);
  block-size: var(--cpg-ph);
  margin: 0;
  padding: 10px 10px 0;
  border: 0;
  border-radius: 2px;
  background: linear-gradient(178deg, #ffffff 0%, var(--cpg-paper) 55%, color-mix(in srgb, var(--cpg-paper) 90%, var(--cpg-paper-shade)) 100%);
  color: var(--cpg-ink);
  font: inherit;
  text-align: center;
  cursor: zoom-in;
  transform: perspective(760px) rotateX(calc(var(--cpg-curlN, 0.3) * -1deg));
  transform-origin: 50% 2px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.95) inset,
    0 0 0 1px rgba(35, 55, 69, 0.05),
    0 0 20px -4px rgba(255, 250, 226, 0.6);
  transition: box-shadow 240ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 160ms ease;
  -webkit-tap-highlight-color: transparent;
  will-change: transform;
}

.print:hover {
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.95) inset,
    0 0 0 1px rgba(35, 55, 69, 0.07),
    0 0 26px -2px rgba(255, 249, 220, 0.75);
}

.print:focus-visible {
  outline: 3px solid var(--cpg-ink);
  outline-offset: 4px;
}

.slot[data-away] .print {
  opacity: 0;
  pointer-events: none;
}

.photoWell,
.flyWell {
  position: relative;
  overflow: hidden;
  min-block-size: 0;
  border-radius: 1px;
  background: color-mix(in srgb, var(--cpg-sky-top) 30%, var(--cpg-paper));
  box-shadow:
    inset 0 0 0 1px rgba(35, 55, 69, 0.07),
    inset 0 0 16px rgba(255, 246, 214, 0.28);
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  user-select: none;
  filter: saturate(1.05) contrast(0.98) brightness(1.03);
}

.blank {
  display: grid;
  place-items: center;
  block-size: 100%;
  font-family: var(--cpg-font-caption);
  font-weight: 560;
  font-size: 42px;
  color: color-mix(in srgb, var(--cpg-ink) 42%, transparent);
}

.bleed {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 95% at 50% 120%, rgba(255, 248, 220, 0.5), transparent 55%);
  mix-blend-mode: soft-light;
  pointer-events: none;
}

.caption {
  align-self: center;
  overflow: hidden;
  padding-inline: 4px;
  font-family: var(--cpg-font-caption);
  font-weight: 560;
  font-size: clamp(14px, calc(var(--cpg-pw) * 0.098), 19px);
  line-height: 1.1;
  color: var(--cpg-ink);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.paper {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image: var(--cpg-noise);
  opacity: 0.1;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.gloss {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0) 24%, rgba(35, 55, 69, 0) 72%, rgba(35, 55, 69, 0.16) 100%);
  mix-blend-mode: soft-light;
  opacity: calc(0.5 + var(--cpg-curlN, 0.3) * 0.05);
  pointer-events: none;
}

/* spring-steel peg */

.peg {
  position: absolute;
  inset-block-start: -22px;
  inset-inline-start: -11px;
  inline-size: 22px;
  block-size: 58px;
  overflow: visible;
  filter: drop-shadow(0 2px 2px rgba(35, 55, 69, 0.35));
  pointer-events: none;
  z-index: 2;
}

.pegJawL,
.pegJawR,
.pegCoil {
  transform-box: view-box;
  transition: transform 300ms cubic-bezier(0.3, 1.9, 0.45, 0.85);
}

.pegJawL,
.pegJawR {
  transform-origin: 11px 17.4px;
}

.pegCoil {
  transform-origin: 11px 10px;
}

.peg[data-open] .pegJawL {
  transform: rotate(-13deg);
}

.peg[data-open] .pegJawR {
  transform: rotate(13deg);
}

.peg[data-open] .pegCoil {
  transform: translateY(1px) scaleY(0.9);
}

/* controls */

.pause {
  position: absolute;
  inset-block-end: 14px;
  inset-inline-end: 14px;
  z-index: 2;
  display: grid;
  place-items: center;
  inline-size: 36px;
  block-size: 36px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--cpg-ink) 14%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, #fff 82%, transparent);
  color: var(--cpg-ink);
  cursor: pointer;
  opacity: 0.7;
  box-shadow: 0 1px 2px rgba(35, 55, 69, 0.08);
  transition: opacity 180ms ease, background-color 180ms ease;
}

.pause::before {
  content: '';
  position: absolute;
  inset: -4px;
}

.pause:hover,
.pause:focus-visible {
  opacity: 1;
  background: #fff;
}

.pause:focus-visible {
  outline: 2px solid var(--cpg-ink);
  outline-offset: 2px;
}

.pauseIcon {
  inline-size: 12px;
  block-size: 12px;
  fill: currentColor;
}

/* lightbox flight */

.scrim {
  position: absolute;
  inset: 0;
  z-index: 3;
  background: linear-gradient(180deg, rgba(214, 231, 242, 0.74), rgba(232, 238, 240, 0.62));
  -webkit-backdrop-filter: blur(9px) saturate(1.15);
  backdrop-filter: blur(9px) saturate(1.15);
  cursor: zoom-out;
}

.fly {
  --cpg-rot: 0deg;
  --cpg-lift: 1;
  --cpg-pad: 18px;
  --cpg-foot: 96px;

  position: absolute;
  z-index: 4;
  box-sizing: border-box;
  display: grid;
  grid-template-rows: 1fr var(--cpg-foot);
  padding: var(--cpg-pad) var(--cpg-pad) 0;
  border-radius: 3px;
  background: linear-gradient(178deg, #ffffff 0%, var(--cpg-paper) 60%, color-mix(in srgb, var(--cpg-paper) 92%, var(--cpg-paper-shade)) 100%);
  color: var(--cpg-ink);
  cursor: zoom-out;
  transform: rotate(var(--cpg-rot));
  will-change: left, top, width, height, transform;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.95) inset,
    0 0 0 1px rgba(35, 55, 69, 0.05),
    0 0 calc(16px + var(--cpg-lift) * 26px) rgb(255 249 220 / calc(var(--cpg-lift) * 0.5)),
    0 calc(10px + var(--cpg-lift) * 18px) calc(20px + var(--cpg-lift) * 30px) rgba(35, 55, 69, calc(0.14 + var(--cpg-lift) * 0.1));
}

.fly .photo {
  filter: saturate(1.05) contrast(0.98) brightness(calc(1.03 + var(--cpg-lift) * 0.08));
}

.fly:focus-visible {
  outline: none;
}

.flyFoot {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  min-inline-size: 0;
  padding-inline: 2px;
  overflow: hidden;
  opacity: clamp(0, calc((var(--cpg-lift) - 0.55) * 2.2), 1);
}

.flyCaption {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  min-inline-size: 0;
  padding-block-end: 4px;
  font-family: var(--cpg-font-caption);
  font-weight: 560;
  font-size: clamp(22px, 2.9cqi, 30px);
  line-height: 1.08;
  text-align: start;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.flyCount {
  flex: none;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.14em;
  color: var(--cpg-muted);
  font-variant-numeric: tabular-nums;
}

.close {
  position: absolute;
  inset-block-start: 10px;
  inset-inline-end: 10px;
  display: grid;
  place-items: center;
  inline-size: 36px;
  block-size: 36px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--cpg-ink) 10%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, #fff 88%, transparent);
  color: var(--cpg-ink);
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(35, 55, 69, 0.12);
  opacity: clamp(0, calc((var(--cpg-lift) - 0.7) * 3.4), 1);
  transition: background-color 160ms ease;
}

.close::before {
  content: '';
  position: absolute;
  inset: -4px;
}

.close:hover {
  background: #fff;
}

.close:focus-visible {
  outline: 2px solid var(--cpg-ink);
  outline-offset: 3px;
}

.closeIcon {
  inline-size: 14px;
  block-size: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

@media (prefers-reduced-motion: reduce) {
  .cloudA,
  .cloudB {
    animation: none;
  }

  .pegJawL,
  .pegJawR,
  .pegCoil {
    transition: none;
  }
}
```
