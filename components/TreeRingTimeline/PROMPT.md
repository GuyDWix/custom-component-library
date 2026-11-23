Create a custom element called "Tree Ring Timeline". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: milestones (year, title, short note), centre label, wood tone, ring thickness style. Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export interface TreeRingMilestone {
  year: string;
  title: string;
  note?: string;
}

export type WoodTone = 'oak' | 'walnut' | 'ash';
export type RingThickness = 'natural' | 'even' | 'widening';

export interface TreeRingTimelineProps {
  milestones?: TreeRingMilestone[];
  centreLabel?: string;
  centreCaption?: string;
  eyebrow?: string;
  woodTone?: WoodTone;
  ringThickness?: RingThickness;
  ariaLabel?: string;
  className?: string;
}

export const defaultMilestones: TreeRingMilestone[] = [
  { year: '2009', title: 'A stall at the Saturday market', note: 'Two tables, one oven borrowed from a neighbour, and a sourdough starter we still feed every morning.' },
  { year: '2011', title: 'Our first bakery on Mill Lane', note: 'Twelve seats, a hand-painted sign and a queue that reached the corner by eight.' },
  { year: '2013', title: 'The wood-fired oven arrives', note: 'Built brick by brick over a winter. Every loaf since has carried a little of its smoke.' },
  { year: '2016', title: 'A second kitchen by the river', note: 'Room for a pastry bench, a proper coffee bar and the long oak table regulars now call home.' },
  { year: '2018', title: 'Baking classes begin', note: 'Saturday mornings with flour on every sleeve. Over two thousand students so far.' },
  { year: '2021', title: 'Grain from our own valley', note: 'We now mill heritage wheat grown twenty minutes away, by farmers we know by name.' },
  { year: '2023', title: 'Named Bakery of the Year', note: 'The regional food awards picked our rye. We framed the certificate above the oven.' },
  { year: '2025', title: 'Sixteen years, still rising', note: 'Forty people, three kitchens and the same starter from the very first Saturday.' },
];

const VIEW = 480;
const C = VIEW / 2;
const PITH = 44;
const OUTER = 196;
const BARK = 14;
const SAMPLES = 120;
const STIFFNESS = 420;
const DAMPING = 22;
const LINE_REST = 1.6;
const LINE_ACTIVE = 5.2;
const TAG_ANGLE = -Math.PI / 2;

const mulberry = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type Wave = { k: number; a: number; p: number };

const waves = (rand: () => number, ks: number[], amp: number): Wave[] =>
  ks.map((k) => ({ k, a: amp * (0.4 + rand() * 0.6) / Math.sqrt(k), p: rand() * Math.PI * 2 }));

const SHAPE = waves(mulberry(7), [1, 2, 3, 5], 0.034);

const radiusAt = (r: number, theta: number, jitter: Wave[], growth: number) => {
  let f = 1;
  for (const w of SHAPE) f += w.a * growth * Math.sin(w.k * theta + w.p);
  let j = 0;
  for (const w of jitter) j += w.a * Math.sin(w.k * theta + w.p);
  return r * f + j;
};

const fmt = (n: number) => n.toFixed(2);

