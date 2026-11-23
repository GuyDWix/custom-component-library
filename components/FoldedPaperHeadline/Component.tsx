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
  paperColor = '#e8432a',
  textColor = '#f0e5cf',
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
        const desired = narrowFrame ? Math.max(40, w * 0.4) : Math.min(320, Math.max(36, w * 0.22));
        // one line when it fits at a decent size, otherwise 2 or 3 balanced lines (the strip grows to match) before shrinking further
        const sizeFor = (lines: number) => Math.min(desired, (100 * avail * lines) / (pw * (1 + 0.04 * lines)));
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
      <span className={styles.index} aria-hidden="true">
        {String(i + 1).padStart(2, '0')}
      </span>
      <span className={styles.facetLit} aria-hidden="true" />
      <span className={styles.facetShade} aria-hidden="true" />
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
