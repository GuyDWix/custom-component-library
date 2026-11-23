import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import styles from './Component.module.css';

export interface SplitFlapStat {
  value: string;
  label: string;
}

export interface SplitFlapStatsProps {
  stats?: SplitFlapStat[];
  boardColor?: string;
  digitColor?: string;
  lampColor?: string;
  className?: string;
}

export const defaultStats: SplitFlapStat[] = [
  { value: '12,480', label: 'Orders shipped' },
  { value: '98%', label: 'Arrived on time' },
  { value: '37', label: 'Cities served' },
  { value: '4.9', label: 'Average rating' },
];

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

type Phase = 'final' | 'armed' | 'played';
type RunMode = 'intro' | 'replay';
type Run = { id: number; mode: RunMode };
type Token = { ch: string; fixed: boolean };
type View = { cur: string; nxt: string | null; fall: number; land: number; id: number; final: boolean };

const DIGITS = '0123456789'.split('');
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const SEP = /^[.,:/\- ]$/;
const SEP_WIDTH = 0.36;

const FALL_FINAL = 120;
const LAND_FINAL = 300;
const LAND_LEAD = FALL_FINAL + LAND_FINAL * 0.55;
const MIN_STEP = 46;
const MAX_STEP = 125;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const cx = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(' ');

const tokenize = (value: string): Token[] =>
  Array.from(value.toUpperCase().trim()).map((ch) => ({ ch, fixed: SEP.test(ch) }));

const drumFor = (ch: string): string[] => {
  if (/[0-9]/.test(ch)) return DIGITS;
  if (/[A-Z]/.test(ch)) return LETTERS;
  return [' ', ch];
};

/** Characters a flap column visits on its way from `from` to `to`, `laps` extra turns included. */
const buildPath = (drum: string[], from: string, to: string, laps: number): string[] => {
  const len = drum.length;
  const toIdx = drum.indexOf(to);
  if (toIdx < 0) return [];
  const fromIdx = drum.indexOf(from);
  let steps = fromIdx < 0 ? toIdx + 1 : (toIdx - fromIdx + len) % len;
  steps += laps * len;
  const base = fromIdx < 0 ? -1 : fromIdx;
  const path: string[] = [];
  for (let k = 1; k <= steps; k++) path.push(drum[(((base + k) % len) + len) % len]);
  return path;
};

const landTime = (mode: RunMode, order: number, index: number) =>
  mode === 'intro' ? 1500 + order * 120 : 850 + index * 110;

const rest = (ch: string): View => ({ cur: ch, nxt: null, fall: 0, land: 0, id: 0, final: false });

function Glyph({ ch, half }: { ch: string; half: 'top' | 'bottom' }) {
  return <span className={cx(styles.glyph, half === 'top' ? styles.glyphTop : styles.glyphBottom)}>{ch.trim() ? ch : ''}</span>;
}

function StaticCell({ ch }: { ch: string }) {
  return (
    <span className={cx(styles.cell, styles.cellFixed)} aria-hidden="true">
      <span className={cx(styles.half, styles.top)}>
        <Glyph ch={ch} half="top" />
      </span>
      <span className={cx(styles.half, styles.bottom)}>
        <Glyph ch={ch} half="bottom" />
      </span>
      <span className={styles.hinge} />
    </span>
  );
}

interface FlapCellProps {
  ch: string;
  run: number;
  landAt: number;
  blank: boolean;
}

