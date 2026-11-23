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
  const maxHalfW = 0.5 * sceneWcm - 86 / scale;
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
