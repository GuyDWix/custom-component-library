Create a custom element called "Rolling Price Toggle". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: options (label, price, billing period, saving badge text, included features one per line), currency symbol, highlight color. Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export interface RollingPriceOption {
  label: string;
  price: number;
  period: string;
  saving: string;
  /** One included feature per line. Lines that appear in several options glide to their new place. */
  features: string;
}

export interface RollingPriceToggleProps {
  options?: RollingPriceOption[];
  currency?: string;
  highlightColor?: string;
  className?: string;
}

export const defaultOptions: RollingPriceOption[] = [
  {
    label: 'Monthly',
    price: 14,
    period: 'per month',
    saving: '',
    features: [
      'Everyday current account',
      'Round-up savings pot',
      'Free cash withdrawals',
      'Card payments abroad',
      'Monthly statements',
    ].join('\n'),
  },
  {
    label: 'Quarterly',
    price: 39,
    period: 'per quarter',
    saving: 'Save $3 a quarter',
    features: [
      'Everyday current account',
      'Round-up savings pot',
      'Card payments abroad',
      'Free cash withdrawals',
      'Monthly statements',
      'Spending insights',
    ].join('\n'),
  },
  {
    label: 'Yearly',
    price: 140,
    period: 'per year',
    saving: 'Save $28 a year',
    features: [
      'Boosted savings rate',
      'Card payments abroad',
      'Round-up savings pot',
      'Everyday current account',
      'Free cash withdrawals',
      'Priority phone support',
      'Spending insights',
    ].join('\n'),
  },
];

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Ghost extends Rect {
  key: string;
  text: string;
}
interface Pending {
  rects: Map<string, Rect>;
  height: number;
}
interface Slot {
  ch: string | null;
  r: number;
}

const SPRING_EASE = 'cubic-bezier(.22, 1.12, .36, 1)';
const SETTLE_EASE = 'cubic-bezier(.2, .8, .2, 1)';

const parseFeatures = (text: string) =>
  text
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter(Boolean);

const keyed = (list: string[]) => {
  const seen = new Map<string, number>();
  return list.map((text) => {
    const n = seen.get(text) ?? 0;
    seen.set(text, n + 1);
    return { key: `${text}#${n}`, text };
  });
};

const cleanPrice = (v: number) => (Number.isFinite(v) ? Math.round(Math.abs(v) * 100) / 100 : 0);

const formatPrice = (v: number, decimals: number) =>
  cleanPrice(v).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const HELP = 'Use the left and right arrow keys to switch between options. The price and included features update.';

