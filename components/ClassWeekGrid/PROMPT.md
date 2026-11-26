Create a custom element called "Class Week Grid". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: classes (name, day, start, end, type), types and colours, week starts on, highlight today on/off, clock format (12 or 24 hour). Add other settings if they help.

```tsx
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
```

```css
/* Studio linen: oat-white weave, sage / clay / denim paper tiles, today's column lifted off the cloth. */

.root {
  --cw-font-display: 'Bricolage Grotesque', 'Instrument Sans', system-ui, sans-serif;
  --cw-font-body: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --cw-spring: cubic-bezier(0.3, 1.35, 0.5, 1);

  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  inline-size: 100%;
  padding: 48px 28px 28px;
  border-radius: 28px;
  color: #24221e;
  font-family: var(--cw-font-body);
  font-size: 16px;
  line-height: 1.35;
  font-variant-numeric: tabular-nums;
  background: #f2eee4;
  box-shadow: inset 0 0 0 1px rgba(70, 58, 38, 0.16);
}

.root::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  border-radius: inherit;
  background:
    repeating-linear-gradient(0deg, rgba(90, 72, 44, 0.05) 0 1px, transparent 1px 4px),
    repeating-linear-gradient(90deg, rgba(90, 72, 44, 0.04) 0 1px, transparent 1px 5px),
    radial-gradient(120% 70% at 18% 0%, rgba(255, 255, 255, 0.6), transparent 62%);
}

.root::selection {
  background: #cfdcea;
  color: #24221e;
}

@supports (transition-timing-function: linear(0, 1)) {
  .root {
    --cw-spring: linear(0, 0.085 5%, 0.281 9%, 0.513 14%, 0.731 18%, 0.906 23%, 1.028 27%, 1.097 32%, 1.125 36%, 1.122 41%, 1.101 45%, 1.072 50%, 1.043 55%, 1.019 59%, 1.001 64%, 0.99 68%, 0.985 73%, 0.984 77%, 0.986 82%, 0.99 86%, 0.993 91%, 0.997 95%, 1);
  }
}

.rootCompact {
  padding: 16px 14px 18px;
  border-radius: 24px;
}

/* ---------- wide grid ---------- */

.grid {
  position: relative;
  display: grid;
  align-items: stretch;
  transition: grid-template-columns 820ms var(--cw-spring);
}

.panel {
  z-index: 1;
  margin-block: -14px;
  margin-inline: 2px;
  border-radius: 24px;
  background: #fdfbf6;
  box-shadow:
    0 0 0 1px rgba(70, 58, 38, 0.1),
    0 2px 4px rgba(60, 48, 28, 0.06),
    0 26px 40px -26px rgba(60, 48, 28, 0.45);
  opacity: 0;
  translate: 0 4px;
  transition:
    opacity 360ms ease,
    translate 820ms var(--cw-spring);
}

.panelUp {
  opacity: 1;
  translate: 0 -10px;
}

.rowLine {
  z-index: 0;
  border-block-end: 1px dashed rgba(70, 58, 38, 0.24);
  pointer-events: none;
}

.head {
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 2px;
  min-inline-size: 0;
  padding: 0 12px 12px;
}

.headName {
  font-size: 14px;
  font-weight: 650;
  line-height: 1.2;
}

.headNum {
  font-family: var(--cw-font-display);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #665e51;
}

.headToday {
  padding-block-start: 10px;
  padding-inline: 16px;
  transition: translate 820ms var(--cw-spring);
}

.headLift {
  translate: 0 -10px;
}

.todayRow {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.todayNum {
  font-family: var(--cw-font-display);
  font-size: 52px;
  font-weight: 650;
  line-height: 0.9;
  letter-spacing: -0.045em;
  color: #24221e;
}

.todayText {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-inline-size: 0;
  padding-block-end: 2px;
}

.todayName {
  font-size: 15px;
  font-weight: 650;
  line-height: 1.1;
}

.todayTag {
  align-self: flex-start;
  padding: 3px 10px;
  border-radius: 99px;
  background: #3d5f86;
  color: #fff;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.3;
}

.axis {
  z-index: 2;
  padding-block-start: 16px;
  padding-inline-end: 10px;
  font-size: 12px;
  font-weight: 560;
  line-height: 1.2;
  color: #665e51;
  white-space: nowrap;
}

.axisSuffix {
  font-weight: 450;
}

.slot {
  position: relative;
  z-index: 2;
  min-block-size: 76px;
}

.slot::after {
  content: '';
  position: absolute;
  inset-block-start: 22px;
  inset-inline-start: calc(50% - 2px);
  inline-size: 4px;
  block-size: 4px;
  border-radius: 50%;
  background: rgba(70, 58, 38, 0.2);
}

.cell {
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-inline-size: 0;
  padding: 6px;
}

.cellToday {
  padding-inline: 12px;
}

/* ---------- paper tiles ---------- */

.tile {
  --tile-ink: color-mix(in srgb, var(--c) 22%, #1b1a17);
  --tile-strong: color-mix(in srgb, var(--c) 60%, #12161a);

  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  inline-size: 100%;
  min-inline-size: 0;
  margin: 0;
  padding: 10px 11px 11px;
  border: 0;
  border-radius: 14px;
  color: var(--tile-ink);
  font: inherit;
  text-align: start;
  cursor: pointer;
  background: color-mix(in srgb, var(--c) 34%, #fdfbf6);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--c) 30%, transparent),
    0 1px 1.5px rgba(60, 48, 28, 0.1),
    0 10px 16px -12px rgba(60, 48, 28, 0.3);
  transition:
    opacity 380ms ease,
    transform 520ms var(--cw-spring),
    translate 780ms var(--cw-spring) var(--ld, 0ms),
    box-shadow 240ms ease,
    background-color 240ms ease;
}

.tile:hover {
  transform: translateY(-2px);
}

.tile:active {
  transform: scale(0.985);
  transition-duration: 120ms;
}

.tile:focus-visible {
  outline: 3px solid #2f5d8f;
  outline-offset: 3px;
}

.tileName {
  font-size: 14px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: -0.005em;
  overflow-wrap: anywhere;
}

.tileTime {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.25;
  opacity: 0.86;
  overflow-wrap: anywhere;
}

.tileType {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  opacity: 0.86;
  overflow-wrap: anywhere;
}

.tileToday {
  padding: 13px 14px 14px;
  gap: 4px;
}

.tileNameToday {
  font-size: 16px;
}

.tileLift {
  translate: 0 -14px;
}

.tileActive {
  box-shadow:
    0 0 0 2px #fdfbf6,
    0 0 0 3.5px #24221e,
    0 10px 16px -12px rgba(60, 48, 28, 0.3);
}

.tileNext {
  color: #fff;
  background: var(--tile-strong);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.18),
    0 14px 22px -12px color-mix(in srgb, var(--c) 80%, #000);
}

.tileNextActive {
  box-shadow:
    0 0 0 2px #fdfbf6,
    0 0 0 3.5px #24221e,
    0 14px 22px -12px color-mix(in srgb, var(--c) 80%, #000);
}

.tileTag {
  margin-block-start: 2px;
  padding: 2px 9px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.2);
  font-size: 12px;
  font-weight: 650;
  line-height: 1.35;
}

.tileRing::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 18px;
  border: 2px solid color-mix(in srgb, var(--c) 75%, transparent);
  opacity: 0;
  pointer-events: none;
  animation: ring 1700ms ease-out 250ms 2 both;
}

.tileDim {
  opacity: 0.16;
  transform: scale(0.96);
  box-shadow: none;
  pointer-events: none;
}

.tileHidden {
  opacity: 0;
}

.tileIn {
  animation: settle 620ms var(--cw-spring) var(--d, 0ms) backwards;
}

@keyframes settle {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.94);
  }
}

@keyframes ring {
  0% {
    opacity: 0.9;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.12, 1.18);
  }
}

/* ---------- base: selected class + type filter ---------- */

.base {
  position: relative;
  z-index: 4;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 24px;
  margin-block-start: 34px;
}

.dock {
  flex: 1 1 400px;
  min-inline-size: 0;
  padding: 8px;
  border-radius: 22px;
  background: #fdfbf6;
  box-shadow:
    0 0 0 1px rgba(70, 58, 38, 0.1),
    0 1px 2px rgba(60, 48, 28, 0.06),
    0 16px 26px -20px rgba(60, 48, 28, 0.4);
}

.dockSwap {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 8px 14px;
  animation: dockIn 520ms var(--cw-spring) backwards;
}

@keyframes dockIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

.dockSwatch {
  flex: none;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 2px;
  min-inline-size: 88px;
  padding: 12px 16px;
  border-radius: 15px;
  color: #fff;
  background: color-mix(in srgb, var(--c) 60%, #12161a);
}

.dockClock {
  font-family: var(--cw-font-display);
  font-size: 32px;
  font-weight: 650;
  line-height: 1;
  letter-spacing: -0.035em;
}

.dockSuffix {
  font-size: 13px;
  font-weight: 650;
  line-height: 1.1;
  opacity: 0.88;
}

.dockBody {
  flex: 1 1 180px;
  min-inline-size: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.dockName {
  margin: 0;
  font-family: var(--cw-font-display);
  font-size: 22px;
  font-weight: 620;
  line-height: 1.12;
  letter-spacing: -0.02em;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.dockMeta {
  margin: 0;
  font-size: 14px;
  line-height: 1.35;
  color: #665e51;
  overflow-wrap: anywhere;
}

.dockStatus {
  align-self: center;
  margin: 0 6px 0 0;
  padding: 7px 14px;
  border-radius: 99px;
  background: color-mix(in srgb, var(--c) 26%, #fdfbf6);
  color: color-mix(in srgb, var(--c) 22%, #1b1a17);
  font-size: 13px;
  font-weight: 650;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.chips {
  flex: 1 1 280px;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  min-inline-size: 0;
}

.chipsCompact {
  justify-content: flex-start;
  margin-block-start: 16px;
}

.chip {
  --chip-strong: color-mix(in srgb, var(--c, #24221e) 62%, #12161a);

  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-inline-size: 100%;
  min-block-size: 44px;
  margin: 0;
  padding: 8px 16px;
  border: 0;
  border-radius: 99px;
  color: #24221e;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  text-align: start;
  overflow-wrap: anywhere;
  cursor: pointer;
  background: rgba(253, 251, 246, 0.6);
  box-shadow: inset 0 0 0 1px rgba(70, 58, 38, 0.22);
  transition:
    background-color 220ms ease,
    color 220ms ease,
    box-shadow 220ms ease,
    transform 360ms var(--cw-spring);
}

.chip:hover {
  background: #fdfbf6;
}

.chip:active {
  transform: scale(0.96);
}

.chip:focus-visible {
  outline: 3px solid #2f5d8f;
  outline-offset: 3px;
}

.chipDot {
  flex: none;
  inline-size: 10px;
  block-size: 10px;
  border-radius: 50%;
  background: var(--c);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12);
}

.chipOn {
  color: #fff;
  background: var(--chip-strong);
  box-shadow: none;
}

.chipOn:hover {
  background: var(--chip-strong);
}

.chipDotOn {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.85);
}

.chipAll {
  --chip-strong: #24221e;
}

/* ---------- compact: one day at a time ---------- */

.strip {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  padding-block: 8px 12px;
}

.dayTab {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  min-inline-size: 0;
  min-block-size: 60px;
  margin: 0;
  padding: 6px 2px;
  border: 0;
  border-radius: 16px;
  color: #24221e;
  font: inherit;
  cursor: pointer;
  background: transparent;
  box-shadow: inset 0 0 0 1px rgba(70, 58, 38, 0.16);
  transition:
    background-color 240ms ease,
    color 240ms ease,
    translate 620ms var(--cw-spring),
    box-shadow 240ms ease;
}

.dayTab:focus-visible {
  outline: 3px solid #2f5d8f;
  outline-offset: 2px;
}

.dayTabName {
  font-size: 12px;
  font-weight: 650;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.dayTabNum {
  font-family: var(--cw-font-display);
  font-size: 19px;
  font-weight: 620;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.dayTabToday {
  translate: 0 -4px;
  background: #fdfbf6;
  box-shadow:
    0 0 0 1px rgba(70, 58, 38, 0.12),
    0 12px 16px -10px rgba(60, 48, 28, 0.45);
}

.dayTabOn {
  color: #fff;
  background: #24221e;
  box-shadow: 0 12px 16px -10px rgba(60, 48, 28, 0.55);
}

.dayTabDot {
  position: absolute;
  inset-block-end: 5px;
  inline-size: 5px;
  block-size: 5px;
  border-radius: 50%;
  background: #3d5f86;
}

.dayTabDotOn {
  background: #fff;
}

.dayPanel {
  touch-action: pan-y;
  transition: transform 520ms var(--cw-spring);
}

.dayList {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-block-size: 120px;
}

.fromNext {
  animation: slideNext 520ms var(--cw-spring) backwards;
}

.fromPrev {
  animation: slidePrev 520ms var(--cw-spring) backwards;
}

.fromRise {
  animation: rise 520ms var(--cw-spring) backwards;
}

@keyframes slideNext {
  from {
    opacity: 0;
    transform: translateX(36px);
  }
}

@keyframes slidePrev {
  from {
    opacity: 0;
    transform: translateX(-36px);
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}

.row {
  --tile-ink: color-mix(in srgb, var(--c) 22%, #1b1a17);

  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  inline-size: 100%;
  min-inline-size: 0;
  margin: 0;
  padding: 14px 16px;
  border: 0;
  border-radius: 18px;
  color: var(--tile-ink);
  font: inherit;
  text-align: start;
  cursor: pointer;
  background: color-mix(in srgb, var(--c) 34%, #fdfbf6);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--c) 30%, transparent),
    0 1px 1.5px rgba(60, 48, 28, 0.1),
    0 10px 16px -12px rgba(60, 48, 28, 0.3);
  animation: rise 520ms var(--cw-spring) var(--d, 0ms) backwards;
  transition:
    transform 360ms var(--cw-spring),
    box-shadow 240ms ease;
}

.row:active {
  transform: scale(0.985);
}

.row:focus-visible {
  outline: 3px solid #2f5d8f;
  outline-offset: 3px;
}

.rowNext {
  color: #fff;
  background: color-mix(in srgb, var(--c) 60%, #12161a);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.18),
    0 14px 22px -12px color-mix(in srgb, var(--c) 80%, #000);
}

.rowOpen {
  box-shadow:
    0 0 0 2px #fdfbf6,
    0 0 0 3.5px #24221e;
}

.rowClock {
  flex: none;
  display: flex;
  flex-direction: column;
  min-inline-size: 58px;
}

.rowTime {
  font-family: var(--cw-font-display);
  font-size: 26px;
  font-weight: 650;
  line-height: 1;
  letter-spacing: -0.035em;
}

.rowSuffix {
  margin-block-start: 3px;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.1;
  opacity: 0.85;
}

.rowBody {
  flex: 1;
  min-inline-size: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.rowName {
  font-size: 17px;
  font-weight: 650;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.rowMeta {
  font-size: 14px;
  line-height: 1.3;
  opacity: 0.88;
  overflow-wrap: anywhere;
}

.rowMore {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 480ms var(--cw-spring),
    opacity 260ms ease;
}

.rowMoreOpen {
  grid-template-rows: 1fr;
  opacity: 1;
}

.rowMoreInner {
  min-block-size: 0;
  overflow: hidden;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.empty {
  margin: 0;
  padding: 28px 16px;
  border-radius: 18px;
  text-align: center;
  font-size: 15px;
  color: #665e51;
  box-shadow: inset 0 0 0 1px rgba(70, 58, 38, 0.2);
}

/* ---------- reduced motion: a static, finished timetable ---------- */

@media (prefers-reduced-motion: reduce) {
  .grid,
  .panel,
  .head,
  .headToday,
  .tile,
  .chip,
  .dayTab,
  .dayPanel,
  .row,
  .rowMore {
    transition: none;
  }

  .tileIn,
  .tileRing::after,
  .dockSwap,
  .fromNext,
  .fromPrev,
  .fromRise,
  .row {
    animation: none;
  }
}
```
