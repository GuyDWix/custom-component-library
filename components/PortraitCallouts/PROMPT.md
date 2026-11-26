Create a custom element called "Portrait Callouts". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: portrait photo, name and role, callouts (label and text, up to 5). Add other settings if they help.

```tsx
import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react';
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
  className?: string;
}

export const defaultCallouts: PortraitCallout[] = [
  { label: 'Years at the bench', text: '31, since an apprenticeship in Oaxaca' },
  { label: 'Favourite tool', text: 'A 1940s No. 4 smoothing plane' },
  { label: 'Signature piece', text: 'The walnut Riverbend dining table' },
  { label: 'Off the clock', text: 'Restoring old fishing reels' },
];

type Spot = { fx: number; fy: number };
type Leader = { d: string; joints: [number, number][]; tx: number; ty: number };

const MAX_CALLOUTS = 5;
const WIDE_AT = 760;
const LONG_NAME = 22;
const ELBOW_OUT = 26;
const ELBOW_STEP = 12;
const FIT_PULL = 0.6;
const FIT_MIN = 0.14;
const FIT_MAX = 0.92;
const SNAP = 28;

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

const spotFor = (index: number, startCount: number, total: number): Spot => {
  const atStart = index < startCount;
  const k = atStart ? index : index - startCount;
  const n = atStart ? startCount : total - startCount;
  const [top, bottom] = atStart ? [0.36, 0.76] : [0.5, 0.82];
  const fy = n > 1 ? top + ((bottom - top) * k) / (n - 1) : (top + bottom) / 2;
  return { fx: atStart ? 0.2 : 0.8, fy };
};

const offsetIn = (el: HTMLElement, stage: HTMLElement) => {
  let x = el.offsetWidth / 2;
  let y = el.offsetHeight / 2;
  let node: HTMLElement | null = el;
  while (node && node !== stage) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
};

export default function PortraitCallouts({
  image = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&h=1125&fit=crop&crop=faces',
  imageAlt,
  name = 'Tomás Ibarra',
  role = 'Master cabinetmaker, Ibarra & Daughters',
  callouts = defaultCallouts,
  className,
}: PortraitCalloutsProps) {
  const items = callouts.slice(0, MAX_CALLOUTS);
  const startCount = Math.ceil(items.length / 2);
  const uid = useId();

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const pinRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const lastPointer = useRef('mouse');

  const [phase, setPhase] = useState<'armed' | 'play'>('armed');
  const [active, setActive] = useState<number | null>(null);
  const [spot, setSpot] = useState<Spot>({ fx: 0.5, fy: 0.5 });
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [fitted, setFitted] = useState<number[] | null>(null);

  const spots = items.map((_, i) => {
    const s = spotFor(i, startCount, items.length);
    return fitted?.[i] === undefined ? s : { fx: s.fx, fy: fitted[i] };
  });

  const measure = useCallback(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const frame = frameRef.current;
    if (!root || !stage || !frame) return;
    if (root.clientWidth < WIDE_AT) {
      setLeaders([]);
      setFitted(null);
      return;
    }
    const frameAt = offsetIn(frame, stage);
    const fw = frame.offsetWidth;
    const fh = frame.offsetHeight;
    const left = frameAt.x - fw / 2;
    const top = frameAt.y - fh / 2;
    const edges = [left, left + fw];
    const perSide = [0, 0];
    const fys: number[] = [];
    const next = items.map((_, i) => {
      const pin = pinRefs.current[i];
      const base = spotFor(i, startCount, items.length);
      fys[i] = base.fy;
      if (!pin) return { d: '', joints: [], tx: 0, ty: 0 };
      const t = offsetIn(pin, stage);
      fys[i] = Math.min(FIT_MAX, Math.max(FIT_MIN, base.fy * (1 - FIT_PULL) + ((t.y - top) / fh) * FIT_PULL));
      if (Math.abs(top + fys[i] * fh - t.y) < SNAP && t.y > top + fh * FIT_MIN && t.y < top + fh * FIT_MAX) fys[i] = (t.y - top) / fh;
      const a = { x: left + base.fx * fw, y: top + fys[i] * fh };
      const side = i < startCount ? 0 : 1;
      const dir = side === 0 ? -1 : 1;
      const gutter = Math.abs(t.x - edges[side]);
      const jx = edges[side] + dir * Math.min(gutter * 0.5 + perSide[side]++ * ELBOW_STEP, gutter - ELBOW_OUT);
      const bends = Math.abs(t.y - a.y) > 3;
      const d = bends
        ? `M${a.x.toFixed(1)} ${a.y.toFixed(1)} H${jx.toFixed(1)} V${t.y.toFixed(1)} H${t.x.toFixed(1)}`
        : `M${a.x.toFixed(1)} ${a.y.toFixed(1)} H${t.x.toFixed(1)}`;
      const joints: [number, number][] = bends ? [[jx, a.y], [jx, t.y]] : [];
      return { d, joints, tx: t.x, ty: t.y };
    });
    setBox({ w: stage.offsetWidth, h: stage.offsetHeight });
    setLeaders(next);
    setFitted(fys);
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
      { threshold: 0.2 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const focusOn = (i: number | null) => {
    setActive(i);
    if (i !== null) setSpot(spots[i]);
  };

  const notePointer = (e: PointerEvent) => {
    lastPointer.current = e.pointerType;
  };

  const onEnter = (i: number) => (e: PointerEvent) => {
    notePointer(e);
    if (e.pointerType === 'mouse') focusOn(i);
  };

  const onLeave = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') focusOn(null);
  };

  const onTap = (i: number) => {
    if (lastPointer.current === 'mouse') return;
    focusOn(active === i ? null : i);
  };

  const shown = phase === 'play';
  const focused = active !== null;
  const longName = name.length > LONG_NAME;
  const words = name.split(/\s+/).filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
  const rootStyle = {
    '--pc-sx': `${(spot.fx * 100).toFixed(1)}%`,
    '--pc-sy': `${(spot.fy * 100).toFixed(1)}%`,
  } as CSSProperties;

  const renderCallout = (c: PortraitCallout, i: number) => {
    const isActive = active === i;
    const atStart = i < startCount;
    const order = atStart ? i : i - startCount;
    return (
      <li key={i} className={styles.item} style={{ '--i': i, '--k': order } as CSSProperties}>
        <button
          type="button"
          className={cx(
            styles.callout,
            atStart && styles.calloutStart,
            isActive && styles.calloutActive,
            active !== null && !isActive && styles.calloutDim,
          )}
          aria-pressed={isActive}
          aria-description="Highlights this detail on the portrait"
          onPointerEnter={onEnter(i)}
          onPointerLeave={onLeave}
          onPointerDown={notePointer}
          onClick={() => onTap(i)}
          onFocus={() => focusOn(i)}
          onBlur={() => focusOn(null)}
        >
          <span className={cx(styles.marker, shown ? styles.markerShown : styles.markerHidden, isActive && styles.markerActive)} aria-hidden="true">
            {i + 1}
          </span>
          <span
            ref={(el) => {
              pinRefs.current[i] = el;
            }}
            className={cx(styles.pin, atStart && styles.pinStart)}
            aria-hidden="true"
          />
          <span className={cx(styles.copy, atStart && styles.copyStart, shown ? styles.copyShown : styles.copyHidden)}>
            <span className={cx(styles.label, isActive && styles.labelActive)}>{c.label}</span>
            <span className={styles.text}>{c.text}</span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <div
      ref={rootRef}
      className={cx(styles.root, className)}
      style={rootStyle}
    >
      <span className={cx(styles.keylight, shown && styles.keylightShown)} aria-hidden="true" />
      <span className={styles.sweep} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />

      <figure className={styles.figure} aria-labelledby={`${uid}-name`}>
        <div ref={stageRef} className={styles.stage}>
          <div className={cx(styles.portrait, shown && styles.portraitShown)}>
            <span className={cx(styles.cast, shown && styles.castShown)} aria-hidden="true" />
            <div ref={frameRef} className={cx(styles.frame, shown && styles.frameShown)}>
              <div className={cx(styles.lens, shown && styles.lensShown)}>
                {image ? (
                  <img
                    className={cx(styles.photo, focused && styles.photoFocused)}
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
              </div>
              <span className={styles.spill} aria-hidden="true" />
              <span className={cx(styles.shade, focused && styles.shadeFocused)} aria-hidden="true" />
              <span className={cx(styles.ring, focused && styles.ringFocused)} aria-hidden="true" />
              {spots.map((s, i) => (
                <span
                  key={i}
                  className={cx(styles.anchor, active === i && styles.anchorActive, shown ? styles.anchorShown : styles.anchorHidden)}
                  style={{ insetInlineStart: `${s.fx * 100}%`, insetBlockStart: `${s.fy * 100}%`, '--i': i } as CSSProperties}
                  aria-hidden="true"
                >
                  <span className={cx(styles.ripple, shown && styles.rippleShown)} />
                  <span className={styles.anchorNum}>{i + 1}</span>
                </span>
              ))}
              <span className={styles.edge} aria-hidden="true" />
            </div>
            <span className={cx(styles.marks, shown && styles.marksShown)} aria-hidden="true" />
          </div>

          <figcaption className={styles.caption}>
            <span id={`${uid}-name`} className={cx(styles.name, longName && styles.nameLong)}>
              {words.map((w, i) => (
                <Fragment key={i}>
                  <span className={styles.word}>
                    <span className={cx(styles.wordInner, shown ? styles.wordShown : styles.wordHidden)} style={{ '--w': i } as CSSProperties}>
                      {w}
                    </span>
                  </span>
                  {i < words.length - 1 ? ' ' : ''}
                </Fragment>
              ))}
            </span>
            {role && <span className={cx(styles.role, shown ? styles.roleShown : styles.roleHidden)}>{role}</span>}
          </figcaption>

          <ul className={styles.columnStart} aria-label={`Facts about ${name}`}>
            {items.slice(0, startCount).map((c, i) => renderCallout(c, i))}
          </ul>

          {items.length > startCount && (
            <ul className={styles.columnEnd} aria-label={`More facts about ${name}`}>
              {items.slice(startCount).map((c, j) => renderCallout(c, startCount + j))}
            </ul>
          )}

          {leaders.length > 0 && (
            <svg className={styles.leaders} width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} aria-hidden="true">
              {leaders.map((l, i) => (
                <g
                  key={i}
                  className={cx(styles.leader, active !== null && active !== i && styles.leaderDim)}
                  style={{ '--i': i } as CSSProperties}
                >
                  <path className={styles.halo} d={l.d} />
                  <path className={cx(styles.line, shown ? styles.lineShown : styles.lineHidden, active === i && styles.lineActive)} d={l.d} pathLength={1} />
                  {l.joints.map(([x, y], j) => (
                    <rect
                      key={j}
                      className={cx(styles.joint, shown ? styles.jointShown : styles.jointHidden)}
                      x={x - 2.5}
                      y={y - 2.5}
                      width={5}
                      height={5}
                      style={{ '--j': j } as CSSProperties}
                    />
                  ))}
                  <circle className={cx(styles.terminal, shown ? styles.terminalShown : styles.terminalHidden, active === i && styles.terminalActive)} cx={l.tx} cy={l.ty} r={3.5} />
                </g>
              ))}
            </svg>
          )}
        </div>
      </figure>
    </div>
  );
}
```

