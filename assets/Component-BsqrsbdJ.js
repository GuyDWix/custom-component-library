const n=`import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import styles from './Component.module.css';

export interface DiffCompareRow {
  label: string;
  valueA: string;
  valueB: string;
  /** Optional numbers used to pick the winner; otherwise parsed from the text. */
  numberA?: number;
  numberB?: number;
  /** Optional unit appended to bare-number values, e.g. "hours". */
  unit?: string;
  /** Which side of the scale wins: 'higher' (default) or 'lower' (price, wait time). */
  better?: 'higher' | 'lower';
}

export interface DiffCompareCardProps {
  optionAName?: string;
  optionBName?: string;
  rows?: DiffCompareRow[];
  accentColor?: string;
  collapseLabel?: string;
  className?: string;
}

export const defaultRows: DiffCompareRow[] = [
  { label: 'Coverage', valueA: '8 hours', valueB: '4 hours' },
  { label: 'Investment', valueA: '$2,450', valueB: '$1,280', better: 'lower' },
  { label: 'Photographers on site', valueA: 'Two', valueB: 'One', numberA: 2, numberB: 1 },
  { label: 'Finished gallery', valueA: '320 images', valueB: '140 images' },
  { label: 'Delivery time', valueA: '3 weeks', valueB: '3 weeks' },
  { label: 'Online gallery', valueA: '12 months', valueB: '12 months' },
  { label: 'Print release', valueA: 'Included', valueB: 'Included' },
  { label: 'Planning call', valueA: 'Included', valueB: 'Included' },
];

const PLACEHOLDER = '—';
const NUM = /-?\\d[\\d,]*(?:\\.\\d+)?/;

const text = (v: string) => v.trim() || PLACEHOLDER;
const differs = (r: DiffCompareRow) => r.valueA.trim() !== r.valueB.trim();
const parse = (v: string) => {
  const m = v.match(NUM);
  return m ? parseFloat(m[0].replace(/,/g, '')) : null;
};
const shown = (v: string, unit?: string) =>
  unit && v.trim() && !/[^\\d.,\\s-]/.test(v) ? \`\${v.trim()} \${unit}\` : text(v);

/** 'A' / 'B' for a decided row, null when text-only, missing or equal. */
function winner(r: DiffCompareRow): 'A' | 'B' | null {
  const a = r.numberA ?? parse(r.valueA);
  const b = r.numberB ?? parse(r.valueB);
  if (a == null || b == null || a === b) return null;
  return (a > b) === (r.better !== 'lower') ? 'A' : 'B';
}

/** Text with digits that roll like an odometer. */
function Roll({ value, run }: { value: string; run: boolean }) {
  return (
    <span className={styles.roll}>
      <span className={styles.sr}>{value}</span>
      <span aria-hidden="true">
        {[...value].map((ch, i) =>
          /\\d/.test(ch) ? (
            <span key={i} className={styles.digit} style={{ '--d': run ? +ch : 0, '--i': i } as CSSProperties}>
              <span className={styles.reel}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </span>
            </span>
          ) : (
            <span key={i}>{ch}</span>
          )
        )}
      </span>
    </span>
  );
}

export default function DiffCompareCard({
  optionAName = 'Signature Full-Day',
  optionBName = 'Classic Half-Day',
  rows = defaultRows,
  accentColor,
  collapseLabel = 'Same in both',
  className,
}: DiffCompareCardProps) {
  const uid = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const spring = useRef({ x: 0, v: 0, t: 0, raf: 0, last: 0 });
  const [run, setRun] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [sameOpen, setSameOpen] = useState(false);
  // per-row priority: 0 off, 1 counts, 2 counts double (default 1)
  const [prio, setPrio] = useState<Record<number, number>>({});

  const nameA = text(optionAName);
  const nameB = text(optionBName);

  const { decided, neutral, same } = useMemo(() => {
    const d: { row: DiffCompareRow; i: number; win: 'A' | 'B' }[] = [];
    const n: DiffCompareRow[] = [];
    const s: DiffCompareRow[] = [];
    rows.forEach((row, i) => {
      if (!differs(row)) return void s.push(row);
      const win = winner(row);
      if (win) d.push({ row, i, win });
      else n.push(row);
    });
    return { decided: d, neutral: n, same: s };
  }, [rows]);

  const weight = (i: number) => prio[i] ?? 1;
  const counted = decided.filter(({ i }) => weight(i) > 0);
  const pts = { A: 0, B: 0 };
  const wins = { A: 0, B: 0 };
  counted.forEach(({ i, win }) => {
    pts[win] += weight(i);
    wins[win] += 1;
  });
  const total = pts.A + pts.B;
  const s = total ? (pts.A - pts.B) / total : 0;
  const lead = pts.A === pts.B ? null : pts.A > pts.B ? 'A' : 'B';

  // reduced motion + arrival
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    const el = rootRef.current;
    let io: IntersectionObserver | undefined;
    let raf = 0;
    if (!el || typeof IntersectionObserver === 'undefined') setRun(true);
    else {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) raf = requestAnimationFrame(() => setRun(true));
      else {
        io = new IntersectionObserver(([e]) => {
          if (e.isIntersecting) {
            setRun(true);
            io?.disconnect();
          }
        }, { threshold: 0.2 });
        io.observe(el);
      }
    }
    return () => {
      mq.removeEventListener('change', sync);
      io?.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // beam spring toward the weighted result
  useEffect(() => {
    const sp = spring.current;
    const paint = () => sceneRef.current?.style.setProperty('--s', sp.x.toFixed(4));
    sp.t = run ? s : 0;
    cancelAnimationFrame(sp.raf);
    if (reduced) {
      sp.x = sp.t;
      sp.v = 0;
      paint();
      return;
    }
    sp.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - sp.last) / 1000);
      sp.last = now;
      sp.v += (-130 * (sp.x - sp.t) - 11 * sp.v) * dt;
      sp.x += sp.v * dt;
      paint();
      if (Math.abs(sp.x - sp.t) > 0.0008 || Math.abs(sp.v) > 0.0008) sp.raf = requestAnimationFrame(tick);
      else {
        sp.x = sp.t;
        paint();
      }
    };
    sp.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(sp.raf);
  }, [s, run, reduced]);

  // counts (1) -> double (2) -> off (0) -> counts
  const next = (w: number) => (w === 1 ? 2 : w === 2 ? 0 : 1);
  const press = (i: number) => setPrio((p) => ({ ...p, [i]: next(p[i] ?? 1) }));

  let verdict: string;
  if (!decided.length) verdict = 'These two differ only in wording, so there is no clear winner.';
  else if (!counted.length) verdict = 'Pick at least one priority to see which fits you.';
  else if (!lead) verdict = 'Evenly matched on what you picked.';
  else {
    const name = lead === 'A' ? nameA : nameB;
    verdict = \`\${name} fits you best: wins \${wins[lead]} of your \${counted.length} \${counted.length === 1 ? 'priority' : 'priorities'}.\`;
  }

  const rootStyle = (accentColor ? { '--dc-accent': accentColor } : undefined) as CSSProperties | undefined;
  const rootClass = [styles.root, className].filter(Boolean).join(' ');

  const pan = (side: 'A' | 'B') => {
    const name = side === 'A' ? nameA : nameB;
    return (
      <div className={\`\${styles.pan} \${side === 'A' ? styles.panA : styles.panB}\`} data-lead={lead === side}>
        <span className={styles.string} aria-hidden="true" />
        <div className={styles.panBody}>
          <div className={styles.panHead}>
            <h3 className={styles.name}>{name}</h3>
            <span className={styles.tally}>
              <Roll value={String(pts[side])} run={run} />
              <span className={styles.tallyUnit}>{pts[side] === 1 ? 'point' : 'points'}</span>
            </span>
          </div>
          <ul className={styles.plates}>
            {decided
              .filter(({ win }) => win === side)
              .map(({ row, i }) => {
                const w = weight(i);
                const mine = side === 'A' ? row.valueA : row.valueB;
                const other = side === 'A' ? row.valueB : row.valueA;
                return (
                  <li key={i} className={styles.plate} data-on={w > 0} data-double={w === 2}>
                    <div className={styles.plateClip}>
                      <div className={styles.plateIn}>
                        <span className={styles.plateLabel}>
                          {text(row.label)}
                          {w === 2 && <span className={styles.x2}>×2</span>}
                        </span>
                        <span className={styles.plateValue}>
                          <Roll value={shown(mine, row.unit)} run={run} />
                        </span>
                        <span className={styles.plateOther}>vs {shown(other, row.unit)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div ref={rootRef} className={rootClass} style={rootStyle} role="group" aria-label={\`\${nameA} compared with \${nameB}\`}>
      {decided.length > 0 && (
        <section className={styles.matters} aria-labelledby={\`\${uid}-m\`}>
          <h4 id={\`\${uid}-m\`} className={styles.mattersTitle}>
            What matters to you
          </h4>
          <div className={styles.chips}>
            {decided.map(({ row, i }) => {
              const w = weight(i);
              const hint = w === 1 ? 'counts; press to count double' : w === 2 ? 'counts double; press to turn off' : 'off; press to count';
              return (
                <button
                  key={i}
                  type="button"
                  className={styles.chip}
                  data-w={w}
                  aria-pressed={w > 0}
                  aria-label={\`\${text(row.label)}: \${hint}\`}
                  onClick={() => press(i)}
                >
                  <span className={styles.pip} aria-hidden="true" />
                  <span className={styles.chipLabel}>{text(row.label)}</span>
                  {w === 2 && <span className={styles.x2}>×2</span>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <p className={styles.verdict} aria-live="polite" aria-atomic="true">
        {verdict}
      </p>

      <div ref={sceneRef} className={styles.scene}>
        <div className={styles.beamWrap} aria-hidden="true">
          <div className={styles.beam} />
          <span className={styles.post} />
          <span className={styles.pivot} />
        </div>
        {pan('A')}
        {pan('B')}
      </div>

      {neutral.length > 0 && (
        <ul className={styles.neutral} aria-label="Differences with no clear winner">
          {neutral.map((row, i) => (
            <li key={i} className={styles.neutralRow}>
              <span className={styles.neutralLabel}>{text(row.label)}</span>
              <span className={styles.neutralVal}>{shown(row.valueA, row.unit)}</span>
              <span className={styles.neutralVal}>{shown(row.valueB, row.unit)}</span>
            </li>
          ))}
        </ul>
      )}

      {same.length > 0 && (
        <div className={styles.same}>
          <button
            type="button"
            className={styles.sameBtn}
            aria-expanded={sameOpen}
            aria-controls={\`\${uid}-same\`}
            onClick={() => setSameOpen((v) => !v)}
          >
            <span>
              {collapseLabel}: <span className={styles.sameCount}>{same.length}</span>
            </span>
            <span className={styles.chev} aria-hidden="true" />
          </button>
          <div id={\`\${uid}-same\`} className={styles.sameList} data-open={sameOpen} aria-hidden={!sameOpen}>
            <ul className={styles.sameInner}>
              {same.map((row, i) => (
                <li key={i} className={styles.sameItem}>
                  <span className={styles.sameName}>{text(row.label)}</span>
                  <span className={styles.sameVal}>{shown(row.valueA, row.unit)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
`;export{n as default};
