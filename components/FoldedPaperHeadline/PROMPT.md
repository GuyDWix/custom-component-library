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
const MIN_FONT = 22;
const REST_LIT = 0.2;
const REST_SHADE = 0.27;

// Unfold choreography, four overlapping beats on separate springs (seconds):
//   1. anticipation: the strip lifts off the floor and squeezes a touch tighter before anything opens
//   2. cascade: facets let go crease by crease, each an underdamped spring so it overshoots and flutters as it lands
//   3. root settle: the whole strip's tilt and sway ease out a little behind the cascade
//   4. shadow: the cast shadow trails the last facet and settles after it
const ANTIC = 0.4;
const SQUEEZE = 0.2;
const FACET_K = 105;
const FACET_C = 11.5;
const ROOT_K = 60;
const ROOT_C = 10.5;
const LIFT_K = 230;
const LIFT_C = 15;
const SHADOW_K = 70;
const SHADOW_C = 9;
const FLUTTER = 1.9;
const FLUTTER_MAX = 2.8;
// a strip must have been open this long before it can fold back (stops thrash on jittery scrolling)
const MIN_DWELL = 0.7;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Spring = { p: number; v: number };
type Sim = { t: number; open: boolean; facets: Spring[]; root: Spring; lift: Spring; shadow: Spring };

const makeSim = (k: number, open: boolean): Sim => {
  const at = (p: number): Spring => ({ p, v: 0 });
  const v = open ? 1 : 0;
  return { t: open ? Number.POSITIVE_INFINITY : 0, open, facets: Array.from({ length: k }, () => at(v)), root: at(v), lift: at(0), shadow: at(v) };
};

const stepSpring = (s: Spring, target: number, k: number, c: number, h: number) => {
  s.v += (k * (target - s.p) - c * s.v) * h;
  s.p += s.v * h;
};

