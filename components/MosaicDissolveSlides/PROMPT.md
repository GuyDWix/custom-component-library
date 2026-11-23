Create a custom element called "Mosaic Dissolve Slides". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: images (image, caption), tile size, auto-advance on/off, speed (seconds per slide). Add other settings if they help.

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import styles from './Component.module.css';

export interface MosaicSlide {
  src: string;
  alt: string;
  caption?: string;
}

export interface MosaicDissolveSlidesProps {
  slides?: MosaicSlide[];
  tileSize?: number;
  autoAdvance?: boolean;
  advanceSeconds?: number;
  className?: string;
}

export const defaultSlides: MosaicSlide[] = [
  {
    src: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'White concrete facade with deep vertical fins',
    caption: 'Lumen House — façade study, south light',
  },
  {
    src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'Open living hall with warm plaster walls and a timber stair',
    caption: 'Lumen House — living hall',
  },
  {
    src: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'Soft daylight falling across a white building core',
    caption: 'Halden Archive — light well',
  },
  {
    src: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'Studio interior with a long timber worktable',
    caption: 'Marais fit-out — studio floor',
  },
  {
    src: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'Glass office tower against a clear sky',
    caption: 'Northbank — east elevation',
  },
];

type Phase = 'idle' | 'flip';

const FLIP_MS = 640;
const WAVE_MS = 720;
const FADE_MS = 200;
const ASPECT = 3 / 2;
const SWIPE_MIN = 44;

const PREV_LABEL = 'Previous slide';
const NEXT_LABEL = 'Next slide';
const PLAY_LABEL = 'Play slideshow';
const PAUSE_LABEL = 'Pause slideshow';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const pad = (n: number) => String(n).padStart(2, '0');

/** Pick a column/row count whose cells are as close to square as possible. */
function fitGrid(w: number, target: number): { cols: number; rows: number } {
  const h = w * ASPECT;
  let base = Math.round(w / target);
  if (w < 520) base = Math.min(base, 8);
  base = clamp(base, 3, 18);
  let cols = base;
  let rows = Math.max(2, Math.round(base * ASPECT));
  let err = Math.abs(w / cols - h / rows);
  for (let c = Math.max(3, base - 2); c <= Math.min(18, base + 2); c++) {
    const r = Math.max(2, Math.round(c * ASPECT));
    const e = Math.abs(w / c - h / r);
    if (e < err) {
      err = e;
      cols = c;
      rows = r;
    }
  }
  return { cols, rows };
}

