import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface DrumPhoto {
  image: string;
  caption: string;
}

export interface DrumRingCarouselProps {
  photos?: DrumPhoto[];
  drumRadius?: number;
  spinSpeed?: number;
  backgroundTone?: string;
  className?: string;
}

const photo = (id: string) => `https://images.unsplash.com/photo-${id}?w=900&h=1100&fit=crop&q=80`;

export const defaultPhotos: DrumPhoto[] = [
  { image: photo('1487958449943-2429e8be8625'), caption: 'White Pavilion, morning light' },
  { image: photo('1493246507139-91e8fad9978e'), caption: 'Glacier lake at first thaw' },
  { image: photo('1518005020951-eccb494ad742'), caption: 'Twin towers, study in blue' },
  { image: photo('1490750967868-88aa4486c946'), caption: 'Poppies against the open sky' },
  { image: photo('1513694203232-719a280e022f'), caption: 'Quiet room with dried grasses' },
  { image: photo('1501785888041-af3ef285b470'), caption: 'Rowboat on emerald water' },
  { image: photo('1506905925346-21bda4d32df4'), caption: 'Above the sea of clouds' },
  { image: photo('1503387762-592deb58ef4e'), caption: 'Drafting the new gallery wing' },
];

type Geo = { r: number; step: number; reach: number };
type Mode = 'rest' | 'spring' | 'drag';

const STIFFNESS = 95;
const DAMPING = 17;
const RESUME_MS = 3200;
const FLING = 0.32;
const STAGE_HELP = 'Drag or swipe to turn the drum. Left and right arrow keys step through the photos; Enter opens the photo in front.';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const pad = (n: number) => String(n).padStart(2, '0');
const wrapIndex = (i: number, n: number) => ((Math.round(i) % n) + n) % n;
const offsetOf = (i: number, pos: number, n: number) => {
  const d = (((i - pos) % n) + n) % n;
  return d >= n / 2 ? d - n : d;
};

function geometry(width: number, radius: number, panelW: number, n: number): Geo {
  const r = Math.max(clamp(radius, 300, 2000) * clamp(width / 1100, 0.45, 1), panelW * 1.5);
  const step = 2 * Math.asin(Math.min(0.9, (panelW * 1.1) / (2 * r)));
  return { r, step, reach: Math.min(2.7, n / 2 - 0.25) };
}

function panelStyle(offset: number, g: Geo): CSSProperties {
  const d = Math.abs(offset);
  const fade = clamp((g.reach - d) / 0.6, 0, 1);
  return {
    transform: `translateZ(${g.r.toFixed(1)}px) rotateY(${(-offset * g.step).toFixed(4)}rad) translateZ(${(-g.r).toFixed(1)}px)`,
    opacity: fade.toFixed(3),
    visibility: fade > 0 ? 'visible' : 'hidden',
    filter: `brightness(${(1.05 - Math.min(d, 2.4) * 0.27).toFixed(3)}) blur(${(Math.min(d, 2.4) * 1.7).toFixed(2)}px) saturate(${(1.05 - Math.min(d, 2) * 0.26).toFixed(3)})`,
    zIndex: 10 - Math.round(d),
  } as CSSProperties;
}

function Mount({ item, eager }: { item: DrumPhoto; eager?: boolean }) {
  return (
    <>
      <span className={styles.board} aria-hidden="true" />
      <span className={styles.window}>
        {item.image ? (
          <img className={styles.img} src={item.image} alt="" draggable={false} loading={eager ? 'eager' : 'lazy'} />
        ) : (
          <span className={styles.blank} />
        )}
        <span className={styles.bevel} aria-hidden="true" />
      </span>
      <span className={styles.light} aria-hidden="true" />
    </>
  );
}

