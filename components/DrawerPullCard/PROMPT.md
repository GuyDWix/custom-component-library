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
      <article className={styles.cabinet} aria-labelledby={titleId}>
        <span className={styles.cornice} aria-hidden="true" />

        <div className={styles.upper}>
          <div className={`${styles.door} ${styles.doorTitle}`}>
            <div className={styles.panel}>
              <h3 id={titleId} className={styles.title}>
                {title}
              </h3>
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
          </div>

          <div className={`${styles.door} ${styles.doorGlass}`}>
            <div className={styles.window}>
              <span className={styles.scene} aria-hidden="true" />
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
              <span className={styles.glare} aria-hidden="true" />
              <span className={styles.glareEdge} aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className={styles.band}>
          <span className={styles.slot} aria-hidden="true" />

          <div ref={trayRef} id={drawerId} className={styles.tray}>
            <div ref={interiorRef} className={styles.interior}>
              <span className={`${styles.wall} ${styles.wallStart}`} aria-hidden="true" />
              <span className={`${styles.wall} ${styles.wallEnd}`} aria-hidden="true" />
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

          <button
            ref={frontRef}
            type="button"
            className={styles.front}
            aria-expanded={open}
            aria-controls={drawerId}
            aria-description={DRAWER_HELP}
            onClick={onToggle}
          >
            <span className={styles.frontField} aria-hidden="true" />
            <span className={styles.holder}>
              <span className={styles.holderCard}>{handleLabel}</span>
            </span>
            <span className={styles.pull} aria-hidden="true">
              <span className={styles.pullBar} />
            </span>
          </button>
        </div>

        <div className={styles.lower}>
          <span className={`${styles.lowerDoor} ${styles.lowerDoorA}`} aria-hidden="true">
            <span className={styles.lowerPanel} />
          </span>
          <span className={`${styles.lowerDoor} ${styles.lowerDoorB}`} aria-hidden="true">
            <span className={styles.lowerPanel} />
          </span>
          <span className={styles.lowerShade} aria-hidden="true" />
        </div>

        <span className={styles.plinth} aria-hidden="true" />
      </article>
    </div>
  );
}
```

```css
/* Modern oak-veneer sideboard, front elevation: flush doors, a slim-bar drawer that springs out to a soft-lined tray. */

