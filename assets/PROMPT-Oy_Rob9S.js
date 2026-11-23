const n=`Create a custom element called "Postcard Reviews". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: reviews (message, name, town), card heading (e.g. Greetings from), stamp icon (shell, wave, sun, anchor), card colours (border, accent, card stock, ink, table). Add other settings if they help.

\`\`\`tsx
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export interface PostcardReview {
  message: string;
  name: string;
  town: string;
}

export type StampIcon = 'shell' | 'wave' | 'sun' | 'anchor';

export interface PostcardReviewsProps {
  reviews?: PostcardReview[];
  greeting?: string;
  stampIcon?: StampIcon;
  borderColor?: string;
  accentColor?: string;
  cardColor?: string;
  inkColor?: string;
  tableColor?: string;
  className?: string;
}

export const defaultReviews: PostcardReview[] = [
  {
    message: 'Ate the grilled sardines on the terrace as the tide came in. Easily the best meal of our whole week on the coast. We are already planning the next trip.',
    name: 'Marta & Joe',
    town: 'St Ives',
  },
  {
    message: 'The staff remembered our names on the second night and saved us the corner table. Little things, done beautifully.',
    name: 'Priya Raman',
    town: 'Brighton',
  },
  {
    message: 'Booked the tasting menu for my mother’s seventieth. She has not stopped talking about the lemon tart since.',
    name: 'Daniel Okafor',
    town: 'Whitstable',
  },
  {
    message: 'Drove two hours on a rainy Tuesday just for the chowder. Worth every mile, and the windows fogged up in the best way.',
    name: 'Hannah Lindqvist',
    town: 'Falmouth',
  },
  {
    message: 'Warm, unhurried and honest food. We stayed until they stacked the chairs, and nobody once rushed us out.',
    name: 'Tom Ashby',
    town: 'Aldeburgh',
  },
  {
    message: 'Found you by accident walking the harbour wall. Now it is the first place we take every friend who visits.',
    name: 'Sofia Marchetti',
    town: 'Padstow',
  },
];

type Geometry = { dx: number; dy: number; s: number };

const MAX_OPEN_WIDTH = 600;
const EDGE = 16;
const CARD_HELP = 'Press Enter to turn the postcard over. Escape puts it back; left and right arrows move to the next postcard.';

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');
const tilt = (i: number) => ((i * 37) % 9) - 4;
const nudge = (i: number) => ((i * 53) % 7) - 3;

function StampArt({ icon }: { icon: StampIcon }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg className={styles.stampArt} viewBox="0 0 40 40" aria-hidden="true">
      {icon === 'shell' && (
        <g {...common}>
          <path d="M20 33 C9 31 5 21 8 14 C12 7 28 7 32 14 C35 21 31 31 20 33 Z" />
          <path d="M20 33 L13 12 M20 33 L20 10 M20 33 L27 12 M20 33 L9 18 M20 33 L31 18" />
          <path d="M16 33 L24 33" />
        </g>
      )}
      {icon === 'wave' && (
        <g {...common}>
          <path d="M5 27 C9 27 10 14 19 14 C26 14 27 21 23 23 C20 24.5 18 21.5 20 20" />
          <path d="M5 33 C10 31 13 31 17.5 33 C22 35 25 35 29 33 C32 31.5 34 31.5 36 33" />
          <circle cx="30" cy="10" r="3.5" />
        </g>
      )}
      {icon === 'sun' && (
        <g {...common}>
          <path d="M9 25 A11 11 0 0 1 31 25" />
          <path d="M20 8 L20 11 M8.5 13 L10.6 15.1 M31.5 13 L29.4 15.1 M4 25 L36 25" />
          <path d="M7 30.5 C11 29 14 32 18 30.5 C22 29 25 32 29 30.5 C31 29.8 32.5 30 34 30.5" />
        </g>
      )}
      {icon === 'anchor' && (
        <g {...common}>
          <circle cx="20" cy="9" r="3" />
          <path d="M20 12 L20 33 M13 17 L27 17" />
          <path d="M8 24 C8 30 13 33 20 33 C27 33 32 30 32 24" />
          <path d="M5.5 26.5 L8 24 L10.5 26.5 M29.5 26.5 L32 24 L34.5 26.5" />
        </g>
      )}
    </svg>
  );
}

function Postmark({ town, uid }: { town: string; uid: string }) {
  const pathId = \`\${uid}-arc\`;
  const label = town.toUpperCase();
  return (
    <svg className={styles.postmark} viewBox="0 0 160 120" aria-hidden="true">
      <g className={styles.ink}>
        <path d="M2 34 C 14 28, 24 40, 36 34 S 58 28, 70 34" />
        <path d="M2 48 C 14 42, 24 54, 36 48 S 58 42, 70 48" />
        <path d="M2 62 C 14 56, 24 68, 36 62 S 58 56, 70 62" />
        <path d="M2 76 C 14 70, 24 82, 36 76 S 58 70, 70 76" />
        <circle cx="104" cy="60" r="50" />
        <circle cx="104" cy="60" r="33" />
        <path id={pathId} d="M 62 60 A 42 42 0 1 1 146 60 A 42 42 0 1 1 62 60" fill="none" stroke="none" />
        <text className={styles.postmarkText}>
          <textPath href={\`#\${pathId}\`} startOffset="2%" textLength={Math.min(248, label.length * 15 + 20)} lengthAdjust="spacingAndGlyphs">
            {label}
          </textPath>
        </text>
        <path d="M84 56 L124 56 M84 64 L124 64" />
        <path className={styles.inkFill} d="M104 44 l2.4 5 5.4.7-4 3.7 1 5.3-4.8-2.6-4.8 2.6 1-5.3-4-3.7 5.4-.7z" />
      </g>
    </svg>
  );
}

export default function PostcardReviews({
  reviews = defaultReviews,
  greeting = 'Greetings from',
  stampIcon = 'shell',
  borderColor = '#7fb7b2',
  accentColor = '#e98a72',
  cardColor = '#f7f0e1',
  inkColor = '#1f2a44',
  tableColor = '#d5e2dd',
  className,
}: PostcardReviewsProps) {
  const uid = useId();
  const tableRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLLIElement | null)[]>([]);
  const frontRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const backRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [geo, setGeo] = useState<Geometry>({ dx: 0, dy: 0, s: 1 });

  const measure = useCallback((index: number): Geometry => {
    const table = tableRef.current;
    const slot = slotRefs.current[index];
    if (!table || !slot) return { dx: 0, dy: 0, s: 1 };
    const t = table.getBoundingClientRect();
    const c = slot.getBoundingClientRect();
    const top = Math.max(t.top, 0);
    const bottom = Math.min(t.bottom, window.innerHeight);
    const visibleH = Math.max(bottom - top, c.height);
    const availW = Math.min(t.width - EDGE * 2, MAX_OPEN_WIDTH);
    const s = Math.max(1, Math.min(availW / c.width, (visibleH - EDGE * 2) / c.height));
    return {
      dx: t.left + t.width / 2 - (c.left + c.width / 2),
      dy: (top + bottom) / 2 - (c.top + c.height / 2),
      s,
    };
  }, []);

  const openCard = useCallback(
    (index: number) => {
      setGeo(measure(index));
      setOpen(index);
    },
    [measure],
  );

  const close = useCallback(() => {
    setOpen((current) => {
      if (current !== null) frontRefs.current[current]?.focus({ preventScroll: true });
      return null;
    });
  }, []);

  useEffect(() => {
    if (open === null) return;
    backRefs.current[open]?.focus({ preventScroll: true });
    const table = tableRef.current;
    if (!table) return;
    const ro = new ResizeObserver(() => setGeo(measure(open)));
    ro.observe(table);
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      ro.disconnect();
      document.removeEventListener('keydown', onKey);
    };
  }, [open, measure, close]);

  const step = (from: number, delta: number) => (from + delta + reviews.length) % reviews.length;

  const onFrontKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    frontRefs.current[step(i, delta)]?.focus();
  };

  const onBackKey = (e: KeyboardEvent<HTMLDivElement>, i: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      close();
      return;
    }
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta || reviews.length < 2) return;
    e.preventDefault();
    openCard(step(i, delta));
  };

  const rootStyle = {
    '--pr-border': borderColor,
    '--pr-accent': accentColor,
    '--pr-card': cardColor,
    '--pr-ink': inkColor,
    '--pr-table': tableColor,
  } as CSSProperties;

  return (
    <section
      className={cx(styles.root, className)}
      style={rootStyle}
      aria-label="Customer postcards"
    >
      <svg className={styles.defs} aria-hidden="true" focusable="false">
        <filter id={\`\${uid}-ink\`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" result="rough" />
          <feComponentTransfer in="noise" result="patchy">
            <feFuncA type="table" tableValues="0 0.35 1 1" />
          </feComponentTransfer>
          <feComposite in="rough" in2="patchy" operator="in" />
        </filter>
      </svg>

      <div ref={tableRef} className={styles.table}>
        <span className={styles.grain} aria-hidden="true" />
        <span className={cx(styles.scrim, open !== null && styles.scrimOn)} aria-hidden="true" onClick={close} />

        <ul className={styles.list}>
          {reviews.map((r, i) => {
            const isOpen = open === i;
            const backId = \`\${uid}-back-\${i}\`;
            const cardStyle = {
              '--i': i,
              '--tilt': \`\${tilt(i) * 0.9}deg\`,
              '--nudge': \`\${nudge(i) * 3}px\`,
              ...(isOpen ? { '--dx': \`\${geo.dx}px\`, '--dy': \`\${geo.dy}px\`, '--s': geo.s } : {}),
            } as CSSProperties;
            const tone = i % 2 === 0 ? styles.toneAccent : styles.toneBorder;

            return (
              <li key={i} ref={(el) => (slotRefs.current[i] = el)} className={styles.slot}>
                <div className={cx(styles.card, isOpen && styles.cardOpen, open !== null && !isOpen && styles.cardRest)} style={cardStyle}>
                  <span className={cx(styles.shadow, isOpen && styles.shadowOpen)} aria-hidden="true" />
                  <div className={cx(styles.flipper, isOpen && styles.flipperOpen)}>
                    <button
                      ref={(el) => (frontRefs.current[i] = el)}
                      type="button"
                      className={cx(styles.face, styles.front, isOpen && styles.frontHidden)}
                      aria-expanded={isOpen}
                      aria-controls={backId}
                      aria-label={\`Postcard from \${r.name}, \${r.town}\`}
                      aria-description={CARD_HELP}
                      tabIndex={isOpen ? -1 : 0}
                      onClick={() => openCard(i)}
                      onKeyDown={(e) => onFrontKey(e, i)}
                    >
                      <span className={styles.frame} aria-hidden="true" />
                      <span className={styles.stock} aria-hidden="true" />
                      <span className={styles.frontBody} aria-hidden="true">
                        <span className={styles.greeting}>{greeting}</span>
                        <span className={styles.town}>{r.town}</span>
                        <span className={styles.from}>{r.name}</span>
                      </span>
                      <span className={cx(styles.stamp, tone)} aria-hidden="true">
                        <StampArt icon={stampIcon} />
                      </span>
                      <span className={styles.markFront} aria-hidden="true" style={{ filter: \`url(#\${uid}-ink)\` }}>
                        <Postmark town={r.town} uid={\`\${uid}-f\${i}\`} />
                      </span>
                    </button>

                    <div
                      ref={(el) => (backRefs.current[i] = el)}
                      id={backId}
                      className={cx(styles.face, styles.back, isOpen && styles.backShown)}
                      role="group"
                      aria-label={\`Postcard from \${r.name}, \${r.town}\`}
                      aria-hidden={!isOpen}
                      tabIndex={-1}
                      onClick={close}
                      onKeyDown={(e) => onBackKey(e, i)}
                    >
                      <span className={styles.frame} aria-hidden="true" />
                      <span className={styles.stock} aria-hidden="true" />
                      <div className={styles.backBody}>
                        <span className={styles.backCorner} aria-hidden="true">
                          <span className={cx(styles.stamp, styles.stampBack, tone)}>
                            <StampArt icon={stampIcon} />
                          </span>
                          <span className={styles.markBack} style={{ filter: \`url(#\${uid}-ink)\` }}>
                            <Postmark town={r.town} uid={\`\${uid}-b\${i}\`} />
                          </span>
                        </span>
                        <blockquote className={styles.message}>
                          <p className={styles.messageText}>{r.message}</p>
                        </blockquote>
                        <p className={styles.signature}>
                          <span className={styles.signName}>{r.name}</span>
                          <span className={styles.signTown}>{r.town}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
\`\`\`

\`\`\`css
.root {
  --pr-border: #7fb7b2;
  --pr-accent: #e98a72;
  --pr-card: #f7f0e1;
  --pr-ink: #1f2a44;
  --pr-table: #d5e2dd;
  --pr-font-script: 'Caveat', 'Bradley Hand', 'Segoe Print', 'Noteworthy', cursive;
  --pr-font-display: 'Fraunces', 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
  --pr-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --pr-spring: linear(0, 0.046, 0.159, 0.307, 0.466, 0.618, 0.753, 0.864, 0.95, 1.012, 1.052, 1.075, 1.083, 1.082, 1.074, 1.062, 1.049, 1.036, 1.024, 1.014, 1.006, 1, 0.996, 0.994, 0.993, 0.993, 0.994, 0.995, 1);
  --pr-settle: cubic-bezier(0.22, 1, 0.36, 1);
  --pr-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.42  0 0 0 0 0.36  0 0 0 .75 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  color: var(--pr-ink);
  font-family: var(--pr-font-ui);
}

.defs {
  position: absolute;
  inline-size: 0;
  block-size: 0;
  overflow: hidden;
}

.table {
  position: relative;
  isolation: isolate;
  overflow: clip;
  box-sizing: border-box;
  padding-block: 40px 52px;
  padding-inline: 20px;
  border-radius: 28px;
  background:
    radial-gradient(70% 60% at 30% 10%, color-mix(in srgb, #fff 55%, transparent) 0%, transparent 70%),
    radial-gradient(90% 80% at 50% 120%, color-mix(in srgb, var(--pr-border) 30%, transparent) 0%, transparent 70%),
    var(--pr-table);
}

.grain {
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: var(--pr-noise);
  opacity: 0.3;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.scrim {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: color-mix(in srgb, var(--pr-table) 62%, transparent);
  backdrop-filter: blur(3px) saturate(0.85);
  opacity: 0;
  pointer-events: none;
  transition: opacity 420ms var(--pr-settle);
}

.scrimOn {
  opacity: 1;
  pointer-events: auto;
}

.list {
  position: relative;
  display: flex;
  flex-direction: column;
  inline-size: min(100%, 380px);
  margin: 0 auto;
  padding: 0;
  list-style: none;
}

.slot {
  position: relative;
  inline-size: 100%;
  aspect-ratio: 3 / 2;
}

.slot + .slot {
  margin-block-start: calc(-66.667% + 80px);
}

.card {
  --dx: 0px;
  --dy: 0px;
  --s: 1;

  position: absolute;
  inset: 0;
  z-index: 1;
  container-type: inline-size;
  transform: translate(var(--nudge), 0) rotate(calc(var(--tilt) * 0.4));
  transition:
    transform 900ms var(--pr-spring),
    z-index 0s linear 900ms;
}

.cardOpen {
  z-index: 20;
  transform: translate(var(--dx), var(--dy)) scale(var(--s)) rotate(0deg);
  transition:
    transform 900ms var(--pr-spring),
    z-index 0s linear 0s;
}

.cardRest {
  transform: translate(var(--nudge), 6px) rotate(calc(var(--tilt) * 0.4)) scale(0.97);
  transition:
    transform 700ms var(--pr-settle) calc(var(--i) * 35ms),
    z-index 0s linear 900ms;
}

.shadow {
  position: absolute;
  inset: 6% 3% -4%;
  z-index: -1;
  border-radius: 10px;
  background: color-mix(in srgb, var(--pr-ink) 40%, transparent);
  filter: blur(14px);
  opacity: 0.35;
  transform: translateY(6px);
  transition:
    opacity 400ms var(--pr-settle),
    transform 400ms var(--pr-settle);
  pointer-events: none;
}

.shadowOpen {
  opacity: 0.5;
  transform: translateY(16px) scale(1.02);
}

.flipper {
  position: relative;
  block-size: 100%;
  transform-style: preserve-3d;
  transition: transform 860ms var(--pr-spring) 70ms;
}

.flipperOpen {
  transform: perspective(1400px) rotateY(180deg);
}

.face {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  overflow: hidden;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 7px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  color: var(--pr-ink);
  font: inherit;
  text-align: start;
  box-shadow:
    0 1px 1px color-mix(in srgb, var(--pr-ink) 14%, transparent),
    0 6px 14px -8px color-mix(in srgb, var(--pr-ink) 40%, transparent);
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.front {
  display: block;
  inline-size: 100%;
  cursor: pointer;
  background: var(--pr-card);
  transition:
    transform 320ms var(--pr-settle),
    box-shadow 320ms var(--pr-settle);
}

.front:hover {
  transform: translateY(-4px) rotate(calc(var(--tilt) * -0.25));
  box-shadow:
    0 1px 1px color-mix(in srgb, var(--pr-ink) 14%, transparent),
    0 18px 26px -14px color-mix(in srgb, var(--pr-ink) 45%, transparent);
}

.front:focus-visible,
.back:focus-visible {
  box-shadow:
    0 0 0 2px var(--pr-card),
    0 0 0 4px var(--pr-ink);
}

.back {
  transform: rotateY(180deg);
  cursor: pointer;
  background: var(--pr-card);
}

.frame {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: repeating-linear-gradient(
    -45deg,
    var(--pr-accent) 0 9px,
    var(--pr-card) 9px 13px,
    var(--pr-border) 13px 22px,
    var(--pr-card) 22px 26px
  );
  opacity: 0.85;
}

.stock {
  position: absolute;
  inset: 2.6cqi;
  border-radius: 3px;
  background:
    radial-gradient(120% 80% at 15% 0%, color-mix(in srgb, #fff 45%, transparent) 0%, transparent 60%),
    linear-gradient(170deg, var(--pr-card) 0%, color-mix(in srgb, var(--pr-card) 88%, var(--pr-ink)) 140%);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--pr-ink) 8%, transparent);
}

.stock::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image: var(--pr-noise);
  opacity: 0.32;
  mix-blend-mode: multiply;
}

.frontBody {
  position: absolute;
  inset: 8cqi 7cqi 7cqi 8cqi;
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
}

.greeting {
  font-family: var(--pr-font-ui);
  font-size: max(9px, 3cqi);
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--pr-ink) 62%, transparent);
  padding-inline-end: 26cqi;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.town {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin-block-start: 1.6cqi;
  padding-inline-end: 24cqi;
  font-family: var(--pr-font-display);
  font-size: 10.5cqi;
  font-style: italic;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--pr-ink);
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.from {
  margin-block-start: auto;
  font-family: var(--pr-font-script);
  font-size: 6.4cqi;
  line-height: 1.1;
  color: color-mix(in srgb, var(--pr-ink) 88%, var(--pr-border));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-inline-end: 30cqi;
}

.stamp {
  position: absolute;
  inset-block-start: 7cqi;
  inset-inline-end: 7cqi;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  inline-size: 17cqi;
  aspect-ratio: 4 / 5;
  padding: 1.3cqi;
  background: #fffdf7;
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    radial-gradient(circle, transparent 0.6cqi, #000 0.7cqi) -0.65cqi -0.65cqi / 1.3cqi 1.3cqi;
  mask:
    linear-gradient(#000 0 0) content-box,
    radial-gradient(circle, transparent 0.6cqi, #000 0.7cqi) -0.65cqi -0.65cqi / 1.3cqi 1.3cqi;
  filter: drop-shadow(0 1px 1.5px color-mix(in srgb, var(--pr-ink) 30%, transparent));
}

.stampBack {
  position: relative;
  inset: auto;
}

.stamp::before {
  content: '';
  position: absolute;
  inset: 2.1cqi;
  background:
    radial-gradient(90% 70% at 30% 20%, color-mix(in srgb, #fff 22%, transparent) 0%, transparent 70%),
    var(--stamp-fill);
}

.toneAccent {
  --stamp-fill: var(--pr-accent);
}

.toneBorder {
  --stamp-fill: var(--pr-border);
}

.stampArt {
  position: relative;
  inline-size: 62%;
  color: #fffaf0;
}

.markFront {
  position: absolute;
  inset-block-start: 15cqi;
  inset-inline-end: 12cqi;
  inline-size: 31cqi;
  opacity: 0.78;
  transform: rotate(-12deg);
  mix-blend-mode: multiply;
  pointer-events: none;
}

.postmark {
  display: block;
  inline-size: 100%;
  overflow: visible;
}

.ink {
  fill: none;
  stroke: var(--pr-ink);
  stroke-width: 2.4;
  stroke-linecap: round;
}

.inkFill {
  fill: var(--pr-ink);
  stroke: none;
}

.postmarkText {
  fill: var(--pr-ink);
  stroke: none;
  font-family: var(--pr-font-ui);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.18em;
}

.backBody {
  position: absolute;
  inset: 6cqi 6cqi 5cqi 7cqi;
  display: flex;
  flex-direction: column;
  min-block-size: 0;
}

.backCorner {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
  z-index: 1;
  display: grid;
  justify-items: end;
  inline-size: 30cqi;
}

.markBack {
  position: absolute;
  inset-block-start: 8cqi;
  inset-inline-end: 9cqi;
  inline-size: 26cqi;
  opacity: 0.75;
  transform: rotate(-10deg);
  mix-blend-mode: multiply;
}

.message {
  flex: 1 1 auto;
  min-block-size: 0;
  margin: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 1.4em), transparent);
  mask-image: linear-gradient(to bottom, #000 calc(100% - 1.4em), transparent);
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--pr-ink) 30%, transparent) transparent;
}

.messageText {
  margin: 0;
  font-family: var(--pr-font-script);
  font-size: 5cqi;
  line-height: 1.5;
  color: var(--pr-ink);
  overflow-wrap: anywhere;
  background-image: linear-gradient(
    to bottom,
    transparent calc(100% - 1px),
    color-mix(in srgb, var(--pr-border) 45%, transparent) calc(100% - 1px)
  );
  background-size: 100% 1.5em;
  background-position: 0 -0.12em;
}

.messageText::before {
  content: '';
  float: inline-end;
  inline-size: 30cqi;
  block-size: 26cqi;
}

.signature {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 2.4cqi;
  margin: 2cqi 0 0;
  padding-block-start: 2cqi;
  border-block-start: 1px solid color-mix(in srgb, var(--pr-ink) 14%, transparent);
}

.signName {
  min-inline-size: 0;
  font-family: var(--pr-font-script);
  font-size: 5.6cqi;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.signTown {
  min-inline-size: 0;
  font-size: max(8px, 2.5cqi);
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--pr-ink) 60%, transparent);
  overflow-wrap: anywhere;
}

@container (min-width: 560px) {
  .table {
    padding-block: 64px 72px;
    padding-inline: 32px;
  }

  .list {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: 20px 0;
    inline-size: 100%;
    max-inline-size: 1080px;
  }

  .slot {
    inline-size: clamp(220px, 30cqi, 330px);
    margin-inline: -6px;
  }

  .slot + .slot {
    margin-block-start: 0;
  }

  .card {
    transform: translate(var(--nudge), calc(var(--nudge) * 1.6)) rotate(var(--tilt));
  }

  .cardOpen {
    transform: translate(var(--dx), var(--dy)) scale(var(--s)) rotate(0deg);
  }

  .cardRest {
    transform: translate(var(--nudge), calc(var(--nudge) * 1.6 + 8px)) rotate(var(--tilt)) scale(0.96);
  }
}

@media (prefers-reduced-motion: reduce) {
  .card,
  .cardOpen,
  .cardRest,
  .front,
  .shadow {
    transition: none;
  }

  .flipper,
  .flipperOpen {
    transform: none;
    transition: none;
  }

  .front:hover {
    transform: none;
  }

  .back {
    transform: none;
    opacity: 0;
    visibility: hidden;
    transition:
      opacity 360ms ease,
      visibility 0s linear 360ms;
  }

  .backShown {
    opacity: 1;
    visibility: visible;
    transition:
      opacity 360ms ease,
      visibility 0s linear 0s;
  }

  .frontHidden {
    opacity: 0;
    transition: opacity 360ms ease;
  }
}
\`\`\`
`;export{n as default};
