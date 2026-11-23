Create a custom element called "Serving Scale Card". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: title and small heading, photo, base servings, ingredients (name, amount and unit), method note, section labels (servings, ingredients, method), accent, rim and card colors. Add other settings if they help.

```tsx
import { useEffect, useId, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export interface ServingScaleIngredient {
  name: string;
  amount?: number;
  unit?: string;
}

export interface ServingScaleCardProps {
  title?: string;
  eyebrow?: string;
  image?: string;
  imageAlt?: string;
  baseServings?: number;
  servingsLabel?: string;
  ingredientsLabel?: string;
  ingredients?: ServingScaleIngredient[];
  methodLabel?: string;
  methodNote?: string;
  accentColor?: string;
  rimColor?: string;
  enamelColor?: string;
  className?: string;
}

export const defaultIngredients: ServingScaleIngredient[] = [
  { name: 'Farfalle', amount: 400, unit: 'g' },
  { name: 'Basil pesto', amount: 0.75, unit: 'cup' },
  { name: 'Cherry tomatoes, halved', amount: 250, unit: 'g' },
  { name: 'Baby salad leaves', amount: 2, unit: 'handfuls' },
  { name: 'Lemon, juiced', amount: 0.5, unit: 'whole' },
  { name: 'Parmesan, grated', amount: 40, unit: 'g' },
  { name: 'Flaky salt', unit: 'to taste' },
];

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 60;
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const FRACTIONS: [number, string][] = [
  [0, ''],
  [0.125, '⅛'],
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.5, '½'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
  [1, ''],
];

const clampServings = (n: number) => Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(n)));

function formatAmount(value: number): string {
  if (value >= 20) return String(Math.round(value));
  const whole = Math.floor(value);
  const [frac, glyph] = FRACTIONS.reduce((best, f) => (Math.abs(f[0] - (value - whole)) < Math.abs(best[0] - (value - whole)) ? f : best));
  if (Math.abs(frac - (value - whole)) <= 0.04) {
    const w = whole + (frac === 1 ? 1 : 0);
    return w === 0 ? glyph || '0' : `${w}${glyph}`;
  }
  return value >= 10 ? String(Math.round(value)) : String(Math.round(value * 10) / 10);
}

const formatFactor = (f: number) => `×${Math.round(f * 100) / 100}`;

function Roll({ text, className }: { text: string; className?: string }) {
  const chars = Array.from(text);
  return (
    <span className={[styles.roll, className].filter(Boolean).join(' ')} aria-hidden="true">
      {chars.map((c, i) => {
        const slot = chars.length - i;
        return /\d/.test(c) ? (
          <span key={`d${slot}`} className={styles.digit}>
            <span className={styles.strip} style={{ '--d': c } as CSSProperties}>
              {DIGITS.map((n) => (
                <span key={n} className={styles.cell}>
                  {n}
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span key={`g${slot}${c}`} className={styles.glyph}>
            {c}
          </span>
        );
      })}
    </span>
  );
}

const MinusIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
    <path d="M6 12h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
    <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
  </svg>
);

export default function ServingScaleCard({
  title = 'Pesto farfalle with cherry tomatoes',
  eyebrow = 'Weeknight · 20 min',
  image = 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=900&h=1000&fit=crop&q=80',
  imageAlt = 'Farfalle in basil pesto with cherry tomatoes and salad leaves',
  baseServings = 4,
  servingsLabel = 'Servings',
  ingredientsLabel = 'Ingredients',
  ingredients = defaultIngredients,
  methodLabel = 'Method',
  methodNote = 'Cook the farfalle until just tender and keep a cup of the water. Loosen the pesto with lemon and a splash of that water, toss through the pasta, then fold in the tomatoes and leaves. Finish with parmesan.',
  accentColor = '#d8432f',
  rimColor = '#1f4fb4',
  enamelColor = '#f7f0e1',
  className,
}: ServingScaleCardProps) {
  const base = clampServings(baseServings || 1);
  const [servings, setServings] = useState(base);
  const uid = useId();
  const titleId = `${uid}-title`;

  useEffect(() => setServings(base), [base]);

  const factor = servings / base;
  const step = (delta: number) => setServings((s) => clampServings(s + delta));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, () => number> = {
      ArrowUp: () => servings + 1,
      ArrowRight: () => servings + 1,
      ArrowDown: () => servings - 1,
      ArrowLeft: () => servings - 1,
      PageUp: () => servings + 5,
      PageDown: () => servings - 5,
      Home: () => MIN_SERVINGS,
      End: () => MAX_SERVINGS,
    };
    const next = moves[e.key];
    if (!next) return;
    e.preventDefault();
    setServings(clampServings(next()));
  };

  const rootStyle = {
    '--ss-accent': accentColor,
    '--ss-rim': rimColor,
    '--ss-enamel': enamelColor,
  } as CSSProperties;

  return (
    <article
      className={[styles.root, image ? styles.withPhoto : '', className].filter(Boolean).join(' ')}
      style={rootStyle}
      aria-labelledby={titleId}
    >
      <span className={styles.speckle} aria-hidden="true" />
      <div className={styles.layout}>
        {image && (
          <div className={styles.media}>
            <img className={styles.photo} src={image} alt={imageAlt} loading="lazy" draggable={false} />
          </div>
        )}

        <div className={styles.content}>
          <header className={styles.head}>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            <h3 id={titleId} className={styles.title}>
              {title}
            </h3>
          </header>

          <div className={styles.scale}>
            <div className={styles.scaleText}>
              <span className={styles.scaleLabel}>{servingsLabel}</span>
              <span className={styles.factor} data-on={factor !== 1 ? '' : undefined} aria-hidden="true">
                {formatFactor(factor)}
              </span>
            </div>
            <div className={styles.stepper}>
              <button
                type="button"
                className={styles.btn}
                onClick={() => step(-1)}
                disabled={servings <= MIN_SERVINGS}
                aria-label={`Fewer ${servingsLabel.toLowerCase()}`}
                tabIndex={-1}
              >
                <MinusIcon />
              </button>
              <div
                className={styles.count}
                role="spinbutton"
                tabIndex={0}
                aria-label={servingsLabel}
                aria-valuenow={servings}
                aria-valuemin={MIN_SERVINGS}
                aria-valuemax={MAX_SERVINGS}
                aria-description="Use the arrow keys to change the amount; every ingredient quantity updates."
                onKeyDown={onKeyDown}
              >
                <Roll text={String(servings)} />
              </div>
              <button
                type="button"
                className={styles.btn}
                onClick={() => step(1)}
                disabled={servings >= MAX_SERVINGS}
                aria-label={`More ${servingsLabel.toLowerCase()}`}
                tabIndex={-1}
              >
                <PlusIcon />
              </button>
            </div>
          </div>

          {ingredients.length > 0 && (
            <section className={styles.section} aria-label={ingredientsLabel}>
              <h4 className={styles.sectionLabel}>{ingredientsLabel}</h4>
              <ul className={styles.list}>
                {ingredients.map((item, i) => {
                  const hasAmount = typeof item.amount === 'number' && item.amount > 0;
                  const amount = hasAmount ? formatAmount((item.amount as number) * factor) : '';
                  return (
                    <li key={i} className={styles.row} style={{ '--i': i } as CSSProperties}>
                      <span className={styles.qty}>
                        {hasAmount && (
                          <>
                            {servings !== base && <span key={servings} className={styles.flash} aria-hidden="true" />}
                            <Roll text={amount} className={styles.amount} />
                            <span className={styles.srOnly}>{amount}</span>
                          </>
                        )}
                        {item.unit && <span className={hasAmount ? styles.unit : styles.unitOnly}>{item.unit}</span>}
                      </span>
                      <span className={styles.name}>{item.name}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {methodNote && (
            <section className={styles.method} aria-label={methodLabel}>
              <h4 className={styles.sectionLabel}>{methodLabel}</h4>
              <p className={styles.methodText}>{methodNote}</p>
            </section>
          )}

          <p className={styles.srOnly} aria-live="polite">
            {`${servingsLabel}: ${servings}`}
          </p>
        </div>
      </div>
    </article>
  );
}
```

