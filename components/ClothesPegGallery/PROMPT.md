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
const BORDER = 8;
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
  'Photos hang from a line. Press Enter on a photo to unclip it to a large view; Escape re-hangs it.';

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
  const sagMax = clamp(width * 0.022, 10, 26);
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
  stringColor = '#6f6a62',
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
  const shadowRefs = useRef<(HTMLSpanElement | null)[]>([]);
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
        for (let k = 0; k < 2; k++) stringRefs.current[r * 2 + k]?.setAttribute('d', d);
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
          shadowRefs.current[i]?.style.setProperty('--cpg-sh', Math.min(1, Math.abs(sw.a) / 14).toFixed(3));
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

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
      data-still={reduced || !playing || !inView ? '' : undefined}
    >
      <svg className={styles.defs} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={steelId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#4a4f56" />
            <stop offset="0.45" stopColor="#8b9199" />
            <stop offset="1" stopColor="#3a3e44" />
          </linearGradient>
        </defs>
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
              {[styles.stringShadow, styles.stringBase].map((cls, k) => (
                <path
                  key={cls}
                  ref={(el) => {
                    stringRefs.current[r * 2 + k] = el;
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
              <span
                ref={(el) => {
                  shadowRefs.current[i] = el;
                }}
                className={styles.shadow}
                aria-hidden="true"
                style={{ '--cpg-pw': `${g.w}px`, '--cpg-ph': `${g.h}px` } as CSSProperties}
              />
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
                  </span>
                  {p.caption && <span className={styles.caption}>{p.caption}</span>}
                </button>
                <svg
                  className={styles.peg}
                  viewBox="0 0 22 58"
                  data-open={away ? '' : undefined}
                  aria-hidden="true"
                  focusable="false"
                >
                  <g className={styles.pegJawL}>
                    <rect x="7.3" y="14" width="3.5" height="33" rx="1.75" fill={`url(#${steelId})`} />
                  </g>
                  <g className={styles.pegJawR}>
                    <rect x="11.2" y="14" width="3.5" height="33" rx="1.75" fill={`url(#${steelId})`} />
                  </g>
                  <g className={styles.pegCoil}>
                    <circle cx="11" cy="10.5" r="3.1" fill="none" stroke="#4a4f56" strokeWidth="1.1" />
                  </g>
                  <circle cx="11" cy="14.6" r="1.3" fill="#2f3338" />
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
            </span>
            <span className={styles.flyFoot}>
              <span id={`${uid}-cap`} className={styles.flyCaption}>
                {shown.caption}
              </span>
              <span className={styles.flyCount} aria-hidden="true">
                {String((active ?? 0) + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
              </span>
            </span>
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
/* Editorial gallery line: taut cord, slim metal pegs, clean prints */

@font-face {
  font-family: 'Familjen Grotesk';
  src: url('./fonts/familjen.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

.root {
  --cpg-string: #6f6a62;
  --cpg-stage-top: #f1f0ec;
  --cpg-stage-low: #e5e3dd;
  --cpg-paper: #ffffff;
  --cpg-ink: #25282d;
  --cpg-muted: rgba(37, 40, 45, 0.64);
  --cpg-shadow: 28, 26, 22;
  --cpg-font-ui: 'Familjen Grotesk', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;

  position: relative;
  isolation: isolate;
  container-type: inline-size;
  overflow: clip;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 20px;
  background:
    radial-gradient(70% 50% at 50% -10%, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0) 70%),
    linear-gradient(180deg, var(--cpg-stage-top) 0%, var(--cpg-stage-low) 100%);
  box-shadow: inset 0 0 0 1px rgba(var(--cpg-shadow), 0.06);
  color: var(--cpg-ink);
  font-family: var(--cpg-font-ui);
}

.root::selection {
  background: rgba(var(--cpg-shadow), 0.14);
  color: var(--cpg-ink);
}

.defs {
  position: absolute;
  inline-size: 0;
  block-size: 0;
  overflow: hidden;
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
.stringBase {
  fill: none;
  stroke-linecap: round;
}

.stringShadow {
  stroke: rgba(var(--cpg-shadow), 0.12);
  stroke-width: 1.5px;
  transform: translateY(4px);
  filter: blur(2.5px);
}

.stringBase {
  stroke: var(--cpg-string);
  stroke-width: 1.25px;
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
  inset-inline-start: calc(var(--cpg-pw) / -2 + 10px);
  inset-block-start: calc(var(--cpg-ph) + 30px);
  inline-size: calc(var(--cpg-pw) - 20px);
  block-size: 10px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(var(--cpg-shadow), 0.16), rgba(var(--cpg-shadow), 0));
  pointer-events: none;
  opacity: calc(1 - var(--cpg-sh, 0) * 0.3);
  transform: scaleX(calc(1 - var(--cpg-sh, 0) * 0.12));
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
  padding: 8px 8px 0;
  border: 0;
  border-radius: 2px;
  background: var(--cpg-paper);
  color: var(--cpg-ink);
  font: inherit;
  text-align: start;
  cursor: zoom-in;
  transform: perspective(760px) rotateX(calc(var(--cpg-curlN, 0.3) * -1deg));
  transform-origin: 50% 2px;
  box-shadow:
    0 0 0 1px rgba(var(--cpg-shadow), 0.08),
    0 1px 2px rgba(var(--cpg-shadow), 0.08),
    0 10px 20px -12px rgba(var(--cpg-shadow), 0.24);
  transition: box-shadow 240ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 160ms ease;
  -webkit-tap-highlight-color: transparent;
  will-change: transform;
}

.print:hover {
  box-shadow:
    0 0 0 1px rgba(var(--cpg-shadow), 0.1),
    0 1px 2px rgba(var(--cpg-shadow), 0.1),
    0 14px 24px -12px rgba(var(--cpg-shadow), 0.3);
}

.print:focus-visible {
  outline: 2px solid var(--cpg-ink);
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
  background: color-mix(in srgb, var(--cpg-ink) 8%, var(--cpg-paper));
  box-shadow: inset 0 0 0 1px rgba(var(--cpg-shadow), 0.07);
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  user-select: none;
}

.blank {
  display: grid;
  place-items: center;
  block-size: 100%;
  font-family: var(--cpg-font-ui);
  font-weight: 500;
  font-size: 36px;
  color: color-mix(in srgb, var(--cpg-ink) 36%, transparent);
}

.caption {
  align-self: center;
  overflow: hidden;
  padding-inline: 2px;
  font-family: var(--cpg-font-ui);
  font-weight: 500;
  font-size: 12px;
  letter-spacing: 0.02em;
  line-height: 1.2;
  color: var(--cpg-ink);
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* slim metal peg */

.peg {
  position: absolute;
  inset-block-start: -22px;
  inset-inline-start: -11px;
  inline-size: 22px;
  block-size: 58px;
  overflow: visible;
  filter: drop-shadow(0 1px 1px rgba(var(--cpg-shadow), 0.22));
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
  box-shadow: 0 1px 2px rgba(var(--cpg-shadow), 0.08);
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
  background: rgba(236, 234, 229, 0.78);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
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
  background: var(--cpg-paper);
  color: var(--cpg-ink);
  cursor: zoom-out;
  transform: rotate(var(--cpg-rot));
  will-change: left, top, width, height, transform;
  box-shadow:
    0 0 0 1px rgba(var(--cpg-shadow), 0.08),
    0 1px 2px rgba(var(--cpg-shadow), 0.1),
    0 calc(8px + var(--cpg-lift) * 22px) calc(16px + var(--cpg-lift) * 34px) calc(var(--cpg-lift) * -10px) rgba(var(--cpg-shadow), calc(0.16 + var(--cpg-lift) * 0.12));
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
  font-family: var(--cpg-font-ui);
  font-weight: 500;
  font-size: clamp(17px, 2.1cqi, 22px);
  letter-spacing: -0.005em;
  line-height: 1.25;
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
  box-shadow: 0 1px 3px rgba(var(--cpg-shadow), 0.12);
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
  .pegJawL,
  .pegJawR,
  .pegCoil {
    transition: none;
  }
}
```