const stagger = (k: number) => Math.min(0.14, 0.9 / Math.max(1, k - 1));
const facetStart = (i: number, k: number) => ANTIC * 0.8 + i * stagger(k);
const choreoEnd = (k: number) => facetStart(k - 1, k) + 1.9;

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
  const sim = useRef<Sim | null>(null);
  const sceneWidth = useRef(0);

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
        // the strip is the hero: wide frames set the headline big on one line; narrow frames stack it on two lines at a big size
        const narrowFrame = w < 520;
        const desired = narrowFrame ? Math.max(40, w * 0.29) : Math.min(210, Math.max(36, w * 0.145));
        // one line when it fits at a decent size, otherwise 2 or 3 balanced lines (the strip grows to match) before shrinking further
        const sizeFor = (lines: number) => Math.min(desired, (100 * avail * lines) / (pw * (1 + 0.06 * lines)));
        const size = [1, 2, 3].map(sizeFor).find((v, i) => v >= desired * (i === 0 ? (narrowFrame ? 0.75 : 0.55) : 0.5)) ?? sizeFor(3);
        setFit(Math.max(MIN_FONT, size));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scene);
    return () => ro.disconnect();
  }, [headline]);

  const paint = useCallback(
    (sm: Sim) => {
      const scene = sceneRef.current;
      if (!scene) return;
      const set = (name: string, value: string) => scene.style.setProperty(name, value);
      const rad = Math.PI / 180;
      const k = effFolds + 1;
      const lift = sm.lift.p;
      const squeeze = 1 + SQUEEZE * clamp(lift, 0, 1);
      const dirs: number[] = [];
      let widthSum = 0;
      for (let i = 0; i < k; i++) {
        const f = sm.facets[i] ?? { p: 1, v: 0 };
        const eased = f.p;
        const dir = (i % 2 === 0 ? -1 : 1) * FOLD_DEG * (1 - eased) * squeeze;
        dirs.push(dir);
        widthSum += Math.cos(dir * rad);
        set(`--e${i}`, clamp01(eased).toFixed(4));
        const dot = -0.48 * Math.sin(dir * rad) + 0.8 * Math.cos(dir * rad);
        // fold shading, plus a memory of the folds that stays once the strip is flat (even facets catch the light, odd ones fall off)
        const lit = clamp01((dot - 0.8) / 0.16) * 0.34 + (i % 2 === 0 ? REST_LIT : 0);
        const shd = clamp01((0.8 - dot) / 0.45) * 0.42 + (i % 2 === 1 ? REST_SHADE : 0);
        set(`--lit${i}`, lit.toFixed(4));
        set(`--shd${i}`, shd.toFixed(4));
        // paper flutter: a facet rocks about its hinge in proportion to how fast it is swinging, then stills as it lands
        const flap = clamp(f.v * FLUTTER, -FLUTTER_MAX, FLUTTER_MAX) * (i % 2 === 0 ? 1 : -1);
        set(`--fx${i}`, `${flap.toFixed(3)}deg`);
      }
      set('--d0', `${dirs[0].toFixed(3)}deg`);
      for (let j = 1; j < k; j++) set(`--cx${j}`, `${(dirs[j] - dirs[j - 1]).toFixed(3)}deg`);
      const root = sm.root.p;
      set('--tilt', `${(-13 * (1 - root) - 3 * clamp(lift, 0, 1)).toFixed(3)}deg`);
      set('--sway', `${(-8 * (1 - root)).toFixed(3)}deg`);
      set('--lift', clamp(lift, -0.2, 1.1).toFixed(4));
      const w = sceneWidth.current;
      const shift = w > 0 ? (w * (1 - widthSum / k)) / 2 : 0;
      set('--shift', `${shift.toFixed(1)}px`);
      const sh = sm.shadow.p;
      // the shadow follows the last facet: it starts tight and pale under the lifted strip, then spreads and darkens as the strip lands
      set('--shadow-scale', ((widthSum / k) * (0.86 + 0.14 * sh)).toFixed(4));
      set('--shadow-t', (1 - sh).toFixed(4));
      set('--shadow-sy', clamp(1 - 0.28 * lift + 0.1 * (1 - sh), 0.5, 1.3).toFixed(4));
      set('--shadow-o', clamp01(0.62 + 0.28 * sh - 0.3 * clamp(lift, 0, 1)).toFixed(4));
      set('--progress', clamp01(sm.facets[k - 1]?.p ?? 1).toFixed(4));
    },
    [effFolds],
  );

  useEffect(() => {
    const k = effFolds + 1;
    if (reduced) {
      // flat open strip, no motion and no replay
      paint(makeSim(k, true));
      return;
    }
    // keep a finished-open strip open across a re-run (e.g. the fold count changing at a breakpoint); anything mid-unfold starts over
    const prev = sim.current;
    const wasOpen = !!prev && prev.open && prev.t >= choreoEnd(prev.facets.length);
    const state = (sim.current = makeSim(k, wasOpen));
    if (!inView) {
      // far enough off screen that nothing is visible: fold back silently so it unfolds again on the next visit
      sim.current = makeSim(k, false);
      paint(sim.current);
      return;
    }
    paint(state);
    let last = performance.now();
    let openedAt = 0;
    let id = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const root = rootRef.current;
      const sm = sim.current;
      if (root && sm) {
        const vh = window.innerHeight;
        const rect = root.getBoundingClientRect();
        const offscreen = rect.bottom < 0 || rect.top > vh;
        // In-view trigger (no scroll room needed): opens once the strip is comfortably on screen, or fully
        // visible wherever the page ends.
        const comfortable = rect.bottom > vh * 0.1 && (rect.top < vh * 0.8 || (rect.top >= 0 && rect.bottom <= vh));
        const flying = sm.t < choreoEnd(k);
        if (!sm.open && comfortable) {
          sm.open = true;
          sm.t = 0;
          openedAt = now;
        } else if (sm.open && offscreen && !flying && (now - openedAt) / 1000 > MIN_DWELL) {
          // replay: re-fold only when fully out of view, never mid-unfold; it happens unseen, so no animation is needed
          const fresh = makeSim(k, false);
          fresh.open = false;
          sim.current = fresh;
          paint(fresh);
          id = requestAnimationFrame(loop);
          return;
        }
        if (sm.open && flying && !offscreen) {
          sm.t += dt;
          const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
          const h = dt / steps;
          for (let n = 0; n < steps; n++) {
            for (let i = 0; i < k; i++) stepSpring(sm.facets[i], sm.t >= facetStart(i, k) ? 1 : 0, FACET_K, FACET_C, h);
            stepSpring(sm.root, sm.t >= ANTIC * 0.55 ? 1 : 0, ROOT_K, ROOT_C, h);
            stepSpring(sm.lift, sm.t < ANTIC ? 1 : 0, LIFT_K, LIFT_C, h);
            stepSpring(sm.shadow, sm.t >= facetStart(k - 1, k) + 0.12 ? 1 : 0, SHADOW_K, SHADOW_C, h);
          }
          paint(sm);
        } else if (sm.open && flying && offscreen) {
          // unfold interrupted by scrolling away: finish it unseen so the strip is flat when it returns
          sim.current = makeSim(k, true);
          paint(sim.current);
        } else if (sm.open && sm.t >= choreoEnd(k)) {
          // settle exactly flat once the springs have finished
          const flat = sm.facets.every((f) => Math.abs(f.p - 1) < 0.002 && Math.abs(f.v) < 0.02);
          if (!flat) {
            sm.facets.forEach((f) => ((f.p = 1), (f.v = 0)));
            sm.root.p = 1;
            sm.shadow.p = 1;
            sm.lift.p = 0;
            paint(sm);
          }
        }
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [reduced, inView, paint, effFolds]);

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
          '--fx': `var(--fx${i}, 0deg)`,
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
      {i > 0 && <span className={i % 2 === 1 ? `${styles.creaseLine} ${styles.valley}` : `${styles.creaseLine} ${styles.mountain}`} aria-hidden="true" />}
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
      <div className={styles.scene} ref={sceneRef} aria-hidden="true">
        <span className={styles.floor} aria-hidden="true" />
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
  --fph-ground: #1d130d;
  --fph-ground-deep: #0e0805;
  --fph-shadow-ink: rgba(6, 3, 1, 0.78);
  --fph-font: 'Futura', 'Avenir Next', 'Century Gothic', 'Segoe UI', 'Helvetica Neue', system-ui, sans-serif;
  --fph-size: clamp(36px, 14.5cqi, 210px);
  --fph-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  /* the strip is the whole composition: wall above it, a floor line below it, nothing else */
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-block: calc(var(--fph-size) * 0.34) calc(var(--fph-size) * 0.52);
  padding-inline: 0;
  /* one raking light from the upper left: it washes the wall and the floor, and rakes across the creases */
  background:
    radial-gradient(70% 62% at 6% 46%, rgba(255, 196, 140, 0.22) 0%, rgba(255, 196, 140, 0.07) 50%, transparent 100%),
    linear-gradient(180deg, var(--fph-ground-deep) 0%, var(--fph-ground) 100%);
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

.scene {
  position: relative;
  z-index: 2;
  inline-size: 100%;
  perspective: 1500px;
  perspective-origin: 50% 40%;
}

/* floor: a lit ground plane starting a little below the strip, with one crisp edge catching the light */
.floor {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 100%;
  block-size: 200vh;
  background:
    radial-gradient(60% 60% at 10% 0%, rgba(255, 190, 130, 0.2) 0%, transparent 100%),
    linear-gradient(180deg, rgba(255, 214, 170, 0.1) 0%, rgba(255, 214, 170, 0.03) 22%, rgba(0, 0, 0, 0.3) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 228, 196, 0.3);
  pointer-events: none;
}

/* soft cast shadow, thrown right and down by the raking light, lying on the floor */
.castShadow {
  position: absolute;
  inset-inline: 2%;
  inset-block-end: calc(var(--fph-size) * -0.3);
  block-size: calc(var(--fph-size) * 0.36);
  border-radius: 50%;
  background: radial-gradient(closest-side, var(--fph-shadow-ink), transparent 82%);
  filter: blur(calc(var(--fph-size) * 0.07));
  /* travels with the last facet: it starts tucked under the folded stack and slides out to its resting throw as the strip lands */
  transform: translateX(calc(var(--fph-size) * (0.16 - var(--shadow-t, 0) * 0.12))) scale(var(--shadow-scale, 0.85), var(--shadow-sy, 1));
  opacity: var(--shadow-o, 0.9);
  pointer-events: none;
}

.strip {
  position: relative;
  /* one facet wide; the creased chain hangs off its right edge and spans the scene when flat */
  inline-size: calc(100% / var(--k, 1));
  transform-style: preserve-3d;
  transform-origin: calc(var(--k, 1) * 50%) 50%;
  transform: translateX(var(--shift, 0px)) translateY(calc(var(--lift, 0) * var(--fph-size) * -0.12)) rotateY(var(--sway, -8deg)) rotateX(var(--tilt, -13deg));
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
  transform-origin: 0 50%;
  transform: rotateX(var(--fx, 0deg));
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
  padding-block: calc(var(--fph-size) * 0.58);
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
  box-sizing: border-box;
  padding-inline: 4cqi;
  color: var(--fph-ink);
  overflow-wrap: anywhere;
  text-wrap: balance;
  text-shadow: 0 0.02em 0 rgba(46, 14, 6, 0.34);
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

/* crease memory: a dark hairline with a light hairline beside it; valley and mountain folds flip which side is lit */
.creaseLine {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: 2px;
  pointer-events: none;
}

.valley {
  background: linear-gradient(90deg, rgba(30, 9, 4, 0.8) 0 1px, rgba(255, 238, 212, 0.5) 1px 2px);
  opacity: calc(0.75 + (1 - var(--e, 0)) * 0.25);
}

.mountain {
  background: linear-gradient(90deg, rgba(255, 238, 212, 0.55) 0 1px, rgba(30, 9, 4, 0.7) 1px 2px);
  opacity: calc(0.75 + (1 - var(--e, 0)) * 0.25);
}

/* paper thickness caught edge-on while the fold is open */
.edgeFace {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: calc(var(--fph-size) * 0.06);
  background: linear-gradient(
    90deg,
    rgba(24, 8, 4, 0.85) 0 34%,
    rgba(255, 236, 208, 0.6) 48% 58%,
    rgba(24, 8, 4, 0.3) 70%,
    rgba(24, 8, 4, 0) 100%
  );
  opacity: calc((1 - var(--e, 0)) * 0.95);
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

```
