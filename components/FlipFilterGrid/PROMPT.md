Create a custom element called "Flip Filter Grid". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: items (title, image, category, optional detail), categories, chip color, columns. Add other settings if they help.

```tsx
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export interface FlipFilterItem {
  title: string;
  image?: string;
  category?: string;
  detail?: string;
}

export interface FlipFilterCategory {
  name: string;
}

export interface FlipFilterGridProps {
  items?: FlipFilterItem[];
  categories?: FlipFilterCategory[];
  chipColor?: string;
  columns?: number;
  allLabel?: string;
  className?: string;
}

const photo = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

export const defaultCategories: FlipFilterCategory[] = [
  { name: 'Produce' },
  { name: 'Bakery' },
  { name: 'Dairy' },
  { name: 'Pantry' },
];

export const defaultItems: FlipFilterItem[] = [
  { title: 'Early strawberries', category: 'Produce', detail: '$6 / punnet', image: photo('1464965911861-746a04b4bca6') },
  { title: 'Sourdough boule', category: 'Bakery', detail: '$7', image: photo('1486887396153-fa416526c108') },
  { title: 'Aged blue cheese', category: 'Dairy', detail: '$9 / 200g', image: photo('1452195100486-9cc805987862') },
  { title: 'Wildflower honey', category: 'Pantry', detail: '$12 / jar', image: photo('1558642452-9d2a7deb7f62') },
  { title: 'Vine tomatoes', category: 'Produce', detail: '$5 / kg', image: photo('1534940519139-f860fb3c6e38') },
  { title: 'Butter croissants', category: 'Bakery', detail: '$3.50 each', image: photo('1555507036-ab1f4038808a') },
  { title: 'Farmhouse wheel', category: 'Dairy', detail: '$14', image: photo('1486297678162-eb2a19b0a32d') },
  { title: 'House spice blend', category: 'Pantry', detail: '$6', image: photo('1506368249639-73a05d6f6488') },
  { title: 'Market veg box', category: 'Produce', detail: '$22 / box', image: photo('1566385101042-1a0aa0c1268c') },
  { title: 'Seeded rye loaf', category: 'Bakery', detail: '$8', image: photo('1509440159596-0249088772ff') },
  { title: 'Single-origin beans', category: 'Pantry', detail: '$16 / 250g', image: photo('1509042239860-f550ce710b93') },
  { title: 'Tropical fruit box', category: 'Produce', detail: '$18', image: photo('1610832958506-aa56368176cf') },
];

/* ---------- layout ---------- */

type Slot = { col: number; row: number; cs: number; rs: number };
type Pose = { x: number; y: number; w: number; h: number; s: number; o: number };
type Body = Pose & { vx: number; vy: number; vw: number; vh: number; vs: number; vo: number; delay: number; t: Pose };

const TINTS = ['#F6D5C8', '#F7E2A6', '#D9E6C3', '#EBD3E0', '#CFE3E6'];
const KP = 210;
const DP = 22;
const KS = 300;
const DS = 28;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const colsFor = (width: number, wanted: number) => {
  const want = clamp(Math.round(wanted) || 3, 2, 5);
  if (width < 520) return 2;
  if (width < 760) return Math.min(want, 3);
  return want;
};

/* First card is the featured 2x2; every row is stretched full so no lone last card. */
const place = (n: number, c: number): Slot[] => {
  const out: Slot[] = [];
  let idx = 0;
  let featRows = 0;
  if (n >= 4) {
    featRows = n - 1 > c - 2 ? 2 : 1;
    out.push({ col: 0, row: 0, cs: 2, rs: featRows });
    idx = 1;
  }
  let row = 0;
  while (idx < n) {
    const start = row < featRows ? 2 : 0;
    const free = c - start;
    if (free <= 0) {
      row += 1;
      continue;
    }
    const k = Math.min(free, n - idx);
    const span = free / k;
    for (let j = 0; j < k; j++) out.push({ col: start + j * span, row, cs: span, rs: 1 });
    idx += k;
    row += 1;
  }
  return out;
};

const rowsOf = (slots: Slot[]) => slots.reduce((m, s) => Math.max(m, s.row + s.rs), 0);

const makeBody = (t: Pose): Body => ({ ...t, vx: 0, vy: 0, vw: 0, vh: 0, vs: 0, vo: 0, delay: 0, t: { ...t } });

/* ---------- component ---------- */

export default function FlipFilterGrid({
  items = defaultItems,
  categories = defaultCategories,
  chipColor = '#DB3A22',
  columns = 4,
  allLabel = 'All',
  className,
}: FlipFilterGridProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [broken, setBroken] = useState<Record<number, boolean>>({});
  const [bump, setBump] = useState(0);

  const rootRef = useRef<HTMLElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef<(HTMLLIElement | null)[]>([]);
  const probeEls = useRef<(HTMLDivElement | null)[]>([]);
  const bodies = useRef<Body[]>([]);
  const boardH = useRef({ p: 0, v: 0, t: 0 });
  const raf = useRef(0);
  const lastWidth = useRef(0);
  const inView = useRef(true);
  const revealed = useRef(false);
  const reduced = useRef(false);
  const visibleRef = useRef<number[]>([]);
  const columnsRef = useRef(columns);

  /* which items show, ordered by the order chips were picked */
  const total = items.length;
  const known = new Set(categories.map((c) => c.name));
  const picked = selected.filter((s) => known.has(s));
  const visible = items
    .map((_, i) => i)
    .filter((i) => picked.length === 0 || picked.includes(items[i].category ?? ''))
    .sort((a, b) => {
      if (picked.length === 0) return a - b;
      const d = picked.indexOf(items[a].category ?? '') - picked.indexOf(items[b].category ?? '');
      return d || a - b;
    });
  visibleRef.current = visible;
  columnsRef.current = columns;
  const visibleKey = visible.join(',');
  const featuredIndex = visible.length >= 4 ? visible[0] : -1;

  const counts = categories.map((c) => items.filter((it) => it.category === c.name).length);

  /* ----- painting ----- */
  const paint = useCallback(() => {
    bodies.current.forEach((b, i) => {
      const el = cardEls.current[i];
      if (!el) return;
      const rot = clamp(b.vx * 0.0022, -3.5, 3.5);
      const gone = b.t.o === 0 && b.o < 0.02;
      el.style.width = `${Math.max(b.w, 0).toFixed(1)}px`;
      el.style.height = `${Math.max(b.h, 0).toFixed(1)}px`;
      el.style.transform = `translate3d(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${Math.max(b.s, 0).toFixed(4)})`;
      el.style.opacity = clamp(b.o, 0, 1).toFixed(3);
      el.style.visibility = gone ? 'hidden' : 'visible';
      el.style.zIndex = b.t.o === 0 ? '1' : '2';
    });
    if (boardRef.current) boardRef.current.style.height = `${Math.max(boardH.current.p, 0).toFixed(1)}px`;
  }, []);

  /* ----- physics loop ----- */
  const tick = useCallback(
    (now: number, last: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      let busy = false;
      bodies.current.forEach((b) => {
        if (b.delay > 0) {
          b.delay -= dt * 1000;
          busy = true;
          return;
        }
        const t = b.t;
        for (let n = 0; n < steps; n++) {
          b.vx += (KP * (t.x - b.x) - DP * b.vx) * h;
          b.vy += (KP * (t.y - b.y) - DP * b.vy) * h;
          b.vw += (KP * (t.w - b.w) - DP * b.vw) * h;
          b.vh += (KP * (t.h - b.h) - DP * b.vh) * h;
          b.vs += (KS * (t.s - b.s) - DS * b.vs) * h;
          b.vo += (KS * (t.o - b.o) - DS * b.vo) * h;
          b.x += b.vx * h;
          b.y += b.vy * h;
          b.w += b.vw * h;
          b.h += b.vh * h;
          b.s += b.vs * h;
          b.o += b.vo * h;
        }
        const moving =
          Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.vw) + Math.abs(b.vh) > 0.5 ||
          Math.abs(t.x - b.x) + Math.abs(t.y - b.y) + Math.abs(t.w - b.w) + Math.abs(t.h - b.h) > 0.3 ||
          Math.abs(t.s - b.s) > 0.002 ||
          Math.abs(t.o - b.o) > 0.004;
        if (moving) busy = true;
        else Object.assign(b, { x: t.x, y: t.y, w: t.w, h: t.h, s: t.s, o: t.o, vx: 0, vy: 0, vw: 0, vh: 0, vs: 0, vo: 0 });
      });
      const hb = boardH.current;
      for (let n = 0; n < steps; n++) {
        hb.v += (KP * (hb.t - hb.p) - DP * hb.v) * h;
        hb.p += hb.v * h;
      }
      if (Math.abs(hb.v) > 0.4 || Math.abs(hb.t - hb.p) > 0.3) busy = true;
      else Object.assign(hb, { p: hb.t, v: 0 });
      paint();
      raf.current = busy ? requestAnimationFrame((t2) => tick(t2, now)) : 0;
    },
    [paint],
  );

  const kick = useCallback(() => {
    if (raf.current) return;
    const start = performance.now();
    raf.current = requestAnimationFrame((t) => tick(t, start - 16));
  }, [tick]);

  /* ----- compute targets and retarget the springs ----- */
  const relayout = useCallback(
    (snap: boolean) => {
      const board = boardRef.current;
      if (!board) return;
      const W = board.clientWidth;
      if (W <= 0) return;
      const vis = visibleRef.current;
      const n = vis.length;
      const c = colsFor(W, columnsRef.current);
      const gap = W < 520 ? 12 : 16;
      const cellW = (W - (c - 1) * gap) / c;

      let cap = 0;
      vis.forEach((i) => {
        const p = probeEls.current[i];
        if (!p) return;
        p.style.width = `${Math.max(cellW - 2, 0)}px`;
        cap = Math.max(cap, p.offsetHeight);
      });
      const rowH = Math.max(112, cellW * 0.64) + 10 + cap;
      const slots = place(n, c);
      const rows = rowsOf(slots);
      const boardTarget = rows ? rows * (rowH + gap) - gap : 0;

      const fresh = bodies.current.length !== items.length;
      const instant = snap || fresh || reduced.current || !inView.current;
      let enterRank = 0;
      let moveRank = 0;
      const next: Body[] = [];

      items.forEach((_, i) => {
        const rank = vis.indexOf(i);
        const prev = fresh ? undefined : bodies.current[i];
        let t: Pose;
        if (rank >= 0) {
          const s = slots[rank];
          t = { x: s.col * (cellW + gap), y: s.row * (rowH + gap), w: s.cs * (cellW + gap) - gap, h: s.rs * (rowH + gap) - gap, s: 1, o: 1 };
        } else {
          const base = prev ? prev.t : { x: 0, y: 0, w: cellW, h: rowH, s: 1, o: 1 };
          t = { ...base, s: 0.6, o: 0 };
        }
        if (!prev) {
          const b = makeBody(t);
          if (rank < 0) Object.assign(b, { s: 0.6, o: 0 });
          next[i] = b;
        } else {
          next[i] = prev;
        }
        const b = next[i];
        const wasShown = b.t.o === 1;
        b.t = t;
        if (instant) {
          const hold = rank >= 0 && !revealed.current && !reduced.current;
          Object.assign(b, t, { vx: 0, vy: 0, vw: 0, vh: 0, vs: 0, vo: 0, delay: 0 });
          if (hold) Object.assign(b, { y: t.y + 26, s: 0.94, o: 0 });
          return;
        }
        if (rank >= 0 && !wasShown) {
          Object.assign(b, { x: t.x, y: t.y, w: t.w, h: t.h, s: 0.62, o: 0, vx: 0, vy: 0, vw: 0, vh: 0, vs: 0, vo: 0 });
          b.delay = 150 + enterRank * 34;
          enterRank += 1;
        } else if (rank >= 0) {
          const moved = Math.abs(t.x - b.x) + Math.abs(t.y - b.y) + Math.abs(t.w - b.w) + Math.abs(t.h - b.h) > 0.5;
          if (moved) {
            b.delay = 30 + moveRank * 24;
            moveRank += 1;
          }
        } else {
          b.delay = 0;
        }
      });
      bodies.current = next;
      const hb = boardH.current;
      hb.t = boardTarget;
      if (instant) Object.assign(hb, { p: boardTarget, v: 0 });
      lastWidth.current = W;
      paint();
      if (!instant) kick();
    },
    [items, paint, kick],
  );

  const reveal = useCallback(() => {
    if (revealed.current) return;
    revealed.current = true;
    if (reduced.current) {
      relayout(true);
      return;
    }
    visibleRef.current.forEach((i, rank) => {
      const b = bodies.current[i];
      if (b) b.delay = rank * 46;
    });
    kick();
  }, [kick, relayout]);

  /* ----- effects ----- */
  useIsoLayoutEffect(() => {
    setReady(true);
  }, []);

  useIsoLayoutEffect(() => {
    if (!ready) return;
    relayout(false);
  }, [ready, visibleKey, items, columns, relayout]);

  useEffect(() => {
    if (!ready) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      reduced.current = mq.matches;
      if (mq.matches) {
        revealed.current = true;
        relayout(true);
      }
    };
    sync();
    mq.addEventListener('change', sync);
    const board = boardRef.current;
    const root = rootRef.current;
    let timer = 0;
    const ro = new ResizeObserver(() => {
      const w = board?.clientWidth ?? 0;
      if (w > 0 && Math.abs(w - lastWidth.current) > 0.5) relayout(true);
    });
    if (board) ro.observe(board);
    const io = new IntersectionObserver(
      ([entry]) => {
        inView.current = entry.isIntersecting;
        if (entry.isIntersecting) reveal();
      },
      { threshold: 0.12 },
    );
    if (root) io.observe(root);
    timer = window.setTimeout(reveal, 1400);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => relayout(false));
    return () => {
      mq.removeEventListener('change', sync);
      ro.disconnect();
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [ready, relayout, reveal]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  /* ----- interaction ----- */
  const toggle = (name: string) => {
    setBump((b) => b + 1);
    setSelected((cur) => (cur.includes(name) ? cur.filter((c) => c !== name) : [...cur, name]));
  };
  const clear = () => {
    if (picked.length === 0) return;
    setBump((b) => b + 1);
    setSelected([]);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape' && picked.length) {
      e.preventDefault();
      clear();
    }
  };

  const rootStyle = { '--ffg-chip': chipColor, '--ffg-cols': clamp(Math.round(columns) || 3, 2, 5) } as CSSProperties;

  const caption = (it: FlipFilterItem, featured: boolean, probe?: (el: HTMLDivElement | null) => void) => (
    <div
      ref={probe}
      className={[styles.caption, featured && styles.captionFeatured, probe && styles.probe].filter(Boolean).join(' ')}
      aria-hidden={probe ? true : undefined}
    >
      <p className={featured ? `${styles.title} ${styles.titleFeatured}` : styles.title}>{it.title}</p>
      {(it.category || it.detail) && (
        <p className={styles.meta}>
          {it.category && (
            <span className={styles.category}>
              <span className={styles.dot} aria-hidden="true" />
              {it.category}
            </span>
          )}
          {it.detail && <span className={styles.detail}>{it.detail}</span>}
        </p>
      )}
    </div>
  );

  return (
    <section
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
      aria-label="Filterable gallery"
      onKeyDown={onKeyDown}
    >
      <div className={styles.awningWrap} aria-hidden="true">
        <div key={bump} className={bump > 0 ? `${styles.awning} ${styles.awningBump}` : styles.awning} />
      </div>

      <div className={styles.stall}>
        <div className={styles.chips} role="group" aria-label="Filter by category">
          <button type="button" className={picked.length === 0 ? `${styles.chip} ${styles.chipOn}` : styles.chip} aria-pressed={picked.length === 0} onClick={clear}>
            <span className={styles.chipLabel}>{allLabel}</span>
            <span className={styles.chipCount}>{total}</span>
          </button>
          {categories.map((c, ci) =>
            counts[ci] === 0 ? null : (
              <button
                key={`${c.name}-${ci}`}
                type="button"
                className={picked.includes(c.name) ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                aria-pressed={picked.includes(c.name)}
                onClick={() => toggle(c.name)}
              >
                <span className={styles.chipLabel}>{c.name}</span>
                <span className={styles.chipCount}>{counts[ci]}</span>
              </button>
            ),
          )}
        </div>

        <p className={styles.srOnly} aria-live="polite">
          {`Showing ${visible.length} of ${total}`}
        </p>

        <div ref={boardRef} className={styles.board}>
          <ul className={ready ? `${styles.grid} ${styles.gridLive}` : styles.grid}>
            {items.map((it, i) => {
              const shown = visible.includes(i);
              const featured = i === featuredIndex;
              const tint = TINTS[(Math.max(categories.findIndex((c) => c.name === it.category), 0) + (i % 2)) % TINTS.length];
              return (
                <li
                  key={i}
                  ref={(el) => {
                    cardEls.current[i] = el;
                  }}
                  className={ready ? `${styles.card} ${styles.cardLive}` : styles.card}
                  style={{ '--ffg-tint': tint } as CSSProperties}
                  aria-hidden={!shown}
                >
                  <div className={styles.cardBody}>
                    <div className={ready ? styles.media : `${styles.media} ${styles.mediaStatic}`}>
                      <span className={styles.monogram} aria-hidden="true">
                        {(it.title.trim()[0] ?? '').toUpperCase()}
                      </span>
                      {it.image && !broken[i] && (
                        <img
                          className={styles.image}
                          src={it.image}
                          alt=""
                          draggable={false}
                          loading="lazy"
                          onError={() => setBroken((b) => ({ ...b, [i]: true }))}
                        />
                      )}
                    </div>
                    {caption(it, featured)}
                  </div>
                </li>
              );
            })}
          </ul>
          {ready &&
            items.map((it, i) => (
              <Fragment key={i}>
                {caption(it, false, (el) => {
                  probeEls.current[i] = el;
                })}
              </Fragment>
            ))}
        </div>
      </div>
    </section>
  );
}
```

