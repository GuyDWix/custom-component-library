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
