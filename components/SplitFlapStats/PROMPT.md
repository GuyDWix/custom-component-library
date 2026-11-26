Create a custom element called "Split-Flap Stats". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: stats (value, label). Add other settings if they help.

```tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import styles from './Component.module.css';

export interface SplitFlapStat {
  value: string;
  label: string;
}

export interface SplitFlapStatsProps {
  stats?: SplitFlapStat[];
  className?: string;
}

export const defaultStats: SplitFlapStat[] = [
  { value: '12,480', label: 'Orders shipped' },
  { value: '98%', label: 'Arrived on time' },
  { value: '37', label: 'Cities served' },
  { value: '4.9', label: 'Average rating' },
];

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

type Phase = 'final' | 'armed' | 'played';
type RunMode = 'intro' | 'replay';
type Run = { id: number; mode: RunMode };
type Token = { ch: string; fixed: boolean };
type View = { cur: string; nxt: string | null; fall: number; land: number; id: number; final: boolean };

const DIGITS = '0123456789'.split('');
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const SEP = /^[.,:/\- ]$/;
const SEP_WIDTH = 0.36;

const FALL_FINAL = 120;
const LAND_FINAL = 300;
const LAND_LEAD = FALL_FINAL + LAND_FINAL * 0.55;
const MIN_STEP = 46;
const MAX_STEP = 125;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const cx = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(' ');

const tokenize = (value: string): Token[] =>
  Array.from(value.toUpperCase().trim()).map((ch) => ({ ch, fixed: SEP.test(ch) }));

const drumFor = (ch: string): string[] => {
  if (/[0-9]/.test(ch)) return DIGITS;
  if (/[A-Z]/.test(ch)) return LETTERS;
  return [' ', ch];
};

/** Characters a flap column visits on its way from `from` to `to`, `laps` extra turns included. */
const buildPath = (drum: string[], from: string, to: string, laps: number): string[] => {
  const len = drum.length;
  const toIdx = drum.indexOf(to);
  if (toIdx < 0) return [];
  const fromIdx = drum.indexOf(from);
  let steps = fromIdx < 0 ? toIdx + 1 : (toIdx - fromIdx + len) % len;
  steps += laps * len;
  const base = fromIdx < 0 ? -1 : fromIdx;
  const path: string[] = [];
  for (let k = 1; k <= steps; k++) path.push(drum[(((base + k) % len) + len) % len]);
  return path;
};

const landTime = (mode: RunMode, order: number, index: number) =>
  mode === 'intro' ? 1500 + order * 120 : 850 + index * 110;

const rest = (ch: string): View => ({ cur: ch, nxt: null, fall: 0, land: 0, id: 0, final: false });

function Glyph({ ch, half }: { ch: string; half: 'top' | 'bottom' }) {
  return <span className={cx(styles.glyph, half === 'top' ? styles.glyphTop : styles.glyphBottom)}>{ch.trim() ? ch : ''}</span>;
}

function StaticCell({ ch }: { ch: string }) {
  return (
    <span className={cx(styles.cell, styles.cellFixed)} aria-hidden="true">
      <span className={cx(styles.half, styles.top)}>
        <Glyph ch={ch} half="top" />
      </span>
      <span className={cx(styles.half, styles.bottom)}>
        <Glyph ch={ch} half="bottom" />
      </span>
      <span className={styles.hinge} />
    </span>
  );
}

interface FlapCellProps {
  ch: string;
  run: number;
  landAt: number;
  blank: boolean;
}

function FlapCell({ ch, run, landAt, blank }: FlapCellProps) {
  const [view, setView] = useState<View>(() => rest(ch));
  const shown = useRef(ch);
  const live = useRef({ ch, landAt });
  const running = useRef(false);
  const seq = useRef(0);
  live.current = { ch, landAt };

  useIsoLayoutEffect(() => {
    if (!blank) return;
    shown.current = '';
    setView(rest(''));
  }, [blank]);

  useEffect(() => {
    if (blank || running.current) return;
    shown.current = ch;
    setView((v) => (v.nxt === null && v.cur === ch ? v : rest(ch)));
  }, [ch, blank]);

  useEffect(() => {
    if (run === 0) return;
    const target = live.current.ch;
    const at = live.current.landAt;
    const startChar = shown.current;
    const path = buildPath(drumFor(target), startChar, target, 1);
    if (path.length === 0) return;
    const last = path.length - 1;
    const interval = last > 0 ? clamp((at - LAND_LEAD) / last, MIN_STEP, MAX_STEP) : 0;
    const lead = Math.max(0, at - LAND_LEAD - last * interval);
    const timers: number[] = [];
    running.current = true;
    path.forEach((nxt, k) => {
      const isLast = k === last;
      timers.push(
        window.setTimeout(() => {
          shown.current = nxt;
          seq.current += 1;
          setView({
            cur: k === 0 ? startChar : path[k - 1],
            nxt,
            fall: isLast ? FALL_FINAL : interval * 0.5,
            land: isLast ? LAND_FINAL : interval * 0.5,
            id: seq.current,
            final: isLast,
          });
        }, lead + k * interval),
      );
    });
    timers.push(
      window.setTimeout(() => {
        running.current = false;
        setView(rest(target));
      }, lead + last * interval + FALL_FINAL + LAND_FINAL + 40),
    );
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      running.current = false;
    };
  }, [run]);

  const nxt = view.nxt;
  const flapStyle = { '--sf-fall': `${view.fall.toFixed(0)}ms`, '--sf-land': `${view.land.toFixed(0)}ms` } as CSSProperties;

  return (
    <span className={styles.cell} aria-hidden="true">
      <span className={cx(styles.half, styles.top)}>
        <Glyph ch={nxt ?? view.cur} half="top" />
      </span>
      <span className={cx(styles.half, styles.bottom)}>
        <Glyph ch={view.cur} half="bottom" />
      </span>
      {nxt !== null && (
        <>
          <span key={`t${view.id}`} className={cx(styles.half, styles.top, styles.flapTop)} style={flapStyle}>
            <Glyph ch={view.cur} half="top" />
            <span className={styles.shadeDown} />
          </span>
          <span
            key={`b${view.id}`}
            className={cx(styles.half, styles.bottom, view.final ? styles.flapBottomFinal : styles.flapBottom)}
            style={flapStyle}
          >
            <Glyph ch={nxt} half="bottom" />
            <span className={styles.shadeUp} />
          </span>
        </>
      )}
      <span className={styles.hinge} />
    </span>
  );
}

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const BOARD_HELP = 'Hover or focus a figure to replay its flip.';

export default function SplitFlapStats({
  stats = defaultStats,
  className,
}: SplitFlapStatsProps) {
  const rows = (stats.length > 0 ? stats : defaultStats).slice(0, 4).map((s) => {
    const tokens = tokenize(s.value);
    const cells = tokens.filter((t) => !t.fixed).length;
    const seps = tokens.length - cells;
    return { ...s, tokens, n: Math.max(1, cells + seps * SEP_WIDTH), count: Math.max(1, tokens.length) };
  });
  const rests = rows.slice(1);
  const restN = Math.max(1, ...rests.map((r) => r.n));
  const restCount = Math.max(1, ...rests.map((r) => r.count));
  const wideCols = Math.max(1, rests.length);

  // global cell order for the intro's staggered landing
  const orders: number[] = [];
  rows.reduce((acc, r) => {
    orders.push(acc);
    return acc + r.tokens.filter((t) => !t.fixed).length;
  }, 0);

  const [phase, setPhase] = useState<Phase>('final');
  const [reduced, setReduced] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [unlit, setUnlit] = useState<number[]>([]);

  const rootRef = useRef<HTMLElement>(null);
  const rowsRef = useRef({ rows, orders });
  rowsRef.current = { rows, orders };
  const lampTimers = useRef<number[]>([]);
  const busyUntil = useRef<number[]>([]);

  const relight = (i: number, delay: number) => {
    window.clearTimeout(lampTimers.current[i]);
    lampTimers.current[i] = window.setTimeout(() => setUnlit((u) => u.filter((x) => x !== i)), delay);
  };

  const lastLanding = (i: number, mode: RunMode) => {
    const { rows: r, orders: o } = rowsRef.current;
    const cells = r[i] ? r[i].tokens.filter((t) => !t.fixed).length : 0;
    return landTime(mode, o[i] + Math.max(0, cells - 1), Math.max(0, cells - 1));
  };

  useIsoLayoutEffect(() => {
    const mq = window.matchMedia(MOTION_QUERY);
    setReduced(mq.matches);
    if (!mq.matches) setPhase('armed');
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(MOTION_QUERY);
    const sync = () => {
      setReduced(mq.matches);
      if (mq.matches) setPhase('final');
    };
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (phase !== 'armed') return;
    const root = rootRef.current;
    const start = () => {
      const count = rowsRef.current.rows.length;
      setPhase('played');
      setRuns(Array.from({ length: count }, () => ({ id: 1, mode: 'intro' as RunMode })));
      setUnlit(Array.from({ length: count }, (_, i) => i));
      for (let i = 0; i < count; i++) {
        busyUntil.current[i] = performance.now() + lastLanding(i, 'intro') + 500;
        relight(i, lastLanding(i, 'intro') + 220);
      }
    };
    if (!root || typeof IntersectionObserver === 'undefined') {
      start();
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          io.disconnect();
          start();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, [phase]);

  useEffect(
    () => () => {
      lampTimers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  const replay = (i: number) => {
    if (phase !== 'played' || reduced) return;
    if (performance.now() < (busyUntil.current[i] ?? 0)) return;
    busyUntil.current[i] = performance.now() + lastLanding(i, 'replay') + 500;
    setRuns((prev) => {
      const next = prev.slice();
      next[i] = { id: (prev[i]?.id ?? 0) + 1, mode: 'replay' };
      return next;
    });
    setUnlit((u) => (u.includes(i) ? u : [...u, i]));
    relight(i, lastLanding(i, 'replay') + 220);
  };


  const boardStyle = {
    '--sf-wide-cols': wideCols,
    '--sf-rest-n': restN.toFixed(2),
    '--sf-rest-count': restCount,
  } as CSSProperties;

  const armed = phase === 'armed';
  const oddRest = rests.length % 2 === 1;

  return (
    <section
      ref={rootRef}
      className={cx(styles.root, className)}
      aria-label="Key figures"
      aria-description={BOARD_HELP}
    >
      <div className={styles.hall}>
        <div className={styles.frame}>
          <ul className={styles.board} style={boardStyle}>
            {rows.map((row, i) => {
              const hero = i === 0;
              const run = runs[i] ?? { id: 0, mode: 'intro' as RunMode };
              const lit = !armed && !unlit.includes(i);
              let cellIndex = -1;
              const tileStyle = hero
                ? ({ '--sf-n': row.n.toFixed(2), '--sf-count': row.count } as CSSProperties)
                : undefined;
              return (
                <li
                  key={i}
                  className={cx(styles.stat, hero ? styles.statHero : styles.statRest, !hero && oddRest && i === rows.length - 1 && styles.statWide)}
                  style={tileStyle}
                  tabIndex={0}
                  onPointerEnter={() => replay(i)}
                  onFocus={() => replay(i)}
                >
                  <span className={styles.sr}>{row.value}</span>
                  <span className={styles.digits} aria-hidden="true">
                    {row.tokens.map((t, k) => {
                      if (t.fixed) return <StaticCell key={k} ch={t.ch} />;
                      cellIndex += 1;
                      return (
                        <FlapCell
                          key={k}
                          ch={t.ch}
                          run={run.id}
                          blank={armed}
                          landAt={landTime(run.mode, orders[i] + cellIndex, cellIndex)}
                        />
                      );
                    })}
                  </span>
                  <span className={cx(styles.label, hero && styles.labelHero, lit && styles.labelLit)}>
                    <span className={cx(styles.lamp, lit && phase === 'played' && styles.lampLit)} aria-hidden="true" />
                    <span className={styles.labelText}>{row.label}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <span className={cx(styles.light, armed && styles.lightOff)} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
```

