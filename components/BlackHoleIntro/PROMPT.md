Create a custom element called "Black Hole Intro". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: centre label, star color, accent color, star density, content shown beneath (children). Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import styles from './Component.module.css';

export interface BlackHoleIntroProps {
  label?: string;
  children?: ReactNode;
  onOpen?: () => void;
  onClose?: () => void;
  starColor?: string;
  accentColor?: string;
  density?: number;
  className?: string;
}

type Mode = 'rest' | 'hover' | 'open';
type Star = { r: number; rest: number; a: number; speed: number; j: number; px: number; py: number; hot: boolean };

const BASE_STARS = 800;
const ALPHA_STEPS = 5;
const OPEN_FADE_MS = 3200;
const OPEN_FLOOR = 0.22;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export default function BlackHoleIntro({
  label = 'Enter',
  children,
  onOpen,
  onClose,
  starColor = '#cfd8ff',
  accentColor = '#ff8a4c',
  density = 1,
  className,
}: BlackHoleIntroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const kickRef = useRef<() => void>(() => {});
  const modeRef = useRef<Mode>('rest');
  const openedAtRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [staticMode, setStaticMode] = useState(false);
  const contentId = useId();

  const setMode = useCallback((mode: Mode) => {
    if (modeRef.current === 'open' && mode !== 'open' && mode !== 'rest') return;
    modeRef.current = mode;
    if (mode === 'open') openedAtRef.current = performance.now();
    kickRef.current();
  }, []);

  const toggle = useCallback(() => {
    const next = !open;
    setOpen(next);
    (next ? onOpen : onClose)?.();
    modeRef.current = next ? 'open' : 'rest';
    if (next) openedAtRef.current = performance.now();
    kickRef.current();
    if (next) window.setTimeout(() => contentRef.current?.focus({ preventScroll: true }), 420);
    else window.setTimeout(() => buttonRef.current?.focus({ preventScroll: true }), 560);
  }, [open, onOpen, onClose]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && open) toggle();
  };

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext('2d');
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!ctx) {
      setStaticMode(true);
      return;
    }
    const g = ctx;
    let reduced = mql.matches;
    setStaticMode(reduced);

    let w = 0;
    let h = 0;
    let dpr = 1;
    let ringR = 0;
    let rMax = 1;
    let stars: Star[] = [];
    let raf = 0;
    let visible = true;
    let last = 0;

    const seed = () => {
      const count = Math.round(BASE_STARS * clamp(density, 0.3, 2));
      const R = Math.min(w, h) / 2;
      stars = Array.from({ length: count }, () => {
        const r = R * (0.26 + 0.66 * Math.pow(Math.random(), 1.5));
        const a = Math.random() * Math.PI * 2;
                return {
          r,
          rest: r,
          a,
          speed: 0.0087 + Math.random() * 0.0115,
          j: Math.random(),
          px: w / 2 + Math.cos(a) * r,
          py: h / 2 + Math.sin(a) * r,
          hot: r < R * 0.45,
        };
      });
    };

    const resize = () => {
      w = root.clientWidth;
      h = root.clientHeight;
      if (!w || !h) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ringR = Math.min(w, h) * 0.17;
      rMax = Math.hypot(w, h) / 2;
      root.style.setProperty('--bh-core', `${Math.round(ringR * 1.45)}px`);
      seed();
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) drawStatic();
    };

    const stroke = (buckets: Path2D[], color: string, peak: number) => {
      g.strokeStyle = color;
      buckets.forEach((p, i) => {
        g.globalAlpha = ((i + 1) / ALPHA_STEPS) * peak;
        g.stroke(p);
      });
    };

    const paint = (frame: (s: Star) => { alpha: number; x0: number; y0: number; x1: number; y1: number }) => {
      g.globalAlpha = 1;
      const cool = Array.from({ length: ALPHA_STEPS }, () => new Path2D());
      const hot = Array.from({ length: ALPHA_STEPS }, () => new Path2D());
      for (const s of stars) {
        const f = frame(s);
        if (f.alpha < 0.03) continue;
        const bucket = (s.hot ? hot : cool)[Math.min(ALPHA_STEPS - 1, Math.floor(f.alpha * ALPHA_STEPS))];
        bucket.moveTo(f.x0, f.y0);
        bucket.lineTo(f.x1, f.y1);
      }
      g.lineWidth = 1;
      g.lineCap = 'round';
      stroke(cool, starColor, 0.95);
      stroke(hot, accentColor, 0.95);
      g.globalAlpha = 1;
    };

    function drawStatic() {
      g.clearRect(0, 0, w, h);
      paint((s) => {
        const r = ringR * (0.88 + 0.26 * s.j);
        const a1 = s.a + s.speed * 6;
        return {
          alpha: 0.35 + 0.65 * s.j,
          x0: w / 2 + Math.cos(s.a) * r,
          y0: h / 2 + Math.sin(s.a) * r,
          x1: w / 2 + Math.cos(a1) * r,
          y1: h / 2 + Math.sin(a1) * r,
        };
      });
    }

    const tick = (now: number) => {
      raf = 0;
      if (!visible || reduced) return;
      const mode = modeRef.current;
      const openAge = now - openedAtRef.current;
      const step = clamp((now - (last || now)) / 16.67, 0.2, 3);
      last = now;

      g.globalCompositeOperation = 'destination-out';
      g.globalAlpha = mode === 'open' ? 0.1 : 0.17;
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';

      const ease = 1 - Math.pow(1 - (mode === 'hover' ? 0.07 : mode === 'open' ? 0.025 : 0.045), step);
      const spin = mode === 'open' ? 0.5 : mode === 'hover' ? 1.3 : 1;
      const R = Math.min(w, h) / 2;
      const fade = mode === 'open' ? OPEN_FLOOR + (1 - OPEN_FLOOR) * clamp(1 - openAge / OPEN_FADE_MS, 0, 1) : 1;

      for (const s of stars) {
        const target =
          mode === 'hover' ? ringR * (0.88 + 0.26 * s.j) : mode === 'open' ? rMax * (0.1 + 1.05 * s.j) : s.rest;
        s.r += (target - s.r) * ease * (mode === 'open' ? 0.3 + s.j : 1);
        s.a += s.speed * step * spin;
      }
      paint((s) => {
        const x1 = w / 2 + Math.cos(s.a) * s.r;
        const y1 = h / 2 + Math.sin(s.a) * s.r;
        const rn = clamp(s.r / (R * 1.1), 0, 1);
        const alpha = (mode === 'hover' ? 0.5 + 0.5 * s.j : 0.3 + 0.7 * Math.pow(1 - rn, 1.3)) * fade;
        const out = { alpha, x0: s.px, y0: s.py, x1, y1 };
        s.px = x1;
        s.py = y1;
        return out;
      });
      raf = requestAnimationFrame(tick);
    };

    kickRef.current = () => {
      if (reduced) {
        drawStatic();
        return;
      }
      last = 0;
      if (!raf && visible) raf = requestAnimationFrame(tick);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(root);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) kickRef.current();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    io.observe(root);
    const onMotion = () => {
      reduced = mql.matches;
      setStaticMode(reduced);
      if (reduced) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        drawStatic();
      } else {
        kickRef.current();
      }
    };
    mql.addEventListener('change', onMotion);
    resize();
    kickRef.current();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mql.removeEventListener('change', onMotion);
      kickRef.current = () => {};
    };
  }, [starColor, accentColor, density]);

  const style = { '--bh-star': starColor, '--bh-accent': accentColor } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${className ?? ''}`}
      style={style}
      data-open={open}
      data-static={staticMode}
      onKeyDown={onKeyDown}
    >
      <div className={styles.cover} aria-hidden="true" />
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.horizon} aria-hidden="true" />
      <button
        ref={buttonRef}
        type="button"
        className={styles.core}
        aria-expanded={open}
        aria-controls={children ? contentId : undefined}
        onClick={toggle}
        onPointerEnter={() => !open && setMode('hover')}
        onPointerLeave={() => !open && setMode('rest')}
        onFocus={(e) => !open && e.currentTarget.matches(':focus-visible') && setMode('hover')}
        onBlur={() => !open && setMode('rest')}
      >
        <span className={styles.label}>{label}</span>
      </button>
      <div ref={contentRef} id={contentId} className={styles.page} tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
```

