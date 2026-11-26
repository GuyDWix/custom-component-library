Create a custom element called "Redline Revision Text". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: sentence with edits (text, optional replacement word), proof label, handwritten note. Add other settings if they help.

```tsx
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { AnimationEvent, CSSProperties, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface RedlineSegment {
  text: string;
  replacement?: string;
}

export interface RedlineRevisionTextProps {
  segments?: RedlineSegment[];
  label?: string;
  note?: string;
  className?: string;
}

export const defaultSegments: RedlineSegment[] = [
  { text: 'We write ' },
  { text: 'copy', replacement: 'stories' },
  { text: ' that ' },
  { text: 'nobody reads', replacement: 'people remember' },
  { text: ', ' },
  { text: 'eventually', replacement: 'from line one' },
  { text: '.' },
];

type Phase = 'final' | 'idle' | 'run';
type Cue = { strikeAt: number; caretAt: number; writeAt: number; writeFor: number };

const START = 0.5;
const STRIKE = 0.55;
const GAP = 0.45;

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const isEdit = (s: RedlineSegment) => Boolean(s.replacement && s.replacement !== s.text);
const typeScale = (chars: number) => Math.min(1, Math.max(0.5, Math.sqrt(70 / Math.max(chars, 1))));
const sec = (n: number) => `${n.toFixed(2)}s`;
const cx = (...names: (string | false)[]) => names.filter(Boolean).join(' ');

function buildCues(segments: RedlineSegment[]) {
  let t = START;
  const cues = segments.map((s): Cue | null => {
    if (!isEdit(s)) return null;
    const strikeAt = t;
    const caretAt = t + (s.text.trim() ? STRIKE * 0.8 : 0);
    const writeAt = caretAt + 0.2;
    const writeFor = Math.min(1.6, Math.max(0.5, 0.3 + (s.replacement ?? '').length * 0.045));
    t = writeAt + writeFor + GAP;
    return { strikeAt, caretAt, writeAt, writeFor };
  });
  return { cues, end: t - GAP + 0.15 };
}

export default function RedlineRevisionText({
  segments = defaultSegments,
  label = 'Galley proof · Homepage, line 1',
  note = 'Sharper. Ship it. — R.',
  className,
}: RedlineRevisionTextProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('final');
  const [visible, setVisible] = useState(true);
  const [done, setDone] = useState(false);
  const [runId, setRunId] = useState(0);
  const doneRef = useRef(false);

  const { cues, end } = useMemo(() => buildCues(segments), [segments]);
  const lastEdit = cues.reduce((last, c, i) => (c ? i : last), -1);
  const hasEdits = lastEdit >= 0;
  const finalText = segments.map((s) => (isEdit(s) ? s.replacement : s.text)).join('');

  useIsoLayoutEffect(() => {
    if (!hasEdits || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPhase((p) => (query.matches ? 'final' : p === 'final' ? 'idle' : p));
    sync();
    query.addEventListener?.('change', sync);
    return () => query.removeEventListener?.('change', sync);
  }, [hasEdits]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || phase === 'final') return;
    if (typeof IntersectionObserver === 'undefined') {
      setPhase('run');
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setPhase((p) => (p === 'idle' ? 'run' : p));
        else if (doneRef.current) {
          doneRef.current = false;
          setDone(false);
          setPhase('idle');
        }
      },
      { threshold: 0.35 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [phase === 'final']);

  const replay = useCallback(() => {
    doneRef.current = false;
    setDone(false);
    setRunId((r) => r + 1);
    setPhase('run');
  }, []);

  const onPointerEnter = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && phase === 'run' && done) replay();
  };

  const onAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).dataset.last === '1') {
      doneRef.current = true;
      setDone(true);
    }
  };

  const run = phase === 'run';
  const idle = phase === 'idle';
  const rootStyle = {
    '--rrt-play': visible ? 'running' : 'paused',
    '--rrt-scale': typeScale(finalText.length).toFixed(3),
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={cx(styles.root, className ?? false)}
      style={rootStyle}
      onPointerEnter={onPointerEnter}
      onAnimationEnd={onAnimationEnd}
    >
      <div className={styles.underSheet} aria-hidden="true" />
      <div className={styles.sheet}>
        <div className={styles.grain} aria-hidden="true" />
        <div className={styles.cropMarks} aria-hidden="true" />
        <div className={styles.slug}>
          {label && <span className={styles.label}>{label}</span>}
        </div>

        <p className={styles.srOnly}>{finalText}</p>
        <p key={runId} className={styles.sentence} aria-hidden="true">
          {segments.map((s, i) => {
            const cue = cues[i];
            if (!cue) return <span key={i}>{s.text}</span>;
            const cueStyle = {
              '--strike-at': sec(cue.strikeAt),
              '--caret-at': sec(cue.caretAt),
              '--write-at': sec(cue.writeAt),
              '--write-for': sec(cue.writeFor),
            } as CSSProperties;
            const last = i === lastEdit && !note;
            return (
              <span key={i} className={styles.edit} style={cueStyle}>
                <span className={styles.old}>
                  <span className={cx(styles.strike, idle && styles.strikeIdle, run && styles.strikeRun)}>{s.text}</span>
                </span>
                <span className={styles.insertWrap}>
                  <span
                    className={cx(styles.insert, idle && styles.insertIdle, run && styles.insertRun)}
                    data-last={last ? '1' : undefined}
                  >
                    {s.replacement}
                  </span>
                </span>
                <svg className={cx(styles.caret, idle && styles.caretIdle, run && styles.caretRun)} viewBox="0 0 24 14">
                  <path d="M2.5 12.5 C 7 9, 10 5, 12 1.8 C 14 5, 17 9, 21.5 12.5" />
                </svg>
              </span>
            );
          })}
        </p>

        {note && (
          <p key={`n${runId}`} className={styles.noteRow} aria-hidden="true">
            <span
              className={cx(styles.note, idle && styles.noteIdle, run && styles.noteRun)}
              style={{ '--write-at': sec(end), '--write-for': sec(0.9) } as CSSProperties}
              data-last={hasEdits ? '1' : undefined}
            >
              {note}
            </span>
          </p>
        )}
        {note && <p className={styles.srOnly}>{note}</p>}
      </div>
    </div>
  );
}
```

