Create a custom element called "Diff Compare Card". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: first option name, second option name, rows (label, first value, second value, optional numbers, unit, and better: higher or lower), accent colour, collapsed-stack label. Add other settings if they help.

```tsx
import { useEffect, useId, useMemo, useRef, useState } from 'react';
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
const NUM = /-?\d[\d,]*(?:\.\d+)?/;

const text = (v: string) => v.trim() || PLACEHOLDER;
const differs = (r: DiffCompareRow) => r.valueA.trim() !== r.valueB.trim();
const parse = (v: string) => {
  const m = v.match(NUM);
  return m ? parseFloat(m[0].replace(/,/g, '')) : null;
};
const shown = (v: string, unit?: string) =>
  unit && v.trim() && !/[^\d.,\s-]/.test(v) ? `${v.trim()} ${unit}` : text(v);

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
          /\d/.test(ch) ? (
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
    verdict = `${name} fits you best: wins ${wins[lead]} of your ${counted.length} ${counted.length === 1 ? 'priority' : 'priorities'}.`;
  }

  const rootStyle = (accentColor ? { '--dc-accent': accentColor } : undefined) as CSSProperties | undefined;
  const rootClass = [styles.root, className].filter(Boolean).join(' ');

  const pan = (side: 'A' | 'B') => {
    const name = side === 'A' ? nameA : nameB;
    return (
      <div className={`${styles.pan} ${side === 'A' ? styles.panA : styles.panB}`} data-lead={lead === side}>
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
    <div ref={rootRef} className={rootClass} style={rootStyle} role="group" aria-label={`${nameA} compared with ${nameB}`}>
      {decided.length > 0 && (
        <section className={styles.matters} aria-labelledby={`${uid}-m`}>
          <h4 id={`${uid}-m`} className={styles.mattersTitle}>
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
                  aria-label={`${text(row.label)}: ${hint}`}
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
            aria-controls={`${uid}-same`}
            onClick={() => setSameOpen((v) => !v)}
          >
            <span>
              {collapseLabel}: <span className={styles.sameCount}>{same.length}</span>
            </span>
            <span className={styles.chev} aria-hidden="true" />
          </button>
          <div id={`${uid}-same`} className={styles.sameList} data-open={sameOpen} aria-hidden={!sameOpen}>
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
```

