Create a custom element called "Size Against Objects". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: product photo, product name, width and height, comparison objects (choose up to 4 from hand, mug, phone, bank card, can, A4 sheet, each with its label), unit (cm or in), compare label. Add other settings if they help.

```tsx
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export type ComparisonKind = 'hand' | 'mug' | 'phone' | 'card' | 'can' | 'a4';
export type SizeUnit = 'cm' | 'in';

export interface ComparisonObject {
  object: ComparisonKind;
  label: string;
}

export interface SizeAgainstObjectsProps {
  image?: string;
  productName?: string;
  productWidth?: number;
  productHeight?: number;
  unit?: SizeUnit;
  objects?: ComparisonObject[];
  compareLabel?: string;
}

type Shape = { w: number; h: number; paths: string[] };

/* Real sizes in cm; paths drawn in millimetres. */
const SHAPES: Record<ComparisonKind, Shape> = {
  hand: {
    w: 9.5,
    h: 19,
    paths: [
      'M26,189 C22,168 6,152 4,128 L2,78 Q2,66 10,66 Q18,66 18,78 L19,94 L20,40 Q20,30 28,30 Q36,30 36,40 L37,90 L38,28 Q38,18 46,18 Q54,18 54,28 L55,90 L56,42 Q56,32 64,32 Q72,32 72,42 L72,110 C76,102 81,92 85,84 Q89,76 94,81 Q98,87 93,98 C87,118 80,138 73,150 C69,162 68,176 70,189',
      'M22,142 Q40,130 60,136',
      'M30,124 Q46,114 63,118',
    ],
  },
  mug: {
    w: 12,
    h: 9.5,
    paths: [
      'M4,9 L84,9 L80,82 Q79,94 68,94 L20,94 Q9,94 8,82 Z',
      'M4,9 Q44,17 84,9',
      'M82,26 Q117,24 117,48 Q117,72 80,72',
      'M81.5,36 Q106,36 106,49 Q106,62 80.5,62',
    ],
  },
  phone: {
    w: 7.2,
    h: 14.7,
    paths: [
      'M10,0.5 H62 Q71.5,0.5 71.5,10 V137 Q71.5,146.5 62,146.5 H10 Q0.5,146.5 0.5,137 V10 Q0.5,0.5 10,0.5 Z',
      'M12,5 H60 Q67,5 67,12 V135 Q67,142 60,142 H12 Q5,142 5,135 V12 Q5,5 12,5 Z',
      'M30,9.5 H42',
    ],
  },
  card: {
    w: 8.6,
    h: 5.4,
    paths: [
      'M4,0.5 H82 Q85.5,0.5 85.5,4 V50 Q85.5,53.5 82,53.5 H4 Q0.5,53.5 0.5,50 V4 Q0.5,0.5 4,0.5 Z',
      'M9,17 H21 Q23,17 23,19 V26 Q23,28 21,28 H9 Q7,28 7,26 V19 Q7,17 9,17 Z',
      'M7,40 H44',
      'M7,46 H28',
    ],
  },
  can: {
    w: 6.6,
    h: 12.2,
    paths: [
      'M8,6 Q9,1 16,1 H50 Q57,1 58,6 L63,16 V108 L59,116 Q57,121 50,121 H16 Q9,121 7,116 L3,108 V16 Z',
      'M3,16 H63',
      'M3,108 H63',
      'M27,6 H39',
    ],
  },
  a4: {
    w: 21,
    h: 29.7,
    paths: [
      'M0.5,0.5 H176 L209.5,34 V296.5 H0.5 Z',
      'M176,0.5 V34 H209.5',
      'M24,64 H150',
      'M24,84 H186',
      'M24,104 H170',
      'M24,124 H120',
    ],
  },
};

export const defaultObjects: ComparisonObject[] = [
  { object: 'hand', label: 'Hand' },
  { object: 'mug', label: 'Coffee mug' },
  { object: 'phone', label: 'Phone' },
  { object: 'card', label: 'Bank card' },
];

const PAD = { top: 52, bottom: 58, start: 56, end: 20 };
const CM_PER_IN = 2.54;

const fmt = (n: number) => String(Math.round(n * 10) / 10);
const positive = (n: number) => (Number.isFinite(n) && n > 0 ? n : 1);

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

function Outline({ shape, chalk, draw, weight }: { shape: Shape; chalk?: string; draw?: boolean; weight?: number }) {
  return (
    <svg
      className={chalk ? styles.outline : styles.chipIcon}
      viewBox={`0 0 ${shape.w * 10} ${shape.h * 10}`}
      preserveAspectRatio={chalk ? 'none' : 'xMidYMid meet'}
      aria-hidden="true"
      focusable="false"
    >
      <g filter={chalk ? `url(#${chalk})` : undefined}>
        {shape.paths.map((d, i) => (
          <path
            key={i}
            d={d}
            pathLength={1}
            className={chalk ? cx(styles.stroke, draw && styles.strokeDraw) : styles.iconStroke}
            vectorEffect={chalk ? undefined : 'non-scaling-stroke'}
            strokeWidth={weight}
            style={{ '--i': i } as CSSProperties}
          />
        ))}
      </g>
    </svg>
  );
}

