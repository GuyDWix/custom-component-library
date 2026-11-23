Create a custom element called "Mosaic Dissolve Slides". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: images (image, caption), tile size, auto-advance on/off, speed (seconds per slide). Add other settings if they help.

```tsx
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import styles from './Component.module.css';

export interface MosaicSlide {
  src: string;
  alt: string;
  caption?: string;
}

export interface MosaicDissolveSlidesProps {
  slides?: MosaicSlide[];
  tileSize?: number;
  autoAdvance?: boolean;
  advanceSeconds?: number;
  className?: string;
}

export const defaultSlides: MosaicSlide[] = [
  {
    src: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'White concrete facade with deep vertical fins',
    caption: 'Lumen House — façade study, south light',
  },
  {
    src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'Open living hall with warm plaster walls and a timber stair',
    caption: 'Lumen House — living hall',
  },
  {
    src: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'Soft daylight falling across a white building core',
    caption: 'Halden Archive — light well',
  },
  {
    src: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'Studio interior with a long timber worktable',
    caption: 'Marais fit-out — studio floor',
  },
  {
    src: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'Glass office tower against a clear sky',
    caption: 'Northbank — east elevation',
  },
];

type Phase = 'idle' | 'flip';

const FLIP_MS = 640;
const WAVE_MS = 720;
const FADE_MS = 200;
const ASPECT = 3 / 2;
const SWIPE_MIN = 44;

const PREV_LABEL = 'Previous slide';
const NEXT_LABEL = 'Next slide';
const PLAY_LABEL = 'Play slideshow';
const PAUSE_LABEL = 'Pause slideshow';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/* ---- flip driver: one rAF loop writes every tile's transform (no per-tile CSS transitions) ---- */

const FLIP_GLINT_LEAD = 0.3; // the glint rides the wave front as each tile passes edge-on

// cubic-bezier(0.3, 1.26, 0.42, 1) sampled once; looked up per tile per frame
const EASE_STEPS = 64;
const EASE_LUT = (() => {
  const [x1, y1, x2, y2] = [0.3, 1.26, 0.42, 1];
  const bez = (a: number, b: number, u: number) => 3 * a * u * (1 - u) * (1 - u) + 3 * b * u * u * (1 - u) + u * u * u;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let k = 0; k <= 200; k++) {
    const u = k / 200;
    xs.push(bez(x1, x2, u));
    ys.push(bez(y1, y2, u));
  }
  const out: number[] = [];
  let k = 0;
  for (let s = 0; s <= EASE_STEPS; s++) {
    const x = s / EASE_STEPS;
    while (k < 199 && xs[k + 1] < x) k++;
    const f = (x - xs[k]) / Math.max(1e-6, xs[k + 1] - xs[k]);
    out.push(ys[k] + (ys[k + 1] - ys[k]) * clamp(f, 0, 1));
  }
  return out;
})();
const ease = (p: number) => {
  const f = clamp(p, 0, 1) * EASE_STEPS;
  const i = Math.min(EASE_STEPS - 1, Math.floor(f));
  return EASE_LUT[i] + (EASE_LUT[i + 1] - EASE_LUT[i]) * (f - i);
};
const pad = (n: number) => String(n).padStart(2, '0');

/** Pick a column/row count whose cells are as close to square as possible. */
function fitGrid(w: number, target: number): { cols: number; rows: number } {
  const h = w / ASPECT;
  let base = Math.round(w / target);
  if (w < 520) base = Math.min(base, 8);
  base = clamp(base, 3, 18);
  let cols = base;
  let rows = Math.max(2, Math.round(base / ASPECT));
  // near-square cells, but never drifting far from the requested tile size
  const cost = (c: number, r: number) => (Math.abs(w / c - h / r) + 0.6 * Math.abs(w / c - target)) / target;
  let err = cost(cols, rows);
  for (let c = Math.max(3, base - 2); c <= Math.min(18, base + 2); c++) {
    const r = Math.max(2, Math.round(c / ASPECT));
    const e = cost(c, r);
    if (e < err) {
      err = e;
      cols = c;
      rows = r;
    }
  }
  return { cols, rows };
}

export default function MosaicDissolveSlides({
  slides = defaultSlides,
  tileSize = 56,
  autoAdvance = true,
  advanceSeconds = 5,
  className,
}: MosaicDissolveSlidesProps) {
  const count = slides.length;
  const tileTarget = clamp(tileSize, 28, 96);
  const holdMs = clamp(advanceSeconds, 2.5, 30) * 1000;

  const [grid, setGrid] = useState({ cols: 12, rows: 8 });
  const [index, setIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [origin, setOrigin] = useState({ x: 0.5, y: 0.5 });
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [hover, setHover] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [playOn, setPlayOn] = useState(autoAdvance);

  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const commitTimer = useRef(0);
  const flipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ringRef = useRef<HTMLSpanElement>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const autoRemaining = useRef(holdMs);

  const safeIndex = count > 0 ? ((index % count) + count) % count : 0;
  const current: MosaicSlide | undefined = count > 0 ? slides[safeIndex] : undefined;
  const back: MosaicSlide | undefined = nextIndex !== null ? slides[nextIndex] : current;
  const captionText = (current?.caption ?? '').trim() || (current?.alt ?? '').trim();

  useEffect(() => () => window.clearTimeout(commitTimer.current), []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (reduced) setPlayOn(false);
  }, [reduced]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.12 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w < 40) return;
      setGrid((prev) => {
        const g = fitGrid(w, tileTarget);
        return g.cols === prev.cols && g.rows === prev.rows ? prev : g;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tileTarget]);

  const goTo = useCallback(
    (target: number, ox: number, oy: number) => {
      if (phase !== 'idle' || count < 2) return;
      const t = ((target % count) + count) % count;
      if (t === safeIndex) return;
      setOrigin({ x: clamp(ox, 0, 1), y: clamp(oy, 0, 1) });
      setNextIndex(t);
      setPhase('flip');
      const total = reduced ? FADE_MS + 60 : WAVE_MS + FLIP_MS + 120;
      window.clearTimeout(commitTimer.current);
      commitTimer.current = window.setTimeout(() => {
        setIndex(t);
        setNextIndex(null);
        setPhase('idle');
      }, total);
    },
    [phase, count, safeIndex, reduced],
  );

  // Warm the neighbouring slides so the first flip never waits on a download or decode.
  useEffect(() => {
    if (count < 2 || !inView) return;
    const warm = (i: number) => {
      const src = slides[((i % count) + count) % count]?.src;
      if (!src) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      img.decode?.().catch(() => {});
    };
    warm(safeIndex + 1);
    warm(safeIndex - 1);
  }, [slides, count, safeIndex, inView]);

  const isPlaying =
    playOn && inView && !hover && !focusWithin && phase === 'idle' && count > 1;

  // Fresh countdown for every slide; keep the remaining time across hover pauses.
  useEffect(() => {
    autoRemaining.current = holdMs;
  }, [holdMs, safeIndex]);

  useEffect(() => {
    if (!isPlaying) return;
    const startedAt = Date.now();
    const remaining = Math.max(60, autoRemaining.current);
    const id = window.setTimeout(() => goTo(safeIndex + 1, 0.5, 0.5), remaining);
    return () => {
      window.clearTimeout(id);
      autoRemaining.current = Math.max(0, remaining - (Date.now() - startedAt));
    };
  }, [isPlaying, safeIndex, goTo]);

  const onRootFocus = (e: ReactFocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(true);
  };
  const onRootBlur = (e: ReactFocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
  };

  const onViewportClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ox = (e.clientX - rect.left) / rect.width;
    const oy = (e.clientY - rect.top) / rect.height;
    setPlayOn(false);
    goTo(safeIndex + 1, ox, oy);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    suppressClick.current = false;
    if (e.pointerType === 'mouse') return;
    swipeStart.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = swipeStart.current;
    swipeStart.current = null;
    if (!s || e.pointerType === 'mouse') return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    suppressClick.current = true;
    setPlayOn(false);
    if (dx < 0) goTo(safeIndex + 1, 1, 0.5);
    else goTo(safeIndex - 1, 0, 0.5);
  };

  const onPrev = () => {
    setPlayOn(false);
    goTo(safeIndex - 1, 0, 0.5);
  };
  const onNext = () => {
    setPlayOn(false);
    goTo(safeIndex + 1, 1, 0.5);
  };

  const tiles = useMemo(() => {
    const { cols, rows } = grid;
    const iy = 1 / ASPECT; // height in width units
    const maxDist = Math.max(
      Math.hypot(origin.x, origin.y * iy),
      Math.hypot(1 - origin.x, origin.y * iy),
      Math.hypot(origin.x, (1 - origin.y) * iy),
      Math.hypot(1 - origin.x, (1 - origin.y) * iy),
    );
    const list: { i: number; j: number; pos: string; d: number }[] = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const dx = (i + 0.5) / cols - origin.x;
        const dy = ((j + 0.5) / rows - origin.y) * iy;
        list.push({
          i,
          j,
          d: Math.pow(Math.hypot(dx, dy) / maxDist, 0.85) * WAVE_MS,
          pos: `${cols > 1 ? (i / (cols - 1)) * 100 : 0}% ${rows > 1 ? (j / (rows - 1)) * 100 : 0}%`,
        });
      }
    }
    return list;
  }, [grid, origin]);
  const tilesRef = useRef(tiles);
  tilesRef.current = tiles;
  const originRef = useRef(origin);
  originRef.current = origin;

  // One rAF loop drives the whole wave: every in-flight tile gets one transform write per frame,
  // and the glint is a single ring scaled along the wave front instead of a per-tile animation.
  useEffect(() => {
    if (phase !== 'flip' || reduced) return;
    const vp = viewportRef.current;
    const ring = ringRef.current;
    const list = tilesRef.current;
    const els = flipRefs.current;
    if (!vp || !ring) return;
    const n = list.length;
    const done = new Uint8Array(n);
    const turned = new Uint8Array(n);
    const W = vp.clientWidth;
    const H = vp.clientHeight;
    const o = originRef.current;
    const reach = Math.max(
      Math.hypot(o.x * W, o.y * H),
      Math.hypot((1 - o.x) * W, o.y * H),
      Math.hypot(o.x * W, (1 - o.y) * H),
      Math.hypot((1 - o.x) * W, (1 - o.y) * H),
    );
    ring.style.width = `${reach * 2}px`;
    ring.style.height = `${reach * 2}px`;
    ring.style.left = `${o.x * W}px`;
    ring.style.top = `${o.y * H}px`;
    const total = WAVE_MS + FLIP_MS;
    const t0 = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const t = now - t0;
      for (let k = 0; k < n; k++) {
        if (done[k]) continue;
        const el = els[k];
        if (!el) continue;
        const p = (t - list[k].d) / FLIP_MS;
        if (p <= 0) continue;
        if (p >= 1) {
          el.style.transform = '';
          if (!turned[k]) el.dataset.b = '1';
          turned[k] = 1;
          done[k] = 1;
          continue;
        }
        const e = ease(p);
        if (e > 0.5 && !turned[k]) {
          turned[k] = 1;
          el.dataset.b = '1';
        }
        const sx = Math.abs(Math.cos(Math.PI * e));
        const lift = 1 + 0.09 * Math.sin(Math.PI * Math.pow(p, 0.85));
        el.style.transform = `scale(${(sx * lift).toFixed(3)},${lift.toFixed(3)})`;
      }
      const front = clamp((t - FLIP_MS * FLIP_GLINT_LEAD) / WAVE_MS, 0, 1);
      if (front > 0 && front < 1) {
        ring.style.opacity = String(Math.sin(Math.PI * front) ** 0.6 * 0.9);
        ring.style.transform = `translate(-50%, -50%) scale(${Math.pow(front, 1 / 0.85).toFixed(4)})`;
      } else {
        ring.style.opacity = '0';
      }
      if (t < total) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ring.style.opacity = '0';
    };
  }, [phase, reduced]);

  // Back at rest (new slide committed in the same render): clear every tile before paint.
  useLayoutEffect(() => {
    if (phase !== 'idle') return;
    for (const el of flipRefs.current) {
      if (!el) continue;
      el.style.transform = '';
      delete el.dataset.b;
    }
  }, [phase, safeIndex, grid]);

  const bgSize = `${grid.cols * 100}% ${grid.rows * 100}%`;
  const face = (src: string, pos: string): CSSProperties => ({
    backgroundImage: src ? `url("${src}")` : undefined,
    backgroundPosition: pos,
    backgroundSize: bgSize,
    backgroundRepeat: 'no-repeat',
  });

  const frontSrc = current?.src ?? '';
  const backSrc = back?.src ?? '';
  // Memoised so hover, focus and progress updates never re-diff hundreds of tiles.
  const tileEls = useMemo(
    () =>
      tiles.map((tl, k) => (
        <div key={`${tl.i}-${tl.j}`} className={styles.tile}>
          <div
            className={styles.flipper}
            ref={(el) => {
              flipRefs.current[k] = el;
            }}
          >
            <span
              className={[styles.face, styles.faceFront, frontSrc ? '' : styles.facePlaceholder].filter(Boolean).join(' ')}
              style={face(frontSrc, tl.pos)}
            />
            <span
              className={[styles.face, styles.faceBack, backSrc ? '' : styles.facePlaceholder].filter(Boolean).join(' ')}
              style={face(backSrc, tl.pos)}
            />
          </div>
        </div>
      )),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tiles, frontSrc, backSrc, bgSize],
  );

  const rootStyle = {
    '--md-flip': `${FLIP_MS}ms`,
    '--md-fade': `${FADE_MS}ms`,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
      data-phase={phase}
      data-motion={reduced ? 'reduced' : 'full'}
      data-inview={inView ? 'in' : 'out'}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={onRootFocus}
      onBlur={onRootBlur}
    >
      <span className={styles.grain} aria-hidden="true" />

      <div className={styles.frame}>
        <div
          ref={viewportRef}
          className={styles.viewport}
          onClick={onViewportClick}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            swipeStart.current = null;
          }}
        >
          <div
            className={styles.grid}
            style={{
              gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
              gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
            }}
          >
            {tileEls}
          </div>
          <span
            className={styles.gloss}
            style={{ '--md-cols': grid.cols, '--md-rows': grid.rows } as CSSProperties}
            aria-hidden="true"
          />
          <span className={styles.ring} ref={ringRef} aria-hidden="true" />
          <span className={styles.sheen} aria-hidden="true" />
        </div>

        <div className={styles.placard}>
          <p className={styles.caption} aria-live={isPlaying ? 'off' : 'polite'} aria-atomic="true">
            <span className={styles.captionText} key={safeIndex}>
              {captionText}
            </span>
          </p>
          <span className={styles.counter} aria-hidden="true">
            {pad(safeIndex + 1)} / {pad(Math.max(count, 1))}
          </span>
          <div className={styles.controls}>
            <button
              type="button"
              className={[styles.ctrl, styles.ctrlQuiet].join(' ')}
              aria-label={playOn ? PAUSE_LABEL : PLAY_LABEL}
              onClick={() => setPlayOn((p) => !p)}
            >
              {playOn ? (
                <svg className={styles.ctrlIcon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path d="M5.75 3.5v9M10.25 3.5v9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg className={styles.ctrlIcon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path d="M5.5 3.2v9.6L12.4 8z" fill="currentColor" />
                </svg>
              )}
            </button>
            <button type="button" className={styles.ctrl} aria-label={PREV_LABEL} onClick={onPrev}>
              <svg className={styles.ctrlIcon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path
                  d="M10.5 3 5.5 8l5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button type="button" className={styles.ctrl} aria-label={NEXT_LABEL} onClick={onNext}>
              <svg className={styles.ctrlIcon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path
                  d="M5.5 3l5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {playOn && count > 1 && (
          <span className={styles.progressTrack}>
            <span
              className={styles.progressFill}
              key={`fill-${safeIndex}`}
              style={{ animationDuration: `${holdMs}ms`, animationPlayState: isPlaying ? 'running' : 'paused' }}
            />
          </span>
        )}
      </div>
    </div>
  );
}
```

