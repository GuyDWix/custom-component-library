Create a custom element called "Logo Spotlight Wall". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: logos (image, name, one-line result), grayscale on/off, columns, heading, accent color. Add other settings if they help.

```tsx
import { useId, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export interface LogoSpotlightWallLogo {
  image?: string;
  name: string;
  result?: string;
}

export interface LogoSpotlightWallProps {
  logos?: LogoSpotlightWallLogo[];
  heading?: string;
  grayscale?: boolean;
  columns?: number;
  accentColor?: string;
  className?: string;
}

export const defaultLogos: LogoSpotlightWallLogo[] = [
  { name: 'Northwind', result: '+38% demo requests' },
  { name: 'HALCYON', result: 'Checkout time cut in half' },
  { name: 'ferro&vale', result: '2.4× repeat orders' },
  { name: 'Kestrel', result: '£1.2M new pipeline' },
  { name: 'Marlow', result: 'Bookings up 61% in Q2' },
  { name: 'ATLAS FREIGHT', result: '19 days faster onboarding' },
  { name: 'Quarry', result: 'Support tickets down 44%' },
  { name: 'Sable & Co.', result: 'Launched in 9 markets' },
  { name: 'lumen/labs', result: '4.9★ from 3,200 reviews' },
  { name: 'Brightwater', result: '+27% average basket' },
  { name: 'ORBIT', result: 'Churn halved in a year' },
  { name: 'Tessellate', result: '3× organic sign-ups' },
];

const WORDMARK_STYLES = [
  styles.wmSerif,
  styles.wmWide,
  styles.wmMono,
  styles.wmHeavy,
  styles.wmCaps,
  styles.wmLight,
];

const STEP_MS = 24;
const MAX_DELAY_MS = 140;
const WALL_HELP = 'Hover, focus or tap a logo to see the result for that client. Arrow keys move between logos.';

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

export default function LogoSpotlightWall({
  logos = defaultLogos,
  heading = 'Clients we have moved the needle for',
  grayscale = true,
  columns = 4,
  accentColor = '#b0673a',
  className,
}: LogoSpotlightWallProps) {
  const uid = useId();
  const headingId = `${uid}-heading`;
  const listRef = useRef<HTMLUListElement>(null);
  const liveCols = useRef(columns);
  const [hover, setHover] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const pickedOnPress = useRef(false);

  const cols = Math.max(1, Math.min(8, Math.round(columns) || 4));
  const active = hover ?? picked;
  const current = active !== null ? logos[active] : undefined;

  const measureCols = () => {
    const list = listRef.current;
    if (!list) return;
    liveCols.current = getComputedStyle(list).gridTemplateColumns.split(' ').filter(Boolean).length || cols;
  };

  const activate = (i: number, by: 'hover' | 'pick') => {
    measureCols();
    if (by === 'hover') setHover(i);
    else setPicked(i);
  };

  const buttons = () => Array.from(listRef.current?.querySelectorAll('button') ?? []);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const c = liveCols.current;
    const last = logos.length - 1;
    const moves: Record<string, number> = {
      ArrowRight: i + 1,
      ArrowLeft: i - 1,
      ArrowDown: i + c,
      ArrowUp: i - c,
      Home: 0,
      End: last,
    };
    if (e.key === 'Escape') {
      setPicked(null);
      e.currentTarget.blur();
      return;
    }
    const to = moves[e.key];
    if (to === undefined) return;
    e.preventDefault();
    buttons()[Math.max(0, Math.min(last, to))]?.focus();
  };

  const onListBlur = (e: FocusEvent<HTMLUListElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPicked(null);
  };

  const delayFor = (i: number) => {
    if (active === null) return 0;
    const c = liveCols.current || cols;
    const d = Math.max(Math.abs((i % c) - (active % c)), Math.abs(Math.floor(i / c) - Math.floor(active / c)));
    return Math.min(MAX_DELAY_MS, d * STEP_MS);
  };

  const rootStyle = {
    '--lsw-accent': accentColor,
    '--lsw-cols': cols,
    '--lsw-cols-narrow': Math.min(cols, 3),
  } as CSSProperties;

  return (
    <section
      className={cx(styles.root, className)}
      style={rootStyle}
      aria-labelledby={heading ? headingId : undefined}
      aria-label={heading ? undefined : 'Client logos'}
    >
      <span className={styles.mottle} aria-hidden="true" />
      <span className={styles.light} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />

      {heading && (
        <h2 id={headingId} className={styles.heading}>
          {heading}
        </h2>
      )}

      <ul
        ref={listRef}
        className={styles.grid}
        aria-description={WALL_HELP}
        onPointerLeave={() => setHover(null)}
        onBlur={onListBlur}
      >
        {logos.map((logo, i) => {
          const on = active === i;
          const off = active !== null && !on;
          const resultId = `${uid}-r${i}`;
          const tileStyle = { '--lsw-delay': `${delayFor(i)}ms` } as CSSProperties;
          return (
            <li key={i} className={styles.cell} style={tileStyle}>
              <button
                type="button"
                className={cx(styles.tile, on && styles.tileOn, off && styles.tileOff)}
                aria-describedby={logo.result ? resultId : undefined}
                aria-current={on ? 'true' : undefined}
                onPointerEnter={(e) => e.pointerType === 'mouse' && activate(i, 'hover')}
                onPointerDown={() => (pickedOnPress.current = picked === i)}
                onFocus={() => activate(i, 'pick')}
                onClick={(e) => {
                  const wasPicked = e.detail === 0 ? picked === i : pickedOnPress.current;
                  if (wasPicked && hover === null) setPicked(null);
                  else activate(i, 'pick');
                }}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                <span className={cx(styles.mark, on && styles.markOn)}>
                  {logo.image ? (
                    <img
                      className={cx(styles.logo, grayscale && styles.logoMono, on && styles.logoOn)}
                      src={logo.image}
                      alt={logo.name}
                      loading="lazy"
                      draggable={false}
                    />
                  ) : (
                    <span className={cx(styles.wordmark, WORDMARK_STYLES[i % WORDMARK_STYLES.length])}>
                      {logo.name}
                    </span>
                  )}
                </span>
                <span className={cx(styles.underline, on && styles.underlineOn)} aria-hidden="true" />
                {logo.result && (
                  <span id={resultId} className={cx(styles.result, on && styles.resultOn)}>
                    {logo.result}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className={styles.readout} aria-hidden="true">
        {current && (
          <p key={active} className={styles.readoutLine}>
            <span className={styles.readoutName}>{current.name}</span>
            {current.result && <span className={styles.readoutResult}>{current.result}</span>}
          </p>
        )}
      </div>
    </section>
  );
}
```

