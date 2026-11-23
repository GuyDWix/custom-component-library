import { useId, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export interface LogoSpotlightWallLogo {
  image?: string;
  name: string;
  result?: string;
}

export interface LogoSpotlightWallProps {
  logos?: LogoSpotlightWallLogo[];
  heading?: string;
  grayscale?: boolean;
  columns?: number;
  accentColor?: string;
  className?: string;
}

export const defaultLogos: LogoSpotlightWallLogo[] = [
  { name: 'Northwind', result: '+38% demo requests' },
  { name: 'HALCYON', result: 'Checkout time cut in half' },
  { name: 'ferro&vale', result: '2.4× repeat orders' },
  { name: 'Kestrel', result: '£1.2M new pipeline' },
  { name: 'Marlow', result: 'Bookings up 61% in Q2' },
  { name: 'ATLAS FREIGHT', result: '19 days faster onboarding' },
  { name: 'Quarry', result: 'Support tickets down 44%' },
  { name: 'Sable & Co.', result: 'Launched in 9 markets' },
  { name: 'lumen/labs', result: '4.9★ from 3,200 reviews' },
  { name: 'Brightwater', result: '+27% average basket' },
  { name: 'ORBIT', result: 'Churn halved in a year' },
  { name: 'Tessellate', result: '3× organic sign-ups' },
];

const WORDMARK_STYLES = [
  styles.wmSerif,
  styles.wmWide,
  styles.wmMono,
  styles.wmHeavy,
  styles.wmCaps,
  styles.wmLight,
];

const STEP_MS = 24;
const MAX_DELAY_MS = 140;
const WALL_HELP = 'Hover, focus or tap a logo to see the result for that client. Arrow keys move between logos.';

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

export default function LogoSpotlightWall({
  logos = defaultLogos,
  heading = 'Clients we have moved the needle for',
  grayscale = true,
  columns = 4,
  accentColor = '#b0673a',
  className,
}: LogoSpotlightWallProps) {
  const uid = useId();
  const headingId = `${uid}-heading`;
  const listRef = useRef<HTMLUListElement>(null);
  const liveCols = useRef(columns);
  const [hover, setHover] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const pickedOnPress = useRef(false);

  const cols = Math.max(1, Math.min(8, Math.round(columns) || 4));
  const active = hover ?? picked;
  const current = active !== null ? logos[active] : undefined;

  const measureCols = () => {
    const list = listRef.current;
    if (!list) return;
    liveCols.current = getComputedStyle(list).gridTemplateColumns.split(' ').filter(Boolean).length || cols;
  };

  const activate = (i: number, by: 'hover' | 'pick') => {
    measureCols();
    if (by === 'hover') setHover(i);
    else setPicked(i);
  };

  const buttons = () => Array.from(listRef.current?.querySelectorAll('button') ?? []);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const c = liveCols.current;
    const last = logos.length - 1;
    const moves: Record<string, number> = {
      ArrowRight: i + 1,
      ArrowLeft: i - 1,
      ArrowDown: i + c,
      ArrowUp: i - c,
      Home: 0,
      End: last,
    };
    if (e.key === 'Escape') {
      setPicked(null);
      e.currentTarget.blur();
      return;
    }
    const to = moves[e.key];
    if (to === undefined) return;
    e.preventDefault();
    buttons()[Math.max(0, Math.min(last, to))]?.focus();
  };

  const onListBlur = (e: FocusEvent<HTMLUListElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPicked(null);
  };

  const delayFor = (i: number) => {
    if (active === null) return 0;
    const c = liveCols.current || cols;
    const d = Math.max(Math.abs((i % c) - (active % c)), Math.abs(Math.floor(i / c) - Math.floor(active / c)));
    return Math.min(MAX_DELAY_MS, d * STEP_MS);
  };

  const rootStyle = {
    '--lsw-accent': accentColor,
    '--lsw-cols': cols,
    '--lsw-cols-narrow': Math.min(cols, 3),
  } as CSSProperties;

  return (
    <section
      className={cx(styles.root, className)}
      style={rootStyle}
      aria-labelledby={heading ? headingId : undefined}
      aria-label={heading ? undefined : 'Client logos'}
    >
      <span className={styles.mottle} aria-hidden="true" />
      <span className={styles.light} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />

      {heading && (
        <h2 id={headingId} className={styles.heading}>
          {heading}
        </h2>
      )}

      <ul
        ref={listRef}
        className={styles.grid}
        aria-description={WALL_HELP}
        onPointerLeave={() => setHover(null)}
        onBlur={onListBlur}
      >
        {logos.map((logo, i) => {
          const on = active === i;
          const off = active !== null && !on;
          const resultId = `${uid}-r${i}`;
          const tileStyle = { '--lsw-delay': `${delayFor(i)}ms` } as CSSProperties;
          return (
            <li key={i} className={styles.cell} style={tileStyle}>
              <button
                type="button"
                className={cx(styles.tile, on && styles.tileOn, off && styles.tileOff)}
                aria-describedby={logo.result ? resultId : undefined}
                aria-current={on ? 'true' : undefined}
                onPointerEnter={(e) => e.pointerType === 'mouse' && activate(i, 'hover')}
                onPointerDown={() => (pickedOnPress.current = picked === i)}
                onFocus={() => activate(i, 'pick')}
                onClick={(e) => {
                  const wasPicked = e.detail === 0 ? picked === i : pickedOnPress.current;
                  if (wasPicked && hover === null) setPicked(null);
                  else activate(i, 'pick');
                }}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                <span className={cx(styles.mark, on && styles.markOn)}>
                  {logo.image ? (
                    <img
                      className={cx(styles.logo, grayscale && styles.logoMono, on && styles.logoOn)}
                      src={logo.image}
                      alt={logo.name}
                      loading="lazy"
                      draggable={false}
                    />
                  ) : (
                    <span className={cx(styles.wordmark, WORDMARK_STYLES[i % WORDMARK_STYLES.length])}>
                      {logo.name}
                    </span>
                  )}
                </span>
                <span className={cx(styles.underline, on && styles.underlineOn)} aria-hidden="true" />
                {logo.result && (
                  <span id={resultId} className={cx(styles.result, on && styles.resultOn)}>
                    {logo.result}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className={styles.readout} aria-hidden="true">
        {current && (
          <p key={active} className={styles.readoutLine}>
            <span className={styles.readoutName}>{current.name}</span>
            {current.result && <span className={styles.readoutResult}>{current.result}</span>}
          </p>
        )}
      </div>
    </section>
  );
}