```css
.root {
  --md-wall: #ebe8e2;
  --md-wall-hi: #f7f5f1;
  --md-wall-lo: #dcd7cd;
  --md-frame: #2c2924;
  --md-frame-deep: #242119;
  --md-frame-hi: rgba(255, 255, 255, 0.08);
  --md-grout: #cdc6b8;
  --md-ink: #26231e;
  --md-light: #ece7dd;
  --md-light-muted: rgba(236, 231, 221, 0.64);
  --md-hairline: rgba(255, 255, 255, 0.14);
  --md-focus: #f0eadf;
  --md-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --md-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.42  0 0 0 0 0.36  0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  display: grid;
  justify-items: center;
  padding-block: clamp(36px, 6cqi, 68px);
  padding-inline: clamp(14px, 3cqi, 28px);
  background:
    radial-gradient(75% 55% at 50% 0%, var(--md-wall-hi) 0%, transparent 72%),
    linear-gradient(180deg, var(--md-wall) 0%, var(--md-wall-lo) 100%);
  color: var(--md-ink);
  font-family: var(--md-font-ui);
}

.root ::selection {
  background: #cfc7b8;
  color: #211e18;
}

.grain {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: var(--md-noise);
  opacity: 0.3;
  mix-blend-mode: multiply;
}

.frame {
  position: relative;
  z-index: 1;
  inline-size: min(100%, 1020px);
  box-sizing: border-box;
  padding-block: clamp(10px, 1.8cqi, 16px) clamp(20px, 3cqi, 28px);
  padding-inline: clamp(10px, 1.8cqi, 16px);
  border-radius: 22px;
  background: linear-gradient(168deg, #343028 0%, var(--md-frame) 52%, var(--md-frame-deep) 100%);
  box-shadow:
    inset 0 1px 0 var(--md-frame-hi),
    inset 0 0 0 1px rgba(0, 0, 0, 0.22),
    0 54px 100px -48px rgba(44, 37, 26, 0.55),
    0 18px 38px -20px rgba(44, 37, 26, 0.42);
}

.viewport {
  position: relative;
  aspect-ratio: 3 / 2;
  border-radius: 10px;
  overflow: hidden;
  contain: paint;
  background: var(--md-grout);
  cursor: pointer;
  touch-action: pan-y;
  -webkit-tap-highlight-color: transparent;
}

.grid {
  position: absolute;
  inset: 0;
  display: grid;
  gap: 2px;
  padding: 2px;
  background: var(--md-grout);
}

.tile {
  position: relative;
}

.flipper {
  position: absolute;
  inset: 0;
}

/* The flip is driven from one rAF loop (scaleX with a face swap at the edge-on point), so the layer is only
   promoted while a flip is running and the idle page carries no per-tile compositor layers. */
.root[data-motion='full'][data-phase='flip'] .flipper {
  will-change: transform;
}

.face {
  position: absolute;
  inset: 0;
  background-repeat: no-repeat;
  background-color: #c9c2b4;
}

/* the hidden face is never painted at rest */
.root[data-motion='full'] .faceBack {
  visibility: hidden;
}

.root[data-motion='full'] .flipper[data-b] .faceFront {
  visibility: hidden;
}

.root[data-motion='full'] .flipper[data-b] .faceBack {
  visibility: visible;
}

.facePlaceholder {
  background-image: linear-gradient(150deg, #d6cfc2 0%, #bab2a3 55%, #a89f8f 100%);
}

/* Resting gloss: one overlay tiled to the grid, so every chip still reads as a glazed square. */
.gloss {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  /* gloss from the top left, a hairline of shade on the far edges so each chip sits in its grout */
  background-image:
    linear-gradient(to top, transparent 2px, rgba(30, 24, 14, 0.2) 2px, transparent 5px),
    linear-gradient(to left, transparent 2px, rgba(30, 24, 14, 0.2) 2px, transparent 5px),
    linear-gradient(168deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 22%, transparent 40%);
  background-size: calc((100% - 2px) / var(--md-cols, 12)) calc((100% - 2px) / var(--md-rows, 8));
  background-position: 2px 2px;
  background-repeat: repeat;
}

/* Flip glint: a single soft ring that rides the wave front (scaled from JS, compositor only). */
.ring {
  position: absolute;
  z-index: 3;
  inline-size: 0;
  block-size: 0;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0);
  background: radial-gradient(
    closest-side,
    transparent 0 80%,
    rgba(255, 255, 255, 0.1) 88%,
    rgba(255, 255, 255, 0.5) 96%,
    transparent 100%
  );
  will-change: transform, opacity;
}

/* Reduced motion: the whole surface crossfades, no ripple, no lift. */
.root[data-motion='reduced'] .face {
  transition: opacity var(--md-fade, 200ms) ease;
}

.root[data-motion='reduced'] .faceBack {
  opacity: 0;
}

.root[data-motion='reduced'][data-phase='flip'] .faceFront {
  opacity: 0;
}

.root[data-motion='reduced'][data-phase='flip'] .faceBack {
  opacity: 1;
}

/* Idle life: a slow showroom glint drifting across the tile field. */
.sheen {
  position: absolute;
  inset: 0;
  z-index: 4;
  overflow: hidden;
  pointer-events: none;
}

.sheen::before {
  content: '';
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: 60%;
  background: linear-gradient(
    112deg,
    transparent 22%,
    rgba(255, 255, 255, 0.1) 42%,
    rgba(255, 255, 255, 0.22) 50%,
    rgba(255, 255, 255, 0.1) 58%,
    transparent 78%
  );
  opacity: 0;
  transform: translateX(-100%);
  animation: sheen-sweep 9s ease-in-out infinite;
  will-change: transform, opacity;
}

.root[data-inview='out'] .sheen::before,
.root[data-phase='flip'] .sheen::before,
.root[data-motion='reduced'] .sheen::before {
  animation-play-state: paused;
}

@keyframes sheen-sweep {
  0% {
    transform: translateX(-100%);
    opacity: 0;
  }
  5% {
    opacity: 0.6;
  }
  24% {
    transform: translateX(180%);
    opacity: 0.6;
  }
  32% {
    transform: translateX(180%);
    opacity: 0;
  }
  100% {
    transform: translateX(180%);
    opacity: 0;
  }
}

.placard {
  display: flex;
  align-items: center;
  gap: clamp(10px, 2cqi, 22px);
  margin-block-start: clamp(10px, 1.8cqi, 16px);
  padding-block-start: clamp(10px, 1.8cqi, 14px);
  border-block-start: 1px solid rgba(255, 255, 255, 0.09);
}

.caption {
  flex: 1 1 12em;
  min-inline-size: 0;
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: 0.002em;
  color: var(--md-light);
}

.captionText {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.root[data-motion='full'] .captionText {
  animation: caption-in 360ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes caption-in {
  from {
    opacity: 0;
    transform: translateY(7px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.counter {
  flex: none;
  min-inline-size: 6ch;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.16em;
  font-variant-numeric: tabular-nums;
  color: var(--md-light-muted);
}

.controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-inline-start: auto;
}

.ctrl {
  display: grid;
  place-items: center;
  inline-size: 44px;
  block-size: 44px;
  padding: 0;
  border: 1px solid var(--md-hairline);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
  color: var(--md-light);
  cursor: pointer;
  transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease;
}

.ctrl:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.32);
}

.ctrl:active {
  transform: scale(0.93);
}

.ctrl:focus-visible {
  outline: 2px solid var(--md-focus);
  outline-offset: 2px;
}

.ctrlQuiet {
  border-color: transparent;
  background: transparent;
}

.ctrlQuiet:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.18);
}

.ctrlIcon {
  inline-size: 16px;
  block-size: 16px;
}

.progressTrack {
  position: absolute;
  inset-inline: clamp(10px, 1.8cqi, 16px);
  inset-block-end: 8px;
  block-size: 2px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
  pointer-events: none;
}

.progressFill {
  display: block;
  block-size: 100%;
  inline-size: 100%;
  transform-origin: 0 50%;
  background: linear-gradient(90deg, rgba(236, 231, 221, 0.35), rgba(236, 231, 221, 0.95));
  animation-name: progress-grow;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

@keyframes progress-grow {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

@container (width < 560px) {
  .placard {
    flex-wrap: wrap;
    row-gap: 12px;
  }

  .caption {
    flex-basis: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sheen {
    display: none;
  }
}
```
