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

export default function DiffCompareCard({
  optionAName = 'Signature Full-Day',
  optionBName = 'Classic Half-Day',
  rows = defaultRows,
  highlightColor,
  diffOnlyLabel = 'Differences only',
  className,
}: DiffCompareCardProps) {
  const [diffOnly, setDiffOnly] = useState(false);
  const uid = useId();
  const nameAId = `${uid}-a`;
  const nameBId = `${uid}-b`;
  const rootRef = useRef<HTMLDivElement>(null);

  const diffCount = rows.filter(differs).length;
  const noneDiffer = diffCount === 0;

  // A card mounted below the fold keeps its finished look and plays the opening on arrival.
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return;
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

  const rootStyle = (highlightColor ? { '--dc-accent': highlightColor } : undefined) as CSSProperties | undefined;
  const rootClass = [styles.root, diffOnly ? styles.diffOn : '', pending ? styles.pending : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={rootRef} className={rootClass} style={rootStyle} role="group" aria-labelledby={`${nameAId} ${nameBId}`}>
      <div className={styles.toolbar}>
        <span className={styles.tally} role="img" aria-label={`${diffCount} of ${rows.length} entries differ`}>
          <span className={styles.tallyNum}>{diffCount}</span> of {rows.length} differ
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={diffOnly}
          aria-disabled={noneDiffer ? true : undefined}
          className={[styles.switch, diffOnly ? styles.switchOn : ''].filter(Boolean).join(' ')}
          onClick={() => {
            if (!noneDiffer) setDiffOnly((v) => !v);
          }}
        >
          <span className={styles.switchLabel}>{diffOnlyLabel}</span>
          <span className={styles.track} aria-hidden="true">
            <span className={styles.thumb} />
          </span>
        </button>
      </div>

      <header className={styles.head}>
        <h3 id={nameAId} className={styles.name}>
          {text(optionAName)}
        </h3>
        <h3 id={nameBId} className={styles.name}>
          {text(optionBName)}
        </h3>
      </header>

      <div className={styles.list} role="list">
        {rows.map((row, i) => {
          const diff = differs(row);
          const a = text(row.valueA);
          const b = text(row.valueB);
          const long = a.length > LONG_VALUE || b.length > LONG_VALUE;
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
                aria-label={`${text(row.label)}: ${a} versus ${b}, ${diff ? 'differs' : 'identical'}`}
              >
                <span className={styles.label}>{text(row.label)}</span>
                <span className={`${styles.value} ${row.valueA.trim() === '' ? styles.empty : ''}`}>{a}</span>
                <span className={`${styles.value} ${row.valueB.trim() === '' ? styles.empty : ''}`}>{b}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
