Create a custom element called "Lenticular Switch". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: image A, image B, image A description, image B description, strip width, strip colour or gradient (stripColor), idle sway hint on/off. Add other settings if they help.

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';
import powderShoeImg from './images/powder-shoe.jpg';
import onyxShoeImg from './images/onyx-shoe.png';

export interface LenticularSwitchProps {
  imageA?: string;
  imageAAlt?: string;
  imageB?: string;
  imageBAlt?: string;
  stripWidth?: number;
  /** Tint of the strips while they flip: a CSS colour or gradient (e.g. `#ff7a00`, `linear-gradient(90deg, gold, hotpink)`). Gradients span the whole print. Empty = default multicolour sheen. */
  stripColor?: string;
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
const HUE_BASE = 200;

const useImageRatio = (src: string) => {
  const [ratio, setRatio] = useState(1.6);
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => img.naturalHeight && setRatio(img.naturalWidth / img.naturalHeight);
    img.src = src;
  }, [src]);
  return ratio;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const clamp01 = (v: number) => clamp(v, 0, 1);

type Mode = 'idle' | 'pointer' | 'key';

const HELP_ANIMATED =
  'Move across the print, or drag on touch, to flip between the two photos. Arrow keys flip step by step; Home and End jump to a photo; Escape lets it drift again.';
const HELP_REDUCED = 'Press Enter, Space or the arrow keys to switch between the two photos.';

const defaultImageA = powderShoeImg;
const defaultImageB = onyxShoeImg;

export default function LenticularSwitch({
  imageA = defaultImageA,
  imageAAlt = 'Knit sneaker in cobalt blue resting on a pale step',
  imageB = defaultImageB,
  imageBAlt = 'Pair of black knit sneakers with white soles on a plinth',
  stripWidth = 26,
  stripColor,
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

  const ratioA = useImageRatio(imageA);
  const ratioB = useImageRatio(imageB);
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
    const root = rootRef.current;
    if (!opening || !root) return;
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
      opening.style.setProperty('--ls-gx', m.gt.toFixed(3));
      root.style.setProperty('--ls-gx', m.gt.toFixed(3));
      const els = stripEls.current;
      for (let i = 0; i < n; i++) {
        const el = els[i];
        if (!el) continue;
        el.style.transform = `rotateY(${(m.p[i] * 180).toFixed(2)}deg)`;
        el.style.setProperty('--s', Math.sin(Math.PI * m.p[i]).toFixed(3));
        el.style.setProperty('--h', (HUE_BASE + m.p[i] * 260 + i * 11).toFixed(1));
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
    '--ls-ar-a': ratioA,
    '--ls-ar-b': ratioB,
    ...(stripColor ? { '--ls-tint': stripColor } : {}),
  } as CSSProperties;
  const openingStyle = { '--ls-n': stripCount } as CSSProperties;
  const ariaLabel = `Lenticular print switching between ${imageAAlt} and ${imageBAlt}`;

  const reducedStyle = reduced ? ({ '--ls-gx': showB ? 1 : 0 } as CSSProperties) : undefined;

  return (
    <figure
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={{ ...rootStyle, ...reducedStyle }}
    >
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
        {reduced ? (
          <>
            <span className={styles.flatA} aria-hidden="true" />
            <span className={styles.flatB} aria-hidden="true" style={{ opacity: showB ? 1 : 0 }} />
          </>
        ) : (
          <div className={[styles.strips, stripColor && styles.tinted].filter(Boolean).join(' ')} aria-hidden="true">
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
      </div>
      <figcaption className={styles.caption}>
        <span className={styles.numerals} aria-hidden="true">
          <span className={styles.numA}>01</span>
          <span className={styles.numB}>02</span>
        </span>
        <span className={styles.hintText} aria-hidden="true">
          {reduced ? 'Tap to switch' : 'Move across to turn'}
        </span>
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
      </figcaption>
    </figure>
  );
}
```

```css
@font-face {
  font-family: 'Jost';
  font-style: normal;
  font-display: swap;
  font-weight: 300;
  src: url('./fonts/jost-latin-300-normal.woff2') format('woff2');
}

@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-display: swap;
  font-weight: 400;
  src: url('./fonts/hanken-grotesk-latin-400-normal.woff2') format('woff2');
}

.root {
  --ls-paper: #f5f4f1;
  --ls-ink: #151515;
  --ls-muted: #6b6a66;
  --ls-font-display: 'Jost', 'Futura', 'Helvetica Neue', system-ui, sans-serif;
  --ls-font-ui: 'Hanken Grotesk', 'Helvetica Neue', system-ui, sans-serif;
  --ls-img-a: none;
  --ls-img-b: none;
  --ls-gx: 0;
  --ls-ar-a: 1.6;
  --ls-ar-b: 1.6;

  box-sizing: border-box;
  inline-size: 100%;
  margin: 0;
  padding: clamp(12px, 3cqi, 32px);
  background: var(--ls-paper);
  color: var(--ls-ink);
  font-family: var(--ls-font-ui);
  container-type: inline-size;
}

.opening {
  --ls-n: 24;

  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  container-type: inline-size;
  perspective: 1400px;
  background: var(--ls-paper);
  cursor: ew-resize;
  touch-action: pan-y;
  -webkit-tap-highlight-color: transparent;
  outline: none;
}

.opening:focus-visible {
  outline: 2px solid var(--ls-ink);
  outline-offset: 4px;
}

.strips {
  position: absolute;
  inset: 0;
  display: flex;
  transform-style: preserve-3d;
}

.strip {
  --s: 0;

  position: relative;
  flex: 1 1 0;
  min-inline-size: 0;
  block-size: 100%;
  transform-style: preserve-3d;
  will-change: transform;
}

.faceA,
.faceB {
  position: absolute;
  inset-block: 0;
  inset-inline: -0.5px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  background-repeat: no-repeat;
  background-size: max(100cqw, calc(75cqw * var(--ls-ar, 1.6))) auto;
  background-position: calc(var(--i) * -100cqw / var(--ls-n) + 0.5px) 38%;
  background-color: var(--ls-paper);
}

.faceA::before,
.faceB::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(
      100deg,
      hsl(var(--h, 200) 95% 66%) 0%,
      hsl(calc(var(--h, 200) + 70) 95% 62%) 38%,
      hsl(calc(var(--h, 200) + 140) 95% 68%) 70%,
      hsl(calc(var(--h, 200) + 210) 95% 64%) 100%
    );
  mix-blend-mode: soft-light;
  opacity: calc(var(--s) * 1.1);
  pointer-events: none;
}

.tinted .faceA::before,
.tinted .faceB::before {
  background: var(--ls-tint);
  background-size: 100cqw 100%;
  background-position: calc(var(--i) * -100cqw / var(--ls-n)) 0;
  mix-blend-mode: normal;
  opacity: calc(var(--s) * 0.55);
}

.faceA::after,
.faceB::after {
  z-index: 2;
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.9), rgba(255, 255, 255, 0.55) 45%, rgba(0, 0, 0, 0.9));
  opacity: calc(var(--s) * var(--s) * 0.34);
}