```css
.root {
  --lsw-accent: #b0673a;
  --lsw-stone: #e7dece;
  --lsw-stone-deep: #d6c9b3;
  --lsw-face: #ede5d8;
  --lsw-face-lit: #f5efe5;
  --lsw-ink: #2a2724;
  --lsw-line: rgba(80, 60, 35, 0.12);
  --lsw-rest-shift: 25px;
  --lsw-muted: rgba(42, 39, 36, 0.66);
  --lsw-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --lsw-font-display: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
  --lsw-font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  --lsw-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.3  0 0 0 .75 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --lsw-mottle: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='1600'><filter id='m'><feTurbulence type='fractalNoise' baseFrequency='.0025 .008' numOctaves='4' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.55  0 0 0 0 0.47  0 0 0 0 0.36  0 0 0 1.4 -0.45'/></filter><rect width='100%' height='100%' filter='url(%23m)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  display: grid;
  gap: 32px;
  padding-block: clamp(28px, 5%, 56px) clamp(16px, 2.5%, 28px);
  padding-inline: clamp(16px, 3.5%, 40px);
  border-radius: 28px;
  background:
    radial-gradient(80% 60% at 18% 0%, rgba(255, 250, 240, 0.85) 0%, transparent 60%),
    linear-gradient(170deg, var(--lsw-stone) 0%, var(--lsw-stone-deep) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.6),
    inset 0 -1px 0 rgba(90, 70, 45, 0.12);
  color: var(--lsw-ink);
  font-family: var(--lsw-font-ui);
}

.mottle,
.light,
.grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
}

.mottle {
  background-image: var(--lsw-mottle);
  background-size: 1600px 1600px;
  opacity: 0.28;
  mix-blend-mode: multiply;
}

.light {
  background: linear-gradient(115deg, rgba(255, 246, 228, 0.55) 0%, transparent 38%, transparent 70%, rgba(120, 90, 60, 0.08) 100%);
}

.grain {
  background-image: var(--lsw-noise);
  opacity: 0.2;
  mix-blend-mode: multiply;
}

.heading {
  margin: 0;
  max-inline-size: 22ch;
  font-family: var(--lsw-font-display);
  font-size: 30px;
  font-weight: 600;
  line-height: 1.12;
  letter-spacing: -0.02em;
  text-wrap: balance;
  overflow-wrap: break-word;
  color: var(--lsw-ink);
}

.grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(var(--lsw-cols), minmax(0, 1fr));
  gap: 12px;
}

.cell {
  display: grid;
  min-inline-size: 0;
}

.tile {
  appearance: none;
  position: relative;
  overflow: hidden;
  min-inline-size: 0;
  min-block-size: 152px;
  display: grid;
  grid-template-rows: 56px 2px auto;
  justify-items: center;
  align-content: center;
  gap: 14px;
  margin: 0;
  padding-block: 26px 20px;
  padding-inline: 16px;
  border: 1px solid var(--lsw-line);
  border-radius: 14px;
  background: var(--lsw-face);
  box-shadow: 0 1px 0 rgba(70, 50, 25, 0.04);
  color: var(--lsw-ink);
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition-property: opacity, filter, transform, box-shadow;
  transition-duration: 0.45s, 0.45s, 0.55s, 0.55s;
  transition-timing-function: cubic-bezier(0.22, 0.8, 0.24, 1);
  transition-delay: var(--lsw-delay);
}

.tile:focus-visible {
  outline: 2px solid var(--lsw-accent);
  outline-offset: 3px;
}

.tileOn {
  transform: translate3d(0, -2px, 0);
  transition-delay: 0ms;
  border-color: color-mix(in srgb, var(--lsw-accent) 28%, var(--lsw-line));
  background: var(--lsw-face-lit);
  box-shadow: 0 12px 28px -18px rgba(80, 48, 20, 0.35);
}

.tileOff {
  opacity: 0.42;
  filter: contrast(0.7) saturate(0.6);
  transform: scale(0.985);
}

.mark {
  position: relative;
  display: grid;
  place-items: center;
  inline-size: 100%;
  min-inline-size: 0;
  block-size: 56px;
  transform: translate3d(0, var(--lsw-rest-shift), 0);
  transition: transform 0.6s cubic-bezier(0.32, 1.25, 0.5, 1);
}

.markOn {
  transform: none;
}

.logo {
  max-inline-size: 78%;
  max-block-size: 44px;
  object-fit: contain;
  transition: filter 0.45s ease, opacity 0.45s ease;
}

.logoMono {
  filter: grayscale(1) contrast(1.15) brightness(0.7);
  opacity: 0.85;
  mix-blend-mode: multiply;
}

.logoOn {
  filter: none;
  opacity: 1;
}

.wordmark {
  display: block;
  max-inline-size: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--lsw-ink);
  font-size: 23px;
  line-height: 1.2;
}

.wmSerif {
  font-family: var(--lsw-font-display);
  font-style: italic;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.wmWide {
  font-family: var(--lsw-font-ui);
  font-weight: 700;
  font-size: 17px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.wmMono {
  font-family: var(--lsw-font-mono);
  font-weight: 500;
  font-size: 20px;
  letter-spacing: -0.03em;
}

.wmHeavy {
  font-family: var(--lsw-font-ui);
  font-weight: 800;
  font-size: 25px;
  letter-spacing: -0.045em;
}

.wmCaps {
  font-family: var(--lsw-font-display);
  font-weight: 500;
  font-variant: small-caps;
  font-size: 24px;
  letter-spacing: 0.06em;
}

.wmLight {
  font-family: var(--lsw-font-ui);
  font-weight: 300;
  font-size: 24px;
  letter-spacing: -0.01em;
}

.underline {
  position: relative;
  inline-size: 44px;
  block-size: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--lsw-accent) 80%, #f3d2b4), var(--lsw-accent) 55%, color-mix(in srgb, var(--lsw-accent) 82%, #000));
  transform: scaleX(0);
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.underlineOn {
  transform: scaleX(1);
}

.result {
  position: relative;
  display: block;
  max-inline-size: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: -0.005em;
  font-variant-numeric: tabular-nums;
  color: var(--lsw-ink);
  opacity: 0;
  transform: translate3d(0, 10px, 0);
  transition:
    opacity 0.35s ease,
    transform 0.5s cubic-bezier(0.22, 0.8, 0.24, 1);
}

.resultOn {
  opacity: 1;
  transform: none;
  transition-delay: 0.07s;
}

.readout {
  display: none;
  min-block-size: 48px;
  border-block-start: 1px solid rgba(80, 60, 35, 0.16);
}

.readoutLine {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  margin: 0;
  padding-block-start: 12px;
  min-inline-size: 0;
  animation: slideUp 0.45s cubic-bezier(0.22, 0.8, 0.24, 1) both;
}

.readoutName {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--lsw-ink);
  overflow-wrap: anywhere;
}

.readoutResult {
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  color: var(--lsw-ink);
  overflow-wrap: anywhere;
  padding-inline-start: 10px;
  border-inline-start: 2px solid var(--lsw-accent);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate3d(0, 8px, 0);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@container (min-width: 900px) {
  .heading {
    font-size: 38px;
  }
}

@container (max-width: 560px) {
  .grid {
    grid-template-columns: repeat(var(--lsw-cols-narrow), minmax(0, 1fr));
    gap: 8px;
    --lsw-rest-shift: 5px;
  }

  .tile {
    min-block-size: 88px;
    grid-template-rows: 40px 2px;
    gap: 8px;
    padding-block: 14px 12px;
    padding-inline: 8px;
    border-radius: 12px;
  }

  .mark {
    block-size: 40px;
  }

  .logo {
    max-block-size: 30px;
  }

  .wordmark {
    font-size: 15px;
  }

  .wmWide {
    font-size: 11px;
    letter-spacing: 0.16em;
  }

  .result {
    display: none;
  }

  .readout {
    display: block;
  }

  .heading {
    font-size: 24px;
  }
}

@container (max-width: 440px) {
  .heading {
    font-size: 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .readoutLine {
    animation: none;
  }

  .tile,
  .mark,
  .logo,
  .underline,
  .result {
    transition: none;
  }

  .result {
    transform: none;
  }
}
```
