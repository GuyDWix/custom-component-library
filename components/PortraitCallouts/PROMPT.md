Create a custom element called "Portrait Callouts". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: portrait photo, name and role, callouts (label and text, up to 5), line colour. Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface PortraitCallout {
  label: string;
  text: string;
}

export interface PortraitCalloutsProps {
  image?: string;
  imageAlt?: string;
  name?: string;
  role?: string;
  callouts?: PortraitCallout[];
  lineColor?: string;
  className?: string;
}

export const defaultCallouts: PortraitCallout[] = [
  { label: 'Years at the bench', text: '31, since an apprenticeship in Oaxaca' },
  { label: 'Favourite tool', text: 'A 1940s No. 4 smoothing plane' },
  { label: 'Signature piece', text: 'The walnut Riverbend dining table' },
  { label: 'Off the clock', text: 'Restoring old fishing reels' },
];

type Leader = { d: string; ax: number; ay: number };

const MAX_CALLOUTS = 5;
const WIDE_AT = 720;
const SHOULDER = 26;

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

export default function PortraitCallouts({
  image = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=720&h=900&fit=crop&crop=faces',
  imageAlt,
  name = 'Tomás Ibarra',
  role = 'Master cabinetmaker, Ibarra & Daughters',
  callouts = defaultCallouts,
  lineColor = '#6b4f33',
  className,
}: PortraitCalloutsProps) {
  const items = callouts.slice(0, MAX_CALLOUTS);
  const startCount = Math.ceil(items.length / 2);
  const uid = useId();

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const lastPointer = useRef('mouse');

  const [phase, setPhase] = useState<'armed' | 'play'>('armed');
  const [active, setActive] = useState<number | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const measure = useCallback(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const plate = plateRef.current;
    if (!root || !stage || !plate) return;
    if (root.clientWidth < WIDE_AT) {
      setLeaders([]);
      return;
    }
    const s = stage.getBoundingClientRect();
    const p = plate.getBoundingClientRect();
    const midX = p.left + p.width / 2;
    const perSide = [0, 0];
    const sideCount = [startCount, items.length - startCount];
    const next = dotRefs.current.slice(0, items.length).map((dot) => {
      if (!dot) return { d: '', ax: 0, ay: 0 };
      const r = dot.getBoundingClientRect();
      const dx = r.left + r.width / 2 - s.left;
      const dy = r.top + r.height / 2 - s.top;
      const fromStart = r.left + r.width / 2 < midX;
      const side = fromStart ? 0 : 1;
      const k = perSide[side]++;
      const n = sideCount[side];
      const ax = p.left - s.left + p.width * (fromStart ? 0.22 : 0.78);
      const ay = p.top - s.top + p.height * (n > 1 ? 0.3 + (0.46 * k) / (n - 1) : 0.48);
      const dir = fromStart ? 1 : -1;
      const end = dx + dir * (r.width / 2 + 5);
      const shoulder = end + dir * SHOULDER;
      return { d: `M${ax.toFixed(1)} ${ay.toFixed(1)} L${shoulder.toFixed(1)} ${dy.toFixed(1)} L${end.toFixed(1)} ${dy.toFixed(1)}`, ax, ay };
    });
    setBox({ w: s.width, h: s.height });
    setLeaders(next);
  }, [items.length, startCount]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    const root = rootRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!root || reduced || typeof IntersectionObserver === 'undefined') {
      setPhase('play');
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setPhase('play');
        io.disconnect();
      },
      { threshold: 0.25 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const notePointer = (e: PointerEvent) => {
    lastPointer.current = e.pointerType;
  };

  const onEnter = (i: number) => (e: PointerEvent) => {
    notePointer(e);
    if (e.pointerType === 'mouse') setActive(i);
  };

  const onLeave = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') setActive(null);
  };

  const onTap = (i: number) => {
    if (lastPointer.current === 'mouse') return;
    setActive((cur) => (cur === i ? null : i));
  };

  const shown = phase === 'play';
  const rootStyle = { '--pc-line': lineColor } as CSSProperties;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  const renderCallout = (c: PortraitCallout, i: number) => {
    const isActive = active === i;
    const isDim = active !== null && !isActive;
    const atStart = i < startCount;
    return (
      <li key={i} className={styles.item} style={{ '--i': i } as CSSProperties}>
        <button
          type="button"
          className={cx(
            styles.callout,
            atStart && styles.calloutStart,
            shown ? styles.calloutShown : styles.calloutHidden,
            isActive && styles.calloutActive,
            isDim && styles.calloutDim,
          )}
          aria-pressed={isActive}
          onPointerEnter={onEnter(i)}
          onPointerLeave={onLeave}
          onPointerDown={notePointer}
          onClick={() => onTap(i)}
          onFocus={() => setActive(i)}
          onBlur={() => setActive(null)}
        >
          <span className={styles.tick} aria-hidden="true" />
          <span
            ref={(el) => {
              dotRefs.current[i] = el;
            }}
            className={cx(styles.dot, atStart && styles.dotStart, shown ? styles.dotShown : styles.dotHidden)}
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <span className={cx(styles.copy, atStart && styles.copyStart, shown ? styles.copyShown : styles.copyHidden)}>
            <span className={styles.label}>{c.label}</span>
            <span className={styles.text}>{c.text}</span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <div ref={rootRef} className={cx(styles.root, className)} style={rootStyle}>
      <span className={styles.paper} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />
      <span className={styles.frame} aria-hidden="true" />

      <figure className={styles.figure} aria-labelledby={`${uid}-name`}>
        <div ref={stageRef} className={styles.stage}>
          <ul className={styles.columnStart} aria-label={`Facts about ${name}`}>
            {items.slice(0, startCount).map((c, i) => renderCallout(c, i))}
          </ul>

          <div className={styles.center}>
            <div ref={plateRef} className={styles.plate}>
              <div className={styles.mat}>
                {image ? (
                  <img
                    className={styles.photo}
                    src={image}
                    alt={imageAlt ?? `Portrait of ${name}`}
                    draggable={false}
                    onLoad={measure}
                  />
                ) : (
                  <span className={styles.monogram} aria-hidden="true">
                    {initials}
                  </span>
                )}
                <span className={styles.tone} aria-hidden="true" />
              </div>
              <span className={styles.cornerA} aria-hidden="true" />
              <span className={styles.cornerB} aria-hidden="true" />
              <span className={styles.cornerC} aria-hidden="true" />
              <span className={styles.cornerD} aria-hidden="true" />
            </div>
            <figcaption className={styles.caption}>
              <span id={`${uid}-name`} className={styles.name}>
                {name}
              </span>
              {role && <span className={styles.role}>{role}</span>}
            </figcaption>
          </div>

          {items.length > startCount && (
            <ul className={styles.columnEnd} aria-label={`More facts about ${name}`}>
              {items.slice(startCount).map((c, j) => renderCallout(c, startCount + j))}
            </ul>
          )}

          {leaders.length > 0 && (
            <svg className={styles.leaders} width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} aria-hidden="true">
              {leaders.map((l, i) => {
                const isActive = active === i;
                const isDim = active !== null && !isActive;
                const style = { '--i': i } as CSSProperties;
                return (
                  <g key={i} className={isDim ? styles.leaderDim : undefined} style={style}>
                    <path className={styles.halo} d={l.d} pathLength={1} />
                    <path className={cx(styles.line, shown ? styles.lineShown : styles.lineHidden, isActive && styles.lineActive)} d={l.d} pathLength={1} />
                    <circle
                      className={cx(styles.anchor, shown ? styles.anchorShown : styles.anchorHidden, isActive && styles.anchorActive)}
                      cx={l.ax}
                      cy={l.ay}
                      r={4.5}
                    />
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </figure>
    </div>
  );
}
```

```css
.root {
  --pc-line: #6b4f33;
  --pc-paper: #dfe4d2;
  --pc-paper-deep: #cbd3ba;
  --pc-mat: #f3efe2;
  --pc-ink: #2b281f;
  --pc-muted: #5b5646;
  --pc-brass: #b38b3f;
  --pc-brass-light: #e2c57e;
  --pc-brass-dark: #7d5d22;
  --pc-font-serif: 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif;
  --pc-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.2  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --pc-ease: cubic-bezier(0.22, 1, 0.36, 1);

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: 48px 40px;
  padding-inline: 24px;
  border-radius: 6px;
  background: var(--pc-paper);
  color: var(--pc-ink);
  font-family: var(--pc-font-serif);
}

.paper,
.grain,
.frame {
  position: absolute;
  pointer-events: none;
  z-index: -1;
}

.paper {
  inset: 0;
  background:
    radial-gradient(80% 60% at 50% 38%, color-mix(in srgb, var(--pc-paper) 70%, #fff) 0%, transparent 70%),
    radial-gradient(120% 90% at 50% 50%, transparent 55%, color-mix(in srgb, var(--pc-paper-deep) 80%, var(--pc-line)) 140%);
}

.grain {
  inset: 0;
  background-image: var(--pc-noise);
  opacity: 0.32;
  mix-blend-mode: multiply;
}

.frame {
  inset: 12px;
  border: 1px solid color-mix(in srgb, var(--pc-line) 45%, transparent);
  outline: 1px solid color-mix(in srgb, var(--pc-line) 22%, transparent);
  outline-offset: 4px;
}

.figure {
  margin: 0;
}

.stage {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 32px;
}

.center {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 20px;
  inline-size: min(100%, 300px);
  order: -1;
}

.plate {
  position: relative;
  inline-size: 100%;
  padding: 12px;
  box-sizing: border-box;
  background: var(--pc-mat);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--pc-line) 25%, transparent),
    0 14px 30px -18px rgba(43, 40, 31, 0.55),
    0 3px 8px -4px rgba(43, 40, 31, 0.2);
}

.mat {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: var(--pc-paper-deep);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pc-line) 40%, transparent);
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  filter: sepia(0.28) saturate(0.82) contrast(1.04) brightness(1.02);
  user-select: none;
}

.monogram {
  display: grid;
  place-items: center;
  block-size: 100%;
  font-size: 72px;
  font-style: italic;
  letter-spacing: -0.02em;
  color: color-mix(in srgb, var(--pc-line) 70%, transparent);
  background: radial-gradient(circle at 50% 42%, var(--pc-mat) 0%, var(--pc-paper-deep) 90%);
}

.tone {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: var(--pc-noise);
  opacity: 0.28;
  mix-blend-mode: multiply;
  box-shadow: inset 0 0 40px rgba(60, 44, 20, 0.28);
}

.cornerA,
.cornerB,
.cornerC,
.cornerD {
  position: absolute;
  inline-size: 18px;
  block-size: 18px;
  background: var(--pc-line);
  opacity: 0.85;
}

.cornerA {
  inset-block-start: 4px;
  inset-inline-start: 4px;
  clip-path: polygon(0 0, 100% 0, 0 100%);
}

.cornerB {
  inset-block-start: 4px;
  inset-inline-end: 4px;
  clip-path: polygon(0 0, 100% 0, 100% 100%);
}

.cornerC {
  inset-block-end: 4px;
  inset-inline-start: 4px;
  clip-path: polygon(0 0, 100% 100%, 0 100%);
}

.cornerD {
  inset-block-end: 4px;
  inset-inline-end: 4px;
  clip-path: polygon(100% 0, 100% 100%, 0 100%);
}

.caption {
  display: grid;
  justify-items: center;
  gap: 6px;
  text-align: center;
  max-inline-size: 100%;
}

.name {
  font-size: 30px;
  font-style: italic;
  line-height: 1.1;
  letter-spacing: -0.015em;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.role {
  font-size: 14px;
  font-variant: small-caps;
  letter-spacing: 0.08em;
  color: var(--pc-muted);
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.columnStart,
.columnEnd {
  position: relative;
  z-index: 3;
  display: grid;
  gap: 14px;
  inline-size: 100%;
  max-inline-size: 460px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: block;
}

.callout {
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: start;
  column-gap: 12px;
  inline-size: 100%;
  min-block-size: 44px;
  margin: 0;
  padding: 6px 4px;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
  border-radius: 4px;
  -webkit-tap-highlight-color: transparent;
  transform-origin: 45px 19px;
  transition:
    transform 420ms var(--pc-ease),
    opacity 320ms ease;
}

.callout:focus-visible {
  outline: 1.5px solid var(--pc-line);
  outline-offset: 4px;
}

.calloutActive {
  transform: scale(1.07);
}

.calloutDim {
  opacity: 0.42;
}

.tick {
  inline-size: 16px;
  block-size: 1px;
  margin-block-start: 13px;
  background: var(--pc-line);
}

.dot {
  display: grid;
  place-items: center;
  inline-size: 26px;
  block-size: 26px;
  border-radius: 50%;
  font-size: 13px;
  font-variant-numeric: tabular-nums lining-nums;
  font-weight: 600;
  line-height: 1;
  color: #2e220c;
  background: radial-gradient(circle at 35% 30%, var(--pc-brass-light) 0%, var(--pc-brass) 55%, var(--pc-brass-dark) 100%);
  box-shadow:
    inset 0 0 0 1px rgba(46, 34, 12, 0.35),
    0 1px 2px rgba(43, 40, 31, 0.3);
}

.copy {
  display: grid;
  gap: 2px;
  min-inline-size: 0;
}

.label {
  font-size: 14px;
  font-variant: small-caps;
  letter-spacing: 0.08em;
  color: var(--pc-line);
  line-height: 1.3;
  padding-block-start: 3px;
  overflow-wrap: anywhere;
}

.text {
  font-size: 17px;
  line-height: 1.35;
  color: var(--pc-ink);
  text-wrap: pretty;
  overflow-wrap: anywhere;
}

.copyHidden,
.dotHidden {
  opacity: 0;
}

.dotShown {
  animation: pop 520ms var(--pc-ease) both;
  animation-delay: calc(var(--i) * 140ms + 150ms);
}

.copyShown {
  animation: rise 620ms var(--pc-ease) both;
  animation-delay: calc(var(--i) * 140ms + 750ms);
}

.leaders {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  z-index: 2;
  overflow: visible;
  pointer-events: none;
}

.leaderDim {
  opacity: 0.3;
  transition: opacity 320ms ease;
}

.halo {
  fill: none;
  stroke: var(--pc-mat);
  stroke-opacity: 0.55;
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.line {
  fill: none;
  stroke: var(--pc-line);
  stroke-width: 1.1;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  transition: stroke-width 320ms var(--pc-ease);
}

.lineActive {
  stroke-width: 1.8;
}

.lineHidden {
  stroke-dashoffset: 1;
}

.lineShown {
  animation: draw 900ms cubic-bezier(0.65, 0, 0.35, 1) both;
  animation-delay: calc(var(--i) * 140ms + 250ms);
}

.anchor {
  fill: var(--pc-mat);
  stroke: var(--pc-line);
  stroke-width: 1.5;
  transform-box: fill-box;
  transform-origin: center;
  transition: transform 360ms var(--pc-ease);
}

.anchorActive {
  transform: scale(1.6);
}

.anchorHidden {
  opacity: 0;
}

.anchorShown {
  animation: pop 480ms var(--pc-ease) both;
  animation-delay: calc(var(--i) * 140ms + 100ms);
}

@keyframes draw {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes pop {
  from {
    opacity: 0;
    transform: scale(0.4);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@container (min-width: 720px) {
  .stage {
    grid-template-columns: minmax(0, 1fr) minmax(260px, 340px) minmax(0, 1fr);
    align-items: center;
    column-gap: 72px;
    justify-items: stretch;
  }

  .center {
    order: 0;
    grid-column: 2;
    inline-size: 100%;
  }

  .columnStart,
  .columnEnd {
    gap: 40px;
    max-inline-size: none;
    padding-block-end: 64px;
  }

  .columnStart {
    grid-column: 1;
    grid-row: 1;
  }

  .columnEnd {
    grid-column: 3;
    grid-row: 1;
  }

  .tick {
    display: none;
  }

  .callout {
    grid-template-columns: 26px 1fr;
    transform-origin: 13px 19px;
  }

  .calloutStart {
    grid-template-columns: 1fr 26px;
    text-align: end;
    transform-origin: calc(100% - 17px) 19px;
  }

  .dotStart {
    grid-column: 2;
    grid-row: 1;
  }

  .copyStart {
    grid-column: 1;
    grid-row: 1;
  }

  .name {
    font-size: 36px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .callout,
  .leaderDim,
  .line,
  .anchor {
    transition: none;
  }

  .dotShown,
  .copyShown,
  .lineShown,
  .anchorShown {
    animation: none;
  }

  .copyHidden,
  .dotHidden,
  .anchorHidden {
    opacity: 1;
  }

  .lineHidden {
    stroke-dashoffset: 0;
  }
}
```
