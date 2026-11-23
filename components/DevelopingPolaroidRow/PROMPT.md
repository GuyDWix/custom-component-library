Create a custom element called "Developing Polaroid Row". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: photos (image, caption), print tilt, develop speed, border tone. Add other settings if they help.

```tsx
import { useEffect, useRef, useState } from 'react';
import type { AnimationEvent, CSSProperties, FocusEvent, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface DevelopingPolaroidPhoto {
  image: string;
  caption?: string;
  alt?: string;
}

export interface DevelopingPolaroidRowProps {
  photos?: DevelopingPolaroidPhoto[];
  tilt?: number;
  developSeconds?: number;
  borderTone?: string;
  className?: string;
}

export const defaultPhotos: DevelopingPolaroidPhoto[] = [
  { image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=640&h=640&fit=crop&auto=format&q=80', caption: 'the whole gang, finally', alt: 'Friends laughing together outdoors' },
  { image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=640&h=640&fit=crop&auto=format&q=80', caption: 'table 4, best seat', alt: 'Candlelit restaurant table set for dinner' },
  { image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=640&h=640&fit=crop&auto=format&q=80', caption: 'cake o’clock', alt: 'Birthday cake with lit candles' },
  { image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=640&h=640&fit=crop&auto=format&q=80', caption: 'last swim of summer', alt: 'Turquoise sea meeting a sandy beach' },
  { image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=640&h=640&fit=crop&auto=format&q=80', caption: 'front row!!', alt: 'Crowd at an outdoor concert under stage lights' },
];

// A worktable seen from above-beside. Print 0 is the hero (front and centre); the rest are
// scattered round it, some half off the frame. Each print has a spot per container tier:
// [x %, y %, width cqi] for narrow (<560), mid (<1000) and wide containers.
// Narrow shows 3 prints, mid 5, wide 6, so every visible print always fits and stays large.
type Spot = [number, number, number];
interface Layout {
  narrow: Spot;
  mid: Spot;
  wide: Spot;
  tilt: number;
  z: number;
}
const LAYOUT: Layout[] = [
  { narrow: [48, 48, 60], mid: [50, 50, 36], wide: [50, 51, 29], tilt: -0.5, z: 4 },
  { narrow: [68, 17, 40], mid: [14, 24, 25], wide: [16, 27, 21], tilt: 2.2, z: 2 },
  { narrow: [28, 82, 44], mid: [92, 30, 25], wide: [96, 34, 21], tilt: -1.6, z: 3 },
  { narrow: [50, 50, 30], mid: [24, 84, 24], wide: [28, 84, 20], tilt: 1.5, z: 2 },
  { narrow: [50, 50, 30], mid: [78, 86, 25], wide: [76, 88, 21], tilt: -2.4, z: 3 },
  { narrow: [50, 50, 30], mid: [50, 50, 30], wide: [-1, 70, 19], tilt: 1, z: 1 },
];
const MAX_PRINTS = LAYOUT.length;
const STAGGER_S = 0.28;
// Prints rest milky for a beat before the chemistry starts, so the "before" state is always seen.
const HOLD_S = 0.7;
const WIPE_MS = 420;
const REDEVELOP_RATE = 2.2;
const PRINT_HELP = 'Press to enlarge or set down the print. Escape sets it down.';
const HURRY_RATE = 3.4;

interface Run {
  delay: number;
  rate: number;
  on: boolean;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export default function DevelopingPolaroidRow({
  photos = defaultPhotos,
  tilt = 5,
  developSeconds = 3.2,
  borderTone = '#f8f9fb',
  className,
}: DevelopingPolaroidRowProps) {
  const [reduced, setReduced] = useState(false);
  const [runs, setRuns] = useState<Record<number, Run | undefined>>({});
  const [picked, setPicked] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const markLoaded = (i: number) => setLoaded((prev) => (prev[i] ? prev : { ...prev, [i]: true }));
  const markFailed = (i: number) => {
    setFailed((prev) => (prev[i] ? prev : { ...prev, [i]: true }));
    markLoaded(i);
  };
  const printRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const settled = useRef<Record<number, boolean>>({});
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Scroll trigger: a print develops when it comes into view and is wiped back
  // to blank once it has fully left, so scrolling back replays the develop.
  useEffect(() => {
    if (reduced) return;
    if (typeof IntersectionObserver === 'undefined') {
      setRuns(Object.fromEntries(photos.slice(0, MAX_PRINTS).map((_, i) => [i, { delay: HOLD_S + i * STAGGER_S, rate: 1, on: true }])));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const idx = (e: IntersectionObserverEntry) => Number((e.target as HTMLElement).dataset.index);
        const enter = entries
          .filter((e) => e.isIntersecting && e.intersectionRatio >= 0.2)
          .map(idx)
          .sort((x, y) => x - y);
        const leave = entries.filter((e) => !e.isIntersecting || e.intersectionRatio < 0.02).map(idx);
        if (!enter.length && !leave.length) return;
        setRuns((prev) => {
          const next = { ...prev };
          enter.forEach((i, k) => {
            if (next[i] === undefined) {
              settled.current[i] = false;
              next[i] = { delay: HOLD_S + k * STAGGER_S, rate: 1, on: true };
            }
          });
          leave.forEach((i) => {
            if (next[i] !== undefined) {
              settled.current[i] = false;
              next[i] = undefined;
            }
          });
          return next;
        });
      },
      { threshold: [0, 0.02, 0.2, 0.5] },
    );
    printRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [reduced, photos.length]);

  // Shake-to-develop. A print still developing is hurried (playbackRate keeps
  // progress, so leaving mid-develop never rolls the image backwards). A print
  // that already finished clouds over and develops again, faster.
  const setDevRate = (target: HTMLButtonElement | null, rate: number) => {
    if (!target || reduced) return;
    const anims =
      (target as { getAnimations?: (opts?: { subtree?: boolean }) => Animation[] }).getAnimations?.({ subtree: true }) ?? [];
    for (const anim of anims) {
      const el = (anim.effect as KeyframeEffect | null)?.target as Element | null | undefined;
      if (!el || el.classList.contains(styles.body)) continue; // the shake keeps its own tempo
      if (anim.playbackRate !== rate) anim.playbackRate = rate;
    }
  };

  const shakeToDevelop = (el: HTMLButtonElement) => {
    const i = Number(el.dataset.index);
    const run = runs[i];
    if (reduced || !run) return;
    if (!settled.current[i]) {
      setDevRate(el, HURRY_RATE);
      return;
    }
    settled.current[i] = false;
    setRuns((prev) => (prev[i] ? { ...prev, [i]: { delay: 0, rate: REDEVELOP_RATE, on: false } } : prev));
    timers.current.push(
      window.setTimeout(() => {
        setRuns((prev) => (prev[i] ? { ...prev, [i]: { delay: 0.05, rate: REDEVELOP_RATE, on: true } } : prev));
      }, WIPE_MS),
    );
  };

  const onPointerEnter = (e: PointerEvent<HTMLButtonElement>) => shakeToDevelop(e.currentTarget);
  const onPointerLeave = (e: PointerEvent<HTMLButtonElement>) => setDevRate(e.currentTarget, 1);
  const onFocus = (e: FocusEvent<HTMLButtonElement>) => {
    let visible = false;
    try {
      visible = e.currentTarget.matches(':focus-visible');
    } catch {
      visible = true;
    }
    if (visible) shakeToDevelop(e.currentTarget);
  };

  const onAnim = (i: number, e: AnimationEvent<HTMLElement>, done: boolean) => {
    if ((e.target as HTMLElement).classList.contains(styles.photo)) settled.current[i] = done;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape') setPicked(null);
  };

  const rootStyle = {
    '--dp-border': borderTone,
    '--dp-develop': `${clamp(developSeconds, 0.5, 20)}s`,
  } as CSSProperties;

  const rootClass = [styles.root, reduced && styles.still, className].filter(Boolean).join(' ');

  return (
    <div className={rootClass} style={rootStyle}>
      <span className={styles.grain} aria-hidden="true" />
      <span className={styles.sweep} aria-hidden="true" />
      <ul className={styles.stage} aria-label="Photo prints">
        {photos.slice(0, MAX_PRINTS).map((p, i) => {
          const run = runs[i];
          const isBlank = !p.image || failed[i];
          const spot = LAYOUT[i];
          if (!spot) return null;
          const slotStyle = {
            '--dp-xn': `${spot.narrow[0]}%`,
            '--dp-yn': `${spot.narrow[1]}%`,
            '--dp-wn': `${spot.narrow[2]}cqi`,
            '--dp-xm': `${spot.mid[0]}%`,
            '--dp-ym': `${spot.mid[1]}%`,
            '--dp-wm': `${spot.mid[2]}cqi`,
            '--dp-xw': `${spot.wide[0]}%`,
            '--dp-yw': `${spot.wide[1]}%`,
            '--dp-ww': `${spot.wide[2]}cqi`,
            '--dp-z': spot.z,
          } as CSSProperties;
          const slotClass = [styles.slot, i >= 3 && styles.late1, i >= 5 && styles.late2, picked === i && styles.slotPicked]
            .filter(Boolean)
            .join(' ');
          const printStyle = {
            '--dp-rot': `${(spot.tilt * clamp(tilt, 0, 20)).toFixed(2)}deg`,
            '--dp-delay': `${run?.delay ?? 0}s`,
            '--dp-rate': `${run?.rate ?? 1}`,
          } as CSSProperties;
          const printClass = [
            styles.print,
            run && styles.landed,
            (reduced || (run?.on && (loaded[i] || isBlank))) && styles.developed,
            isBlank && styles.empty,
            picked === i && styles.picked,
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <li key={i} className={slotClass} style={slotStyle}>
              <button
                ref={(el) => {
                  printRefs.current[i] = el;
                }}
                type="button"
                data-index={i}
                className={printClass}
                style={printStyle}
                aria-pressed={picked === i}
                aria-label={p.caption || p.alt ? undefined : `Photo ${i + 1}`}
                aria-description={PRINT_HELP}
                onClick={() => setPicked((cur) => (cur === i ? null : i))}
                onKeyDown={onKeyDown}
                onPointerEnter={onPointerEnter}
                onPointerLeave={onPointerLeave}
                onFocus={onFocus}
                onBlur={(e) => {
                  setPicked((cur) => (cur === i ? null : cur));
                  setDevRate(e.currentTarget, 1);
                }}
              >
                <span className={styles.body}>
                  <span
                    className={styles.window}
                    onAnimationStart={(e) => onAnim(i, e, false)}
                    onAnimationEnd={(e) => onAnim(i, e, true)}
                  >
                    {!isBlank ? (
                      <img
                        ref={(img) => {
                          if (img?.complete && img.naturalWidth) markLoaded(i);
                        }}
                        className={styles.photo}
                        src={p.image}
                        alt={p.alt ?? ''}
                        draggable={false}
                        onLoad={() => markLoaded(i)}
                        onError={() => markFailed(i)}
                      />
                    ) : (
                      <span className={styles.blank} aria-hidden="true" />
                    )}
                    <span className={styles.milk} aria-hidden="true" />
                    <span className={styles.blotA} aria-hidden="true" />
                    <span className={styles.blotB} aria-hidden="true" />
                    <span className={styles.blotC} aria-hidden="true" />
                    <span className={styles.rim} aria-hidden="true" />
                    <span className={styles.flash} aria-hidden="true" />
                    <span className={styles.glass} aria-hidden="true" />
                  </span>
                  <span className={styles.chin}>
                    {p.caption && <span className={styles.caption}>{p.caption}</span>}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

```css
/* Studio flash — instant prints developing on a cool seamless sweep */

