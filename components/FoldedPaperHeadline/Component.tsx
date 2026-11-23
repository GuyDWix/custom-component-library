import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import styles from './Component.module.css';

export interface FoldedPaperHeadlineProps {
  headline?: string;
  paperColor?: string;
  textColor?: string;
  foldCount?: number;
  isFolded?: boolean;
  foldTrigger?: 'click' | 'hover' | 'none';
  onValueChange?: (isFolded: boolean) => void;
  className?: string;
}

const FOLD_DEG = 52;
const MIN_FONT = 22;
const REST_LIT = 0.2;
const REST_SHADE = 0.27;
// each facet opens over this share of the scroll travel, staggered crease by crease
const FACET_SPAN = 0.55;
const SMOOTH_K = 120;
const SMOOTH_C = 22;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const ease = (t: number) => t * t * (3 - 2 * t);

export default function FoldedPaperHeadline({
  headline = 'Folded Light',
  paperColor = '#b32914',
  textColor = '#f0e5cf',
  foldCount = 5,
  isFolded = true,
  foldTrigger = 'click',
  onValueChange,
  className,
}: FoldedPaperHeadlineProps) {
  const uid = useId();
  const headingId = `${uid}-heading`;

  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [narrow, setNarrow] = useState(false);
  const [fit, setFit] = useState<number | null>(null);
  const [folded, setFolded] = useState(isFolded);

  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const sceneWidth = useRef(0);
  const motion = useRef({ p: isFolded ? 0 : 1, v: 0 });

  const folds = Math.max(1, Math.min(9, Math.round(foldCount)));
  const effFolds = narrow ? Math.min(folds, 2) : folds;
  const facetCount = effFolds + 1;

  useEffect(() => setFolded(isFolded), [isFolded]);

  const changeFolded = (next: boolean) => {
    if (next === folded) return;
    setFolded(next);
    onValueChange?.(next);
  };

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
    (progress: number) => {
      const scene = sceneRef.current;
      if (!scene) return;
      const set = (name: string, value: string) => scene.style.setProperty(name, value);
      const rad = Math.PI / 180;
      const k = effFolds + 1;
      const dirs: number[] = [];
      let widthSum = 0;
      for (let i = 0; i < k; i++) {
        const start = (i / Math.max(1, k - 1)) * FACET_SPAN;
        const eased = ease(clamp01((progress - start) / (1 - FACET_SPAN)));
        const dir = (i % 2 === 0 ? -1 : 1) * FOLD_DEG * (1 - eased);
        dirs.push(dir);
        widthSum += Math.cos(dir * rad);
        set(`--e${i}`, eased.toFixed(4));
        const dot = -0.48 * Math.sin(dir * rad) + 0.8 * Math.cos(dir * rad);
        // flat tone per facet: folded facets pick up a light or dark plane, and a faint memory of it stays when flat
        const lit = clamp01((dot - 0.8) / 0.16) * 0.34 + (i % 2 === 0 ? REST_LIT : 0);
        const shd = clamp01((0.8 - dot) / 0.45) * 0.5 + (i % 2 === 1 ? REST_SHADE : 0);
        set(`--lit${i}`, lit.toFixed(4));
        set(`--shd${i}`, shd.toFixed(4));
      }
      set('--d0', `${dirs[0].toFixed(3)}deg`);
      for (let j = 1; j < k; j++) set(`--cx${j}`, `${(dirs[j] - dirs[j - 1]).toFixed(3)}deg`);
      set('--tilt', `${(-12 * (1 - progress)).toFixed(3)}deg`);
      set('--sway', `${(-8 * (1 - progress)).toFixed(3)}deg`);
      const w = sceneWidth.current;
      set('--shift', `${(w > 0 ? (w * (1 - widthSum / k)) / 2 : 0).toFixed(1)}px`);
      set('--shadow-scale', (widthSum / k).toFixed(4));
      set('--shadow-t', (1 - progress).toFixed(4));
      set('--shadow-o', (0.5 + 0.4 * progress).toFixed(4));
      set('--progress', progress.toFixed(4));
    },
    [effFolds],
  );

  useEffect(() => {
    const m = motion.current;
    if (reduced) {
      // flat open strip, no motion
      m.p = 1;
      m.v = 0;
      paint(1);
      return;
    }
    const goal = folded ? 0 : 1;
    if (!inView) {
      m.p = goal;
      m.v = 0;
      paint(goal);
      return;
    }
    paint(m.p);
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let n = 0; n < steps; n++) {
        m.v += (SMOOTH_K * (goal - m.p) - SMOOTH_C * m.v) * h;
        m.p += m.v * h;
      }
      m.p = clamp01(m.p);
      const settled = Math.abs(goal - m.p) < 0.0005 && Math.abs(m.v) < 0.002;
      if (settled) {
        m.p = goal;
        m.v = 0;
      }
      paint(m.p);
      if (!settled) id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [reduced, inView, folded, paint]);

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
      {foldTrigger !== 'none' && !reduced && (
        <button
          type="button"
          className={styles.trigger}
          aria-label={headline}
          aria-expanded={!folded}
          onClick={foldTrigger === 'click' ? () => changeFolded(!folded) : undefined}
          onPointerEnter={foldTrigger === 'hover' ? () => changeFolded(false) : undefined}
          onPointerLeave={foldTrigger === 'hover' ? () => changeFolded(true) : undefined}
          onFocus={foldTrigger === 'hover' ? () => changeFolded(false) : undefined}
          onBlur={foldTrigger === 'hover' ? () => changeFolded(true) : undefined}
        />
      )}
      <span ref={probeRef} className={styles.probe} aria-hidden="true">
        {headline}
      </span>
    </div>
  );
}