export default function MosaicDissolveSlides({
  slides = defaultSlides,
  tileSize = 56,
  autoAdvance = true,
  advanceSeconds = 5,
  className,
}: MosaicDissolveSlidesProps) {
  const count = slides.length;
  const tileTarget = clamp(tileSize, 28, 96);
  const holdMs = clamp(advanceSeconds, 2.5, 30) * 1000;

  const [grid, setGrid] = useState({ cols: 12, rows: 8 });
  const [index, setIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [origin, setOrigin] = useState({ x: 0.5, y: 0.5 });
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [hover, setHover] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [playOn, setPlayOn] = useState(autoAdvance);

  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const commitTimer = useRef(0);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const autoRemaining = useRef(holdMs);

  const safeIndex = count > 0 ? ((index % count) + count) % count : 0;
  const current: MosaicSlide | undefined = count > 0 ? slides[safeIndex] : undefined;
  const back: MosaicSlide | undefined = nextIndex !== null ? slides[nextIndex] : current;
  const captionText = (current?.caption ?? '').trim() || (current?.alt ?? '').trim();

  useEffect(() => () => window.clearTimeout(commitTimer.current), []);

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
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.12 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w < 40) return;
      setGrid((prev) => {
        const g = fitGrid(w, tileTarget);
        return g.cols === prev.cols && g.rows === prev.rows ? prev : g;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tileTarget]);

  const goTo = useCallback(
    (target: number, ox: number, oy: number) => {
      if (phase !== 'idle' || count < 2) return;
      const t = ((target % count) + count) % count;
      if (t === safeIndex) return;
      setOrigin({ x: clamp(ox, 0, 1), y: clamp(oy, 0, 1) });
      setNextIndex(t);
      setPhase('flip');
      const total = reduced ? FADE_MS + 60 : WAVE_MS + FLIP_MS + 120;
      window.clearTimeout(commitTimer.current);
      commitTimer.current = window.setTimeout(() => {
        setIndex(t);
        setNextIndex(null);
        setPhase('idle');
      }, total);
    },
    [phase, count, safeIndex, reduced],
  );

  const isPlaying =
    playOn && inView && !hover && !focusWithin && phase === 'idle' && count > 1;

  // Fresh countdown for every slide; keep the remaining time across hover pauses.
  useEffect(() => {
    autoRemaining.current = holdMs;
  }, [holdMs, safeIndex]);

  useEffect(() => {
    if (!isPlaying) return;
    const startedAt = Date.now();
    const remaining = Math.max(60, autoRemaining.current);
    const id = window.setTimeout(() => goTo(safeIndex + 1, 0.5, 0.5), remaining);
    return () => {
      window.clearTimeout(id);
      autoRemaining.current = Math.max(0, remaining - (Date.now() - startedAt));
    };
  }, [isPlaying, safeIndex, goTo]);

  const onRootFocus = (e: ReactFocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(true);
  };
  const onRootBlur = (e: ReactFocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
  };

  const onViewportClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ox = (e.clientX - rect.left) / rect.width;
    const oy = (e.clientY - rect.top) / rect.height;
    setPlayOn(false);
    goTo(safeIndex + 1, ox, oy);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    suppressClick.current = false;
    if (e.pointerType === 'mouse') return;
    swipeStart.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = swipeStart.current;
    swipeStart.current = null;
    if (!s || e.pointerType === 'mouse') return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    suppressClick.current = true;
    setPlayOn(false);
    if (dx < 0) goTo(safeIndex + 1, 1, 0.5);
    else goTo(safeIndex - 1, 0, 0.5);
  };

  const onPrev = () => {
    setPlayOn(false);
    goTo(safeIndex - 1, 0, 0.5);
  };
  const onNext = () => {
    setPlayOn(false);
    goTo(safeIndex + 1, 1, 0.5);
  };

  const tiles = useMemo(() => {
    const { cols, rows } = grid;
    const maxDist = Math.hypot(1, ASPECT);
    const list: { i: number; j: number; pos: string; d: number }[] = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const dx = (i + 0.5) / cols - origin.x;
        const dy = ((j + 0.5) / rows - origin.y) * ASPECT;
        list.push({
          i,
          j,
          d: Math.pow(Math.hypot(dx, dy) / maxDist, 0.85) * WAVE_MS,
          pos: `${cols > 1 ? (i / (cols - 1)) * 100 : 0}% ${rows > 1 ? (j / (rows - 1)) * 100 : 0}%`,
        });
      }
    }
    return list;
  }, [grid, origin]);

  const bgSize = `${grid.cols * 100}% ${grid.rows * 100}%`;
  const face = (src: string, pos: string): CSSProperties => ({
    backgroundImage: src ? `url("${src}")` : undefined,
    backgroundPosition: pos,
    backgroundSize: bgSize,
    backgroundRepeat: 'no-repeat',
  });

  const rootStyle = {
    '--md-flip': `${FLIP_MS}ms`,
    '--md-fade': `${FADE_MS}ms`,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
      data-phase={phase}
      data-motion={reduced ? 'reduced' : 'full'}
      data-inview={inView ? 'in' : 'out'}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={onRootFocus}
      onBlur={onRootBlur}
    >
      <span className={styles.grain} aria-hidden="true" />

      <div className={styles.frame}>
        <div
          ref={viewportRef}
          className={styles.viewport}
          onClick={onViewportClick}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            swipeStart.current = null;
          }}
        >
          <div
            className={styles.grid}
            style={{
              gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
              gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
            }}
          >
            {tiles.map((t) => (
              <div
                key={`${t.i}-${t.j}`}
                className={styles.tile}
                style={{ '--d': `${t.d.toFixed(0)}ms` } as CSSProperties}
              >
                <div className={styles.flipper}>
                  <span
                    className={[styles.face, styles.faceFront, current?.src ? '' : styles.facePlaceholder]
                      .filter(Boolean)
                      .join(' ')}
                    style={face(current?.src ?? '', t.pos)}
                  />
                  <span
                    className={[styles.face, styles.faceBack, back?.src ? '' : styles.facePlaceholder]
                      .filter(Boolean)
                      .join(' ')}
                    style={face(back?.src ?? '', t.pos)}
                  />
                </div>
              </div>
            ))}
          </div>
          <span className={styles.sheen} aria-hidden="true" />
        </div>

        <div className={styles.placard}>
          <p className={styles.caption} aria-live={isPlaying ? 'off' : 'polite'} aria-atomic="true">
            <span className={styles.captionText} key={safeIndex}>
              {captionText}
            </span>
          </p>
          <span className={styles.counter} aria-hidden="true">
            {pad(safeIndex + 1)} / {pad(Math.max(count, 1))}
          </span>
          <div className={styles.controls}>
            <button
              type="button"
              className={[styles.ctrl, styles.ctrlQuiet].join(' ')}
              aria-label={playOn ? PAUSE_LABEL : PLAY_LABEL}
              onClick={() => setPlayOn((p) => !p)}
            >
              {playOn ? (
                <svg className={styles.ctrlIcon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path d="M5.75 3.5v9M10.25 3.5v9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg className={styles.ctrlIcon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path d="M5.5 3.2v9.6L12.4 8z" fill="currentColor" />
                </svg>
              )}
            </button>
            <button type="button" className={styles.ctrl} aria-label={PREV_LABEL} onClick={onPrev}>
              <svg className={styles.ctrlIcon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path
                  d="M10.5 3 5.5 8l5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button type="button" className={styles.ctrl} aria-label={NEXT_LABEL} onClick={onNext}>
              <svg className={styles.ctrlIcon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path
                  d="M5.5 3l5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {playOn && count > 1 && (
          <span className={styles.progressTrack}>
            <span
              className={styles.progressFill}
              key={`fill-${safeIndex}`}
              style={{ animationDuration: `${holdMs}ms`, animationPlayState: isPlaying ? 'running' : 'paused' }}
            />
          </span>
        )}
      </div>
    </div>
  );
}
```

```css
.root {
  --md-wall: #ebe8e2;
  --md-wall-hi: #f7f5f1;
  --md-wall-lo: #dcd7cd;
  --md-frame: #2c2924;
  --md-frame-deep: #242119;
  --md-frame-hi: rgba(255, 255, 255, 0.08);
  --md-grout: #b5ada0;
  --md-ink: #26231e;
  --md-light: #ece7dd;
  --md-light-muted: rgba(236, 231, 221, 0.64);
  --md-hairline: rgba(255, 255, 255, 0.14);
  --md-focus: #f0eadf;
  --md-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --md-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.42  0 0 0 0 0.36  0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  display: grid;
  justify-items: center;
  padding-block: clamp(36px, 6cqi, 68px);
  padding-inline: clamp(14px, 3cqi, 28px);
  background:
    radial-gradient(75% 55% at 50% 0%, var(--md-wall-hi) 0%, transparent 72%),
    linear-gradient(180deg, var(--md-wall) 0%, var(--md-wall-lo) 100%);
  color: var(--md-ink);
  font-family: var(--md-font-ui);
}

