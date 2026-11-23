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
