const e=`import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export interface BestsellerProduct {
  name: string;
  units: number;
  photo?: string;
}

export interface ImageFilledBestsellersProps {
  products?: BestsellerProduct[];
  numberShown?: number;
  unitLabel?: string;
  highlightColor?: string;
  heading?: string;
  rankLabel?: string;
  className?: string;
}

const Q = '?w=1200&h=360&fit=crop&auto=format&q=70';
const shot = (u: string) => u + Q;

export const defaultProducts: BestsellerProduct[] = [
  { name: 'Signature classic', units: 1284, photo: shot('https://images.unsplash.com/photo-1509440159596-0249088772ff') },
  { name: 'Customer favourite', units: 1032, photo: shot('https://images.unsplash.com/photo-1555507036-ab1f4038808a') },
  { name: 'Everyday essential', units: 846, photo: shot('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085') },
  { name: 'Seasonal special', units: 612, photo: shot('https://images.unsplash.com/photo-1565299624946-b28f40a0ae38') },
  { name: 'Starter pick', units: 438, photo: shot('https://images.unsplash.com/photo-1512621776951-a57141f2eefd') },
  { name: 'Limited edition', units: 297, photo: shot('https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445') },
];

type Phase = 'static' | 'armed' | 'play';

const MIN_FILL = 0.16;
const LIST_HELP = 'Hover or tap a bar to see the details; arrow keys, Home and End move between bars.';
const numberFormat = new Intl.NumberFormat('en-US');
const compactFormat = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const COMPACT_FROM = 100000;
const pad = (n: number) => String(n).padStart(2, '0');
const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default function ImageFilledBestsellers({
  products = defaultProducts,
  numberShown = 5,
  unitLabel = 'sold',
  highlightColor = '#d23a1b',
  heading = 'Best sellers',
  rankLabel = 'No.',
  className,
}: ImageFilledBestsellersProps) {
  const ranked = useMemo(
    () =>
      products
        .map((p) => ({ ...p, units: Math.max(0, Number(p.units) || 0) }))
        .sort((a, b) => b.units - a.units)
        .slice(0, Math.max(1, Math.round(numberShown))),
    [products, numberShown],
  );
  const top = ranked[0]?.units || 1;

  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState<Phase>('static');
  const [inView, setInView] = useState(true);
  const rootRef = useRef<HTMLElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  useIsoLayoutEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mq.matches) setPhase('armed');
    const sync = () => mq.matches && setPhase('static');
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setPhase((p) => (p === 'armed' ? 'play' : p));
      },
      { threshold: 0.2 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const current = Math.min(active, ranked.length - 1);

  const onKeyDown = (e: KeyboardEvent<HTMLOListElement>) => {
    const last = ranked.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(current + 1, last),
      ArrowRight: Math.min(current + 1, last),
      ArrowUp: Math.max(current - 1, 0),
      ArrowLeft: Math.max(current - 1, 0),
      Home: 0,
      End: last,
    };
    const next = moves[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setActive(next);
    buttons.current[next]?.focus();
  };

  const armed = phase === 'armed';
  const playing = phase === 'play';
  const rootStyle = { '--ifb-highlight': highlightColor } as CSSProperties;

  return (
    <section
      ref={rootRef}
      className={cx(styles.root, !inView && styles.paused, className)}
      style={rootStyle}
      aria-label={heading}
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>{heading}</h2>
          </div>

        </header>

        <ol className={styles.list} aria-description={LIST_HELP} onKeyDown={onKeyDown}>
          {ranked.map((product, i) => {
            const fill = Math.max(MIN_FILL, product.units / top);
            const count = numberFormat.format(product.units);
            const shortCount = product.units >= COMPACT_FROM ? compactFormat.format(product.units) : count;
            const rowStyle = {
              '--fill': fill.toFixed(4),
              '--i': i,
            } as CSSProperties;
            const isActive = i === current;
            return (
              <li key={\`\${product.name}-\${i}\`} className={cx(styles.row, i === 0 && styles.lead)} style={rowStyle}>
                <span className={cx(styles.rank, armed && styles.rankArmed, playing && styles.rankPlay)} aria-hidden="true">
                  {pad(i + 1)}
                </span>
                <button
                  ref={(el) => {
                    buttons.current[i] = el;
                  }}
                  type="button"
                  className={cx(styles.track, isActive && styles.trackActive)}
                  aria-current={isActive ? 'true' : undefined}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(i)}
                >
                  <span className={styles.srOnly}>
                    {rankLabel} {i + 1}, {product.name}, {count} {unitLabel}
                  </span>
                  <span className={styles.thumb} aria-hidden="true">
                    {product.photo ? (
                      <img className={styles.photo} src={product.photo} alt="" draggable={false} />
                    ) : (
                      <span className={styles.stripes} />
                    )}
                  </span>
                  <span className={styles.groove} aria-hidden="true" />
                  <span className={cx(styles.fill, armed && styles.fillArmed, playing && styles.fillPlay)} aria-hidden="true">
                    <span className={styles.reveal}>
                      {product.photo ? (
                        <img className={styles.photo} src={product.photo} alt="" draggable={false} />
                      ) : (
                        <span className={styles.stripes} />
                      )}
                      <span className={styles.scrim} />
                    </span>
                    <span className={cx(styles.edge, playing && styles.edgePlay)} />
                  </span>
                  <span className={cx(styles.name, armed && styles.lateArmed, playing && styles.namePlay)} aria-hidden="true">
                    {product.name}
                  </span>
                  <span className={cx(styles.tag, armed && styles.lateArmed, playing && styles.tagPlay)} aria-hidden="true">
                    <span className={styles.tagBody}>
                      <span className={styles.tagCount}>{shortCount}</span>
                      <span className={styles.tagUnit}>{unitLabel}</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
`;export{e as default};