.root ::selection {
  background: #cfc7b8;
  color: #211e18;
}

.grain {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: var(--md-noise);
  opacity: 0.3;
  mix-blend-mode: multiply;
}

.frame {
  position: relative;
  z-index: 1;
  inline-size: min(100%, 1020px);
  box-sizing: border-box;
  padding-block: clamp(10px, 1.8cqi, 16px) clamp(20px, 3cqi, 28px);
  padding-inline: clamp(10px, 1.8cqi, 16px);
  border-radius: 22px;
  background: linear-gradient(168deg, #343028 0%, var(--md-frame) 52%, var(--md-frame-deep) 100%);
  box-shadow:
    inset 0 1px 0 var(--md-frame-hi),
    inset 0 0 0 1px rgba(0, 0, 0, 0.22),
    0 54px 100px -48px rgba(44, 37, 26, 0.55),
    0 18px 38px -20px rgba(44, 37, 26, 0.42);
}

.viewport {
  position: relative;
  aspect-ratio: 3 / 2;
  border-radius: 10px;
  overflow: hidden;
  perspective: 1400px;
  background: var(--md-grout);
  cursor: pointer;
  touch-action: pan-y;
  -webkit-tap-highlight-color: transparent;
}

.grid {
  position: absolute;
  inset: 0;
  display: grid;
  gap: 2px;
  padding: 2px;
  background: var(--md-grout);
}

.tile {
  position: relative;
}

.flipper {
  position: absolute;
  inset: 0;
  transform: rotateY(0deg);
  transform-style: preserve-3d;
}

.root[data-motion='full'][data-phase='flip'] .flipper {
  transform: rotateY(-180deg);
  transition: transform var(--md-flip, 640ms) cubic-bezier(0.3, 1.26, 0.42, 1);
  transition-delay: var(--d);
  will-change: transform;
}

.face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  background-repeat: no-repeat;
  background-color: #c9c2b4;
}

.faceBack {
  transform: rotateY(180deg);
}

.facePlaceholder {
  background-image: linear-gradient(150deg, #d6cfc2 0%, #bab2a3 55%, #a89f8f 100%);
}

/* Resting per-tile gloss: each chip reads as a glazed ceramic square. */
.tile::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(168deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.05) 22%, transparent 40%);
}

