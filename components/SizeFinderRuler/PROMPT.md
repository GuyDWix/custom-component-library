Create a custom element called "Size Finder Ruler". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: measurement label, unit (cm or in), size heading, size ranges (from, to, size, note), accent color. Add other settings if they help.

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
  accentColor?: string;
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
  accentColor = '#f5e02d',
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

  const rootStyle = { '--sfr-accent': accentColor } as CSSProperties;
  const trackStyle = {
    '--ppu': `${ppu}px`,
    '--off': start - lo,
    '--span': model.hi - lo,
  } as CSSProperties;
  const washStyle = {
    '--at': active.from - 0.05 - lo,
    '--w': active.to - active.from + 0.1,
  } as CSSProperties;

  const armed = phase === 'armed';
  const play = phase === 'play';
  const pick = (base: string, armedCls: string, playCls: string) =>
    armed ? `${base} ${armedCls}` : play ? `${base} ${playCls}` : base;

  return (
    <section
      ref={rootRef}
      className={styles.root}
      style={rootStyle}
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
          <div className={styles.infoTop}>
            <p className={pick(styles.infoLabel, styles.hidden, styles.riseA)}>{sizeLabel}</p>
            <div className={pick(styles.fit, styles.hidden, styles.riseB)}>
              <span key={active.size} className={styles.glyph} style={{ '--chars': sizeChars } as CSSProperties}>
                {active.size}
              </span>
              <span key={`bar-${active.size}`} className={styles.bar} />
            </div>
          </div>
          <div className={pick(styles.detail, styles.hidden, styles.riseC)}>
            <p key={`range-${index}`} className={styles.range}>
              {rangeText}
            </p>
            <p key={`note-${index}`} className={styles.note}>
              {active.note}
            </p>
          </div>
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
              <div className={styles.wash} style={washStyle} />
              <div className={styles.ticks}>
                <div className={styles.tickMinor} />
                <div className={styles.tickMid} />
                <div className={styles.tickMajor} />
              </div>
              {numerals.map((n) => (
                <span key={n} className={styles.numeral} style={{ '--at': n - lo } as CSSProperties}>
                  {n}
                </span>
              ))}
              <div className={styles.rail} />
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
          <span className={pick(styles.needleFoot, styles.needleHidden, styles.needleDrop)} />
        </div>
      </div>
    </section>
  );
}
```

```css
/* Precision instrument: graphite ground, a matte anodised pale ruler with fine etched ticks, one signal-yellow
   indicator, and a clean pale readout panel. Sans type only. */

@font-face {
  font-family: 'SFR Barlow Condensed';
  src: url('./fonts/barlow-condensed-600.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'SFR Plex Sans';
  src: url('./fonts/ibm-plex-sans-var.woff2') format('woff2');
  font-weight: 100 700;
  font-style: normal;
  font-display: swap;
}

.root {
  --sfr-font-display: 'SFR Barlow Condensed', 'Helvetica Neue', Arial, sans-serif;
  --sfr-font-text: 'SFR Plex Sans', 'Helvetica Neue', Arial, sans-serif;
  --sfr-ground: #14181a;
  --sfr-paper: #f3f4f2;
  --sfr-paper-soft: rgba(243, 244, 242, 0.7);
  --sfr-sheet: #eef0ed;
  --sfr-sheet-ink: #14171a;
  --sfr-sheet-muted: #4d5357;
  --sfr-ink: #14171a;
  --sfr-alu-hi: #f2f3f1;
  --sfr-alu: #e6e8e6;
  --sfr-alu-lo: #d3d7d6;
  --sfr-accent: #f5e02d;
  --sfr-spring: cubic-bezier(0.34, 1.45, 0.5, 1);
  --sfr-ease: cubic-bezier(0.16, 1, 0.3, 1);

  container: sfr / inline-size;
  display: block;
  box-sizing: border-box;
  inline-size: 100%;
  font-family: var(--sfr-font-text);
  color: var(--sfr-paper);
  -webkit-font-smoothing: antialiased;
}

.root::selection {
  background: var(--sfr-accent);
  color: var(--sfr-ink);
}

.card {
  --needle: 38cqw;
  --ruler-h: 184px;
  /* the needle breaks around the size-chip row so it never cuts through the selected label */
  --gap-top: 90px;
  --gap-foot: 38px;
  --avail: calc(100cqw - var(--needle) - 92px);
  --glyph-max: min(21cqw, 260px);
  --num-avail: calc(var(--needle) - 66px);
  --num-max: min(26cqw, 300px);

  position: relative;
  display: grid;
  grid-template-columns: var(--needle) minmax(0, 1fr);
  grid-template-rows: minmax(clamp(300px, 33cqw, 420px), auto) var(--ruler-h);
  box-sizing: border-box;
  padding-block-end: 24px;
  border-radius: 28px;
  overflow: hidden;
  isolation: isolate;
  background:
    radial-gradient(110% 80% at 80% 0%, rgba(190, 215, 225, 0.07), transparent 62%),
    var(--sfr-ground);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.07) inset;
}

