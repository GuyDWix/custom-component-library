Create a custom element called "Twisted Ribbon Strip". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: photos (image, caption), speed, twist amount. Add other settings if they help.

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import styles from './Component.module.css';

export interface RibbonPhoto {
  image: string;
  caption: string;
}

export interface TwistedRibbonStripProps {
  photos?: RibbonPhoto[];
  /** Glide speed in pixels per second. 0 shows a still ribbon. */
  speed?: number;
  /** How far the ribbon twists at its ends, in degrees (30–96). */
  twistAmount?: number;
  className?: string;
}

const DEFAULT_PHOTOS: RibbonPhoto[] = [
  {
    image:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=640&h=840&fit=crop&crop=faces&auto=format',
    caption: 'Amara Okonkwo — silk study, north light',
  },
  {
    image:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=640&h=840&fit=crop&crop=faces&auto=format',
    caption: 'Jonas Reyes — harbour sessions',
  },
  {
    image:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=640&h=840&fit=crop&crop=faces&auto=format',
    caption: 'Mei Tanaka — silk series no. 4',
  },
  {
    image:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=640&h=840&fit=crop&crop=faces&auto=format',
    caption: 'Elias Brandt — winter portraits, Berlin',
  },
  {
    image:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=640&h=840&fit=crop&crop=faces&auto=format',
    caption: 'Sofia Marchetti — atelier visit, Milan',
  },
  {
    image:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=640&h=840&fit=crop&crop=faces&auto=format',
    caption: 'Noa Kim — rooftop study, golden hour',
  },
];

const REPEAT = 3;
const PANEL_RATIO = 1.3;
const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const pad2 = (n: number) => String(n).padStart(2, '0');

const STRIP_HELP =
  'Photo ribbon. Drag or swipe to move it, hover slows it down, arrow keys step between photos.';

type Tween = { from: number; to: number; start: number } | null;

