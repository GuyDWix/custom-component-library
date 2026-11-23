Create a custom element called "Frame Preview Picker". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: artwork image, frame styles (name, colour, finish), sizes (label, width and height in cm), wall colour, mat colour, chip group labels, starting orientation (portrait or landscape), orientation group and option labels. Add other settings if they help.

```tsx
import { useCallback, useEffect, useLayoutEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import styles from './Component.module.css';

export interface FrameStyleOption {
  name: string;
  color: string;
  finish?: 'wood' | 'matte' | 'metal';
}

export type FrameOrientation = 'portrait' | 'landscape';

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
  /** Starting orientation of the print; the visitor can switch it with the Orientation control. */
  orientation?: FrameOrientation;
  wallColor?: string;
  matColor?: string;
  frameGroupLabel?: string;
  sizeGroupLabel?: string;
  orientationGroupLabel?: string;
  portraitLabel?: string;
  landscapeLabel?: string;
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
const GAP_CM = 16; // least air between frame bottom and sofa back
const MAX_GAP_CM = 28; // most air: a small print hangs lower rather than floating above the sofa
const TOP_MARGIN_CM = 11;
const HANG_EYE_CM = 145; // gallery hanging height (centre, from floor)
const MOULDING_CM = 3.4;
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
  orientation = 'portrait',
  wallColor = '#c3cbb2',
  matColor = '#f5f2e9',
  frameGroupLabel = 'Frame',
  sizeGroupLabel = 'Size',
  orientationGroupLabel = 'Orientation',
  portraitLabel = 'Portrait',
  landscapeLabel = 'Landscape',
  className,
}: FramePreviewPickerProps) {
  const styleList = frameStyles?.length ? frameStyles : defaultFrameStyles;
  const sizeList = sizes?.length ? sizes : defaultSizes;

  const [styleIdx, setStyleIdx] = useState(0);
  const [sizeIdx, setSizeIdx] = useState(() => Math.min(1, sizeList.length - 1));
  const [orient, setOrient] = useState<FrameOrientation>(orientation === 'landscape' ? 'landscape' : 'portrait');
  const [fadeFrom, setFadeFrom] = useState<number | null>(null);
  const [scale, setScale] = useState(2.49); // px per cm; measured after mount
  const [sceneW, setSceneW] = useState(1200); // wall width in px; measured after mount
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

  // The print's own long and short side; orientation decides which one is the width.
  const longCm = Math.max(size.widthCm, size.heightCm);
  const shortCm = Math.min(size.widthCm, size.heightCm);
  const artWcm = orient === 'landscape' ? longCm : shortCm;
  const artHcm = orient === 'landscape' ? shortCm : longCm;

  // Display size: true-to-scale unless the print is taller or wider than the scene allows,
  // then the silhouette is clamped (labels keep the real measurements).
  const sceneWcm = sceneW / scale;
  const maxHalfW = Math.min(0.54 * sceneWcm - 58 / scale, 0.46 * sceneWcm - 86 / scale);
  const fit = Math.min(
    1,
    MAX_HALF_CM / ((artHcm + OUTER_CM) / 2),
    Math.max(8, maxHalfW) / ((artWcm + OUTER_CM) / 2),
  );
  const dispW = (artWcm + OUTER_CM) * fit;
  const dispH = (artHcm + OUTER_CM) * fit;
  // Hang at eye height, but never leave more than MAX_GAP_CM of air above the sofa,
  // and never less than GAP_CM or closer to the ceiling than the top margin.
  const hangCm = Math.max(
    SOFA_TOP_CM + GAP_CM + dispH / 2,
    Math.min(HANG_EYE_CM, SOFA_TOP_CM + MAX_GAP_CM + dispH / 2, SCENE_CM - TOP_MARGIN_CM - dispH / 2),
  );
  const gapCm = hangCm - dispH / 2 - SOFA_TOP_CM;
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
    const measure = () => {
      setScale((wall.clientHeight || 562) / SCENE_CM);
      setSceneW(wall.clientWidth || 1200);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(wall);
    measure();
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

  useEffect(() => {
    setOrient(orientation === 'landscape' ? 'landscape' : 'portrait');
  }, [orientation]);

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
  const frameStyle = {
    fontSize: `${scale.toFixed(3)}px`,
    top: `${topPct.toFixed(3)}%`,
    '--gap': gapCm.toFixed(2),
    '--fcur': currentStyle.color,
  } as CSSProperties;
  const orientLabel = orient === 'landscape' ? landscapeLabel : portraitLabel;
  const sceneLabel = `${imageAlt || 'Artwork print'} in a ${currentStyle.name} frame, ${size.label}, ${orientLabel.toLowerCase()}, hanging ${Math.round(gapCm)} cm above a sofa for scale.`;
  const orientOptions: { value: FrameOrientation; label: string }[] = [
    { value: 'portrait', label: portraitLabel },
    { value: 'landscape', label: landscapeLabel },
  ];
  const rails = (
    <>
      <i className={[styles.rail, styles.railT].join(' ')} />
      <i className={[styles.rail, styles.railR].join(' ')} />
      <i className={[styles.rail, styles.railB].join(' ')} />
      <i className={[styles.rail, styles.railL].join(' ')} />
    </>
  );

  return (
    <section
      ref={rootRef}
      className={[styles.root, orient === 'landscape' && styles.landscape, reduced && styles.still, !inView && styles.paused, className]
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
                 M34 58 l-7 26 M146 58 l7 26"
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
          >
            {rails}
          </span>
          {fadeFrom !== null && (
            <span
              key={`f${fadeFrom}`}
              className={[styles.skin, styles.skinOut, finishFor(fadeFrom)].join(' ')}
              style={skinFor(fadeFrom)}
              aria-hidden="true"
              onAnimationEnd={() => setFadeFrom((f) => (f === fadeFrom ? null : f))}
            >
              {rails}
            </span>
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
            <span className={styles.dimRow}>
              <span className={[styles.tick, styles.tickStart].join(' ')} />
              <span className={styles.dimLine} />
              <span className={styles.dimLabel}>{`${Math.round(artWcm)} cm`}</span>
              <span className={styles.dimLine} />
              <span className={[styles.tick, styles.tickEnd].join(' ')} />
            </span>
          </span>
          <span className={styles.dimH} aria-hidden="true">
            <span className={styles.dimCol}>
              <span className={[styles.tick, styles.tickTop].join(' ')} />
              <span className={[styles.tick, styles.tickBottom].join(' ')} />
              <span className={styles.dimLabelH}>{`${Math.round(artHcm)} cm`}</span>
            </span>
          </span>
          <span className={styles.gapDim} aria-hidden="true">
            <span className={[styles.tick, styles.tickTop].join(' ')} />
            <span className={[styles.tick, styles.tickBottom].join(' ')} />
            <span className={styles.gapLabel}>{`${Math.round(gapCm)} cm`}</span>
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

        <fieldset className={styles.group} role="radiogroup">
          <legend className={styles.legend}>{orientationGroupLabel}</legend>
          <div
            className={styles.seg}
            style={{ '--i': orient === 'landscape' ? 1 : 0 } as CSSProperties}
          >
            <span className={styles.segThumb} aria-hidden="true" />
            {orientOptions.map((o) => (
              <label
                key={o.value}
                className={[styles.segOpt, o.value === orient && styles.segOn].filter(Boolean).join(' ')}
              >
                <input
                  className={styles.input}
                  type="radio"
                  name={`fpp-orient-${uid}`}
                  value={o.value}
                  checked={o.value === orient}
                  onChange={() => setOrient(o.value)}
                />
                <svg className={styles.segIcon} viewBox="0 0 14 14" aria-hidden="true">
                  {o.value === 'portrait' ? (
                    <rect x="3.6" y="1.6" width="6.8" height="10.8" rx="1.2" />
                  ) : (
                    <rect x="1.6" y="3.6" width="10.8" height="6.8" rx="1.2" />
                  )}
                </svg>
                <span>{o.label}</span>
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
  --fpp-dim: rgba(34, 40, 30, 0.74);
  --fpp-dim-text: rgba(30, 36, 26, 0.88);
  --fpp-mat: #f5f2e9;
  --fpp-shadow-ink: rgba(44, 52, 38, 0.42);
  --fpp-font: 'Inter Tight', 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --fpp-plaster: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='700' viewBox='0 0 1200 700'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='.005 .012' numOctaves='4' seed='7'/><feDiffuseLighting surfaceScale='2.6' diffuseConstant='1' lighting-color='%23ffffff'><feDistantLight azimuth='0' elevation='56'/></feDiffuseLighting></filter><rect x='-60' y='-60' width='1320' height='820' filter='url(%23p)'/></svg>");
  --fpp-play: running;
  --fpp-skin: skinIn 260ms ease-out both;
  --fpp-top-motion: top 480ms cubic-bezier(0.3, 1.3, 0.35, 1);
  --fpp-seg-motion: transform 420ms cubic-bezier(0.3, 1.3, 0.35, 1);
  --fpp-fade: opacity 200ms ease-out;

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

.landscape {
  --fpp-sheen: 103deg;
}

.paused {
  --fpp-play: paused;
}

.still {
  --fpp-play: paused;
  --fpp-skin: none 0s both;
  --fpp-top-motion: none;
  --fpp-seg-motion: none;
  --fpp-fade: none;
}

/* ---------- Wall scene ---------- */

.wall {
  position: relative;
  display: block;
  block-size: clamp(280px, 56cqw, 560px);
  overflow: clip;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--fpp-wall) 94%, #ffffff) 0%, var(--fpp-wall) 46%, color-mix(in srgb, var(--fpp-wall) 88%, #3f4a35) 100%);
}

/* raking light: low sun from the upper right, falling off across the wall */
.light {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(72% 105% at 100% 0%, rgba(255, 252, 236, 0.5), rgba(255, 252, 236, 0.12) 52%, transparent 74%),
    linear-gradient(104deg, rgba(48, 58, 40, 0.16) 0%, transparent 34%, rgba(255, 252, 236, 0.1) 70%, rgba(255, 252, 236, 0.2) 100%);
}

.drift {
  position: absolute;
  z-index: 0;
  inset-block-start: -18%;
  inset-inline-end: -10%;
  inline-size: 46%;
  aspect-ratio: 1;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(closest-side, rgba(255, 255, 245, 0.2), transparent 70%);
  filter: blur(26px);
  animation: drift 26s ease-in-out infinite alternate;
  animation-play-state: var(--fpp-play);
}

.vignette {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(125% 115% at 58% 36%, transparent 52%, rgba(46, 56, 38, 0.3) 100%),
    linear-gradient(0deg, rgba(46, 56, 38, 0.07), transparent 22%);
}

/* one faint plaster layer, lit from the same side as the wall */
.grain {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background-image: var(--fpp-plaster);
  background-size: cover;
  background-position: 50% 50%;
  opacity: 0.5;
  mix-blend-mode: multiply;
}

/* baseboard: cap, face, and the shadow it throws onto the wall and floor line */
.board {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  block-size: 4.6%;
  z-index: 1;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0 1px, transparent 1px),
    linear-gradient(180deg, rgba(40, 50, 32, 0.22) 0 5%, transparent 5% 18%, rgba(255, 255, 255, 0.12) 18% 100%),
    linear-gradient(180deg, color-mix(in srgb, var(--fpp-wall) 84%, #ffffff) 0%, color-mix(in srgb, var(--fpp-wall) 84%, #ffffff) 100%);
  box-shadow:
    inset 0 -2px 0 rgba(36, 44, 30, 0.2),
    0 -1px 0 rgba(36, 44, 30, 0.14);
}

/* ambient occlusion where wall meets baseboard */
.board::before {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block-end: 100%;
  block-size: 110%;
  background: linear-gradient(0deg, rgba(40, 50, 32, 0.11), transparent);
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
  overflow: visible;
}

/* soft floor shadow line under the legs */
.sofaShadow {
  position: absolute;
  inset-inline: 6%;
  inset-block-end: -1%;
  block-size: 7%;
  background: radial-gradient(closest-side, rgba(36, 44, 30, 0.42), transparent);
  filter: blur(2.5px);
}

.sofaPath {
  fill: rgba(38, 44, 32, 0.06);
  stroke: rgba(38, 44, 32, 0.56);
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sofaSeam {
  fill: none;
  stroke: rgba(38, 44, 32, 0.56);
  stroke-width: 1.4;
  stroke-linecap: round;
}

/* ---------- Frame ---------- */

.frame {
  --sh: 0;
  --mld: 3.4em;
  position: absolute;
  inset-inline-start: 54%;
  transform: translate(-50%, -50%);
  z-index: 3;
  inline-size: 166px;
  block-size: 232px;
  border-radius: 0.15em;
  background: var(--fcur, var(--fpp-wall));
  /* contact, mid and long soft shadow, all thrown down-left, away from the light */
  box-shadow:
    calc(-0.1em * (1 + var(--sh) * 0.6)) calc(0.2em * (1 + var(--sh) * 0.4)) 0.32em rgba(30, 38, 24, 0.34),
    calc(-0.5em * (1 + var(--sh) * 0.85)) calc(0.85em * (1 + var(--sh) * 0.4)) 1.2em -0.1em rgba(36, 44, 30, 0.26),
    calc(-1.6em * (1 + var(--sh) * 0.9)) calc(2.3em * (1 + var(--sh) * 0.4)) 3.8em calc(-0.8em - var(--sh) * 0.2em) var(--fpp-shadow-ink);
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

/* The moulding is four mitred rails. Each has its own profile (outer bevel, face,
   inner lip) and its own grain direction, so the corners read as joined wood or metal. */
.rail {
  position: absolute;
  background:
    linear-gradient(
      var(--dir),
      var(--eo) 0,
      var(--eo) var(--ew),
      transparent var(--ew),
      transparent calc(100% - 0.8em),
      var(--el) calc(100% - 0.8em),
      var(--el) 100%
    ),
    linear-gradient(var(--dir), rgb(255 255 255 / var(--face)), rgb(0 0 0 / var(--face))),
    var(--mat-h);
}

.railT {
  --dir: to bottom;
  --eo: rgb(255 255 255 / var(--pe));
  --el: rgb(0 0 0 / var(--lip));
  inset: 0 0 auto 0;
  block-size: var(--mld);
  clip-path: polygon(0 0, 100% 0, calc(100% - var(--mld)) 100%, var(--mld) 100%);
}

.railR {
  --dir: to left;
  --eo: rgb(255 255 255 / var(--pe));
  --el: rgb(0 0 0 / var(--lip));
  inset: 0 0 0 auto;
  inline-size: var(--mld);
  background-image:
    linear-gradient(
      var(--dir),
      var(--eo) 0,
      var(--eo) var(--ew),
      transparent var(--ew),
      transparent calc(100% - 0.8em),
      var(--el) calc(100% - 0.8em),
      var(--el) 100%
    ),
    linear-gradient(var(--dir), rgb(255 255 255 / var(--face)), rgb(0 0 0 / var(--face))),
    var(--mat-v);
  clip-path: polygon(0 var(--mld), 100% 0, 100% 100%, 0 calc(100% - var(--mld)));
}

.railB {
  --dir: to top;
  --eo: rgb(0 0 0 / var(--pd));
  --el: rgb(255 255 255 / var(--pl));
  inset: auto 0 0 0;
  block-size: var(--mld);
  clip-path: polygon(var(--mld) 0, calc(100% - var(--mld)) 0, 100% 100%, 0 100%);
}

.railL {
  --dir: to right;
  --eo: rgb(0 0 0 / var(--pd));
  --el: rgb(255 255 255 / var(--pl));
  inset: 0 auto 0 0;
  inline-size: var(--mld);
  background-image:
    linear-gradient(
      var(--dir),
      var(--eo) 0,
      var(--eo) var(--ew),
      transparent var(--ew),
      transparent calc(100% - 0.8em),
      var(--el) calc(100% - 0.8em),
      var(--el) 100%
    ),
    linear-gradient(var(--dir), rgb(255 255 255 / var(--face)), rgb(0 0 0 / var(--face))),
    var(--mat-v);
  clip-path: polygon(0 0, 100% var(--mld), 100% calc(100% - var(--mld)), 0 100%);
}

/* oak: open grain with a little run-out, lacquered matte */
.finishWood {
  --pe: 0.34;
  --pd: 0.22;
  --lip: 0.26;
  --pl: 0.18;
  --ew: 0.18em;
  --face: 0.1;
  --mat-h:
    repeating-linear-gradient(179.3deg, rgb(88 56 22 / 0.24) 0 1px, transparent 1px 4px, rgb(88 56 22 / 0.14) 4px 5px, transparent 5px 9px, rgb(255 240 214 / 0.16) 9px 10px, transparent 10px 15px),
    repeating-linear-gradient(180.7deg, transparent 0 9px, rgb(88 56 22 / 0.1) 9px 13px, transparent 13px 31px),
    linear-gradient(90deg, color-mix(in srgb, var(--fc) 90%, #fff) 0%, var(--fc) 38%, color-mix(in srgb, var(--fc) 88%, #5a4020) 100%);
  --mat-v:
    repeating-linear-gradient(89.3deg, rgb(88 56 22 / 0.24) 0 1px, transparent 1px 4px, rgb(88 56 22 / 0.14) 4px 5px, transparent 5px 9px, rgb(255 240 214 / 0.16) 9px 10px, transparent 10px 15px),
    repeating-linear-gradient(90.7deg, transparent 0 9px, rgb(88 56 22 / 0.1) 9px 13px, transparent 13px 31px),
    linear-gradient(180deg, color-mix(in srgb, var(--fc) 90%, #fff) 0%, var(--fc) 38%, color-mix(in srgb, var(--fc) 88%, #5a4020) 100%);
  --mat-sw:
    repeating-linear-gradient(96deg, rgb(88 56 22 / 0.28) 0 1px, transparent 1px 3px, rgb(255 240 214 / 0.2) 3px 4px, transparent 4px 6px),
    linear-gradient(160deg, color-mix(in srgb, var(--fc) 88%, #fff), var(--fc) 50%, color-mix(in srgb, var(--fc) 86%, #5a4020));
}

/* black: near-matte, flat face, one thin edge highlight on the lit side */
.finishMatte {
  --pe: 0.5;
  --pd: 0;
  --lip: 0.4;
  --pl: 0.05;
  --ew: 1px;
  --face: 0.025;
  --mat-h: linear-gradient(90deg, color-mix(in srgb, var(--fc) 94%, #fff), var(--fc) 50%, color-mix(in srgb, var(--fc) 94%, #000));
  --mat-v: linear-gradient(180deg, color-mix(in srgb, var(--fc) 94%, #fff), var(--fc) 50%, color-mix(in srgb, var(--fc) 94%, #000));
  --mat-sw: linear-gradient(150deg, color-mix(in srgb, var(--fc) 90%, #fff), var(--fc) 60%);
}

/* brass: fine brushed lines along the rail plus a travelling sheen */
.finishMetal {
  --pe: 0.78;
  --pd: 0.34;
  --lip: 0.3;
  --pl: 0.34;
  --ew: 0.2em;
  --face: 0;
  --mat-h:
    repeating-linear-gradient(180deg, rgb(255 255 255 / 0.12) 0 1px, rgb(0 0 0 / 0.08) 1px 2px, transparent 2px 3px),
    linear-gradient(90deg, color-mix(in srgb, var(--fc) 58%, #2e2208) 0%, color-mix(in srgb, var(--fc) 62%, #fff8e0) 16%, var(--fc) 32%, color-mix(in srgb, var(--fc) 70%, #fff8e0) 50%, var(--fc) 66%, color-mix(in srgb, var(--fc) 60%, #fff8e0) 84%, color-mix(in srgb, var(--fc) 60%, #2e2208) 100%);
  --mat-v:
    repeating-linear-gradient(90deg, rgb(255 255 255 / 0.12) 0 1px, rgb(0 0 0 / 0.08) 1px 2px, transparent 2px 3px),
    linear-gradient(180deg, color-mix(in srgb, var(--fc) 58%, #2e2208) 0%, color-mix(in srgb, var(--fc) 62%, #fff8e0) 16%, var(--fc) 32%, color-mix(in srgb, var(--fc) 70%, #fff8e0) 50%, var(--fc) 66%, color-mix(in srgb, var(--fc) 60%, #fff8e0) 84%, color-mix(in srgb, var(--fc) 60%, #2e2208) 100%);
  --mat-sw:
    linear-gradient(125deg, color-mix(in srgb, var(--fc) 56%, #2e2208) 0%, color-mix(in srgb, var(--fc) 56%, #fff8e0) 28%, var(--fc) 48%, color-mix(in srgb, var(--fc) 64%, #fff8e0) 66%, color-mix(in srgb, var(--fc) 62%, #2e2208) 100%);
}

.matWrap {
  position: absolute;
  inset: var(--mld);
  z-index: 1;
  border-radius: 0.1em;
  background: linear-gradient(180deg, color-mix(in srgb, var(--fpp-mat) 96%, #fff) 0%, var(--fpp-mat) 100%);
  /* the inner lip shades the mat's top and right edges, away from the light */
  box-shadow:
    inset 0 0 0 1px rgba(70, 64, 45, 0.1),
    inset -0.16em 0.22em 0.5em -0.12em rgba(30, 28, 18, 0.3);
}

/* the cut edge of the mat: a mitred chamfer, lit from the upper right */
.matWrap::before {
  content: '';
  position: absolute;
  inset: 4.6em;
  box-sizing: border-box;
  border: 0.8em solid;
  border-color: #ffffff #fbf9f1 #e2dccb #d3cdb8;
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
    inset -0.14em 0.2em 0.4em -0.1em rgba(30, 30, 22, 0.34);
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

/* glass: a soft diagonal sheen band, a hard-edged secondary glint, and a bright top lip */
.glass {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), transparent 0.5em),
    linear-gradient(
      var(--fpp-sheen, 114deg),
      transparent 24%,
      rgba(255, 255, 255, 0.07) 30%,
      rgba(255, 255, 255, 0.3) 41%,
      rgba(255, 255, 255, 0.07) 50%,
      transparent 54%,
      transparent 57%,
      rgba(255, 255, 255, 0.18) 57.3%,
      rgba(255, 255, 255, 0.18) 60%,
      transparent 60.3%
    );
}

/* ---------- Dimension annotations ---------- */

.dimW,
.dimH,
.gapDim {
  position: absolute;
  pointer-events: none;
  color: var(--fpp-dim-text);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/* oblique architectural tick, centred on its anchor */
.tick {
  position: absolute;
  inline-size: 9px;
  block-size: 1.5px;
  border-radius: 1px;
  background: var(--fpp-dim);
  transform: translate(-50%, -50%) rotate(-45deg);
}

.tickStart {
  inset-inline-start: 0;
  inset-block-start: 50%;
}

.tickEnd {
  inset-inline-start: 100%;
  inset-block-start: 50%;
}

.tickTop {
  inset-inline-start: 0;
  inset-block-start: 0;
}

.tickBottom {
  inset-inline-start: 0;
  inset-block-start: 100%;
}

/* width: art-window edges projected below the frame, dimension line broken around the label */
.dimW {
  inset-inline: calc(var(--mld) + 5.4em);
  inset-block-start: 100%;
  block-size: 26px;
}

.dimW::before,
.dimW::after {
  content: '';
  position: absolute;
  inset-block-start: 7px;
  block-size: 16px;
  inline-size: 1px;
  background: var(--fpp-dim);
  opacity: 0.55;
}

.dimW::before {
  inset-inline-start: 0;
}

.dimW::after {
  inset-inline-end: 0;
}

.dimRow {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
}

.dimLine {
  flex: 1 1 0;
  min-inline-size: 0;
  block-size: 1px;
  background: var(--fpp-dim);
}

.dimLabel,
.dimLabelH,
.gapLabel {
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1;
}

.dimLabel {
  flex: none;
  padding-inline: 7px;
}

/* height: art-window edges projected to the right of the frame */
.dimH {
  inset-block: calc(var(--mld) + 5.4em);
  inset-inline-start: 100%;
  inline-size: 24px;
}

.dimH::before,
.dimH::after {
  content: '';
  position: absolute;
  inset-inline-start: 7px;
  inline-size: 16px;
  block-size: 1px;
  background: var(--fpp-dim);
  opacity: 0.55;
}

.dimH::before {
  inset-block-start: 0;
}

.dimH::after {
  inset-block-end: 0;
}

.dimCol {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 20px;
  inline-size: 1px;
  background: var(--fpp-dim);
}

.dimLabelH {
  position: absolute;
  inset-inline-start: 11px;
  inset-block-start: 50%;
  transform: translateY(-50%);
}

/* hang height: air between the frame and the sofa back, in cm */
.gapDim {
  inset-block-start: 100%;
  inset-inline-start: calc(50% - min(50%, 52em));
  inline-size: 1px;
  block-size: calc(var(--gap, 20) * 1em);
  background: var(--fpp-dim);
  opacity: calc(1 - min(1, var(--sh) * 5));
  transition: var(--fpp-fade);
}

.gapLabel {
  position: absolute;
  inset-inline-end: 10px;
  inset-block-start: 50%;
  transform: translateY(-50%);
  color: var(--fpp-dim-text);
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
    box-shadow 150ms ease,
    transform 120ms ease;
}

.chip:hover {
  border-color: rgba(38, 43, 33, 0.34);
}

.chip:active {
  transform: scale(0.97);
}

/* selected: pressed into the bar, not raised */
.chipOn {
  background: var(--fpp-ink);
  border-color: var(--fpp-ink);
  color: #f4f3ea;
  box-shadow:
    inset 0 1.5px 2px rgba(0, 0, 0, 0.38),
    inset 0 -1px 0 rgba(255, 255, 255, 0.07);
}

.chip:hover:not(.chipOn) {
  background: #ffffff;
}

.chip:has(.input:focus-visible),
.segOpt:has(.input:focus-visible) {
  outline: 2px solid var(--fpp-ink);
  outline-offset: 3px;
}

.chip:has(.input:focus-visible) {
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

/* swatch dot carries the frame's real material */
.dot {
  flex: none;
  inline-size: 16px;
  block-size: 16px;
  border-radius: 50%;
  background: var(--mat-sw, var(--fc));
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.3),
    inset 0 -1px 1px rgba(0, 0, 0, 0.24),
    0 0 0 1px rgba(0, 0, 0, 0.14);
}

.chipOn .dot {
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.3),
    inset 0 -1px 1px rgba(0, 0, 0, 0.24),
    0 0 0 1.5px rgba(244, 243, 234, 0.8);
}

.chipName {
  font-variant-numeric: tabular-nums;
}

/* ---------- Orientation segmented control ---------- */

.seg {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 3px;
  border-radius: 999px;
  border: 1px solid var(--fpp-line);
  background: rgba(38, 43, 33, 0.05);
}

.segThumb {
  position: absolute;
  inset-block: 3px;
  inset-inline-start: 3px;
  inline-size: calc((100% - 6px) / 2);
  border-radius: 999px;
  background: var(--fpp-ink);
  box-shadow:
    inset 0 1.5px 2px rgba(0, 0, 0, 0.38),
    inset 0 -1px 0 rgba(255, 255, 255, 0.07);
  transform: translateX(calc(var(--i, 0) * 100%));
  transition: var(--fpp-seg-motion);
}

.segOpt {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-block-size: 28px;
  padding: 0 14px;
  border-radius: 999px;
  color: var(--fpp-ink);
  font-size: 14px;
  line-height: 1.2;
  cursor: pointer;
  user-select: none;
  transition: color 180ms ease;
}

.segOn {
  color: #f4f3ea;
}

.segIcon {
  flex: none;
  inline-size: 14px;
  block-size: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linejoin: round;
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
