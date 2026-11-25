Create a custom element called "Foil Tilt Card". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: image, title, subtitle, small heading and card number, detail rows (label, value), foil color, tilt strength. Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface FoilTiltCardDetail {
  label: string;
  value: string;
}

export interface FoilTiltCardProps {
  image?: string;
  imageAlt?: string;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  serial?: string;
  details?: FoilTiltCardDetail[];
  foilColor?: string;
  tiltStrength?: number;
  className?: string;
}

export const defaultDetails: FoilTiltCardDetail[] = [
  { label: 'Joined', value: '2019' },
  { label: 'Based in', value: 'Lisbon' },
  { label: 'Kilns fired', value: '1,240' },
];

type Motion = { rx: number; ry: number; nx: number; ny: number; vrx: number; vry: number; vnx: number; vny: number };
type Mode = 'idle' | 'pointer' | 'key';

const STIFFNESS = 210;
const DAMPING = 19;
const KEY_STEP = 0.45;
const KEY_HOLD_MS = 1600;

const clamp = (v: number, min = -1, max = 1) => Math.min(max, Math.max(min, v));

const CARD_HELP = 'Move, drag or use the arrow keys to tilt; Escape lets the card settle.';

export default function FoilTiltCard({
  image = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=720&h=560&fit=crop&crop=faces',
  imageAlt = 'Portrait of Amara Okonkwo',
  title = 'Amara Okonkwo',
  subtitle = 'Head of Ceramics, Studio Lumen',
  eyebrow = 'Founding crew',
  serial = 'No. 07 / 24',
  details = defaultDetails,
  foilColor = '#b69cff',
  tiltStrength = 16,
  className,
}: FoilTiltCardProps) {
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const uid = useId();
  const titleId = `${uid}-title`;

  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const motion = useRef<Motion>({ rx: 0, ry: 0, nx: 0, ny: 0, vrx: 0, vry: 0, vnx: 0, vny: 0 });
  const target = useRef({ mode: 'idle' as Mode, nx: 0, ny: 0, idleSince: 0 });
  const strength = useRef(tiltStrength);
  const keyTimer = useRef(0);

  strength.current = clamp(tiltStrength, 0, 40);

  const release = useCallback(() => {
    target.current.mode = 'idle';
    target.current.idleSince = performance.now();
  }, []);

  const paint = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const m = motion.current;
    const set = (k: string, v: string) => scene.style.setProperty(k, v);
    set('--rx', `${m.rx.toFixed(2)}deg`);
    set('--ry', `${m.ry.toFixed(2)}deg`);
    set('--nx', m.nx.toFixed(3));
    set('--ny', m.ny.toFixed(3));
    set('--px', `${(50 + m.nx * 50).toFixed(2)}%`);
    set('--py', `${(50 + m.ny * 50).toFixed(2)}%`);
    set('--hyp', Math.min(1, Math.hypot(m.nx, m.ny)).toFixed(3));
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
      sceneRef.current?.removeAttribute('style');
      return;
    }
    if (!inView) return;
    target.current.idleSince = performance.now();
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const t = target.current;
      let tx = t.nx;
      let ty = t.ny;
      let lean = 1;
      if (t.mode === 'idle') {
        const s = now / 1000;
        const ease = Math.min(1, (now - t.idleSince) / 2400);
        tx = Math.sin(s * 0.55) * 0.62 * ease;
        ty = Math.sin(s * 0.41 + 0.9) * 0.42 * ease;
        lean = 0.4;
      }
      const goal = { rx: -ty * strength.current * lean, ry: tx * strength.current * lean, nx: tx, ny: ty };
      const m = motion.current;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let n = 0; n < steps; n++) {
        m.vrx += (STIFFNESS * (goal.rx - m.rx) - DAMPING * m.vrx) * h;
        m.vry += (STIFFNESS * (goal.ry - m.ry) - DAMPING * m.vry) * h;
        m.vnx += (STIFFNESS * (goal.nx - m.nx) - DAMPING * m.vnx) * h;
        m.vny += (STIFFNESS * (goal.ny - m.ny) - DAMPING * m.vny) * h;
        m.rx += m.vrx * h;
        m.ry += m.vry * h;
        m.nx += m.vnx * h;
        m.ny += m.vny * h;
      }
      paint();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [reduced, inView, paint]);

  useEffect(() => () => window.clearTimeout(keyTimer.current), []);

  const aim = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    target.current.mode = 'pointer';
    target.current.nx = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1);
    target.current.ny = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    aim(e);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    if (e.pointerType === 'mouse' || e.currentTarget.hasPointerCapture(e.pointerId)) aim(e);
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (e.type === 'pointerleave' && e.pointerType !== 'mouse') return;
    release();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, -KEY_STEP],
      ArrowDown: [0, KEY_STEP],
    };
    if (e.key === 'Escape' || e.key === 'Home') {
      release();
      return;
    }
    const move = moves[e.key];
    if (!move || reduced) return;
    e.preventDefault();
    const t = target.current;
    const from = t.mode === 'key' ? t : motion.current;
    t.nx = clamp(from.nx + move[0], -0.9, 0.9);
    t.ny = clamp(from.ny + move[1], -0.9, 0.9);
    t.mode = 'key';
    window.clearTimeout(keyTimer.current);
    keyTimer.current = window.setTimeout(release, KEY_HOLD_MS);
  };

  const rootStyle = { '--ft-foil': foilColor } as CSSProperties;
  const monogram = title.trim().charAt(0).toUpperCase();

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <span className={styles.glowLilac} aria-hidden="true" />
      <span className={styles.glowMint} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />

      <div
        ref={sceneRef}
        className={styles.scene}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerEnd}
      >
        <span className={styles.shadow} aria-hidden="true" />
        <article
          className={styles.card}
          tabIndex={0}
          aria-labelledby={titleId}
          aria-description={CARD_HELP}
          onKeyDown={onKeyDown}
          onBlur={release}
        >
          <span className={styles.stock} aria-hidden="true" />
          <span className={styles.foilField} aria-hidden="true" />
          <span className={styles.lines} aria-hidden="true" />

          {(eyebrow || serial) && (
            <div className={styles.top}>
              {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
              {serial && <span className={styles.serial}>{serial}</span>}
            </div>
          )}

          <div className={styles.window}>
            <div className={styles.windowInner}>
              {image ? (
                <img className={styles.photo} src={image} alt={imageAlt} draggable={false} />
              ) : (
                <span className={styles.monogram} aria-hidden="true">
                  {monogram}
                </span>
              )}
              <span className={styles.holo} aria-hidden="true" />
              <span className={styles.windowGlare} aria-hidden="true" />
            </div>
            <span className={styles.seal} aria-hidden="true">
              <span className={styles.sealStar} />
            </span>
          </div>

          <div className={styles.body}>
            <h3 id={titleId} className={styles.title}>
              {title}
            </h3>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>

          {details.length > 0 && (
            <dl className={styles.details}>
              {details.map((d, i) => (
                <div key={i} className={styles.detail}>
                  <dt className={styles.detailLabel}>{d.label}</dt>
                  <dd className={styles.detailValue}>{d.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <span className={styles.grainCard} aria-hidden="true" />
          <span className={styles.glare} aria-hidden="true" />
          <span className={styles.edge} aria-hidden="true" />
        </article>
      </div>
    </div>
  );
}
```

```css
.root {
  --ft-foil: #b69cff;
  --ft-sky: #a9d6ff;
  --ft-mint: #93ecca;
  --ft-butter: #fbefb4;
  --ft-rose: #ffc6da;
  --ft-stock: #fbfaf7;
  --ft-stock-shade: #ebe6ee;
  --ft-stage: #f1eef2;
  --ft-ink: #1d1b26;
  --ft-muted: rgba(29, 27, 38, 0.6);
  --ft-font-display: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --ft-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --ft-font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  --ft-spectrum: repeating-linear-gradient(
    115deg,
    var(--ft-foil) 0%,
    var(--ft-sky) 6%,
    var(--ft-mint) 12%,
    var(--ft-butter) 18%,
    var(--ft-rose) 24%,
    var(--ft-foil) 30%
  );
  --ft-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  display: grid;
  justify-items: center;
  gap: 30px;
  padding-block: 64px 36px;
  padding-inline: 20px;
  border-radius: 32px;
  background:
    radial-gradient(60% 50% at 50% 0%, #fff 0%, transparent 70%),
    linear-gradient(180deg, var(--ft-stage) 0%, color-mix(in srgb, var(--ft-stage) 80%, var(--ft-foil)) 100%);
  color: var(--ft-ink);
  font-family: var(--ft-font-ui);
}

.glowLilac,
.glowMint,
.grain {
  position: absolute;
  pointer-events: none;
  z-index: -1;
}

.glowLilac {
  inset-block-start: 8%;
  inset-inline-start: -12%;
  inline-size: 62%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--ft-foil) 55%, transparent), transparent);
  filter: blur(40px);
  animation: drift 24s ease-in-out infinite alternate;
}

.glowMint {
  inset-block-end: -10%;
  inset-inline-end: -14%;
  inline-size: 58%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--ft-mint) 60%, transparent), transparent);
  filter: blur(44px);
  animation: drift 30s ease-in-out -11s infinite alternate-reverse;
}

