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
