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
