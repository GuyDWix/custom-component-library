Create a custom element called "Diff Compare Card". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: first option name, second option name, rows (label, first value, second value), highlight color, differences-only toggle label. Add other settings if they help.

```tsx
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
  --dc-tint: color-mix(in srgb, var(--dc-accent) 6%, var(--dc-paper));
  --dc-font: 'IBM Plex Sans', system-ui, sans-serif;
  --dc-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --dc-cols: minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1fr);

  position: relative;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  overflow: clip;
  padding: clamp(20px, 4cqi, 40px);
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

.pending .row,
.pending .head {
  animation: none;
}

/* ───────── toolbar ───────── */

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-block-end: clamp(20px, 3.5cqi, 32px);
}

.tally {
  font-size: 14px;
  color: var(--dc-muted);
  font-variant-numeric: tabular-nums;
}

.tallyNum {
  font-weight: 600;
  color: var(--dc-ink);
}

.switch {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-block-size: 44px;
  padding: 0;
  appearance: none;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.switch:focus-visible {
  outline: 2px solid var(--dc-accent-ink);
  outline-offset: 4px;
  border-radius: 8px;
}

.switchLabel {
  font-size: 14px;
  font-weight: 500;
  color: var(--dc-muted);
  transition: color 200ms ease;
}

.switchOn .switchLabel {
  color: var(--dc-ink);
}

.track {
  position: relative;
  flex: none;
  inline-size: 36px;
  block-size: 20px;
  border-radius: 999px;
  background: #b9bec7;
  transition: background-color 240ms var(--dc-ease);
}

.thumb {
  position: absolute;
  inset-block-start: 2px;
  inset-inline-start: 2px;
  inline-size: 16px;
  block-size: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(23, 25, 31, 0.25);
  transition: translate 280ms var(--dc-ease);
}

.switchOn .track {
  background: var(--dc-accent);
}

.switchOn .thumb {
  translate: 16px 0;
}

.switch[aria-disabled='true'] {
  opacity: 0.5;
  cursor: default;
}

/* ───────── option names ───────── */

.head {
  display: grid;
  grid-template-columns: var(--dc-cols);
  column-gap: clamp(12px, 3cqi, 28px);
  padding-block-end: 16px;
  border-block-end: 1px solid var(--dc-ink);
  animation: dcRise 600ms var(--dc-ease) backwards;
}

.head::before {
  content: '';
}

.name {
  grid-column: auto;
  margin: 0;
  min-inline-size: 0;
  font-size: clamp(18px, 3.4cqi, 26px);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.015em;
  text-wrap: balance;
  overflow-wrap: anywhere;
  unicode-bidi: plaintext;
}

/* ───────── rows ───────── */

.rowWrap {
  display: grid;
  grid-template-rows: 1fr;
  transition:
    grid-template-rows 420ms var(--dc-ease) calc(120ms + min(var(--r), 10) * 20ms),
    opacity 240ms ease calc(min(var(--r), 10) * 20ms),
    visibility 0s;
}

.diffOn .rowMatch {
  grid-template-rows: 0fr;
  opacity: 0;
  visibility: hidden;
  transition:
    grid-template-rows 420ms var(--dc-ease) calc(160ms + min(var(--r), 10) * 20ms),
    opacity 220ms ease calc(min(var(--r), 10) * 20ms),
    visibility 0s calc(160ms + min(var(--r), 10) * 20ms + 420ms);
}

.row {
  position: relative;
  display: grid;
  grid-template-columns: var(--dc-cols);
  column-gap: clamp(12px, 3cqi, 28px);
  align-items: baseline;
  min-block-size: 0;
  overflow: hidden;
  background: linear-gradient(var(--dc-line), var(--dc-line)) bottom / 100% 1px no-repeat;
  outline-offset: -2px;
  animation: dcRise 560ms var(--dc-ease) calc(80ms + var(--i) * 45ms) backwards;
}

.rowDiff .row {
  margin-inline: calc(clamp(12px, 2.4cqi, 20px) * -1);
  padding-inline: clamp(12px, 2.4cqi, 20px);
  border-radius: 8px;
  background: var(--dc-tint);
}

.row:focus-visible {
  outline: 2px solid var(--dc-accent-ink);
  border-radius: 8px;
}

.label,
.value {
  padding-block: 18px;
}

.label {
  min-inline-size: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--dc-muted);
  overflow-wrap: anywhere;
  unicode-bidi: plaintext;
}

.value {
  min-inline-size: 0;
  font-size: clamp(16px, 2.6cqi, 19px);
  line-height: 1.35;
  letter-spacing: -0.005em;
  color: var(--dc-muted);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
  unicode-bidi: plaintext;
}

.rowDiff .value {
  font-weight: 600;
  color: var(--dc-ink);
}

.rowDiff .label {
  color: var(--dc-accent-ink);
}

.rowDiff .empty {
  font-weight: 400;
  color: var(--dc-muted);
}

.rowLong .value {
  font-size: 15px;
  line-height: 1.55;
}

.rowLong .label {
  align-self: start;
}

/* ───────── narrow containers: label above its two values ───────── */

@container (width < 560px) {
  .root {
    --dc-cols: minmax(0, 1fr) minmax(0, 1fr);
  }

  .head::before {
    display: none;
  }

  .row {
    grid-template-areas:
      'label label'
      'a b';
  }

  .label {
    padding-block: 16px 0;
  }

  .value {
    padding-block: 6px 16px;
  }

  .label {
    grid-area: label;
    font-size: 13px;
  }

  .name {
    font-size: clamp(17px, 5.4cqi, 22px);
  }
}

@keyframes dcRise {
  from {
    opacity: 0;
    translate: 0 10px;
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .head,
  .row,
  .track,
  .thumb,
  .switchLabel {
    animation: none;
    transition: none;
  }

  .rowWrap,
  .diffOn .rowMatch {
    transition: none;
  }
}
```
