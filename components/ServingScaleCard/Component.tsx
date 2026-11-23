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
