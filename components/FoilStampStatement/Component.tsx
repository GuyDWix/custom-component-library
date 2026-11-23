import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export type FoilFinish = 'gold' | 'silver' | 'rose';

export interface FoilStampStatementProps {
  statement?: string;
  detail?: string;
  foilFinish?: FoilFinish;
  backgroundColor?: string;
  sheenStrength?: number;
  className?: string;
}

const FINISHES: Record<FoilFinish, Record<string, string>> = {
  gold: {
    hot: '#fdf3cf',
    bright: '#f4df9e',
    mid: '#dfb96b',
    low: '#a5762a',
    edge: '#5c3f10',
    wash: '#ecdcae',
  },
  silver: {
    hot: '#f7f9fb',
    bright: '#dde3ea',
    mid: '#b7c0cb',
    low: '#7e8a97',
    edge: '#454f5b',
    wash: '#d5dbe2',
  },
  rose: {
    hot: '#fde8da',
    bright: '#f2cab5',
    mid: '#dfa184',
    low: '#a86a45',
    edge: '#66341f',
    wash: '#eec5ae',
  },
};

type Mode = 'idle' | 'pointer' | 'key';

const STIFFNESS = 64;
const DAMPING = 11;
const KEY_STEP = 0.14;
const KEY_HOLD_MS = 1500;
const SWEEP_SECONDS = 8.6;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const STAMP_HELP =
  'Move your pointer across the foil to sweep its sheen, or drag on touch. Arrow keys move the sheen; Escape lets it settle.';

