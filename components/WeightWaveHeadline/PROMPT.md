Create a custom element called "Weight Wave Headline". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: headline text, font choice, lightest weight, heaviest weight, text color, bar color. Add other settings if they help.

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface WeightWaveHeadlineProps {
  /** The headline text; every letter carries the weight wave. */
  text?: string;
  /** Variable font stack used for the headline. */
  fontFamily?: string;
  /** Lightest weight the letters relax to (100-900). */
  minWeight?: number;
  /** Heaviest weight the letters swell to (100-900). */
  maxWeight?: number;
  /** Headline color. */
  textColor?: string;
  /** Color of the signal bar under the headline. */
  accentColor?: string;
  className?: string;
}

type Glyph = { ch: string; space: boolean };
type LetterState = { el: HTMLElement; cx: number; w: number; v: number };

const REST_FRACTION = 0.3;
const STIFFNESS = 170;
const DAMPING = 13;
const BAR_STIFFNESS = 90;
const BAR_DAMPING = 11;
const SWEEP_SECONDS = 9.5;
const BAR_SLIDE = 0.16;
const MAX_LETTERS = 220;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default function WeightWaveHeadline({
  text = 'Form follows force',
  fontFamily = "'Inter Tight', 'Inter', system-ui, 'Helvetica Neue', 'Segoe UI', sans-serif",
  minWeight = 280,
  maxWeight = 900,
  textColor = '#191712',
  accentColor = '#ff4d00',
  className,
}: WeightWaveHeadlineProps) {
  const [reduced, setReduced] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);

  const rootRef = useRef<HTMLDivElement>(null);
  const barElRef = useRef<HTMLSpanElement>(null);
  const lettersRef = useRef<LetterState[]>([]);
  const widthRef = useRef(0);
  const radiusRef = useRef(120);
  const pointerRef = useRef<number | null>(null);
  const weightsRef = useRef({ lo: 280, hi: 900, rest: 466 });
  const introRef = useRef(false);
  const phaseRef = useRef(0);
  const barPosRef = useRef({ x: 0, v: 0 });
  const kickRef = useRef<(() => void) | null>(null);

  const lo = clamp(Math.round(minWeight ?? 280), 100, 900);
  const hi = clamp(Math.round(maxWeight ?? 900), lo + 1, 900);
  const rest = Math.round(lo + (hi - lo) * REST_FRACTION);
  weightsRef.current = { lo, hi, rest };

  const glyphs = useMemo<Glyph[]>(() => {
    const out: Glyph[] = [];
    (text ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, MAX_LETTERS)
      .forEach((word, wi, arr) => {
        Array.from(word).forEach((ch) => out.push({ ch, space: false }));
        if (wi < arr.length - 1) out.push({ ch: ' ', space: true });
      });
    return out;
  }, [text]);

  const letterCount = useMemo(() => glyphs.filter((g) => !g.space).length, [glyphs]);

  const rootStyle = {
    '--ww-ink': textColor,
    '--ww-accent': accentColor,
    '--ww-font': fontFamily,
    '--ww-rest': `${rest}`,
  } as CSSProperties;

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    widthRef.current = rect.width;
    radiusRef.current = clamp(rect.width * 0.17, 80, 240);
    const prev = lettersRef.current;
    const list: LetterState[] = [];
    root.querySelectorAll<HTMLElement>(`.${styles.letter}`).forEach((el) => {
      const box = el.getBoundingClientRect();
      const old = prev.find((s) => s.el === el);
      list.push({
        el,
        cx: box.left - rect.left + box.width / 2,
        w: old?.w ?? weightsRef.current.rest,
        v: old?.v ?? 0,
      });
    });
    lettersRef.current = list;
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)');
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) measure();
    });
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [measure, letterCount]);

  useEffect(() => {
    if (reduced) {
      for (const s of lettersRef.current) s.el.style.removeProperty('--ww-w');
      barElRef.current?.style.removeProperty('--ww-shift');
      return;
    }
    if (!inView) return;

    const autoOn = coarse && !paused;
    let raf = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const { hi, rest } = weightsRef.current;
      const radius = radiusRef.current || 120;
      const width = widthRef.current || 1;
      const letters = lettersRef.current;

      if (!introRef.current) {
        introRef.current = true;
        for (const s of letters) {
          const d = s.cx / radius;
          s.w = rest + (hi - rest) * Math.exp(-d * d);
          s.v = 0;
        }
      }

      let center: number | null = null;
      if (autoOn) {
        phaseRef.current += dt;
        center = width * (0.5 - 0.5 * Math.cos((phaseRef.current / SWEEP_SECONDS) * Math.PI * 2));
      } else if (pointerRef.current !== null) {
        center = pointerRef.current;
      }

      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      let maxDelta = 0;
      let maxV = 0;
      let momentum = 0;
      let mass = 0;

      for (const s of letters) {
        let target = rest;
        if (center !== null) {
          const d = (s.cx - center) / radius;
          target = rest + (hi - rest) * Math.exp(-d * d);
        }
        for (let n = 0; n < steps; n++) {
          s.v += (STIFFNESS * (target - s.w) - DAMPING * s.v) * h;
          s.w += s.v * h;
        }
        s.w = clamp(s.w, 100, 1000);
        s.el.style.setProperty('--ww-w', s.w.toFixed(1));
        maxDelta = Math.max(maxDelta, Math.abs(target - s.w));
        maxV = Math.max(maxV, Math.abs(s.v));
        const m = Math.max(0, s.w - rest);
        momentum += m * (s.cx - width / 2);
        mass += m;
      }

      const bar = barPosRef.current;
      let barTarget = 0;
      if (mass > 0.001) barTarget = clamp((momentum / mass) * 0.5, -width * BAR_SLIDE, width * BAR_SLIDE);
      for (let n = 0; n < steps; n++) {
        bar.v += (BAR_STIFFNESS * (barTarget - bar.x) - BAR_DAMPING * bar.v) * h;
        bar.x += bar.v * h;
      }
      barElRef.current?.style.setProperty('--ww-shift', `${bar.x.toFixed(2)}px`);

      const settled = maxDelta < 0.2 && maxV < 0.6;
      if (autoOn || !settled) {
        raf = requestAnimationFrame(step);
      } else {
        raf = 0;
      }
    };

    kickRef.current = () => {
      if (raf === 0) {
        last = performance.now();
        raf = requestAnimationFrame(step);
      }
    };

    raf = requestAnimationFrame(step);
    return () => {
      kickRef.current = null;
      if (raf !== 0) cancelAnimationFrame(raf);
    };
  }, [reduced, inView, coarse, paused]);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (coarse || e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    pointerRef.current = e.clientX - rect.left;
    kickRef.current?.();
  };

  const onPointerLeave = () => {
    pointerRef.current = null;
    kickRef.current?.();
  };

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <span className={styles.grain} aria-hidden="true" />

      <h2 className={styles.headline}>
        {glyphs.map((g, i) =>
          g.space ? (
            ' '
          ) : (
            <span key={i} className={styles.letter}>
              {g.ch}
            </span>
          ),
        )}
      </h2>

      <span ref={barElRef} className={styles.bar} aria-hidden="true" />

      {coarse && !reduced && (
        <button
          type="button"
          className={styles.pause}
          aria-label={paused ? 'Play the wave' : 'Pause the wave'}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? (
            <svg className={styles.icon} viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3 1.2 10.6 6 3 10.8Z" fill="currentColor" />
            </svg>
          ) : (
            <svg className={styles.icon} viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3 1.5v9M9 1.5v9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
```

```css
.root {
  --ww-ground: #e9e6df;
  --ww-ground-shade: #dedad0;
  --ww-ink: #191712;
  --ww-accent: #ff4d00;
  --ww-font: 'Inter Tight', 'Inter', system-ui, 'Helvetica Neue', 'Segoe UI', sans-serif;
  --ww-rest: 466;
  --ww-shift: 0px;
  --ww-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.33  0 0 0 0 0.28  0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  display: grid;
  align-content: start;
  padding-block: clamp(44px, 8cqi, 104px) clamp(44px, 7cqi, 88px);
  padding-inline: clamp(24px, 5cqi, 72px);
  border-radius: 28px;
  background:
    radial-gradient(140% 90% at 28% -20%, #f4f1ea 0%, transparent 55%),
    linear-gradient(180deg, var(--ww-ground) 0%, var(--ww-ground-shade) 100%);
  color: var(--ww-ink);
  font-family: var(--ww-font);
}

.headline {
  position: relative;
  z-index: 1;
  margin: 0;
  font-size: clamp(42px, 12.5cqi, 150px);
  font-weight: 550;
  line-height: 0.96;
  letter-spacing: -0.045em;
  text-wrap: balance;
  overflow-wrap: anywhere;
  color: var(--ww-ink);
}

.letter {
  font-variation-settings: 'wght' var(--ww-w, var(--ww-rest));
}

.bar {
  position: relative;
  z-index: 1;
  justify-self: start;
  display: block;
  inline-size: 68%;
  max-inline-size: 100%;
  block-size: clamp(5px, 0.8cqi, 10px);
  margin-block-start: clamp(22px, 4cqi, 52px);
  border-radius: 99px;
  background: var(--ww-accent);
  transform: translateX(var(--ww-shift));
}

.grain {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background-image: var(--ww-noise);
  opacity: 0.055;
  mix-blend-mode: multiply;
}

.pause {
  position: absolute;
  z-index: 3;
  inset-block-end: 14px;
  inset-inline-end: 16px;
  display: grid;
  place-items: center;
  inline-size: 34px;
  block-size: 34px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--ww-ink) 18%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, var(--ww-ground) 88%, #ffffff);
  color: var(--ww-ink);
  opacity: 0.55;
  cursor: pointer;
}

.pause:hover {
  opacity: 0.9;
}

.pause:focus-visible {
  outline: 2px solid var(--ww-accent);
  outline-offset: 2px;
  opacity: 1;
}

.icon {
  inline-size: 12px;
  block-size: 12px;
}
```
