const e=`import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import styles from './Component.module.css';

export type MarkStyle = 'highlight' | 'underline' | 'circle';

export interface MarkedWord {
  phrase: string;
}

export interface MarkerHighlightHeadlineProps {
  headline?: string;
  markedWords?: MarkedWord[];
  markStyle?: MarkStyle;
  markerColor?: string;
  kicker?: string;
  className?: string;
}

export const defaultMarkedWords: MarkedWord[] = [{ phrase: 'honest' }, { phrase: 'quietly unforgettable' }];

type Segment = { text: string; mark: number };
type Stroke = { d: string; width: number; delay: number; duration: number; pass: number };

const STAGGER = 0.2;
const START = 0.15;

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function split(headline: string, words: MarkedWord[]): Segment[] {
  const lower = headline.toLowerCase();
  const ranges: { start: number; end: number }[] = [];
  for (const { phrase } of words) {
    const p = phrase.trim().toLowerCase();
    if (!p) continue;
    let from = 0;
    while (from <= lower.length) {
      const start = lower.indexOf(p, from);
      if (start < 0) break;
      const end = start + p.length;
      if (!ranges.some((r) => start < r.end && end > r.start)) {
        ranges.push({ start, end });
        break;
      }
      from = start + 1;
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let cursor = 0;
  ranges.forEach((r, i) => {
    if (r.start > cursor) out.push({ text: headline.slice(cursor, r.start), mark: -1 });
    out.push({ text: headline.slice(r.start, r.end), mark: i });
    cursor = r.end;
  });
  if (cursor < headline.length) out.push({ text: headline.slice(cursor), mark: -1 });
  return out;
}

function seeded(seed: number) {
  let s = seed * 2654435761;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => n.toFixed(1);

function highlightPasses(x: number, y: number, w: number, h: number, rnd: () => number) {
  const left = x - h * 0.08;
  const right = x + w + h * 0.1;
  const mid = y + h * 0.6;
  const tilt = (rnd() - 0.5) * h * 0.08;
  const sag = (rnd() - 0.4) * h * 0.06;
  const pass = (dy: number, inset: number) =>
    \`M\${f(left + inset)} \${f(mid + dy + tilt)} Q\${f((left + right) / 2)} \${f(mid + dy + sag)} \${f(right - inset * 0.6)} \${f(mid + dy - tilt)}\`;
  return [
    { d: pass(-h * 0.08, 0), width: h * 0.5 },
    { d: pass(h * 0.12, h * 0.12 * rnd()), width: h * 0.26 },
  ];
}

function underlinePath(x: number, y: number, w: number, h: number, rnd: () => number) {
  const base = y + h * 0.94;
  const start = x - h * 0.04;
  const end = x + w + h * 0.08;
  const lift = h * (0.04 + rnd() * 0.05);
  return \`M\${f(start)} \${f(base + lift * 0.4)} C\${f(start + w * 0.3)} \${f(base - lift)} \${f(start + w * 0.7)} \${f(base + lift)} \${f(end)} \${f(base - lift * 0.6)}\`;
}

function circlePath(x: number, y: number, w: number, h: number, rnd: () => number) {
  const cx = x + w / 2;
  const cy = y + h * 0.56;
  const rx = w / 2 + h * 0.22;
  const ry = h * 0.56;
  const tilt = (rnd() - 0.5) * 0.06;
  const start = Math.PI * (0.92 + rnd() * 0.1);
  const turn = Math.PI * 2 * 1.08;
  const steps = 28;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = start + turn * t;
    const grow = 1 + (t - 0.5) * 0.1 + Math.sin(t * 9 + rnd()) * 0.012;
    const px = Math.cos(a) * rx * grow;
    const py = Math.sin(a) * ry * grow;
    pts.push([cx + px - py * tilt, cy + py + px * tilt]);
  }
  let d = \`M\${f(pts[0][0])} \${f(pts[0][1])}\`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [mx, my] = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    d += \` Q\${f(pts[i][0])} \${f(pts[i][1])} \${f(mx)} \${f(my)}\`;
  }
  return d;
}

export default function MarkerHighlightHeadline({
  headline = 'Good work is honest, useful and quietly unforgettable.',
  markedWords = defaultMarkedWords,
  markStyle = 'highlight',
  markerColor = '#c9f23a',
  kicker = 'Studio notes · No. 12',
  className,
}: MarkerHighlightHeadlineProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const brushId = \`mh-brush-\${uid}\`;
  const stageRef = useRef<HTMLDivElement>(null);
  const markRefs = useRef<(HTMLElement | null)[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [drawn, setDrawn] = useState(false);

  const segments = useMemo(() => split(headline, markedWords), [headline, markedWords]);

  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const origin = stage.getBoundingClientRect();
    const next: Stroke[] = [];
    let order = 0;
    markRefs.current.forEach((el, mark) => {
      if (!el) return;
      Array.from(el.getClientRects())
        .filter((r) => r.width > 2)
        .forEach((r, line) => {
          const x = r.left - origin.left;
          const y = r.top - origin.top;
          const rnd = seeded(mark * 31 + line * 7 + 1);
          const delay = START + order * STAGGER;
          const duration = Math.min(1.1, 0.5 + r.width / 900);
          order++;
          if (markStyle === 'underline') {
            next.push({ d: underlinePath(x, y, r.width, r.height, rnd), width: r.height * 0.075, delay, duration, pass: 0 });
          } else if (markStyle === 'circle') {
            next.push({ d: circlePath(x, y, r.width, r.height, rnd), width: r.height * 0.06, delay, duration: duration + 0.25, pass: 0 });
          } else {
            highlightPasses(x, y, r.width, r.height, rnd).forEach((p, pass) =>
              next.push({ ...p, delay: delay + pass * duration * 0.45, duration, pass }),
            );
          }
        });
    });
    setBox({ w: origin.width, h: origin.height });
    setStrokes(next);
  }, [markStyle]);

  useIsoLayoutEffect(() => {
    markRefs.current.length = segments.length;
    measure();
  }, [segments, measure]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(stage);
    document.fonts?.ready.then(measure).catch(() => undefined);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || drawn) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDrawn(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setDrawn(true);
        io.disconnect();
      },
      { threshold: 0.45 },
    );
    io.observe(stage);
    return () => io.disconnect();
  }, [drawn]);

  const rootStyle = { '--mh-marker': markerColor } as CSSProperties;
  const strokeClass = markStyle === 'highlight' ? styles.brush : styles.pen;

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <span className={styles.grain} aria-hidden="true" />
      <div className={styles.inner}>
        {kicker && <p className={styles.kicker}>{kicker}</p>}
        <div ref={stageRef} className={styles.stage}>
          <svg
            className={styles.ink}
            width={box.w}
            height={box.h}
            viewBox={\`0 0 \${box.w || 1} \${box.h || 1}\`}
            aria-hidden="true"
            focusable="false"
            data-drawn={drawn ? '' : undefined}
          >
            <defs>
              <filter id={brushId} filterUnits="userSpaceOnUse" x={-80} y={-80} width={box.w + 160} height={box.h + 160}>
                <feTurbulence type="fractalNoise" baseFrequency="0.012 0.42" numOctaves="2" seed="7" result="streaks" />
                <feColorMatrix
                  in="streaks"
                  type="matrix"
                  values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 1.4"
                  result="streakAlpha"
                />
                <feComposite in="SourceGraphic" in2="streakAlpha" operator="in" result="streaked" />
                <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="3" result="edge" />
                <feDisplacementMap in="streaked" in2="edge" scale="5" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
            {strokes.map((s, i) => (
              <path
                key={i}
                className={[strokeClass, s.pass ? styles.secondPass : ''].filter(Boolean).join(' ')}
                d={s.d}
                pathLength={1}
                filter={markStyle === 'highlight' ? \`url(#\${brushId})\` : undefined}
                style={
                  {
                    strokeWidth: s.width,
                    '--mh-delay': \`\${s.delay}s\`,
                    '--mh-duration': \`\${s.duration}s\`,
                  } as CSSProperties
                }
              />
            ))}
          </svg>
          <h2 className={styles.headline}>
            {segments.map((seg, i) =>
              seg.mark < 0 ? (
                <Fragment key={i}>{seg.text}</Fragment>
              ) : (
                <mark
                  key={i}
                  ref={(el) => {
                    markRefs.current[seg.mark] = el;
                  }}
                  className={styles.mark}
                >
                  {seg.text}
                </mark>
              ),
            )}
          </h2>
        </div>
      </div>
    </div>
  );
}
`;export{e as default};
