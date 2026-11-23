import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, PointerEvent as ReactPointerEvent } from 'react';
import styles from './Component.module.css';

export type Quote = {
  text: string;
  name: string;
  role?: string;
  photo?: string;
  rating?: number;
};

export type QuoteMarqueeProps = {
  quotes?: Quote[];
  /** Glide speed in pixels per second. */
  speed?: number;
  direction?: 'left' | 'right';
  rows?: 1 | 2;
  accentColor?: string;
  autoPlay?: boolean;
  label?: string;
  pauseLabel?: string;
  playLabel?: string;
  ratingLabel?: string;
  className?: string;
};

type Active = { row: number; copy: number; index: number; via: 'hover' | 'focus' };
type RowMotion = { offset: number; v: number; aim: number | null; drag: { x: number; t: number } | null };

const DEFAULT_QUOTES: Quote[] = [
  {
    text: 'We switched on a Tuesday and by Friday our front desk had stopped answering the same five questions. It just quietly works.',
    name: 'Maya Lindqvist',
    role: 'Owner, Lindqvist Physio',
    photo: 'https://i.pravatar.cc/160?img=47',
    rating: 5,
  },
  {
    text: 'Bookings up 38% in the first quarter. I did not expect software to feel this considered.',
    name: 'Daniel Okafor',
    role: 'Founder, Northline Studio',
    photo: 'https://i.pravatar.cc/160?img=12',
    rating: 5,
  },
  {
    text: 'My students find the course, pay, and start the first lesson without ever emailing me. That alone gave me my evenings back.',
    name: 'Priya Raman',
    role: 'Yoga teacher & course creator',
    photo: 'https://i.pravatar.cc/160?img=32',
    rating: 5,
  },
  {
    text: 'The support team replied in eleven minutes. On a Sunday.',
    name: 'Tomás Herrera',
    role: 'Head of Ops, Casa Verde',
    photo: 'https://i.pravatar.cc/160?img=59',
    rating: 4,
  },
  {
    text: 'Our shop finally looks like the brand we had in our heads. Customers keep telling us how easy checkout is.',
    name: 'Hannah Becker',
    role: 'Co-owner, Field & Fern',
    photo: 'https://i.pravatar.cc/160?img=44',
    rating: 5,
  },
  {
    text: 'Clean, fast, and it never gets in the way. Exactly what a small team needs.',
    name: 'Kenji Watanabe',
    role: 'CTO, Tidewater Apps',
    photo: 'https://i.pravatar.cc/160?img=68',
    rating: 5,
  },
];

