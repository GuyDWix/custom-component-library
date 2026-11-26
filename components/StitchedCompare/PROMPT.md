Create a custom element called "Stitched Compare". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: before image, before image description, before label, after image, after image description, after label. Add other settings if they help.

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface StitchedCompareProps {
  beforeImage?: string;
  beforeAlt?: string;
  beforeLabel?: string;
  afterImage?: string;
  afterAlt?: string;
  afterLabel?: string;
  className?: string;
}

const STIFFNESS = 170;
const DAMPING = 21;
const KEY_STEP = 3;
const EDGE_PAD = 4;

const SEAM_HELP =
  'Drag the stitched seam to compare the two photos; left and right arrow keys nudge it, Escape recentres it.';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const cx = (...c: (string | undefined)[]) => c.filter(Boolean).join(' ');

export default function StitchedCompare({
  beforeImage = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1400&h=900&fit=crop&auto=format&q=80',
  beforeAlt = 'The sitting room before the re-upholstery refresh',
  beforeLabel = 'Before — the sitting room',
  afterImage = 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1400&h=900&fit=crop&auto=format&q=80',
  afterAlt = 'The restored armchair after the re-upholstery refresh',
  afterLabel = 'After — restyled & re-upholstered',
  className,
}: StitchedCompareProps) {
  const [reduced, setReduced] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  const posRef = useRef(50);
  const velRef = useRef(0);
  const targetRef = useRef(50);
  const grabRef = useRef(0);
  const limRef = useRef({ min: 3, max: 97 });
  const rafRef = useRef(0);
  const dragRef = useRef(false);
  const reducedRef = useRef(false);
  const inViewRef = useRef(true);

  const paint = useCallback(() => {
    const plate = plateRef.current;
    if (!plate) return;
    plate.style.setProperty('--sc-pos', `${posRef.current.toFixed(3)}%`);
    plate.style.setProperty('--sc-grab', grabRef.current.toFixed(3));
    handleRef.current?.setAttribute('aria-valuenow', String(Math.round(posRef.current)));
  }, []);

  const ensureLoop = useCallback(() => {
    if (reducedRef.current || !inViewRef.current || rafRef.current) return;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const hh = dt / steps;
      for (let i = 0; i < steps; i++) {
        velRef.current += (STIFFNESS * (targetRef.current - posRef.current) - DAMPING * velRef.current) * hh;
        posRef.current += velRef.current * hh;
      }
      const goal = Math.min(1, Math.abs(velRef.current) / 26);
      grabRef.current += (goal - grabRef.current) * (1 - Math.exp(-(goal > grabRef.current ? 14 : 6) * dt));
      paint();

      const settled =
        Math.abs(targetRef.current - posRef.current) < 0.05 &&
        Math.abs(velRef.current) < 0.05 &&
        grabRef.current < 0.01;
      if (settled) {
        posRef.current = targetRef.current;
        velRef.current = 0;
        grabRef.current = 0;
        paint();
        rafRef.current = 0;
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [paint]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const seek = useCallback(
    (p: number, instant = false) => {
      targetRef.current = clamp(p, limRef.current.min, limRef.current.max);
      if (instant || reducedRef.current) {
        posRef.current = targetRef.current;
        velRef.current = 0;
        grabRef.current = 0;
        paint();
      } else {
        ensureLoop();
      }
    },
    [ensureLoop, paint]
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      reducedRef.current = mq.matches;
      setReduced(mq.matches);
      if (mq.matches) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
        posRef.current = targetRef.current;
        velRef.current = 0;
        grabRef.current = 0;
        paint();
      }
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [paint]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting) ensureLoop();
      },
      { threshold: 0.05 }
    );
    io.observe(root);
    return () => io.disconnect();
  }, [ensureLoop]);

  useEffect(() => {
    const plate = plateRef.current;
    if (!plate) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w < 2) return;
      const min = Math.max(3, ((22 + EDGE_PAD) / w) * 100);
      limRef.current = { min, max: 100 - min };
      targetRef.current = clamp(targetRef.current, min, 100 - min);
      posRef.current = clamp(posRef.current, min, 100 - min);
      paint();
    });
    ro.observe(plate);
    return () => ro.disconnect();
  }, [paint]);

  const xToPos = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width < 2) return posRef.current;
    return ((e.clientX - rect.left) / rect.width) * 100;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = true;
    handleRef.current?.focus({ preventScroll: true });
    seek(xToPos(e));
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) seek(xToPos(e));
  };

  const onPointerEnd = () => {
    dragRef.current = false;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : KEY_STEP;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      seek(targetRef.current - step);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      seek(targetRef.current + step);
    } else if (e.key === 'Home') {
      e.preventDefault();
      seek(0, reduced);
    } else if (e.key === 'End') {
      e.preventDefault();
      seek(100, reduced);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      seek(50);
    }
  };


  const renderLayer = (
    side: 'Before' | 'After',
    image: string,
    alt: string,
    label: string
  ) => (
    <div className={cx(styles.layer, side === 'Before' ? styles.layerBefore : styles.layerAfter)}>
      {image ? (
        <img className={styles.photo} src={image} alt={alt} draggable={false} />
      ) : (
        <span className={styles.swatch} role="img" aria-label={alt} />
      )}
      <span className={cx(styles.label, side === 'Before' ? styles.labelBefore : styles.labelAfter)}>
        {label}
      </span>
    </div>
  );

  return (
    <div ref={rootRef} className={cx(styles.root, className)}>
      <div
        ref={plateRef}
        className={styles.plate}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <span className={styles.gap} aria-hidden="true" />
        {renderLayer('Before', beforeImage, beforeAlt, beforeLabel)}
        {renderLayer('After', afterImage, afterAlt, afterLabel)}
        <span className={styles.plateEdge} aria-hidden="true" />

        <svg className={styles.seam} width="6" height="100%" aria-hidden="true" focusable="false">
          <line className={styles.stitchShadow} x1="3.6" x2="3.6" y1="0" y2="100%" />
          <line className={styles.stitch} x1="3" x2="3" y1="0" y2="100%" />
          <line className={styles.stitchSheen} x1="2.5" x2="2.5" y1="0" y2="100%" />
        </svg>

        <div
          ref={handleRef}
          className={styles.handle}
          role="slider"
          tabIndex={0}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={50}
          aria-label="Comparison seam"
          aria-description={SEAM_HELP}
          onKeyDown={onKeyDown}
        >
          <svg className={styles.chevrons} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9.5 8 5.5 12l4 4M14.5 8l4 4-4 4" />
          </svg>
        </div>
      </div>
    </div>
  );
}
```

```css
.root {
  --thread: #9b2d2b;
  --sc-gap: 10px;

  position: relative;
  isolation: isolate;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding: clamp(12px, 3cqw, 28px);
  border-radius: 20px;
  overflow: clip;
  color: #24201b;
  background: linear-gradient(180deg, #f6f3ee 0%, #ebe6dd 100%);
  box-shadow:
    inset 0 0 0 1px rgba(60, 48, 32, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.plate {
  --sc-pos: 50%;
  --sc-grab: 0;

  position: relative;
  direction: ltr;
  inline-size: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 10px;
  touch-action: pan-y;
  cursor: ew-resize;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  background: #1c1815;
  box-shadow:
    0 1px 2px rgba(36, 26, 14, 0.14),
    0 10px 24px -8px rgba(36, 26, 14, 0.28);
}

/* The channel between the two panels: shaded, with the thread bridging it. */
.gap {
  position: absolute;
  inset-block: 0;
  inset-inline-start: var(--sc-pos);
  inline-size: var(--sc-gap);
  translate: -50% 0;
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(90deg, #26211c, #14110f 50%, #26211c);
}

.layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: 10px;
  overflow: hidden;
}

.layerBefore {
  clip-path: inset(0 calc(100% - var(--sc-pos) + var(--sc-gap) / 2) 0 0);
}

.layerAfter {
  clip-path: inset(0 0 0 calc(var(--sc-pos) + var(--sc-gap) / 2));
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

.swatch {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  background: linear-gradient(160deg, #e9e3d7, #cfc6b4);
}

.plateEdge {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  border-radius: 10px;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 -40px 50px -40px rgba(0, 0, 0, 0.35);
}

.label {
  position: absolute;
  inset-block-start: 14px;
  box-sizing: border-box;
  max-inline-size: min(40cqw, 280px);
  padding: 7px 12px 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #fbf8f2;
  background: rgba(24, 20, 16, 0.64);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(10px) saturate(1.2);
  -webkit-backdrop-filter: blur(10px) saturate(1.2);
  pointer-events: none;
}

.labelBefore {
  inset-inline-start: 14px;
}

.labelAfter {
  inset-inline-end: 14px;
}

/* One thread colour, small even running stitches. */
.seam {
  position: absolute;
  inset-block: 0;
  inset-inline-start: var(--sc-pos);
  translate: -50% 0;
  z-index: 4;
  overflow: visible;
  pointer-events: none;
}

.stitch,
.stitchShadow,
.stitchSheen {
  fill: none;
  stroke-linecap: round;
  stroke-dasharray: 6 7;
  stroke-dashoffset: -3.5;
}

.stitch {
  stroke: var(--thread);
  stroke-width: 2.2px;
}

.stitchShadow {
  stroke: rgba(0, 0, 0, 0.45);
  stroke-width: 2.4px;
}

.stitchSheen {
  stroke: color-mix(in srgb, var(--thread) 55%, #fff1e4);
  stroke-width: 0.7px;
  opacity: 0.75;
}

.handle {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: var(--sc-pos);
  z-index: 9;
  translate: -50% -50%;
  scale: calc(1 + var(--sc-grab) * 0.06);
  display: grid;
  place-items: center;
  inline-size: 44px;
  block-size: 44px;
  border-radius: 50%;
  cursor: ew-resize;
  color: #4a4238;
  background: linear-gradient(160deg, #fffdf9 0%, #ece6db 100%);
  box-shadow:
    0 0 0 1px rgba(40, 30, 18, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    inset 0 0 0 4px rgba(255, 255, 255, 0.35),
    0 1px 2px rgba(20, 14, 6, 0.3),
    0 calc(6px + var(--sc-grab) * 4px) calc(14px + var(--sc-grab) * 6px) -4px rgba(20, 14, 6, 0.45);
}

.handle:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 3px;
  box-shadow:
    0 0 0 5px color-mix(in srgb, var(--thread) 80%, #000),
    0 6px 14px -4px rgba(20, 14, 6, 0.45);
}

.chevrons {
  inline-size: 22px;
  block-size: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8px;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@container (max-width: 540px) {
  .root {
    border-radius: 16px;
  }

  .plate {
    aspect-ratio: 4 / 3;
  }

  .label {
    inset-block-start: 8px;
    max-inline-size: 38cqw;
    padding: 5px 9px 4px;
    font-size: 10px;
    letter-spacing: 0.1em;
  }

  .labelBefore {
    inset-inline-start: 8px;
  }

  .labelAfter {
    inset-inline-end: 8px;
  }

  .handle {
    inline-size: 48px;
    block-size: 48px;
  }
}
```