.grain {
  inset: 0;
  background-image: var(--ft-noise);
  opacity: 0.22;
  mix-blend-mode: multiply;
}

@keyframes drift {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(6%, 5%, 0) scale(1.08);
  }
}

.scene {
  --rx: 0deg;
  --ry: 0deg;
  --nx: -0.34;
  --ny: -0.5;
  --px: 33%;
  --py: 25%;
  --hyp: 0.55;

  position: relative;
  z-index: 0;
  inline-size: min(100%, 340px);
  perspective: 1100px;
  touch-action: pan-y;
  -webkit-tap-highlight-color: transparent;
}

.shadow {
  position: absolute;
  z-index: -1;
  inset-inline: 10%;
  inset-block-end: -26px;
  block-size: 46px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(58, 36, 112, 0.42), transparent);
  filter: blur(12px);
  transform: translateX(calc(var(--nx) * -18px)) scaleX(calc(1 - var(--hyp) * 0.1));
  pointer-events: none;
}

.card {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;
  aspect-ratio: 5 / 7.2;
  padding: 16px 16px 18px;
  border-radius: 22px;
  container-type: inline-size;
  transform: rotateX(var(--rx)) rotateY(var(--ry));
  will-change: transform;
  outline: none;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 36px 64px -28px rgba(52, 32, 110, 0.45),
    0 14px 26px -14px rgba(29, 27, 38, 0.3);
  transition: box-shadow 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.card:focus-visible {
  box-shadow:
    0 0 0 3px var(--ft-stage),
    0 0 0 5px var(--ft-ink),
    0 36px 64px -28px rgba(52, 32, 110, 0.45);
}

.stock,
.foilField,
.lines,
.grainCard,
.glare,
.edge {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}

.stock {
  background:
    radial-gradient(120% 70% at 18% 0%, #fff 0%, transparent 62%),
    linear-gradient(160deg, var(--ft-stock) 0%, var(--ft-stock-shade) 100%);
}

.foilField {
  background: var(--ft-spectrum);
  background-size: 220% 220%;
  background-position: var(--px) var(--py);
  mix-blend-mode: multiply;
  opacity: calc(0.42 + var(--hyp) * 0.4);
  -webkit-mask-image: radial-gradient(130% 90% at var(--px) var(--py), #000 0%, rgba(0, 0, 0, 0.45) 55%, rgba(0, 0, 0, 0.18) 100%);
  mask-image: radial-gradient(130% 90% at var(--px) var(--py), #000 0%, rgba(0, 0, 0, 0.45) 55%, rgba(0, 0, 0, 0.18) 100%);
}

.lines {
  background:
    repeating-linear-gradient(135deg, transparent 0 14px, rgba(255, 255, 255, 0.55) 14px 15px),
    repeating-linear-gradient(62deg, transparent 0 3px, rgba(255, 255, 255, 0.7) 3px 4px),
    repeating-linear-gradient(-62deg, transparent 0 3px, rgba(255, 255, 255, 0.5) 3px 4px);
  mix-blend-mode: overlay;
  opacity: calc(0.25 + var(--hyp) * 0.5);
  -webkit-mask-image: radial-gradient(60% 50% at var(--px) var(--py), #000 0%, transparent 100%);
  mask-image: radial-gradient(60% 50% at var(--px) var(--py), #000 0%, transparent 100%);
}

.top,
.window,
.body,
.details {
  position: relative;
  z-index: 2;
}

.top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-inline: 2px;
  font-family: var(--ft-font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ft-muted);
}

.eyebrow {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.serial {
  flex: none;
  font-variant-numeric: tabular-nums;
  color: var(--ft-ink);
}

.window {
  flex: none;
  aspect-ratio: 1 / 0.9;
  padding: 3px;
  border-radius: 15px;
  background: var(--ft-spectrum);
  background-size: 320% 320%;
  background-position: var(--px) var(--py);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.8),
    0 10px 22px -14px rgba(52, 32, 110, 0.5);
  transform: translate(calc(var(--nx) * 4px), calc(var(--ny) * 4px));
}

.windowInner {
  position: relative;
  overflow: hidden;
  block-size: 100%;
  border-radius: 12px;
  background: var(--ft-spectrum);
  background-size: 260% 260%;
  background-position: var(--py) var(--px);
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  transform: scale(1.08) translate(calc(var(--nx) * -2.4%), calc(var(--ny) * -2.4%));
  user-select: none;
}

.monogram {
  display: grid;
  place-items: center;
  block-size: 100%;
  font-family: var(--ft-font-display);
  font-size: 46cqi;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.06em;
  color: color-mix(in srgb, var(--ft-ink) 82%, transparent);
  mix-blend-mode: multiply;
}

.holo,
.windowGlare {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.holo {
  background: var(--ft-spectrum);
  background-size: 240% 240%;
  background-position: var(--px) var(--py);
  mix-blend-mode: color-dodge;
  opacity: calc(0.06 + var(--hyp) * 0.3);
}

.windowGlare {
  background: radial-gradient(70% 60% at var(--px) var(--py), rgba(255, 255, 255, 0.5) 0%, transparent 60%);
  mix-blend-mode: soft-light;
}

.seal {
  position: absolute;
  inset-block-end: -15px;
  inset-inline-end: 14px;
  display: grid;
  place-items: center;
  inline-size: 40px;
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 28%, rgba(255, 255, 255, 0.95) 0%, transparent 42%),
    conic-gradient(
      from calc(var(--nx) * 140deg),
      var(--ft-foil),
      var(--ft-sky),
      var(--ft-mint),
      var(--ft-butter),
      var(--ft-rose),
      var(--ft-foil)
    );
  box-shadow:
    0 0 0 2.5px var(--ft-stock),
    0 6px 14px -4px rgba(52, 32, 110, 0.5);
}

.sealStar {
  inline-size: 44%;
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.92);
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  transform: rotate(calc(var(--ny) * 45deg));
}

.body {
  display: grid;
  gap: 6px;
  padding-inline: 2px;
  padding-block-start: 6px;
}

.title {
  margin: 0;
  font-family: var(--ft-font-display);
  font-size: clamp(22px, 8.6cqi, 32px);
  font-weight: 700;
  line-height: 1.02;
  letter-spacing: -0.035em;
  color: var(--ft-ink);
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.subtitle {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.4;
  color: var(--ft-muted);
  overflow-wrap: anywhere;
}

.details {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 0;
  margin: auto 0 0;
  padding-block-start: 11px;
  border-block-start: 1px solid color-mix(in srgb, var(--ft-ink) 12%, transparent);
}

.detail {
  flex: 1 1 30%;
  min-inline-size: 0;
  padding-inline: 2px 8px;
}

.detailLabel {
  font-family: var(--ft-font-mono);
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ft-muted);
  overflow-wrap: anywhere;
}

.detailValue {
  margin: 3px 0 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.grainCard {
  z-index: 3;
  background-image: var(--ft-noise);
  opacity: 0.16;
  mix-blend-mode: multiply;
}

.glare {
  z-index: 4;
  background:
    radial-gradient(circle at var(--px) var(--py), rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.18) 16%, transparent 42%),
    linear-gradient(calc(115deg + var(--nx) * 20deg), transparent 34%, rgba(255, 255, 255, 0.55) 47%, rgba(255, 255, 255, 0.85) 50%, rgba(255, 255, 255, 0.55) 53%, transparent 66%);
  background-size: 100% 100%, 260% 260%;
  background-position: 0 0, var(--px) var(--py);
  mix-blend-mode: soft-light;
  opacity: calc(0.45 + var(--hyp) * 0.55);
}

.edge {
  z-index: 5;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.75),
    inset 0 0 0 1.5px color-mix(in srgb, var(--ft-foil) 30%, transparent);
}

@container (min-width: 640px) {
  .root {
    padding-block: 80px 44px;
  }

  .scene {
    inline-size: 372px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .glowLilac,
  .glowMint {
    animation: none;
  }
}
```
