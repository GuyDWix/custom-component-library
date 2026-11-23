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
  pinColor?: string;
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
  pinColor = '#dc4b2f',
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
      style={{ '--hp-accent': pinColor } as CSSProperties}
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
