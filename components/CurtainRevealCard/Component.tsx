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
