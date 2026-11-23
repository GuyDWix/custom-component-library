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
