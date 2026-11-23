Create a custom element called "Foil Stamp Statement". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: statement text, detail line, foil finish (gold, silver, or rose), background color, sheen strength. Add other settings if they help.

```tsx
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
```

```css
@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-display: swap;
  font-weight: 500;
  src: url('./fonts/cormorant-garamond-latin-500-normal.woff2') format('woff2');
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-display: swap;
  font-weight: 600;
  src: url('./fonts/cormorant-garamond-latin-600-normal.woff2') format('woff2');
}

.root {
  --fs-hot: #fdf3cf;
  --fs-bright: #f4df9e;
  --fs-mid: #dfb96b;
  --fs-low: #a5762a;
  --fs-edge: #5c3f10;
  --fs-wash: #ecdcae;
  --fs-card: #0d3625;
  --fs-strength: 0.75;
  --fs-font-display: 'Cormorant Garamond', 'Didot', 'Bodoni MT', Georgia, 'Times New Roman', serif;
  --fs-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  display: grid;
  align-content: center;
  justify-items: start;
  gap: clamp(24px, 4.4cqi, 40px);
  min-block-size: clamp(360px, 54cqi, 580px);
  padding: clamp(52px, 10cqi, 104px);
  border-radius: 26px;
  color: var(--fs-wash);
  font-family: var(--fs-font-display);
  background:
    radial-gradient(120% 95% at 20% -14%, color-mix(in srgb, var(--fs-card) 52%, #f6ecd4) 0%, transparent 54%),
    radial-gradient(85% 80% at 88% 6%, color-mix(in srgb, var(--fs-card) 70%, #ffffff) 0%, transparent 44%),
    radial-gradient(150% 125% at 50% 118%, rgba(1, 9, 4, 0.62) 0%, transparent 56%),
    var(--fs-card);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--fs-wash) 9%, transparent),
    inset 0 0 110px rgba(1, 13, 8, 0.5),
    0 34px 64px -32px rgba(4, 20, 12, 0.55);
  touch-action: pan-y;
  -webkit-tap-highlight-color: transparent;
}

.grainCard {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image: var(--fs-noise);
  background-size: 140px 140px;
  mix-blend-mode: overlay;
  opacity: 0.2;
  pointer-events: none;
}

.frame {
  position: absolute;
  inset: clamp(16px, 3cqi, 30px);
  z-index: 1;
  border: 1px solid color-mix(in srgb, var(--fs-hot) 34%, transparent);
  border-radius: 14px;
  pointer-events: none;
}

.frameInner {
  position: absolute;
  inset: calc(clamp(16px, 3cqi, 30px) + 7px);
  z-index: 1;
  border: 1px solid color-mix(in srgb, var(--fs-hot) 13%, transparent);
  border-radius: 9px;
  pointer-events: none;
}

.stamp {
  --sx: 50%;
  --sv: 0;
  --gi: 0.55;
  --gx: 50%;
  --gy: 42%;

  position: relative;
  z-index: 2;
  display: grid;
  inline-size: 100%;
  outline: none;
}

.stampText {
  grid-area: 1 / 1;
  margin: 0;
  font-family: var(--fs-font-display);
  font-size: clamp(42px, 10.5cqi, 124px);
  font-weight: 600;
  line-height: 1.02;
  letter-spacing: 0.005em;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.stampText::selection {
  background: var(--fs-hot);
  color: var(--fs-card);
}

.stamp:focus-visible {
  outline: 1.5px solid color-mix(in srgb, var(--fs-hot) 65%, transparent);
  outline-offset: clamp(10px, 2cqi, 18px);
}

.shadow {
  color: color-mix(in srgb, #02120a 62%, transparent);
  transform: translateY(0.045em);
  filter: blur(0.05em);
}

.rim {
  color: color-mix(in srgb, var(--fs-hot) 30%, transparent);
  transform: translateY(-0.028em);
  filter: blur(0.035em);
  mix-blend-mode: screen;
}

.metal {
  background-image: linear-gradient(
    176deg,
    var(--fs-edge) 0%,
    var(--fs-low) 13%,
    var(--fs-mid) 30%,
    var(--fs-bright) 42%,
    var(--fs-hot) 50%,
    var(--fs-bright) 58%,
    var(--fs-mid) 70%,
    var(--fs-low) 87%,
    var(--fs-edge) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke: 1px color-mix(in srgb, var(--fs-edge) 70%, transparent);
}

.relight {
  background-image: radial-gradient(
    52% 60% at var(--gx) var(--gy),
    color-mix(in srgb, var(--fs-hot) 88%, transparent) 0%,
    transparent 72%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  mix-blend-mode: screen;
  opacity: calc(0.12 + var(--gi) * 0.55);
}

.sheen {
  background-image:
    linear-gradient(
      calc(94deg - var(--sv) * 20deg),
      transparent 39%,
      color-mix(in srgb, var(--fs-hot) 70%, transparent) 46.5%,
      #fffcf2 50%,
      color-mix(in srgb, var(--fs-hot) 70%, transparent) 53.5%,
      transparent 61%
    ),
    linear-gradient(
      calc(94deg - var(--sv) * 14deg),
      transparent 34%,
      color-mix(in srgb, var(--fs-bright) 42%, transparent) 46%,
      transparent 60%
    );
  background-size: 260% 100%, 340% 100%;
  background-position: var(--sx) 0, calc(var(--sx) - 9%) 0;
  background-repeat: no-repeat;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  mix-blend-mode: screen;
  opacity: calc((0.3 + var(--gi) * 0.7) * var(--fs-strength));
}

.flake {
  background-image: var(--fs-noise);
  background-size: 120px 120px;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  mix-blend-mode: overlay;
  opacity: 0.45;
}

.foot {
  position: relative;
  z-index: 2;
  display: grid;
  gap: clamp(12px, 2.2cqi, 18px);
  justify-items: start;
}

.rule {
  inline-size: clamp(72px, 16cqi, 240px);
  block-size: 1px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--fs-hot) 85%, transparent) 0%,
    color-mix(in srgb, var(--fs-hot) 22%, transparent) 78%,
    transparent 100%
  );
}

.detail {
  margin: 0;
  max-inline-size: 56ch;
  font-family: var(--fs-font-display);
  font-size: clamp(13px, 1.7cqi, 16px);
  font-weight: 500;
  line-height: 1.75;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--fs-wash) 82%, var(--fs-card));
  overflow-wrap: anywhere;
}

.pause {
  position: absolute;
  inset-block-end: calc(clamp(16px, 3cqi, 30px) + 12px);
  inset-inline-end: calc(clamp(16px, 3cqi, 30px) + 12px);
  z-index: 3;
  display: grid;
  place-items: center;
  inline-size: 44px;
  aspect-ratio: 1;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--fs-hot) 30%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, var(--fs-card) 55%, transparent);
  color: color-mix(in srgb, var(--fs-wash) 85%, transparent);
  opacity: 0.4;
  cursor: pointer;
  transition:
    opacity 200ms ease,
    border-color 200ms ease;
}

.pause:hover {
  opacity: 1;
  border-color: color-mix(in srgb, var(--fs-hot) 60%, transparent);
}

.pause:focus-visible {
  opacity: 1;
  outline: 2px solid color-mix(in srgb, var(--fs-hot) 70%, transparent);
  outline-offset: 3px;
}
```
