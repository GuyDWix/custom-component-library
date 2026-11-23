const e=`import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface LazySusanItem {
  image: string;
  name: string;
  price: string;
}

export interface LazySusanMenuProps {
  items?: LazySusanItem[];
  plateSize?: number;
  spinSpeed?: number;
  tableTone?: string;
  className?: string;
}

export const defaultItems: LazySusanItem[] = [
  {
    image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=560&h=560&fit=crop&q=80',
    name: 'Basil tagliatelle',
    price: '$19',
  },
  {
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=560&h=560&fit=crop&q=80',
    name: 'Wood-fired margherita',
    price: '$16',
  },
  {
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=560&h=560&fit=crop&q=80',
    name: 'Harvest grain bowl',
    price: '$14',
  },
  {
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=560&h=560&fit=crop&q=80',
    name: 'Seared duck, cherry jus',
    price: '$26',
  },
  {
    image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=560&h=560&fit=crop&q=80',
    name: 'Vanilla panna cotta',
    price: '$9',
  },
];

type Mode = 'idle' | 'drag' | 'spin' | 'snap';

const SPRING_K = 140;
const SPRING_C = 18.5;
const FRICTION = 1.1;
const SNAP_VEL = 100;
const MAX_VEL = 960;
const TAP_DEG = 2.5;
const LIGHT_X = -0.64; /* light position from the table centre, in table widths (x right, y down) */
const LIGHT_Y = -0.42;
const LIGHT_LOBE = ((Math.atan2(LIGHT_X, -LIGHT_Y) * 180) / Math.PI + 360) % 360; /* bearing of the light, deg clockwise from 12 o'clock */
const FRONT_DIR = 180; /* the front of the table is 6 o'clock */
const ORBIT = 29.5; /* plate orbit as % of table width */

const mod = (a: number, m: number) => ((a % m) + m) % m;

const dAng = (from: number, to: number) => {
  let d = (to - from) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
};

/* Lighting for a plate sitting at bearing \`w\` (deg from 12 o'clock): irradiance falls off with
   distance to the light, and the cast shadow points straight away from it. */
const plateLight = (w: number) => {
  const rad = (w * Math.PI) / 180;
  const dx = LIGHT_X - (ORBIT / 100) * Math.sin(rad);
  const dy = LIGHT_Y + (ORBIT / 100) * Math.cos(rad);
  const d = Math.hypot(dx, dy) || 1;
  const irradiance = 1 / (1 + (d / 0.62) ** 2);
  const t = Math.min(1, Math.max(0, (irradiance - 0.25) / 0.38));
  return {
    light: 0.4 + 0.6 * t,
    near: Math.max(0, Math.cos(((w - FRONT_DIR) * Math.PI) / 180)),
    sx: -dx / d,
    sy: -dy / d,
  };
};

const plateVars = (w: number) => {
  const p = plateLight(w);
  return {
    '--ls-light': p.light.toFixed(3),
    '--ls-near': p.near.toFixed(3),
    '--ls-sx': p.sx.toFixed(3),
    '--ls-sy': p.sy.toFixed(3),
  };
};

/* Long dish names shrink so the label card never clips or grows tall. */
const nameScale = (name: string) => {
  const n = name.trim().length;
  return n > 70 ? 0.6 : n > 46 ? 0.72 : n > 30 ? 0.84 : 1;
};

const SPIN_HELP =
  'Drag to spin the turntable, tap a dish to bring it to the front, or use the left and right arrow keys.';

function ArrowIcon({ d }: { d: string }) {
  return (
    <svg
      className={styles.arrowSvg}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export default function LazySusanMenu({
  items = defaultItems,
  plateSize = 26,
  spinSpeed = 1,
  tableTone = '#22272b',
  className,
}: LazySusanMenuProps) {
  const count = items.length;
  const step = count > 0 ? 360 / count : 360;
  const spin = Math.min(3, Math.max(0.25, spinSpeed));

  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [announced, setAnnounced] = useState('');
  const [epoch, setEpoch] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const motion = useRef({ angle: 0, vel: 0, target: 0, mode: 'idle' as Mode, lastIdx: 0 });
  const drag = useRef({ id: -1, moved: 0, lastA: 0, lastT: 0, vel: 0, cx: 0, cy: 0 });
  const clickGuard = useRef(false);
  const itemsRef = useRef(items);

  itemsRef.current = items;

  const plateD = useMemo(() => {
    const base = Math.min(44, Math.max(14, plateSize));
    if (count < 2) return Math.min(base, 30);
    const arc = 2 * ORBIT * Math.sin(Math.PI / count) * 0.94;
    return Math.max(12, Math.min(base, arc));
  }, [plateSize, count]);

  const describe = useCallback((idx: number) => {
    const list = itemsRef.current;
    if (list.length === 0) return '';
    const it = list[mod(idx, list.length)];
    return [it.name, it.price].filter(Boolean).join(', ');
  }, []);

  const wake = useCallback(() => setEpoch((v) => v + 1), []);

  const paint = useCallback(
    (angle: number) => {
      const table = tableRef.current;
      if (table) table.style.setProperty('--ls-rot', \`\${angle.toFixed(2)}deg\`);
      if (count === 0) return;
      for (let i = 0; i < count; i++) {
        const el = slotRefs.current[i];
        if (!el) continue;
        const vars = plateVars(180 + i * step + angle);
        for (const k in vars) el.style.setProperty(k, vars[k as keyof typeof vars]);
      }
      const idx = mod(Math.round(-angle / step), count);
      if (idx !== motion.current.lastIdx) {
        motion.current.lastIdx = idx;
        setActiveIndex(idx);
      }
    },
    [count, step],
  );

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

  /* Initial paint + re-align when the item count changes. */
  useLayoutEffect(() => {
    const m = motion.current;
    if (m.mode !== 'idle') return;
    m.angle = Math.round(m.angle / step) * step;
    m.lastIdx = count > 0 ? mod(Math.round(-m.angle / step), count) : 0;
    paint(m.angle);
  }, [count, step, paint]);

  /* Reduced motion steps instantly; repaint without the animation loop. */
  useLayoutEffect(() => {
    if (reduced) paint(motion.current.angle);
  }, [reduced, activeIndex, paint]);

  useEffect(() => {
    if (reduced || !inView) return;
    const m = motion.current;
    if (m.mode !== 'spin' && m.mode !== 'snap') return;
    let last = performance.now();
    let id = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      if (m.mode === 'spin') {
        m.vel *= Math.exp(-FRICTION * dt);
        m.angle += m.vel * dt;
        if (Math.abs(m.vel) < SNAP_VEL) {
          m.mode = 'snap';
          m.target = Math.round(m.angle / step) * step;
        }
      } else if (m.mode === 'snap') {
        const sub = Math.max(1, Math.ceil(dt / (1 / 120)));
        const h = dt / sub;
        for (let s = 0; s < sub; s++) {
          const acc = SPRING_K * (m.target - m.angle) - SPRING_C * m.vel;
          m.vel += acc * h;
          m.angle += m.vel * h;
        }
        if (Math.abs(m.target - m.angle) < 0.08 && Math.abs(m.vel) < 3) {
          m.angle = mod(m.target, 360);
          m.vel = 0;
          m.mode = 'idle';
          setAnnounced(describe(m.lastIdx));
          paint(m.angle);
          return;
        }
      }
      paint(m.angle);
      if (m.mode !== 'idle') id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [reduced, inView, epoch, step, paint, describe]);

  const goTo = useCallback(
    (rawIdx: number) => {
      if (count === 0) return;
      const k = mod(rawIdx, count);
      const m = motion.current;
      const base = -k * step;
      const target = base + 360 * Math.round((m.angle - base) / 360);
      if (reduced) {
        m.angle = target;
        m.vel = 0;
        m.mode = 'idle';
        m.lastIdx = k;
        setActiveIndex(k);
        setAnnounced(describe(k));
        return;
      }
      const dist = target - m.angle;
      m.target = target;
      m.vel = Math.sign(dist) * Math.min(260, Math.abs(dist) * 4.2) * spin;
      m.mode = 'snap';
      wake();
    },
    [count, step, reduced, spin, describe, wake],
  );

  const stepBy = useCallback(
    (dir: number) => {
      if (count > 0) goTo(motion.current.lastIdx + dir);
    },
    [count, goTo],
  );

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (count < 2) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stepBy(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      stepBy(1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      goTo(0);
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const d = drag.current;
    d.id = e.pointerId;
    d.moved = 0;
    d.vel = 0;
    d.cx = rect.left + rect.width / 2;
    d.cy = rect.top + rect.height / 2;
    d.lastA = (Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180) / Math.PI;
    d.lastT = performance.now();
    clickGuard.current = false;
    const m = motion.current;
    m.angle = mod(m.angle, 360);
    m.vel = 0;
    m.mode = 'drag';
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d.id !== e.pointerId) return;
    const a = (Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180) / Math.PI;
    const delta = dAng(d.lastA, a);
    const now = performance.now();
    const dt = Math.max((now - d.lastT) / 1000, 1 / 240);
    d.moved += Math.abs(delta);
    d.vel = d.vel * 0.78 + (delta / dt) * 0.22;
    d.lastA = a;
    d.lastT = now;
    const m = motion.current;
    m.angle += delta;
    paint(m.angle);
  };

  const finishDrag = (e: PointerEvent<HTMLDivElement>, canceled: boolean) => {
    const d = drag.current;
    if (d.id !== e.pointerId) return;
    d.id = -1;
    const el = e.currentTarget;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    const m = motion.current;
    if (m.mode !== 'drag') {
      wake();
      return;
    }
    clickGuard.current = canceled || d.moved >= TAP_DEG;
    if (d.moved < TAP_DEG) {
      m.mode = 'snap';
      m.target = Math.round(m.angle / step) * step;
      m.vel = 0;
    } else {
      m.mode = 'spin';
      m.vel = Math.max(-MAX_VEL, Math.min(MAX_VEL, d.vel * spin));
      if (Math.abs(m.vel) < SNAP_VEL) {
        m.mode = 'snap';
        m.target = Math.round(m.angle / step) * step;
        m.vel = 0;
      }
    }
    wake();
  };

  const rootStyle = {
    '--ls-tone': tableTone,
    '--ls-plate': String(plateD),
    '--ls-orbit': String(ORBIT),
    '--ls-lx': String(LIGHT_X),
    '--ls-ly': String(LIGHT_Y),
    '--ls-lobe': \`\${LIGHT_LOBE.toFixed(1)}deg\`,
  } as CSSProperties;

  const slotVars = useMemo(
    () =>
      items.map((_, i) => {
        const w = 180 + i * step;
        return { '--ls-pbase': \`\${w}deg\`, ...plateVars(w) } as CSSProperties;
      }),
    [items, step],
  );

  const frontIdx = count > 0 ? activeIndex % count : 0;
  const front = count > 0 ? items[frontIdx] : undefined;

  const frontName = front?.name ?? '';

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
    >
      <div
        className={styles.tableScene}
        role="group"
        tabIndex={0}
        aria-label="Dish turntable"
        aria-description={SPIN_HELP}
        onKeyDown={onKey}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finishDrag(e, false)}
        onPointerCancel={(e) => finishDrag(e, true)}
      >
        <span className={styles.tableShadow} aria-hidden="true" />

        <div ref={tableRef} className={styles.table}>
          <span className={styles.stone} aria-hidden="true" />
          <span className={styles.ticks} aria-hidden="true" />
          <span className={styles.sheen} aria-hidden="true" />

          {items.map((it, i) => {
            const initial = it.name.trim().charAt(0).toUpperCase();
            return (
              <div
                key={i}
                className={styles.slot}
                style={slotVars[i]}
                ref={(el) => {
                  slotRefs.current[i] = el;
                }}
              >
                <button
                  type="button"
                  className={styles.plate}
                  aria-label={it.name ? \`Show \${it.name}\` : \`Dish \${i + 1}\`}
                  onClick={() => {
                    if (!clickGuard.current) goTo(i);
                  }}
                >
                  <span className={styles.plateWell}>
                    {it.image ? (
                      <img
                        className={styles.platePhoto}
                        src={it.image}
                        alt={it.name || 'Dish'}
                        draggable={false}
                      />
                    ) : (
                      initial && (
                        <span className={styles.plateInitial} aria-hidden="true">
                          {initial}
                        </span>
                      )
                    )}
                  </span>
                  <span className={styles.plateShade} aria-hidden="true" />
                </button>
              </div>
            );
          })}

          <span className={styles.falloff} aria-hidden="true" />
          <span className={styles.rim} aria-hidden="true" />
          <span className={styles.hub} aria-hidden="true" />
          <span className={styles.hubRing} aria-hidden="true" />
        </div>
      </div>

      <div className={styles.console}>
        {count > 1 && (
          <button type="button" className={styles.arrow} aria-label="Previous dish" onClick={() => stepBy(-1)}>
            <ArrowIcon d="M15 5l-7 7 7 7" />
          </button>
        )}

        {front && (front.name || front.price) && (
          <div
            className={styles.labelCard}
            key={frontIdx}
            style={{ '--ls-name-scale': String(nameScale(frontName)) } as CSSProperties}
          >
            {front.name && <p className={styles.dishName}>{front.name}</p>}
            {front.price && (
              <p className={styles.priceRow}>
                <span className={styles.priceRule} aria-hidden="true" />
                <span className={styles.price} title={front.price}>{front.price}</span>
                <span className={styles.priceRule} aria-hidden="true" />
              </p>
            )}
          </div>
        )}

        {count > 1 && (
          <button type="button" className={styles.arrow} aria-label="Next dish" onClick={() => stepBy(1)}>
            <ArrowIcon d="M9 5l7 7-7 7" />
          </button>
        )}

        <p className={styles.live} aria-live="polite">
          {announced}
        </p>
      </div>
    </div>
  );
}
`;export{e as default};
