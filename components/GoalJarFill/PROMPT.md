Create a custom element called "Goal Jar Fill". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: amount reached, goal amount, label, currency symbol, liquid color, goal-reached text. Add other settings if they help.

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
  reachedText?: string;
  className?: string;
}

type Rgb = [number, number, number];
interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  wob: number;
  ph: number;
}

const COLUMNS = 44;
const WAVE_K = 0.028;
const WAVE_DAMP = 0.035;
const SPREAD = 0.2;
const TILT_K = 70;
const TILT_DAMP = 6.5;
const FILL_MS = 1700;
const BASE = 0.1;
const TOP = 0.9;
const SURFACE_DEPTH = 0.03;
const MAX_BUBBLES = 42;

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
  reachedText = 'Goal reached',
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
  const causticRef = useRef<HTMLCanvasElement>(null);
  const amountRef = useRef<HTMLSpanElement>(null);
  const numeralRef = useRef<HTMLSpanElement>(null);
  const wake = useRef<() => void>(() => {});
  const bubblesRef = useRef<Bubble[]>([]);
  const poppedRef = useRef(false);
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
  const [popped, setPopped] = useState(false);

  const live = useRef({ amount, ratio, symbol: currencySymbol, amountText, percent });
  live.current = { amount, ratio, symbol: currencySymbol, amountText, percent };

  const syncPopped = (v: boolean) => {
    if (poppedRef.current === v) return;
    poppedRef.current = v;
    setPopped(v);
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
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.1 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const s = sim.current;
    s.from = s.fill;
    s.to = clamp(ratio, 0, 1.04);
    s.start = -1;
    if (s.to < 1) syncPopped(false);
    wake.current();
  }, [ratio]);

  useEffect(() => {
    const root = rootRef.current;
    const glass = glassRef.current;
    const canvas = canvasRef.current;
    const caustic = causticRef.current;
    if (!root || !glass || !canvas || !caustic) return;
    const ctx = canvas.getContext('2d');
    const cctx = caustic.getContext('2d');
    if (!ctx || !cctx) return;

    let w = 0;
    let hgt = 0;
    let cw = 0;
    let ch = 0;
    let raf = 0;
    let running = false;
    let last = 0;
    let time = 0;
    let flare = 0;
    let idle = 2;
    let liquid: Rgb = [201, 120, 15];
    const s = sim.current;
    const bubbles = bubblesRef.current;

    const readColor = () => {
      const probe = document.createElement('canvas').getContext('2d');
      if (!probe) return;
      probe.fillStyle = getComputedStyle(root).getPropertyValue('--gj-liquid').trim() || '#c9780f';
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
      liquid = [r, g, b];
    };

    const spawnBubble = (x0?: number, y0 = 0.05, rMul = 1, vyMul = 1) => {
      if (bubbles.length >= MAX_BUBBLES) return;
      bubbles.push({
        x: x0 ?? 0.18 + Math.random() * 0.64,
        y: y0,
        r: Math.max(0.7, (0.8 + Math.random() * 1.5) * (w / 280) * rMul),
        vy: 0.22 + Math.random() * 0.3 * vyMul,
        wob: 4 + Math.random() * 4,
        ph: Math.random() * Math.PI * 2,
      });
    };

    const drawCaustic = (fill: number, energy: number) => {
      if (!cw || !ch) return;
      cctx.clearRect(0, 0, cw, ch);
      const a = 0.04 + clamp(fill) * 0.34 + flare * 0.5 + Math.min(0.14, energy * 0.5);
      const cx = cw * 0.56;
      const cy = ch * 0.42;
      const pool = cctx.createRadialGradient(cx, cy, 0, cx, cy, cw * 0.32);
      pool.addColorStop(0, `rgba(255, 206, 120, ${a * 0.85})`);
      pool.addColorStop(1, 'rgba(255, 206, 120, 0)');
      cctx.fillStyle = pool;
      cctx.fillRect(0, 0, cw, ch);
      cctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        cctx.beginPath();
        const yy = ch * (0.34 + k * 0.16);
        for (let px = cw * 0.24; px <= cw * 0.8; px += 6) {
          const y =
            yy +
            Math.sin(px * 0.02 + time * (0.5 + k * 0.22) + k * 2.1) * ch * 0.07 +
            Math.sin(px * 0.05 - time * 0.7 + k) * ch * 0.02;
          if (px === cw * 0.24) cctx.moveTo(px, y);
          else cctx.lineTo(px, y);
        }
        cctx.strokeStyle = `rgba(255, 218, 140, ${a * (0.55 - k * 0.13)})`;
        cctx.lineWidth = 5 + k * 3;
        cctx.stroke();
      }
    };

    const writeText = () => {
      const l = live.current;
      const shown = l.ratio > 0 ? clamp(s.fill / Math.max(0.0001, clamp(l.ratio, 0, 1.04)), 0, 1) : 1;
      const done = shown > 0.999;
      if (amountRef.current) amountRef.current.textContent = done ? l.amountText : money(l.symbol, l.amount * shown);
      const pct = done ? l.percent : Math.round(l.percent * shown);
      if (numeralRef.current) numeralRef.current.textContent = String(pct);
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
      const swell = (x: number, ph: number) =>
        (Math.sin(x * 0.034 + time * 1.15 + ph) * 0.0034 + Math.sin(x * 0.081 - time * 0.8 + ph) * 0.0013) * hgt;
      const front = (i: number) => level + s.h[i] * amp + swell(xs(i), 0) + s.tilt * (xs(i) - w / 2) * 0.16 - meniscus(i);
      const back = (i: number) =>
        level - depth + s.h[COLUMNS - 1 - i] * amp * 0.7 + swell(xs(i), 1.4) - s.tilt * (xs(i) - w / 2) * 0.12;

      const light = mix(liquid, [255, 236, 190], 0.5);
      const deep = mix(liquid, [40, 14, 0], 0.5);

      const trace = (fn: (i: number) => number, reverse = false) => {
        for (let k = 0; k < COLUMNS; k++) {
          const i = reverse ? COLUMNS - 1 - k : k;
          ctx.lineTo(xs(i), fn(i));
        }
      };

      // surface band (back wall of the liquid ellipse)
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

      // liquid body
      ctx.beginPath();
      ctx.moveTo(0, front(0));
      trace(front);
      ctx.lineTo(w, hgt);
      ctx.lineTo(0, hgt);
      ctx.closePath();
      const body = ctx.createLinearGradient(0, level, 0, hgt);
      body.addColorStop(0, rgba(mix(liquid, light, 0.4), 0.94));
      body.addColorStop(0.3, rgba(mix(liquid, light, 0.1), 0.96));
      body.addColorStop(0.7, rgba(mix(liquid, deep, 0.25), 0.97));
      body.addColorStop(1, rgba(deep, 0.99));
      ctx.fillStyle = body;
      ctx.fill();

      // interior light: side shading + warm glow near the base
      ctx.save();
      ctx.clip();
      const side = ctx.createLinearGradient(0, 0, w, 0);
      side.addColorStop(0, 'rgba(30,10,0,0.32)');
      side.addColorStop(0.22, 'rgba(30,10,0,0)');
      side.addColorStop(0.7, 'rgba(30,10,0,0)');
      side.addColorStop(1, 'rgba(30,10,0,0.38)');
      ctx.fillStyle = side;
      ctx.fillRect(0, 0, w, hgt);
      const glow = ctx.createRadialGradient(w * 0.42, hgt * 0.86, 0, w * 0.42, hgt * 0.86, w * 0.55);
      glow.addColorStop(0, rgba(mix(light, [255, 245, 220], 0.3), 0.42));
      glow.addColorStop(1, rgba(light, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, hgt);

      // rising bubbles, each with a bright rim and a specular dot
      if (bubbles.length) {
        for (let bi = bubbles.length - 1; bi >= 0; bi--) {
          const b = bubbles[bi];
          const col = Math.min(COLUMNS - 1, Math.max(0, Math.round(b.x * (COLUMNS - 1))));
          const sy = front(col);
          const bx = b.x * w + Math.sin(time * b.wob + b.ph) * w * 0.012;
          const by = sy + (1 - b.y) * (hgt - 6 - sy);
          ctx.beginPath();
          ctx.arc(bx, by, b.r, 0, Math.PI * 2);
          ctx.fillStyle = rgba(mix(liquid, [255, 250, 235], 0.3), 0.14);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,247,225,0.5)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(bx - b.r * 0.32, by - b.r * 0.36, Math.max(0.4, b.r * 0.26), 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fill();
        }
      }

      ctx.restore();

      // back rim of the surface catches light
      ctx.beginPath();
      ctx.moveTo(0, back(0));
      trace(back);
      ctx.strokeStyle = rgba(mix(light, [255, 255, 255], 0.25), 0.5);
      ctx.lineWidth = 1;
      ctx.stroke();

      // front meniscus line
      ctx.beginPath();
      ctx.moveTo(0, front(0));
      trace(front);
      ctx.strokeStyle = 'rgba(255,248,230,0.75)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    };

    const resize = () => {
      const r = glass.getBoundingClientRect();
      const cr = caustic.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (r.width && r.height) {
        w = r.width;
        hgt = r.height;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(hgt * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      if (cr.width && cr.height) {
        cw = cr.width;
        ch = cr.height;
        caustic.width = Math.round(cw * dpr);
        caustic.height = Math.round(ch * dpr);
        cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      draw();
      drawCaustic(clamp(s.fill), 0);
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
      for (let bi = bubbles.length - 1; bi >= 0; bi--) {
        bubbles[bi].y += bubbles[bi].vy * dt;
        if (bubbles[bi].y >= 1) bubbles.splice(bi, 1);
      }
      flare *= Math.exp(-1.6 * dt);
    };

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      time += dt;
      if (s.fill !== s.to || s.start >= 0) {
        if (s.start < 0) s.start = now;
        const t = clamp((now - s.start) / FILL_MS);
        s.fill = s.from + (s.to - s.from) * easeOut(t);
        if (Math.random() < 0.3) spawnBubble();
        if (Math.random() < 0.3) s.v[Math.floor(COLUMNS * (0.35 + Math.random() * 0.3))] += (1 - t) * 2.2;
        if (t >= 1) {
          s.fill = s.to;
          s.start = -1;
          s.tiltV += 0.25;
          if (s.to >= 1) {
            if (!poppedRef.current) {
              syncPopped(true);
              for (let i = 0; i < 22; i++) spawnBubble(0.25 + Math.random() * 0.5, 0.6 + Math.random() * 0.32, 0.8, 2);
              s.v[Math.floor(COLUMNS * 0.5)] += -3.2;
              s.tiltV += 0.5;
              flare = 1;
            }
          } else {
            syncPopped(false);
          }
        }
      }
      idle -= dt;
      if (idle <= 0) {
        idle = 2.6 + Math.random() * 2.8;
        spawnBubble();
        s.v[Math.floor(COLUMNS * (0.3 + Math.random() * 0.4))] += -0.35;
      }
      step(dt);
      draw();
      const energy = s.h.reduce((a, x) => a + Math.abs(x), 0) / COLUMNS;
      drawCaustic(clamp(s.fill), energy);
      writeText();
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || reduced || !inView) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    const renderStatic = () => {
      s.fill = s.to;
      s.start = -1;
      s.h.fill(0);
      s.v.fill(0);
      s.tilt = 0;
      s.tiltV = 0;
      if (s.to >= 1 && !poppedRef.current) {
        for (let i = 0; i < 10; i++) bubbles.push({
          x: 0.2 + Math.random() * 0.6,
          y: 0.2 + Math.random() * 0.65,
          r: Math.max(0.7, (0.8 + Math.random() * 1.4) * (w / 280)),
          vy: 0.3,
          wob: 5,
          ph: Math.random() * Math.PI * 2,
        });
      } else if (s.to < 1) {
        bubbles.length = 0;
      }
      syncPopped(s.to >= 1);
      draw();
      drawCaustic(clamp(s.fill), 0);
      writeText();
    };

    readColor();
    if (reduced) {
      renderStatic();
    }
    wake.current = () => {
      readColor();
      if (reduced) {
        renderStatic();
      } else {
        start();
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(glass);
    ro.observe(caustic);
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

  const rootStyle = {
    '--gj-liquid': liquidColor,
    '--gj-fill': clamp(ratio, 0, 1).toFixed(4),
  } as CSSProperties;
  const amountStyle = { '--gj-chars': Math.max(6, amountText.length) } as CSSProperties;

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <div className={styles.layout}>
      <div className={styles.readout} aria-hidden="true">
        <span className={styles.figure}>
          <span ref={numeralRef}>{percent}</span>
          <span className={styles.pct}>%</span>
        </span>
        <span className={styles.caption}>of goal</span>
        {popped && reachedText && <span className={styles.pill}>{reachedText}</span>}
      </div>

      <div className={styles.stage}>
        <span className={styles.halo} aria-hidden="true" />
        <div className={styles.shelf} aria-hidden="true" />
        <canvas ref={causticRef} className={styles.caustics} aria-hidden="true" />

        <div
          className={styles.jar}
          role="progressbar"
          tabIndex={0}
          aria-labelledby={label ? labelId : undefined}
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
          <span className={styles.shadow} aria-hidden="true" />
          <span
            className={[styles.lidShadow, popped ? styles.lidShadowOpen : ''].filter(Boolean).join(' ')}
            aria-hidden="true"
          />
          <div className={[styles.lid, popped ? styles.lidPopped : ''].filter(Boolean).join(' ')} aria-hidden="true" />
          <span className={styles.lip} aria-hidden="true" />
          <span className={styles.neck} aria-hidden="true" />
          <div ref={glassRef} className={styles.glass}>
            <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
            <div className={styles.paper}>
              {label && <p id={labelId} className={styles.name}>{label}</p>}
              <span ref={amountRef} className={styles.amount} style={amountStyle}>
                {amountText}
              </span>
              <span className={styles.rule} aria-hidden="true" />
              <span className={styles.goalLine}>of {goalText}</span>
            </div>
            <span className={styles.highlight} aria-hidden="true" />
            <span className={styles.highlightThin} aria-hidden="true" />
            <span className={styles.lens} aria-hidden="true" />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
```

```css
@font-face {
  font-family: 'Schibsted Grotesk';
  src: url('./fonts/schibsted-500.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Schibsted Grotesk';
  src: url('./fonts/schibsted-700.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

.root {
  --gj-liquid: #c9780f;
  --gj-ink: #34210f;
  --gj-ink-soft: rgba(52, 33, 15, 0.72);
  --gj-cream: #f7f0e1;
  --gj-ground-1: #f8f1e3;
  --gj-ground-2: #ecdfc6;
  --gj-shelf-top: #e6d3ad;
  --gj-shelf-face: #d3bb8e;
  --gj-shelf-line: rgba(120, 88, 48, 0.55);
  --gj-glass-tint: rgba(110, 70, 26, 0.12);
  --gj-font-display: 'Schibsted Grotesk', 'Avenir Next', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --gj-font-ui: 'Schibsted Grotesk', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --gj-fill: 0.62;

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 24px;
  background:
    radial-gradient(60% 50% at 18% 0%, #fffaf0 0%, rgba(255, 250, 240, 0) 70%),
    linear-gradient(180deg, var(--gj-ground-1) 0%, var(--gj-ground-2) 100%);
  color: var(--gj-ink);
  font-family: var(--gj-font-ui);
  font-weight: 500;
}

.root ::selection {
  background: #f0c46a;
  color: #2f1d0e;
}

.layout {
  display: grid;
  justify-items: center;
}

.readout {
  position: relative;
  z-index: 6;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: center;
  gap: 4px 10px;
  padding: 32px 24px 0;
  text-align: center;
  pointer-events: none;
  user-select: none;
}

.figure {
  display: inline-flex;
  align-items: flex-start;
  gap: 0.04em;
  font-family: var(--gj-font-display);
  font-weight: 700;
  font-size: clamp(56px, 17cqi, 92px);
  line-height: 0.9;
  letter-spacing: -0.05em;
  font-variant-numeric: tabular-nums lining-nums;
  white-space: nowrap;
}

.pct {
  font-size: 0.4em;
  line-height: 1;
  margin-block-start: 0.1em;
  letter-spacing: 0;
}

.caption {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gj-ink-soft);
}

.pill {
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid rgba(52, 33, 15, 0.28);
  background: rgba(255, 250, 238, 0.7);
  color: var(--gj-ink);
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  animation: gjPill 560ms cubic-bezier(0.2, 0.9, 0.3, 1) both;
}

@keyframes gjPill {
  0% {
    opacity: 0;
    transform: translateY(6px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.stage {
  --gj-jw: min(54cqi, 240px);
  position: relative;
  inline-size: 100%;
  block-size: calc(var(--gj-jw) / 0.7 + 118px);
}

.halo {
  position: absolute;
  z-index: 2;
  inset-block-end: 4%;
  inset-inline-start: 50%;
  inline-size: min(70%, 380px);
  aspect-ratio: 1;
  transform: translateX(-50%);
  background: radial-gradient(closest-side, rgba(255, 213, 148, 0.3), rgba(255, 213, 148, 0) 70%);
  filter: blur(22px);
  mix-blend-mode: screen;
  pointer-events: none;
}

.shelf {
  position: absolute;
  z-index: 2;
  inset-block-end: 0;
  inset-inline: 0;
  block-size: 54px;
  background: linear-gradient(180deg, var(--gj-shelf-line) 0 1px, var(--gj-shelf-top) 1px 36%, var(--gj-shelf-face) 100%);
}

.caustics {
  position: absolute;
  z-index: 3;
  inset-block-end: 0;
  inset-inline: 0;
  inline-size: 100%;
  block-size: 54px;
  filter: blur(6px);
  mix-blend-mode: screen;
  pointer-events: none;
}

.jar {
  position: absolute;
  z-index: 5;
  inset-block-end: 34px;
  inset-inline-start: 50%;
  inline-size: var(--gj-jw);
  aspect-ratio: 0.7;
  transform: translateX(-50%);
  display: grid;
  grid-template-rows: 7% 4.5% 1fr;
  justify-items: center;
  cursor: default;
  touch-action: pan-y;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  border-radius: 20px;
}

.jar:focus-visible {
  box-shadow: 0 0 0 3px var(--gj-ground-1), 0 0 0 5px var(--gj-ink);
}

.shadow {
  position: absolute;
  inset-inline: 6%;
  inset-block-end: -3%;
  block-size: 6%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(52, 28, 8, 0.38), transparent);
  filter: blur(5px);
  pointer-events: none;
}

.lip {
  grid-row: 1;
  align-self: end;
  inline-size: 50%;
  block-size: 60%;
  border-radius: 3px 3px 1px 1px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.04) 30%, rgba(255, 255, 255, 0.04) 74%, rgba(255, 255, 255, 0.22)),
    var(--gj-glass-tint);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.38);
}

.neck {
  grid-row: 2;
  inline-size: 52%;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.04) 28%, rgba(255, 255, 255, 0.04) 76%, rgba(255, 255, 255, 0.2)),
    var(--gj-glass-tint);
  box-shadow: inset 1px 0 0 rgba(255, 255, 255, 0.34), inset -1px 0 0 rgba(255, 255, 255, 0.2);
}

.lid {
  position: absolute;
  z-index: 4;
  inset-block-start: -1%;
  inset-inline-start: 50%;
  inline-size: 56%;
  block-size: 8.4%;
  transform: translateX(-50%);
  border-radius: 6px 6px 3px 3px / 8px 8px 3px 3px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.34) 0, rgba(255, 255, 255, 0) 38%),
    linear-gradient(90deg, #8a7048 0%, #c6ac80 26%, #e0cca3 40%, #b79c6f 66%, #7a6240 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 246, 224, 0.7),
    inset 0 -1px 0 rgba(60, 40, 14, 0.45),
    0 2px 4px -1px rgba(56, 28, 6, 0.35);
  transition: transform 600ms cubic-bezier(0.2, 0.9, 0.3, 1);
  pointer-events: none;
}

.lidPopped {
  transform: translateX(-50%) translateY(-10px) rotate(4deg);
  animation: gjPop 900ms cubic-bezier(0.3, 1.1, 0.34, 1) both;
}

@keyframes gjPop {
  0% {
    transform: translateX(-50%);
  }
  40% {
    transform: translateX(-50%) translateY(-34px) rotate(-5deg);
  }
  66% {
    transform: translateX(-50%) translateY(-18px) rotate(3deg);
  }
  100% {
    transform: translateX(-50%) translateY(-10px) rotate(4deg);
  }
}

.lidShadow {
  position: absolute;
  z-index: 3;
  inset-block-start: 6.6%;
  inset-inline-start: 50%;
  inline-size: 52%;
  block-size: 2%;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(54, 28, 8, 0.4), transparent);
  filter: blur(2px);
  pointer-events: none;
  transition: opacity 400ms ease;
}

.lidShadowOpen {
  opacity: 0.35;
}

.glass {
  grid-row: 3;
  position: relative;
  container-type: inline-size;
  inline-size: 100%;
  block-size: 100%;
  box-sizing: border-box;
  overflow: hidden;
  border: 2px solid rgba(255, 249, 238, 0.5);
  border-radius: 26% 26% 7% 7% / 12% 12% 3.5% 3.5%;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0) 30%),
    var(--gj-glass-tint);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.22),
    inset 10px 0 18px rgba(255, 246, 226, 0.1),
    inset -12px 0 20px rgba(34, 16, 2, 0.16),
    0 18px 28px -18px rgba(52, 26, 8, 0.5);
}

.canvas {
  position: absolute;
  inset: 0;
  display: block;
  inline-size: 100%;
  block-size: 100%;
}

.paper {
  position: absolute;
  z-index: 2;
  inset-inline: 12%;
  inset-block-end: 11%;
  box-sizing: border-box;
  padding: 3.6cqi 3cqi 3.8cqi;
  display: grid;
  justify-items: center;
  text-align: center;
  background: linear-gradient(180deg, #fbf6ea, var(--gj-cream));
  border-radius: 3px;
  box-shadow:
    inset 0 0 0 1px rgba(52, 33, 15, 0.14),
    0 6px 12px -8px rgba(52, 28, 8, 0.45);
  color: var(--gj-ink);
}

.name {
  margin: 0;
  padding-inline: 1cqi;
  font-size: clamp(10.5px, 3cqi, 12px);
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gj-ink-soft);
  overflow-wrap: anywhere;
  text-wrap: balance;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.amount {
  margin-block-start: 1.6cqi;
  font-family: var(--gj-font-display);
  font-weight: 700;
  font-size: min(12cqi, calc(140cqi / var(--gj-chars)));
  line-height: 1.1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.rule {
  inline-size: 28%;
  block-size: 1px;
  margin-block: 1.8cqi 1.6cqi;
  background: rgba(52, 33, 15, 0.3);
}

.goalLine {
  padding-inline: 1cqi;
  font-size: clamp(11.5px, 3.3cqi, 13px);
  font-weight: 500;
  color: var(--gj-ink-soft);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.highlight {
  position: absolute;
  inset-inline-start: 7%;
  inset-block: 14% 12%;
  inline-size: 3.5%;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.5) 20%, rgba(255, 255, 255, 0.22) 80%, rgba(255, 255, 255, 0));
  mix-blend-mode: screen;
  pointer-events: none;
}

.highlightThin {
  position: absolute;
  inset-inline-end: 6%;
  inset-block: 18% 20%;
  inline-size: 1.6%;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.34) 40%, rgba(255, 255, 255, 0));
  mix-blend-mode: screen;
  pointer-events: none;
}

.lens {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 36%, rgba(255, 250, 238, 0.09) 46%, transparent 58%);
  mix-blend-mode: screen;
  pointer-events: none;
}

@container (min-width: 600px) {
  .layout {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: center;
  }

  .readout {
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    padding: 32px 0 32px 8%;
    justify-self: stretch;
    text-align: start;
  }

  .figure {
    font-size: clamp(88px, 14cqi, 140px);
  }

  .stage {
    --gj-jw: min(28cqi, 300px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lid,
  .lidPopped,
  .lidShadow,
  .pill {
    animation: none;
    transition: none;
  }
}
```
