Create a custom element called "Lenticular Switch". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: image A, image B, image A description, image B description, strip width, idle sway hint on/off. Add other settings if they help.

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface LenticularSwitchProps {
  imageA?: string;
  imageAAlt?: string;
  imageB?: string;
  imageBAlt?: string;
  stripWidth?: number;
  hint?: boolean;
  className?: string;
}

const MIN_STRIPS = 10;
const MAX_STRIPS = 44;
const SPREAD = 4;
const GLOBAL_STIFF = 170;
const GLOBAL_DAMP = 18;
const STRIP_STIFF = 310;
const STRIP_DAMP = 25;
const KEY_STEP = 0.07;
const KEY_HOLD_MS = 1600;
const SWAY_SPEED = 0.48;
const SWAY_EASE_MS = 2600;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const clamp01 = (v: number) => clamp(v, 0, 1);

type Mode = 'idle' | 'pointer' | 'key';

const HELP_ANIMATED =
  'Move across the print, or drag on touch, to flip between the two photos. Arrow keys flip step by step; Home and End jump to a photo; Escape lets it drift again.';
const HELP_REDUCED = 'Press Enter, Space or the arrow keys to switch between the two photos.';

const defaultImageA =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&h=750&fit=crop&auto=format';
const defaultImageB =
  'https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=1200&h=750&fit=crop&auto=format';

