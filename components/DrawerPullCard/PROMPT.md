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
  const glintRef = useRef<HTMLSpanElement>(null);
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

  useEffect(() => {
    const glint = glintRef.current;
    if (glint) glint.style.animationPlayState = inView && !reduced ? 'running' : 'paused';
  }, [inView, reduced]);

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
        <span className={styles.lamp} aria-hidden="true" />
        <span className={styles.cornice} aria-hidden="true" />

        <div className={styles.upper}>
          <div className={`${styles.door} ${styles.doorTitle}`}>
            <span className={`${styles.hinge} ${styles.hingeTop}`} aria-hidden="true" />
            <span className={`${styles.hinge} ${styles.hingeBottom}`} aria-hidden="true" />
            <span className={`${styles.knob} ${styles.knobSide}`} aria-hidden="true" />
            <div className={styles.panel}>
              <h3 id={titleId} className={styles.title}>
                {title}
              </h3>
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
          </div>

          <div className={`${styles.door} ${styles.doorGlass}`}>
            <span className={`${styles.hinge} ${styles.hingeTop} ${styles.hingeFar}`} aria-hidden="true" />
            <span className={`${styles.hinge} ${styles.hingeBottom} ${styles.hingeFar}`} aria-hidden="true" />
            <span className={`${styles.knob} ${styles.knobSideFar}`} aria-hidden="true" />
            <div className={styles.window}>
              <span className={styles.scene} aria-hidden="true">
                <span className={styles.sceneLamps} />
                <span className={styles.sceneWall} />
                <span className={styles.sceneTable} />
                <span className={`${styles.sceneGlass} ${styles.sceneGlassA}`} />
                <span className={`${styles.sceneGlass} ${styles.sceneGlassB}`} />
                <span className={styles.scenePlate} />
                <span className={styles.sceneFood} />
                <span className={styles.sceneCandle} />
              </span>
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
              <span className={styles.feltTexture} aria-hidden="true" />
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
              <span className={styles.pullPost} />
              <span className={`${styles.pullPost} ${styles.pullPostEnd}`} />
              <span className={styles.pullBar}>
                <span ref={glintRef} className={styles.glint} />
              </span>
            </span>
          </button>
        </div>

        <div className={styles.lower}>
          <span className={`${styles.lowerDoor} ${styles.lowerDoorA}`} aria-hidden="true">
            <span className={styles.lowerPanel} />
            <span className={`${styles.knob} ${styles.knobLowerA}`} />
          </span>
          <span className={`${styles.lowerDoor} ${styles.lowerDoorB}`} aria-hidden="true">
            <span className={styles.lowerPanel} />
            <span className={`${styles.knob} ${styles.knobLowerB}`} />
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
/* Oak sideboard, front elevation: glazed door, engraved door, a brass-pulled drawer that springs out to a felt tray. */

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

  /* Grain: stretched fractal noise, long axis vertical (V) or horizontal (H). */
  --dp-pore-v: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='g' x='0' y='0' width='100%25' height='100%25'><feTurbulence type='fractalNoise' baseFrequency='0.55 0.05' numOctaves='1' seed='11' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.22  0 0 0 0 0.11  0 0 0 0 0.03  3.4 0 0 0 -1.95'/></filter><rect width='100%25' height='100%25' filter='url(%23g)'/></svg>");
  --dp-fine-v: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420'><filter id='g' x='0' y='0' width='100%25' height='100%25'><feTurbulence type='fractalNoise' baseFrequency='0.34 0.007' numOctaves='3' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.31  0 0 0 0 0.17  0 0 0 0 0.06  2.3 0 0 0 -0.92'/></filter><rect width='100%25' height='100%25' filter='url(%23g)'/></svg>");
  --dp-fig-v: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='760' height='760'><filter id='g' x='0' y='0' width='100%25' height='100%25'><feTurbulence type='fractalNoise' baseFrequency='0.034 0.0042' numOctaves='2' seed='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.36  0 0 0 0 0.2  0 0 0 0 0.07  3.4 0 0 0 -1.35'/></filter><rect width='100%25' height='100%25' filter='url(%23g)'/></svg>");
  --dp-pore-h: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='g' x='0' y='0' width='100%25' height='100%25'><feTurbulence type='fractalNoise' baseFrequency='0.05 0.55' numOctaves='1' seed='5' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.22  0 0 0 0 0.11  0 0 0 0 0.03  3.4 0 0 0 -1.95'/></filter><rect width='100%25' height='100%25' filter='url(%23g)'/></svg>");
  --dp-fine-h: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420'><filter id='g' x='0' y='0' width='100%25' height='100%25'><feTurbulence type='fractalNoise' baseFrequency='0.007 0.34' numOctaves='3' seed='9' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.31  0 0 0 0 0.17  0 0 0 0 0.06  2.3 0 0 0 -0.92'/></filter><rect width='100%25' height='100%25' filter='url(%23g)'/></svg>");
  --dp-fig-h: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='760' height='760'><filter id='g' x='0' y='0' width='100%25' height='100%25'><feTurbulence type='fractalNoise' baseFrequency='0.0042 0.034' numOctaves='2' seed='13' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.36  0 0 0 0 0.2  0 0 0 0 0.07  3.4 0 0 0 -1.35'/></filter><rect width='100%25' height='100%25' filter='url(%23g)'/></svg>");
  --dp-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  --dp-wall: #1c140d;
  --dp-wall-lo: #0f0a06;
  --dp-floor: #120c07;
  --dp-glow: rgba(255, 196, 120, 0.2);
  --dp-wood: #d3b685;
  --dp-wood-hi: #e4cca1;
  --dp-wood-lo: #b99a6c;
  --dp-boards: linear-gradient(90deg, rgba(255, 232, 178, 0.13) 0 31%, rgba(90, 48, 14, 0.09) 31% 64%, rgba(255, 240, 200, 0.06) 64% 100%);
  --dp-seams: linear-gradient(90deg, transparent calc(31% - 1px), rgba(48, 24, 6, 0.4) calc(31% - 1px) 31%, rgba(255, 240, 205, 0.32) 31% calc(31% + 1px), transparent calc(31% + 1px) calc(64% - 1px), rgba(48, 24, 6, 0.4) calc(64% - 1px) 64%, rgba(255, 240, 205, 0.32) 64% calc(64% + 1px), transparent calc(64% + 1px));
  --dp-img-v: var(--dp-pore-v), var(--dp-fine-v), var(--dp-fig-v), var(--dp-boards), linear-gradient(180deg, var(--dp-wood-hi) 0%, var(--dp-wood) 50%, var(--dp-wood-lo) 100%);
  --dp-size-v: 300px 300px, 420px 420px, 760px 760px, 100% 100%, 100% 100%;
  --dp-img-h: var(--dp-pore-h), var(--dp-fine-h), var(--dp-fig-h), linear-gradient(180deg, var(--dp-wood-hi) 0%, var(--dp-wood) 55%, var(--dp-wood-lo) 100%);
  --dp-size-h: 300px 300px, 420px 420px, 760px 760px, 100% 100%;
  --dp-ink: #3b2a18;
  --dp-ink-muted: #1a0f06;
  --dp-halo: rgba(238, 216, 168, 0.9);
  --dp-focus: #1b1006;
  --dp-focus-gap: #f7ecd0;
  --dp-inlay-a: #170b03;
  --dp-inlay-b: #43270e;
  --dp-inlay-edge: rgba(255, 238, 205, 0.6);
  --dp-brass: #b98f52;
  --dp-brass-hi: #efd699;
  --dp-brass-lo: #7f5b2c;
  --dp-felt: #2a4535;
  --dp-felt-lo: #14241b;
  --dp-felt-text: #f1e9d8;
  --dp-felt-label: #e0cc9c;
  --dp-card: #f0e5ca;
  --dp-card-ink: #3a2815;
  --dp-slot: #130c06;

  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  container-type: inline-size;
  inline-size: 100%;
  padding: 20px max(12px, 1.8%) 26px;
  background:
    radial-gradient(70% 80% at 22% -8%, var(--dp-glow) 0%, transparent 70%),
    repeating-linear-gradient(90deg, rgba(255, 235, 200, 0.014) 0 1px, transparent 1px 110px),
    linear-gradient(180deg, var(--dp-wall) 0%, var(--dp-wall-lo) calc(100% - 30px), var(--dp-floor) calc(100% - 30px), #060302 100%);
  color: var(--dp-ink);
  font-family: var(--dp-font-ui);
}