/* Flip highlight: a specular glint sweeping each tile as it turns. */
.tile::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: linear-gradient(
    118deg,
    transparent 22%,
    rgba(255, 255, 255, 0.95) 47%,
    rgba(255, 255, 255, 0.25) 56%,
    transparent 80%
  );
  opacity: 0;
}

.root[data-motion='full'][data-phase='flip'] .tile::after {
  animation: tile-glint var(--md-flip, 640ms) cubic-bezier(0.3, 0.9, 0.2, 1) var(--d) both;
}

/* Secondary motion: each tile lifts as it flips and settles back. */
.root[data-motion='full'][data-phase='flip'] .tile {
  animation: tile-lift var(--md-flip, 640ms) cubic-bezier(0.3, 1.26, 0.42, 1) var(--d) both;
}

@keyframes tile-glint {
  0% {
    opacity: 0;
  }
  35% {
    opacity: 0.85;
  }
  62% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}

@keyframes tile-lift {
  0% {
    transform: scale(1);
  }
  42% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

/* Reduced motion: the whole surface crossfades, no ripple, no lift. */
.root[data-motion='reduced'] .face {
  transition: opacity var(--md-fade, 200ms) ease;
}

.root[data-motion='reduced'] .faceBack {
  opacity: 0;
}

.root[data-motion='reduced'][data-phase='flip'] .faceFront {
  opacity: 0;
}

.root[data-motion='reduced'][data-phase='flip'] .faceBack {
  opacity: 1;
}

/* Idle life: a slow showroom glint drifting across the tile field. */
.sheen {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  background: linear-gradient(
    112deg,
    transparent 34%,
    rgba(255, 255, 255, 0.12) 46%,
    rgba(255, 255, 255, 0.26) 50%,
    rgba(255, 255, 255, 0.12) 54%,
    transparent 66%
  );
  background-size: 300% 100%;
  background-repeat: no-repeat;
  opacity: 0;
  animation: sheen-sweep 9s ease-in-out infinite;
}

.root[data-inview='out'] .sheen,
.root[data-motion='reduced'] .sheen {
  animation-play-state: paused;
}

@keyframes sheen-sweep {
  0% {
    background-position: 140% 0;
    opacity: 0;
  }
  5% {
    opacity: 0.6;
  }
  24% {
    background-position: -40% 0;
    opacity: 0.6;
  }
  32% {
    background-position: -40% 0;
    opacity: 0;
  }
  100% {
    background-position: -40% 0;
    opacity: 0;
  }
}

.placard {
  display: flex;
  align-items: center;
  gap: clamp(10px, 2cqi, 22px);
  margin-block-start: clamp(10px, 1.8cqi, 16px);
  padding-block-start: clamp(10px, 1.8cqi, 14px);
  border-block-start: 1px solid rgba(255, 255, 255, 0.09);
}

.caption {
  flex: 1 1 12em;
  min-inline-size: 0;
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: 0.002em;
  color: var(--md-light);
}

.captionText {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.root[data-motion='full'] .captionText {
  animation: caption-in 360ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes caption-in {
  from {
    opacity: 0;
    transform: translateY(7px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.counter {
  flex: none;
  min-inline-size: 6ch;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.16em;
  font-variant-numeric: tabular-nums;
  color: var(--md-light-muted);
}

.controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-inline-start: auto;
}

.ctrl {
  display: grid;
  place-items: center;
  inline-size: 44px;
  block-size: 44px;
  padding: 0;
  border: 1px solid var(--md-hairline);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
  color: var(--md-light);
  cursor: pointer;
  transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease;
}

.ctrl:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.32);
}

.ctrl:active {
  transform: scale(0.93);
}

.ctrl:focus-visible {
  outline: 2px solid var(--md-focus);
  outline-offset: 2px;
}

.ctrlQuiet {
  border-color: transparent;
  background: transparent;
}

.ctrlQuiet:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.18);
}

.ctrlIcon {
  inline-size: 16px;
  block-size: 16px;
}

.progressTrack {
  position: absolute;
  inset-inline: clamp(10px, 1.8cqi, 16px);
  inset-block-end: 8px;
  block-size: 2px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
  pointer-events: none;
}

.progressFill {
  display: block;
  block-size: 100%;
  inline-size: 100%;
  transform-origin: 0 50%;
  background: linear-gradient(90deg, rgba(236, 231, 221, 0.35), rgba(236, 231, 221, 0.95));
  animation-name: progress-grow;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

@keyframes progress-grow {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

@container (width < 560px) {
  .placard {
    flex-wrap: wrap;
    row-gap: 12px;
  }

  .caption {
    flex-basis: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sheen {
    display: none;
  }
}
```