function FlapCell({ ch, run, landAt, blank }: FlapCellProps) {
  const [view, setView] = useState<View>(() => rest(ch));
  const shown = useRef(ch);
  const live = useRef({ ch, landAt });
  const running = useRef(false);
  const seq = useRef(0);
  live.current = { ch, landAt };

  useIsoLayoutEffect(() => {
    if (!blank) return;
    shown.current = '';
    setView(rest(''));
  }, [blank]);

  useEffect(() => {
    if (blank || running.current) return;
    shown.current = ch;
    setView((v) => (v.nxt === null && v.cur === ch ? v : rest(ch)));
  }, [ch, blank]);

  useEffect(() => {
    if (run === 0) return;
    const target = live.current.ch;
    const at = live.current.landAt;
    const startChar = shown.current;
    const path = buildPath(drumFor(target), startChar, target, 1);
    if (path.length === 0) return;
    const last = path.length - 1;
    const interval = last > 0 ? clamp((at - LAND_LEAD) / last, MIN_STEP, MAX_STEP) : 0;
    const lead = Math.max(0, at - LAND_LEAD - last * interval);
    const timers: number[] = [];
    running.current = true;
    path.forEach((nxt, k) => {
      const isLast = k === last;
      timers.push(
        window.setTimeout(() => {
          shown.current = nxt;
          seq.current += 1;
          setView({
            cur: k === 0 ? startChar : path[k - 1],
            nxt,
            fall: isLast ? FALL_FINAL : interval * 0.5,
            land: isLast ? LAND_FINAL : interval * 0.5,
            id: seq.current,
            final: isLast,
          });
        }, lead + k * interval),
      );
    });
    timers.push(
      window.setTimeout(() => {
        running.current = false;
        setView(rest(target));
      }, lead + last * interval + FALL_FINAL + LAND_FINAL + 40),
    );
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      running.current = false;
    };
  }, [run]);

  const nxt = view.nxt;
  const flapStyle = { '--sf-fall': `${view.fall.toFixed(0)}ms`, '--sf-land': `${view.land.toFixed(0)}ms` } as CSSProperties;

  return (
    <span className={styles.cell} aria-hidden="true">
      <span className={cx(styles.half, styles.top)}>
        <Glyph ch={nxt ?? view.cur} half="top" />
      </span>
      <span className={cx(styles.half, styles.bottom)}>
        <Glyph ch={view.cur} half="bottom" />
      </span>
      {nxt !== null && (
        <>
          <span key={`t${view.id}`} className={cx(styles.half, styles.top, styles.flapTop)} style={flapStyle}>
            <Glyph ch={view.cur} half="top" />
            <span className={styles.shadeDown} />
          </span>
          <span
            key={`b${view.id}`}
            className={cx(styles.half, styles.bottom, view.final ? styles.flapBottomFinal : styles.flapBottom)}
            style={flapStyle}
          >
            <Glyph ch={nxt} half="bottom" />
            <span className={styles.shadeUp} />
          </span>
        </>
      )}
      <span className={styles.hinge} />
    </span>
  );
}

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const BOARD_HELP = 'Hover or focus a figure to replay its flip.';