```css
@font-face {
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 100 700;
  font-display: swap;
  src: url('./fonts/ibm-plex-sans-latin-var.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

.root {
  --dc-paper: #ffffff;
  --dc-ink: #17191f;
  --dc-muted: #5b616c;
  --dc-line: #e4e6ea;
  --dc-accent: #2f56d6;
  --dc-accent-ink: color-mix(in srgb, var(--dc-accent) 70%, #000);
  --dc-tint: color-mix(in srgb, var(--dc-accent) 7%, var(--dc-paper));
  --dc-font: 'IBM Plex Sans', system-ui, sans-serif;
  --dc-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --dc-gap: clamp(14px, 3.2cqi, 32px);

  position: relative;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  overflow: clip;
  padding: clamp(20px, 4.5cqi, 48px);
  border: 1px solid var(--dc-line);
  border-radius: 16px;
  background: var(--dc-paper);
  box-shadow: 0 1px 2px rgba(23, 25, 31, 0.04), 0 12px 32px -20px rgba(23, 25, 31, 0.18);
  color: var(--dc-ink);
  font-family: var(--dc-font);
  -webkit-tap-highlight-color: transparent;
}

.root ::selection {
  background: color-mix(in srgb, var(--dc-accent) 22%, #fff);
}

.sr {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* priorities */
.matters {
  margin-block-end: 18px;
}

.mattersTitle {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--dc-muted);
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
  min-block-size: 40px;
  max-inline-size: 100%;
  padding: 0 14px 0 12px;
  appearance: none;
  border: 1px solid var(--dc-ink);
  border-radius: 999px;
  background: var(--dc-ink);
  color: #fff;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 200ms var(--dc-ease), color 200ms var(--dc-ease), border-color 200ms var(--dc-ease), transform 160ms var(--dc-ease);
}

.chip[data-w='2'] {
  background: var(--dc-accent);
  border-color: var(--dc-accent);
}

.chip[data-w='0'] {
  background: transparent;
  border-color: var(--dc-line);
  color: var(--dc-muted);
}

.chip:active {
  transform: scale(0.96);
}

.chip:focus-visible,
.sameBtn:focus-visible {
  outline: 2px solid var(--dc-accent-ink);
  outline-offset: 2px;
}

.chipLabel {
  min-inline-size: 0;
  overflow-wrap: anywhere;
  text-align: start;
  line-height: 1.2;
  padding-block: 4px;
}

.chip[data-w='0'] .chipLabel {
  text-decoration: line-through;
  text-decoration-color: color-mix(in srgb, currentColor 50%, transparent);
}

.pip {
  flex: none;
  inline-size: 8px;
  block-size: 8px;
  border-radius: 50%;
  background: currentColor;
  transition: box-shadow 200ms var(--dc-ease), background-color 200ms var(--dc-ease);
}

.chip[data-w='2'] .pip {
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.35);
}

.chip[data-w='0'] .pip {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px currentColor;
}

.x2 {
  margin-inline-start: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  opacity: 0.85;
}

.chip .x2 {
  margin: 0;
}

.verdict {
  margin: 0 0 22px;
  padding-block-start: 16px;
  border-block-start: 1px solid var(--dc-ink);
  font-size: clamp(18px, 3.4cqi, 26px);
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.015em;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

/* the balance: --s runs -1 (B heavier) .. 1 (A heavier), driven by the spring */
.scene {
  --s: 0;
  --dc-tilt: 7deg;
  --dc-lift: 3.05cqi; /* 25cqi * sin(7deg) */
  --dc-gap2: clamp(12px, 3cqi, 28px);
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: var(--dc-gap2);
  align-items: start;
  padding-block-start: 14px;
}

.beamWrap {
  position: absolute;
  inset-block-start: 14px;
  inset-inline: 0;
  block-size: 0;
  pointer-events: none;
}

.beam {
  position: absolute;
  inset-inline: 19%;
  inset-block-start: -4px;
  block-size: 8px;
  border-radius: 4px;
  background: linear-gradient(180deg, #2b2f38, var(--dc-ink));
  box-shadow: 0 6px 10px -4px rgba(23, 25, 31, 0.35);
  rotate: calc(var(--s) * -1 * var(--dc-tilt));
}

.post {
  position: absolute;
  inset-inline-start: calc(50% - 1px);
  inset-block-start: 0;
  inline-size: 2px;
  block-size: 30px;
  background: var(--dc-ink);
  opacity: 0.55;
}

.pivot {
  position: absolute;
  inset-inline-start: calc(50% - 7px);
  inset-block-start: -7px;
  inline-size: 14px;
  block-size: 14px;
  border-radius: 50%;
  background: var(--dc-paper);
  border: 3px solid var(--dc-ink);
  box-sizing: border-box;
}

.pan {
  position: relative;
  min-inline-size: 0;
  padding-block-start: 22px;
  translate: 0 calc(var(--s) * var(--dc-lift));
}

.panB {
  translate: 0 calc(var(--s) * var(--dc-lift) * -1);
}

.string {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: calc(50% - 0.5px);
  inline-size: 1px;
  block-size: 22px;
  background: var(--dc-ink);
  opacity: 0.6;
}

.panBody {
  box-sizing: border-box;
  padding: 14px clamp(10px, 2.4cqi, 18px) 6px;
  border: 1px solid var(--dc-line);
  border-block-start: 3px solid var(--dc-ink);
  border-radius: 4px 4px 12px 12px;
  background: var(--dc-paper);
  box-shadow: 0 14px 20px -16px rgba(23, 25, 31, 0.35);
  transition: border-color 300ms var(--dc-ease);
}

.panA .panBody {
  border-block-start-color: var(--dc-accent);
  background: var(--dc-tint);
}

.pan[data-lead='true'] .panBody {
  border-color: color-mix(in srgb, var(--dc-ink) 30%, var(--dc-line));
}

.panHead {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 10px;
  padding-block-end: 10px;
}

.name {
  margin: 0;
  min-inline-size: 0;
  font-size: clamp(15px, 2.6cqi, 20px);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
  unicode-bidi: plaintext;
}

.tally {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  font-size: 22px;
  font-weight: 600;
  line-height: 1;
}

.tallyUnit {
  font-size: 12px;
  font-weight: 500;
  color: var(--dc-muted);
}

.plates {
  margin: 0;
  padding: 0;
  list-style: none;
}

.plate {
  display: grid;
  grid-template-rows: 1fr;
  opacity: 1;
  translate: 0 0;
  transition: grid-template-rows 420ms var(--dc-ease), opacity 260ms var(--dc-ease), translate 420ms var(--dc-ease);
}

.plate[data-on='false'] {
  grid-template-rows: 0fr;
  opacity: 0;
  translate: 0 -10px;
}

.plateClip {
  min-block-size: 0;
  overflow: hidden;
}

.plateIn {
  display: grid;
  gap: 2px;
  padding: 10px 0;
  border-block-start: 1px solid var(--dc-line);
}

.plateLabel {
  font-size: 12px;
  color: var(--dc-muted);
  overflow-wrap: anywhere;
}

.plateValue {
  font-size: clamp(16px, 2.8cqi, 21px);
  font-weight: 600;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.plate[data-double='true'] .plateValue {
  color: var(--dc-accent-ink);
}

.plateOther {
  font-size: 12px;
  color: var(--dc-muted);
  overflow-wrap: anywhere;
}

/* odometer digits */
.roll {
  font-variant-numeric: tabular-nums;
}

.digit {
  display: inline-block;
  block-size: 1.2em;
  line-height: 1.2;
  overflow: hidden;
  vertical-align: top;
}

.reel {
  display: flex;
  flex-direction: column;
  translate: 0 calc(var(--d) * -1.2em);
  transition: translate 900ms cubic-bezier(0.2, 0.9, 0.25, 1) calc(var(--i) * 60ms);
}

.neutral {
  margin: 22px 0 0;
  padding: 0;
  list-style: none;
}

.neutralRow {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px var(--dc-gap2);
  padding: 10px 4px;
  border-block-start: 1px solid var(--dc-line);
  font-size: 14px;
  line-height: 1.4;
}

.neutralLabel {
  color: var(--dc-muted);
}

.neutralVal {
  font-weight: 500;
}

.neutralLabel,
.neutralVal {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

@container (width < 520px) {
  .neutralRow {
    grid-template-columns: 1fr 1fr;
  }

  .neutralLabel {
    grid-column: 1 / -1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chip,
  .pip,
  .panBody,
  .plate,
  .reel,
  .sameList,
  .chev {
    transition: none;
  }
}

/* matching rows collapse into one stack */
.same {
  margin-block-start: 8px;
}

.sameBtn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  inline-size: 100%;
  min-block-size: 52px;
  padding: 0 4px;
  appearance: none;
  border: 0;
  background: none;
  font: inherit;
  color: var(--dc-muted);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.sameBtn:hover {
  color: var(--dc-accent-ink);
}

.sameBtn:focus-visible {
  outline: 2px solid var(--dc-accent-ink);
  outline-offset: -2px;
  border-radius: 6px;
}

.sameCount {
  font-weight: 600;
  color: var(--dc-ink);
}

.chev {
  inline-size: 8px;
  block-size: 8px;
  margin-inline-end: 6px;
  border-inline-end: 2px solid currentColor;
  border-block-end: 2px solid currentColor;
  rotate: 45deg;
  translate: 0 -2px;
  transition: rotate 280ms var(--dc-ease);
}

.sameBtn[aria-expanded='true'] .chev {
  rotate: 225deg;
  translate: 0 2px;
}

.sameList {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 360ms var(--dc-ease);
}

.sameList[data-open='true'] {
  grid-template-rows: 1fr;
}

.sameInner {
  min-block-size: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow: hidden;
}

.sameItem {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 4px;
  border-block-start: 1px solid var(--dc-line);
  font-size: 14px;
  line-height: 1.4;
}

.sameName {
  color: var(--dc-muted);
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.sameVal {
  font-weight: 500;
  text-align: end;
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

```