.root::selection {
  background: rgba(185, 143, 82, 0.45);
}

.root[data-title='long'] {
  --dp-title-k: 0.78;
}

.root[data-title='xl'] {
  --dp-title-k: 0.6;
}

.root[data-tone='walnut'] {
  --dp-wood: #6f4c2f;
  --dp-wood-hi: #835c3b;
  --dp-wood-lo: #583a21;
  --dp-boards: linear-gradient(90deg, rgba(255, 210, 150, 0.1) 0 31%, rgba(20, 8, 0, 0.12) 31% 64%, rgba(255, 220, 170, 0.05) 64% 100%);
  --dp-ink: #f6ecd9;
  --dp-ink-muted: #f6ecd9;
  --dp-halo: rgba(40, 22, 8, 0.7);
  --dp-focus: #fff3d6;
  --dp-focus-gap: #1b1006;
  --dp-inlay-a: #f4dca2;
  --dp-inlay-b: #c79a55;
  --dp-inlay-edge: rgba(0, 0, 0, 0.55);
}

.root[data-tone='steel'] {
  --dp-wall: #14171b;
  --dp-wall-lo: #0b0d10;
  --dp-floor: #0d0f12;
  --dp-glow: rgba(176, 198, 224, 0.16);
  --dp-wood: #9aa2ac;
  --dp-wood-hi: #b1b9c3;
  --dp-wood-lo: #7c858f;
  --dp-img-v: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.07) 0 1px, rgba(0, 0, 0, 0.05) 1px 2px, transparent 2px 5px), linear-gradient(180deg, var(--dp-wood-hi) 0%, var(--dp-wood) 50%, var(--dp-wood-lo) 100%);
  --dp-size-v: auto, 100% 100%;
  --dp-img-h: repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.07) 0 1px, rgba(0, 0, 0, 0.05) 1px 2px, transparent 2px 5px), linear-gradient(180deg, var(--dp-wood-hi) 0%, var(--dp-wood) 55%, var(--dp-wood-lo) 100%);
  --dp-size-h: auto, 100% 100%;
  --dp-ink: #1c2128;
  --dp-ink-muted: #12161b;
  --dp-halo: rgba(200, 208, 218, 0.8);
  --dp-focus: #0d1014;
  --dp-focus-gap: #eef2f6;
  --dp-inlay-a: #12161b;
  --dp-inlay-b: #3a424c;
  --dp-brass: #5d6670;
  --dp-brass-hi: #aab2bc;
  --dp-brass-lo: #353b43;
  --dp-felt: #2c2d33;
  --dp-felt-lo: #17181c;
  --dp-felt-label: #b9bfca;
  --dp-slot: #0b0c0e;
}

