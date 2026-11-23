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
  textColor?: string;
  strikeColor?: string;
  insertColor?: string;
  paperColor?: string;
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
  textColor = '#26282d',
  strikeColor = '#e23d1a',
  insertColor = '#1e3fae',
  paperColor = '#fcfbf6',
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
    '--rrt-text': textColor,
    '--rrt-strike': strikeColor,
    '--rrt-insert': insertColor,
    '--rrt-paper': paperColor,
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
