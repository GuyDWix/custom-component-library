Create a custom element called "Honeycomb Lens". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: photos (image, caption), cell size, lens strength. Add other settings if they help.

```tsx
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
```

```css
.root {
  --hc-ground: #f6ecd3;
  --hc-ground-deep: #ead6a6;
  --hc-honey: #e5a53c;
  --hc-honey-light: #f7d27a;
  --hc-honey-deep: #a5600f;
  --hc-bark: #2d1e13;
  --hc-cream: #fbf5e4;
  --hc-font-caption: 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif;
  --hc-hex: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  --hc-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.42  0 0 0 0 0.3  0 0 0 0 0.16  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --hc-comb: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='56' height='97' viewBox='0 0 56 97'><path d='M28 0l28 16v32L28 64 0 48V16zM28 64v33M0 48l-28 16M56 48l28 16' fill='none' stroke='%23b9822f' stroke-width='1'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  box-sizing: border-box;
  inline-size: 100%;
  contain: inline-size;
  padding-block: calc(var(--hc-swell, 40px) + 28px);
  padding-inline: 16px;
  border-radius: 28px;
  background:
    radial-gradient(70% 60% at 50% 38%, var(--hc-cream) 0%, transparent 72%),
    linear-gradient(180deg, var(--hc-ground) 0%, var(--hc-ground-deep) 100%);
  color: var(--hc-bark);
  font-family: var(--hc-font-caption);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    inset 0 -30px 60px -40px rgba(120, 72, 16, 0.35);
}

.comb,
.glow,
.grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
}

.comb {
  background-image: var(--hc-comb);
  background-size: 44px 76px;
  opacity: 0.1;
  mask-image: radial-gradient(80% 70% at 50% 50%, transparent 30%, #000 100%);
}

.glow {
  background: radial-gradient(45% 40% at 50% 45%, color-mix(in srgb, var(--hc-honey-light) 45%, transparent), transparent 70%);
  filter: blur(20px);
}

.grain {
  background-image: var(--hc-noise);
  opacity: 0.35;
  mix-blend-mode: multiply;
  z-index: 3;
}

.grid {
  position: relative;
  margin: 0 auto;
  padding: 0;
  list-style: none;
  touch-action: pan-y;
  -webkit-tap-highlight-color: transparent;
}

.slot {
  position: absolute;
  display: block;
}

.cell {
  --hc-lift: 0;
  --hc-veil: 0;
  --hc-on: 0;

  position: absolute;
  inset: 0;
  display: block;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: zoom-in;
  transform-origin: 50% 50%;
  will-change: transform;
  border-radius: 50%;
}

.cell:focus-visible {
  outline: 2px solid var(--hc-bark);
  outline-offset: 3px;
}

.pop {
  position: absolute;
  inset: 3px;
  display: block;
}

.shadow,
.edge,
.face {
  position: absolute;
  clip-path: var(--hc-hex);
}

.shadow {
  inset: 6% 2% -4%;
  background: rgba(70, 38, 8, 0.55);
  filter: blur(8px);
  opacity: calc(0.25 + var(--hc-lift) * 0.65);
  transform: translateY(calc(var(--hc-lift) * 8px));
}

.edge {
  inset: 0;
  background:
    linear-gradient(160deg, var(--hc-honey-light) 0%, var(--hc-honey) 38%, var(--hc-honey-deep) 100%);
  filter: brightness(calc(1 + var(--hc-on) * 0.12)) saturate(calc(1 + var(--hc-on) * 0.15));
  transition: filter 300ms ease-out;
}

.face {
  inset-block: 5.5px;
  inset-inline: 4.75px;
  display: block;
  overflow: hidden;
  background: var(--hc-ground-deep);
}

.photo {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  user-select: none;
}

.empty {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(60% 50% at 40% 35%, var(--hc-honey-light), transparent 70%),
    linear-gradient(160deg, var(--hc-honey) 0%, var(--hc-honey-deep) 100%);
}

.veil {
  position: absolute;
  inset: 0;
  background: var(--hc-cream);
  opacity: var(--hc-veil);
  mix-blend-mode: soft-light;
}

.wax {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(70% 45% at 30% 12%, rgba(255, 246, 220, 0.5), transparent 60%),
    radial-gradient(120% 80% at 50% 120%, rgba(60, 30, 4, 0.45), transparent 60%),
    var(--hc-noise);
  background-size: auto, auto, 120px 120px;
  mix-blend-mode: soft-light;
  opacity: 0.9;
}

.caption {
  position: absolute;
  inset-inline: 14%;
  inset-block-end: 19%;
  display: flex;
  justify-content: center;
  opacity: var(--hc-on);
  transform: translateY(calc((1 - var(--hc-on)) * 6px));
  transition:
    opacity 260ms ease-out,
    transform 420ms cubic-bezier(0.2, 1.2, 0.4, 1);
  pointer-events: none;
}

.captionText {
  display: -webkit-box;
  max-inline-size: 100%;
  padding-block: 0.3em 0.36em;
  padding-inline: 0.7em;
  border-radius: 6px;
  background: var(--hc-bark);
  box-shadow: 0 2px 6px rgba(30, 16, 4, 0.18);
  color: var(--hc-cream);
  font-size: max(9px, calc(var(--hc-w, 150px) * 0.078));
  font-style: italic;
  line-height: 1.18;
  letter-spacing: -0.005em;
  text-align: center;
  text-wrap: balance;
  overflow-wrap: anywhere;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dialog {
  inline-size: min(92vw, 760px);
  max-block-size: 92vh;
  padding: 0;
  border: 0;
  background: transparent;
  overflow: visible;
  color: var(--hc-bark);
}

.dialog::backdrop {
  background: rgba(36, 22, 10, 0.72);
  backdrop-filter: blur(6px);
}

.sheet {
  position: relative;
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 10px 10px 16px;
  border: 1px solid color-mix(in srgb, var(--hc-honey-deep) 22%, transparent);
  border-radius: 20px;
  background: var(--hc-cream);
  box-shadow: 0 24px 60px -24px rgba(20, 10, 2, 0.45);
  animation: sheetIn 420ms cubic-bezier(0.2, 1.15, 0.35, 1) both;
}

.sheetFrame {
  position: relative;
  display: block;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  max-block-size: 72vh;
  border-radius: 14px;
  background: var(--hc-ground-deep);
}

.sheetPhoto {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  }

.sheetCaption {
  padding-inline: 8px 56px;
  font-family: var(--hc-font-caption);
  font-size: 20px;
  font-style: italic;
  line-height: 1.25;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.close {
  position: absolute;
  inset-block-end: 10px;
  inset-inline-end: 10px;
  display: grid;
  place-items: center;
  inline-size: 40px;
  block-size: 40px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--hc-bark) 16%, transparent);
  border-radius: 50%;
  background: transparent;
  color: var(--hc-bark);
  cursor: pointer;
  transition: background-color 180ms ease-out;
}

.close:hover {
  background: color-mix(in srgb, var(--hc-bark) 8%, transparent);
}

.close:focus-visible {
  outline: 2px solid var(--hc-honey-deep);
  outline-offset: 3px;
}

.closeIcon {
  inline-size: 16px;
  block-size: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

@keyframes sheetIn {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sheet {
    animation: none;
  }

  .cell {
    will-change: auto;
  }

  .caption {
    transform: none;
    transition: opacity 160ms linear;
  }
}
```
