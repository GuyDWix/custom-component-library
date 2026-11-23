Create a custom element called "Package Slider Card". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: packages (name, price, short tagline, included items one per line), accent color, currency symbol, price note (e.g. per garment). Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface PackageSliderStop {
  name: string;
  price: string;
  tagline?: string;
  items: string;
}

export interface PackageSliderCardProps {
  stops?: PackageSliderStop[];
  accentColor?: string;
  currencySymbol?: string;
  priceNote?: string;
  className?: string;
}

export const defaultStops: PackageSliderStop[] = [
  {
    name: 'Essentials',
    price: '120',
    tagline: 'Hems, cuffs and a sharp finish.',
    items: 'Hem and cuff adjustments\nSteam press and finish',
  },
  {
    name: 'Tailored',
    price: '340',
    tagline: 'Your off-the-rack suit, made yours.',
    items: 'Hem and cuff adjustments\nSteam press and finish\nWaist and seat taken in\nOne follow-up fitting',
  },
  {
    name: 'Made to Measure',
    price: '890',
    tagline: 'A new suit cut from your measurements.',
    items:
      'Hem and cuff adjustments\nSteam press and finish\nWaist and seat taken in\nOne follow-up fitting\n30-point measuring session\nChoice of 40 cloths',
  },
  {
    name: 'Bespoke',
    price: '2400',
    tagline: 'Hand-cut pattern, hand-finished seams.',
    items:
      'Hem and cuff adjustments\nSteam press and finish\nWaist and seat taken in\nOne follow-up fitting\n30-point measuring session\nChoice of 40 cloths\nPaper pattern kept on file\nHand-stitched buttonholes',
  },
];

const STIFFNESS = 320;
const DAMPING = 24;
const STAGGER_MS = 70;

const splitItems = (raw: string) =>
  raw
    .split(/\n|;/)
    .map((s) => s.trim())
    .filter(Boolean);

const toNumber = (price: string) => {
  const clean = price.replace(/[\s,]/g, '');
  return /^\d+(\.\d+)?$/.test(clean) ? Number(clean) : null;
};

