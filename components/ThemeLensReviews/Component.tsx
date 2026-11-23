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
  eyebrow?: string;
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

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const STAGGER_MS = 70;
const MAX_STAGGER = 9;

const CHIPS_HELP = 'Pick a theme to highlight it in every review; pick it again to clear. Left and right arrows move between themes.';

export default function ThemeLensReviews({
  reviews = defaultReviews,
  themes = defaultThemes,
  highlightColor = '#FF9A62',
  startTheme = 0,
  eyebrow = 'Guest reviews',
  heading = 'Read the praise that matters to you',
  summary = '{count} of {total} reviews mention {theme}',
  themesLabel = 'Highlight a theme',
  ariaLabel = 'Customer reviews',
  className,
}: ThemeLensReviewsProps) {
  const [active, setActive] = useState(() => (startTheme >= 0 && startTheme < themes.length ? startTheme : -1));
  const [primed, setPrimed] = useState(true);
  const rootRef = useRef<HTMLElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);

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
      { rootMargin: '0px 0px -12% 0px' },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const toggle = (i: number) => {
    setPrimed(true);
    setActive((cur) => (cur === i ? -1 : i));
  };

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

  const theme = active >= 0 ? themes[active] : undefined;
  const activeHits = active >= 0 ? hits[active] : undefined;

  const summaryParts = theme
    ? summary.split(/(\{count\}|\{total\}|\{theme\})/).map((part, i) => {
        if (part === '{count}')
          return (
            <span key={i} className={styles.count}>
              {counts[active]}
            </span>
          );
        if (part === '{total}') return <span key={i} className={styles.total}>{reviews.length}</span>;
        if (part === '{theme}') return <span key={i} className={styles.themeWord}>{theme.label.toLowerCase()}</span>;
        return part;
      })
    : null;

  let order = 0;

  return (
    <section
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={{ '--tl-hl': highlightColor } as CSSProperties}
      aria-label={ariaLabel}
    >
      <span className={styles.grain} aria-hidden="true" />
      <div className={styles.inner}>
        <header className={styles.head}>
          {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
          {heading && <h2 className={styles.heading}>{heading}</h2>}
        </header>

        <div className={styles.controls}>
          <div className={styles.chipScroller}>
            <div className={styles.chips} role="group" aria-label={themesLabel} aria-description={CHIPS_HELP} onKeyDown={onChipKey}>
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
                    <span className={on ? `${styles.swatch} ${styles.swatchOn}` : styles.swatch} aria-hidden="true" />
                    <span className={styles.chipLabel}>{t.label}</span>
                    <span className={on ? `${styles.chipCount} ${styles.chipCountOn}` : styles.chipCount}>{counts[i]}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className={theme ? `${styles.summary} ${styles.summaryOn}` : styles.summary} aria-live="polite">
            {summaryParts}
          </p>
        </div>

        <ul className={styles.grid}>
          {reviews.map((r, ri) => {
            const rowHits = activeHits?.[ri];
            const matched = !!rowHits?.some(Boolean);
            const dimCard = !!theme && !matched;
            return (
              <li key={`${r.name}-${ri}`} className={dimCard ? `${styles.card} ${styles.cardDim}` : styles.card}>
                <span className={matched ? `${styles.tab} ${styles.tabOn}` : styles.tab} aria-hidden="true" />
                <span className={styles.quoteMark} aria-hidden="true">
                  “
                </span>
                <p className={styles.text}>
                  {parsed[ri].map((s, si) => {
                    const hit = !!rowHits?.[si];
                    if (!theme) return <span key={si}>{s.text + s.gap}</span>;
                    if (!hit)
                      return (
                        <span key={si} className={styles.dim}>
                          {s.text + s.gap}
                        </span>
                      );
                    const delay = Math.min(order++, MAX_STAGGER) * STAGGER_MS;
                    return (
                      <span key={si}>
                        <mark
                          className={primed ? `${styles.band} ${styles.bandOn}` : styles.band}
                          style={{ '--tl-delay': `${delay}ms` } as CSSProperties}
                        >
                          {s.text}
                        </mark>
                        {s.gap}
                      </span>
                    );
                  })}
                </p>
                <footer className={dimCard ? `${styles.byline} ${styles.bylineDim}` : styles.byline}>
                  <span className={styles.avatar} aria-hidden="true">
                    {initials(r.name)}
                  </span>
                  <span className={styles.who}>
                    <span className={styles.name}>{r.name}</span>
                    {r.detail && <span className={styles.detail}>{r.detail}</span>}
                  </span>
                </footer>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
