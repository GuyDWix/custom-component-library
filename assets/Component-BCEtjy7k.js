const e=`import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface ServingScaleIngredient {
  name: string;
  amount?: number;
  unit?: string;
}

export interface ServingScaleCardProps {
  title?: string;
  subtitle?: string;
  image?: string;
  imageAlt?: string;
  baseServings?: number;
  servingsLabel?: string;
  ingredientsLabel?: string;
  ingredients?: ServingScaleIngredient[];
  methodLabel?: string;
  methodNote?: string;
  accentColor?: string;
  panelColor?: string;
  backgroundColor?: string;
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
const TICK_GAP = 16;
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const TICKS = Array.from({ length: MAX_SERVINGS }, (_, i) => i + 1);
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
const clampPos = (p: number) => Math.min(MAX_SERVINGS - 1, Math.max(0, p));

function formatAmount(value: number): string {
  if (value >= 20) return String(Math.round(value));
  const whole = Math.floor(value);
  const rest = value - whole;
  const [frac, glyph] = FRACTIONS.reduce((best, f) => (Math.abs(f[0] - rest) < Math.abs(best[0] - rest) ? f : best));
  if (Math.abs(frac - rest) <= 0.04) {
    const w = whole + (frac === 1 ? 1 : 0);
    return w === 0 ? glyph || '0' : \`\${w}\${glyph}\`;
  }
  return value >= 10 ? String(Math.round(value)) : String(Math.round(value * 10) / 10);
}

const formatFactor = (f: number) => \`×\${Math.round(f * 100) / 100}\`;

function Roll({ text, className }: { text: string; className?: string }) {
  const chars = Array.from(text);
  return (
    <span className={[styles.roll, className].filter(Boolean).join(' ')} aria-hidden="true">
      {chars.map((c, i) => {
        const slot = chars.length - i;
        return /\\d/.test(c) ? (
          <span key={\`d\${slot}\`} className={styles.digit}>
            <span className={styles.strip} style={{ '--d': c } as CSSProperties}>
              {DIGITS.map((n) => (
                <span key={n} className={styles.cell}>
                  {n}
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span key={\`g\${slot}\${c}\`} className={styles.glyph}>
            {c}
          </span>
        );
      })}
    </span>
  );
}

const MinusIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <path d="M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

export default function ServingScaleCard({
  title = 'Pesto farfalle with cherry tomatoes',
  subtitle = 'Weeknight · 20 min',
  image = 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1600&h=1200&fit=crop&q=80',
  imageAlt = 'Farfalle in basil pesto with cherry tomatoes and salad leaves',
  baseServings = 4,
  servingsLabel = 'Servings',
  ingredientsLabel = 'Ingredients',
  ingredients = defaultIngredients,
  methodLabel = 'Method',
  methodNote = 'Cook the farfalle until just tender and keep a cup of the water. Loosen the pesto with lemon and a splash of that water, toss through the pasta, then fold in the tomatoes and leaves. Finish with parmesan.',
  accentColor = '#ff6b4a',
  panelColor = '#1c4a2d',
  backgroundColor = '#0a120d',
  className,
}: ServingScaleCardProps) {
  const base = clampServings(baseServings || 1);
  const [servings, setServings] = useState(base);
  const [beat, setBeat] = useState({ n: 0, dir: 1 });
  const [dragPos, setDragPos] = useState<number | null>(null);
  const drag = useRef<{ x: number; pos: number; moved: boolean } | null>(null);
  const current = useRef(base);
  const uid = useId();
  const titleId = \`\${uid}-title\`;

  useEffect(() => {
    current.current = base;
    setServings(base);
  }, [base]);

  const factor = servings / base;
  const changed = beat.n > 0;
  const phase = beat.n % 2 ? 'a' : 'b';

  const commit = (next: number) => {
    const n = clampServings(next);
    const prev = current.current;
    if (n === prev) return;
    current.current = n;
    setBeat((b) => ({ n: b.n + 1, dir: n > prev ? 1 : -1 }));
    setServings(n);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowUp: servings + 1,
      ArrowRight: servings + 1,
      ArrowDown: servings - 1,
      ArrowLeft: servings - 1,
      PageUp: servings + 5,
      PageDown: servings - 5,
      Home: MIN_SERVINGS,
      End: MAX_SERVINGS,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    commit(moves[e.key]);
  };

  const onDialDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, pos: servings - 1, moved: false };
  };

  const onDialMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 4) return;
    d.moved = true;
    const pos = clampPos(d.pos - dx / TICK_GAP);
    setDragPos(pos);
    commit(pos + 1);
  };

  const onDialUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    setDragPos(null);
    if (!d || d.moved || e.type === 'pointercancel') return;
    const rect = e.currentTarget.getBoundingClientRect();
    commit(servings + Math.round((e.clientX - (rect.left + rect.width / 2)) / TICK_GAP));
  };

  const rootStyle = {
    '--ss-accent': accentColor,
    '--ss-panel': panelColor,
    '--ss-bg': backgroundColor,
    '--ss-gap': \`\${TICK_GAP}px\`,
  } as CSSProperties;

  const dialPos = dragPos ?? servings - 1;
  const lessLabel = \`Fewer \${servingsLabel.toLowerCase()}\`;
  const moreLabel = \`More \${servingsLabel.toLowerCase()}\`;

  return (
    <article
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
      aria-labelledby={titleId}
    >
      <div className={[styles.frame, image ? styles.withPhoto : ''].filter(Boolean).join(' ')}>
        <div className={styles.media} aria-hidden={image ? undefined : true}>
          {image && (
            <img
              className={styles.photo}
              data-beat={changed ? phase : undefined}
              src={image}
              alt={imageAlt}
              draggable={false}
            />
          )}
          <span className={styles.scrim} aria-hidden="true" />
        </div>

        <div className={styles.hero}>
          <div className={styles.heroLabel}>
            <span className={styles.servingsLabel}>{servingsLabel}</span>
            <span
              className={styles.factor}
              data-on={factor !== 1 ? '' : undefined}
              data-beat={changed ? phase : undefined}
              aria-hidden="true"
            >
              {formatFactor(factor)}
            </span>
          </div>

          <div
            className={styles.count}
            role="spinbutton"
            tabIndex={0}
            aria-label={servingsLabel}
            aria-valuenow={servings}
            aria-valuemin={MIN_SERVINGS}
            aria-valuemax={MAX_SERVINGS}
            aria-description="Arrow keys change the amount, Page Up and Page Down by five; every ingredient quantity updates."
            onKeyDown={onKeyDown}
          >
            <span
              className={styles.numeral}
              data-beat={changed ? phase : undefined}
              style={{ '--sd': beat.dir } as CSSProperties}
            >
              <Roll text={String(servings)} className={styles.bigRoll} />
            </span>
          </div>

          <div className={styles.controls}>
            <button
              type="button"
              className={styles.btn}
              onClick={() => commit(current.current - 1)}
              disabled={servings <= MIN_SERVINGS}
              aria-label={lessLabel}
              tabIndex={-1}
            >
              <MinusIcon />
            </button>
            <div
              className={styles.dial}
              data-dragging={dragPos !== null ? '' : undefined}
              aria-hidden="true"
              onPointerDown={onDialDown}
              onPointerMove={onDialMove}
              onPointerUp={onDialUp}
              onPointerCancel={onDialUp}
            >
              <span className={styles.track} style={{ '--pos': dialPos } as CSSProperties}>
                {TICKS.map((n) => {
                  const major = n === 1 || n % 5 === 0;
                  return (
                    <span
                      key={n}
                      className={major ? styles.tickMajor : styles.tick}
                      data-on={n === servings ? '' : undefined}
                      style={{ '--n': n - 1 } as CSSProperties}
                    >
                      {major && <span className={styles.tickNum}>{n}</span>}
                    </span>
                  );
                })}
              </span>
              <span className={styles.needle} />
            </div>
            <button
              type="button"
              className={styles.btn}
              onClick={() => commit(current.current + 1)}
              disabled={servings >= MAX_SERVINGS}
              aria-label={moreLabel}
              tabIndex={-1}
            >
              <PlusIcon />
            </button>
          </div>
        </div>

        <div className={styles.panel}>
          <span className={styles.grain} aria-hidden="true" />
          <header className={styles.head}>
            <h3 id={titleId} className={styles.title}>
              {title}
            </h3>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </header>

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
                            <Roll text={amount} className={styles.amount} />
                            <span className={styles.srOnly}>{amount}</span>
                            {changed && <span key={beat.n} className={styles.sweep} aria-hidden="true" />}
                          </>
                        )}
                      </span>
                      <span className={hasAmount ? styles.unit : styles.unitOnly}>{item.unit}</span>
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
        </div>

        <p className={styles.srOnly} aria-live="polite">
          {\`\${servingsLabel}: \${servings}\`}
        </p>
      </div>
    </article>
  );
}
`;export{e as default};
