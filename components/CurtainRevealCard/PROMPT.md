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

// How far (px) the tassel can be pulled down, and how much of it counts as a "pull".
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
  curtainColor = '#6d2342',
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
          <span className={styles.beamLeft} aria-hidden="true" />
          <span className={styles.beamRight} aria-hidden="true" />
          <span className={styles.stageDim} aria-hidden="true" />
        </div>

        <div className={styles.curtainLeft} aria-hidden="true">
          <span className={styles.clothLeft}>
            <span className={styles.grain} />
            <span className={styles.spillLeft} />
            <span className={styles.foldShade} />
          </span>
        </div>

        <div className={styles.curtainRight} aria-hidden="true">
          <span className={styles.clothRight}>
            <span className={styles.grain} />
            <span className={styles.spillRight} />
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
          <span className={styles.tasselSwing}>
            <span className={styles.tasselCord} aria-hidden="true" />
            <span className={styles.tasselCollar} aria-hidden="true" />
            <span className={styles.tasselHead} aria-hidden="true" />
            <span className={styles.tasselNeck} aria-hidden="true" />
            <span className={styles.tasselSkirt} aria-hidden="true" />
          </span>
        </button>

        <div className={styles.valance} aria-hidden="true">
          <span className={styles.valanceCloth}>
            <span className={styles.valanceShade} />
          </span>
          <span className={styles.valanceTrim} />
        </div>
        <span className={styles.railLine} aria-hidden="true" />

        <div className={styles.overlay}>
          <div id={revealId} className={styles.reveal}>
            <div className={styles.priceRow} style={{ '--i': 0 } as CSSProperties}>
              <span className={styles.price}>{price}</span>
              {duration && <span className={styles.duration}>{duration}</span>}
            </div>
            {details.length > 0 && (
              <ul className={styles.inclusions}>
                {details.map((d, i) => (
                  <li key={i} className={styles.inclusion} style={{ '--i': i + 1 } as CSSProperties}>
                    <span className={styles.inclusionDot} aria-hidden="true" />
                    <span className={styles.inclusionText}>{d.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.bill}>
            <span className={styles.billRule} aria-hidden="true" />
            <h3 id={titleId} className={styles.title}>
              {serviceName}
            </h3>
          </div>
        </div>

        <span className={styles.footlights} aria-hidden="true" />
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
  --cv-curtain: #6d2342;
  --cv-curtain-deep: color-mix(in srgb, var(--cv-curtain) 66%, #140710);
  --cv-curtain-mid: color-mix(in srgb, var(--cv-curtain) 86%, #20091a);
  --cv-curtain-ridge: color-mix(in srgb, var(--cv-curtain) 66%, #e8b3c0);
  --cv-wall: #12060b;
  --cv-brass: #c99a4b;
  --cv-brass-deep: #7d5a22;
  --cv-brass-light: #ecc67c;
  --cv-ink: #14060c;
  --cv-cream: #f6e9dc;
  --cv-glow: #ffb168;
  --cv-font-display: 'Fraunces', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
  --cv-font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', system-ui, sans-serif;
  --cv-speed: 650ms;
  --cv-ease: cubic-bezier(0.28, 0.9, 0.3, 1.06);
  --cv-ease-out: cubic-bezier(0.22, 0.9, 0.3, 1);
  --cv-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  display: block;
  box-sizing: border-box;
  inline-size: 100%;
  color: var(--cv-cream);
  font-family: var(--cv-font-ui);
  container-type: inline-size;
}

.root ::selection {
  background: color-mix(in srgb, var(--cv-curtain) 62%, transparent);
  color: var(--cv-cream);
}

/* ---------- the card is the theatre ---------- */

.card {
  /* drape openness: --cv-p 0 = half-drawn hero state, 1 = fully gathered */
  --cv-p: 0;
  --cv-rest: 0.72;
  --cv-gather: 0.15;
  --cv-sx: calc(var(--cv-rest) + (var(--cv-gather) - var(--cv-rest)) * var(--cv-p));
  --cv-tug: 0px;
  --cv-lines: 2;
  --cv-r: clamp(15px, 3.4cqi, 36px);
  --cv-valance: calc(var(--cv-r) * 3.1);
  --cv-gutter: clamp(28px, 9cqi, 96px);
  --cv-foot: 13px;
  --cv-fold: clamp(58px, 10.5cqi, 120px);
  --cv-tw: clamp(40px, 5.4cqi, 62px);
  --cv-pw: max(52px, calc(var(--cv-tw) * 1.5));
  --cv-cord: clamp(64px, 13cqi, 170px);
  --cv-velvet:
    repeating-linear-gradient(
      90deg,
      rgba(8, 2, 6, 0) 0,
      rgba(8, 2, 6, 0) calc(var(--cv-fold) * 0.82),
      rgba(8, 2, 6, 0.5) calc(var(--cv-fold) * 0.95),
      rgba(8, 2, 6, 0) var(--cv-fold)
    ),
    repeating-linear-gradient(
      90deg,
      rgba(255, 205, 220, 0) 0,
      rgba(255, 205, 220, 0.14) calc(var(--cv-fold) * 0.7),
      rgba(255, 205, 220, 0) calc(var(--cv-fold) * 1.37)
    ),
    repeating-linear-gradient(
      90deg,
      var(--cv-curtain-deep) 0,
      var(--cv-curtain-mid) calc(var(--cv-fold) * 0.24),
      var(--cv-curtain-ridge) calc(var(--cv-fold) * 0.48),
      var(--cv-curtain) calc(var(--cv-fold) * 0.7),
      var(--cv-curtain-deep) var(--cv-fold)
    );

  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  inline-size: 100%;
  aspect-ratio: 16 / 10;
  overflow: clip;
  border-radius: clamp(18px, 3cqi, 30px);
  background: var(--cv-wall);
  box-shadow: 0 34px 60px -34px rgba(0, 0, 0, 0.8);
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
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--cv-brass) 38%, transparent),
    inset 0 0 40px rgba(6, 1, 5, 0.45);
}

/* ---------- the stage behind the drapes ---------- */

.stage {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: clip;
  background:
    radial-gradient(70% 90% at 50% 100%, color-mix(in srgb, var(--cv-glow) 50%, #2a0d12), #1a0810 75%);
}

.stage::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  mix-blend-mode: multiply;
  background:
    radial-gradient(60% 80% at 50% 70%, rgba(255, 190, 120, 0.5), rgba(120, 40, 40, 0.9) 100%),
    linear-gradient(180deg, rgba(70, 16, 34, 0.5), transparent 60%);
}

.stageImg {
  position: absolute;
  z-index: 0;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  transform: scale(1.16);
  filter: sepia(0.4) saturate(1.25) contrast(1.12) brightness(0.86);
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
    radial-gradient(50% 70% at 50% 82%, color-mix(in srgb, var(--cv-glow) 70%, transparent), transparent 72%),
    radial-gradient(70% 60% at 50% 20%, color-mix(in srgb, var(--cv-glow) 24%, transparent), transparent 70%),
    #25100f;
}

.stageMonogram {
  font-family: var(--cv-font-display);
  font-size: clamp(120px, 40cqi, 420px);
  font-weight: 600;
  line-height: 1;
  color: color-mix(in srgb, var(--cv-brass-light) 34%, transparent);
}

.stageGlow {
  position: absolute;
  z-index: 2;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: screen;
  background:
    radial-gradient(46% 62% at 50% 104%, color-mix(in srgb, var(--cv-glow) 60%, transparent), transparent 74%),
    radial-gradient(30% 34% at 50% 6%, color-mix(in srgb, var(--cv-brass-light) 20%, transparent), transparent 76%);
}

.beamLeft,
.beamRight {
  position: absolute;
  z-index: 2;
  inset-block: 0;
  inline-size: 34%;
  pointer-events: none;
  mix-blend-mode: screen;
  filter: blur(12px);
  background: linear-gradient(180deg, rgba(255, 226, 180, 0.34), rgba(255, 190, 120, 0.1) 66%, transparent);
  animation: beamBreathe 5.4s ease-in-out infinite alternate;
}

.beamLeft {
  inset-inline-start: 28%;
  clip-path: polygon(40% 0, 60% 0, 100% 100%, 0 100%);
  transform-origin: 50% 0;
  rotate: 7deg;
}

.beamRight {
  inset-inline-start: 38%;
  clip-path: polygon(40% 0, 60% 0, 100% 100%, 0 100%);
  transform-origin: 50% 0;
  rotate: -7deg;
  animation-delay: -2.4s;
}

.stageDim {
  position: absolute;
  z-index: 3;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(90% 100% at 30% 55%, rgba(26, 8, 16, 0.64), rgba(14, 4, 9, 0.9));
  transition: opacity calc(var(--cv-speed) * 0.9) ease;
}

.card[data-open='true'] .stageDim {
  opacity: 0.74;
  transition-delay: calc(var(--cv-speed) * 0.12);
}

/* ---------- velvet drapes ---------- */

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
  filter: drop-shadow(0 0 24px rgba(5, 1, 4, 0.7));
}

.curtainLeft {
  inset-inline-start: 0;
  transform-origin: left center;
}

.curtainRight {
  inset-inline-end: 0;
  transform-origin: right center;
  transition-delay: calc(var(--cv-speed) * 0.07);
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
    linear-gradient(180deg, rgba(8, 2, 6, 0.78) 0%, rgba(8, 2, 6, 0) 26%),
    linear-gradient(0deg, rgba(8, 2, 6, 0.55) 0%, rgba(8, 2, 6, 0) 24%),
    radial-gradient(130% 62% at 50% 40%, rgba(255, 214, 228, 0.17), transparent 72%),
    var(--cv-velvet);
}

/* the inner edge sweeps outward toward the floor, like a drape pulled to the wings */
.clothLeft {
  clip-path: polygon(0 0, 100% 0, 100% 34%, 98.6% 44%, 95.4% 54%, 90% 65%, 83% 77%, 76.5% 89%, 72% 100%, 0 100%);
}

.clothRight {
  clip-path: polygon(100% 0, 0 0, 0 34%, 1.4% 44%, 4.6% 54%, 10% 65%, 17% 77%, 23.5% 89%, 28% 100%, 100% 100%);
}

.grain {
  position: absolute;
  inset: 0;
  background-image: var(--cv-noise);
  opacity: 0.32;
  mix-blend-mode: overlay;
  pointer-events: none;
}

.spillLeft,
.spillRight {
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: screen;
}

.spillLeft {
  background: linear-gradient(270deg, rgba(255, 168, 92, 0.5) 0%, rgba(255, 168, 92, 0.16) 16%, transparent 38%);
}

.spillRight {
  background: linear-gradient(90deg, rgba(255, 168, 92, 0.5) 0%, rgba(255, 168, 92, 0.16) 16%, transparent 38%);
}

.foldShade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(90deg, rgba(8, 2, 6, 0.55), transparent 42%, rgba(8, 2, 6, 0.55));
  opacity: 0;
  transition: opacity var(--cv-speed) ease;
}

.card[data-open='true'] .foldShade {
  opacity: 0.6;
}

/* ---------- the tassel pull ---------- */

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
  transition-delay: calc(var(--cv-speed) * 0.07);
}

.card[data-drag='true'] .pull {
  cursor: grabbing;
  transition: none;
}

.pull:focus-visible {
  outline: 2px solid var(--cv-brass-light);
  outline-offset: 3px;
  border-radius: 14px;
}

.tasselSwing {
  display: flex;
  flex-direction: column;
  align-items: center;
  inline-size: 100%;
  transform-origin: 50% 0;
  filter: drop-shadow(0 8px 7px rgba(4, 1, 3, 0.6));
  animation:
    tasselSway 5.6s ease-in-out infinite alternate,
    tasselInvite 6.4s ease-in-out 1.2s infinite;
}

.card[data-open='true'] .tasselSwing {
  animation:
    tasselSway 5.6s ease-in-out infinite alternate,
    tasselTug calc(var(--cv-speed) * 1.4) ease-out 1;
}

.tasselCord {
  flex: none;
  inline-size: 5px;
  block-size: calc(var(--cv-valance) + var(--cv-cord) + var(--cv-tug));
  border-radius: 3px;
  background:
    repeating-linear-gradient(
      155deg,
      var(--cv-brass-light) 0 2px,
      var(--cv-brass) 2px 3px,
      var(--cv-brass-deep) 3px 5px
    );
  box-shadow: inset 1px 0 0 rgba(255, 244, 214, 0.45), inset -1px 0 0 rgba(60, 32, 6, 0.5);
  transition: block-size calc(var(--cv-speed) * 0.7) cubic-bezier(0.3, 1.7, 0.5, 1);
}

.card[data-drag='true'] .tasselCord {
  transition: none;
}

.tasselCollar {
  flex: none;
  inline-size: calc(var(--cv-tw) * 0.46);
  block-size: calc(var(--cv-tw) * 0.2);
  border-radius: 4px;
  background: linear-gradient(90deg, var(--cv-brass-deep), var(--cv-brass-light) 38%, var(--cv-brass) 62%, var(--cv-brass-deep));
}

.tasselHead {
  flex: none;
  inline-size: calc(var(--cv-tw) * 0.72);
  block-size: calc(var(--cv-tw) * 0.82);
  border-radius: 46% 46% 50% 50% / 40% 40% 60% 60%;
  background:
    linear-gradient(
      180deg,
      transparent 36%,
      rgba(70, 38, 6, 0.42) 38%,
      transparent 43%,
      transparent 57%,
      rgba(70, 38, 6, 0.38) 59%,
      transparent 64%
    ),
    radial-gradient(circle at 34% 26%, #fff6d8 0 5%, var(--cv-brass-light) 24%, var(--cv-brass) 58%, var(--cv-brass-deep) 100%);
  box-shadow:
    inset 0 -3px 6px rgba(60, 30, 4, 0.5),
    0 0 0 0 rgba(236, 198, 124, 0);
  animation: headPing 4.8s ease-out 1.2s infinite;
}

.card[data-open='true'] .tasselHead {
  animation: none;
}

.tasselNeck {
  flex: none;
  inline-size: calc(var(--cv-tw) * 0.4);
  block-size: calc(var(--cv-tw) * 0.2);
  margin-block-start: -1px;
  border-radius: 2px 2px 5px 5px;
  background: linear-gradient(90deg, var(--cv-brass-deep), var(--cv-brass-light) 40%, var(--cv-brass-deep));
}

.tasselSkirt {
  flex: none;
  inline-size: var(--cv-tw);
  block-size: calc(var(--cv-tw) * 1.9);
  margin-block-start: -2px;
  transform-origin: 50% 0;
  clip-path: polygon(
    22% 0,
    78% 0,
    94% 28%,
    100% 100%,
    92% 95%,
    85% 100%,
    77% 96%,
    69% 100%,
    61% 95%,
    54% 100%,
    46% 96%,
    38% 100%,
    30% 95%,
    22% 100%,
    14% 96%,
    7% 100%,
    0 100%,
    6% 28%
  );
  background:
    linear-gradient(180deg, rgba(40, 20, 3, 0.55) 0%, transparent 26%, rgba(255, 242, 206, 0.22) 74%, transparent 100%),
    repeating-linear-gradient(
      90deg,
      var(--cv-brass-light) 0 1.2px,
      var(--cv-brass) 1.2px 2.4px,
      var(--cv-brass-deep) 2.4px 3.5px,
      rgba(60, 30, 4, 0.7) 3.5px 4.2px
    );
  animation: skirtSwing 5.6s ease-in-out -1.4s infinite alternate;
}

/* ---------- valance, rail ---------- */

.valance {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  z-index: 6;
  block-size: var(--cv-valance);
  pointer-events: none;
  filter: drop-shadow(0 7px 8px rgba(5, 1, 4, 0.6));
}

.valanceCloth {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(8, 2, 6, 0.6) 0%, transparent 34%),
    var(--cv-velvet);
  -webkit-mask:
    linear-gradient(#000 0 0) top / 100% calc(100% - var(--cv-r)) no-repeat,
    radial-gradient(var(--cv-r) at 50% 0, #000 97%, transparent 100%) bottom / calc(var(--cv-r) * 2) var(--cv-r) repeat-x;
  mask:
    linear-gradient(#000 0 0) top / 100% calc(100% - var(--cv-r)) no-repeat,
    radial-gradient(var(--cv-r) at 50% 0, #000 97%, transparent 100%) bottom / calc(var(--cv-r) * 2) var(--cv-r) repeat-x;
}

.valanceShade {
  position: absolute;
  inset: 0;
  background-image: var(--cv-noise);
  opacity: 0.3;
  mix-blend-mode: overlay;
}

.valanceTrim {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  block-size: var(--cv-r);
  clip-path: inset(0 0 2px 0);
  background:
    radial-gradient(
        circle var(--cv-r) at 50% 0,
        transparent calc(var(--cv-r) - 6px),
        var(--cv-brass-light) calc(var(--cv-r) - 6px),
        var(--cv-brass) calc(var(--cv-r) - 4px),
        transparent calc(var(--cv-r) - 2.5px)
      )
      bottom / calc(var(--cv-r) * 2) var(--cv-r) repeat-x;
}

.railLine {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  z-index: 7;
  block-size: 5px;
  pointer-events: none;
  background: linear-gradient(180deg, var(--cv-brass-light), var(--cv-brass) 55%, var(--cv-brass-deep));
}

/* ---------- the reveal + playbill ---------- */

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
  gap: clamp(12px, 2.4cqi, 22px);
  padding-inline: var(--cv-gutter) calc(var(--cv-gutter) + 18px);
  overflow: clip;
}

.priceRow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  opacity: 0;
  transform: translateY(18px);
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
  font-size: clamp(30px, 4.4cqi, 50px);
  font-weight: 600;
  line-height: 1.04;
  letter-spacing: -0.015em;
  font-variant-numeric: tabular-nums;
  color: var(--cv-brass-light);
  overflow-wrap: anywhere;
}

.duration {
  display: inline-block;
  max-inline-size: 100%;
  padding: 6px 14px;
  border: 1px solid color-mix(in srgb, var(--cv-cream) 38%, transparent);
  border-radius: 999px;
  font-size: 13.5px;
  line-height: 1.25;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  color: var(--cv-cream);
  overflow-wrap: anywhere;
}

.inclusions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px clamp(18px, 4cqi, 44px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.inclusion {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-inline-size: 0;
  opacity: 0;
  transform: translateY(18px);
  transition:
    opacity calc(var(--cv-speed) * 0.3) ease,
    transform calc(var(--cv-speed) * 0.3) ease;
}

.inclusionDot {
  flex: none;
  inline-size: 7px;
  block-size: 7px;
  margin-block-start: 0.5em;
  rotate: 45deg;
  background: var(--cv-brass);
}

.inclusionText {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--cv-lines);
  line-clamp: var(--cv-lines);
  overflow: hidden;
  min-inline-size: 0;
  font-size: 15.5px;
  line-height: 1.3;
  color: color-mix(in srgb, var(--cv-cream) 92%, transparent);
  overflow-wrap: anywhere;
}

.card[data-open='true'] .priceRow,
.card[data-open='true'] .inclusion {
  opacity: 1;
  transform: none;
  transition:
    opacity calc(var(--cv-speed) * 0.55) ease calc(var(--cv-speed) * 0.34 + var(--i) * 70ms),
    transform calc(var(--cv-speed) * 0.8) var(--cv-ease-out) calc(var(--cv-speed) * 0.34 + var(--i) * 70ms);
}

.bill {
  position: relative;
  flex: none;
  padding-inline: var(--cv-gutter);
  padding-block: 12px calc(var(--cv-foot) + 14px);
}

.bill::before {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block: calc(var(--cv-r) * -1.6) 0;
  z-index: -1;
  pointer-events: none;
  background: linear-gradient(0deg, rgba(14, 4, 9, 0.96) 0%, rgba(14, 4, 9, 0.82) 58%, rgba(14, 4, 9, 0) 100%);
}

.billRule {
  position: relative;
  display: block;
  block-size: 1px;
  margin-block-end: 14px;
  background: linear-gradient(90deg, var(--cv-brass), color-mix(in srgb, var(--cv-brass) 50%, transparent) 46%, transparent);
}

.billRule::before {
  content: '';
  position: absolute;
  inset-block-start: -3px;
  inset-inline-start: 0;
  inline-size: 7px;
  block-size: 7px;
  rotate: 45deg;
  background: var(--cv-brass-light);
}

.title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  overflow: hidden;
  margin: 0;
  font-family: var(--cv-font-display);
  font-size: clamp(23px, 3.7cqi, 44px);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.015em;
  text-wrap: balance;
  overflow-wrap: anywhere;
  color: var(--cv-cream);
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.55);
}

/* ---------- footlights ---------- */

.footlights {
  position: absolute;
  inset-block-end: 0;
  inset-inline: calc(50.5% * var(--cv-sx) * 0.7);
  z-index: 9;
  block-size: var(--cv-foot);
  pointer-events: none;
  opacity: 0.8;
  background:
    radial-gradient(circle 6px at 50% 100%, #fff4d6 0 1.6px, rgba(255, 200, 120, 0.95) 3.4px, transparent 7px) 0 0 / 26px 100% repeat-x,
    linear-gradient(0deg, color-mix(in srgb, var(--cv-glow) 75%, transparent), transparent);
  transition:
    inset-inline var(--cv-speed) var(--cv-ease),
    opacity var(--cv-speed) ease;
}

.card[data-open='true'] .footlights {
  opacity: 1;
}

.card[data-drag='true'] .footlights {
  transition: none;
}

/* ---------- container sizing ---------- */

@container (max-width: 820px) {
  .card {
    --cv-lines: 1;
    aspect-ratio: 4 / 3;
  }

  .price {
    font-size: clamp(28px, 5.4cqi, 42px);
  }

  .title {
    font-size: clamp(23px, 4.6cqi, 34px);
  }
}

@container (max-width: 430px) {
  .card {
    --cv-rest: 0.74;
    --cv-gather: 0.11;
    --cv-gutter: clamp(26px, 9.5cqi, 36px);
    --cv-tw: 38px;
    aspect-ratio: 2 / 3;
  }

  .inclusions {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }

  .inclusionText {
    font-size: 14.5px;
  }

  .price {
    font-size: 30px;
  }

  .title {
    -webkit-line-clamp: 3;
    line-clamp: 3;
    font-size: 23px;
  }
}

.root[data-off='true'] .tasselSwing,
.root[data-off='true'] .tasselHead,
.root[data-off='true'] .tasselSkirt,
.root[data-off='true'] .beamLeft,
.root[data-off='true'] .beamRight {
  animation-play-state: paused;
}

/* ---------- motion ---------- */

@keyframes beamBreathe {
  from {
    opacity: 0.62;
  }
  to {
    opacity: 1;
  }
}

@keyframes tasselSway {
  from {
    rotate: -1.4deg;
  }
  to {
    rotate: 1.6deg;
  }
}

@keyframes skirtSwing {
  from {
    rotate: -3deg;
  }
  to {
    rotate: 3.4deg;
  }
}

/* an occasional tug that says "pull me" */
@keyframes tasselInvite {
  0%,
  72%,
  100% {
    transform: translateY(0);
  }
  80% {
    transform: translateY(14px);
  }
  88% {
    transform: translateY(-3px);
  }
  94% {
    transform: translateY(3px);
  }
}

@keyframes tasselTug {
  0% {
    transform: translateY(0);
  }
  22% {
    transform: translateY(16px);
  }
  50% {
    transform: translateY(-4px);
  }
  76% {
    transform: translateY(2px);
  }
  100% {
    transform: translateY(0);
  }
}

@keyframes headPing {
  0%,
  62%,
  100% {
    box-shadow:
      inset 0 -3px 6px rgba(60, 30, 4, 0.5),
      0 0 0 0 rgba(236, 198, 124, 0);
  }
  66% {
    box-shadow:
      inset 0 -3px 6px rgba(60, 30, 4, 0.5),
      0 0 0 0 rgba(236, 198, 124, 0.6);
  }
  92% {
    box-shadow:
      inset 0 -3px 6px rgba(60, 30, 4, 0.5),
      0 0 0 18px rgba(236, 198, 124, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .card {
    --cv-p: 1 !important;
  }

  .curtainLeft,
  .curtainRight,
  .pull,
  .footlights,
  .foldShade,
  .stageDim,
  .stageImg,
  .tasselCord {
    transition: none;
  }

  .stageImg {
    transform: scale(1.02);
  }

  .stageDim {
    opacity: 0.74;
  }

  .foldShade {
    opacity: 0.6;
  }

  .footlights {
    opacity: 1;
  }

  .priceRow,
  .inclusion {
    opacity: 1;
    transform: none;
    transition: none;
  }

  .tasselSwing,
  .tasselHead,
  .tasselSkirt,
  .beamLeft,
  .beamRight {
    animation: none;
  }

  .tasselSwing {
    rotate: -2deg;
  }
}
```