export default function SizeAgainstObjects({
  image = 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?rect=1180,1480,1650,4080&w=600&q=80',
  productName = 'Field Flask 350 ml',
  productWidth = 7.4,
  productHeight = 18.3,
  unit = 'cm',
  objects = defaultObjects,
  compareLabel = 'Compare with',
}: SizeAgainstObjectsProps) {
  const uid = useId().replace(/:/g, '');
  const chalkId = `${uid}-chalk`;
  const titleId = `${uid}-title`;
  const compareId = `${uid}-compare`;

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [stageW, setStageW] = useState(560);
  const [measured, setMeasured] = useState(false);
  const [inView, setInView] = useState(false);
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState<'product' | 'object' | null>(null);

  const list = objects.slice(0, 4);
  const index = Math.min(active, Math.max(0, list.length - 1));
  const current = list[index];
  const shape = current ? (SHAPES[current.object] ?? SHAPES.hand) : null;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    let frame = 0;
    const ro = new ResizeObserver(([e]) => {
      setStageW(e.contentRect.width);
      frame = requestAnimationFrame(() => setMeasured(true));
    });
    ro.observe(stage);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setInView(true);
        io.disconnect();
      },
      { threshold: 0.2 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const toCm = unit === 'in' ? CM_PER_IN : 1;
  const pw = positive(productWidth) * toCm;
  const ph = positive(productHeight) * toCm;
  const ow = shape?.w ?? 0;
  const oh = shape?.h ?? 0;
  const show = (cm: number) => fmt(cm / toCm);

  const H = Math.round(Math.min(460, Math.max(300, stageW * 0.78)));
  const gap = shape ? Math.min(64, Math.max(28, stageW * 0.08)) : 0;
  const availW = Math.max(40, stageW - PAD.start - PAD.end - gap);
  const availH = H - PAD.top - PAD.bottom;
  const scale = Math.min(availW / (pw + ow), availH / Math.max(ph, oh));
  const groupW = (pw + ow) * scale + gap;
  const px = PAD.start + Math.max(0, (availW + gap - groupW) / 2);
  const ox = px + pw * scale + gap;
  const base = H - PAD.bottom;

  const minor = unit === 'in' ? (scale * CM_PER_IN) / 4 : scale;
  const major = unit === 'in' ? scale * CM_PER_IN : scale * 5;

  const productDims = `${show(pw)} × ${show(ph)} ${unit}`;
  const objectDims = shape ? `${show(ow)} × ${show(oh)} ${unit}` : '';
  const announce = current && shape ? `${current.label}, ${objectDims}. ${productName}, ${productDims}.` : '';

  const stageStyle = {
    blockSize: H,
    '--sao-cell': `${minor.toFixed(2)}px`,
    '--sao-major': `${major.toFixed(2)}px`,
    '--sao-ox': `${px.toFixed(1)}px`,
    '--sao-oy': `${base.toFixed(1)}px`,
  } as CSSProperties;

  const pick = (i: number) => {
    setActive(i);
    chipRefs.current[i]?.focus();
  };

  const onChipKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = list.length;
    const next: Record<string, number> = {
      ArrowRight: (i + 1) % n,
      ArrowDown: (i + 1) % n,
      ArrowLeft: (i - 1 + n) % n,
      ArrowUp: (i - 1 + n) % n,
      Home: 0,
      End: n - 1,
    };
    if (!(e.key in next)) return;
    e.preventDefault();
    pick(next[e.key]);
  };

  const hoverProps = (which: 'product' | 'object') => ({
    onPointerEnter: () => setHover(which),
    onPointerLeave: () => setHover(null),
    onFocus: () => setHover(which),
    onBlur: () => setHover(null),
  });

  return (
    <div ref={rootRef} className={styles.root} role="group" aria-labelledby={titleId}>
      <svg className={styles.defs} aria-hidden="true" focusable="false">
        <filter id={chalkId} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="noise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="1.4"
            xChannelSelector="R"
            yChannelSelector="G"
            result="wobble"
          />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 1.95"
            result="grain"
          />
          <feComposite in="wobble" in2="grain" operator="in" />
        </filter>
      </svg>

      <div className={styles.frame}>
        <header className={styles.info}>
          <h3 id={titleId} className={styles.name}>
            {productName}
          </h3>
          <p className={styles.dims}>
            <span className={styles.dimsValue}>
              {show(pw)}
              <span className={styles.times}>×</span>
              {show(ph)}
            </span>
            <span className={styles.unit}>{unit}</span>
          </p>
        </header>

        <div ref={stageRef} className={styles.stage} style={stageStyle}>
          <span className={styles.grid} aria-hidden="true" />
          <span className={styles.light} aria-hidden="true" />
          <span className={styles.grain} aria-hidden="true" />
          <span className={styles.ground} style={{ insetBlockStart: base }} aria-hidden="true" />

          {shape && (
            <span
              className={cx(styles.guide, measured && styles.glide, !inView && styles.wait)}
              style={{
                insetBlockStart: base - oh * scale,
                insetInlineStart: px - 10,
                inlineSize: ox + ow * scale - px + 20,
              }}
              aria-hidden="true"
            />
          )}

          <span
            className={cx(styles.arrow, inView ? styles.arrowIn : styles.wait)}
            style={{ insetInlineStart: px - 24, insetBlockStart: base - ph * scale, blockSize: ph * scale }}
            aria-hidden="true"
          >
            <span className={styles.arrowTag}>{`${show(ph)} ${unit}`}</span>
          </span>

          <span
            className={cx(styles.span, !inView && styles.wait)}
            style={{ insetInlineStart: px, insetBlockStart: base + 16, inlineSize: pw * scale }}
            aria-hidden="true"
          >
            <span className={styles.spanTag}>{`${show(pw)} ${unit}`}</span>
          </span>

          <div
            className={cx(styles.product, measured && styles.glide, inView ? styles.productIn : styles.wait)}
            style={{
              insetInlineStart: px,
              insetBlockStart: base - ph * scale,
              inlineSize: pw * scale,
              blockSize: ph * scale,
            }}
            tabIndex={0}
            role="img"
            aria-label={`${productName}, ${productDims}`}
            {...hoverProps('product')}
          >
            <span className={styles.contact} aria-hidden="true" />
            {image ? (
              <img className={styles.photo} src={image} alt="" draggable={false} />
            ) : (
              <span className={styles.blank} aria-hidden="true" />
            )}
            <span className={styles.corners} aria-hidden="true" />
            <span className={cx(styles.tip, hover === 'product' && styles.tipOn)} aria-hidden="true">
              {productDims}
            </span>
          </div>

          {shape && current && (
            <div
              key={`${current.object}-${index}`}
              className={cx(styles.object, measured && styles.glide, inView ? styles.objectIn : styles.wait)}
              style={{
                insetInlineStart: ox,
                insetBlockStart: base - oh * scale,
                inlineSize: ow * scale,
                blockSize: oh * scale,
              }}
              tabIndex={0}
              role="img"
              aria-label={`${current.label}, ${objectDims}`}
              {...hoverProps('object')}
            >
              <Outline shape={shape} chalk={chalkId} draw={inView} weight={22 / scale} />
              <span className={cx(styles.tip, hover === 'object' && styles.tipOn)} aria-hidden="true">
                {`${current.label} · ${objectDims}`}
              </span>
            </div>
          )}
        </div>

        {list.length > 0 && (
          <div className={styles.picker}>
            <p className={styles.compareLabel} id={compareId}>
              {compareLabel}
            </p>
            <div className={styles.chips} role="radiogroup" aria-labelledby={compareId}>
              {list.map((o, i) => (
                <button
                  key={`${o.object}-${i}`}
                  ref={(el) => {
                    chipRefs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={i === index}
                  tabIndex={i === index ? 0 : -1}
                  className={cx(styles.chip, i === index && styles.chipOn)}
                  onClick={() => setActive(i)}
                  onKeyDown={(e) => onChipKey(e, i)}
                >
                  <Outline shape={SHAPES[o.object] ?? SHAPES.hand} />
                  <span className={styles.chipLabel}>{o.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className={styles.srOnly} aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
```

```css
.root {
  --sao-paper: #f4eee3;
  --sao-mat: #d3bb95;
  --sao-mat-deep: #c4a77c;
  --sao-grid: rgba(96, 64, 30, 0.13);
  --sao-grid-major: rgba(96, 64, 30, 0.26);
  --sao-chalk: #fffdf7;
  --sao-ink: #2b2219;
  --sao-muted: rgba(43, 34, 25, 0.64);
  --sao-hairline: rgba(43, 34, 25, 0.14);
  --sao-accent: #e0472c;
  --sao-font-display: 'Inter Tight', 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --sao-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --sao-font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  --sao-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0 0.2  0 0 0 .8 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --sao-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --sao-spring: cubic-bezier(0.3, 1.32, 0.42, 1);

  position: relative;
  box-sizing: border-box;
  inline-size: 100%;
  container-type: inline-size;
  padding: 20px;
  border-radius: 28px;
  border: 1px solid var(--sao-hairline);
  background: var(--sao-paper);
  color: var(--sao-ink);
  font-family: var(--sao-font-ui);
}

.defs {
  position: absolute;
  inline-size: 0;
  block-size: 0;
  overflow: hidden;
}

.frame {
  display: grid;
  grid-template-areas: 'info' 'stage' 'picker';
  gap: 20px;
  min-inline-size: 0;
}

.info {
  grid-area: info;
  display: grid;
  gap: 6px;
  min-inline-size: 0;
  padding-inline: 4px;
}

.name {
  margin: 0;
  font-family: var(--sao-font-display);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.015em;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.dims {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0;
}

.dimsValue {
  font-family: var(--sao-font-display);
  font-size: clamp(36px, 11cqi, 52px);
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.045em;
  font-variant-numeric: tabular-nums;
}

.times {
  margin-inline: 0.12em;
  font-weight: 300;
  color: var(--sao-accent);
}

.unit {
  font-family: var(--sao-font-mono);
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--sao-muted);
}

.stage {
  grid-area: stage;
  position: relative;
  isolation: isolate;
  overflow: clip;
  min-inline-size: 0;
  border-radius: 18px;
  background: linear-gradient(170deg, var(--sao-mat) 0%, var(--sao-mat-deep) 100%);
  box-shadow:
    inset 0 0 0 1px rgba(96, 64, 30, 0.18),
    0 1px 2px rgba(43, 34, 25, 0.08),
    0 18px 36px -24px rgba(43, 34, 25, 0.35);
}

.grid,
.light,
.grain {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}

.grid {
  background-image:
    linear-gradient(to right, var(--sao-grid-major) 1px, transparent 1px),
    linear-gradient(to bottom, var(--sao-grid-major) 1px, transparent 1px),
    linear-gradient(to right, var(--sao-grid) 1px, transparent 1px),
    linear-gradient(to bottom, var(--sao-grid) 1px, transparent 1px);
  background-size:
    var(--sao-major) var(--sao-major),
    var(--sao-major) var(--sao-major),
    var(--sao-cell) var(--sao-cell),
    var(--sao-cell) var(--sao-cell);
  background-position: var(--sao-ox) var(--sao-oy);
}

.light {
  background:
    radial-gradient(70% 60% at 18% 0%, rgba(255, 250, 238, 0.42) 0%, transparent 70%),
    radial-gradient(60% 50% at 100% 100%, rgba(96, 64, 30, 0.14) 0%, transparent 70%);
}

.grain {
  background-image: var(--sao-noise);
  opacity: 0.2;
  mix-blend-mode: multiply;
}

.ground {
  position: absolute;
  inset-inline: 0;
  block-size: 0;
  border-block-start: 1.5px solid rgba(255, 253, 247, 0.7);
  pointer-events: none;
}

.guide {
  position: absolute;
  block-size: 0;
  border-block-start: 1.5px dashed rgba(255, 253, 247, 0.75);
  pointer-events: none;
}

.arrow {
  position: absolute;
  inline-size: 2px;
  background: var(--sao-accent);
  border-radius: 1px;
  transform-origin: 50% 100%;
}

.arrow::before,
.arrow::after {
  content: '';
  position: absolute;
  inset-inline-start: -4px;
  inline-size: 10px;
  block-size: 8px;
  background: var(--sao-accent);
}

.arrow::before {
  inset-block-start: -1px;
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
}

.arrow::after {
  inset-block-end: -1px;
  clip-path: polygon(0 0, 100% 0, 50% 100%);
}

.arrowIn {
  animation: grow 720ms var(--sao-ease) 260ms backwards;
}

.arrowTag {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-end: 9px;
  padding: 3px 6px;
  border-radius: 6px;
  background: var(--sao-accent);
  color: #fff;
  font-family: var(--sao-font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  writing-mode: vertical-rl;
  transform: translateY(-50%) rotate(180deg);
}

.span {
  position: absolute;
  block-size: 0;
  border-block-start: 1.5px solid var(--sao-chalk);
}

.span::before,
.span::after {
  content: '';
  position: absolute;
  inset-block-start: -6px;
  inline-size: 1.5px;
  block-size: 10px;
  background: var(--sao-chalk);
}

.span::before {
  inset-inline-start: 0;
}

.span::after {
  inset-inline-end: 0;
}

.spanTag {
  position: absolute;
  inset-block-start: 7px;
  inset-inline-start: 50%;
  transform: translateX(-50%);
  color: var(--sao-ink);
  font-family: var(--sao-font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.product,
.object {
  position: absolute;
  outline: none;
  border-radius: 4px;
}

.glide {
  transition:
    inset-inline-start 520ms var(--sao-ease),
    inset-block-start 520ms var(--sao-ease),
    inline-size 520ms var(--sao-ease),
    block-size 520ms var(--sao-ease);
}

.product:focus-visible,
.object:focus-visible {
  box-shadow: 0 0 0 2px var(--sao-mat), 0 0 0 4px var(--sao-ink);
}

.productIn {
  animation: rise 640ms var(--sao-ease) backwards;
}

.photo {
  position: relative;
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  border-radius: 3px;
  mix-blend-mode: multiply;
  filter: brightness(1.08) contrast(1.06);
  user-select: none;
}

.blank {
  display: block;
  box-sizing: border-box;
  block-size: 100%;
  border: 1.5px dashed var(--sao-chalk);
  border-radius: 3px;
  background: rgba(255, 253, 247, 0.16);
}

.contact {
  position: absolute;
  inset-inline: 6%;
  inset-block-end: -6px;
  block-size: 12px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(60, 38, 16, 0.4), transparent);
  filter: blur(3px);
  pointer-events: none;
}

.corners {
  --c: var(--sao-chalk);
  position: absolute;
  inset: -7px;
  pointer-events: none;
  background:
    linear-gradient(var(--c), var(--c)) 0 0 / 10px 1.5px no-repeat,
    linear-gradient(var(--c), var(--c)) 0 0 / 1.5px 10px no-repeat,
    linear-gradient(var(--c), var(--c)) 100% 0 / 10px 1.5px no-repeat,
    linear-gradient(var(--c), var(--c)) 100% 0 / 1.5px 10px no-repeat,
    linear-gradient(var(--c), var(--c)) 0 100% / 10px 1.5px no-repeat,
    linear-gradient(var(--c), var(--c)) 0 100% / 1.5px 10px no-repeat,
    linear-gradient(var(--c), var(--c)) 100% 100% / 10px 1.5px no-repeat,
    linear-gradient(var(--c), var(--c)) 100% 100% / 1.5px 10px no-repeat;
}

.object {
  transform-origin: 50% 100%;
}

.objectIn {
  animation: settle 760ms var(--sao-spring) 80ms backwards;
}

.outline {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
  filter: drop-shadow(0 1px 0 rgba(80, 52, 22, 0.28));
}

.stroke {
  fill: none;
  stroke: var(--sao-chalk);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 0;
}

.strokeDraw {
  animation: draw 1100ms var(--sao-ease) backwards;
  animation-delay: calc(140ms + var(--i) * 110ms);
}

.wait {
  opacity: 0;
}

.tip {
  position: absolute;
  z-index: 2;
  inset-block-end: calc(100% + 12px);
  inset-inline-start: 50%;
  inline-size: max-content;
  max-inline-size: 200px;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--sao-ink);
  color: var(--sao-paper);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  text-align: center;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 6px 16px -8px rgba(43, 34, 25, 0.5);
  opacity: 0;
  transform: translate(-50%, 4px);
  pointer-events: none;
  transition:
    opacity 180ms ease-out,
    transform 260ms var(--sao-ease);
}

.tipOn {
  opacity: 1;
  transform: translate(-50%, 0);
}

.picker {
  grid-area: picker;
  display: grid;
  gap: 10px;
  min-inline-size: 0;
}

.compareLabel {
  margin: 0;
  padding-inline: 4px;
  font-family: var(--sao-font-mono);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--sao-muted);
}

.chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  padding: 3px;
  margin: -3px;
}

.chip {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-block-size: 48px;
  padding-block: 8px;
  padding-inline: 12px 16px;
  border: 1px solid var(--sao-hairline);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.5);
  color: var(--sao-ink);
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  text-align: start;
  cursor: pointer;
  scroll-snap-align: start;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color 200ms ease-out,
    border-color 200ms ease-out,
    color 200ms ease-out,
    transform 160ms var(--sao-ease);
}

.chip:hover {
  background: #fff;
  border-color: rgba(43, 34, 25, 0.26);
}

.chip:active {
  transform: scale(0.97);
}

.chip:focus-visible {
  outline: 2px solid var(--sao-accent);
  outline-offset: 2px;
}

.chipOn {
  background: var(--sao-ink);
  border-color: var(--sao-ink);
  color: var(--sao-paper);
}

.chipOn:hover {
  background: var(--sao-ink);
  border-color: var(--sao-ink);
}

.chipIcon {
  flex: none;
  inline-size: 22px;
  block-size: 22px;
}

.iconStroke {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.chipLabel {
  max-inline-size: 16ch;
  overflow-wrap: anywhere;
  line-height: 1.2;
}

.srOnly {
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

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}

@keyframes grow {
  from {
    opacity: 0;
    transform: scaleY(0);
  }
}

@keyframes settle {
  from {
    opacity: 0;
    transform: translateX(32px) scale(0.86);
  }
}

@keyframes draw {
  from {
    stroke-dashoffset: 1;
  }
}

@container (min-width: 720px) {
  .frame {
    grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    grid-template-areas: 'info stage' 'picker stage';
    column-gap: 32px;
    row-gap: 28px;
  }

  .info {
    padding-block-start: 12px;
  }

  .name {
    font-size: 20px;
  }

  .dimsValue {
    font-size: 56px;
  }

  .picker {
    align-self: end;
    padding-block-end: 4px;
  }

  .chips {
    flex-wrap: wrap;
    overflow: visible;
  }

  .chip {
    flex: 1 1 100%;
  }

  .chipLabel {
    max-inline-size: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wait {
    opacity: 1;
  }

  .arrowIn,
  .productIn,
  .objectIn,
  .strokeDraw {
    animation: none;
  }

  .glide,
  .tip,
  .chip {
    transition: none;
  }
}
```