```css
.root {
  --insert: #1e3fae;
  --rrt-font-type: 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif;
  --rrt-font-hand: 'Bradley Hand', 'Segoe Print', 'Noteworthy', 'Chalkboard SE', 'Comic Neue', cursive;
  --rrt-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --rrt-spring: cubic-bezier(0.34, 1.7, 0.5, 1);
  position: relative;
  container-type: inline-size;
  inline-size: 100%;
  box-sizing: border-box;
  padding-block: 14px 22px;
  padding-inline: 10px;
  color: #26282d;
  font-family: var(--rrt-font-type);
}

.underSheet {
  position: absolute;
  inset-block: 22px 12px;
  inset-inline: 22px 4px;
  border-radius: 3px;
  background: color-mix(in srgb, #fcfbf6 88%, #b9b2a2);
  transform: rotate(1.6deg);
  box-shadow: 0 1px 2px rgba(40, 34, 24, 0.14), 0 18px 40px -22px rgba(40, 34, 24, 0.45);
}

.sheet {
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  padding-block: clamp(20px, 4.5cqi, 44px) clamp(22px, 5cqi, 48px);
  padding-inline: clamp(20px, 6.5cqi, 72px);
  border-radius: 3px;
  background: linear-gradient(176deg, #fcfbf6 0%, color-mix(in srgb, #fcfbf6 94%, #d9d0bd) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    inset 0 0 0 1px rgba(60, 50, 30, 0.06),
    0 1px 1px rgba(40, 34, 24, 0.08),
    0 4px 10px -4px rgba(40, 34, 24, 0.14),
    0 28px 60px -28px rgba(40, 34, 24, 0.42);
}

.sheet::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(120% 80% at 12% 0%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 55%);
}

.grain {
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  background-size: 200px 200px;
  opacity: 0.32;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.cropMarks {
  position: absolute;
  inset: 10px;
  z-index: -1;
  pointer-events: none;
  --m: rgba(38, 40, 45, 0.28);
  background:
    linear-gradient(var(--m), var(--m)) 0 0 / 14px 1px no-repeat,
    linear-gradient(var(--m), var(--m)) 0 0 / 1px 14px no-repeat,
    linear-gradient(var(--m), var(--m)) 100% 0 / 14px 1px no-repeat,
    linear-gradient(var(--m), var(--m)) 100% 0 / 1px 14px no-repeat,
    linear-gradient(var(--m), var(--m)) 0 100% / 14px 1px no-repeat,
    linear-gradient(var(--m), var(--m)) 0 100% / 1px 14px no-repeat,
    linear-gradient(var(--m), var(--m)) 100% 100% / 14px 1px no-repeat,
    linear-gradient(var(--m), var(--m)) 100% 100% / 1px 14px no-repeat;
}

.slug {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  min-block-size: 44px;
  padding-block-end: 10px;
  margin-block-end: clamp(14px, 3.4cqi, 30px);
  border-block-end: 1px solid color-mix(in srgb, #26282d 16%, transparent);
}

.label {
  min-inline-size: 0;
  font-size: 15px;
  font-variant-caps: all-small-caps;
  letter-spacing: 0.12em;
  color: color-mix(in srgb, #26282d 68%, transparent);
  overflow-wrap: anywhere;
}

.srOnly {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.sentence {
  margin: 0;
  padding-block-start: 0.45em;
  font-size: clamp(24px, calc(6.4cqi * var(--rrt-scale, 1)), 64px);
  font-weight: 500;
  line-height: 2.15;
  letter-spacing: -0.018em;
  text-wrap: pretty;
  overflow-wrap: break-word;
  color: #26282d;
}

.edit {
  position: relative;
  display: inline-grid;
  max-inline-size: 100%;
  justify-items: center;
  line-height: 1.15;
  vertical-align: baseline;
}

.old {
  grid-area: 1 / 1;
  align-self: end;
  max-inline-size: 100%;
  color: color-mix(in srgb, #26282d 72%, transparent);
}

.strike {
  padding-inline: 0.06em;
  background-image: linear-gradient(-2.2deg, transparent 47%, #e23d1a 47.5%, #e23d1a 57%, transparent 57.5%);
  background-repeat: no-repeat;
  background-position: 0 58%;
  background-size: 100% 0.5em;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}

.strikeIdle {
  background-size: 0% 0.5em;
}

.strikeRun {
  animation: rrtStrike 0.55s var(--rrt-ease-out) var(--strike-at) both;
  animation-play-state: var(--rrt-play, running);
}

.insertWrap {
  grid-area: 1 / 1;
  align-self: end;
  max-inline-size: 100%;
  transform: translateY(-1.5em) rotate(-2.4deg);
  font-family: var(--rrt-font-hand);
  font-size: 0.66em;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.1;
  text-align: center;
  white-space: normal;
  overflow-wrap: anywhere;
}

.insert {
  display: inline-block;
  padding-inline: 0.1em 0.2em;
  color: var(--insert);
  text-shadow: 0 0 0.6px color-mix(in srgb, var(--insert) 70%, transparent);
}

.insertIdle {
  clip-path: inset(-30% 102% -30% -6%);
}

.insertRun {
  animation: rrtWrite var(--write-for) cubic-bezier(0.45, 0.05, 0.3, 1) var(--write-at) both;
  animation-play-state: var(--rrt-play, running);
}

.caret {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-end: -0.24em;
  inline-size: 0.36em;
  block-size: 0.24em;
  margin-inline-start: -0.18em;
  overflow: visible;
  fill: none;
  stroke: var(--insert);
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  transform-origin: 50% 100%;
}

.caretIdle {
  transform: scaleY(0);
  opacity: 0;
}

.caretRun {
  animation: rrtCaret 0.42s var(--rrt-spring) var(--caret-at) both;
  animation-play-state: var(--rrt-play, running);
}

.noteRow {
  margin: 0;
  margin-block-start: clamp(10px, 2.6cqi, 24px);
  text-align: end;
}

.note {
  display: inline-block;
  max-inline-size: 100%;
  padding-inline: 0.1em 0.3em;
  font-family: var(--rrt-font-hand);
  font-size: clamp(18px, 3cqi, 26px);
  font-weight: 700;
  line-height: 1.3;
  color: var(--insert);
  transform: rotate(-3deg);
  overflow-wrap: anywhere;
}

.noteIdle {
  clip-path: inset(-30% 102% -30% -6%);
}

.noteRun {
  animation: rrtWrite var(--write-for) cubic-bezier(0.45, 0.05, 0.3, 1) var(--write-at) both;
  animation-play-state: var(--rrt-play, running);
}

@keyframes rrtStrike {
  from {
    background-size: 0% 0.5em;
  }
  to {
    background-size: 100% 0.5em;
  }
}

@keyframes rrtCaret {
  from {
    transform: scaleY(0);
    opacity: 0;
  }
  to {
    transform: scaleY(1);
    opacity: 1;
  }
}

@keyframes rrtWrite {
  from {
    clip-path: inset(-30% 102% -30% -6%);
    filter: blur(1.2px);
    opacity: 0.6;
  }
  60% {
    filter: blur(0);
    opacity: 1;
  }
  to {
    clip-path: inset(-30% -6% -30% -6%);
    filter: blur(0);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .strikeRun,
  .insertRun,
  .caretRun,
  .noteRun {
    animation: none;
  }
}
```