const closedPath = (r: number, jitter: Wave[], growth = r / OUTER) => {
  const pts = Array.from({ length: SAMPLES }, (_, i) => {
    const t = (i / SAMPLES) * Math.PI * 2;
    const rr = radiusAt(r, t, jitter, growth);
    return [C + rr * Math.cos(t), C + rr * Math.sin(t)];
  });
  const at = (i: number) => pts[(i + SAMPLES) % SAMPLES];
  let d = `M${fmt(pts[0][0])} ${fmt(pts[0][1])}`;
  for (let i = 0; i < SAMPLES; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    d += `C${fmt(p1[0] + (p2[0] - p0[0]) / 6)} ${fmt(p1[1] + (p2[1] - p0[1]) / 6)} ${fmt(p2[0] - (p3[0] - p1[0]) / 6)} ${fmt(p2[1] - (p3[1] - p1[1]) / 6)} ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return `${d}Z`;
};

const ringWidths = (count: number, style: RingThickness) => {
  const rand = mulberry(31 + count);
  const raw = Array.from({ length: count }, (_, i) => {
    if (style === 'even') return 1;
    if (style === 'widening') return 0.55 + (i / Math.max(count - 1, 1)) * 0.9;
    return 0.6 + rand() * 0.8;
  });
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => (w / sum) * (OUTER - PITH));
};

type Ring = { outer: number; inner: number; line: string; band: string; grain: string[]; heart: number; tagY: number };

const buildRings = (count: number, style: RingThickness): Ring[] => {
  const widths = ringWidths(count, style);
  let inner = PITH;
  let innerPath = closedPath(PITH, []);
  return widths.map((w, i) => {
    const rand = mulberry(101 + i * 17);
    const outer = inner + w;
    const jitter = waves(rand, [7, 11, 17, 23], Math.min(w * 0.09, 0.9));
    const line = closedPath(outer, jitter);
    const grain = [0.38, 0.7].filter(() => w > 7).map((f) => closedPath(inner + w * f, waves(rand, [9, 13], Math.min(w * 0.06, 0.6))));
    const ring: Ring = {
      outer,
      inner,
      line,
      band: `${line}${innerPath}`,
      grain,
      heart: Math.max(0, 1 - (i + 0.5) / (count * 0.62)),
      tagY: C - radiusAt(outer, TAG_ANGLE, jitter, outer / OUTER),
    };
    inner = outer;
    innerPath = line;
    return ring;
  });
};

const RAYS = (() => {
  const rand = mulberry(53);
  return Array.from({ length: 22 }, (_, i) => {
    const t = (i / 22) * Math.PI * 2 + rand() * 0.2;
    const r0 = PITH + 6 + rand() * 40;
    const r1 = OUTER - 4 - rand() * 50;
    return { x1: C + r0 * Math.cos(t), y1: C + r0 * Math.sin(t), x2: C + r1 * Math.cos(t), y2: C + r1 * Math.sin(t), o: 0.25 + rand() * 0.5 };
  });
})();

const BARK_PATH = closedPath(OUTER + BARK, waves(mulberry(77), [19, 29, 41, 57, 73], 1.4), 1);
const CAMBIUM_PATH = closedPath(OUTER + 1.5, [], 1);
const PITH_PATH = closedPath(PITH, waves(mulberry(9), [3, 5], 0.8), 0.25);
const CHECK = `M${C + (OUTER + 6) * Math.cos(0.62)} ${C + (OUTER + 6) * Math.sin(0.62)}L${C + 128 * Math.cos(0.605)} ${C + 128 * Math.sin(0.605)}L${C + (OUTER + 6) * Math.cos(0.585)} ${C + (OUTER + 6) * Math.sin(0.585)}Z`;

const RINGS_HELP = 'Hover or tap a ring; arrow keys step through the years.';

export default function TreeRingTimeline({
  milestones = defaultMilestones,
  centreLabel = 'Since 2009',
  centreCaption = 'Est.',
  eyebrow = 'Our story, ring by ring',
  woodTone = 'oak',
  ringThickness = 'natural',
  ariaLabel = 'Years in business',
  className,
}: TreeRingTimelineProps) {
  const uid = useId().replace(/:/g, '');
  const count = milestones.length;
  const rings = useMemo(() => buildRings(count, ringThickness), [count, ringThickness]);
  const [active, setActive] = useState(Math.max(count - 1, 0));
  const [visible, setVisible] = useState(false);
  const [stepped, setStepped] = useState(false);

  const rootRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const lineEls = useRef<(SVGPathElement | null)[]>([]);
  const springs = useRef<{ w: number; v: number }[]>([]);
  const activeRef = useRef(active);
  const raf = useRef(0);

  activeRef.current = active;

  useEffect(() => {
    setActive((a) => Math.min(Math.max(a, 0), Math.max(count - 1, 0)));
  }, [count]);

  const tick = useCallback((now: number, last: number) => {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    let busy = false;
    springs.current.forEach((s, i) => {
      const target = i === activeRef.current ? LINE_ACTIVE : LINE_REST;
      for (let n = 0; n < 4; n++) {
        s.v += (STIFFNESS * (target - s.w) - DAMPING * s.v) * (dt / 4);
        s.w += s.v * (dt / 4);
      }
      if (Math.abs(target - s.w) > 0.01 || Math.abs(s.v) > 0.05) busy = true;
      lineEls.current[i]?.setAttribute('stroke-width', s.w.toFixed(3));
    });
    raf.current = busy ? requestAnimationFrame((t) => tick(t, now)) : 0;
  }, []);

  useEffect(() => {
    if (springs.current.length !== count) {
      springs.current = Array.from({ length: count }, (_, i) => {
        const w = i === activeRef.current ? LINE_ACTIVE : LINE_REST;
        return springs.current[i] ?? { w, v: 0 };
      });
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      springs.current.forEach((s, i) => {
        s.w = i === active ? LINE_ACTIVE : LINE_REST;
        s.v = 0;
        lineEls.current[i]?.setAttribute('stroke-width', String(s.w));
      });
      return;
    }
    if (!raf.current) {
      const start = performance.now();
      raf.current = requestAnimationFrame((t) => tick(t, start - 16));
    }
  }, [active, count, tick]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const list = listRef.current;
    const row = list?.children[active] as HTMLElement | undefined;
    if (!stepped || !list || !row || list.scrollHeight <= list.clientHeight) return;
    const top = row.offsetTop - list.offsetTop;
    if (top < list.scrollTop || top + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: top - list.clientHeight / 2 + row.offsetHeight / 2, behavior: 'smooth' });
    }
  }, [active, stepped]);

  const select = useCallback((i: number) => {
    setActive(i);
    setStepped(true);
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowRight: active + 1,
      ArrowUp: active + 1,
      ArrowLeft: active - 1,
      ArrowDown: active - 1,
      Home: 0,
      End: count - 1,
    };
    const next = moves[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(Math.min(Math.max(next, 0), count - 1));
  };

  const current = milestones[active];
  const ring = rings[active];
  const stagger = Math.min(110, 1500 / Math.max(count, 1));
  const toneClass = styles[woodTone] ?? styles.oak;
  const rootClass = [styles.root, toneClass, visible && styles.play, className].filter(Boolean).join(' ');
  const id = (name: string) => `${uid}-${name}`;

  return (
    <section ref={rootRef} className={rootClass} aria-label={ariaLabel}>
      <span className={styles.grain} aria-hidden="true" />
      <div className={styles.inner}>
        <div className={styles.discCol}>
          <div
            className={styles.disc}
            role="slider"
            aria-description={RINGS_HELP}
            tabIndex={count ? 0 : -1}
            aria-label={ariaLabel}
            aria-valuemin={1}
            aria-valuemax={Math.max(count, 1)}
            aria-valuenow={active + 1}
            aria-valuetext={current ? `${current.year}: ${current.title}` : undefined}
            onKeyDown={onKeyDown}
          >
            <svg className={styles.svg} viewBox={`0 0 ${VIEW} ${VIEW}`} aria-hidden="true">
              <defs>
                <filter id={id('fiber')} x="0" y="0" width="100%" height="100%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.9 0.06" numOctaves="3" seed="4" />
                  <feColorMatrix values="0 0 0 0 0.25  0 0 0 0 0.15  0 0 0 0 0.06  0 0 0 0.55 0" />
                  <feComposite in2="SourceGraphic" operator="in" />
                </filter>
                <filter id={id('soft')}>
                  <feGaussianBlur stdDeviation="9" />
                </filter>
                <radialGradient id={id('light')} cx="0.32" cy="0.26" r="0.85">
                  <stop offset="0" stopColor="#fffaf0" stopOpacity="0.42" />
                  <stop offset="0.45" stopColor="#fffaf0" stopOpacity="0.06" />
                  <stop offset="0.8" stopColor="#3a210f" stopOpacity="0.04" />
                  <stop offset="1" stopColor="#3a210f" stopOpacity="0.32" />
                </radialGradient>
                <clipPath id={id('clip')}>
                  <path d={CAMBIUM_PATH} />
                </clipPath>
              </defs>

              <ellipse className={styles.shadow} cx={C + 10} cy={C + 26} rx={OUTER + 8} ry={OUTER - 4} filter={`url(#${id('soft')})`} />
              <path className={styles.edge} d={BARK_PATH} transform="translate(0 9)" />
              <path className={styles.bark} d={BARK_PATH} />
              <path className={styles.cambium} d={CAMBIUM_PATH} />

              <g clipPath={`url(#${id('clip')})`}>
                {rings.map((r, i) => (
                  <path
                    key={`b${i}`}
                    className={styles.band}
                    d={r.band}
                    fillRule="evenodd"
                    style={{ '--heart': `${Math.round(r.heart * 100)}%`, '--i': i, '--stagger': `${stagger}ms` } as CSSProperties}
                  />
                ))}
                <path className={styles.pith} d={PITH_PATH} />
                {RAYS.map((r, i) => (
                  <line key={`r${i}`} className={styles.ray} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} style={{ opacity: r.o }} />
                ))}
                {rings.map((r, i) =>
                  r.grain.map((g, k) => (
                    <path key={`g${i}-${k}`} className={styles.growth} d={g} pathLength={1} style={{ '--i': i, '--stagger': `${stagger}ms` } as CSSProperties} />
                  )),
                )}
                {rings.map((r, i) => (
                  <path
                    key={`l${i}`}
                    ref={(el) => {
                      lineEls.current[i] = el;
                    }}
                    className={i === active ? `${styles.line} ${styles.lineActive}` : styles.line}
                    d={r.line}
                    pathLength={1}
                    strokeWidth={i === active ? LINE_ACTIVE : LINE_REST}
                    style={{ '--i': i, '--stagger': `${stagger}ms` } as CSSProperties}
                  />
                ))}
                <rect x="0" y="0" width={VIEW} height={VIEW} filter={`url(#${id('fiber')})`} className={styles.fiber} />
                <path className={styles.check} d={CHECK} />
              </g>
              <path d={BARK_PATH} fill={`url(#${id('light')})`} className={styles.light} />

              {rings.map((r, i) => (
                <path
                  key={`h${i}`}
                  className={styles.hit}
                  d={r.band}
                  fillRule="evenodd"
                  onPointerEnter={(e) => e.pointerType === 'mouse' && select(i)}
                  onClick={() => select(i)}
                />
              ))}
              {ring && <circle className={styles.pin} cx={C} cy={ring.tagY} r="5" />}
            </svg>

            <div className={styles.stamp}>
              {centreCaption && <span className={styles.stampCaption}>{centreCaption}</span>}
              <span className={styles.stampLabel}>{centreLabel}</span>
            </div>

            {current && ring && (
              <div className={styles.tag} style={{ insetBlockStart: `${(ring.tagY / VIEW) * 100}%` }} aria-hidden="true">
                <span className={styles.tagYear}>{current.year}</span>
                <span className={styles.tagTitle}>{current.title}</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.story}>
          {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
          {current && (
            <div className={styles.feature} aria-live="polite">
              <p key={active} className={stepped ? `${styles.year} ${styles.yearIn}` : styles.year}>
                {current.year}
              </p>
              <h3 className={styles.title}>{current.title}</h3>
              {current.note && <p className={styles.note}>{current.note}</p>}
            </div>
          )}
          <ol ref={listRef} className={styles.list}>
            {milestones.map((m, i) => (
              <li key={i} className={styles.item}>
                <button
                  type="button"
                  className={i === active ? `${styles.row} ${styles.rowActive}` : styles.row}
                  aria-current={i === active ? 'step' : undefined}
                  onClick={() => select(i)}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && select(i)}
                >
                  <span className={styles.rowYear}>{m.year}</span>
                  <span className={styles.rowTitle}>{m.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
```

```css
.root {
  --trt-ground: #f4ede1;
  --trt-ground-deep: #e8dcc8;
  --trt-ink: #3a2314;
  --trt-muted: rgba(58, 35, 20, 0.66);
  --trt-honey: #e2b878;
  --trt-walnut: #8a5a34;
  --trt-latewood: #6b3f22;
  --trt-bark: #4a2e1c;
  --trt-bark-edge: #2e1b10;
  --trt-accent: #a4581f;
  --trt-paper: #fbf7ef;
  --trt-font-serif: 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif;
  --trt-font-ui: 'Avenir Next', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --trt-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85 .22' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.24  0 0 0 0 0.14  0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: 40px;
  padding-inline: 20px;
  border-radius: 28px;
  background:
    radial-gradient(60% 50% at 18% 12%, rgba(255, 252, 244, 0.9) 0%, transparent 70%),
    radial-gradient(70% 60% at 90% 100%, var(--trt-ground-deep) 0%, transparent 70%),
    var(--trt-ground);
  color: var(--trt-ink);
  font-family: var(--trt-font-serif);
}

.walnut {
  --trt-honey: #c08a55;
  --trt-walnut: #5b3720;
  --trt-latewood: #3f2414;
  --trt-bark: #33200f;
  --trt-bark-edge: #1f130a;
}

.ash {
  --trt-honey: #efd9b2;
  --trt-walnut: #b88f62;
  --trt-latewood: #8e6743;
  --trt-bark: #6a5442;
  --trt-bark-edge: #45352a;
}

.grain {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: var(--trt-noise);
  mix-blend-mode: multiply;
  opacity: 0.22;
}

.inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 28px;
  max-inline-size: 1120px;
  margin-inline: auto;
}

.discCol {
  display: grid;
  justify-items: center;
  gap: 12px;
  min-inline-size: 0;
}

.disc {
  position: relative;
  inline-size: min(100%, 320px);
  aspect-ratio: 1;
  border-radius: 50%;
  outline: none;
}

.disc:focus-visible {
  outline: 2px solid var(--trt-accent);
  outline-offset: 6px;
}

.svg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
}

.shadow {
  fill: rgba(46, 27, 16, 0.34);
}

.edge {
  fill: var(--trt-bark-edge);
}

.bark {
  fill: var(--trt-bark);
  stroke: var(--trt-bark-edge);
  stroke-width: 1.5;
}

.cambium {
  fill: color-mix(in srgb, var(--trt-honey) 55%, #fff6e4);
}

.band {
  fill: color-mix(in srgb, var(--trt-walnut) var(--heart), var(--trt-honey));
  transform-origin: 240px 240px;
}

.pith {
  fill: color-mix(in srgb, var(--trt-walnut) 80%, var(--trt-bark));
}

.ray {
  stroke: #fff3dc;
  stroke-width: 0.8;
  stroke-linecap: round;
  mix-blend-mode: soft-light;
}

.growth {
  fill: none;
  stroke: var(--trt-latewood);
  stroke-width: 0.55;
  opacity: 0.32;
}

.line {
  fill: none;
  stroke: var(--trt-latewood);
  stroke-linejoin: round;
  opacity: 0.82;
}

.lineActive {
  stroke: var(--trt-bark-edge);
  opacity: 1;
}

.fiber {
  fill: #fff;
  mix-blend-mode: multiply;
  opacity: 0.55;
  pointer-events: none;
}

.check {
  fill: var(--trt-bark-edge);
  opacity: 0.7;
}

.light {
  pointer-events: none;
}

.hit {
  fill: transparent;
  pointer-events: all;
  cursor: pointer;
}

.pin {
  fill: var(--trt-paper);
  stroke: var(--trt-bark-edge);
  stroke-width: 2;
  pointer-events: none;
  transition: cy 520ms cubic-bezier(0.34, 1.45, 0.5, 1);
}

.stamp {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  display: grid;
  place-content: center;
  justify-items: center;
  inline-size: 17%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle at 38% 32%, #fff9ec 0%, var(--trt-paper) 55%, #eadbc0 100%);
  box-shadow:
    0 0 0 2px var(--trt-bark-edge),
    0 0 0 5px color-mix(in srgb, var(--trt-paper) 70%, transparent),
    0 6px 14px rgba(46, 27, 16, 0.35);
  pointer-events: none;
  text-align: center;
  overflow: hidden;
}

.stampCaption {
  font-family: var(--trt-font-ui);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--trt-muted);
}

.stampLabel {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  max-inline-size: 90%;
  overflow: hidden;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.tag {
  position: absolute;
  inset-inline-start: 50%;
  display: none;
  align-items: baseline;
  gap: 8px;
  max-inline-size: 72%;
  padding-block: 7px;
  padding-inline: 12px;
  transform: translate(-50%, calc(-100% - 12px));
  border-radius: 999px;
  background: color-mix(in srgb, var(--trt-paper) 94%, transparent);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.8) inset,
    0 0 0 1px rgba(58, 35, 20, 0.16),
    0 10px 24px -8px rgba(46, 27, 16, 0.45);
  pointer-events: none;
  white-space: nowrap;
  transition: inset-block-start 520ms cubic-bezier(0.34, 1.45, 0.5, 1);
}

.tagYear {
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums lining-nums;
  color: var(--trt-accent);
}

.tagTitle {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
}

.story {
  display: grid;
  align-content: start;
  gap: 20px;
  min-inline-size: 0;
}

.eyebrow {
  margin: 0;
  font-family: var(--trt-font-ui);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--trt-accent);
}

.feature {
  display: grid;
  gap: 8px;
}

.year {
  margin: 0;
  font-size: clamp(56px, 18cqi, 96px);
  font-weight: 600;
  line-height: 0.9;
  letter-spacing: -0.04em;
  font-variant-numeric: lining-nums;
  color: var(--trt-ink);
  overflow-wrap: anywhere;
}

.title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.note {
  margin: 0;
  max-inline-size: 46ch;
  font-size: 17px;
  line-height: 1.55;
  color: var(--trt-muted);
  overflow-wrap: anywhere;
}

.list {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
  border-block-start: 1px solid rgba(58, 35, 20, 0.18);
}

.item {
  border-block-end: 1px solid rgba(58, 35, 20, 0.12);
}

.row {
  display: grid;
  grid-template-columns: 4.5em minmax(0, 1fr);
  align-items: baseline;
  gap: 12px;
  inline-size: 100%;
  min-block-size: 44px;
  padding-block: 10px;
  padding-inline: 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--trt-ink);
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition:
    background-color 220ms ease-out,
    color 220ms ease-out;
}

.row:hover {
  background: rgba(164, 88, 31, 0.07);
}

.row:focus-visible {
  outline: 2px solid var(--trt-accent);
  outline-offset: -2px;
}

.rowActive {
  background: rgba(164, 88, 31, 0.12);
}

.rowYear {
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums lining-nums;
  color: var(--trt-accent);
  overflow-wrap: anywhere;
}

.rowTitle {
  font-size: 16px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

@container (min-width: 560px) {
  .disc {
    inline-size: min(100%, 420px);
  }

  .tag {
    display: inline-flex;
  }

  .stampCaption {
    font-size: 10px;
  }

  .stampLabel {
    font-size: 14px;
  }
}

@container (min-width: 820px) {
  .root {
    padding-block: 64px;
    padding-inline: 56px;
  }

  .inner {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
    align-items: center;
    gap: 56px;
  }

  .disc {
    inline-size: min(100%, 540px);
  }

  .list {
    max-block-size: 372px;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  .title {
    font-size: 28px;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .band {
    animation: grow 900ms cubic-bezier(0.22, 1, 0.36, 1) calc(var(--i) * var(--stagger)) both paused;
  }

  .line,
  .growth {
    stroke-dasharray: 1 1;
    animation: draw 1100ms cubic-bezier(0.65, 0, 0.35, 1) calc(var(--i) * var(--stagger) + 120ms) both paused;
  }

  .light {
    animation: breathe 7s ease-in-out infinite alternate paused;
  }

  .play .band,
  .play .line,
  .play .growth,
  .play .light {
    animation-play-state: running;
  }

  .yearIn {
    animation: rise 520ms cubic-bezier(0.22, 1, 0.36, 1);
  }
}

@keyframes grow {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
}

@keyframes draw {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes breathe {
  from {
    opacity: 0.75;
  }
  to {
    opacity: 1;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
}
```
