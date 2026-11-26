import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export type SeatLayout = 'theatre' | 'tables' | 'benches';

export interface SeatMapCapacityProps {
  totalSeats?: number;
  seatsTaken?: number;
  rows?: number;
  layout?: SeatLayout;
  calloutText?: string;
  soldOutText?: string;
  title?: string;
  stageLabel?: string;
  availableLabel?: string;
  takenLabel?: string;
  rowLabel?: string;
  tableLabel?: string;
  seatLabel?: string;
  className?: string;
}

interface Seat {
  x: number;
  y: number;
  rot: number;
  group: number;
  num: number;
  depth: number;
}

interface Plan {
  seats: Seat[];
  tables: { x: number; y: number }[];
  benches: { x1: number; x2: number; y: number }[];
  box: { x: number; y: number; w: number; h: number };
}

const CELL = 12;
const ROW_GAP = 13;
const FAN = 1.25;
const TABLE_PITCH = 56;
const TABLE_R = 11;
const TABLE_SEAT_R = 18.5;
const NARROW_PX = 520;

const clampInt = (v: number, min: number, max: number) => Math.round(Math.min(max, Math.max(min, Number.isFinite(v) ? v : min)));

const hash = (i: number) => {
  let h = Math.imul(i + 1, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

const rowName = (i: number): string => (i < 26 ? String.fromCharCode(65 + i) : rowName(Math.floor(i / 26) - 1) + rowName(i % 26));

const distribute = (total: number, weights: number[]) => {
  const sum = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((w) => Math.max(1, Math.floor((total * w) / sum)));
  let diff = total - counts.reduce((a, b) => a + b, 0);
  for (let i = counts.length - 1; diff !== 0; i = (i - 1 + counts.length) % counts.length) {
    if (diff > 0) {
      counts[i]++;
      diff--;
    } else if (counts[i] > 1) {
      counts[i]--;
      diff++;
    }
  }
  return counts;
};

function theatre(total: number, rowCount: number, narrow: boolean): Pick<Plan, 'seats'> {
  const fan = narrow ? 0.85 : FAN;
  const raw = (total * CELL) / fan - (ROW_GAP * rowCount * (rowCount - 1)) / 2;
  const base = Math.max(34, raw / rowCount);
  const radii = Array.from({ length: rowCount }, (_, r) => base + r * ROW_GAP);
  const counts = distribute(total, radii);
  const seats: Seat[] = [];
  counts.forEach((n, r) => {
    const step = CELL / radii[r];
    for (let k = 0; k < n; k++) {
      const a = (k - (n - 1) / 2) * step;
      seats.push({
        x: radii[r] * Math.sin(a),
        y: radii[r] * Math.cos(a),
        rot: (-a * 180) / Math.PI,
        group: r,
        num: k + 1,
        depth: rowCount > 1 ? r / (rowCount - 1) : 0,
      });
    }
  });
  return { seats };
}

function benches(total: number, rowCount: number): Pick<Plan, 'seats' | 'benches'> {
  const counts = distribute(total, Array(rowCount).fill(1)).sort((a, b) => b - a);
  const seats: Seat[] = [];
  const bars: Plan['benches'] = [];
  const aisle = CELL * 1.5;
  counts.forEach((n, r) => {
    const left = Math.ceil(n / 2);
    const blocks = [
      { count: left, end: -aisle / 2 },
      { count: n - left, start: aisle / 2 },
    ];
    const y = r * (ROW_GAP + 2);
    blocks.forEach((b) => {
      if (!b.count) return;
      const x0 = b.start ?? (b.end as number) - b.count * CELL;
      for (let k = 0; k < b.count; k++) {
        seats.push({
          x: x0 + (k + 0.5) * CELL,
          y,
          rot: 0,
          group: r,
          num: seats.filter((s) => s.group === r).length + 1,
          depth: rowCount > 1 ? r / (rowCount - 1) : 0,
        });
      }
      bars.push({ x1: x0 + 1, x2: x0 + b.count * CELL - 1, y: y + 5.2 });
    });
  });
  return { seats, benches: bars };
}

function tables(total: number, rowCount: number, narrow: boolean): Pick<Plan, 'seats' | 'tables'> {
  const perTable = total <= 24 ? 4 : total <= 60 ? 6 : 8;
  const tableCount = Math.ceil(total / perTable);
  let perRow = Math.max(Math.ceil(tableCount / rowCount), Math.ceil(Math.sqrt(tableCount * 1.6)));
  if (narrow) perRow = Math.min(perRow, 3);
  const rowsUsed = Math.ceil(tableCount / perRow);
  const seats: Seat[] = [];
  const centers: Plan['tables'] = [];
  let left = total;
  for (let t = 0; t < tableCount; t++) {
    const r = Math.floor(t / perRow);
    const inRow = Math.min(perRow, tableCount - r * perRow);
    const c = t % perRow;
    const shift = perRow > 1 && r % 2 === 1 ? TABLE_PITCH * 0.25 : 0;
    const cx = (c - (inRow - 1) / 2) * TABLE_PITCH + shift;
    const cy = r * TABLE_PITCH;
    centers.push({ x: cx, y: cy });
    const n = Math.min(perTable, left);
    left -= n;
    for (let k = 0; k < n; k++) {
      const a = (Math.PI * 2 * k) / perTable + Math.PI / perTable;
      seats.push({
        x: cx + TABLE_SEAT_R * Math.sin(a),
        y: cy - TABLE_SEAT_R * Math.cos(a),
        rot: 180 + (a * 180) / Math.PI,
        group: t,
        num: k + 1,
        depth: rowsUsed > 1 ? r / (rowsUsed - 1) : 0,
      });
    }
  }
  return { seats, tables: centers };
}

function buildPlan(layout: SeatLayout, total: number, rowCount: number, narrow: boolean): Plan {
  const rowsFit = Math.min(rowCount, total);
  const part =
    layout === 'tables' ? tables(total, rowsFit, narrow) : layout === 'benches' ? benches(total, rowsFit) : theatre(total, rowsFit, narrow);
  const plan: Plan = { tables: [], benches: [], box: { x: 0, y: 0, w: 1, h: 1 }, ...part };
  const pad = layout === 'tables' ? TABLE_SEAT_R + 6 : 9;
  const xs = plan.seats.map((s) => s.x).concat(plan.tables.map((t) => t.x));
  const ys = plan.seats.map((s) => s.y).concat(plan.tables.map((t) => t.y));
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  plan.box = { x: minX, y: minY, w: Math.max(...xs) + pad - minX, h: Math.max(...ys) + pad - minY };
  return plan;
}

function takeOrder(plan: Plan, layout: SeatLayout) {
  const halfW = plan.box.w / 2 || 1;
  const centerX = plan.box.x + halfW;
  const score = plan.seats.map((s, i) => {
    const jitter = layout === 'tables' ? hash(s.group * 7 + 3) * 1.4 + hash(i) * 0.25 : hash(i) * 1.5;
    return s.depth * 2.4 + (Math.abs(s.x - centerX) / halfW) * 1.3 + jitter;
  });
  const order = plan.seats.map((_, i) => i).sort((a, b) => score[a] - score[b]);
  const rank = new Array<number>(plan.seats.length);
  order.forEach((seat, r) => {
    rank[seat] = r;
  });
  return rank;
}

const fill = (template: string, values: Record<string, number>) =>
  template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));

