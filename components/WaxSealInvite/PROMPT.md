Create a custom element called "Wax Seal Invite". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: card heading, card text, date line, seal initials, seal color, envelope color. Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import styles from './Component.module.css';

export interface WaxSealInviteProps {
  heading?: string;
  text?: string;
  dateLine?: string;
  sealInitials?: string;
  sealColor?: string;
  envelopeColor?: string;
  className?: string;
}

const OVERLAP = 0.3;
const FLAP = 0.6;
const HEADROOM_GAP = 24;

const OPENING = {
  '--ws-o': 1,
  '--ws-flap-z': 2,
  '--ws-d-crack': '0ms',
  '--ws-d-shadow': '100ms',
  '--ws-d-flap': '140ms',
  '--ws-d-flap-z': '440ms',
  '--ws-d-clip': '540ms',
  '--ws-d-card': '540ms',
  '--ws-d-env': '420ms',
  '--ws-t-flap': '620ms',
  '--ws-t-card': '1100ms',
  '--ws-e-card':
    'linear(0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 18.9%, 0.721 25.3%, 0.849 31.5%, 0.937 38.1%, 0.968 41.8%, 0.991 45.7%, 1.006 50.1%, 1.015 55%, 1.017 63.9%, 1.001 85.3%, 1)',
};

const CLOSING = {
  '--ws-o': 0,
  '--ws-flap-z': 6,
  '--ws-d-crack': '980ms',
  '--ws-d-shadow': '940ms',
  '--ws-d-flap': '440ms',
  '--ws-d-flap-z': '720ms',
  '--ws-d-clip': '500ms',
  '--ws-d-card': '0ms',
  '--ws-d-env': '380ms',
  '--ws-t-flap': '560ms',
  '--ws-t-card': '520ms',
  '--ws-e-card': 'cubic-bezier(0.55, 0, 0.3, 1)',
};

const CRUMBS = [0, 1, 2, 3, 4];

function SealFace({ initials, half, glint }: { initials: string; half: string; glint: boolean }) {
  return (
    <span className={`${styles.wax} ${half}`}>
      <span className={styles.stamp}>
        <span className={styles.initials}>{initials}</span>
      </span>
      <span className={styles.gloss} />
      {glint && <span className={styles.glint} />}
      <span className={styles.waxGrain} />
    </span>
  );
}