```css
@property --pc-sx {
  syntax: '<percentage>';
  inherits: true;
  initial-value: 50%;
}

@property --pc-sy {
  syntax: '<percentage>';
  inherits: true;
  initial-value: 50%;
}

.root {
  --pc-font-display: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --pc-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --pc-out: cubic-bezier(0.16, 1, 0.3, 1);
  --pc-inout: cubic-bezier(0.65, 0, 0.35, 1);

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: 40px 44px;
  padding-inline: 20px;
  border-radius: 28px;
  background: #1c3fd6;
  color: #ffffff;
  font-family: var(--pc-font-ui);
  accent-color: #e3ff5a;
}

.root::selection,
.name::selection,
.wordInner::selection,
.role::selection,
.label::selection,
.text::selection {
  background: #e3ff5a;
  color: #0a1a78;
}

.keylight,
.sweep,
.grain {
  position: absolute;
  pointer-events: none;
  z-index: -1;
}

.keylight {
  inset-block-start: -10%;
  inset-inline-start: 0;
  inline-size: 100%;
  block-size: 85%;
  background: radial-gradient(46% 62% at 46% 30%, color-mix(in srgb, #4f74ff 80%, #fff 8%) 0%, transparent 72%);
  transform-origin: 46% 30%;
}

.sweep {
  inset: 0;
  background:
    linear-gradient(180deg, transparent 58%, color-mix(in srgb, #0a1a78 55%, transparent) 100%),
    radial-gradient(130% 100% at 50% 40%, transparent 55%, color-mix(in srgb, #0a1a78 70%, transparent) 100%);
}

.grain {
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .8 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  opacity: 0.2;
  mix-blend-mode: soft-light;
}

.figure {
  margin: 0;
}

.stage {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: 'portrait' 'caption' 'start' 'end';
  justify-items: stretch;
}

.portrait {
  grid-area: portrait;
  position: relative;
  justify-self: center;
  inline-size: min(100%, 420px);
  z-index: 1;
}

.cast {
  position: absolute;
  z-index: -1;
  inset-block: 20% -7%;
  inset-inline: 22% -13%;
  border-radius: 4px;
  background: radial-gradient(closest-side, rgba(3, 9, 58, 0.85), rgba(3, 9, 58, 0.45) 60%, transparent);
  filter: blur(26px);
  transform: skewX(-6deg);
}

.frame {
  position: relative;
  aspect-ratio: 4 / 5;
  border-radius: 6px;
  overflow: hidden;
  background: #0a1a78;
  box-shadow:
    0 2px 4px rgba(3, 9, 58, 0.35),
    0 30px 60px -24px rgba(3, 9, 58, 0.8);
}

.lens {
  position: absolute;
  inset: 0;
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  user-select: none;
  filter: contrast(1.06) saturate(1.04);
  transform: scale(1.04);
  transform-origin: var(--pc-sx) var(--pc-sy);
  transition:
    transform 900ms var(--pc-out),
    filter 600ms var(--pc-out);
}

.photoFocused {
  transform: scale(1.12);
}

.monogram {
  display: grid;
  place-items: center;
  block-size: 100%;
  font-family: var(--pc-font-display);
  font-size: 112px;
  font-weight: 600;
  letter-spacing: -0.04em;
  color: color-mix(in srgb, #ffffff 85%, transparent);
  background:
    radial-gradient(70% 55% at 30% 20%, color-mix(in srgb, #4f74ff 70%, transparent), transparent 70%),
    linear-gradient(160deg, #1c3fd6 0%, #0a1a78 100%);
}

.spill {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, color-mix(in srgb, #1c3fd6 34%, transparent) 0%, transparent 22%, transparent 78%, color-mix(in srgb, #1c3fd6 34%, transparent) 100%),
    linear-gradient(180deg, transparent 62%, color-mix(in srgb, #0a1a78 48%, transparent) 100%);
  mix-blend-mode: multiply;
}

.shade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: color-mix(in srgb, #0a1a78 72%, transparent);
  mask-image: radial-gradient(ellipse 24% 19.2% at var(--pc-sx) var(--pc-sy), transparent 62%, #000 100%);
  opacity: 0;
  transition:
    opacity 420ms var(--pc-out),
    --pc-sx 700ms var(--pc-out),
    --pc-sy 700ms var(--pc-out);
}

.shadeFocused {
  opacity: 1;
}

.ring {
  position: absolute;
  inset-inline-start: var(--pc-sx);
  inset-block-start: var(--pc-sy);
  inline-size: 36%;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, #ffffff 80%, transparent);
  box-shadow: 0 0 0 1px rgba(3, 9, 58, 0.18);
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.6);
  transition:
    opacity 320ms var(--pc-out),
    transform 620ms var(--pc-out);
}

.ringFocused {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.anchor {
  position: absolute;
  z-index: 2;
  display: grid;
  place-items: center;
  inline-size: 26px;
  block-size: 26px;
  margin-inline-start: -13px;
  margin-block-start: -13px;
  border-radius: 50%;
  background: #e3ff5a;
  color: #0a1a78;
  box-shadow:
    0 0 0 1.5px #0a1a78,
    0 4px 10px -2px rgba(3, 9, 58, 0.55);
  transition: transform 420ms var(--pc-out);
}

.anchorActive {
  transform: scale(1.18);
}

.anchorNum {
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.ripple {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid #e3ff5a;
  opacity: 0;
}

.edge {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.marks {
  position: absolute;
  inset: -14px;
  pointer-events: none;
  --m: color-mix(in srgb, #ffffff 55%, transparent);
  background:
    linear-gradient(var(--m), var(--m)) top left / 14px 1px no-repeat,
    linear-gradient(var(--m), var(--m)) top left / 1px 14px no-repeat,
    linear-gradient(var(--m), var(--m)) top right / 14px 1px no-repeat,
    linear-gradient(var(--m), var(--m)) top right / 1px 14px no-repeat,
    linear-gradient(var(--m), var(--m)) bottom left / 14px 1px no-repeat,
    linear-gradient(var(--m), var(--m)) bottom left / 1px 14px no-repeat,
    linear-gradient(var(--m), var(--m)) bottom right / 14px 1px no-repeat,
    linear-gradient(var(--m), var(--m)) bottom right / 1px 14px no-repeat;
}

.caption {
  grid-area: caption;
  display: grid;
  gap: 12px;
  margin-block-start: 36px;
  min-inline-size: 0;
}

.name {
  font-family: var(--pc-font-display);
  font-size: 48px;
  font-weight: 600;
  line-height: 0.95;
  letter-spacing: -0.04em;
  overflow-wrap: anywhere;
}

.nameLong {
  font-size: 36px;
  line-height: 1;
}

.word {
  display: inline-block;
  max-inline-size: 100%;
  overflow: clip;
  overflow-clip-margin: 0.12em;
  padding-block-end: 0.08em;
  vertical-align: top;
}

.wordInner {
  display: inline-block;
  max-inline-size: 100%;
}

.role {
  max-inline-size: 34ch;
  font-size: 17px;
  line-height: 1.45;
  color: #d5dcff;
  text-wrap: pretty;
  overflow-wrap: anywhere;
}

.columnStart,
.columnEnd {
  position: relative;
  z-index: 3;
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.columnStart {
  grid-area: start;
  margin-block-start: 28px;
  border-block-start: 1px solid color-mix(in srgb, #ffffff 18%, transparent);
}

.columnEnd {
  grid-area: end;
}

.item {
  display: block;
  border-block-end: 1px solid color-mix(in srgb, #ffffff 18%, transparent);
}


.callout {
  position: relative;
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  align-items: start;
  column-gap: 16px;
  inline-size: 100%;
  min-block-size: 44px;
  margin: 0;
  padding-block: 16px;
  padding-inline: 0;
  border: 0;
  border-radius: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 320ms var(--pc-out);
}

.callout:focus-visible {
  outline: 2px solid #e3ff5a;
  outline-offset: 4px;
  border-radius: 4px;
}

.calloutDim {
  opacity: 0.42;
}

.marker {
  display: grid;
  place-items: center;
  inline-size: 26px;
  block-size: 26px;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: #0a1a78;
  background: #e3ff5a;
  transition: transform 420ms var(--pc-out);
}

.markerActive {
  transform: scale(1.12);
}

.pin {
  display: none;
}

.copy {
  display: grid;
  gap: 4px;
  min-inline-size: 0;
}

.label {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: 0.005em;
  color: #c4cfff;
  overflow-wrap: anywhere;
  transition: color 320ms var(--pc-out);
}

.labelActive {
  color: #e3ff5a;
}

.text {
  font-size: 19px;
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: -0.012em;
  color: #ffffff;
  text-wrap: pretty;
  overflow-wrap: anywhere;
}

.leaders {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  z-index: 2;
  overflow: visible;
  pointer-events: none;
}

.leader {
  transition: opacity 320ms var(--pc-out);
}

.leaderDim {
  opacity: 0.22;
}

.halo {
  fill: none;
  stroke: #0a1a78;
  stroke-opacity: 0.35;
  stroke-width: 3;
  stroke-linejoin: miter;
}

.line {
  fill: none;
  stroke: #ffffff;
  stroke-width: 1;
  stroke-linejoin: miter;
  stroke-dasharray: 1;
  shape-rendering: geometricPrecision;
  transition: stroke-width 320ms var(--pc-out);
}

.lineActive {
  stroke-width: 1.75;
}

.joint {
  fill: #1c3fd6;
  stroke: #ffffff;
  stroke-width: 1;
  transform-box: fill-box;
  transform-origin: center;
}

.terminal {
  fill: #e3ff5a;
  stroke: #0a1a78;
  stroke-width: 1.25;
  transform-box: fill-box;
  transform-origin: center;
  transition: transform 420ms var(--pc-out);
}

.terminalActive {
  transform: scale(1.45);
}

/* entrance choreography: light → push-in → name → anchors → lines → facts */
.keylightShown {
  animation: light 1400ms var(--pc-out) both;
}

.portraitShown {
  animation: push 1700ms var(--pc-out) 80ms both;
}

.frameShown {
  animation: wipe 1000ms var(--pc-inout) 80ms both;
}

.lensShown {
  animation: focus 1600ms var(--pc-out) 120ms both;
}

.marksShown {
  animation: fade 700ms var(--pc-out) 700ms both;
}

.castShown {
  animation: fade 1200ms var(--pc-out) 400ms both;
}

.wordHidden,
.roleHidden,
.copyHidden,
.markerHidden,
.anchorHidden,
.jointHidden,
.terminalHidden {
  opacity: 0;
}

.lineHidden {
  stroke-dashoffset: 1;
}

.wordShown {
  animation: riseWord 900ms var(--pc-out) both;
  animation-delay: calc(380ms + var(--w) * 90ms);
}

.roleShown {
  animation: rise 700ms var(--pc-out) 640ms both;
}

.anchorShown {
  animation: pop 560ms var(--pc-out) both;
  animation-delay: calc(820ms + var(--i) * 130ms);
}

.rippleShown {
  animation: ripple 1100ms var(--pc-out) both;
  animation-delay: calc(900ms + var(--i) * 130ms);
}

.lineShown {
  animation: draw 760ms var(--pc-inout) both;
  animation-delay: calc(980ms + var(--i) * 130ms);
}

.jointShown {
  animation: pop 420ms var(--pc-out) both;
  animation-delay: calc(1180ms + var(--i) * 130ms + var(--j) * 160ms);
}

.terminalShown {
  animation: pop 480ms var(--pc-out) both;
  animation-delay: calc(1560ms + var(--i) * 130ms);
}

.markerShown {
  animation: pop 480ms var(--pc-out) both;
  animation-delay: calc(900ms + var(--i) * 110ms);
}

.copyShown {
  animation: rise 720ms var(--pc-out) both;
  animation-delay: calc(1500ms + var(--i) * 130ms);
}

@keyframes light {
  from {
    opacity: 0;
    transform: scale(0.7);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes push {
  from {
    transform: scale(0.93) translateY(18px);
  }
  to {
    transform: none;
  }
}

@keyframes wipe {
  from {
    clip-path: inset(100% 0 0 0 round 6px);
  }
  to {
    clip-path: inset(0 0 0 0 round 6px);
  }
}

@keyframes focus {
  from {
    transform: scale(1.2);
    filter: blur(10px) brightness(0.7);
  }
  to {
    transform: none;
    filter: none;
  }
}

@keyframes fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes riseWord {
  from {
    transform: translateY(105%);
  }
  to {
    transform: none;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes pop {
  0% {
    opacity: 0;
    transform: scale(0.2);
  }
  60% {
    opacity: 1;
    transform: scale(1.15);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes ripple {
  0% {
    opacity: 0.9;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(3.2);
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

@container (min-width: 760px) {
  .root {
    padding-block: 64px;
    padding-inline: 56px;
  }

  .stage {
    grid-template-columns: minmax(0, 0.78fr) minmax(320px, 1.2fr) minmax(0, 1.05fr);
    grid-template-rows: auto 1fr;
    grid-template-areas:
      'start portrait caption'
      'start portrait end';
    column-gap: 80px;
    align-items: start;
  }

  .portrait {
    inline-size: 100%;
  }

  .caption {
    margin-block-start: 0;
    margin-inline-start: -116px;
    gap: 18px;
    position: relative;
    z-index: 4;
  }

  .name {
    font-size: clamp(56px, 7.6cqi, 104px);
    line-height: 0.9;
    text-wrap: balance;
    text-shadow: 0 1px 2px rgba(3, 9, 58, 0.25), 0 8px 30px rgba(3, 9, 58, 0.3);
  }

  .nameLong {
    font-size: clamp(40px, 4.6cqi, 60px);
  }

  .role {
    margin-inline-start: 116px;
  }

  .columnStart {
    align-self: center;
    margin-block-start: 22%;
    gap: 28px;
  }

  .columnEnd {
    align-self: center;
    margin-block-start: 48px;
    gap: 22px;
  }

  .columnStart,
  .columnEnd {
    display: grid;
  }

  .item,
  .columnStart {
    border-block: 0;
  }

  .callout {
    grid-template-columns: minmax(0, 1fr);
    padding-block: 6px;
  }

  .marker,
  .anchorNum {
    display: none;
  }

  .anchor {
    inline-size: 14px;
    block-size: 14px;
    margin-inline-start: -7px;
    margin-block-start: -7px;
    background: #0a1a78;
    box-shadow:
      inset 0 0 0 1.5px #ffffff,
      inset 0 0 0 4px #0a1a78,
      inset 0 0 0 7px #e3ff5a,
      0 2px 6px rgba(3, 9, 58, 0.5);
  }

  .anchorActive {
    transform: scale(1.4);
  }

  .pin {
    display: block;
    position: absolute;
    inset-block-start: 15px;
    inset-inline-start: -18px;
    inline-size: 1px;
    block-size: 1px;
  }

  .pinStart {
    inset-inline-start: auto;
    inset-inline-end: -18px;
  }

  .calloutStart {
    text-align: end;
  }

  .copyStart {
    justify-items: end;
  }
}

@media (prefers-reduced-motion: reduce) {
  .photo,
  .shade,
  .ring,
  .anchor,
  .marker,
  .terminal,
  .line {
    transition: opacity 200ms ease;
  }

  .photoFocused {
    transform: scale(1.04);
  }

  .keylightShown,
  .portraitShown,
  .frameShown,
  .lensShown,
  .marksShown,
  .castShown,
  .wordShown,
  .roleShown,
  .anchorShown,
  .rippleShown,
  .lineShown,
  .jointShown,
  .terminalShown,
  .markerShown,
  .copyShown {
    animation: none;
  }

  .wordHidden,
  .roleHidden,
  .copyHidden,
  .markerHidden,
  .anchorHidden,
  .jointHidden,
  .terminalHidden {
    opacity: 1;
  }

  .lineHidden {
    stroke-dashoffset: 0;
  }
}
```
