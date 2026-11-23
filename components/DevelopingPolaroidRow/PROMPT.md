Create a custom element called "Developing Polaroid Row". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: photos (image, caption), print tilt, develop speed, border tone. Add other settings if they help.

```tsx
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export interface DevelopingPolaroidPhoto {
  image: string;
  caption?: string;
  alt?: string;
}

export interface DevelopingPolaroidRowProps {
  photos?: DevelopingPolaroidPhoto[];
  tilt?: number;
  developSeconds?: number;
  borderTone?: string;
  className?: string;
}

const photo = (id: string) => `https://images.unsplash.com/${id}?w=640&h=640&fit=crop&auto=format&q=80`;

export const defaultPhotos: DevelopingPolaroidPhoto[] = [
  { image: photo('photo-1529156069898-49953e39b3ac'), caption: 'the whole gang, finally', alt: 'Friends laughing together outdoors' },
  { image: photo('photo-1414235077428-338989a2e8c0'), caption: 'table 4, best seat', alt: 'Candlelit restaurant table set for dinner' },
  { image: photo('photo-1530103862676-de8c9debad1d'), caption: 'cake o’clock', alt: 'Birthday cake with lit candles' },
  { image: photo('photo-1507525428034-b723cf961d3e'), caption: 'last swim of summer', alt: 'Turquoise sea meeting a sandy beach' },
  { image: photo('photo-1470229722913-7c0e2dbbafd3'), caption: 'front row!!', alt: 'Crowd at an outdoor concert under stage lights' },
];