export default function RollingPriceToggle({
  options = defaultOptions,
  currency = '$',
  highlightColor = '#e2b13c',
  className,
}: RollingPriceToggleProps) {
  const opts = options.length > 0 ? options : defaultOptions;
  const [sel, setSel] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const uid = useId();

  const idx = Math.min(sel, opts.length - 1);
  const current = opts[idx];

  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const pending = useRef<Pending | null>(null);
  const ghostTimer = useRef(0);
  const heightTimer = useRef(0);

  const lists = useMemo(() => opts.map((o) => keyed(parseFeatures(o.features))), [opts]);
  const decimals = useMemo(() => (opts.some((o) => !Number.isInteger(cleanPrice(o.price))) ? 2 : 0), [opts]);
  const texts = useMemo(() => opts.map((o) => formatPrice(o.price, decimals)), [opts, decimals]);
  const maxLen = useMemo(() => Math.max(...texts.map((t) => t.length)), [texts]);
  const widthUnits = useMemo(
    () => Math.max(...texts.map((t) => t.replace(/[^0-9]/g, '').length + 0.4 * t.replace(/[0-9]/g, '').length)),
    [texts],
  );

  const priceText = texts[idx];
  const slots: Slot[] = [];
  for (let r = maxLen - 1; r >= 0; r--) {
    slots.push({ ch: priceText[priceText.length - 1 - r] ?? null, r });
  }

  const feats = lists[idx];
  const maxFeatures = Math.max(...lists.map((l) => l.length), 1);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(ghostTimer.current);
      window.clearTimeout(heightTimer.current);
    },
    [],
  );

  const capture = useCallback(
    (next: number) => {
      const ul = listRef.current;
      if (!ul) return;
      const base = ul.getBoundingClientRect();
      const rects = new Map<string, Rect>();
      itemRefs.current.forEach((el, key) => {
        const r = el.getBoundingClientRect();
        rects.set(key, { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height });
      });
      const nextKeys = new Set(lists[next].map((i) => i.key));
      const gone: Ghost[] = [];
      lists[idx].forEach((i) => {
        const rect = rects.get(i.key);
        if (rect && !nextKeys.has(i.key)) gone.push({ key: i.key, text: i.text, ...rect });
      });
      pending.current = { rects, height: ul.offsetHeight };
      setGhosts(gone);
      window.clearTimeout(ghostTimer.current);
      ghostTimer.current = window.setTimeout(() => setGhosts([]), 420);
    },
    [lists, idx],
  );

  const select = (next: number, focus = false) => {
    if (focus) btnRefs.current[next]?.focus();
    if (next === idx) return;
    if (!reduced) capture(next);
    setSel(next);
  };

  // Glide shared features to their new places, fade new ones in, and ease the list height.
  useEffect(() => {
    const pend = pending.current;
    if (!pend) return;
    pending.current = null;
    const ul = listRef.current;
    if (!ul) return;
    const els = itemRefs.current;
    els.forEach((el) => {
      if (typeof el.getAnimations === 'function') el.getAnimations().forEach((a) => a.cancel());
    });

    window.clearTimeout(heightTimer.current);
    ul.style.transition = 'none';
    ul.style.height = '';
    const natural = ul.offsetHeight;
    if (Math.abs(natural - pend.height) > 1) {
      ul.style.height = `${pend.height}px`;
      void ul.offsetHeight;
      ul.style.transition = 'height 560ms cubic-bezier(.22, 1, .36, 1)';
      ul.style.height = `${natural}px`;
      heightTimer.current = window.setTimeout(() => {
        ul.style.transition = '';
        ul.style.height = '';
      }, 620);
    } else {
      ul.style.transition = '';
    }

    if (typeof Element === 'undefined' || typeof Element.prototype.animate !== 'function') return;
    const base = ul.getBoundingClientRect();
    let fresh = 0;
    lists[idx].forEach((item, i) => {
      const el = els.get(item.key);
      if (!el) return;
      const old = pend.rects.get(item.key);
      if (old) {
        const r = el.getBoundingClientRect();
        const dx = old.x - (r.left - base.left);
        const dy = old.y - (r.top - base.top);
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          el.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0px, 0px)' }],
            { duration: 700, delay: i * 26, easing: SPRING_EASE, fill: 'backwards' },
          );
        }
      } else {
        el.animate(
          [
            { opacity: 0, transform: 'translateY(20px)' },
            { opacity: 1, transform: 'translateY(0px)' },
          ],
          { duration: 520, delay: 160 + fresh * 60, easing: SETTLE_EASE, fill: 'backwards' },
        );
        fresh += 1;
      }
    });
  }, [idx, lists]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = opts.length;
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else return;
    e.preventDefault();
    select(next, true);
  };

  const rootStyle = {
    '--rp-gold': highlightColor,
    '--rp-n': widthUnits,
    '--rp-opts': opts.length,
    '--rp-i': idx,
    '--rp-rows': Math.ceil(maxFeatures / 2),
  } as CSSProperties;

  const labelId = `${uid}-label`;
  const listId = `${uid}-list`;
  const stack = opts.length > 3;

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <div className={styles.toggleWrap}>
        <div
          className={`${styles.track} ${stack ? styles.trackStack : ''}`}
          role="radiogroup"
          aria-label="Billing option"
          aria-description={HELP}
          onKeyDown={onKeyDown}
        >
          <div className={`${styles.rail} ${stack ? styles.railStack : ''}`}>
            <span className={`${styles.thumb} ${stack ? styles.thumbStack : ''}`} aria-hidden="true" />
            {opts.map((o, i) => (
              <button
                key={i}
                ref={(el) => {
                  btnRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={i === idx}
                tabIndex={i === idx ? 0 : -1}
                className={`${styles.option} ${i === idx ? styles.optionOn : ''}`}
                onClick={() => select(i)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className={styles.card} aria-labelledby={labelId}>
        <span className={styles.sheen} aria-hidden="true" />
        <span className={styles.grain} aria-hidden="true" />
        <span className={styles.rosette} aria-hidden="true">
          <span className={styles.ringsA} />
          <span className={styles.fan} />
          <span className={styles.turn}>
            <span className={styles.ringsB} />
          </span>
        </span>

        <div className={styles.hero}>
          <span className={styles.rule} aria-hidden="true" />
          <div className={styles.price} aria-hidden="true">
            <span className={styles.currency}>{currency}</span>
            <span className={styles.digits}>
              {slots.map((s) => {
                const isDigit = s.ch !== null && /[0-9]/.test(s.ch);
                const gone = s.ch === null;
                const cls = [
                  styles.slot,
                  isDigit || gone ? styles.slotDigit : styles.slotPunc,
                  gone ? styles.slotGone : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                const d = isDigit ? Number(s.ch) : 0;
                return (
                  <span key={s.r} className={cls}>
                    {isDigit || gone ? (
                      <span className={styles.window}>
                        <span className={styles.strip} style={{ '--rp-d': d, '--rp-r': s.r } as CSSProperties}>
                          {DIGITS.map((n) => (
                            <span key={n} className={styles.digit}>
                              {n}
                            </span>
                          ))}
                        </span>
                      </span>
                    ) : (
                      <span className={styles.punc}>{s.ch}</span>
                    )}
                  </span>
                );
              })}
            </span>
            <span className={styles.side}>
              {current.saving ? (
                <span key={`s${idx}`} className={styles.saving}>
                  {current.saving}
                </span>
              ) : (
                <span className={styles.savingGap} />
              )}
              <span key={`p${idx}`} className={styles.period}>
                {current.period}
              </span>
            </span>
          </div>
          <p id={labelId} className={styles.sr} aria-live="polite">
            {`${current.label}: ${currency}${priceText} ${current.period}.${current.saving ? ` ${current.saving}.` : ''}`}
          </p>
        </div>

        <ul ref={listRef} id={listId} className={styles.ledger} aria-label={`Included with ${current.label}`}>
          {feats.map((f) => (
            <li
              key={f.key}
              ref={(el) => {
                if (el) itemRefs.current.set(f.key, el);
                else itemRefs.current.delete(f.key);
              }}
              className={styles.item}
            >
              <span className={styles.tick} aria-hidden="true">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                  <path d="M3.4 8.4l3 3 6.2-6.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className={styles.text}>{f.text}</span>
            </li>
          ))}
          {ghosts.map((g) => (
            <li
              key={`g-${g.key}`}
              className={`${styles.item} ${styles.ghost}`}
              aria-hidden="true"
              style={{ insetBlockStart: g.y, insetInlineStart: g.x, inlineSize: g.w, blockSize: g.h }}
            >
              <span className={styles.tick}>
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                  <path d="M3.4 8.4l3 3 6.2-6.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className={styles.text}>{g.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

```css
@font-face {
  font-family: 'Manrope';
  font-style: normal;
  font-weight: 200 800;
  font-display: swap;
  src: url('./fonts/manrope-latin-wght-normal.woff2') format('woff2');
}

@font-face {
  font-family: 'Bricolage Grotesque';
  font-style: normal;
  font-weight: 200 800;
  font-display: swap;
  src: url('./fonts/bricolage-grotesque-latin-wght-normal.woff2') format('woff2');
}

.root {
  --rp-pine: #0e4a3b;
  --rp-pine-deep: #093227;
  --rp-mint: #f5fcf8;
  --rp-mint-deep: #e3f3ea;
  --rp-slate: #1b2a2f;
  --rp-slate-soft: #4d6166;
  --rp-hair: rgba(14, 74, 59, 0.16);
  --rp-gold: #e2b13c;
  --rp-gold-ink: #1b2a2f;
  --rp-font-ui: 'Manrope', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --rp-font-figures: 'Bricolage Grotesque', 'Manrope', 'Helvetica Neue', system-ui, sans-serif;
  --rp-spring: cubic-bezier(0.34, 1.4, 0.5, 1);
  --rp-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.1  0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 .8 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  color: var(--rp-slate);
  font-family: var(--rp-font-ui);
  accent-color: var(--rp-pine);
}

@supports (transition-timing-function: linear(0, 1)) {
  .root {
    --rp-spring: linear(
      0, 0.088, 0.285, 0.51, 0.716, 0.877, 0.988, 1.052, 1.08, 1.082, 1.071, 1.053, 1.034, 1.018, 1.006,
      0.999, 0.994, 0.993, 0.993, 0.995, 0.996, 0.998, 0.999, 1
    );
  }
}

.root *,
.root *::before,
.root *::after {
  box-sizing: border-box;
}

.root ::selection {
  background: var(--rp-pine);
  color: var(--rp-mint);
}

/* ---------- Toggle: hangs over the card's top edge ---------- */

.toggleWrap {
  --rp-pad: 56px;
  position: relative;
  z-index: 3;
  margin-inline-start: var(--rp-pad);
  margin-block-end: -34px;
  inline-size: min(calc(100% - var(--rp-pad)), calc(var(--rp-opts) * 11.5rem));
}

.track {
  padding: 5px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--rp-hair);
  box-shadow:
    0 1px 2px rgba(9, 50, 39, 0.06),
    0 14px 28px -14px rgba(9, 50, 39, 0.28);
}

.trackStack {
  border-radius: 30px;
}

.rail {
  position: relative;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
}

.railStack {
  grid-auto-flow: row;
  grid-auto-columns: auto;
  grid-auto-rows: 1fr;
}

.thumb {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: calc(100% / var(--rp-opts));
  border-radius: 999px;
  background: var(--rp-pine);
  box-shadow: 0 6px 14px -6px rgba(9, 50, 39, 0.55);
  transform: translateX(calc(var(--rp-i) * 100%));
  transition: transform 640ms var(--rp-spring);
  pointer-events: none;
}

.thumbStack {
  inset-block: auto;
  inset-block-start: 0;
  inline-size: 100%;
  block-size: calc(100% / var(--rp-opts));
  border-radius: 25px;
  transform: translateY(calc(var(--rp-i) * 100%));
}

.option {
  position: relative;
  z-index: 1;
  appearance: none;
  min-block-size: 52px;
  margin: 0;
  padding-block: 10px;
  padding-inline: 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--rp-slate-soft);
  font: 700 16px/1.2 var(--rp-font-ui);
  letter-spacing: -0.005em;
  text-align: center;
  overflow-wrap: anywhere;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color 260ms ease;
}

.option:hover {
  color: var(--rp-pine);
}

.optionOn,
.optionOn:hover {
  color: #f4fbf7;
}

.option:focus-visible {
  outline: 3px solid var(--rp-gold);
  outline-offset: 1px;
}

/* ---------- Card ---------- */

.card {
  --rp-pad: 56px;
  position: relative;
  isolation: isolate;
  overflow: clip;
  padding-block: calc(34px + 64px) 40px;
  padding-inline: var(--rp-pad);
  border-radius: 40px;
  background:
    radial-gradient(70% 60% at 8% 0%, #ffffff 0%, transparent 70%),
    linear-gradient(165deg, var(--rp-mint) 0%, var(--rp-mint-deep) 100%);
  border: 1px solid var(--rp-hair);
  box-shadow:
    0 1px 0 #fff inset,
    0 40px 70px -40px rgba(9, 50, 39, 0.4);
}

.sheen,
.grain,
.rosette {
  position: absolute;
  pointer-events: none;
}

.sheen {
  inset: 0;
  z-index: -3;
  background: radial-gradient(45% 55% at 100% 100%, color-mix(in srgb, var(--rp-pine) 9%, transparent), transparent 70%);
}

.grain {
  inset: 0;
  z-index: -1;
  opacity: 0.07;
  background-image: var(--rp-noise);
  mix-blend-mode: multiply;
}

/* engraved banknote rosette: two offset ring sets drift into a moire */
.rosette {
  inset-block-start: -22cqi;
  inset-inline-end: -20cqi;
  z-index: -2;
  inline-size: 66cqi;
  aspect-ratio: 1;
  border-radius: 50%;
}

.ringsA,
.ringsB,
.fan {
  position: absolute;
  inset: 0;
  border-radius: 50%;
}

.ringsA {
  background: repeating-radial-gradient(circle at 50% 50%, transparent 0 7px, color-mix(in srgb, var(--rp-pine) 46%, transparent) 7px 8.2px);
  -webkit-mask-image: radial-gradient(closest-side, #000 20%, rgba(0, 0, 0, 0.55) 62%, transparent 100%);
  mask-image: radial-gradient(closest-side, #000 20%, rgba(0, 0, 0, 0.55) 62%, transparent 100%);
  opacity: 0.5;
}

.fan {
  background: repeating-conic-gradient(from 0deg at 50% 50%, color-mix(in srgb, var(--rp-pine) 34%, transparent) 0deg 0.5deg, transparent 0.5deg 3deg);
  -webkit-mask-image: radial-gradient(closest-side, transparent 24%, #000 34%, #000 52%, transparent 74%);
  mask-image: radial-gradient(closest-side, transparent 24%, #000 34%, #000 52%, transparent 74%);
  opacity: 0.32;
}

.turn {
  position: absolute;
  inset: 0;
  transform: rotate(calc(var(--rp-i) * 47deg));
  transition: transform 1100ms var(--rp-spring);
}

.ringsB {
  transform: translateX(46px);
  background: repeating-radial-gradient(circle at 50% 50%, transparent 0 7px, color-mix(in srgb, var(--rp-gold) 80%, transparent) 7px 8.2px);
  -webkit-mask-image: radial-gradient(closest-side, #000 20%, rgba(0, 0, 0, 0.55) 62%, transparent 100%);
  mask-image: radial-gradient(closest-side, #000 20%, rgba(0, 0, 0, 0.55) 62%, transparent 100%);
  opacity: 0.55;
}

/* ---------- Hero price ---------- */

.hero {
  --rp-size: min(300px, calc(56cqi / (0.64 * var(--rp-n) + 0.6)));
  position: relative;
}

.rule {
  position: absolute;
  inset-inline: calc(var(--rp-pad) * -1);
  inset-block-end: calc(var(--rp-size) * 0.17);
  block-size: 1px;
  background: color-mix(in srgb, var(--rp-pine) 24%, transparent);
}

.price {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  column-gap: 0.32em;
  font-size: var(--rp-size);
  line-height: 1;
  font-family: var(--rp-font-figures);
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: 'tnum' 1, 'lnum' 1;
  color: var(--rp-slate);
}

.currency {
  align-self: flex-start;
  margin-block-start: 0.5em;
  font-size: 0.34em;
  font-weight: 700;
  line-height: 1;
  color: var(--rp-pine);
  letter-spacing: -0.02em;
}

.digits {
  display: inline-flex;
  align-items: stretch;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.slot {
  display: block;
  flex: none;
  text-align: center;
  overflow: hidden;
  transition:
    inline-size 700ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 420ms ease;
}

.slotDigit {
  inline-size: 0.63em;
}

.slotPunc {
  inline-size: 0.26em;
}

.slotGone {
  inline-size: 0;
  opacity: 0;
}

.punc {
  display: block;
  block-size: 1em;
  padding-block-start: 0.04em;
  font-weight: 700;
  color: var(--rp-pine);
}

.window {
  display: block;
  block-size: 1em;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 15%, #000 85%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0, #000 15%, #000 85%, transparent 100%);
}

.strip {
  display: block;
  transform: translateY(calc(var(--rp-d) * -10%));
  transition: transform 1050ms cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: calc(var(--rp-r) * 70ms);
  will-change: transform;
}

.digit {
  display: block;
  block-size: 1em;
  line-height: 1;
  text-align: center;
}

.side {
  --rp-gap: calc(var(--rp-size) * 0.17);
  flex: 1 1 11rem;
  min-inline-size: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding-block: calc(var(--rp-gap) + 2px) var(--rp-gap);
  padding-inline-start: 0.1em;
  font-family: var(--rp-font-ui);
  font-size: 16px;
  line-height: 1.2;
  letter-spacing: 0;
}

.saving {
  display: inline-block;
  max-inline-size: 100%;
  padding-block: 9px;
  padding-inline: 16px;
  border-radius: 999px;
  background: var(--rp-gold);
  color: var(--rp-gold-ink);
  font-size: 15px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--rp-gold-ink) 14%, transparent) inset;
  transform-origin: left center;
  animation: rp-pop 760ms var(--rp-spring) 220ms backwards;
}

.savingGap {
  display: block;
}

.period {
  display: block;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--rp-slate-soft);
  animation: rp-rise 560ms cubic-bezier(0.2, 0.8, 0.2, 1) 180ms backwards;
}

@keyframes rp-pop {
  from {
    opacity: 0;
    transform: scale(0.55) rotate(-6deg);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes rp-rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* ---------- Feature ledger ---------- */

.ledger {
  position: relative;
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(var(--rp-rows), auto);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  column-gap: 56px;
  margin: 0;
  margin-block-start: 40px;
  padding: 0;
  list-style: none;
  border-block-start: 1px solid var(--rp-hair);
}

.item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding-block: 17px;
  border-block-end: 1px solid var(--rp-hair);
  color: var(--rp-slate);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.005em;
}

.tick {
  flex: none;
  display: grid;
  place-items: center;
  inline-size: 24px;
  block-size: 24px;
  margin-block-start: 1px;
  border-radius: 50%;
  background: var(--rp-pine);
  color: #eaf8f1;
}

.text {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.ghost {
  position: absolute;
  margin: 0;
  pointer-events: none;
  animation: rp-ghost 300ms cubic-bezier(0.4, 0, 1, 1) forwards;
}

@keyframes rp-ghost {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
  }
}

.sr {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* ---------- Narrow containers ---------- */

@container (max-width: 760px) {
  .toggleWrap {
    --rp-pad: 24px;
  }

  .card {
    --rp-pad: 24px;
    padding-block: calc(34px + 36px) 20px;
    border-radius: 32px;
  }

  .rosette {
    inset-block-start: -30cqi;
    inset-inline-end: -34cqi;
    inline-size: 96cqi;
  }

  .ledger {
    grid-auto-flow: row;
    grid-template-rows: none;
    grid-template-columns: minmax(0, 1fr);
    margin-block-start: 28px;
  }

  .item {
    font-size: 17px;
    padding-block: 15px;
  }
}

@container (max-width: 600px) {
  .toggleWrap {
    inline-size: calc(100% - var(--rp-pad));
    margin-inline-end: var(--rp-pad);
  }

  .hero {
    --rp-size: min(34cqi, calc(78cqi / (0.64 * var(--rp-n) + 0.6)));
  }

  .price {
    row-gap: 14px;
  }

  .side {
    flex: 1 1 100%;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-start;
    gap: 10px 14px;
    padding-block: 0;
    padding-inline-start: 0;
  }

  .rule {
    inset-block-end: auto;
    inset-block-start: calc(var(--rp-size) * 0.83);
  }

  .period {
    font-size: 20px;
  }
}

/* wide-but-stacked options keep the horizontal rail; only narrow containers stack */
@container (min-width: 601px) {
  .trackStack {
    border-radius: 999px;
  }

  .railStack {
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
  }

  .thumbStack {
    inset-block: 0;
    block-size: auto;
    inline-size: calc(100% / var(--rp-opts));
    border-radius: 999px;
    transform: translateX(calc(var(--rp-i) * 100%));
  }
}

@container (min-width: 601px) and (max-width: 760px) {
  .toggleWrap {
    inline-size: min(calc(100% - var(--rp-pad)), calc(var(--rp-opts) * 11.5rem));
  }
}

/* ---------- Reduced motion: instant, still composed ---------- */

@media (prefers-reduced-motion: reduce) {
  .thumb,
  .thumbStack,
  .turn,
  .strip,
  .slot,
  .option {
    transition: none;
  }

  .strip {
    transition-delay: 0s;
  }

  .saving,
  .period,
  .ghost {
    animation: none;
  }

  .ghost {
    display: none;
  }
}
```