export default function FoilStampStatement({
  statement = 'Amelia & Theodore',
  detail = 'Twelfth of September, two thousand twenty-seven · Villa Varenna',
  foilFinish = 'gold',
  backgroundColor,
  sheenStrength = 0.75,
  className,
}: FoilStampStatementProps) {
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [idleOn, setIdleOn] = useState(true);

  const uid = useId();
  const titleId = `${uid}-statement`;

  const rootRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const motion = useRef({ x: 0.5, vx: 0, gi: 0.55 });
  const target = useRef({ mode: 'idle' as Mode, x: 0.5, px: 0.5, py: 0.4, rest: 0.5, idleSince: 0 });
  const keyTimer = useRef(0);
  const idleRef = useRef(idleOn);

  idleRef.current = idleOn;

  const release = useCallback(() => {
    target.current.mode = 'idle';
    target.current.rest = motion.current.x;
    target.current.idleSince = performance.now();
  }, []);

  const paint = useCallback(() => {
    const stamp = stampRef.current;
    if (!stamp) return;
    const m = motion.current;
    const t = target.current;
    const set = (k: string, v: string) => stamp.style.setProperty(k, v);
    set('--sx', `${(clamp(m.x, -0.25, 1.25) * 100).toFixed(2)}%`);
    set('--sv', clamp(m.vx, -3, 3).toFixed(3));
    set('--gi', m.gi.toFixed(3));
    set('--gx', `${(clamp(t.px, -0.2, 1.2) * 100).toFixed(2)}%`);
    set('--gy', `${(clamp(t.py, -0.2, 1.2) * 100).toFixed(2)}%`);
  }, []);

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
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) {
      const stamp = stampRef.current;
      if (stamp) {
        stamp.style.setProperty('--sx', '50%');
        stamp.style.setProperty('--sv', '0');
        stamp.style.setProperty('--gi', '0.5');
        stamp.style.setProperty('--gx', '50%');
        stamp.style.setProperty('--gy', '42%');
      }
      return;
    }
    if (!inView) return;
    target.current.idleSince = performance.now();
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const t = target.current;
      let tx = t.x;
      if (t.mode === 'idle') {
        if (idleRef.current) {
          const ease = Math.min(1, (now - t.idleSince) / 2600);
          tx = 0.5 + Math.sin((now / 1000) * ((Math.PI * 2) / SWEEP_SECONDS)) * 0.68 * ease;
        } else {
          tx = t.rest;
        }
      }
      const m = motion.current;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let n = 0; n < steps; n++) {
        m.vx += (STIFFNESS * (tx - m.x) - DAMPING * m.vx) * h;
        m.x += m.vx * h;
      }
      const giGoal = t.mode === 'idle' ? (idleRef.current ? 0.8 : 0.4) : 1;
      m.gi += (giGoal - m.gi) * Math.min(1, dt * 3);
      paint();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [reduced, inView, paint]);

  useEffect(() => () => window.clearTimeout(keyTimer.current), []);

  const aim = (e: PointerEvent<HTMLElement>) => {
    const box = stampRef.current?.getBoundingClientRect();
    if (!box) return;
    const px = clamp((e.clientX - box.left) / box.width, -0.1, 1.1);
    const py = clamp((e.clientY - box.top) / box.height, -0.15, 1.15);
    target.current.mode = 'pointer';
    target.current.x = px;
    target.current.px = px;
    target.current.py = py;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    aim(e);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    if (e.pointerType === 'mouse' || e.currentTarget.hasPointerCapture(e.pointerId)) aim(e);
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (e.type === 'pointerleave' && e.pointerType !== 'mouse') return;
    release();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' || e.key === 'Home') {
      release();
      return;
    }
    const moves: Record<string, number> = {
      ArrowLeft: -KEY_STEP,
      ArrowRight: KEY_STEP,
    };
    const move = moves[e.key];
    if (!move || reduced) return;
    e.preventDefault();
    const t = target.current;
    t.x = clamp((t.mode === 'key' ? t.x : motion.current.x) + move, -0.02, 1.02);
    t.mode = 'key';
    window.clearTimeout(keyTimer.current);
    keyTimer.current = window.setTimeout(release, KEY_HOLD_MS);
  };

  const finish = FINISHES[foilFinish] ?? FINISHES.gold;
  const rootStyle = {
    '--fs-hot': finish.hot,
    '--fs-bright': finish.bright,
    '--fs-mid': finish.mid,
    '--fs-low': finish.low,
    '--fs-edge': finish.edge,
    '--fs-wash': finish.wash,
    ...(backgroundColor ? { '--fs-card': backgroundColor } : {}),
    '--fs-strength': clamp(sheenStrength, 0, 1).toFixed(3),
  } as CSSProperties;

  const text = statement ?? '';

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={onPointerEnd}
    >
      <span className={styles.grainCard} aria-hidden="true" />
      <span className={styles.frame} aria-hidden="true" />
      <span className={styles.frameInner} aria-hidden="true" />

      <div
        ref={stampRef}
        className={styles.stamp}
        role="group"
        aria-labelledby={titleId}
        aria-description={STAMP_HELP}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onBlur={release}
      >
        <span className={`${styles.stampText} ${styles.shadow}`} aria-hidden="true">
          {text}
        </span>
        <span className={`${styles.stampText} ${styles.rim}`} aria-hidden="true">
          {text}
        </span>
        <h2 id={titleId} className={`${styles.stampText} ${styles.metal}`}>
          {text}
        </h2>
        <span className={`${styles.stampText} ${styles.relight}`} aria-hidden="true">
          {text}
        </span>
        <span className={`${styles.stampText} ${styles.sheen}`} aria-hidden="true">
          {text}
        </span>
        <span className={`${styles.stampText} ${styles.flake}`} aria-hidden="true">
          {text}
        </span>
      </div>

      {detail && (
        <div className={styles.foot}>
          <span className={styles.rule} aria-hidden="true" />
          <p className={styles.detail}>{detail}</p>
        </div>
      )}

      {!reduced && (
        <button
          type="button"
          className={styles.pause}
          aria-label={idleOn ? 'Pause the sheen sweep' : 'Resume the sheen sweep'}
          onClick={() => setIdleOn((p) => !p)}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            {idleOn ? (
              <path d="M8.5 5.5v13M15.5 5.5v13" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            ) : (
              <path d="M8.6 5.4v13.2a.7.7 0 0 0 1.06.6l9.9-6.6a.7.7 0 0 0 0-1.2l-9.9-6.6a.7.7 0 0 0-1.06.6z" fill="currentColor" />
            )}
          </svg>
        </button>
      )}
    </div>
  );
}
