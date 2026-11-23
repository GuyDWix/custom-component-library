Create a custom element called "Season Ribbon". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: items (name, first month, last month), current month marker on or off, season colours, row labels (season range text on or off). Add other settings if they help.

```tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface SeasonItem {
  name: string;
  /** 1 = January … 12 = December */
  firstMonth: number;
  /** 1 = January … 12 = December. A last month before the first one wraps over New Year. */
  lastMonth: number;
}

export interface SeasonRibbonProps {
  items?: SeasonItem[];
  showCurrentMonth?: boolean;
  seasonColors?: string[];
  showSeasonRange?: boolean;
  monthNames?: string[];
  nowLabel?: string;
  ariaLabel?: string;
  className?: string;
}

export const defaultItems: SeasonItem[] = [
  { name: 'English asparagus', firstMonth: 4, lastMonth: 6 },
  { name: 'Apricots', firstMonth: 6, lastMonth: 8 },
  { name: 'Damsons', firstMonth: 8, lastMonth: 10 },
  { name: 'Brussels sprouts', firstMonth: 10, lastMonth: 2 },
  { name: 'Blood oranges', firstMonth: 11, lastMonth: 3 },
];

const DEFAULT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DEFAULT_COLORS = ['var(--sr-leaf)', 'var(--sr-orange)', 'var(--sr-plum)'];
const MAX_STAGGER = 8;

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const clampMonth = (n: number) => Math.min(12, Math.max(1, Math.round(Number.isFinite(n) ? n : 1)));
const inSeason = (first: number, last: number, m: number) => (first <= last ? m >= first && m <= last : m >= first || m <= last);

type Seg = { a: number; b: number; startRound: boolean; endRound: boolean };

const segmentsFor = (first: number, last: number): Seg[] =>
  first <= last
    ? [{ a: first, b: last, startRound: true, endRound: true }]
    : [
        { a: first, b: 12, startRound: true, endRound: false },
        { a: 1, b: last, startRound: false, endRound: true },
      ];

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Phase = 'static' | 'hidden' | 'play';

export default function SeasonRibbon({
  items = defaultItems,
  showCurrentMonth = true,
  seasonColors = DEFAULT_COLORS,
  showSeasonRange = true,
  monthNames = DEFAULT_MONTHS,
  nowLabel = 'In season now',
  ariaLabel = 'Seasonal availability by month',
  className,
}: SeasonRibbonProps) {
  const [phase, setPhase] = useState<Phase>('static');
  const [now, setNow] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const hitRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useIsoLayoutEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPhase('hidden');
  }, []);

  useEffect(() => {
    setNow(new Date().getMonth() + 1);
  }, []);

  useEffect(() => {
    if (phase !== 'hidden') return;
    const el = rootRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setPhase('play');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPhase('play');
          io.disconnect();
        }
      },
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [phase]);

  const name = (m: number) => monthNames[m - 1] ?? DEFAULT_MONTHS[m - 1];
  const palette = seasonColors.length ? seasonColors : DEFAULT_COLORS;

  const rows = items.map((item, i) => {
    const first = clampMonth(item.firstMonth);
    const last = clampMonth(item.lastMonth);
    const segs = segmentsFor(first, last);
    const main = segs.length === 2 && segs[1].b - segs[1].a > segs[0].b - segs[0].a ? segs[1] : segs[0];
    const s = (main.a - 1) / 12;
    const e = main.b / 12;
    const anchorEnd = 1 - s < e;
    const range = first === last ? name(first) : `${name(first)} – ${name(last)}`;
    const live = now !== null && showCurrentMonth && inSeason(first, last, now);
    return { item, i, first, last, segs, s, e, anchorEnd, range, live, color: palette[i % palette.length] };
  });

  const active = hovered ?? focused ?? pinned;
  const activeRow = active !== null ? rows[active] : undefined;
  const nowOn = showCurrentMonth && now !== null;
  const visibleRows = Math.min(items.length, MAX_STAGGER + 1);

  const rootStyle = {
    '--sr-pin': `${240 + visibleRows * 95 + 700}ms`,
    ...(activeRow ? { '--sr-ac': activeRow.color } : null),
  } as CSSProperties;

  const move = (from: number, dir: number) => {
    const n = hitRefs.current[from + dir];
    if (n) n.focus();
  };

  const onKey = (i: number) => (ev: KeyboardEvent<HTMLButtonElement>) => {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') {
      ev.preventDefault();
      move(i, 1);
    } else if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') {
      ev.preventDefault();
      move(i, -1);
    } else if (ev.key === 'Escape') {
      setPinned(null);
    }
  };

  const onEnter = (i: number) => (ev: PointerEvent<HTMLButtonElement>) => {
    if (ev.pointerType !== 'touch') setHovered(i);
  };

  return (
    <section
      ref={rootRef}
      className={cx(styles.root, phase === 'hidden' && styles.hidden, phase === 'play' && styles.play, className)}
      style={rootStyle}
      aria-label={ariaLabel}
    >
      <div className={styles.sheet}>
        <div className={styles.plot}>
          <div className={styles.ledger} aria-hidden="true">
            {Array.from({ length: 12 }, (_, m) => (
              <span
                key={m}
                className={cx(
                  styles.col,
                  activeRow && inSeason(activeRow.first, activeRow.last, m + 1) && styles.colOn,
                  nowOn && now === m + 1 && styles.colNow,
                )}
                style={{ '--sr-n': m } as CSSProperties}
              />
            ))}
          </div>

          <div className={styles.ruler} aria-hidden="true">
            {Array.from({ length: 12 }, (_, m) => (
              <span
                key={m}
                className={cx(styles.month, activeRow && inSeason(activeRow.first, activeRow.last, m + 1) && styles.monthOn)}
              >
                <span className={styles.monthFull}>{name(m + 1)}</span>
                <span className={styles.monthInit}>{(name(m + 1) || '').charAt(0)}</span>
              </span>
            ))}
            {nowOn && now !== null && (
              <span className={styles.pin} style={{ '--sr-now': now - 1 } as CSSProperties}>
                <span className={styles.monthFull}>{name(now)}</span>
                <span className={styles.monthInit}>{(name(now) || '').charAt(0)}</span>
              </span>
            )}
          </div>

          <ul className={styles.list}>
            {rows.map((r) => {
              const rowStyle = {
                '--sr-i': Math.min(r.i, MAX_STAGGER),
                '--sr-c': r.color,
                '--sr-lx': `${r.s * 100}%`,
                '--sr-rx': `${(1 - r.e) * 100}%`,
                '--sr-lw': r.anchorEnd ? `${r.e * 100}%` : `${(1 - r.s) * 100}%`,
              } as CSSProperties;
              return (
                <li
                  key={r.i}
                  className={cx(styles.row, active === r.i && styles.rowOn, active !== null && active !== r.i && styles.rowDim)}
                  style={rowStyle}
                >
                  <button
                    type="button"
                    ref={(n) => {
                      hitRefs.current[r.i] = n;
                    }}
                    className={styles.hit}
                    aria-pressed={pinned === r.i}
                    aria-label={`${r.item.name}: ${r.range}${r.live && nowLabel ? `, ${nowLabel}` : ''}`}
                    onPointerEnter={onEnter(r.i)}
                    onPointerLeave={() => setHovered((h) => (h === r.i ? null : h))}
                    onFocus={(ev) => {
                      let visible = true;
                      try {
                        visible = ev.currentTarget.matches(':focus-visible');
                      } catch {
                        visible = true;
                      }
                      if (visible) setFocused(r.i);
                    }}
                    onBlur={() => setFocused((f) => (f === r.i ? null : f))}
                    onClick={() => setPinned((p) => (p === r.i ? null : r.i))}
                    onKeyDown={onKey(r.i)}
                  >
                    <span className={cx(styles.label, r.anchorEnd && styles.labelEnd)}>
                      <span className={styles.name}>{r.item.name}</span>
                      {showSeasonRange && <span className={styles.range}>{r.range}</span>}
                      {r.live && nowLabel && <span className={styles.badge}>{nowLabel}</span>}
                    </span>
                    <span className={styles.lane}>
                      {r.segs.map((g) => (
                        <span
                          key={g.a}
                          className={cx(styles.seg, !g.startRound && styles.flatStart, !g.endRound && styles.flatEnd)}
                          style={
                            {
                              '--sr-a': g.a - 1,
                              '--sr-w': g.b - g.a + 1,
                            } as CSSProperties
                          }
                        >
                          <span className={styles.band} />
                          <span className={styles.track}>
                            <span className={styles.curl} />
                          </span>
                        </span>
                      ))}
                      {r.live && now !== null && (
                        <span className={styles.dot} style={{ '--sr-now': now - 1 } as CSSProperties} />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
```