@font-face {
  font-family: 'Drawer Bricolage';
  src: url('./fonts/bricolage-grotesque-latin-var.woff2') format('woff2');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Drawer Hanken';
  src: url('./fonts/hanken.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

.root {
  --dp-pull: 0;
  --dp-travel: 180px;
  --dp-font-display: 'Drawer Bricolage', 'Avenir Next', 'Segoe UI', system-ui, sans-serif;
  --dp-font-ui: 'Drawer Hanken', 'Avenir Next', 'Segoe UI', system-ui, sans-serif;

  --dp-grain-v: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='480'><filter id='g' x='0' y='0' width='100%25' height='100%25'><feTurbulence type='fractalNoise' baseFrequency='0.9 0.012' numOctaves='2' seed='11' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.14  1 0 0 0 0'/><feComponentTransfer><feFuncA type='linear' slope='0.5' intercept='-0.08'/></feComponentTransfer></filter><rect width='100%25' height='100%25' filter='url(%23g)'/></svg>");
  --dp-grain-h: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='480'><filter id='g' x='0' y='0' width='100%25' height='100%25'><feTurbulence type='fractalNoise' baseFrequency='0.012 0.9' numOctaves='2' seed='5' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.14  1 0 0 0 0'/><feComponentTransfer><feFuncA type='linear' slope='0.5' intercept='-0.08'/></feComponentTransfer></filter><rect width='100%25' height='100%25' filter='url(%23g)'/></svg>");

  --dp-wall: #1d1a17;
  --dp-wall-lo: #12100e;
  --dp-floor: #0e0c0b;
  --dp-glow: rgba(255, 224, 180, 0.12);
  --dp-carcass: #14100c;
  --dp-wood: #cbb690;
  --dp-wood-hi: #d9c7a5;
  --dp-wood-lo: #bba47c;
  --dp-sheen: rgba(255, 246, 228, 0.34);
  --dp-edge: rgba(255, 248, 232, 0.45);
  --dp-shade: rgba(52, 34, 14, 0.22);
  --dp-face: radial-gradient(90% 70% at 20% 0%, var(--dp-sheen), transparent 70%), linear-gradient(180deg, var(--dp-wood-hi) 0%, var(--dp-wood) 55%, var(--dp-wood-lo) 100%);
  --dp-ink: #3b2c1b;
  --dp-focus: #1b1006;
  --dp-focus-gap: #f7efdc;
  --dp-inlay-a: #1d140a;
  --dp-brass: #b9a57f;
  --dp-brass-hi: #e4d6b6;
  --dp-brass-lo: #8a7650;
  --dp-felt: #34382f;
  --dp-felt-lo: #1e211c;
  --dp-felt-text: #f3ede0;
  --dp-felt-label: #d6c9a8;
  --dp-slot: #0c0907;
  --dp-line: rgba(58, 38, 16, 0.2);

  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  container-type: inline-size;
  inline-size: 100%;
  padding: 24px max(12px, 1.8%) 28px;
  background:
    radial-gradient(70% 80% at 22% -8%, var(--dp-glow) 0%, transparent 70%),
    linear-gradient(180deg, var(--dp-wall) 0%, var(--dp-wall-lo) calc(100% - 30px), var(--dp-floor) calc(100% - 30px), #060505 100%);
  color: var(--dp-ink);
  font-family: var(--dp-font-ui);
}

.root::selection {
  background: rgba(185, 165, 127, 0.45);
}

.root[data-title='long'] {
  --dp-title-k: 0.78;
}

.root[data-title='xl'] {
  --dp-title-k: 0.6;
}

.root[data-tone='walnut'] {
  --dp-wood: #6b4d36;
  --dp-wood-hi: #7a5a41;
  --dp-wood-lo: #5b402b;
  --dp-sheen: rgba(255, 220, 170, 0.14);
  --dp-edge: rgba(255, 224, 180, 0.22);
  --dp-shade: rgba(10, 4, 0, 0.3);
  --dp-ink: #f6ecd9;
  --dp-focus: #fff3d6;
  --dp-focus-gap: #1b1006;
  --dp-inlay-a: #fbf2e0;
  --dp-line: rgba(255, 236, 205, 0.2);
}

.root[data-tone='steel'] {
  --dp-wall: #14171b;
  --dp-wall-lo: #0b0d10;
  --dp-floor: #0d0f12;
  --dp-glow: rgba(176, 198, 224, 0.14);
  --dp-carcass: #0c0e11;
  --dp-wood: #9ca4ae;
  --dp-wood-hi: #b3bbc5;
  --dp-wood-lo: #8a929c;
  --dp-sheen: rgba(255, 255, 255, 0.28);
  --dp-edge: rgba(255, 255, 255, 0.5);
  --dp-shade: rgba(20, 26, 34, 0.25);
  --dp-ink: #1c2128;
  --dp-focus: #0d1014;
  --dp-focus-gap: #eef2f6;
  --dp-inlay-a: #10141a;
  --dp-brass: #6a737e;
  --dp-brass-hi: #b3bbc5;
  --dp-brass-lo: #3a414a;
  --dp-felt: #2f3137;
  --dp-felt-lo: #1a1b20;
  --dp-felt-label: #bcc2cc;
  --dp-slot: #0b0c0e;
  --dp-line: rgba(20, 26, 34, 0.22);
}

.root[data-tone='steel'] {
  --dp-grain-v: none;
  --dp-grain-h: none;
}

/* ---------- Cabinet: the dark carcass shows through the flush gaps ---------- */

.cabinet {
  --dp-h: clamp(560px, 52cqi, 650px);
  --dp-corniceH: 16px;
  --dp-plinthH: 26px;
  --dp-bandH: calc(var(--dp-h) * 0.19);
  --dp-lowerH: calc(var(--dp-h) * 0.27);
  --dp-frame: 14px;
  --dp-gap: 5px;
  --dp-trayPadY: 18px;
  --dp-title-size: clamp(36px, 5.2cqi, 64px);

  position: relative;
  box-sizing: border-box;
  display: grid;
  grid-template-rows: var(--dp-corniceH) minmax(0, 1fr) var(--dp-bandH) var(--dp-lowerH) var(--dp-plinthH);
  row-gap: var(--dp-gap);
  inline-size: 100%;
  max-inline-size: 1320px;
  block-size: var(--dp-h);
  margin-inline: auto;
  border-radius: 4px 4px 1px 1px;
  background: var(--dp-carcass);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.5),
    0 40px 50px -26px rgba(0, 0, 0, 0.85),
    0 8px 18px -8px rgba(0, 0, 0, 0.6);
}

.cornice,
.door,
.lowerDoor,
.wall {
  background-image: var(--dp-grain-v), var(--dp-face);
  background-size: 480px 480px, 100% 100%;
  background-blend-mode: multiply, normal;
}

.cornice {
  position: relative;
  z-index: 4;
  border-radius: 4px 4px 0 0;
  background-image: var(--dp-grain-h), var(--dp-face);
  box-shadow:
    inset 0 1px 0 var(--dp-edge),
    0 6px 10px -4px rgba(0, 0, 0, 0.5);
}

.plinth {
  position: relative;
  margin-inline: 4%;
  background: linear-gradient(180deg, #000 0%, #0f0c09 60%, #1a140f);
  box-shadow: inset 0 8px 8px -4px rgba(0, 0, 0, 0.9);
}

/* ---------- Upper doors ---------- */

.upper {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 46fr 54fr;
  gap: var(--dp-gap);
  min-block-size: 0;
}

.door,
.lowerDoor {
  position: relative;
  box-sizing: border-box;
  min-inline-size: 0;
  min-block-size: 0;
  padding: var(--dp-frame);
  border-radius: 1px;
  box-shadow:
    inset 0 1px 0 var(--dp-edge),
    inset 0 -18px 28px -22px var(--dp-shade),
    0 1px 0 rgba(0, 0, 0, 0.35);
}

.panel {
  position: relative;
  box-sizing: border-box;
  block-size: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  padding: 10px clamp(20px, 3.4cqi, 44px);
  overflow: clip;
  border-radius: 1px;
  box-shadow: inset 0 0 0 1px var(--dp-line);
}

.title {
  margin: 0;
  padding-block: 0.04em 0.1em;
  font-family: var(--dp-font-display);
  font-size: calc(var(--dp-title-size) * var(--dp-title-k, 1));
  line-height: 1.04;
  font-weight: 700;
  letter-spacing: -0.025em;
  text-wrap: balance;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
  color: var(--dp-inlay-a);
}

.subtitle {
  margin: 0;
  padding-block-start: 12px;
  border-block-start: 1px solid var(--dp-line);
  color: var(--dp-ink);
  font-size: clamp(17px, 2.1cqi, 22px);
  line-height: 1.4;
  font-weight: 500;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

/* Photo door: recessed picture in a veneer frame; a dim fallback so it is never empty */

.doorGlass {
  padding: calc(var(--dp-frame) - 4px);
}

.window {
  position: relative;
  block-size: 100%;
  overflow: clip;
  border-radius: 1px;
  background: #1a1410;
  box-shadow:
    0 0 0 1px rgba(20, 10, 2, 0.55),
    0 1px 0 1px var(--dp-edge);
}

.scene {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(60% 70% at 62% 24%, rgba(255, 190, 120, 0.28), transparent 72%),
    linear-gradient(180deg, #2a1f16 0%, #1a130d 100%);
}

.photo {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  opacity: 0;
  transform: translateY(calc(var(--dp-pull) * -8px)) scale(1.06);
  transition: opacity 420ms ease;
}

.photo[data-ready='true'] {
  opacity: 1;
}

.glare {
  position: absolute;
  inset: 0 -12%;
  pointer-events: none;
  background: linear-gradient(115deg, transparent 38%, rgba(255, 255, 255, 0.07) 38% 46%, transparent 46%);
  transform: translateX(calc(var(--dp-pull) * 7%));
}

.glareEdge {
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow:
    inset 0 8px 14px -8px rgba(0, 0, 0, 0.55),
    inset 0 0 0 1px rgba(0, 0, 0, 0.45);
}

/* ---------- Drawer band ---------- */

.band {
  position: relative;
  z-index: 3;
}

.slot {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #050403, var(--dp-slot));
  box-shadow: inset 0 6px 8px rgba(0, 0, 0, 0.8);
}

.tray {
  position: absolute;
  z-index: 2;
  inset-inline: 0;
  inset-block-start: 0;
  block-size: 0;
  overflow: clip;
}

.interior {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  box-sizing: border-box;
  padding: var(--dp-trayPadY) 40px var(--dp-trayPadY);
  visibility: hidden;
  transform: translateY(calc((var(--dp-pull) - 1) * var(--dp-travel)));
  background: radial-gradient(130% 120% at 50% 0%, var(--dp-felt) 0%, var(--dp-felt-lo) 100%);
  box-shadow:
    inset 0 16px 20px -10px rgba(0, 0, 0, 0.65),
    inset 0 -18px 18px -12px rgba(0, 0, 0, 0.55);
}

.wall {
  position: absolute;
  inset-block: 0;
  inline-size: 12px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.45);
}

.wallStart {
  inset-inline-start: 0;
}

.wallEnd {
  inset-inline-end: 0;
}

.rows {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 48px;
  margin: 0;
}

.rowsScroll {
  position: relative;
  max-block-size: calc(var(--dp-lowerH) + var(--dp-plinthH) - 16px - 2 * var(--dp-trayPadY));
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(240, 230, 205, 0.3) transparent;
}

.rowsScroll:focus-visible {
  outline: 3px solid var(--dp-brass-hi);
  outline-offset: 4px;
}

.row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  padding-block: 9px;
  border-block-start: 1px solid rgba(240, 230, 205, 0.14);
  opacity: clamp(0, calc((var(--dp-pull) - var(--dp-i) * 0.08) * 3.5), 1);
  transform: translateY(calc((1 - clamp(0, calc((var(--dp-pull) - var(--dp-i) * 0.08) * 3.5), 1)) * 16px));
}

.rowLabel {
  flex: none;
  color: var(--dp-felt-label);
  font-size: clamp(14px, 1.5cqi, 16px);
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.rowValue {
  margin: 0;
  color: var(--dp-felt-text);
  font-size: clamp(17px, 1.8cqi, 20px);
  line-height: 1.35;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  text-align: end;
  overflow-wrap: anywhere;
}

/* Drawer front: label left, slim metal bar centred */

.front {
  --dp-lift: 0px;
  --dp-shine: 1;
  --dp-front-shadow: 0 calc(2px + var(--dp-pull) * 20px) calc(6px + var(--dp-pull) * 26px) calc(var(--dp-pull) * -6px) rgba(6, 3, 1, 0.6);

  position: absolute;
  z-index: 3;
  inset: 0;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  column-gap: 28px;
  padding: 0 clamp(18px, 4cqi, 56px);
  border: none;
  border-radius: 1px;
  cursor: pointer;
  font: inherit;
  color: var(--dp-ink);
  -webkit-tap-highlight-color: transparent;
  transform-origin: 50% 0;
  transform: translateY(calc(var(--dp-pull) * var(--dp-travel)));
  background-image: var(--dp-grain-h), var(--dp-face);
  background-size: 480px 480px, 100% 100%;
  background-blend-mode: multiply, normal;
  box-shadow:
    inset 0 1px 0 var(--dp-edge),
    inset 0 -14px 22px -18px var(--dp-shade),
    0 1px 0 rgba(0, 0, 0, 0.4),
    var(--dp-front-shadow);
}

.front:focus-visible {
  outline: 3px solid var(--dp-focus);
  outline-offset: 4px;
  box-shadow:
    0 0 0 3px var(--dp-focus-gap),
    inset 0 1px 0 var(--dp-edge),
    var(--dp-front-shadow);
}

.front:hover {
  --dp-lift: -1px;
  --dp-shine: 1.06;
}

.front:active {
  --dp-lift: 1px;
  --dp-shine: 0.96;
}

.frontField {
  display: none;
}

.holder {
  position: relative;
  justify-self: start;
  max-inline-size: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
}

.holder::before {
  content: '';
  flex: none;
  inline-size: 22px;
  block-size: 1px;
  background: currentColor;
  opacity: 0.55;
}

.holderCard {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  color: var(--dp-ink);
  font-size: clamp(14px, 1.5cqi, 17px);
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.pull {
  position: relative;
  grid-column: 2;
  inline-size: clamp(150px, 24cqi, 320px);
  block-size: 18px;
  transform: translateY(calc(var(--dp-lift) + var(--dp-pull) * 2px));
  transition: transform 160ms ease;
  filter: brightness(var(--dp-shine));
}

.pull::before {
  content: '';
  position: absolute;
  inset: 3px -6px;
  border-radius: 9px;
  background: rgba(20, 10, 2, 0.28);
  box-shadow: inset 0 2px 3px rgba(20, 10, 2, 0.35);
}

.pullBar {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 4px;
  block-size: 9px;
  border-radius: 5px;
  background: linear-gradient(180deg, var(--dp-brass-hi) 0%, var(--dp-brass) 45%, var(--dp-brass-lo) 100%);
  box-shadow:
    0 4px 6px -1px rgba(8, 4, 1, 0.5),
    inset 0 1px 0 rgba(255, 252, 240, 0.7);
}

/* ---------- Lower doors ---------- */

.lower {
  position: relative;
  z-index: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--dp-gap);
}

.lowerDoor::before {
  content: '';
  position: absolute;
  inset-block-start: 0;
  inline-size: 56px;
  block-size: 6px;
  background: rgba(20, 10, 2, 0.5);
  box-shadow: inset 0 2px 2px rgba(0, 0, 0, 0.5);
}

.lowerDoorA::before {
  inset-inline-end: 14%;
}

.lowerDoorB::before {
  inset-inline-start: 14%;
}

.lowerPanel {
  display: block;
  block-size: 100%;
  border-radius: 1px;
  box-shadow: inset 0 0 0 1px var(--dp-line);
}

.lowerShade {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(8, 3, 0, 0.6) 0%, rgba(8, 3, 0, 0.25) 60%, transparent 100%);
  opacity: clamp(0, calc(var(--dp-pull) * 1.2), 1);
}

/* ---------- Narrow container: doors stack, drawer label sits above the pull ---------- */

@container (max-width: 719px) {
  .cabinet {
    --dp-h: clamp(620px, 196cqi, 720px);
    --dp-corniceH: 12px;
    --dp-plinthH: 22px;
    --dp-bandH: calc(var(--dp-h) * 0.17);
    --dp-lowerH: calc(var(--dp-h) * 0.3);
    --dp-frame: 11px;
    --dp-gap: 4px;
    --dp-trayPadY: 14px;
    --dp-title-size: clamp(26px, 9.2cqi, 40px);
  }

  .upper {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  }

  .panel {
    gap: 8px;
    padding: 8px 18px;
  }

  .subtitle {
    font-size: clamp(16px, 4.2cqi, 19px);
    padding-block-start: 8px;
    -webkit-line-clamp: 2;
  }

  .title {
    -webkit-line-clamp: 3;
  }

  .front {
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
    align-content: center;
    gap: 8px;
    padding-inline: 12px;
  }

  .holder {
    grid-column: 1;
    justify-self: center;
  }

  .holder::before {
    display: none;
  }

  .holderCard {
    font-size: 14px;
    letter-spacing: 0.14em;
    text-align: center;
  }

  .pull {
    grid-column: 1;
    inline-size: clamp(120px, 44cqi, 180px);
  }

  .rows {
    grid-template-columns: minmax(0, 1fr);
  }

  .row {
    padding-block: 7px;
  }

  .interior {
    padding-inline: 28px;
  }

  .wall {
    inline-size: 9px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .root {
    --dp-pull: 1;
  }
  .pull,
  .photo {
    transition: none;
  }
}
```