/* ───────── Paper readout (left of the needle) ───────── */

.slab {
  grid-column: 1;
  grid-row: 1;
  position: relative;
  box-sizing: border-box;
  inline-size: calc(var(--needle) - 2px);
  min-inline-size: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 24px;
  padding: 32px 32px 30px 36px;
  color: var(--sfr-sheet-ink);
  background: linear-gradient(180deg, #f4f5f3 0%, var(--sfr-sheet) 100%);
  box-shadow:
    inset -1px 0 0 rgba(20, 23, 26, 0.1),
    10px 0 30px -14px rgba(0, 0, 0, 0.5);
}

.measure {
  margin: 0;
  max-inline-size: 24ch;
  font: 500 16px/1.4 var(--sfr-font-text);
  color: var(--sfr-sheet-muted);
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
  line-height: 0.8;
  letter-spacing: -0.01em;
  white-space: nowrap;
  color: var(--sfr-sheet-ink);
}

.value {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
}

.unit {
  margin-inline-start: 0.12em;
  font-size: 0.3em;
  letter-spacing: 0.01em;
  color: var(--sfr-sheet-muted);
}

/* ───────── Size result (right of the needle) ───────── */

.info {
  grid-column: 2;
  grid-row: 1;
  min-inline-size: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 28px;
  padding: 32px 46px 30px 48px;
  color: var(--sfr-paper);
}

.infoTop {
  min-inline-size: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.infoLabel {
  margin: 0;
  font: 500 16px/1.3 var(--sfr-font-text);
  color: var(--sfr-paper-soft);
  text-wrap: balance;
}

.fit {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
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
  color: var(--sfr-paper);
  text-wrap: balance;
  overflow-wrap: normal;
  word-break: normal;
  transform-origin: 0 100%;
  animation: sfrPop 480ms cubic-bezier(0.2, 0.9, 0.3, 1) both;
}

.bar {
  display: block;
  inline-size: 72px;
  block-size: 4px;
  border-radius: 2px;
  background: var(--sfr-accent);
  transform-origin: 0 50%;
  animation: sfrBar 520ms var(--sfr-ease) 80ms both;
}

.detail {
  display: grid;
  gap: 10px;
  max-inline-size: 46ch;
  min-inline-size: 0;
}

.range {
  margin: 0;
  font: 600 16px/1.3 var(--sfr-font-text);
  font-variant-numeric: tabular-nums;
  color: var(--sfr-paper-soft);
  letter-spacing: 0.02em;
  animation: sfrRise 380ms var(--sfr-ease) 40ms both;
}

.note {
  margin: 0;
  font: 400 18px/1.5 var(--sfr-font-text);
  color: rgba(243, 244, 242, 0.9);
  text-wrap: pretty;
  animation: sfrRise 420ms var(--sfr-ease) 110ms both;
}

/* ───────── The anodised ruler ───────── */

/* ───────── The anodised ruler ───────── */

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
  background: linear-gradient(180deg, var(--sfr-alu-hi) 0%, var(--sfr-alu) 55%, var(--sfr-alu-lo) 100%);
  box-shadow: 0 -14px 30px -16px rgba(0, 0, 0, 0.45);
}

.ruler:active {
  cursor: grabbing;
}

.ruler::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.85),
    inset 0 -1px 0 rgba(20, 23, 26, 0.28);
}

.ruler:focus-visible::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  border: 2px solid var(--sfr-ink);
  box-shadow: inset 0 0 0 2px var(--sfr-accent);
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

.wash {
  position: absolute;
  inset-block-start: 0;
  block-size: 124px;
  inset-inline-start: calc(var(--at) * var(--ppu));
  inline-size: calc(var(--w) * var(--ppu));
  background: linear-gradient(180deg, rgba(20, 23, 26, 0.12), rgba(20, 23, 26, 0.02));
  box-shadow: inset 1px 0 0 rgba(20, 23, 26, 0.25), inset -1px 0 0 rgba(20, 23, 26, 0.25);
  transition:
    inset-inline-start 420ms var(--sfr-spring),
    inline-size 420ms var(--sfr-spring);
}

.ticks {
  position: absolute;
  inset-block-start: 0;
  /* ticks run the full length of the track, so no blank wood at either end; tile phase stays locked to the scale origin */
  inset-inline-start: calc(-100cqw - 2px);
  inline-size: calc(var(--span) * var(--ppu) + 200cqw + 4px);
  block-size: 64px;
}