export default function TwistedRibbonStrip({
  photos = DEFAULT_PHOTOS,
  speed = 42,
  twistAmount = 80,
  className,
}: TwistedRibbonStripProps) {
  const list = photos.length > 0 ? photos : DEFAULT_PHOTOS;
  const n = list.length;
  const panelCount = n * REPEAT;

  const [reduced, setReduced] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [width, setWidth] = useState(960);
  const [centreIdx, setCentreIdx] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<Array<HTMLDivElement | null>>([]);
  const setPanel = useCallback(
    (i: number) => (el: HTMLDivElement | null) => {
      panelsRef.current[i] = el;
    },
    []
  );

  const offsetRef = useRef(0);
  const velRef = useRef(0);
  const slowRef = useRef(1);
  const draggingRef = useRef(false);
  const hoveredRef = useRef(false);
  const playingRef = useRef(true);
  const inViewRef = useRef(true);
  const tweenRef = useRef<Tween>(null);
  const introStartRef = useRef<number | null>(null);
  const lastCentreRef = useRef(0);
  const pointerRef = useRef({ x: 0, t: 0, vel: 0 });

  // Layout parameters, recomputed on every render; the rAF loop reads them via ref.
  const params = useMemo(() => {
    const small = width < 480;
    const spacing = clamp(width / 4.6, 148, 300);
    const panelW = spacing * 0.94;
    const halfSpan = width / 2 + panelW * 0.75;
    const twist = clamp(twistAmount, 30, 96) * (small ? 0.72 : 1);
    return {
      spacing,
      panelW,
      halfSpan,
      loop: panelCount * spacing,
      twistRight: twist,
      twistLeft: twist + 18,
      depth: 80 + width * 0.04,
      speedPx: clamp(speed, 0, 140) * (small ? 0.55 : 1),
    };
  }, [width, twistAmount, speed, panelCount]);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  playingRef.current = playing;

  // Reduced motion: switch to the flat, scroll-snapped strip.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Size to the container.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && Math.abs(w - width) > 1) setWidth(w);
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [width]);

  // Pause the loop while off-screen.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        inViewRef.current = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  // The ribbon loop: glide + twist + sheen + inertia + keyboard tweens.
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let last = performance.now();

    const step = (now: number) => {
      const p = paramsRef.current;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (introStartRef.current === null) introStartRef.current = now;
      const elapsed = now - introStartRef.current;

      // Speed easing: hover slows to a drift, pause and drag stop the glide.
      const slowTarget = draggingRef.current ? 0 : hoveredRef.current || !playingRef.current ? 0.12 : 1;
      slowRef.current += (slowTarget - slowRef.current) * Math.min(1, dt * 5);

      const tw = tweenRef.current;
      if (tw) {
        const k = clamp((now - tw.start) / 420, 0, 1);
        offsetRef.current = tw.from + (tw.to - tw.from) * EASE_OUT(k);
        if (k >= 1) tweenRef.current = null;
        velRef.current = 0;
      } else {
        offsetRef.current += p.speedPx * slowRef.current * dt + velRef.current * dt;
        velRef.current *= Math.exp(-dt * 3.4);
      }

      // Centre photo caption.
      const k = Math.round(offsetRef.current / p.spacing);
      const centre = ((k % n) + n) % n;
      if (centre !== lastCentreRef.current) {
        lastCentreRef.current = centre;
        setCentreIdx(centre);
      }

      if (inViewRef.current) {
        const introDone = elapsed > 120 + panelCount * 40 + 700;
        for (let i = 0; i < panelCount; i++) {
          const el = panelsRef.current[i];
          if (!el) continue;
          const raw = i * p.spacing - offsetRef.current;
          const c = (((raw % p.loop) + p.loop) % p.loop) - p.loop / 2;
          const t = c / p.halfSpan;
          const at = Math.abs(t);
          if (at > 1.35) {
            el.style.opacity = '0';
            continue;
          }
          let op = at > 0.82 ? clamp((1 - at) / 0.18, 0, 1) : 1;
          let lift = 0;
          let extra = 0;
          if (!introDone) {
            const ip = EASE_OUT(clamp((elapsed - 120 - i * 40) / 640, 0, 1));
            op *= ip;
            lift = (1 - ip) * 34;
            extra = (1 - ip) * -26;
          }
          const angle = (t >= 0 ? t * p.twistRight : t * p.twistLeft) + extra;
          const z = -p.depth * t * t;
          const y = t * t * 10 + lift;
          el.style.transform = `translate(-50%, -50%) translate3d(${c.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${angle.toFixed(2)}deg)`;
          el.style.opacity = op.toFixed(3);
          el.style.setProperty('--shine', `${clamp(50 + t * 58, 0, 100).toFixed(1)}%`);
          el.style.setProperty('--shadow-o', (0.34 * Math.pow(Math.max(0, 1 - at), 1.5) * (op || 0)).toFixed(3));
        }
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduced, n, panelCount]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    draggingRef.current = true;
    tweenRef.current = null;
    velRef.current = 0;
    pointerRef.current = { x: e.clientX, t: performance.now(), vel: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const now = performance.now();
    const dx = e.clientX - pointerRef.current.x;
    const dtm = Math.max(now - pointerRef.current.t, 1);
    offsetRef.current -= dx;
    pointerRef.current.vel = pointerRef.current.vel * 0.6 + (-dx / dtm) * 1000 * 0.4;
    pointerRef.current.x = e.clientX;
    pointerRef.current.t = now;
  }, []);

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    velRef.current = clamp(pointerRef.current.vel, -2200, 2200);
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const p = paramsRef.current;
      const tw = tweenRef.current;
      const from = tw ? tw.to : offsetRef.current;
      tweenRef.current = { from, to: from + p.spacing * dir, start: performance.now() };
    },
    []
  );

  const stageStyle = {
    '--pw': `${params.panelW.toFixed(1)}px`,
    blockSize: `${Math.round(params.panelW * PANEL_RATIO + 96)}px`,
  } as CSSProperties;

  const caption = list[centreIdx]?.caption ?? '';

  if (reduced) {
    return (
      <div className={`${styles.root} ${className ?? ''}`} ref={rootRef}>
        <div
          className={styles.staticScroll}
          tabIndex={0}
          role="list"
          aria-label={`Photo strip. ${STRIP_HELP}`}
        >
          {list.map((photo, i) => (
            <figure className={styles.staticCard} role="listitem" key={i}>
              <div className={styles.staticMat}>
                {photo.image ? (
                  <img className={styles.staticImg} src={photo.image} alt={photo.caption} loading="lazy" />
                ) : (
                  <div className={styles.staticEmpty}>{photo.caption}</div>
                )}
              </div>
              <figcaption className={styles.staticCaption}>
                <span className={styles.counter}>{pad2(i + 1)} / {pad2(n)}</span>
                <span>{photo.caption}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className={styles.grain} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={`${styles.root} ${className ?? ''}`} ref={rootRef}>
      <div
        className={styles.stage}
        ref={stageRef}
        style={stageStyle}
        tabIndex={0}
        role="group"
        aria-label={STRIP_HELP}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerEnter={() => {
          hoveredRef.current = true;
        }}
        onPointerLeave={() => {
          hoveredRef.current = false;
        }}
      >
        <div className={styles.ribbonShadow} aria-hidden="true" />
        {Array.from({ length: panelCount }, (_, i) => {
          const photo = list[i % n];
          return (
            <div className={styles.panel} key={i} ref={setPanel(i)}>
              <div className={styles.faceFront}>
                <div className={styles.mat}>
                  {photo.image ? (
                    <img className={styles.photo} src={photo.image} alt={photo.caption} loading="lazy" draggable={false} />
                  ) : (
                    <div className={styles.photoAlt}>{photo.caption}</div>
                  )}
                </div>
                <div className={styles.sheen} aria-hidden="true" />
              </div>
              <div className={styles.faceBack} aria-hidden="true">
                <div className={styles.sheen} />
              </div>
            </div>
          );
        })}
        <button
          type="button"
          className={styles.pauseButton}
          aria-label={playing ? 'Pause the ribbon' : 'Play the ribbon'}
          onClick={() => setPlaying((v) => !v)}
        >
          {playing ? (
            <svg className={styles.pauseIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            </svg>
          ) : (
            <svg className={styles.pauseIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>
      <div className={styles.captionRow}>
        <span className={styles.captionText} key={centreIdx} aria-live={playing ? 'off' : 'polite'}>
          {caption}
        </span>
        <span className={styles.counter} aria-hidden="true">
          {pad2(centreIdx + 1)} / {pad2(n)}
        </span>
      </div>
      <div className={styles.grain} aria-hidden="true" />
    </div>
  );
}
```

```css
/* TwistedRibbonStrip — silk ribbon: satin-sheen cream faces, deep teal backs,
   soft studio light, long gentle shadows. */

.root {
  --font: 'Avenir Next', 'Segoe UI', 'Helvetica Neue', system-ui, sans-serif;

  position: relative;
  isolation: isolate;
  font-family: var(--font);
  color: #242f2d;
  background: radial-gradient(130% 100% at 50% -12%, #f7f4ec 0%, #f7f4ec 46%, #e2ded3 100%);
  padding-block: 44px 10px;
  overflow: clip;
}

.root ::selection {
  background: #12494d;
  color: #fbf5e6;
}

.grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.05;
  mix-blend-mode: multiply;
  background-size: 140px 140px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
}

/* — animated ribbon — */

.stage {
  position: relative;
  perspective: 1150px;
  perspective-origin: 50% 38%;
  overflow: clip;
  border-radius: 16px;
  touch-action: pan-y;
  outline: none;
}

.stage:focus-visible {
  outline: 2px solid #12494d;
  outline-offset: -2px;
}

.ribbonShadow {
  position: absolute;
  inset-inline: 7%;
  inset-block-end: 14px;
  block-size: 34px;
  pointer-events: none;
  background: radial-gradient(50% 100% at 50% 50%, rgba(19, 32, 33, 0.3), rgba(19, 32, 33, 0) 70%);
}

.panel {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 50%;
  inline-size: var(--pw);
  block-size: calc(var(--pw) * 1.3);
  transform-style: preserve-3d;
  opacity: 0;
  will-change: transform;
}

.panel::after {
  content: '';
  position: absolute;
  inset-inline: -7%;
  inset-block-end: -9%;
  block-size: 18%;
  pointer-events: none;
  border-radius: 50%;
  transform: translateZ(-8px);
  opacity: var(--shadow-o, 0);
  background: radial-gradient(50% 100% at 50% 0%, rgba(13, 27, 28, 0.5), rgba(13, 27, 28, 0) 72%);
}

.faceFront,
.faceBack {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  backface-visibility: hidden;
  pointer-events: none;
}

.faceFront {
  background: linear-gradient(155deg, #fbf5e6 0%, #f2e9d6 55%, #e9dfc8 100%);
  box-shadow: inset 0 0 0 1px rgba(84, 70, 40, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.5);
  padding: calc(var(--pw) * 0.045);
  padding-block-end: calc(var(--pw) * 0.075);
}

.faceBack {
  transform: rotateY(180deg);
  background:
    repeating-linear-gradient(72deg, rgba(255, 255, 255, 0.05) 0 1px, rgba(255, 255, 255, 0) 1px 3px),
    linear-gradient(160deg, #17545a 0%, #12494d 45%, #0b3336 100%);
  box-shadow: inset 0 0 0 1px rgba(5, 26, 28, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.mat {
  position: relative;
  inline-size: 100%;
  block-size: 100%;
  overflow: clip;
  border-radius: 3px;
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  user-select: none;
}

.photoAlt {
  inline-size: 100%;
  block-size: 100%;
  display: grid;
  place-items: center;
  padding: 12px;
  text-align: center;
  font-size: 13px;
  line-height: 1.45;
  color: #12494d;
  background: linear-gradient(150deg, #eef3f0, #dde6e2);
}

.sheen {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background-size: 220% 100%;
  background-position: var(--shine, 50%) 0;
}

.faceFront > .sheen {
  background-image: linear-gradient(115deg, rgba(255, 255, 255, 0) 30%, rgba(255, 255, 250, 0.34) 46%, rgba(255, 255, 255, 0) 62%);
  mix-blend-mode: soft-light;
}

.faceBack > .sheen {
  background-image: linear-gradient(115deg, rgba(255, 255, 255, 0) 32%, rgba(214, 240, 238, 0.22) 48%, rgba(255, 255, 255, 0) 64%);
}

/* — caption — */

.captionRow {
  position: relative;
  display: flex;
  align-items: baseline;
  justify-content: center;
  min-block-size: 46px;
  padding: 10px 48px 18px;
  text-align: center;
}

.captionText {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.4;
  color: rgba(36, 47, 45, 0.66);
  max-inline-size: 56ch;
  text-wrap: balance;
  animation: caption-in 0.45s ease-out both;
}

.counter {
  position: absolute;
  inset-inline-end: clamp(16px, 4%, 44px);
  font-size: 12px;
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
  color: #12494d;
}

@keyframes caption-in {
  from {
    opacity: 0;
    transform: translateY(7px);
  }
}

/* — quiet pause control (motion runs continuously) — */

.pauseButton {
  position: absolute;
  inset-block-start: 10px;
  inset-inline-end: 10px;
  inline-size: 32px;
  block-size: 32px;
  border-radius: 50%;
  border: 1px solid rgba(18, 73, 77, 0.2);
  background: rgba(251, 245, 230, 0.92);
  color: #12494d;
  display: grid;
  place-items: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.25s ease, background-color 0.25s ease;
  z-index: 2;
}

.stage:hover .pauseButton,
.stage:focus-within .pauseButton {
  opacity: 1;
}

.pauseButton:hover {
  background: #fbf5e6;
}

.pauseButton:focus-visible {
  opacity: 1;
  outline: 2px solid #12494d;
  outline-offset: 2px;
}

.pauseIcon {
  inline-size: 12px;
  block-size: 12px;
  fill: currentColor;
}

/* — reduced motion: flat static strip, scroll-snapped — */

.staticScroll {
  display: flex;
  gap: 22px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  padding: 8px 16px 14px;
  scrollbar-width: thin;
  scrollbar-color: #12494d transparent;
  outline: none;
}

.staticScroll:focus-visible {
  outline: 2px solid #12494d;
  outline-offset: -2px;
  border-radius: 12px;
}

.staticCard {
  flex: none;
  scroll-snap-align: center;
  inline-size: min(72vw, 290px);
  margin: 0;
}

.staticMat {
  border-radius: 10px;
  background: linear-gradient(155deg, #fbf5e6 0%, #f2e9d6 55%, #e9dfc8 100%);
  box-shadow: inset 0 0 0 1px rgba(84, 70, 40, 0.16), 0 22px 32px -20px rgba(19, 32, 33, 0.4), 0 2px 6px rgba(19, 32, 33, 0.08);
  padding: 12px;
  padding-block-end: 20px;
}

.staticImg {
  display: block;
  inline-size: 100%;
  block-size: auto;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  border-radius: 3px;
}

.staticEmpty {
  aspect-ratio: 4 / 5;
  display: grid;
  place-items: center;
  padding: 12px;
  text-align: center;
  font-size: 13px;
  line-height: 1.45;
  color: #12494d;
  background: linear-gradient(150deg, #eef3f0, #dde6e2);
  border-radius: 3px;
}

.staticCaption {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 10px 2px 4px;
  font-size: 13px;
  line-height: 1.4;
  color: rgba(36, 47, 45, 0.66);
}

@media (prefers-reduced-motion: reduce) {
  .captionText {
    animation: none;
  }
}
```
