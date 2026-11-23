const n=`Create a custom element called "Size Against Objects". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: product photo (white background works best), product name, width and height, comparison objects (choose up to 4 from hand, mug, phone, bank card, can, A4 sheet, each with its label), unit (cm or in), compare label. Add other settings if they help.

\`\`\`tsx
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import styles from "./Component.module.css";

export type ComparisonKind = "hand" | "mug" | "phone" | "card" | "can" | "a4";
export type SizeUnit = "cm" | "in";

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

/* Real sizes in cm; outline first (hatched), then detail lines. Drawn in millimetres. */
type Shape = { w: number; h: number; outline: string; details: string[] };

const SHAPES: Record<ComparisonKind, Shape> = {
  hand: {
    w: 9.5,
    h: 19,
    outline:
      "M14,190 C10,172 4,152 4,130 L4,70 A7.5,7.5 0 0 1 19,70 L19,97 A1,1 0 0 0 21,97 L21,38 A8,8 0 0 1 37,38 L37,93 A1,1 0 0 0 39,93 L39,26 A8.5,8.5 0 0 1 56,26 L56,93 A1,1 0 0 0 58,93 L58,40 A8,8 0 0 1 74,40 L74,114 Q77,126 80,118 L85,92 A6,6 0 0 1 95,96 C93,116 88,134 80,148 C76,160 76,176 76,190",
    details: [
      "M6,86 Q11.5,88 17,86",
      "M23,58 Q29,60 35,58",
      "M23,76 Q29,78 35,76",
      "M41,46 Q47.5,48 54,46",
      "M41,68 Q47.5,70 54,68",
      "M60,58 Q66,60 72,58",
      "M60,78 Q66,80 72,78",
      "M8,126 Q30,112 54,117",
      "M10,140 Q40,128 72,124",
      "M73,128 Q60,152 63,178",
      "M86,112 Q83,118 80,121",
    ],
  },
  mug: {
    w: 12,
    h: 9.5,
    outline: "M6,8 L84,8 L84,84 Q84,94 74,94 L16,94 Q6,94 6,84 Z",
    details: [
      "M6,14 L84,14",
      "M10,89 L80,89",
      "M84,24 C119,22 119,76 84,74",
      "M84,34 C107,34 107,64 84,63",
      "M45,8 L45,4",
    ],
  },
  phone: {
    w: 7.2,
    h: 14.7,
    outline:
      "M10,0.5 H62 Q71.5,0.5 71.5,10 V137 Q71.5,146.5 62,146.5 H10 Q0.5,146.5 0.5,137 V10 Q0.5,0.5 10,0.5 Z",
    details: [
      "M12,4.5 H60 Q67,4.5 67,11.5 V135.5 Q67,142.5 60,142.5 H12 Q5,142.5 5,135.5 V11.5 Q5,4.5 12,4.5 Z",
      "M29,9 H43 A2.5,2.5 0 0 1 43,14 H29 A2.5,2.5 0 0 1 29,9 Z",
      "M-1.5,30 V38",
      "M-1.5,44 V58",
      "M73.5,40 V62",
      "M28,138 H44",
    ],
  },
  card: {
    w: 8.6,
    h: 5.4,
    outline:
      "M4,0.5 H82 Q85.5,0.5 85.5,4 V50 Q85.5,53.5 82,53.5 H4 Q0.5,53.5 0.5,50 V4 Q0.5,0.5 4,0.5 Z",
    details: [
      "M9,16 H21 Q23,16 23,18 V27 Q23,29 21,29 H9 Q7,29 7,27 V18 Q7,16 9,16 Z",
      "M7,22.5 H23",
      "M15,16 V29",
      "M7,39 H17 M20,39 H30 M33,39 H43 M46,39 H56",
      "M7,46 H32",
      "M70,14 Q73,19 70,24",
      "M74,12 Q78,19 74,26",
    ],
  },
  can: {
    w: 6.6,
    h: 12.2,
    outline:
      "M8,6 Q9,1 16,1 H50 Q57,1 58,6 L63,16 V108 L59,116 Q57,121 50,121 H16 Q9,121 7,116 L3,108 V16 Z",
    details: [
      "M3,16 H63",
      "M3,108 H63",
      "M8,6 H58",
      "M27,3.5 H39",
      "M3,20 H63",
      "M3,104 H63",
    ],
  },
  a4: {
    w: 21,
    h: 29.7,
    outline: "M0.5,0.5 H176 L209.5,34 V296.5 H0.5 Z",
    details: [
      "M176,0.5 V34 H209.5",
      "M24,56 H120",
      "M24,84 H186",
      "M24,100 H186",
      "M24,116 H170",
      "M24,132 H186",
      "M24,148 H128",
      "M24,252 H96",
    ],
  },
};

export const defaultObjects: ComparisonObject[] = [
  { object: "hand", label: "Hand" },
  { object: "mug", label: "Coffee mug" },
  { object: "phone", label: "Phone" },
  { object: "card", label: "Bank card" },
];

const CM_PER_IN = 2.54;
const WIDE = 640;
const SPLIT = 0.44;
const LABEL_STEPS = [1, 2, 5, 10, 20, 50, 100];

const fmt = (n: number) =>
  (Math.round(n * 10) / 10).toFixed(Math.abs(n - Math.round(n)) < 0.05 ? 0 : 1);
const positive = (n: number) => (Number.isFinite(n) && n > 0 ? n : 1);
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const cx = (...names: (string | false | undefined)[]) =>
  names.filter(Boolean).join(" ");

const prefersReduced = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* Damped spring toward target; snaps when \`snap\` changes. Returns [value, velocity]. */
function useSpring(target: number, snap: unknown, live: boolean) {
  const st = useRef({ x: target, v: 0, raf: 0, snap });
  const [out, setOut] = useState<[number, number]>([target, 0]);

  useEffect(() => {
    const s = st.current;
    cancelAnimationFrame(s.raf);
    if (!live || s.snap !== snap || prefersReduced()) {
      s.snap = snap;
      s.x = target;
      s.v = 0;
      setOut([target, 0]);
      return;
    }
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      s.v += (170 * (target - s.x) - 21 * s.v) * dt;
      s.x += s.v * dt;
      if (
        Math.abs(target - s.x) < target * 0.0005 &&
        Math.abs(s.v) < target * 0.005
      ) {
        s.x = target;
        s.v = 0;
        setOut([target, 0]);
        return;
      }
      setOut([s.x, s.v]);
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(s.raf);
  }, [target, snap, live]);

  return out;
}

/* Eased count toward target (expo out). */
function useCount(target: number, live: boolean, from = 0) {
  const [val, setVal] = useState(live ? target : from);
  const cur = useRef(val);

  useEffect(() => {
    if (!live) return;
    if (prefersReduced()) {
      cur.current = target;
      setVal(target);
      return;
    }
    const start = cur.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 900);
      const e = 1 - Math.pow(2, -10 * p);
      cur.current = start + (target - start) * (p === 1 ? 1 : e);
      setVal(cur.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, live]);

  return val;
}

function ShapeIcon({ shape }: { shape: Shape }) {
  return (
    <svg
      className={styles.segIcon}
      viewBox={\`-4 -4 \${shape.w * 10 + 8} \${shape.h * 10 + 8}\`}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={shape.outline}
        className={styles.iconStroke}
        vectorEffect="non-scaling-stroke"
      />
      {shape.details.slice(0, 2).map((d, i) => (
        <path
          key={i}
          d={d}
          className={styles.iconDetail}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

type DimProps = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  ext: number;
  label: string;
  vertical?: boolean;
  dim?: boolean;
  delay: number;
};

/* Architectural dimension: extension lines, oblique ticks, knocked-out label. */
function Dimension({
  x1,
  y1,
  x2,
  y2,
  ext,
  label,
  vertical,
  dim,
  delay,
}: DimProps) {
  const t = 5;
  const ticks = \`M\${x1 - t},\${y1 + t} L\${x1 + t},\${y1 - t} M\${x2 - t},\${y2 + t} L\${x2 + t},\${y2 - t}\`;
  const exts = vertical
    ? \`M\${x1 + ext},\${y1} H\${x1 - 6 * Math.sign(ext)} M\${x2 + ext},\${y2} H\${x2 - 6 * Math.sign(ext)}\`
    : \`M\${x1},\${y1 + ext} V\${y1 - 6 * Math.sign(ext)} M\${x2},\${y2 + ext} V\${y2 - 6 * Math.sign(ext)}\`;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g
      className={cx(styles.dimension, dim && styles.dimensionDim)}
      style={{ "--d": \`\${delay}ms\` } as CSSProperties}
    >
      <path className={styles.dimExt} d={exts} />
      <g
        className={styles.dimGrow}
        style={{ transformOrigin: \`\${mx}px \${my}px\` }}
      >
        <path className={styles.dimLine} d={\`M\${x1},\${y1} L\${x2},\${y2}\`} />
        <path className={styles.dimTick} d={ticks} />
      </g>
      <text
        className={styles.dimLabel}
        x={mx}
        y={my}
        transform={vertical ? \`rotate(-90 \${mx} \${my})\` : undefined}
        dominantBaseline="central"
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );
}

export default function SizeAgainstObjects({
  image = "https://images.unsplash.com/photo-1602143407151-7111542de6e8?rect=1180,1480,1650,4080&w=600&q=80",
  productName = "Field Flask 350 ml",
  productWidth = 7.4,
  productHeight = 18.3,
  unit = "cm",
  objects = defaultObjects,
  compareLabel = "Compare with",
}: SizeAgainstObjectsProps) {
  const uid = useId().replace(/:/g, "");
  const matteId = \`\${uid}-matte\`;
  const hatchId = \`\${uid}-hatch\`;
  const titleId = \`\${uid}-title\`;
  const compareId = \`\${uid}-compare\`;

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const segRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [W, setW] = useState(0);
  const [inView, setInView] = useState(false);
  const [active, setActive] = useState(0);
  const [exiting, setExiting] = useState<{ index: number; key: number } | null>(
    null,
  );
  const [drawKey, setDrawKey] = useState(0);
  const [focus, setFocus] = useState<"product" | "object" | null>(null);
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);

  const list = objects.slice(0, 4);
  const index = Math.min(active, Math.max(0, list.length - 1));
  const current = list[index];
  const shape = current ? (SHAPES[current.object] ?? SHAPES.hand) : null;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setInView(true);
        io.disconnect();
      },
      { threshold: 0.25 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = segRefs.current[index];
    if (!el) return;
    setThumb({ x: el.offsetLeft, w: el.offsetWidth });
  }, [index, W, list.length, objects]);

  const toCm = unit === "in" ? CM_PER_IN : 1;
  const pw = positive(productWidth) * toCm;
  const ph = positive(productHeight) * toCm;
  const ow = shape?.w ?? 0;
  const oh = shape?.h ?? 0;
  const show = (cm: number) => fmt(cm / toCm);

  const width = W || 560;
  const wide = width >= WIDE;
  const H = Math.round(
    wide ? clamp(width * 0.5, 440, 600) : clamp(width * 0.95, 300, 420),
  );
  const pad = {
    top: 72,
    bottom: wide ? 66 : 58,
    start: wide ? width * SPLIT : 44,
    end: 52,
  };
  const gap = shape ? clamp(width * 0.07, 44, 96) : 0;
  const availW = Math.max(40, width - pad.start - pad.end - gap);
  const base = H - pad.bottom;
  const targetS = Math.min(
    availW / (pw + ow),
    (base - pad.top) / Math.max(ph, oh),
  );

  const [s, v] = useSpring(targetS, \`\${width}|\${H}|\${pw}|\${ph}\`, inView);

  const groupW = (pw + ow) * s + gap;
  const px =
    pad.start + Math.max(0, (width - pad.start - pad.end - groupW) / 2);
  const ox = px + pw * s + gap;
  const lift = clamp((Math.abs(v) / Math.max(1, s)) * 5, 0, 9);

  const cW = useCount(pw / toCm, inView);
  const cH = useCount(ph / toCm, inView);
  const oW = useCount(ow / toCm, inView);
  const oH = useCount(oh / toCm, inView);

  /* Ruler + grid in the chosen unit. */
  const unitPx = unit === "in" ? s * CM_PER_IN : s;
  const minorPx = unit === "in" ? unitPx / 4 : unitPx;
  const step = LABEL_STEPS.find((n) => n * unitPx >= 56) ?? 100;
  const rulerX0 = wide ? 24 : 12;
  const rulerX1 = width - (wide ? 24 : 12);
  const ticks: string[] = [];
  const fine = unit === "cm" && s / 10 >= 4;
  const tickStep = fine ? s / 10 : minorPx;
  const perUnit = Math.round(unitPx / tickStep);
  const kFrom = Math.ceil((rulerX0 - px) / tickStep);
  const kTo = Math.floor((rulerX1 - px) / tickStep);
  for (let k = kFrom; k <= kTo; k++) {
    const x = (px + k * tickStep).toFixed(1);
    const whole = k % perUnit === 0;
    const len = whole
      ? (k / perUnit) % 5 === 0
        ? 11
        : 7
      : unit === "in" && k % (perUnit / 2) === 0
        ? 5
        : 3.5;
    ticks.push(\`M\${x},\${base} v\${len}\`);
  }
  const labels: { x: number; n: number }[] = [];
  for (let n = 0; px + n * unitPx <= rulerX1 - 8; n += step)
    labels.push({ x: px + n * unitPx, n });

  const minorAlpha = clamp((minorPx - 5) / 10, 0, 1);
  const stageStyle = {
    blockSize: H,
    "--sao-cell": \`\${minorPx.toFixed(2)}px\`,
    "--sao-major": \`\${(unit === "in" ? unitPx : unitPx * 5).toFixed(2)}px\`,
    "--sao-ox": \`\${px.toFixed(1)}px\`,
    "--sao-oy": \`\${base.toFixed(1)}px\`,
    "--sao-minor-a": minorAlpha.toFixed(2),
  } as CSSProperties;

  const scaleBarUnits = unit === "in" ? 2 : 5;
  const scaleBarW = unitPx * scaleBarUnits;

  const productDims = \`\${show(pw)} × \${show(ph)} \${unit}\`;
  const objectDims = shape ? \`\${show(ow)} × \${show(oh)} \${unit}\` : "";
  const announce =
    current && shape
      ? \`\${current.label}, \${objectDims}. \${productName}, \${productDims}.\`
      : "";

  const select = (i: number) => {
    if (i === index) return;
    setExiting({ index, key: drawKey });
    setDrawKey((k) => k + 1);
    setActive(i);
  };

  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(() => setExiting(null), 320);
    return () => clearTimeout(t);
  }, [exiting]);

  const onSegKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
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
    select(next[e.key]);
    segRefs.current[next[e.key]]?.focus();
  };

  const focusProps = (which: "product" | "object") => ({
    onPointerEnter: () => setFocus(which),
    onPointerLeave: () => setFocus(null),
    onFocus: () => setFocus(which),
    onBlur: () => setFocus(null),
  });

  const renderObject = (
    sh: Shape,
    x: number,
    key: string,
    leaving: boolean,
  ) => {
    const k = s / 10;
    const y = base - sh.h * s;
    const sw = (n: number) => n / k;
    return (
      <g
        key={key}
        className={cx(
          styles.drawing,
          leaving ? styles.drawingOut : inView ? styles.drawingIn : styles.wait,
        )}
        transform={\`translate(\${x.toFixed(2)} \${y.toFixed(2)}) scale(\${k.toFixed(4)})\`}
      >
        <rect
          className={styles.construct}
          x={0}
          y={0}
          width={sh.w * 10}
          height={sh.h * 10}
          strokeWidth={sw(1)}
          strokeDasharray={\`\${sw(4)} \${sw(4)}\`}
        />
        <path
          className={styles.centerline}
          d={\`M\${sh.w * 5},\${-sw(10)} V\${sh.h * 10 + sw(10)}\`}
          strokeWidth={sw(1)}
          strokeDasharray={\`\${sw(14)} \${sw(4)} \${sw(2)} \${sw(4)}\`}
        />
        <path
          className={styles.hatch}
          d={sh.outline}
          fill={\`url(#\${hatchId})\`}
        />
        <path
          className={styles.outline}
          d={sh.outline}
          pathLength={1}
          strokeWidth={sw(1.75)}
        />
        {sh.details.map((d, i) => (
          <path
            key={i}
            className={styles.detail}
            d={d}
            pathLength={1}
            strokeWidth={sw(1)}
            style={{ "--i": i } as CSSProperties}
          />
        ))}
      </g>
    );
  };

  const exitShape = exiting ? list[exiting.index] : undefined;
  const exitSh = exitShape ? (SHAPES[exitShape.object] ?? SHAPES.hand) : null;
  const k = s / 10;
  const pTop = base - ph * s;
  const oTop = base - oh * s;

  return (
    <div
      ref={rootRef}
      className={cx(styles.root, wide && styles.wide)}
      role="group"
      aria-labelledby={titleId}
    >
      <div className={styles.stage}>
        <header className={styles.readout}>
          <h3 id={titleId} className={styles.name}>
            {productName}
          </h3>
          <p className={styles.dims} aria-label={productDims}>
            <span className={styles.dimsValue} aria-hidden="true">
              {fmt(cW)}
              <span className={styles.times}>×</span>
              {fmt(cH)}
            </span>
            <span className={styles.unit} aria-hidden="true">
              {unit}
            </span>
          </p>
          {current && shape && (
            <p key={\`\${current.object}-\${index}\`} className={styles.legend}>
              <ShapeIcon shape={shape} />
              <span className={styles.legendName}>{current.label}</span>
              <span className={styles.legendDims}>
                {\`\${fmt(oW)} × \${fmt(oH)} \${unit}\`}
              </span>
            </p>
          )}
        </header>

        <div ref={stageRef} className={styles.canvas} style={stageStyle}>
          <span className={styles.grid} aria-hidden="true" />
          <span className={styles.light} aria-hidden="true" />
          <span
            className={styles.floor}
            style={{ insetBlockStart: base }}
            aria-hidden="true"
          />
          <span className={styles.grain} aria-hidden="true" />

          <svg
            className={styles.plot}
            width={width}
            height={H}
            viewBox={\`0 0 \${width} \${H}\`}
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <pattern
                id={hatchId}
                patternUnits="userSpaceOnUse"
                width={6 / k}
                height={6 / k}
                patternTransform="rotate(45)"
              >
                <path
                  d={\`M0,0 V\${6 / k}\`}
                  className={styles.hatchLine}
                  strokeWidth={0.75 / k}
                />
              </pattern>
            </defs>

            <g
              className={cx(
                styles.ruler,
                inView ? styles.rulerIn : styles.wait,
              )}
            >
              <path
                className={styles.baseline}
                d={\`M\${rulerX0},\${base} H\${rulerX1}\`}
              />
              <path className={styles.ticks} d={ticks.join(" ")} />
              {labels.map((l, i) => (
                <text
                  key={l.n}
                  className={styles.rulerLabel}
                  x={l.x}
                  y={base + 27}
                  textAnchor={i === 0 ? "start" : "middle"}
                  dx={i === 0 ? -3 : 0}
                >
                  {i === labels.length - 1 ? \`\${l.n} \${unit}\` : l.n}
                </text>
              ))}
            </g>

            {exitSh &&
              exiting &&
              renderObject(
                exitSh,
                px + pw * s + gap,
                \`out-\${exiting.key}\`,
                true,
              )}
            {shape && renderObject(shape, ox, \`in-\${drawKey}\`, false)}

            {inView && (
              <g key={\`dims-\${drawKey}\`}>
                <Dimension
                  x1={px - 22}
                  y1={base}
                  x2={px - 22}
                  y2={pTop}
                  ext={20}
                  vertical
                  label={\`\${show(ph)} \${unit}\`}
                  dim={focus === "object"}
                  delay={drawKey ? 0 : 900}
                />
                <Dimension
                  x1={px}
                  y1={pTop - 22}
                  x2={px + pw * s}
                  y2={pTop - 22}
                  ext={20}
                  label={\`\${show(pw)} \${unit}\`}
                  dim={focus === "object"}
                  delay={drawKey ? 0 : 1000}
                />
                {shape && (
                  <>
                    <Dimension
                      x1={ox + ow * s + 22}
                      y1={base}
                      x2={ox + ow * s + 22}
                      y2={oTop}
                      ext={-20}
                      vertical
                      label={\`\${show(oh)} \${unit}\`}
                      dim={focus === "product"}
                      delay={drawKey ? 520 : 1250}
                    />
                    <Dimension
                      x1={ox}
                      y1={oTop - 22}
                      x2={ox + ow * s}
                      y2={oTop - 22}
                      ext={20}
                      label={\`\${show(ow)} \${unit}\`}
                      dim={focus === "product"}
                      delay={drawKey ? 600 : 1350}
                    />
                  </>
                )}
              </g>
            )}
          </svg>

          <div
            className={cx(
              styles.product,
              inView ? styles.productIn : styles.wait,
            )}
            style={{
              insetInlineStart: px,
              insetBlockStart: pTop,
              inlineSize: pw * s,
              blockSize: ph * s,
            }}
            tabIndex={0}
            role="img"
            aria-label={\`\${productName}, \${productDims}\`}
            {...focusProps("product")}
          >
            <span
              className={styles.ambient}
              style={{
                opacity: 1 - lift / 14,
                transform: \`scaleX(\${1 + lift / 30})\`,
              }}
              aria-hidden="true"
            />
            <span
              className={styles.contact}
              style={{
                opacity: 1 - lift / 7,
                transform: \`scaleX(\${1 - lift / 40})\`,
              }}
              aria-hidden="true"
            />
            {image ? (
              <>
                <img
                  className={styles.photo}
                  src={image}
                  alt=""
                  draggable={false}
                  style={{
                    filter: \`url(#\${matteId})\`,
                    transform: \`translateY(\${-lift}px)\`,
                  }}
                />
              </>
            ) : (
              <svg
                className={styles.blank}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <rect
                  x="0"
                  y="0"
                  width="100"
                  height="100"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d="M0,0 L100,100 M100,0 L0,100"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}
          </div>

          {shape && current && (
            <div
              className={styles.objectHit}
              style={{
                insetInlineStart: ox,
                insetBlockStart: oTop,
                inlineSize: ow * s,
                blockSize: oh * s,
              }}
              tabIndex={0}
              role="img"
              aria-label={\`\${current.label}, \${objectDims}\`}
              {...focusProps("object")}
            />
          )}

          <svg
            className={styles.matteDefs}
            aria-hidden="true"
            focusable="false"
          >
            <filter
              id={matteId}
              x="0"
              y="0"
              width="1"
              height="1"
              colorInterpolationFilters="sRGB"
            >
              <feColorMatrix
                type="matrix"
                values="1.04 0 0 0 0  0 1.04 0 0 0  0 0 1.04 0 0  -1.6 -5.4 -0.55 0 5.8"
                result="matte"
              />
              <feComposite in="matte" in2="SourceAlpha" operator="in" />
            </filter>
          </svg>
        </div>
      </div>

      {list.length > 0 && (
        <div className={styles.controls}>
          <p className={styles.compareLabel} id={compareId}>
            {compareLabel}
          </p>
          <div className={styles.segScroll}>
            <div
              className={styles.segmented}
              role="radiogroup"
              aria-labelledby={compareId}
            >
              {thumb && (
                <span
                  className={styles.thumb}
                  style={{
                    transform: \`translateX(\${thumb.x}px)\`,
                    inlineSize: thumb.w,
                  }}
                  aria-hidden="true"
                />
              )}
              {list.map((o, i) => (
                <button
                  key={\`\${o.object}-\${i}\`}
                  ref={(el) => {
                    segRefs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={i === index}
                  tabIndex={i === index ? 0 : -1}
                  className={cx(styles.seg, i === index && styles.segOn)}
                  onClick={() => select(i)}
                  onKeyDown={(e) => onSegKey(e, i)}
                >
                  <ShapeIcon shape={SHAPES[o.object] ?? SHAPES.hand} />
                  <span className={styles.segLabel}>{o.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.scaleBar} aria-hidden="true">
            <span
              className={styles.scaleTrack}
              style={{ inlineSize: scaleBarW }}
            >
              {Array.from({ length: scaleBarUnits }, (_, i) => (
                <span
                  key={i}
                  className={i % 2 ? styles.scaleCellLight : styles.scaleCell}
                />
              ))}
            </span>
            <span
              className={styles.scaleText}
            >{\`\${scaleBarUnits} \${unit}\`}</span>
          </div>
        </div>
      )}

      <p className={styles.srOnly} aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
\`\`\`

\`\`\`css
.root {
  --sao-ground: #eef1f4;
  --sao-ground-deep: #e2e7ec;
  --sao-surface: #ffffff;
  --sao-grid: rgba(54, 78, 110, 0.09);
  --sao-grid-major: rgba(54, 78, 110, 0.17);
  --sao-ink: #111a26;
  --sao-muted: #536173;
  --sao-line: #2a3a50;
  --sao-hairline: rgba(17, 26, 38, 0.12);
  --sao-accent: #f0521c;
  --sao-accent-ink: #c43c0c;
  --sao-font-display: 'Inter Tight', 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --sao-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --sao-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.2  0 0 0 0 0.26  0 0 0 0 0.34  0 0 0 .9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --sao-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --sao-spring: cubic-bezier(0.34, 1.4, 0.5, 1);

  position: relative;
  isolation: isolate;
  overflow: clip;
  box-sizing: border-box;
  inline-size: 100%;
  container-type: inline-size;
  border-radius: 28px;
  background: var(--sao-ground);
  color: var(--sao-ink);
  font-family: var(--sao-font-ui);
  box-shadow:
    inset 0 0 0 1px var(--sao-hairline),
    0 1px 2px rgba(17, 26, 38, 0.05),
    0 30px 60px -40px rgba(17, 26, 38, 0.35);
}

.root ::selection {
  background: color-mix(in srgb, var(--sao-accent) 26%, transparent);
  color: var(--sao-ink);
}

.stage {
  position: relative;
  min-inline-size: 0;
}

.canvas {
  position: relative;
  isolation: isolate;
  overflow: clip;
  min-inline-size: 0;
}

.grid,
.light,
.grain {
  position: absolute;
  inset: 0;
  z-index: -2;
  pointer-events: none;
}

.grid {
  background-image:
    linear-gradient(to right, var(--sao-grid-major) 1px, transparent 1px),
    linear-gradient(to bottom, var(--sao-grid-major) 1px, transparent 1px),
    linear-gradient(to right, rgba(54, 78, 110, calc(0.075 * var(--sao-minor-a))) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(54, 78, 110, calc(0.075 * var(--sao-minor-a))) 1px, transparent 1px);
  background-size:
    var(--sao-major) var(--sao-major),
    var(--sao-major) var(--sao-major),
    var(--sao-cell) var(--sao-cell),
    var(--sao-cell) var(--sao-cell);
  background-position: var(--sao-ox) var(--sao-oy);
  mask-image: radial-gradient(120% 100% at 62% 70%, #000 45%, transparent 100%);
}

.light {
  background:
    radial-gradient(55% 70% at 66% 38%, rgba(255, 255, 255, 0.85) 0%, transparent 70%),
    radial-gradient(50% 60% at 0% 0%, rgba(255, 255, 255, 0.5) 0%, transparent 70%);
}

.grain {
  background-image: var(--sao-noise);
  opacity: 0.07;
  mix-blend-mode: multiply;
}

.floor {
  position: absolute;
  z-index: -1;
  inset-inline: 0;
  inset-block-end: 0;
  background: linear-gradient(to bottom, rgba(42, 58, 80, 0.07), rgba(42, 58, 80, 0.015) 70%);
  pointer-events: none;
}

.readout {
  position: relative;
  z-index: 2;
  display: grid;
  gap: 10px;
  padding: 24px 20px 0;
  min-inline-size: 0;
}

.name {
  margin: 0;
  font-family: var(--sao-font-display);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
  text-wrap: balance;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dims {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0;
}

.dimsValue {
  font-family: var(--sao-font-display);
  font-size: clamp(48px, 14cqi, 64px);
  font-weight: 500;
  line-height: 0.92;
  letter-spacing: -0.045em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.times {
  margin-inline: 0.1em;
  font-weight: 300;
  color: var(--sao-accent);
}

.unit {
  font-size: 18px;
  font-weight: 500;
  color: var(--sao-muted);
}

.legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin: 4px 0 0;
  font-size: 15px;
  line-height: 1.35;
  color: var(--sao-line);
  animation: legendIn 520ms var(--sao-ease) backwards;
}

.legend .segIcon {
  inline-size: 22px;
  block-size: 22px;
  color: var(--sao-line);
}

.legendName {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.legendDims {
  color: var(--sao-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.plot {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  overflow: visible;
  pointer-events: none;
  font-family: var(--sao-font-ui);
}

.ruler {
  transition: opacity 300ms ease-out;
}

.rulerIn {
  animation: wipe 900ms var(--sao-ease) backwards;
}

.baseline {
  fill: none;
  stroke: var(--sao-line);
  stroke-width: 1.25;
}

.ticks {
  fill: none;
  stroke: var(--sao-line);
  stroke-width: 1;
  opacity: 0.7;
}

.rulerLabel {
  fill: var(--sao-muted);
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.drawing {
  transform-box: view-box;
}

.construct {
  fill: none;
  stroke: var(--sao-line);
  opacity: 0.22;
}

.centerline {
  fill: none;
  stroke: var(--sao-accent);
  opacity: 0.55;
}

.hatch {
  stroke: none;
}

.hatchLine {
  stroke: var(--sao-line);
  opacity: 0.2;
}

.outline,
.detail {
  fill: none;
  stroke: var(--sao-line);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 0;
}

.detail {
  opacity: 0.72;
}

.drawingIn .construct {
  animation: constructIn 1400ms var(--sao-ease) backwards;
}

.drawingIn .centerline {
  animation: fadeIn 500ms ease-out 120ms backwards;
}

.drawingIn .outline {
  animation: draw 950ms var(--sao-ease) 260ms backwards;
}

.drawingIn .detail {
  animation: draw 700ms var(--sao-ease) backwards;
  animation-delay: calc(620ms + var(--i) * 55ms);
}

.drawingIn .hatch {
  animation: fadeIn 600ms ease-out 900ms backwards;
}

.drawingOut {
  animation: drawOut 300ms ease-in forwards;
}

.dimension {
  transition: opacity 220ms ease-out;
}

.dimensionDim {
  opacity: 0.25;
}

.dimExt {
  fill: none;
  stroke: var(--sao-accent);
  stroke-width: 0.75;
  opacity: 0.8;
  animation: fadeIn 400ms ease-out var(--d) backwards;
}

.dimGrow {
  transform-box: view-box;
  animation: grow 620ms var(--sao-ease) var(--d) backwards;
}

.dimLine {
  fill: none;
  stroke: var(--sao-accent);
  stroke-width: 1;
}

.dimTick {
  fill: none;
  stroke: var(--sao-accent);
  stroke-width: 1.5;
  stroke-linecap: round;
}

.dimLabel {
  fill: var(--sao-accent-ink);
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  paint-order: stroke;
  stroke: var(--sao-ground);
  stroke-width: 8px;
  stroke-linejoin: round;
  animation: fadeIn 360ms ease-out calc(var(--d) + 260ms) backwards;
}

.product,
.objectHit {
  position: absolute;
  z-index: 1;
  border-radius: 4px;
  outline: none;
}

.product:focus-visible,
.objectHit:focus-visible {
  box-shadow: 0 0 0 3px var(--sao-ground), 0 0 0 5px var(--sao-accent);
}

.productIn {
  animation: drop 900ms var(--sao-spring) 300ms backwards;
}

.photo {
  position: absolute;
  inset: 0;
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  user-select: none;
}


.contact,
.ambient {
  position: absolute;
  inset-block-end: 0;
  border-radius: 50%;
  pointer-events: none;
}

.contact {
  inset-inline: 4%;
  block-size: 10px;
  margin-block-end: -5px;
  background: radial-gradient(closest-side, rgba(10, 18, 30, 0.7), rgba(10, 18, 30, 0.2) 60%, transparent);
  filter: blur(1.5px);
}

.ambient {
  inset-inline: -22%;
  block-size: 40px;
  margin-block-end: -20px;
  background: radial-gradient(closest-side, rgba(24, 36, 54, 0.3), transparent);
  filter: blur(8px);
}

.productIn .contact,
.productIn .ambient {
  animation: shadowIn 900ms var(--sao-ease) 300ms backwards;
}

.blank {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  fill: rgba(255, 255, 255, 0.7);
  stroke: var(--sao-line);
  stroke-width: 1.25;
}

.blank path {
  fill: none;
  stroke-width: 0.75;
  opacity: 0.5;
}

.wait {
  opacity: 0;
}

.matteDefs {
  position: absolute;
  inline-size: 0;
  block-size: 0;
  overflow: hidden;
}

.controls {
  display: grid;
  gap: 10px;
  padding: 16px 20px 22px;
  min-inline-size: 0;
}

.compareLabel {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--sao-muted);
}

.segScroll {
  min-inline-size: 0;
  mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent);
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--sao-hairline) transparent;
  padding: 2px;
  margin: -2px;
}

.segmented {
  position: relative;
  display: inline-flex;
  gap: 2px;
  padding: 4px;
  border-radius: 14px;
  background: var(--sao-ground-deep);
  box-shadow: inset 0 0 0 1px rgba(17, 26, 38, 0.06);
}

.thumb {
  position: absolute;
  inset-block: 4px;
  inset-inline-start: 0;
  border-radius: 10px;
  background: var(--sao-surface);
  box-shadow:
    0 0 0 1px rgba(17, 26, 38, 0.06),
    0 1px 2px rgba(17, 26, 38, 0.08),
    0 4px 12px -4px rgba(17, 26, 38, 0.16);
  transition:
    transform 420ms var(--sao-spring),
    inline-size 420ms var(--sao-spring);
}

.seg {
  position: relative;
  z-index: 1;
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-block-size: 40px;
  padding-block: 6px;
  padding-inline: 12px 14px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--sao-muted);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.2;
  text-align: start;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    color 200ms ease-out,
    transform 160ms var(--sao-ease);
}

.seg:hover {
  color: var(--sao-ink);
}

.seg:active {
  transform: scale(0.97);
}

.seg:focus-visible {
  outline: 2px solid var(--sao-accent);
  outline-offset: 1px;
}

.segOn {
  color: var(--sao-ink);
}

.segIcon {
  flex: none;
  inline-size: 18px;
  block-size: 18px;
  overflow: visible;
}

.iconStroke,
.iconDetail {
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.iconStroke {
  stroke-width: 1.4;
}

.iconDetail {
  stroke-width: 1;
  opacity: 0.6;
}

.segLabel {
  max-inline-size: 13ch;
  overflow-wrap: anywhere;
}

.scaleBar {
  display: none;
  align-items: center;
  gap: 10px;
  color: var(--sao-muted);
}

.scaleTrack {
  display: flex;
  block-size: 6px;
  box-shadow: 0 0 0 1px var(--sao-line);
}

.scaleCell,
.scaleCellLight {
  flex: 1;
}

.scaleCell {
  background: var(--sao-line);
}

.scaleCellLight {
  background: var(--sao-surface);
}

.scaleText {
  font-size: 13px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
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

.wide .readout {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  max-inline-size: calc(44% - 72px);
  gap: 14px;
  padding: 40px 0 0 40px;
}

.wide .name {
  font-size: 20px;
}

.wide .dimsValue {
  font-size: clamp(56px, 8.2cqi, 96px);
}

.wide .unit {
  font-size: 22px;
}

.wide .controls {
  grid-template-columns: auto minmax(0, auto) 1fr auto;
  align-items: center;
  column-gap: 16px;
  padding: 4px 40px 32px;
}

.wide .segScroll {
  mask-image: none;
}

.wide .compareLabel {
  max-inline-size: 18ch;
}

.wide .scaleBar {
  display: flex;
  grid-column: 4;
}

@keyframes wipe {
  from {
    clip-path: inset(0 100% 0 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}

@keyframes drop {
  from {
    opacity: 0;
    transform: translateY(-28px);
  }
  40% {
    opacity: 1;
  }
}

@keyframes shadowIn {
  from {
    opacity: 0;
    transform: scaleX(0.5);
  }
}

@keyframes constructIn {
  from {
    opacity: 0;
  }
  25% {
    opacity: 0.5;
  }
}

@keyframes draw {
  from {
    stroke-dashoffset: 1;
  }
}

@keyframes drawOut {
  to {
    opacity: 0;
  }
}

@keyframes grow {
  from {
    transform: scale(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
}

@keyframes legendIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .wait {
    opacity: 1;
  }

  .rulerIn,
  .productIn,
  .productIn .contact,
  .productIn .ambient,
  .drawingIn .construct,
  .drawingIn .centerline,
  .drawingIn .outline,
  .drawingIn .detail,
  .drawingIn .hatch,
  .dimExt,
  .dimGrow,
  .dimLabel,
  .legend {
    animation: none;
  }

  .drawingOut {
    animation: none;
    opacity: 0;
  }

  .thumb,
  .seg,
  .dimension {
    transition: none;
  }
}
\`\`\`
`;export{n as default};
