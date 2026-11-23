Create a custom element called "Goal Jar Fill". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: amount reached, goal amount, label, currency symbol, liquid color. Add other settings if they help.

```tsx
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface GoalJarFillProps {
  amount?: number;
  goal?: number;
  label?: string;
  currencySymbol?: string;
  liquidColor?: string;
  className?: string;
}

type Rgb = [number, number, number];

const COLUMNS = 44;
const WAVE_K = 0.028;
const WAVE_DAMP = 0.035;
const SPREAD = 0.2;
const TILT_K = 70;
const TILT_DAMP = 6.5;
const FILL_MS = 1700;
const BASE = 0.1;
const TOP = 0.9;
const SURFACE_DEPTH = 0.028;

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3.2);
const money = (symbol: string, n: number) => {
  const digits = Math.round(Math.max(0, n)).toLocaleString('en-US');
  return symbol.length > 1 ? `${symbol} ${digits}` : `${symbol}${digits}`;
};
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as Rgb;
const rgba = (c: Rgb, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

const JAR_HELP = 'Hover, tap or press Enter to swirl the liquid.';

export default function GoalJarFill({
  amount = 12480,
  goal = 20000,
  label = 'Orchard replanting fund',
  currencySymbol = '$',
  liquidColor = '#c9780f',
  className,
}: GoalJarFillProps) {
  const uid = useId();
  const labelId = `${uid}-label`;
  const ratio = goal > 0 ? Math.max(0, amount) / goal : 0;
  const percent = Math.round(ratio * 100);
  const amountText = money(currencySymbol, amount);
  const goalText = money(currencySymbol, goal);

  const rootRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const amountRef = useRef<HTMLSpanElement>(null);
  const percentRef = useRef<HTMLSpanElement>(null);
  const wake = useRef<() => void>(() => {});
  const sim = useRef({
    h: new Float32Array(COLUMNS),
    v: new Float32Array(COLUMNS),
    tilt: 0,
    tiltV: 0,
    fill: 0,
    from: 0,
    to: clamp(ratio, 0, 1.04),
    start: -1,
    lastX: -1,
    lastT: 0,
  });
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(false);

  const live = useRef({ amount, ratio, symbol: currencySymbol, amountText, percent });
  live.current = { amount, ratio, symbol: currencySymbol, amountText, percent };

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
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.1 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const s = sim.current;
    s.from = s.fill;
    s.to = clamp(ratio, 0, 1.04);
    s.start = -1;
    wake.current();
  }, [ratio]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const glass = glassRef.current;
    const root = rootRef.current;
    if (!canvas || !glass || !root) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let hgt = 0;
    let raf = 0;
    let running = false;
    let liquid: Rgb = [201, 120, 15];
    const s = sim.current;

    const readColor = () => {
      const probe = document.createElement('canvas').getContext('2d');
      if (!probe) return;
      probe.fillStyle = getComputedStyle(root).getPropertyValue('--gj-liquid').trim() || '#c9780f';
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
      liquid = [r, g, b];
    };

    const writeText = () => {
      const l = live.current;
      const shown = l.ratio > 0 ? clamp(s.fill / Math.max(0.0001, clamp(l.ratio, 0, 1.04)), 0, 1) : 1;
      const done = shown > 0.999;
      if (amountRef.current) amountRef.current.textContent = done ? l.amountText : money(l.symbol, l.amount * shown);
      if (percentRef.current) percentRef.current.textContent = `${done ? l.percent : Math.round(l.percent * shown)}%`;
      root.style.setProperty('--gj-fill', clamp(s.fill, 0, 1).toFixed(4));
    };

    const draw = () => {
      if (!w || !hgt) return;
      ctx.clearRect(0, 0, w, hgt);
      const fill = clamp(s.fill, 0, 1.04);
      if (fill <= 0.001) return;
      const level = hgt * (1 - BASE - fill * (TOP - BASE));
      const depth = Math.max(5, hgt * SURFACE_DEPTH);
      const amp = hgt * 0.0026;
      const xs = (i: number) => (i / (COLUMNS - 1)) * w;
      const meniscus = (i: number) => {
        const e = Math.min(i, COLUMNS - 1 - i) / 3;
        return e < 1 ? (1 - e) * (1 - e) * depth * 0.8 : 0;
      };
      const front = (i: number) => level + s.h[i] * amp + s.tilt * (xs(i) - w / 2) * 0.16 - meniscus(i);
      const back = (i: number) => level - depth + s.h[COLUMNS - 1 - i] * amp * 0.7 - s.tilt * (xs(i) - w / 2) * 0.12;

      const light = mix(liquid, [255, 236, 190], 0.45);
      const deep = mix(liquid, [40, 14, 0], 0.45);

      const trace = (fn: (i: number) => number, reverse = false) => {
        for (let k = 0; k < COLUMNS; k++) {
          const i = reverse ? COLUMNS - 1 - k : k;
          ctx.lineTo(xs(i), fn(i));
        }
      };

      ctx.beginPath();
      ctx.moveTo(0, back(0));
      trace(back);
      trace(front, true);
      ctx.closePath();
      const top = ctx.createLinearGradient(0, level - depth, 0, level);
      top.addColorStop(0, rgba(mix(light, [255, 255, 255], 0.2), 0.75));
      top.addColorStop(1, rgba(mix(liquid, light, 0.6), 0.95));
      ctx.fillStyle = top;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, front(0));
      trace(front);
      ctx.lineTo(w, hgt);
      ctx.lineTo(0, hgt);
      ctx.closePath();
      const body = ctx.createLinearGradient(0, level, 0, hgt);
      body.addColorStop(0, rgba(mix(liquid, light, 0.35), 0.96));
      body.addColorStop(0.45, rgba(liquid, 0.97));
      body.addColorStop(1, rgba(deep, 0.98));
      ctx.fillStyle = body;
      ctx.fill();

      ctx.save();
      ctx.clip();
      const side = ctx.createLinearGradient(0, 0, w, 0);
      side.addColorStop(0, 'rgba(30,10,0,0.32)');
      side.addColorStop(0.22, 'rgba(30,10,0,0)');
      side.addColorStop(0.7, 'rgba(30,10,0,0)');
      side.addColorStop(1, 'rgba(30,10,0,0.38)');
      ctx.fillStyle = side;
      ctx.fillRect(0, 0, w, hgt);
      const glow = ctx.createRadialGradient(w * 0.42, hgt * 0.82, 0, w * 0.42, hgt * 0.82, w * 0.55);
      glow.addColorStop(0, rgba(mix(light, [255, 245, 220], 0.3), 0.45));
      glow.addColorStop(1, rgba(light, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, hgt);
      ctx.fillStyle = 'rgba(255,240,210,0.5)';
      for (let b = 0; b < 9; b++) {
        const bx = w * (0.16 + ((b * 0.37) % 0.7));
        const by = hgt - ((b * 0.23 + s.fill * 0.6) % 1) * (hgt - level) * 0.9 - hgt * 0.06;
        const r = 0.8 + ((b * 7) % 3) * 0.6;
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(0, front(0));
      trace(front);
      ctx.strokeStyle = 'rgba(255,248,230,0.75)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    };

    const resize = () => {
      const r = glass.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      hgt = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hgt * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const step = (dt: number) => {
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      const f = h * 60;
      for (let n = 0; n < steps; n++) {
        for (let i = 0; i < COLUMNS; i++) {
          s.v[i] += (-WAVE_K * s.h[i] - WAVE_DAMP * s.v[i]) * f;
          s.h[i] += s.v[i] * f;
        }
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 0; i < COLUMNS; i++) {
            if (i > 0) s.v[i - 1] += SPREAD * (s.h[i] - s.h[i - 1]) * f;
            if (i < COLUMNS - 1) s.v[i + 1] += SPREAD * (s.h[i] - s.h[i + 1]) * f;
          }
        }
        s.tiltV += (-TILT_K * s.tilt - TILT_DAMP * s.tiltV) * h;
        s.tilt += s.tiltV * h;
      }
    };

    const calm = () => {
      if (s.start >= 0 || Math.abs(s.tilt) > 0.004 || Math.abs(s.tiltV) > 0.01) return false;
      for (let i = 0; i < COLUMNS; i++) if (Math.abs(s.h[i]) > 0.05 || Math.abs(s.v[i]) > 0.02) return false;
      return true;
    };

    let last = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      if (s.fill !== s.to || s.start >= 0) {
        if (s.start < 0) s.start = now;
        const t = clamp((now - s.start) / FILL_MS);
        s.fill = s.from + (s.to - s.from) * easeOut(t);
        if (Math.random() < 0.35) s.v[Math.floor(COLUMNS * (0.35 + Math.random() * 0.3))] += (1 - t) * 2.2;
        if (t >= 1) {
          s.fill = s.to;
          s.start = -1;
          s.tiltV += 0.25;
        }
      }
      step(dt);
      draw();
      writeText();
      if (calm()) {
        running = false;
        s.h.fill(0);
        s.v.fill(0);
        draw();
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || reduced || !inView) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    readColor();
    if (reduced) {
      s.fill = s.to;
      s.start = -1;
      s.h.fill(0);
      s.v.fill(0);
      s.tilt = 0;
      s.tiltV = 0;
    }
    wake.current = () => {
      readColor();
      if (reduced) {
        s.fill = s.to;
        s.start = -1;
        draw();
        writeText();
      } else start();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(glass);
    resize();
    writeText();
    start();
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      running = false;
      wake.current = () => {};
    };
  }, [reduced, inView]);

  useEffect(() => {
    wake.current();
  }, [liquidColor]);

  const disturb = (x: number, force: number) => {
    const s = sim.current;
    const i = Math.round(clamp(x) * (COLUMNS - 1));
    for (let d = -2; d <= 2; d++) {
      const j = i + d;
      if (j >= 0 && j < COLUMNS) s.v[j] += force * (1 - Math.abs(d) * 0.3);
    }
    wake.current();
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const s = sim.current;
    const now = performance.now();
    if (s.lastX >= 0 && now - s.lastT < 120) {
      const vx = clamp((x - s.lastX) / Math.max(0.008, (now - s.lastT) / 1000), -6, 6);
      s.tiltV += vx * 0.09;
      disturb(x, -Math.abs(vx) * 0.5);
    }
    s.lastX = x;
    s.lastT = now;
  };

  const onPointerLeave = () => {
    sim.current.lastX = -1;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType === 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    disturb((e.clientX - rect.left) / rect.width, -7);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (reduced || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    sim.current.tiltV += 0.9;
    disturb(0.3, -5);
  };

  const rootStyle = { '--gj-liquid': liquidColor, '--gj-fill': clamp(ratio, 0, 1).toFixed(4) } as CSSProperties;
  const amountStyle = { '--gj-chars': Math.max(6, amountText.length) } as CSSProperties;

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <span className={styles.paper} aria-hidden="true" />
      <span className={styles.vignette} aria-hidden="true" />

      <div
        className={styles.jar}
        role="progressbar"
        tabIndex={0}
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(amount, goal)}
        aria-valuetext={`${amountText} of ${goalText}, ${percent}%`}
        aria-description={JAR_HELP}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
      >
        <span className={styles.caustic} aria-hidden="true" />
        <span className={styles.shadow} aria-hidden="true" />
        <span className={styles.rim} aria-hidden="true" />
        <span className={styles.neck} aria-hidden="true" />
        <div ref={glassRef} className={styles.glass}>
          <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
          <span className={styles.ticks} aria-hidden="true" />
          <span className={styles.print} aria-hidden="true">
            <span ref={amountRef} className={styles.amount} style={amountStyle}>
              {amountText}
            </span>
            <span className={styles.goal}>/ {goalText}</span>
            <span ref={percentRef} className={styles.percent}>
              {percent}%
            </span>
          </span>
          <span className={styles.base} aria-hidden="true" />
          <span className={styles.highlight} aria-hidden="true" />
          <span className={styles.highlightThin} aria-hidden="true" />
          <span className={styles.grainGlass} aria-hidden="true" />
        </div>
      </div>

      {label && (
        <p id={labelId} className={styles.label}>
          {label}
        </p>
      )}
    </div>
  );
}
```

