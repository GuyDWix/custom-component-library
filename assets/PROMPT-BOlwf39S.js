const n=`Create a custom element called "Goal Jar Fill". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: amount reached, goal amount, label, currency symbol, liquid color, goal-reached text. Add other settings if they help.

\`\`\`tsx
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface GoalJarFillProps {
  amount?: number;
  goal?: number;
  label?: string;
  currencySymbol?: string;
  liquidColor?: string;
  reachedText?: string;
  className?: string;
}

const COLUMNS = 28;
const SPRING = 0.04;
const DAMP = 0.03;
const SPREAD = 0.25;
const MAX_DISP = 6;
const BASELINE = 14;
const SURFACE_H = 24;
const BUBBLES = [
  { x: 14, size: 7, dur: 11, delay: 0 },
  { x: 31, size: 4, dur: 8, delay: 3 },
  { x: 48, size: 9, dur: 13, delay: 6 },
  { x: 63, size: 5, dur: 9, delay: 1.5 },
  { x: 78, size: 8, dur: 12, delay: 4.5 },
  { x: 90, size: 4, dur: 10, delay: 8 },
];
const HELP = 'Hover, tap or press Enter to stir the liquid.';

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const money = (symbol: string, n: number) => {
  const digits = Math.round(Math.max(0, n)).toLocaleString('en-US');
  return symbol.length > 1 ? \`\${symbol} \${digits}\` : \`\${symbol}\${digits}\`;
};

const surfaceYs = (disp: Float32Array, now: number, phase: number, idle: number) => {
  const ys = new Float32Array(COLUMNS);
  for (let i = 0; i < COLUMNS; i++) {
    const swell = Math.sin(now / 900 + i * 0.45 + phase) + Math.sin(now / 1500 - i * 0.8 + phase * 1.7) * 0.5;
    ys[i] = BASELINE - disp[i] - swell * idle;
  }
  return ys;
};
const colX = (i: number) => ((i / (COLUMNS - 1)) * 100).toFixed(2);
const linePath = (ys: Float32Array) => ys.reduce((d, y, i) => \`\${d}\${i ? 'L' : 'M'}\${colX(i)},\${y.toFixed(2)}\`, '');
const fillPath = (ys: Float32Array) => \`\${linePath(ys).replace('M', \`M0,\${SURFACE_H}L\`)}L100,\${SURFACE_H}Z\`;
const clipPolygon = (ys: Float32Array) => {
  const pts = Array.from(ys, (y, i) => \`\${colX(i)}% calc((1 - var(--gj-fill)) * 100% + \${(y - SURFACE_H).toFixed(2)}px)\`);
  return \`polygon(\${pts.join(',')},100% 100%,0% 100%)\`;
};

export default function GoalJarFill({
  amount = 12480,
  goal = 20000,
  label = 'Orchard replanting fund',
  currencySymbol = '$',
  liquidColor = '#1a86a8',
  reachedText = 'Goal reached',
  className,
}: GoalJarFillProps) {
  const uid = useId();
  const ratio = goal > 0 ? Math.max(0, amount) / goal : 0;
  const percent = Math.round(ratio * 100);
  const reached = ratio >= 1;
  const amountText = money(currencySymbol, amount);
  const goalText = money(currencySymbol, goal);
  const summary = \`\${label}: \${amountText} of \${goalText}, \${percent}%\${reached ? \`. \${reachedText}\` : ''}\`;

  const rootRef = useRef<HTMLDivElement>(null);
  const wellRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<SVGPathElement>(null);
  const backRef = useRef<SVGPathElement>(null);
  const edgeRef = useRef<SVGPathElement>(null);
  const creamRef = useRef<HTMLDivElement>(null);
  const prevRatio = useRef(ratio);
  const target = useRef({ ratio, amount });
  target.current = { ratio, amount };
  const wave = useRef({ h: new Float32Array(COLUMNS), v: new Float32Array(COLUMNS), lastX: -1 });
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [shown, setShown] = useState({ percent: 0, amount: 0 });

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
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.1 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const front = frontRef.current;
    const back = backRef.current;
    const edge = edgeRef.current;
    const cream = creamRef.current;
    if (!root || !front || !back || !edge || !cream) return;
    const { h, v } = wave.current;
    let cur = reduced ? target.current.ratio : 0;
    let curAmount = reduced ? target.current.amount : 0;
    let last = performance.now();
    let raf = 0;

    const draw = (now: number) => {
      const idle = reduced ? 0.9 : 1.6 * Math.min(1, cur * 4);
      const ys = surfaceYs(h, now, 0, idle);
      front.setAttribute('d', fillPath(ys));
      edge.setAttribute('d', linePath(ys));
      back.setAttribute('d', fillPath(surfaceYs(h, now, 2.2, idle * 1.35)));
      cream.style.clipPath = clipPolygon(ys);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = target.current;
      const k = reduced ? 1 : 1 - Math.exp(-dt * 2.6);
      cur += (t.ratio - cur) * k;
      curAmount += (t.amount - curAmount) * k;
      if (Math.abs(t.ratio - cur) < 0.0005) cur = t.ratio;
      if (Math.abs(t.amount - curAmount) < 0.5) curAmount = t.amount;
      root.style.setProperty('--gj-fill', clamp(cur).toFixed(4));
      const nextPercent = Math.round(cur * 100);
      const nextAmount = Math.round(curAmount);
      setShown((s) => (s.percent === nextPercent && s.amount === nextAmount ? s : { percent: nextPercent, amount: nextAmount }));

      const step = dt * 60;
      for (let n = 0; n < COLUMNS; n++) {
        const left = h[Math.max(0, n - 1)];
        const right = h[Math.min(COLUMNS - 1, n + 1)];
        v[n] += (-SPRING * h[n] - DAMP * v[n] + SPREAD * (left + right - 2 * h[n])) * step;
      }
      for (let n = 0; n < COLUMNS; n++) h[n] = clamp(h[n] + v[n] * step, -MAX_DISP, MAX_DISP);
      draw(now);
      raf = requestAnimationFrame(tick);
    };

    if (reduced || !inView) {
      root.style.setProperty('--gj-fill', clamp(reduced ? target.current.ratio : cur).toFixed(4));
      h.fill(0);
      v.fill(0);
      draw(0);
      if (reduced) setShown({ percent: Math.round(target.current.ratio * 100), amount: Math.round(target.current.amount) });
      return;
    }
    v.forEach((_, n) => (v[n] += Math.sin((n / (COLUMNS - 1)) * Math.PI * 2) * 2.5));
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced]);

  useEffect(() => {
    const change = ratio - prevRatio.current;
    prevRatio.current = ratio;
    if (reduced || !change) return;
    const kick = clamp(Math.abs(change) * 14, 1, 4);
    wave.current.v.forEach((_, n) => (wave.current.v[n] += Math.sin((n / (COLUMNS - 1)) * Math.PI * 2) * kick));
  }, [ratio, reduced]);

  const nudge = (index: number, impulse: number) => {
    const { v } = wave.current;
    for (let d = -2; d <= 2; d++) {
      const n = index + d;
      if (n >= 0 && n < COLUMNS) v[n] += impulse * (1 - Math.abs(d) * 0.3);
    }
  };
  const columnAt = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.round(clamp((e.clientX - rect.left) / rect.width) * (COLUMNS - 1));
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    const w = wave.current;
    if (w.lastX >= 0) nudge(columnAt(e), -Math.min(3, Math.abs(e.clientX - w.lastX) * 0.1));
    w.lastX = e.clientX;
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => !reduced && nudge(columnAt(e), -5);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || reduced) return;
    wave.current.v.forEach((_, n) => (wave.current.v[n] += Math.sin(n * 0.5) * 4));
  };

  const digits = String(reduced ? percent : shown.percent).length;
  const rootStyle = { '--gj-liquid': liquidColor, '--gj-len': digits } as CSSProperties;
  const shownPercent = reduced ? percent : shown.percent;
  const shownAmount = reduced ? amountText : money(currencySymbol, shown.amount);
  const numeral = (
    <span className={styles.numeral}>
      {shownPercent}
      <span className={styles.sign}>%</span>
    </span>
  );

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <div
        ref={wellRef}
        className={styles.well}
        role="img"
        tabIndex={0}
        aria-label={summary}
        aria-describedby={\`\${uid}-help\`}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
      >
        <span id={\`\${uid}-help\`} className={styles.srOnly}>
          {HELP}
        </span>
        <div className={styles.layer} aria-hidden="true">
          {numeral}
        </div>
        <div className={styles.liquid} aria-hidden="true">
          <svg className={styles.surface} viewBox={\`0 0 100 \${SURFACE_H}\`} preserveAspectRatio="none">
            <path ref={backRef} className={styles.surfaceBack} />
            <path ref={frontRef} className={styles.surfaceFront} />
            <path ref={edgeRef} className={styles.surfaceEdge} />
          </svg>
          <div className={styles.body}>
            {BUBBLES.map((b, i) => (
              <span
                key={i}
                className={styles.bubble}
                style={{ '--x': \`\${b.x}%\`, '--s': \`\${b.size}px\`, '--dur': \`\${b.dur}s\`, '--delay': \`-\${b.delay}s\` } as CSSProperties}
              />
            ))}
          </div>
        </div>
        <div ref={creamRef} className={\`\${styles.layer} \${styles.layerIn}\`} aria-hidden="true">
          {numeral}
        </div>
        <span className={styles.gloss} aria-hidden="true" />
        {reached && (
          <span className={styles.reached} aria-hidden="true">
            {reachedText}
          </span>
        )}
      </div>
      <div className={styles.foot} aria-hidden="true">
        <p className={styles.label}>{label}</p>
        <p className={styles.figures}>
          <span className={styles.amount}>{shownAmount}</span>
          <span className={styles.goal}>of {goalText}</span>
        </p>
      </div>
    </div>
  );
}
\`\`\`

\`\`\`css
@font-face {
  font-family: 'Schibsted Grotesk';
  src: url('./fonts/schibsted-500.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Schibsted Grotesk';
  src: url('./fonts/schibsted-700.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

/* Soft-UI liquid tablet: pressed well, tinted liquid with two wave layers, numeral inverts along the wave. */
.root {
  --gj-liquid: #1a86a8;
  --gj-ground: #e6ebee;
  --gj-ink: #1c2a33;
  --gj-ink-soft: #4a5a64;
  --gj-cream: #f6fbfd;
  --gj-hi: rgba(255, 255, 255, 0.9);
  --gj-lo: rgba(70, 92, 110, 0.3);
  --gj-deep: #061822;
  --gj-top: color-mix(in srgb, var(--gj-liquid) 82%, var(--gj-deep));
  --gj-bottom: color-mix(in srgb, var(--gj-liquid) 52%, var(--gj-deep));
  --gj-font: 'Schibsted Grotesk', 'Avenir Next', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --gj-fill: 0;
  --gj-len: 2;

  box-sizing: border-box;
  inline-size: 100%;
  padding: clamp(18px, 4cqi, 40px);
  container-type: inline-size;
  background: var(--gj-ground);
  color: var(--gj-ink);
  font-family: var(--gj-font);
}

.root *,
.root *::before,
.root *::after {
  box-sizing: border-box;
}

.well {
  position: relative;
  container-type: size;
  inline-size: 100%;
  aspect-ratio: 4 / 5;
  max-inline-size: 1000px;
  margin-inline: auto;
  overflow: hidden;
  border-radius: 36px;
  background: var(--gj-ground);
  box-shadow: inset 10px 12px 26px var(--gj-lo), inset -10px -10px 22px var(--gj-hi);
  cursor: crosshair;
  touch-action: pan-y;
}

@container (min-width: 620px) {
  .well {
    aspect-ratio: 16 / 9;
  }
}

.well:focus-visible {
  outline: 3px solid var(--gj-ink);
  outline-offset: 5px;
}

.layer {
  position: absolute;
  inset-block-end: 0;
  inset-inline-start: 0;
  display: grid;
  place-items: center;
  inline-size: 100cqw;
  block-size: 100cqh;
  pointer-events: none;
}

.layerIn {
  color: var(--gj-cream);
}

.numeral {
  font-size: min(calc(100cqw / (var(--gj-len) * 0.6 + 0.8)), 78cqh);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sign {
  font-size: 0.5em;
  font-weight: 500;
  letter-spacing: 0;
  vertical-align: 0.55em;
  margin-inline-start: 0.04em;
}

.liquid {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  block-size: calc(var(--gj-fill) * 100%);
  pointer-events: none;
}

.surface {
  position: absolute;
  inset-inline: 0;
  inset-block-end: calc(100% - 1px);
  inline-size: 100%;
  block-size: 24px;
  display: block;
}

.surfaceFront {
  fill: var(--gj-top);
}

.surfaceBack {
  fill: color-mix(in srgb, var(--gj-liquid) 60%, #fff);
  opacity: 0.6;
}

.surfaceEdge {
  fill: none;
  stroke: rgba(255, 255, 255, 0.55);
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
  stroke-linejoin: round;
}

.body {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background:
    radial-gradient(120% 60% at 20% 0%, color-mix(in srgb, var(--gj-liquid) 60%, #fff 40%) 0%, transparent 60%),
    radial-gradient(90% 60% at 90% 110%, rgba(0, 10, 18, 0.4), transparent 70%),
    linear-gradient(180deg, var(--gj-top), var(--gj-bottom));
  box-shadow: inset 0 -16px 28px rgba(0, 10, 18, 0.25);
}

.bubble {
  position: absolute;
  inset-inline-start: var(--x);
  inset-block-end: -10%;
  inline-size: var(--s);
  block-size: var(--s);
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.12) 65%);
  opacity: 0;
  animation: gj-rise var(--dur) linear var(--delay) infinite;
}

@keyframes gj-rise {
  0% {
    inset-block-end: -10%;
    opacity: 0;
  }
  15% {
    opacity: 0.8;
  }
  85% {
    opacity: 0.6;
  }
  100% {
    inset-block-end: 96%;
    opacity: 0;
  }
}

.gloss {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background: linear-gradient(115deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 32%);
  mix-blend-mode: soft-light;
}

.reached {
  position: absolute;
  inset-block-start: 16px;
  inset-inline-end: 16px;
  max-inline-size: calc(100% - 32px);
  padding: 10px 18px;
  border-radius: 999px;
  background: var(--gj-cream);
  color: var(--gj-ink);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
  box-shadow: 4px 5px 12px rgba(0, 0, 0, 0.25), -3px -3px 8px rgba(255, 255, 255, 0.3);
  animation: gj-pop 520ms cubic-bezier(0.3, 1.5, 0.5, 1) both;
}

@keyframes gj-pop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
}

.foot {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px 24px;
  max-inline-size: 1000px;
  margin: clamp(16px, 3cqi, 28px) auto 0;
  padding-inline: 6px;
}

.label {
  flex: 1 1 14rem;
  min-inline-size: 0;
  margin: 0;
  font-size: clamp(1rem, 2.6cqi, 1.25rem);
  font-weight: 500;
  line-height: 1.3;
  color: var(--gj-ink-soft);
  overflow-wrap: anywhere;
}

.figures {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  margin: 0;
  min-inline-size: 0;
}

.amount {
  font-size: clamp(1.75rem, 5cqi, 2.75rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.goal {
  font-size: 1rem;
  font-weight: 500;
  color: var(--gj-ink-soft);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.srOnly {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .reached {
    animation: none;
  }

  .bubble {
    display: none;
  }
}
\`\`\`
`;export{n as default};
