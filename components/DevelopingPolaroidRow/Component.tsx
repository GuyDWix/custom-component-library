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
