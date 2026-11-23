Create a custom element called "Image-Filled Best Sellers". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: products (name, photo, units sold), number shown, unit label, highlight color, heading, rank label. Add other settings if they help.

```tsx
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export interface BestsellerProduct {
  name: string;
  units: number;
  photo?: string;
}

export interface ImageFilledBestsellersProps {
  products?: BestsellerProduct[];
  numberShown?: number;
  unitLabel?: string;
  highlightColor?: string;
  heading?: string;
  rankLabel?: string;
  className?: string;
}

const Q = '?w=1200&h=360&fit=crop&auto=format&q=70';
const shot = (u: string) => u + Q;

export const defaultProducts: BestsellerProduct[] = [
  { name: 'Signature classic', units: 1284, photo: shot('https://images.unsplash.com/photo-1509440159596-0249088772ff') },
  { name: 'Customer favourite', units: 1032, photo: shot('https://images.unsplash.com/photo-1555507036-ab1f4038808a') },
  { name: 'Everyday essential', units: 846, photo: shot('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085') },
  { name: 'Seasonal special', units: 612, photo: shot('https://images.unsplash.com/photo-1565299624946-b28f40a0ae38') },
  { name: 'Starter pick', units: 438, photo: shot('https://images.unsplash.com/photo-1512621776951-a57141f2eefd') },
  { name: 'Limited edition', units: 297, photo: shot('https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445') },
];

type Phase = 'static' | 'armed' | 'play';

const MIN_FILL = 0.16;
const LIST_HELP = 'Hover or tap a bar to see the details; arrow keys, Home and End move between bars.';
const numberFormat = new Intl.NumberFormat('en-US');
const compactFormat = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const COMPACT_FROM = 100000;
const pad = (n: number) => String(n).padStart(2, '0');
const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default function ImageFilledBestsellers({
  products = defaultProducts,
  numberShown = 5,
  unitLabel = 'sold',
  highlightColor = '#d23a1b',
  heading = 'Best sellers',
  rankLabel = 'No.',
  className,
}: ImageFilledBestsellersProps) {
  const ranked = useMemo(
    () =>
      products
        .map((p) => ({ ...p, units: Math.max(0, Number(p.units) || 0) }))
        .sort((a, b) => b.units - a.units)
        .slice(0, Math.max(1, Math.round(numberShown))),
    [products, numberShown],
  );
  const top = ranked[0]?.units || 1;

  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState<Phase>('static');
  const [inView, setInView] = useState(true);
  const rootRef = useRef<HTMLElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  useIsoLayoutEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mq.matches) setPhase('armed');
    const sync = () => mq.matches && setPhase('static');
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setPhase((p) => (p === 'armed' ? 'play' : p));
      },
      { threshold: 0.2 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const current = Math.min(active, ranked.length - 1);
  const chosen = ranked[current];

  const onKeyDown = (e: KeyboardEvent<HTMLOListElement>) => {
    const last = ranked.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(current + 1, last),
      ArrowRight: Math.min(current + 1, last),
      ArrowUp: Math.max(current - 1, 0),
      ArrowLeft: Math.max(current - 1, 0),
      Home: 0,
      End: last,
    };
    const next = moves[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setActive(next);
    buttons.current[next]?.focus();
  };

  const armed = phase === 'armed';
  const playing = phase === 'play';
  const rootStyle = { '--ifb-highlight': highlightColor } as CSSProperties;

  return (
    <section
      ref={rootRef}
      className={cx(styles.root, !inView && styles.paused, className)}
      style={rootStyle}
      aria-label={heading}
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>{heading}</h2>
          </div>

          {chosen && (
            <div className={styles.readout} aria-live="polite" aria-atomic="true">
              <div key={current} className={cx(styles.readoutCard, phase !== 'static' && styles.readoutSwing)}>
                <span className={styles.readoutRank}>
                  {rankLabel} {current + 1}
                </span>
                <span className={styles.readoutName}>{chosen.name}</span>
                <span className={styles.readoutCount}>
                  <span className={styles.readoutNumber}>{numberFormat.format(chosen.units)}</span>
                  <span className={styles.readoutUnit}>{unitLabel}</span>
                </span>
              </div>
            </div>
          )}
        </header>

        <ol className={styles.list} aria-description={LIST_HELP} onKeyDown={onKeyDown}>
          {ranked.map((product, i) => {
            const fill = Math.max(MIN_FILL, product.units / top);
            const count = numberFormat.format(product.units);
            const shortCount = product.units >= COMPACT_FROM ? compactFormat.format(product.units) : count;
            const rowStyle = {
              '--fill': fill.toFixed(4),
              '--i': i,
            } as CSSProperties;
            const isActive = i === current;
            return (
              <li key={`${product.name}-${i}`} className={cx(styles.row, i === 0 && styles.lead)} style={rowStyle}>
                <span className={cx(styles.rank, armed && styles.rankArmed, playing && styles.rankPlay)} aria-hidden="true">
                  {pad(i + 1)}
                </span>
                <button
                  ref={(el) => {
                    buttons.current[i] = el;
                  }}
                  type="button"
                  className={cx(styles.track, isActive && styles.trackActive)}
                  aria-current={isActive ? 'true' : undefined}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(i)}
                >
                  <span className={styles.srOnly}>
                    {rankLabel} {i + 1}, {product.name}, {count} {unitLabel}
                  </span>
                  <span className={styles.thumb} aria-hidden="true">
                    {product.photo ? (
                      <img className={styles.photo} src={product.photo} alt="" draggable={false} />
                    ) : (
                      <span className={styles.stripes} />
                    )}
                  </span>
                  <span className={styles.groove} aria-hidden="true" />
                  <span className={cx(styles.fill, armed && styles.fillArmed, playing && styles.fillPlay)} aria-hidden="true">
                    <span className={styles.reveal}>
                      {product.photo ? (
                        <img className={styles.photo} src={product.photo} alt="" draggable={false} />
                      ) : (
                        <span className={styles.stripes} />
                      )}
                      <span className={styles.scrim} />
                    </span>
                    <span className={cx(styles.edge, playing && styles.edgePlay)} />
                  </span>
                  <span className={cx(styles.name, armed && styles.lateArmed, playing && styles.namePlay)} aria-hidden="true">
                    {product.name}
                  </span>
                  <span className={cx(styles.tag, armed && styles.lateArmed, playing && styles.tagPlay)} aria-hidden="true">
                    <span className={styles.tagBody}>
                      <span className={styles.tagCount}>{shortCount}</span>
                      <span className={styles.tagUnit}>{unitLabel}</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
```

