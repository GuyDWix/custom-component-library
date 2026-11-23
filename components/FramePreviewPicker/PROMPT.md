Create a custom element called "Frame Preview Picker". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: artwork image, frame styles (name, colour, finish), sizes (label, width and height in cm), wall colour, mat colour, chip group labels. Add other settings if they help.

```tsx
import { useCallback, useEffect, useLayoutEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import styles from './Component.module.css';

export interface FrameStyleOption {
  name: string;
  color: string;
  finish?: 'wood' | 'matte' | 'metal';
}

export interface FrameSizeOption {
  label: string;
  widthCm: number;
  heightCm: number;
}

export interface FramePreviewPickerProps {
  image?: string;
  imageAlt?: string;
  frameStyles?: FrameStyleOption[];
  sizes?: FrameSizeOption[];
  wallColor?: string;
  matColor?: string;
  frameGroupLabel?: string;
  sizeGroupLabel?: string;
  className?: string;
}

export const defaultFrameStyles: FrameStyleOption[] = [
  { name: 'Oak', color: '#b08a5c', finish: 'wood' },
  { name: 'Black', color: '#2c2b26', finish: 'matte' },
  { name: 'Brass', color: '#b48d45', finish: 'metal' },
];

export const defaultSizes: FrameSizeOption[] = [
  { label: '30 × 40 cm', widthCm: 30, heightCm: 40 },
  { label: '50 × 70 cm', widthCm: 50, heightCm: 70 },
  { label: '70 × 100 cm', widthCm: 70, heightCm: 100 },
];

// Scene geometry, all in centimetres. The wall block maps SCENE_CM vertically.
const SCENE_CM = 225;
const SOFA_TOP_CM = 75; // sofa backrest height
const GAP_CM = 16; // air between frame bottom and sofa back
const TOP_MARGIN_CM = 11;
const HANG_EYE_CM = 145; // gallery hanging height (centre, from floor)
const MOULDING_CM = 2.7;
const MAT_CM = 5.4;
const OUTER_CM = 2 * (MOULDING_CM + MAT_CM);
const MAX_HALF_CM = (SCENE_CM - TOP_MARGIN_CM - (SOFA_TOP_CM + GAP_CM)) / 2;
const STIFFNESS = 170;
const DAMPING = 21;

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default function FramePreviewPicker({
  image = 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=640&h=800&fit=crop',
  imageAlt = 'Abstract print with broad brush strokes in ochre and sage',
  frameStyles,
  sizes,
  wallColor = '#c3cbb2',
  matColor = '#f5f2e9',
  frameGroupLabel = 'Frame',
  sizeGroupLabel = 'Size',
  className,
}: FramePreviewPickerProps) {
  const styleList = frameStyles?.length ? frameStyles : defaultFrameStyles;
  const sizeList = sizes?.length ? sizes : defaultSizes;

  const [styleIdx, setStyleIdx] = useState(0);
  const [sizeIdx, setSizeIdx] = useState(() => Math.min(1, sizeList.length - 1));
  const [fadeFrom, setFadeFrom] = useState<number | null>(null);
  const [scale, setScale] = useState(2.49); // px per cm; measured after mount
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);

  const uid = useId();
  const rootRef = useRef<HTMLElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const springRef = useRef({ w: 0, h: 0, vw: 0, vh: 0 });
  const targetRef = useRef({ w: 0, h: 0 });
  const snappedRef = useRef(false);
  const reducedRef = useRef(false);
  reducedRef.current = reduced;

  const size = sizeList[Math.min(sizeIdx, sizeList.length - 1)];
  const currentStyle = styleList[Math.min(styleIdx, styleList.length - 1)];

  // Display size: true-to-scale unless the print is taller than the scene allows,
  // then the silhouette is clamped (labels keep the real measurements).
  const halfCm = (size.heightCm + OUTER_CM) / 2;
  const fit = Math.min(1, MAX_HALF_CM / halfCm);
  const dispW = (size.widthCm + OUTER_CM) * fit;
  const dispH = (size.heightCm + OUTER_CM) * fit;
  const hangCm = Math.max(
    SOFA_TOP_CM + GAP_CM + dispH / 2,
    Math.min(HANG_EYE_CM, SCENE_CM - TOP_MARGIN_CM - dispH / 2),
  );
  const topPct = ((SCENE_CM - hangCm) / SCENE_CM) * 100;

  const applySize = useCallback((w: number, h: number) => {
    const el = frameRef.current;
    if (!el) return;
    el.style.width = `${w.toFixed(2)}px`;
    el.style.height = `${h.toFixed(2)}px`;
  }, []);

  const setStretch = useCallback((v: number) => {
    frameRef.current?.style.setProperty('--sh', v.toFixed(3));
  }, []);

  const tick = useCallback(
    (now: number, last: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      const s = springRef.current;
      const t = targetRef.current;
      for (let n = 0; n < steps; n++) {
        s.vw += (STIFFNESS * (t.w - s.w) - DAMPING * s.vw) * h;
        s.vh += (STIFFNESS * (t.h - s.h) - DAMPING * s.vh) * h;
        s.w += s.vw * h;
        s.h += s.vh * h;
      }
      applySize(s.w, s.h);
      const v = Math.abs(s.vw) + Math.abs(s.vh);
      const settled = Math.abs(t.w - s.w) + Math.abs(t.h - s.h) < 0.35 && v < 12;
      if (settled) {
        applySize(t.w, t.h);
        setStretch(0);
        springRef.current = { w: t.w, h: t.h, vw: 0, vh: 0 };
        rafRef.current = 0;
        return;
      }
      setStretch(Math.min(1, v / 520));
      rafRef.current = requestAnimationFrame((n2) => tick(n2, now));
    },
    [applySize, setStretch],
  );

  const kick = useCallback(() => {
    if (rafRef.current) return;
    const start = performance.now();
    rafRef.current = requestAnimationFrame((n) => tick(n, start - 16));
  }, [tick]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const wall = wallRef.current;
    if (!root || !wall) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.12 });
    io.observe(root);
    const ro = new ResizeObserver(() => setScale((wall.clientHeight || 562) / SCENE_CM));
    ro.observe(wall);
    setScale((wall.clientHeight || 562) / SCENE_CM);
    return () => {
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  useIsoLayoutEffect(() => {
    const t = { w: dispW * scale, h: dispH * scale };
    targetRef.current = t;
    if (reduced || !inView || !snappedRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      springRef.current = { w: t.w, h: t.h, vw: 0, vh: 0 };
      applySize(t.w, t.h);
      setStretch(0);
      snappedRef.current = true;
      return;
    }
    kick();
  }, [dispW, dispH, scale, reduced, inView, applySize, setStretch, kick]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const onStylePick = (i: number) => {
    if (i === styleIdx) return;
    if (!reducedRef.current) setFadeFrom(styleIdx);
    setStyleIdx(i);
  };

  const finishClass: Record<string, string> = {
    wood: styles.finishWood,
    matte: styles.finishMatte,
    metal: styles.finishMetal,
  };
  const skinFor = (i: number): CSSProperties =>
    ({ '--fc': styleList[Math.min(i, styleList.length - 1)].color }) as CSSProperties;
  const finishFor = (i: number): string =>
    finishClass[styleList[Math.min(i, styleList.length - 1)].finish ?? 'matte'] ?? finishClass.matte;

  const rootStyle = { '--fpp-wall': wallColor, '--fpp-mat': matColor } as CSSProperties;
  const frameStyle = { fontSize: `${scale.toFixed(3)}px`, top: `${topPct.toFixed(3)}%` } as CSSProperties;
  const sceneLabel = `${imageAlt || 'Artwork print'} in a ${currentStyle.name} frame, ${size.label}, hanging above a sofa for scale.`;

  return (
    <section
      ref={rootRef}
      className={[styles.root, reduced && styles.still, !inView && styles.paused, className]
        .filter(Boolean)
        .join(' ')}
      style={rootStyle}
    >
      <div
        ref={wallRef}
        className={styles.wall}
        role="img"
        aria-label={sceneLabel}
      >
        <span className={styles.light} aria-hidden="true" />
        <span className={styles.drift} aria-hidden="true" />
        <span className={styles.vignette} aria-hidden="true" />
        <span className={styles.grain} aria-hidden="true" />
        <span className={styles.board} aria-hidden="true" />

        <div className={styles.sofaWrap} aria-hidden="true">
          <span className={styles.sofaShadow} />
          <svg className={styles.sofa} viewBox="0 0 180 84" aria-hidden="true">
            <path
              className={styles.sofaPath}
              vectorEffect="non-scaling-stroke"
              d="M33 10 h114 a9 9 0 0 1 9 9 v12 a9 9 0 0 1 -9 9 h-114 a9 9 0 0 1 -9 -9 v-12 a9 9 0 0 1 9 -9 z
                 M14 28 h16 a8 8 0 0 1 8 8 v18 a8 8 0 0 1 -8 8 h-16 a8 8 0 0 1 -8 -8 v-18 a8 8 0 0 1 8 -8 z
                 M150 28 h16 a8 8 0 0 1 8 8 v18 a8 8 0 0 1 -8 8 h-16 a8 8 0 0 1 -8 -8 v-18 a8 8 0 0 1 8 -8 z
                 M34 40 h112 a4 4 0 0 1 4 4 v10 a4 4 0 0 1 -4 4 h-112 a4 4 0 0 1 -4 -4 v-10 a4 4 0 0 1 4 -4 z
                 M34 58 l-7 22 M146 58 l7 22"
            />
            <path className={styles.sofaSeam} vectorEffect="non-scaling-stroke" d="M90 15 v19" />
          </svg>
        </div>

        <div ref={frameRef} className={styles.frame} style={frameStyle}>
          <span
            key={`s${styleIdx}`}
            className={[styles.skin, styles.skinIn, finishFor(styleIdx)].join(' ')}
            style={skinFor(styleIdx)}
            aria-hidden="true"
          />
          {fadeFrom !== null && (
            <span
              key={`f${fadeFrom}`}
              className={[styles.skin, styles.skinOut, finishFor(fadeFrom)].join(' ')}
              style={skinFor(fadeFrom)}
              aria-hidden="true"
              onAnimationEnd={() => setFadeFrom((f) => (f === fadeFrom ? null : f))}
            />
          )}
          <span className={styles.matWrap} aria-hidden="true">
            <span className={styles.artBox}>
              {image ? (
                <img className={styles.art} src={image} alt="" draggable={false} />
              ) : (
                <span className={styles.artFallback} />
              )}
              <span className={styles.glass} />
            </span>
          </span>
          <span className={styles.dimW} aria-hidden="true">
            <span className={styles.dimLabel}>{`${Math.round(size.widthCm)} cm`}</span>
          </span>
          <span className={styles.dimH} aria-hidden="true">
            <span className={styles.dimLabelH}>{`${Math.round(size.heightCm)} cm`}</span>
          </span>
        </div>
      </div>

      <div className={styles.bar}>
        <fieldset className={styles.group}>
          <legend className={styles.legend}>{frameGroupLabel}</legend>
          <div className={styles.chips}>
            {styleList.map((s, i) => (
              <label
                key={i}
                className={[styles.chip, i === styleIdx && styles.chipOn].filter(Boolean).join(' ')}
              >
                <input
                  className={styles.input}
                  type="radio"
                  name={`fpp-frame-${uid}`}
                  checked={i === styleIdx}
                  onChange={() => onStylePick(i)}
                />
                <span className={[styles.dot, finishFor(i)].join(' ')} style={skinFor(i)} aria-hidden="true" />
                <span className={styles.chipName}>{s.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.group}>
          <legend className={styles.legend}>{sizeGroupLabel}</legend>
          <div className={styles.chips}>
            {sizeList.map((s, i) => (
              <label
                key={i}
                className={[styles.chip, i === sizeIdx && styles.chipOn].filter(Boolean).join(' ')}
              >
                <input
                  className={styles.input}
                  type="radio"
                  name={`fpp-size-${uid}`}
                  checked={i === sizeIdx}
                  onChange={() => setSizeIdx(i)}
                />
                <span className={styles.chipName}>{s.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </section>
  );
}
```