```css
.root {
  --lamp: #f0a23c;
  --sf-font-display: 'Barlow', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --sf-font-ui: 'Barlow', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;

  /* sizes resolve in descendants, against this container */
  --sf-hp: clamp(10px, 3cqi, 36px);
  --sf-fp: clamp(14px, 3cqi, 36px);
  --sf-gap: clamp(16px, 3cqi, 36px);
  --sf-cg: clamp(2px, 0.5cqi, 4px);
  --sf-avail: calc(100cqi - 2 * var(--sf-hp) - 2 * var(--sf-fp) - 2px);

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 24px;
  background: color-mix(in srgb, #26282c 36%, #040506);
  color: #ece5d3;
  font-family: var(--sf-font-ui);
}

.hall {
  position: relative;
  box-sizing: border-box;
  padding-inline: var(--sf-hp);
  padding-block-end: clamp(18px, 3.2cqi, 40px);
}

.frame {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  margin-block-start: var(--sf-hp);
  padding: var(--sf-fp);
  border-radius: clamp(14px, 2.2cqi, 24px);
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, #26282c 50%, #000) 90%, #fff) 0%, color-mix(in srgb, #26282c 50%, #000) 38%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 28px 48px -32px rgba(0, 0, 0, 0.8);
}

.light {
  position: absolute;
  z-index: 6;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(80% 50% at 24% 0%, rgba(255, 244, 225, 0.07), transparent 70%),
    linear-gradient(180deg, transparent 65%, rgba(0, 0, 0, 0.16) 100%);
  transition: opacity 1.8s cubic-bezier(0.25, 0.6, 0.2, 1) 0.15s;
}

.lightOff {
  opacity: 0;
}

.board {
  --sf-rest-cols: var(--sf-wide-cols);
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(var(--sf-rest-cols), minmax(0, 1fr));
  gap: var(--sf-gap);
}

.stat {
  --sf-col: calc((var(--sf-avail) - (var(--sf-cols) - 1) * var(--sf-gap)) / var(--sf-cols));
  --sf-cell: max(5px, min(var(--sf-cap), (var(--sf-col) - (var(--sf-count) - 1) * var(--sf-cg)) / var(--sf-n)));
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  border-radius: 10px;
  outline: none;
}

.stat:focus-visible {
  outline: 2px solid var(--lamp);
  outline-offset: 8px;
}

.statHero {
  --sf-cols: 1;
  --sf-cap: 168px;
  grid-column: 1 / -1;
}

.statRest {
  --sf-cols: var(--sf-rest-cols);
  --sf-cap: 96px;
  --sf-n: var(--sf-rest-n);
  --sf-count: var(--sf-rest-count);
  border-block-start: 1px solid rgba(255, 255, 255, 0.07);
  padding-block-start: clamp(14px, 2.2cqi, 26px);
}

.statWide {
  min-inline-size: 0;
}

@container (max-width: 620px) {
  .board {
    --sf-rest-cols: 2;
  }

  .statWide {
    grid-column: 1 / -1;
  }
}

.sr {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.digits {
  display: flex;
  gap: var(--sf-cg);
  max-inline-size: 100%;
}

/* ---------- flap cell ---------- */

.cell {
  --sf-h: calc(var(--sf-cell) * 1.4);
  position: relative;
  flex: none;
  inline-size: var(--sf-cell);
  block-size: var(--sf-h);
  perspective: calc(var(--sf-cell) * 5);
}

.cellFixed {
  inline-size: calc(var(--sf-cell) * 0.36);
}

.half {
  position: absolute;
  inset-inline: 0;
  block-size: 50%;
  overflow: hidden;
}

.top {
  inset-block-start: 0;
  border-start-start-radius: calc(var(--sf-cell) * 0.05);
  border-start-end-radius: calc(var(--sf-cell) * 0.05);
  background: linear-gradient(180deg, color-mix(in srgb, #26282c 90%, #fff) 0%, #26282c 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.bottom {
  inset-block-end: 0;
  border-end-start-radius: calc(var(--sf-cell) * 0.05);
  border-end-end-radius: calc(var(--sf-cell) * 0.05);
  background: linear-gradient(180deg, color-mix(in srgb, #26282c 84%, #000) 0%, color-mix(in srgb, #26282c 70%, #000) 100%);
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.35);
}

.glyph {
  position: absolute;
  inset-inline: 0;
  block-size: 200%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--sf-font-display);
  font-weight: 600;
  font-size: calc(var(--sf-h) * 0.8);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: #ece5d3;
  transform: translateY(-0.05em);
  user-select: none;
}

.glyphTop {
  inset-block-start: 0;
}

.glyphBottom {
  inset-block-end: 0;
}

.hinge {
  position: absolute;
  z-index: 5;
  inset-inline: 0;
  inset-block-start: calc(50% - 0.5px);
  block-size: 1px;
  background: rgba(0, 0, 0, 0.85);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.05);
}

/* ---------- the two falling flaps ---------- */

.flapTop {
  z-index: 2;
  transform-origin: 50% 100%;
  will-change: transform;
  animation: sfFall var(--sf-fall) cubic-bezier(0.5, 0, 0.9, 0.55) both;
}

.flapBottom {
  z-index: 2;
  transform-origin: 50% 0;
  transform: rotateX(90deg);
  will-change: transform;
  animation: sfLand var(--sf-land) cubic-bezier(0.45, 0, 0.85, 0.6) var(--sf-fall) both;
}

.flapBottomFinal {
  z-index: 2;
  transform-origin: 50% 0;
  transform: rotateX(90deg);
  will-change: transform;
  animation: sfLandFinal var(--sf-land) linear var(--sf-fall) both;
}

.shadeDown,
.shadeUp {
  position: absolute;
  inset: 0;
  background: #000;
  pointer-events: none;
}

.shadeDown {
  opacity: 0;
  animation: sfShadeIn var(--sf-fall) ease-in both;
}

.shadeUp {
  opacity: 0.6;
  animation: sfShadeOut var(--sf-land) ease-out var(--sf-fall) both;
}

@keyframes sfFall {
  from {
    transform: rotateX(0deg);
  }
  to {
    transform: rotateX(-90deg);
  }
}

@keyframes sfLand {
  from {
    transform: rotateX(90deg);
  }
  to {
    transform: rotateX(0deg);
  }
}

@keyframes sfLandFinal {
  0% {
    transform: rotateX(90deg);
    animation-timing-function: cubic-bezier(0.45, 0, 0.9, 0.55);
  }
  52% {
    transform: rotateX(0deg);
    animation-timing-function: cubic-bezier(0.2, 0.7, 0.4, 1);
  }
  68% {
    transform: rotateX(13deg);
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.6);
  }
  82% {
    transform: rotateX(0deg);
    animation-timing-function: cubic-bezier(0.2, 0.7, 0.4, 1);
  }
  91% {
    transform: rotateX(3.5deg);
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.6);
  }
  100% {
    transform: rotateX(0deg);
  }
}

@keyframes sfShadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.7;
  }
}

@keyframes sfShadeOut {
  from {
    opacity: 0.6;
  }
  to {
    opacity: 0;
  }
}

.label {
  box-sizing: border-box;
  max-inline-size: 100%;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-block-start: clamp(12px, 1.8cqi, 20px);
  color: color-mix(in srgb, #ece5d3 52%, color-mix(in srgb, #26282c 50%, #000));
  font-family: var(--sf-font-ui);
  font-weight: 500;
  font-size: 12px;
  line-height: 1.3;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  transition: color 0.5s ease;
}

.labelHero {
  font-size: 13px;
}

.labelLit {
  color: color-mix(in srgb, #ece5d3 72%, color-mix(in srgb, #26282c 50%, #000));
}

.labelText {
  min-inline-size: 0;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.lamp {
  flex: none;
  inline-size: 14px;
  block-size: 1px;
  background: color-mix(in srgb, var(--lamp) 28%, transparent);
  transition:
    background-color 0.4s ease,
    inline-size 0.5s ease;
}

.lampLit {
  background: var(--lamp);
  inline-size: 22px;
}

@media (prefers-reduced-motion: reduce) {
  .light,
  .label,
  .lamp {
    transition: none;
  }
}
```