```css
@property --ifb-p {
  syntax: '<percentage>';
  inherits: true;
  initial-value: 100%;
}

.root {
  --ifb-highlight: #d23a1b;
  --ifb-surface: #f4f3ef;
  --ifb-card: #ffffff;
  --ifb-ink: #16181d;
  --ifb-muted: #555b66;
  --ifb-line: rgba(22, 24, 29, 0.14);
  --ifb-shadow: 22, 24, 29;
  --ifb-font: 'Avenir Next', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --ifb-play: running;

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: 40px;
  padding-inline: 20px;
  border-radius: 20px;
  background: var(--ifb-surface);
  color: var(--ifb-ink);
  font-family: var(--ifb-font);
  box-shadow: inset 0 0 0 1px var(--ifb-line);
}

.paused {
  --ifb-play: paused;
}

.inner {
  --tagw: 0px;
  display: grid;
  gap: 32px;
  max-inline-size: 1080px;
  margin-inline: auto;
}

.header {
  display: grid;
  gap: 24px;
  align-items: end;
}

.titles {
  display: grid;
  gap: 16px;
  min-inline-size: 0;
}

.heading {
  margin: 0;
  font-size: 40px;
  font-weight: 750;
  line-height: 1.05;
  letter-spacing: -0.03em;
  text-wrap: balance;
  overflow-wrap: break-word;
}

.readout {
  justify-self: start;
  inline-size: min(100%, 280px);
}

.readoutCard {
  display: grid;
  gap: 4px;
  padding: 16px 20px;
  border-radius: 12px;
  background: var(--ifb-card);
  box-shadow: 0 0 0 1px var(--ifb-line), 0 6px 16px -10px rgba(var(--ifb-shadow), 0.25);
}

.readoutSwing {
  animation: settle 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-play-state: var(--ifb-play);
}

.readoutRank {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ifb-highlight);
}

.readoutName {
  font-size: 19px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.readoutCount {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 8px;
  border-block-start: 1px dashed var(--ifb-line);
  padding-block-start: 10px;
  margin-block-start: 8px;
}

.readoutNumber {
  font-size: 36px;
  font-weight: 750;
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.readoutUnit {
  font-size: 15px;
  color: var(--ifb-muted);
  overflow-wrap: anywhere;
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}

.row {
  --h: 60px;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.lead {
  --h: 84px;
}

.rank {
  font-size: 22px;
  font-weight: 750;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--ifb-highlight);
  font-variant-numeric: tabular-nums lining-nums;
}

.rankArmed {
  opacity: 0;
}

.rankPlay {
  animation: rise 700ms cubic-bezier(0.16, 1, 0.3, 1) calc(var(--i) * 110ms) both;
}

.track {
  --lift: 0;
  --zoom: 1;
  position: relative;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  grid-template-rows: minmax(40px, auto) 10px;
  column-gap: 12px;
  row-gap: 10px;
  align-items: center;
  inline-size: 100%;
  min-block-size: 64px;
  margin: 0;
  padding: 10px 12px 10px 10px;
  border: 0;
  border-radius: 14px;
  background: var(--ifb-card);
  box-shadow: 0 0 0 1px var(--ifb-line);
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: box-shadow 200ms ease;
}

.track:hover {
  --lift: 1;
  --zoom: 1.05;
}

.track:focus-visible {
  outline: 3px solid var(--ifb-ink);
  outline-offset: 3px;
}

.trackActive {
  --lift: 1;
  box-shadow: 0 0 0 2px var(--ifb-highlight);
}

.thumb {
  grid-row: 1 / span 2;
  position: relative;
  inline-size: 48px;
  block-size: 48px;
  border-radius: 10px;
  overflow: hidden;
  background: #d9dadd;
}

.photo {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  pointer-events: none;
  transform: scale(var(--zoom));
  transition: transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
}

.stripes {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(115deg, #c9cbd0 0 14px, #dcdde1 14px 28px);
}

.groove,
.fill {
  grid-column: 2 / -1;
  grid-row: 2;
  block-size: 10px;
  border-radius: 999px;
}

.groove {
  inline-size: calc(100% - var(--tagw));
  background: rgba(var(--ifb-shadow), 0.08);
}

.fill {
  position: relative;
  inline-size: calc((100% - var(--tagw)) * var(--fill));
  overflow: hidden;
  background: #c9cbd0;
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

.fillArmed {
  --ifb-p: 0%;
}

.fillPlay {
  animation: grow 1100ms cubic-bezier(0.22, 1, 0.36, 1) calc(var(--i) * 110ms + 100ms) both;
}

.reveal {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 999px;
  clip-path: inset(0 calc(100% - var(--ifb-p)) 0 0 round 999px);
}

.scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(10, 12, 16, 0.12), transparent 70%);
  border-radius: inherit;
}

.edge {
  position: absolute;
  inset-block: 0;
  inset-inline-start: var(--ifb-p);
  inline-size: 2px;
  margin-inline-start: -2px;
  background: #fff;
  box-shadow: 0 0 10px 2px rgba(255, 255, 255, 0.7);
  opacity: 0;
  pointer-events: none;
}

.edgePlay {
  animation: edge 1100ms cubic-bezier(0.22, 1, 0.36, 1) calc(var(--i) * 110ms + 100ms) both;
}

.name {
  grid-column: 2;
  grid-row: 1;
  min-inline-size: 0;
  font-size: 16px;
  font-weight: 650;
  line-height: 1.25;
  letter-spacing: -0.01em;
  overflow-wrap: break-word;
  hyphens: auto;
}

.lateArmed {
  opacity: 0;
}

.namePlay {
  animation: fadeIn 500ms ease-out calc(var(--i) * 110ms + 600ms) backwards;
}

.tag {
  --ty: 0%;
  grid-column: 3;
  grid-row: 1;
  justify-self: end;
  align-self: center;
  transform: translateY(var(--ty));
}

.tagPlay {
  animation: tagIn 600ms cubic-bezier(0.16, 1, 0.3, 1) calc(var(--i) * 110ms + 700ms) backwards;
}

.tagBody {
  position: relative;
  display: grid;
  justify-items: start;
  min-inline-size: 56px;
  padding: 5px 10px 5px 22px;
  background: var(--ifb-ink);
  color: #fff;
  clip-path: polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 0 50%);
}

.tagBody::before {
  content: '';
  position: absolute;
  inset-inline-start: 10px;
  inset-block-start: calc(50% - 3px);
  inline-size: 6px;
  block-size: 6px;
  border-radius: 50%;
  background: var(--ifb-surface);
}

.tagCount {
  font-size: 18px;
  font-weight: 750;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.tagUnit {
  max-inline-size: 56px;
  font-size: 14px;
  line-height: 1.15;
  color: #d4d6db;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.srOnly {
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

@container (min-width: 560px) {
  .root {
    padding-block: 56px;
    padding-inline: 32px;
  }

  .inner {
    --tagw: 132px;
    gap: 40px;
  }

  .tagUnit {
    max-inline-size: calc(var(--tagw) - 52px);
  }

  .header {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 32px;
  }

  .readout {
    justify-self: end;
    inline-size: 260px;
  }

  .heading {
    font-size: 52px;
  }

  .list {
    gap: 14px;
  }

  .row {
    grid-template-columns: 56px minmax(0, 1fr);
    gap: 16px;
  }

  .rank {
    font-size: 36px;
  }

  .track {
    display: block;
    block-size: var(--h);
    min-block-size: 0;
    padding: 0;
    border-radius: 999px;
    background: transparent;
    box-shadow: none;
  }

  .trackActive {
    box-shadow: none;
  }

  .track:focus-visible {
    outline-offset: 5px;
  }

  .thumb {
    display: none;
  }

  .groove,
  .fill {
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    block-size: auto;
  }

  .groove {
    background: rgba(var(--ifb-shadow), 0.07);
    box-shadow: inset 0 0 0 1px var(--ifb-line);
  }

  .trackActive .groove {
    box-shadow: inset 0 0 0 2px var(--ifb-highlight);
  }

  .scrim {
    background: linear-gradient(90deg, rgba(10, 12, 16, 0.82) 0%, rgba(10, 12, 16, 0.5) 40%, rgba(10, 12, 16, 0) 85%);
  }

  .name {
    font-size: 17px;
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: 26px;
    max-inline-size: calc((100% - var(--tagw)) * var(--fill) - 44px);
    transform: translateY(-50%);
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.5);
  }

  .tag {
    --ty: -50%;
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: calc((100% - var(--tagw)) * var(--fill) + 14px);
  }
}

@container (min-width: 900px) {
  .root {
    padding-inline: 48px;
  }

  .inner {
    --tagw: 150px;
  }

  .heading {
    font-size: 60px;
  }

  .readout {
    inline-size: 300px;
  }

  .readoutNumber {
    font-size: 44px;
  }

  .row {
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 20px;
  }

  .lead {
    --h: 100px;
  }

  .rank {
    font-size: 44px;
  }

  .name {
    font-size: 18px;
  }

  .tagCount {
    font-size: 22px;
  }
}

@keyframes grow {
  from {
    --ifb-p: 0%;
  }
  to {
    --ifb-p: 100%;
  }
}

@keyframes edge {
  0% {
    opacity: 0;
  }
  8%,
  70% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(40%);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes tagIn {
  from {
    opacity: 0;
    transform: translate(-12px, var(--ty));
  }
  to {
    opacity: 1;
    transform: translate(0, var(--ty));
  }
}

@keyframes settle {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .readoutSwing {
    animation: fadeIn 300ms ease both;
  }

  .photo,
  .fill {
    transition: none;
  }
}
```
