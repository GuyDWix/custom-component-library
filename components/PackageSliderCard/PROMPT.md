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
const PRICE_MS = 520;
const STAGGER_MS = 70;
const TAPE_MARKS = 12;

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

export default function PackageSliderCard({
  stops = defaultStops,
  accentColor = '#6e1f2f',
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
  const [shown, setShown] = useState<number | null>(target);
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    const from = shownRef.current;
    if (target === null || from === null || reduced || from === target) {
      setShown(target);
      return;
    }
    const start = performance.now();
    let id = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / PRICE_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from + (target - from) * eased);
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, reduced]);

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

  const priceText =
    target === null ? stop.price : formatPrice(shown ?? target, decimals);
  const rootStyle = { '--ps-accent': accentColor } as CSSProperties;
  const tapeStyle = { '--pos': stopPos(active) } as CSSProperties;
  const valueText = `${stop.name}, ${target === null ? stop.price : `${currencySymbol}${formatPrice(target, decimals)}`}`;

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <span className={styles.light} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.measure}>
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
            <span className={styles.tapeFace} aria-hidden="true" />
            <span className={styles.wash} aria-hidden="true" />
            <span className={styles.ticks} aria-hidden="true" />
            {Array.from({ length: TAPE_MARKS - 1 }, (_, k) => (
              <span
                key={k}
                className={styles.numeral}
                style={{ insetInlineStart: `${((k + 1) / TAPE_MARKS) * 100}%` }}
                aria-hidden="true"
              >
                {k + 1}
              </span>
            ))}
            {stops.map((_, i) => (
              <span
                key={i}
                className={styles.stopMark}
                data-on={i <= active || undefined}
                style={{ insetInlineStart: `${stopPos(i) * 100}%` }}
                aria-hidden="true"
              />
            ))}
            <span className={styles.thumb} aria-hidden="true">
              <span className={styles.needle} />
              <span className={styles.knob} />
            </span>
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
          <div className={styles.cardInner}>
            <span className={styles.cardGrain} aria-hidden="true" />

            <div className={styles.head}>
              <span className={styles.index} aria-hidden="true">
                {pad(active + 1)} / {pad(count)}
              </span>
              <h3 key={stop.name} className={styles.name}>
                {stop.name}
              </h3>
              {stop.tagline && (
                <p key={`${active}-t`} className={styles.tagline}>
                  {stop.tagline}
                </p>
              )}
            </div>

            <p className={styles.priceRow}>
              {target !== null && <span className={styles.currency}>{currencySymbol}</span>}
              <span className={styles.price}>{priceText}</span>
              {target !== null && priceNote && <span className={styles.priceNote}>{priceNote}</span>}
            </p>

            <span className={styles.stitch} aria-hidden="true" />

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
                      <span className={styles.mark} aria-hidden="true">
                        <svg className={styles.check} viewBox="0 0 16 16">
                          <path d="M4 8.4l2.6 2.6L12 5.4" />
                        </svg>
                      </span>
                      <span className={styles.itemText}>{item}</span>
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
.root {
  --ps-accent: #6e1f2f;
  --ps-oat: #f5efe3;
  --ps-oat-deep: #e9dfcc;
  --ps-tape: #f8f2e6;
  --ps-stage: #ece4d5;
  --ps-ink: #2b2220;
  --ps-muted: rgba(43, 34, 32, 0.56);
  --ps-hairline: rgba(43, 34, 32, 0.12);
  --ps-font-display: 'Fraunces', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
  --ps-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --ps-font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  --ps-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ps-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --ps-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.4  0 0 0 0 0.32  0 0 0 0 0.24  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: 48px;
  padding-inline: 18px;
  border-radius: 28px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--ps-stage) 70%, #fff) 0%, var(--ps-stage) 100%);
  color: var(--ps-ink);
  font-family: var(--ps-font-ui);
}

.light,
.grain {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}

.light {
  background:
    radial-gradient(50% 40% at 50% 0%, rgba(255, 255, 255, 0.75), transparent 70%),
    radial-gradient(40% 35% at 85% 100%, color-mix(in srgb, var(--ps-accent) 10%, transparent), transparent 70%);
}

.grain {
  background-image: var(--ps-noise);
  opacity: 0.18;
  mix-blend-mode: multiply;
}

.inner {
  display: grid;
  gap: 28px;
  inline-size: min(100%, 560px);
  margin-inline: auto;
}

