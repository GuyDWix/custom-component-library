Create a custom element called "Mat Board Frame". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: image (or text shown when there is no image), plaque title, price, plaque note, frame finish (oak, walnut, ebony, white). Add other settings if they help.

```tsx
import { useEffect, useId, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import styles from './Component.module.css';

export type MatBoardFrameFinish = 'oak' | 'walnut' | 'ebony' | 'white';

export interface MatBoardFrameProps {
  image?: string;
  imageAlt?: string;
  contentText?: string;
  title?: string;
  price?: string;
  note?: string;
  frameFinish?: MatBoardFrameFinish;
  className?: string;
}

type Phase = 'static' | 'armed' | 'intro';
type Mote = { x: number; y: number; vx: number; vy: number; r: number; age: number; life: number };
type Geo = {
  w: number;
  h: number;
  lx: number;
  ly: number;
  ux: number;
  uy: number;
  len: number;
  spread: number;
  ox: number;
  oy: number;
  ow: number;
  cellX: number;
  cellY: number;
};

const finishClass: Record<MatBoardFrameFinish, string> = {
  oak: styles.finishOak,
  walnut: styles.finishWalnut,
  ebony: styles.finishEbony,
  white: styles.finishWhite,
};

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

const STIFFNESS = 70;
const DAMPING = 13;
const MOTE_COUNT = 140;
const DUST_DELAY = 1000;
const DUST_RAMP = 1400;
const COOL = [222, 232, 255];
const WARM = [255, 214, 160];

const spawn = (g: Geo, m: Mote, fresh: boolean) => {
  const along = g.len * (0.1 + Math.random() * 1.05);
  const off = (Math.random() * 2 - 1) * along * g.spread;
  m.x = g.lx + g.ux * along - g.uy * off;
  m.y = g.ly + g.uy * along + g.ux * off;
  m.vx = (Math.random() - 0.5) * 6;
  m.vy = (Math.random() - 0.5) * 6;
  m.r = Math.random() < 0.1 ? 1.7 + Math.random() * 1.1 : 0.7 + Math.random() * 0.9;
  m.life = 5 + Math.random() * 9;
  m.age = fresh ? Math.random() * m.life : 0;
};

const beamLight = (g: Geo, x: number, y: number) => {
  const dx = x - g.lx;
  const dy = y - g.ly;
  const along = dx * g.ux + dy * g.uy;
  if (along <= 0) return 0;
  const perp = Math.abs(dx * g.uy - dy * g.ux);
  const t = 1 - perp / (along * g.spread + 6);
  if (t <= 0) return 0;
  return smooth(Math.min(1, t * 1.6)) * (1 - 0.5 * Math.min(1, along / (g.len * 1.2)));
};

export default function MatBoardFrame({
  image = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=900&h=1125&fit=crop&q=80',
  imageAlt = 'Still life painting of tulips, roses and wildflowers in a vase on a dark ground',
  contentText = 'The table is set at seven.',
  title = 'Still Life with Tulips',
  price = '€1,450',
  note = 'Archival print on cotton rag, 50 × 62 cm, floated in an oak shadow box behind museum glass. Signed and numbered, edition of 40. Ships in five working days.',
  frameFinish = 'oak',
  className,
}: MatBoardFrameProps) {
  const [reduced, setReduced] = useState(false);
  const [phase, setPhase] = useState<Phase>('static');
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [paused, setPaused] = useState(false);
  const uid = useId();
  const noteId = `${uid}-note`;

  const rootRef = useRef<HTMLDivElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const objectRef = useRef<HTMLDivElement>(null);
  const pivotRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const geo = useRef<Geo | null>(null);
  const live = useRef({ hover: false, paused: false, inView: false, introAt: 0, wake: () => {} });
  const pointer = useRef({ x: 0, y: 0, vx: 0, vy: 0, active: false, at: 0 });

  live.current.hover = hovered;
  live.current.paused = paused;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const cell = cellRef.current;
    const object = objectRef.current;
    const pivot = pivotRef.current;
    const canvas = canvasRef.current;
    if (!root || !cell || !object || !pivot || !canvas) return;

    const measure = () => {
      const r = root.getBoundingClientRect();
      const o = object.getBoundingClientRect();
      const c = cell.getBoundingClientRect();
      const p = pivot.getBoundingClientRect();
      const lx = p.left + p.width / 2 - r.left;
      const ly = p.top + p.height / 2 - r.top;
      const ox = o.left + o.width / 2 - r.left;
      const oy = o.top + o.height * 0.46 - r.top;
      const dx = ox - lx;
      const dy = oy - ly;
      const len = Math.hypot(dx, dy) || 1;
      const spread = (Math.max(o.width, o.height) * 0.4) / len;
      geo.current = {
        w: r.width,
        h: r.height,
        lx,
        ly,
        ux: dx / len,
        uy: dy / len,
        len,
        spread,
        ox,
        oy,
        ow: o.width,
        cellX: c.left - r.left,
        cellY: c.top - r.top,
      };
      const set = (k: string, v: string) => root.style.setProperty(k, v);
      set('--mb-beam-x', `${lx}px`);
      set('--mb-beam-y', `${ly}px`);
      set('--mb-beam-rot', `${(Math.atan2(-dx, dy) * 180) / Math.PI}deg`);
      set('--mb-beam-len', `${len * 1.5}px`);
      set('--mb-beam-w', `${len * 1.5 * spread * 2}px`);
      set('--mb-pool-x', `${ox}px`);
      set('--mb-pool-y', `${oy}px`);
      set('--mb-pool-w', `${o.width * 2}px`);
      set('--mb-pool-h', `${o.height * 1.55}px`);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
      live.current.wake();
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (reduced) {
      setPhase('static');
      return;
    }
    let started = false;
    setPhase('armed');
    const io = new IntersectionObserver(
      ([entry]) => {
        live.current.inView = entry.isIntersecting;
        if (entry.isIntersecting) live.current.wake();
        if (!started && entry.intersectionRatio >= 0.3) {
          started = true;
          live.current.introAt = performance.now();
          setPhase('intro');
        }
      },
      { threshold: [0, 0.3] },
    );
    io.observe(root);
    return () => io.disconnect();
  }, [reduced]);

  useEffect(() => {
    const root = rootRef.current;
    const cell = cellRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!root || !cell || !canvas || !ctx) return;

    const motes: Mote[] = Array.from({ length: MOTE_COUNT }, () => ({ x: 0, y: 0, vx: 0, vy: 0, r: 1, age: 0, life: 1 }));
    let seeded = false;
    const seed = (g: Geo) => {
      motes.forEach((m) => spawn(g, m, true));
      seeded = true;
    };

    const s = { x: 0, y: 0, vx: 0, vy: 0, heat: 0, vh: 0, ready: false };

    const draw = (g: Geo, level: number) => {
      ctx.clearRect(0, 0, g.w, g.h);
      if (level <= 0.001) return;
      const rgb = COOL.map((c, i) => Math.round(c + (WARM[i] - c) * s.heat)).join(',');
      for (const m of motes) {
        const env = Math.sin(Math.PI * clamp(m.age / m.life, 0, 1));
        const a = beamLight(g, m.x, m.y) * env * level;
        if (a < 0.01) continue;
        if (m.r > 1.6) {
          ctx.fillStyle = `rgba(${rgb},${(a * 0.1).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${rgb},${(a * (m.r > 1.6 ? 0.3 : 0.85)).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    if (reduced) {
      const g = geo.current;
      if (g) {
        seed(g);
        draw(g, 0.8);
      }
      cell.style.removeProperty('--mb-po-x');
      cell.style.removeProperty('--mb-po-y');
      live.current.wake = () => {
        const g2 = geo.current;
        if (!g2) return;
        if (!seeded) seed(g2);
        draw(g2, 0.8);
      };
      return () => {
        live.current.wake = () => {};
      };
    }

    let frame = 0;
    let last = 0;

    const goal = (g: Geo, now: number) => {
      const p = pointer.current;
      if (p.active) return { x: p.x, y: p.y };
      const r = root.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const sp = clamp((r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2), -1, 1);
      const drift = live.current.paused ? 0 : 1;
      return {
        x: g.w * 0.5 + Math.sin(now / 4200) * g.w * 0.05 * drift,
        y: g.h * 0.42 - sp * g.h * 0.35 + Math.sin(now / 3100) * g.h * 0.03 * drift,
      };
    };

    const tick = (now: number) => {
      frame = 0;
      const g = geo.current;
      if (!g) return;
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      if (!seeded) seed(g);

      const target = goal(g, now);
      if (!s.ready) {
        s.x = target.x;
        s.y = target.y;
        s.ready = true;
      }
      s.vx += (STIFFNESS * (target.x - s.x) - DAMPING * s.vx) * dt;
      s.vy += (STIFFNESS * (target.y - s.y) - DAMPING * s.vy) * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const heatGoal = live.current.hover ? 1 : 0;
      s.vh += (40 * (heatGoal - s.heat) - 12 * s.vh) * dt;
      s.heat = clamp(s.heat + s.vh * dt, 0, 1);

      cell.style.setProperty('--mb-po-x', `${(s.x - g.cellX).toFixed(1)}px`);
      cell.style.setProperty('--mb-po-y', `${(s.y - g.cellY).toFixed(1)}px`);
      root.style.setProperty('--mb-gx', clamp((s.x - g.ox) / g.ow, -1.2, 1.2).toFixed(3));
      root.style.setProperty('--mb-gy', clamp((s.y - g.oy) / g.ow, -1.2, 1.2).toFixed(3));

      const introAt = live.current.introAt;
      const level = introAt ? smooth(clamp((now - introAt - DUST_DELAY) / DUST_RAMP, 0, 1)) : 0;
      const p = pointer.current;
      const pushing = p.active && now - p.at < 120;
      const still = live.current.paused;

      if (!still) {
        for (const m of motes) {
          m.age += dt;
          m.vx += (Math.random() - 0.5) * 22 * dt;
          m.vy += ((Math.random() - 0.5) * 22 - 3.2) * dt;
          if (pushing) {
            const d = Math.hypot(m.x - p.x, m.y - p.y);
            if (d < 150) {
              const f = (1 - d / 150) * 0.9;
              m.vx += p.vx * f * dt * 6;
              m.vy += p.vy * f * dt * 6;
            }
          }
          const drag = Math.pow(0.35, dt);
          m.vx *= drag;
          m.vy *= drag;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          if (m.age > m.life || m.x < -20 || m.y < -20 || m.x > g.w + 20 || m.y > g.h + 20) spawn(g, m, false);
        }
      }
      draw(g, level);

      const springing =
        Math.abs(target.x - s.x) > 0.3 || Math.abs(target.y - s.y) > 0.3 || Math.abs(s.vx) + Math.abs(s.vy) > 0.3;
      const heating = Math.abs(heatGoal - s.heat) > 0.002;
      const introducing = introAt > 0 && now - introAt < DUST_DELAY + DUST_RAMP + 200;
      if (live.current.inView && (!still || springing || heating || introducing)) frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (frame || !live.current.inView) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    live.current.wake = wake;
    window.addEventListener('scroll', wake, { passive: true });
    wake();
    return () => {
      cancelAnimationFrame(frame);
      live.current.wake = () => {};
      window.removeEventListener('scroll', wake);
    };
  }, [reduced]);

  useEffect(() => {
    live.current.wake();
  }, [paused, hovered]);

  const track = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    const p = pointer.current;
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const now = performance.now();
    const dt = Math.max(16, now - p.at) / 1000;
    p.vx = p.active ? clamp((x - p.x) / dt, -2000, 2000) : 0;
    p.vy = p.active ? clamp((y - p.y) / dt, -2000, 2000) : 0;
    p.x = x;
    p.y = y;
    p.at = now;
    p.active = true;
    if (!hovered) setHovered(true);
    live.current.wake();
  };

  const leave = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    pointer.current.active = false;
    setHovered(false);
    live.current.wake();
  };

  const hasNote = note.trim().length > 0;
  const interactive = hasNote && !reduced;
  const open = !interactive || hovered || pinned;
  const armed = phase === 'armed';
  const intro = phase === 'intro';

  const plaqueText = (
    <>
      <span className={styles.title}>{title}</span>
      {price && <span className={styles.price}>{price}</span>}
    </>
  );

  return (
    <div
      ref={rootRef}
      className={cx(styles.root, hovered && styles.rootWarm, finishClass[frameFinish] ?? styles.finishOak, className)}
      onPointerMove={track}
      onPointerLeave={leave}
    >
      <span className={styles.wallTexture} aria-hidden="true" />
      <span className={cx(styles.pool, intro && styles.poolIntro)} aria-hidden="true" />

      <figure className={styles.layout}>
        <div ref={cellRef} className={styles.cell}>
          <div ref={objectRef} className={styles.object}>
            <span className={styles.castShadow} aria-hidden="true" />
            <span className={styles.contactShadow} aria-hidden="true" />
            <span className={styles.sideTop} aria-hidden="true" />
            <span className={styles.sideBottom} aria-hidden="true" />
            <span className={styles.sideLeft} aria-hidden="true" />
            <span className={styles.sideRight} aria-hidden="true" />
            <div className={styles.inner}>
              <span className={styles.backing} aria-hidden="true" />
              <span className={styles.wallTop} aria-hidden="true" />
              <span className={styles.wallBottom} aria-hidden="true" />
              <span className={styles.wallLeft} aria-hidden="true" />
              <span className={styles.wallRight} aria-hidden="true" />
              <span className={styles.artShadow} aria-hidden="true" />
              <div className={styles.paper}>
                {image ? (
                  <img className={styles.art} src={image} alt={imageAlt} draggable={false} />
                ) : (
                  <p className={styles.textArt}>{contentText}</p>
                )}
                <span className={styles.artLight} aria-hidden="true" />
              </div>
              <span className={styles.glass} aria-hidden="true">
                <span className={cx(styles.glint, intro && styles.glintIntro)} />
              </span>
            </div>
            <span className={styles.face} aria-hidden="true" />
            <span className={styles.faceEdge} aria-hidden="true" />
          </div>
          <span className={styles.objectLight} aria-hidden="true" />
        </div>

        <figcaption className={cx(styles.plaque, intro && styles.plaqueIntro)}>
          <span className={styles.standoffStart} aria-hidden="true" />
          <span className={styles.standoffEnd} aria-hidden="true" />
          {interactive ? (
            <button
              type="button"
              className={cx(styles.plaqueHead, styles.plaqueButton)}
              aria-expanded={open}
              aria-controls={noteId}
              onClick={() => setPinned((p) => !p)}
            >
              {plaqueText}
              <svg className={cx(styles.chevron, open && styles.chevronOpen)} viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2.5 4.5 6 8l3.5-3.5" />
              </svg>
            </button>
          ) : (
            <div className={styles.plaqueHead}>{plaqueText}</div>
          )}
          {hasNote && (
            <div id={noteId} className={cx(styles.noteWrap, open && styles.noteWrapOpen)}>
              <div className={styles.noteClip}>
                <p className={cx(styles.note, open && styles.noteShown)}>{note}</p>
              </div>
            </div>
          )}
        </figcaption>
      </figure>

      <span className={styles.beamBlur} aria-hidden="true">
        <span className={styles.beam} />
      </span>
      <canvas ref={canvasRef} className={styles.dust} aria-hidden="true" />
      <span className={cx(styles.shade, armed && styles.shadeArmed, intro && styles.shadeIntro)} aria-hidden="true" />

      <span className={styles.lamp} aria-hidden="true">
        <span className={styles.canopy} />
        <span className={styles.stem} />
        <span ref={pivotRef} className={styles.pivot} />
        <span className={styles.head}>
          <span className={cx(styles.lens, armed && styles.lensArmed, intro && styles.lensIntro)} />
        </span>
      </span>

      {!reduced && (
        <button
          type="button"
          className={styles.pause}
          aria-label={paused ? 'Play ambient light motion' : 'Pause ambient light motion'}
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
        >
          <svg className={styles.pauseIcon} viewBox="0 0 16 16" aria-hidden="true">
            {paused ? <path d="M5 3.5v9l7.5-4.5z" /> : <path d="M4.5 3.5h2.5v9H4.5zM9 3.5h2.5v9H9z" />}
          </svg>
        </button>
      )}
    </div>
  );
}
```

```css
@property --mbf-heat {
  syntax: '<number>';
  inherits: true;
  initial-value: 0;
}

