const e=`import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react';
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
    outer.push(\`\${px.toFixed(2)}% calc(100% - \${y.toFixed(2)}cqw)\`);
    inner.push(\`\${px.toFixed(2)}% calc(100% - \${(y + 0.35 + rnd() * 1.05).toFixed(2)}cqw)\`);
  }
  const head = '0 0, 100% 0, 100% calc(100% - 11.5cqw), calc(100% - 9cqw) calc(100% - 2.6cqw)';
  const innerHead = '0 0, 100% 0, 100% calc(100% - 12.2cqw), calc(100% - 9.6cqw) calc(100% - 3.4cqw)';
  return {
    out: \`polygon(\${head}, \${outer.slice(6).join(', ')})\`,
    inn: \`polygon(\${innerHead}, \${inner.slice(6).join(', ')})\`,
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
    .split(/\\s+/)
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
  const inkId = \`fm-ink-\${uid}\`;
  const greaseId = \`fm-grease-\${uid}\`;
  const penId = \`fm-pen-\${uid}\`;

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
      tilt.style.setProperty('--fm-mx', \`\${((tx + 0.5) * 100).toFixed(1)}%\`);
      tilt.style.setProperty('--fm-my', \`\${((ty + 0.5) * 100).toFixed(1)}%\`);
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
  const longest = Math.max(1, ...dishName.split(/[\\s\\-–—]+/).map((w) => w.length));
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
      <span className={\`\${styles.basil} \${styles.basilA}\`} aria-hidden="true" />
      <span className={\`\${styles.basil} \${styles.basilB}\`} aria-hidden="true" />
      <span className={\`\${styles.basil} \${styles.basilC}\`} aria-hidden="true" />
      <span className={styles.pool} aria-hidden="true" />

      <div
        ref={tiltRef}
        className={styles.tilt}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={\`\${dishName} menu card. Press to flip for ingredients, allergens and a tasting note.\`}
        onClick={onClickFlip}
        onKeyDown={onKeyFlip}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <div className={styles.stack}>
          <span className={styles.shadow} aria-hidden="true" />
          <span className={styles.cast} aria-hidden="true" />
          <span className={\`\${styles.pad} \${styles.padKraft}\`} aria-hidden="true" />
          <span className={\`\${styles.pad} \${styles.padCanary}\`} aria-hidden="true" />
          <span className={\`\${styles.pad} \${styles.padPink}\`} aria-hidden="true" />

          <div className={styles.liftInner}>
            <div className={styles.flipper}>
              {/* ───────── FRONT ───────── */}
              <div className={\`\${styles.face} \${styles.faceFront}\`} aria-hidden={flipped}>
                <div className={styles.paper}>
                  <span className={styles.ruled} aria-hidden="true" />
                  <span className={\`\${styles.grease} \${styles.greaseA}\`} style={{ filter: \`url(#\${greaseId})\` }} aria-hidden="true" />
                  <span className={\`\${styles.grease} \${styles.greaseB}\`} style={{ filter: \`url(#\${greaseId})\` }} aria-hidden="true" />
                  <span className={\`\${styles.grease} \${styles.greaseC}\`} style={{ filter: \`url(#\${greaseId})\` }} aria-hidden="true" />
                  <span className={styles.crease} aria-hidden="true" />

                  <div className={styles.frontInner}>
                    <figure className={styles.polaroid}>
                      <span className={styles.tape} aria-hidden="true" />
                      <div className={styles.print}>
                        {showPhoto ? (
                          <img
                            className={styles.heroImg}
                            src={photo}
                            alt={\`\${dishName}, plated\`}
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

                    <h3 className={styles.name} style={{ '--fm-name': fit.toFixed(2), filter: \`url(#\${penId})\` } as CSSProperties}>
                      {nameWords.map((w, i) => (
                        <Fragment key={i}>
                        <span
                          className={styles.word}
                          style={
                            {
                              '--r': \`\${WORD_TILT[i % WORD_TILT.length]}deg\`,
                              '--y': \`\${WORD_LIFT[i % WORD_LIFT.length]}em\`,
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
                        className={\`\${styles.scribblePath} \${styles.scribbleB}\`}
                        d="M22 12 C 60 9, 96 12, 134 10"
                        fill="none"
                        strokeLinecap="round"
                        pathLength={1}
                      />
                    </svg>
                  </div>

                  {itemNumber && (
                    <span className={styles.stamp} style={{ filter: \`url(#\${inkId})\` }}>
                      <span className={styles.stampNo}>Nº</span>
                      <span className={styles.stampNum}>{itemNumber}</span>
                    </span>
                  )}
                </div>
                <span className={\`\${styles.flap} \${styles.flapFront}\`} aria-hidden="true" />
                <span className={styles.sheen} aria-hidden="true" />
              </div>

              {/* ───────── BACK ───────── */}
              <div className={\`\${styles.face} \${styles.faceBack}\`} aria-hidden={!flipped}>
                <div className={\`\${styles.paper} \${styles.paperBack}\`}>
                  <span className={styles.ruled} aria-hidden="true" />
                  <span className={\`\${styles.grease} \${styles.greaseD}\`} style={{ filter: \`url(#\${greaseId})\` }} aria-hidden="true" />

                  <div className={styles.backInner}>
                    <div className={styles.backMain}>
                      <p
                        className={styles.backTitle}
                        style={{ '--fm-name': fit.toFixed(2), filter: \`url(#\${penId})\` } as CSSProperties}
                      >
                        {dishName}
                      </p>

                      {ingredients.length > 0 && (
                        <section className={styles.rise} style={{ '--d': '0.34s' } as CSSProperties}>
                          <h4 className={styles.sectionLabel}>{ingredientsLabel}</h4>
                          <ul className={styles.ingredientList} style={{ filter: \`url(#\${penId})\` }}>
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
                      <section className={\`\${styles.noteStrip} \${styles.rise}\`} style={{ '--d': '0.56s' } as CSSProperties}>
                        <span className={styles.noteTape} aria-hidden="true" />
                        <h4 className={styles.noteLabel}>{noteLabel}</h4>
                        <p className={styles.note}>{tastingNote}</p>
                      </section>
                    )}
                  </div>
                </div>
                <span className={\`\${styles.flap} \${styles.flapBack}\`} aria-hidden="true" />
                <span className={styles.sheen} aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
`;export{e as default};
