const n=`import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface PackageSliderStop {
  name: string;
  price: string;
  tagline?: string;
  items: string;
}

export interface PackageSliderCardProps {
  stops?: PackageSliderStop[];
  accentColor?: string;
  currencySymbol?: string;
  priceNote?: string;
  digitSize?: 'S' | 'M' | 'L';
  className?: string;
}

export const defaultStops: PackageSliderStop[] = [
  {
    name: 'Essentials',
    price: '120',
    tagline: 'Hems, cuffs and a sharp finish.',
    items: 'Hem and cuff adjustments\\nSteam press and finish',
  },
  {
    name: 'Tailored',
    price: '340',
    tagline: 'Your off-the-rack suit, made yours.',
    items: 'Hem and cuff adjustments\\nSteam press and finish\\nWaist and seat taken in\\nOne follow-up fitting',
  },
  {
    name: 'Made to Measure',
    price: '890',
    tagline: 'A new suit cut from your measurements.',
    items:
      'Hem and cuff adjustments\\nSteam press and finish\\nWaist and seat taken in\\nOne follow-up fitting\\n30-point measuring session\\nChoice of 40 cloths',
  },
  {
    name: 'Bespoke',
    price: '2400',
    tagline: 'Hand-cut pattern, hand-finished seams.',
    items:
      'Hem and cuff adjustments\\nSteam press and finish\\nWaist and seat taken in\\nOne follow-up fitting\\n30-point measuring session\\nChoice of 40 cloths\\nPaper pattern kept on file\\nHand-stitched buttonholes',
  },
];

const STIFFNESS = 320;
const DAMPING = 24;
const STAGGER_MS = 70;

const splitItems = (raw: string) =>
  raw
    .split(/\\n|;/)
    .map((s) => s.trim())
    .filter(Boolean);

const toNumber = (price: string) => {
  const clean = price.replace(/[\\s,]/g, '');
  return /^\\d+(\\.\\d+)?$/.test(clean) ? Number(clean) : null;
};

const formatPrice = (value: number, decimals: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const pad = (n: number) => String(n).padStart(2, '0');

const FACES = Array.from({ length: 10 }, (_, d) => d);

function OdometerColumn({ index, char }: { index: number; char: string | undefined }) {
  const last = useRef(0);
  const isDigit = char !== undefined && /\\d/.test(char);
  if (isDigit) last.current = Number(char);
  const kind = char === undefined ? 'off' : isDigit ? 'digit' : 'sep';
  return (
    <span
      className={styles.col}
      data-kind={kind}
      style={{ '--v': last.current, '--col': index } as CSSProperties}
    >
      <span className={styles.drum}>
        {FACES.map((d) => (
          <span key={d} className={styles.face} style={{ '--i': d } as CSSProperties}>
            {d}
          </span>
        ))}
      </span>
      <span className={styles.sep}>{kind === 'sep' ? char : ','}</span>
    </span>
  );
}

export default function PackageSliderCard({
  stops = defaultStops,
  accentColor = '#e2411c',
  currencySymbol = '$',
  priceNote = 'per garment',
  digitSize = 'L',
  className,
}: PackageSliderCardProps) {
  const count = stops.length;
  const startIndex = Math.min(1, Math.max(0, count - 1));
  const [sel, setSel] = useState({ cur: startIndex, prev: startIndex });
  const [dragging, setDragging] = useState(false);
  const [reduced, setReduced] = useState(false);
  const uid = useId();

  const active = Math.min(sel.cur, Math.max(0, count - 1));
  const stop = stops[active];
  const stopPos = useCallback((i: number) => (i + 0.5) / Math.max(1, count), [count]);

  const rootRef = useRef<HTMLDivElement>(null);
  const tapeRef = useRef<HTMLDivElement>(null);
  const inView = useRef(true);
  const spring = useRef({ pos: stopPos(startIndex), vel: 0, goal: stopPos(startIndex), drag: false, raf: 0 });

  const paint = useCallback(() => {
    tapeRef.current?.style.setProperty('--pos', spring.current.pos.toFixed(4));
  }, []);

  const run = useCallback(() => {
    const s = spring.current;
    if (s.raf) return;
    if (reduced || !inView.current) {
      s.pos = s.goal;
      s.vel = 0;
      paint();
      return;
    }
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let n = 0; n < steps; n++) {
        const k = s.drag ? STIFFNESS * 3 : STIFFNESS;
        const d = s.drag ? DAMPING * 1.8 : DAMPING;
        s.vel += (k * (s.goal - s.pos) - d * s.vel) * h;
        s.pos += s.vel * h;
      }
      paint();
      if (!s.drag && Math.abs(s.goal - s.pos) < 0.0004 && Math.abs(s.vel) < 0.002) {
        s.pos = s.goal;
        s.vel = 0;
        paint();
        s.raf = 0;
        return;
      }
      s.raf = requestAnimationFrame(loop);
    };
    s.raf = requestAnimationFrame(loop);
  }, [reduced, paint]);

  const select = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(count - 1, i));
      setSel((s) => (s.cur === next ? s : { cur: next, prev: s.cur }));
      spring.current.goal = stopPos(next);
      run();
    },
    [count, stopPos, run],
  );

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
    const io = new IntersectionObserver(([e]) => {
      inView.current = e.isIntersecting;
    });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const s = spring.current;
    cancelAnimationFrame(s.raf);
    s.raf = 0;
    s.goal = stopPos(active);
    s.pos = s.goal;
    s.vel = 0;
    paint();
  }, [count, stopPos, paint]);

  useEffect(() => () => cancelAnimationFrame(spring.current.raf), []);

  const target = toNumber(stop?.price ?? '');
  const decimals = target !== null && !Number.isInteger(target) ? 2 : 0;
  const maxCols = useMemo(
    () =>
      stops.reduce((m, st) => {
        const n = toNumber(st.price);
        return n === null ? m : Math.max(m, formatPrice(n, Number.isInteger(n) ? 0 : 2).length);
      }, 1),
    [stops],
  );

  const allItems = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    stops.forEach((s) =>
      splitItems(s.items).forEach((item) => {
        const key = item.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          out.push(item);
        }
      }),
    );
    return out;
  }, [stops]);

  const includedIn = useCallback(
    (i: number) => new Set(splitItems(stops[i]?.items ?? '').map((s) => s.toLowerCase())),
    [stops],
  );
  const now = includedIn(active);
  const before = includedIn(sel.prev);
  const changed = allItems.filter((item) => now.has(item.toLowerCase()) !== before.has(item.toLowerCase()));

  const posFromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const x = rtl ? rect.right - e.clientX : e.clientX - rect.left;
    return Math.max(stopPos(0), Math.min(stopPos(count - 1), x / rect.width));
  };

  const nearest = (pos: number) => Math.round(pos * count - 0.5);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus({ preventScroll: true });
    const pos = posFromPointer(e);
    const s = spring.current;
    s.drag = true;
    s.goal = pos;
    setDragging(true);
    const i = nearest(pos);
    setSel((v) => (v.cur === i ? v : { cur: i, prev: v.cur }));
    run();
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!spring.current.drag) return;
    const pos = posFromPointer(e);
    spring.current.goal = pos;
    const i = nearest(pos);
    setSel((v) => (v.cur === i ? v : { cur: i, prev: v.cur }));
    run();
  };

  const onPointerEnd = () => {
    const s = spring.current;
    if (!s.drag) return;
    s.drag = false;
    setDragging(false);
    select(nearest(s.goal));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const moves: Record<string, number> = {
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
      ArrowUp: 1,
      ArrowDown: -1,
      PageUp: 1,
      PageDown: -1,
    };
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      select(e.key === 'Home' ? 0 : count - 1);
      return;
    }
    const move = moves[e.key];
    if (move === undefined) return;
    e.preventDefault();
    select(active + move);
  };

  if (!stop) return null;

  const priceText = target === null ? stop.price : formatPrice(target, decimals);
  const fitLength = target === null ? stop.price.length : priceText.length;
  const rootStyle = { '--ps-accent': accentColor } as CSSProperties;
  const tapeStyle = { '--pos': stopPos(active) } as CSSProperties;
  const valueText = \`\${stop.name}, \${target === null ? stop.price : \`\${currencySymbol}\${priceText}\`}\`;

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <div className={styles.inner}>
        <div className={styles.measure}>
          <p className={styles.topline} aria-hidden="true">
            <span>Package</span>
            <span>
              {pad(active + 1)} / {pad(count)}
            </span>
          </p>
          <div
            ref={tapeRef}
            className={styles.tape}
            style={tapeStyle}
            data-dragging={dragging || undefined}
            role="slider"
            tabIndex={0}
            aria-label="Choose a package"
            aria-valuemin={1}
            aria-valuemax={count}
            aria-valuenow={active + 1}
            aria-valuetext={valueText}
            aria-controls={\`\${uid}-card\`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onKeyDown={onKeyDown}
          >
            <span className={styles.track} aria-hidden="true" />
            <span className={styles.fill} aria-hidden="true" />
            {stops.map((_, i) => (
              <span
                key={i}
                className={styles.stopMark}
                data-on={i <= active || undefined}
                style={{ insetInlineStart: \`\${stopPos(i) * 100}%\` }}
                aria-hidden="true"
              />
            ))}
            <span className={styles.thumb} aria-hidden="true" />
          </div>

          <div className={styles.labels} style={{ gridTemplateColumns: \`repeat(\${count}, minmax(0, 1fr))\` }}>
            {stops.map((s, i) => (
              <button
                key={i}
                type="button"
                className={styles.label}
                data-on={i === active || undefined}
                tabIndex={-1}
                aria-hidden="true"
                onClick={() => select(i)}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <article id={\`\${uid}-card\`} className={styles.card}>
          <p
            className={styles.priceRow}
            data-size={digitSize}
            style={{ '--len': fitLength, '--cur': currencySymbol.trim().length } as CSSProperties}
          >
            <span className={styles.lockup}>
              {target !== null && (
                <span className={styles.currency} aria-hidden="true">
                  {currencySymbol.trim()}
                </span>
              )}
              {target === null ? (
                <span className={styles.price}>{priceText}</span>
              ) : (
                <span className={styles.odometer} aria-hidden="true">
                  {Array.from({ length: maxCols }, (_, k) => maxCols - 1 - k).map((j) => (
                    <OdometerColumn key={j} index={j} char={priceText[priceText.length - 1 - j]} />
                  ))}
                </span>
              )}
            </span>
            {target !== null && <span className={styles.srOnly}>{\`\${currencySymbol}\${priceText}\`}</span>}
            {target !== null && priceNote && (
              <span className={styles.noteWrap}>
                <span className={styles.priceNote}>{priceNote}</span>
              </span>
            )}
          </p>

          <div className={styles.cols}>
            <div className={styles.head}>
              <h3 key={stop.name} className={styles.name}>
                {stop.name}
              </h3>
              {stop.tagline && (
                <p key={\`\${active}-t\`} className={styles.tagline}>
                  {stop.tagline}
                </p>
              )}
            </div>

            {allItems.length > 0 && (
              <ul className={styles.items}>
                {allItems.map((item) => {
                  const on = now.has(item.toLowerCase());
                  const rank = changed.indexOf(item);
                  const delay = rank < 0 || reduced ? 0 : (on ? rank : changed.length - 1 - rank) * STAGGER_MS;
                  return (
                    <li
                      key={item}
                      className={styles.item}
                      data-on={on || undefined}
                      style={{ '--d': \`\${delay}ms\` } as CSSProperties}
                    >
                      <span className={styles.itemText}>{item}</span>
                      <span className={styles.mark} aria-hidden="true" />
                      <span className={styles.srOnly}>{on ? ', included' : ', not included'}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
`;export{n as default};
