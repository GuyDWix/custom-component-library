Create a custom element called "Cube Faces Card". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: four faces (label, title, text, key figure and its note), auto-turn on or off. Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactElement } from 'react';
import styles from './Component.module.css';

export type CubeFaceIcon = 'overview' | 'process' | 'price' | 'proof';

export interface CubeFace {
  icon: CubeFaceIcon;
  label: string;
  title: string;
  body: string;
  figure: string;
  figureNote: string;
}

export interface CubeFacesCardProps {
  faces?: CubeFace[];
  autoTurn?: boolean;
  className?: string;
}

export const defaultFaces: CubeFace[] = [
  {
    icon: 'overview',
    label: 'Overview',
    title: 'A private afternoon at the wheel',
    body: 'Throw, trim and glaze your own set of bowls with a studio potter beside you. Clay, tools and firing are all included.',
    figure: '3 hrs',
    figureNote: 'per session, up to four people',
  },
  {
    icon: 'process',
    label: 'Process',
    title: 'From wet clay to glazed piece',
    body: 'Throw on the wheel, trim the next day, then choose your glazes. We fire twice and have everything ready to collect.',
    figure: '10 days',
    figureNote: 'from first session to pickup',
  },
  {
    icon: 'price',
    label: 'Price',
    title: 'One price, everything in',
    body: 'Clay, glazes, two firings and a studio potter at your side. No kit to buy and no hidden extras at the end.',
    figure: '$85',
    figureNote: 'per person',
  },
  {
    icon: 'proof',
    label: 'Proof',
    title: 'Loved by 1,200 guests',
    body: '\u201CI made the bowl I eat from every morning.\u201D Nine in ten guests book a second session within the year.',
    figure: '4.9/5',
    figureNote: 'from 312 reviews',
  },
];

const FACE_ICONS: CubeFaceIcon[] = ['overview', 'process', 'price', 'proof'];

type Aim = {
  mode: 'idle' | 'hover' | 'drag';
  nx: number;
  ny: number;
  aDrag: number;
  dir: number;
  antiFrom: number;
  antiUntil: number;
};

type Drag = { id: number; x: number; a0: number; lastX: number; lastT: number; vel: number; live: boolean };

const REST_PITCH = -12;
const AUTO_MS = 5200;
const USER_HOLD_MS = 9000;
const DEG_PER_PX = 0.4;
const RAD = Math.PI / 180;
const LIGHT = { x: -0.45, y: -0.55, z: 0.7 };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const mod4 = (n: number) => ((n % 4) + 4) % 4;

const STAGE_HELP =
  'A cube with four faces. Drag or swipe sideways to turn it, or use the tabs and arrow buttons to jump to a face.';

/** "10 days" -> big "10" + small "days"; len estimates the rendered width in em so CSS can size the stat to fit. */
function splitFigure(figure: string): { main: string; unit: string; len: number } {
  const m = /^(\S*\d\S*)\s+([^\d\s].*)$/.exec(figure.trim());
  const main = m ? m[1] : figure.trim();
  const unit = m ? m[2] : '';
  const len = Math.max(2, main.length + (unit ? unit.length * 0.42 + 0.3 : 0));
  return { main, unit, len: Number(len.toFixed(2)) };
}

function normalizeFaces(input?: CubeFace[]): CubeFace[] {
  const src = Array.isArray(input) ? input : [];
  return defaultFaces.map((fallback, i) => {
    const f = src[i];
    if (!f) return fallback;
    return {
      icon: f.icon ?? FACE_ICONS[i],
      label: f.label ?? '',
      title: f.title ?? '',
      body: f.body ?? '',
      figure: f.figure ?? '',
      figureNote: f.figureNote ?? '',
    };
  });
}

function Glyph({ icon, className, drawing }: { icon: CubeFaceIcon; className?: string; drawing: boolean }): ReactElement {
  const s = drawing ? `${styles.stroke} ${styles.draw}` : styles.stroke;
  let shapes: ReactElement;
  if (icon === 'process') {
    shapes = (
      <>
        <circle className={s} pathLength={1} cx="5" cy="5" r="2" />
        <path className={s} pathLength={1} d="M7 5h8a3.5 3.5 0 0 1 0 7H9a3.5 3.5 0 0 0 0 7h8" />
        <circle className={s} pathLength={1} cx="19" cy="19" r="2" />
      </>
    );
  } else if (icon === 'price') {
    shapes = (
      <>
        <path
          className={s}
          pathLength={1}
          d="M3 4.5a1 1 0 0 1 1-1h7.1a2 2 0 0 1 1.4.6l8 8a2 2 0 0 1 0 2.8l-6.2 6.2a2 2 0 0 1-2.8 0l-8-8a2 2 0 0 1-.5-1.4V4.5z"
        />
        <circle className={s} pathLength={1} cx="8" cy="8" r="1.4" />
      </>
    );
  } else if (icon === 'proof') {
    shapes = (
      <path
        className={s}
        pathLength={1}
        d="M12 3.2l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6-4.4-4.2 6-.8z"
      />
    );
  } else {
    shapes = (
      <>
        <rect className={s} pathLength={1} x="3.5" y="4" width="17" height="16" rx="3" />
        <path className={s} pathLength={1} d="M3.5 9.5h17M9.5 9.5V20" />
      </>
    );
  }
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes}
    </svg>
  );
}

