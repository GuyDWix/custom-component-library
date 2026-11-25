Create a custom element called "Concertina FAQ". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: questions (question, answer), paper color, accent color, allow multiple open. Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import styles from './Component.module.css';

export interface ConcertinaFAQQuestion {
  question: string;
  answer: string;
}

export interface ConcertinaFAQProps {
  questions?: ConcertinaFAQQuestion[];
  paperColor?: string;
  accentColor?: string;
  allowMultipleOpen?: boolean;
}

export const defaultQuestions: ConcertinaFAQQuestion[] = [
  {
    question: 'How long does a custom print order take?',
    answer:
      'Most orders leave the studio within eight working days. Letterpress needs a day to dry between colours, so a two-colour job takes closer to twelve. If the paper is already on the shelf we can often turn a small run around in three.',
  },
  {
    question: 'Can I see a proof before you print?',
    answer:
      'Always. You get a photographed proof within two days and a physical proof on request, folded and trimmed exactly as the final piece will be. Nothing goes on the press until you have signed it off.',
  },
  {
    question: 'Which paper stocks do you use?',
    answer:
      'Cotton rag, recycled kraft and a soft uncoated white, all sourced from mills within 300 miles of the studio. Swatch cards are free and arrive in a day or two, so you can feel the weight before you commit.',
  },
  {
    question: 'Do you ship abroad?',
    answer:
      'Yes, to over forty countries. Tracked shipping is included on orders above 120 euros, and customs paperwork is filled in for you. Parcels are flat-packed between boards so every corner arrives crisp.',
  },
  {
    question: 'How do I change or cancel an order?',
    answer:
      'Message us before the plates are made and we will change anything at no cost. After that we can still adjust quantities, but ink and paper already cut are charged at cost.',
  },
];

type Anim = { p: number; v: number; live: boolean };

const STIFFNESS = 190;
const DAMPING = 16;
const STAGGER = 0.14;
const FALLBACK_HEIGHT = 168;
const RAD = Math.PI / 180;

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const pleatCountFor = (width: number) => (width < 560 ? 2 : width < 900 ? 3 : 4);

/** Fold angles (degrees, 90 = shut, 0 = flat) for each pleat at spring position p. */
function pose(p: number, n: number): number[] {
  const span = 1 - STAGGER * (n - 1);
  const extra = Math.max(0, p - 1) * 0.9;
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    const base = clamp01((Math.min(p, 1) - STAGGER * k) / span);
    out.push(90 * (1 - base - extra));
  }
  return out;
}

