import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export interface ThemeLensReview {
  text: string;
  name: string;
  detail?: string;
}

export interface ThemeLensTheme {
  label: string;
  keywords: string;
}

export interface ThemeLensReviewsProps {
  reviews?: ThemeLensReview[];
  themes?: ThemeLensTheme[];
  highlightColor?: string;
  startTheme?: number;
  heading?: string;
  summary?: string;
  themesLabel?: string;
  ariaLabel?: string;
  className?: string;
}

export const defaultReviews: ThemeLensReview[] = [
  {
    text: 'Our server remembered we were celebrating and brought two glasses of fizz without a word. The lamb was cooked perfectly, pink and smoky from the grill. For three courses the bill felt more than fair.',
    name: 'Hannah Whitfield',
    detail: 'Anniversary dinner',
  },
  {
    text: 'We walked in at lunch with a toddler and were seated within two minutes. Food arrived fast, which saved our afternoon. The bread is baked in-house and you can taste it.',
    name: 'Marcus Oyelaran',
    detail: 'Weekday lunch',
  },
  {
    text: 'Honestly the best value on the street. The set menu is worth every penny and portions are generous. Staff were friendly even when the room was packed.',
    name: 'Sofia Brandt',
    detail: 'Set menu for four',
  },
  {
    text: 'Every plate tasted fresh, like the herbs had been picked that morning. The wine list is short but well chosen.',
    name: 'Ravi Menon',
    detail: 'Friday dinner',
  },
  {
    text: 'Booked a table for twelve and the host handled every allergy with care. Starters came out quick and all at once. It cost less than we budgeted, so dessert was on us.',
    name: 'Claire Dubois',
    detail: 'Team celebration',
  },
  {
    text: 'Quiet corner, warm light, a playlist you actually notice. The tart was delicious, crisp pastry and barely sweet. We will be back for brunch.',
    name: 'Jonah Feld',
    detail: 'Date night',
  },
];

export const defaultThemes: ThemeLensTheme[] = [
  { label: 'Service', keywords: 'server, staff, host, friendly, seated, care, welcom, attentive' },
  { label: 'Price', keywords: 'price, bill, value, worth, cost, budget, fair, penny, cheap' },
  { label: 'Speed', keywords: 'fast, quick, minutes, wait, prompt, rush' },
  { label: 'Quality', keywords: 'perfectly, fresh, delicious, taste, crisp, baked, well chosen' },
];

