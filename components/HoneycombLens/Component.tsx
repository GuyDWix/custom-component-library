import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface HoneycombLensPhoto {
  image: string;
  caption?: string;
  alt?: string;
}

export interface HoneycombLensProps {
  photos?: HoneycombLensPhoto[];
  cellSize?: number;
  lensStrength?: number;
  className?: string;
}

const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=640&h=640&fit=crop&auto=format&q=70`;

export const defaultPhotos: HoneycombLensPhoto[] = [
  { image: img('1558642452-9d2a7deb7f62'), caption: 'Wildflower honey, poured slow' },
  { image: img('1509440159596-0249088772ff'), caption: 'Rye and spelt loaves' },
  { image: img('1567620905732-2d1ec7ab7445'), caption: 'Buttermilk stack' },
  { image: img('1495474472287-4d71bcdd2085'), caption: 'Flat whites for two' },
  { image: img('1499636136210-6f4ee915583e'), caption: 'Brown butter cookies' },
  { image: img('1490750967868-88aa4486c946'), caption: 'Poppies from the hive field' },
  { image: img('1484723091739-30a097e8f929'), caption: 'Brioche French toast' },
  { image: img('1488477181946-6428a0291777'), caption: 'Strawberry cream pots' },
  { image: img('1482049016688-2d3e1b311543'), caption: 'Soft eggs on greens' },
  { image: img('1563729784474-d77dbb933a9e'), caption: 'Rose cupcakes' },
  { image: img('1476224203421-9ac39bcb3327'), caption: 'The brunch board' },
  { image: img('1517248135467-4c7edcad34c4'), caption: 'Our dining room' },
  { image: img('1546069901-ba9599a7e63c'), caption: 'Salmon harvest bowl' },
  { image: img('1414235077428-338989a2e8c0'), caption: 'Supper club, Fridays' },
  { image: img('1506354666786-959d6d497f1a'), caption: 'Wood-fired pizza' },
  { image: img('1551218808-94e220e084d2'), caption: 'Prep at first light' },
];

type Cell = { x: number; y: number };
type Grid = { w: number; h: number; width: number; height: number; cells: Cell[] };
type Lens = { x: number; y: number; p: number; vx: number; vy: number; vp: number };

const SQRT3 = Math.sqrt(3);
const STIFFNESS = 150;
const DAMPING = 20;
const REST_PRESENCE = 0.72;
const FALLOFF = 1.3;
const GRID_HELP = 'Move across the honeycomb to magnify photos. Arrow keys move between photos; Enter opens one.';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function buildGrid(avail: number, count: number, cellSize: number, margin: number): Grid {
  const fit = Math.max(3, Math.floor(avail / cellSize - 2 * margin));
  const cols = Math.max(1, Math.min(fit, count));
  const w = Math.max(40, Math.min(cellSize, avail / (cols + 2 * margin)));
  const h = (w * 2) / SQRT3;
  const cells: Cell[] = [];
  let row = 0;
  while (cells.length < count) {
    const full = row % 2 === 0 ? cols : Math.max(1, cols - 1);
    const n = Math.min(full, count - cells.length);
    const start = (cols * w - full * w) / 2 + Math.floor((full - n) / 2) * w;
    for (let i = 0; i < n; i++) cells.push({ x: start + w / 2 + i * w, y: h / 2 + row * h * 0.75 });
    row++;
  }
  return { w, h, width: cols * w, height: h + (row - 1) * h * 0.75, cells };
}

function nearest(cells: Cell[], x: number, y: number) {
  let best = 0;
  let bestD = Infinity;
  cells.forEach((c, i) => {
    const d = (c.x - x) ** 2 + (c.y - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

export default function HoneycombLens({
  photos = defaultPhotos,
  cellSize = 150,
  lensStrength = 60,
  className,
}: HoneycombLensProps) {
  const uid = useId();
  const [avail, setAvail] = useState(900);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [focusIndex, setFocusIndex] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lens = useRef<Lens>({ x: 0, y: 0, p: 0, vx: 0, vy: 0, vp: 0 });
  const target = useRef({ x: 0, y: 0, p: 0 });
  const active = useRef(-1);
  const started = useRef(false);
  const touched = useRef(false);
  const frame = useRef(0);

  const strength = clamp(lensStrength, 0, 100) / 100;
  const size = clamp(cellSize, 60, 320);
  const margin = 0.18 + strength * 0.32;
  const grid = useMemo(() => buildGrid(avail, photos.length, size, margin), [avail, photos.length, size, margin]);
  const gridState = useRef({ grid, strength, reduced });
  gridState.current = { grid, strength, reduced };
  const swell = Math.round(grid.w * margin);

  const setActive = useCallback((i: number) => {
    if (active.current === i) return;
    cellRefs.current[active.current]?.style.setProperty('--hc-on', '0');
    cellRefs.current[i]?.style.setProperty('--hc-on', '1');
    active.current = i;
  }, []);

  const paint = useCallback(() => {
    const { grid: g, strength: s } = gridState.current;
    const l = lens.current;
    g.cells.forEach((c, i) => {
      const el = cellRefs.current[i];
      if (!el) return;
      const dx = c.x - l.x;
      const dy = c.y - l.y;
      const dist = Math.hypot(dx, dy) || 1;
      const q = dist / g.w / FALLOFF;
      const near = Math.exp(-q * q);
      const scale = 1 + l.p * s * (1.05 * near - 0.22 * (1 - near));
      const push = l.p * s * g.w * 0.62 * q * near;
      el.style.transform = `translate3d(${((dx / dist) * push).toFixed(2)}px, ${((dy / dist) * push).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      el.style.zIndex = String(Math.round(scale * 100));
      el.style.setProperty('--hc-lift', (l.p * near).toFixed(3));
      el.style.setProperty('--hc-veil', (l.p * s * (1 - near) * 0.8).toFixed(3));
    });
    setActive(l.p > 0.25 ? nearest(g.cells, l.x, l.y) : -1);
  }, [setActive]);

  const run = useCallback(() => {
    if (frame.current || gridState.current.reduced) return;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const l = lens.current;
      const t = target.current;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let n = 0; n < steps; n++) {
        l.vx += (STIFFNESS * (t.x - l.x) - DAMPING * l.vx) * h;
        l.vy += (STIFFNESS * (t.y - l.y) - DAMPING * l.vy) * h;
        l.vp += (STIFFNESS * 0.6 * (t.p - l.p) - DAMPING * 0.8 * l.vp) * h;
        l.x += l.vx * h;
        l.y += l.vy * h;
        l.p += l.vp * h;
      }
      paint();
      const moving =
        Math.abs(l.vx) + Math.abs(l.vy) > 0.5 ||
        Math.abs(t.x - l.x) + Math.abs(t.y - l.y) > 0.3 ||
        Math.abs(l.vp) + Math.abs(t.p - l.p) > 0.002;
      frame.current = moving ? requestAnimationFrame(loop) : 0;
    };
    frame.current = requestAnimationFrame(loop);
  }, [paint]);

  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
  }, []);

  const aimAt = useCallback(
    (x: number, y: number, p: number) => {
      touched.current = true;
      target.current = { x, y, p };
      if (gridState.current.reduced) setActive(nearest(gridState.current.grid.cells, x, y));
      else run();
    },
    [run, setActive],
  );

  const settle = useCallback(() => {
    const { cells } = gridState.current.grid;
    const c = cells[nearest(cells, target.current.x, target.current.y)];
    if (c) aimAt(c.x, c.y, REST_PRESENCE);
  }, [aimAt]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(([entry]) => setAvail(Math.max(120, entry.contentRect.width)));
    ro.observe(root);
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(root);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    if (reduced) {
      stop();
      cellRefs.current.forEach((el) => el?.removeAttribute('style'));
      active.current = -1;
      const rest = grid.cells[nearest(grid.cells, grid.width / 2, grid.height / 2)];
      if (rest) setActive(nearest(grid.cells, rest.x, rest.y));
      return;
    }
    if (!inView) {
      stop();
      return;
    }
    if (!started.current && grid.cells.length) {
      started.current = true;
      const rest = grid.cells[nearest(grid.cells, grid.width / 2, grid.height / 2)];
      lens.current = { x: rest.x, y: rest.y, p: 0, vx: 0, vy: 0, vp: 0 };
      target.current = { x: rest.x, y: rest.y, p: REST_PRESENCE };
    } else if (!touched.current) {
      const rest = grid.cells[nearest(grid.cells, grid.width / 2, grid.height / 2)];
      target.current = { x: rest.x, y: rest.y, p: REST_PRESENCE };
      lens.current = { ...lens.current, x: rest.x, y: rest.y, vx: 0, vy: 0 };
    } else {
      const t = target.current;
      const c = grid.cells[nearest(grid.cells, t.x, t.y)];
      if (c) target.current = { x: c.x, y: c.y, p: t.p };
    }
    paint();
    run();
    return stop;
  }, [reduced, inView, grid, paint, run, stop, setActive]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openIndex !== null && !dialog.open) dialog.showModal();
    if (openIndex === null && dialog.open) dialog.close();
  }, [openIndex]);

  const localPoint = (e: PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerMove = (e: PointerEvent<HTMLUListElement>) => {
    if (e.pointerType !== 'mouse' && e.buttons === 0) return;
    const { x, y } = localPoint(e);
    aimAt(x, y, 1);
  };

  const onPointerDown = (e: PointerEvent<HTMLUListElement>) => {
    if (e.pointerType === 'mouse') return;
    const { x, y } = localPoint(e);
    aimAt(x, y, 1);
  };

  const onPointerEnd = (e: PointerEvent<HTMLUListElement>) => {
    if (e.type === 'pointerleave' && e.pointerType !== 'mouse') return;
    settle();
  };

  const focusCell = (i: number) => {
    setFocusIndex(i);
    cellRefs.current[i]?.focus();
  };

  const onCellFocus = (i: number) => {
    setFocusIndex(i);
    const c = grid.cells[i];
    if (c) aimAt(c.x, c.y, 1);
  };

  const onGridBlur = (e: FocusEvent<HTMLUListElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) settle();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const cells = grid.cells;
    const here = cells[focusIndex];
    if (!here) return;
    let next = -1;
    if (e.key === 'ArrowRight') next = Math.min(cells.length - 1, focusIndex + 1);
    else if (e.key === 'ArrowLeft') next = Math.max(0, focusIndex - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = cells.length - 1;
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const rowY = here.y + (e.key === 'ArrowDown' ? 1 : -1) * grid.h * 0.75;
      let best = -1;
      let bestD = Infinity;
      cells.forEach((c, i) => {
        if (Math.abs(c.y - rowY) > 1) return;
        const d = Math.abs(c.x - here.x);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      next = best;
    }
    if (next < 0) return;
    e.preventDefault();
    focusCell(next);
  };

  const open = openIndex !== null ? photos[openIndex] : undefined;
  const rootStyle = { '--hc-swell': `${swell}px`, '--hc-w': `${grid.w.toFixed(1)}px` } as CSSProperties;
  const gridStyle = { inlineSize: grid.width, blockSize: grid.height } as CSSProperties;

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <span className={styles.comb} aria-hidden="true" />
      <span className={styles.glow} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />

      <ul
        ref={gridRef}
        className={styles.grid}
        style={gridStyle}
        aria-description={GRID_HELP}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerEnd}
        onKeyDown={onKeyDown}
        onBlur={onGridBlur}
      >
        {photos.map((photo, i) => {
          const c = grid.cells[i];
          if (!c) return null;
          const label = photo.alt || photo.caption || `Photo ${i + 1}`;
          const slotStyle = {
            insetInlineStart: c.x - grid.w / 2,
            insetBlockStart: c.y - grid.h / 2,
            inlineSize: grid.w,
            blockSize: grid.h,
          } as CSSProperties;
          return (
            <li key={i} className={styles.slot} style={slotStyle}>
              <button
                ref={(el) => {
                  cellRefs.current[i] = el;
                }}
                type="button"
                className={styles.cell}
                tabIndex={i === focusIndex ? 0 : -1}
                aria-label={label}
                aria-haspopup="dialog"
                onFocus={() => onCellFocus(i)}
                onClick={() => setOpenIndex(i)}
              >
                <span className={styles.pop}>
                  <span className={styles.shadow} aria-hidden="true" />
                  <span className={styles.edge} aria-hidden="true" />
                  <span className={styles.face}>
                    {photo.image ? (
                      <img className={styles.photo} src={photo.image} alt="" draggable={false} loading="lazy" />
                    ) : (
                      <span className={styles.empty} aria-hidden="true" />
                    )}
                    <span className={styles.veil} aria-hidden="true" />
                    <span className={styles.wax} aria-hidden="true" />
                  </span>
                  {photo.caption && (
                    <span className={styles.caption} aria-hidden="true">
                      <span className={styles.captionText}>{photo.caption}</span>
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={open?.caption ? `${uid}-cap` : undefined}
        aria-label={open?.caption ? undefined : open?.alt || 'Photo'}
        onClose={() => {
          const i = openIndex;
          setOpenIndex(null);
          if (i !== null) cellRefs.current[i]?.focus();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpenIndex(null);
        }}
      >
        {open && (
          <figure className={styles.sheet}>
            <span className={styles.sheetFrame}>
              {open.image ? (
                <img className={styles.sheetPhoto} src={open.image} alt={open.alt || open.caption || ''} />
              ) : (
                <span className={styles.empty} aria-hidden="true" />
              )}
            </span>
            {open.caption && (
              <figcaption id={`${uid}-cap`} className={styles.sheetCaption}>
                {open.caption}
              </figcaption>
            )}
            <button type="button" className={styles.close} aria-label="Close" onClick={() => setOpenIndex(null)}>
              <svg className={styles.closeIcon} viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
              </svg>
            </button>
          </figure>
        )}
      </dialog>
    </div>
  );
}
