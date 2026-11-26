import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface GoalJarFillProps {
  amount?: number;
  goal?: number;
  label?: string;
  currencySymbol?: string;
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
  return symbol.length > 1 ? `${symbol} ${digits}` : `${symbol}${digits}`;
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
const linePath = (ys: Float32Array) => ys.reduce((d, y, i) => `${d}${i ? 'L' : 'M'}${colX(i)},${y.toFixed(2)}`, '');
const fillPath = (ys: Float32Array) => `${linePath(ys).replace('M', `M0,${SURFACE_H}L`)}L100,${SURFACE_H}Z`;
const clipPolygon = (ys: Float32Array) => {
  const pts = Array.from(ys, (y, i) => `${colX(i)}% calc((1 - var(--gj-fill)) * 100% + ${(y - SURFACE_H).toFixed(2)}px)`);
  return `polygon(${pts.join(',')},100% 100%,0% 100%)`;
};

export default function GoalJarFill({
  amount = 12480,
  goal = 20000,
  label = 'Orchard replanting fund',
  currencySymbol = '$',
  reachedText = 'Goal reached',
  className,
}: GoalJarFillProps) {
  const uid = useId();
  const ratio = goal > 0 ? Math.max(0, amount) / goal : 0;
  const percent = Math.round(ratio * 100);
  const reached = ratio >= 1;
  const amountText = money(currencySymbol, amount);
  const goalText = money(currencySymbol, goal);
  const summary = `${label}: ${amountText} of ${goalText}, ${percent}%${reached ? `. ${reachedText}` : ''}`;

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
  const rootStyle = { '--gj-len': digits } as CSSProperties;
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
        aria-describedby={`${uid}-help`}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
      >
        <span id={`${uid}-help`} className={styles.srOnly}>
          {HELP}
        </span>
        <div className={styles.layer} aria-hidden="true">
          {numeral}
        </div>
        <div className={styles.liquid} aria-hidden="true">
          <svg className={styles.surface} viewBox={`0 0 100 ${SURFACE_H}`} preserveAspectRatio="none">
            <path ref={backRef} className={styles.surfaceBack} />
            <path ref={frontRef} className={styles.surfaceFront} />
            <path ref={edgeRef} className={styles.surfaceEdge} />
          </svg>
          <div className={styles.body}>
            {BUBBLES.map((b, i) => (
              <span
                key={i}
                className={styles.bubble}
                style={{ '--x': `${b.x}%`, '--s': `${b.size}px`, '--dur': `${b.dur}s`, '--delay': `-${b.delay}s` } as CSSProperties}
              />
            ))}
          </div>
        </div>
        <div ref={creamRef} className={`${styles.layer} ${styles.layerIn}`} aria-hidden="true">
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