export default function SeatMapCapacity({
  totalSeats = 96,
  seatsTaken = 84,
  rows = 8,
  layout = 'theatre',
  calloutText = '{count} seats left',
  soldOutText = 'Sold out',
  title = 'Friday Late Show · Main Hall',
  stageLabel = 'Stage',
  availableLabel = 'Available',
  takenLabel = 'Taken',
  rowLabel = 'Row',
  tableLabel = 'Table',
  seatLabel = 'Seat',
  className,
}: SeatMapCapacityProps) {
  const total = clampInt(totalSeats, 1, 400);
  const taken = clampInt(seatsTaken, 0, total);
  const free = total - taken;
  const rowCount = clampInt(rows, 1, 40);

  const rootRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [armed, setArmed] = useState(false);
  const [active, setActive] = useState(-1);
  const [announce, setAnnounce] = useState('');
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glowId = `sm-glow-${uid}`;

  const plan = useMemo(() => buildPlan(layout, total, rowCount, narrow), [layout, total, rowCount, narrow]);
  const rank = useMemo(() => takeOrder(plan, layout), [plan, layout]);
  const freeOrder = useMemo(() => {
    const order: number[] = [];
    let n = 0;
    rank.forEach((r, i) => {
      order[i] = r >= taken ? n++ : -1;
    });
    return order;
  }, [rank, taken]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < NARROW_PX));
    ro.observe(root);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return () => ro.disconnect();
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setArmed(true);
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(root);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  useEffect(() => setActive(-1), [plan]);

  const isTaken = (i: number) => rank[i] < taken;
  const describe = (i: number) => {
    const s = plan.seats[i];
    const group = layout === 'tables' ? `${tableLabel} ${s.group + 1}` : `${rowLabel} ${rowName(s.group)}`;
    return `${group} · ${seatLabel} ${s.num} · ${isTaken(i) ? takenLabel : availableLabel}`;
  };

  const move = (e: KeyboardEvent<HTMLDivElement>) => {
    const count = plan.seats.length;
    const cur = active < 0 ? 0 : active;
    let next = -1;
    if (e.key === 'ArrowRight') next = (cur + 1) % count;
    else if (e.key === 'ArrowLeft') next = (cur - 1 + count) % count;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      const from = plan.seats[cur];
      let best = Infinity;
      plan.seats.forEach((s, i) => {
        const dy = (s.y - from.y) * dir;
        if (dy < 4) return;
        const d = dy + Math.abs(s.x - from.x) * 2;
        if (d < best) {
          best = d;
          next = i;
        }
      });
      if (next < 0) next = cur;
    } else if (e.key === 'Escape') {
      setActive(-1);
      return;
    } else return;
    e.preventDefault();
    setActive(next);
    setAnnounce(describe(next));
  };

  const onFocus = () => {
    if (active >= 0) return;
    const first = freeOrder.findIndex((n) => n === 0);
    const start = first >= 0 ? first : 0;
    setActive(start);
    setAnnounce(describe(start));
  };

  const { box } = plan;
  const activeSeat = active >= 0 ? plan.seats[active] : null;
  const tipX = activeSeat ? ((activeSeat.x - box.x) / box.w) * 100 : 50;
  const tipY = activeSeat ? ((activeSeat.y - box.y) / box.h) * 100 : 50;
  const tipStyle = { '--tx': `${tipX}%`, '--ty': `${tipY}%`, '--shift': tipY < 28 ? '14px' : 'calc(-100% - 14px)' } as CSSProperties;
  const tipAlign = tipX < 22 ? styles.tipStart : tipX > 78 ? styles.tipEnd : '';

  const callout = free === 0 ? soldOutText : calloutText;
  const [before, after] = free > 0 && callout.includes('{count}') ? callout.split('{count}', 2) : [callout, null];
  const summary = `${title ? `${title}. ` : ''}${free === 0 ? soldOutText : fill(calloutText, { count: free })}. ${taken} ${takenLabel}, ${free} ${availableLabel}, ${total} total.`;
  const help = 'Use the arrow keys to move between seats; Escape hides the seat label.';

  const seatSize = narrow ? 10 : 9;
  const seatPath = layout === 'benches';

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      data-layout={layout}
      data-narrow={narrow || undefined}
    >
      <span className={styles.paper} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.callout}>
          {title && <p className={styles.title}>{title}</p>}
          <p className={styles.calloutLine}>
            {after !== null ? (
              <>
                {before && <span className={styles.calloutText}>{before}</span>}
                <span className={styles.count}>{free}</span>
                <span className={styles.calloutText}>{after}</span>
              </>
            ) : (
              <span className={free === 0 ? styles.soldOut : styles.calloutText}>{before}</span>
            )}
          </p>
        </div>
        <ul className={styles.legend}>
          <li className={styles.legendItem}>
            <span className={styles.swatchFree} aria-hidden="true" />
            <span className={styles.legendLabel}>{availableLabel}</span>
            <span className={styles.legendCount}>{free}</span>
          </li>
          <li className={styles.legendItem}>
            <span className={styles.swatchTaken} aria-hidden="true" />
            <span className={styles.legendLabel}>{takenLabel}</span>
            <span className={styles.legendCount}>{taken}</span>
          </li>
        </ul>
      </header>

      <div className={styles.house}>
        {stageLabel && layout !== 'tables' && (
          <div className={styles.stage} aria-hidden="true">
            <span className={styles.stageText}>{stageLabel}</span>
          </div>
        )}

        <div
          className={styles.plan}
          role="group"
          tabIndex={0}
          aria-label={summary}
          aria-description={help}
          onKeyDown={move}
          onFocus={onFocus}
          onBlur={() => setActive(-1)}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(-1)}
        >
          <svg
            className={styles.svg}
            viewBox={`${box.x.toFixed(2)} ${box.y.toFixed(2)} ${box.w.toFixed(2)} ${box.h.toFixed(2)}`}
            aria-hidden="true"
          >
            <defs>
              <radialGradient id={glowId}>
                <stop offset="0%" className={styles.glowStop} stopOpacity="0.85" />
                <stop offset="100%" className={styles.glowStop} stopOpacity="0" />
              </radialGradient>
            </defs>

            {plan.tables.map((t, i) => (
              <g key={`t${i}`}>
                <circle className={styles.table} cx={t.x} cy={t.y} r={TABLE_R} />
                <circle className={styles.tableInner} cx={t.x} cy={t.y} r={TABLE_R - 3.2} />
              </g>
            ))}
            {plan.benches.map((b, i) => (
              <rect key={`b${i}`} className={styles.bench} x={b.x1} y={b.y - 1.3} width={b.x2 - b.x1} height={2.6} rx={1.3} />
            ))}

            {plan.seats.map((s, i) => {
              const tk = isTaken(i);
              const delay = tk ? (rank[i] / Math.max(1, taken)) * 1300 : 0;
              const breathe = freeOrder[i] >= 0 ? (freeOrder[i] % 9) * 110 : 0;
              const seatStyle = {
                '--d': `${(tk ? delay : 500 + breathe).toFixed(0)}ms`,
                '--mix': `${Math.round(s.depth * 70)}%`,
              } as CSSProperties;
              const h = seatSize * 0.8;
              return (
                <g
                  key={i}
                  transform={`translate(${s.x.toFixed(2)} ${s.y.toFixed(2)}) rotate(${s.rot.toFixed(1)})`}
                  onPointerEnter={() => setActive(i)}
                  onPointerDown={() => setActive(i)}
                >
                  <rect className={styles.hit} x={-CELL / 2} y={-CELL / 2} width={CELL} height={CELL} />
                  {!tk && <circle className={[styles.glow, armed ? styles.glowAnim : ''].join(' ')} style={seatStyle} r={9} fill={`url(#${glowId})`} />}
                  <g className={[styles.seat, armed && tk ? styles.popAnim : ''].join(' ')} style={seatStyle}>
                    {!seatPath && (
                      <rect
                        className={tk ? styles.backTaken : styles.backFree}
                        x={-seatSize * 0.54}
                        y={h / 2 - 1.2}
                        width={seatSize * 1.08}
                        height={2.6}
                        rx={1.3}
                      />
                    )}
                    <rect
                      className={tk ? styles.cushionTaken : styles.cushionFree}
                      x={-seatSize / 2}
                      y={-h / 2 - 0.8}
                      width={seatSize}
                      height={h}
                      rx={seatSize * 0.3}
                    />
                  </g>
                </g>
              );
            })}

            {activeSeat && (
              <circle
                className={styles.ring}
                style={{ transform: `translate(${activeSeat.x}px, ${activeSeat.y - 0.4}px)` }}
                r={seatSize * 0.82}
              />
            )}
          </svg>

          <span
            className={[styles.tip, tipAlign, activeSeat ? styles.tipOn : ''].join(' ')}
            style={tipStyle}
            aria-hidden="true"
          >
            {active >= 0 ? describe(active) : ''}
          </span>
        </div>
        <span className={styles.srOnly} aria-live="polite">
          {announce}
        </span>
      </div>
    </div>
  );
}
