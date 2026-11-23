Create a custom element called "Label Maker List". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: labels (text), tape color, text style, strips per row. Add other settings if they help.

```tsx
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import styles from './Component.module.css';

export type LabelTextStyle = 'raised' | 'printed';

export interface LabelMakerListProps {
  labels?: string[];
  tapeColor?: string;
  textStyle?: LabelTextStyle;
  stripsPerRow?: number;
  className?: string;
}

export const defaultLabels: string[] = [
  'Key cutting',
  'Frame restoration',
  'Passport photos',
  'Knife sharpening',
  'Watch batteries',
  'Engraving',
];

const COLUMN_GAP = 16;
const TICK_MS = 34;
const STAGGER_TICKS = 7;
const START_TICKS = 4;

const pad = (n: number) => String(n).padStart(2, '0');

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
};

export default function LabelMakerList({
  labels = defaultLabels,
  tapeColor = '#c2410c',
  textStyle = 'raised',
  stripsPerRow = 3,
  className,
}: LabelMakerListProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [tick, setTick] = useState(0);
  const reduced = usePrefersReducedMotion();
  const perRow = Math.min(6, Math.max(1, Math.round(stripsPerRow)));
  const items = labels.map((label) => label.trim()).filter(Boolean);
  const lastTick = START_TICKS + (items.length - 1) * STAGGER_TICKS + Math.max(0, ...items.map((t) => t.length)) + 1;
  const done = reduced || tick >= lastTick;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || reduced) return;
    const id = window.setInterval(() => {
      setTick((t) => {
        if (t + 1 >= lastTick) window.clearInterval(id);
        return t + 1;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [inView, reduced, lastTick]);

  const rootVars = {
    '--lm-accent': tapeColor,
    '--lm-fw': textStyle === 'printed' ? '400' : '600',
    '--lm-rule': textStyle === 'printed' ? 'rgba(17, 17, 17, 0.55)' : '#111111',
    '--lm-max-w': `calc((100% - ${(perRow - 1) * COLUMN_GAP}px) / ${perRow})`,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootVars}
    >
      {items.length > 0 && (
        <>
          <div className={styles.meta} aria-hidden="true">
            <span>Index</span>
            <span>{pad(items.length)} entries</span>
          </div>
          <ul className={styles.list} aria-label="Labels">
            {items.map((text, i) => {
              const typed = done ? text.length : Math.max(0, Math.min(text.length, tick - START_TICKS - i * STAGGER_TICKS));
              const started = done || tick >= START_TICKS + i * STAGGER_TICKS;
              const typing = !done && started && typed < text.length;
              return (
                <li
                  key={i}
                  className={[styles.tag, started ? styles.tagOn : ''].filter(Boolean).join(' ')}
                  aria-label={text}
                >
                  <span className={styles.index} aria-hidden="true">{pad(i + 1)}</span>
                  <span className={styles.text} aria-hidden="true">
                    <span>{text.slice(0, typed)}</span>
                    {typing && <span className={styles.caret} />}
                    <span className={styles.rest}>{text.slice(typed)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
```

```css
@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 100 800;
  font-display: swap;
  src: url('./fonts/jetbrains-mono-latin-wght-normal.woff2') format('woff2');
}

.root {
  --lm-accent: #c2410c;
  --lm-ground: #f2f1ec;
  --lm-ink: #111111;
  --lm-mute: #5f5e59;
  --lm-rule: #111111;
  --lm-fw: 600;
  --lm-max-w: 100%;
  --lm-font: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  --lm-ease: cubic-bezier(0.22, 1, 0.36, 1);

  position: relative;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding: clamp(28px, 6cqi, 64px) clamp(20px, 5cqi, 56px) clamp(32px, 7cqi, 72px);
  background: var(--lm-ground);
  color: var(--lm-ink);
  font-family: var(--lm-font);
  font-synthesis: none;
  overflow-wrap: anywhere;
}

.meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-block-end: clamp(20px, 4cqi, 40px);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--lm-mute);
}

.list {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: clamp(10px, 1.6cqi, 16px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.tag {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 0.9em;
  box-sizing: border-box;
  max-inline-size: var(--lm-max-w);
  padding: 0.7em 1.1em 0.75em 0.9em;
  border: 1px solid var(--lm-rule);
  font-size: clamp(14px, 2.8cqi, 26px);
  line-height: 1.25;
  opacity: 0;
  transition:
    border-color 200ms var(--lm-ease),
    translate 280ms var(--lm-ease);
}

.tagOn {
  opacity: 1;
}

.tag:hover {
  border-color: var(--lm-accent);
  translate: 0 -2px;
}

.index {
  flex: none;
  font-size: 0.5em;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--lm-accent);
  font-variant-numeric: tabular-nums;
}

.text {
  min-inline-size: 0;
  font-weight: var(--lm-fw);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: pre-wrap;
}

.rest {
  visibility: hidden;
}

.caret {
  display: inline-block;
  inline-size: 0.6ch;
  block-size: 1em;
  margin-inline: 1px -0.6ch;
  vertical-align: text-bottom;
  background: var(--lm-accent);
  animation: lmBlink 520ms steps(1) infinite;
}

@keyframes lmBlink {
  50% {
    opacity: 0;
  }
}

.text::selection {
  background: var(--lm-ink);
  color: var(--lm-ground);
}

@container (max-width: 540px) {
  .tag {
    max-inline-size: 100%;
    inline-size: 100%;
    font-size: 15px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tag {
    opacity: 1;
    transition: none;
  }

  .tag:hover {
    translate: none;
  }

  .caret {
    display: none;
  }
}
```
