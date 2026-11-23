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