```css
@font-face {
  font-family: 'FFG Fredoka';
  src: url('./fonts/fredoka-latin-wght-normal.woff2') format('woff2');
  font-weight: 300 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'FFG Nunito';
  src: url('./fonts/nunito-latin-wght-normal.woff2') format('woff2');
  font-weight: 200 1000;
  font-style: normal;
  font-display: swap;
}

.root {
  --ffg-ground: #fcf0c8;
  --ffg-chip: #db3a22;
  --ffg-chip-ink: #ffffff;
  --ffg-stripe: #fff8e1;
  --ffg-card: #ffffff;
  --ffg-ink: #2b1b12;
  --ffg-ink-soft: #66543f;
  --ffg-line: rgba(43, 27, 18, 0.14);
  --ffg-font-display: 'FFG Fredoka', ui-rounded, 'Nunito', system-ui, sans-serif;
  --ffg-font-body: 'FFG Nunito', ui-rounded, system-ui, sans-serif;
  --ffg-cols: 4;
  --ffg-ease: cubic-bezier(0.2, 0.8, 0.2, 1);

  position: relative;
  box-sizing: border-box;
  inline-size: 100%;
  container-type: inline-size;
  container-name: ffg;
  isolation: isolate;
  overflow: hidden;
  border-radius: 28px;
  color: var(--ffg-ink);
  font-family: var(--ffg-font-body);
  background-color: var(--ffg-ground);
  background-image: radial-gradient(rgba(43, 27, 18, 0.075) 1px, transparent 1.5px);
  background-size: 22px 22px;
  background-position: 11px 11px;
  -webkit-tap-highlight-color: transparent;
}

.root::selection {
  background: var(--ffg-chip);
  color: var(--ffg-chip-ink);
}

/* ---------- awning ---------- */

.awningWrap {
  position: relative;
  z-index: 3;
  filter: drop-shadow(0 6px 5px rgba(43, 27, 18, 0.2));
}

.awning {
  --stripe: 64px;
  --scallop: calc(var(--stripe) / 2);
  box-sizing: border-box;
  inline-size: 100%;
  block-size: 78px;
  transform-origin: 50% 0;
  background:
    linear-gradient(180deg, rgba(43, 27, 18, 0) 58%, rgba(43, 27, 18, 0.16) 100%),
    repeating-linear-gradient(90deg, var(--ffg-chip) 0 var(--stripe), var(--ffg-stripe) var(--stripe) calc(var(--stripe) * 2));
  -webkit-mask:
    linear-gradient(#000 0 0) 0 0 / 100% calc(100% - var(--scallop)) no-repeat,
    radial-gradient(var(--scallop) var(--scallop) at 50% 0, #000 98%, transparent 100%) 0 100% / var(--stripe) var(--scallop) repeat-x;
  mask:
    linear-gradient(#000 0 0) 0 0 / 100% calc(100% - var(--scallop)) no-repeat,
    radial-gradient(var(--scallop) var(--scallop) at 50% 0, #000 98%, transparent 100%) 0 100% / var(--stripe) var(--scallop) repeat-x;
}

.awningBump {
  animation: awning-bump 640ms cubic-bezier(0.3, 1.5, 0.5, 1) both;
}

@keyframes awning-bump {
  0% {
    transform: scaleY(1);
  }
  22% {
    transform: scaleY(1.09);
  }
  55% {
    transform: scaleY(0.985);
  }
  100% {
    transform: scaleY(1);
  }
}

@container ffg (max-width: 519px) {
  .awning {
    --stripe: 40px;
    block-size: 54px;
  }
}

/* ---------- stall ---------- */

.stall {
  --ffg-pad: 28px;
  box-sizing: border-box;
  padding: 26px var(--ffg-pad) 30px;
}

@container ffg (max-width: 519px) {
  .stall {
    --ffg-pad: 16px;
    padding-block: 20px;
  }
}

/* ---------- chips ---------- */

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: -8px -8px 14px;
  padding: 8px;
}

@container ffg (max-width: 719px) {
  .chips {
    flex-wrap: nowrap;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    margin-inline: calc(var(--ffg-pad) * -1);
    padding-inline: var(--ffg-pad);
    scroll-padding-inline: var(--ffg-pad);
    scroll-snap-type: x proximity;
  }

  .chips::-webkit-scrollbar {
    display: none;
  }
}

.chip {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-block-size: 46px;
  box-sizing: border-box;
  padding-block: 0;
  padding-inline: 18px 8px;
  border: 1px solid var(--ffg-line);
  border-radius: 999px;
  background: var(--ffg-card);
  color: var(--ffg-ink);
  font: 500 17px/1 var(--ffg-font-display);
  letter-spacing: 0.002em;
  white-space: nowrap;
  cursor: pointer;
  scroll-snap-align: start;
  touch-action: manipulation;
  transition:
    background-color 220ms var(--ffg-ease),
    color 220ms var(--ffg-ease),
    border-color 220ms var(--ffg-ease),
    transform 140ms var(--ffg-ease);
}

.chip:hover {
  border-color: rgba(43, 27, 18, 0.4);
}

.chip:active {
  transform: scale(0.96);
}

.chip:focus-visible {
  outline: 2px solid var(--ffg-ink);
  outline-offset: 3px;
}

.chipOn {
  border-color: var(--ffg-chip);
  background: var(--ffg-chip);
  color: var(--ffg-chip-ink);
  animation: chip-pop 420ms cubic-bezier(0.3, 1.6, 0.5, 1);
}

.chipOn:hover {
  border-color: var(--ffg-chip);
}

@keyframes chip-pop {
  0% {
    transform: scale(0.94);
  }
  60% {
    transform: scale(1.04);
  }
  100% {
    transform: scale(1);
  }
}

.chipLabel {
  display: block;
}

.chipCount {
  display: grid;
  place-items: center;
  min-inline-size: 30px;
  block-size: 30px;
  box-sizing: border-box;
  padding-inline: 8px;
  border-radius: 999px;
  background: rgba(43, 27, 18, 0.07);
  font: 700 14px/1 var(--ffg-font-body);
  font-variant-numeric: tabular-nums;
  transition: background-color 220ms var(--ffg-ease);
}

.chipOn .chipCount {
  background: rgba(255, 255, 255, 0.24);
}

/* ---------- board and cards ---------- */

.board {
  position: relative;
  inline-size: 100%;
}

.grid {
  display: grid;
  grid-template-columns: repeat(var(--ffg-cols), minmax(0, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.gridLive {
  position: absolute;
  inset: 0;
  display: block;
}

.card {
  position: relative;
  box-sizing: border-box;
  min-inline-size: 0;
}

.cardLive {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  transform-origin: 50% 62%;
  will-change: transform, opacity;
}

.cardBody {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  block-size: 100%;
  overflow: hidden;
  border: 1px solid var(--ffg-line);
  border-radius: 20px;
  background: var(--ffg-card);
  box-shadow:
    0 1px 2px rgba(43, 27, 18, 0.06),
    0 12px 24px -16px rgba(43, 27, 18, 0.28);
}

.media {
  position: relative;
  flex: 1 1 auto;
  min-block-size: 0;
  margin: 8px 8px 0;
  overflow: hidden;
  border-radius: 13px;
  background: var(--ffg-tint);
}

.mediaStatic {
  flex: none;
  aspect-ratio: 4 / 3;
}

.monogram {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: rgba(43, 27, 18, 0.3);
  font: 600 64px/1 var(--ffg-font-display);
}

.image {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  transition: transform 800ms var(--ffg-ease);
}

.image:hover {
  transform: scale(1.05);
}

.caption {
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-sizing: border-box;
  padding: 14px 16px 16px;
}

.captionFeatured {
  gap: 8px;
  padding: 18px 20px 20px;
}

.probe {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  visibility: hidden;
  pointer-events: none;
}

.title {
  margin: 0;
  color: var(--ffg-ink);
  font: 500 18px/1.18 var(--ffg-font-display);
  letter-spacing: -0.004em;
  text-wrap: balance;
  overflow-wrap: break-word;
  transition: font-size 420ms var(--ffg-ease);
}

.titleFeatured {
  font-size: 30px;
  line-height: 1.1;
  letter-spacing: -0.012em;
}

@container ffg (max-width: 519px) {
  .title {
    font-size: 17px;
  }

  .titleFeatured {
    font-size: 24px;
  }
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 2px 14px;
  margin: 0;
}

.category {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--ffg-ink-soft);
  font: 600 14px/1.3 var(--ffg-font-body);
}

.dot {
  flex: none;
  inline-size: 7px;
  block-size: 7px;
  border-radius: 50%;
  background: var(--ffg-chip);
}

.detail {
  color: var(--ffg-ink);
  font: 600 15px/1.3 var(--ffg-font-display);
  font-variant-numeric: tabular-nums;
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
}

@media (prefers-reduced-motion: reduce) {
  .chip,
  .chipCount,
  .image,
  .title {
    transition: none;
  }

  .chipOn,
  .awningBump {
    animation: none;
  }

  .image:hover {
    transform: none;
  }
}
```
