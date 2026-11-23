Create a custom element called "Drum Ring Carousel". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: photos (image, caption), drum radius, spin speed, background tone. Add other settings if they help.

```tsx
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
    filter: `brightness(${(1 - Math.min(d, 2.4) * 0.13).toFixed(3)}) blur(${(Math.min(d, 2.4) * 1.5).toFixed(2)}px) saturate(${(1 - Math.min(d, 2) * 0.12).toFixed(3)})`,
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
  backgroundTone = '#ebe5dc',
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
    '--dr-perspective': `${Math.round(geo.r * 1.6)}px`,
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
      <span className={styles.wall} aria-hidden="true" />
      <span className={styles.floor} aria-hidden="true" />
      <span className={styles.lamp} aria-hidden="true" />
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
```

```css
.root {
  --dr-tone: #ebe5dc;
  --dr-plaster: color-mix(in srgb, var(--dr-tone) 70%, #fff);
  --dr-floor: color-mix(in srgb, var(--dr-tone) 88%, #8a7a66);
  --dr-mount: #fbfaf6;
  --dr-mat-shade: #e9e5dd;
  --dr-ink: #2a2520;
  --dr-muted: rgba(42, 37, 32, 0.62);
  --dr-hairline: rgba(42, 37, 32, 0.16);
  --dr-font-display: 'Fraunces', 'Cormorant Garamond', 'Iowan Old Style', Georgia, serif;
  --dr-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --dr-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0 0.35  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --dr-top: 44px;
  --dr-horizon: calc(var(--dr-top) + 28px + var(--dr-panel-h));

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  display: grid;
  gap: 8px;
  padding-block: var(--dr-top) 32px;
  padding-inline: 0;
  border-radius: 28px;
  background: var(--dr-plaster);
  color: var(--dr-ink);
  font-family: var(--dr-font-ui);
  -webkit-tap-highlight-color: transparent;
}

.rootStatic {
  --dr-horizon: calc(var(--dr-top) + 8px + var(--dr-panel-w) * 0.86 * 1.24);
}

.wall,
.floor,
.lamp,
.plaster {
  position: absolute;
  pointer-events: none;
  z-index: -1;
}

.wall {
  inset-inline: 0;
  inset-block: 0 calc(100% - var(--dr-horizon));
  background:
    repeating-linear-gradient(90deg, transparent 0 calc(25% - 1px), rgba(120, 104, 86, 0.05) calc(25% - 1px) 25%),
    linear-gradient(180deg, color-mix(in srgb, var(--dr-plaster) 92%, #fff) 0%, var(--dr-plaster) 70%, color-mix(in srgb, var(--dr-tone) 96%, #7d6e5c) 100%);
}

.floor {
  inset-inline: 0;
  inset-block: var(--dr-horizon) 0;
  background:
    radial-gradient(70% 60% at 50% 0%, rgba(255, 255, 255, 0.55), transparent 70%),
    linear-gradient(180deg, var(--dr-floor) 0%, color-mix(in srgb, var(--dr-floor) 92%, var(--dr-plaster)) 100%);
  box-shadow: 0 -1px 0 rgba(255, 255, 255, 0.7), inset 0 1px 0 rgba(90, 76, 60, 0.12);
}

.lamp {
  inset-block-start: -30%;
  inset-inline-start: 50%;
  inline-size: min(90%, 900px);
  aspect-ratio: 1.6;
  translate: -50% 0;
  background: radial-gradient(closest-side, rgba(255, 252, 244, 0.95), rgba(255, 252, 244, 0) 100%);
  filter: blur(10px);
}

.plaster {
  inset: 0;
  background-image: var(--dr-noise);
  opacity: 0.3;
  mix-blend-mode: multiply;
}

.stage {
  position: relative;
  block-size: calc(var(--dr-panel-h) * 1.42 + 28px);
  outline: none;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}

.stage:active {
  cursor: grabbing;
}

.stage:focus-visible {
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--dr-ink) 55%, transparent);
  border-radius: 20px;
}

.drum {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 28px;
  block-size: var(--dr-panel-h);
  perspective: var(--dr-perspective);
  perspective-origin: 50% 42%;
}

.panel {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: calc(50% - var(--dr-panel-w) / 2);
  inline-size: var(--dr-panel-w);
  block-size: var(--dr-panel-h);
  backface-visibility: hidden;
  will-change: transform, filter, opacity;
}

.mount,
.reflect {
  position: absolute;
  inset-inline: 0;
  display: block;
}

.mount {
  inset-block: 0;
}

.reflect {
  inset-block-start: calc(100% + 4px);
  block-size: 100%;
  transform: scaleY(-1);
  opacity: 0.32;
  filter: blur(1.2px);
  pointer-events: none;
  -webkit-mask-image: linear-gradient(to top, #000 0%, rgba(0, 0, 0, 0.35) 18%, transparent 42%);
  mask-image: linear-gradient(to top, #000 0%, rgba(0, 0, 0, 0.35) 18%, transparent 42%);
}

.shadow {
  position: absolute;
  inset-inline: 4%;
  inset-block-start: calc(100% - 10px);
  block-size: 20px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(70, 56, 40, 0.34), transparent);
  filter: blur(4px);
}

.board {
  position: absolute;
  inset: 0;
  border-radius: 3px;
  background:
    linear-gradient(180deg, #fff 0%, var(--dr-mount) 45%, color-mix(in srgb, var(--dr-mount) 94%, #b9ad9c) 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.9),
    0 1px 2px rgba(70, 56, 40, 0.1),
    0 22px 44px -20px rgba(70, 56, 40, 0.42);
}

.window {
  position: absolute;
  inset: 8.5% 8.5% 11%;
  overflow: hidden;
  background: var(--dr-mat-shade);
}

.img,
.viewerImg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

.blank {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  background:
    linear-gradient(135deg, transparent 49.6%, rgba(42, 37, 32, 0.1) 50%, transparent 50.4%),
    linear-gradient(180deg, var(--dr-mat-shade), color-mix(in srgb, var(--dr-mat-shade) 85%, var(--dr-tone)));
}

.bevel {
  position: absolute;
  inset: 0;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.95),
    0 0 0 2px rgba(160, 148, 130, 0.22),
    inset 0 2px 4px rgba(30, 22, 14, 0.22);
}

.light {
  position: absolute;
  inset: 0;
  border-radius: 3px;
  background: linear-gradient(172deg, rgba(255, 253, 246, 0.38) 0%, rgba(255, 253, 246, 0) 38%, rgba(60, 46, 30, 0.06) 100%);
  mix-blend-mode: soft-light;
}

.bar {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 20px;
  inline-size: min(100% - 40px, 620px);
  justify-self: center;
}

.arrow,
.pause,
.close {
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--dr-hairline);
  border-radius: 50%;
  background: color-mix(in srgb, var(--dr-plaster) 60%, transparent);
  color: var(--dr-ink);
  cursor: pointer;
  transition: background-color 180ms ease, border-color 180ms ease, transform 160ms ease;
}

.arrow {
  inline-size: 44px;
  block-size: 44px;
}

.arrow:hover,
.pause:hover,
.close:hover {
  background: #fff;
  border-color: rgba(42, 37, 32, 0.28);
}

.arrow:active,
.pause:active,
.close:active {
  transform: scale(0.95);
}

.arrow:disabled {
  opacity: 0.35;
  cursor: default;
}

.arrow:focus-visible,
.pause:focus-visible,
.close:focus-visible,
.slideButton:focus-visible,
.track:focus-visible {
  outline: 2px solid var(--dr-ink);
  outline-offset: 3px;
}

.arrowIcon,
.closeIcon {
  inline-size: 20px;
  block-size: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.arrowIcon:dir(rtl) {
  transform: scaleX(-1);
}

.label {
  display: grid;
  justify-items: center;
  gap: 6px;
  min-block-size: 64px;
  align-content: center;
  text-align: center;
}

.count {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.14em;
  font-variant-numeric: tabular-nums;
  color: var(--dr-muted);
}

.countRule {
  inline-size: 28px;
  block-size: 1px;
  background: currentColor;
  opacity: 0.6;
}

.caption {
  max-inline-size: 100%;
  font-family: var(--dr-font-display);
  font-size: 24px;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: -0.015em;
  text-wrap: balance;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  animation: captionIn 520ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes captionIn {
  from {
    opacity: 0;
    transform: translateY(6px);
    filter: blur(3px);
  }
  to {
    opacity: 1;
    transform: none;
    filter: none;
  }
}

.pause {
  position: absolute;
  inset-block-start: 14px;
  inset-inline-end: 14px;
  inline-size: 36px;
  block-size: 36px;
  color: var(--dr-muted);
  border-color: transparent;
  background: transparent;
}

.pauseIcon {
  inline-size: 14px;
  block-size: 14px;
  fill: currentColor;
}

.track {
  display: flex;
  gap: 24px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 24px;
  padding-inline: 24px;
  padding-block: 8px 4px;
  scrollbar-width: none;
}

.track::-webkit-scrollbar {
  display: none;
}

.slide {
  position: relative;
  flex: 0 0 calc(var(--dr-panel-w) * 0.86);
  margin: 0;
  scroll-snap-align: start;
  display: grid;
  gap: 14px;
}

.slideButton {
  position: relative;
  display: block;
  aspect-ratio: 1 / 1.24;
  padding: 0;
  border: 0;
  background: none;
  cursor: zoom-in;
}

.slideCaption {
  position: relative;
  z-index: 1;
  font-family: var(--dr-font-display);
  font-size: 17px;
  line-height: 1.3;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.viewer {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 56px 24px 32px;
  background: color-mix(in srgb, var(--dr-plaster) 86%, transparent);
  -webkit-backdrop-filter: blur(14px) saturate(0.9);
  backdrop-filter: blur(14px) saturate(0.9);
  animation: viewerIn 280ms ease-out both;
}

@keyframes viewerIn {
  from {
    opacity: 0;
  }
}

.viewerFigure {
  display: grid;
  justify-items: center;
  gap: 16px;
  margin: 0;
  max-inline-size: 100%;
  max-block-size: 100%;
  min-block-size: 0;
  animation: figureIn 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes figureIn {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
}

.viewerMount {
  display: block;
  box-sizing: border-box;
  block-size: min(calc(var(--dr-panel-h) * 1.1), 70cqi);
  aspect-ratio: 1 / 1.2;
  max-inline-size: 100%;
  padding: 18px;
  background: var(--dr-mount);
  border-radius: 3px;
  box-shadow: 0 1px 2px rgba(70, 56, 40, 0.1), 0 30px 60px -28px rgba(70, 56, 40, 0.45);
}

.viewerCaption {
  max-inline-size: 36ch;
  font-family: var(--dr-font-display);
  font-size: 20px;
  line-height: 1.3;
  letter-spacing: -0.01em;
  text-align: center;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.close {
  position: absolute;
  inset-block-start: 14px;
  inset-inline-end: 14px;
  inline-size: 44px;
  block-size: 44px;
}

@container (max-width: 560px) {
  .caption {
    font-size: 19px;
  }

  .bar {
    gap: 12px;
    inline-size: min(100% - 32px, 620px);
  }

  .root {
    border-radius: 20px;
  }
}
```
