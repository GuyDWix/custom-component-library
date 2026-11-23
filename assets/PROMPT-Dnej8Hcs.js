const n=`Create a custom element called "Lazy Susan Menu". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: dishes (image, name, price), plate size, spin speed, table tone. Add other settings if they help.

\`\`\`tsx
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
\`\`\`

\`\`\`css
@font-face {
  font-family: 'Lazy Susan Display';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(data:font/woff2;base64,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) format('woff2');
}

.root {
  /* Re-themable palette. The stone colour comes from the tableTone prop. */
  --ls-tone: #22272b;
  --ls-plate: 26;
  --ls-orbit: 29.5;
  --ls-lx: -0.64;
  --ls-ly: -0.42;
  --ls-lobe: 303deg;
  --ls-ink-bg: #0c1012;
  --ls-ink-bg-lo: #050708;
  --ls-ivory: #f4efe4;
  --ls-champagne: #d9c18f;
  --ls-hair: rgba(255, 255, 255, 0.12);
  --ls-display: 'Lazy Susan Display', 'DM Serif Display', 'Iowan Old Style', Georgia, serif;
  /* The table's rendered width; only valid on direct children of the root. */
  --ls-d: min(100cqi, 700px);

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  display: grid;
  justify-items: center;
  align-content: start;
  padding-block: 28px 16px;
  padding-inline: 20px;
  border-radius: 28px;
  background:
    radial-gradient(70% 55% at 30% 24%, rgba(255, 255, 255, 0.055), transparent 70%),
    radial-gradient(150% 110% at 50% 42%, var(--ls-ink-bg) 0%, var(--ls-ink-bg-lo) 100%);
  color: var(--ls-ivory);
  font-family: var(--ls-display);
}

.root ::selection {
  background: rgba(217, 193, 143, 0.4);
  color: #fff;
}

/* ---------- turntable ---------- */

.tableScene {
  position: relative;
  z-index: 2;
  inline-size: min(100%, 700px);
  aspect-ratio: 1;
  border-radius: 50%;
  outline: none;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.tableScene:active {
  cursor: grabbing;
}

.tableScene:focus-visible {
  outline: 2px solid rgba(217, 193, 143, 0.85);
  outline-offset: 10px;
}

/* One soft drop shadow, thrown away from the light (upper left). */
.tableShadow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
  box-shadow:
    0 calc(var(--ls-d) * 0.004) calc(var(--ls-d) * 0.01) rgba(0, 0, 0, 0.6),
    calc(var(--ls-d) * 0.03) calc(var(--ls-d) * 0.04) calc(var(--ls-d) * 0.08) rgba(0, 0, 0, 0.5),
    calc(var(--ls-d) * 0.07) calc(var(--ls-d) * 0.1) calc(var(--ls-d) * 0.16) calc(var(--ls-d) * -0.03) rgba(0, 0, 0, 0.45);
}

.table {
  --ls-rot: 0deg;

  position: absolute;
  inset: 0;
  border-radius: 50%;
  container-type: inline-size;
}

.stone,
.ticks,
.sheen,
.rim,
.hub,
.hubRing,
.falloff {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
}

/* Matte stone: tonal gradient plus fine grain. Turns with the table so the grain reads as rotation. */
.stone {
  background:
    url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .9  0 0 0 0 .92  0 0 0 0 .95  0 0 0 .1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"),
    conic-gradient(
      from 20deg,
      rgba(255, 255, 255, 0.035),
      rgba(0, 0, 0, 0.1) 70deg,
      rgba(255, 255, 255, 0.03) 150deg,
      rgba(0, 0, 0, 0.12) 230deg,
      rgba(255, 255, 255, 0.04) 310deg,
      rgba(255, 255, 255, 0.035) 360deg
    ),
    radial-gradient(
      circle at 50% 50%,
      color-mix(in srgb, var(--ls-tone) 88%, white) 0%,
      var(--ls-tone) 55%,
      color-mix(in srgb, var(--ls-tone) 72%, black) 100%
    );
  transform: rotate(var(--ls-rot));
  will-change: transform;
}

/* Hairline graduation ring, turns with the table. */
.ticks {
  transform: rotate(var(--ls-rot));
  will-change: transform;
}

.ticks::before,
.ticks::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
}

.ticks::before {
  background: repeating-conic-gradient(rgba(255, 255, 255, 0.2) 0deg 0.35deg, transparent 0.35deg 3deg);
  -webkit-mask-image: radial-gradient(closest-side, transparent 91.2%, #000 91.5%, #000 93.8%, transparent 94.1%);
  mask-image: radial-gradient(closest-side, transparent 91.2%, #000 91.5%, #000 93.8%, transparent 94.1%);
}

.ticks::after {
  background: repeating-conic-gradient(rgba(217, 193, 143, 0.65) 0deg 0.45deg, transparent 0.45deg 15deg);
  -webkit-mask-image: radial-gradient(closest-side, transparent 89.7%, #000 90%, #000 94%, transparent 94.3%);
  mask-image: radial-gradient(closest-side, transparent 89.7%, #000 90%, #000 94%, transparent 94.3%);
}

/* Single soft light from the upper left, fixed while the stone turns. */
.sheen {
  background:
    radial-gradient(
      circle 90cqw at calc(50% + var(--ls-lx) * 100%) calc(50% + var(--ls-ly) * 100%),
      rgba(255, 255, 255, 0.11) 0%,
      rgba(255, 255, 255, 0.03) 45%,
      transparent 72%
    ),
    conic-gradient(
      from calc(var(--ls-lobe) - 30deg),
      transparent 0deg,
      rgba(255, 255, 255, 0.05) 30deg,
      transparent 60deg,
      transparent 180deg,
      rgba(255, 255, 255, 0.02) 210deg,
      transparent 240deg
    );
}

.falloff {
  background: radial-gradient(
    circle 120cqw at calc(50% + var(--ls-lx) * 100%) calc(50% + var(--ls-ly) * 100%),
    transparent 30%,
    rgba(0, 0, 0, 0.38) 100%
  );
}

/* Thin edge highlight: a hairline catching the light on the upper left, plus a dark outer keyline. */
.rim {
  background:
    conic-gradient(
      from calc(var(--ls-lobe) - 70deg),
      rgba(255, 255, 255, 0) 0deg,
      rgba(255, 255, 255, 0.85) 70deg,
      rgba(255, 255, 255, 0) 140deg,
      rgba(255, 255, 255, 0) 180deg,
      rgba(255, 255, 255, 0.18) 250deg,
      rgba(255, 255, 255, 0) 320deg,
      rgba(255, 255, 255, 0) 360deg
    ),
    radial-gradient(closest-side, transparent 98.8%, rgba(0, 0, 0, 0.55) 99.8%);
  -webkit-mask-image: radial-gradient(closest-side, transparent 98.6%, #000 98.9%, #000 100%);
  mask-image: radial-gradient(closest-side, transparent 98.6%, #000 98.9%, #000 100%);
}

.rim::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

/* Centre hub: a quiet matte disc with a champagne hairline. */
.hub,
.hubRing {
  inset: 46.2%;
}

.hub {
  background: radial-gradient(circle at 36% 30%, #3a4147 0%, #1b1f23 62%, #111417 100%);
  box-shadow:
    0 0.25cqw 0.7cqw rgba(0, 0, 0, 0.55),
    inset 0 0.12cqw 0 rgba(255, 255, 255, 0.18);
}

.hubRing {
  inset: 47.6%;
  box-shadow:
    0 0 0 0.12cqw rgba(217, 193, 143, 0.7),
    inset 0 0 0.5cqw rgba(0, 0, 0, 0.5);
  transform: rotate(var(--ls-rot));
  background: conic-gradient(rgba(217, 193, 143, 0.18), rgba(217, 193, 143, 0.04) 180deg, rgba(217, 193, 143, 0.18));
}

/* ---------- plates ---------- */

.slot {
  --ls-light: 0.75;
  --ls-near: 0;
  --ls-sx: 0.8;
  --ls-sy: 0.6;

  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  inline-size: calc(var(--ls-plate) * 1cqw);
  block-size: calc(var(--ls-plate) * 1cqw);
  margin-block-start: calc(var(--ls-plate) * -0.5cqw);
  margin-inline-start: calc(var(--ls-plate) * -0.5cqw);
  transform: rotate(calc(var(--ls-rot) + var(--ls-pbase))) translateY(calc(var(--ls-orbit) * -1cqw));
  pointer-events: none;
}

.plate {
  --ls-lift: calc(1 + var(--ls-near) * 0.75);

  position: relative;
  display: block;
  inline-size: 100%;
  block-size: 100%;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, #faf8f3 0 55%, #efebe2 100%);
  cursor: pointer;
  pointer-events: auto;
  transform: rotate(calc((var(--ls-rot) + var(--ls-pbase)) * -1)) scale(calc(0.88 + var(--ls-near) * 0.2));
  will-change: transform;
  /* Contact line plus two soft shadows cast away from the light (longer when lifted). */
  box-shadow:
    0 0 0 0.1cqw rgba(0, 0, 0, 0.4),
    calc(var(--ls-sx) * 0.5cqw * var(--ls-lift)) calc(var(--ls-sy) * 0.5cqw * var(--ls-lift)) 1cqw rgba(0, 0, 0, 0.45),
    calc(var(--ls-sx) * 2cqw * var(--ls-lift)) calc(var(--ls-sy) * 2cqw * var(--ls-lift)) 3.2cqw -0.4cqw rgba(0, 0, 0, 0.38),
    inset 0 0 0 0.12cqw rgba(255, 255, 255, 0.9);
}

.plate:hover {
  filter: brightness(1.04);
}

.plate:focus-visible {
  outline: 2px solid var(--ls-champagne);
  outline-offset: 3px;
}

.plateWell {
  position: absolute;
  inset: 9%;
  display: block;
  border-radius: 50%;
  overflow: hidden;
  background: #e4dfd2;
  box-shadow:
    0 0 0 0.1cqw rgba(60, 50, 30, 0.22),
    inset calc(var(--ls-sx) * 0.4cqw) calc(var(--ls-sy) * 0.4cqw) 0.8cqw rgba(0, 0, 0, 0.35);
}

.platePhoto {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  transform: scale(1.14);
  user-select: none;
  -webkit-user-drag: none;
}

.plateInitial {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--ls-display);
  font-size: calc(var(--ls-plate) * 0.42 * 1cqw);
  color: #8d7a52;
  user-select: none;
}

/* Plates away from the light dim slightly. */
.plateShade {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
  background: rgba(10, 12, 14, 1);
  opacity: calc((1 - var(--ls-light)) * 0.5);
}

/* ---------- caption + controls ---------- */

.console {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(8px, 2cqi, 18px);
  inline-size: 100%;
  margin-block-start: calc(var(--ls-d) * -0.05);
}

.arrow {
  flex: none;
  display: grid;
  place-items: center;
  inline-size: 44px;
  block-size: 44px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--ls-hair);
  background: rgba(255, 255, 255, 0.04);
  color: var(--ls-ivory);
  cursor: pointer;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    transform 180ms ease;
}

.arrow:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(217, 193, 143, 0.55);
}

.arrow:active {
  transform: scale(0.94);
}

.arrow:focus-visible {
  outline: 2px solid var(--ls-champagne);
  outline-offset: 2px;
}

.arrowSvg {
  inline-size: 18px;
  block-size: 18px;
}

/* Frosted dark caption card with a hairline edge and a top highlight. */
.labelCard {
  flex: 1 1 0;
  min-inline-size: 0;
  max-inline-size: 480px;
  box-sizing: border-box;
  padding: 20px clamp(16px, 4cqi, 32px) 18px;
  border-radius: 16px;
  text-align: center;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.035));
  border: 1px solid var(--ls-hair);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 1px 2px rgba(0, 0, 0, 0.4),
    0 18px 36px -12px rgba(0, 0, 0, 0.65);
  animation: cardIn 420ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

.dishName {
  margin: 0;
  font-family: var(--ls-display);
  font-size: max(19px, calc(clamp(24px, 4.4cqi, 40px) * var(--ls-name-scale, 1)));
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: var(--ls-ivory);
  overflow-wrap: anywhere;
  text-wrap: balance;
  /* clamped so the card never grows past the frame (full name stays in the accessible label) */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.priceRow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 12px 0 0;
  min-inline-size: 0;
}

.priceRule {
  flex: none;
  inline-size: 28px;
  block-size: 1px;
  background: linear-gradient(90deg, transparent, rgba(217, 193, 143, 0.7), transparent);
}

.price {
  font-family: var(--ls-display);
  font-size: 19px;
  line-height: 1.2;
  letter-spacing: 0.08em;
  color: var(--ls-champagne);
  font-variant-numeric: lining-nums tabular-nums;
  /* one line, ellipsised: a pathological price must not push the card out of the frame */
  min-inline-size: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.live {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .labelCard {
    animation: none;
  }
}
\`\`\`
`;export{n as default};