.measure {
  display: grid;
  gap: 12px;
  padding-block-start: 14px;
}

.tape {
  --pos: 0.125;

  position: relative;
  block-size: 52px;
  border-radius: 6px;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.85) inset,
    0 0 0 1px color-mix(in srgb, var(--ps-ink) 10%, transparent),
    0 10px 22px -16px rgba(60, 30, 20, 0.45),
    0 2px 4px -2px rgba(60, 30, 20, 0.2);
  transition: box-shadow 200ms var(--ps-ease);
}

.tape[data-dragging] {
  cursor: grabbing;
}

.tape:focus-visible {
  box-shadow:
    0 0 0 3px var(--ps-stage),
    0 0 0 5px var(--ps-accent),
    0 10px 22px -16px rgba(60, 30, 20, 0.45);
}

.tapeFace,
.wash,
.ticks {
  position: absolute;
  inset-block: 0;
  border-radius: inherit;
  pointer-events: none;
}

.tapeFace {
  inset-inline: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.55) 0%, transparent 40%, rgba(120, 90, 60, 0.07) 100%),
    var(--ps-noise),
    var(--ps-tape);
  background-blend-mode: normal, multiply, normal;
}

.wash {
  inset-inline-start: 0;
  inline-size: calc(var(--pos) * 100%);
  background: linear-gradient(90deg, color-mix(in srgb, var(--ps-accent) 4%, transparent), color-mix(in srgb, var(--ps-accent) 13%, transparent));
  border-start-end-radius: 0;
  border-end-end-radius: 0;
}

.ticks {
  inset-inline: 0;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--ps-accent) 70%, transparent) 1.5px, transparent 1.5px) 0 0 / calc(100% / 12) 17px repeat-x,
    linear-gradient(90deg, color-mix(in srgb, var(--ps-accent) 45%, transparent) 1px, transparent 1px) 0 0 / calc(100% / 24) 11px repeat-x,
    linear-gradient(90deg, color-mix(in srgb, var(--ps-accent) 30%, transparent) 1px, transparent 1px) 0 0 / calc(100% / 96) 6px repeat-x,
    linear-gradient(90deg, color-mix(in srgb, var(--ps-accent) 30%, transparent) 1px, transparent 1px) 0 100% / calc(100% / 96) 5px repeat-x;
}

.numeral {
  position: absolute;
  inset-block-start: 20px;
  translate: -50% 0;
  font-family: var(--ps-font-mono);
  font-size: 9.5px;
  font-weight: 500;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  color: color-mix(in srgb, var(--ps-ink) 52%, transparent);
  pointer-events: none;
}

.stopMark {
  position: absolute;
  inset-block: 0;
  inline-size: 0;
  pointer-events: none;
}

.stopMark::before {
  content: '';
  position: absolute;
  inset-block-end: 7px;
  inset-inline-start: -3.5px;
  inline-size: 7px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--ps-tape);
  box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--ps-accent) 55%, transparent);
  transition:
    background-color 260ms var(--ps-ease),
    box-shadow 260ms var(--ps-ease);
}

.stopMark[data-on]::before {
  background: var(--ps-accent);
  box-shadow: inset 0 0 0 1.5px var(--ps-accent);
}

.thumb {
  position: absolute;
  inset-block: -12px 0;
  inset-inline-start: calc(var(--pos) * 100%);
  inline-size: 0;
  pointer-events: none;
}

.needle {
  position: absolute;
  inset-block: 10px 0;
  inset-inline-start: -1px;
  inline-size: 2px;
  background: var(--ps-accent);
  border-radius: 1px;
}

.knob {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: -12px;
  inline-size: 24px;
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle at 36% 30%, color-mix(in srgb, var(--ps-accent) 60%, #fff) 0%, transparent 46%),
    var(--ps-accent);
  box-shadow:
    0 0 0 2.5px var(--ps-oat),
    0 6px 12px -4px color-mix(in srgb, var(--ps-accent) 70%, #000),
    0 1px 2px rgba(0, 0, 0, 0.18);
  transition: scale 260ms var(--ps-spring);
}

.tape[data-dragging] .knob {
  scale: 1.14;
}

.labels {
  display: grid;
  gap: 4px;
}

.label {
  min-inline-size: 0;
  align-self: start;
  margin-block: 4px;
  padding: 0 2px;
  border: 0;
  background: none;
  cursor: pointer;
  font-family: var(--ps-font-ui);
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: -0.005em;
  text-align: center;
  color: var(--ps-muted);
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 220ms var(--ps-ease);
}

.label:hover {
  color: var(--ps-ink);
}

.label[data-on] {
  color: var(--ps-accent);
  font-weight: 650;
}

.card {
  position: relative;
  padding: 7px;
  border-radius: 22px;
  background:
    repeating-linear-gradient(90deg, color-mix(in srgb, var(--ps-accent) 38%, transparent) 0 1px, transparent 1px 5px),
    var(--ps-oat-deep);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--ps-ink) 10%, transparent),
    0 28px 50px -30px rgba(70, 35, 25, 0.45),
    0 8px 16px -10px rgba(70, 35, 25, 0.22);
}