```css
.root {
  --gj-liquid: #c9780f;
  --gj-kraft: #c6a274;
  --gj-kraft-light: #d8bb91;
  --gj-ink: #2f2114;
  --gj-chalk: #fffaf0;
  --gj-glass-tint: rgba(74, 44, 18, 0.34);
  --gj-font-display: 'Inter Tight', 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --gj-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --gj-fill: 0.62;
  --gj-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.32  0 0 0 0 0.2  0 0 0 0 0.08  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --gj-fibers: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='.03 .09' numOctaves='2' seed='4'/><feColorMatrix values='0 0 0 0 0.98  0 0 0 0 0.92  0 0 0 0 0.8  0 0 0 1.4 -0.62'/></filter><rect width='100%' height='100%' filter='url(%23f)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  display: grid;
  justify-items: center;
  gap: 28px;
  padding-block: 64px 44px;
  padding-inline: 20px;
  border-radius: 28px;
  background:
    radial-gradient(42% 46% at 50% 42%, color-mix(in srgb, var(--gj-kraft-light) 80%, #fff3dc) 0%, transparent 100%),
    radial-gradient(70% 60% at 50% 30%, var(--gj-kraft-light) 0%, transparent 75%),
    var(--gj-kraft);
  color: var(--gj-ink);
  font-family: var(--gj-font-ui);
}

.paper,
.vignette {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}

.paper {
  background-image: var(--gj-fibers), var(--gj-noise);
  opacity: 0.32;
  mix-blend-mode: multiply;
}

.vignette {
  background: radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(70, 40, 14, 0.22) 100%);
}

.jar {
  position: relative;
  inline-size: min(100%, 300px);
  aspect-ratio: 0.74;
  display: grid;
  grid-template-rows: 5% 6% 1fr;
  justify-items: center;
  cursor: default;
  touch-action: pan-y;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  border-radius: 24px;
}

.jar:focus-visible {
  box-shadow: 0 0 0 3px var(--gj-kraft), 0 0 0 5px var(--gj-ink);
}

.caustic {
  position: absolute;
  inset-inline: 2%;
  inset-block-end: -9%;
  block-size: 18%;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--gj-liquid) 70%, #ffd98a), transparent);
  opacity: calc(0.25 + var(--gj-fill) * 0.55);
  filter: blur(14px);
  mix-blend-mode: soft-light;
  pointer-events: none;
}

.shadow {
  position: absolute;
  inset-inline: 10%;
  inset-block-end: -4%;
  block-size: 7%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(50, 26, 8, 0.45), transparent);
  filter: blur(5px);
  pointer-events: none;
}

.rim {
  grid-row: 1;
  inline-size: 61%;
  border-radius: 10px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.55) 18%, rgba(255, 255, 255, 0.12) 40%, rgba(255, 255, 255, 0.1) 75%, rgba(255, 255, 255, 0.35) 92%, rgba(255, 255, 255, 0.12)),
    var(--gj-glass-tint);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    inset 0 -2px 3px rgba(40, 20, 4, 0.25),
    0 2px 4px rgba(40, 20, 4, 0.18);
}

.neck {
  grid-row: 2;
  inline-size: 54%;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.4) 16%, transparent 38%, transparent 80%, rgba(255, 255, 255, 0.22) 94%),
    var(--gj-glass-tint);
  box-shadow: inset 0 -6px 8px rgba(40, 20, 4, 0.2);
}

.glass {
  grid-row: 3;
  position: relative;
  container-type: inline-size;
  inline-size: 100%;
  block-size: 100%;
  box-sizing: border-box;
  overflow: hidden;
  border: 5px solid rgba(255, 248, 236, 0.32);
  border-radius: 38% 38% 16% 16% / 19% 19% 8% 8%;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 30%),
    var(--gj-glass-tint);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.4),
    inset 14px 0 22px rgba(255, 245, 225, 0.12),
    inset -16px 0 24px rgba(30, 14, 2, 0.25),
    0 1px 0 rgba(255, 255, 255, 0.35),
    0 18px 30px -16px rgba(50, 26, 8, 0.55);
}

.canvas {
  position: absolute;
  inset: 0;
  display: block;
  inline-size: 100%;
  block-size: 100%;
}

.ticks {
  position: absolute;
  inset-inline-end: 9%;
  inset-block: 10% 10%;
  inline-size: 7%;
  background: repeating-linear-gradient(
    0deg,
    rgba(255, 250, 240, 0.55) 0 1.5px,
    transparent 1.5px calc(25% - 0.4px),
    rgba(255, 250, 240, 0.55) calc(25% - 0.4px) calc(25% + 1px)
  );
  -webkit-mask: linear-gradient(90deg, #000, rgba(0, 0, 0, 0.6));
  mask: linear-gradient(90deg, #000, rgba(0, 0, 0, 0.6));
  opacity: 0.85;
}

.percent {
  margin-block-start: 10px;
  padding-block: 4px;
  padding-inline: 10px;
  border: 1px solid rgba(255, 250, 240, 0.55);
  border-radius: 999px;
  font-size: clamp(12px, 4.6cqi, 14px);
  font-weight: 600;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}

.print {
  position: absolute;
  inset-inline: 10%;
  inset-block-start: 17%;
  display: grid;
  justify-items: center;
  gap: 4px;
  text-align: center;
  color: var(--gj-chalk);
  text-shadow: 0 1px 0 rgba(40, 18, 0, 0.18), 0 0 16px rgba(40, 18, 0, 0.2);
}

.amount {
  font-family: var(--gj-font-display);
  font-size: min(16cqi, calc(150cqi / var(--gj-chars)));
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.035em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.goal {
  font-size: clamp(13px, 6cqi, 17px);
  font-weight: 500;
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
  opacity: 0.88;
  overflow-wrap: anywhere;
}

.base {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  block-size: 9%;
  background:
    linear-gradient(180deg, rgba(255, 250, 240, 0) 0, rgba(255, 250, 240, 0.14) 40%, rgba(255, 250, 240, 0.3) 100%);
}

.highlight {
  position: absolute;
  inset-inline-start: 8%;
  inset-block: 9% 16%;
  inline-size: 8%;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.62) 20%, rgba(255, 255, 255, 0.4) 70%, rgba(255, 255, 255, 0));
  filter: blur(1.5px);
  mix-blend-mode: screen;
}

.highlightThin {
  position: absolute;
  inset-inline-end: 5%;
  inset-block: 14% 22%;
  inline-size: 2.4%;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.5) 40%, rgba(255, 255, 255, 0));
  filter: blur(0.6px);
  mix-blend-mode: screen;
}

.grainGlass {
  position: absolute;
  inset: 0;
  background-image: var(--gj-noise);
  opacity: 0.18;
  mix-blend-mode: overlay;
  pointer-events: none;
}

.label {
  margin: 0;
  max-inline-size: 22ch;
  font-family: var(--gj-font-display);
  font-size: 19px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.015em;
  text-align: center;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

@container (min-width: 700px) {
  .root {
    padding-block: 80px 56px;
  }

  .jar {
    inline-size: 320px;
  }

  .label {
    font-size: 22px;
  }
}
```
