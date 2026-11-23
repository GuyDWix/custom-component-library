import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface ClassBlock {
  name: string;
  /** Weekday, e.g. "Mon" or "Monday" */
  day: string;
  /** 24h "18:30" or "6:30 pm" */
  start: string;
  end: string;
  /** Must match a type name */
  type: string;
}

export interface ClassType {
  name: string;
  color: string;
}

export interface DayLabel {
  short: string;
  long: string;
}

export type WeekStart = 'monday' | 'sunday' | 'saturday';
export type TimeFormat = '12h' | '24h';

export interface ClassWeekGridProps {
  classes?: ClassBlock[];
  types?: ClassType[];
  weekStartsOn?: WeekStart;
  highlightToday?: boolean;
  timeFormat?: TimeFormat;
  ariaLabel?: string;
  allLabel?: string;
  todayLabel?: string;
  nextUpLabel?: string;
  startsInLabel?: string;
  earlierLabel?: string;
  emptyLabel?: string;
  hourUnit?: string;
  minuteUnit?: string;
  dayLabels?: DayLabel[];
  className?: string;
}

export const defaultTypes: ClassType[] = [
  { name: 'Pilates', color: '#7e9b7c' },
  { name: 'Yoga', color: '#c27a5c' },
  { name: 'Strength', color: '#4b6b8c' },
];

export const defaultClasses: ClassBlock[] = [
  { name: 'Mat Pilates', day: 'Mon', start: '06:30', end: '07:15', type: 'Pilates' },
  { name: 'Strength Lab', day: 'Mon', start: '12:00', end: '12:45', type: 'Strength' },
  { name: 'Slow Flow', day: 'Mon', start: '18:00', end: '19:00', type: 'Yoga' },
  { name: 'Reformer Flow', day: 'Tue', start: '07:30', end: '08:30', type: 'Pilates' },
  { name: 'Power Yoga', day: 'Tue', start: '09:00', end: '10:00', type: 'Yoga' },
  { name: 'Strength Lab', day: 'Tue', start: '18:00', end: '19:00', type: 'Strength' },
  { name: 'Mat Pilates', day: 'Wed', start: '06:30', end: '07:15', type: 'Pilates' },
  { name: 'Strength Lab', day: 'Wed', start: '12:00', end: '12:45', type: 'Strength' },
  { name: 'Yin & Restore', day: 'Wed', start: '19:00', end: '20:00', type: 'Yoga' },
  { name: 'Reformer Flow', day: 'Thu', start: '07:30', end: '08:30', type: 'Pilates' },
  { name: 'Slow Flow', day: 'Thu', start: '09:00', end: '10:00', type: 'Yoga' },
  { name: 'Strength Lab', day: 'Thu', start: '18:00', end: '19:00', type: 'Strength' },
  { name: 'Mat Pilates', day: 'Fri', start: '06:30', end: '07:15', type: 'Pilates' },
  { name: 'Power Yoga', day: 'Fri', start: '09:00', end: '10:00', type: 'Yoga' },
  { name: 'Reformer Flow', day: 'Fri', start: '18:00', end: '19:00', type: 'Pilates' },
  { name: 'Family Yoga', day: 'Sat', start: '09:00', end: '10:00', type: 'Yoga' },
  { name: 'Reformer Flow', day: 'Sat', start: '10:30', end: '11:30', type: 'Pilates' },
  { name: 'Yin & Restore', day: 'Sun', start: '10:30', end: '11:30', type: 'Yoga' },
  { name: 'Sunday Reset', day: 'Sun', start: '18:00', end: '19:00', type: 'Pilates' },
];

export const defaultDayLabels: DayLabel[] = [
  { short: 'Sun', long: 'Sunday' },
  { short: 'Mon', long: 'Monday' },
  { short: 'Tue', long: 'Tuesday' },
  { short: 'Wed', long: 'Wednesday' },
  { short: 'Thu', long: 'Thursday' },
  { short: 'Fri', long: 'Friday' },
  { short: 'Sat', long: 'Saturday' },
];

