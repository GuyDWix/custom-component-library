import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import styles from './Component.module.css';

export interface ConcertinaFAQQuestion {
  question: string;
  answer: string;
}

export interface ConcertinaFAQProps {
  questions?: ConcertinaFAQQuestion[];
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


  return (
    <div ref={rootRef} className={styles.root}>
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