/* ---------- Cabinet ---------- */

.cabinet {
  --dp-h: clamp(560px, 52cqi, 650px);
  --dp-corniceH: 28px;
  --dp-plinthH: 30px;
  --dp-bandH: calc(var(--dp-h) * 0.19);
  --dp-lowerH: calc(var(--dp-h) * 0.27);
  --dp-stile: 24px;
  --dp-frame: 14px;
  --dp-gap: 12px;
  --dp-trayPadY: 18px;
  --dp-title-size: clamp(36px, 5.2cqi, 64px);

  position: relative;
  box-sizing: border-box;
  display: grid;
  grid-template-rows: var(--dp-corniceH) minmax(0, 1fr) var(--dp-bandH) var(--dp-lowerH) var(--dp-plinthH);
  inline-size: 100%;
  max-inline-size: 1320px;
  block-size: var(--dp-h);
  margin-inline: auto;
  padding-inline: var(--dp-stile);
  border-radius: 6px 6px 2px 2px;
  background-image: var(--dp-img-v);
  background-size: var(--dp-size-v);
  box-shadow:
    inset 0 0 0 1px rgba(255, 238, 195, 0.2),
    inset 0 0 0 2px rgba(60, 32, 10, 0.3),
    0 46px 60px -28px rgba(0, 0, 0, 0.9),
    0 10px 22px -8px rgba(0, 0, 0, 0.7);
}