interface Item {
  id: number;
  name: string;
  type: string;
  wd: number;
  start: number;
  end: number;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const FALLBACK_COLOR = '#8a8578';
const COMPACT_BELOW = 800;
const WEEK_MIN = 7 * 1440;

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const pad = (n: number) => String(n).padStart(2, '0');

const parseDay = (day: string) => DAY_KEYS.indexOf(day.trim().toLowerCase().slice(0, 3));

const parseTime = (raw: string): number => {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(raw.trim());
  if (!m) return -1;
  let h = Number(m[1]);
  const min = Number(m[2] ?? '0');
  const mer = m[3]?.toLowerCase();
  if (mer === 'pm' && h < 12) h += 12;
  if (mer === 'am' && h === 12) h = 0;
  if (h > 24 || min > 59) return -1;
  return h * 60 + min;
};

const clock = (mins: number, mode: TimeFormat) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  if (mode === '24h') return { text: `${pad(h)}:${pad(m)}`, suffix: '' };
  return { text: `${h % 12 || 12}:${pad(m)}`, suffix: h < 12 ? 'am' : 'pm' };
};

const range = (a: number, b: number, mode: TimeFormat) => {
  const s = clock(a, mode);
  const e = clock(b, mode);
  if (mode === '24h') return `${s.text}\u2013${e.text}`;
  if (s.suffix === e.suffix) return `${s.text}\u2013${e.text} ${e.suffix}`;
  return `${s.text} ${s.suffix}\u2013${e.text} ${e.suffix}`;
};