export default function DrumRingCarousel({
  photos = defaultPhotos,
  drumRadius = 860,
  spinSpeed = 4,
  backgroundTone = '#0a0e1a',
  className,
}: DrumRingCarouselProps) {
  const n = photos.length;
  const [reduced, setReduced] = useState(false);
  const [width, setWidth] = useState(1000);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [playOn, setPlayOn] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(true);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelEls = useRef<(HTMLDivElement | null)[]>([]);
  const pos = useRef(0);
  const vel = useRef(0);
  const target = useRef(0);
  const mode = useRef<Mode>('rest');
  const lastTouch = useRef(-Infinity);
  const drag = useRef({ id: -1, x0: 0, lastX: 0, lastT: 0, v: 0, moved: false, hit: -1 });

  const panelW = Math.round(clamp(width * (width < 600 ? 0.5 : 0.3), 150, 300));
  const panelH = Math.round(panelW * 1.24);
  const geo = geometry(width, drumRadius, panelW, n);
  const geoRef = useRef(geo);
  geoRef.current = geo;

  const drift = n > 1 && spinSpeed > 0;
  const isPlaying = drift && playOn && !hovered && !focused && open === null && !reduced;
  const playingRef = useRef(isPlaying);
  playingRef.current = isPlaying;

  const paint = useCallback(() => {
    const g = geoRef.current;
    panelEls.current.forEach((el, i) => {
      if (!el) return;
      const s = panelStyle(offsetOf(i, pos.current, n), g);
      el.style.transform = s.transform as string;
      el.style.opacity = s.opacity as string;
      el.style.visibility = s.visibility as string;
      el.style.filter = s.filter as string;
      el.style.zIndex = String(s.zIndex);
    });
    const a = n ? wrapIndex(pos.current, n) : 0;
    setActive((prev) => (prev === a ? prev : a));
  }, [n]);

  const settle = useCallback((to: number) => {
    target.current = to;
    mode.current = 'spring';
    lastTouch.current = performance.now();
  }, []);

  const stepBy = useCallback(
    (dir: number) => {
      if (n < 2) return;
      if (reduced) {
        const track = trackRef.current;
        const item = track?.firstElementChild as HTMLElement | null;
        if (track && item) track.scrollBy({ left: dir * (item.offsetWidth + 24) * (getComputedStyle(track).direction === 'rtl' ? -1 : 1) });
        return;
      }
      const base = mode.current === 'spring' ? target.current : Math.round(pos.current);
      settle(base + dir);
    },
    [n, reduced, settle],
  );

  const goTo = useCallback(
    (i: number) => {
      const base = Math.round(pos.current);
      settle(base + offsetOf(i, base, n));
    },
    [n, settle],
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
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(root);
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.02 });
    io.observe(root);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!reduced) paint();
  }, [reduced, width, drumRadius, n, paint]);

  useEffect(() => {
    if (reduced || !inView || n === 0) return;
    let last = performance.now();
    let id = 0;
    let cruise = 0;
    const speed = clamp(spinSpeed, 0, 10) * 0.035;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const m = mode.current;
      let moved = false;
      if (m === 'spring') {
        const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
        const h = dt / steps;
        for (let s = 0; s < steps; s++) {
          vel.current += (STIFFNESS * (target.current - pos.current) - DAMPING * vel.current) * h;
          pos.current += vel.current * h;
        }
        moved = true;
        if (Math.abs(target.current - pos.current) < 0.0005 && Math.abs(vel.current) < 0.002) {
          pos.current = target.current;
          vel.current = 0;
          mode.current = 'rest';
        }
        cruise = 0;
      } else if (m === 'rest') {
        const wantDrift = playingRef.current && now - lastTouch.current > RESUME_MS;
        cruise += ((wantDrift ? speed : 0) - cruise) * Math.min(1, dt * 1.4);
        if (cruise > 0.0004) {
          pos.current += cruise * dt;
          moved = true;
        } else if (!wantDrift && Math.abs(pos.current - Math.round(pos.current)) > 0.001) {
          settle(Math.round(pos.current));
        }
      }
      if (moved) paint();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [reduced, inView, n, spinSpeed, paint, settle]);

  useEffect(() => {
    if (open !== null) closeRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(null);
    lastTouch.current = performance.now();
    (reduced ? trackRef.current : stageRef.current)?.focus();
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || n === 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const hitEl = (e.target as HTMLElement).closest('[data-index]');
    const hit = hitEl ? Number(hitEl.getAttribute('data-index')) : -1;
    drag.current = { id: e.pointerId, x0: e.clientX, lastX: e.clientX, lastT: performance.now(), v: 0, moved: false, hit };
    vel.current = 0;
    mode.current = 'drag';
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d.id !== e.pointerId) return;
    const now = performance.now();
    const dx = e.clientX - d.lastX;
    if (Math.abs(e.clientX - d.x0) > 6) d.moved = true;
    const items = -dx / (panelW * 1.05);
    pos.current += items;
    const dt = Math.max(0.001, (now - d.lastT) / 1000);
    d.v = d.v * 0.7 + (items / dt) * 0.3;
    d.lastX = e.clientX;
    d.lastT = now;
    paint();
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d.id !== e.pointerId) return;
    d.id = -1;
    if (!d.moved) {
      const i = d.hit;
      settle(Math.round(pos.current));
      if (i === wrapIndex(pos.current, n)) setOpen(i);
      else if (i >= 0) goTo(i);
      return;
    }
    const fling = clamp(d.v * FLING, -4, 4);
    vel.current = d.v;
    settle(Math.round(pos.current + fling));
  };

  const onPointerCancel = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current.id !== e.pointerId) return;
    drag.current.id = -1;
    settle(Math.round(pos.current));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (dir) {
      e.preventDefault();
      const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
      stepBy(rtl ? -dir : dir);
    } else if ((e.key === 'Enter' || e.key === ' ') && n > 0) {
      e.preventDefault();
      setOpen(reduced ? 0 : active);
    }
  };

  const onRootKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (open === null) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      closeRef.current?.focus();
    }
  };

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
  };

  const current = photos[active];
  const opened = open !== null ? photos[open] : undefined;
  const rootStyle = {
    '--dr-tone': backgroundTone,
    '--dr-panel-w': `${panelW}px`,
    '--dr-panel-h': `${panelH}px`,
    '--dr-perspective': `${Math.round(geo.r * 1.35)}px`,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={[styles.root, reduced && styles.rootStatic, className].filter(Boolean).join(' ')}
      style={rootStyle}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
      onKeyDown={onRootKeyDown}
    >
      <span className={styles.stars} aria-hidden="true" />
      <span className={styles.wall} aria-hidden="true" />
      <span className={styles.lamp} aria-hidden="true" />
      <span className={styles.floor} aria-hidden="true" />
      <span className={styles.plaster} aria-hidden="true" />

      {reduced ? (
        <div
          ref={trackRef}
          className={styles.track}
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label="Photo gallery"
          aria-description="Scroll sideways or use the arrow buttons. Select a photo to open it."
          onKeyDown={(e) => {
            const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
            if (dir) {
              e.preventDefault();
              stepBy(dir);
            }
          }}
        >
          {photos.map((p, i) => (
            <figure key={i} className={styles.slide}>
              <button
                type="button"
                className={styles.slideButton}
                aria-label={`Open photo ${i + 1} of ${n}${p.caption ? `: ${p.caption}` : ''}`}
                onClick={() => setOpen(i)}
              >
                <Mount item={p} eager={i < 4} />
              </button>
              {p.caption && <figcaption className={styles.slideCaption}>{p.caption}</figcaption>}
            </figure>
          ))}
        </div>
      ) : (
        <div
          ref={stageRef}
          className={styles.stage}
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label="Photo gallery"
          aria-description={STAGE_HELP}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <div className={styles.drum}>
            {photos.map((p, i) => (
              <div
                key={i}
                ref={(el) => {
                  panelEls.current[i] = el;
                }}
                className={styles.panel}
                data-index={i}
                style={panelStyle(offsetOf(i, pos.current, n), geo)}
                aria-hidden="true"
              >
                <span className={styles.shadow} />
                <span className={styles.mount}>
                  <Mount item={p} eager={Math.abs(offsetOf(i, 0, n)) < 3} />
                </span>
                <span className={styles.reflect}>
                  <Mount item={p} />
                </span>
                <span className={styles.pool} aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.bar}>
        <button type="button" className={styles.arrow} onClick={() => stepBy(-1)} disabled={n < 2} aria-label="Previous photo">
          <svg className={styles.arrowIcon} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div className={styles.label} aria-live={isPlaying ? 'off' : 'polite'} aria-atomic="true">
          {!reduced && n > 0 && (
            <>
              <span className={styles.count}>
                {pad(active + 1)}
                <span className={styles.countRule} aria-hidden="true" />
                {pad(n)}
              </span>
              {current?.caption && (
                <span key={active} className={styles.caption}>
                  {current.caption}
                </span>
              )}
            </>
          )}
        </div>
        <button type="button" className={styles.arrow} onClick={() => stepBy(1)} disabled={n < 2} aria-label="Next photo">
          <svg className={styles.arrowIcon} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9.5 5.5 16 12l-6.5 6.5" />
          </svg>
        </button>
      </div>

      {drift && !reduced && (
        <button
          type="button"
          className={styles.pause}
          onClick={() => setPlayOn((v) => !v)}
          aria-label={playOn ? 'Pause rotation' : 'Resume rotation'}
          aria-pressed={!playOn}
        >
          <svg className={styles.pauseIcon} viewBox="0 0 16 16" aria-hidden="true">
            {playOn ? <path d="M5 3.5h2v9H5zM9 3.5h2v9H9z" /> : <path d="M5 3.2v9.6L12.6 8z" />}
          </svg>
        </button>
      )}

      {opened && (
        <div className={styles.viewer} role="dialog" aria-modal="true" aria-label={opened.caption || `Photo ${(open ?? 0) + 1}`} onClick={close}>
          <figure className={styles.viewerFigure} onClick={(e) => e.stopPropagation()}>
            <span className={styles.viewerMount}>
              {opened.image ? (
                <img className={styles.viewerImg} src={opened.image} alt={opened.caption} />
              ) : (
                <span className={styles.blank} />
              )}
            </span>
            {opened.caption && <figcaption className={styles.viewerCaption}>{opened.caption}</figcaption>}
          </figure>
          <button ref={closeRef} type="button" className={styles.close} onClick={close} aria-label="Close photo">
            <svg className={styles.closeIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
