Create a custom element called "Curtain Reveal Card". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: service name, price, duration, details lines, image, curtain color, open speed. Add other settings if they help.

```tsx
import { useEffect, useId, useRef, useState } from 'react';
import type {
  CSSProperties,
  FocusEvent as ReactFocusOutEvent,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent,
} from 'react';
import styles from './Component.module.css';

export interface CurtainRevealCardDetail {
  text: string;
}

export interface CurtainRevealCardProps {
  serviceName?: string;
  price?: string;
  duration?: string;
  details?: CurtainRevealCardDetail[];
  image?: string;
  imageAlt?: string;
  curtainColor?: string;
  openSpeed?: number;
  className?: string;
}

export const defaultDetails: CurtainRevealCardDetail[] = [
  { text: 'Deep double-cleanse and enzyme peel' },
  { text: 'Lymphatic sculpting massage' },
  { text: 'Warm velvet recovery mask' },
  { text: 'Neck, shoulder and scalp release' },
];

const PULL_LABEL = 'Reveal the price and details';
const CARD_HELP =
  'Hover, focus or tap to part the curtains. Tap again to keep them open or to close them. Escape also closes them.';

// How far (px) the pull cord can be drawn down, and how much of it counts as a "pull".
const PULL_MAX = 88;
const PULL_COMMIT = 0.42;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export default function CurtainRevealCard({
  serviceName = 'The Velvet Hour Facial',
  price = '$180',
  duration = '80 minutes',
  details = defaultDetails,
  image = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1400&h=900&fit=crop',
  imageAlt = 'A spa still life with a lotion bottle, a rolled towel and a lit candle',
  curtainColor = '#3a2433',
  openSpeed = 650,
  className,
}: CurtainRevealCardProps) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [imgFailed, setImgFailed] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const uid = useId();
  const titleId = `${uid}-title`;
  const revealId = `${uid}-reveal`;

  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: number; y0: number; moved: boolean; last: number } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const showImage = Boolean(image) && !imgFailed;
  const monogram = serviceName.trim().charAt(0).toUpperCase() || 'T';

  const toggle = () => {
    const next = !pinned;
    setPinned(next);
    setOpen(next);
  };

  const onPointerEnter = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && !pinned) setOpen(true);
  };

  const onPointerLeave = () => {
    if (!pinned && drag === null) setOpen(false);
  };

  const onCardClick = () => toggle();

  const onCardFocus = () => {
    if (!pinned) setOpen(true);
  };

  const onCardBlur = (e: ReactFocusOutEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!pinned && card && e.relatedTarget && !card.contains(e.relatedTarget as Node)) setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape') return;
    setPinned(false);
    setOpen(false);
  };

  const onPullDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id: e.pointerId, y0: e.clientY, moved: false, last: 0 };
    setDrag(0);
  };

  const onPullMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = clamp(e.clientY - d.y0, 0, PULL_MAX);
    if (dy > 5) d.moved = true;
    d.last = dy;
    setDrag(dy);
  };

  const endPull = (e: PointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    dragRef.current = null;
    setDrag(null);
    if (!d.moved) return; // a plain tap: the click handler toggles
    suppressClick.current = true;
    if (!cancelled && d.last / PULL_MAX >= PULL_COMMIT) toggle();
  };

  const onPullClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    toggle();
  };

  const pulling = drag !== null;
  const progress = pulling && !open ? drag / PULL_MAX : null;
  const visuallyOpen = open || (progress !== null && progress > 0.5);

  const cardStyle = {
    '--cv-curtain': curtainColor,
    '--cv-speed': `${clamp(openSpeed, 250, 1600)}ms`,
    ...(pulling ? { '--cv-tug': `${drag}px` } : {}),
    ...(progress !== null ? { '--cv-p': progress } : {}),
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      data-off={inView ? 'false' : 'true'}
    >
      <div
        ref={cardRef}
        className={styles.card}
        style={cardStyle}
        role="group"
        aria-labelledby={titleId}
        data-open={visuallyOpen ? 'true' : 'false'}
        data-drag={pulling ? 'true' : 'false'}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onClick={onCardClick}
        onFocus={onCardFocus}
        onBlur={onCardBlur}
        onKeyDown={onKeyDown}
      >
        <div className={styles.stage}>
          {showImage ? (
            <img
              className={styles.stageImg}
              src={image}
              alt={imageAlt || ''}
              draggable={false}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span className={styles.stageFallback} aria-hidden="true">
              <span className={styles.stageMonogram}>{monogram}</span>
            </span>
          )}
          <span className={styles.stageGlow} aria-hidden="true" />
          <span className={styles.stageDim} aria-hidden="true" />
        </div>

        <div className={styles.curtainLeft} aria-hidden="true">
          <span className={styles.clothLeft}>
            <span className={styles.foldShade} />
          </span>
        </div>

        <div className={styles.curtainRight} aria-hidden="true">
          <span className={styles.clothRight}>
            <span className={styles.foldShade} />
          </span>
        </div>

        <button
          type="button"
          className={styles.pull}
          aria-expanded={open || reduced}
          aria-controls={revealId}
          aria-label={PULL_LABEL}
          aria-description={CARD_HELP}
          onPointerDown={onPullDown}
          onPointerMove={onPullMove}
          onPointerUp={(e) => endPull(e, false)}
          onPointerCancel={(e) => endPull(e, true)}
          onClick={onPullClick}
        >
          <span className={styles.pullCord} aria-hidden="true" />
          <span className={styles.pullGrip} aria-hidden="true" />
        </button>

        <div className={styles.valance} aria-hidden="true" />
        <span className={styles.railLine} aria-hidden="true" />

        <div className={styles.overlay}>
          <div id={revealId} className={styles.reveal}>
           <div className={styles.panel}>
            <div className={styles.priceRow} style={{ '--i': 0 } as CSSProperties}>
              <span className={styles.price}>{price}</span>
              {duration && <span className={styles.duration}>{duration}</span>}
            </div>
            {details.length > 0 && (
              <ul className={styles.inclusions}>
                {details.map((d, i) => (
                  <li key={i} className={styles.inclusion} style={{ '--i': i + 1 } as CSSProperties}>
                    <span className={styles.inclusionNo} aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className={styles.inclusionText}>{d.text}</span>
                  </li>
                ))}
              </ul>
            )}
           </div>
          </div>

          <div className={styles.bill}>
            <span className={styles.billRule} aria-hidden="true" />
            <h3 id={titleId} className={styles.title}>
              {serviceName}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}
```