export default function WaxSealInvite({
  heading = 'Supper at Vale House',
  text = 'Join us for a long-table dinner in the walled garden: six courses from our kitchen, wines from the valley and candlelight until late.',
  dateLine = 'Saturday 14 June · 7 pm',
  sealInitials = 'VH',
  sealColor = '#6d1a24',
  envelopeColor = '#a3b29a',
  className,
}: WaxSealInviteProps) {
  const [open, setOpen] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [seen, setSeen] = useState(false);
  const [moving, setMoving] = useState(false);
  const uid = useId();
  const cardId = `${uid}-card`;

  const rootRef = useRef<HTMLDivElement>(null);
  const envRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

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
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setSeen(true);
        io.disconnect();
      },
      { threshold: 0.35 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const env = envRef.current;
    const card = cardRef.current;
    if (!root || !env || !card) return;
    const measure = () => {
      const envH = env.offsetHeight;
      const cardH = card.offsetHeight;
      const head = Math.max(cardH - envH * OVERLAP, envH * FLAP) + HEADROOM_GAP;
      root.style.setProperty('--ws-env-h', `${envH}px`);
      root.style.setProperty('--ws-head', `${Math.round(head)}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(env);
    ro.observe(card);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (reduced) {
      envRef.current?.animate([{ opacity: 0.15 }, { opacity: 1 }], { duration: 380, easing: 'ease-out' });
      return;
    }
    setMoving(true);
    const t = window.setTimeout(() => setMoving(false), 1800);
    return () => window.clearTimeout(t);
  }, [open, reduced]);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const hover = (on: boolean) => rootRef.current?.style.setProperty('--ws-h', on ? '1' : '0');

  const initials = sealInitials.trim();
  const iniScale = initials.length <= 2 ? 0.34 : initials.length === 3 ? 0.27 : 0.2;
  const glint = seen && !reduced;

  const rootStyle = {
    '--ws-seal': sealColor,
    '--ws-env': envelopeColor,
    '--ws-ini': iniScale,
    '--ws-t-env': moving ? '900ms' : '0ms',
    ...(open ? OPENING : CLOSING),
  } as CSSProperties;

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <span className={styles.grain} aria-hidden="true" />
      <div className={styles.stage}>
        <div
          ref={envRef}
          className={styles.envelope}
          onClick={toggle}
          onPointerEnter={() => hover(true)}
          onPointerLeave={() => hover(false)}
        >
          <span className={styles.ground} aria-hidden="true" />
          <span className={styles.back} aria-hidden="true" />

          <div className={styles.flap} aria-hidden="true">
            <span className={styles.flapOuter} />
            <span className={styles.flapInner} />
            <span className={styles.sealTop}>
              <SealFace initials={initials} half={styles.waxTop} glint={glint} />
            </span>
          </div>

          <div className={styles.sleeve}>
            <article ref={cardRef} id={cardId} className={styles.card} aria-hidden={!open}>
              <span className={styles.cardFrame} aria-hidden="true" />
              <span className={styles.ornament} aria-hidden="true" />
              <h3 className={styles.heading}>{heading}</h3>
              {text && <p className={styles.text}>{text}</p>}
              {dateLine && <p className={styles.date}>{dateLine}</p>}
              <span className={styles.cardTexture} aria-hidden="true" />
            </article>
          </div>

          <span className={styles.pocketLeft} aria-hidden="true" />
          <span className={styles.pocketRight} aria-hidden="true" />
          <span className={styles.pocketBottomWrap} aria-hidden="true">
            <span className={styles.pocketBottom} />
          </span>
          <span className={styles.flapShadowWrap} aria-hidden="true">
            <span className={styles.flapShadow} />
          </span>

          <span className={styles.sealBottom} aria-hidden="true">
            <SealFace initials={initials} half={styles.waxBottom} glint={glint} />
          </span>
          {open && !reduced && (
            <span className={styles.crumbs} aria-hidden="true">
              {CRUMBS.map((i) => (
                <span key={i} className={styles.crumb} style={{ '--i': i } as CSSProperties} />
              ))}
            </span>
          )}

          <button
            type="button"
            className={styles.sealButton}
            aria-expanded={open}
            aria-controls={cardId}
            aria-label={open ? `Close the envelope: ${heading}` : `Break the seal to open: ${heading}`}
          />
        </div>
      </div>
    </div>
  );
}
```

```css
.root {
  --ws-seal: #6d1a24;
  --ws-env: #a3b29a;
  --ws-stage: #f2eee7;
  --ws-card: #fbf8f2;
  --ws-liner: #efe8da;
  --ws-ink: #23271f;
  --ws-muted: rgba(35, 39, 31, 0.68);
  --ws-font-display: 'Cormorant Garamond', 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
  --ws-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --ws-fibre: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='.035 .5' numOctaves='3' seed='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.3  0 0 0 0 0.3  0 0 0 0 0.3  0 0 0 .16 0'/></filter><rect width='100%' height='100%' filter='url(%23f)'/></svg>");
  --ws-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --ws-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --ws-seal-shadow: drop-shadow(0 2px 2px rgba(30, 10, 12, 0.3)) drop-shadow(0 8px 10px rgba(30, 10, 12, 0.16));
  --ws-o: 0;
  --ws-h: 0;

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: 40px 56px;
  padding-inline: 20px;
  border-radius: 28px;
  background:
    radial-gradient(70% 60% at 50% 30%, #fffdf9 0%, transparent 72%),
    linear-gradient(180deg, var(--ws-stage) 0%, color-mix(in srgb, var(--ws-stage) 88%, var(--ws-env)) 100%);
  color: var(--ws-ink);
  font-family: var(--ws-font-ui);
}

.grain {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: var(--ws-noise);
  opacity: 0.16;
  mix-blend-mode: multiply;
}

.stage {
  display: grid;
  justify-items: center;
  padding-block-start: var(--ws-head, 0px);
}

.envelope {
  --ws-w: min(100cqi, 34rem);
  position: relative;
  container-type: inline-size;
  inline-size: var(--ws-w);
  aspect-ratio: 1.56;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transform: translateY(calc(var(--ws-head, 0px) * -0.5 * (1 - var(--ws-o))));
  transition: transform var(--ws-t-env, 0ms) var(--ws-ease) var(--ws-d-env, 0ms);
}

.ground {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  outline: 1px solid rgba(35, 39, 31, 0.07);
  box-shadow:
    0 1px 2px rgba(35, 39, 31, 0.08),
    0 14px 30px -12px rgba(35, 39, 31, 0.28),
    0 40px 60px -40px rgba(35, 39, 31, 0.3);
}

.back {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: 6px;
  background-color: color-mix(in oklab, var(--ws-env) 82%, #1a1f17);
  background-image:
    linear-gradient(180deg, rgba(0, 0, 0, 0.18) 0%, transparent 45%),
    var(--ws-fibre);
}

/* flap */
.flap {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  block-size: 60%;
  z-index: var(--ws-flap-z, 6);
  transform-origin: 50% 0;
  transform-style: preserve-3d;
  transform: perspective(1100px) rotateX(calc(var(--ws-o) * 178deg));
  transition:
    transform var(--ws-t-flap, 600ms) cubic-bezier(0.45, 0.05, 0.2, 1) var(--ws-d-flap, 0ms),
    z-index 0s linear var(--ws-d-flap-z, 0ms);
}

.flapOuter,
.flapInner {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  clip-path: polygon(0 0, 100% 0, 54.5% 95%, 50% 100%, 45.5% 95%);
  border-start-start-radius: 6px;
  border-start-end-radius: 6px;
}

.flapOuter {
  background-color: var(--ws-env);
  background-image:
    linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, transparent 40%, rgba(0, 0, 0, 0.05) 100%),
    var(--ws-fibre);
}

.flapInner {
  transform: rotateX(180deg);
  background-color: color-mix(in oklab, var(--ws-env) 90%, #1a1f17);
  background-image: var(--ws-fibre);
}

.flapInner::before {
  content: '';
  position: absolute;
  inset: 7% 7% 12%;
  clip-path: polygon(0 0, 100% 0, 54.5% 95%, 50% 100%, 45.5% 95%);
  background-color: var(--ws-liner);
  background-image:
    repeating-linear-gradient(90deg, transparent 0 9px, color-mix(in srgb, var(--ws-env) 14%, transparent) 9px 10px),
    var(--ws-fibre);
}

.sealTop {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 100%;
  backface-visibility: hidden;
  transform: translate3d(-50%, -50%, 1px);
  filter: var(--ws-seal-shadow);
}

/* sleeve + card */
.sleeve {
  position: absolute;
  inset-block: 0;
  inset-inline: 6%;
  z-index: 3;
  clip-path: inset(calc(2px - (var(--ws-head, 0px) * 1.2 + 2px) * var(--ws-o)) -40px 0 -40px);
  transition: clip-path 0s linear var(--ws-d-clip, 0ms);
}

.card {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 4%;
  box-sizing: border-box;
  display: grid;
  justify-items: center;
  gap: 12px;
  padding-block: clamp(26px, 8cqi, 44px) calc(var(--ws-env-h, 0px) * 0.26 + clamp(24px, 7cqi, 40px));
  padding-inline: clamp(22px, 8cqi, 52px);
  text-align: center;
  border-radius: 3px;
  background-color: var(--ws-card);
  background-image: linear-gradient(180deg, #fff 0%, transparent 30%);
  box-shadow:
    0 1px 1px rgba(35, 39, 31, 0.06),
    0 18px 36px -22px rgba(35, 39, 31, calc(0.1 + var(--ws-o) * 0.25));
  transform: translateY(calc(var(--ws-env-h, 0px) * -0.66 * var(--ws-o)));
  transition:
    transform var(--ws-t-card, 900ms) var(--ws-e-card, ease) var(--ws-d-card, 0ms),
    box-shadow 600ms ease var(--ws-d-card, 0ms);
}

.cardFrame {
  position: absolute;
  inset: 10px;
  border: 1px solid color-mix(in srgb, var(--ws-ink) 13%, transparent);
  border-radius: 1px;
  pointer-events: none;
}

.ornament {
  inline-size: 7px;
  aspect-ratio: 1;
  margin-block-end: 4px;
  rotate: 45deg;
  background: var(--ws-seal);
}

.heading {
  margin: 0;
  max-inline-size: 22ch;
  font-family: var(--ws-font-display);
  font-size: clamp(24px, 7cqi, 36px);
  font-weight: 500;
  line-height: 1.05;
  letter-spacing: -0.015em;
  text-wrap: balance;
  overflow-wrap: anywhere;
  color: var(--ws-ink);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.9), 0 -0.5px 0 rgba(35, 39, 31, 0.18);
}

.text {
  margin: 0;
  max-inline-size: 38ch;
  font-size: clamp(14px, 3.3cqi, 16px);
  line-height: 1.55;
  color: var(--ws-muted);
  text-wrap: pretty;
  overflow-wrap: anywhere;
}

.date {
  margin: 6px 0 0;
  padding-block-start: 14px;
  border-block-start: 1px solid color-mix(in srgb, var(--ws-ink) 14%, transparent);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
  color: color-mix(in oklab, var(--ws-seal) 88%, var(--ws-ink));
}

.cardTexture {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: var(--ws-noise);
  opacity: 0.12;
  mix-blend-mode: multiply;
}

/* front pocket */
.pocketLeft,
.pocketRight,
.pocketBottomWrap,
.flapShadowWrap {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}

.pocketLeft,
.pocketRight {
  background-color: color-mix(in oklab, var(--ws-env) 95%, #1a1f17);
  background-image: var(--ws-fibre);
}

.pocketLeft {
  clip-path: polygon(0 0, 51% 56%, 0 100%);
  border-end-start-radius: 6px;
  border-start-start-radius: 6px;
}

.pocketRight {
  clip-path: polygon(100% 0, 49% 56%, 100% 100%);
  border-end-end-radius: 6px;
  border-start-end-radius: 6px;
  background-image: linear-gradient(270deg, rgba(0, 0, 0, 0.03), transparent), var(--ws-fibre);
}

.pocketBottomWrap {
  filter: drop-shadow(0 -1px 1.5px rgba(35, 39, 31, 0.16));
}

.pocketBottom {
  position: absolute;
  inset: 0;
  clip-path: polygon(0 100%, 0 99%, 50% 47%, 100% 99%, 100% 100%);
  border-end-start-radius: 6px;
  border-end-end-radius: 6px;
  background-color: color-mix(in oklab, var(--ws-env) 94%, #fff);
  background-image:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 50%),
    var(--ws-fibre);
}

.flapShadowWrap {
  z-index: 5;
  opacity: calc(1 - var(--ws-o));
  filter: blur(5px);
  transition: opacity 260ms ease var(--ws-d-shadow, 0ms);
}

.flapShadow {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  block-size: 63%;
  clip-path: polygon(0 0, 100% 0, 54.5% 95%, 50% 100%, 45.5% 95%);
  background: rgba(23, 28, 20, 0.22);
}

/* seal: the hero material */
.sealBottom {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 60%;
  z-index: 7;
  filter: var(--ws-seal-shadow);
  transform: translate(-50%, calc(-50% + var(--ws-o) * 2px)) rotate(calc(var(--ws-o) * 4deg));
  transition: transform 420ms var(--ws-ease) var(--ws-d-crack, 0ms);
}

.wax {
  --ws-seal-size: clamp(64px, 21cqi, 112px);
  position: relative;
  display: grid;
  place-items: center;
  inline-size: var(--ws-seal-size);
  aspect-ratio: 1;
  border-radius: 49% 51% 47% 53% / 52% 46% 54% 48%;
  background:
    radial-gradient(60% 55% at 34% 28%, color-mix(in oklab, var(--ws-seal) 62%, #fff) 0%, transparent 62%),
    radial-gradient(75% 75% at 50% 50%, var(--ws-seal) 55%, color-mix(in oklab, var(--ws-seal) 62%, #000) 100%);
  box-shadow:
    inset 0 -3px 6px rgba(0, 0, 0, 0.32),
    inset 0 2px 3px rgba(255, 255, 255, 0.22);
  scale: calc(1 + var(--ws-h) * 0.035 * (1 - var(--ws-o)));
  transition: scale 380ms var(--ws-ease);
}

.waxTop {
  clip-path: polygon(-10% -10%, 110% -10%, 110% 51%, 86% 46%, 72% 55%, 58% 45%, 44% 54%, 30% 46%, 16% 53%, -10% 47%);
}

.waxBottom {
  clip-path: polygon(-10% 47%, 16% 53%, 30% 46%, 44% 54%, 58% 45%, 72% 55%, 86% 46%, 110% 51%, 110% 110%, -10% 110%);
}

.stamp {
  display: grid;
  place-items: center;
  inline-size: 72%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(70% 70% at 60% 70%, color-mix(in oklab, var(--ws-seal) 82%, #fff) 0%, var(--ws-seal) 55%, color-mix(in oklab, var(--ws-seal) 78%, #000) 100%);
  box-shadow:
    inset 0 3px 5px rgba(0, 0, 0, 0.42),
    inset 0 -2px 2px rgba(255, 255, 255, 0.2),
    0 1px 0 rgba(255, 255, 255, 0.18);
  outline: 1px solid color-mix(in oklab, var(--ws-seal) 70%, #000);
  outline-offset: -6px;
}

.initials {
  font-family: var(--ws-font-display);
  font-size: calc(var(--ws-seal-size) * var(--ws-ini));
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.02em;
  white-space: nowrap;
  color: color-mix(in oklab, var(--ws-seal) 88%, #000);
  text-shadow:
    -1px -1px 0 rgba(0, 0, 0, 0.35),
    1px 1px 0 color-mix(in oklab, var(--ws-seal) 55%, #fff);
}

.gloss {
  position: absolute;
  inset-block-start: 9%;
  inset-inline-start: 16%;
  inline-size: 34%;
  block-size: 20%;
  border-radius: 50%;
  rotate: -28deg;
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.55), transparent);
  filter: blur(1px);
  pointer-events: none;
}

.glint {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.45) 48%, transparent 60%);
  background-size: 300% 100%;
  background-position: 120% 0;
  mix-blend-mode: soft-light;
  animation: glint 1600ms var(--ws-ease) 500ms 1 both;
}

@keyframes glint {
  from {
    background-position: 120% 0;
  }
  to {
    background-position: -20% 0;
  }
}

.waxGrain {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background-image: var(--ws-noise);
  opacity: 0.28;
  mix-blend-mode: overlay;
}

.crumbs {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 60%;
  z-index: 8;
  pointer-events: none;
}

.crumb {
  position: absolute;
  inline-size: 5px;
  block-size: 4px;
  border-radius: 40% 60% 50% 45%;
  background: color-mix(in oklab, var(--ws-seal) 85%, #000);
  opacity: 0;
  animation: crumb 760ms cubic-bezier(0.2, 0.7, 0.3, 1) calc(var(--i) * 24ms) 1 both;
}

@keyframes crumb {
  0% {
    opacity: 1;
    transform: translate(0, 0) rotate(0);
  }
  100% {
    opacity: 0;
    transform: translate(calc((var(--i) - 2) * 16px), calc(26px + var(--i) * 5px)) rotate(calc(var(--i) * 70deg));
  }
}

.sealButton {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 60%;
  z-index: 9;
  inline-size: clamp(64px, 21cqi, 112px);
  aspect-ratio: 1;
  min-inline-size: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  translate: -50% -50%;
}

.sealButton:focus-visible {
  outline: 2px solid var(--ws-ink);
  outline-offset: 5px;
}

@media (prefers-reduced-motion: reduce) {
  .envelope,
  .flap,
  .sleeve,
  .card,
  .flapShadowWrap,
  .sealBottom,
  .wax {
    transition-duration: 0s;
    transition-delay: 0s;
  }
}
```
