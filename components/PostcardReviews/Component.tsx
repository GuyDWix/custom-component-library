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
  const pathId = `${uid}-arc`;
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
          <textPath href={`#${pathId}`} startOffset="2%" textLength={Math.min(248, label.length * 15 + 20)} lengthAdjust="spacingAndGlyphs">
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
        <filter id={`${uid}-ink`} x="-10%" y="-10%" width="120%" height="120%">
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
            const backId = `${uid}-back-${i}`;
            const cardStyle = {
              '--i': i,
              '--tilt': `${tilt(i) * 0.9}deg`,
              '--nudge': `${nudge(i) * 3}px`,
              ...(isOpen ? { '--dx': `${geo.dx}px`, '--dy': `${geo.dy}px`, '--s': geo.s } : {}),
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
                      aria-label={`Postcard from ${r.name}, ${r.town}`}
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
                      <span className={styles.markFront} aria-hidden="true" style={{ filter: `url(#${uid}-ink)` }}>
                        <Postmark town={r.town} uid={`${uid}-f${i}`} />
                      </span>
                    </button>

                    <div
                      ref={(el) => (backRefs.current[i] = el)}
                      id={backId}
                      className={cx(styles.face, styles.back, isOpen && styles.backShown)}
                      role="group"
                      aria-label={`Postcard from ${r.name}, ${r.town}`}
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
                          <span className={styles.markBack} style={{ filter: `url(#${uid}-ink)` }}>
                            <Postmark town={r.town} uid={`${uid}-b${i}`} />
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
