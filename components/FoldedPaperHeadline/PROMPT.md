Create a custom element called "Folded Paper Headline". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: headline text, paper color, text color, fold count. Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import styles from './Component.module.css';

export interface FoldedPaperHeadlineProps {
  headline?: string;
  paperColor?: string;
  textColor?: string;
  foldCount?: number;
  className?: string;
}

const FOLD_DEG = 32;
const UNFOLD_LEN = 0.5;
const STIFFNESS = 130;
const DAMPING = 17;
const MIN_FONT = 22;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const backOut = (t: number) => {
  const c1 = 0.9;
  const c3 = c1 + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
};

type Spring = { p: number; v: number };

export default function FoldedPaperHeadline({
  headline = 'Folded Light',
  paperColor = '#e2502c',
  textColor = '#f6edda',
  foldCount = 5,
  className,
}: FoldedPaperHeadlineProps) {
  const uid = useId();
  const headingId = `${uid}-heading`;

  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [narrow, setNarrow] = useState(false);
  const [fit, setFit] = useState<number | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const spring = useRef<Spring>({ p: 0, v: 0 });
  const sceneWidth = useRef(0);
  const open = useRef(false);

  const folds = Math.max(1, Math.min(9, Math.round(foldCount)));
  const effFolds = narrow ? Math.min(folds, 2) : folds;
  const facetCount = effFolds + 1;

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
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0,
      rootMargin: '30% 0px 30% 0px',
    });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    const probe = probeRef.current;
    if (!scene || !probe) return;
    const measure = () => {
      const w = scene.getBoundingClientRect().width;
      sceneWidth.current = w;
      setNarrow(w < 520);
      const pw = probe.getBoundingClientRect().width;
      if (w > 0 && pw > 0) {
        const avail = w * 0.92;
        const desired = Math.min(130, Math.max(36, w * 0.16));
        // one line when it fits at a decent size, otherwise 2 or 3 balanced lines (the strip grows to match) before shrinking further
        const sizeFor = (lines: number) => Math.min(desired, (100 * avail * lines) / (pw * (1 + 0.06 * lines)));
        const size = [1, 2, 3].map(sizeFor).find((v, i) => v >= desired * (i === 0 ? 0.55 : 0.5)) ?? sizeFor(3);
        setFit(Math.max(MIN_FONT, size));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scene);
    return () => ro.disconnect();
  }, [headline]);

  const paint = useCallback(
    (progress: number) => {
      const scene = sceneRef.current;
      if (!scene) return;
      const set = (name: string, value: string) => scene.style.setProperty(name, value);
      const rad = Math.PI / 180;
      const k = effFolds + 1;
      const step = (1 - UNFOLD_LEN) / Math.max(1, k - 1);
      const dirs: number[] = [];
      let widthSum = 0;
      for (let i = 0; i < k; i++) {
        const eased = backOut(clamp01((progress - i * step) / UNFOLD_LEN));
        const dir = (i % 2 === 0 ? -1 : 1) * FOLD_DEG * (1 - eased);
        dirs.push(dir);
        widthSum += Math.cos(dir * rad);
        set(`--e${i}`, eased.toFixed(4));
        const dot = -0.48 * Math.sin(dir * rad) + 0.8 * Math.cos(dir * rad);
        set(`--lit${i}`, (clamp01((dot - 0.8) / 0.16) * 0.34).toFixed(4));
        set(`--shd${i}`, (clamp01((0.8 - dot) / 0.45) * 0.42).toFixed(4));
      }
      set('--d0', `${dirs[0].toFixed(3)}deg`);
      for (let j = 1; j < k; j++) set(`--cx${j}`, `${(dirs[j] - dirs[j - 1]).toFixed(3)}deg`);
      const root = backOut(clamp01(progress / 0.62));
      set('--tilt', `${(-13 * (1 - root)).toFixed(3)}deg`);
      set('--sway', `${(-8 * (1 - root)).toFixed(3)}deg`);
      const w = sceneWidth.current;
      const shift = w > 0 ? (w * (1 - widthSum / k)) / 2 : 0;
      set('--shift', `${shift.toFixed(1)}px`);
      set('--shadow-scale', (widthSum / k).toFixed(4));
      set('--progress', clamp01(progress).toFixed(4));
    },
    [effFolds],
  );

  useEffect(() => {
    if (reduced) {
      paint(1);
      return;
    }
    if (!inView) return;
    const state = spring.current;
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const root = rootRef.current;
      if (root) {
        const vh = window.innerHeight;
        const rect = root.getBoundingClientRect();
        // In-view trigger (no scroll room needed): opens once the strip is comfortably on screen, or fully
        // visible wherever the page ends; folds back only after it has left the screen.
        const comfortable = rect.bottom > vh * 0.1 && (rect.top < vh * 0.8 || (rect.top >= 0 && rect.bottom <= vh));
        if (!open.current && comfortable) open.current = true;
        else if (open.current && (rect.top > vh * 0.98 || rect.bottom < vh * 0.02)) open.current = false;
        const target = open.current ? 1 : 0;
        if (rect.bottom < -8 || rect.top > vh + 8) {
          state.p = target;
          state.v = 0;
        } else {
          const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
          const h = dt / steps;
          for (let n = 0; n < steps; n++) {
            state.v += (STIFFNESS * (target - state.p) - DAMPING * state.v) * h;
            state.p += state.v * h;
          }
          state.p = Math.min(1.04, Math.max(-0.04, state.p));
        }
        paint(state.p);
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [reduced, inView, paint]);

  const rootStyle = {
    '--fph-paper': paperColor,
    '--fph-ink': textColor,
    '--k': facetCount,
    ...(fit !== null ? { '--fph-size': `${fit}px` } : {}),
  } as CSSProperties;

  const renderFacet = (i: number): ReactNode => (
    <div
      className={i === 0 ? `${styles.facet} ${styles.lead}` : styles.facet}
      style={
        {
          '--e': `var(--e${i}, 0)`,
          '--lit': `var(--lit${i}, ${i % 2 === 0 ? '0.28' : '0'})`,
          '--shd': `var(--shd${i}, ${i % 2 === 0 ? '0' : '0.35'})`,
        } as CSSProperties
      }
    >
      {i === 0 && (
        <span className={styles.sizer} aria-hidden="true">
          {headline}
        </span>
      )}
      <span className={styles.slice} style={{ '--i': i } as CSSProperties}>
        <span className={styles.sliceText}>{headline}</span>
      </span>
      <span className={styles.facetSheen} aria-hidden="true" />
      <span className={styles.facetLit} aria-hidden="true" />
      <span className={styles.facetShade} aria-hidden="true" />
      <span className={styles.facetGrain} aria-hidden="true" />
      {i > 0 && <span className={styles.creaseLine} aria-hidden="true" />}
      {i > 0 && <span className={styles.edgeFace} aria-hidden="true" />}
      {i === 0 && <span className={styles.cutStart} aria-hidden="true" />}
      {i === facetCount - 1 && <span className={styles.cutEnd} aria-hidden="true" />}
    </div>
  );

  let chain: ReactNode = null;
  for (let j = effFolds; j >= 1; j--) {
    const folded = j % 2 === 1 ? FOLD_DEG * 2 : -FOLD_DEG * 2;
    chain = (
      <div
        key={j}
        className={styles.crease}
        style={{ transform: `translateX(100%) rotateY(var(--cx${j}, ${folded}deg))` } as CSSProperties}
      >
        {renderFacet(j)}
        {chain}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <h2 id={headingId} className={styles.heading}>
        {headline}
      </h2>
      <span className={styles.grain} aria-hidden="true" />
      <div className={styles.scene} ref={sceneRef} aria-hidden="true">
        <span className={styles.castShadow} aria-hidden="true" />
        <div className={styles.strip} ref={stripRef}>
          <div className={styles.rig}>
            {renderFacet(0)}
            {chain}
          </div>
        </div>
      </div>
      <span ref={probeRef} className={styles.probe} aria-hidden="true">
        {headline}
      </span>
    </div>
  );
}
```

```css
.root {
  --fph-paper: #e2502c;
  --fph-ink: #f6edda;
  --fph-ground: #241811;
  --fph-ground-deep: #140d08;
  --fph-spot: rgba(255, 206, 158, 0.13);
  --fph-shadow-ink: rgba(10, 5, 2, 0.6);
  --fph-font: 'Futura', 'Avenir Next', 'Century Gothic', 'Segoe UI', 'Helvetica Neue', system-ui, sans-serif;
  --fph-size: clamp(36px, 16cqi, 130px);
  --fph-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: clamp(56px, 10cqi, 104px) clamp(64px, 11cqi, 116px);
  padding-inline: clamp(16px, 4cqi, 48px);
  border-radius: 28px;
  background:
    radial-gradient(120% 90% at 22% -12%, var(--fph-spot) 0%, transparent 55%),
    linear-gradient(180deg, var(--fph-ground) 0%, var(--fph-ground-deep) 100%);
  color: var(--fph-ink);
}

.heading {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.grain {
  position: absolute;
  inset: 0;
  z-index: 1;
  background-image: var(--fph-noise);
  opacity: 0.35;
  mix-blend-mode: overlay;
  pointer-events: none;
}

.scene {
  position: relative;
  z-index: 2;
  inline-size: 100%;
  perspective: 1300px;
  perspective-origin: 50% 40%;
}

.castShadow {
  position: absolute;
  inset-inline: 3%;
  inset-block-end: calc(var(--fph-size) * -0.16);
  block-size: calc(var(--fph-size) * 0.42);
  border-radius: 50%;
  background: radial-gradient(closest-side, var(--fph-shadow-ink), transparent 78%);
  filter: blur(calc(var(--fph-size) * 0.1));
  transform: scaleX(var(--shadow-scale, 0.85));
  opacity: calc(0.5 + (1 - var(--progress, 0)) * 0.22);
  pointer-events: none;
}

.strip {
  position: relative;
  /* one facet wide; the creased chain hangs off its right edge and spans the scene when flat */
  inline-size: calc(100% / var(--k, 1));
  transform-style: preserve-3d;
  transform-origin: calc(var(--k, 1) * 50%) 50%;
  transform: translateX(var(--shift, 0px)) rotateY(var(--sway, -8deg)) rotateX(var(--tilt, -13deg));
  will-change: transform;
}

.rig {
  position: relative;
  transform-style: preserve-3d;
  transform-origin: 0 50%;
  transform: rotateY(var(--d0, 0deg));
  will-change: transform;
}

.crease {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: 100%;
  transform-style: preserve-3d;
  transform-origin: 0 50%;
  will-change: transform;
  pointer-events: none;
}

.facet {
  position: absolute;
  inset: 0;
  overflow: clip;
  pointer-events: none;
  background:
    radial-gradient(150% 130% at 14% 6%, rgba(255, 255, 255, 0.16) 0%, transparent 42%),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--fph-paper) 96%, #fff) 0%,
      var(--fph-paper) 46%,
      color-mix(in srgb, var(--fph-paper) 90%, #000) 100%
    );
}

.lead {
  position: relative;
  box-sizing: border-box;
  padding-block: calc(var(--fph-size) * 0.22) calc(var(--fph-size) * 0.26);
}

.slice {
  position: absolute;
  inset-block: 0;
  inset-inline-start: calc(var(--i) * -100%);
  inline-size: calc(var(--k) * 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.sizer,
.sliceText {
  font-family: var(--fph-font);
  font-size: var(--fph-size);
  font-weight: 700;
  line-height: 1.04;
  letter-spacing: -0.015em;
  text-transform: uppercase;
  text-align: center;
  color: var(--fph-ink);
  overflow-wrap: anywhere;
  text-wrap: balance;
  text-shadow: 0 0.015em 0 rgba(46, 14, 6, 0.28);
  pointer-events: none;
}

/* invisible twin of the headline: gives the strip the headline's real height so long text wraps, never clips */
.sizer {
  display: block;
  inline-size: calc(var(--k, 1) * 100%);
  visibility: hidden;
}

.facetSheen {
  position: absolute;
  inset: 0;
  background: linear-gradient(104deg, rgba(255, 243, 222, 0.42) 0%, rgba(255, 243, 222, 0.1) 24%, rgba(255, 243, 222, 0) 38%);
  mix-blend-mode: soft-light;
  pointer-events: none;
}

.facetLit {
  position: absolute;
  inset: 0;
  background: linear-gradient(96deg, rgba(255, 245, 226, 0.95) 0%, rgba(255, 245, 226, 0.3) 30%, rgba(255, 245, 226, 0) 52%);
  mix-blend-mode: soft-light;
  opacity: var(--lit, 0.28);
  pointer-events: none;
}

.facetShade {
  position: absolute;
  inset: 0;
  background: linear-gradient(92deg, rgba(41, 13, 6, 0) 42%, rgba(41, 13, 6, 0.42) 72%, rgba(41, 13, 6, 0.8) 100%);
  mix-blend-mode: multiply;
  opacity: var(--shd, 0);
  pointer-events: none;
}

.facetGrain {
  position: absolute;
  inset: 0;
  background-image: var(--fph-noise);
  opacity: 0.24;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.creaseLine {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: 2px;
  background: linear-gradient(90deg, rgba(34, 11, 6, 0.6), rgba(34, 11, 6, 0.12));
  opacity: calc(0.32 + (1 - var(--e, 0)) * 0.42);
  pointer-events: none;
}

.edgeFace {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: 7px;
  background: linear-gradient(
    90deg,
    rgba(24, 8, 4, 0.85) 0 34%,
    rgba(255, 236, 208, 0.4) 48% 56%,
    rgba(24, 8, 4, 0.3) 68%,
    rgba(24, 8, 4, 0) 100%
  );
  opacity: calc((1 - var(--e, 0)) * 0.85);
  pointer-events: none;
}

.cutStart {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: 3px;
  background: linear-gradient(90deg, rgba(30, 10, 5, 0.5), rgba(255, 240, 214, 0.28) 70%, rgba(30, 10, 5, 0.05) 100%);
  pointer-events: none;
}

.cutEnd {
  position: absolute;
  inset-block: 0;
  inset-inline-end: 0;
  inline-size: 3px;
  background: linear-gradient(270deg, rgba(30, 10, 5, 0.5), rgba(255, 240, 214, 0.28) 70%, rgba(30, 10, 5, 0.05) 100%);
  pointer-events: none;
}

.probe {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  visibility: hidden;
  white-space: nowrap;
  pointer-events: none;
  font-family: var(--fph-font);
  font-size: 100px;
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1;
  text-transform: uppercase;
}

@container (min-width: 720px) {
  .root {
    border-radius: 32px;
  }
}
```
