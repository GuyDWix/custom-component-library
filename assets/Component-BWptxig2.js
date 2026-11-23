const e=`import { useEffect, useRef, useState } from 'react';
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
    '--dp-develop': \`\${clamp(developSeconds, 0.5, 20)}s\`,
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
            '--dp-xn': \`\${spot.narrow[0]}%\`,
            '--dp-yn': \`\${spot.narrow[1]}%\`,
            '--dp-wn': \`\${spot.narrow[2]}cqi\`,
            '--dp-xm': \`\${spot.mid[0]}%\`,
            '--dp-ym': \`\${spot.mid[1]}%\`,
            '--dp-wm': \`\${spot.mid[2]}cqi\`,
            '--dp-xw': \`\${spot.wide[0]}%\`,
            '--dp-yw': \`\${spot.wide[1]}%\`,
            '--dp-ww': \`\${spot.wide[2]}cqi\`,
            '--dp-z': spot.z,
          } as CSSProperties;
          const slotClass = [styles.slot, i >= 3 && styles.late1, i >= 5 && styles.late2, picked === i && styles.slotPicked]
            .filter(Boolean)
            .join(' ');
          const printStyle = {
            '--dp-rot': \`\${(spot.tilt * clamp(tilt, 0, 20)).toFixed(2)}deg\`,
            '--dp-delay': \`\${run?.delay ?? 0}s\`,
            '--dp-rate': \`\${run?.rate ?? 1}\`,
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
                aria-label={p.caption || p.alt ? undefined : \`Photo \${i + 1}\`}
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
`;export{e as default};