```css
@font-face {
  font-family: 'Familjen Grotesk';
  src: url('./fonts/familjen-grotesk-latin-wght-normal.woff2') format('woff2');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}

.root {
  --sr-linen: #f6f7f1;
  --sr-ink: #17261c;
  --sr-muted: rgba(23, 38, 28, 0.64);
  --sr-hair: rgba(23, 38, 28, 0.13);
  --sr-leaf: #2f8a4d;
  --sr-orange: #e2531c;
  --sr-plum: #6a2a5b;
  --sr-font: 'Familjen Grotesk', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --sr-ac: var(--sr-ink);

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 28px;
  color: var(--sr-ink);
  font-family: var(--sr-font);
  font-variant-numeric: tabular-nums;
  background:
    repeating-linear-gradient(0deg, rgba(23, 60, 36, 0.035) 0 1px, transparent 1px 3px),
    repeating-linear-gradient(90deg, rgba(23, 60, 36, 0.03) 0 1px, transparent 1px 3px),
    radial-gradient(80% 60% at 8% 0%, rgba(255, 255, 255, 0.9) 0%, transparent 70%),
    var(--sr-linen);
  box-shadow:
    0 0 0 1px rgba(23, 38, 28, 0.08),
    0 36px 70px -36px rgba(8, 24, 14, 0.55);
}

.root::selection {
  background: color-mix(in srgb, var(--sr-leaf) 30%, transparent);
  color: var(--sr-ink);
}

.sheet {
  --sr-h: 48px;
  --sr-rad: 18px;
  box-sizing: border-box;
  padding-block: 22px 14px;
  padding-inline: 44px;
}

.plot {
  position: relative;
}

/* ledger columns ------------------------------------------------------- */

.ledger {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  pointer-events: none;
  z-index: 0;
}

.col {
  position: relative;
  border-inline-start: 1px solid var(--sr-hair);
  transform-origin: top;
  transition: background-color 0.3s ease;
}

.col:last-child {
  border-inline-end: 1px solid var(--sr-hair);
}

.colOn {
  background-color: color-mix(in srgb, var(--sr-ac) 11%, transparent);
}

.colNow::before {
  content: '';
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--sr-ink) 5.5%, transparent);
  transform-origin: top;
}

.colNow::after {
  content: '';
  position: absolute;
  inset-block: 46px 0;
  inset-inline-start: calc(50% - 1px);
  inline-size: 2px;
  background: repeating-linear-gradient(180deg, color-mix(in srgb, var(--sr-ink) 55%, transparent) 0 6px, transparent 6px 11px);
  transform-origin: top;
}

/* month ruler ---------------------------------------------------------- */

.ruler {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  align-items: center;
  block-size: 46px;
  border-block-end: 3px double color-mix(in srgb, var(--sr-ink) 40%, transparent);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--sr-muted);
  text-align: center;
}

.month {
  display: grid;
  place-items: center;
  block-size: 34px;
  margin-inline: 3px;
  border-radius: 11px;
  transition:
    color 0.3s ease,
    background-color 0.3s ease;
}

.monthOn {
  color: color-mix(in srgb, var(--sr-ac) 62%, #000);
  background-color: color-mix(in srgb, var(--sr-ac) 16%, transparent);
}

.monthInit {
  display: none;
}

.pin {
  position: absolute;
  inset-block-start: 6px;
  inset-inline-start: calc(var(--sr-now) / 12 * 100% + 3px);
  inline-size: calc(100% / 12 - 6px);
  block-size: 34px;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  border-radius: 11px;
  background: var(--sr-ink);
  color: var(--sr-linen);
  font-weight: 700;
  box-shadow: 0 6px 10px -4px rgba(8, 24, 14, 0.5);
  transform-origin: 50% 100%;
}

.pin::after {
  content: '';
  position: absolute;
  inset-block-end: -7px;
  inset-inline-start: calc(50% - 5px);
  border-inline: 5px solid transparent;
  border-block-start: 7px solid var(--sr-ink);
}

/* rows ----------------------------------------------------------------- */

.list {
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  border-block-end: 1px solid var(--sr-hair);
  opacity: 1;
  transition: opacity 0.35s ease;
}

.row:last-child {
  border-block-end: 1px solid color-mix(in srgb, var(--sr-ink) 28%, transparent);
}

.rowDim {
  opacity: 0.36;
}

.hit {
  appearance: none;
  display: block;
  box-sizing: border-box;
  inline-size: 100%;
  margin: 0;
  padding-block: 16px 20px;
  padding-inline: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-align: start;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.hit:focus-visible {
  outline: 2px solid var(--sr-ink);
  outline-offset: -2px;
  border-radius: 14px;
}

.label {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 14px;
  row-gap: 4px;
  inline-size: fit-content;
  max-inline-size: var(--sr-lw);
  margin-inline-start: var(--sr-lx);
  margin-block-end: 12px;
  padding-inline: 2px;
}

.labelEnd {
  justify-content: flex-end;
  text-align: end;
  margin-inline-start: auto;
  margin-inline-end: var(--sr-rx);
}

.name {
  font-size: clamp(24px, 4.2cqi, 46px);
  font-weight: 700;
  line-height: 1.02;
  letter-spacing: -0.035em;
  text-wrap: balance;
  overflow-wrap: break-word;
  min-inline-size: 0;
}

.range {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.01em;
  color: color-mix(in srgb, var(--sr-c) 68%, #000);
  transition: color 0.3s ease;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding-block: 3px;
  padding-inline: 10px 11px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--sr-c) 14%, transparent);
  color: color-mix(in srgb, var(--sr-c) 62%, #000);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0.01em;
}

.badge::before {
  content: '';
  inline-size: 7px;
  block-size: 7px;
  border-radius: 50%;
  background: var(--sr-c);
}

/* the ribbon ----------------------------------------------------------- */

.lane {
  position: relative;
  display: block;
  block-size: var(--sr-h);
}

.seg {
  position: absolute;
  inset-block: 0;
  inset-inline-start: calc(var(--sr-a) / 12 * 100%);
  inline-size: calc(var(--sr-w) / 12 * 100%);
  filter: drop-shadow(0 6px 7px color-mix(in srgb, var(--sr-c) 30%, transparent));
  transition:
    transform 0.45s cubic-bezier(0.3, 1.5, 0.5, 1),
    filter 0.3s ease;
}

.rowOn .seg {
  transform: translateY(-3px);
  filter: drop-shadow(0 12px 10px color-mix(in srgb, var(--sr-c) 36%, transparent));
}

.band {
  position: absolute;
  inset: 0;
  border-radius: var(--sr-rad);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 44%, rgba(0, 0, 0, 0.12) 100%),
    var(--sr-c);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 0 -1px 0 rgba(0, 0, 0, 0.16);
}

.flatStart .band {
  border-start-start-radius: 0;
  border-end-start-radius: 0;
}

.flatEnd .band {
  border-start-end-radius: 0;
  border-end-end-radius: 0;
}

/* month seams pressed into the ribbon */
.band::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image: linear-gradient(90deg, rgba(255, 255, 255, 0.4) 0 1px, transparent 1px);
  background-size: calc(100% / var(--sr-w)) 100%;
}

/* sewn hems */
.band::before {
  content: '';
  position: absolute;
  inset-block: 8px;
  inset-inline: 12px;
  z-index: 1;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.62) 0 5px, transparent 5px 10px) left top / 10px 2px repeat-x,
    linear-gradient(90deg, rgba(255, 255, 255, 0.62) 0 5px, transparent 5px 10px) left bottom / 10px 2px repeat-x;
}

.track {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.curl {
  position: absolute;
  inset-block: -1px;
  inset-inline-end: 0;
  inline-size: 26px;
  border-radius: 13px;
  opacity: 0;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--sr-c) 52%, #000) 0%,
    color-mix(in srgb, var(--sr-c) 70%, #fff) 34%,
    var(--sr-c) 58%,
    color-mix(in srgb, var(--sr-c) 62%, #000) 100%
  );
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.dot {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: calc((var(--sr-now) + 0.5) / 12 * 100%);
  inline-size: 18px;
  block-size: 18px;
  margin-block-start: -9px;
  margin-inline-start: -9px;
  box-sizing: border-box;
  border: 4px solid var(--sr-ink);
  border-radius: 50%;
  background: var(--sr-linen);
  box-shadow: 0 3px 6px rgba(8, 24, 14, 0.35);
}

/* motion --------------------------------------------------------------- */

.hidden .col {
  transform: scaleY(0);
}

.hidden .band {
  clip-path: inset(0 100% 0 0);
}

.hidden .track {
  transform: translateX(-100%);
}

.hidden .label,
.hidden .dot,
.hidden .pin,
.hidden .badge {
  opacity: 0;
}

.hidden .colNow::before,
.hidden .colNow::after {
  transform: scaleY(0);
}

.play .col {
  animation: colDraw 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) both;
  animation-delay: calc(var(--sr-n) * 26ms);
}

.play .label {
  animation: labelIn 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: calc(140ms + var(--sr-i) * 95ms);
}

.play .band {
  animation: unfurl 1s cubic-bezier(0.5, 0.05, 0.2, 1) both;
  animation-delay: calc(240ms + var(--sr-i) * 95ms);
}

.play .track {
  animation: trackIn 1s cubic-bezier(0.5, 0.05, 0.2, 1) both;
  animation-delay: calc(240ms + var(--sr-i) * 95ms);
}

.play .curl {
  animation: curlFade 1s linear both;
  animation-delay: calc(240ms + var(--sr-i) * 95ms);
}

.play .pin {
  animation: pinDrop 0.85s cubic-bezier(0.3, 0, 0.4, 1) both;
  animation-delay: var(--sr-pin);
}

.play .colNow::before {
  animation: washDown 0.8s cubic-bezier(0.3, 0.7, 0.2, 1) both;
  animation-delay: calc(var(--sr-pin) + 420ms);
}

.play .colNow::after {
  animation: washDown 0.9s cubic-bezier(0.3, 0.7, 0.2, 1) both;
  animation-delay: calc(var(--sr-pin) + 480ms);
}

.play .dot {
  animation: dotPop 0.55s cubic-bezier(0.3, 1.6, 0.5, 1) both;
  animation-delay: calc(var(--sr-pin) + 620ms + var(--sr-i) * 70ms);
}

.play .badge {
  animation: labelIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: calc(var(--sr-pin) + 700ms + var(--sr-i) * 70ms);
}

@keyframes colDraw {
  from {
    transform: scaleY(0);
  }
  to {
    transform: scaleY(1);
  }
}

@keyframes labelIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes unfurl {
  from {
    clip-path: inset(0 100% 0 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}

@keyframes trackIn {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes curlFade {
  0% {
    opacity: 0;
  }
  5% {
    opacity: 1;
  }
  84% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes pinDrop {
  0% {
    opacity: 0;
    transform: translateY(-64px) scale(1, 1);
  }
  30% {
    opacity: 1;
  }
  52% {
    transform: translateY(0) scale(1.1, 0.84);
  }
  72% {
    transform: translateY(-9px) scale(0.97, 1.05);
  }
  88% {
    transform: translateY(0) scale(1.02, 0.97);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1, 1);
  }
}

@keyframes washDown {
  from {
    transform: scaleY(0);
  }
  to {
    transform: scaleY(1);
  }
}

@keyframes dotPop {
  from {
    opacity: 0;
    transform: scale(0);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .seg,
  .col,
  .row,
  .month,
  .range {
    transition-duration: 0.01ms;
  }
}

/* narrow containers: rows stack, compact month initials ---------------- */

@container (max-width: 640px) {
  .sheet {
    --sr-h: 40px;
    --sr-rad: 14px;
    padding-block: 16px 10px;
    padding-inline: 14px;
  }

  .ruler {
    block-size: 40px;
    font-size: 14px;
  }

  .month {
    block-size: 30px;
    margin-inline: 2px;
    border-radius: 9px;
  }

  .pin {
    inset-block-start: 5px;
    inset-inline-start: calc(var(--sr-now) / 12 * 100% + 2px);
    inline-size: calc(100% / 12 - 4px);
    block-size: 30px;
    border-radius: 9px;
  }

  .colNow::after {
    inset-block-start: 40px;
  }

  .monthFull {
    display: none;
  }

  .monthInit {
    display: inline;
  }

  .hit {
    padding-block: 12px 16px;
  }

  .label,
  .labelEnd {
    margin-inline: 0;
    max-inline-size: 100%;
    justify-content: flex-start;
    text-align: start;
    margin-block-end: 10px;
  }

  .name {
    font-size: 24px;
  }

  .range {
    font-size: 14px;
  }

  .band::before {
    inset-block: 6px;
    inset-inline: 8px;
  }

  .curl {
    inline-size: 18px;
    border-radius: 9px;
  }

  .dot {
    inline-size: 16px;
    block-size: 16px;
    margin-block-start: -8px;
    margin-inline-start: -8px;
    border-width: 3px;
  }
}
```