export default function LenticularSwitch({
  imageA = defaultImageA,
  imageAAlt = 'Turquoise sea rolling onto a white sand beach',
  imageB = defaultImageB,
  imageBAlt = 'Pink cosmos flowers leaning into the late afternoon light',
  stripWidth = 26,
  hint = true,
  className,
}: LenticularSwitchProps) {
  const sw = clamp(stripWidth, 8, 64);
  const hintOn = hint;

  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [paused, setPaused] = useState(false);
  const [showB, setShowB] = useState(false);
  const [stripCount, setStripCount] = useState(() => clamp(Math.round(720 / sw), MIN_STRIPS, MAX_STRIPS));

  const rootRef = useRef<HTMLDivElement>(null);
  const openingRef = useRef<HTMLDivElement>(null);
  const stripEls = useRef<(HTMLDivElement | null)[]>([]);
  const motion = useRef({
    gt: 0,
    gv: 0,
    p: new Float32Array(0),
    v: new Float32Array(0),
    stiff: new Float32Array(0),
    damp: new Float32Array(0),
  });
  const target = useRef({ mode: 'idle' as Mode, t: 0, idleSince: 0 });
  const keyTimer = useRef(0);

  const release = useCallback(() => {
    target.current.mode = 'idle';
    target.current.idleSince = performance.now();
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
    const opening = openingRef.current;
    if (!opening) return;
    const measure = () => {
      const w = opening.clientWidth;
      if (w > 0) setStripCount(clamp(Math.round(w / sw), MIN_STRIPS, MAX_STRIPS));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(opening);
    return () => ro.disconnect();
  }, [sw]);

  useEffect(() => () => window.clearTimeout(keyTimer.current), []);

  useEffect(() => {
    if (reduced || !inView) return;
    const opening = openingRef.current;
    if (!opening) return;
    const m = motion.current;
    if (m.p.length !== stripCount) {
      m.p = new Float32Array(stripCount);
      m.v = new Float32Array(stripCount);
      m.stiff = new Float32Array(stripCount);
      m.damp = new Float32Array(stripCount);
      for (let i = 0; i < stripCount; i++) {
        m.stiff[i] = STRIP_STIFF + 55 * Math.sin(i * 2.399);
        m.damp[i] = STRIP_DAMP + 2.5 * Math.cos(i * 1.7);
      }
    }
    const swayOn = hintOn && !paused;
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const tgt = target.current;
      let t = tgt.t;
      if (tgt.mode === 'idle') {
        if (swayOn) {
          const ease = Math.min(1, (now - tgt.idleSince) / SWAY_EASE_MS);
          t = (0.5 - 0.5 * Math.cos((now / 1000) * SWAY_SPEED)) * ease;
        } else {
          t = 0;
        }
      }
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      const n = stripCount;
      for (let s = 0; s < steps; s++) {
        m.gv += (GLOBAL_STIFF * (t - m.gt) - GLOBAL_DAMP * m.gv) * h;
        m.gt += m.gv * h;
        for (let i = 0; i < n; i++) {
          const x = n === 1 ? 0 : i / (n - 1);
          const p = clamp01(t * (1 + SPREAD) - SPREAD * x);
          m.v[i] += (m.stiff[i] * (p - m.p[i]) - m.damp[i] * m.v[i]) * h;
          m.p[i] += m.v[i] * h;
        }
      }
      opening.style.setProperty('--ls-rot', `${((m.gt - 0.5) * 10).toFixed(2)}deg`);
      opening.style.setProperty('--ls-gx', m.gt.toFixed(3));
      const els = stripEls.current;
      for (let i = 0; i < n; i++) {
        const el = els[i];
        if (el) el.style.transform = `rotateY(${(m.p[i] * 180).toFixed(2)}deg)`;
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [reduced, inView, stripCount, hintOn, paused]);

  const aim = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    target.current.mode = 'pointer';
    target.current.t = clamp01((e.clientX - rect.left) / rect.width);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced) {
      setShowB((v) => !v);
      return;
    }
    if (e.pointerType !== 'mouse') {
      e.currentTarget.setPointerCapture(e.pointerId);
      aim(e);
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    if (e.pointerType === 'mouse' || e.currentTarget.hasPointerCapture(e.pointerId)) aim(e);
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (e.type === 'pointerleave' && e.pointerType !== 'mouse') return;
    release();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      release();
      return;
    }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      if (reduced) {
        setShowB(e.key === 'End');
        return;
      }
      target.current.mode = 'key';
      target.current.t = e.key === 'End' ? 1 : 0;
      armKeyRelease();
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (reduced) {
        setShowB(e.key === 'ArrowRight');
        return;
      }
      const t = target.current;
      const from = t.mode === 'key' ? t.t : motion.current.gt;
      t.mode = 'key';
      t.t = clamp01(from + (e.key === 'ArrowRight' ? KEY_STEP : -KEY_STEP));
      armKeyRelease();
      return;
    }
    if (reduced && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setShowB((v) => !v);
    }
  };

  const armKeyRelease = () => {
    window.clearTimeout(keyTimer.current);
    keyTimer.current = window.setTimeout(release, KEY_HOLD_MS);
  };

  const rootStyle = {
    '--ls-img-a': imageA ? `url("${imageA}")` : 'none',
    '--ls-img-b': imageB ? `url("${imageB}")` : 'none',
  } as CSSProperties;
  const openingStyle = { '--ls-n': stripCount } as CSSProperties;
  const ariaLabel = `Lenticular print switching between ${imageAAlt} and ${imageBAlt}`;

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <span className={styles.halo} aria-hidden="true" />
      <div className={styles.mat}>
        <span className={styles.registration} aria-hidden="true">
          <span className={styles.chipC} />
          <span className={styles.chipM} />
          <span className={styles.chipY} />
          <span className={styles.chipK} />
        </span>
        <div
          ref={openingRef}
          className={styles.opening}
          style={openingStyle}
          role="img"
          aria-label={ariaLabel}
          aria-description={reduced ? HELP_REDUCED : HELP_ANIMATED}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={release}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={onPointerEnd}
        >
          <span className={styles.backing} aria-hidden="true" />
          {reduced ? (
            <>
              <span className={styles.flatA} aria-hidden="true" />
              <span className={styles.flatB} aria-hidden="true" style={{ opacity: showB ? 1 : 0 }} />
            </>
          ) : (
            <div className={styles.strips} aria-hidden="true">
              {Array.from({ length: stripCount }, (_, i) => (
                <div
                  key={i}
                  className={styles.strip}
                  style={{ '--i': i } as CSSProperties}
                  ref={(el) => {
                    stripEls.current[i] = el;
                  }}
                >
                  <span className={styles.faceA} />
                  <span className={styles.faceB} />
                </div>
              ))}
            </div>
          )}
          <span className={styles.ribs} aria-hidden="true" />
          <span className={styles.glare} aria-hidden="true" />
        </div>
        {hintOn && !reduced && (
          <button
            type="button"
            className={styles.pauseButton}
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Play the drifting motion' : 'Pause the drifting motion'}
            aria-pressed={paused}
          >
            <svg viewBox="0 0 12 12" className={styles.icon} aria-hidden="true">
              {paused ? (
                <path d="M3 1.6v8.8L10.4 6z" />
              ) : (
                <path d="M2.6 1.4h2.6v9.2H2.6zM6.8 1.4h2.6v9.2H6.8z" />
              )}
            </svg>
          </button>
        )}
      </div>
      <span className={styles.grain} aria-hidden="true" />
    </div>
  );
}
```

```css
.root {
  --ls-bg: #edecea;
  --ls-bg-deep: #e2dfd9;
  --ls-mat: #fffefa;
  --ls-backing: #f4f2ec;
  --ls-ink: #1a2027;
  --ls-cyan: #00a5e0;
  --ls-magenta: #e5007d;
  --ls-yellow: #ffcf3f;
  --ls-black: #23292f;
  --ls-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --ls-img-a: none;
  --ls-img-b: none;
  --ls-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  inline-size: 100%;
  display: grid;
  justify-items: center;
  padding: clamp(20px, 6cqi, 72px) clamp(12px, 4cqi, 48px);
  background:
    radial-gradient(120% 90% at 50% 0%, #f7f6f3 0%, transparent 62%),
    linear-gradient(180deg, var(--ls-bg) 0%, var(--ls-bg-deep) 100%);
  color: var(--ls-ink);
  font-family: var(--ls-font-ui);
  container-type: inline-size;
}

.halo {
  position: absolute;
  inset-block-start: 4%;
  inline-size: 74%;
  aspect-ratio: 2 / 1;
  z-index: -1;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.75), transparent);
  filter: blur(30px);
  pointer-events: none;
}