.root {
  --mb-font: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 24px;
  background: linear-gradient(180deg, color-mix(in srgb, #1b2127 75%, #000) 0%, #1b2127 45%, #0d1014 100%);
  color: #f2f4f7;
  font-family: var(--mb-font);
  transition: --mbf-heat 900ms cubic-bezier(0.22, 1, 0.36, 1);
}

.root::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: radial-gradient(90% 80% at 40% 45%, transparent 30%, rgba(4, 5, 7, 0.55) 100%);
  pointer-events: none;
}

.rootWarm {
  --mbf-heat: 1;
}

.finishOak :is(.sideTop,.sideBottom,.sideLeft,.sideRight) {
  background-color: #b98a55;
}

.finishOak .face {
  background:
    linear-gradient(225deg, #e6c592 0%, transparent 38%),
    linear-gradient(45deg, #6b4824 0%, transparent 45%),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='40'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.01 .6' numOctaves='3' seed='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.15  0 0 0 0 0.08  0 0 0 0 0.02  0 0 0 1.4 -0.4'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>"),
    #b98a55;
  background-size: auto, auto, 300px 30px, auto;
  background-blend-mode: soft-light, multiply, multiply, normal;
}

.finishWalnut :is(.sideTop,.sideBottom,.sideLeft,.sideRight) {
  background-color: #5c3a23;
}

.finishWalnut .face {
  background:
    linear-gradient(225deg, #93664a 0%, transparent 38%),
    linear-gradient(45deg, #2c1a0e 0%, transparent 45%),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='40'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.01 .6' numOctaves='3' seed='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.15  0 0 0 0 0.08  0 0 0 0 0.02  0 0 0 1.4 -0.4'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>"),
    #5c3a23;
  background-size: auto, auto, 300px 30px, auto;
  background-blend-mode: soft-light, multiply, multiply, normal;
}

.finishEbony :is(.sideTop,.sideBottom,.sideLeft,.sideRight) {
  background-color: #1a1a1b;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}

.finishEbony .face {
  background:
    linear-gradient(225deg, #57575c 0%, transparent 38%),
    linear-gradient(45deg, #050505 0%, transparent 45%),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"),
    #1a1a1b;
  background-size: auto, auto, 300px 30px, auto;
  background-blend-mode: soft-light, multiply, multiply, normal;
}

.finishWhite :is(.sideTop,.sideBottom,.sideLeft,.sideRight) {
  background-color: #e9e8e4;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}

.finishWhite .face {
  background:
    linear-gradient(225deg, #ffffff 0%, transparent 38%),
    linear-gradient(45deg, #a9a8a2 0%, transparent 45%),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"),
    #e9e8e4;
  background-size: auto, auto, 300px 30px, auto;
  background-blend-mode: soft-light, multiply, multiply, normal;
}

.wallTexture {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  opacity: 0.16;
  mix-blend-mode: overlay;
  pointer-events: none;
}

.pool {
  position: absolute;
  z-index: 0;
  inset-block-start: calc(var(--mb-pool-y, 50%) - var(--mb-pool-h, 600px) / 2);
  inset-inline-start: calc(var(--mb-pool-x, 35%) - var(--mb-pool-w, 900px) / 2);
  inline-size: var(--mb-pool-w, 900px);
  block-size: var(--mb-pool-h, 600px);
  background:
    radial-gradient(closest-side at 54% 46%, color-mix(in srgb, color-mix(in oklab, #dfe7ff, #ffd29a calc(var(--mbf-heat) * 100%)) 52%, transparent) 0%,
      color-mix(in srgb, color-mix(in oklab, #dfe7ff, #ffd29a calc(var(--mbf-heat) * 100%)) 40%, transparent) 50%, color-mix(in srgb, color-mix(in oklab, #dfe7ff, #ffd29a calc(var(--mbf-heat) * 100%)) 12%, transparent) 72%, transparent 92%);
  mix-blend-mode: screen;
  pointer-events: none;
  transform-origin: 60% 30%;
}

.poolIntro {
  animation: mbPool 1500ms cubic-bezier(0.16, 1, 0.3, 1) 260ms backwards;
}

.beamBlur {
  position: absolute;
  z-index: 2;
  opacity: 0.85;
  inset-block-start: var(--mb-beam-y, -999px);
  inset-inline-start: calc(var(--mb-beam-x, 0px) - var(--mb-beam-w, 0px) / 2);
  inline-size: var(--mb-beam-w, 0px);
  block-size: var(--mb-beam-len, 0px);
  transform-origin: 50% 0;
  transform: rotate(var(--mb-beam-rot, 0deg));
  filter: blur(14px);
  mix-blend-mode: screen;
  pointer-events: none;
}

.beam {
  position: absolute;
  inset: 0;
  clip-path: polygon(calc(50% - 9px) 0, calc(50% + 9px) 0, 100% 100%, 0 100%);
  background:
    radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, color-mix(in oklab, #dfe7ff, #ffd29a calc(var(--mbf-heat) * 100%)) 50%, transparent), transparent 70%),
    linear-gradient(180deg, color-mix(in srgb, color-mix(in oklab, #dfe7ff, #ffd29a calc(var(--mbf-heat) * 100%)) 42%, transparent) 0%,
      color-mix(in srgb, color-mix(in oklab, #dfe7ff, #ffd29a calc(var(--mbf-heat) * 100%)) 16%, transparent) 40%, color-mix(in srgb, color-mix(in oklab, #dfe7ff, #ffd29a calc(var(--mbf-heat) * 100%)) 5%, transparent) 62%, transparent 80%);
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 30%, #000 70%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 30%, #000 70%, transparent 100%);
}

.layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 40cqi) minmax(0, 1fr);
  column-gap: 7cqi;
  align-items: end;
  margin: 0;
  padding-block: clamp(96px, 10cqi, 128px) clamp(56px, 6cqi, 80px);
  padding-inline: 12cqi 8cqi;
}

.cell {
  position: relative;
  perspective: 1100px;
  perspective-origin: var(--mb-po-x, 70%) var(--mb-po-y, 30%);
}

.object {
  --fw: clamp(6px, 0.95cqi, 12px);
  --depth: clamp(26px, 6cqi, 76px);
  --side: calc(var(--depth) + 10px);

  position: relative;
  aspect-ratio: 4 / 5;
  transform-style: preserve-3d;
}

.castShadow {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  filter: blur(24px);
  transform: translateZ(calc(var(--side) * -1)) translate(-6%, 6.5%);
}

.contactShadow {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  filter: blur(5px);
  transform: translateZ(calc(var(--side) * -1 + 1px)) translate(-0.8%, 1.2%);
}

.sideTop,
.sideBottom,
.sideLeft,
.sideRight {
  position: absolute;
  background-color: #b98a55;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='40'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.01 .6' numOctaves='3' seed='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.15  0 0 0 0 0.08  0 0 0 0 0.02  0 0 0 1.4 -0.4'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>");
  background-size: 300px 30px;
  background-blend-mode: multiply;
}

.sideTop {
  inset-block-start: 0;
  inset-inline: 0;
  block-size: var(--side);
  transform-origin: 50% 0;
  transform: rotateX(-90deg);
  box-shadow: inset 0 0 0 999px rgba(255, 240, 220, 0.18);
}

.sideBottom {
  inset-block-end: 0;
  inset-inline: 0;
  block-size: var(--side);
  transform-origin: 50% 100%;
  transform: rotateX(90deg);
  box-shadow: inset 0 0 0 999px rgba(0, 0, 0, 0.6);
}

.sideLeft {
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: var(--side);
  transform-origin: 0 50%;
  transform: rotateY(90deg);
  box-shadow: inset 0 0 0 999px rgba(0, 0, 0, 0.42);
}

.sideRight {
  inset-block: 0;
  inset-inline-end: 0;
  inline-size: var(--side);
  transform-origin: 100% 50%;
  transform: rotateY(-90deg);
  box-shadow: inset 0 0 0 999px rgba(255, 236, 210, 0.08);
}

.inner {
  position: absolute;
  inset: var(--fw);
  transform-style: preserve-3d;
}

.backing {
  position: absolute;
  inset: 0;
  transform: translateZ(calc(var(--depth) * -1));
  background-color: #e4e1da;
  background-image:
    linear-gradient(180deg, rgba(8, 10, 14, 0.62) 0%, rgba(8, 10, 14, 0.18) 7%, transparent 16%),
    linear-gradient(270deg, rgba(8, 10, 14, 0.38) 0%, transparent 9%),
    radial-gradient(90% 70% at 70% 14%, color-mix(in srgb, color-mix(in oklab, #dfe7ff, #ffd29a calc(var(--mbf-heat) * 100%)) 55%, transparent), transparent 70%),
    linear-gradient(205deg, transparent 25%, rgba(10, 14, 20, 0.55) 100%),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  background-blend-mode: normal, normal, soft-light, normal, multiply;
}

.wallTop,
.wallBottom,
.wallLeft,
.wallRight {
  position: absolute;
  background-color: #e4e1da;
}

.wallTop {
  inset-block-start: 0;
  inset-inline: 0;
  block-size: var(--depth);
  transform-origin: 50% 0;
  transform: rotateX(-90deg);
  background-image: linear-gradient(180deg, rgba(6, 8, 12, 0.82), rgba(6, 8, 12, 0.6));
}

.wallBottom {
  inset-block-end: 0;
  inset-inline: 0;
  block-size: var(--depth);
  transform-origin: 50% 100%;
  transform: rotateX(90deg);
  background-image:
    linear-gradient(0deg, color-mix(in srgb, color-mix(in oklab, #dfe7ff, #ffd29a calc(var(--mbf-heat) * 100%)) 18%, transparent) 0%, rgba(10, 12, 16, 0.1) 45%, rgba(10, 12, 16, 0.45) 100%),
    linear-gradient(90deg, rgba(10, 12, 16, 0.4), transparent 55%);
}

.wallLeft {
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: var(--depth);
  transform-origin: 0 50%;
  transform: rotateY(90deg);
  background-image:
    linear-gradient(180deg, rgba(6, 8, 12, 0.55) 0%, transparent 18%, transparent 80%, rgba(6, 8, 12, 0.18) 100%),
    linear-gradient(90deg, color-mix(in srgb, color-mix(in oklab, #dfe7ff, #ffd29a calc(var(--mbf-heat) * 100%)) 14%, transparent) 0%, rgba(10, 12, 16, 0.12) 45%, rgba(10, 12, 16, 0.5) 100%);
}

.wallRight {
  inset-block: 0;
  inset-inline-end: 0;
  inline-size: var(--depth);
  transform-origin: 100% 50%;
  transform: rotateY(-90deg);
  background-image: linear-gradient(180deg, rgba(6, 8, 12, 0.78) 0%, rgba(6, 8, 12, 0.55) 25%, rgba(6, 8, 12, 0.5) 100%);
}

.artShadow {
  position: absolute;
  inset: 12% 13% 14% 13%;
  background: rgba(6, 8, 12, 0.62);
  filter: blur(9px);
  transform: translateZ(calc(var(--depth) * -1 + 1px)) translate(-3.5%, 3%);
}

.paper {
  position: absolute;
  inset: 12% 13% 14% 13%;
  box-sizing: border-box;
  display: grid;
  overflow: hidden;
  padding: 4.5%;
  background: #f3f1ec;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  background-blend-mode: multiply;
  box-shadow:
    inset 0 0 0 0.5px rgba(0, 0, 0, 0.18),
    inset -1px 1px 0 rgba(255, 255, 255, 0.7);
  transform: translateZ(calc(var(--depth) * -0.42));
}

.art {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  min-block-size: 0;
  object-fit: cover;
  user-select: none;
  box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.35);
}

.textArt {
  align-self: center;
  margin: 0;
  padding: 6%;
  color: #15181c;
  font-family: var(--mb-font);
  font-size: clamp(14px, 2.4cqi, 30px);
  font-weight: 650;
  line-height: 1.08;
  letter-spacing: -0.025em;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.textArt::selection,
.title::selection,
.price::selection,
.note::selection {
  background: color-mix(in srgb, #ffd29a 55%, transparent);
  color: #0d1014;
}

.artLight {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(130% 100% at 85% 0%, color-mix(in srgb, color-mix(in oklab, #dfe7ff, #ffd29a calc(var(--mbf-heat) * 100%)) 22%, transparent) 0%, transparent 55%),
    linear-gradient(205deg, transparent 35%, rgba(8, 10, 16, 0.42) 100%),
    linear-gradient(180deg, rgba(8, 10, 16, 0.28) 0%, transparent 10%);
  mix-blend-mode: soft-light;
}

.glass {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  transform: translateZ(-1px);
  background:
    radial-gradient(22% 16% at calc(78% - var(--mb-gx, 0) * 26%) calc(10% - var(--mb-gy, 0) * 18%),
      color-mix(in srgb, color-mix(in oklab, #dfe7ff, #ffd29a calc(var(--mbf-heat) * 100%)) 24%, transparent), transparent 70%),
    linear-gradient(118deg, transparent calc(42% - var(--mb-gx, 0) * 14%), rgba(255, 255, 255, 0.07) calc(48% - var(--mb-gx, 0) * 14%),
      rgba(255, 255, 255, 0.02) calc(56% - var(--mb-gx, 0) * 14%), transparent calc(60% - var(--mb-gx, 0) * 14%));
}

.glint {
  position: absolute;
  inset-block: -20%;
  inset-inline-start: -60%;
  inline-size: 40%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.22) 50%, transparent);
  transform: skewX(-18deg) translateX(0);
  opacity: 0;
}

.glintIntro {
  animation: mbGlint 1300ms cubic-bezier(0.45, 0, 0.2, 1) 900ms both;
}

.face {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  padding: var(--fw);
  transform: translateZ(0.5px);
  background:
    linear-gradient(225deg, #e2bf8c 0%, transparent 38%),
    linear-gradient(45deg, #6e4b27 0%, transparent 45%),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='40'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.01 .6' numOctaves='3' seed='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.15  0 0 0 0 0.08  0 0 0 0 0.02  0 0 0 1.4 -0.4'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>"),
    #b98a55;
  background-size: auto, auto, 300px 30px, auto;
  background-blend-mode: soft-light, multiply, multiply, normal;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
}

.faceEdge {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform: translateZ(1px);
  box-shadow:
    inset 0 1px 0 rgba(255, 246, 230, 0.55),
    inset -1px 0 0 rgba(255, 246, 230, 0.32),
    inset 0 -1px 0 rgba(0, 0, 0, 0.55),
    inset 1px 0 0 rgba(0, 0, 0, 0.35);
}

.objectLight {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 95% at 72% 8%, transparent 35%, rgba(8, 10, 16, 0.42) 100%);
  mix-blend-mode: multiply;
}

.plaque {
  position: relative;
  justify-self: start;
  box-sizing: border-box;
  inline-size: min(100%, 300px);
  margin-block-end: 6%;
  padding: 18px 20px 18px;
  border-radius: 3px;
  background:
    linear-gradient(165deg, rgba(255, 255, 255, 0.11) 0%, rgba(255, 255, 255, 0.04) 45%, rgba(255, 255, 255, 0.06) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.32),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 -2px 0 rgba(255, 255, 255, 0.06),
    0 1px 2px rgba(0, 0, 0, 0.5),
    -10px 16px 28px -10px rgba(0, 0, 0, 0.75);
}

.plaqueIntro {
  animation: mbRise 900ms cubic-bezier(0.16, 1, 0.3, 1) 1250ms backwards;
}

.standoffStart,
.standoffEnd {
  position: absolute;
  inset-block-start: 9px;
  inline-size: 6px;
  block-size: 6px;
  border-radius: 50%;
  background: radial-gradient(circle at 65% 35%, #f3f4f6 0%, #9aa0a8 45%, #4a4f56 100%);
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
}

.standoffStart {
  inset-inline-start: 9px;
}

.standoffEnd {
  inset-inline-end: 9px;
}

.plaqueHead {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 14px;
  row-gap: 6px;
  align-items: start;
  inline-size: 100%;
  padding-block-start: 6px;
  text-align: start;
}

.plaqueButton {
  margin: 0;
  padding-inline: 0;
  padding-block-end: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  border-radius: 2px;
}

.plaqueButton:focus-visible {
  outline: 2px solid #ffd29a;
  outline-offset: 6px;
}

.title {
  grid-column: 1;
  color: #f2f4f7;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.012em;
  overflow-wrap: anywhere;
}

.price {
  grid-column: 1;
  color: rgba(226, 233, 242, 0.74);
  font-size: 15px;
  font-weight: 500;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.chevron {
  grid-column: 2;
  grid-row: 1;
  inline-size: 14px;
  block-size: 14px;
  margin-block-start: 4px;
  fill: none;
  stroke: rgba(226, 233, 242, 0.74);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.chevronOpen {
  transform: rotate(180deg);
}

.noteWrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 520ms cubic-bezier(0.22, 1, 0.36, 1);
}

.noteWrapOpen {
  grid-template-rows: 1fr;
}

.noteClip {
  overflow: hidden;
  min-block-size: 0;
}

.note {
  margin: 0;
  padding-block-start: 14px;
  margin-block-start: 14px;
  border-block-start: 1px solid rgba(255, 255, 255, 0.14);
  color: rgba(226, 233, 242, 0.74);
  font-size: 14px;
  line-height: 1.55;
  opacity: 0;
  transform: translateY(-6px);
  transition:
    opacity 260ms ease-out,
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.noteShown {
  opacity: 1;
  transform: none;
  transition-delay: 120ms;
}

.dust {
  position: absolute;
  inset: 0;
  z-index: 2;
  inline-size: 100%;
  block-size: 100%;
  pointer-events: none;
}

.shade {
  position: absolute;
  inset: 0;
  z-index: 3;
  background: #050608;
  opacity: 0;
  pointer-events: none;
}

.shadeArmed {
  opacity: 0.9;
}

.shadeIntro {
  animation: mbStrike 1700ms linear both;
}

.lamp {
  position: absolute;
  z-index: 4;
  inset-block-start: 0;
  inset-inline-start: 57%;
  inline-size: 0;
  block-size: 0;
  pointer-events: none;
}

.canopy {
  position: absolute;
  inset-inline-start: -15px;
  inset-block-start: 0;
  inline-size: 30px;
  block-size: 6px;
  border-radius: 0 0 3px 3px;
  background: linear-gradient(180deg, #2a2f35, #16191d);
}

.stem {
  position: absolute;
  inset-inline-start: -1px;
  inset-block-start: 6px;
  inline-size: 2px;
  block-size: 30px;
  background: linear-gradient(90deg, #3a3f46, #121417);
}

.pivot {
  position: absolute;
  inset-inline-start: -4px;
  inset-block-start: 34px;
  inline-size: 8px;
  block-size: 8px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #5a6068, #121417);
  z-index: 1;
}

.head {
  position: absolute;
  inset-inline-start: -12px;
  inset-block-start: 38px;
  inline-size: 24px;
  block-size: 40px;
  border-radius: 5px 5px 3px 3px;
  transform-origin: 50% 0;
  transform: rotate(var(--mb-beam-rot, 0deg));
  background: linear-gradient(90deg, #0d0f12 0%, #2c3138 38%, #4a5058 48%, #1d2126 70%, #0a0c0e 100%);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.55);
}

.lens {
  position: absolute;
  inset-inline: 2px;
  inset-block-end: -3px;
  block-size: 6px;
  border-radius: 50%;
  background: radial-gradient(closest-side, #fff, color-mix(in oklab, #dfe7ff, #ffd29a calc(var(--mbf-heat) * 100%)) 60%, color-mix(in srgb, color-mix(in oklab, #dfe7ff, #ffd29a calc(var(--mbf-heat) * 100%)) 40%, #000) 100%);
  box-shadow:
    0 0 10px 2px color-mix(in srgb, color-mix(in oklab, #dfe7ff, #ffd29a calc(var(--mbf-heat) * 100%)) 80%, transparent),
    0 0 34px 8px color-mix(in srgb, color-mix(in oklab, #dfe7ff, #ffd29a calc(var(--mbf-heat) * 100%)) 30%, transparent);
}

.lensArmed {
  opacity: 0.08;
}

.lensIntro {
  animation: mbLens 1700ms linear both;
}

.pause {
  position: absolute;
  z-index: 5;
  inset-block-end: 14px;
  inset-inline-end: 14px;
  display: grid;
  place-items: center;
  inline-size: 32px;
  block-size: 32px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(236, 240, 246, 0.6);
  cursor: pointer;
  transition:
    color 200ms ease-out,
    border-color 200ms ease-out,
    background-color 200ms ease-out;
}

.pauseIcon {
  inline-size: 12px;
  block-size: 12px;
  fill: currentColor;
}

.pause:hover {
  color: rgba(246, 248, 251, 0.95);
  border-color: rgba(255, 255, 255, 0.32);
  background-color: rgba(255, 255, 255, 0.07);
}

.pause:focus-visible {
  outline: 2px solid #ffd29a;
  outline-offset: 3px;
}

@keyframes mbStrike {
  0% { opacity: 0.9; }
  8% { opacity: 0.9; }
  11% { opacity: 0.45; }
  15% { opacity: 0.86; }
  20% { opacity: 0.3; }
  24% { opacity: 0.7; }
  30% { opacity: 0.22; }
  100% { opacity: 0; animation-timing-function: ease-out; }
}

@keyframes mbLens {
  0% { opacity: 0.08; }
  8% { opacity: 0.08; }
  11% { opacity: 0.7; }
  15% { opacity: 0.15; }
  20% { opacity: 0.9; }
  24% { opacity: 0.4; }
  30% { opacity: 1; }
  100% { opacity: 1; }
}

@keyframes mbPool {
  from { opacity: 0; transform: scale(0.55); }
  to { opacity: 1; transform: none; }
}

@keyframes mbGlint {
  0% { opacity: 0; transform: skewX(-18deg) translateX(0); }
  15% { opacity: 1; }
  85% { opacity: 1; }
  100% { opacity: 0; transform: skewX(-18deg) translateX(480%); }
}

@keyframes mbRise {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}

@container (max-width: 640px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 28px;
    padding-block: 96px 64px;
    padding-inline: 9cqi;
  }

  .object {
    --depth: clamp(22px, 7cqi, 40px);
    --fw: 7px;
  }

  .plaque {
    inline-size: min(100%, 340px);
    margin-block-end: 0;
  }

  .lamp {
    inset-inline-start: 82%;
  }
}
```