@font-face {
  font-family: 'Caveat';
  src: url('./fonts/caveat.woff2') format('woff2');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}

.root {
  --dp-border: #f8f9fb;
  --dp-table: #b8c0cb;
  --dp-table-deep: #9ea8b5;
  --dp-pool: #e9eef3;
  --dp-ink: #25418f;
  --dp-focus: #25418f;
  --dp-edge: #c3c9d2;
  --dp-emulsion: #16211f;
  --dp-shadow: 34, 42, 56;
  --dp-teal: 70, 112, 104;
  --dp-milk-hi: #e9f0eb;
  --dp-milk: #d6e5df;
  --dp-milk-lo: #c3d7cf;
  --dp-develop: 3.2s;
  --dp-font-hand: 'Caveat', cursive;
  --dp-font-ui: 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --dp-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.53  0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 28px;
  color: var(--dp-ink);
  font-family: var(--dp-font-ui);
  /* The tabletop: one strobe pool over the hero, a window-edge shadow in the corner, a falloff to the frame. */
  background:
    radial-gradient(150% 130% at 50% 50%, rgba(0, 0, 0, 0) 52%, rgba(36, 46, 62, 0.34) 100%),
    linear-gradient(128deg, rgba(34, 44, 60, 0.3) 0%, rgba(34, 44, 60, 0.1) 14%, rgba(34, 44, 60, 0) 30%),
    radial-gradient(54% 70% at 46% 42%, var(--dp-pool) 0%, rgba(233, 238, 243, 0.7) 34%, rgba(233, 238, 243, 0) 76%),
    linear-gradient(176deg, var(--dp-table) 0%, var(--dp-table-deep) 100%);
}

