Create a custom element called "Size Finder Ruler". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: measurement label, unit (cm or in), size heading, size ranges (from, to, size, note). Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export type RulerUnit = 'cm' | 'in';

export interface SizeRange {
  from: number;
  to: number;
  size: string;
  note: string;
}

export interface SizeFinderRulerProps {
  measurementLabel?: string;
  unit?: RulerUnit;
  sizeLabel?: string;
  ranges?: SizeRange[];
}

const DEFAULT_RANGES: SizeRange[] = [
  { from: 21.5, to: 22.1, size: '35', note: 'Our smallest last. Leave a thumb of room beyond your longest toe.' },
  { from: 22.2, to: 22.8, size: '36', note: 'Runs true to size. Pairs well with thin socks and light liners.' },
  { from: 22.9, to: 23.5, size: '37', note: 'True to size. A comfortable fit for narrow and regular feet.' },
  { from: 23.6, to: 24.2, size: '38', note: 'True to size. If your foot is wide, try a 39 for extra room.' },
  { from: 24.3, to: 24.9, size: '39', note: 'True to size. The most popular size for everyday wear.' },
  { from: 25.0, to: 25.6, size: '40', note: 'True to size. Roomy through the toe box, snug at the heel.' },
  { from: 25.7, to: 26.3, size: '41', note: 'True to size. Add a half size up if you wear thick socks.' },
  { from: 26.4, to: 27.0, size: '42', note: 'Runs slightly large. Go down a size if you are between two.' },
  { from: 27.1, to: 27.7, size: '43', note: 'True to size. A relaxed fit with a little room to spare.' },
  { from: 27.8, to: 28.4, size: '44', note: 'Our largest last. Cushioned insoles come as standard.' },
];

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const snap = (n: number) => Math.round(n * 10) / 10;
const labelWidth = (text: string) => text.length * 7.6 + 24;

type Phase = 'static' | 'armed' | 'play' | 'done';

interface Model {
  list: SizeRange[];
  lo: number;
  hi: number;
  min: number;
  max: number;
  ppu: number;
  labelsFit: boolean;
  start: number;
  numerals: number[];
}

function buildModel(input: SizeRange[] | undefined): Model {
  const source = input && input.length > 0 ? input : DEFAULT_RANGES;
  const list = source
    .map((r) => {
      const from = snap(r.from);
      return { ...r, from, to: Math.max(from, snap(r.to)) };
    })
    .sort((a, b) => a.from - b.from);
  const min = list[0].from;
  const max = Math.max(...list.map((r) => r.to));
  const lo = Math.floor(min);
  let hi = Math.ceil(max);
  if (hi <= lo) hi = lo + 1;

  let need = 100;
  for (const r of list) need = Math.max(need, labelWidth(r.size) / (r.to - r.from + 0.1));
  const ppu = Math.min(240, Math.ceil(need / 10) * 10);
  const labelsFit = list.every((r) => labelWidth(r.size) <= (r.to - r.from + 0.1) * ppu);

  const mid = list[Math.floor(list.length / 2)];
  const start = clamp(snap((mid.from + mid.to) / 2), min, max);
  const numerals: number[] = [];
  // numerals run past both ends so the ruler never ends in blank wood
  for (let n = Math.max(0, lo - 24); n <= hi + 24; n += 1) numerals.push(n);
  return { list, lo, hi, min, max, ppu, labelsFit, start, numerals };
}

function pickIndex(list: SizeRange[], value: number) {
  let found = 0;
  for (let i = 0; i < list.length; i += 1) {
    if (list[i].from - 0.05 <= value) found = i;
  }
  return found;
}

function rubber(raw: number, min: number, max: number) {
  const damp = (d: number) => 0.6 * (1 - 1 / (1 + d * 1.5));
  if (raw < min) return min - damp(min - raw);
  if (raw > max) return max + damp(raw - max);
  return raw;
}

