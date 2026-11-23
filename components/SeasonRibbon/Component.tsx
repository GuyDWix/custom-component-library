import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface SeasonItem {
  name: string;
  /** 1 = January … 12 = December */
  firstMonth: number;
  /** 1 = January … 12 = December. A last month before the first one wraps over New Year. */
  lastMonth: number;
}

export interface SeasonRibbonProps {
  items?: SeasonItem[];
  showCurrentMonth?: boolean;
  seasonColors?: string[];
  showSeasonRange?: boolean;
  monthNames?: string[];
  nowLabel?: string;
  ariaLabel?: string;
  className?: string;
}

export const defaultItems: SeasonItem[] = [
  { name: 'English asparagus', firstMonth: 4, lastMonth: 6 },
  { name: 'Apricots', firstMonth: 6, lastMonth: 8 },
  { name: 'Damsons', firstMonth: 8, lastMonth: 10 },
  { name: 'Brussels sprouts', firstMonth: 10, lastMonth: 2 },
  { name: 'Blood oranges', firstMonth: 11, lastMonth: 3 },
];

const DEFAULT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DEFAULT_COLORS = ['var(--sr-leaf)', 'var(--sr-orange)', 'var(--sr-plum)'];
const MAX_STAGGER = 8;

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const clampMonth = (n: number) => Math.min(12, Math.max(1, Math.round(Number.isFinite(n) ? n : 1)));
const inSeason = (first: number, last: number, m: number) => (first <= last ? m >= first && m <= last : m >= first || m <= last);

type Seg = { a: number; b: number; startRound: boolean; endRound: boolean };

const segmentsFor = (first: number, last: number): Seg[] =>
  first <= last
    ? [{ a: first, b: last, startRound: true, endRound: true }]
    : [
        { a: first, b: 12, startRound: true, endRound: false },
        { a: 1, b: last, startRound: false, endRound: true },
      ];

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Phase = 'static' | 'hidden' | 'play';