.cardInner {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: grid;
  gap: 18px;
  padding: 26px 24px 26px;
  border-radius: 16px;
  background:
    radial-gradient(90% 60% at 20% 0%, rgba(255, 255, 255, 0.7), transparent 70%),
    var(--ps-oat);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ps-ink) 9%, transparent);
}

.cardGrain {
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: var(--ps-noise);
  opacity: 0.14;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.head {
  display: grid;
  gap: 6px;
}

.index {
  font-family: var(--ps-font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  font-variant-numeric: tabular-nums;
  color: var(--ps-accent);
}

.name {
  margin: 0;
  font-family: var(--ps-font-display);
  font-size: clamp(26px, 7.4cqi, 36px);
  font-weight: 500;
  line-height: 1.04;
  letter-spacing: -0.025em;
  color: var(--ps-ink);
  overflow-wrap: anywhere;
  text-wrap: balance;
  animation: rise 520ms var(--ps-ease) both;
}

.tagline {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--ps-muted);
  overflow-wrap: anywhere;
  animation: rise 520ms var(--ps-ease) 60ms both;
}

@keyframes rise {
  from {
    opacity: 0;
    translate: 0 6px;
    filter: blur(3px);
  }
  to {
    opacity: 1;
    translate: 0 0;
    filter: blur(0);
  }
}

.priceRow {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 6px;
  margin: 0;
  min-inline-size: 0;
}

.currency {
  align-self: flex-start;
  padding-block-start: 6px;
  font-family: var(--ps-font-display);
  font-size: 20px;
  font-weight: 500;
  color: var(--ps-accent);
}

.price {
  min-inline-size: 0;
  font-family: var(--ps-font-display);
  font-size: clamp(44px, 13cqi, 60px);
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.035em;
  font-variant-numeric: tabular-nums lining-nums;
  color: var(--ps-ink);
  overflow-wrap: anywhere;
}

.priceNote {
  font-family: var(--ps-font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ps-muted);
}

.stitch {
  display: block;
  block-size: 0;
  border-block-start: 1.5px dashed color-mix(in srgb, var(--ps-accent) 45%, transparent);
}

.items {
  display: grid;
  gap: 11px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-inline-size: 0;
  font-size: 14.5px;
  line-height: 1.4;
  color: color-mix(in srgb, var(--ps-ink) 38%, transparent);
  transition: color 300ms var(--ps-ease) var(--d, 0ms);
}

.item[data-on] {
  color: var(--ps-ink);
}

.mark {
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  inline-size: 20px;
  aspect-ratio: 1;
  margin-block-start: 0;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ps-ink) 22%, transparent);
}

.mark::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--ps-accent);
  scale: 0.2;
  opacity: 0;
  transition:
    scale 420ms var(--ps-spring) var(--d, 0ms),
    opacity 200ms var(--ps-ease) var(--d, 0ms);
}

.item[data-on] .mark::before {
  scale: 1;
  opacity: 1;
}

.check {
  position: relative;
  inline-size: 13px;
  block-size: 13px;
  fill: none;
  stroke: var(--ps-oat);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 14;
  stroke-dashoffset: 14;
  transition: stroke-dashoffset 320ms var(--ps-ease) calc(var(--d, 0ms) + 120ms);
}

.item[data-on] .check {
  stroke-dashoffset: 0;
}

.itemText {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.srOnly {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@container (min-width: 640px) {
  .root {
    padding-block: 64px;
  }

  .cardInner {
    padding: 32px 34px;
    gap: 20px;
  }

  .items {
    grid-template-columns: 1fr 1fr;
    gap: 12px 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .name,
  .tagline {
    animation: none;
  }

  .item,
  .mark::before,
  .check,
  .knob,
  .stopMark::before,
  .label {
    transition: none;
  }
}
```
