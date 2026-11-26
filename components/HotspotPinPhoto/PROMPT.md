Create a custom element called "Hotspot Pin Photo". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: image, image description, pins (position, title, text, link), photo caption. Add other settings if they help.

```tsx
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface HotspotPinPhotoPin {
  /** 0–100: distance across the photo, in percent */
  x: number;
  /** 0–100: distance down the photo, in percent */
  y: number;
  title: string;
  text?: string;
  link?: string;
}

export interface HotspotPinPhotoProps {
  image?: string;
  imageAlt?: string;
  caption?: string;
  pins?: HotspotPinPhotoPin[];
  className?: string;
}

export const defaultPins: HotspotPinPhotoPin[] = [
  { x: 34, y: 58, title: 'Aura Sofa', text: 'Bouclé two-seater in bone white — €1,290', link: 'https://example.com/aura-sofa' },
  { x: 63, y: 24, title: 'Arc Floor Lamp', text: 'Brushed brass, dimmable — €249' },
  { x: 79, y: 63, title: 'Terra Coffee Table', text: 'Solid oak, 120 × 60 cm', link: 'https://example.com/terra-coffee-table' },
  { x: 13, y: 84, title: 'Halo Rug', text: 'Hand-loomed wool, 200 × 300 cm' },
];

const hasContent = (pin: HotspotPinPhotoPin) => Boolean(pin.title || pin.text || pin.link);

const pinLabel = (pin: HotspotPinPhotoPin, index: number) =>
  [pin.title, pin.text].filter(Boolean).join(' — ') || `Pin ${index + 1}`;

export default function HotspotPinPhoto({
  image = 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&h=1067&q=80',
  imageAlt = 'Bright living room with a bouclé sofa, a brass floor lamp and oak furniture',
  caption = 'The autumn lookbook · photographed at Studio Nordheim',
  pins = defaultPins,
  className,
}: HotspotPinPhotoProps) {
  const [open, setOpen] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const uid = useId();
  const noteId = `${uid}-note`;

  const rootRef = useRef<HTMLDivElement>(null);
  const pinRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

  const toggle = (index: number) =>
    setOpen((prev) => (prev === index ? null : hasContent(pins[index]) ? index : prev));

  const onPinFocus = (event: FocusEvent<HTMLButtonElement>, index: number) => {
    // Pointer focus should not fight the click toggle; only keyboard focus opens.
    if (event.currentTarget.matches(':focus-visible')) setOpen(index);
  };

  const onRootBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (open === null) return;
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    setOpen(null);
  };

  const onRootPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (open === null) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-note]')) return;
    const spot = target.closest<HTMLElement>('[data-spot-index]');
    if (spot && Number(spot.dataset.spotIndex) === open) return;
    setOpen(null);
  };

  const onRootKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setOpen(null);
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const spot = (event.target as HTMLElement).closest<HTMLElement>('[data-spot-index]');
    const from = spot ? Number(spot.dataset.spotIndex) : -1;
    if (from < 0 || pins.length === 0) return;
    event.preventDefault();
    const dir = event.key === 'ArrowRight' ? 1 : -1;
    pinRefs.current[(from + dir + pins.length * 2) % pins.length]?.focus();
  };

  const active = open !== null ? pins[open] : undefined;
  const showNote = active !== undefined && hasContent(active);

  let side = 'right';
  let vpos = 'mid';
  if (active) {
    side = active.x > 56 ? 'left' : 'right';
    vpos = active.y > 66 ? 'above' : active.y < 34 ? 'below' : 'mid';
  }
  const anchorClass = [
    styles.anchor,
    styles[`anchor${side === 'left' ? 'Left' : 'Right'}`],
    styles[`anchor${vpos === 'above' ? 'Above' : vpos === 'below' ? 'Below' : 'Mid'}`],
  ]
    .filter(Boolean)
    .join(' ');
  const originX = side === 'left' ? 'right' : 'left';
  const originY = vpos === 'above' ? 'bottom' : vpos === 'below' ? 'top' : 'center';
  const origin = `${originX} ${originY}`;

  const rootClass = [styles.root, !inView ? styles.paused : '', reduced ? styles.still : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={rootRef}
      className={rootClass}
      onPointerDown={onRootPointerDown}
      onKeyDown={onRootKeyDown}
      onBlur={onRootBlur}
    >
      <figure className={styles.frame}>
        <div className={styles.photoArea}>
          {image ? (
            <img className={styles.photo} src={image} alt={imageAlt} draggable={false} />
          ) : (
            <span className={styles.photoEmpty} aria-hidden="true" />
          )}
          <span className={styles.keyline} aria-hidden="true" />

          {pins.map((pin, index) => (
            <div
              key={index}
              className={[styles.spot, open === index ? styles.spotOpen : ''].filter(Boolean).join(' ')}
              style={{ '--px': pin.x, '--py': pin.y, '--i': index } as CSSProperties}
              data-spot-index={index}
            >
              <button
                ref={(el) => {
                  pinRefs.current[index] = el;
                }}
                type="button"
                className={[styles.pin, open === index ? styles.pinOpen : ''].filter(Boolean).join(' ')}
                aria-expanded={open === index}
                aria-controls={open === index ? noteId : undefined}
                aria-label={pinLabel(pin, index)}
                onClick={() => toggle(index)}
                onFocus={(event) => onPinFocus(event, index)}
              >
                <span className={styles.halo} aria-hidden="true" />
              </button>
            </div>
          ))}

          {showNote && active && (
            <div
              className={anchorClass}
              style={{ '--px': active.x, '--py': active.y } as CSSProperties}
              data-note="true"
            >
              <div className={styles.note} id={noteId} style={{ transformOrigin: origin }}>
                {active.title && <p className={styles.noteTitle}>{active.title}</p>}
                {active.text && <p className={styles.noteText}>{active.text}</p>}
                {active.link && (
                  <a
                    className={styles.noteLink}
                    href={active.link}
                    aria-label={active.title ? `${active.title} — open the page` : 'Open the page'}
                  >
                    <svg className={styles.noteLinkIcon} viewBox="0 0 12 12" aria-hidden="true">
                      <path
                        d="M2.4 9.6 9.6 2.4M4.2 2.4h5.4v5.4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {caption && (
          <figcaption className={styles.captionRow}>
            <span className={styles.captionTick} aria-hidden="true" />
            <span className={styles.caption}>{caption}</span>
          </figcaption>
        )}
      </figure>
    </div>
  );
}
```

