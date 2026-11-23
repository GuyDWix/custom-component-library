import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import styles from './Component.module.css';

export interface InkBleedHeadlineProps {
  /** The headline text, split letter by letter. */
  headline?: string;
  /** Ink color (sumi blue-black by default). */
  inkColor?: string;
  /** Paper tone behind the ink. */
  paperTone?: string;
  /** Playback speed multiplier: 0.5 (slow) to 2 (fast), 1 is the default pace. */
  speed?: number;
  className?: string;
}

type Word = string[];

const SETTLE_MS = 860;
const STAGGER_MS = 72;
const BASE_MS = 150;
const DOT_LAG = 0.42;
const MAX_SOLID_WORD = 10;

const toWords = (text: string): Word[] =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => Array.from(word));

export default function InkBleedHeadline({
  headline = 'The quiet weight of ink',
  inkColor = '#1d2733',
  paperTone = '#f6f0e1',
  speed = 1,
  className,
}: InkBleedHeadlineProps) {
  const [motion, setMotion] = useState<'wait' | 'run' | 'paused'>('wait');
  const rootRef = useRef<HTMLDivElement>(null);
  const rawId = useId();
  const filterId = `ib${rawId.replace(/[^a-zA-Z0-9]/g, '')}-ink`;

  const pace = Math.min(2, Math.max(0.5, speed || 1));
  const settleMs = Math.round(SETTLE_MS / pace);
  const staggerMs = Math.round(STAGGER_MS / pace);
  const baseMs = Math.round(BASE_MS / pace);

  const words = toWords(headline ?? '');
  const letterCount = words.reduce((sum, word) => sum + word.length, 0);
  const dotDelayMs = baseMs + letterCount * staggerMs + settleMs * DOT_LAG;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (typeof IntersectionObserver === 'undefined') {
      setMotion('run');
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setMotion('run');
        else setMotion((state) => (state === 'run' ? 'paused' : state));
      },
      { threshold: 0.25, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const rootStyle = {
    '--ib-ink': inkColor,
    '--ib-paper': paperTone,
    '--ib-filter': `url(#${filterId})`,
    '--ib-settle-ms': `${settleMs}ms`,
  } as CSSProperties;

  const letterStyle = (index: number) =>
    ({ '--ib-delay': `${baseMs + index * staggerMs}ms` }) as CSSProperties;

  let letterIndex = 0;

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
      data-motion={motion}
    >
      <svg className={styles.defs} aria-hidden="true" focusable="false">
        <defs>
          <filter id={filterId} x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="11" result="grain" />
            <feDisplacementMap in="SourceGraphic" in2="grain" scale="1.7" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="0.32" />
          </filter>
        </defs>
      </svg>

      <span className={styles.fibre} aria-hidden="true" />
      <span className={styles.light} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />

      <h2 className={styles.ink}>
        {words.map((word, wi) => {
          const solid = word.length <= MAX_SOLID_WORD;
          const start = letterIndex;
          letterIndex += word.length;
          return (
            <span key={wi} className={solid ? styles.word : styles.wordLoose}>
              {word.map((ch, ci) => (
                <span
                  key={ci}
                  className={styles.letter}
                  data-ch={ch}
                  style={letterStyle(start + ci)}
                >
                  {ch}
                </span>
              ))}
            </span>
          );
        })}
        {letterCount > 0 && (
          <span
            className={styles.dot}
            style={{ '--ib-delay': `${Math.round(dotDelayMs)}ms` } as CSSProperties}
            aria-hidden="true"
          />
        )}
      </h2>
    </div>
  );
}
