Create a custom element called "Seat Map Capacity". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: total seats, seats taken, rows, seat layout style (theatre, round tables, benches), call-out text (with the number of seats left) and sold-out text, event title, stage label, labels for available, taken, row, table and seat. Add other settings if they help.

```tsx
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
```

```css
.root {
  --sm-font-display: 'Fraunces', 'Playfair Display', 'Iowan Old Style', Georgia, serif;
  --sm-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  display: grid;
  gap: 28px;
  padding-block: 28px 32px;
  padding-inline: 22px;
  border-radius: 24px;
  border: 1px solid rgba(43, 21, 25, 0.12);
  background: #f6efe2;
  color: #2b1519;
  font-family: var(--sm-font-ui);
  box-shadow: 0 1px 2px rgba(43, 21, 25, 0.05), 0 18px 40px -24px rgba(43, 21, 25, 0.28);
}

.paper,
.grain {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}

.paper {
  background:
    radial-gradient(70% 55% at 50% 62%, color-mix(in srgb, #e8be5e 16%, transparent) 0%, transparent 70%),
    repeating-linear-gradient(0deg, transparent 0 23px, color-mix(in srgb, #2b1519 4%, transparent) 23px 24px),
    repeating-linear-gradient(90deg, transparent 0 23px, color-mix(in srgb, #2b1519 4%, transparent) 23px 24px),
    linear-gradient(180deg, #f6efe2 0%, #ede2cf 100%);
  -webkit-mask-image: linear-gradient(180deg, #000 30%, rgba(0, 0, 0, 0.6) 100%);
  mask-image: linear-gradient(180deg, #000 30%, rgba(0, 0, 0, 0.6) 100%);
}

.grain {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.2  0 0 0 0 0.15  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  opacity: 0.18;
  mix-blend-mode: multiply;
}

.header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px 28px;
}

.callout {
  display: grid;
  gap: 6px;
  min-inline-size: 0;
}

.title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(43, 21, 25, 0.62);
  overflow-wrap: anywhere;
}

.calloutLine {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 12px;
  font-family: var(--sm-font-display);
  color: #2b1519;
}

.count {
  font-size: clamp(56px, 13cqi, 84px);
  font-weight: 600;
  line-height: 0.9;
  letter-spacing: -0.045em;
  font-variant-numeric: tabular-nums lining-nums;
  color: #6e1e2c;
}

.calloutText {
  font-size: clamp(22px, 4.6cqi, 30px);
  font-style: italic;
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: -0.015em;
  overflow-wrap: anywhere;
}

.soldOut {
  font-size: clamp(40px, 9cqi, 64px);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.035em;
  color: #6e1e2c;
  overflow-wrap: anywhere;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.legendItem {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-block-size: 36px;
  padding-inline: 12px 14px;
  border-radius: 999px;
  border: 1px solid rgba(43, 21, 25, 0.12);
  background: color-mix(in srgb, #f6efe2 70%, #fff);
  font-size: 14px;
  max-inline-size: 100%;
}

.legendLabel {
  color: rgba(43, 21, 25, 0.62);
  overflow-wrap: anywhere;
}

.legendCount {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.swatchFree,
.swatchTaken {
  flex: none;
  inline-size: 12px;
  block-size: 10px;
  border-radius: 3px;
}

.swatchFree {
  background: #c99d43;
  box-shadow: 0 0 0 1px #9a7426 inset, 0 0 8px color-mix(in srgb, #e8be5e 70%, transparent);
}

.swatchTaken {
  background: #6e1e2c;
}

.house {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 18px;
}

.stage {
  display: grid;
  place-items: center;
  inline-size: min(46%, 320px);
  min-inline-size: 140px;
  block-size: 30px;
  border-radius: 6px 6px 50% 50% / 6px 6px 100% 100%;
  background: #4a2342;
  color: #f6efe2;
}

.stageText {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  padding-block-end: 4px;
  max-inline-size: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan {
  position: relative;
  inline-size: min(100%, 760px);
  border-radius: 12px;
  outline: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.plan:focus-visible {
  box-shadow: 0 0 0 2px #f6efe2, 0 0 0 4px #2b1519;
}

.svg {
  display: block;
  inline-size: 100%;
  block-size: auto;
  overflow: visible;
}

.hit {
  fill: transparent;
}

.table {
  fill: #e6d9c2;
  stroke: color-mix(in srgb, #2b1519 18%, transparent);
  stroke-width: 0.5;
}

.tableInner {
  fill: none;
  stroke: color-mix(in srgb, #2b1519 10%, transparent);
  stroke-width: 0.4;
}

.bench {
  fill: color-mix(in srgb, #2b1519 18%, #f6efe2);
}

.seat {
  transform-box: fill-box;
  transform-origin: center;
  pointer-events: none;
}

.cushionTaken {
  fill: color-mix(in srgb, #4a2342 var(--mix), #6e1e2c);
}

.backTaken {
  fill: color-mix(in srgb, color-mix(in srgb, #4a2342 var(--mix), #6e1e2c) 78%, #000);
}

.cushionFree {
  fill: #c99d43;
  stroke: #9a7426;
  stroke-width: 0.5;
}

.backFree {
  fill: #9a7426;
}

.glow {
  pointer-events: none;
  opacity: 0.55;
  transform-box: fill-box;
  transform-origin: center;
}

.glowAnim {
  animation: breathe 2000ms cubic-bezier(0.45, 0, 0.55, 1) var(--d) 2 backwards;
}

.popAnim {
  animation: pop 560ms cubic-bezier(0.34, 1.5, 0.64, 1) var(--d) backwards;
}

@keyframes pop {
  0% {
    opacity: 0;
    transform: scale(0.35);
  }
  55% {
    opacity: 1;
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes breathe {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(1);
  }
  50% {
    opacity: 0.95;
    transform: scale(1.22);
  }
}

.ring {
  fill: none;
  stroke: #2b1519;
  stroke-width: 0.9;
  pointer-events: none;
  transition: transform 220ms cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

.tip {
  position: absolute;
  inset-inline-start: var(--tx);
  inset-block-start: var(--ty);
  z-index: 2;
  max-inline-size: min(260px, 80%);
  padding-block: 7px;
  padding-inline: 11px;
  border-radius: 8px;
  background: #2b1519;
  color: #f6efe2;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 8px 20px -8px rgba(43, 21, 25, 0.45);
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, var(--shift));
  scale: 0.96;
  transition:
    opacity 160ms ease-out,
    scale 200ms cubic-bezier(0.2, 0.9, 0.3, 1.1),
    inset-inline-start 200ms cubic-bezier(0.2, 0.9, 0.3, 1),
    inset-block-start 200ms cubic-bezier(0.2, 0.9, 0.3, 1);
}

.tipStart {
  translate: calc(50% - 12px) 0;
}

.tipEnd {
  translate: calc(-50% + 12px) 0;
}

.tipOn {
  opacity: 1;
  scale: 1;
}

.srOnly {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@container (min-width: 720px) {
  .root {
    padding-block: 36px 40px;
    padding-inline: 40px;
    gap: 34px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .glowAnim,
  .popAnim {
    animation: none;
  }

  .ring,
  .tip {
    transition: none;
  }
}

.glowStop {
  stop-color: #e8be5e;
}
```