export default function SizeFinderRuler({
  measurementLabel = 'Foot length, heel to longest toe',
  unit = 'cm',
  sizeLabel = 'Your size',
  ranges = DEFAULT_RANGES,
}: SizeFinderRulerProps) {
  const model = useMemo(() => buildModel(ranges), [ranges]);
  const { list, lo, min, max, ppu, labelsFit, start, numerals } = model;

  const labelId = useId();
  const rootRef = useRef<HTMLElement | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const needleRef = useRef<HTMLSpanElement | null>(null);

  const xRef = useRef(start);
  const vRef = useRef(0);
  const rafRef = useRef(0);
  const targetRef = useRef<number | null>(null);
  const tenthsRef = useRef(Math.round(start * 10));
  const interactedRef = useRef(false);
  const reducedRef = useRef(false);
  const dragRef = useRef<{
    id: number;
    sx: number;
    sv: number;
    t0: number;
    lt: number;
    v: number;
    moved: boolean;
  } | null>(null);
  const cfg = useRef({ lo, min, max, ppu });
  cfg.current = { lo, min, max, ppu };

  const [tenths, setTenths] = useState(Math.round(start * 10));
  const [phase, setPhase] = useState<Phase>('static');

  const commit = useCallback((x: number) => {
    const c = cfg.current;
    trackRef.current?.style.setProperty('--off', (x - c.lo).toFixed(4));
    const t = Math.round(clamp(x, c.min, c.max) * 10);
    if (t !== tenthsRef.current) {
      tenthsRef.current = t;
      setTenths(t);
    }
  }, []);

  const halt = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const run = useCallback(
    (target: number, v0: number, omega: number, zeta: number) => {
      halt();
      if (reducedRef.current) {
        xRef.current = target;
        vRef.current = 0;
        targetRef.current = null;
        commit(target);
        return;
      }
      vRef.current = v0;
      let last = 0;
      const step = (now: number) => {
        if (!last) last = now;
        const dt = Math.min(0.032, (now - last) / 1000);
        last = now;
        if (dt > 0) {
          const n = Math.max(1, Math.ceil(dt * 240));
          const h = dt / n;
          let x = xRef.current;
          let v = vRef.current;
          for (let i = 0; i < n; i += 1) {
            v += (-2 * zeta * omega * v - omega * omega * (x - target)) * h;
            x += v * h;
          }
          xRef.current = x;
          vRef.current = v;
          commit(x);
          if (Math.abs(x - target) < 0.0004 && Math.abs(v) < 0.01) {
            xRef.current = target;
            vRef.current = 0;
            targetRef.current = null;
            commit(target);
            rafRef.current = 0;
            return;
          }
        }
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [commit, halt],
  );

  /* Reset the position when the size ranges change. */
  useEffect(() => {
    halt();
    xRef.current = start;
    vRef.current = 0;
    commit(start);
  }, [start, lo, commit, halt]);

  /* Reduced-motion tracking, intro choreography armed until the card is on screen. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const mq = window.matchMedia(REDUCED_QUERY);
    reducedRef.current = mq.matches;
    const onMq = () => {
      reducedRef.current = mq.matches;
    };
    mq.addEventListener('change', onMq);

    const timers: number[] = [];
    let io: IntersectionObserver | null = null;
    if (!mq.matches && typeof IntersectionObserver !== 'undefined') {
      const lead = Math.min(2.1, Math.max(0.8, (cfg.current.max - cfg.current.min) / 2));
      xRef.current = clamp(start - lead, cfg.current.min, cfg.current.max);
      commit(xRef.current);
      setPhase('armed');
      io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          io?.disconnect();
          setPhase('play');
          timers.push(
            window.setTimeout(() => {
              if (!interactedRef.current) run(start, 0, 6.4, 0.74);
            }, 220),
          );
          timers.push(window.setTimeout(() => setPhase('done'), 1900));
        },
        { threshold: 0.12 },
      );
      io.observe(root);
    } else {
      setPhase('done');
    }
    return () => {
      mq.removeEventListener('change', onMq);
      io?.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      halt();
    };
  }, [start, commit, halt, run]);

  /* Trackpad / horizontal wheel moves the ruler (vertical wheel keeps scrolling the page). */
  useEffect(() => {
    const el = rulerRef.current;
    if (!el) return undefined;
    let timer = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      interactedRef.current = true;
      halt();
      const c = cfg.current;
      const x = rubber(xRef.current + e.deltaX / c.ppu, c.min, c.max);
      xRef.current = x;
      targetRef.current = null;
      commit(x);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        run(clamp(snap(xRef.current), cfg.current.min, cfg.current.max), 0, 11, 0.9);
      }, 140);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      window.clearTimeout(timer);
    };
  }, [commit, halt, run]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    interactedRef.current = true;
    halt();
    targetRef.current = null;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    const now = performance.now();
    dragRef.current = {
      id: e.pointerId,
      sx: e.clientX,
      sv: xRef.current,
      t0: now,
      lt: now,
      v: 0,
      moved: false,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.sx;
    if (!d.moved && Math.abs(dx) < 4) return;
    d.moved = true;
    const c = cfg.current;
    const x = rubber(d.sv - dx / c.ppu, c.min, c.max);
    const now = performance.now();
    const dtm = now - d.lt;
    if (dtm > 0) d.v = d.v * 0.55 + ((x - xRef.current) / (dtm / 1000)) * 0.45;
    d.lt = now;
    xRef.current = x;
    commit(x);
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    const c = cfg.current;
    const now = performance.now();
    if (!d.moved) {
      if (cancelled || now - d.t0 > 600) return;
      const needle = needleRef.current?.getBoundingClientRect();
      if (!needle) return;
      const delta = e.clientX - (needle.left + needle.width / 2);
      const target = clamp(snap(xRef.current + delta / c.ppu), c.min, c.max);
      targetRef.current = target;
      run(target, 0, 9, 0.9);
      return;
    }
    const v = now - d.lt > 90 ? 0 : clamp(d.v, -30, 30);
    const target = clamp(snap(xRef.current + v * 0.35), c.min, c.max);
    targetRef.current = target;
    run(target, v, 9, 0.86);
  };

  const nudge = (delta: number, absolute?: number) => {
    interactedRef.current = true;
    const c = cfg.current;
    const base = targetRef.current ?? xRef.current;
    const target = clamp(absolute ?? snap(base + delta), c.min, c.max);
    targetRef.current = target;
    run(target, 0, 12, 0.9);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const big = e.shiftKey ? 1 : 0.1;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        nudge(big);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        nudge(-big);
        break;
      case 'PageUp':
        nudge(1);
        break;
      case 'PageDown':
        nudge(-1);
        break;
      case 'Home':
        nudge(0, cfg.current.min);
        break;
      case 'End':
        nudge(0, cfg.current.max);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const value = tenths / 10;
  const index = pickIndex(list, value);
  const active = list[index];
  const valueText = value.toFixed(1);
  const rangeText = `${active.from.toFixed(1)}\u2013${active.to.toFixed(1)} ${unit}`;
  const valueEms = (valueText.length - 1) * 0.5 + 0.25 + 0.42;
  const sizeChars = Math.max(2, active.size.length);

  const trackStyle = {
    '--ppu': `${ppu}px`,
    '--off': start - lo,
    '--span': model.hi - lo,
  } as CSSProperties;

  const armed = phase === 'armed';
  const play = phase === 'play';
  const pick = (base: string, armedCls: string, playCls: string) =>
    armed ? `${base} ${armedCls}` : play ? `${base} ${playCls}` : base;

  return (
    <section
      ref={rootRef}
      className={styles.root}
      aria-labelledby={labelId}
    >
      <div className={styles.card}>
        <div className={pick(styles.slab, styles.hidden, styles.slabIn)}>
          <p id={labelId} className={styles.measure}>
            {measurementLabel}
          </p>
          <p className={styles.readout} style={{ '--ems': valueEms } as CSSProperties}>
            <span className={styles.value}>{valueText}</span>
            <span className={styles.unit}>{unit}</span>
          </p>
        </div>

        <div className={styles.info}>
          <p className={pick(styles.infoLabel, styles.hidden, styles.riseA)}>
            {sizeLabel}
            <span key={`range-${index}`} className={styles.range}>
              {rangeText}
            </span>
          </p>
          <div className={pick(styles.fit, styles.hidden, styles.riseB)}>
            <span key={active.size} className={styles.glyph} style={{ '--chars': sizeChars } as CSSProperties}>
              {active.size}
            </span>
          </div>
          <p key={`note-${index}`} className={pick(styles.note, styles.hidden, styles.riseC)}>
            {active.note}
          </p>
        </div>

        <div
          ref={rulerRef}
          className={pick(styles.ruler, styles.hidden, styles.rulerIn)}
          role="slider"
          tabIndex={0}
          aria-label={measurementLabel}
          aria-roledescription="ruler"
          aria-orientation="horizontal"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={`${valueText} ${unit}. ${sizeLabel} ${active.size}. ${active.note}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endDrag(e, false)}
          onPointerCancel={(e) => endDrag(e, true)}
          onKeyDown={onKeyDown}
        >
          <div ref={trackRef} className={styles.track} style={trackStyle}>
            <div className={styles.scale}>
              <div className={styles.ticks}>
                <div className={styles.tickMinor} />
                <div className={styles.tickMajor} />
              </div>
              {numerals.map((n) => (
                <span key={n} className={styles.numeral} style={{ '--at': n - lo } as CSSProperties}>
                  {n}
                </span>
              ))}
              {list.map((r, i) => (
                <span
                  key={`${r.from}-${i}`}
                  className={i === index ? styles.chipOn : styles.chip}
                  style={{ '--at': r.from - 0.05 - lo, '--w': r.to - r.from + 0.1 } as CSSProperties}
                >
                  {labelsFit ? r.size : ''}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.needleLayer} aria-hidden="true">
          <span ref={needleRef} className={pick(styles.needle, styles.needleHidden, styles.needleDrop)} />
        </div>
      </div>
    </section>
  );
}
```

```css
/* Precision instrument: graphite ground, a pale readout panel, one signal-yellow beam. The size is the hero. */

.root {
  --sfr-font-display: 'Barlow', 'Helvetica Neue', Arial, sans-serif;
  --sfr-font-text: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
  --accent: #f5e02d;
  --sfr-spring: cubic-bezier(0.34, 1.45, 0.5, 1);
  --sfr-ease: cubic-bezier(0.16, 1, 0.3, 1);

  container: sfr / inline-size;
  display: block;
  box-sizing: border-box;
  inline-size: 100%;
  font-family: var(--sfr-font-text);
  color: #f3f4f2;
  -webkit-font-smoothing: antialiased;
}

.root::selection {
  background: var(--accent);
  color: #14171a;
}

.card {
  --needle: 38cqw;
  --ruler-h: 136px;
  --avail: calc(100cqw - var(--needle) - 96px);
  --glyph-max: min(24cqw, 300px);
  --num-avail: calc(var(--needle) - 72px);
  --num-max: 72px;
  --muted: #aeb5b8;

  position: relative;
  display: grid;
  grid-template-columns: var(--needle) minmax(0, 1fr);
  grid-template-rows: minmax(clamp(280px, 30cqw, 380px), auto) var(--ruler-h);
  box-sizing: border-box;
  border-radius: 28px;
  overflow: hidden;
  isolation: isolate;
  background: #14181a;
}

/* ───────── Paper readout (left of the beam): what is being measured ───────── */

.slab {
  grid-column: 1;
  grid-row: 1;
  box-sizing: border-box;
  inline-size: calc(var(--needle) - 2px);
  min-inline-size: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 24px;
  padding: 40px 40px 36px 44px;
  color: #14171a;
  background: #eef0ed;
}

.measure {
  margin: 0;
  max-inline-size: 24ch;
  font: 500 16px/1.4 var(--sfr-font-text);
  color: #4d5357;
  text-wrap: balance;
}

.readout {
  margin: 0;
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  font-family: var(--sfr-font-display);
  font-weight: 600;
  font-size: min(var(--num-max), calc(var(--num-avail) / var(--ems)));
  line-height: 0.9;
  white-space: nowrap;
  color: #14171a;
}

.value {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
}

.unit {
  margin-inline-start: 0.14em;
  font-size: 0.4em;
  color: #4d5357;
}

/* ───────── Size result (right of the beam): the hero ───────── */

.info {
  grid-column: 2;
  grid-row: 1;
  min-inline-size: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 24px;
  padding: 40px 56px 36px 56px;
  color: #f3f4f2;
}

.infoLabel {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 16px;
  font: 500 16px/1.3 var(--sfr-font-text);
  color: var(--muted);
}

.range {
  font-variant-numeric: tabular-nums;
  animation: sfrRise 380ms var(--sfr-ease) 40ms both;
}

.fit {
  min-inline-size: 0;
}

.glyph {
  display: block;
  max-inline-size: 100%;
  font-family: var(--sfr-font-display);
  font-weight: 600;
  font-size: min(var(--glyph-max), calc(var(--avail) / var(--chars) * 1.85));
  line-height: 0.9;
  letter-spacing: -0.02em;
  color: #f3f4f2;
  text-wrap: balance;
  overflow-wrap: normal;
  word-break: normal;
  transform-origin: 0 100%;
  animation: sfrPop 480ms cubic-bezier(0.2, 0.9, 0.3, 1) both;
}

.note {
  margin: 0;
  max-inline-size: 44ch;
  font: 400 16px/1.55 var(--sfr-font-text);
  color: var(--muted);
  text-wrap: pretty;
}

/* ───────── The ruler: one quiet strip on the ink ground ───────── */

.ruler {
  grid-column: 1 / -1;
  grid-row: 2;
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  block-size: var(--ruler-h);
  overflow: hidden;
  direction: ltr;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
  border-block-start: 1px solid rgba(243, 244, 242, 0.14);
}

.ruler:active {
  cursor: grabbing;
}

.ruler:focus-visible::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  border: 2px solid #f3f4f2;
  box-shadow: inset 0 0 0 2px #14181a;
}

.track {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: calc(var(--span) * var(--ppu) + 200cqw);
  transform: translate3d(calc(var(--needle) - 100cqw - var(--off) * var(--ppu)), 0, 0);
  will-change: transform;
}

.scale {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 100cqw;
  inline-size: calc(var(--span) * var(--ppu));
}

.ticks {
  position: absolute;
  inset-block-start: 0;
  /* ticks run the full track length; tile phase stays locked to the scale origin */
  inset-inline-start: calc(-100cqw - 2px);
  inline-size: calc(var(--span) * var(--ppu) + 200cqw + 4px);
  block-size: 28px;
}

.tickMinor,
.tickMajor {
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  background-position-x: 100cqw;
  background-repeat: repeat-x;
}

.tickMinor {
  block-size: 10px;
  background-image: linear-gradient(90deg, transparent 0 1px, rgba(243, 244, 242, 0.32) 1px 2px, transparent 2px);
  background-size: calc(var(--ppu) / 10) 100%;
}

.tickMajor {
  block-size: 24px;
  background-image: linear-gradient(90deg, transparent 0 1px, #f3f4f2 1px 3px, transparent 3px);
  background-size: var(--ppu) 100%;
}

.numeral {
  position: absolute;
  inset-block-start: 36px;
  inset-inline-start: calc(var(--at) * var(--ppu));
  transform: translateX(-50%);
  font: 500 14px/1 var(--sfr-font-text);
  font-variant-numeric: tabular-nums;
  color: var(--muted);
}

.chip,
.chipOn {
  position: absolute;
  inset-block-start: 74px;
  block-size: 40px;
  inset-inline-start: calc(var(--at) * var(--ppu) + 2px);
  inline-size: calc(var(--w) * var(--ppu) - 4px);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font: 600 14px/1 var(--sfr-font-text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--muted);
  box-shadow: inset 0 0 0 1px rgba(243, 244, 242, 0.18);
}

.chipOn {
  color: #14171a;
  background: var(--accent);
  box-shadow: none;
  animation: sfrChip 360ms var(--sfr-ease) both;
}

/* ───────── The signal beam: the only accent ───────── */

.needleLayer {
  position: absolute;
  inset: 0;
  z-index: 3;
  direction: ltr;
  pointer-events: none;
}

.needle {
  position: absolute;
  inset-block: 0;
  inset-inline-start: calc(var(--needle) - 1.5px);
  inline-size: 3px;
  background: var(--accent);
  transform-origin: 50% 0;
}

/* ───────── Intro choreography states ───────── */

.hidden {
  opacity: 0;
}

.needleHidden {
  transform: scaleY(0);
}

.needleDrop {
  animation: sfrDrop 680ms var(--sfr-ease) both;
}

.rulerIn {
  animation: sfrRuler 780ms var(--sfr-ease) 80ms both;
}

.slabIn {
  animation: sfrRise 720ms var(--sfr-ease) 260ms both;
}

.riseA {
  animation: sfrRise 620ms var(--sfr-ease) 420ms both;
}

.riseB {
  animation: sfrRise 640ms var(--sfr-ease) 500ms both;
}

.riseC {
  animation: sfrRise 640ms var(--sfr-ease) 600ms both;
}

@keyframes sfrDrop {
  from {
    transform: scaleY(0);
  }
  to {
    transform: scaleY(1);
  }
}

@keyframes sfrRuler {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes sfrRise {
  from {
    opacity: 0;
    transform: translateY(22px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes sfrPop {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.94);
  }
  60% {
    opacity: 1;
    transform: translateY(-1px) scale(1.01);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes sfrChip {
  from {
    opacity: 0.4;
  }
  to {
    opacity: 1;
  }
}

/* ───────── Narrow containers: one column, beam only through the ruler ───────── */

@container sfr (max-width: 639px) {
  .card {
    --needle: 50cqw;
    --ruler-h: 128px;
    --avail: calc(100cqw - 56px);
    --glyph-max: 34cqw;
    --num-avail: calc(100cqw - 56px);
    --num-max: 56px;

    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto var(--ruler-h);
    border-radius: 24px;
  }

  .slab {
    grid-column: 1;
    grid-row: 1;
    inline-size: auto;
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    padding: 28px;
  }

  .measure {
    max-inline-size: 18ch;
    font-size: 14px;
  }

  .info {
    grid-column: 1;
    grid-row: 2;
    gap: 16px;
    padding: 28px;
  }

  .ruler {
    grid-row: 3;
  }

  .needleLayer {
    inset-block-start: auto;
    block-size: var(--ruler-h);
  }
}

/* ───────── Reduced motion: no momentum (handled in script), no choreography, instant swaps ───────── */

@media (prefers-reduced-motion: reduce) {
  .glyph,
  .range,
  .chipOn,
  .needleDrop,
  .rulerIn,
  .slabIn,
  .riseA,
  .riseB,
  .riseC {
    animation: none;
  }

}
```
