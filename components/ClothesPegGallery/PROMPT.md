Create a custom element called "Clothes Peg Gallery". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: photos (image, caption), breeze strength, string colour. Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface ClothesPegPhoto {
  image: string;
  caption?: string;
  alt?: string;
}

export interface ClothesPegGalleryProps {
  photos?: ClothesPegPhoto[];
  breezeStrength?: number;
  stringColor?: string;
  className?: string;
}

const img = (id: string) => `https://images.unsplash.com/${id}?w=900&h=900&fit=crop&auto=format&q=70`;

export const defaultPhotos: ClothesPegPhoto[] = [
  { image: img('photo-1507525428034-b723cf961d3e'), caption: 'First swim of the summer' },
  { image: img('photo-1414235077428-338989a2e8c0'), caption: 'Long table, late lunch' },
  { image: img('photo-1490750967868-88aa4486c946'), caption: 'Tulips from the market' },
  { image: img('photo-1511632765486-a01980e01a18'), caption: 'The whole crew, finally' },
  { image: img('photo-1504674900247-0877df9cc836'), caption: 'Supper on the terrace' },
  { image: img('photo-1501785888041-af3ef285b470'), caption: 'Lake road at golden hour' },
];

type Swing = { a: number; v: number };
type Geo = { x: number; y: number; t: number; row: number };
type Rect = { x: number; y: number; w: number; h: number };

const PAD_TOP = 64;
const PEG_GRIP = 12;
const CAPTION_H = 30;
const OPEN_CAPTION_H = 74;
const SWING_K = 17;
const SWING_C = 1.5;
const FLIGHT_K = 150;
const FLIGHT_C = 19;

const HELP = 'Photos hang on a washing line. Press Enter on a photo to unclip it to a large view; Escape re-hangs it.';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const curve = (sag: number) => `M 0 0 Q 50 ${(sag * 2).toFixed(2)} 100 0`;
const minHeight = (width: number, h: number) => Math.max(h, width >= 640 ? 480 : 420);
const restTilt = (i: number) => (((i * 37) % 7) - 3) * 0.7;

function layoutFor(width: number, count: number) {
  const perRow = clamp(Math.floor(width / 190), 2, 6);
  const rows = Math.max(1, Math.ceil(count / perRow));
  const balanced = Math.ceil(count / rows);
  const slot = (width - 32) / balanced;
  const pw = clamp(slot * 0.86, 96, 220);
  const ph = (pw - 16) * 1.2 + 8 + CAPTION_H;
  const sag = clamp(width * 0.045, 18, 46);
  const rowH = ph + sag + 34;
  const content = PAD_TOP + rows * rowH + 28;
  const top = PAD_TOP + Math.max(0, minHeight(width, content) - content) * 0.4;
  const geo: Geo[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / balanced);
    const inRow = Math.min(balanced, count - row * balanced);
    const j = i - row * balanced;
    const t = (j + 0.5) / inRow * 0.88 + 0.06;
    geo.push({ x: t * width, y: top + row * rowH + sag * 4 * t * (1 - t), t, row });
  }
  return { rows, pw, ph, sag, rowH, top, geo, height: content };
}

function openRect(width: number, height: number, ph: number): Rect & { frame: number } {
  const wide = width >= 640;
  const aspect = wide ? 1.35 : 0.9;
  const frame = wide ? 36 : 24;
  const maxW = Math.min(width - (wide ? 140 : 24), 780);
  const maxH = Math.max(height - (wide ? 70 : 28), ph * 1.4);
  const iw = Math.min(maxW - frame, (maxH - frame - OPEN_CAPTION_H) * aspect);
  const w = iw + frame;
  const h = iw / aspect + frame + OPEN_CAPTION_H;
  return { x: (width - w) / 2, y: Math.max(14, (height - h) / 2), w, h, frame };
}