export default function SeasonRibbon({
  items = defaultItems,
  showCurrentMonth = true,
  seasonColors = DEFAULT_COLORS,
  showSeasonRange = true,
  monthNames = DEFAULT_MONTHS,
  nowLabel = 'In season now',
  ariaLabel = 'Seasonal availability by month',
  className,
}: SeasonRibbonProps) {
  const [phase, setPhase] = useState<Phase>('static');
  const [now, setNow] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const hitRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useIsoLayoutEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPhase('hidden');
  }, []);

  useEffect(() => {
    setNow(new Date().getMonth() + 1);
  }, []);

  useEffect(() => {
    if (phase !== 'hidden') return;
    const el = rootRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setPhase('play');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPhase('play');
          io.disconnect();
        }
      },
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [phase]);

  const name = (m: number) => monthNames[m - 1] ?? DEFAULT_MONTHS[m - 1];
  const palette = seasonColors.length ? seasonColors : DEFAULT_COLORS;

  const rows = items.map((item, i) => {
    const first = clampMonth(item.firstMonth);
    const last = clampMonth(item.lastMonth);
    const segs = segmentsFor(first, last);
    const main = segs.length === 2 && segs[1].b - segs[1].a > segs[0].b - segs[0].a ? segs[1] : segs[0];
    const s = (main.a - 1) / 12;
    const e = main.b / 12;
    const anchorEnd = 1 - s < e;
    const range = first === last ? name(first) : `${name(first)} – ${name(last)}`;
    const live = now !== null && showCurrentMonth && inSeason(first, last, now);
    return { item, i, first, last, segs, s, e, anchorEnd, range, live, color: palette[i % palette.length] };
  });

  const active = hovered ?? focused ?? pinned;
  const activeRow = active !== null ? rows[active] : undefined;
  const nowOn = showCurrentMonth && now !== null;
  const visibleRows = Math.min(items.length, MAX_STAGGER + 1);

  const rootStyle = {
    '--sr-pin': `${240 + visibleRows * 95 + 700}ms`,
    ...(activeRow ? { '--sr-ac': activeRow.color } : null),
  } as CSSProperties;

  const move = (from: number, dir: number) => {
    const n = hitRefs.current[from + dir];
    if (n) n.focus();
  };

  const onKey = (i: number) => (ev: KeyboardEvent<HTMLButtonElement>) => {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') {
      ev.preventDefault();
      move(i, 1);
    } else if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') {
      ev.preventDefault();
      move(i, -1);
    } else if (ev.key === 'Escape') {
      setPinned(null);
    }
  };

  const onEnter = (i: number) => (ev: PointerEvent<HTMLButtonElement>) => {
    if (ev.pointerType !== 'touch') setHovered(i);
  };

  return (
    <section
      ref={rootRef}
      className={cx(styles.root, phase === 'hidden' && styles.hidden, phase === 'play' && styles.play, className)}
      style={rootStyle}
      aria-label={ariaLabel}
    >
      <div className={styles.sheet}>
        <div className={styles.plot}>
          <div className={styles.ledger} aria-hidden="true">
            {Array.from({ length: 12 }, (_, m) => (
              <span
                key={m}
                className={cx(
                  styles.col,
                  activeRow && inSeason(activeRow.first, activeRow.last, m + 1) && styles.colOn,
                  nowOn && now === m + 1 && styles.colNow,
                )}
                style={{ '--sr-n': m } as CSSProperties}
              />
            ))}
          </div>

          <div className={styles.ruler} aria-hidden="true">
            {Array.from({ length: 12 }, (_, m) => (
              <span
                key={m}
                className={cx(styles.month, activeRow && inSeason(activeRow.first, activeRow.last, m + 1) && styles.monthOn)}
              >
                <span className={styles.monthFull}>{name(m + 1)}</span>
                <span className={styles.monthInit}>{(name(m + 1) || '').charAt(0)}</span>
              </span>
            ))}
            {nowOn && now !== null && (
              <span className={styles.pin} style={{ '--sr-now': now - 1 } as CSSProperties}>
                <span className={styles.monthFull}>{name(now)}</span>
                <span className={styles.monthInit}>{(name(now) || '').charAt(0)}</span>
              </span>
            )}
          </div>

          <ul className={styles.list}>
            {rows.map((r) => {
              const rowStyle = {
                '--sr-i': Math.min(r.i, MAX_STAGGER),
                '--sr-c': r.color,
                '--sr-lx': `${r.s * 100}%`,
                '--sr-rx': `${(1 - r.e) * 100}%`,
                '--sr-lw': r.anchorEnd ? `${r.e * 100}%` : `${(1 - r.s) * 100}%`,
              } as CSSProperties;
              return (
                <li
                  key={r.i}
                  className={cx(styles.row, active === r.i && styles.rowOn, active !== null && active !== r.i && styles.rowDim)}
                  style={rowStyle}
                >
                  <button
                    type="button"
                    ref={(n) => {
                      hitRefs.current[r.i] = n;
                    }}
                    className={styles.hit}
                    aria-pressed={pinned === r.i}
                    aria-label={`${r.item.name}: ${r.range}${r.live && nowLabel ? `, ${nowLabel}` : ''}`}
                    onPointerEnter={onEnter(r.i)}
                    onPointerLeave={() => setHovered((h) => (h === r.i ? null : h))}
                    onFocus={(ev) => {
                      let visible = true;
                      try {
                        visible = ev.currentTarget.matches(':focus-visible');
                      } catch {
                        visible = true;
                      }
                      if (visible) setFocused(r.i);
                    }}
                    onBlur={() => setFocused((f) => (f === r.i ? null : f))}
                    onClick={() => setPinned((p) => (p === r.i ? null : r.i))}
                    onKeyDown={onKey(r.i)}
                  >
                    <span className={cx(styles.label, r.anchorEnd && styles.labelEnd)}>
                      <span className={styles.name}>{r.item.name}</span>
                      {showSeasonRange && <span className={styles.range}>{r.range}</span>}
                      {r.live && nowLabel && <span className={styles.badge}>{nowLabel}</span>}
                    </span>
                    <span className={styles.lane}>
                      {r.segs.map((g) => (
                        <span
                          key={g.a}
                          className={cx(styles.seg, !g.startRound && styles.flatStart, !g.endRound && styles.flatEnd)}
                          style={
                            {
                              '--sr-a': g.a - 1,
                              '--sr-w': g.b - g.a + 1,
                            } as CSSProperties
                          }
                        >
                          <span className={styles.band} />
                          <span className={styles.track}>
                            <span className={styles.curl} />
                          </span>
                        </span>
                      ))}
                      {r.live && now !== null && (
                        <span className={styles.dot} style={{ '--sr-now': now - 1 } as CSSProperties} />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
