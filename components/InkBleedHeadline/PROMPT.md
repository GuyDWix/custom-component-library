Create a custom element called "Ink Bleed Headline". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: headline text, ink color, paper tone, speed. Add other settings if they help.

```tsx
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
```

```css
.root {
  --ib-ink: #1d2733;
  --ib-paper: #f6f0e1;
  --ib-font: Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', Times, serif;
  --ib-fibre: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='220'><filter id='a'><feTurbulence type='fractalNoise' baseFrequency='0.012 0.68' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.27  0 0 0 0.4 0'/></filter><rect width='100%' height='100%' filter='url(%23a)'/></svg>");
  --ib-fleck: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='b'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.36  0 0 0 0 0.3  0 0 0 0 0.21  0 0 0 0.34 0'/></filter><rect width='100%' height='100%' filter='url(%23b)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding: clamp(48px, 9%, 108px) clamp(24px, 6.5%, 84px);
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--ib-ink) 9%, transparent);
  background:
    radial-gradient(130% 100% at 12% 0%, color-mix(in srgb, #fff 48%, var(--ib-paper)) 0%, transparent 58%),
    var(--ib-paper);
  color: var(--ib-ink);
  font-family: var(--ib-font);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #fff 55%, transparent),
    0 40px 80px -52px color-mix(in srgb, var(--ib-ink) 62%, transparent);
}

.defs {
  position: absolute;
  inline-size: 0;
  block-size: 0;
  overflow: hidden;
  pointer-events: none;
}

.fibre,
.light,
.grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.fibre {
  background-image: var(--ib-fibre), var(--ib-fleck);
  mix-blend-mode: multiply;
  opacity: 0.34;
}

.light {
  background:
    radial-gradient(85% 55% at 78% -12%, color-mix(in srgb, #fff 42%, transparent) 0%, transparent 62%),
    linear-gradient(180deg, transparent 62%, color-mix(in srgb, var(--ib-ink) 7%, transparent) 100%);
  mix-blend-mode: soft-light;
}

.grain {
  background-image: var(--ib-fleck);
  mix-blend-mode: multiply;
  opacity: 0.1;
  z-index: 2;
}

.ink {
  position: relative;
  z-index: 1;
  margin: 0;
  font-family: var(--ib-font);
  font-size: clamp(38px, 9.4cqi, 112px);
  font-weight: 600;
  line-height: 1.06;
  letter-spacing: -0.015em;
  text-wrap: balance;
  color: var(--ib-ink);
  filter: var(--ib-filter, none);
}

.ink::selection,
.letter::selection,
.word::selection,
.wordLoose::selection {
  background: var(--ib-ink);
  color: var(--ib-paper);
}

.word,
.wordLoose {
  overflow-wrap: anywhere;
}

.letter {
  position: relative;
  display: inline-block;
  letter-spacing: -0.015em;
  opacity: 0;
  transform: scale(1.2);
  transform-origin: 50% 72%;
  text-shadow: 0 0 0.028em color-mix(in srgb, var(--ib-ink) 38%, transparent);
}

.letter::before {
  content: attr(data-ch);
  position: absolute;
  inset: 0;
  z-index: -1;
  color: var(--ib-ink);
  opacity: 0;
  filter: blur(0.16em);
  transform: scale(1.65);
  transform-origin: 50% 60%;
  pointer-events: none;
}

.dot {
  display: inline-block;
  inline-size: 0.17em;
  block-size: 0.14em;
  margin-inline-start: 0.16em;
  border-radius: 54% 46% 58% 42% / 46% 62% 38% 54%;
  background: var(--ib-ink);
  box-shadow: 0 0 0.16em 0 color-mix(in srgb, var(--ib-ink) 42%, transparent);
  opacity: 0;
  transform: scale(0);
  transform-origin: 32% 62%;
}

[data-motion='run'] .letter,
[data-motion='paused'] .letter {
  animation: ib-settle var(--ib-settle-ms) cubic-bezier(0.16, 1, 0.3, 1) var(--ib-delay) both;
  will-change: transform, opacity;
}

[data-motion='run'] .letter::before,
[data-motion='paused'] .letter::before {
  animation: ib-blot calc(var(--ib-settle-ms) * 1.35) cubic-bezier(0.33, 0.66, 0.34, 1) var(--ib-delay) both;
}

[data-motion='run'] .dot,
[data-motion='paused'] .dot {
  animation: ib-dot calc(var(--ib-settle-ms) * 0.62) cubic-bezier(0.2, 1.3, 0.4, 1) var(--ib-delay) both;
}

[data-motion='paused'] .letter,
[data-motion='paused'] .letter::before,
[data-motion='paused'] .dot {
  animation-play-state: paused;
}

@keyframes ib-settle {
  0% {
    opacity: 0;
    transform: scale(1.2);
  }
  34% {
    opacity: 0.5;
  }
  62% {
    opacity: 0.88;
    transform: scale(1.035);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes ib-blot {
  0% {
    opacity: 0;
    filter: blur(0.2em);
    transform: scale(1.85);
  }
  22% {
    opacity: 0.82;
    filter: blur(0.12em);
    transform: scale(1.42);
  }
  44% {
    opacity: 0.58;
    filter: blur(0.15em);
    transform: scale(1.6);
  }
  74% {
    opacity: 0.28;
    filter: blur(0.07em);
    transform: scale(1.14);
  }
  100% {
    opacity: 0;
    filter: blur(0.025em);
    transform: scale(0.96);
  }
}

@keyframes ib-dot {
  0% {
    opacity: 0;
    transform: scale(0) rotate(-14deg);
  }
  58% {
    opacity: 1;
    transform: scale(1.5) rotate(3deg);
  }
  82% {
    transform: scale(0.85) rotate(-1deg);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .letter,
  .dot {
    opacity: 1;
    transform: none;
    animation: none;
  }

  .letter::before {
    opacity: 0;
    animation: none;
  }

  [data-motion='run'] .letter,
  [data-motion='run'] .letter::before,
  [data-motion='run'] .dot,
  [data-motion='paused'] .letter,
  [data-motion='paused'] .letter::before,
  [data-motion='paused'] .dot {
    animation: none;
    will-change: auto;
  }
}
```
