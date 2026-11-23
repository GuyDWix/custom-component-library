Create a custom element called "Sliding Door Panels". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: images (image and caption), panel count, auto-advance on/off, advance speed. Add other settings if they help.

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface SlidingDoorImage {
  image: string;
  caption: string;
  alt: string;
}

export interface SlidingDoorPanelsProps {
  images?: SlidingDoorImage[];
  panelCount?: number;
  autoAdvance?: boolean;
  speed?: number;
  className?: string;
}

export const defaultImages: SlidingDoorImage[] = [
  {
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1600&auto=format&fit=crop',
    caption: 'Morning light through the cedar garden',
    alt: 'Sunlight falling through a green forest',
  },
  {
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1600&auto=format&fit=crop',
    caption: 'The long table, set before service',
    alt: 'A candlelit restaurant table',
  },
  {
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1600&auto=format&fit=crop',
    caption: 'A quiet room for slow afternoons',
    alt: 'A calm living room interior',
  },
  {
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1600&auto=format&fit=crop',
    caption: 'From the kitchen: today’s small plates',
    alt: 'Freshly prepared food on a table',
  },
  {
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1600&auto=format&fit=crop',
    caption: 'Evening settles over the courtyard',
    alt: 'A modern house by a pool at dusk',
  },
];

type Phase = 'open' | 'closing' | 'opening';

const SLIDE_MS = 700;
const STAGGER_MS = 62;
/* closed beat: leaves rattle to rest while the photo ghosts through the paper */
const HOLD_MS = 380;
/* tail after the last leaf parks, so its rebound finishes before the caption returns */
const SETTLE_MS = 380;

const clampPanelCount = (n: number) => Math.min(10, Math.max(2, Math.round(n) || 2));
const clampSpeed = (s: number) => Math.min(30, Math.max(3, Math.round(s) || 7));
const wrapIndex = (i: number, len: number) => ((i % len) + len) % len;