.tickMinor,
.tickMid,
.tickMajor {
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
}

.tickMinor {
  block-size: 22px;
  background-image: linear-gradient(90deg, transparent 0 1px, rgba(20, 23, 26, 0.5) 1px 3px, transparent 3px);
  background-size: calc(var(--ppu) / 10) 100%;
  background-position-x: 100cqw;
  background-repeat: repeat-x;
}

.tickMid {
  block-size: 36px;
  background-image: linear-gradient(90deg, transparent 0 1px, var(--sfr-ink) 1px 3px, transparent 3px);
  background-size: calc(var(--ppu) / 2) 100%;
  background-position-x: 100cqw;
  background-repeat: repeat-x;
}

.tickMajor {
  block-size: 54px;
  background-image: linear-gradient(90deg, transparent 0 1px, var(--sfr-ink) 1px 3px, transparent 3px);
  background-size: var(--ppu) 100%;
  background-position-x: 100cqw;
  background-repeat: repeat-x;
}

.numeral {
  position: absolute;
  inset-block-start: 68px;
  inset-inline-start: calc(var(--at) * var(--ppu));
  transform: translateX(-50%);
  font-family: var(--sfr-font-display);
  font-weight: 600;
  font-size: 30px;
  line-height: 1;
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
  color: var(--sfr-ink);
}

.rail {
  position: absolute;
  inset-block-start: 124px;
  block-size: 40px;
  inset-inline-start: -100cqw;
  inline-size: calc(var(--span) * var(--ppu) + 200cqw);
  box-sizing: border-box;
  border-block: 1px solid rgba(20, 23, 26, 0.3);
  background: rgba(20, 23, 26, 0.05);
}

.chip,

.chipOn {
  z-index: 1;
  color: var(--sfr-paper);
  background: var(--sfr-ink);
  border-inline-start-color: var(--sfr-ink);
  box-shadow: 0 8px 14px -8px rgba(20, 23, 26, 0.5);
  animation: sfrChip 360ms var(--sfr-ease) both;
}

/* ───────── The signal needle ───────── */

.needleLayer {
  position: absolute;
  inset: 0;
  z-index: 3;
  direction: ltr;
  pointer-events: none;
}

.needle,
.needleFoot {
  position: absolute;
  inset-block: 0 var(--gap-top);
  inset-inline-start: calc(var(--needle) - 2px);
  inline-size: 4px;
  background: var(--sfr-accent);
  box-shadow:
    0 0 0 1px rgba(14, 16, 15, 0.85),
    0 0 18px 0 color-mix(in srgb, var(--sfr-accent) 22%, transparent);
  transform-origin: 50% 0;
}

.needleFoot {
  inset-block: auto 0;
  block-size: var(--gap-foot);
  inset-inline-start: calc(var(--needle) - 2px);
  border-radius: 0;
  transform-origin: 50% 100%;
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

@keyframes sfrBar {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
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

/* ───────── Narrow containers: one column, needle only through the ruler ───────── */

@container sfr (max-width: 639px) {
  .card {
    --needle: 50cqw;
    --ruler-h: 176px;
    --gap-top: 82px;
    --gap-foot: 30px;
    --avail: calc(100cqw - 52px);
    --glyph-max: 30cqw;
    --num-avail: calc(100cqw - 52px);
    --num-max: 34cqw;

    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto var(--ruler-h);
    border-radius: 24px;
  }

  .slab {
    grid-column: 1;
    grid-row: 1;
    inline-size: auto;
    gap: 14px;
    padding: 26px 26px 24px;
  }

  .measure {
    max-inline-size: 34ch;
    font-size: 15px;
  }

  .readout {
    justify-content: flex-start;
  }

  .info {
    grid-column: 1;
    grid-row: 2;
    gap: 18px;
    padding: 26px 26px 44px;
  }

  .note {
    font-size: 16px;
  }

  .ruler {
    grid-row: 3;
  }

  .needleLayer {
    inset-block-start: auto;
    block-size: calc(var(--ruler-h) + 24px + 22px);
  }

  .needle {
    border-start-start-radius: 3px;
    border-start-end-radius: 3px;
  }
}

/* ───────── Reduced motion: no momentum (handled in script), no choreography, instant swaps ───────── */

@media (prefers-reduced-motion: reduce) {
  .glyph,
  .bar,
  .range,
  .note,
  .chipOn,
  .needleDrop,
  .rulerIn,
  .slabIn,
  .riseA,
  .riseB,
  .riseC {
    animation: none;
  }

  .wash {
    transition: none;
  }
}
```