const STAR_PATH = 'M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.3L12 16.9 6.3 20l1.2-6.3-4.7-4.4 6.4-.8z';
const REST_TILT = [-0.9, 0.6, -0.4, 0.8, -0.7, 0.5];
const MIN_COPIES = 4;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function Stars({ value, label }: { value: number; label: string }) {
  const rating = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div className={styles.stars} role="img" aria-label={`${rating} ${label}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} className={i < rating ? styles.starOn : styles.starOff} viewBox="0 0 24 24" aria-hidden="true">
          <path d={STAR_PATH} />
        </svg>
      ))}
    </div>
  );
}

export default function QuoteMarquee({
  quotes = DEFAULT_QUOTES,
  speed = 36,
  direction = 'left',
  rows = 1,
  accentColor = '#e4572e',
  autoPlay = true,
  label = 'What our customers say',
  pauseLabel = 'Pause quotes',
  playLabel = 'Play quotes',
  ratingLabel = 'out of 5 stars',
  className,
}: QuoteMarqueeProps) {
  const [reduced, setReduced] = useState(false);
  const [playing, setPlaying] = useState(autoPlay);
  const [active, setActive] = useState<Active | null>(null);
  const [copies, setCopies] = useState(MIN_COPIES);

  const rootRef = useRef<HTMLElement>(null);
  const viewportRefs = useRef<(HTMLDivElement | null)[]>([]);
  const trackRefs = useRef<(HTMLDivElement | null)[]>([]);
  const motion = useRef<RowMotion[]>([0, 1].map(() => ({ offset: 0, v: 0, aim: null, drag: null })));
  const geometry = useRef({ setW: 0, vw: 0 });
  const live = useRef({ playing, activeRow: -1, visible: true, speed, direction });

  live.current.playing = playing;
  live.current.activeRow = active?.row ?? -1;
  live.current.speed = speed;
  live.current.direction = direction;

  const rowCount = reduced ? 1 : rows;
  const copyCount = reduced ? 1 : copies;
  const focusCopy = reduced ? 0 : 1;

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;

    const measure = () => {
      const set = trackRefs.current[0]?.firstElementChild as HTMLElement | null;
      const vw = viewportRefs.current[0]?.clientWidth ?? 0;
      if (!set || !set.offsetWidth) return;
      const setW = set.offsetWidth;
      const isFirst = geometry.current.setW === 0;
      geometry.current = { setW, vw };
      if (isFirst) motion.current.forEach((m, r) => (m.offset = -setW * (r === 0 ? 1 : 1.5)));
      setCopies(Math.max(MIN_COPIES, Math.ceil(vw / setW) + 3));
    };

    const resize = new ResizeObserver(measure);
    resize.observe(root);
    const firstSet = trackRefs.current[0]?.firstElementChild;
    if (firstSet) resize.observe(firstSet);

    const seen = new IntersectionObserver(([entry]) => (live.current.visible = entry.isIntersecting));
    seen.observe(root);

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { setW } = geometry.current;
      const state = live.current;
      if (state.visible && setW) {
        motion.current.forEach((m, r) => {
          const track = trackRefs.current[r];
          if (!track) return;
          if (m.aim !== null) {
            m.offset += (m.aim - m.offset) * (1 - Math.exp(-dt * 7));
            m.v = 0;
          } else {
            if (!m.drag) {
              const sign = (state.direction === 'left' ? -1 : 1) * (r === 1 ? -1 : 1);
              const target = state.playing && state.activeRow !== r ? state.speed * sign : 0;
              m.v += (target - m.v) * (1 - Math.exp(-dt * 2.4));
              m.offset += m.v * dt;
            }
            while (m.offset > -setW) m.offset -= setW;
            while (m.offset <= -2 * setW) m.offset += setW;
          }
          track.style.transform = `translate3d(${m.offset.toFixed(2)}px,0,0)`;
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      seen.disconnect();
    };
  }, [reduced, rows, quotes]);

  const startDrag = (row: number) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduced || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const m = motion.current[row];
    m.drag = { x: e.clientX, t: e.timeStamp };
    m.aim = null;
    m.v = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveDrag = (row: number) => (e: ReactPointerEvent<HTMLDivElement>) => {
    const m = motion.current[row];
    if (!m.drag) return;
    const dx = e.clientX - m.drag.x;
    const dt = Math.max(1, e.timeStamp - m.drag.t);
    m.offset += dx;
    m.v = m.v * 0.5 + (dx / dt) * 1000 * 0.5;
    m.drag = { x: e.clientX, t: e.timeStamp };
  };

  const endDrag = (row: number) => () => {
    const m = motion.current[row];
    if (!m.drag) return;
    m.drag = null;
    m.v = Math.max(-2400, Math.min(2400, m.v));
  };

  const tiltCard = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    card.style.setProperty('--tx', ((e.clientX - box.left) / box.width - 0.5).toFixed(3));
    card.style.setProperty('--ty', ((e.clientY - box.top) / box.height - 0.5).toFixed(3));
  };

  const releaseCard = (e: ReactPointerEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty('--tx', '0');
    e.currentTarget.style.setProperty('--ty', '0');
    setActive((current) => (current?.via === 'hover' ? null : current));
  };

  const focusCard = (row: number, index: number) => (e: FocusEvent<HTMLElement>) => {
    const viewport = viewportRefs.current[row];
    if (viewport) viewport.scrollLeft = 0;
    if (reduced) {
      setActive({ row, copy: 0, index, via: 'focus' });
      return;
    }
    const card = e.currentTarget;
    const set = card.parentElement as HTMLElement;
    const { setW, vw } = geometry.current;
    const m = motion.current[row];
    const inSet = card.offsetLeft - set.offsetLeft + card.offsetWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    for (let c = 0; c < copyCount; c++) {
      const dist = Math.abs(m.offset + c * setW + inSet - vw / 2);
      if (dist < bestDist) [best, bestDist] = [c, dist];
    }
    m.aim = m.offset + vw / 2 - (m.offset + best * setW + inSet);
    setActive({ row, copy: best, index, via: 'focus' });
  };

  const blurCard = (row: number) => () => {
    motion.current[row].aim = null;
    setActive((current) => (current?.via === 'focus' ? null : current));
  };

  const rootStyle = { '--qm-accent': accentColor } as CSSProperties;
  const rootClass = [styles.root, className].filter(Boolean).join(' ');

  return (
    <section ref={rootRef} className={rootClass} style={rootStyle} aria-label={label}>
      {!reduced && (
        <button
          type="button"
          className={styles.pause}
          aria-label={playing ? pauseLabel : playLabel}
          aria-pressed={!playing}
          onClick={() => setPlaying((p) => !p)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.pauseIcon}>
            {playing ? <path d="M8 5.5h2.6v13H8zM13.4 5.5H16v13h-2.6z" /> : <path d="M8.5 5.2v13.6L19 12z" />}
          </svg>
        </button>
      )}

      <div className={styles.rows}>
        {Array.from({ length: rowCount }, (_, row) => {
          const ordered = row === 1 ? [...quotes].reverse() : quotes;
          const rowActive = active?.row === row;
          return (
            <div
              key={row}
              ref={(el) => (viewportRefs.current[row] = el)}
              className={reduced ? styles.viewportStatic : row === 1 ? styles.viewportSecondary : styles.viewport}
              style={{ '--dim': rowActive ? 1 : 0 } as CSSProperties}
              onPointerDown={startDrag(row)}
              onPointerMove={moveDrag(row)}
              onPointerUp={endDrag(row)}
              onPointerCancel={endDrag(row)}
              onScroll={reduced ? undefined : (e) => (e.currentTarget.scrollLeft = 0)}
            >
              <div ref={(el) => (trackRefs.current[row] = el)} className={reduced ? styles.trackStatic : styles.track}>
                {Array.from({ length: copyCount }, (_, copy) => {
                  const focusable = copy === focusCopy;
                  return (
                    <div key={copy} className={styles.set} aria-hidden={focusable ? undefined : true}>
                      {ordered.map((quote, index) => {
                        const isActive = rowActive && active?.copy === copy && active.index === index;
                        const night = (index + row * 2) % 4 === 1;
                        const cardStyle = {
                          '--lift': isActive ? 1 : 0,
                          '--ring': isActive && active?.via === 'focus' ? 1 : 0,
                          '--rest': REST_TILT[(index + row * 3) % REST_TILT.length],
                        } as CSSProperties;
                        return (
                          <figure
                            key={index}
                            className={`${styles.card} ${night ? styles.toneNight : styles.tonePaper}`}
                            style={cardStyle}
                            tabIndex={focusable ? 0 : -1}
                            onPointerEnter={(e) => e.pointerType === 'mouse' && setActive({ row, copy, index, via: 'hover' })}
                            onPointerMove={tiltCard}
                            onPointerLeave={releaseCard}
                            onFocus={focusable ? focusCard(row, index) : undefined}
                            onBlur={focusable ? blurCard(row) : undefined}
                          >
                            <div className={styles.sheen} aria-hidden="true" />
                            <div className={styles.cardHead}>
                              <span className={styles.mark} aria-hidden="true">
                                &ldquo;
                              </span>
                              {quote.rating ? <Stars value={quote.rating} label={ratingLabel} /> : null}
                            </div>
                            <blockquote className={styles.quote}>{quote.text}</blockquote>
                            <figcaption className={styles.person}>
                              {quote.photo ? (
                                <img className={styles.avatar} src={quote.photo} alt="" draggable={false} loading="lazy" />
                              ) : (
                                <span className={styles.monogram} aria-hidden="true">
                                  {initials(quote.name)}
                                </span>
                              )}
                              <span className={styles.who}>
                                <span className={styles.name}>{quote.name}</span>
                                {quote.role ? <span className={styles.role}>{quote.role}</span> : null}
                              </span>
                            </figcaption>
                          </figure>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
