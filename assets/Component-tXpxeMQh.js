const e=`import { useCallback, useEffect, useId, useRef, useState } from 'react';
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
  faceColor?: string;
  accentColor?: string;
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
    body: '\\u201CI made the bowl I eat from every morning.\\u201D Nine in ten guests book a second session within the year.',
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
  const m = /^(\\S*\\d\\S*)\\s+([^\\d\\s].*)$/.exec(figure.trim());
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
  const s = drawing ? \`\${styles.stroke} \${styles.draw}\` : styles.stroke;
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
  faceColor = '#f3f4f1',
  accentColor = '#1f47e6',
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
    cube.style.transform = \`translate3d(0, \${(-m.l * 16).toFixed(2)}px, 0) scale(\${(1 + m.l * 0.02).toFixed(4)}) rotateX(\${m.p.toFixed(2)}deg) rotateY(\${(-m.a).toFixed(2)}deg)\`;
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
      el.style.setProperty('--gl', \`\${clamp(18 + wrapped * 1.15, -40, 150).toFixed(1)}%\`);
      el.style.setProperty('--glo', (cz > 0 ? clamp((dot - 0.05) * 1.2, 0, 0.85) : 0).toFixed(3));
    }
    const top = topRef.current;
    if (top) {
      const dotTop = -Math.cos(pr) * LIGHT.y + -Math.sin(pr) * LIGHT.z;
      top.style.setProperty('--sh', clamp((0.78 - dotTop) * 0.42, 0, 0.4).toFixed(3));
      top.style.setProperty('--gl', \`\${(50 + 60 * Math.sin(m.a * RAD)).toFixed(1)}%\`);
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

  const rootStyle = { '--cf-face': faceColor, '--cf-accent': accentColor } as CSSProperties;
  const animate = (on: boolean, delay: number): { className: string; style?: CSSProperties } =>
    on && turned && !reduced
      ? { className: styles.rise, style: { '--d': \`\${delay}ms\` } as CSSProperties }
      : { className: '' };

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
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
                  id={\`\${uid}-panel-\${i}\`}
                  role="tabpanel"
                  aria-labelledby={\`\${uid}-tab-\${i}\`}
                  aria-hidden={!on}
                  className={[
                    styles.face,
                    styles[\`f\${i}\` as 'f0'],
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
                id={\`\${uid}-tab-\${i}\`}
                aria-selected={i === active}
                aria-controls={\`\${uid}-panel-\${i}\`}
                title={f.label || undefined}
                tabIndex={i === active ? 0 : -1}
                className={[styles.tab, i === active ? styles.tabOn : ''].filter(Boolean).join(' ')}
                onClick={() => jump(i)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                {f.label || \`Face \${i + 1}\`}
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
`;export{e as default};