```css
.root {
  --ss-accent: #d8432f;
  --ss-rim: #1f4fb4;
  --ss-enamel: #f7f0e1;
  --ss-ink: #1b2233;
  --ss-muted: rgba(27, 34, 51, 0.62);
  --ss-rule: rgba(27, 34, 51, 0.12);
  --ss-font-display: 'Fraunces', 'Recoleta', 'Iowan Old Style', Georgia, serif;
  --ss-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --ss-spring: cubic-bezier(0.3, 1.45, 0.5, 1);
  --ss-speckle: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='s'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.12  0 0 0 0 0.16  0 0 0 0 0.3  0 0 0 14 -10.6'/></filter><rect width='100%' height='100%' filter='url(%23s)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  border: 5px solid var(--ss-rim);
  border-radius: 30px;
  background:
    radial-gradient(120% 80% at 15% 0%, color-mix(in srgb, #fff 55%, var(--ss-enamel)) 0%, transparent 60%),
    var(--ss-enamel);
  color: var(--ss-ink);
  font-family: var(--ss-font-ui);
  box-shadow:
    inset 0 0 0 5px var(--ss-enamel),
    inset 0 0 0 6px color-mix(in srgb, var(--ss-rim) 28%, transparent),
    0 1px 2px rgba(27, 34, 51, 0.06),
    0 18px 40px -22px rgba(27, 34, 51, 0.35);
}

.speckle {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: var(--ss-speckle);
  opacity: 0.32;
}

.layout {
  display: grid;
  gap: 0;
}

.media {
  position: relative;
  margin: 12px;
  margin-block-end: 0;
  border-radius: 20px;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  background: color-mix(in srgb, var(--ss-rim) 14%, var(--ss-enamel));
}

.media::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(27, 34, 51, 0.1);
  pointer-events: none;
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

.content {
  display: grid;
  gap: 22px;
  min-inline-size: 0;
  padding-block: 24px 28px;
  padding-inline: 24px;
}

.head {
  display: grid;
  gap: 8px;
}

.eyebrow {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ss-rim);
  overflow-wrap: anywhere;
}

.title {
  margin: 0;
  font-family: var(--ss-font-display);
  font-size: clamp(28px, 7cqi, 36px);
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: -0.02em;
  text-wrap: balance;
  overflow-wrap: break-word;
}

.scale {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  padding-block: 12px;
  padding-inline: 18px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: inset 0 0 0 1px var(--ss-rule);
}

.scaleText {
  display: grid;
  gap: 4px;
  min-inline-size: 0;
}

.scaleLabel {
  font-size: 14px;
  font-weight: 600;
  color: var(--ss-ink);
  overflow-wrap: anywhere;
}

.factor {
  justify-self: start;
  padding-block: 2px;
  padding-inline: 8px;
  margin-inline-start: -8px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ss-muted);
  opacity: 0.55;
  transition: color 240ms ease, opacity 240ms ease;
}

.factor[data-on] {
  margin-inline-start: 0;
  background: color-mix(in srgb, var(--ss-rim) 12%, transparent);
  color: var(--ss-rim);
  opacity: 1;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn {
  display: grid;
  place-items: center;
  inline-size: 48px;
  block-size: 48px;
  padding: 0;
  border: 0;
  border-radius: 14px;
  background: var(--ss-accent);
  color: #fff;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--ss-accent) 40%, transparent);
  transition:
    transform 460ms var(--ss-spring),
    background-color 160ms ease,
    opacity 160ms ease;
}

.btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ss-accent) 86%, #000);
}

.btn:active:not(:disabled) {
  transform: scale(0.88);
  transition-duration: 90ms, 160ms, 160ms;
}

.btn:disabled {
  cursor: default;
  opacity: 0.32;
}

.count {
  display: grid;
  place-items: center;
  min-inline-size: 2.1ch;
  padding-inline: 6px;
  border-radius: 12px;
  font-family: var(--ss-font-display);
  font-size: 44px;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--ss-ink);
  outline: none;
}

.count:focus-visible {
  box-shadow: 0 0 0 2px var(--ss-enamel), 0 0 0 4px var(--ss-rim);
}

.roll {
  display: inline-flex;
  align-items: baseline;
  font-variant-numeric: tabular-nums lining-nums;
  line-height: 1;
}

.digit {
  display: inline-block;
  block-size: 1.1em;
  overflow: hidden;
  mask-image: linear-gradient(180deg, transparent 0%, #000 22%, #000 78%, transparent 100%);
  animation: enter 420ms var(--ss-spring) both;
}

.strip {
  display: flex;
  flex-direction: column;
  transform: translateY(calc(var(--d) * -1.1em));
  transition: transform 620ms var(--ss-spring);
  transition-delay: calc(min(var(--i, 0), 10) * 32ms);
}

.cell {
  display: block;
  block-size: 1.1em;
  line-height: 1.1em;
  text-align: center;
}

.glyph {
  display: inline-block;
  line-height: 1.1em;
  animation: enter 420ms var(--ss-spring) both;
}

.section {
  display: grid;
  gap: 8px;
}

.sectionLabel {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ss-muted);
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: grid;
  grid-template-columns: 7.5em minmax(0, 1fr);
  align-items: baseline;
  gap: 4px 16px;
  padding-block: 11px;
  border-block-end: 1px solid var(--ss-rule);
}

.row:last-child {
  border-block-end: 0;
}

.qty {
  position: relative;
  justify-self: start;
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 5px;
}

.flash {
  position: absolute;
  inset-block: -4px;
  inset-inline: -8px;
  z-index: -1;
  border-radius: 8px;
  background: color-mix(in srgb, var(--ss-accent) 16%, transparent);
  opacity: 0;
  animation: flash 900ms ease-out calc(min(var(--i, 0), 10) * 32ms) both;
}

.amount {
  font-size: 17px;
  font-weight: 700;
  color: var(--ss-ink);
}

.unit {
  font-size: 14px;
  font-weight: 500;
  color: var(--ss-muted);
  overflow-wrap: anywhere;
}

.unitOnly {
  font-size: 14px;
  font-style: italic;
  color: var(--ss-muted);
  overflow-wrap: anywhere;
}

.name {
  min-inline-size: 0;
  font-size: 16px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.method {
  display: grid;
  gap: 8px;
  padding-block-start: 18px;
  border-block-start: 2px dotted color-mix(in srgb, var(--ss-rim) 35%, transparent);
}

.methodText {
  margin: 0;
  max-inline-size: 62ch;
  font-size: 16px;
  line-height: 1.6;
  color: color-mix(in srgb, var(--ss-ink) 86%, var(--ss-enamel));
  overflow-wrap: break-word;
}

.srOnly {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

@container (min-width: 720px) {
  .withPhoto .layout {
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1fr);
  }

  .media {
    aspect-ratio: auto;
    min-block-size: 320px;
    margin: 14px;
    margin-inline-end: 0;
    margin-block-end: 14px;
  }

  .photo {
    position: absolute;
    inset: 0;
  }

  .content {
    padding-block: 34px 34px;
    padding-inline: 36px;
  }

  .title {
    font-size: 40px;
  }

  .count {
    font-size: 52px;
  }
}

@container (max-width: 440px) {
  .scale {
    display: grid;
    justify-content: stretch;
    padding-inline: 12px;
  }

  .scaleText {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding-inline: 6px;
  }

  .stepper {
    justify-content: space-between;
  }

  .btn {
    inline-size: 56px;
    block-size: 52px;
  }
}

@keyframes flash {
  20% {
    opacity: 1;
  }
}

@keyframes enter {
  from {
    opacity: 0;
    transform: translateY(0.35em);
  }
}

@media (prefers-reduced-motion: reduce) {
  .strip,
  .btn,
  .factor {
    transition: none;
  }

  .digit,
  .glyph,
  .flash {
    animation: none;
  }
}
```