.grain {
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: var(--ls-noise);
  opacity: 0.16;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.mat {
  position: relative;
  inline-size: min(100%, 960px);
  box-sizing: border-box;
  padding: clamp(20px, 6cqi, 56px) clamp(16px, 5cqi, 46px);
  border-radius: 3px;
  background: linear-gradient(180deg, #fffefc 0%, var(--ls-mat) 100%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 1px 2px rgba(26, 32, 39, 0.06),
    0 28px 56px -24px rgba(26, 32, 39, 0.24),
    0 8px 18px -10px rgba(26, 32, 39, 0.14);
}

.registration {
  position: absolute;
  inset-block-start: clamp(8px, 2cqi, 14px);
  inset-inline-end: clamp(10px, 2.5cqi, 16px);
  display: flex;
  gap: 4px;
  opacity: 0.85;
}

.registration span {
  inline-size: clamp(5px, 1.3cqi, 8px);
  aspect-ratio: 1;
  border-radius: 1.5px;
}

.chipC {
  background: var(--ls-cyan);
}

.chipM {
  background: var(--ls-magenta);
}

.chipY {
  background: var(--ls-yellow);
}

.chipK {
  background: var(--ls-black);
}

.opening {
  --ls-n: 24;
  --ls-rot: 0deg;
  --ls-gx: 0.08;

  position: relative;
  aspect-ratio: 16 / 10;
  border-radius: 2px;
  overflow: hidden;
  container-type: inline-size;
  perspective: 1100px;
  background: var(--ls-backing);
  box-shadow: inset 0 0 0 1px rgba(26, 32, 39, 0.1);
  cursor: ew-resize;
  touch-action: pan-y;
  -webkit-tap-highlight-color: transparent;
  outline: none;
}

.opening:focus-visible {
  box-shadow:
    inset 0 0 0 1px rgba(26, 32, 39, 0.1),
    0 0 0 2px var(--ls-mat),
    0 0 0 4px var(--ls-ink);
}

.backing {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--ls-backing);
  box-shadow: inset 0 2px 10px rgba(26, 32, 39, 0.07);
}

.strips {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  transform: rotateY(var(--ls-rot));
  transform-style: preserve-3d;
}

.strip {
  position: relative;
  flex: 1 1 0;
  min-inline-size: 0;
  block-size: 100%;
  transform: rotateY(0deg);
  transform-style: preserve-3d;
  will-change: transform;
}

.faceA,
.faceB {
  position: absolute;
  inset-block: 0;
  inset-inline: 0 1px;
  overflow: hidden;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  background-repeat: no-repeat;
  background-size: 100cqw 100%;
  background-position: calc(var(--i) * -100cqw / var(--ls-n)) center;
}

.faceA::after,
.faceB::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(0, 165, 224, 0.22), transparent 9%),
    linear-gradient(270deg, rgba(229, 0, 125, 0.18), transparent 9%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.3), transparent 22%, transparent 78%, rgba(255, 255, 255, 0.16));
  mix-blend-mode: screen;
  pointer-events: none;
}