.faceA {
  --ls-ar: var(--ls-ar-a);
  background-image: var(--ls-img-a);
}

.faceB {
  --ls-ar: var(--ls-ar-b);
  transform: rotateY(180deg);
  background-image: var(--ls-img-b);
}

.flatA,
.flatB {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-color: var(--ls-paper);
  transition: opacity 400ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.flatA {
  background-image: var(--ls-img-a);
}

.flatB {
  background-image: var(--ls-img-b);
}

.caption {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: end;
  gap: clamp(12px, 3cqi, 28px);
  padding-block-start: clamp(10px, 2cqi, 20px);
}

.numerals {
  display: grid;
  font-family: var(--ls-font-display);
  font-weight: 300;
  font-size: clamp(56px, 16cqi, 168px);
  line-height: 0.8;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}

.numA,
.numB {
  grid-area: 1 / 1;
}

.numA {
  opacity: calc(1 - var(--ls-gx) * 1.6);
}

.numB {
  opacity: calc(var(--ls-gx) * 1.6 - 0.6);
}

.hintText {
  padding-block-end: 0.2em;
  color: var(--ls-muted);
  font-size: 13px;
  letter-spacing: 0.02em;
}

.pauseButton {
  display: grid;
  place-items: center;
  inline-size: 36px;
  block-size: 36px;
  margin-block-end: -4px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ls-ink);
  cursor: pointer;
  transition:
    background-color 160ms cubic-bezier(0.2, 0.8, 0.2, 1),
    transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pauseButton:hover {
  background: rgba(21, 21, 21, 0.08);
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

@container (max-width: 420px) {
  .hintText {
    display: none;
  }
}
```
