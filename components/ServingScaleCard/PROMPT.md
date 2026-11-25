Create a custom element called "Serving Scale Card". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: title and subtitle, photo, base servings, ingredients (name, amount and unit), method note, section labels (servings, ingredients, method), accent, panel and background colors. Add other settings if they help.

```tsx
import { useEffect, useId, useRef, useState } from 'react';
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
  const titleId = `${uid}-title`;

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
    '--ss-gap': `${TICK_GAP}px`,
  } as CSSProperties;

  const dialPos = dragPos ?? servings - 1;
  const lessLabel = `Fewer ${servingsLabel.toLowerCase()}`;
  const moreLabel = `More ${servingsLabel.toLowerCase()}`;

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
          {`${servingsLabel}: ${servings}`}
        </p>
      </div>
    </article>
  );
}
```

```css
.root {
  --ss-accent: #ff6b4a;
  --ss-panel: #1c4a2d;
  --ss-bg: #0a120d;
  --ss-ink: #f4f7f1;
  --ss-ink-2: color-mix(in srgb, var(--ss-ink) 78%, var(--ss-panel));
  --ss-ink-3: color-mix(in srgb, var(--ss-ink) 62%, var(--ss-panel));
  --ss-line: color-mix(in srgb, var(--ss-ink) 13%, transparent);
  --ss-font-display: 'Inter', 'SF Pro Display', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --ss-font-ui: 'Inter', 'SF Pro Text', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --ss-roll: cubic-bezier(0.2, 1.18, 0.32, 1);
  --ss-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ss-grain: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>");
  --ss-stage: 440px;

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 28px;
  background:
    radial-gradient(90% 70% at 20% 100%, color-mix(in srgb, var(--ss-panel) 55%, transparent) 0%, transparent 70%),
    var(--ss-bg);
  color: var(--ss-ink);
  font-family: var(--ss-font-ui);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.2),
    0 40px 80px -36px rgba(6, 18, 10, 0.55);
}

.root ::selection {
  background: var(--ss-accent);
  color: #fff;
}

.frame {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

.media {
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  block-size: var(--ss-stage);
  overflow: hidden;
  background: color-mix(in srgb, var(--ss-panel) 40%, var(--ss-bg));
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  object-position: 50% 40%;
  transform-origin: 30% 60%;
  filter: brightness(0.84) saturate(1.08);
}

.photo[data-beat='a'] {
  animation: pushA 900ms var(--ss-out);
}

.photo[data-beat='b'] {
  animation: pushB 900ms var(--ss-out);
}

.scrim {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(0deg, var(--ss-bg) 0%, color-mix(in srgb, var(--ss-bg) 86%, transparent) 30%, color-mix(in srgb, var(--ss-bg) 40%, transparent) 58%, transparent 78%),
    linear-gradient(90deg, color-mix(in srgb, var(--ss-bg) 55%, transparent) 0%, transparent 60%),
    radial-gradient(130% 90% at 50% 40%, transparent 55%, color-mix(in srgb, var(--ss-bg) 45%, transparent) 100%);
}

.hero {
  position: relative;
  display: grid;
  align-content: end;
  gap: 6px;
  min-block-size: var(--ss-stage);
  min-inline-size: 0;
  box-sizing: border-box;
  padding-block: 28px 22px;
  padding-inline: 22px;
}

.heroLabel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.servingsLabel {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.005em;
  color: var(--ss-ink);
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.45);
  overflow-wrap: anywhere;
}

.factor {
  padding-block: 4px;
  padding-inline: 10px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  color: var(--ss-ink-2);
  background: color-mix(in srgb, var(--ss-ink) 12%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ss-ink) 16%, transparent);
  transition:
    background-color 240ms ease,
    color 240ms ease,
    box-shadow 240ms ease;
}

.factor[data-on] {
  color: #fff;
  background: var(--ss-accent);
  box-shadow: 0 6px 18px -8px var(--ss-accent);
}

.factor[data-beat='a'] {
  animation: popA 520ms var(--ss-roll) 90ms;
}

.factor[data-beat='b'] {
  animation: popB 520ms var(--ss-roll) 90ms;
}

.count {
  justify-self: start;
  margin-inline-start: calc(-22px - 0.05em);
  border-radius: 18px;
  font-family: var(--ss-font-display);
  font-size: clamp(180px, 56cqi, 280px);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--ss-ink);
  outline: none;
  cursor: default;
}

.count:focus-visible {
  box-shadow: 0 0 0 3px var(--ss-bg), 0 0 0 5px var(--ss-accent);
}

.numeral {
  --sd: 1;
  display: block;
  text-shadow: 0 0.02em 0.12em rgba(0, 0, 0, 0.35);
}

.numeral[data-beat='a'] {
  animation: smearA 620ms var(--ss-out);
}

.numeral[data-beat='b'] {
  animation: smearB 620ms var(--ss-out);
}

.controls {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 48px;
  align-items: center;
  gap: 10px;
  margin-block-start: 10px;
}

.btn {
  display: grid;
  place-items: center;
  inline-size: 48px;
  block-size: 48px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ss-ink) 10%, transparent);
  color: var(--ss-ink);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ss-ink) 22%, transparent);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition:
    transform 420ms var(--ss-roll),
    background-color 160ms ease,
    opacity 160ms ease;
}

.btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ss-ink) 18%, transparent);
}

.btn:active:not(:disabled) {
  transform: scale(0.9);
  transition-duration: 90ms, 160ms, 160ms;
}

.btn:disabled {
  cursor: default;
  opacity: 0.3;
}

.dial {
  position: relative;
  block-size: 56px;
  overflow: hidden;
  direction: ltr;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
  mask-image: linear-gradient(90deg, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%);
}

.dial[data-dragging] {
  cursor: grabbing;
}

.track {
  position: absolute;
  inset-block: 0;
  left: 50%;
  transform: translateX(calc(var(--pos) * var(--ss-gap) * -1));
  transition: transform 640ms var(--ss-roll);
}

.dial[data-dragging] .track {
  transition: none;
}

.tick,
.tickMajor {
  position: absolute;
  inset-block-start: 6px;
  left: calc(var(--n) * var(--ss-gap));
  inline-size: 1px;
  block-size: 12px;
  margin-left: -0.5px;
  background: color-mix(in srgb, var(--ss-ink) 32%, transparent);
  transition: background-color 200ms ease, transform 420ms var(--ss-roll);
  transform-origin: 50% 0;
}

.tickMajor {
  inline-size: 2px;
  margin-left: -1px;
  block-size: 20px;
  border-radius: 1px;
  background: color-mix(in srgb, var(--ss-ink) 62%, transparent);
}

.tick[data-on],
.tickMajor[data-on] {
  background: var(--ss-ink);
  transform: scaleY(1.35);
}

.tickNum {
  position: absolute;
  inset-block-start: 26px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ss-ink-3);
}

.tickMajor[data-on] .tickNum {
  color: var(--ss-ink);
  transform: translateX(-50%) scaleY(0.74);
}

.needle {
  position: absolute;
  inset-block-start: 0;
  left: 50%;
  inline-size: 3px;
  block-size: 30px;
  margin-left: -1.5px;
  border-radius: 2px;
  background: var(--ss-accent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--ss-accent) 70%, transparent);
}

.panel {
  position: relative;
  isolation: isolate;
  display: grid;
  align-content: start;
  gap: 28px;
  min-inline-size: 0;
  margin: 0;
  padding-block: 28px 30px;
  padding-inline: 22px;
  overflow: clip;
  background:
    radial-gradient(120% 60% at 100% 0%, color-mix(in srgb, var(--ss-panel) 82%, #c9f2b8) 0%, transparent 62%),
    linear-gradient(180deg, var(--ss-panel) 0%, color-mix(in srgb, var(--ss-panel) 78%, #000) 100%);
  box-shadow: none;
}

.grain {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: var(--ss-grain);
  opacity: 0.07;
  mix-blend-mode: overlay;
}

.head {
  display: grid;
  gap: 10px;
}

.title {
  margin: 0;
  font-family: var(--ss-font-display);
  font-size: clamp(28px, 8cqi, 34px);
  font-weight: 700;
  line-height: 1.04;
  letter-spacing: -0.03em;
  text-wrap: balance;
  overflow-wrap: break-word;
}

.subtitle {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--ss-ink-2);
  overflow-wrap: anywhere;
}

.section {
  display: grid;
  gap: 6px;
}

.sectionLabel {
  margin: 0;
  padding-block-end: 8px;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.005em;
  color: var(--ss-ink);
  border-block-end: 1px solid color-mix(in srgb, var(--ss-ink) 26%, transparent);
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: grid;
  grid-template-columns: 2.9em 4.8em minmax(0, 1fr);
  align-items: baseline;
  gap: 0 10px;
  padding-block: 11px;
  border-block-end: 1px solid var(--ss-line);
}

.row:last-child {
  border-block-end: 0;
}

.qty {
  position: relative;
  justify-self: end;
  display: inline-flex;
  align-items: baseline;
}

.amount {
  font-family: var(--ss-font-display);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ss-ink);
}

.amount .strip {
  transition-delay: calc(180ms + min(var(--i, 0), 12) * 34ms);
}

.sweep {
  position: absolute;
  inset-inline: 0;
  inset-block-end: -5px;
  block-size: 2px;
  border-radius: 2px;
  background: var(--ss-accent);
  transform-origin: 0 50%;
  transform: scaleX(0);
  opacity: 0;
  animation: sweep 900ms var(--ss-out) calc(200ms + min(var(--i, 0), 12) * 34ms);
}

.unit,
.unitOnly {
  font-size: 14px;
  font-weight: 500;
  color: var(--ss-ink-3);
  overflow-wrap: anywhere;
}

.unitOnly {
  font-style: italic;
}

.name {
  grid-column: 3;
  min-inline-size: 0;
  font-size: 16px;
  line-height: 1.4;
  color: var(--ss-ink);
  overflow-wrap: anywhere;
}

.method {
  display: grid;
  gap: 12px;
}

.methodText {
  margin: 0;
  max-inline-size: 62ch;
  font-size: 15px;
  line-height: 1.6;
  color: var(--ss-ink-2);
  overflow-wrap: break-word;
}

.roll {
  display: inline-flex;
  align-items: baseline;
  font-variant-numeric: tabular-nums lining-nums;
  line-height: 1;
}

.digit {
  display: inline-block;
  block-size: 1.08em;
  overflow: hidden;
  animation: enter 460ms var(--ss-roll) both;
}

.bigRoll {
  letter-spacing: 0;
}

.bigRoll .digit {
  margin-inline-end: -0.05em;
  block-size: 0.86em;
  mask-image: linear-gradient(180deg, transparent 0%, #000 7%, #000 95%, transparent 100%);
}

.strip {
  display: flex;
  flex-direction: column;
  transform: translateY(calc(var(--d) * -1.08em));
  transition: transform 720ms var(--ss-roll);
}

.bigRoll .strip {
  transform: translateY(calc(var(--d) * -0.86em));
  transition-delay: 40ms;
}

.cell {
  display: block;
  block-size: 1.08em;
  line-height: 1.08em;
  text-align: center;
}

.bigRoll .cell {
  block-size: 0.86em;
  line-height: 0.86em;
}

.glyph {
  display: inline-block;
  line-height: 1.08em;
  animation: enter 460ms var(--ss-roll) both;
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

@container (min-width: 760px) {
  .frame {
    grid-template-columns: minmax(0, 1fr);
  }

  .media {
    block-size: 580px;
  }

  .hero {
    min-block-size: 580px;
    padding-block: 40px 36px;
    padding-inline: 44px 32px;
  }

  .count {
    margin-inline-start: calc(-44px - 0.05em);
    font-size: min(400px, 46cqi);
  }

  .controls {
    max-inline-size: 560px;
  }

  .tick {
    block-size: 14px;
  }

  .tickMajor {
    block-size: 24px;
  }

  .tickNum {
    inset-block-start: 30px;
  }

  .row {
    grid-template-columns: 3.4em 5.6em minmax(0, 1fr);
    gap: 0 14px;
  }

  .servingsLabel {
    font-size: 18px;
  }

  .panel {
    margin: 0;
    padding-block: 40px 44px;
    padding-inline: 44px;
    gap: 32px;
  }

  .title {
    font-size: clamp(34px, 3.6cqi, 42px);
  }
}

@keyframes pushA {
  35% {
    transform: scale(1.03);
    filter: brightness(1.08);
  }
}

@keyframes pushB {
  35% {
    transform: scale(1.03);
    filter: brightness(1.08);
  }
}

@keyframes smearA {
  18% {
    filter: blur(1.2px);
    text-shadow:
      0 calc(var(--sd) * 0.07em) 0.02em color-mix(in srgb, var(--ss-ink) 45%, transparent),
      0 calc(var(--sd) * 0.16em) 0.05em color-mix(in srgb, var(--ss-ink) 22%, transparent),
      0 calc(var(--sd) * 0.27em) 0.08em color-mix(in srgb, var(--ss-ink) 9%, transparent);
    transform: scaleY(1.04);
  }
}

@keyframes smearB {
  18% {
    filter: blur(1.2px);
    text-shadow:
      0 calc(var(--sd) * 0.07em) 0.02em color-mix(in srgb, var(--ss-ink) 45%, transparent),
      0 calc(var(--sd) * 0.16em) 0.05em color-mix(in srgb, var(--ss-ink) 22%, transparent),
      0 calc(var(--sd) * 0.27em) 0.08em color-mix(in srgb, var(--ss-ink) 9%, transparent);
    transform: scaleY(1.04);
  }
}

@keyframes popA {
  40% {
    transform: scale(1.14);
  }
}

@keyframes popB {
  40% {
    transform: scale(1.14);
  }
}

@keyframes sweep {
  0% {
    opacity: 1;
    transform: scaleX(0);
  }
  45% {
    opacity: 1;
    transform: scaleX(1);
  }
  100% {
    opacity: 0;
    transform: scaleX(1);
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
  .track,
  .btn,
  .tick,
  .tickMajor {
    transition: none;
  }

  .digit,
  .glyph,
  .photo,
  .numeral,
  .factor,
  .sweep {
    animation: none;
  }
}
```