.faceA {
  background-image: linear-gradient(155deg, rgba(0, 165, 224, 0.14), rgba(229, 0, 125, 0.08)), var(--ls-img-a);
}

.faceB {
  transform: rotateY(180deg);
  background-image: linear-gradient(205deg, rgba(229, 0, 125, 0.14), rgba(0, 165, 224, 0.08)), var(--ls-img-b);
}

.flatA,
.flatB {
  position: absolute;
  inset: 0;
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;
}

.flatA {
  z-index: 1;
  background-image: linear-gradient(155deg, rgba(0, 165, 224, 0.14), rgba(229, 0, 125, 0.08)), var(--ls-img-a);
}

.flatB {
  z-index: 2;
  background-image: linear-gradient(205deg, rgba(229, 0, 125, 0.14), rgba(0, 165, 224, 0.08)), var(--ls-img-b);
}

.ribs {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: repeating-linear-gradient(
    90deg,
    transparent 0 5px,
    rgba(255, 255, 255, 0.1) 5px 5.5px,
    rgba(255, 255, 255, 0.03) 5.5px 8px,
    rgba(20, 26, 32, 0.05) 8px 8.5px,
    transparent 8.5px 12px
  );
  mix-blend-mode: overlay;
  opacity: 0.5;
}

.glare {
  position: absolute;
  inset-block: 0;
  inset-inline-start: calc(var(--ls-gx) * 100%);
  inline-size: 38%;
  z-index: 4;
  transform: translateX(-50%);
  pointer-events: none;
  background:
    linear-gradient(
      100deg,
      transparent 30%,
      rgba(255, 255, 255, 0.06) 44%,
      rgba(255, 255, 255, 0.3) 50%,
      rgba(255, 255, 255, 0.06) 56%,
      transparent 70%
    ),
    linear-gradient(100deg, transparent 49.3%, rgba(255, 255, 255, 0.55) 50%, transparent 50.7%);
  background-size: 100% 100%, 100% 100%;
  mix-blend-mode: soft-light;
  opacity: 0.8;
}

.pauseButton {
  position: absolute;
  inset-block-end: clamp(8px, 2cqi, 14px);
  inset-inline-end: clamp(10px, 2.5cqi, 16px);
  display: grid;
  place-items: center;
  inline-size: 32px;
  block-size: 32px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--ls-ink) 14%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, var(--ls-mat) 80%, transparent);
  color: var(--ls-ink);
  cursor: pointer;
  transition:
    background-color 160ms cubic-bezier(0.2, 0.8, 0.2, 1),
    border-color 160ms cubic-bezier(0.2, 0.8, 0.2, 1),
    transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pauseButton:hover {
  background: var(--ls-mat);
  border-color: color-mix(in srgb, var(--ls-ink) 30%, transparent);
}

.pauseButton:active {
  transform: scale(0.94);
}

.pauseButton:focus-visible {
  outline: 2px solid var(--ls-ink);
  outline-offset: 2px;
}

.icon {
  inline-size: 12px;
  block-size: 12px;
  fill: currentColor;
}
```