export default function ClothesPegGallery({
  photos = defaultPhotos,
  breezeStrength = 4,
  stringColor = '#b48a57',
  className,
}: ClothesPegGalleryProps) {
  const uid = useId();
  const [width, setWidth] = useState(960);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [active, setActive] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const hangerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const stringRefs = useRef<(SVGPathElement | null)[]>([]);
  const flyRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const swings = useRef<Swing[]>([]);
  const flight = useRef({ p: 0, v: 0, target: 0 });
  const breeze = useRef(breezeStrength);
  const kick = useRef(0);

  breeze.current = clamp(breezeStrength, 0, 10);
  const L = useMemo(() => layoutFor(width, photos.length), [width, photos.length]);
  const layout = useRef(L);
  layout.current = L;
  while (swings.current.length < photos.length) swings.current.push({ a: restTilt(swings.current.length), v: 0 });

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
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.02 });
    ro.observe(root);
    io.observe(root);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const hungRect = useCallback((i: number): Rect & { a: number } => {
    const { geo, pw, ph } = layout.current;
    const g = geo[i];
    return { x: g.x - pw / 2, y: g.y - PEG_GRIP, w: pw, h: ph, a: swings.current[i]?.a ?? 0 };
  }, []);

  const paintFlight = useCallback(
    (i: number) => {
      const fly = flyRef.current;
      if (!fly) return;
      const { p } = flight.current;
      const s = hungRect(i);
      const e = openRect(width, minHeight(width, layout.current.height), layout.current.ph);
      const set = (k: string, v: string) => fly.style.setProperty(k, v);
      set('left', `${lerp(s.x, e.x, p)}px`);
      set('top', `${lerp(s.y, e.y, p)}px`);
      set('width', `${Math.max(40, lerp(s.w, e.w, p))}px`);
      set('height', `${Math.max(40, lerp(s.h, e.h, p))}px`);
      set('--cpg-rot', `${lerp(s.a, 0, clamp(p, 0, 1)) - Math.sin(clamp(p, 0, 1) * Math.PI) * 5}deg`);
      set('--cpg-lift', clamp(p, 0, 1).toFixed(3));
      set('--cpg-pad', `${lerp(8, e.frame / 2, clamp(p, 0, 1))}px`);
      set('--cpg-foot', `${lerp(CAPTION_H, OPEN_CAPTION_H, clamp(p, 0, 1))}px`);
      scrimRef.current?.style.setProperty('opacity', clamp(p, 0, 1).toFixed(3));
    },
    [hungRect, width],
  );

  useEffect(() => {
    if (reduced || !inView) return;
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const s = now / 1000;
      const { geo, sag, rows } = layout.current;
      const wind = playing ? breeze.current : 0;
      const gust = 0.55 + 0.45 * Math.sin(s * 0.21) * Math.sin(s * 0.13 + 1.2);
      const steps = 3;
      const h = dt / steps;
      let energy = Math.abs(kick.current);
      const rowBob = (r: number) => wind * gust * Math.sin(s * 0.8 + r * 1.3) * 0.7;

      geo.forEach((g, i) => {
        const sw = swings.current[i];
        const force =
          wind * gust * (Math.sin(s * 1.05 - g.t * 3.1 + g.row) * 9 + Math.sin(s * 2.3 + i * 1.7) * 3.5);
        for (let n = 0; n < steps; n++) {
          sw.v += (-SWING_K * (sw.a - restTilt(i) * 0.4) - SWING_C * sw.v + force) * h;
          sw.a += sw.v * h;
        }
        energy += Math.abs(sw.v);
        const bob = rowBob(g.row) * 4 * g.t * (1 - g.t);
        hangerRefs.current[i]?.style.setProperty('transform', `translate3d(0, ${bob.toFixed(2)}px, 0) rotate(${sw.a.toFixed(2)}deg)`);
      });

      for (let r = 0; r < rows; r++) {
        const d = curve(sag + rowBob(r));
        for (let k = 0; k < 3; k++) stringRefs.current[r * 3 + k]?.setAttribute('d', d);
      }

      const f = flight.current;
      if (active !== null) {
        for (let n = 0; n < steps; n++) {
          f.v += (FLIGHT_K * (f.target - f.p) - FLIGHT_C * f.v) * h;
          f.p += f.v * h;
        }
        paintFlight(active);
        energy += Math.abs(f.v) + Math.abs(f.target - f.p);
        if (f.target === 0 && Math.abs(f.p) < 0.004 && Math.abs(f.v) < 0.05) {
          setActive(null);
          const sw = swings.current[active];
          if (sw) sw.v += 60;
        }
      }
      kick.current = 0;
      if (!playing && energy < 0.02 && active === null) return;
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [reduced, inView, playing, active, paintFlight]);

  useEffect(() => {
    if (active === null) return;
    if (reduced) paintFlight(active);
  }, [active, reduced, paintFlight, width]);

  useEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true });
  }, [open]);

  const unclip = (i: number) => {
    flight.current = { p: 0, v: 0, target: 1 };
    if (reduced) flight.current.p = 1;
    setActive(i);
    setOpen(true);
  };

  const rehang = () => {
    if (active === null) return;
    flight.current.target = 0;
    setOpen(false);
    triggerRefs.current[active]?.focus({ preventScroll: true });
    if (reduced) {
      flight.current.p = 0;
      setActive(null);
    } else if (!inView) {
      setActive(null);
    }
  };

  const nudge = (i: number) => (e: PointerEvent<HTMLButtonElement>) => {
    if (reduced || e.pointerType !== 'mouse') return;
    const sw = swings.current[i];
    if (sw) sw.v += clamp(e.movementX, -12, 12) * 2.2;
    kick.current = 1;
  };

  const onDialogKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      rehang();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      closeRef.current?.focus();
    }
  };

  const rootStyle = {
    '--cpg-string': stringColor,
    '--cpg-pw': `${L.pw}px`,
    '--cpg-ph': `${L.ph}px`,
    minBlockSize: `${minHeight(width, L.height)}px`,
  } as CSSProperties;

  const shown = active !== null ? photos[active] : null;
  const dialogLabel = shown ? shown.caption || shown.alt || 'Photo' : '';

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
      data-still={reduced || !playing || !inView ? '' : undefined}
    >
      <span className={styles.sun} aria-hidden="true" />
      <span className={styles.rays} aria-hidden="true" />
      <span className={styles.cloudA} aria-hidden="true" />
      <span className={styles.cloudB} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />

      <ul className={styles.line} aria-label="Photo gallery" aria-description={HELP} aria-hidden={open || undefined}>
        {Array.from({ length: L.rows }, (_, r) => (
          <li key={`s${r}`} className={styles.stringRow} aria-hidden="true" style={{ insetBlockStart: L.top + r * L.rowH, blockSize: L.sag }}>
            <svg className={styles.stringSvg} viewBox={`0 0 100 ${L.sag}`} preserveAspectRatio="none">
              {[styles.stringShadow, styles.stringBase, styles.stringTwist].map((cls, k) => (
                <path
                  key={cls}
                  ref={(el) => { stringRefs.current[r * 3 + k] = el; }}
                  className={cls}
                  d={curve(L.sag)}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          </li>
        ))}
        {photos.map((p, i) => {
          const g = L.geo[i];
          const label = p.caption || p.alt || `Photo ${i + 1}`;
          const hanging = active !== i;
          return (
            <li key={i} className={styles.slot} style={{ insetInlineStart: g.x, insetBlockStart: g.y }}>
              <div
                ref={(el) => { hangerRefs.current[i] = el; }}
                className={styles.hanger}
                style={{ transform: `rotate(${restTilt(i)}deg)` }}
              >
                <button
                  ref={(el) => { triggerRefs.current[i] = el; }}
                  type="button"
                  className={styles.print}
                  data-away={hanging ? undefined : ''}
                  aria-label={label}
                  aria-haspopup="dialog"
                  tabIndex={hanging && !open ? 0 : -1}
                  onClick={() => unclip(i)}
                  onPointerMove={nudge(i)}
                >
                  <span className={styles.photoWell}>
                    {p.image ? (
                      <img className={styles.photo} src={p.image} alt="" draggable={false} />
                    ) : (
                      <span className={styles.blank} aria-hidden="true">{label.charAt(0)}</span>
                    )}
                    <span className={styles.sheen} aria-hidden="true" />
                  </span>
                  {p.caption && <span className={styles.caption}>{p.caption}</span>}
                  <span className={styles.paper} aria-hidden="true" />
                </button>
                <span className={styles.peg} data-empty={hanging ? undefined : ''} aria-hidden="true">
                  <span className={styles.pegSpring} />
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {!reduced && (
        <button
          type="button"
          className={styles.pause}
          aria-label={playing ? 'Pause the breeze' : 'Resume the breeze'}
          aria-pressed={!playing}
          onClick={() => setPlaying((v) => !v)}
        >
          <svg viewBox="0 0 16 16" className={styles.pauseIcon} aria-hidden="true">
            {playing ? <path d="M4.5 3h2.4v10H4.5zM9.1 3h2.4v10H9.1z" /> : <path d="M5 3l8 5-8 5z" />}
          </svg>
        </button>
      )}

      {shown && (
        <>
          <div ref={scrimRef} className={styles.scrim} onClick={rehang} aria-hidden="true" style={{ opacity: reduced ? 1 : 0 }} />
          <div
            ref={flyRef}
            className={styles.fly}
            role="dialog"
            aria-modal="true"
            aria-label={dialogLabel}
            aria-describedby={`${uid}-cap`}
            onKeyDown={onDialogKey}
            data-open={open ? '' : undefined}
            onClick={rehang}
          >
            <span className={styles.flyWell}>
              {shown.image ? (
                <img className={styles.photo} src={shown.image} alt={shown.alt || shown.caption || ''} draggable={false} />
              ) : (
                <span className={styles.blank} aria-hidden="true">{dialogLabel.charAt(0)}</span>
              )}
              <span className={styles.sheen} aria-hidden="true" />
            </span>
            <span className={styles.flyFoot}>
              <span id={`${uid}-cap`} className={styles.flyCaption}>{shown.caption}</span>
              <span className={styles.flyCount} aria-hidden="true">
                {String((active ?? 0) + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
              </span>
            </span>
            <span className={styles.paper} aria-hidden="true" />
            <button ref={closeRef} type="button" className={styles.close} aria-label="Re-hang photo" onClick={rehang}>
              <svg viewBox="0 0 16 16" className={styles.closeIcon} aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

```css
.root {
  --cpg-string: #b48a57;
  --cpg-sky-top: #8fc6ec;
  --cpg-sky-bottom: #dcefff;
  --cpg-sun: #fff4cf;
  --cpg-paper: #fbf9f3;
  --cpg-wood: #eee5d3;
  --cpg-wood-shade: #d8c9ac;
  --cpg-ink: #1f3446;
  --cpg-muted: rgba(31, 52, 70, 0.62);
  --cpg-font-caption: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
  --cpg-font-ui: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  --cpg-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  container-type: inline-size;
  overflow: clip;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 28px;
  background: linear-gradient(180deg, var(--cpg-sky-top) 0%, color-mix(in srgb, var(--cpg-sky-top) 55%, var(--cpg-sky-bottom)) 45%, var(--cpg-sky-bottom) 100%);
  color: var(--cpg-ink);
  font-family: var(--cpg-font-caption);
}

.sun,
.rays,
.cloudA,
.cloudB,
.grain {
  position: absolute;
  pointer-events: none;
  z-index: -1;
}

.sun {
  inset-block-start: -160px;
  inset-inline-end: -120px;
  inline-size: 480px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(closest-side, #fff 0%, var(--cpg-sun) 22%, color-mix(in srgb, var(--cpg-sun) 40%, transparent) 50%, transparent 100%);
}

.rays {
  inset: 0;
  background: repeating-conic-gradient(from 200deg at 92% -12%, rgba(255, 250, 230, 0.16) 0deg 4deg, transparent 4deg 11deg);
  -webkit-mask-image: radial-gradient(120% 90% at 92% -12%, #000 0%, transparent 75%);
  mask-image: radial-gradient(120% 90% at 92% -12%, #000 0%, transparent 75%);
}

.cloudA,
.cloudB {
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0));
  filter: blur(14px);
  animation: cloud 70s ease-in-out infinite alternate;
}

.cloudA {
  inset-block-start: 6%;
  inset-inline-start: 6%;
  inline-size: 38%;
  block-size: 90px;
}

.cloudB {
  inset-block-end: 10%;
  inset-inline-start: 46%;
  inline-size: 46%;
  block-size: 120px;
  opacity: 0.7;
  animation-duration: 95s;
  animation-delay: -30s;
}

.root[data-still] .cloudA,
.root[data-still] .cloudB {
  animation-play-state: paused;
}

@keyframes cloud {
  from {
    transform: translate3d(-6%, 0, 0);
  }
  to {
    transform: translate3d(12%, 6px, 0);
  }
}

.grain {
  inset: 0;
  background-image: var(--cpg-noise);
  opacity: 0.16;
  mix-blend-mode: overlay;
}

.line {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.stringRow {
  position: absolute;
  inset-inline: 0;
  pointer-events: none;
}

.stringSvg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
}

.stringShadow,
.stringBase,
.stringTwist {
  fill: none;
  stroke-linecap: round;
}

.stringShadow {
  stroke: rgba(31, 52, 70, 0.16);
  stroke-width: 4px;
  transform: translateY(5px);
  filter: blur(2px);
}

.stringBase {
  stroke: var(--cpg-string);
  stroke-width: 3.2px;
}

.stringTwist {
  stroke: color-mix(in srgb, var(--cpg-string) 45%, #fff6e2);
  stroke-width: 1.4px;
  stroke-dasharray: 2.4 3.2;
  opacity: 0.85;
}

.slot {
  position: absolute;
  inline-size: 0;
  block-size: 0;
}

.hanger {
  position: absolute;
  inset: 0;
  transform-origin: 0 0;
  will-change: transform;
}

.print {
  position: absolute;
  inset-block-start: -12px;
  inset-inline-start: calc(var(--cpg-pw) / -2);
  box-sizing: border-box;
  display: grid;
  grid-template-rows: 1fr 30px;
  inline-size: var(--cpg-pw);
  block-size: var(--cpg-ph);
  margin: 0;
  padding: 8px 8px 0;
  border: 0;
  border-radius: 3px;
  background: linear-gradient(170deg, #fff 0%, var(--cpg-paper) 60%, color-mix(in srgb, var(--cpg-paper) 88%, var(--cpg-wood-shade)) 100%);
  color: var(--cpg-ink);
  font: inherit;
  text-align: center;
  cursor: zoom-in;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 2px 3px rgba(31, 52, 70, 0.14),
    0 18px 26px -16px rgba(31, 52, 70, 0.42);
  transition: box-shadow 260ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 160ms ease;
  -webkit-tap-highlight-color: transparent;
}

.print:hover {
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 3px 5px rgba(31, 52, 70, 0.16),
    0 26px 34px -16px rgba(31, 52, 70, 0.5);
}

.print:focus-visible {
  outline: 3px solid var(--cpg-ink);
  outline-offset: 4px;
}

.print[data-away] {
  opacity: 0;
  pointer-events: none;
}

.photoWell,
.flyWell {
  position: relative;
  overflow: hidden;
  min-block-size: 0;
  border-radius: 1px;
  background: color-mix(in srgb, var(--cpg-sky-top) 40%, var(--cpg-paper));
  box-shadow: inset 0 0 0 1px rgba(31, 52, 70, 0.08);
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  user-select: none;
}

.blank {
  display: grid;
  place-items: center;
  block-size: 100%;
  font-size: 40px;
  font-style: italic;
  color: color-mix(in srgb, var(--cpg-ink) 45%, transparent);
}

.sheen {
  position: absolute;
  inset: 0;
  background: linear-gradient(125deg, rgba(255, 248, 225, 0.38) 0%, transparent 38%, transparent 70%, rgba(31, 52, 70, 0.12) 100%);
  mix-blend-mode: soft-light;
  pointer-events: none;
}

.caption {
  align-self: center;
  overflow: hidden;
  padding-inline: 2px;
  font-size: 13px;
  font-style: italic;
  line-height: 1.2;
  letter-spacing: -0.005em;
  color: var(--cpg-ink);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.paper {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image: var(--cpg-noise);
  opacity: 0.12;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.peg {
  position: absolute;
  inset-block-start: -20px;
  inset-inline-start: -7px;
  inline-size: 14px;
  block-size: 46px;
  border-radius: 3px 3px 5px 5px;
  background:
    linear-gradient(90deg, transparent 6.5px, rgba(120, 92, 52, 0.4) 6.5px 7.5px, transparent 7.5px),
    repeating-linear-gradient(178deg, transparent 0 5px, rgba(150, 120, 80, 0.12) 5px 6px),
    linear-gradient(90deg, var(--cpg-wood-shade) 0%, var(--cpg-wood) 30%, #fbf6ea 55%, var(--cpg-wood-shade) 100%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.7) inset,
    2px 6px 8px -3px rgba(31, 52, 70, 0.4);
  transform-origin: 50% 20px;
  transition: transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.peg[data-empty] {
  transform: rotate(-9deg) translateY(2px);
}

.pegSpring {
  position: absolute;
  inset-block-start: 17px;
  inset-inline: -2px;
  block-size: 6px;
  border-radius: 3px;
  background: linear-gradient(180deg, #e9edf0 0%, #8b96a0 55%, #5d6872 100%);
  box-shadow: 0 1px 2px rgba(31, 52, 70, 0.35);
}

.pause {
  position: absolute;
  inset-block-end: 14px;
  inset-inline-end: 14px;
  z-index: 2;
  display: grid;
  place-items: center;
  inline-size: 36px;
  block-size: 36px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--cpg-ink) 12%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, #fff 82%, transparent);
  color: var(--cpg-ink);
  cursor: pointer;
  opacity: 0.7;
  box-shadow: 0 1px 2px rgba(31, 52, 70, 0.08);
  transition: opacity 180ms ease, background-color 180ms ease;
}

.pause::before {
  content: '';
  position: absolute;
  inset: -4px;
}

.pause:hover,
.pause:focus-visible {
  opacity: 1;
  background: #fff;
}

.pause:focus-visible {
  outline: 2px solid var(--cpg-ink);
  outline-offset: 2px;
}

.pauseIcon {
  inline-size: 12px;
  block-size: 12px;
  fill: currentColor;
}

.scrim {
  position: absolute;
  inset: 0;
  z-index: 3;
  background:
    radial-gradient(80% 70% at 50% 45%, rgba(255, 250, 235, 0.18), transparent 70%),
    color-mix(in srgb, var(--cpg-ink) 38%, transparent);
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
  cursor: zoom-out;
}

.fly {
  --cpg-rot: 0deg;
  --cpg-lift: 1;
  --cpg-pad: 18px;
  --cpg-foot: 74px;

  position: absolute;
  z-index: 4;
  box-sizing: border-box;
  display: grid;
  grid-template-rows: 1fr var(--cpg-foot);
  padding: var(--cpg-pad) var(--cpg-pad) 0;
  border-radius: 4px;
  background: linear-gradient(170deg, #fff 0%, var(--cpg-paper) 70%);
  color: var(--cpg-ink);
  cursor: zoom-out;
  transform: rotate(var(--cpg-rot));
  will-change: left, top, width, height, transform;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 calc(4px + var(--cpg-lift) * 10px) calc(8px + var(--cpg-lift) * 18px) rgba(31, 52, 70, calc(0.16 + var(--cpg-lift) * 0.1)),
    0 calc(18px + var(--cpg-lift) * 46px) calc(26px + var(--cpg-lift) * 60px) calc(var(--cpg-lift) * -18px) rgba(31, 52, 70, calc(0.4 + var(--cpg-lift) * 0.15));
}

.fly:focus-visible {
  outline: none;
}

.flyFoot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-inline-size: 0;
  padding-inline: 2px;
  overflow: hidden;
  opacity: clamp(0, calc((var(--cpg-lift) - 0.6) * 2.5), 1);
}

.flyCaption {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  min-inline-size: 0;
  font-size: clamp(17px, 2.4cqi, 22px);
  font-style: italic;
  line-height: 1.25;
  letter-spacing: -0.015em;
  text-align: start;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.flyCount {
  flex: none;
  font-family: var(--cpg-font-ui);
  font-size: 12px;
  letter-spacing: 0.14em;
  color: var(--cpg-muted);
  font-variant-numeric: tabular-nums;
}

.close {
  position: absolute;
  inset-block-start: 10px;
  inset-inline-end: 10px;
  display: grid;
  place-items: center;
  inline-size: 36px;
  block-size: 36px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--cpg-ink) 10%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, #fff 88%, transparent);
  color: var(--cpg-ink);
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(31, 52, 70, 0.12);
  opacity: clamp(0, calc((var(--cpg-lift) - 0.7) * 3.4), 1);
  transition: background-color 160ms ease;
}

.close::before {
  content: '';
  position: absolute;
  inset: -4px;
}

.close:hover {
  background: #fff;
}

.close:focus-visible {
  outline: 2px solid var(--cpg-ink);
  outline-offset: 3px;
}

.closeIcon {
  inline-size: 14px;
  block-size: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

@media (prefers-reduced-motion: reduce) {
  .cloudA,
  .cloudB {
    animation: none;
  }

  .peg {
    transition: none;
  }
}
```
