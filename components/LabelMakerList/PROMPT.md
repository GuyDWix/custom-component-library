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
const CREAM = '#efeadd';

const isLightTape = (color: string): boolean => {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return false;
  const raw = match[1].length === 3 ? match[1].split('').map((c) => c + c).join('') : match[1];
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6;
};

const stripVars = (index: number, tape: string, textStyle: LabelTextStyle, perRow: number): CSSProperties =>
  ({
    '--tape': tape,
    '--ink-on-tape': isLightTape(tape) ? '#2a2a2e' : '#ffffff',
    '--emboss':
      textStyle === 'printed'
        ? 'none'
        : isLightTape(tape)
          ? '0 1px 0 rgba(255, 255, 255, 0.6), 0 -0.5px 0 rgba(0, 0, 0, 0.16)'
          : '0 -0.5px 0 rgba(0, 0, 0, 0.32), 0 0.5px 0 rgba(255, 255, 255, 0.2)',
    '--i': `${index}`,
    '--max-w': `calc((100% - ${(perRow - 1) * COLUMN_GAP}px) / ${perRow})`,
  }) as CSSProperties;

export default function LabelMakerList({
  labels = defaultLabels,
  tapeColor = '#2547d8',
  textStyle = 'raised',
  stripsPerRow = 3,
  className,
}: LabelMakerListProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const perRow = Math.min(6, Math.max(1, Math.round(stripsPerRow)));
  const items = labels.map((label) => label.trim()).filter(Boolean);

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

  const rootVars = {
    '--lm-tape': tapeColor,
    '--lm-ls': textStyle === 'printed' ? '0.08em' : '0.12em',
    '--lm-fw': textStyle === 'printed' ? '500' : '600',
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootVars}
    >
      {items.length > 0 && (
        <ul className={styles.list} aria-label="Labels">
          {items.map((text, i) => (
            <li
              key={i}
              className={[styles.strip, inView ? styles.stripRun : ''].filter(Boolean).join(' ')}
              style={stripVars(i, i % 2 === 0 ? tapeColor : CREAM, textStyle, perRow)}
            >
              <div className={[styles.tilt, inView ? styles.tiltRun : ''].filter(Boolean).join(' ')}>
                <span className={styles.text}>{text}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

```css
@font-face {
  font-family: 'Inter Tight';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('./fonts/inter-tight-latin.woff2') format('woff2');
}

.root {
  --lm-tape: #2547d8;
  --lm-ground: #eceef1;
  --lm-ink: #262a31;
  --lm-font: 'Inter Tight', 'Helvetica Neue', 'Segoe UI', system-ui, Arial, sans-serif;
  --lm-ls: 0.12em;
  --lm-fw: 600;
  --lm-ease: cubic-bezier(0.22, 1, 0.36, 1);

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding: clamp(36px, 8cqi, 72px) clamp(22px, 6cqi, 64px);
  border-radius: 16px;
  background: var(--lm-ground);
  color: var(--lm-ink);
  font-family: var(--lm-font);
}

.list {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.strip {
  position: relative;
  max-inline-size: var(--max-w, 100%);
}

.strip:hover {
  z-index: 3;
}

/* the strip prints out left to right, then settles */
.stripRun .tilt {
  animation: lmPrint 640ms var(--lm-ease) both;
  animation-delay: calc(120ms + var(--i, 0) * 120ms);
}

@keyframes lmPrint {
  from {
    opacity: 0;
    clip-path: inset(0 100% 0 0);
    translate: -14px 0;
  }
  25% {
    opacity: 1;
  }
  to {
    opacity: 1;
    clip-path: inset(0 0 0 0);
    translate: 0 0;
  }
}

.tilt {
  position: relative;
  box-sizing: border-box;
  inline-size: 100%;
  padding: 9px 22px 10px 18px;
  border-radius: 2px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--tape, #2547d8) 94%, #fff) 0%,
    var(--tape, #2547d8) 40%,
    color-mix(in srgb, var(--tape, #2547d8) 94%, #000) 100%
  );
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--tape, #2547d8) 82%, #000),
    0 1px 1px rgba(23, 27, 36, 0.12),
    0 6px 12px -8px rgba(23, 27, 36, 0.3);
  transition:
    translate 320ms var(--lm-ease),
    box-shadow 320ms var(--lm-ease);
}

/* squared cut at the print end: a hairline of the tape's edge, no curl */
.tilt::after {
  content: '';
  position: absolute;
  inset-block: 0;
  inset-inline-end: 0;
  inline-size: 1px;
  background: color-mix(in srgb, var(--tape, #2547d8) 70%, #000);
  opacity: 0.45;
  pointer-events: none;
}

.tilt:hover {
  translate: 0 -2px;
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--tape, #2547d8) 82%, #000),
    0 1px 1px rgba(23, 27, 36, 0.12),
    0 12px 18px -10px rgba(23, 27, 36, 0.34);
}

.text {
  position: relative;
  display: block;
  font-size: clamp(13px, 2.4cqi, 16px);
  font-weight: var(--lm-fw, 600);
  line-height: 1.2;
  letter-spacing: var(--lm-ls, 0.12em);
  text-transform: uppercase;
  color: var(--ink-on-tape, #fff);
  text-shadow: var(--emboss, none);
  overflow-wrap: anywhere;
}

.text::selection {
  background: color-mix(in srgb, var(--lm-tape, #2547d8) 62%, #000);
  color: #fff;
}

@container (max-width: 540px) {
  .list {
    gap: 12px;
  }

  .strip {
    max-inline-size: 100%;
  }

  .tilt {
    padding: 11px 20px 12px 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stripRun .tilt {
    animation: none;
  }

  .tilt {
    transition: none;
  }

  .tilt:hover {
    translate: none;
  }
}
```