export default function SplitFlapStats({
  stats = defaultStats,
  boardColor = '#26282c',
  digitColor = '#ece5d3',
  lampColor = '#f0a23c',
  className,
}: SplitFlapStatsProps) {
  const rows = (stats.length > 0 ? stats : defaultStats).slice(0, 4).map((s) => {
    const tokens = tokenize(s.value);
    const cells = tokens.filter((t) => !t.fixed).length;
    const seps = tokens.length - cells;
    return { ...s, tokens, n: Math.max(1, cells + seps * SEP_WIDTH), count: Math.max(1, tokens.length) };
  });
  const rests = rows.slice(1);
  const restN = Math.max(1, ...rests.map((r) => r.n));
  const restCount = Math.max(1, ...rests.map((r) => r.count));
  const wideCols = Math.max(1, rests.length);

  // global cell order for the intro's staggered landing
  const orders: number[] = [];
  rows.reduce((acc, r) => {
    orders.push(acc);
    return acc + r.tokens.filter((t) => !t.fixed).length;
  }, 0);

  const [phase, setPhase] = useState<Phase>('final');
  const [reduced, setReduced] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [unlit, setUnlit] = useState<number[]>([]);

  const rootRef = useRef<HTMLElement>(null);
  const rowsRef = useRef({ rows, orders });
  rowsRef.current = { rows, orders };
  const lampTimers = useRef<number[]>([]);
  const busyUntil = useRef<number[]>([]);

  const relight = (i: number, delay: number) => {
    window.clearTimeout(lampTimers.current[i]);
    lampTimers.current[i] = window.setTimeout(() => setUnlit((u) => u.filter((x) => x !== i)), delay);
  };

  const lastLanding = (i: number, mode: RunMode) => {
    const { rows: r, orders: o } = rowsRef.current;
    const cells = r[i] ? r[i].tokens.filter((t) => !t.fixed).length : 0;
    return landTime(mode, o[i] + Math.max(0, cells - 1), Math.max(0, cells - 1));
  };

  useIsoLayoutEffect(() => {
    const mq = window.matchMedia(MOTION_QUERY);
    setReduced(mq.matches);
    if (!mq.matches) setPhase('armed');
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(MOTION_QUERY);
    const sync = () => {
      setReduced(mq.matches);
      if (mq.matches) setPhase('final');
    };
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (phase !== 'armed') return;
    const root = rootRef.current;
    const start = () => {
      const count = rowsRef.current.rows.length;
      setPhase('played');
      setRuns(Array.from({ length: count }, () => ({ id: 1, mode: 'intro' as RunMode })));
      setUnlit(Array.from({ length: count }, (_, i) => i));
      for (let i = 0; i < count; i++) {
        busyUntil.current[i] = performance.now() + lastLanding(i, 'intro') + 500;
        relight(i, lastLanding(i, 'intro') + 220);
      }
    };
    if (!root || typeof IntersectionObserver === 'undefined') {
      start();
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          io.disconnect();
          start();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, [phase]);

  useEffect(
    () => () => {
      lampTimers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  const replay = (i: number) => {
    if (phase !== 'played' || reduced) return;
    if (performance.now() < (busyUntil.current[i] ?? 0)) return;
    busyUntil.current[i] = performance.now() + lastLanding(i, 'replay') + 500;
    setRuns((prev) => {
      const next = prev.slice();
      next[i] = { id: (prev[i]?.id ?? 0) + 1, mode: 'replay' };
      return next;
    });
    setUnlit((u) => (u.includes(i) ? u : [...u, i]));
    relight(i, lastLanding(i, 'replay') + 220);
  };

  const rootStyle = {
    '--sf-flap': boardColor,
    '--sf-digit': digitColor,
    '--sf-amber': lampColor,
  } as CSSProperties;

  const boardStyle = {
    '--sf-wide-cols': wideCols,
    '--sf-rest-n': restN.toFixed(2),
    '--sf-rest-count': restCount,
  } as CSSProperties;

  const armed = phase === 'armed';
  const oddRest = rests.length % 2 === 1;

  return (
    <section
      ref={rootRef}
      className={cx(styles.root, className)}
      style={rootStyle}
      aria-label="Key figures"
      aria-description={BOARD_HELP}
    >
      <div className={styles.hall}>
        <span className={cx(styles.rod, styles.rodStart)} aria-hidden="true" />
        <span className={cx(styles.rod, styles.rodEnd)} aria-hidden="true" />
        <div className={styles.frame}>
          <span className={cx(styles.fixture, armed && styles.lightOff)} aria-hidden="true" />
          <ul className={styles.board} style={boardStyle}>
            {rows.map((row, i) => {
              const hero = i === 0;
              const run = runs[i] ?? { id: 0, mode: 'intro' as RunMode };
              const lit = !armed && !unlit.includes(i);
              let cellIndex = -1;
              const tileStyle = hero
                ? ({ '--sf-n': row.n.toFixed(2), '--sf-count': row.count } as CSSProperties)
                : undefined;
              return (
                <li
                  key={i}
                  className={cx(styles.stat, hero ? styles.statHero : styles.statRest, !hero && oddRest && i === rows.length - 1 && styles.statWide)}
                  style={tileStyle}
                  tabIndex={0}
                  onPointerEnter={() => replay(i)}
                  onFocus={() => replay(i)}
                >
                  <span className={styles.sr}>{row.value}</span>
                  <span className={styles.digits} aria-hidden="true">
                    {row.tokens.map((t, k) => {
                      if (t.fixed) return <StaticCell key={k} ch={t.ch} />;
                      cellIndex += 1;
                      return (
                        <FlapCell
                          key={k}
                          ch={t.ch}
                          run={run.id}
                          blank={armed}
                          landAt={landTime(run.mode, orders[i] + cellIndex, cellIndex)}
                        />
                      );
                    })}
                  </span>
                  <span className={cx(styles.label, hero && styles.labelHero, lit && styles.labelLit)}>
                    <span className={cx(styles.lamp, lit && phase === 'played' && styles.lampLit)} aria-hidden="true" />
                    <span className={styles.labelText}>{row.label}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <span className={cx(styles.light, armed && styles.lightOff)} aria-hidden="true" />
          <span className={styles.grain} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