```css
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-display: swap;
  font-weight: 500;
  src: url('./fonts/hanken-grotesk-latin-500-normal.woff2') format('woff2');
}

.root {
  --bh-ink: #06070b;
  --bh-star: #cfd8ff;
  --bh-accent: #ff8a4c;
  --bh-text: #f2f4ff;
  --bh-muted: #aab0c8;
  --bh-core: 132px;
  --bh-font: 'Hanken Grotesk', system-ui, sans-serif;
  position: relative;
  isolation: isolate;
  container-type: inline-size;
  display: grid;
  place-items: center;
  inline-size: 100%;
  block-size: 100%;
  min-block-size: 34rem;
  overflow: hidden;
  background: #0b0d14;
  color: var(--bh-text);
  font-family: var(--bh-font);
  font-weight: 500;
}

.cover {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: var(--bh-ink);
  pointer-events: none;
  transition: opacity 1.1s ease 0.2s;
}

.root[data-open='true'] .cover {
  opacity: 0;
}

.canvas {
  position: absolute;
  inset: 0;
  z-index: 3;
  inline-size: 100%;
  block-size: 100%;
  pointer-events: none;
}

.root[data-static='true'][data-open='true'] .canvas {
  opacity: 0;
}

.horizon {
  position: absolute;
  inset: 0;
  z-index: 4;
  background: radial-gradient(circle at 50% 50%, var(--bh-ink) 0, var(--bh-ink) calc(var(--bh-core) * 0.3), transparent calc(var(--bh-core) * 0.75));
  pointer-events: none;
  transition: opacity 0.6s ease;
}

.root[data-open='true'] .horizon {
  opacity: 0;
}

.root[data-static='true'] .horizon {
  background: none;
}

.core {
  position: relative;
  z-index: 5;
  grid-area: 1 / 1;
  inline-size: var(--bh-core);
  block-size: var(--bh-core);
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--bh-text);
  font: inherit;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: opacity 0.5s ease, visibility 0s linear 0.5s;
}

.core:focus-visible {
  outline: 2px solid var(--bh-accent);
  outline-offset: 4px;
}

.label {
  font-size: 0.8125rem;
  letter-spacing: 0.28em;
  text-indent: 0.28em;
  text-transform: uppercase;
  transition: letter-spacing 0.5s cubic-bezier(0.2, 0.7, 0.2, 1), color 0.4s ease;
}

.core:hover .label,
.core:focus-visible .label {
  letter-spacing: 0.4em;
  text-indent: 0.4em;
  color: var(--bh-accent);
}

.root[data-open='true'] .core {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.page {
  position: relative;
  z-index: 1;
  grid-area: 1 / 1;
  box-sizing: border-box;
  inline-size: 100%;
  block-size: 100%;
  min-block-size: 0;
  outline: none;
  visibility: hidden;
  transition: visibility 0s linear 1s;
}

.root[data-open='true'] .page {
  visibility: visible;
  transition-delay: 0s;
}

.root[data-static='true'] .page,
.root[data-static='true'] .core,
.root[data-static='true'] .label,
.root[data-static='true'] .cover {
  transition: none;
}
```