type Sentence = { text: string; gap: string };
type Point = { x: number; y: number };

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const SENTENCE = /[^.!?]+(?:[.!?]+["'”’)\]]*|$)(\s*)/g;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const splitSentences = (text: string): Sentence[] =>
  Array.from(text.matchAll(SENTENCE), (m) => ({ text: m[0].slice(0, m[0].length - m[1].length), gap: m[1] })).filter(
    (s) => s.text.trim(),
  );

const themePattern = (keywords: string) => {
  const list = keywords.split(',').map((k) => k.trim()).filter(Boolean).map(escapeRe);
  return list.length ? new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${list.join('|')})`, 'iu') : null;
};

const springEasing = (stiffness = 170, damping = 17, samples = 48) => {
  const points: string[] = [];
  let x = 0;
  let v = 0;
  const dt = 1 / 240;
  const total = 0.9;
  const perSample = Math.round(total / dt / samples);
  for (let i = 0; i <= samples; i++) {
    points.push(x.toFixed(4));
    for (let s = 0; s < perSample; s++) {
      v += (stiffness * (1 - x) - damping * v) * dt;
      x += v * dt;
    }
  }
  points[points.length - 1] = '1';
  return `linear(${points.join(', ')})`;
};

const SPRING = springEasing();
const FALLBACK_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const GLIDE_MS = 900;
const GLIDE_STAGGER_MS = 28;
const INK_START_MS = 360;
const INK_STAGGER_MS = 85;
const MAX_INK_STEPS = 10;

const CHIPS_HELP =
  'Pick a theme to bring the reviews that mention it into focus and mark the matching sentences; pick it again to clear. Left and right arrows move between themes.';

export default function ThemeLensReviews({
  reviews = defaultReviews,
  themes = defaultThemes,
  highlightColor = '#1F35D8',
  startTheme = 1,
  heading = 'Read the praise that matters to you',
  summary = '{count} of {total} reviews mention {theme}',
  themesLabel = 'Highlight a theme',
  ariaLabel = 'Customer reviews',
  className,
}: ThemeLensReviewsProps) {
  const [active, setActive] = useState(() => (startTheme >= 0 && startTheme < themes.length ? startTheme : -1));
  const [primed, setPrimed] = useState(true);
  const rootRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rowRefs = useRef(new Map<number, HTMLLIElement>());
  const before = useRef<Map<number, Point> | null>(null);
  const running = useRef<Animation[]>([]);

  const parsed = useMemo(() => reviews.map((r) => splitSentences(r.text)), [reviews]);

  const hits = useMemo(
    () =>
      themes.map((t) => {
        const re = themePattern(t.keywords);
        return parsed.map((sents) => sents.map((s) => (re ? re.test(s.text) : false)));
      }),
    [themes, parsed],
  );

  const counts = useMemo(() => hits.map((perReview) => perReview.filter((row) => row.some(Boolean)).length), [hits]);

  const theme = active >= 0 ? themes[active] : undefined;
  const activeHits = active >= 0 ? hits[active] : undefined;
  const lensOn = !!theme && counts[active] > 0;

  const order = useMemo(() => {
    const all = reviews.map((_, i) => i);
    if (!activeHits) return all;
    const matched = (i: number) => activeHits[i].some(Boolean);
    return [...all.filter(matched), ...all.filter((i) => !matched(i))];
  }, [reviews, activeHits]);

  const lead = useMemo(() => {
    if (!activeHits) return null;
    const ri = order.find((i) => activeHits[i].some(Boolean));
    if (ri === undefined) return null;
    const si = activeHits[ri].findIndex(Boolean);
    if (si < 0) return null;
    return { ri, si, text: parsed[ri][si].text, review: reviews[ri] };
  }, [activeHits, order, parsed, reviews]);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!root || reduce || typeof IntersectionObserver === 'undefined') return;
    setPrimed(false);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setPrimed(true);
        io.disconnect();
      },
      { rootMargin: '0px 0px -15% 0px' },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useIsoLayoutEffect(() => {
    const from = before.current;
    before.current = null;
    if (!from) return;
    running.current.forEach((a) => a.cancel());
    running.current = [];
    const easing = CSS.supports('transition-timing-function', 'linear(0, 1)') ? SPRING : FALLBACK_EASE;
    order.forEach((ri, slot) => {
      const el = rowRefs.current.get(ri);
      const prev = from.get(ri);
      if (!el || !prev) return;
      const now = el.getBoundingClientRect();
      const dx = prev.x - now.left;
      const dy = prev.y - now.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      running.current.push(
        el.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }], {
          duration: GLIDE_MS,
          delay: slot * GLIDE_STAGGER_MS,
          easing,
          fill: 'backwards',
        }),
      );
    });
    const list = listRef.current;
    if (list)
      running.current.push(
        list.animate(
          [{ filter: 'blur(0px)' }, { filter: 'blur(1.2px)', offset: 0.3 }, { filter: 'blur(0px)' }],
          { duration: 460, easing: 'ease-out' },
        ),
      );
  }, [order]);

  const choose = (next: number) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && typeof Element !== 'undefined' && 'animate' in Element.prototype) {
      const snap = new Map<number, Point>();
      rowRefs.current.forEach((el, ri) => {
        const r = el.getBoundingClientRect();
        snap.set(ri, { x: r.left, y: r.top });
      });
      before.current = snap;
    }
    setPrimed(true);
    setActive(next);
  };

  const toggle = (i: number) => choose(active === i ? -1 : i);

  const onChipKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const current = chipRefs.current.findIndex((el) => el === document.activeElement);
    if (current < 0) return;
    e.preventDefault();
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const step = (e.key === 'ArrowRight') !== rtl ? 1 : -1;
    const last = themes.length - 1;
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? last : (current + step + themes.length) % themes.length;
    chipRefs.current[next]?.focus();
  };

  const summaryParts = theme
    ? summary.split(/(\{count\}|\{total\}|\{theme\})/).map((part, i) => {
        if (part === '{count}')
          return (
            <span key={`c${active}-${i}`} className={styles.count}>
              {counts[active]}
            </span>
          );
        if (part === '{total}')
          return (
            <span key={i} className={styles.total}>
              {reviews.length}
            </span>
          );
        if (part === '{theme}')
          return (
            <span key={`t${active}-${i}`} className={primed ? `${styles.themeWord} ${styles.inkOn}` : styles.themeWord}>
              {theme.label.toLowerCase()}
            </span>
          );
        return part;
      })
    : null;

  let inkStep = 0;

  return (
    <section
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={{ '--tl-hl': highlightColor } as CSSProperties}
      aria-label={ariaLabel}
    >
      <div className={styles.inner}>
        {heading && <h2 className={styles.heading}>{heading}</h2>}

        {lead && (
          <div key={active} className={styles.hero}>
            <p className={styles.heroText}>
              <mark
                className={primed ? `${styles.ink} ${styles.inkOn}` : styles.ink}
                style={{ '--tl-delay': '120ms' } as CSSProperties}
              >
                {lead.text}
              </mark>
            </p>
            <p className={styles.heroWho}>
              <span className={styles.heroName}>{lead.review.name}</span>
              {lead.review.detail ? <span>{` · ${lead.review.detail}`}</span> : null}
            </p>
          </div>
        )}

        <div className={styles.controls}>
          <div className={styles.chipScroller}>
            <div
              className={styles.chips}
              role="group"
              aria-label={themesLabel}
              aria-description={CHIPS_HELP}
              onKeyDown={onChipKey}
            >
              {themes.map((t, i) => {
                const on = i === active;
                return (
                  <button
                    key={`${t.label}-${i}`}
                    ref={(el) => {
                      chipRefs.current[i] = el;
                    }}
                    type="button"
                    className={on ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                    aria-pressed={on}
                    onClick={() => toggle(i)}
                  >
                    <span className={styles.chipLabel}>{t.label}</span>
                    <span className={on ? `${styles.chipCount} ${styles.chipCountOn}` : styles.chipCount}>
                      {counts[i]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className={styles.summary} aria-live="polite">
            {summaryParts}
          </p>
        </div>

        <ul ref={listRef} className={styles.list}>
          {order.map((ri) => {
            const r = reviews[ri];
            const rowHits = activeHits?.[ri];
            const matched = !!rowHits?.some(Boolean);
            const receded = primed && lensOn && !matched;
            const depth = primed && lensOn ? (matched ? styles.rowFocus : styles.rowBlur) : '';
            return (
              <li
                key={ri}
                tabIndex={receded ? 0 : undefined}
                ref={(el) => {
                  if (el) rowRefs.current.set(ri, el);
                  else rowRefs.current.delete(ri);
                }}
                className={[styles.row, depth].filter(Boolean).join(' ')}
              >
                <div className={matched && lensOn ? `${styles.who} ${styles.whoOn}` : styles.who}>
                  <span className={styles.name}>{r.name}</span>
                  {r.detail && <span className={styles.detail}>{r.detail}</span>}
                </div>
                <p className={styles.text}>
                  {parsed[ri].map((s, si) => {
                    const hit = !!rowHits?.[si];
                    if (!lensOn) return <span key={si}>{s.text + s.gap}</span>;
                    if (lead && ri === lead.ri && si === lead.si) return <span key={si}>{s.gap}</span>;
                    if (!hit)
                      return (
                        <span key={si} className={styles.quiet}>
                          {s.text + s.gap}
                        </span>
                      );
                    const delay = INK_START_MS + Math.min(inkStep++, MAX_INK_STEPS) * INK_STAGGER_MS;
                    return (
                      <span key={`${active}-${si}`}>
                        <mark
                          className={primed ? `${styles.ink} ${styles.inkOn}` : styles.ink}
                          style={{ '--tl-delay': `${delay}ms` } as CSSProperties}
                        >
                          {s.text}
                        </mark>
                        {s.gap}
                      </span>
                    );
                  })}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
