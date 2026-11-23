Create a custom element called "Drawer Pull Card". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: card title, image, drawer contents (rows of label and value), handle label, wood or metal tone, subtitle, image description. Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export interface DrawerPullCardRow {
  label: string;
  value: string;
}

export interface DrawerPullCardProps {
  image?: string;
  imageAlt?: string;
  title?: string;
  subtitle?: string;
  handleLabel?: string;
  rows?: DrawerPullCardRow[];
  tone?: 'oak' | 'walnut' | 'steel';
  className?: string;
}

export const defaultRows: DrawerPullCardRow[] = [
  { label: 'Mon – Thu', value: '17:00 – 23:00' },
  { label: 'Fri – Sat', value: '16:00 – 01:00' },
  { label: 'Sunday', value: '12:00 – 22:00' },
  { label: 'Walk-ins', value: 'Bar only, from 16:00' },
  { label: 'Last seating', value: '22:30' },
];

const STIFFNESS = 170;
const DAMPING = 16;

const DRAWER_HELP = 'Press to slide the drawer open; press again or Escape to close it.';

type ImgStatus = 'loading' | 'ready' | 'failed';

export default function DrawerPullCard({
  image = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=720&fit=crop&q=75&auto=format',
  imageAlt = 'Warm dining room of the restaurant in the evening',
  title = 'Juniper & Rye',
  subtitle = 'Neighborhood dining room · Fernwood',
  handleLabel = 'House hours',
  rows = defaultRows,
  tone = 'oak',
  className,
}: DrawerPullCardProps) {
  const [open, setOpen] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [scrollable, setScrollable] = useState(false);
  const [imgStatus, setImgStatus] = useState<ImgStatus>('loading');
  const uid = useId();
  const titleId = `${uid}-title`;
  const drawerId = `${uid}-drawer`;

  const rootRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const interiorRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLButtonElement>(null);
  const photoRef = useRef<HTMLImageElement>(null);
  const spring = useRef({ p: 0, v: 0 });
  const travelRef = useRef(190);
  const lastPull = useRef(0);

  const paint = useCallback((p: number) => {
    lastPull.current = p;
    const root = rootRef.current;
    const tray = trayRef.current;
    const interior = interiorRef.current;
    if (root) root.style.setProperty('--dp-pull', p.toFixed(4));
    if (tray) tray.style.blockSize = `${Math.max(0, p) * travelRef.current}px`;
    if (interior) {
      const revealed = p > 0.004;
      interior.style.visibility = revealed ? 'visible' : 'hidden';
      interior.setAttribute('aria-hidden', revealed ? 'false' : 'true');
    }
  }, []);

  const measure = useCallback(() => {
    const root = rootRef.current;
    const interior = interiorRef.current;
    const list = rowsRef.current;
    if (!root || !interior) return;
    const travel = Math.max(interior.offsetHeight, 1);
    travelRef.current = travel;
    root.style.setProperty('--dp-travel', `${travel}px`);
    if (list) setScrollable(list.scrollHeight > list.clientHeight + 1);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setReduced(mq.matches);
      if (mq.matches) setOpen(true);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const interior = interiorRef.current;
    const root = rootRef.current;
    if (!interior || !root) return;
    const measureAndRepaint = () => {
      measure();
      paint(lastPull.current);
    };
    measureAndRepaint();
    const ro = new ResizeObserver(measureAndRepaint);
    ro.observe(interior);
    ro.observe(root);
    return () => ro.disconnect();
  }, [measure, paint, rows]);

  useEffect(() => {
    if (reduced) {
      spring.current = { p: open ? 1 : 0, v: 0 };
      paint(open ? 1 : 0);
      return;
    }
    if (!inView) return;
    let id = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const goal = open ? 1 : 0;
      const s = spring.current;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let n = 0; n < steps; n++) {
        s.v += (STIFFNESS * (goal - s.p) - DAMPING * s.v) * h;
        s.p += s.v * h;
      }
      paint(s.p);
      if (Math.abs(goal - s.p) < 0.0006 && Math.abs(s.v) < 0.002) {
        s.p = goal;
        s.v = 0;
        paint(goal);
        return;
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [reduced, inView, open, paint]);

  // A remote photo can be slow or fail: the painted scene underneath always shows.
  useEffect(() => {
    setImgStatus('loading');
    const img = photoRef.current;
    if (img && img.complete) setImgStatus(img.naturalWidth > 0 ? 'ready' : 'failed');
  }, [image]);

  const onToggle = () => setOpen((o) => !o);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && open) {
      setOpen(false);
      frontRef.current?.focus();
    }
  };

  const len = title.trim().length;
  const tier = len > 34 ? 'xl' : len > 20 ? 'long' : 'short';

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      data-tone={tone}
      data-title={tier}
      onKeyDown={onKeyDown}
    >
      <article className={styles.card} aria-labelledby={titleId}>
        <div className={styles.top}>
          <figure className={styles.figure}>
            <div className={styles.figureInner}>
              {image && imgStatus !== 'failed' && (
                <img
                  ref={photoRef}
                  className={styles.photo}
                  data-ready={imgStatus === 'ready'}
                  src={image}
                  alt={imageAlt}
                  draggable={false}
                  decoding="async"
                  onLoad={() => setImgStatus('ready')}
                  onError={() => setImgStatus('failed')}
                />
              )}
            </div>
          </figure>
          <div className={styles.info}>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            <h3 id={titleId} className={styles.title}>
              {title}
            </h3>
          </div>
        </div>

        <button
          ref={frontRef}
          type="button"
          className={styles.front}
          aria-expanded={open}
          aria-controls={drawerId}
          aria-description={DRAWER_HELP}
          onClick={onToggle}
        >
          <span className={styles.handleLabel}>{handleLabel}</span>
          <span className={styles.state} aria-hidden="true">
            <span className={styles.stateWord} data-open={open}>
              {open ? 'Push' : 'Pull'}
            </span>
            <span className={styles.pull}>
              <span className={styles.pullH} />
              <span className={styles.pullV} />
            </span>
          </span>
        </button>

        <div ref={trayRef} id={drawerId} className={styles.tray}>
          <div ref={interiorRef} className={styles.interior}>
            {rows.length > 0 && (
              <div
                ref={rowsRef}
                className={styles.rowsScroll}
                tabIndex={scrollable ? 0 : undefined}
                role={scrollable ? 'region' : undefined}
                aria-label={scrollable ? `${handleLabel} (scrollable)` : undefined}
              >
                <dl className={styles.rows}>
                  {rows.map((row, i) => (
                    <div key={i} className={styles.row} style={{ '--dp-i': String(i) } as CSSProperties}>
                      <dt className={styles.rowLabel}>{row.label}</dt>
                      <dd className={styles.rowValue}>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
```

```css
@font-face {
  font-family: 'Drawer Hanken';
  src: url('./fonts/hanken.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

/* Soft UI: one surface colour, depth from paired light/dark shadows, one teal accent. */
.root {
  --surface: #e6e1d9;
  --hi: rgba(255, 255, 255, 0.85);
  --lo: rgba(120, 104, 82, 0.34);
  --ink: #23201c;
  --muted: #55504a;
  --accent: #0f766e;
  --accent-ink: #ffffff;
  --focus: #0b514b;
  --font: 'Drawer Hanken', 'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif;
  --pad: clamp(1.25rem, 6cqi, 2.5rem);
  --d: clamp(4px, 1.5cqi, 9px);

  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  color: var(--ink);
  font-family: var(--font);
}

.root[data-tone='walnut'] {
  --surface: #2d3036;
  --hi: rgba(255, 255, 255, 0.07);
  --lo: rgba(0, 0, 0, 0.55);
  --ink: #eceef1;
  --muted: #b4bac2;
  --accent: #2dd4bf;
  --accent-ink: #0b1f1d;
  --focus: #5eead4;
}

.root[data-tone='steel'] {
  --surface: #dde3ea;
  --hi: rgba(255, 255, 255, 0.9);
  --lo: rgba(88, 108, 132, 0.34);
  --muted: #4a5662;
}

.root *,
.root *::before,
.root *::after {
  box-sizing: border-box;
}

.card {
  margin: 0;
  background: var(--surface);
  border-radius: 28px;
  overflow: clip;
  box-shadow: calc(var(--d) * 1.6) calc(var(--d) * 1.6) calc(var(--d) * 3.2) var(--lo),
    calc(var(--d) * -1.6) calc(var(--d) * -1.6) calc(var(--d) * 3.2) var(--hi);
}

.top {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--pad);
  padding: var(--pad) var(--pad) 0;
}

.figure {
  margin: 0;
  padding: 6px;
  border-radius: 22px;
  background: var(--surface);
  box-shadow: inset var(--d) var(--d) calc(var(--d) * 1.8) var(--lo),
    inset calc(var(--d) * -1) calc(var(--d) * -1) calc(var(--d) * 1.8) var(--hi);
}

.figureInner {
  aspect-ratio: 4 / 3;
  border-radius: 17px;
  overflow: hidden;
  background: color-mix(in srgb, var(--ink) 8%, var(--surface));
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 400ms ease;
}

.photo[data-ready='true'] {
  opacity: 1;
}

.info {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 1rem;
  min-inline-size: 0;
}

.subtitle {
  order: -1;
  margin: 0;
  color: var(--muted);
  font-size: clamp(0.9375rem, 2.6cqi, 1.0625rem);
  font-weight: 400;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.title {
  margin: 0;
  font-weight: 600;
  letter-spacing: -0.04em;
  line-height: 0.95;
  font-size: clamp(2.5rem, 14cqi, 4.5rem);
  overflow-wrap: anywhere;
  hyphens: auto;
}

.root[data-title='long'] .title {
  font-size: clamp(2rem, 10.5cqi, 3.5rem);
}

.root[data-title='xl'] .title {
  font-size: clamp(1.625rem, 7.5cqi, 2.5rem);
  line-height: 1;
}

/* Drawer face: lifts further off the surface as it is pulled. */
.front {
  all: unset;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  position: relative;
  z-index: 1;
  inline-size: calc(100% - var(--pad) * 2);
  min-block-size: 5rem;
  margin: var(--pad) var(--pad) 0;
  padding: 1rem 1rem 1rem 1.5rem;
  border-radius: 20px;
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
  box-shadow: calc(var(--d) * (0.8 + var(--dp-pull, 0) * 0.6)) calc(var(--d) * (0.8 + var(--dp-pull, 0) * 0.9))
      calc(var(--d) * (1.8 + var(--dp-pull, 0) * 1.2)) var(--lo),
    calc(var(--d) * -0.8) calc(var(--d) * -0.8) calc(var(--d) * 1.8) var(--hi);
  transition: box-shadow 140ms ease;
  -webkit-tap-highlight-color: transparent;
}

.front:active {
  box-shadow: inset calc(var(--d) * 0.7) calc(var(--d) * 0.7) calc(var(--d) * 1.4) var(--lo),
    inset calc(var(--d) * -0.7) calc(var(--d) * -0.7) calc(var(--d) * 1.4) var(--hi);
}

.front:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 4px;
}

.handleLabel {
  font-size: clamp(1.0625rem, 3.2cqi, 1.25rem);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.25;
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.state {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stateWord {
  color: var(--muted);
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.pull {
  position: relative;
  flex: none;
  inline-size: 3rem;
  block-size: 3rem;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: calc(var(--d) * 0.5) calc(var(--d) * 0.5) calc(var(--d) * 1.1) var(--lo),
    calc(var(--d) * -0.5) calc(var(--d) * -0.5) calc(var(--d) * 1.1) var(--hi);
  transition: transform 160ms ease;
}

.front:active .pull {
  transform: scale(0.92);
}

.pullH,
.pullV {
  position: absolute;
  inset: 50% auto auto 50%;
  inline-size: 1.125rem;
  block-size: 2.5px;
  margin: -1.25px 0 0 -0.5625rem;
  border-radius: 2px;
  background: var(--accent-ink);
}

.pullV {
  transform: rotate(90deg) scaleX(calc(1 - var(--dp-pull, 0)));
}

/* Slot the drawer slides out of: an inset well. */
.tray {
  block-size: 0;
  overflow: hidden;
  margin-inline: var(--pad);
  margin-block-start: calc(var(--pad) * -0.25);
  border-radius: 0 0 20px 20px;
  background: var(--surface);
  box-shadow: inset var(--d) var(--d) calc(var(--d) * 1.8) var(--lo),
    inset calc(var(--d) * -1) calc(var(--d) * -1) calc(var(--d) * 1.8) var(--hi);
}

.interior {
  visibility: hidden;
  padding: calc(var(--pad) * 0.5) clamp(1rem, 4cqi, 1.75rem) clamp(1rem, 4cqi, 1.5rem);
  color: var(--ink);
}

.rowsScroll {
  max-block-size: 24rem;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.rowsScroll:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
}

.rows {
  margin: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  align-items: baseline;
  gap: 1rem;
  padding: 0.875rem 0;
  border-block-end: 1px solid color-mix(in srgb, var(--ink) 14%, transparent);
  opacity: clamp(0, calc(var(--dp-pull, 0) * 1.8 - var(--dp-i, 0) * 0.14), 1);
}

.row:last-child {
  border-block-end: 0;
}

.rowLabel {
  margin: 0;
  color: var(--muted);
  font-size: clamp(0.9375rem, 2.8cqi, 1.0625rem);
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.rowValue {
  margin: 0;
  font-size: clamp(1.125rem, 4cqi, 1.5rem);
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.card::after {
  content: '';
  display: block;
  block-size: var(--pad);
}

@container (min-width: 640px) {
  .top {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  }

  .figureInner {
    aspect-ratio: auto;
    block-size: 100%;
    min-block-size: 20rem;
  }

  .rows {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 3rem;
  }

  .row:nth-last-child(2):nth-child(odd) {
    border-block-end: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .photo,
  .pull,
  .front {
    transition: none;
  }
}
```
