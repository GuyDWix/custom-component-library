Create a custom element called "Story Reel". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: slides (image, caption), seconds per slide, progress colour, start playing automatically, repeat from the start. Add other settings if they help.

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface StoryReelSlide {
  image?: string;
  caption?: string;
  alt?: string;
}

export interface StoryReelProps {
  slides?: StoryReelSlide[];
  secondsPerSlide?: number;
  progressColor?: string;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
}

const HOLD_MS = 240;

export const defaultSlides: StoryReelSlide[] = [
  {
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=760&h=950&auto=format&fit=crop',
    alt: 'Candlelit tables in the dining room at dusk',
    caption: 'Doors at six — the room still smells of cedar, citrus and fresh paint.',
  },
  {
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=760&h=950&auto=format&fit=crop',
    alt: 'A set table with plates and glassware',
    caption: 'First plates from the pass: ember-roasted beets, hazelnut, brown butter.',
  },
  {
    image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?q=80&w=760&h=950&auto=format&fit=crop',
    alt: 'A plated dish being finished in the kitchen',
    caption: 'Chef Nadia calls it dusk service — the low light does half the plating.',
  },
  {
    image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=760&h=950&auto=format&fit=crop',
    alt: 'Guests at the counter under warm lamps',
    caption: 'By seven every stool is taken and the coral lamps take over.',
  },
  {
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=760&h=950&auto=format&fit=crop',
    alt: 'A final coffee poured at the counter',
    caption: 'Last pour at midnight. Same corner, same time, next week.',
  },
];

const REEL_HELP =
  'Story reel: tap the left or right side of the photo to move between photos, press and hold to pause, or use the left and right arrow keys.';