.lamp {
  position: absolute;
  inset: 0;
  z-index: 6;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(75% 65% at 16% 0%, rgba(255, 220, 160, 0.16) 0%, transparent 70%),
    linear-gradient(180deg, transparent 52%, rgba(14, 6, 1, 0.34) 100%);
}

.cornice {
  position: relative;
  z-index: 4;
  margin-inline: calc(var(--dp-stile) * -1 - 10px);
  border-radius: 5px 5px 2px 2px;
  background-image:
    linear-gradient(180deg, rgba(255, 246, 222, 0.7) 0 2px, transparent 2px 9px, rgba(60, 30, 8, 0.28) 9px 10px, transparent 10px),
    var(--dp-img-h);
  background-size: 100% 100%, var(--dp-size-h);
  box-shadow:
    inset 0 -2px 0 rgba(60, 30, 8, 0.4),
    0 12px 16px -6px rgba(8, 3, 0, 0.6),
    0 0 0 1px rgba(40, 20, 6, 0.55);
}

.plinth {
  position: relative;
  margin-inline: calc(var(--dp-stile) * -1 + 16px);
  border-radius: 0 0 3px 3px;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.55), transparent 55%),
    linear-gradient(180deg, #2c1d10, #170e07);
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.14);
}

/* ---------- Upper doors ---------- */

.upper {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 46fr 54fr;
  gap: var(--dp-gap);
  padding-block: 10px 12px;
  min-block-size: 0;
}

.door {
  position: relative;
  box-sizing: border-box;
  min-inline-size: 0;
  min-block-size: 0;
  padding: var(--dp-frame);
  border-radius: 3px;
  background-image: var(--dp-img-v);
  background-size: var(--dp-size-v);
  box-shadow:
    0 0 0 1.5px rgba(30, 15, 4, 0.75),
    inset 1px 1px 0 rgba(255, 242, 210, 0.5),
    inset -1px -1px 0 rgba(50, 25, 6, 0.4),
    0 4px 8px -2px rgba(30, 14, 3, 0.4);
}

.panel {
  position: relative;
  box-sizing: border-box;
  block-size: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  padding: 10px clamp(18px, 3cqi, 40px);
  overflow: clip;
  border-radius: 2px;
  background-image: linear-gradient(rgba(70, 38, 10, 0.1), rgba(70, 38, 10, 0.1)), var(--dp-seams), var(--dp-img-v);
  background-size: 100% 100%, 100% 100%, var(--dp-size-v);
  box-shadow:
    inset 4px 5px 10px rgba(40, 20, 4, 0.5),
    inset -1px -1px 0 rgba(255, 240, 205, 0.5),
    0 0 0 1px rgba(255, 240, 205, 0.28);
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
  filter: drop-shadow(0 1px 0 var(--dp-inlay-edge));
}

