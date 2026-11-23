import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import styles from './Component.module.css';

export interface DiffCompareRow {
  label: string;
  valueA: string;
  valueB: string;
}

export interface DiffCompareCardProps {
  optionAName?: string;
  optionBName?: string;
  rows?: DiffCompareRow[];
  highlightColor?: string;
  diffOnlyLabel?: string;
  className?: string;
}

export const defaultRows: DiffCompareRow[] = [
  { label: 'Coverage', valueA: '8 hours', valueB: '4 hours' },
  { label: 'Investment', valueA: '$2,450', valueB: '$1,280' },
  { label: 'Photographers on site', valueA: 'Two', valueB: 'One' },
  { label: 'Finished gallery', valueA: '320 images', valueB: '140 images' },
  { label: 'Delivery time', valueA: '3 weeks', valueB: '3 weeks' },
  { label: 'Online gallery', valueA: '12 months', valueB: '12 months' },
  { label: 'Print release', valueA: 'Included', valueB: 'Included' },
  { label: 'Planning call', valueA: 'Included', valueB: 'Included' },
];

const PLACEHOLDER = '\u2014';
const LONG_VALUE = 26;

const text = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : PLACEHOLDER;
};

const differs = (row: DiffCompareRow) => row.valueA.trim() !== row.valueB.trim();

/* ───────── mass: how much "weight" each side of a row puts on its hanger ───────── */

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

/** First number in a value plus whatever surrounds it (the unit), or null when there is none. */
const quantity = (value: string): { n: number; unit: string } | null => {
  const t = value.trim().toLowerCase();
  const m = t.match(/\d[\d,]*(?:\.\d+)?/);
  if (m && m.index !== undefined) {
    const n = parseFloat(m[0].replace(/,/g, ''));
    if (!Number.isFinite(n)) return null;
    const unit = `${t.slice(0, m.index)} ${t.slice(m.index + m[0].length)}`.replace(/\s+/g, ' ').trim();
    return { n, unit };
  }
  const word = t.replace(/[^a-z]/g, '');
  if (word in NUMBER_WORDS) return { n: NUMBER_WORDS[word], unit: '' };
  return null;
};

interface Mass {
  /** share of the hanger width this side's slab takes (heavier side = 1) */
  wa: number;
  wb: number;
  /** which side is heavier, when the values can be weighed */
  heavy: 'a' | 'b' | null;
  /** signed pull on the beam: positive = A heavier */
  pull: number;
}

const MATCH_W = 0.6;

const weigh = (row: DiffCompareRow): Mass => {
  if (!differs(row)) return { wa: MATCH_W, wb: MATCH_W, heavy: null, pull: 0 };
  const a = row.valueA.trim();
  const b = row.valueB.trim();
  if (a === '' || b === '') {
    // a missing value is an empty hook
    return a === ''
      ? { wa: 0.42, wb: 1, heavy: 'b', pull: -1 }
      : { wa: 1, wb: 0.42, heavy: 'a', pull: 1 };
  }
  const qa = quantity(a);
  const qb = quantity(b);
  if (qa && qb && qa.unit === qb.unit && qa.n !== qb.n) {
    const hi = Math.max(qa.n, qb.n);
    const lo = Math.min(qa.n, qb.n);
    const light = 0.36 + 0.64 * (hi > 0 ? lo / hi : 0);
    const pull = (qa.n - qb.n) / (qa.n + qb.n);
    return qa.n > qb.n
      ? { wa: 1, wb: light, heavy: 'a', pull }
      : { wa: light, wb: 1, heavy: 'b', pull };
  }
  return { wa: 0.92, wb: 0.92, heavy: null, pull: 0 };
};

/** Names scale down by length so a long name never overflows its plate. */
const nameSize = (value: string) => {
  const n = value.length;
  if (n > 44) return styles.nameXL;
  if (n > 26) return styles.nameL;
  return '';
};

const slabClass = (side: 'a' | 'b', diff: boolean, mass: Mass, empty: boolean) => {
  if (!diff) return styles.slabMatch;
  if (empty) return styles.slabGhost;
  if (mass.heavy === null) return styles.slabText;
  return mass.heavy === side ? styles.slabHeavy : styles.slabLight;
};