export default function CubeFacesCard({
  faces: facesProp = defaultFaces,
  autoTurn = true,
  className,
}: CubeFacesCardProps) {
  const faces = normalizeFaces(facesProp);
  const uid = useId();

  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(0);
  const [turned, setTurned] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cubeRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const faceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const motion = useRef({ a: 0, va: 0, p: REST_PITCH, vp: 0, l: 0, vl: 0 });
  const aim = useRef<Aim>({ mode: 'idle', nx: 0, ny: 0, aDrag: 0, dir: 1, antiFrom: 0, antiUntil: 0 });
  const drag = useRef<Drag | null>(null);
  const nRef = useRef(0);
  const autoAt = useRef(0);
  const holdUntil = useRef(0);
  const engaged = useRef(false);
  const autoRef = useRef(false);

  autoRef.current = autoTurn && !paused;

  const goTo = useCallback((next: number, source: 'auto' | 'user') => {
    const now = performance.now();
    autoAt.current = now + AUTO_MS;
    if (source === 'user') holdUntil.current = now + USER_HOLD_MS;
    const cur = nRef.current;
    if (next === cur) return;
    nRef.current = next;
    setActive(mod4(next));
    setTurned(true);
    const t = aim.current;
    t.dir = next > cur ? 1 : -1;
    t.antiFrom = motion.current.a;
    t.antiUntil = now + 120;
  }, []);

  const jump = (i: number) => {
    const d = mod4(i - mod4(nRef.current));
    goTo(nRef.current + (d === 3 ? -1 : d), 'user');
  };

  const paint = useCallback(() => {
    const cube = cubeRef.current;
    const stage = stageRef.current;
    if (!cube || !stage) return;
    const m = motion.current;
    cube.style.transform = `translate3d(0, ${(-m.l * 16).toFixed(2)}px, 0) scale(${(1 + m.l * 0.02).toFixed(4)}) rotateX(${m.p.toFixed(2)}deg) rotateY(${(-m.a).toFixed(2)}deg)`;
    const theta = (((m.a % 90) + 90) % 90) * RAD;
    stage.style.setProperty('--lift', m.l.toFixed(3));
    stage.style.setProperty('--foot', (Math.cos(theta) + Math.sin(theta)).toFixed(3));

    const pr = m.p * RAD;
    for (let k = 0; k < 4; k++) {
      const el = faceRefs.current[k];
      if (!el) continue;
      const deg = k * 90 - m.a;
      const phi = deg * RAD;
      const cz = Math.cos(phi);
      const nx = Math.sin(phi);
      const ny = -cz * Math.sin(pr);
      const nz = cz * Math.cos(pr);
      const dot = nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z;
      const wrapped = ((((deg + 180) % 360) + 360) % 360) - 180;
      el.style.setProperty('--sh', clamp((0.78 - dot) * 0.42, 0, 0.4).toFixed(3));
      el.style.setProperty('--gl', `${clamp(18 + wrapped * 1.15, -40, 150).toFixed(1)}%`);
      el.style.setProperty('--glo', (cz > 0 ? clamp((dot - 0.05) * 1.2, 0, 0.85) : 0).toFixed(3));
    }
    const top = topRef.current;
    if (top) {
      const dotTop = -Math.cos(pr) * LIGHT.y + -Math.sin(pr) * LIGHT.z;
      top.style.setProperty('--sh', clamp((0.78 - dotTop) * 0.42, 0, 0.4).toFixed(3));
      top.style.setProperty('--gl', `${(50 + 60 * Math.sin(m.a * RAD)).toFixed(1)}%`);
      top.style.setProperty('--glo', '0.55');
    }
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
      cubeRef.current?.style.removeProperty('transform');
      faceRefs.current.forEach((el) => {
        ['--sh', '--gl', '--glo'].forEach((k) => el?.style.removeProperty(k));
      });
      return;
    }
    if (!inView) return;
    let last = performance.now();
    const start = last;
    autoAt.current = last + 3200;
    let id = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const m = motion.current;
      const t = aim.current;

      if (
        autoRef.current &&
        t.mode === 'idle' &&
        !engaged.current &&
        now >= holdUntil.current &&
        now >= autoAt.current
      ) {
        goTo(nRef.current + 1, 'auto');
      }

      const speed = Math.abs(m.va);
      const s = now / 1000;
      const calm = Math.min(1, (now - start) / 1800);
      let goalA: number;
      let goalP = REST_PITCH;
      let kA = 140;
      let cA = 15.5;
      if (t.mode === 'drag') {
        goalA = t.aDrag;
        kA = 420;
        cA = 36;
      } else {
        goalA = nRef.current * 90;
        if (now < t.antiUntil) {
          goalA = t.antiFrom - t.dir * 5;
        } else {
          goalA += Math.sin(s * 0.62) * 2.4 * calm;
          goalP += Math.sin(s * 0.47 + 0.9) * 1.6 * calm;
        }
        if (t.mode === 'hover') {
          goalA -= t.nx * 6;
          goalP += t.ny * 3.2;
        }
      }
      goalP -= Math.min(1, speed / 320) * 3.5;
      const liftGoal =
        Math.min(1, speed / 170) + (now < t.antiUntil ? 0.35 : 0) + (t.mode === 'drag' ? 0.25 : 0);

      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let n = 0; n < steps; n++) {
        m.va += (kA * (goalA - m.a) - cA * m.va) * h;
        m.a += m.va * h;
        m.vp += (110 * (goalP - m.p) - 10 * m.vp) * h;
        m.p += m.vp * h;
        m.vl += (240 * (liftGoal - m.l) - 15 * m.vl) * h;
        m.l += m.vl * h;
      }
      paint();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [reduced, inView, paint, goTo]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      a0: motion.current.a,
      lastX: e.clientX,
      lastT: e.timeStamp,
      vel: 0,
      live: false,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      if (!d.live && Math.abs(e.clientX - d.x) > 6) {
        d.live = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* pointer already released */
        }
        aim.current.mode = 'drag';
        holdUntil.current = performance.now() + USER_HOLD_MS;
        d.x = e.clientX;
        d.a0 = motion.current.a;
        d.lastX = e.clientX;
        d.lastT = e.timeStamp;
      }
      if (d.live) {
        const dt = Math.max(1, e.timeStamp - d.lastT);
        const inst = (-(e.clientX - d.lastX) * DEG_PER_PX * 1000) / dt;
        d.vel = d.vel * 0.7 + inst * 0.3;
        d.lastX = e.clientX;
        d.lastT = e.timeStamp;
        aim.current.aDrag = d.a0 - (e.clientX - d.x) * DEG_PER_PX;
      }
      return;
    }
    if (e.pointerType === 'mouse') {
      const rect = e.currentTarget.getBoundingClientRect();
      const t = aim.current;
      t.mode = 'hover';
      t.nx = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      t.ny = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    }
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      drag.current = null;
      if (d.live) {
        const t = aim.current;
        t.mode = e.pointerType === 'mouse' && e.type === 'pointerup' ? 'hover' : 'idle';
        const base = nRef.current;
        const proj = motion.current.a + d.vel * 0.16;
        const next = clamp(Math.round(proj / 90), base - 2, base + 2);
        goTo(next, 'user');
        t.antiUntil = 0;
        return;
      }
    }
    if (e.type === 'pointerleave' && !drag.current) aim.current.mode = 'idle';
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let to = -1;
    if (e.key === 'ArrowRight') to = (i + 1) % 4;
    else if (e.key === 'ArrowLeft') to = (i + 3) % 4;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = 3;
    if (to < 0) return;
    e.preventDefault();
    jump(to);
    tabRefs.current[to]?.focus();
  };

  const animate = (on: boolean, delay: number): { className: string; style?: CSSProperties } =>
    on && turned && !reduced
      ? { className: styles.rise, style: { '--d': `${delay}ms` } as CSSProperties }
      : { className: '' };

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      onPointerEnter={() => {
        engaged.current = true;
      }}
      onPointerLeave={() => {
        engaged.current = false;
        autoAt.current = performance.now() + 1800;
      }}
    >
      <span className={styles.grain} aria-hidden="true" />
      <div className={styles.frame}>
        <span className={styles.glow} aria-hidden="true" />
        <span className={styles.rings} aria-hidden="true" />
        {faces.map((f, i) => (
          <span
            key={i}
            className={[styles.word, i === active ? styles.wordOn : ''].filter(Boolean).join(' ')}
            aria-hidden="true"
          >
            {f.label}
          </span>
        ))}
        <span className={styles.floor} aria-hidden="true" />

        <div
          ref={stageRef}
          className={[styles.stage, reduced ? styles.stageFlat : ''].filter(Boolean).join(' ')}
          role="group"
          aria-label="Service details"
          aria-description={STAGE_HELP}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={onPointerEnd}
        >
          <span className={styles.pool} aria-hidden="true" />
          {!reduced && <span className={styles.shadowWide} aria-hidden="true" />}
          {!reduced && <span className={styles.shadowTight} aria-hidden="true" />}

          <div ref={cubeRef} className={[styles.cube, reduced ? styles.cubeFlat : ''].filter(Boolean).join(' ')}>
            {faces.map((f, i) => {
              const on = i === active;
              const icon = animate(on, 120);
              const title = animate(on, 200);
              const body = animate(on, 260);
              const foot = animate(on, 330);
              return (
                <div
                  key={i}
                  ref={(el) => {
                    faceRefs.current[i] = el;
                  }}
                  id={`${uid}-panel-${i}`}
                  role="tabpanel"
                  aria-labelledby={`${uid}-tab-${i}`}
                  aria-hidden={!on}
                  className={[
                    styles.face,
                    styles[`f${i}` as 'f0'],
                    reduced ? styles.faceFlat : '',
                    reduced && on ? styles.faceFlatOn : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className={styles.glaze} aria-hidden="true" />
                  <div className={styles.content}>
                    <div className={styles.head}>
                      <span {...icon} className={[styles.iconWrap, icon.className].filter(Boolean).join(' ')}>
                        <Glyph icon={f.icon} className={styles.icon} drawing={on && turned && !reduced} />
                      </span>
                      {f.label && <span className={styles.label}>{f.label}</span>}
                    </div>
                    <div className={styles.copy}>
                      {f.title && (
                        <h3 {...title} className={[styles.title, title.className].filter(Boolean).join(' ')}>
                          {f.title}
                        </h3>
                      )}
                      {f.body && (
                        <p {...body} className={[styles.body, body.className].filter(Boolean).join(' ')}>
                          {f.body}
                        </p>
                      )}
                    </div>
                    {(f.figure || f.figureNote) && (
                      <div {...foot} className={[styles.foot, foot.className].filter(Boolean).join(' ')}>
                        {f.figure && (() => {
                          const fig = splitFigure(f.figure);
                          return (
                            <span className={styles.figure} style={{ '--len': fig.len } as CSSProperties}>
                              {fig.main}
                              {fig.unit && (
                                <>
                                  {' '}
                                  <span className={styles.figureUnit}>{fig.unit}</span>
                                </>
                              )}
                            </span>
                          );
                        })()}
                        {f.figureNote && <span className={styles.figureNote}>{f.figureNote}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {!reduced && (
              <div ref={topRef} className={[styles.face, styles.top].join(' ')} aria-hidden="true">
                <span className={styles.glaze} />
                <span className={styles.ring}>
                  <span className={styles.dot} />
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.arrow}
            aria-label="Previous face"
            onClick={() => goTo(nRef.current - 1, 'user')}
          >
            <svg className={styles.chev} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14.5 5.5 8 12l6.5 6.5" />
            </svg>
          </button>
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Card faces"
            style={{ '--i': active, '--c': active % 2, '--r': Math.floor(active / 2) } as CSSProperties}
          >
            <span className={styles.pill} aria-hidden="true" />
            {faces.map((f, i) => (
              <button
                key={i}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${uid}-tab-${i}`}
                aria-selected={i === active}
                aria-controls={`${uid}-panel-${i}`}
                title={f.label || undefined}
                tabIndex={i === active ? 0 : -1}
                className={[styles.tab, i === active ? styles.tabOn : ''].filter(Boolean).join(' ')}
                onClick={() => jump(i)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                {f.label || `Face ${i + 1}`}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.arrow}
            aria-label="Next face"
            onClick={() => goTo(nRef.current + 1, 'user')}
          >
            <svg className={styles.chev} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9.5 5.5 16 12l-6.5 6.5" />
            </svg>
          </button>
          {autoTurn && !reduced && (
            <button
              type="button"
              className={styles.pause}
              aria-label={paused ? 'Resume automatic turning' : 'Pause automatic turning'}
              aria-pressed={paused}
              onClick={() => setPaused((p) => !p)}
            >
              <svg className={styles.pauseGlyph} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                {paused ? <path d="M8 5.5v13l10.5-6.5z" /> : <path d="M7.5 5h3.2v14H7.5zM13.3 5h3.2v14h-3.2z" />}
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

```css
/* Ceramic block: glazed off-white tile faces, cobalt line icons, soft ambient occlusion, hairline bevel catching light */

.root {
  --cf-font: 'Instrument Sans', 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;

  container-type: inline-size;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 28px;
  background: linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, #1f47e6 76%, #020624) 88%, #000) 0%, color-mix(in srgb, #1f47e6 76%, #020624) 100%);
  color: #ffffff;
  font-family: var(--cf-font);
  -webkit-font-smoothing: antialiased;
}

.grain {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.5;
  mix-blend-mode: soft-light;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .6 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}

.frame {
  --side: clamp(240px, calc(78cqi - max(0px, 100cqi - 420px) * 0.62), 420px);
  --pad: clamp(20px, 4cqi, 48px);
  --padx: clamp(14px, 4cqi, 40px);
  --wsize: clamp(88px, 36cqi, 140px);
  /* composition: cube sits at --cxr of the stage width; narrow gets headroom for the tonal word to peek over it */
  --cxr: 0.5;
  --head: calc(var(--side) * 0.2);
  --top: calc(var(--pad) + var(--head));
  --cxf: calc(var(--padx) + (100cqi - 2 * var(--padx)) * var(--cxr));

  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(8px, 1.6cqi, 18px);
  padding-block: var(--top) calc(var(--pad) * 0.75);
  padding-inline: var(--padx);
}

/* wide: cube breaks out to the left, the horizon word carries the right and bleeds off the edge */
@container (min-width: 700px) {
  .frame {
    --side: clamp(300px, 48cqi, 480px);
    --cxr: 0.33;
    --head: 0px;
    --wsize: clamp(110px, 16cqi, 260px);
  }
}

.frame::selection {
  background: #1f47e6;
  color: #ffffff;
}

/* ---------- backdrop: halo rings, tonal word, floor ---------- */

.glow {
  position: absolute;
  inset-inline-start: var(--cxf);
  inset-block-start: calc(var(--top) + var(--side) * 0.5);
  z-index: 0;
  inline-size: calc(var(--side) * 4.4);
  block-size: calc(var(--side) * 3.4);
  transform: translate(-50%, -50%);
  pointer-events: none;
  background: radial-gradient(closest-side, color-mix(in srgb, #1f47e6 90%, #ffffff) 0%, transparent 100%);
}

.rings {
  position: absolute;
  inset-inline-start: var(--cxf);
  inset-block-start: calc(var(--top) + var(--side) * 0.64);
  z-index: 0;
  inline-size: calc(var(--side) * 3.6);
  block-size: calc(var(--side) * 3.6);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  pointer-events: none;
  background: repeating-radial-gradient(
    circle,
    transparent 0,
    transparent calc(var(--side) * 0.27),
    rgba(255, 255, 255, 0.12) calc(var(--side) * 0.27),
    rgba(255, 255, 255, 0.12) calc(var(--side) * 0.27 + 1px)
  );
  -webkit-mask-image: radial-gradient(circle, #000 18%, transparent 66%);
  mask-image: radial-gradient(circle, #000 18%, transparent 66%);
}

.word {
  position: absolute;
  inset-inline-start: calc(var(--padx) * 0.4);
  inset-block-start: calc(var(--pad) * 0.5);
  z-index: 0;
  font-size: var(--wsize);
  line-height: 1;
  font-weight: 700;
  letter-spacing: -0.055em;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.085);
  pointer-events: none;
  user-select: none;
  opacity: 0;
  transform: translateY(24%);
  transition:
    opacity 520ms ease,
    transform 760ms cubic-bezier(0.2, 0.9, 0.25, 1);
}

.wordOn {
  opacity: 1;
  transform: none;
  transition-delay: 140ms;
}

@container (min-width: 700px) {
  .word {
    inset-inline-start: calc(var(--cxf) + var(--side) * 0.38);
    inset-block-start: calc(var(--top) + var(--side) * 0.97 + 2.6cqi - var(--wsize) * 0.84);
  }
}

/* horizon plane, tilted so the floor falls away to the left under the cube */
.floor {
  position: absolute;
  inset-inline: 0;
  inset-block-start: calc(var(--top) + var(--side) * 0.97);
  inset-block-end: 0;
  z-index: 1;
  pointer-events: none;
  transform: skewY(-3deg);
  transform-origin: 100% 0;
  background:
    radial-gradient(60% 70% at calc(var(--cxr) * 100%) 0%, color-mix(in srgb, #1f47e6 55%, transparent) 0%, transparent 100%),
    linear-gradient(180deg, color-mix(in srgb, #1f47e6 38%, #020624) 0%, color-mix(in srgb, color-mix(in srgb, #1f47e6 38%, #020624) 50%, #000) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

/* ---------- stage + cube ---------- */

.stage {
  --lift: 0;
  --foot: 1;
  position: relative;
  z-index: 2;
  inline-size: 100%;
  block-size: calc(var(--side) * 1.28);
  perspective: calc(var(--side) * 3.4);
  touch-action: pan-y;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}

.stage:active {
  cursor: grabbing;
}

.pool {
  position: absolute;
  inset-inline-start: calc(var(--cxr) * 100%);
  inset-block-start: calc(50% + var(--side) * 0.49);
  inline-size: calc(var(--side) * 2.2);
  block-size: calc(var(--side) * 0.62);
  transform: translate(-50%, -50%);
  background: radial-gradient(closest-side, color-mix(in srgb, #1f47e6 62%, #ffffff) 0%, transparent 100%);
  opacity: 0.34;
  pointer-events: none;
}

.shadowWide {
  position: absolute;
  inset-inline-start: calc(var(--cxr) * 100%);
  inset-block-start: calc(50% + var(--side) * 0.5);
  inline-size: calc(var(--side) * 1.32);
  block-size: calc(var(--side) * 0.36);
  transform: translate(-50%, -50%) translateX(calc(var(--side) * 0.075))
    scaleX(calc(var(--foot) * (1 + var(--lift) * 0.06)));
  opacity: calc(1 - var(--lift) * 0.3);
  background: radial-gradient(closest-side, rgba(1, 6, 40, 0.72) 0%, rgba(1, 6, 40, 0.34) 55%, transparent 100%);
  pointer-events: none;
}

.shadowTight {
  position: absolute;
  inset-inline-start: calc(var(--cxr) * 100%);
  inset-block-start: calc(50% + var(--side) * 0.49);
  inline-size: calc(var(--side) * 1.04);
  block-size: calc(var(--side) * 0.16);
  transform: translate(-50%, -50%) scaleX(var(--foot));
  opacity: calc(1 - var(--lift) * 0.7);
  background: radial-gradient(closest-side, rgba(0, 4, 30, 0.9) 0%, rgba(0, 4, 30, 0.4) 60%, transparent 100%);
  pointer-events: none;
}

.cube {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: calc(var(--cxr) * 100%);
  inline-size: var(--side);
  block-size: var(--side);
  margin-block-start: calc(var(--side) / -2);
  margin-inline-start: calc(var(--side) / -2);
  transform-style: preserve-3d;
  transform: rotateX(-12deg) rotateY(0deg);
  will-change: transform;
}

.face {
  --sh: 0;
  --gl: 18%;
  --glo: 0;
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: calc(var(--side) * 0.016);
  backface-visibility: hidden;
  background: linear-gradient(
    150deg,
    color-mix(in srgb, #f3f4f1 62%, #ffffff) 0%,
    #f3f4f1 46%,
    color-mix(in srgb, #f3f4f1 90%, #5b6fb0) 100%
  );
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.85),
    inset 1.5px 1.5px 0 rgba(255, 255, 255, 1),
    inset -1.5px -1.5px 0 rgba(26, 44, 140, 0.22),
    inset 0 0 calc(var(--side) * 0.1) rgba(40, 60, 150, 0.1);
  color: #0d1a4a;
}

.f0 {
  transform: translateZ(calc(var(--side) / 2));
}

.f1 {
  transform: rotateY(90deg) translateZ(calc(var(--side) / 2));
}

.f2 {
  transform: rotateY(180deg) translateZ(calc(var(--side) / 2));
}

.f3 {
  transform: rotateY(270deg) translateZ(calc(var(--side) / 2));
}

.top {
  transform: rotateX(90deg) translateZ(calc(var(--side) / 2));
}

/* recessed tile line, engraved with a light lip */
.face::before {
  content: '';
  position: absolute;
  inset: calc(var(--side) * 0.035);
  z-index: 1;
  border-radius: calc(var(--side) * 0.012);
  border: 1px solid color-mix(in srgb, #1f47e6 16%, transparent);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9);
  pointer-events: none;
}

/* ambient occlusion at the edges, light-dependent shade, moving glaze highlight */
.face::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background:
    linear-gradient(
      114deg,
      transparent calc(var(--gl) - 16%),
      rgba(255, 255, 255, calc(var(--glo) * 0.55)) var(--gl),
      transparent calc(var(--gl) + 16%)
    ),
    linear-gradient(90deg, rgba(14, 30, 110, 0.12) 0%, transparent 9%, transparent 91%, rgba(14, 30, 110, 0.16) 100%),
    linear-gradient(180deg, transparent 86%, rgba(14, 30, 110, 0.1) 100%),
    linear-gradient(rgba(10, 24, 100, var(--sh)), rgba(10, 24, 100, var(--sh)));
}

.glaze {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    radial-gradient(130% 80% at 16% 6%, rgba(255, 255, 255, 0.7) 0%, transparent 58%),
    radial-gradient(circle at 21% 33%, rgba(31, 71, 230, 0.16) 0 0.7px, transparent 1.5px),
    radial-gradient(circle at 74% 61%, rgba(31, 71, 230, 0.13) 0 0.8px, transparent 1.6px),
    radial-gradient(circle at 58% 18%, rgba(31, 71, 230, 0.12) 0 0.6px, transparent 1.4px),
    radial-gradient(circle at 36% 82%, rgba(31, 71, 230, 0.14) 0 0.7px, transparent 1.5px),
    radial-gradient(circle at 88% 87%, rgba(31, 71, 230, 0.1) 0 0.6px, transparent 1.4px),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .12 0 0 0 0 .22 0 0 0 0 .6 0 0 0 .5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: auto, auto, auto, auto, auto, auto, 200px 200px;
  opacity: 0.55;
}

/* ---------- face content ---------- */

.content {
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  block-size: 100%;
  padding: calc(var(--side) * 0.085);
  padding-block-start: calc(var(--side) * 0.08);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr) auto;
  row-gap: calc(var(--side) * 0.04);
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.iconWrap {
  display: block;
  color: #1f47e6;
}

.icon {
  display: block;
  inline-size: max(34px, calc(var(--side) * 0.13));
  block-size: max(34px, calc(var(--side) * 0.13));
  overflow: visible;
}

.stroke {
  stroke-dasharray: 1;
  stroke-dashoffset: 0;
}

.label {
  min-inline-size: 0;
  max-inline-size: 62%;
  box-sizing: border-box;
  padding: 5px 11px;
  border: 1px solid color-mix(in srgb, #1f47e6 30%, transparent);
  border-radius: 14px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0;
  text-align: center;
  color: #1f47e6;
  overflow-wrap: anywhere;
}

.copy {
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: calc(var(--side) * 0.03);
  min-block-size: 0;
}

.title {
  margin: 0;
  font-size: max(19px, calc(var(--side) * 0.074));
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: -0.035em;
  color: #0d1a4a;
  text-wrap: balance;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.body {
  margin: 0;
  font-size: max(13px, calc(var(--side) * 0.037));
  line-height: 1.45;
  color: rgba(13, 26, 74, 0.68);
  text-wrap: pretty;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.foot {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding-block-start: calc(var(--side) * 0.035);
  border-block-start: 1px solid color-mix(in srgb, #1f47e6 16%, transparent);
}

/* --len = estimated width of the figure in em (set from the text); the size shrinks to leave the note room, and the text wraps rather than ever truncating */
.figure {
  flex: 0 1 auto;
  min-inline-size: 0;
  font-size: max(26px, min(calc(var(--side) * 0.17), calc(var(--side) * 0.5 / (var(--len, 4) * 0.54))));
  font-weight: 600;
  line-height: 0.92;
  letter-spacing: -0.05em;
  font-variant-numeric: tabular-nums;
  color: #1f47e6;
  overflow-wrap: anywhere;
}

.figureUnit {
  font-size: 0.42em;
  font-weight: 600;
  letter-spacing: -0.01em;
  opacity: 0.8;
  white-space: nowrap;
}

.figureNote {
  flex: 1 1 0;
  min-inline-size: 30%;
  max-inline-size: 46%;
  font-size: 13px;
  line-height: 1.3;
  color: rgba(13, 26, 74, 0.68);
  text-align: end;
  /* room (pulled back by the negative margin) so the clamp ellipsis is never cut off at the right edge */
  padding-inline-end: 0.6em;
  margin-inline-end: -0.6em;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

/* top cap: cobalt enamel inlay */
.ring {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  z-index: 2;
  inline-size: 36%;
  block-size: 36%;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, #1f47e6 38%, transparent);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9);
}

.dot {
  inline-size: 34%;
  block-size: 34%;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, color-mix(in srgb, #1f47e6 60%, #ffffff) 0%, #1f47e6 62%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.95),
    inset 0 -2px 4px rgba(0, 10, 80, 0.35);
}

/* content choreography (plays when a face is turned to) */
.rise {
  animation: cf-rise 560ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: var(--d, 0ms);
}

.draw {
  animation: cf-draw 760ms cubic-bezier(0.5, 0, 0.2, 1) 120ms both;
}

@keyframes cf-rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes cf-draw {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* ---------- controls ---------- */

.controls {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  inline-size: 100%;
}

/* wide: the control row lines up under the cube, not the page centre */
@container (min-width: 700px) {
  .controls {
    align-self: flex-start;
    inline-size: calc(var(--side) * 1.3);
    margin-inline-start: max(0px, calc((100cqi - 2 * var(--padx)) * var(--cxr) - var(--side) * 0.65));
  }
}

.tabs {
  --i: 0;
  position: relative;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: 1fr;
  inline-size: min(100%, 440px);
  padding: 4px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
}

.pill {
  position: absolute;
  inset-block: 4px;
  inset-inline-start: 4px;
  inline-size: calc((100% - 8px) / 4);
  border-radius: 999px;
  background: #f3f4f1;
  box-shadow:
    0 1px 2px rgba(2, 8, 48, 0.35),
    0 8px 16px -8px rgba(2, 8, 48, 0.55);
  transform: translateX(calc(var(--i) * 100%));
  transition: transform 560ms cubic-bezier(0.34, 1.3, 0.5, 1);
}

.tab {
  position: relative;
  z-index: 1;
  min-inline-size: 0;
  min-block-size: 40px;
  padding-inline: 8px;
  border: 0;
  border-radius: 999px;
  background: none;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.005em;
  color: rgba(255, 255, 255, 0.82);
  text-wrap: balance;
  overflow-wrap: anywhere;
  cursor: pointer;
  transition: color 240ms ease;
}

.tab:hover {
  color: #ffffff;
}

.tabOn,
.tabOn:hover {
  color: #1f47e6;
}

.arrow,
.pause {
  flex: none;
  display: grid;
  place-items: center;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.06);
  color: #ffffff;
  cursor: pointer;
  transition:
    background-color 200ms ease,
    transform 220ms cubic-bezier(0.3, 1.5, 0.5, 1);
}

.arrow {
  inline-size: 44px;
  block-size: 44px;
}

.chev {
  inline-size: 20px;
  block-size: 20px;
}

.pause {
  inline-size: 36px;
  block-size: 36px;
  border-color: transparent;
  background: transparent;
  color: rgba(255, 255, 255, 0.75);
}

.pauseGlyph {
  inline-size: 16px;
  block-size: 16px;
}

.arrow:hover,
.pause:hover {
  background: rgba(255, 255, 255, 0.14);
}

.arrow:active,
.pause:active {
  transform: scale(0.93);
}

.tab:focus-visible,
.arrow:focus-visible,
.pause:focus-visible {
  outline: 2px solid #f3f4f1;
  outline-offset: 3px;
}

@container (max-width: 560px) {
  .arrow {
    display: none;
  }

  .tabs {
    flex: 1 1 auto;
  }

  .tab {
    padding-inline: 4px;
    font-size: 13px;
  }
}

/* phone width: tabs wrap to two rows so every label stays whole */
@container (max-width: 420px) {
  .tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-radius: 26px;
  }

  .pill {
    inset-block: 4px auto;
    inline-size: calc((100% - 8px) / 2);
    block-size: calc((100% - 8px) / 2);
    border-radius: 22px;
    transform: translate(calc(var(--c, 0) * 100%), calc(var(--r, 0) * 100%));
  }

  .tab {
    padding-inline: 6px;
    font-size: 13px;
  }
}

/* ---------- reduced motion: flat tabbed tile with fade ---------- */

.stageFlat {
  perspective: none;
  cursor: default;
}

.cubeFlat {
  transform: none;
  transform-style: flat;
  will-change: auto;
  filter: drop-shadow(0 26px 30px rgba(1, 6, 40, 0.5));
}

.faceFlat {
  transform: none;
  opacity: 0;
  backface-visibility: visible;
  border-radius: calc(var(--side) * 0.05);
  transition: opacity 420ms ease;
  --sh: 0;
  --gl: 14%;
  --glo: 0.5;
}

.faceFlatOn {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .rise,
  .draw {
    animation: none;
  }

  .word,
  .pill {
    transition-duration: 1ms;
  }
}
```