```css
.root {
  --hp-font: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  --hp-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --hp-spring: cubic-bezier(0.24, 1.3, 0.32, 1);

  position: relative;
  box-sizing: border-box;
  inline-size: 100%;
  container-type: inline-size;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(62, 48, 39, 0.14);
  background: #f1ece1;
  color: #3e3027;
  font-family: var(--hp-font);
}

.root ::selection {
  background: color-mix(in srgb, #dc4b2f 26%, transparent);
}

.frame {
  position: relative;
  margin: 0;
}

.photoArea {
  position: relative;
  aspect-ratio: 16 / 10;
  /* no clipping: notes may reach past the photo edge when a pin sits close to it */
}

.photo {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  border-radius: 10px;
  filter: saturate(0.92) contrast(1.03);
}

.photoEmpty {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background-color: #ece5d8;
  background-image: radial-gradient(color-mix(in srgb, #3e3027 8%, transparent) 1px, transparent 1.4px);
  background-size: 16px 16px;
}

.keyline {
  position: absolute;
  inset: 10px;
  z-index: 1;
  border: 1px solid rgba(255, 253, 248, 0.55);
  border-radius: 6px;
  pointer-events: none;
}

.spot {
  position: absolute;
  z-index: 3;
  inline-size: 44px;
  block-size: 44px;
  inset-inline-start: calc(var(--px) * 1%);
  inset-block-start: calc(var(--py) * 1%);
  margin-block-start: -22px;
  margin-inline-start: -22px;
  animation: hp-arrive 0.6s var(--hp-ease-out) backwards;
  animation-delay: calc(180ms + var(--i) * 110ms);
}

@keyframes hp-arrive {
  from {
    opacity: 0;
    transform: scale(0.3);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.pin {
  position: relative;
  display: block;
  inline-size: 100%;
  block-size: 100%;
  padding: 0;
  border: none;
  background: none;
  border-radius: 50%;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.halo {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
}

.halo::before {
  content: '';
  position: absolute;
  inset: 15%;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, #dc4b2f 55%, transparent), transparent 72%);
  animation: hp-breathe 3.4s ease-in-out infinite;
}

.halo::after {
  content: '';
  position: absolute;
  inset: 30%;
  border-radius: 50%;
  border: 1.5px solid #dc4b2f;
  opacity: 0;
  animation: hp-ring 3.4s var(--hp-ease-out) infinite;
}

@keyframes hp-breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.55;
  }
  50% {
    transform: scale(1.22);
    opacity: 0.9;
  }
}

@keyframes hp-ring {
  0% {
    transform: scale(0.85);
    opacity: 0.6;
  }
  70% {
    opacity: 0;
  }
  100% {
    transform: scale(2.6);
    opacity: 0;
  }
}

.pin::after {
  content: '';
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  inline-size: 16px;
  block-size: 16px;
  margin-block-start: -8px;
  margin-inline-start: -8px;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, color-mix(in srgb, #dc4b2f 45%, white), #dc4b2f 62%);
  box-shadow:
    0 0 0 2px rgba(255, 253, 248, 0.92),
    0 2px 8px color-mix(in srgb, #3e3027 40%, transparent);
  transition:
    transform 0.35s var(--hp-ease-out),
    box-shadow 0.35s var(--hp-ease-out);
}

.pin:hover::after {
  transform: scale(1.3);
}

.pinOpen::after {
  transform: scale(1.4);
  box-shadow:
    0 0 0 2px rgba(255, 253, 248, 0.95),
    0 0 0 6px color-mix(in srgb, #dc4b2f 32%, transparent),
    0 3px 10px color-mix(in srgb, #3e3027 38%, transparent);
}

.pin:focus-visible {
  outline: 2px solid #dc4b2f;
  outline-offset: 4px;
  border-radius: 50%;
}

.anchor {
  position: absolute;
  z-index: 5;
  pointer-events: none;
}

.anchorRight {
  inset-inline-start: calc(var(--px) * 1% + 30px);
  max-inline-size: min(300px, calc(100% - var(--px) * 1% - 44px));
}

.anchorLeft {
  inset-inline-end: calc(100% - var(--px) * 1% + 30px);
  max-inline-size: min(300px, calc(var(--px) * 1% - 44px));
}

.anchorMid {
  inset-block-start: calc(var(--py) * 1%);
  transform: translateY(-50%);
}

.anchorBelow {
  inset-block-start: calc(var(--py) * 1% + 32px);
}

.anchorAbove {
  inset-block-start: calc(var(--py) * 1% - 32px);
  transform: translateY(-100%);
}

.note {
  pointer-events: auto;
  position: relative;
  box-sizing: border-box;
  padding: 13px 15px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #3e3027 10%, transparent);
  background: #fbf6ec;
  box-shadow:
    0 16px 36px -14px color-mix(in srgb, #3e3027 42%, transparent),
    0 4px 12px -6px color-mix(in srgb, #3e3027 24%, transparent);
  animation: hp-note-in 0.34s var(--hp-spring) both;
}

@keyframes hp-note-in {
  from {
    opacity: 0;
    transform: scale(0.7);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.note::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  opacity: 0.05;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.noteTitle {
  margin: 0 0 3px;
  font-size: 15px;
  line-height: 1.3;
  font-weight: 650;
  letter-spacing: -0.012em;
  text-wrap: balance;
}

.noteText {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: #7d6a5b;
  font-variant-numeric: tabular-nums;
  overflow-wrap: break-word;
}

.noteLink {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 30px;
  block-size: 30px;
  margin-block-start: 10px;
  border-radius: 9px;
  border: 1px solid color-mix(in srgb, #3e3027 14%, transparent);
  background: color-mix(in srgb, #f1ece1 45%, #fbf6ec);
  color: #3e3027;
  transition:
    background-color 0.25s var(--hp-ease-out),
    color 0.25s var(--hp-ease-out),
    border-color 0.25s var(--hp-ease-out);
}

.noteLink:hover {
  background: #dc4b2f;
  border-color: #dc4b2f;
  color: #fff;
}

.noteLink:focus-visible {
  outline: 2px solid #dc4b2f;
  outline-offset: 2px;
}

.noteLinkIcon {
  display: block;
  inline-size: 12px;
  block-size: 12px;
}

.captionRow {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 12px 2px 0;
}

.captionTick {
  flex: none;
  inline-size: 6px;
  block-size: 6px;
  border-radius: 2px;
  background: #dc4b2f;
}

.caption {
  font-size: 14px;
  line-height: 1.4;
  letter-spacing: 0.01em;
  color: #7d6a5b;
}

.still .spot,
.still .note {
  animation: none;
}

.still .halo::before {
  animation: none;
  opacity: 0.6;
}

.still .halo::after {
  animation: none;
  opacity: 0;
}

.paused .spot,
.paused .halo::before,
.paused .halo::after,
.paused .note {
  animation-play-state: paused;
}

@container (width < 34rem) {
  .photoArea {
    aspect-ratio: 4 / 3;
  }

  .spot {
    inline-size: 52px;
    block-size: 52px;
    margin-block-start: -26px;
    margin-inline-start: -26px;
  }

  .pin::after {
    inline-size: 20px;
    block-size: 20px;
    margin-block-start: -10px;
    margin-inline-start: -10px;
  }

  .anchorRight,
  .anchorLeft {
    inset-inline-start: 12px;
    inset-inline-end: 12px;
    max-inline-size: none;
  }

  .anchorAbove,
  .anchorMid,
  .anchorBelow {
    inset-block-start: auto;
    inset-block-end: 12px;
    transform: none;
  }

  .note {
    max-block-size: 55cqi;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
}
```