export default function DiffCompareCard({
  optionAName = 'Signature Full-Day',
  optionBName = 'Classic Half-Day',
  rows = defaultRows,
  highlightColor,
  diffOnlyLabel = 'Differences only',
  className,
}: DiffCompareCardProps) {
  const [diffOnly, setDiffOnly] = useState(false);
  const [sway, setSway] = useState(0);
  const [pending, setPending] = useState(false);
  const uid = useId();
  const nameAId = `${uid}-a`;
  const nameBId = `${uid}-b`;

  const rootRef = useRef<HTMLDivElement>(null);

  const masses = rows.map(weigh);
  const diffCount = rows.filter(differs).length;
  const noneDiffer = diffCount === 0;
  const nameA = text(optionAName);
  const nameB = text(optionBName);
  const longest = nameA.length >= nameB.length ? nameA : nameB;
  const sizeClass = nameSize(longest);

  // The beam leans toward the heavier option. Matching rows weigh the same on both
  // hangers and cancel out, so only the differing rows pull on it.
  const pull = masses.reduce((sum, m) => sum + m.pull, 0);
  const leanA = Math.tanh(pull * 1.1);
  const tilt = Number((-leanA).toFixed(3));
  const frac = rows.length > 0 ? diffCount / rows.length : 0;

  // A card mounted below the fold keeps its finished look and plays the opening on arrival.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const offscreen = rect.top >= window.innerHeight || rect.bottom <= 0;
    if (!offscreen) return;
    setPending(true);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPending(false);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const rootStyle = {
    ...(highlightColor ? { '--dc-mint': highlightColor } : {}),
  } as CSSProperties;

  const scaleStyle = {
    '--dc-tilt': tilt,
    '--dc-frac': frac.toFixed(3),
  } as CSSProperties;

  const rootClass = [styles.root, diffOnly ? styles.diffOn : '', pending ? styles.pending : '', className]
    .filter(Boolean)
    .join(' ');

  const scaleClass = [styles.scale, sway === 0 ? '' : sway % 2 === 1 ? styles.swayA : styles.swayB]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={rootRef}
      className={rootClass}
      style={rootStyle}
      role="group"
      aria-labelledby={`${nameAId} ${nameBId}`}
    >
      <div className={styles.toolbar}>
        <button
          type="button"
          role="switch"
          aria-checked={diffOnly}
          aria-disabled={noneDiffer ? true : undefined}
          className={[styles.switch, diffOnly ? styles.switchOn : ''].filter(Boolean).join(' ')}
          onClick={() => {
            if (noneDiffer) return;
            setDiffOnly((v) => !v);
            setSway((s) => s + 1);
          }}
        >
          <span className={styles.track} aria-hidden="true">
            <span className={styles.thumb} />
          </span>
          <span className={styles.switchLabel}>{diffOnlyLabel}</span>
        </button>
      </div>

      <div className={scaleClass} style={scaleStyle}>
        {/* the beam, its pivot and the tally dial */}
        <div className={styles.rig} aria-hidden="true">
          <span className={styles.beam}>
            <span className={`${styles.cap} ${styles.capA}`} />
            <span className={`${styles.cap} ${styles.capB}`} />
          </span>
        </div>
        <span className={styles.pillar} aria-hidden="true" />
        <span className={styles.base} aria-hidden="true" />
        <span
          className={styles.hub}
          role="img"
          aria-label={`${diffCount} of ${rows.length} entries differ`}
        >
          <span className={styles.pillNum}>{diffCount}</span>
          <span className={styles.pillSlash} aria-hidden="true">
            /
          </span>
          <span className={styles.pillTotal}>{rows.length}</span>
        </span>

        {/* the two options hang from the beam ends as heavy nameplates */}
        <header className={[styles.crown, sizeClass].filter(Boolean).join(' ')}>
          <div className={`${styles.hang} ${styles.hangA}`}>
            <svg className={styles.stirrup} viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden="true">
              <path d="M50 0 L12 48 M50 0 L88 48" />
            </svg>
            <h3 id={nameAId} className={styles.plate}>
              <span className={styles.bolt} aria-hidden="true" />
              <span className={styles.name}>{nameA}</span>
            </h3>
          </div>
          <div className={`${styles.hang} ${styles.hangB}`}>
            <svg className={styles.stirrup} viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden="true">
              <path d="M50 0 L12 48 M50 0 L88 48" />
            </svg>
            <h3 id={nameBId} className={styles.plate}>
              <span className={styles.bolt} aria-hidden="true" />
              <span className={styles.name}>{nameB}</span>
            </h3>
          </div>
        </header>

        <div className={styles.list} role="list">
          <span className={`${styles.rod} ${styles.rodA}`} aria-hidden="true" />
          <span className={`${styles.rod} ${styles.rodB}`} aria-hidden="true" />
          {rows.map((row, i) => {
            const diff = differs(row);
            const mass = masses[i];
            const a = text(row.valueA);
            const b = text(row.valueB);
            const state = diff ? 'differs' : 'identical';
            const long = a.length > LONG_VALUE || b.length > LONG_VALUE;
            const emptyA = diff && row.valueA.trim() === '';
            const emptyB = diff && row.valueB.trim() === '';
            const note = diff && mass.heavy ? `, ${mass.heavy === 'a' ? 'first' : 'second'} is larger` : '';
            const slabStyle = (w: number) => ({ '--dc-w': w } as CSSProperties);
            return (
              <div
                key={i}
                className={[styles.rowWrap, diff ? styles.rowDiff : styles.rowMatch].join(' ')}
                style={{ '--i': i, '--r': rows.length - 1 - i } as CSSProperties}
                aria-hidden={diffOnly && !diff ? true : undefined}
              >
                <div
                  className={[styles.row, long ? styles.rowLong : ''].filter(Boolean).join(' ')}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${text(row.label)}: ${a} versus ${b}, ${state}${note}`}
                >
                  <span className={`${styles.cell} ${styles.cellA}`}>
                    <span
                      className={`${styles.slab} ${slabClass('a', diff, mass, emptyA)}`}
                      style={slabStyle(mass.wa)}
                    >
                      {a}
                    </span>
                  </span>
                  <span className={styles.cellLabel}>
                    <span className={styles.chip}>
                      <span className={styles.tick} aria-hidden="true" />
                      <span className={styles.labelText}>{text(row.label)}</span>
                    </span>
                  </span>
                  <span className={`${styles.cell} ${styles.cellB}`}>
                    <span
                      className={`${styles.slab} ${slabClass('b', diff, mass, emptyB)}`}
                      style={slabStyle(mass.wb)}
                    >
                      {b}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