export default function ClassWeekGrid({
  classes = defaultClasses,
  types = defaultTypes,
  weekStartsOn = 'monday',
  highlightToday = true,
  timeFormat = '12h',
  ariaLabel = 'Weekly class timetable',
  allLabel = 'All classes',
  todayLabel = 'Today',
  nextUpLabel = 'Next up',
  startsInLabel = 'in',
  earlierLabel = 'Earlier today',
  emptyLabel = 'Nothing scheduled',
  hourUnit = 'h',
  minuteUnit = 'm',
  dayLabels = defaultDayLabels,
  className,
}: ClassWeekGridProps) {
  const rootRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const swipe = useRef({ id: -1, x: 0, y: 0, dx: 0, active: false });

  const [now, setNow] = useState<Date | null>(null);
  const [armed, setArmed] = useState(false);
  const [inView, setInView] = useState(false);
  const [lifted, setLifted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [compact, setCompact] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [dayPick, setDayPick] = useState<number | null>(null);
  const [dir, setDir] = useState(0);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setReduced(mq.matches);
      setArmed(!mq.matches);
    };
    sync();
    mq.addEventListener('change', sync);
    if (!root) return () => mq.removeEventListener('change', sync);
    const measure = () => setCompact(root.clientWidth > 0 && root.clientWidth < COMPACT_BELOW);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => {
      mq.removeEventListener('change', sync);
      ro.disconnect();
    };
  }, []);

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
      { threshold: 0.12 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!now) return;
    if (reduced || !armed) {
      setLifted(true);
      return;
    }
    if (!inView) return;
    const id = window.setTimeout(() => setLifted(true), 620);
    return () => window.clearTimeout(id);
  }, [now === null, inView, reduced, armed]); // eslint-disable-line react-hooks/exhaustive-deps

  const startIdx = weekStartsOn === 'sunday' ? 0 : weekStartsOn === 'saturday' ? 6 : 1;
  const weekOrder = useMemo(() => Array.from({ length: 7 }, (_, i) => (startIdx + i) % 7), [startIdx]);
  const colOf = (wd: number) => weekOrder.indexOf(wd);
  const labelOf = (wd: number): DayLabel => dayLabels[wd] ?? defaultDayLabels[wd];

  const items = useMemo<Item[]>(
    () =>
      classes
        .map((c, id) => ({ id, name: c.name, type: c.type, wd: parseDay(c.day), start: parseTime(c.start), end: parseTime(c.end) }))
        .filter((c) => c.wd >= 0 && c.start >= 0 && c.end >= 0)
        .sort((a, b) => weekOrder.indexOf(a.wd) - weekOrder.indexOf(b.wd) || a.start - b.start),
    [classes, weekOrder],
  );

  const allTypes = useMemo<ClassType[]>(() => {
    const known = new Set(types.map((t) => t.name));
    const extra: ClassType[] = [];
    items.forEach((i) => {
      if (!known.has(i.type)) {
        known.add(i.type);
        extra.push({ name: i.type, color: FALLBACK_COLOR });
      }
    });
    return [...types, ...extra];
  }, [types, items]);

  const colorOf = (type: string) => allTypes.find((t) => t.name === type)?.color ?? FALLBACK_COLOR;

  const matching = useMemo(() => (filter === null ? items : items.filter((i) => i.type === filter)), [items, filter]);
  const matchIds = useMemo(() => new Set(matching.map((i) => i.id)), [matching]);

  const starts = useMemo(() => Array.from(new Set(items.map((i) => i.start))).sort((a, b) => a - b), [items]);

  const todayWd = now ? now.getDay() : -1;
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : 0;
  const todayCol = highlightToday && now ? colOf(todayWd) : -1;

  const delta = (i: Item) => {
    let d = ((i.wd - todayWd + 7) % 7) * 1440 + i.start - nowMin;
    if (d <= 0) d += WEEK_MIN;
    return d;
  };

  const nextId = useMemo(() => {
    if (!now || !highlightToday) return null;
    let best: Item | null = null;
    let bestD = Infinity;
    matching.forEach((i) => {
      let d = ((i.wd - todayWd + 7) % 7) * 1440 + i.start - nowMin;
      if (d <= 0) d += WEEK_MIN;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best ? (best as Item).id : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matching, now, highlightToday]);

  const activeId = picked !== null && matchIds.has(picked) ? picked : nextId ?? matching[0]?.id ?? null;
  const activeItem = items.find((i) => i.id === activeId) ?? null;

  const dateOf = (col: number): number | null => {
    if (!now) return null;
    const offset = (todayWd - startIdx + 7) % 7;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset + col).getDate();
  };

  const span = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return [h ? `${h}${hourUnit}` : '', m ? `${m}${minuteUnit}` : ''].filter(Boolean).join(' ');
  };
  const length = (i: Item) => (i.end > i.start ? i.end - i.start : i.end + 1440 - i.start);

  const statusOf = (i: Item): string => {
    if (!now) return '';
    const isNext = i.id === nextId;
    const lead = isNext ? nextUpLabel : todayLabel;
    if (i.wd === todayWd && i.start > nowMin) return `${lead} \u00b7 ${startsInLabel} ${span(i.start - nowMin)}`;
    if (isNext) return `${lead} \u00b7 ${labelOf(i.wd).long}`;
    return i.wd === todayWd ? earlierLabel : '';
  };

  const activeCol = dayPick !== null ? dayPick : todayCol >= 0 ? todayCol : 0;

  const goDay = useCallback((to: number, from: number) => {
    const c = Math.max(0, Math.min(6, to));
    if (c === from) return;
    setDir(c > from ? 1 : -1);
    setDayPick(c);
  }, []);

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
    const step = map[e.key];
    let to = -1;
    if (step !== undefined) to = activeCol + step;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = 6;
    if (to < 0) return;
    e.preventDefault();
    const c = Math.max(0, Math.min(6, to));
    goDay(c, activeCol);
    const btns = e.currentTarget.querySelectorAll('button');
    (btns[c] as HTMLButtonElement | undefined)?.focus();
  };

  const onSwipeDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, active: false };
  };
  const onSwipeMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = swipe.current;
    if (s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.active && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      s.active = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (!s.active) return;
    s.dx = dx;
    const el = panelRef.current;
    if (el && !reduced) {
      el.style.transition = 'none';
      el.style.transform = `translateX(${(dx * 0.35).toFixed(1)}px)`;
    }
  };
  const onSwipeEnd = (e: PointerEvent<HTMLDivElement>) => {
    const s = swipe.current;
    if (s.id !== e.pointerId) return;
    s.id = -1;
    const el = panelRef.current;
    if (el) {
      el.style.transition = '';
      el.style.transform = '';
    }
    if (s.active && Math.abs(s.dx) > 56) goDay(activeCol + (s.dx < 0 ? 1 : -1), activeCol);
    s.active = false;
  };

  const phase = !armed ? 'static' : inView ? 'in' : 'armed';
  const rootStyle = {} as CSSProperties;

  const tileClass = (i: Item, c: number) =>
    [
      styles.tile,
      c === todayCol && styles.tileToday,
      c === todayCol && lifted && styles.tileLift,
      i.id === nextId && styles.tileNext,
      i.id === nextId && i.id === activeId && styles.tileNextActive,
      i.id === nextId && lifted && !reduced && styles.tileRing,
      i.id === activeId && styles.tileActive,
      !matchIds.has(i.id) && styles.tileDim,
      phase === 'armed' && styles.tileHidden,
      phase === 'in' && styles.tileIn,
    ]
      .filter(Boolean)
      .join(' ');

  const tileStyle = (i: Item, c: number, r: number) =>
    ({ '--c': colorOf(i.type), '--d': `${c * 55 + r * 28}ms`, '--ld': `${r * 34}ms` }) as CSSProperties;

  const tileLabel = (i: Item) =>
    `${i.name}, ${labelOf(i.wd).long}, ${range(i.start, i.end, timeFormat)}, ${i.type}`;

  const chips = (
    <div className={compact ? `${styles.chips} ${styles.chipsCompact}` : styles.chips} role="group" aria-label={allLabel}>
      <button type="button" className={filter === null ? `${styles.chip} ${styles.chipOn} ${styles.chipAll}` : styles.chip} aria-pressed={filter === null} onClick={() => setFilter(null)}>
        {allLabel}
      </button>
      {allTypes.map((t) => (
        <button
          key={t.name}
          type="button"
          className={filter === t.name ? `${styles.chip} ${styles.chipOn}` : styles.chip}
          style={{ '--c': t.color } as CSSProperties}
          aria-pressed={filter === t.name}
          onClick={() => setFilter(filter === t.name ? null : t.name)}
        >
          <span className={filter === t.name ? `${styles.chipDot} ${styles.chipDotOn}` : styles.chipDot} aria-hidden="true" />
          {t.name}
        </button>
      ))}
    </div>
  );

  const status = activeItem ? statusOf(activeItem) : '';
  const startClock = activeItem ? clock(activeItem.start, timeFormat) : null;

  const dock = activeItem && startClock && (
    <div className={styles.dock} style={{ '--c': colorOf(activeItem.type) } as CSSProperties} aria-live="polite">
      <div key={activeItem.id} className={styles.dockSwap}>
        <div className={styles.dockSwatch}>
          <span className={styles.dockClock}>{startClock.text}</span>
          {startClock.suffix && <span className={styles.dockSuffix}>{startClock.suffix}</span>}
        </div>
        <div className={styles.dockBody}>
          <p className={styles.dockName}>{activeItem.name}</p>
          <p className={styles.dockMeta}>
            {labelOf(activeItem.wd).long} {'\u00b7'} {range(activeItem.start, activeItem.end, timeFormat)} {'\u00b7'} {span(length(activeItem))} {'\u00b7'} {activeItem.type}
          </p>
        </div>
        {status && <p className={styles.dockStatus}>{status}</p>}
      </div>
    </div>
  );

  /* ---------- compact: one day at a time ---------- */
  if (compact) {
    const dayItems = matching.filter((i) => colOf(i.wd) === activeCol);
    return (
      <section ref={rootRef} className={[styles.root, styles.rootCompact, className].filter(Boolean).join(' ')} style={rootStyle} aria-label={ariaLabel}>
        <div className={styles.strip} role="tablist" aria-label={ariaLabel} onKeyDown={onTabKey}>
          {weekOrder.map((wd, c) => {
            const on = c === activeCol;
            const date = dateOf(c);
            const cls = [styles.dayTab, on && styles.dayTabOn, c === todayCol && styles.dayTabToday].filter(Boolean).join(' ');
            return (
              <button
                key={wd}
                type="button"
                role="tab"
                id={`cw-tab-${wd}`}
                aria-selected={on}
                aria-controls="cw-panel"
                tabIndex={on ? 0 : -1}
                className={cls}
                onClick={() => goDay(c, activeCol)}
              >
                <span className={styles.dayTabName}>{labelOf(wd).short}</span>
                <span className={styles.dayTabNum}>{date ?? '\u00a0'}</span>
                {c === todayCol && <span className={on ? `${styles.dayTabDot} ${styles.dayTabDotOn}` : styles.dayTabDot} aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <div
          ref={panelRef}
          className={styles.dayPanel}
          id="cw-panel"
          role="tabpanel"
          aria-labelledby={`cw-tab-${weekOrder[activeCol]}`}
          onPointerDown={onSwipeDown}
          onPointerMove={onSwipeMove}
          onPointerUp={onSwipeEnd}
          onPointerCancel={onSwipeEnd}
        >
          <div key={`${activeCol}-${filter}`} className={[styles.dayList, dir > 0 ? styles.fromNext : dir < 0 ? styles.fromPrev : styles.fromRise].join(' ')}>
            {dayItems.length === 0 && <p className={styles.empty}>{emptyLabel}</p>}
            {dayItems.map((i, k) => {
              const s = clock(i.start, timeFormat);
              const open = i.id === activeId;
              const cls = [styles.row, i.id === nextId && styles.rowNext, open && styles.rowOpen].filter(Boolean).join(' ');
              return (
                <button
                  key={i.id}
                  type="button"
                  className={cls}
                  style={{ '--c': colorOf(i.type), '--d': `${k * 50}ms` } as CSSProperties}
                  aria-pressed={open}
                  aria-label={tileLabel(i)}
                  onClick={() => setPicked(i.id)}
                >
                  <span className={styles.rowClock}>
                    <span className={styles.rowTime}>{s.text}</span>
                    {s.suffix && <span className={styles.rowSuffix}>{s.suffix}</span>}
                  </span>
                  <span className={styles.rowBody}>
                    <span className={styles.rowName}>{i.name}</span>
                    <span className={styles.rowMeta}>
                      {range(i.start, i.end, timeFormat)} {'\u00b7'} {i.type}
                    </span>
                    <span className={open ? `${styles.rowMore} ${styles.rowMoreOpen}` : styles.rowMore}>
                      <span className={styles.rowMoreInner}>
                        {span(length(i))}
                        {statusOf(i) ? ` \u00b7 ${statusOf(i)}` : ''}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {chips}
      </section>
    );
  }

  /* ---------- wide: the week at a glance ---------- */
  const cols = `4.5rem ${weekOrder.map((_, c) => (c === todayCol && lifted ? '1.8fr' : '1fr')).join(' ')}`;
  const byCell = new Map<string, Item[]>();
  items.forEach((i) => {
    const key = `${colOf(i.wd)}-${starts.indexOf(i.start)}`;
    byCell.set(key, [...(byCell.get(key) ?? []), i]);
  });
  const rowCount = starts.length;

  return (
    <section ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle} aria-label={ariaLabel}>
      <div className={styles.grid} style={{ gridTemplateColumns: cols, gridTemplateRows: `auto repeat(${rowCount}, auto)` }}>
        {todayCol >= 0 && (
          <span
            className={lifted ? `${styles.panel} ${styles.panelUp}` : styles.panel}
            style={{ gridColumn: todayCol + 2, gridRow: `1 / span ${rowCount + 1}` }}
            aria-hidden="true"
          />
        )}
        {starts.map((s, r) => (
          <span key={`l${s}`} className={styles.rowLine} style={{ gridColumn: '1 / -1', gridRow: r + 2 }} aria-hidden="true" />
        ))}

        {weekOrder.map((wd, c) => {
          const isToday = c === todayCol;
          const date = dateOf(c);
          return (
            <div
              key={`h${wd}`}
              className={isToday ? `${styles.head} ${styles.headToday} ${lifted ? styles.headLift : ''}` : styles.head}
              style={{ gridColumn: c + 2, gridRow: 1 }}
              aria-hidden="true"
            >
              {isToday ? (
                <>
                  <span className={styles.todayRow}>
                    <span className={styles.todayNum}>{date}</span>
                    <span className={styles.todayText}>
                      <span className={styles.todayName}>{labelOf(wd).short}</span>
                      <span className={styles.todayTag}>{todayLabel}</span>
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <span className={styles.headName}>{labelOf(wd).short}</span>
                  <span className={styles.headNum}>{date ?? '\u00a0'}</span>
                </>
              )}
            </div>
          );
        })}

        {starts.map((s, r) => {
          const t = clock(s, timeFormat);
          return (
            <span key={`a${s}`} className={styles.axis} style={{ gridColumn: 1, gridRow: r + 2 }} aria-hidden="true">
              {t.text}
              {t.suffix && <span className={styles.axisSuffix}> {t.suffix}</span>}
            </span>
          );
        })}

        {starts.flatMap((_, r) =>
          weekOrder.map((wd, c) => {
            const list = byCell.get(`${c}-${r}`);
            const place = { gridColumn: c + 2, gridRow: r + 2 };
            if (!list) return <span key={`${c}-${r}`} className={styles.slot} style={place} aria-hidden="true" />;
            return (
              <div key={`${c}-${r}`} className={c === todayCol ? `${styles.cell} ${styles.cellToday}` : styles.cell} style={place}>
                {list.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className={tileClass(i, c)}
                    style={tileStyle(i, c, r)}
                    aria-pressed={i.id === activeId}
                    aria-label={tileLabel(i)}
                    aria-hidden={!matchIds.has(i.id) || undefined}
                    tabIndex={matchIds.has(i.id) ? 0 : -1}
                    onClick={() => setPicked(i.id)}
                  >
                    <span className={c === todayCol ? `${styles.tileName} ${styles.tileNameToday}` : styles.tileName}>{i.name}</span>
                    <span className={styles.tileTime}>{range(i.start, i.end, timeFormat)}</span>
                    {c === todayCol && <span className={styles.tileType}>{i.type}</span>}
                    {i.id === nextId && <span className={styles.tileTag}>{nextUpLabel}</span>}
                  </button>
                ))}
              </div>
            );
          }),
        )}
      </div>

      <div className={styles.base}>
        {dock}
        {chips}
      </div>
    </section>
  );
}
