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