export default function SlidingDoorPanels({
  images = defaultImages,
  panelCount = 6,
  autoAdvance = true,
  speed = 7,
  className,
}: SlidingDoorPanelsProps) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('open');
  const [parity, setParity] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [playOn, setPlayOn] = useState(autoAdvance);
  const [narrow, setNarrow] = useState(false);

  const rootRef = useRef<HTMLElement>(null);
  const indexRef = useRef(0);
  const phaseRef = useRef<Phase>('open');
  const pendingRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const swipeRef = useRef<{ id: number; x: number } | null>(null);
  const goRef = useRef<(target: number) => void>(() => undefined);
  const prevAutoRef = useRef(autoAdvance);

  const count = images.length;
  const effPanels = clampPanelCount(panelCount);
  const panelN = narrow ? Math.min(effPanels, 3) : effPanels;
  const dwellMs = clampSpeed(speed) * 1000;
  const isPlaying = autoAdvance && playOn && count > 1 && inView && !hovered && !focusWithin;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (reduced) setPlayOn(false);
  }, [reduced]);

  useEffect(() => {
    if (prevAutoRef.current !== autoAdvance) {
      prevAutoRef.current = autoAdvance;
      setPlayOn(autoAdvance && !reduced);
    }
  }, [autoAdvance, reduced]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(root);
    const ro = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width <= 560));
    ro.observe(root);
    return () => {
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  const startCycle = useCallback(
    (target: number) => {
      if (count < 2) return;
      const n = panelN;
      const closeMs = (n - 1) * STAGGER_MS + SLIDE_MS + HOLD_MS;
      const openMs = (n - 1) * STAGGER_MS + SLIDE_MS + SETTLE_MS;
      phaseRef.current = 'closing';
      setParity((p) => p + 1);
      setPhase('closing');
      const t1 = window.setTimeout(() => {
        indexRef.current = target;
        setIndex(target);
        phaseRef.current = 'opening';
        setPhase('opening');
      }, closeMs);
      const t2 = window.setTimeout(() => {
        phaseRef.current = 'open';
        setPhase('open');
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (pending !== null) goRef.current(pending);
      }, closeMs + openMs);
      timersRef.current.push(t1, t2);
    },
    [count, panelN],
  );

  const go = useCallback(
    (targetRaw: number) => {
      if (count < 2) return;
      const target = wrapIndex(targetRaw, count);
      if (reduced) {
        indexRef.current = target;
        setIndex(target);
        return;
      }
      if (phaseRef.current !== 'open') {
        pendingRef.current = target;
        return;
      }
      if (target === indexRef.current) return;
      clearTimers();
      startCycle(target);
    },
    [count, reduced, clearTimers, startCycle],
  );

  useEffect(() => {
    goRef.current = go;
  }, [go]);

  const step = useCallback((dir: 1 | -1) => go(indexRef.current + dir), [go]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => go(indexRef.current + 1), dwellMs);
    return () => window.clearInterval(id);
  }, [isPlaying, dwellMs, go]);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      go(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      go(count - 1);
    }
  };

  const onRootBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    swipeRef.current = { id: e.pointerId, x: e.clientX };
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = swipeRef.current;
    swipeRef.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 36) step(dx < 0 ? 1 : -1);
  };

  const onPointerCancel = () => {
    swipeRef.current = null;
  };

  const seqOf = (i: number) => (parity % 2 === 0 ? i : panelN - 1 - i);
  const delayOf = (i: number) => {
    if (phase === 'closing') return seqOf(i) * STAGGER_MS;
    if (phase === 'opening') return (panelN - 1 - seqOf(i)) * STAGGER_MS;
    return 0;
  };

  const kLeft = Math.ceil(panelN / 2);
  const kRight = panelN - kLeft;
  const cols = narrow ? 3 : panelN <= 2 ? 8 : panelN === 3 ? 5 : panelN <= 5 ? 4 : panelN <= 7 ? 3 : 2;
  const rows = narrow ? 7 : 6;

  const dataPhase = count === 0 ? 'closed' : phase;
  const current = count > 0 ? images[Math.min(index, count - 1)] : undefined;
  const liveText =
    count === 0
      ? 'No images yet.'
      : `Image ${index + 1} of ${count}${current && current.caption ? `. ${current.caption}` : '.'}`;

  return (
    <section
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={
        {
          '--sd-dwell': `${dwellMs}ms`,
          '--sd-n': panelN,
          '--sd-kl': kLeft,
          '--sd-kr': kRight,
          '--sd-cols': cols,
          '--sd-rows': rows,
        } as CSSProperties
      }
      data-phase={dataPhase}
      data-playing={isPlaying ? 'true' : 'false'}
      data-visible={inView ? 'true' : 'false'}
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="Photo gallery"
      aria-description="Use the left and right arrow keys to browse the images."
      onKeyDown={onKeyDown}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={onRootBlur}
    >
      <div className={styles.frame}>
        <div
          className={styles.window}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          {images.map((item, i) => {
            const active = i === index;
            const slideClass = `${styles.slide}${active ? ` ${styles.slideActive}` : ''}`;
            return item.image ? (
              <img
                key={`s${i}`}
                className={slideClass}
                src={item.image}
                alt={item.alt || item.caption || ''}
                draggable={false}
                loading="lazy"
              />
            ) : (
              <span key={`s${i}`} className={slideClass} aria-hidden="true" />
            );
          })}

          <span className={styles.light} aria-hidden="true" />

          {current && current.caption && (
            <div className={styles.caption}>
              <p className={styles.captionText} dir="auto">
                {current.caption}
              </p>
            </div>
          )}

          {count > 1 && (
            <span className={styles.count} aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
              <span className={styles.countSep}> / </span>
              {String(count).padStart(2, '0')}
            </span>
          )}

          {count > 1 && (
            <>
              <button
                type="button"
                className={`${styles.nav} ${styles.navPrev}`}
                aria-label="Previous image"
                onClick={() => step(-1)}
              >
                <svg
                  className={styles.navIcon}
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10 3 5 8l5 5" />
                </svg>
              </button>
              <button
                type="button"
                className={`${styles.nav} ${styles.navNext}`}
                aria-label="Next image"
                onClick={() => step(1)}
              >
                <svg
                  className={styles.navIcon}
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 3l5 5-5 5" />
                </svg>
              </button>
            </>
          )}

          <span className={styles.railBottom} aria-hidden="true" />

          <span className={styles.deck} aria-hidden="true">
            {Array.from({ length: panelN }, (_, i) => {
              const isLeft = i < kLeft;
              const sideCount = isLeft ? kLeft : kRight;
              /* depth in its rear track: 1 = outermost leaf, on top of the stack */
              const depth = isLeft ? i + 1 : panelN - i;
              const dur = Math.round(SLIDE_MS * (0.72 + (0.28 * depth) / sideCount));
              return (
                <span
                  key={`p${i}`}
                  className={`${styles.panel} ${isLeft ? styles.panelLeft : styles.panelRight}`}
                  style={
                    {
                      insetInlineStart: `${(i * 100) / panelN}%`,
                      inlineSize: `${100 / panelN}%`,
                      zIndex: 4 + (sideCount - depth),
                      '--sd-k': depth,
                      '--sd-i': i,
                      '--sd-sign': isLeft ? -1 : 1,
                      '--sd-d': `${delayOf(i)}ms`,
                      '--sd-dur': `${dur}ms`,
                    } as CSSProperties
                  }
                >
                  <span className={styles.paper} />
                  <span className={styles.glow} />
                  <span className={styles.lattice} />
                  <span className={styles.railT} />
                  <span className={styles.railB} />
                  <span className={styles.shadow} />
                </span>
              );
            })}
          </span>
          <span className={styles.railTop} aria-hidden="true" />
          <span className={styles.sheen} aria-hidden="true" />

          {count > 1 && autoAdvance && (
            <button
              type="button"
              className={styles.pauseBtn}
              aria-label={playOn ? 'Pause slideshow' : 'Play slideshow'}
              onClick={() => setPlayOn((p) => !p)}
            >
              {playOn ? (
                <svg className={styles.pauseIcon} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <rect x="4" y="3" width="2.6" height="10" rx="1" />
                  <rect x="9.4" y="3" width="2.6" height="10" rx="1" />
                </svg>
              ) : (
                <svg className={styles.pauseIcon} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M5.5 3.4a1 1 0 0 1 1.52-.86l7 4.6a1 1 0 0 1 0 1.72l-7 4.6a1 1 0 0 1-1.52-.86V3.4Z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      <p className={styles.srOnly} aria-live={isPlaying ? 'off' : 'polite'}>
        {liveText}
      </p>
    </section>
  );
}
```

```css
.root {
  /* palette: pale cedar, washi, sumi, lantern light */
  --sd-cedar-hi: #efdab0;
  --sd-cedar: #d9bc8c;
  --sd-cedar-lo: #b5905c;
  --sd-cedar-ink: #6e4c28;
  --sd-end-grain: #b98f58;
  --sd-washi: rgba(251, 246, 232, 0.6);
  --sd-washi-solid: #f7f1e1;
  --sd-lantern: rgba(255, 226, 168, 0.5);
  --sd-ink: #231c14;
  --sd-cream: #fbf5e6;
  --sd-room: #2a2016;
  --sd-font-caption: 'SD Mincho', 'Hiragino Mincho ProN', 'Yu Mincho', 'Iowan Old Style', Georgia, serif;
  --sd-font-ui: var(--sd-font-caption);

  /* geometry (everything sizes from the container) */
  --sd-jamb: clamp(7px, 1.1cqi, 13px);
  --sd-lintel: clamp(14px, 3cqi, 30px);
  --sd-sill: clamp(22px, 4.4cqi, 46px);
  --sd-stile: clamp(6px, 1.25cqi, 14px);
  --sd-rail-t: clamp(7px, 1.4cqi, 15px);
  --sd-rail-b: clamp(13px, 3.1cqi, 34px);
  --sd-bar: clamp(2px, 0.34cqi, 4px);
  --sd-cast: clamp(5px, 0.9cqi, 10px);

  /* procedural material tiles: cedar grain, a whisper of washi tooth */
  --sd-grain-dark-v: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='360'><filter id='g' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='.85 .011' numOctaves='3' seed='11' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .40  0 0 0 0 .25  0 0 0 0 .11  2.4 0 0 0 -1.05'/></filter><rect width='220' height='360' filter='url(%23g)'/></svg>");
  --sd-grain-light-v: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='170' height='290'><filter id='g' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='.5 .008' numOctaves='2' seed='5' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 .93  0 0 0 0 .76  2.2 0 0 0 -1.12'/></filter><rect width='170' height='290' filter='url(%23g)'/></svg>");
  --sd-grain-dark-h: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='220'><filter id='g' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='.011 .85' numOctaves='3' seed='23' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .40  0 0 0 0 .25  0 0 0 0 .11  2.4 0 0 0 -1.05'/></filter><rect width='360' height='220' filter='url(%23g)'/></svg>");
  --sd-grain-light-h: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='290' height='170'><filter id='g' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='.008 .5' numOctaves='2' seed='8' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 .93  0 0 0 0 .76  2.2 0 0 0 -1.12'/></filter><rect width='290' height='170' filter='url(%23g)'/></svg>");
  --sd-tooth-lit: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='p' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='.7 .45' numOctaves='3' seed='7' stitchTiles='stitch' result='n'/><feDiffuseLighting in='n' surfaceScale='1' diffuseConstant='1.4' lighting-color='%23ffffff'><feDistantLight azimuth='205' elevation='42'/></feDiffuseLighting><feColorMatrix values='0 0 0 0 1  0 0 0 0 .93  0 0 0 0 .8  1.5 0 0 0 -1.4'/></filter><rect width='240' height='240' filter='url(%23p)'/></svg>");

  /* spring-settle easings: glide, arrive, tiny rebound */
  --sd-dwell: 7000ms;
  --sd-n: 6;
  --sd-kl: 3;
  --sd-kr: 3;
  --sd-cols: 3;
  --sd-rows: 6;

  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  inline-size: 100%;
  container-type: inline-size;
  border-radius: 16px;
  overflow: clip;
  background: var(--sd-room);
  color: var(--sd-cream);
  font-family: var(--sd-font-ui);
  outline: none;
}

.root ::selection {
  background: color-mix(in srgb, var(--sd-cedar) 60%, #fff);
  color: var(--sd-ink);
}

.root:focus-visible {
  outline: 2px solid var(--sd-cream);
  outline-offset: -5px;
}

/* jamb: the wall opening the screens run in */
.frame {
  position: relative;
  box-sizing: border-box;
  padding: var(--sd-jamb);
  background:
    var(--sd-grain-light-v),
    var(--sd-grain-dark-v),
    linear-gradient(100deg, var(--sd-cedar-hi) 0%, var(--sd-cedar) 42%, var(--sd-cedar-lo) 100%);
  background-size:
    170px 290px,
    220px 360px,
    auto;
}

.window {
  position: relative;
  direction: ltr;
  aspect-ratio: 16 / 10;
  border-radius: 3px;
  overflow: clip;
  background: var(--sd-room);
  touch-action: pan-y;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

@container (max-width: 520px) {
  .window {
    aspect-ratio: 4 / 5;
  }
}

/* ---------- photo layers ---------- */

.slide {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  opacity: 0;
  transform: scale(1.02);
  transition: opacity 420ms ease;
  background: linear-gradient(168deg, #3a2e20 0%, #261d13 100%);
  pointer-events: none;
  user-select: none;
}

.slideActive {
  opacity: 1;
  z-index: 1;
  animation: sdDrift var(--sd-dwell) cubic-bezier(0.37, 0.16, 0.63, 0.84) both;
}

.root[data-playing='false'] .slideActive,
.root[data-visible='false'] .slideActive {
  animation-play-state: paused;
}

@keyframes sdDrift {
  from {
    transform: scale(1.03) translate(0, 0);
  }

  to {
    transform: scale(1.1) translate(-1.2%, 0.8%);
  }
}

/* scrims so cream type holds on any photo */
.light {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background:
    linear-gradient(0deg, rgba(24, 15, 6, 0.74) 0%, rgba(24, 15, 6, 0.4) 20%, transparent 46%),
    linear-gradient(180deg, rgba(24, 15, 6, 0.42) 0%, transparent 24%),
    radial-gradient(120% 90% at 20% 0%, rgba(255, 226, 168, 0.14) 0%, transparent 55%);
}

.caption {
  position: absolute;
  z-index: 3;
  inset-block-end: calc(var(--sd-sill) + clamp(12px, 2.2cqi, 24px));
  inset-inline-start: calc(var(--sd-kl) * 30% / var(--sd-n) + clamp(16px, 2.4cqi, 28px));
  max-inline-size: min(58%, 540px);
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 380ms ease,
    transform 380ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.root[data-phase='open'] .caption {
  opacity: 1;
  transform: translateY(0);
  transition-delay: 260ms;
}

.captionText {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
  margin: 0;
  font-family: var(--sd-font-caption);
  font-weight: 500;
  font-size: clamp(15px, 2.1cqi, 24px);
  line-height: 1.4;
  letter-spacing: 0.02em;
  color: var(--sd-cream);
  text-shadow: 0 1px 14px rgba(20, 12, 4, 0.55);
  overflow-wrap: anywhere;
}

.count {
  position: absolute;
  z-index: 3;
  inset-block-start: calc(var(--sd-lintel) + clamp(10px, 1.8cqi, 20px));
  inset-inline-start: calc(var(--sd-kl) * 30% / var(--sd-n) + clamp(16px, 2.4cqi, 28px));
  font-family: var(--sd-font-caption);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.14em;
  color: var(--sd-cream);
  /* scrim chip: keeps the counter legible over any photo */
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(20, 12, 4, 0.58);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  box-shadow: 0 0 0 1px rgba(255, 244, 220, 0.14);
}

.countSep {
  opacity: 0.7;
}

/* ---------- track: lintel (kamoi) above, sill (shikii) below ---------- */

.railTop {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  z-index: 10;
  block-size: var(--sd-lintel);
  pointer-events: none;
  background:
    /* upper groove the panels tuck into */
    linear-gradient(
      180deg,
      transparent 0,
      transparent 62%,
      rgba(40, 22, 5, 0.62) 62%,
      rgba(40, 22, 5, 0.62) calc(62% + 2px),
      rgba(255, 240, 205, 0.5) calc(62% + 2px),
      rgba(255, 240, 205, 0.5) calc(62% + 3px),
      transparent calc(62% + 3px)
    ),
    var(--sd-grain-light-h),
    var(--sd-grain-dark-h),
    linear-gradient(180deg, var(--sd-cedar-lo) 0%, var(--sd-cedar) 38%, var(--sd-cedar-lo) 100%);
  background-size:
    auto,
    290px 170px,
    360px 220px,
    auto;
  box-shadow:
    inset 0 -1px 0 rgba(60, 36, 10, 0.4),
    0 5px 9px -4px rgba(24, 12, 2, 0.35);
}

.railBottom {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  z-index: 3;
  block-size: var(--sd-sill);
  pointer-events: none;
  background:
    /* rear groove (panels stand in it), front groove, front arris */
    linear-gradient(
      180deg,
      rgba(40, 22, 5, 0.5) 0,
      rgba(40, 22, 5, 0.14) 30%,
      transparent 40%,
      rgba(40, 22, 5, 0.58) 40%,
      rgba(40, 22, 5, 0.58) calc(40% + 2px),
      rgba(255, 240, 205, 0.42) calc(40% + 2px),
      rgba(255, 240, 205, 0.42) calc(40% + 3px),
      transparent calc(40% + 3px),
      transparent 74%,
      rgba(40, 22, 5, 0.42) 74%,
      rgba(40, 22, 5, 0.42) calc(74% + 1px),
      rgba(255, 240, 205, 0.5) calc(74% + 1px),
      rgba(255, 240, 205, 0.5) calc(74% + 2px),
      rgba(40, 22, 5, 0.12) calc(74% + 2px)
    ),
    var(--sd-grain-light-h),
    var(--sd-grain-dark-h),
    linear-gradient(180deg, var(--sd-cedar-lo) 0%, var(--sd-cedar) 40%, var(--sd-cedar-hi) 74%, var(--sd-cedar) 100%);
  background-size:
    auto,
    290px 170px,
    360px 220px,
    auto;
  box-shadow: inset 0 1px 0 rgba(40, 22, 5, 0.5);
}

/* ---------- shoji panels ---------- */

.deck {
  position: absolute;
  inset: 0;
  direction: ltr;
  pointer-events: none;
}

.panel {
  position: absolute;
  inset-block-start: calc(var(--sd-lintel) * 0.5);
  inset-block-end: calc(var(--sd-sill) * 0.62);
  box-sizing: border-box;
  transform-origin: 50% 100%;
  transition: transform var(--sd-dur, 700ms) cubic-bezier(0.5, 0, 0.2, 1) var(--sd-d, 0ms);
  will-change: transform;
  background:
    var(--sd-grain-light-v),
    var(--sd-grain-dark-v),
    linear-gradient(100deg, var(--sd-cedar-hi) 0%, var(--sd-cedar) 50%, var(--sd-cedar-lo) 100%);
  background-size:
    170px 290px,
    220px 360px,
    auto;
}

.panelLeft {
  box-shadow:
    4px 0 8px -3px rgba(24, 12, 2, 0.3);
}

.panelRight {
  box-shadow:
    -4px 0 8px -3px rgba(24, 12, 2, 0.3);
}

/* outer bevel: lit edge toward the window light, shaded edge away */
.panel::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow:
    inset 1px 0 0 rgba(255, 244, 214, 0.6),
    inset -1px 0 0 rgba(70, 42, 12, 0.5),
    inset 0 1px 0 rgba(255, 244, 214, 0.5);
}

/* parked in the rear tracks: each panel shows its leading stile */
.root[data-phase='open'] .panelLeft,
.root[data-phase='opening'] .panelLeft {
  transform: translateX(calc(var(--sd-k) * -70%));
}

.root[data-phase='open'] .panelRight,
.root[data-phase='opening'] .panelRight {
  transform: translateX(calc(var(--sd-k) * 70%));
}

.root[data-phase='closing'] .panel {
  transition-timing-function: cubic-bezier(0.5, 0, 0.2, 1);
  transition-timing-function: linear(
    0,
    0.003,
    0.011,
    0.027,
    0.053,
    0.093,
    0.153,
    0.237,
    0.349,
    0.475,
    0.589,
    0.682,
    0.754,
    0.811,
    0.856,
    0.892,
    0.92,
    0.943,
    0.961,
    0.975,
    0.985,
    0.992,
    0.997,
    0.999,
    1.009,
    1.028,
    1.026,
    1.012,
    0.998,
    0.992,
    0.992,
    0.996,
    1,
    1.002,
    1.002,
    1.001,
    1
  );
  animation: sdLeanClose calc(var(--sd-dur, 700ms) + 380ms) linear var(--sd-d, 0ms) both;
}

.root[data-phase='opening'] .panel,
.root[data-phase='open'] .panel {
  transition-timing-function: cubic-bezier(0.5, 0, 0.2, 1);
  transition-timing-function: linear(
    0,
    0.002,
    0.009,
    0.022,
    0.043,
    0.075,
    0.12,
    0.184,
    0.272,
    0.38,
    0.495,
    0.598,
    0.682,
    0.749,
    0.803,
    0.846,
    0.881,
    0.909,
    0.932,
    0.951,
    0.966,
    0.977,
    0.986,
    0.993,
    0.997,
    0.999,
    1.002,
    1.017,
    1.013,
    1.004,
    0.998,
    0.996,
    0.998,
    1,
    1.001,
    1.001,
    1
  );
}

.root[data-phase='opening'] .panel {
  animation: sdLeanOpen calc(var(--sd-dur, 700ms) + 380ms) linear var(--sd-d, 0ms) both;
}

/* secondary motion: the leaf leans into the pull, then rattles in its track on arrival */
@keyframes sdLeanClose {
  0% {
    rotate: 0deg;
  }

  22% {
    rotate: calc(var(--sd-sign, 1) * -0.24deg);
  }

  50% {
    rotate: calc(var(--sd-sign, 1) * -0.1deg);
  }

  60% {
    rotate: 0deg;
  }

  68% {
    rotate: calc(var(--sd-sign, 1) * 0.34deg);
  }

  78% {
    rotate: calc(var(--sd-sign, 1) * -0.22deg);
  }

  89% {
    rotate: calc(var(--sd-sign, 1) * 0.09deg);
  }

  100% {
    rotate: 0deg;
  }
}

@keyframes sdLeanOpen {
  0% {
    rotate: 0deg;
  }

  22% {
    rotate: calc(var(--sd-sign, 1) * 0.18deg);
  }

  52% {
    rotate: calc(var(--sd-sign, 1) * 0.07deg);
  }

  66% {
    rotate: calc(var(--sd-sign, 1) * -0.2deg);
  }

  80% {
    rotate: calc(var(--sd-sign, 1) * 0.1deg);
  }

  100% {
    rotate: 0deg;
  }
}

/* frame members */
.railT,
.railB {
  position: absolute;
  inset-inline: var(--sd-stile);
  background:
    var(--sd-grain-light-h),
    var(--sd-grain-dark-h),
    linear-gradient(180deg, var(--sd-cedar-hi) 0%, var(--sd-cedar) 55%, var(--sd-cedar-lo) 100%);
  background-size:
    290px 170px,
    360px 220px,
    auto;
  box-shadow:
    inset 1px 0 0 rgba(70, 42, 12, 0.4),
    inset -1px 0 0 rgba(70, 42, 12, 0.4);
}

.railT {
  inset-block-start: 0;
  block-size: calc(var(--sd-rail-t) + var(--sd-lintel) * 0.5);
}

.railB {
  inset-block-end: 0;
  block-size: var(--sd-rail-b);
}

/* washi: translucent, so the photo ghosts through when the leaves close */
.paper {
  position: absolute;
  inset-block: calc(var(--sd-lintel) * 0.5 + var(--sd-rail-t)) var(--sd-rail-b);
  inset-inline: var(--sd-stile);
  background: var(--sd-washi);
  -webkit-backdrop-filter: blur(3.5px) saturate(0.82) brightness(1.1);
  backdrop-filter: blur(3.5px) saturate(0.82) brightness(1.1);
  box-shadow:
    inset 0 0 0 1px rgba(78, 52, 24, 0.32),
    inset 2px 3px 5px -2px rgba(40, 22, 4, 0.22);
}

.paper::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--sd-tooth-lit);
  background-size: 240px 240px;
  background-position: calc(var(--sd-i, 0) * -53px) calc(var(--sd-i, 0) * -31px);
  opacity: 0.3;
  pointer-events: none;
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .paper {
    background-color: rgba(247, 241, 225, 0.82);
  }
}

/* lantern glow: paper catches the light as each leaf arrives */
.glow {
  position: absolute;
  inset-block: calc(var(--sd-lintel) * 0.5 + var(--sd-rail-t)) var(--sd-rail-b);
  inset-inline: var(--sd-stile);
  pointer-events: none;
  opacity: 0;
  background:
    radial-gradient(80% 60% at 50% 42%, rgba(255, 246, 224, 0.22) 0%, rgba(255, 240, 210, 0.07) 70%, transparent 100%);
}

.root[data-phase='closing'] .glow {
  animation: sdGlowIn calc(var(--sd-dur, 700ms) + 380ms) ease-out var(--sd-d, 0ms) both;
}

.root[data-phase='opening'] .glow {
  animation: sdGlowOut var(--sd-dur, 700ms) ease-in var(--sd-d, 0ms) both;
}

.root[data-phase='closed'] .glow {
  opacity: 1;
}

@keyframes sdGlowIn {
  0%,
  45% {
    opacity: 0;
  }

  80%,
  100% {
    opacity: 1;
  }
}

@keyframes sdGlowOut {
  0% {
    opacity: 1;
  }

  55%,
  100% {
    opacity: 0;
  }
}

/* koshi lattice: slender cedar bars standing proud of the paper, each casting a soft shadow into its cell */
.lattice {
  position: absolute;
  inset-block: calc(var(--sd-lintel) * 0.5 + var(--sd-rail-t)) var(--sd-rail-b);
  inset-inline: var(--sd-stile);
  pointer-events: none;
  background-image:
    /* horizontal bars: lit top edge, face, shaded underside */
    linear-gradient(
      180deg,
      transparent calc(100% - var(--sd-bar)),
      rgba(255, 244, 214, 0.6) calc(100% - var(--sd-bar)),
      var(--sd-cedar-hi) calc(100% - var(--sd-bar) + 1px),
      var(--sd-cedar) calc(100% - 1px),
      var(--sd-cedar-lo) calc(100% - 1px)
    ),
    /* vertical bars */
    linear-gradient(
      90deg,
      transparent calc(100% - var(--sd-bar)),
      rgba(255, 244, 214, 0.6) calc(100% - var(--sd-bar)),
      var(--sd-cedar-hi) calc(100% - var(--sd-bar) + 1px),
      var(--sd-cedar) calc(100% - 1px),
      var(--sd-cedar-lo) calc(100% - 1px)
    ),
    /* shadow thrown by vertical bars onto the paper (light from upper left) */
    linear-gradient(90deg, rgba(48, 28, 8, 0.16) 0, rgba(48, 28, 8, 0.05) calc(var(--sd-cast) * 0.38), transparent var(--sd-cast)),
    /* shadow thrown by horizontal bars */
    linear-gradient(180deg, rgba(48, 28, 8, 0.14) 0, rgba(48, 28, 8, 0.045) calc(var(--sd-cast) * 0.38), transparent var(--sd-cast)),
    /* backlit centre of each cell */
    radial-gradient(60% 56% at 48% 50%, rgba(255, 244, 220, 0.08) 0%, transparent 100%);
  background-size:
    100% calc(100% / var(--sd-rows)),
    calc(100% / var(--sd-cols)) 100%,
    calc(100% / var(--sd-cols)) 100%,
    100% calc(100% / var(--sd-rows)),
    calc(100% / var(--sd-cols)) calc(100% / var(--sd-rows));
  background-repeat: repeat;
}

/* soft contact shadow on the sill */
.shadow {
  position: absolute;
  inset-block-start: 100%;
  inset-inline: 2% -10%;
  block-size: calc(var(--sd-sill) * 0.5);
  pointer-events: none;
  background: linear-gradient(180deg, rgba(30, 16, 3, 0.38) 0%, rgba(30, 16, 3, 0.14) 42%, transparent 100%);
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 10%, #000 84%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0, #000 10%, #000 84%, transparent 100%);
}

/* window-light raking across everything, and the depth of the opening */
.sheen {
  position: absolute;
  inset: 0;
  z-index: 11;
  pointer-events: none;
  background: linear-gradient(
    108deg,
    rgba(255, 244, 226, 0.08) 0%,
    transparent 50%,
    rgba(30, 16, 4, 0.08) 100%
  );
  box-shadow:
    inset 0 0 0 1px rgba(30, 16, 4, 0.4),
    inset 3px 4px 9px -5px rgba(24, 12, 2, 0.35);
}

/* ---------- controls ---------- */

.nav {
  position: absolute;
  z-index: 12;
  inset-block-start: 50%;
  translate: 0 -50%;
  display: grid;
  place-items: center;
  inline-size: 44px;
  aspect-ratio: 1;
  padding: 0;
  border: 1px solid rgba(110, 76, 40, 0.5);
  border-radius: 50%;
  background: rgba(251, 246, 232, 0.9);
  color: var(--sd-ink);
  cursor: pointer;
  box-shadow: 0 6px 16px -8px rgba(24, 12, 2, 0.6);
  transition:
    background-color 200ms ease,
    transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.nav:hover {
  background: #fffdf5;
  transform: scale(1.05);
}

.nav:active {
  transform: scale(0.97);
}

.nav:focus-visible,
.pauseBtn:focus-visible {
  outline: 2px solid var(--sd-cream);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(35, 28, 20, 0.7);
}

.navPrev {
  inset-inline-start: calc(var(--sd-kl) * 30% / var(--sd-n) + clamp(10px, 1.6cqi, 18px));
}

.navNext {
  inset-inline-end: calc(var(--sd-kr) * 30% / var(--sd-n) + clamp(10px, 1.6cqi, 18px));
}

.navIcon {
  inline-size: 17px;
  block-size: 17px;
}

.pauseBtn {
  position: absolute;
  z-index: 13;
  inset-block-start: calc(var(--sd-lintel) + clamp(8px, 1.4cqi, 16px));
  inset-inline-end: calc(var(--sd-kr) * 30% / var(--sd-n) + clamp(10px, 1.6cqi, 18px));
  display: grid;
  place-items: center;
  inline-size: 36px;
  aspect-ratio: 1;
  padding: 0;
  border: 1px solid rgba(110, 76, 40, 0.5);
  border-radius: 50%;
  background: rgba(251, 246, 232, 0.9);
  color: var(--sd-ink);
  cursor: pointer;
  box-shadow: 0 5px 12px -6px rgba(24, 12, 2, 0.6);
  opacity: 0.86;
  transition:
    opacity 200ms ease,
    background-color 200ms ease;
}

.root:hover .pauseBtn,
.root:focus-within .pauseBtn,
.root[data-playing='false'] .pauseBtn {
  opacity: 1;
}

.pauseBtn:hover {
  background: #fffdf5;
}

.pauseIcon {
  inline-size: 14px;
  block-size: 14px;
}

.srOnly {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  clip-path: inset(50%);
  overflow: hidden;
  white-space: nowrap;
}

/* reduced motion: the screens stay parked (still framed, still shoji), photos simply crossfade */
@media (prefers-reduced-motion: reduce) {
  .panel {
    transition: none;
    animation: none;
  }

  .glow {
    display: none;
  }

  .slide {
    transform: none;
    transition: opacity 260ms ease;
  }

  .slideActive {
    animation: none;
    transform: none;
  }

  .caption {
    transform: none;
    transition: opacity 260ms ease;
  }

  .root[data-phase='open'] .caption {
    transition-delay: 0ms;
  }

  .nav,
  .pauseBtn {
    transition: opacity 200ms ease;
  }
}

/* self-hosted display face: Shippori Mincho 500, Latin subset (SIL OFL) */
@font-face {
  font-family: 'SD Mincho';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url(data:font/woff2;base64,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) format('woff2');
}
```
