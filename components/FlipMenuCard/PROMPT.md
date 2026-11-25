Create a custom element called "Flip Menu Card". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: photo, dish name, price, back-side details (ingredients, allergens, tasting note), dietary tags, item number. Add other settings if they help.

```tsx
import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface FlipMenuCardProps {
  photo?: string;
  dishName?: string;
  price?: string;
  tags?: string[];
  itemNumber?: string;
  ingredients?: string[];
  allergens?: string[];
  tastingNote?: string;
  ingredientsLabel?: string;
  allergensLabel?: string;
  noteLabel?: string;
  className?: string;
}

const DEFAULT_PHOTO =
  'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=900&h=900&q=80&auto=format&fit=crop';

const DEFAULT_INGREDIENTS = [
  'Bucatini',
  'Guanciale',
  'San Marzano tomatoes',
  'Pecorino Romano',
  'Dried chilli',
  'Extra-virgin olive oil',
];

/* A hand-torn edge: deterministic (SSR-safe), so server and client agree. Outer = the fibrous rim,
   inner = the paper itself, a hair shorter, so a pale torn-fibre rim shows along the bottom. */
function buildTear() {
  let s = 7;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const outer: string[] = [];
  const inner: string[] = [];
  for (let i = 0; i <= 64; i += 1) {
    const px = 100 - (i * 100) / 64;
    const slope = 1.1 + (1 - px / 100) * 1.7; // torn on a slight diagonal
    const wobble = Math.sin(px * 0.21) * 0.55 + Math.sin(px * 0.071 + 1) * 0.5;
    const y = slope + wobble + rnd() * 1.15;
    outer.push(`${px.toFixed(2)}% calc(100% - ${y.toFixed(2)}cqw)`);
    inner.push(`${px.toFixed(2)}% calc(100% - ${(y + 0.35 + rnd() * 1.05).toFixed(2)}cqw)`);
  }
  const head = '0 0, 100% 0, 100% calc(100% - 11.5cqw), calc(100% - 9cqw) calc(100% - 2.6cqw)';
  const innerHead = '0 0, 100% 0, 100% calc(100% - 12.2cqw), calc(100% - 9.6cqw) calc(100% - 3.4cqw)';
  return {
    out: `polygon(${head}, ${outer.slice(6).join(', ')})`,
    inn: `polygon(${innerHead}, ${inner.slice(6).join(', ')})`,
  };
}

const TEAR = buildTear();

const WORD_TILT = [-1.3, 0.9, -0.5, 1.2, -1.0, 0.6, -0.8];
const WORD_LIFT = [0.02, -0.035, 0.03, -0.015, 0.035, -0.03, 0.01];

/* Split a name into handwritten "words": whitespace and hyphens are the only places a line may break. */
function splitName(name: string) {
  const out: { text: string; gap: boolean }[] = [];
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .forEach((word, wi, all) => {
      const parts = word.match(/[^-–—]+[-–—]?|[-–—]+/g) ?? [word];
      parts.forEach((p, pi) => out.push({ text: p, gap: pi === parts.length - 1 && wi < all.length - 1 }));
    });
  return out;
}

export default function FlipMenuCard({
  photo = DEFAULT_PHOTO,
  dishName = "Rigatoni all'Amatriciana",
  price = '€18',
  tags = ['Spicy'],
  itemNumber = '12',
  ingredients = DEFAULT_INGREDIENTS,
  allergens = ['Gluten', 'Dairy'],
  tastingNote = 'The chilli is a whisper, not a shout. Ask for extra pecorino if you like it bold — Nonna always did.',
  ingredientsLabel = 'Ingredients',
  allergensLabel = 'Allergens',
  noteLabel = "Chef's note",
  className,
}: FlipMenuCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [photoFailed, setPhotoFailed] = useState(false);

  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const inkId = `fm-ink-${uid}`;
  const greaseId = `fm-grease-${uid}`;
  const penId = `fm-pen-${uid}`;

  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const rootRef = useRef<HTMLElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const flipTimer = useRef<number | undefined>(undefined);
  const press = useRef({ x: 0, y: 0, moved: false });

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
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.1 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => () => window.clearTimeout(flipTimer.current), []);

  useEffect(() => {
    setPhotoFailed(false);
  }, [photo]);

  const toggleFlip = useCallback(() => {
    setFlipped((f) => !f);
    if (reducedRef.current) return;
    setFlipping(true);
    window.clearTimeout(flipTimer.current);
    flipTimer.current = window.setTimeout(() => setFlipping(false), 980);
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    press.current = { x: e.clientX, y: e.clientY, moved: false };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 10) press.current.moved = true;
    if (e.pointerType !== 'mouse' || reducedRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const tx = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1) - 0.5;
    const ty = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1) - 0.5;
    const tilt = tiltRef.current;
    if (tilt) {
      tilt.style.setProperty('--fm-tx', tx.toFixed(3));
      tilt.style.setProperty('--fm-ty', ty.toFixed(3));
      tilt.style.setProperty('--fm-mx', `${((tx + 0.5) * 100).toFixed(1)}%`);
      tilt.style.setProperty('--fm-my', `${((ty + 0.5) * 100).toFixed(1)}%`);
    }
  };

  const onPointerLeave = () => {
    const tilt = tiltRef.current;
    if (tilt) {
      tilt.style.setProperty('--fm-tx', '0');
      tilt.style.setProperty('--fm-ty', '0');
    }
  };

  const onKeyFlip = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    toggleFlip();
  };

  const onClickFlip = () => {
    if (press.current.moved) return;
    toggleFlip();
  };

  const rootClasses = [styles.root, className].filter(Boolean).join(' ');
  const showPhoto = Boolean(photo) && !photoFailed;
  const monogram = (Array.from(dishName.trim())[0] ?? '·').toUpperCase();

  // Fit the handwriting to the slip so no word ever has to break mid-word.
  const nameWords = splitName(dishName);
  const longest = Math.max(1, ...dishName.split(/[\s\-–—]+/).map((w) => w.length));
  const total = dishName.trim().length;
  const cap = total > 46 ? 7.6 : total > 30 ? 10 : 14;
  const fit = Math.max(3.4, Math.min(cap, 79 / (longest * 0.44)));

  const priceSize = price.length > 8 ? 5.2 : price.length > 5 ? 6.8 : 9.4;

  const rootStyle = { '--fm-tear-out': TEAR.out, '--fm-tear-in': TEAR.inn } as CSSProperties;

  return (
    <section
      ref={rootRef}
      className={rootClasses}
      style={rootStyle}
      data-flipped={flipped}
      data-flipping={flipping}
      data-crossfade={reduced}
      data-inview={inView}
    >
      <svg className={styles.defs} width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          {/* rubber-stamp ink: rough edge + speckled, uneven pressure */}
          <filter id={inkId} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  7 0 0 0 -1.7" result="speck" />
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="9" result="w" />
            <feDisplacementMap in="SourceGraphic" in2="w" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="d" />
            <feComposite in="d" in2="speck" operator="in" />
          </filter>
          {/* grease: irregular soaked-in edge */}
          <filter id={greaseId} x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="3" seed="3" result="w" />
            <feDisplacementMap in="SourceGraphic" in2="w" scale="34" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="0.8" />
          </filter>
          {/* ballpoint wobble */}
          <filter id={penId} x="-5%" y="-10%" width="110%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="2" result="w" />
            <feDisplacementMap in="SourceGraphic" in2="w" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <span className={styles.cloth} aria-hidden="true" />
      <span className={styles.coffee} aria-hidden="true" />
      <span className={styles.pencil} aria-hidden="true" />
      <span className={`${styles.basil} ${styles.basilA}`} aria-hidden="true" />
      <span className={`${styles.basil} ${styles.basilB}`} aria-hidden="true" />
      <span className={`${styles.basil} ${styles.basilC}`} aria-hidden="true" />
      <span className={styles.pool} aria-hidden="true" />

      <div
        ref={tiltRef}
        className={styles.tilt}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={`${dishName} menu card. Press to flip for ingredients, allergens and a tasting note.`}
        onClick={onClickFlip}
        onKeyDown={onKeyFlip}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <div className={styles.stack}>
          <span className={styles.shadow} aria-hidden="true" />
          <span className={styles.cast} aria-hidden="true" />
          <span className={`${styles.pad} ${styles.padKraft}`} aria-hidden="true" />
          <span className={`${styles.pad} ${styles.padCanary}`} aria-hidden="true" />
          <span className={`${styles.pad} ${styles.padPink}`} aria-hidden="true" />

          <div className={styles.liftInner}>
            <div className={styles.flipper}>
              {/* ───────── FRONT ───────── */}
              <div className={`${styles.face} ${styles.faceFront}`} aria-hidden={flipped}>
                <div className={styles.paper}>
                  <span className={styles.ruled} aria-hidden="true" />
                  <span className={`${styles.grease} ${styles.greaseA}`} style={{ filter: `url(#${greaseId})` }} aria-hidden="true" />
                  <span className={`${styles.grease} ${styles.greaseB}`} style={{ filter: `url(#${greaseId})` }} aria-hidden="true" />
                  <span className={`${styles.grease} ${styles.greaseC}`} style={{ filter: `url(#${greaseId})` }} aria-hidden="true" />
                  <span className={styles.crease} aria-hidden="true" />

                  <div className={styles.frontInner}>
                    <figure className={styles.polaroid}>
                      <span className={styles.tape} aria-hidden="true" />
                      <div className={styles.print}>
                        {showPhoto ? (
                          <img
                            className={styles.heroImg}
                            src={photo}
                            alt={`${dishName}, plated`}
                            draggable={false}
                            loading="lazy"
                            onError={() => setPhotoFailed(true)}
                          />
                        ) : (
                          <span className={styles.fallback} aria-hidden="true">
                            <span className={styles.fbPlate}>
                              <span className={styles.fbMono}>{monogram}</span>
                            </span>
                          </span>
                        )}
                        <span className={styles.printShade} aria-hidden="true" />
                      </div>

                      {tags.length > 0 ? (
                        <ul className={styles.tags}>
                          {tags.map((tag, i) => (
                            <li key={i} className={styles.tag}>
                              {tag}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className={styles.blank} aria-hidden="true" />
                      )}

                      {price && (
                        <span className={styles.sticker}>
                          <span className={styles.stickerText} style={{ '--fm-price': priceSize } as CSSProperties}>
                            {price}
                          </span>
                          <span className={styles.peel} aria-hidden="true" />
                        </span>
                      )}
                    </figure>

                    <h3 className={styles.name} style={{ '--fm-name': fit.toFixed(2), filter: `url(#${penId})` } as CSSProperties}>
                      {nameWords.map((w, i) => (
                        <Fragment key={i}>
                        <span
                          className={styles.word}
                          style={
                            {
                              '--r': `${WORD_TILT[i % WORD_TILT.length]}deg`,
                              '--y': `${WORD_LIFT[i % WORD_LIFT.length]}em`,
                            } as CSSProperties
                          }
                        >
                          {w.text}
                        </span>
                        {w.gap ? ' ' : null}
                        </Fragment>
                      ))}
                    </h3>
                    <svg className={styles.scribble} viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true">
                      <path
                        className={styles.scribblePath}
                        d="M3 9 C 30 3, 52 12, 84 7 S 140 4, 168 8 S 190 6, 197 5"
                        fill="none"
                        strokeLinecap="round"
                        pathLength={1}
                      />
                      <path
                        className={`${styles.scribblePath} ${styles.scribbleB}`}
                        d="M22 12 C 60 9, 96 12, 134 10"
                        fill="none"
                        strokeLinecap="round"
                        pathLength={1}
                      />
                    </svg>
                  </div>

                  {itemNumber && (
                    <span className={styles.stamp} style={{ filter: `url(#${inkId})` }}>
                      <span className={styles.stampNo}>Nº</span>
                      <span className={styles.stampNum}>{itemNumber}</span>
                    </span>
                  )}
                </div>
                <span className={`${styles.flap} ${styles.flapFront}`} aria-hidden="true" />
                <span className={styles.sheen} aria-hidden="true" />
              </div>

              {/* ───────── BACK ───────── */}
              <div className={`${styles.face} ${styles.faceBack}`} aria-hidden={!flipped}>
                <div className={`${styles.paper} ${styles.paperBack}`}>
                  <span className={styles.ruled} aria-hidden="true" />
                  <span className={`${styles.grease} ${styles.greaseD}`} style={{ filter: `url(#${greaseId})` }} aria-hidden="true" />

                  <div className={styles.backInner}>
                    <div className={styles.backMain}>
                      <p
                        className={styles.backTitle}
                        style={{ '--fm-name': fit.toFixed(2), filter: `url(#${penId})` } as CSSProperties}
                      >
                        {dishName}
                      </p>

                      {ingredients.length > 0 && (
                        <section className={styles.rise} style={{ '--d': '0.34s' } as CSSProperties}>
                          <h4 className={styles.sectionLabel}>{ingredientsLabel}</h4>
                          <ul className={styles.ingredientList} style={{ filter: `url(#${penId})` }}>
                            {ingredients.map((item, i) => (
                              <li key={i} className={styles.ingredient}>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}

                      {allergens.length > 0 && (
                        <section className={styles.rise} style={{ '--d': '0.44s' } as CSSProperties}>
                          <h4 className={styles.sectionLabel}>{allergensLabel}</h4>
                          <ul className={styles.allergens}>
                            {allergens.map((item, i) => (
                              <li
                                key={i}
                                className={styles.allergen}
                                style={{ '--i': i, '--r': i % 2 ? '1.4deg' : '-1.6deg' } as CSSProperties}
                              >
                                <svg className={styles.allergenRing} viewBox="0 0 60 30" preserveAspectRatio="none" aria-hidden="true">
                                  <ellipse cx="30" cy="15" rx="28" ry="12.6" vectorEffect="non-scaling-stroke" />
                                </svg>
                                <span className={styles.allergenText}>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                    </div>

                    {tastingNote && (
                      <section className={`${styles.noteStrip} ${styles.rise}`} style={{ '--d': '0.56s' } as CSSProperties}>
                        <span className={styles.noteTape} aria-hidden="true" />
                        <h4 className={styles.noteLabel}>{noteLabel}</h4>
                        <p className={styles.note}>{tastingNote}</p>
                      </section>
                    )}
                  </div>
                </div>
                <span className={`${styles.flap} ${styles.flapBack}`} aria-hidden="true" />
                <span className={styles.sheen} aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

```css
/* ───────── stage: a tomato-red gingham tablecloth, seen from above ───────── */

.root {
  --fm-red: #c23a1e;
  --fm-red-deep: #8f2610;
  --fm-red-a: #cf4626;
  --fm-red-b: #a02a12;
  --fm-paper: #fbf5e4;
  --fm-paper-hi: #fffcef;
  --fm-paper-shade: #eadcb8;
  --fm-rim: #fffef8;
  --fm-ink: #2a1c14;
  --fm-cloth: #fbf1db;
  --fm-hand: 'Caveat', 'Segoe Script', cursive;
  --fm-display: 'Oswald', 'Arial Narrow', Impact, sans-serif;
  --fm-ui: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --fm-ease: cubic-bezier(0.3, 1.22, 0.42, 1);
  --fm-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.32  0 0 0 0 0.22  0 0 0 0 0.1  0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --fm-cell: clamp(30px, 4.6cqw, 54px);

  position: relative;
  isolation: isolate;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  display: grid;
  justify-items: center;
  padding: clamp(30px, 5.4cqw, 64px) clamp(14px, 4cqw, 40px) clamp(38px, 6cqw, 72px);
  border-radius: 24px;
  overflow: clip;
  background: var(--fm-cloth);
  color: var(--fm-ink);
  font-family: var(--fm-ui);
  font-weight: 500;
}

.root::selection {
  background: var(--fm-red);
  color: var(--fm-paper);
}

.defs {
  position: absolute;
  inline-size: 0;
  block-size: 0;
  overflow: hidden;
  pointer-events: none;
}

.cloth {
  position: absolute;
  inset: 0;
  z-index: -3;
  background-image:
    repeating-linear-gradient(
      90deg,
      rgba(200, 60, 32, 0.52) 0,
      rgba(200, 60, 32, 0.52) calc(var(--fm-cell) / 2),
      transparent calc(var(--fm-cell) / 2),
      transparent var(--fm-cell)
    ),
    repeating-linear-gradient(
      0deg,
      rgba(200, 60, 32, 0.52) 0,
      rgba(200, 60, 32, 0.52) calc(var(--fm-cell) / 2),
      transparent calc(var(--fm-cell) / 2),
      transparent var(--fm-cell)
    );
  background-position: 50% 0;
}

/* woven threads + vignette */
.cloth::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    repeating-linear-gradient(45deg, rgba(60, 20, 8, 0.07) 0 1px, transparent 1px 3px),
    repeating-linear-gradient(-45deg, rgba(255, 250, 235, 0.16) 0 1px, transparent 1px 3px),
    var(--fm-noise);
  mix-blend-mode: multiply;
  opacity: 0.8;
}

.cloth::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 95% at 50% 46%, transparent 40%, rgba(74, 20, 6, 0.5) 100%);
}

.pool {
  position: absolute;
  inset: 0;
  z-index: -2;
  background: radial-gradient(48% 54% at 50% 46%, rgba(255, 246, 214, 0.62), rgba(255, 246, 214, 0) 72%);
  pointer-events: none;
}

.coffee {
  position: absolute;
  inset-inline-start: 5.5cqw;
  inset-block-end: 9%;
  inline-size: clamp(110px, 16cqw, 190px);
  aspect-ratio: 1;
  z-index: -2;
  border-radius: 50%;
  background: radial-gradient(
    circle closest-side,
    rgba(96, 52, 20, 0.05) 0,
    rgba(96, 52, 20, 0.04) 60%,
    rgba(96, 52, 20, 0.34) 77%,
    rgba(96, 52, 20, 0.12) 84%,
    transparent 92%
  );
  mix-blend-mode: multiply;
  transform: rotate(18deg) scaleY(0.96);
  pointer-events: none;
}

.pencil {
  position: absolute;
  inset-inline-end: 3.2cqw;
  inset-block-end: 17%;
  z-index: -1;
  inline-size: clamp(230px, 31cqw, 400px);
  block-size: clamp(15px, 2.1cqw, 26px);
  transform: rotate(-19deg);
  clip-path: polygon(0 50%, 3% 40%, 21% 0, 96% 0, 100% 14%, 100% 86%, 96% 100%, 21% 100%, 3% 60%);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0, rgba(255, 255, 255, 0) 26%, rgba(0, 0, 0, 0) 58%, rgba(40, 20, 0, 0.36) 100%),
    linear-gradient(
      90deg,
      #2f2a26 0 3%,
      #d9b68a 3% 21%,
      #f0b323 21% 82%,
      #c3c6cc 82% 83.2%,
      #9da1a8 83.2% 84.4%,
      #c3c6cc 84.4% 85.6%,
      #9da1a8 85.6% 86.8%,
      #c3c6cc 86.8% 90%,
      #e58a94 90% 100%
    );
  filter: drop-shadow(0 1cqw 0.9cqw rgba(60, 18, 6, 0.38));
  pointer-events: none;
}

.basil {
  position: absolute;
  z-index: -1;
  inline-size: clamp(70px, 11cqw, 136px);
  aspect-ratio: 1;
  border-radius: 0 100% 0 100%;
  background:
    linear-gradient(45deg, transparent 48.8%, rgba(226, 244, 190, 0.55) 49.4%, rgba(226, 244, 190, 0.55) 50.6%, transparent 51.2%),
    repeating-linear-gradient(45deg, transparent 0 9%, rgba(20, 64, 20, 0.16) 9% 9.8%, transparent 9.8% 18%),
    radial-gradient(90% 90% at 30% 28%, #6fae4a 0%, #3f8a34 55%, #2a6a26 100%);
  filter: drop-shadow(0.5cqw 1cqw 0.8cqw rgba(50, 16, 4, 0.42));
  pointer-events: none;
}

.basilA {
  inset-inline-end: 6cqw;
  inset-block-start: 9%;
  transform: rotate(8deg);
}

.basilB {
  inset-inline-end: 14.5cqw;
  inset-block-start: 15%;
  inline-size: clamp(54px, 8.4cqw, 104px);
  transform: rotate(-48deg);
  filter: drop-shadow(0.5cqw 1cqw 0.8cqw rgba(50, 16, 4, 0.42)) saturate(0.92) brightness(1.06);
}

.basilC {
  inset-inline-start: 5cqw;
  inset-block-start: 8%;
  inline-size: clamp(60px, 9cqw, 112px);
  transform: rotate(-70deg);
}

/* ───────── the slip on the counter ───────── */

.tilt {
  --fm-tx: 0;
  --fm-ty: 0;
  --fm-mx: 50%;
  --fm-my: 28%;

  position: relative;
  container-type: inline-size;
  inline-size: min(100%, 490px);
  perspective: 1800px;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  border-radius: 1.4cqw;
}

.tilt:focus-visible {
  outline: 2px solid var(--fm-paper-hi);
  outline-offset: 10px;
}

.stack {
  position: relative;
  transform: rotate(var(--fm-slant, -2.2deg)) rotateX(calc(var(--fm-ty) * -2.6deg)) rotateY(calc(var(--fm-tx) * 3.4deg));
  transition: transform 320ms ease-out;
}

.shadow {
  position: absolute;
  inset-inline: 4%;
  inset-block-end: -2.2cqw;
  block-size: 7cqw;
  border-radius: 50%;
  background: rgba(58, 14, 4, 0.6);
  filter: blur(2.2cqw);
  pointer-events: none;
}

.cast {
  position: absolute;
  inset: 4cqw -0.6cqw -3cqw 1.8cqw;
  border-radius: 1.2cqw;
  background: rgba(58, 14, 4, 0.34);
  filter: blur(2.6cqw);
  pointer-events: none;
}

/* the order pad under the slip: triplicate copies + chipboard */

.pad {
  position: absolute;
  inset: 0;
  border-radius: 0.5cqw;
  pointer-events: none;
}

.padPink {
  inset: 0 0 5.5cqw;
  background: linear-gradient(180deg, #f7cdbd, #f1b7a4);
  box-shadow: 0 0.25cqw 0.5cqw rgba(60, 20, 8, 0.28);
  transform: translate(0.9cqw, 1.5cqw) rotate(0.9deg);
}

.padCanary {
  inset: 0 0 5.5cqw;
  background: linear-gradient(180deg, #f6e8a6, #ecd780);
  box-shadow: 0 0.25cqw 0.5cqw rgba(60, 20, 8, 0.28);
  transform: translate(-0.8cqw, 2.5cqw) rotate(-1.3deg);
}

.padKraft {
  inset: -0.6cqw -1.4cqw -4.6cqw;
  background:
    var(--fm-noise),
    linear-gradient(180deg, #bd9565, #a37a4f);
  box-shadow: 0 0.3cqw 0.6cqw rgba(60, 20, 8, 0.4);
  transform: translate(0.4cqw, 1cqw) rotate(0.5deg);
  border-radius: 0.8cqw;
}

.liftInner {
  position: relative;
  perspective: 1500px;
  transform-style: preserve-3d;
}

.flipper {
  display: grid;
  min-block-size: 136cqw;
  transform-style: preserve-3d;
  transform-origin: 50% 54%;
  transition: transform 900ms var(--fm-ease);
}

/* ───────── a sheet of paper (both sides share this) ───────── */

.face {
  grid-area: 1 / 1;
  position: relative;
  display: grid;
  background: var(--fm-rim);
  clip-path: var(--fm-tear-out);
  -webkit-mask: radial-gradient(circle 1.75cqw at 50% 0, transparent 97%, #000 100%) 50% 0 / 6.4cqw 100% repeat-x;
  mask: radial-gradient(circle 1.75cqw at 50% 0, transparent 97%, #000 100%) 50% 0 / 6.4cqw 100% repeat-x;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.paper {
  grid-area: 1 / 1;
  position: relative;
  min-block-size: 0;
  overflow: clip;
  clip-path: var(--fm-tear-in);
  background:
    radial-gradient(130% 90% at 50% 42%, transparent 58%, rgba(166, 118, 52, 0.17) 100%),
    linear-gradient(176deg, var(--fm-paper-hi) 0%, var(--fm-paper) 48%, var(--fm-paper-shade) 100%);
}

.paper::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--fm-noise);
  opacity: 0.3;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.faceFront {
  z-index: 1;
}

.faceBack {
  transform: rotateY(180deg);
  contain: size;
  grid-template-rows: minmax(0, 1fr);
  color: var(--fm-paper);
}

.paperBack {
  background:
    radial-gradient(120% 60% at 18% 0%, rgba(255, 170, 125, 0.34), transparent 62%),
    radial-gradient(130% 90% at 50% 42%, transparent 55%, rgba(60, 10, 0, 0.3) 100%),
    linear-gradient(172deg, var(--fm-red-a) 0%, var(--fm-red-b) 100%);
}

.paperBack::after {
  opacity: 0.24;
}

[data-flipped='true'] .flipper {
  transform: rotateY(180deg);
}

[data-inview='false'] .stack {
  transition: none;
}

/* ruled order-pad lines + a margin rule */

.ruled {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(90deg, transparent 4cqw, rgba(194, 58, 30, 0.3) 4cqw, rgba(194, 58, 30, 0.3) 4.35cqw, transparent 4.35cqw),
    repeating-linear-gradient(180deg, transparent 0, transparent calc(7.4cqw - 1px), rgba(194, 58, 30, 0.14) calc(7.4cqw - 1px), rgba(194, 58, 30, 0.14) 7.4cqw);
  background-position:
    0 0,
    0 3.2cqw;
  pointer-events: none;
}

.paperBack .ruled {
  background-image:
    linear-gradient(90deg, transparent 4cqw, rgba(255, 226, 200, 0.26) 4cqw, rgba(255, 226, 200, 0.26) 4.35cqw, transparent 4.35cqw),
    repeating-linear-gradient(180deg, transparent 0, transparent calc(7.4cqw - 1px), rgba(255, 226, 200, 0.12) calc(7.4cqw - 1px), rgba(255, 226, 200, 0.12) 7.4cqw);
}

/* grease: soaked-in, translucent, lit from within */

.grease {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(
    closest-side,
    rgba(190, 126, 28, 0.3) 0,
    rgba(190, 126, 28, 0.27) 50%,
    rgba(150, 92, 20, 0.38) 68%,
    rgba(190, 126, 28, 0.1) 84%,
    transparent 100%
  );
  mix-blend-mode: multiply;
  pointer-events: none;
}

.greaseA {
  inset-inline-start: -9cqw;
  inset-block-end: 2cqw;
  inline-size: 40cqw;
  block-size: 27cqw;
  transform: rotate(-14deg);
}

.greaseB {
  inset-inline-end: -10cqw;
  inset-block-start: 40cqw;
  inline-size: 31cqw;
  block-size: 22cqw;
  transform: rotate(24deg);
  opacity: 0.85;
}

.greaseC {
  inset-inline-start: 55cqw;
  inset-block-end: 6cqw;
  inline-size: 11cqw;
  block-size: 8cqw;
  opacity: 0.9;
}

.greaseD {
  inset-inline-end: -8cqw;
  inset-block-end: 30cqw;
  inline-size: 34cqw;
  block-size: 24cqw;
  transform: rotate(-18deg);
  mix-blend-mode: multiply;
  opacity: 0.8;
}

/* a fold line across the slip */

.crease {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 88cqw;
  block-size: 0.9cqw;
  background: linear-gradient(180deg, transparent 0, rgba(90, 56, 20, 0.12) 46%, rgba(255, 255, 255, 0.6) 56%, transparent 100%);
  transform: rotate(-0.7deg);
  pointer-events: none;
}

/* dog-ear: the corner folded over, showing the other side of the paper */

.flap {
  position: absolute;
  inset-inline-end: 0;
  inset-block-end: 2.6cqw;
  inline-size: 9cqw;
  block-size: 9cqw;
  z-index: 3;
  filter: drop-shadow(-0.35cqw -0.35cqw 0.45cqw rgba(50, 20, 6, 0.38));
  pointer-events: none;
  transition: transform 260ms ease-out;
  transform-origin: 100% 100%;
}

.flap::before {
  content: '';
  position: absolute;
  inset: 0;
  clip-path: polygon(0 0, 100% 0, 0 100%);
}

.flapFront::before {
  background: linear-gradient(135deg, #d9502f 0%, #b23218 62%, #8c2410 100%);
}

.flapBack::before {
  background: linear-gradient(135deg, #fffdf2 0%, #f1e6c8 64%, #d8c79c 100%);
}

.tilt:hover .flap {
  transform: scale(1.1);
}

/* light that follows the pointer, and sweeps across when the slip turns */

.sheen {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  background: radial-gradient(circle at var(--fm-mx) var(--fm-my), rgba(255, 252, 238, 0.24), rgba(255, 252, 238, 0) 52%);
}

.sheen::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0;
  background: linear-gradient(104deg, transparent 38%, rgba(255, 250, 232, 0.5) 50%, transparent 62%) 140% 0 / 260% 100% no-repeat;
}

/* ───────── front: a tipped-in polaroid, a stamp, a sticker, handwriting ───────── */

.frontInner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-block-size: 100%;
  padding: 11.5cqw 7cqw 9cqw;
}

.polaroid {
  position: relative;
  margin: 0;
  inline-size: 84%;
  transform: rotate(-2.4deg);
  background: linear-gradient(170deg, #fffefa 0%, #fbf6e8 100%);
  padding: 3.6cqw 3.6cqw 0;
  border-radius: 0.5cqw;
  box-shadow:
    0 0.15cqw 0.35cqw rgba(50, 24, 8, 0.34),
    0 1cqw 1.6cqw -0.4cqw rgba(50, 24, 8, 0.34),
    0 2.6cqw 3.6cqw -1.4cqw rgba(50, 24, 8, 0.4),
    inset 0 0 0 1px rgba(120, 90, 50, 0.1);
}

.tape,
.noteTape {
  position: absolute;
  z-index: 2;
  inline-size: 23cqw;
  block-size: 7.2cqw;
  background: linear-gradient(180deg, rgba(240, 224, 172, 0.82), rgba(224, 203, 142, 0.74));
  clip-path: polygon(0 0, 2.4% 12%, 0 25%, 2.4% 37%, 0 50%, 2.4% 62%, 0 75%, 2.4% 87%, 0 100%, 100% 100%, 97.6% 87%, 100% 75%, 97.6% 62%, 100% 50%, 97.6% 37%, 100% 25%, 97.6% 12%, 100% 0);
  mix-blend-mode: multiply;
  pointer-events: none;
}

.tape {
  inset-block-start: -3.5cqw;
  inset-inline-start: 50%;
  margin-inline-start: -11.5cqw;
  transform: rotate(-4deg);
}

.print {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: #2b2623;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.3),
    inset 0 0 1.4cqw rgba(0, 0, 0, 0.4);
}

.heroImg {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  filter: saturate(1.1) contrast(1.05);
  transform: translate(calc(var(--fm-tx) * -1.4cqw), calc(var(--fm-ty) * -1.1cqw)) scale(1.07);
  transition: transform 300ms ease-out;
}

.printShade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(142deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 38%),
    radial-gradient(120% 100% at 50% 45%, rgba(40, 14, 4, 0) 58%, rgba(40, 14, 4, 0.34) 100%);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4cqw 0;
  box-sizing: border-box;
  min-block-size: 12.5cqw;
  margin: 0;
  padding: 2.2cqw 22cqw 2.6cqw 1cqw;
  list-style: none;
  font-family: var(--fm-hand);
  font-weight: 700;
  font-size: 6.3cqw;
  line-height: 1.1;
  color: var(--fm-red-deep);
  transform: rotate(-0.8deg);
}

.tag {
  white-space: nowrap;
}

.tag + .tag::before {
  content: '';
  display: inline-block;
  inline-size: 0.9cqw;
  block-size: 0.9cqw;
  margin-inline: 2cqw;
  border-radius: 50%;
  vertical-align: middle;
  background: var(--fm-red);
  opacity: 0.7;
}

.blank {
  display: block;
  block-size: 12.5cqw;
}

/* price sticker: die-cut vinyl, slapped on across the photo's corner */

.sticker {
  position: absolute;
  z-index: 3;
  inset-inline-end: -11cqw;
  inset-block-end: -4.6cqw;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  min-inline-size: 25cqw;
  max-inline-size: 31cqw;
  min-block-size: 20cqw;
  padding: 3.4cqw 5cqw;
  border: 1cqw solid #fffaf0;
  border-radius: 50%;
  background: radial-gradient(120% 110% at 28% 18%, #de4f2d 0%, #c23a1e 55%, #a82d14 100%);
  box-shadow:
    0 0.2cqw 0.3cqw rgba(50, 14, 4, 0.4),
    0 1.2cqw 2cqw -0.4cqw rgba(50, 14, 4, 0.5),
    0 0 0 0.25cqw rgba(190, 150, 110, 0.35);
  transform: rotate(9deg);
}

.stickerText {
  position: relative;
  z-index: 1;
  font-family: var(--fm-display);
  font-weight: 800;
  font-size: calc(var(--fm-price, 9.4) * 1cqw);
  line-height: 1;
  letter-spacing: 0.02em;
  text-align: center;
  text-transform: uppercase;
  word-break: keep-all;
  overflow-wrap: normal;
  color: #fff6e2;
  text-shadow: 0 0.2cqw 0 rgba(90, 20, 6, 0.4);
}

.peel {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 36%);
  box-shadow:
    inset -0.9cqw -1cqw 1.2cqw -0.4cqw rgba(60, 10, 0, 0.3),
    inset 0.4cqw 0.5cqw 0.6cqw rgba(255, 255, 255, 0.3);
  pointer-events: none;
}

/* handwritten dish name: never breaks inside a word */

.name {
  position: relative;
  margin: auto 0 0;
  padding-block-start: 6.5cqw;
  font-family: var(--fm-hand);
  font-weight: 700;
  font-size: calc(var(--fm-name, 9.6) * 1cqw);
  line-height: 1.04;
  letter-spacing: 0;
  color: var(--fm-ink);
  text-wrap: balance;
  word-break: keep-all;
  overflow-wrap: normal;
  hyphens: manual;
  mix-blend-mode: multiply;
  transform: rotate(-1.2deg);
  transform-origin: 0 100%;
}

.word {
  display: inline-block;
  transform: translateY(var(--y, 0)) rotate(var(--r, 0deg));
  transform-origin: 0 80%;
}

.scribble {
  display: block;
  inline-size: 62%;
  aspect-ratio: 200 / 14;
  margin-block-start: 0.4cqw;
  margin-inline-start: 1cqw;
  overflow: visible;
  transform: rotate(-1.2deg);
}

.scribblePath {
  stroke: var(--fm-red);
  stroke-width: 1.9;
  stroke-dasharray: 1;
  stroke-dashoffset: 0;
  opacity: 0.88;
}

.scribbleB {
  stroke-width: 1.4;
  opacity: 0.6;
}

/* rubber stamp: item number */

.stamp {
  position: absolute;
  z-index: 3;
  inset-block-start: 4.4cqw;
  inset-inline-end: 3.6cqw;
  display: inline-flex;
  align-items: baseline;
  gap: 1cqw;
  padding: 0.9cqw 2.6cqw 1cqw;
  border: 0.6cqw solid var(--fm-red);
  border-radius: 1.4cqw;
  outline: 0.22cqw solid var(--fm-red);
  outline-offset: 0.5cqw;
  font-family: var(--fm-display);
  font-weight: 800;
  line-height: 1;
  color: var(--fm-red);
  mix-blend-mode: multiply;
  opacity: 0.93;
  transform: rotate(8deg);
}

.stampNo {
  font-size: 5cqw;
  letter-spacing: 0.04em;
}

.stampNum {
  font-size: 10cqw;
  letter-spacing: 0.01em;
}

/* photo fallback (no photo / photo failed) */

.fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.4), transparent 50%),
    linear-gradient(160deg, #d9c9a4, #bda877);
}

.fbPlate {
  display: grid;
  place-items: center;
  inline-size: 74%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle at 36% 30%, #fffdf3, #efe3c6);
  box-shadow:
    inset 0 0 0 1.4cqw #fffaf0,
    inset 0 0 0 1.9cqw rgba(194, 58, 30, 0.55),
    0 1.4cqw 2.6cqw -0.6cqw rgba(50, 20, 6, 0.5);
}

.fbMono {
  font-family: var(--fm-hand);
  font-weight: 700;
  font-size: 24cqw;
  line-height: 1;
  color: var(--fm-red);
}

/* ───────── back: the reverse of the slip — red stock, written on in white pen ───────── */

.backInner {
  position: absolute;
  inset: 0;
  z-index: 1;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 5cqw;
  padding: 12cqw 8cqw 10cqw 9cqw;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 226, 200, 0.4) transparent;
}

.backMain {
  display: flex;
  flex-direction: column;
  gap: 4.6cqw;
}

.backTitle {
  margin: 0;
  padding-block-end: 2.4cqw;
  font-family: var(--fm-hand);
  font-weight: 700;
  font-size: calc(var(--fm-name, 9.6) * 0.72cqw);
  line-height: 1.08;
  color: #fff6e6;
  word-break: keep-all;
  overflow-wrap: normal;
  text-wrap: balance;
  border-block-end: 0.5cqw solid rgba(255, 226, 200, 0.5);
  border-image: linear-gradient(90deg, rgba(255, 226, 200, 0.6), rgba(255, 226, 200, 0.5) 60%, transparent) 1;
}

.sectionLabel {
  margin: 0 0 1.6cqw;
  font-family: var(--fm-display);
  font-weight: 800;
  font-size: max(12px, 3.8cqw);
  line-height: 1.1;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 224, 196, 0.76);
}

.ingredientList {
  list-style: none;
  margin: 0;
  padding: 0;
  font-family: var(--fm-hand);
  font-weight: 700;
  font-size: 7cqw;
  line-height: 1.24;
  color: #fff8ea;
}

.ingredient {
  display: inline;
}

.ingredient + .ingredient::before {
  content: '/';
  margin-inline: 1.5cqw;
  color: rgba(255, 214, 178, 0.6);
}

.allergens {
  display: flex;
  flex-wrap: wrap;
  gap: 1.2cqw 2.4cqw;
  list-style: none;
  margin: 0;
  padding: 0;
}

.allergen {
  position: relative;
  display: inline-flex;
  padding: 2cqw 4.6cqw 2.2cqw;
  transform: rotate(var(--r, -1.5deg));
}

.allergenRing {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  fill: none;
  stroke: #ffe4cb;
  stroke-width: 1.6;
  stroke-dasharray: 400;
  stroke-dashoffset: 0;
  overflow: visible;
}

.allergenText {
  position: relative;
  font-family: var(--fm-hand);
  font-weight: 700;
  font-size: 6.4cqw;
  line-height: 1;
  color: #fff8ea;
}

/* the chef's note: a scrap of check paper, taped on */

.noteStrip {
  position: relative;
  isolation: isolate;
  margin-block-start: auto;
  padding: 6.4cqw 5.4cqw 5cqw;
  color: var(--fm-ink);
  transform: rotate(-1.3deg);
  flex: none;
}

.noteStrip::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    var(--fm-noise),
    linear-gradient(176deg, #fffcef, #f6ebcf);
  background-blend-mode: multiply, normal;
  clip-path: polygon(0 1.3cqw, 4% 0.1cqw, 9% 1.4cqw, 15% 0.3cqw, 22% 1.5cqw, 30% 0.2cqw, 38% 1.3cqw, 46% 0, 54% 1.5cqw, 63% 0.3cqw, 71% 1.4cqw, 80% 0, 88% 1.3cqw, 94% 0.2cqw, 100% 1.1cqw, 100% 100%, 0 100%);
  box-shadow: 0 1cqw 1.4cqw rgba(40, 8, 0, 0.4);
  filter: drop-shadow(0 0.6cqw 0.8cqw rgba(40, 8, 0, 0.4));
}

.noteTape {
  inset-block-start: -3.4cqw;
  inset-inline-start: 50%;
  margin-inline-start: -11.5cqw;
  transform: rotate(2.6deg);
}

.noteLabel {
  margin: 0 0 0.6cqw;
  font-family: var(--fm-hand);
  font-weight: 700;
  font-size: 6cqw;
  line-height: 1.1;
  color: var(--fm-red);
}

.note {
  margin: 0;
  font-family: var(--fm-hand);
  font-weight: 700;
  font-size: 5.3cqw;
  line-height: 1.28;
  color: var(--fm-ink);
}

/* ───────── motion ───────── */

[data-crossfade='false'] .tilt {
  animation: fm-drop 760ms cubic-bezier(0.2, 0.9, 0.3, 1) both;
}

[data-crossfade='false'] .heroImg {
  animation: fm-develop 1700ms cubic-bezier(0.3, 0.6, 0.3, 1) 260ms both;
}

[data-crossfade='false'] .tape {
  animation: fm-tape 520ms cubic-bezier(0.2, 0.9, 0.3, 1) 140ms both;
}

[data-crossfade='false'] .stamp {
  animation: fm-thump 560ms cubic-bezier(0.3, 0.8, 0.3, 1) 760ms both;
}

[data-crossfade='false'] .sticker {
  animation: fm-slap 560ms cubic-bezier(0.3, 0.8, 0.3, 1) 980ms both;
}

[data-crossfade='false'] .scribblePath {
  animation: fm-scrawl 640ms cubic-bezier(0.5, 0, 0.2, 1) 1180ms both;
}

[data-crossfade='false'] .scribbleB {
  animation-delay: 1380ms;
}

/* turning the slip over: lift an edge, swing, drop it flat */

[data-flipping='true'] .liftInner {
  animation: fm-lift 980ms cubic-bezier(0.4, 0, 0.25, 1);
}

[data-flipping='true'] .cast {
  animation: fm-cast 980ms ease-in-out;
}

[data-flipping='true'] .shadow {
  animation: fm-ground 980ms ease-in-out;
}

[data-flipping='true'] .padPink {
  animation: fm-pad-a 980ms ease-in-out;
}

[data-flipping='true'] .padCanary {
  animation: fm-pad-b 980ms ease-in-out;
}

[data-flipping='true'] .sheen::after {
  animation: fm-sweep 900ms ease-in-out 80ms;
}

[data-flipped='true'] .rise {
  animation: fm-rise 460ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--d, 0.4s);
}

[data-flipped='true'] .allergenRing {
  animation: fm-ring 640ms cubic-bezier(0.5, 0, 0.2, 1) both;
  animation-delay: calc(0.7s + var(--i, 0) * 120ms);
}

/* reduced motion: no turning, a quiet crossfade between the two sides */

[data-crossfade='true'] .flipper {
  transform: none;
  transition: none;
}

[data-crossfade='true'] .faceBack {
  transform: none;
}

[data-crossfade='true'] .face {
  transition: opacity 220ms ease;
}

[data-crossfade='true'] .faceFront,
[data-crossfade='true'][data-flipped='true'] .faceBack {
  opacity: 1;
}

[data-crossfade='true'][data-flipped='true'] .faceFront,
[data-crossfade='true'] .faceBack {
  opacity: 0;
}

[data-crossfade='true'] .faceBack {
  z-index: 0;
}

[data-crossfade='true'][data-flipped='true'] .faceBack {
  z-index: 2;
}

[data-crossfade='true'] .stack,
[data-crossfade='true'] .heroImg,
[data-crossfade='true'] .flap {
  transition: none;
}

[data-crossfade='true'] .rise {
  animation-delay: calc(var(--d, 0.4s) - 0.34s);
}

[data-crossfade='true'] .allergenRing {
  animation-delay: calc(0.2s + var(--i, 0) * 60ms);
}

@media (prefers-reduced-motion: reduce) {
  .tilt,
  .heroImg,
  .tape,
  .stamp,
  .sticker,
  .scribblePath {
    animation: none !important;
  }
}

/* ───────── narrow stages: drop the props, keep the slip ───────── */

@container (max-width: 700px) {
  .coffee,
  .pencil,
  .basil {
    display: none;
  }
}

@container (min-width: 701px) {
  .tilt {
    margin-inline-start: -5cqw;
  }
}

/* ───────── keyframes ───────── */

@keyframes fm-drop {
  0% {
    opacity: 0;
    transform: translateY(-3cqw) rotate(1.6deg) scale(1.03);
  }
  55% {
    opacity: 1;
  }
  100% {
    opacity: 1;
    transform: none;
  }
}

@keyframes fm-develop {
  0% {
    filter: brightness(1.9) saturate(0) contrast(0.5) sepia(0.4);
  }
  55% {
    filter: brightness(1.25) saturate(0.55) contrast(0.8) sepia(0.15);
  }
  100% {
    filter: saturate(1.1) contrast(1.05);
  }
}

@keyframes fm-tape {
  0% {
    opacity: 0;
    transform: translateY(-2cqw) rotate(-9deg) scale(1.08);
  }
  100% {
    opacity: 1;
    transform: rotate(-4deg);
  }
}

@keyframes fm-thump {
  0% {
    opacity: 0;
    transform: rotate(14deg) scale(1.6);
  }
  55% {
    opacity: 0.98;
    transform: rotate(7deg) scale(0.93);
  }
  100% {
    opacity: 0.93;
    transform: rotate(8deg) scale(1);
  }
}

@keyframes fm-slap {
  0% {
    opacity: 0;
    transform: rotate(24deg) scale(1.55);
  }
  58% {
    opacity: 1;
    transform: rotate(7deg) scale(0.92);
  }
  100% {
    opacity: 1;
    transform: rotate(9deg) scale(1);
  }
}

@keyframes fm-scrawl {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes fm-lift {
  0% {
    transform: translateY(0) rotate(0deg) scale(1);
  }
  16% {
    transform: translateY(-1.6cqw) rotate(-1.4deg) scale(1.025);
  }
  46% {
    transform: translateY(-4.2cqw) rotate(2.4deg) scale(1.07);
  }
  74% {
    transform: translateY(-1.8cqw) rotate(-1.2deg) scale(1.035);
  }
  89% {
    transform: translateY(0.5cqw) rotate(0.5deg) scale(0.995);
  }
  100% {
    transform: translateY(0) rotate(0deg) scale(1);
  }
}

@keyframes fm-cast {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  46% {
    transform: translate(2.6cqw, 5cqw) scale(1.05);
    opacity: 0.5;
  }
  89% {
    transform: translate(-0.4cqw, -0.6cqw) scale(0.99);
    opacity: 1.2;
  }
}

@keyframes fm-ground {
  0%,
  100% {
    transform: scaleX(1);
    opacity: 1;
  }
  46% {
    transform: translateY(2cqw) scaleX(1.1);
    opacity: 0.35;
  }
  89% {
    transform: scaleX(0.97);
    opacity: 1;
  }
}

@keyframes fm-pad-a {
  40% {
    transform: translate(1.5cqw, 2.1cqw) rotate(1.8deg);
  }
  90% {
    transform: translate(0.5cqw, 1.3cqw) rotate(0.6deg);
  }
}

@keyframes fm-pad-b {
  40% {
    transform: translate(-1.6cqw, 3cqw) rotate(-2.2deg);
  }
  90% {
    transform: translate(-0.6cqw, 2.4cqw) rotate(-1deg);
  }
}

@keyframes fm-sweep {
  0% {
    opacity: 1;
    background-position: 140% 0;
  }
  100% {
    opacity: 1;
    background-position: -40% 0;
  }
}

@keyframes fm-rise {
  from {
    opacity: 0;
    transform: translateY(2cqw);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes fm-ring {
  from {
    stroke-dashoffset: 400;
  }
  to {
    stroke-dashoffset: 0;
  }
}
```