const TILT_PATTERN = [-1, 0.7, -0.4, 0.95, -0.75, 0.5];
const DROP_PATTERN = [6, -4, 10, -2, 8, -6];
const STAGGER_S = 0.22;
const PRINT_HELP = 'Press to enlarge or set down the print. Escape sets it down.';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export default function DevelopingPolaroidRow({
  photos = defaultPhotos,
  tilt = 5,
  developSeconds = 3.2,
  borderTone = '#f4efe2',
  className,
}: DevelopingPolaroidRowProps) {
  const [reduced, setReduced] = useState(false);
  const [developed, setDeveloped] = useState<Record<number, number>>({});
  const [picked, setPicked] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const markLoaded = (i: number) => setLoaded((prev) => (prev[i] ? prev : { ...prev, [i]: true }));
  const printRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const io = new IntersectionObserver(
      (entries) => {
        const fresh = entries
          .filter((e) => e.isIntersecting)
          .map((e) => Number((e.target as HTMLElement).dataset.index))
          .sort((a, b) => a - b);
        if (!fresh.length) return;
        fresh.forEach((i) => io.unobserve(printRefs.current[i] as Element));
        setDeveloped((prev) => {
          const next = { ...prev };
          fresh.forEach((i, k) => {
            if (next[i] === undefined) next[i] = k * STAGGER_S;
          });
          return next;
        });
      },
      { threshold: 0.45 },
    );
    printRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [reduced, photos.length]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape') setPicked(null);
  };

  const rootStyle = {
    '--dp-border': borderTone,
    '--dp-develop': `${clamp(developSeconds, 0.5, 20)}s`,
  } as CSSProperties;

  const rootClass = [styles.root, reduced && styles.still, className].filter(Boolean).join(' ');

  return (
    <div className={rootClass} style={rootStyle}>
      <span className={styles.grain} aria-hidden="true" />
      <ul className={styles.track} aria-label="Photo prints">
        {photos.map((p, i) => {
          const delay = developed[i];
          const printStyle = {
            '--dp-rot': `${(TILT_PATTERN[i % TILT_PATTERN.length] * clamp(tilt, 0, 20)).toFixed(2)}deg`,
            '--dp-drop': `${DROP_PATTERN[i % DROP_PATTERN.length]}px`,
            '--dp-delay': `${delay ?? 0}s`,
          } as CSSProperties;
          const printClass = [
            styles.print,
            (reduced || (delay !== undefined && (loaded[i] || !p.image))) && styles.developed,
            picked === i && styles.picked,
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <li key={i} className={styles.slot}>
              <button
                ref={(el) => {
                  printRefs.current[i] = el;
                }}
                type="button"
                data-index={i}
                className={printClass}
                style={printStyle}
                aria-pressed={picked === i}
                aria-label={p.caption || p.alt ? undefined : `Photo ${i + 1}`}
                aria-description={PRINT_HELP}
                onClick={() => setPicked((cur) => (cur === i ? null : i))}
                onKeyDown={onKeyDown}
                onBlur={() => setPicked((cur) => (cur === i ? null : cur))}
              >
                <span className={styles.frame} aria-hidden="true" />
                <span className={styles.window}>
                  {p.image ? (
                    <img
                      ref={(img) => {
                        if (img?.complete && img.naturalWidth) markLoaded(i);
                      }}
                      className={styles.photo}
                      src={p.image}
                      alt={p.alt ?? ''}
                      draggable={false}
                      onLoad={() => markLoaded(i)}
                    />
                  ) : (
                    <span className={styles.blank} aria-hidden="true" />
                  )}
                  <span className={styles.haze} aria-hidden="true" />
                  <span className={styles.sheen} aria-hidden="true" />
                  <span className={styles.recess} aria-hidden="true" />
                </span>
                <span className={styles.chin}>
                  {p.caption && <span className={styles.caption}>{p.caption}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

```css
.root {
  --dp-border: #f4efe2;
  --dp-table: #e7e0d3;
  --dp-table-light: #f5f0e6;
  --dp-haze: #a9cfc4;
  --dp-milk: #eef1ea;
  --dp-ink: #24408f;
  --dp-shadow: 64, 44, 24;
  --dp-focus: #24408f;
  --dp-develop: 4s;
  --dp-font-hand: 'Caveat', 'Kalam', 'Patrick Hand', 'Bradley Hand', 'Segoe Print', 'Comic Neue', cursive;
  --dp-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 .75 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 28px;
  background:
    radial-gradient(70% 90% at 22% 0%, var(--dp-table-light) 0%, transparent 70%),
    radial-gradient(60% 80% at 100% 100%, color-mix(in srgb, var(--dp-table) 80%, #b9a98f) 0%, transparent 75%),
    var(--dp-table);
}

.grain {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: var(--dp-noise);
  opacity: 0.28;
  mix-blend-mode: multiply;
}

.track {
  display: flex;
  gap: 18px;
  margin: 0;
  padding-block: 56px 64px;
  padding-inline: 22px;
  list-style: none;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
  scroll-padding-inline: 22px;
  scrollbar-width: none;
}

.track::-webkit-scrollbar {
  display: none;
}

.slot {
  flex: 0 0 auto;
  inline-size: 42cqi;
  scroll-snap-align: start;
}

.print {
  --dp-scale: 1;
  --dp-lift: 0px;
  --dp-flat: 1;

  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  inline-size: 100%;
  margin: 0;
  padding: 7.5% 7.5% 0;
  border: 0;
  border-radius: 3px;
  background:
    linear-gradient(162deg, color-mix(in srgb, var(--dp-border) 70%, #fff) 0%, var(--dp-border) 38%, color-mix(in srgb, var(--dp-border) 92%, #8a7a5c) 100%);
  color: var(--dp-ink);
  font: inherit;
  text-align: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transform:
    translateY(calc(var(--dp-drop) + var(--dp-lift)))
    rotate(calc(var(--dp-rot) * var(--dp-flat)))
    scale(var(--dp-scale));
  box-shadow:
    0 1px 1px rgba(var(--dp-shadow), 0.14),
    0 6px 10px -4px rgba(var(--dp-shadow), 0.18),
    0 20px 28px -16px rgba(var(--dp-shadow), 0.38);
  transition:
    transform 620ms cubic-bezier(0.34, 1.45, 0.5, 1),
    box-shadow 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.print:focus-visible {
  --dp-flat: 0;
  --dp-lift: -12px;
  --dp-scale: 1.05;
  z-index: 2;
  box-shadow:
    0 1px 2px rgba(var(--dp-shadow), 0.12),
    0 14px 20px -8px rgba(var(--dp-shadow), 0.2),
    0 38px 48px -22px rgba(var(--dp-shadow), 0.42);
}

@media (hover: hover) {
  .print:hover {
    --dp-flat: 0;
    --dp-lift: -12px;
    --dp-scale: 1.05;
    z-index: 2;
    box-shadow:
      0 1px 2px rgba(var(--dp-shadow), 0.12),
      0 14px 20px -8px rgba(var(--dp-shadow), 0.2),
      0 38px 48px -22px rgba(var(--dp-shadow), 0.42);
  }

  .print:hover .sheen {
    background-position: 60% 60%;
  }
}

.print:focus-visible {
  outline: 2px solid var(--dp-focus);
  outline-offset: 5px;
}

.picked {
  --dp-flat: 0;
  --dp-lift: -16px;
  --dp-scale: 1.1;
  z-index: 3;
  box-shadow:
    0 2px 3px rgba(var(--dp-shadow), 0.12),
    0 18px 26px -10px rgba(var(--dp-shadow), 0.22),
    0 50px 60px -26px rgba(var(--dp-shadow), 0.48);
}

.frame {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background-image: var(--dp-noise);
  background-size: 120px;
  opacity: 0.16;
  mix-blend-mode: multiply;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    inset 0 0 0 1px rgba(var(--dp-shadow), 0.06);
}

.window {
  position: relative;
  display: block;
  aspect-ratio: 1;
  overflow: hidden;
  background: #1d2a28;
}

.photo,
.blank {
  position: absolute;
  inset: 0;
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

.photo {
  opacity: 0.12;
  filter: blur(9px) saturate(0) contrast(0.55) brightness(1.45);
  transform: scale(1.04);
}

.blank {
  background:
    radial-gradient(80% 70% at 30% 25%, rgba(255, 255, 255, 0.35), transparent 70%),
    linear-gradient(150deg, #47605a, #23302d);
}

.haze {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(90% 80% at 50% 45%, var(--dp-milk) 0%, color-mix(in srgb, var(--dp-milk) 70%, var(--dp-haze)) 60%, var(--dp-haze) 100%);
  opacity: 0.94;
}

.sheen {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(125deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.06) 28%, transparent 46%, transparent 78%, rgba(255, 255, 255, 0.1) 100%);
  background-size: 180% 180%;
  background-position: 0% 0%;
  mix-blend-mode: screen;
  transition: background-position 900ms cubic-bezier(0.22, 1, 0.36, 1);
}


.recess {
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow:
    inset 0 2px 3px rgba(0, 0, 0, 0.28),
    inset 0 0 0 1px rgba(0, 0, 0, 0.12);
}

.developed .photo {
  animation: develop var(--dp-develop) cubic-bezier(0.33, 0, 0.2, 1) var(--dp-delay) both;
}

.developed .haze {
  animation: clear calc(var(--dp-develop) * 1.1) cubic-bezier(0.45, 0, 0.25, 1) var(--dp-delay) both;
}

.chin {
  display: grid;
  place-items: center;
  min-block-size: 0;
  block-size: clamp(44px, 27cqi, 76px);
  max-block-size: 30%;
  aspect-ratio: auto;
  padding-inline: 4%;
  padding-block: 6px 8px;
}

.caption {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  max-inline-size: 100%;
  font-family: var(--dp-font-hand);
  font-size: clamp(15px, 4.6cqi, 21px);
  line-height: 1.1;
  letter-spacing: 0.005em;
  color: var(--dp-ink);
  opacity: 0.88;
  transform: rotate(-1.5deg);
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.still .print,
.still .sheen {
  transition: none;
}

.still .photo {
  opacity: 1;
  filter: none;
  transform: none;
  animation: none;
}

.still .haze {
  opacity: 0;
  animation: none;
}

@keyframes develop {
  0% {
    opacity: 0.12;
    filter: blur(9px) saturate(0) contrast(0.55) brightness(1.45);
    transform: scale(1.04);
  }
  35% {
    opacity: 0.55;
    filter: blur(4px) saturate(0.15) contrast(0.7) brightness(1.25) hue-rotate(-12deg);
  }
  70% {
    opacity: 0.9;
    filter: blur(1px) saturate(0.65) contrast(0.9) brightness(1.08) hue-rotate(-4deg);
  }
  100% {
    opacity: 1;
    filter: blur(0) saturate(1) contrast(1) brightness(1) hue-rotate(0deg);
    transform: scale(1);
  }
}

@keyframes clear {
  0% {
    opacity: 0.94;
  }
  40% {
    opacity: 0.6;
  }
  100% {
    opacity: 0;
  }
}

@container (min-width: 640px) {
  .track {
    gap: 26px;
    padding-inline: 36px;
    scroll-padding-inline: 36px;
  }

  .slot {
    inline-size: clamp(200px, 26cqi, 260px);
  }

  .chin {
    block-size: clamp(56px, 6.5cqi, 78px);
  }

  .caption {
    font-size: clamp(18px, 2cqi, 23px);
  }
}

@container (min-width: 1000px) {
  .track {
    justify-content: safe center;
  }

  .slot {
    inline-size: clamp(200px, 19cqi, 250px);
  }
}
```