.subtitle {
  margin: 0;
  padding-block-start: 10px;
  border-block-start: 1px solid color-mix(in srgb, var(--dp-ink) 38%, transparent);
  color: var(--dp-ink-muted);
  text-shadow: 0 0 0.7em var(--dp-halo), 0 0 0.35em var(--dp-halo), 0 0 0.15em var(--dp-halo);
  font-size: clamp(17px, 2.1cqi, 22px);
  line-height: 1.38;
  font-weight: 500;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

/* Glazed door: painted dining-room scene under the photo, so the glass is never empty */

.doorGlass {
  padding: calc(var(--dp-frame) - 2px);
}

.window {
  position: relative;
  block-size: 100%;
  overflow: clip;
  border-radius: 2px;
  background: #170d06;
  box-shadow:
    0 0 0 3px var(--dp-brass),
    0 0 0 4px rgba(20, 8, 0, 0.55),
    0 0 0 5px rgba(255, 236, 190, 0.28);
}

.scene {
  position: absolute;
  inset: 0;
  overflow: clip;
  background: linear-gradient(180deg, #1b0f08 0%, #2e1a0d 52%, #170c05 100%);
}

.sceneLamps {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 9% 18%, #ffdfa6 0 4px, rgba(255, 176, 84, 0.5) 5px 18px, transparent 21px),
    radial-gradient(circle at 24% 9%, #ffd391 0 3px, rgba(255, 168, 78, 0.45) 4px 14px, transparent 17px),
    radial-gradient(circle at 41% 22%, #ffe1ad 0 5px, rgba(255, 180, 88, 0.5) 6px 22px, transparent 26px),
    radial-gradient(circle at 58% 8%, #ffd896 0 3px, rgba(255, 164, 70, 0.45) 4px 15px, transparent 18px),
    radial-gradient(circle at 74% 24%, #ffe4b4 0 5px, rgba(255, 182, 92, 0.5) 6px 20px, transparent 24px),
    radial-gradient(circle at 90% 12%, #ffd08a 0 4px, rgba(255, 160, 66, 0.45) 5px 17px, transparent 20px),
    radial-gradient(60% 70% at 66% 12%, rgba(255, 150, 60, 0.3), transparent 72%);
}

.sceneWall {
  position: absolute;
  inset: 0 0 40% 0;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.35), transparent 22%, transparent 78%, rgba(0, 0, 0, 0.35)),
    linear-gradient(180deg, transparent 40%, rgba(0, 0, 0, 0.35));
}

.sceneTable {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  block-size: 44%;
  background:
    linear-gradient(180deg, rgba(255, 244, 215, 0.55) 0 2px, transparent 2px),
    linear-gradient(180deg, #ecdcb9 0%, #cfb182 38%, #7b5731 100%);
  box-shadow: inset 0 12px 16px -8px rgba(0, 0, 0, 0.45);
}

.scenePlate {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-end: 12%;
  inline-size: 34%;
  aspect-ratio: 3.3 / 1;
  border-radius: 50%;
  transform: translateX(-50%);
  background: radial-gradient(ellipse at 50% 42%, #fbf6ea 0 38%, #e6dcc8 62%, #b6aa94 100%);
  box-shadow:
    0 7px 10px -2px rgba(0, 0, 0, 0.55),
    inset 0 -3px 5px rgba(80, 60, 30, 0.35);
}

.sceneFood {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-end: 17%;
  inline-size: 12%;
  aspect-ratio: 2.6 / 1;
  border-radius: 50%;
  transform: translateX(-50%);
  background:
    radial-gradient(ellipse at 38% 40%, #6d9340 0 28%, transparent 46%),
    radial-gradient(ellipse at 62% 44%, #4f7330 0 26%, transparent 44%),
    radial-gradient(ellipse at 50% 55%, #c8602a 0 52%, #8a3a14 74%, transparent 78%);
}

.sceneGlass {
  position: absolute;
  inset-block-end: 24%;
  inline-size: 5.5%;
  block-size: 42%;
  border-radius: 8px 8px 30% 30% / 6px 6px 18% 18%;
  background:
    linear-gradient(180deg, transparent 0 55%, rgba(255, 190, 110, 0.28) 55% 92%, transparent 92%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0.05) 45%, rgba(255, 255, 255, 0.3));
  box-shadow: inset 0 0 0 1px rgba(255, 235, 200, 0.28);
}

.sceneGlassA {
  inset-inline-start: 14%;
}

.sceneGlassB {
  inset-inline-start: 21%;
  block-size: 36%;
}

.sceneCandle {
  position: absolute;
  inset-inline-start: 82%;
  inset-block-end: 28%;
  inline-size: 2.6%;
  block-size: 20%;
  border-radius: 2px;
  background:
    radial-gradient(circle at 50% -10%, #fff4cf 0 3px, #ffb24a 5px, rgba(255, 150, 50, 0.45) 12px, transparent 34px),
    linear-gradient(90deg, #d8c9a4, #f4ead0 50%, #b6a680);
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
  background:
    linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.11) 30% 37%, transparent 37% 43%, rgba(255, 255, 255, 0.07) 43% 46%, transparent 46%),
    linear-gradient(180deg, rgba(255, 224, 170, 0.14), transparent 40%);
  transform: translateX(calc(var(--dp-pull) * 7%));
}

.glareEdge {
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow:
    inset 0 10px 16px -6px rgba(0, 0, 0, 0.65),
    inset 10px 0 16px -8px rgba(0, 0, 0, 0.45),
    inset 0 0 0 1px rgba(0, 0, 0, 0.6);
}

/* Door hardware */

.hinge {
  position: absolute;
  inset-inline-start: 4px;
  inline-size: 8px;
  block-size: 34px;
  border-radius: 1.5px;
  background:
    radial-gradient(circle at 50% 18%, rgba(60, 35, 10, 0.8) 0 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 82%, rgba(60, 35, 10, 0.8) 0 1.4px, transparent 1.8px),
    linear-gradient(90deg, var(--dp-brass-lo), var(--dp-brass-hi) 45%, var(--dp-brass) 70%, var(--dp-brass-lo));
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
}

.hingeTop {
  inset-block-start: 12%;
}

.hingeBottom {
  inset-block-end: 12%;
}

.hingeFar {
  inset-inline-start: auto;
  inset-inline-end: 4px;
}

.knob {
  position: absolute;
  inline-size: 16px;
  block-size: 16px;
  border-radius: 50%;
  z-index: 2;
  background: radial-gradient(circle at 35% 30%, var(--dp-brass-hi), var(--dp-brass) 50%, var(--dp-brass-lo) 100%);
  box-shadow:
    0 2px 3px rgba(8, 3, 0, 0.55),
    0 0 0 2px rgba(60, 35, 10, 0.25);
}

.knobSide {
  inset-inline-end: 1px;
  inset-block-start: calc(50% - 8px);
}

.knobSideFar {
  inset-inline-start: 1px;
  inset-block-start: calc(50% - 8px);
}

/* ---------- Drawer band ---------- */

.band {
  position: relative;
  z-index: 3;
}

.slot {
  position: absolute;
  inset: 0;
  border-radius: 3px;
  background: linear-gradient(180deg, #050301, var(--dp-slot));
  box-shadow:
    0 0 0 1.5px rgba(30, 15, 4, 0.8),
    inset 0 6px 8px rgba(0, 0, 0, 0.8);
}

.tray {
  position: absolute;
  z-index: 2;
  inset-inline: 4px;
  inset-block-start: 4px;
  block-size: 0;
  overflow: clip;
  border-radius: 2px 2px 0 0;
}

.interior {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  box-sizing: border-box;
  padding: var(--dp-trayPadY) 34px var(--dp-trayPadY);
  visibility: hidden;
  transform: translateY(calc((var(--dp-pull) - 1) * var(--dp-travel)));
  background: radial-gradient(130% 120% at 50% 0%, var(--dp-felt) 0%, var(--dp-felt-lo) 100%);
  box-shadow:
    inset 0 16px 20px -10px rgba(0, 0, 0, 0.7),
    inset 0 -18px 18px -12px rgba(0, 0, 0, 0.6);
}

.feltTexture {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: var(--dp-noise);
  opacity: 0.55;
  mix-blend-mode: overlay;
}

.wall {
  position: absolute;
  inset-block: 0;
  inline-size: 13px;
  background-image: linear-gradient(90deg, rgba(0, 0, 0, 0.35), transparent 40%, rgba(0, 0, 0, 0.3)), var(--dp-img-v);
  background-size: 100% 100%, var(--dp-size-v);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
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
  column-gap: 40px;
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
  letter-spacing: 0.08em;
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

/* Drawer front */

.front {
  --dp-lift: 0px;
  --dp-shine: 1;

  position: absolute;
  z-index: 3;
  inset-inline: 4px;
  inset-block: 4px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  column-gap: 28px;
  padding: 0 clamp(14px, 3cqi, 40px);
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font: inherit;
  color: inherit;
  -webkit-tap-highlight-color: transparent;
  transform-origin: 50% 0;
  transform: translateY(calc(var(--dp-pull) * var(--dp-travel))) scale(calc(1 + var(--dp-pull) * 0.012));
  background-image: linear-gradient(180deg, rgba(255, 246, 222, 0.3) 0 1px, transparent 1px), var(--dp-img-h);
  background-size: 100% 100%, var(--dp-size-h);
  box-shadow:
    inset 0 -2px 0 rgba(60, 30, 8, 0.35),
    0 0 0 1.5px rgba(34, 17, 5, 0.75),
    0 calc(3px + var(--dp-pull) * 22px) calc(6px + var(--dp-pull) * 28px) calc(var(--dp-pull) * -5px) rgba(6, 3, 1, 0.62);
}

.front:focus-visible {
  outline: 3px solid var(--dp-focus);
  outline-offset: 4px;
  /* two-tone ring: the gap colour keeps the ring legible on light and dark wood alike */
  box-shadow:
    0 0 0 3px var(--dp-focus-gap),
    inset 0 -2px 0 rgba(60, 30, 8, 0.35),
    0 0 0 1.5px rgba(34, 17, 5, 0.75),
    0 calc(3px + var(--dp-pull) * 22px) calc(6px + var(--dp-pull) * 28px) calc(var(--dp-pull) * -5px) rgba(6, 3, 1, 0.62);
}

.front:hover {
  --dp-lift: -1px;
  --dp-shine: 1.08;
}

.front:active {
  --dp-lift: 1px;
  --dp-shine: 0.96;
}

.frontField {
  position: absolute;
  inset: 9px;
  border-radius: 2px;
  pointer-events: none;
  background: linear-gradient(rgba(70, 38, 10, 0.1), rgba(70, 38, 10, 0.1));
  box-shadow:
    inset 3px 4px 8px rgba(40, 20, 4, 0.42),
    inset -1px -1px 0 rgba(255, 240, 205, 0.5),
    0 0 0 1px rgba(255, 240, 205, 0.25);
}

.holder {
  position: relative;
  justify-self: center;
  max-inline-size: 100%;
  padding: 3px;
  border-radius: 2px;
  background: linear-gradient(135deg, var(--dp-brass-hi), var(--dp-brass) 45%, var(--dp-brass-lo));
  box-shadow:
    0 2px 3px rgba(8, 3, 0, 0.5),
    inset 0 1px 0 rgba(255, 250, 235, 0.6);
}

.holderCard {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  padding: 7px 14px 6px;
  border-radius: 1px;
  background: linear-gradient(180deg, #f6edd6, var(--dp-card));
  box-shadow: inset 0 1px 3px rgba(60, 40, 10, 0.4);
  color: var(--dp-card-ink);
  font-size: clamp(15px, 1.7cqi, 18px);
  line-height: 1.25;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-align: center;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.pull {
  position: relative;
  grid-column: 2;
  inline-size: clamp(140px, 22cqi, 300px);
  block-size: 30px;
  transform: translateY(calc(var(--dp-lift) + var(--dp-pull) * 2px));
  transition: transform 160ms ease;
  filter: brightness(var(--dp-shine));
}

.pullPost {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 8%;
  inline-size: 12px;
  block-size: 20px;
  border-radius: 3px 3px 1px 1px;
  background: linear-gradient(90deg, var(--dp-brass-lo), var(--dp-brass-hi) 45%, var(--dp-brass));
  box-shadow: 0 2px 3px rgba(8, 4, 1, 0.55);
}

.pullPostEnd {
  inset-inline-start: auto;
  inset-inline-end: 8%;
}

.pullBar {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 10px;
  block-size: 16px;
  border-radius: 8px;
  overflow: clip;
  background:
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.12) 0 1px, transparent 1px 4px),
    linear-gradient(
      180deg,
      var(--dp-brass-hi) 0%,
      var(--dp-brass) 42%,
      var(--dp-brass-lo) 58%,
      color-mix(in srgb, var(--dp-brass) 72%, var(--dp-brass-hi)) 100%
    );
  box-shadow:
    0 5px 8px rgba(8, 4, 1, 0.45),
    inset 0 1px 0 rgba(255, 250, 235, 0.65),
    inset 0 -1px 1px rgba(60, 35, 10, 0.55);
}

.glint {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: 60px;
  mix-blend-mode: screen;
  background: linear-gradient(100deg, transparent, rgba(255, 244, 210, 0.9) 50%, transparent);
  transform: translateX(-90px);
  animation: dpGlint 8s ease-in-out infinite;
}

@keyframes dpGlint {
  0% {
    transform: translateX(-90px);
  }
  16% {
    transform: translateX(340px);
  }
  100% {
    transform: translateX(340px);
  }
}

/* ---------- Lower doors ---------- */

.lower {
  position: relative;
  z-index: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--dp-gap);
  padding-block: 10px 6px;
}

.lowerDoor {
  position: relative;
  box-sizing: border-box;
  padding: var(--dp-frame);
  border-radius: 3px;
  background-image: var(--dp-img-v);
  background-size: var(--dp-size-v);
  box-shadow:
    0 0 0 1.5px rgba(30, 15, 4, 0.75),
    inset 1px 1px 0 rgba(255, 242, 210, 0.5),
    inset -1px -1px 0 rgba(50, 25, 6, 0.4);
}

.lowerPanel {
  display: block;
  block-size: 100%;
  border-radius: 2px;
  background-image: linear-gradient(rgba(70, 38, 10, 0.1), rgba(70, 38, 10, 0.1)), var(--dp-seams), var(--dp-img-v);
  background-size: 100% 100%, 100% 100%, var(--dp-size-v);
  box-shadow:
    inset 4px 5px 10px rgba(40, 20, 4, 0.5),
    inset -1px -1px 0 rgba(255, 240, 205, 0.5),
    0 0 0 1px rgba(255, 240, 205, 0.28);
}

.knobLowerA {
  inset-inline-end: 1px;
  inset-block-start: 9px;
}

.knobLowerB {
  inset-inline-start: 1px;
  inset-block-start: 9px;
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
    --dp-corniceH: 22px;
    --dp-plinthH: 26px;
    --dp-bandH: calc(var(--dp-h) * 0.17);
    --dp-lowerH: calc(var(--dp-h) * 0.3);
    --dp-stile: 14px;
    --dp-frame: 11px;
    --dp-gap: 9px;
    --dp-trayPadY: 14px;
    --dp-title-size: clamp(26px, 9.2cqi, 40px);
  }

  .upper {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
    padding-block: 8px 10px;
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

  .hingeFar {
    inset-inline-end: auto;
    inset-inline-start: 4px;
  }

  .knobSideFar {
    inset-inline-start: auto;
    inset-inline-end: 1px;
  }

  .front {
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
    align-content: center;
    gap: 6px;
    padding-inline: 12px;
  }

  .holder {
    grid-column: 1;
  }

  .pull {
    grid-column: 1;
    inline-size: clamp(120px, 44cqi, 180px);
    block-size: 26px;
  }

  .pullBar {
    inset-block-start: 8px;
    block-size: 14px;
  }

  .pullPost {
    block-size: 17px;
  }

  .holderCard {
    padding: 6px 12px 5px;
    font-size: 15px;
    letter-spacing: 0.06em;
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
    inline-size: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .root {
    --dp-pull: 1;
  }
  .glint {
    animation: none;
  }
  .pull {
    transition: none;
  }
  .photo {
    transition: none;
  }
}
```