```css
.root {
  --fpp-wall: #c3cbb2;
  --fpp-wall-lift: color-mix(in srgb, var(--fpp-wall) 82%, #ffffff);
  --fpp-wall-deep: color-mix(in srgb, var(--fpp-wall) 78%, #3f4a35);
  --fpp-bar: #f0f0e7;
  --fpp-chip: #fbfaf4;
  --fpp-ink: #262b21;
  --fpp-muted: #5f6455;
  --fpp-accent: #8a6a2f;
  --fpp-line: rgba(38, 43, 33, 0.16);
  --fpp-dim: rgba(36, 42, 32, 0.66);
  --fpp-dim-text: rgba(30, 36, 26, 0.88);
  --fpp-mat: #f5f2e9;
  --fpp-shadow-ink: rgba(44, 52, 38, 0.42);
  --fpp-font: 'Inter Tight', 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --fpp-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.36  0 0 0 0 0.42  0 0 0 0 0.3  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --fpp-play: running;
  --fpp-skin: skinIn 260ms ease-out both;
  --fpp-top-motion: top 480ms cubic-bezier(0.3, 1.3, 0.35, 1);

  container-type: inline-size;
  box-sizing: border-box;
  position: relative;
  inline-size: 100%;
  border-radius: 24px;
  overflow: clip;
  background: var(--fpp-bar);
  color: var(--fpp-ink);
  font-family: var(--fpp-font);
}

.root ::selection {
  background: color-mix(in srgb, var(--fpp-accent) 26%, transparent);
}

.paused {
  --fpp-play: paused;
}

.still {
  --fpp-play: paused;
  --fpp-skin: none 0s both;
  --fpp-top-motion: none;
}

/* ---------- Wall scene ---------- */

.wall {
  position: relative;
  display: block;
  block-size: clamp(280px, 56cqw, 560px);
  overflow: clip;
  background: radial-gradient(
    120% 95% at 74% 4%,
    var(--fpp-wall-lift) 0%,
    var(--fpp-wall) 55%,
    color-mix(in srgb, var(--fpp-wall) 86%, #454f39) 100%
  );
}

.light {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(85% 70% at 80% 0%, rgba(255, 254, 244, 0.42), transparent 60%),
    linear-gradient(206deg, rgba(255, 254, 244, 0.14) 0%, transparent 42%);
}

.drift {
  position: absolute;
  z-index: 0;
  inset-block-start: -14%;
  inset-inline-end: -8%;
  inline-size: 52%;
  aspect-ratio: 1;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(closest-side, rgba(255, 255, 245, 0.3), transparent 70%);
  filter: blur(24px);
  animation: drift 26s ease-in-out infinite alternate;
  animation-play-state: var(--fpp-play);
}

.vignette {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(115% 105% at 50% 40%, transparent 58%, rgba(52, 60, 42, 0.26) 100%);
}

.grain {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background-image: var(--fpp-noise);
  background-size: 160px;
  opacity: 0.2;
  mix-blend-mode: multiply;
}

.board {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  block-size: 3.6%;
  z-index: 1;
  background: linear-gradient(
    180deg,
    var(--fpp-wall-lift) 0%,
    color-mix(in srgb, var(--fpp-wall) 74%, #454f39) 100%
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.4),
    inset 0 -1px 0 rgba(0, 0, 0, 0.08);
}

/* ---------- Sofa guide ---------- */

.sofaWrap {
  position: absolute;
  inset-block-end: 0;
  inset-inline-start: 54%;
  transform: translateX(-50%);
  block-size: 37.33%;
  aspect-ratio: 180 / 84;
  z-index: 2;
  pointer-events: none;
}

.sofa {
  position: relative;
  z-index: 1;
  inline-size: 100%;
  block-size: 100%;
  display: block;
}

.sofaShadow {
  position: absolute;
  inset-inline: 2%;
  inset-block-end: -1.5%;
  block-size: 12%;
  background: radial-gradient(closest-side, rgba(44, 52, 38, 0.35), transparent);
  filter: blur(6px);
}

.sofaPath {
  fill: rgba(38, 44, 32, 0.07);
  stroke: rgba(38, 44, 32, 0.62);
  stroke-width: 1.3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sofaSeam {
  fill: none;
  stroke: rgba(38, 44, 32, 0.4);
  stroke-width: 1.1;
  stroke-linecap: round;
}

/* ---------- Frame ---------- */

.frame {
  --sh: 0;
  position: absolute;
  inset-inline-start: 54%;
  transform: translate(-50%, -50%);
  z-index: 3;
  inline-size: 166px;
  block-size: 232px;
  border-radius: 0.15em;
  background: var(--fpp-wall);
  box-shadow:
    calc(-0.62em * (1 + var(--sh) * 0.85)) calc(0.95em * (1 + var(--sh) * 0.4))
      calc(1.8em * (1 + var(--sh) * 0.9)) calc(-0.5em - var(--sh) * 0.18em) var(--fpp-shadow-ink),
    calc(-0.14em * (1 + var(--sh) * 0.85)) calc(0.3em * (1 + var(--sh) * 0.4)) 0.55em -0.16em
      rgba(44, 52, 38, 0.3);
  transition: var(--fpp-top-motion);
}

.skin {
  position: absolute;
  inset: 0;
  border-radius: 0.15em;
  pointer-events: none;
}

.skinIn {
  animation: var(--fpp-skin);
}

.skinOut {
  animation: skinOut 300ms ease-in forwards;
}

.finishWood {
  background:
    repeating-linear-gradient(
      98deg,
      rgba(93, 63, 30, 0.16) 0 1px,
      transparent 1px 5px,
      rgba(255, 243, 222, 0.1) 5px 6px,
      transparent 6px 11px
    ),
    linear-gradient(
      168deg,
      color-mix(in srgb, var(--fc) 78%, #fff) 0%,
      var(--fc) 42%,
      color-mix(in srgb, var(--fc) 78%, #46351d) 100%
    );
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--fc) 55%, #fff),
    inset -1px 0 0 color-mix(in srgb, var(--fc) 70%, #fff),
    inset 0 -1px 0 rgba(0, 0, 0, 0.25),
    inset 1px 0 0 rgba(0, 0, 0, 0.16);
}

.finishMatte {
  background: linear-gradient(
    176deg,
    color-mix(in srgb, var(--fc) 88%, #fff) 0%,
    var(--fc) 55%,
    color-mix(in srgb, var(--fc) 84%, #101008) 100%
  );
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--fc) 60%, #fff),
    inset -1px 0 0 color-mix(in srgb, var(--fc) 76%, #fff),
    inset 0 -1px 0 rgba(0, 0, 0, 0.28),
    inset 1px 0 0 rgba(0, 0, 0, 0.18);
}

.finishMetal {
  background: linear-gradient(
    102deg,
    color-mix(in srgb, var(--fc) 58%, #2e2208) 0%,
    color-mix(in srgb, var(--fc) 62%, #fff8e0) 18%,
    var(--fc) 34%,
    color-mix(in srgb, var(--fc) 72%, #fff8e0) 52%,
    var(--fc) 66%,
    color-mix(in srgb, var(--fc) 60%, #fff8e0) 82%,
    color-mix(in srgb, var(--fc) 62%, #2e2208) 100%
  );
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--fc) 70%, #fff),
    inset -1px 0 0 color-mix(in srgb, var(--fc) 60%, #fff),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3),
    inset 1px 0 0 rgba(0, 0, 0, 0.2);
}

.matWrap {
  position: absolute;
  inset: 2.7em;
  z-index: 1;
  border-radius: 0.1em;
  background: linear-gradient(180deg, color-mix(in srgb, var(--fpp-mat) 96%, #fff) 0%, var(--fpp-mat) 100%);
  box-shadow: inset 0 0 0 1px rgba(70, 64, 45, 0.09);
}

/* the cut edge of the mat: a mitred chamfer, lit from the top left */
.matWrap::before {
  content: '';
  position: absolute;
  inset: 4.6em;
  box-sizing: border-box;
  border: 0.8em solid;
  border-color: #ffffff #e6e1d0 #d6d0bb #fbf9f1;
  border-radius: 0.06em;
  box-shadow: 0 0 0 1px rgba(70, 64, 45, 0.14);
}

.artBox {
  position: absolute;
  inset: 5.4em;
  border-radius: 0.06em;
  overflow: clip;
  background: var(--fpp-mat);
  box-shadow:
    0 0 0 1px rgba(70, 64, 45, 0.22),
    inset 0.14em 0.2em 0.4em -0.1em rgba(30, 30, 22, 0.34);
}

.art {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  display: block;
}

.artFallback {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(80% 60% at 30% 30%, color-mix(in srgb, var(--fpp-accent) 45%, var(--fpp-mat)) 0%, transparent 60%),
    radial-gradient(70% 70% at 75% 70%, color-mix(in srgb, var(--fpp-wall-deep) 60%, var(--fpp-mat)) 0%, transparent 65%),
    linear-gradient(
      160deg,
      color-mix(in srgb, var(--fpp-wall) 60%, var(--fpp-mat)),
      color-mix(in srgb, var(--fpp-ink) 22%, var(--fpp-mat))
    );
}

.glass {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.16), transparent 0.5em),
    linear-gradient(
      114deg,
      transparent 31%,
      rgba(255, 255, 255, 0.08) 31.4%,
      rgba(255, 255, 255, 0.26) 42%,
      rgba(255, 255, 255, 0.08) 48.6%,
      transparent 49%,
      transparent 53%,
      rgba(255, 255, 255, 0.15) 53.3%,
      rgba(255, 255, 255, 0.15) 56.2%,
      transparent 56.5%
    );
}

/* ---------- Dimension annotations ---------- */

.dimW,
.dimH {
  position: absolute;
  pointer-events: none;
  color: var(--fpp-dim-text);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.dimW {
  inset-inline: 8.1em;
  inset-block-start: calc(100% + 1em + 8px);
}

.dimW::before {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block-start: -4px;
  block-size: 9px;
  /* end ticks plus a line that breaks around the label */
  background:
    linear-gradient(var(--fpp-dim), var(--fpp-dim)) 0 0 / 1.5px 100% no-repeat,
    linear-gradient(var(--fpp-dim), var(--fpp-dim)) 100% 0 / 1.5px 100% no-repeat,
    linear-gradient(var(--fpp-dim), var(--fpp-dim)) 0 50% / 100% 1.5px no-repeat;
  -webkit-mask-image: linear-gradient(90deg, #000 calc(50% - 30px), transparent calc(50% - 30px) calc(50% + 30px), #000 calc(50% + 30px));
  mask-image: linear-gradient(90deg, #000 calc(50% - 30px), transparent calc(50% - 30px) calc(50% + 30px), #000 calc(50% + 30px));
}

.dimLabel {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 50%;
  transform: translateY(-50%);
  font-size: 12.5px;
  font-weight: 600;
  text-align: center;
  text-shadow: 0 0 4px var(--fpp-wall-lift), 0 0 2px var(--fpp-wall-lift);
}

.dimH {
  inset-block: 8.1em;
  inset-inline-start: calc(100% + 1em + 6px);
}

.dimH::before {
  content: '';
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: 7px;
  background:
    linear-gradient(var(--fpp-dim), var(--fpp-dim)) 0 0 / 100% 1.5px no-repeat,
    linear-gradient(var(--fpp-dim), var(--fpp-dim)) 0 100% / 100% 1.5px no-repeat,
    linear-gradient(var(--fpp-dim), var(--fpp-dim)) 0 0 / 1.5px 100% no-repeat;
}

.dimLabelH {
  position: absolute;
  inset-inline-start: 13px;
  inset-block-start: 50%;
  transform: translateY(-50%);
  font-size: 12.5px;
  font-weight: 600;
  text-shadow: 0 0 4px var(--fpp-wall-lift), 0 0 2px var(--fpp-wall-lift);
}

/* ---------- Chips ---------- */

.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px 32px;
  padding: 18px clamp(16px, 3cqw, 28px) 22px;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.legend {
  padding: 0;
  color: var(--fpp-muted);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-block-size: 36px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid var(--fpp-line);
  background: var(--fpp-chip);
  color: var(--fpp-ink);
  font-size: 14px;
  line-height: 1.2;
  cursor: pointer;
  user-select: none;
  transition:
    background-color 150ms ease,
    border-color 150ms ease,
    color 150ms ease,
    transform 120ms ease;
}

.chip:hover {
  border-color: rgba(38, 43, 33, 0.34);
}

.chip:active {
  transform: scale(0.97);
}

.chipOn {
  background: var(--fpp-ink);
  border-color: var(--fpp-ink);
  color: #f4f3ea;
}

.chip:hover:not(.chipOn) {
  background: #ffffff;
}

.chip:has(.input:focus-visible) {
  outline: 2px solid var(--fpp-ink);
  outline-offset: 3px;
  border-color: var(--fpp-ink);
}

.chip:not(.chipOn):has(.input:focus-visible) {
  background: #ffffff;
}

.input {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.dot {
  flex: none;
  inline-size: 16px;
  block-size: 16px;
  border-radius: 50%;
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.28),
    inset 0 -1px 1px rgba(0, 0, 0, 0.22),
    0 0 0 1px rgba(0, 0, 0, 0.12);
}

.chipName {
  font-variant-numeric: tabular-nums;
}

/* ---------- Keyframes ---------- */

@keyframes drift {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(-9%, 7%, 0) scale(1.07);
  }
}

@keyframes skinIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes skinOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
```