export default function ConcertinaFAQ({
  questions = defaultQuestions,
  paperColor = '#f1ebdf',
  accentColor = '#2b3a8c',
  allowMultipleOpen = false,
}: ConcertinaFAQProps) {
  const items = questions.filter((q) => q.question);
  const count = items.length;
  const uid = useId();

  const [open, setOpen] = useState<number[]>([0]);
  const [pleats, setPleats] = useState(3);
  const [sizes, setSizes] = useState<number[]>([]);
  const [reduced, setReduced] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const wrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const copyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bandRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const anim = useRef<Anim[]>([]);
  const targets = useRef<number[]>([]);
  const heights = useRef<number[]>([]);
  const pleatsRef = useRef(3);
  const reducedRef = useRef(false);
  const inViewRef = useRef(true);
  const raf = useRef(0);
  const last = useRef(0);

  const openNow = allowMultipleOpen ? open : open.slice(-1);
  const openKey = openNow.join(',');

  heights.current = items.map((_, i) => Math.ceil((sizes[i] || FALLBACK_HEIGHT) / pleats));
  pleatsRef.current = pleats;
  reducedRef.current = reduced;

  /* Paint one item at spring position p (inline styles override the resting CSS). */
  const paint = useCallback((i: number, p: number) => {
    const item = itemRefs.current[i];
    const wrap = wrapRefs.current[i];
    if (!item || !wrap) return;
    const n = pleatsRef.current;
    const h = heights.current[i] ?? 0;
    const thetas = pose(p, n);
    const facets = wrap.querySelectorAll<HTMLElement>('[data-facet]');
    let total = 0;
    let prev = 0;
    thetas.forEach((t, k) => {
      const el = facets[k];
      if (!el) return;
      const a = (k % 2 === 0 ? 1 : -1) * t;
      el.style.transform = `rotateX(${(a - prev).toFixed(2)}deg)`;
      el.style.setProperty('--sh', Math.abs(Math.sin(t * RAD)).toFixed(3));
      prev = a;
      total += Math.cos(t * RAD);
    });
    const textFrom = n <= 2 ? 0.58 : 0.1;
    wrap.style.blockSize = `${(h * total).toFixed(2)}px`;
    wrap.style.visibility = p > 0.002 ? 'visible' : 'hidden';
    item.style.setProperty('--p', clamp01(p).toFixed(3));
    item.style.setProperty('--tx', clamp01((p - textFrom) / 0.32).toFixed(3));
    item.style.setProperty('--sd', clamp01((p - 0.12) / 0.6).toFixed(3));
    const lift = clamp01((p - 0.72) / 0.28);
    item.style.setProperty('--cv', (lift * lift * (3 - 2 * lift)).toFixed(3));
  }, []);

  /* Hand an item back to the resting CSS (also the reduced-motion and SSR state). */
  const rest = useCallback((i: number) => {
    const item = itemRefs.current[i];
    const wrap = wrapRefs.current[i];
    if (!item || !wrap) return;
    ['--p', '--tx', '--sd', '--cv'].forEach((k) => item.style.removeProperty(k));
    wrap.style.removeProperty('block-size');
    wrap.style.removeProperty('visibility');
    wrap.querySelectorAll<HTMLElement>('[data-facet]').forEach((el) => {
      el.style.removeProperty('transform');
      el.style.removeProperty('--sh');
    });
  }, []);

  const tick = useCallback(
    (now: number) => {
      raf.current = 0;
      const dt = Math.min((now - last.current) / 1000, 1 / 30);
      last.current = now;
      let active = false;
      anim.current.forEach((a, i) => {
        if (!a.live) return;
        const goal = targets.current[i] ?? 0;
        if (!inViewRef.current) {
          a.p = goal;
          a.v = 0;
          a.live = false;
          rest(i);
          return;
        }
        const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
        const step = dt / steps;
        for (let s = 0; s < steps; s++) {
          a.v += (STIFFNESS * (goal - a.p) - DAMPING * a.v) * step;
          a.p += a.v * step;
        }
        if (Math.abs(a.p - goal) < 0.0006 && Math.abs(a.v) < 0.004) {
          a.p = goal;
          a.v = 0;
          a.live = false;
          rest(i);
        } else {
          paint(i, a.p);
          active = true;
        }
      });
      if (active) raf.current = requestAnimationFrame(tick);
    },
    [paint, rest],
  );

  /* Retarget every item whenever the open set changes; runs before paint so nothing flashes. */
  useIsoLayoutEffect(() => {
    while (anim.current.length < count) {
      const i = anim.current.length;
      anim.current.push({ p: i === 0 ? 1 : 0, v: 0, live: false });
    }
    let any = false;
    for (let i = 0; i < count; i++) {
      const goal = openNow.includes(i) ? 1 : 0;
      targets.current[i] = goal;
      const a = anim.current[i];
      if (a.p === goal && !a.live) continue;
      if (reducedRef.current || !inViewRef.current) {
        a.p = goal;
        a.v = 0;
        a.live = false;
        rest(i);
      } else {
        a.live = true;
        paint(i, a.p);
        any = true;
      }
    }
    if (any && !raf.current) {
      last.current = performance.now();
      raf.current = requestAnimationFrame(tick);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openKey, count, reduced, paint, rest, tick]);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = 0;
    },
    [],
  );

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
    const io = new IntersectionObserver(([entry]) => {
      inViewRef.current = entry.isIntersecting;
    });
    io.observe(root);
    const ro = new ResizeObserver(([entry]) => setPleats(pleatCountFor(entry.contentRect.width)));
    ro.observe(root);
    return () => {
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  /* Measure each answer at its flat height so the pleats can be cut from it. */
  useIsoLayoutEffect(() => {
    const measure = () => {
      const next = items.map((_, i) => copyRefs.current[i]?.offsetHeight ?? 0);
      setSizes((prev) => (prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    copyRefs.current.slice(0, count).forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, pleats, questions]);

  const toggle = (i: number) => {
    setOpen((prev) => {
      const current = allowMultipleOpen ? prev : prev.slice(-1);
      if (current.includes(i)) return current.filter((v) => v !== i);
      return allowMultipleOpen ? [...current, i] : [i];
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const from = bandRefs.current.findIndex((el) => el === e.target);
    if (from < 0) return;
    let to = from;
    if (e.key === 'ArrowDown') to = (from + 1) % count;
    else if (e.key === 'ArrowUp') to = (from - 1 + count) % count;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = count - 1;
    else return;
    e.preventDefault();
    bandRefs.current[to]?.focus();
  };

  const renderFacet = (i: number, k: number, text: string): ReactNode => (
    <div
      key={k}
      data-facet=""
      className={k === 0 ? `${styles.facet} ${styles.facetFirst}` : styles.facet}
      style={{ '--k': k } as CSSProperties}
    >
      <div className={k + 1 === pleats ? `${styles.slice} ${styles.sliceLast}` : styles.slice}>
        <div
          ref={
            k === 0
              ? (el) => {
                  copyRefs.current[i] = el;
                }
              : undefined
          }
          className={k === 0 ? styles.copy : `${styles.copy} ${styles.copyGhost}`}
          aria-hidden={k > 0 ? true : undefined}
        >
          <p className={styles.answerText}>{text}</p>
        </div>
        <span className={k % 2 === 0 ? styles.shadeLit : styles.shadeDark} aria-hidden="true" />
        <span className={styles.crease} aria-hidden="true" />
      </div>
      {k + 1 < pleats ? renderFacet(i, k + 1, text) : null}
    </div>
  );

  const rootStyle = { '--cf-paper': paperColor, '--cf-accent': accentColor } as CSSProperties;

  return (
    <div ref={rootRef} className={styles.root} style={rootStyle}>
      <div className={styles.frame}>
        <ul
          className={styles.list}
          role="list"
          aria-description="Use the up and down arrow keys to move between questions; Enter or Space folds an answer open or shut."
          onKeyDown={onKeyDown}
        >
          {items.map((item, i) => {
            const isOpen = openNow.includes(i);
            const bandId = `${uid}-q${i}`;
            const panelId = `${uid}-a${i}`;
            const itemStyle = { '--h': `${heights.current[i]}px`, '--n': pleats } as CSSProperties;
            return (
              <li
                key={i}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                className={isOpen ? `${styles.item} ${styles.itemOpen}` : styles.item}
                style={itemStyle}
              >
                <h3 className={styles.heading}>
                  <button
                    ref={(el) => {
                      bandRefs.current[i] = el;
                    }}
                    id={bandId}
                    type="button"
                    className={i % 2 === 0 ? `${styles.band} ${styles.bandEven}` : `${styles.band} ${styles.bandOdd}`}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(i)}
                  >
                    <span className={styles.qText}>{item.question}</span>
                    <span className={isOpen ? `${styles.mark} ${styles.markOpen}` : styles.mark} aria-hidden="true">
                      <svg className={styles.chev} viewBox="0 0 24 24" width="24" height="24" focusable="false">
                        <polyline className={styles.chevLine} points="6,9 12,15.2 18,9" />
                      </svg>
                    </span>
                  </button>
                </h3>
                <div
                  ref={(el) => {
                    wrapRefs.current[i] = el;
                  }}
                  id={panelId}
                  role="region"
                  aria-labelledby={bandId}
                  className={[
                    styles.answer,
                    isOpen ? styles.answerOpen : '',
                    reduced ? (isOpen ? styles.answerStaticOpen : styles.answerStatic) : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className={styles.cast} aria-hidden="true" />
                  {renderFacet(i, 0, item.answer)}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
```

```css
.root {
  --cf-paper: #f1ebdf;
  --cf-accent: #2b3a8c;
  --cf-ink: color-mix(in srgb, var(--cf-accent) 14%, #15130f);
  --cf-paper-hi: color-mix(in srgb, var(--cf-paper) 72%, #ffffff);
  --cf-paper-lo: color-mix(in srgb, var(--cf-paper) 93%, var(--cf-ink));
  --cf-fold: color-mix(in srgb, var(--cf-paper) 80%, var(--cf-ink));
  --cf-cream: color-mix(in srgb, var(--cf-paper) 55%, #ffffff);
  --cf-shadow: color-mix(in srgb, var(--cf-ink) 80%, #000000);
  --cf-surface-hi: color-mix(in srgb, var(--cf-paper) 86%, var(--cf-ink));
  --cf-surface-lo: var(--cf-surface-hi);
  --cf-font: 'Bricolage Grotesque', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 20px;
  background: var(--cf-surface-hi);
  color: var(--cf-ink);
  font-family: var(--cf-font);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--cf-ink) 12%, transparent),
    0 24px 36px -30px color-mix(in srgb, var(--cf-shadow) 40%, transparent);
}

.frame {
  --cf-pad: clamp(1.1rem, 5.5cqi, 3.5rem);
  position: relative;
  z-index: 1;
  display: block;
  padding: clamp(0.75rem, 3.4cqi, 2.5rem);
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  --p: 0;
  --cv: 0;
  position: relative;
  margin: 0;
  padding: 0;
}

.itemOpen {
  --p: 1;
  --cv: 1;
}

.heading {
  margin: 0;
  font: inherit;
}

/* ---- Question bands: paper pleats, light and shade alternating fold to fold ---- */

.band {
  --hv: 0;
  --pr: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(0.75rem, 3cqi, 2rem);
  box-sizing: border-box;
  inline-size: 100%;
  margin: 0;
  padding-block: clamp(1rem, 2.8cqi, 1.75rem);
  padding-inline: var(--cf-pad) clamp(1rem, 3.5cqi, 2.5rem);
  border: 0;
  border-radius: 0;
  color: var(--cf-ink);
  font-family: var(--cf-font);
  text-align: start;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 0 -1px 0 color-mix(in srgb, var(--cf-fold) 60%, transparent);
}

.bandEven {
  background: linear-gradient(180deg, var(--cf-paper-hi) 0%, var(--cf-paper) 100%);
}

.bandOdd {
  background: linear-gradient(180deg, var(--cf-paper-lo) 0%, var(--cf-paper) 100%);
}

.item:first-child .band {
  border-start-start-radius: 8px;
  border-start-end-radius: 8px;
}

.band::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.35);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s ease-out;
}

.band:hover {
  --hv: 1;
}

.band:hover::before {
  opacity: 1;
}

.band:active {
  --pr: 1;
}

.band:focus-visible {
  outline: 3px solid var(--cf-accent);
  outline-offset: -6px;
}

.qText {
  position: relative;
  z-index: 2;
  display: block;
  min-inline-size: 0;
  max-inline-size: 30em;
  font-weight: 600;
  font-size: clamp(1.125rem, 0.95rem + 1.3cqi, 1.65rem);
  line-height: 1.22;
  letter-spacing: -0.02em;
  text-wrap: balance;
  overflow-wrap: break-word;
  hyphens: manual;
  transform: translateY(calc(var(--pr) * 1px));
  transition: transform 0.12s ease-out;
}

.qText::selection {
  background: var(--cf-accent);
  color: var(--cf-cream);
}

.mark {
  position: relative;
  z-index: 2;
  flex: none;
  display: grid;
  place-items: center;
  inline-size: 2rem;
  block-size: 2rem;
  color: var(--cf-accent);
  opacity: calc(0.8 + var(--hv) * 0.28);
  transition: opacity 0.2s ease-out;
}

.markOpen {
  opacity: 1;
}

.chev {
  display: block;
  inline-size: 1.5rem;
  block-size: 1.5rem;
  overflow: visible;
  transform-origin: 50% 50%;
  transform: rotate(calc(var(--p) * 180deg));
}

.chevLine {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ---- The answer: a clean sheet cut into pleats that fold flat ---- */

.answer {
  position: relative;
  z-index: 2;
  margin: 0;
  block-size: calc(var(--h) * var(--n) * var(--p));
  visibility: hidden;
  opacity: clamp(0, calc(var(--p) * 10), 1);
  perspective: 820px;
  perspective-origin: 50% -3.5rem;
}

.answerOpen {
  visibility: visible;
}

.answerStatic {
  transition:
    block-size 0.22s ease-out,
    visibility 0s linear 0.22s;
}

.answerStaticOpen {
  transition:
    block-size 0.22s ease-out,
    visibility 0s;
}

.cast {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: var(--sd, 1);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--cf-shadow) 50%, transparent),
    0 0.3rem 0.8rem -0.3rem color-mix(in srgb, var(--cf-shadow) 45%, transparent),
    0 1.5rem 2rem -1.2rem color-mix(in srgb, var(--cf-shadow) 55%, transparent);
}

.facet {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 100%;
  block-size: var(--h);
  transform-origin: 50% 0;
  transform-style: preserve-3d;
}

.facetFirst {
  inset-block-start: 0;
}

.slice {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--cf-cream);
}

.sliceLast {
  border-end-start-radius: 8px;
  border-end-end-radius: 8px;
}

/* Soft shade where the sheet slides out from under the band. */
.facetFirst > .slice::before {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  block-size: 0.9rem;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--cf-shadow) 26%, transparent) 0%,
    transparent 100%
  );
}

.copy {
  position: absolute;
  inset-inline: 0;
  inset-block-start: calc(var(--k) * var(--h) * -1);
  box-sizing: border-box;
  padding-block: clamp(1.25rem, 3cqi, 2rem) clamp(1.5rem, 3.6cqi, 2.4rem);
  padding-inline: var(--cf-pad) clamp(1rem, 4cqi, 3rem);
  color: var(--cf-ink);
  opacity: var(--tx, 1);
}

.copyGhost {
  pointer-events: none;
  user-select: none;
}

.answerText {
  margin: 0;
  max-inline-size: 62ch;
  font-weight: 400;
  font-size: clamp(1rem, 0.94rem + 0.32cqi, 1.1875rem);
  line-height: 1.65;
  letter-spacing: -0.003em;
  color: var(--cf-ink);
  text-wrap: pretty;
  overflow-wrap: break-word;
  hyphens: manual;
}

.answerText::selection {
  background: var(--cf-accent);
  color: var(--cf-cream);
}

/* Pleat shading: facets turned up catch the light, facets turned down fall into shade. */
.shadeLit,
.shadeDark,
.crease {
  position: absolute;
  inset-inline: 0;
  pointer-events: none;
  opacity: var(--sh, 0);
}

.shadeLit {
  inset-block: 0;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.28) 0%,
    rgba(255, 255, 255, 0) 40%,
    color-mix(in srgb, var(--cf-shadow) 8%, transparent) 100%
  );
}

.shadeDark {
  inset-block: 0;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--cf-shadow) 20%, transparent) 0%,
    color-mix(in srgb, var(--cf-shadow) 7%, transparent) 55%,
    rgba(255, 255, 255, 0.08) 100%
  );
}

.crease {
  inset-block-start: 0;
  block-size: 1px;
  background: color-mix(in srgb, var(--cf-shadow) 22%, transparent);
}
```