export default function StoryReel({
  slides = defaultSlides,
  secondsPerSlide = 4,
  progressColor = '#ff6f5e',
  autoPlay = true,
  loop = false,
  className,
}: StoryReelProps) {
  const count = slides.length;
  const [rawIndex, setRawIndex] = useState(0);
  const index = Math.min(rawIndex, Math.max(0, count - 1));

  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabHidden, setTabHidden] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [held, setHeld] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const segRef = useRef<HTMLSpanElement>(null);
  const bankedRef = useRef(0);
  const resumedAtRef = useRef(0);
  const lastIndexRef = useRef(0);
  const holdTimerRef = useRef(0);
  const holdActiveRef = useRef(false);

  const duration = Math.min(15000, Math.max(1500, secondsPerSlide * 1000));
  const playing =
    autoPlay &&
    count > 1 &&
    !reduced &&
    !userPaused &&
    !held &&
    inView &&
    !tabHidden &&
    (loop || index < count - 1);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (reduced) setUserPaused(true);
  }, [reduced]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const sync = () => setTabHidden(document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  useEffect(() => () => window.clearTimeout(holdTimerRef.current), []);

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      const target = ((next % count) + count) % count;
      bankedRef.current = 0;
      segRef.current?.style.removeProperty('--p');
      setRawIndex(target);
    },
    [count],
  );

  useEffect(() => {
    if (!playing) return;
    if (index !== lastIndexRef.current) {
      bankedRef.current = 0;
      lastIndexRef.current = index;
    }
    resumedAtRef.current = performance.now();
    let id = 0;
    const tick = (now: number) => {
      const elapsed = Math.min(duration, bankedRef.current + (now - resumedAtRef.current));
      segRef.current?.style.setProperty('--p', (elapsed / duration).toFixed(4));
      if (elapsed >= duration) {
        if (loop || index < count - 1) goTo(index + 1);
        return;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(id);
      const now = performance.now();
      if (now > resumedAtRef.current) {
        bankedRef.current = Math.min(duration, bankedRef.current + (now - resumedAtRef.current));
      }
    };
  }, [playing, index, duration, loop, count, goTo]);

  const zoneDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    holdActiveRef.current = false;
    window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = window.setTimeout(() => {
      holdActiveRef.current = true;
      setHeld(true);
    }, HOLD_MS);
  };

  const zoneEnd = (dir: number, cancelled: boolean) => {
    window.clearTimeout(holdTimerRef.current);
    const wasHold = holdActiveRef.current;
    holdActiveRef.current = false;
    setHeld(false);
    if (!wasHold && !cancelled) goTo(index + dir);
  };

  const onFrameKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(index - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      goTo(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      goTo(count - 1);
    }
  };

  if (count === 0) return null;

  const rootStyle = { '--sr-progress': progressColor } as CSSProperties;
  const showToggle = autoPlay && count > 1 && !reduced;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
    >
      <span className={styles.glowCool} aria-hidden="true" />
      <span className={styles.glowCoral} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />

      <section
        className={styles.frame}
        role="group"
        aria-roledescription="story reel"
        aria-label="Photo story reel"
        aria-description={REEL_HELP}
        onKeyDown={onFrameKeyDown}
      >
        <div className={styles.segments} aria-hidden="true">
          {slides.map((_, n) => (
            <span
              key={n}
              ref={n === index ? segRef : undefined}
              className={[
                styles.seg,
                n < index ? styles.segDone : '',
                n === index ? styles.segActive : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={styles.segFill} />
            </span>
          ))}
        </div>

        <div className={styles.viewport}>
          <div className={styles.stack} aria-live={playing ? 'off' : 'polite'} aria-atomic="false">
            {slides.map((s, n) => {
              const active = n === index;
              const glyph = (s.caption ?? '').trim().charAt(0).toUpperCase();
              return (
                <div
                  key={n}
                  className={active ? styles.slideActive : styles.slide}
                  aria-hidden={!active}
                >
                  {s.image ? (
                    <img
                      className={styles.photo}
                      src={s.image}
                      alt={s.alt ?? s.caption ?? ''}
                      loading={n < 2 ? 'eager' : 'lazy'}
                      decoding="async"
                      draggable={false}
                    />
                  ) : (
                    <span className={styles.fallback} aria-hidden="true">
                      {glyph}
                    </span>
                  )}
                  <span className={styles.vignette} aria-hidden="true" />
                  {s.caption && <span className={styles.scrim} aria-hidden="true" />}
                  {s.caption && <span className={styles.caption}>{s.caption}</span>}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className={[styles.zone, styles.zonePrev].join(' ')}
            aria-label="Previous photo"
            onPointerDown={zoneDown}
            onPointerUp={() => zoneEnd(-1, false)}
            onPointerCancel={() => zoneEnd(-1, true)}
            onClick={(e) => {
              if (e.detail === 0) goTo(index - 1);
            }}
          >
            <svg className={styles.zoneGlyph} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M15.5 4 8 12l7.5 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            className={[styles.zone, styles.zoneNext].join(' ')}
            aria-label="Next photo"
            onPointerDown={zoneDown}
            onPointerUp={() => zoneEnd(1, false)}
            onPointerCancel={() => zoneEnd(1, true)}
            onClick={(e) => {
              if (e.detail === 0) goTo(index + 1);
            }}
          >
            <svg className={styles.zoneGlyph} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M8.5 4 16 12l-7.5 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className={styles.footer}>
          <span className={styles.counter}>
            {pad(index + 1)} / {pad(count)}
          </span>
          {showToggle && (
            <button
              type="button"
              className={styles.toggle}
              aria-label={userPaused ? 'Play reel' : 'Pause reel'}
              onClick={() => setUserPaused((p) => !p)}
            >
              {userPaused ? (
                <svg className={styles.toggleIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
                </svg>
              ) : (
                <svg className={styles.toggleIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M9 5v14M15 5v14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
```

```css
.root {
  --sr-progress: #ff6f5e;
  --sr-stage-top: #1a1d22;
  --sr-stage: #0f1114;
  --sr-frame: #1d2026;
  --sr-frame-deep: #181b20;
  --sr-edge: rgba(244, 240, 232, 0.08);
  --sr-ink: #f3efe6;
  --sr-ink-muted: rgba(243, 239, 230, 0.62);
  --sr-font: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --sr-radius: 24px;
  --sr-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  display: grid;
  justify-items: center;
  padding-block: 52px;
  padding-inline: 20px;
  background:
    repeating-linear-gradient(180deg, rgba(244, 240, 232, 0.018) 0 1px, transparent 1px 11px),
    radial-gradient(52% 40% at 16% 6%, rgba(148, 166, 190, 0.14) 0%, transparent 70%),
    linear-gradient(180deg, var(--sr-stage-top) 0%, var(--sr-stage) 100%);
  color: var(--sr-ink);
  font-family: var(--sr-font);
}

.root ::selection {
  background: var(--sr-progress);
  color: #14161a;
}

.glowCool,
.glowCoral,
.grain {
  position: absolute;
  pointer-events: none;
  z-index: -1;
}

.glowCool {
  inset-block-start: 4%;
  inset-inline-start: -14%;
  inline-size: 64%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(148, 166, 190, 0.18), transparent);
  filter: blur(46px);
  animation: drift 26s ease-in-out infinite alternate;
}

.glowCoral {
  inset-block-end: -8%;
  inset-inline-end: -16%;
  inline-size: 60%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--sr-progress) 16%, transparent), transparent);
  filter: blur(50px);
  animation: drift 32s ease-in-out -13s infinite alternate-reverse;
}

.grain {
  inset: 0;
  background-image: var(--sr-noise);
  opacity: 0.12;
  mix-blend-mode: overlay;
}

@keyframes drift {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(5%, 4%, 0) scale(1.07);
  }
}

.frame {
  position: relative;
  z-index: 0;
  inline-size: min(100%, 412px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: var(--sr-radius);
  background:
    radial-gradient(120% 60% at 50% -10%, #272b31 0%, transparent 60%),
    linear-gradient(180deg, var(--sr-frame) 0%, var(--sr-frame-deep) 100%);
  border: 1px solid var(--sr-edge);
  box-shadow:
    inset 0 1px 0 rgba(244, 240, 232, 0.05),
    0 42px 90px -34px rgba(0, 0, 0, 0.72),
    0 14px 34px -18px rgba(0, 0, 0, 0.55);
}

.segments {
  display: flex;
  gap: 5px;
  padding-inline: 2px;
}

.seg {
  --p: 0;
  position: relative;
  flex: 1 1 0;
  block-size: 4px;
  border-radius: 999px;
  background: rgba(243, 239, 230, 0.13);
  overflow: clip;
}

.segFill {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  border-radius: inherit;
  background: var(--sr-progress);
  transform-origin: 0 50%;
  transform: scaleX(var(--p));
}

.segDone {
  --p: 1;
}

.segActive .segFill {
  box-shadow:
    0 0 12px color-mix(in srgb, var(--sr-progress) 60%, transparent),
    0 0 3px color-mix(in srgb, var(--sr-progress) 80%, transparent);
}

.viewport {
  position: relative;
  aspect-ratio: 4 / 5;
  border-radius: 14px;
  overflow: clip;
  background: #0c0e10;
  container-type: inline-size;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.stack {
  position: absolute;
  inset: 0;
}

.slide,
.slideActive {
  position: absolute;
  inset: 0;
  opacity: 0;
  transform: scale(1.04);
  transition:
    opacity 620ms cubic-bezier(0.32, 0.72, 0.18, 1),
    transform 900ms cubic-bezier(0.22, 0.68, 0.24, 1);
  will-change: opacity, transform;
}

.slideActive {
  opacity: 1;
  transform: scale(1);
  z-index: 1;
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

.fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: radial-gradient(80% 60% at 50% 30%, #2a2e35 0%, #15171b 75%);
  font-size: clamp(64px, 30cqi, 130px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
  color: rgba(243, 239, 230, 0.14);
}

.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 90% at 50% 38%, transparent 58%, rgba(10, 12, 14, 0.38) 100%);
  pointer-events: none;
}

.scrim {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  block-size: 46%;
  background: linear-gradient(180deg, transparent 0%, rgba(12, 14, 16, 0.32) 42%, rgba(12, 14, 16, 0.82) 100%);
  pointer-events: none;
}

.caption {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: clip;
  padding: 18px 18px 18px;
  font-size: clamp(13px, 4.4cqi, 16.5px);
  line-height: 1.5;
  letter-spacing: 0.002em;
  color: var(--sr-ink);
  text-shadow: 0 1px 14px rgba(0, 0, 0, 0.4);
  overflow-wrap: anywhere;
  transform: translateY(12px);
  transition: transform 640ms cubic-bezier(0.22, 0.68, 0.24, 1) 120ms;
}

.slideActive .caption {
  transform: translateY(0);
}

.zone {
  position: absolute;
  z-index: 2;
  block-size: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
  touch-action: pan-y;
  -webkit-tap-highlight-color: transparent;
}

.zonePrev {
  inset-inline-start: 0;
  inline-size: 34%;
}

.zoneNext {
  inset-inline-end: 0;
  inline-size: 66%;
}

.zoneGlyph {
  position: absolute;
  inset-block-start: 50%;
  inline-size: 30px;
  block-size: 30px;
  margin-block-start: -15px;
  color: rgba(243, 239, 230, 0.85);
  opacity: 0;
  transition:
    opacity 220ms ease,
    transform 220ms ease;
  pointer-events: none;
  filter: drop-shadow(0 1px 8px rgba(0, 0, 0, 0.45));
}

.zonePrev .zoneGlyph {
  inset-inline-start: 10px;
  transform: translateX(-6px);
}

.zoneNext .zoneGlyph {
  inset-inline-end: 10px;
  transform: translateX(6px);
}

.zone:focus-visible .zoneGlyph {
  opacity: 0.9;
  transform: none;
}

@media (hover: hover) {
  .zone:hover .zoneGlyph {
    opacity: 0.35;
    transform: none;
  }

  .zone:focus-visible:hover .zoneGlyph {
    opacity: 0.9;
  }
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-inline: 4px;
}

.counter {
  font-variant-numeric: tabular-nums;
  font-size: 12.5px;
  letter-spacing: 0.14em;
  color: var(--sr-ink-muted);
}

.toggle {
  display: grid;
  place-items: center;
  inline-size: 30px;
  block-size: 30px;
  border-radius: 50%;
  border: 1px solid rgba(243, 239, 230, 0.16);
  background: rgba(243, 239, 230, 0.06);
  color: var(--sr-ink-muted);
  cursor: pointer;
  transition:
    color 200ms ease,
    border-color 200ms ease,
    background-color 200ms ease;
}

.toggle:hover {
  color: var(--sr-ink);
  border-color: rgba(243, 239, 230, 0.3);
  background: rgba(243, 239, 230, 0.1);
}

.toggle:focus-visible {
  outline: 2px solid var(--sr-progress);
  outline-offset: 2px;
}

.toggleIcon {
  inline-size: 14px;
  block-size: 14px;
}

@container (min-width: 640px) {
  .root {
    padding-block: 72px;
  }

  .frame {
    inline-size: min(100%, 448px);
    padding: 16px;
    gap: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .glowCool,
  .glowCoral {
    animation: none;
  }

  .slide,
  .slideActive,
  .caption,
  .zoneGlyph {
    transition: none;
  }

  .segActive .segFill {
    transform: scaleX(1);
    opacity: 0.45;
    box-shadow: none;
  }
}
```