.root ::selection {
  background-color: rgba(37, 65, 143, 0.22);
}

.grain {
  position: absolute;
  inset: 0;
  z-index: -2;
  pointer-events: none;
  background-image: var(--dp-noise);
  opacity: 0.16;
  mix-blend-mode: multiply;
}

/* The studio-flash sweep as raking light across the table, over the surface and under the prints. */
.sweep {
  position: absolute;
  inset: -10% -20%;
  z-index: -1;
  pointer-events: none;
  background:
    linear-gradient(
      104deg,
      rgba(255, 255, 255, 0) 24%,
      rgba(255, 255, 255, 0.2) 38%,
      rgba(255, 255, 255, 0.42) 46%,
      rgba(255, 255, 255, 0.12) 56%,
      rgba(255, 255, 255, 0) 68%
    );
  mix-blend-mode: soft-light;
}

.stage {
  position: relative;
  display: block;
  margin: 0;
  padding: 0;
  list-style: none;
  block-size: 158cqi;
}

.slot {
  --dp-x: var(--dp-xn);
  --dp-y: var(--dp-yn);
  --dp-w: var(--dp-wn);

  position: absolute;
  inset-inline-start: var(--dp-x);
  inset-block-start: var(--dp-y);
  inline-size: var(--dp-w);
  margin-inline-start: calc(var(--dp-w) / -2);
  translate: 0 -50%;
  z-index: var(--dp-z);
}

