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
  const percentRef = useRef<HTMLSpanElement>(null);
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
    let idleTimer = 0;
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
      if (percentRef.current) percentRef.current.textContent = `${pct}%`;
      if (numeralRef.current) numeralRef.current.textContent = `${pct}%`;
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
      body.addColorStop(0, rgba(mix(liquid, light, 0.35), 0.96));
      body.addColorStop(0.45, rgba(liquid, 0.97));
      body.addColorStop(1, rgba(deep, 0.98));
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
          ctx.strokeStyle = 'rgba(255,247,225,0.85)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(bx - b.r * 0.32, by - b.r * 0.36, Math.max(0.4, b.r * 0.26), 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.fill();
        }
      }

      // refraction glints where the liquid climbs the inner walls
      ctx.fillStyle = 'rgba(255,246,224,0.5)';
      ctx.fillRect(w * 0.035, level - 3, 2, 9);
      ctx.fillRect(w * 0.965 - 2, level - 3, 2, 9);
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

    const calm = () => {
      if (s.start >= 0 || bubbles.length > 0) return false;
      if (Math.abs(s.tilt) > 0.004 || Math.abs(s.tiltV) > 0.01) return false;
      for (let i = 0; i < COLUMNS; i++) if (Math.abs(s.h[i]) > 0.05 || Math.abs(s.v[i]) > 0.02) return false;
      return true;
    };

    const scheduleIdle = () => {
      if (idleTimer || reduced || !inView) return;
      idleTimer = window.setTimeout(() => {
        idleTimer = 0;
        spawnBubble();
        s.v[Math.floor(COLUMNS * (0.3 + Math.random() * 0.4))] += -0.35;
        start();
      }, 2600 + Math.random() * 2800);
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
      step(dt);
      draw();
      const energy = s.h.reduce((a, x) => a + Math.abs(x), 0) / COLUMNS;
      drawCaustic(clamp(s.fill), energy);
      writeText();
      if (calm()) {
        running = false;
        s.h.fill(0);
        s.v.fill(0);
        draw();
        drawCaustic(clamp(s.fill), 0);
        writeText();
        scheduleIdle();
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
      window.clearTimeout(idleTimer);
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
      <div className={styles.stage}>
        <span className={styles.lightGlow} aria-hidden="true" />
        <span className={styles.halo} aria-hidden="true" />
        <span ref={numeralRef} className={styles.numeral} aria-hidden="true">
          {percent}%
        </span>
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
            className={[styles.corkShadow, popped ? styles.corkShadowOpen : ''].filter(Boolean).join(' ')}
            aria-hidden="true"
          />
          <div
            className={[styles.cork, popped ? styles.corkPopped : ''].filter(Boolean).join(' ')}
            aria-hidden="true"
          >
            <span className={styles.corkSkin} aria-hidden="true" />
          </div>
          <span className={styles.lip} aria-hidden="true" />
          <span className={styles.neck} aria-hidden="true" />
          <div ref={glassRef} className={styles.glass}>
            <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
            <span className={styles.ticks} aria-hidden="true" />
            <div className={styles.paper}>
              {label && <p id={labelId} className={styles.name}>{label}</p>}
              {label && <span className={styles.rule} aria-hidden="true" />}
              <span ref={amountRef} className={styles.amount} style={amountStyle}>
                {amountText}
              </span>
              <span className={styles.rule} aria-hidden="true" />
              <span className={styles.goalLine}>
                <span ref={percentRef}>{percent}%</span> of {goalText}
              </span>
              <span className={styles.paperShade} aria-hidden="true" />
            </div>
            <span className={styles.base} aria-hidden="true" />
            <span className={styles.highlight} aria-hidden="true" />
            <span className={styles.highlightThin} aria-hidden="true" />
            <span className={styles.lens} aria-hidden="true" />
            <span className={styles.grainGlass} aria-hidden="true" />
          </div>
        </div>

        {popped && reachedText && <span className={styles.pill}>{reachedText}</span>}
        <span className={styles.grain} aria-hidden="true" />
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
  --gj-ink: #3b2412;
  --gj-ink-soft: rgba(59, 36, 18, 0.78);
  --gj-cream: #f6eedd;
  --gj-ground-1: #f7efdf;
  --gj-ground-2: #eadcc0;
  --gj-shelf-top: #e9d5ae;
  --gj-shelf-face: #d6bd8e;
  --gj-shelf-line: #a8824c;
  --gj-glass-tint: rgba(96, 58, 20, 0.2);
  --gj-font-display: 'Schibsted Grotesk', 'Avenir Next', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --gj-font-ui: 'Schibsted Grotesk', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --gj-fill: 0.62;
  --gj-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.32  0 0 0 0 0.2  0 0 0 0 0.08  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --gj-fibers: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='.03 .09' numOctaves='2' seed='4'/><feColorMatrix values='0 0 0 0 0.98  0 0 0 0 0.92  0 0 0 0 0.8  0 0 0 1.4 -0.62'/></filter><rect width='100%' height='100%' filter='url(%23f)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 28px;
  background:
    radial-gradient(46% 58% at 14% 0%, #fff8e9 0%, rgba(255, 248, 233, 0) 62%),
    linear-gradient(180deg, var(--gj-ground-1) 0%, var(--gj-ground-2) 100%);
  color: var(--gj-ink);
  font-family: var(--gj-font-ui);
  font-weight: 500;
}

.root ::selection {
  background: #f0c46a;
  color: #2f1d0e;
}

.stage {
  position: relative;
  block-size: clamp(580px, 165cqi, 700px);
}

.lightGlow {
  position: absolute;
  z-index: 1;
  inset-block-start: -18%;
  inset-inline-start: -14%;
  inline-size: 78%;
  aspect-ratio: 1.3;
  background: radial-gradient(closest-side, rgba(255, 250, 236, 0.95), rgba(255, 250, 236, 0) 70%);
  pointer-events: none;
}

.halo {
  position: absolute;
  z-index: 2;
  inset-block-end: 6%;
  inset-inline-start: 50%;
  inline-size: 58%;
  aspect-ratio: 1;
  transform: translateX(-50%);
  background: radial-gradient(closest-side, rgba(255, 213, 148, 0.38), rgba(255, 213, 148, 0) 68%);
  filter: blur(26px);
  mix-blend-mode: screen;
  pointer-events: none;
}

.shelf {
  position: absolute;
  z-index: 2;
  inset-block-end: 0;
  inset-inline: 0;
  block-size: 15%;
  background: linear-gradient(180deg, var(--gj-shelf-line) 0 2px, var(--gj-shelf-top) 2px 38%, var(--gj-shelf-face) 100%);
}

.numeral {
  position: absolute;
  z-index: 4;
  inset-block-start: 4%;
  inset-inline: 0;
  margin: 0;
  text-align: center;
  font-family: var(--gj-font-display);
  font-weight: 700;
  font-size: clamp(64px, 23cqi, 96px);
  line-height: 0.82;
  letter-spacing: -0.05em;
  color: var(--gj-ink);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.caustics {
  position: absolute;
  z-index: 3;
  inset-block-end: 1.5%;
  inset-inline: 0;
  inline-size: 100%;
  block-size: 14%;
  filter: blur(6px);
  mix-blend-mode: screen;
  pointer-events: none;
}

.grain {
  position: absolute;
  inset: 0;
  z-index: 7;
  background-image: var(--gj-noise);
  opacity: 0.12;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.pill {
  position: absolute;
  z-index: 6;
  inset-block-start: 6%;
  inset-inline-end: 5%;
  padding: 8px 16px;
  border-radius: 999px;
  background: linear-gradient(180deg, #fbf4e5, var(--gj-cream));
  border: 1px solid rgba(59, 36, 18, 0.5);
  color: var(--gj-ink);
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  box-shadow: 0 12px 24px -12px rgba(60, 32, 8, 0.55);
  animation: gjPill 640ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes gjPill {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.7);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.jar {
  position: absolute;
  z-index: 5;
  inset-block-end: 14%;
  inset-inline-start: 50%;
  inline-size: min(58cqi, 250px);
  aspect-ratio: 0.74;
  transform: translateX(-50%);
  display: grid;
  grid-template-rows: 11% 7% 1fr;
  justify-items: center;
  cursor: default;
  touch-action: pan-y;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  border-radius: 24px;
}

.jar:focus-visible {
  box-shadow: 0 0 0 3px var(--gj-ground-1), 0 0 0 5px var(--gj-ink);
}

.shadow {
  position: absolute;
  inset-inline: 12%;
  inset-block-end: -4.5%;
  block-size: 7%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(52, 28, 8, 0.42), transparent);
  filter: blur(5px);
  pointer-events: none;
}

.lip {
  grid-row: 1;
  align-self: end;
  inline-size: 46%;
  block-size: 34%;
  border-radius: 30% 30% 50% 50% / 70% 70% 40% 40%;
  background:
    linear-gradient(180deg, rgba(255, 244, 222, 0.5), rgba(255, 244, 222, 0.08) 55%, rgba(50, 26, 6, 0.18)),
    var(--gj-glass-tint);
  box-shadow:
    0 2px 4px rgba(60, 30, 6, 0.2),
    inset 0 -2px 3px rgba(50, 24, 4, 0.25);
}

.neck {
  grid-row: 2;
  inline-size: 55%;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.42) 15%, rgba(255, 255, 255, 0.04) 40%, rgba(255, 255, 255, 0.04) 78%, rgba(255, 255, 255, 0.26) 96%),
    var(--gj-glass-tint);
  box-shadow: inset 0 -8px 10px rgba(50, 24, 4, 0.22);
}

.cork {
  position: absolute;
  z-index: 4;
  inset-block-start: 1%;
  inset-inline-start: 50%;
  inline-size: 31%;
  block-size: 13.5%;
  transform: translateX(-50%);
  border-radius: 48% 48% 20% 20% / 62% 62% 26% 26%;
  background: radial-gradient(circle at 34% 26%, #e6c08a 0%, #cf9f5f 48%, #a1763c 100%);
  box-shadow:
    inset 0 2px 2px rgba(255, 238, 205, 0.55),
    inset 0 -4px 6px rgba(96, 56, 16, 0.4),
    0 3px 5px -1px rgba(56, 28, 6, 0.4);
  transition: transform 650ms cubic-bezier(0.2, 0.9, 0.3, 1);
  pointer-events: none;
}

.corkSkin {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image: var(--gj-noise);
  opacity: 0.35;
  mix-blend-mode: multiply;
}

.corkPopped {
  transform: translateX(-50%) translateY(-15px) rotate(12deg);
  animation: gjPop 950ms cubic-bezier(0.3, 1.1, 0.34, 1) both;
}

@keyframes gjPop {
  0% {
    transform: translateX(-50%);
  }
  40% {
    transform: translateX(-50%) translateY(-76px) rotate(-11deg);
  }
  66% {
    transform: translateX(-50%) translateY(-54px) rotate(6deg);
  }
  100% {
    transform: translateX(-50%) translateY(-15px) rotate(12deg);
  }
}

.corkShadow {
  position: absolute;
  z-index: 3;
  inset-block-start: 10.2%;
  inset-inline-start: 50%;
  inline-size: 34%;
  block-size: 3%;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(54, 28, 8, 0.5), transparent);
  filter: blur(2px);
  pointer-events: none;
}

.corkShadowOpen {
  opacity: 0.3;
}

.glass {
  grid-row: 3;
  position: relative;
  container-type: inline-size;
  inline-size: 100%;
  block-size: 100%;
  box-sizing: border-box;
  overflow: hidden;
  border: 5px solid rgba(255, 248, 236, 0.3);
  border-radius: 42% 42% 15% 15% / 26% 26% 7% 7%;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0) 32%),
    var(--gj-glass-tint);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.42),
    inset 16px 0 24px rgba(255, 246, 226, 0.14),
    inset -18px 0 26px rgba(34, 16, 2, 0.28),
    inset 0 -14px 30px rgba(30, 14, 2, 0.3),
    0 1px 0 rgba(255, 255, 255, 0.4),
    0 22px 34px -18px rgba(52, 26, 8, 0.55);
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
  inset-block: 12% 12%;
  inline-size: 7%;
  background: repeating-linear-gradient(
    0deg,
    rgba(255, 250, 240, 0.5) 0 1.5px,
    transparent 1.5px calc(25% - 0.4px),
    rgba(255, 250, 240, 0.5) calc(25% - 0.4px) calc(25% + 1px)
  );
  -webkit-mask: linear-gradient(90deg, #000, rgba(0, 0, 0, 0.55));
  mask: linear-gradient(90deg, #000, rgba(0, 0, 0, 0.55));
  opacity: 0.45;
  pointer-events: none;
}

.paper {
  position: absolute;
  z-index: 2;
  inset-inline: 8%;
  inset-block-start: 40%;
  box-sizing: border-box;
  padding: 4cqi 3cqi 4.5cqi;
  display: grid;
  justify-items: center;
  text-align: center;
  background: linear-gradient(180deg, #fbf4e5, var(--gj-cream));
  border: 1px solid rgba(59, 36, 18, 0.55);
  border-radius: 4px;
  box-shadow: 0 8px 16px -10px rgba(52, 28, 8, 0.5);
  color: var(--gj-ink);
}

.name {
  position: relative;
  z-index: 1;
  margin: 0;
  padding-inline: 1cqi;
  font-size: clamp(12px, 3.6cqi, 15px);
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.rule {
  position: relative;
  z-index: 1;
  inline-size: 76%;
  block-size: 1px;
  margin-block: 1.6cqi 1.4cqi;
  background: rgba(59, 36, 18, 0.35);
}

.amount {
  position: relative;
  z-index: 1;
  font-family: var(--gj-font-display);
  font-weight: 700;
  font-size: min(13cqi, calc(150cqi / var(--gj-chars)));
  line-height: 1.05;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.goalLine {
  position: relative;
  z-index: 1;
  margin-block-start: 1.8cqi;
  padding-inline: 1cqi;
  font-size: clamp(11.5px, 3.4cqi, 14px);
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--gj-ink-soft);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.paperShade {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image:
    var(--gj-fibers),
    linear-gradient(90deg, rgba(66, 40, 14, 0.16), rgba(66, 40, 14, 0) 24%, rgba(66, 40, 14, 0) 76%, rgba(66, 40, 14, 0.22));
  opacity: 0.5;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.base {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  block-size: 9%;
  background: linear-gradient(180deg, rgba(255, 250, 240, 0) 0, rgba(255, 250, 240, 0.12) 40%, rgba(255, 250, 240, 0.26) 100%);
  pointer-events: none;
}

.highlight {
  position: absolute;
  inset-inline-start: 8%;
  inset-block: 9% 16%;
  inline-size: 8%;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.55) 20%, rgba(255, 255, 255, 0.35) 70%, rgba(255, 255, 255, 0));
  filter: blur(1.5px);
  mix-blend-mode: screen;
  pointer-events: none;
}

.highlightThin {
  position: absolute;
  inset-inline-end: 5%;
  inset-block: 14% 22%;
  inline-size: 2.4%;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.45) 40%, rgba(255, 255, 255, 0));
  filter: blur(0.6px);
  mix-blend-mode: screen;
  pointer-events: none;
}

.lens {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 34%, rgba(255, 250, 238, 0.13) 44%, rgba(255, 255, 255, 0.05) 52%, transparent 62%);
  mix-blend-mode: screen;
  pointer-events: none;
}

.grainGlass {
  position: absolute;
  inset: 0;
  background-image: var(--gj-noise);
  opacity: 0.14;
  mix-blend-mode: overlay;
  pointer-events: none;
}

@container (min-width: 560px) {
  .stage {
    block-size: clamp(520px, 62cqi, 720px);
  }

  .numeral {
    inset-inline: auto;
    inset-inline-start: 29%;
    inset-block-start: 9%;
    text-align: start;
    font-size: clamp(88px, 15.5cqi, 200px);
  }

  .jar {
    inset-inline-start: auto;
    inset-inline-end: 11%;
    transform: none;
    inline-size: min(34cqi, 370px);
  }

  .halo {
    inset-inline-start: auto;
    inset-inline-end: 6%;
    transform: none;
  }

  .caustics {
    inset-inline-start: auto;
    inset-inline-end: 3%;
    inline-size: 48%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cork,
  .corkPopped,
  .pill {
    animation: none;
    transition: none;
  }
}
```