```css
@font-face {
  font-family: 'Fraunces';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('./fonts/fraunces-latin-variable.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

.root {
  --cv-curtain: #3a2433;
  --cv-curtain-deep: color-mix(in srgb, var(--cv-curtain) 62%, #07040a);
  --cv-curtain-mid: color-mix(in srgb, var(--cv-curtain) 88%, #07040a);
  --cv-curtain-ridge: color-mix(in srgb, var(--cv-curtain) 88%, #f0dfe8);
  --cv-wall: #0d080c;
  --cv-gold: #c9a45c;
  --cv-gold-light: #e2c88f;
  --cv-hair: color-mix(in srgb, var(--cv-gold) 46%, transparent);
  --cv-cream: #f4ece4;
  --cv-glow: #ffc58a;
  --cv-font-display: 'Fraunces', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
  --cv-font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', system-ui, sans-serif;
  --cv-speed: 650ms;
  --cv-ease: cubic-bezier(0.3, 0.8, 0.3, 1);
  --cv-ease-out: cubic-bezier(0.22, 0.9, 0.3, 1);

  display: block;
  box-sizing: border-box;
  inline-size: 100%;
  color: var(--cv-cream);
  font-family: var(--cv-font-ui);
  container-type: inline-size;
}

.root ::selection {
  background: color-mix(in srgb, var(--cv-gold) 40%, transparent);
  color: var(--cv-cream);
}

.card {
  /* drape openness: --cv-p 0 = half-drawn hero state, 1 = gathered to the sides */
  --cv-p: 0;
  --cv-rest: 0.7;
  --cv-gather: 0.15;
  --cv-sx: calc(var(--cv-rest) + (var(--cv-gather) - var(--cv-rest)) * var(--cv-p));
  --cv-tug: 0px;
  --cv-lines: 2;
  --cv-valance: clamp(14px, 2.4cqi, 24px);
  --cv-gutter: clamp(28px, 9cqi, 96px);
  --cv-fold: clamp(44px, 7.5cqi, 84px);
  --cv-pw: 44px;
  --cv-cord: clamp(40px, 8cqi, 96px);
  --cv-velvet:
    repeating-linear-gradient(
      90deg,
      var(--cv-curtain-deep) 0,
      var(--cv-curtain-mid) calc(var(--cv-fold) * 0.3),
      var(--cv-curtain-ridge) calc(var(--cv-fold) * 0.5),
      var(--cv-curtain-mid) calc(var(--cv-fold) * 0.72),
      var(--cv-curtain-deep) var(--cv-fold)
    );

  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  inline-size: 100%;
  aspect-ratio: 16 / 10;
  overflow: clip;
  border-radius: clamp(10px, 1.6cqi, 16px);
  background: var(--cv-wall);
  box-shadow: 0 30px 50px -34px rgba(0, 0, 0, 0.75);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.card[data-open='true'] {
  --cv-p: 1;
}

.card::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cv-gold) 30%, transparent);
}

/* ---------- stage ---------- */

.stage {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: clip;
  background: radial-gradient(70% 90% at 50% 100%, #3b2a24, #140d12 75%);
}

.stageImg {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  transform: scale(1.1);
  filter: saturate(0.7) contrast(1.05) brightness(0.8);
  transition: transform calc(var(--cv-speed) * 1.6) var(--cv-ease-out);
  user-select: none;
}

.card[data-open='true'] .stageImg {
  transform: scale(1.02);
}

.stageFallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background:
    radial-gradient(50% 70% at 50% 85%, color-mix(in srgb, var(--cv-glow) 38%, transparent), transparent 72%),
    #1c1217;
}

.stageMonogram {
  font-family: var(--cv-font-display);
  font-size: clamp(120px, 40cqi, 420px);
  font-weight: 500;
  line-height: 1;
  color: color-mix(in srgb, var(--cv-gold-light) 22%, transparent);
}

.stageGlow {
  position: absolute;
  z-index: 2;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: screen;
  background: radial-gradient(44% 70% at 50% 108%, color-mix(in srgb, var(--cv-glow) 36%, transparent), transparent 74%);
}

.stageDim {
  position: absolute;
  z-index: 3;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  background: linear-gradient(180deg, rgba(13, 8, 12, 0.72), rgba(13, 8, 12, 0.9));
  transition: opacity calc(var(--cv-speed) * 0.9) ease;
}

.card[data-open='true'] .stageDim {
  opacity: 0.86;
  transition-delay: calc(var(--cv-speed) * 0.12);
}

/* ---------- drapes ---------- */

.curtainLeft,
.curtainRight {
  position: absolute;
  inset-block: 0;
  z-index: 3;
  inline-size: 50.5%;
  direction: ltr;
  pointer-events: none;
  will-change: transform;
  transform: scaleX(var(--cv-sx));
  transition: transform var(--cv-speed) var(--cv-ease);
}

.curtainLeft {
  inset-inline-start: 0;
  transform-origin: left center;
}

.curtainRight {
  inset-inline-end: 0;
  transform-origin: right center;
  transition-delay: calc(var(--cv-speed) * 0.06);
}

.card[data-drag='true'] .curtainLeft,
.card[data-drag='true'] .curtainRight {
  transition: none;
}

.clothLeft,
.clothRight {
  position: absolute;
  inset: 0;
  overflow: clip;
  background:
    linear-gradient(180deg, rgba(5, 3, 6, 0.55), rgba(5, 3, 6, 0) 30%),
    linear-gradient(0deg, rgba(5, 3, 6, 0.5), rgba(5, 3, 6, 0) 28%),
    var(--cv-velvet);
}

.clothLeft {
  box-shadow: inset -1px 0 0 var(--cv-hair), 6px 0 28px rgba(0, 0, 0, 0.55);
}

.clothRight {
  box-shadow: inset 1px 0 0 var(--cv-hair), -6px 0 28px rgba(0, 0, 0, 0.55);
}

.foldShade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(90deg, rgba(5, 3, 6, 0.4), transparent 45%, rgba(5, 3, 6, 0.4));
  opacity: 0;
  transition: opacity var(--cv-speed) ease;
}

.card[data-open='true'] .foldShade {
  opacity: 0.6;
}

/* ---------- pull cord ---------- */

.pull {
  position: absolute;
  z-index: 5;
  inset-block-start: 0;
  inset-inline-end: calc(50.5% * var(--cv-sx) - var(--cv-pw) / 2);
  inline-size: var(--cv-pw);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  border: none;
  background: transparent;
  direction: ltr;
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition: inset-inline-end var(--cv-speed) var(--cv-ease);
  transition-delay: calc(var(--cv-speed) * 0.06);
}

.card[data-drag='true'] .pull {
  cursor: grabbing;
  transition: none;
}

.pull:focus-visible {
  outline: 2px solid var(--cv-gold-light);
  outline-offset: 2px;
  border-radius: 6px;
}

.pullCord {
  flex: none;
  inline-size: 1px;
  block-size: calc(var(--cv-valance) + var(--cv-cord) + var(--cv-tug));
  background: linear-gradient(180deg, transparent, var(--cv-gold) 30%);
  transition: block-size calc(var(--cv-speed) * 0.6) var(--cv-ease-out);
}

.card[data-drag='true'] .pullCord {
  transition: none;
}

.pullGrip {
  flex: none;
  inline-size: 18px;
  block-size: 30px;
  border-radius: 9px;
  border: 1px solid var(--cv-gold);
  background: linear-gradient(180deg, color-mix(in srgb, var(--cv-gold) 28%, #120b10), #120b10);
  box-shadow: 0 6px 12px -4px rgba(0, 0, 0, 0.7);
  transition: border-color 200ms ease;
}

.pull:hover .pullGrip,
.pull:focus-visible .pullGrip {
  border-color: var(--cv-gold-light);
}

/* ---------- valance + rail ---------- */

.valance {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  z-index: 6;
  block-size: var(--cv-valance);
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(5, 3, 6, 0.4), transparent),
    var(--cv-velvet);
  box-shadow: 0 8px 18px -6px rgba(0, 0, 0, 0.7);
}

.railLine {
  position: absolute;
  inset-inline: 0;
  inset-block-start: var(--cv-valance);
  z-index: 7;
  block-size: 1px;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--cv-gold) 12%, var(--cv-gold) 88%, transparent);
}

/* ---------- reveal panel + title ---------- */

.overlay {
  position: absolute;
  inset: 0;
  z-index: 8;
  display: flex;
  flex-direction: column;
  padding-block-start: calc(var(--cv-valance) + 6px);
  pointer-events: none;
}

.reveal {
  flex: 1 1 0;
  min-block-size: 0;
  display: flex;
  flex-direction: column;
  justify-content: safe center;
  padding-inline: var(--cv-gutter);
  overflow: clip;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: clamp(12px, 2cqi, 20px);
  inline-size: 100%;
  box-sizing: border-box;
  padding: clamp(14px, 2.4cqi, 28px);
  border: 1px solid var(--cv-hair);
  border-radius: 4px;
  background: linear-gradient(180deg, rgba(20, 13, 18, 0.72), rgba(13, 8, 12, 0.82));
  opacity: 0;
  transition: opacity calc(var(--cv-speed) * 0.3) ease;
}

.card[data-open='true'] .panel {
  opacity: 1;
  transition: opacity calc(var(--cv-speed) * 0.55) ease calc(var(--cv-speed) * 0.3);
}

.priceRow {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 16px;
  padding-block-end: clamp(10px, 1.6cqi, 16px);
  border-block-end: 1px solid var(--cv-hair);
  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity calc(var(--cv-speed) * 0.3) ease,
    transform calc(var(--cv-speed) * 0.3) ease;
}

.price {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  min-inline-size: 0;
  font-family: var(--cv-font-display);
  font-size: clamp(28px, 4cqi, 44px);
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  color: var(--cv-gold-light);
  overflow-wrap: anywhere;
}

.duration {
  max-inline-size: 100%;
  font-size: 12px;
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
  color: color-mix(in srgb, var(--cv-cream) 80%, transparent);
  overflow-wrap: anywhere;
}

.inclusions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px clamp(18px, 3.4cqi, 40px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.inclusion {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-inline-size: 0;
  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity calc(var(--cv-speed) * 0.3) ease,
    transform calc(var(--cv-speed) * 0.3) ease;
}

.inclusionNo {
  flex: none;
  font-family: var(--cv-font-display);
  font-size: 12px;
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
  color: var(--cv-gold);
}

.inclusionText {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--cv-lines);
  line-clamp: var(--cv-lines);
  overflow: hidden;
  min-inline-size: 0;
  font-size: 15px;
  line-height: 1.35;
  color: color-mix(in srgb, var(--cv-cream) 90%, transparent);
  overflow-wrap: anywhere;
}

.card[data-open='true'] .priceRow,
.card[data-open='true'] .inclusion {
  opacity: 1;
  transform: none;
  transition:
    opacity calc(var(--cv-speed) * 0.5) ease calc(var(--cv-speed) * 0.34 + var(--i) * 60ms),
    transform calc(var(--cv-speed) * 0.7) var(--cv-ease-out) calc(var(--cv-speed) * 0.34 + var(--i) * 60ms);
}

.bill {
  position: relative;
  flex: none;
  padding-inline: var(--cv-gutter);
  padding-block: 12px clamp(18px, 2.6cqi, 28px);
}

.bill::before {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block: -28px 0;
  z-index: -1;
  pointer-events: none;
  background: linear-gradient(0deg, rgba(13, 8, 12, 0.95) 0%, rgba(13, 8, 12, 0.8) 60%, rgba(13, 8, 12, 0) 100%);
}

.billRule {
  display: block;
  inline-size: 40px;
  block-size: 1px;
  margin-block-end: 12px;
  background: var(--cv-gold);
}

.title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  overflow: hidden;
  margin: 0;
  font-family: var(--cv-font-display);
  font-size: clamp(22px, 3.4cqi, 40px);
  font-weight: 400;
  line-height: 1.12;
  letter-spacing: -0.01em;
  text-wrap: balance;
  overflow-wrap: anywhere;
  color: var(--cv-cream);
}

/* ---------- container sizing ---------- */

@container (max-width: 820px) {
  .card {
    --cv-lines: 1;
    aspect-ratio: 4 / 3;
  }

  .price {
    font-size: clamp(26px, 5cqi, 38px);
  }

  .title {
    font-size: clamp(22px, 4.4cqi, 32px);
  }
}

@container (max-width: 430px) {
  .card {
    --cv-rest: 0.72;
    --cv-gather: 0.11;
    --cv-gutter: clamp(20px, 7cqi, 30px);
    aspect-ratio: 2 / 3;
  }

  .panel {
    padding: 14px;
  }

  .inclusions {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }

  .inclusionText {
    font-size: 14.5px;
  }

  .price {
    font-size: 28px;
  }

  .title {
    -webkit-line-clamp: 3;
    line-clamp: 3;
    font-size: 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card {
    --cv-p: 1 !important;
  }

  .curtainLeft,
  .curtainRight,
  .pull,
  .foldShade,
  .stageDim,
  .stageImg,
  .pullCord {
    transition: none;
  }

  .stageImg {
    transform: scale(1.02);
  }

  .stageDim {
    opacity: 0.86;
  }

  .foldShade {
    opacity: 0.6;
  }

  .panel,
  .priceRow,
  .inclusion {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```