const formatPrice = (value: number, decimals: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const pad = (n: number) => String(n).padStart(2, '0');

const FACES = Array.from({ length: 10 }, (_, d) => d);

function OdometerColumn({ index, char }: { index: number; char: string | undefined }) {
  const last = useRef(0);
  const isDigit = char !== undefined && /\d/.test(char);
  if (isDigit) last.current = Number(char);
  const kind = char === undefined ? 'off' : isDigit ? 'digit' : 'sep';
  return (
    <span
      className={styles.col}
      data-kind={kind}
      style={{ '--v': last.current, '--col': index } as CSSProperties}
    >
      <span className={styles.drum}>
        {FACES.map((d) => (
          <span key={d} className={styles.face} style={{ '--i': d } as CSSProperties}>
            {d}
          </span>
        ))}
      </span>
      <span className={styles.sep}>{kind === 'sep' ? char : ','}</span>
    </span>
  );
}

export default function PackageSliderCard({
  stops = defaultStops,
  accentColor = '#e2411c',
  currencySymbol = '$',
  priceNote = 'per garment',
  className,
}: PackageSliderCardProps) {
  const count = stops.length;
  const startIndex = Math.min(1, Math.max(0, count - 1));
  const [sel, setSel] = useState({ cur: startIndex, prev: startIndex });
  const [dragging, setDragging] = useState(false);
  const [reduced, setReduced] = useState(false);
  const uid = useId();

  const active = Math.min(sel.cur, Math.max(0, count - 1));
  const stop = stops[active];
  const stopPos = useCallback((i: number) => (i + 0.5) / Math.max(1, count), [count]);

  const rootRef = useRef<HTMLDivElement>(null);
  const tapeRef = useRef<HTMLDivElement>(null);
  const inView = useRef(true);
  const spring = useRef({ pos: stopPos(startIndex), vel: 0, goal: stopPos(startIndex), drag: false, raf: 0 });

  const paint = useCallback(() => {
    tapeRef.current?.style.setProperty('--pos', spring.current.pos.toFixed(4));
  }, []);

  const run = useCallback(() => {
    const s = spring.current;
    if (s.raf) return;
    if (reduced || !inView.current) {
      s.pos = s.goal;
      s.vel = 0;
      paint();
      return;
    }
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let n = 0; n < steps; n++) {
        const k = s.drag ? STIFFNESS * 3 : STIFFNESS;
        const d = s.drag ? DAMPING * 1.8 : DAMPING;
        s.vel += (k * (s.goal - s.pos) - d * s.vel) * h;
        s.pos += s.vel * h;
      }
      paint();
      if (!s.drag && Math.abs(s.goal - s.pos) < 0.0004 && Math.abs(s.vel) < 0.002) {
        s.pos = s.goal;
        s.vel = 0;
        paint();
        s.raf = 0;
        return;
      }
      s.raf = requestAnimationFrame(loop);
    };
    s.raf = requestAnimationFrame(loop);
  }, [reduced, paint]);

  const select = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(count - 1, i));
      setSel((s) => (s.cur === next ? s : { cur: next, prev: s.cur }));
      spring.current.goal = stopPos(next);
      run();
    },
    [count, stopPos, run],
  );

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
    const io = new IntersectionObserver(([e]) => {
      inView.current = e.isIntersecting;
    });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const s = spring.current;
    cancelAnimationFrame(s.raf);
    s.raf = 0;
    s.goal = stopPos(active);
    s.pos = s.goal;
    s.vel = 0;
    paint();
  }, [count, stopPos, paint]);

  useEffect(() => () => cancelAnimationFrame(spring.current.raf), []);

  const target = toNumber(stop?.price ?? '');
  const decimals = target !== null && !Number.isInteger(target) ? 2 : 0;
  const maxCols = useMemo(
    () =>
      stops.reduce((m, st) => {
        const n = toNumber(st.price);
        return n === null ? m : Math.max(m, formatPrice(n, Number.isInteger(n) ? 0 : 2).length);
      }, 1),
    [stops],
  );

  const allItems = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    stops.forEach((s) =>
      splitItems(s.items).forEach((item) => {
        const key = item.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          out.push(item);
        }
      }),
    );
    return out;
  }, [stops]);

  const includedIn = useCallback(
    (i: number) => new Set(splitItems(stops[i]?.items ?? '').map((s) => s.toLowerCase())),
    [stops],
  );
  const now = includedIn(active);
  const before = includedIn(sel.prev);
  const changed = allItems.filter((item) => now.has(item.toLowerCase()) !== before.has(item.toLowerCase()));

  const posFromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const x = rtl ? rect.right - e.clientX : e.clientX - rect.left;
    return Math.max(stopPos(0), Math.min(stopPos(count - 1), x / rect.width));
  };

  const nearest = (pos: number) => Math.round(pos * count - 0.5);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus({ preventScroll: true });
    const pos = posFromPointer(e);
    const s = spring.current;
    s.drag = true;
    s.goal = pos;
    setDragging(true);
    const i = nearest(pos);
    setSel((v) => (v.cur === i ? v : { cur: i, prev: v.cur }));
    run();
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!spring.current.drag) return;
    const pos = posFromPointer(e);
    spring.current.goal = pos;
    const i = nearest(pos);
    setSel((v) => (v.cur === i ? v : { cur: i, prev: v.cur }));
    run();
  };

  const onPointerEnd = () => {
    const s = spring.current;
    if (!s.drag) return;
    s.drag = false;
    setDragging(false);
    select(nearest(s.goal));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const moves: Record<string, number> = {
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
      ArrowUp: 1,
      ArrowDown: -1,
      PageUp: 1,
      PageDown: -1,
    };
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      select(e.key === 'Home' ? 0 : count - 1);
      return;
    }
    const move = moves[e.key];
    if (move === undefined) return;
    e.preventDefault();
    select(active + move);
  };

  if (!stop) return null;

  const priceText = target === null ? stop.price : formatPrice(target, decimals);
  const fitLength = target === null ? stop.price.length : priceText.length;
  const rootStyle = { '--ps-accent': accentColor } as CSSProperties;
  const tapeStyle = { '--pos': stopPos(active) } as CSSProperties;
  const valueText = `${stop.name}, ${target === null ? stop.price : `${currencySymbol}${priceText}`}`;

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <div className={styles.inner}>
        <div className={styles.measure}>
          <p className={styles.topline} aria-hidden="true">
            <span>Package</span>
            <span>
              {pad(active + 1)} / {pad(count)}
            </span>
          </p>
          <div
            ref={tapeRef}
            className={styles.tape}
            style={tapeStyle}
            data-dragging={dragging || undefined}
            role="slider"
            tabIndex={0}
            aria-label="Choose a package"
            aria-valuemin={1}
            aria-valuemax={count}
            aria-valuenow={active + 1}
            aria-valuetext={valueText}
            aria-controls={`${uid}-card`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onKeyDown={onKeyDown}
          >
            <span className={styles.track} aria-hidden="true" />
            <span className={styles.fill} aria-hidden="true" />
            {stops.map((_, i) => (
              <span
                key={i}
                className={styles.stopMark}
                data-on={i <= active || undefined}
                style={{ insetInlineStart: `${stopPos(i) * 100}%` }}
                aria-hidden="true"
              />
            ))}
            <span className={styles.thumb} aria-hidden="true" />
          </div>

          <div className={styles.labels} style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
            {stops.map((s, i) => (
              <button
                key={i}
                type="button"
                className={styles.label}
                data-on={i === active || undefined}
                tabIndex={-1}
                aria-hidden="true"
                onClick={() => select(i)}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <article id={`${uid}-card`} className={styles.card}>
          <p
            className={styles.priceRow}
            style={{ '--len': fitLength, '--cur': currencySymbol.length } as CSSProperties}
          >
            <span className={styles.well}>
              {target !== null && (
                <span className={styles.currency} aria-hidden="true">
                  {currencySymbol}
                </span>
              )}
              {target === null ? (
                <span className={styles.price}>{priceText}</span>
              ) : (
                <span className={styles.odometer} aria-hidden="true">
                  {Array.from({ length: maxCols }, (_, k) => maxCols - 1 - k).map((j) => (
                    <OdometerColumn key={j} index={j} char={priceText[priceText.length - 1 - j]} />
                  ))}
                </span>
              )}
            </span>
            {target !== null && <span className={styles.srOnly}>{`${currencySymbol}${priceText}`}</span>}
            {target !== null && priceNote && <span className={styles.priceNote}>{priceNote}</span>}
          </p>

          <div className={styles.cols}>
            <div className={styles.head}>
              <h3 key={stop.name} className={styles.name}>
                {stop.name}
              </h3>
              {stop.tagline && (
                <p key={`${active}-t`} className={styles.tagline}>
                  {stop.tagline}
                </p>
              )}
            </div>

            {allItems.length > 0 && (
              <ul className={styles.items}>
                {allItems.map((item) => {
                  const on = now.has(item.toLowerCase());
                  const rank = changed.indexOf(item);
                  const delay = rank < 0 || reduced ? 0 : (on ? rank : changed.length - 1 - rank) * STAGGER_MS;
                  return (
                    <li
                      key={item}
                      className={styles.item}
                      data-on={on || undefined}
                      style={{ '--d': `${delay}ms` } as CSSProperties}
                    >
                      <span className={styles.itemText}>{item}</span>
                      <span className={styles.mark} aria-hidden="true" />
                      <span className={styles.srOnly}>{on ? ', included' : ', not included'}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
```

```css
@font-face {
  font-family: 'Inter Tight';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('./fonts/inter-tight-latin.woff2') format('woff2');
}

.root {
  --ps-paper: #f2f1ed;
  --ps-ink: #111110;
  --ps-mute: #66655f;
  --ps-rule: color-mix(in srgb, var(--ps-ink) 16%, transparent);
  --ps-font: 'Inter Tight', 'Helvetica Neue', Arial, system-ui, sans-serif;

  position: relative;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding: clamp(20px, 5cqw, 56px);
  background: var(--ps-paper);
  color: var(--ps-ink);
  font-family: var(--ps-font);
  font-synthesis: none;
  -webkit-font-smoothing: antialiased;
}

.root *,
.root *::before,
.root *::after {
  box-sizing: border-box;
}

.inner {
  display: grid;
  gap: clamp(20px, 3.5cqw, 40px);
}

.topline {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
}

.topline span:last-child {
  color: var(--ps-mute);
}

/* slider */
.tape {
  position: relative;
  block-size: 44px;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
  outline: none;
}

.tape[data-dragging] {
  cursor: grabbing;
}

.tape:focus-visible {
  outline: 2px solid var(--ps-ink);
  outline-offset: 6px;
}

.track,
.fill {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 50%;
  block-size: 2px;
  translate: 0 -50%;
  background: var(--ps-rule);
}

.fill {
  inset-inline-end: auto;
  inline-size: calc(var(--pos) * 100%);
  background: var(--ps-ink);
}

.stopMark {
  position: absolute;
  inset-block-start: 50%;
  inline-size: 10px;
  block-size: 10px;
  translate: -50% -50%;
  background: var(--ps-paper);
  border: 2px solid var(--ps-ink);
  transition: background-color 0.2s;
}

.stopMark:dir(rtl) {
  translate: 50% -50%;
}

.stopMark[data-on] {
  background: var(--ps-ink);
}

.thumb {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: calc(var(--pos) * 100%);
  inline-size: 26px;
  block-size: 26px;
  translate: -50% -50%;
  background: var(--ps-accent);
  transition: scale 0.18s ease-out;
}

.thumb:dir(rtl) {
  translate: 50% -50%;
}

.tape[data-dragging] .thumb {
  scale: 1.18;
}

.labels {
  display: grid;
  margin-block-start: 6px;
}

.label {
  appearance: none;
  background: none;
  border: 0;
  margin: 0;
  padding: 6px 4px;
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.25;
  color: var(--ps-mute);
  text-align: center;
  cursor: pointer;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
  transition: color 0.2s;
}

.label[data-on] {
  color: var(--ps-ink);
  font-weight: 700;
}

@media (hover: hover) {
  .label:hover {
    color: var(--ps-ink);
  }
}

/* package */
.card {
  display: grid;
  gap: clamp(20px, 3.5cqw, 40px);
  padding-block-start: clamp(16px, 2.5cqw, 28px);
  border-block-start: 2px solid var(--ps-ink);
  min-inline-size: 0;
}

.priceRow {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  margin: 0;
  min-inline-size: 0;
  --fit: min(20cqw, 100cqw / (var(--len) * 0.6 + var(--cur) * 0.2 + 0.9));
  font-size: max(30px, var(--fit));
  line-height: 1;
}

.well {
  --r: 1.539em;
  position: relative;
  display: inline-flex;
  align-items: center;
  max-inline-size: 100%;
  padding: 0.07em 0.14em;
  border-radius: 0.16em;
  background: linear-gradient(180deg, #1d1d1b, #0f0f0e);
  color: var(--ps-paper);
  box-shadow:
    inset 0 0.03em 0.07em rgb(0 0 0 / 0.7),
    0 0.025em 0 rgb(255 255 255 / 0.85),
    0 0.14em 0.3em -0.06em rgb(17 17 16 / 0.28);
}

.well::after {
  content: '';
  position: absolute;
  inset: 0.07em 0.14em;
  border-radius: 0.08em;
  pointer-events: none;
  background: linear-gradient(180deg, rgb(0 0 0 / 0.6), transparent 24%, transparent 76%, rgb(0 0 0 / 0.6));
}

.currency {
  padding-inline: 0.05em 0.08em;
  font-size: 0.34em;
  font-weight: 600;
  line-height: 1;
  white-space: pre;
  color: color-mix(in srgb, var(--ps-paper) 75%, transparent);
}

.price {
  padding-inline: 0.04em;
  font-size: 0.5em;
  font-weight: 700;
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
  min-inline-size: 0;
}

.odometer {
  display: inline-flex;
  font-variant-numeric: tabular-nums;
}

.col {
  position: relative;
  display: block;
  block-size: 1em;
  inline-size: 0.6em;
  overflow: hidden;
  perspective: 3.2em;
  transition: inline-size 0.45s cubic-bezier(0.3, 0.8, 0.3, 1);
}

.col[data-kind='sep'] {
  inline-size: 0.3em;
}

.col[data-kind='off'] {
  inline-size: 0;
}

.drum {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: translateZ(calc(var(--r) * -1)) rotateX(calc(var(--v) * 36deg));
  transition: transform calc(0.55s + var(--col) * 0.09s) cubic-bezier(0.22, 0.85, 0.25, 1);
}

.col[data-kind='sep'] .drum,
.col[data-kind='off'] .drum {
  visibility: hidden;
}

.face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  backface-visibility: hidden;
  font-size: 1em;
  font-weight: 700;
  line-height: 1;
  transform: rotateX(calc(var(--i) * -36deg)) translateZ(var(--r));
}

.sep {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: end center;
  padding-block-end: 0.04em;
  font-weight: 700;
  line-height: 1;
  opacity: 0;
  color: color-mix(in srgb, var(--ps-paper) 80%, transparent);
}

.col[data-kind='sep'] .sep {
  opacity: 1;
}

.priceNote {
  flex-basis: 100%;
  margin-block-start: clamp(12px, 1.8cqw, 20px);
  font-size: 15px;
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: 0;
  color: var(--ps-mute);
}

.cols {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  column-gap: clamp(24px, 5cqw, 64px);
  row-gap: 28px;
  align-items: start;
}

.head {
  min-inline-size: 0;
}

.name {
  margin: 0;
  font-size: clamp(28px, 4.6cqw, 52px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.035em;
  overflow-wrap: anywhere;
  animation: ps-rise 0.4s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.tagline {
  margin: 14px 0 0;
  max-inline-size: 30ch;
  font-size: 18px;
  font-weight: 400;
  line-height: 1.4;
  color: var(--ps-mute);
  overflow-wrap: anywhere;
  animation: ps-rise 0.4s 60ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.items {
  list-style: none;
  margin: 0;
  padding: 0;
  border-block-end: 1px solid var(--ps-rule);
}

.item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding-block: 14px;
  border-block-start: 1px solid var(--ps-rule);
  font-size: 17px;
  font-weight: 500;
  line-height: 1.3;
  color: color-mix(in srgb, var(--ps-ink) 42%, var(--ps-paper));
  transition: color 0.25s var(--d, 0ms);
}

.item[data-on] {
  color: var(--ps-ink);
}

.itemText {
  overflow-wrap: anywhere;
}

.mark {
  inline-size: 12px;
  block-size: 12px;
  border: 2px solid color-mix(in srgb, var(--ps-ink) 30%, var(--ps-paper));
  background: transparent;
  transition:
    background-color 0.25s var(--d, 0ms),
    border-color 0.25s var(--d, 0ms),
    scale 0.3s var(--d, 0ms) cubic-bezier(0.3, 1.5, 0.5, 1);
}

.item[data-on] .mark {
  background: var(--ps-accent);
  border-color: var(--ps-accent);
  scale: 1.15;
}

.srOnly {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@keyframes ps-rise {
  from {
    opacity: 0;
    translate: 0 10px;
  }
}

@container (max-width: 640px) {
  .cols {
    grid-template-columns: minmax(0, 1fr);
  }
  .label {
    font-size: 13px;
    padding-inline: 2px;
  }
  .name {
    font-size: 32px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .name,
  .tagline {
    animation: none;
  }
  .item,
  .mark,
  .stopMark,
  .thumb,
  .label,
  .col,
  .drum {
    transition: none;
  }
}
```