.slot:hover,
.slot:focus-within {
  z-index: 8;
}

.slotPicked {
  z-index: 9;
}

.late1,
.late2 {
  display: none;
}

.print {
  --dp-scale: 1;
  --dp-lift: 0px;
  --dp-flat: 1;
  --dp-rise: 26px;
  --dp-ent: 7deg;
  --dp-rate: 1;
  --dp-delay: 0s;

  position: relative;
  display: block;
  box-sizing: border-box;
  inline-size: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--dp-ink);
  font: inherit;
  text-align: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transform:
    translateY(calc(var(--dp-lift) - var(--dp-rise)))
    rotate(calc((var(--dp-rot, 0deg) + var(--dp-ent, 0deg)) * var(--dp-flat)))
    scale(var(--dp-scale));
  box-shadow:
    0 1px 0 var(--dp-edge),
    0 1px 2px rgba(var(--dp-shadow), 0.2),
    0 4px 8px -4px rgba(var(--dp-shadow), 0.16);
  transition:
    transform 620ms cubic-bezier(0.3, 1.36, 0.42, 1),
    box-shadow 460ms cubic-bezier(0.22, 1, 0.36, 1);
}

.print:focus-visible {
  outline: 2px solid var(--dp-focus);
  outline-offset: 6px;
}

