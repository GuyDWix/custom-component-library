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
/* closed beat: leaves settle while the photo ghosts through the glass */
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

          <span className={styles.deck} aria-hidden="true">
            {Array.from({ length: panelN }, (_, i) => {
              const isLeft = i < kLeft;
              /* travel distance to clear the window, in own widths */
              const off = isLeft ? i + 1 : panelN - i;
              const dur = Math.round(SLIDE_MS * (0.8 + (0.2 * off) / panelN));
              return (
                <span
                  key={`p${i}`}
                  className={`${styles.panel} ${isLeft ? styles.panelLeft : styles.panelRight}`}
                  style={
                    {
                      insetInlineStart: `${(i * 100) / panelN}%`,
                      inlineSize: `${100 / panelN}%`,
                      '--sd-off': off,
                      '--sd-sign': isLeft ? -1 : 1,
                      '--sd-d': `${delayOf(i)}ms`,
                      '--sd-dur': `${dur}ms`,
                    } as CSSProperties
                  }
                />
              );
            })}
          </span>
        </div>
        <div className={styles.hud}>
          <div className={styles.caption}>
            {current && current.caption && (
              <p key={index} className={styles.captionText} dir="auto">
                {current.caption}
              </p>
            )}
          </div>
          <div className={styles.controls}>
        {count > 1 && (
          <span className={styles.count} aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
            <span className={styles.countSep}> / </span>
            {String(count).padStart(2, '0')}
          </span>
        )}

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
                strokeWidth="1.5"
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
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 3l5 5-5 5" />
              </svg>
            </button>
          </>
        )}

        </div>
        </div>

      <p className={styles.srOnly} aria-live={isPlaying ? 'off' : 'polite'}>
        {liveText}
      </p>
    </section>
  );
}
