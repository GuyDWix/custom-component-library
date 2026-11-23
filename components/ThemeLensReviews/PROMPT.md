Create a custom element called "Theme Lens Reviews". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: reviews (text, name, optional detail line), themes (label, words to highlight), highlight colour, theme highlighted at start, small heading, heading, summary line. Add other settings if they help.

```tsx
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
```

```css
.root {
  --tl-hl: #ff9a62;
  --tl-stage: #f1e7d8;
  --tl-paper: #fffaf1;
  --tl-ink: #2b2723;
  --tl-muted: rgba(43, 39, 35, 0.62);
  --tl-shadow: 92, 58, 26;
  --tl-font-serif: 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif;
  --tl-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --tl-band: color-mix(in srgb, var(--tl-hl) 58%, transparent);
  --tl-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.15  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 28px;
  background:
    radial-gradient(60% 50% at 88% 0%, color-mix(in srgb, var(--tl-hl) 16%, transparent) 0%, transparent 70%),
    radial-gradient(70% 60% at 0% 100%, rgba(255, 255, 255, 0.55) 0%, transparent 65%),
    var(--tl-stage);
  color: var(--tl-ink);
  font-family: var(--tl-font-ui);
}

.grain {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background-image: var(--tl-noise);
  mix-blend-mode: multiply;
  opacity: 0.32;
}

.inner {
  display: grid;
  --tl-gutter: 20px;
  grid-template-columns: minmax(0, 1fr);
  gap: 28px;
  box-sizing: border-box;
  max-inline-size: 1200px;
  margin-inline: auto;
  padding-block: 44px;
  padding-inline: var(--tl-gutter);
}

.head {
  display: grid;
  gap: 10px;
}

.eyebrow {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tl-muted);
}

.eyebrow::before {
  content: '';
  inline-size: 22px;
  block-size: 8px;
  border-radius: 2px 6px 3px 5px;
  background: var(--tl-band);
  transform: rotate(-3deg);
}

.heading {
  margin: 0;
  font-family: var(--tl-font-serif);
  font-weight: 600;
  max-inline-size: 18ch;
  font-size: clamp(30px, 5.4cqi, 58px);
  line-height: 1.04;
  letter-spacing: -0.025em;
  text-wrap: balance;
  overflow-wrap: break-word;
}

.controls {
  display: grid;
  gap: 14px;
  min-inline-size: 0;
}

.chipScroller {
  min-inline-size: 0;
  margin-inline: calc(var(--tl-gutter) * -1);
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  mask-image: linear-gradient(to right, transparent 0, #000 20px, #000 calc(100% - 36px), transparent 100%);
}

.chipScroller::-webkit-scrollbar {
  display: none;
}

.chips {
  display: flex;
  gap: 10px;
  inline-size: max-content;
  padding-block: 6px;
  padding-inline: var(--tl-gutter);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-block-size: 48px;
  padding-block: 8px;
  padding-inline: 16px 10px;
  border: 1px solid rgba(var(--tl-shadow), 0.16);
  border-radius: 999px;
  background: linear-gradient(180deg, #fffdf8 0%, var(--tl-paper) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 1px 2px rgba(var(--tl-shadow), 0.08),
    0 6px 14px -8px rgba(var(--tl-shadow), 0.3);
  color: var(--tl-ink);
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  scroll-snap-align: start;
  transition:
    background-color 0.25s ease,
    color 0.25s ease,
    box-shadow 0.25s ease,
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.chip:hover {
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 2px 4px rgba(var(--tl-shadow), 0.1),
    0 10px 20px -10px rgba(var(--tl-shadow), 0.4);
}

.chip:active {
  transform: scale(0.96);
}

.chip:focus-visible {
  outline: 2px solid var(--tl-ink);
  outline-offset: 3px;
}

.chipOn {
  border-color: var(--tl-ink);
  background: linear-gradient(180deg, #3a3530 0%, var(--tl-ink) 100%);
  color: var(--tl-paper);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 2px 4px rgba(var(--tl-shadow), 0.2),
    0 12px 22px -10px rgba(var(--tl-shadow), 0.55);
}

.chipOn:hover {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 2px 4px rgba(var(--tl-shadow), 0.2),
    0 14px 24px -10px rgba(var(--tl-shadow), 0.6);
}

.swatch {
  inline-size: 14px;
  block-size: 14px;
  border-radius: 4px 7px 5px 6px;
  border: 1.5px solid currentColor;
  opacity: 0.55;
  transform: rotate(-8deg);
  transition:
    background-color 0.25s ease,
    border-color 0.25s ease,
    opacity 0.25s ease,
    transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.swatchOn {
  border-color: var(--tl-hl);
  background-color: var(--tl-hl);
  opacity: 1;
  transform: rotate(-8deg) scale(1.15);
}

.chipLabel {
  line-height: 1.2;
}

.chipCount {
  display: inline-grid;
  place-items: center;
  min-inline-size: 26px;
  block-size: 26px;
  padding-inline: 6px;
  box-sizing: border-box;
  border-radius: 999px;
  background: rgba(var(--tl-shadow), 0.1);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.chipCountOn {
  background: rgba(255, 250, 241, 0.16);
}

.summary {
  margin: 0;
  min-block-size: 1.5em;
  font-size: 16px;
  line-height: 1.5;
  color: var(--tl-muted);
  overflow-wrap: break-word;
}

.summaryOn {
  color: var(--tl-ink);
}

.count,
.total {
  font-family: var(--tl-font-serif);
  font-weight: 700;
  font-size: 1.25em;
  font-variant-numeric: tabular-nums;
}

.themeWord {
  font-weight: 600;
  background: linear-gradient(transparent 58%, var(--tl-band) 58%, var(--tl-band) 92%, transparent 92%);
}

.grid {
  list-style: none;
  margin: 0;
  padding: 0;
  columns: 3 280px;
  column-gap: 20px;
}

.card {
  position: relative;
  display: grid;
  gap: 18px;
  break-inside: avoid;
  margin-block-end: 20px;
  padding-block: 26px 22px;
  padding-inline: 24px;
  border-radius: 6px 6px 10px 8px;
  border: 1px solid rgba(var(--tl-shadow), 0.1);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, transparent 28%),
    var(--tl-paper);
  box-shadow:
    inset 0 1px 0 #fff,
    0 1px 1px rgba(var(--tl-shadow), 0.06),
    0 3px 6px -2px rgba(var(--tl-shadow), 0.08),
    0 18px 32px -18px rgba(var(--tl-shadow), 0.38);
  transition:
    box-shadow 0.4s ease,
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.cardDim {
  transform: translateY(2px);
  box-shadow:
    inset 0 1px 0 #fff,
    0 1px 1px rgba(var(--tl-shadow), 0.05),
    0 6px 14px -12px rgba(var(--tl-shadow), 0.25);
}

.tab {
  position: absolute;
  inset-block-start: -1px;
  inset-inline-start: 24px;
  inline-size: 44px;
  block-size: 6px;
  border-radius: 0 0 4px 4px;
  background: var(--tl-hl);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.tabOn {
  transform: scaleX(1);
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s;
}

.quoteMark {
  position: absolute;
  inset-block-start: 6px;
  inset-inline-end: 18px;
  font-family: var(--tl-font-serif);
  font-size: 72px;
  line-height: 1;
  color: color-mix(in srgb, var(--tl-hl) 45%, var(--tl-paper));
  pointer-events: none;
}

.text {
  position: relative;
  margin: 0;
  font-family: var(--tl-font-serif);
  font-size: 18px;
  line-height: 1.62;
  color: var(--tl-ink);
  overflow-wrap: break-word;
}

.dim {
  opacity: 0.55;
  transition: opacity 0.45s ease;
}

.band {
  color: inherit;
  padding-inline: 0.12em;
  margin-inline: -0.12em;
  border-radius: 0.2em 0.35em 0.25em 0.3em;
  background-color: transparent;
  background-image:
    linear-gradient(to bottom, transparent 54%, rgba(255, 255, 255, 0.22) 60%, transparent 68%),
    linear-gradient(to bottom, transparent 14%, var(--tl-band) 22%, var(--tl-band) 88%, transparent 97%);
  background-repeat: no-repeat;
  background-position: 0 0;
  background-size: 0% 100%;
  transition: background-size 0.25s cubic-bezier(0.4, 0, 1, 1);
}

.bandOn {
  background-size: 100% 100%;
  transition: background-size 0.75s cubic-bezier(0.65, 0, 0.25, 1) var(--tl-delay, 0ms);
}

.byline {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-block-start: 16px;
  border-block-start: 1px dashed rgba(var(--tl-shadow), 0.18);
  transition: opacity 0.45s ease;
}

.bylineDim {
  opacity: 0.55;
}

.avatar {
  flex: none;
  display: grid;
  place-items: center;
  inline-size: 40px;
  block-size: 40px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--tl-hl) 24%, var(--tl-paper));
  box-shadow: inset 0 0 0 1px rgba(var(--tl-shadow), 0.12);
  color: var(--tl-ink);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.who {
  display: grid;
  min-inline-size: 0;
}

.name {
  font-size: 15px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.detail {
  font-size: 14px;
  color: var(--tl-muted);
  overflow-wrap: anywhere;
}

@container (min-width: 900px) {
  .inner {
    --tl-gutter: 48px;
    gap: 36px;
    padding-block: 64px;
  }

  .text {
    font-size: 19px;
  }
}

@container (max-width: 480px) {
  .card {
    padding-inline: 20px;
  }

  .text {
    font-size: 17px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .band,
  .bandOn,
  .tab,
  .tabOn,
  .dim,
  .chip,
  .swatch,
  .card,
  .byline {
    transition: none;
  }
}
```
