Create a custom element called "Theme Lens Reviews". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: reviews (text, name, optional detail line), themes (label, words to highlight), highlight colour, theme highlighted at start, heading, summary line. Add other settings if they help.

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
```

```css
@font-face {
  font-family: 'Inter Tight';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url('./fonts/inter-tight-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Inter Tight';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url('./fonts/inter-tight-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9E, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

.root {
  --tl-hl: #1f35d8;
  --tl-ground: #ffffff;
  --tl-ink: #0b0d12;
  --tl-muted: #5a5f6c;
  --tl-quiet: #6b7280;
  --tl-line: rgba(11, 13, 18, 0.1);
  --tl-on-hl: #ffffff;
  --tl-font-display: 'Inter Tight', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --tl-font-ui: 'Inter Tight', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --tl-marker: color-mix(in srgb, var(--tl-hl) 36%, var(--tl-ground));
  --tl-marker-deep: color-mix(in srgb, var(--tl-hl) 55%, var(--tl-ground));
  --tl-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --tl-ink-texture: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 40' preserveAspectRatio='none'><filter id='s' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.012 0.55' numOctaves='2' seed='7'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.9 -0.95'/></filter><rect width='240' height='40' filter='url(%23s)' opacity='0.75'/><path fill='white' d='M0 0H240V2.2L222 3.1 204 2.4 186 3.4 168 2.6 150 3.6 131 2.9 112 4 94 3.3 76 4.4 58 3.7 39 4.9 21 4.2 0 5.6Z'/><path fill='white' d='M0 40H240V35.4L221 36.1 203 35.3 184 36.4 166 35.7 147 36.7 129 36 110 37.1 92 36.4 73 37.4 55 36.8 36 37.8 18 37.2 0 38.2Z'/><path fill='white' d='M0 0H7L0 14Z'/><path fill='white' d='M240 40H233L240 26Z'/><rect x='14' y='10.5' width='190' height='1.1' fill='white' opacity='0.32'/><rect x='40' y='19' width='182' height='0.9' fill='white' opacity='0.22'/><rect x='6' y='27.5' width='150' height='1.2' fill='white' opacity='0.28'/></svg>");

  position: relative;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  border: 1px solid var(--tl-line);
  border-radius: 24px;
  background: var(--tl-ground);
  color: var(--tl-ink);
  font-family: var(--tl-font-ui);
  scrollbar-color: color-mix(in srgb, var(--tl-hl) 45%, transparent) transparent;
  -webkit-font-smoothing: antialiased;
}

.inner {
  --tl-gutter: 20px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  box-sizing: border-box;
  max-inline-size: 1240px;
  margin-inline: auto;
  padding-block: 40px 16px;
  padding-inline: var(--tl-gutter);
}

.heading {
  margin: 0;
  max-inline-size: 34ch;
  font-family: var(--tl-font-display);
  font-weight: 640;
  font-size: clamp(19px, 2.3cqi, 26px);
  line-height: 1.2;
  letter-spacing: -0.014em;
  color: var(--tl-muted);
  text-wrap: balance;
  overflow-wrap: break-word;
}

.hero {
  margin: 22px 0 0;
  animation: heroRise 0.55s var(--tl-ease) both;
}

.heroText {
  margin: 0;
  max-inline-size: 26ch;
  text-wrap: balance;
}

.heroText .ink {
  font-family: var(--tl-font-display);
  font-size: clamp(40px, 5.4cqi, 64px);
  font-weight: 700;
  line-height: 1.06;
  letter-spacing: -0.03em;
  padding-inline: 0.22em 0.26em;
  margin-inline: -0.14em -0.08em;
}

.heroWho {
  display: block;
  margin: 18px 0 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--tl-muted);
  overflow-wrap: anywhere;
}

.heroName {
  color: var(--tl-ink);
  font-weight: 640;
}

@keyframes heroRise {
  from {
    opacity: 0;
    translate: 0 12px;
  }
}

.heading::selection,
.summary::selection,
.text::selection,
.name::selection,
.detail::selection,
.ink::selection {
  background: color-mix(in srgb, var(--tl-hl) 24%, transparent);
  color: var(--tl-ink);
}

.controls {
  display: grid;
  gap: 14px;
  min-inline-size: 0;
  position: relative;
  z-index: 1;
  margin-block-start: 32px;
  padding-block-end: 20px;
  border-block-end: 1px solid var(--tl-ink);
}

.chipScroller {
  min-inline-size: 0;
  margin-inline: calc(var(--tl-gutter) * -1);
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scroll-snap-type: x proximity;
  scroll-padding-inline: var(--tl-gutter);
  scrollbar-width: none;
  mask-image: linear-gradient(to right, transparent 0, #000 20px, #000 calc(100% - 36px), transparent 100%);
}

.chipScroller::-webkit-scrollbar {
  display: none;
}

.chips {
  display: flex;
  gap: 8px;
  inline-size: max-content;
  padding-block: 4px;
  padding-inline: var(--tl-gutter);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-block-size: 44px;
  padding-block: 6px;
  padding-inline: 16px 8px;
  border: 1px solid var(--tl-line);
  border-radius: 999px;
  background: var(--tl-ground);
  color: var(--tl-ink);
  font: inherit;
  font-size: 15px;
  font-weight: 560;
  letter-spacing: -0.01em;
  white-space: nowrap;
  cursor: pointer;
  scroll-snap-align: start;
  transition:
    background-color 0.22s ease,
    border-color 0.22s ease,
    color 0.22s ease,
    scale 0.35s var(--tl-ease);
}

.chip:hover {
  border-color: color-mix(in srgb, var(--tl-hl) 45%, var(--tl-line));
}

.chip:active {
  scale: 0.96;
}

.chip:focus-visible {
  outline: 2px solid var(--tl-hl);
  outline-offset: 2px;
}

.chipOn,
.chipOn:hover {
  border-color: var(--tl-hl);
  background: var(--tl-hl);
  color: var(--tl-on-hl);
}

.chipLabel {
  line-height: 1.2;
}

.chipCount {
  display: inline-grid;
  place-items: center;
  min-inline-size: 26px;
  block-size: 26px;
  padding-inline: 7px;
  box-sizing: border-box;
  border-radius: 999px;
  background: rgba(11, 13, 18, 0.05);
  color: var(--tl-muted);
  font-size: 13px;
  font-weight: 620;
  font-variant-numeric: tabular-nums;
  transition: background-color 0.22s ease, color 0.22s ease;
}

.chipCountOn {
  background: color-mix(in srgb, var(--tl-on-hl) 22%, transparent);
  color: var(--tl-on-hl);
}

.summary {
  margin: 0;
  min-block-size: 1.5em;
  min-inline-size: 0;
  font-size: 16px;
  line-height: 1.5;
  color: var(--tl-muted);
  overflow-wrap: anywhere;
}

.count,
.total {
  font-weight: 680;
  font-variant-numeric: tabular-nums;
  color: var(--tl-ink);
}

.count {
  display: inline-block;
  color: var(--tl-hl);
  animation: tick 0.5s var(--tl-ease) both;
}

@keyframes tick {
  from {
    opacity: 0;
    translate: 0 0.5em;
  }
}

.themeWord {
  color: var(--tl-ink);
  font-weight: 620;
  padding-inline: 0.16em;
  margin-inline: -0.04em;
  background-color: transparent;
  background-image:
    var(--tl-ink-texture),
    linear-gradient(var(--tl-marker-deep), var(--tl-marker-deep)),
    linear-gradient(var(--tl-marker), var(--tl-marker));
  background-repeat: no-repeat;
  background-position: 0 0;
  background-size: 100% 0%, 100% 0%, 100% 0%;
}

.list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  list-style: none;
  margin: -1px 0 0;
  padding: 0;
}

.row {
  display: grid;
  gap: 10px;
  align-content: start;
  padding-block: 22px 26px;
  border-block-start: 1px solid var(--tl-line);
  transform-origin: 50% 0;
  transition:
    filter 0.45s var(--tl-ease),
    opacity 0.45s var(--tl-ease),
    scale 0.6s var(--tl-ease);
}

.rowFocus {
  transition-delay: 0.22s;
}

.rowBlur {
  filter: blur(1.8px);
  opacity: 0.42;
  scale: 0.975;
}

.rowBlur:hover,
.rowBlur:focus-visible {
  filter: blur(0);
  opacity: 1;
  scale: 0.99;
  transition-delay: 0s;
}

.rowBlur:focus-visible {
  outline: 2px solid var(--tl-hl);
  outline-offset: 6px;
}

.who {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 10px;
  min-inline-size: 0;
}

.name {
  font-size: 15px;
  font-weight: 640;
  letter-spacing: -0.01em;
  color: var(--tl-ink);
  overflow-wrap: anywhere;
  transition: color 0.35s ease;
}

.whoOn .name {
  color: var(--tl-hl);
}

.detail {
  font-size: 14px;
  color: var(--tl-muted);
  overflow-wrap: anywhere;
}

.text {
  margin: 0;
  max-inline-size: 36em;
  font-family: var(--tl-font-display);
  font-size: 19px;
  font-weight: 450;
  line-height: 1.45;
  letter-spacing: -0.012em;
  color: var(--tl-ink);
  overflow-wrap: break-word;
  text-wrap: pretty;
}

.quiet {
  color: var(--tl-quiet);
  transition: color 0.45s ease;
}

.ink {
  color: var(--tl-quiet);
  padding-block: 0.04em;
  padding-inline: 0.18em;
  margin-inline: -0.12em;
  border-radius: 1px;
  background-color: transparent;
  background-image:
    var(--tl-ink-texture),
    linear-gradient(var(--tl-marker-deep), var(--tl-marker-deep)),
    linear-gradient(var(--tl-marker), var(--tl-marker));
  background-repeat: no-repeat;
  background-position: 0 0;
  background-size: 100% 0%, 100% 0%, 100% 0%;
}

.inkOn {
  animation: draw 0.9s cubic-bezier(0.55, 0.05, 0.25, 1) var(--tl-delay, 0ms) both;
}

@keyframes draw {
  from {
    background-size: 100% 0%, 100% 0%, 100% 0%;
    color: var(--tl-quiet);
  }
  55% {
    background-size: 100% 0%, 100% 0%, 100% 100%;
    color: var(--tl-ink);
  }
  85% {
    background-size: 100% 100%, 100% calc(100% - 0.22em), 100% 100%;
    color: var(--tl-ink);
  }
  to {
    background-size: 100% 100%, 100% calc(100% - 0.22em), 100% 100%;
    color: var(--tl-ink);
  }
}

@container (min-width: 720px) {
  .inner {
    --tl-gutter: 48px;
    padding-block: 64px 24px;
  }

  .controls {
    grid-template-columns: minmax(0, 1fr) minmax(0, max-content);
    align-items: center;
    gap: 24px;
    margin-block-start: 44px;
  }

  .chipScroller {
    margin-inline-end: 0;
  }

  .chips {
    padding-inline-end: 24px;
  }

  .summary {
    max-inline-size: 30ch;
    text-align: end;
  }

  .list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: clamp(32px, 5cqi, 72px);
  }

  .row {
    gap: 14px;
    padding-block: 26px 34px;
  }

  .text {
    font-size: clamp(20px, 2cqi, 24px);
    line-height: 1.42;
  }
}

@container (max-width: 480px) {
  .text {
    font-size: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chip,
  .row,
  .quiet,
  .name {
    transition: none;
  }

  .rowBlur {
    filter: none;
    scale: 1;
  }

  .ink,
  .themeWord {
    color: var(--tl-ink);
    background-size: 100% 100%, 100% calc(100% - 0.22em), 100% 100%;
  }

  .inkOn,
  .count,
  .hero {
    animation: none;
  }
}
```