.landed {
  --dp-rise: 0px;
  --dp-ent: 0deg;
}

@media (hover: hover) {
  .print:hover {
    --dp-lift: -14px;
    --dp-flat: 0;
    --dp-scale: 1.055;
    box-shadow:
      0 1px 0 var(--dp-edge),
      0 2px 4px rgba(var(--dp-shadow), 0.18),
      0 10px 16px -8px rgba(var(--dp-shadow), 0.22);
  }

  .print:hover .glass {
    background-position: 100% 100%;
  }

  .print:hover .body,
  .print:focus-visible .body {
    animation: dpShake 640ms cubic-bezier(0.4, 0.05, 0.3, 1);
  }
}

.print:focus-visible {
  --dp-lift: -14px;
  --dp-flat: 0;
  --dp-scale: 1.055;
  box-shadow:
    0 1px 0 var(--dp-edge),
    0 2px 4px rgba(var(--dp-shadow), 0.18),
    0 10px 16px -8px rgba(var(--dp-shadow), 0.22);
}

.print:focus-visible .body {
  animation: dpShake 640ms cubic-bezier(0.4, 0.05, 0.3, 1);
}

.picked {
  --dp-lift: -18px;
  --dp-flat: 0;
  --dp-scale: 1.12;
  box-shadow:
    0 1px 0 var(--dp-edge),
    0 3px 6px rgba(var(--dp-shadow), 0.18),
    0 14px 22px -10px rgba(var(--dp-shadow), 0.26);
}

