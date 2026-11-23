import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface StitchedCompareProps {
  beforeImage?: string;
  beforeAlt?: string;
  beforeLabel?: string;
  afterImage?: string;
  afterAlt?: string;
  afterLabel?: string;
  threadColor?: string;
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
  threadColor = '#9b2d2b',
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

  const rootStyle = { '--sc-thread': threadColor } as CSSProperties;

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
    <div ref={rootRef} className={cx(styles.root, className)} style={rootStyle}>
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