.body {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  inline-size: 100%;
  padding: 4.6% 6% 0;
  border-radius: 3px;
  background:
    radial-gradient(120% 90% at 18% 0%, rgba(255, 255, 255, 0.9) 0%, transparent 55%),
    linear-gradient(
      155deg,
      color-mix(in srgb, var(--dp-border) 55%, #fff) 0%,
      var(--dp-border) 42%,
      color-mix(in srgb, var(--dp-border) 86%, #97a0ab) 100%
    );
  transform-origin: 50% 82%;
}

.window {
  position: relative;
  display: block;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--dp-emulsion);
  box-shadow: 0 1.5px 0 rgba(255, 255, 255, 0.55);
}

.photo,
.blank {
  position: absolute;
  inset: 0;
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

.photo {
  opacity: 0.16;
  filter: blur(11px) saturate(0.05) brightness(1.55) contrast(0.55);
  transform: scale(1.05);
  transition:
    opacity 420ms ease-in,
    filter 420ms ease-in,
    transform 420ms ease-in;
}

.blank {
  background:
    radial-gradient(70% 55% at 32% 28%, #39484a 0%, #222f2e 55%, var(--dp-emulsion) 100%);
}

.milk,
.blotA,
.blotB,
.blotC,
.rim,
.flash,
.glass {
  position: absolute;
  pointer-events: none;
}

.milk {
  inset: 0;
  background: linear-gradient(178deg, var(--dp-milk-hi) 0%, var(--dp-milk) 58%, var(--dp-milk-lo) 100%);
  opacity: 1;
  transition: opacity 420ms ease-in;
}

.blotA,
.blotB,
.blotC {
  border-radius: 50%;
  filter: blur(10px);
  background: radial-gradient(closest-side, rgba(var(--dp-teal), 0.85), rgba(var(--dp-teal), 0.34) 55%, transparent 74%);
  opacity: 0.9;
  transition:
    opacity 420ms ease-in,
    transform 420ms ease-in;
}

.blotA {
  inline-size: 120%;
  block-size: 95%;
  inset-block-start: -22%;
  inset-inline-start: -18%;
}

.blotB {
  inline-size: 105%;
  block-size: 110%;
  inset-block-end: -30%;
  inset-inline-end: -20%;
}

.blotC {
  inline-size: 90%;
  block-size: 70%;
  inset-block-end: -10%;
  inset-inline-start: 8%;
}

.rim {
  inset: 0;
  background: radial-gradient(
    115% 130% at 50% 46%,
    transparent 62%,
    color-mix(in srgb, var(--dp-milk) 85%, #fff) 82%,
    rgba(var(--dp-teal), 0.5) 96%,
    transparent 100%
  );
  box-shadow: inset 0 0 0 1px rgba(var(--dp-teal), 0.4);
}

.flash {
  inset: 0;
  background: radial-gradient(65% 55% at 50% 42%, rgba(255, 255, 255, 0.85), transparent 70%);
  mix-blend-mode: screen;
  opacity: 0;
}

.glass {
  inset: 0;
  background: linear-gradient(
    120deg,
    rgba(255, 255, 255, 0.16) 0%,
    rgba(255, 255, 255, 0.04) 24%,
    transparent 42%,
    transparent 72%,
    rgba(255, 255, 255, 0.07) 100%
  );
  background-size: 200% 200%;
  box-shadow:
    inset 0 2px 6px rgba(13, 20, 27, 0.38),
    inset 0 0 0 1px rgba(13, 20, 27, 0.2);
  transition: background-position 900ms cubic-bezier(0.22, 1, 0.36, 1);
}

.chin {
  display: grid;
  place-items: center;
  aspect-ratio: 100 / 26;
  padding-inline: 4%;
  transform: rotate(-1.2deg);
}

.caption {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  max-inline-size: 100%;
  opacity: 0;
  font-family: var(--dp-font-hand);
  font-size: clamp(14px, calc(var(--dp-w) * 0.078), 27px);
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: 0.005em;
  color: var(--dp-ink);
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.developed .photo {
  animation: dpDevelop calc(var(--dp-develop) / var(--dp-rate)) cubic-bezier(0.3, 0, 0.25, 1) calc(var(--dp-delay) + 120ms) both;
}

.developed .milk {
  animation: dpMilk calc(var(--dp-develop) / var(--dp-rate)) cubic-bezier(0.3, 0.1, 0.3, 1) calc(var(--dp-delay) + 90ms) both;
}

.developed .blotA {
  animation: dpBlotA calc(var(--dp-develop) * 1.05 / var(--dp-rate)) cubic-bezier(0.3, 0.1, 0.3, 1) calc(var(--dp-delay) + 90ms) both;
}

.developed .blotB {
  animation: dpBlotB calc(var(--dp-develop) * 1.05 / var(--dp-rate)) cubic-bezier(0.3, 0.1, 0.3, 1) calc(var(--dp-delay) + 140ms) both;
}

.developed .blotC {
  animation: dpBlotC calc(var(--dp-develop) * 1.05 / var(--dp-rate)) cubic-bezier(0.3, 0.1, 0.3, 1) calc(var(--dp-delay) + 60ms) both;
}

.developed .rim {
  animation: dpRim calc(var(--dp-develop) * 1.25 / var(--dp-rate)) cubic-bezier(0.3, 0.1, 0.3, 1) calc(var(--dp-delay) + var(--dp-develop) * 0.1 / var(--dp-rate)) both;
}

.developed .flash {
  animation: dpFlash calc(620ms / var(--dp-rate)) cubic-bezier(0.2, 0.8, 0.3, 1) calc(var(--dp-delay) + var(--dp-develop) * 0.78 / var(--dp-rate)) both;
}

.developed .caption {
  animation: dpInk 460ms cubic-bezier(0.2, 0.9, 0.3, 1) calc(var(--dp-delay) + var(--dp-develop) * 0.66 / var(--dp-rate)) both;
}

.empty .flash {
  animation: none;
  opacity: 0;
}

.still .print,
.still .glass {
  transition: none;
}

.still .print {
  --dp-rise: 0px;
  --dp-ent: 0deg;
}

.still .body {
  animation: none;
}

.still .photo {
  opacity: 1;
  filter: none;
  transform: none;
  animation: none;
}

.still .milk,
.still .blotA,
.still .blotB,
.still .blotC,
.still .rim {
  opacity: 0;
  animation: none;
}

.still .flash {
  animation: none;
}

.still .caption {
  opacity: 1;
  animation: none;
}

@keyframes dpShake {
  0% {
    transform: rotate(0deg) translate(0, 0);
  }
  18% {
    transform: rotate(2.4deg) translate(1px, -1px);
  }
  40% {
    transform: rotate(-1.8deg) translate(-1.5px, 1px);
  }
  62% {
    transform: rotate(1.1deg) translate(1px, 0);
  }
  82% {
    transform: rotate(-0.5deg) translate(-0.5px, 0);
  }
  100% {
    transform: rotate(0deg) translate(0, 0);
  }
}

@keyframes dpDevelop {
  0% {
    opacity: 0.16;
    filter: blur(11px) saturate(0.05) brightness(1.55) contrast(0.55);
    transform: scale(1.05);
  }
  30% {
    opacity: 0.5;
    filter: blur(6px) saturate(0.25) brightness(1.3) contrast(0.7);
  }
  62% {
    opacity: 0.88;
    filter: blur(2px) saturate(0.7) brightness(1.1) contrast(0.92);
  }
  84% {
    opacity: 1;
    filter: blur(0px) saturate(1.45) brightness(1.2) contrast(1.06);
    transform: scale(1.005);
  }
  100% {
    opacity: 1;
    filter: blur(0px) saturate(1) brightness(1) contrast(1);
    transform: scale(1);
  }
}

@keyframes dpMilk {
  0% {
    opacity: 0.97;
  }
  28% {
    opacity: 0.92;
  }
  72% {
    opacity: 0.3;
  }
  100% {
    opacity: 0;
  }
}

@keyframes dpBlotA {
  0% {
    opacity: 0.9;
    transform: scale(0.6);
  }
  35% {
    opacity: 0.85;
    transform: scale(0.78);
  }
  62% {
    opacity: 0.5;
    transform: scale(0.95);
  }
  92% {
    opacity: 0;
    transform: scale(1.2);
  }
  100% {
    opacity: 0;
    transform: scale(1.2);
  }
}

@keyframes dpBlotB {
  0% {
    opacity: 0.9;
    transform: scale(0.55);
  }
  30% {
    opacity: 0.85;
    transform: scale(0.75);
  }
  66% {
    opacity: 0.4;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.25);
  }
}

@keyframes dpBlotC {
  0% {
    opacity: 0.85;
    transform: scale(0.7);
  }
  45% {
    opacity: 0.6;
    transform: scale(0.9);
  }
  78% {
    opacity: 0.18;
    transform: scale(1.1);
  }
  100% {
    opacity: 0;
    transform: scale(1.15);
  }
}

@keyframes dpRim {
  0% {
    opacity: 1;
  }
  64% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes dpFlash {
  0% {
    opacity: 0;
    transform: scale(0.7);
  }
  24% {
    opacity: 0.95;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.35);
  }
}

@keyframes dpInk {
  0% {
    opacity: 0;
    transform: translateY(3px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@container (min-width: 560px) {
  .stage {
    block-size: 74cqi;
  }

  .slot {
    --dp-x: var(--dp-xm);
    --dp-y: var(--dp-ym);
    --dp-w: var(--dp-wm);
  }

  .late1 {
    display: block;
  }
}

@container (min-width: 1000px) {
  .stage {
    block-size: 52cqi;
  }

  .slot {
    --dp-x: var(--dp-xw);
    --dp-y: var(--dp-yw);
    --dp-w: var(--dp-ww);
  }

  .late2 {
    display: block;
  }
}
```
