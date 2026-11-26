import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './Component.module.css';

export interface ReceiptItem {
  name: string;
  price?: number;
}

export interface ReceiptCardProps {
  title?: string;
  subtitle?: string;
  meta?: string;
  items?: ReceiptItem[];
  totalLabel?: string;
  currency?: string;
  footerNote?: string;
  ariaLabel?: string;
  className?: string;
}

export const defaultItems: ReceiptItem[] = [
  { name: 'Flat white', price: 4.2 },
  { name: 'Almond croissant', price: 3.8 },
  { name: 'Shakshuka for one', price: 11.5 },
  { name: 'Fresh orange juice', price: 4.6 },
  { name: 'Lemon poppyseed loaf', price: 3.4 },
];

const PRINT_MS = 2000;
const START_DELAY = 280;
const FEED_SHARE = 0.62;

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const money = (currency: string, n: number) => `${currency}${n.toFixed(2)}`;
const noise = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};

const easeOutBack = (p: number) => {
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
};

const barsFrom = (seed: string) =>
  Array.from({ length: 34 }, (_, i) => 1 + (((seed.charCodeAt(i % Math.max(seed.length, 1)) || 7) * (i + 3)) % 4));

export default function ReceiptCard({
  title = 'Corner Café',
  subtitle = '12 Linden Street · Open daily 7–4',
  meta = 'Table 4 · Order 0482 · 08:42',
  items = defaultItems,
  totalLabel = 'Total',
  currency = '$',
  footerNote = 'Thank you, come back soon!',
  ariaLabel = 'Receipt',
  className,
}: ReceiptCardProps) {
  const priced = items.filter((it) => typeof it.price === 'number');
  const total = priced.reduce((sum, it) => sum + (it.price ?? 0), 0);
  const bars = barsFrom(title + meta);

  const [reduced, setReduced] = useState(false);
  const [lifted, setLifted] = useState(false);
  const [printing, setPrinting] = useState(false);

  const rootRef = useRef<HTMLElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const feed = useRef({ elapsed: 0, last: 0, stops: [] as number[], bodyH: 0, started: false, done: false });
  const inView = useRef(false);
  const raf = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval>>();

  const measure = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;
    const rows = Array.from(body.querySelectorAll<HTMLElement>('[data-row]'));
    const f = feed.current;
    f.bodyH = body.offsetHeight;
    f.stops = rows.map((r) => r.offsetTop + r.offsetHeight + 6).concat(f.bodyH);
  }, []);

  const paint = useCallback(() => {
    const el = paperRef.current;
    if (!el) return;
    const f = feed.current;
    let revealed = f.bodyH;
    let shake = 0;
    let seed = 0;
    if (!f.done) {
      const n = f.stops.length;
      const stepMs = Math.min(Math.max(PRINT_MS / n, 70), 190);
      const t = f.elapsed - START_DELAY;
      const k = Math.floor(t / stepMs);
      if (t < 0) revealed = 0;
      else if (k < n) {
        const p = Math.min((t - k * stepMs) / (stepMs * FEED_SHARE), 1);
        const from = k > 0 ? f.stops[k - 1] : 0;
        revealed = from + (f.stops[k] - from) * easeOutBack(p);
        shake = Math.sin(Math.PI * p);
        seed = k * 7 + Math.floor(p * 5);
      }
    }
    el.style.setProperty('--rc-cut', `${Math.max(f.bodyH - revealed, 0).toFixed(2)}px`);
    el.style.setProperty('--rc-jx', `${(noise(seed) * 0.8 * shake).toFixed(2)}px`);
    el.style.setProperty('--rc-jr', `${(noise(seed + 3) * 0.16 * shake).toFixed(3)}deg`);
  }, []);

  const halt = useCallback(() => {
    cancelAnimationFrame(raf.current);
    clearInterval(timer.current);
    raf.current = 0;
    timer.current = undefined;
  }, []);

  const frame = useCallback(() => {
    const f = feed.current;
    const now = performance.now();
    if (!inView.current || f.done) return;
    f.elapsed += Math.min(now - f.last, 250);
    f.last = now;
    const stepMs = Math.min(Math.max(PRINT_MS / f.stops.length, 70), 190);
    if (f.elapsed >= START_DELAY + stepMs * f.stops.length) {
      f.done = true;
      halt();
      setPrinting(false);
    }
    paint();
  }, [halt, paint]);

  const run = useCallback(() => {
    const f = feed.current;
    if (raf.current || f.done || !f.started) return;
    f.last = performance.now();
    const loop = () => {
      frame();
      raf.current = feed.current.done ? 0 : requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    timer.current = setInterval(frame, 100);
  }, [frame]);

  useIsoLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    halt();
    measure();
    Object.assign(feed.current, { elapsed: 0, started: false, done: reduce });
    setReduced(reduce);
    setPrinting(false);
    paint();
    if (inView.current && !reduce) {
      feed.current.started = true;
      setPrinting(true);
      run();
    }
  }, [items, title, subtitle, meta, footerNote, halt, measure, paint, run]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setReduced(mq.matches);
      if (!mq.matches) return;
      halt();
      feed.current.done = true;
      setPrinting(false);
      paint();
    };
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [halt, paint]);

  useEffect(() => {
    const root = rootRef.current;
    const body = bodyRef.current;
    if (!root || !body) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        inView.current = entry.isIntersecting;
        const f = feed.current;
        if (f.done) return;
        if (!entry.isIntersecting) {
          halt();
          return;
        }
        if (!f.started) {
          f.started = true;
          setPrinting(true);
        }
        run();
      },
      { threshold: 0.2 },
    );
    io.observe(root);
    const ro = new ResizeObserver(() => {
      measure();
      paint();
    });
    ro.observe(body);
    return () => {
      io.disconnect();
      ro.disconnect();
      halt();
    };
  }, [halt, measure, paint, run]);

  return (
    <section
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
    >
      <span className={styles.light} aria-hidden="true" />
      <span className={styles.cork} aria-hidden="true" />

      <div className={styles.stack}>
        <div className={styles.printer} aria-hidden="true">
          <span className={printing ? `${styles.led} ${styles.ledOn}` : styles.led} />
          <span className={styles.slot} />
        </div>

        <div
          ref={paperRef}
          className={styles.paper}
          onPointerEnter={(e) => e.pointerType === 'mouse' && setLifted(true)}
          onPointerLeave={() => setLifted(false)}
        >
          <div ref={bodyRef} className={styles.body}>
            <span className={styles.paperGrain} aria-hidden="true" />
            <header className={styles.head}>
              {title && (
                <h3 className={styles.title} data-row="">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className={styles.sub} data-row="">
                  {subtitle}
                </p>
              )}
              {meta && (
                <p className={styles.sub} data-row="">
                  {meta}
                </p>
              )}
            </header>

            <span className={styles.rule} aria-hidden="true" />

            <ul className={styles.items}>
              {items.map((item, i) => (
                <li key={i} className={styles.item} data-row="">
                  <span className={styles.name}>{item.name}</span>
                  <span className={styles.leader} aria-hidden="true" />
                  {typeof item.price === 'number' && <span className={styles.price}>{money(currency, item.price)}</span>}
                </li>
              ))}
            </ul>

            {priced.length > 0 && (
              <>
                <span className={styles.ruleDouble} aria-hidden="true" />
                <p className={styles.total} data-row="">
                  <span className={styles.totalLabel}>{totalLabel}</span>
                  <span className={styles.totalValue}>{money(currency, total)}</span>
                </p>
              </>
            )}

            <span className={styles.rule} aria-hidden="true" />

            {footerNote && (
              <p className={styles.footer} data-row="">
                {footerNote}
              </p>
            )}
            <span className={styles.barcode} data-row="" aria-hidden="true">
              {bars.map((w, i) => (
                <span key={i} className={styles.bar} style={{ inlineSize: `${w}px`, marginInlineEnd: `${(w % 3) + 1}px` }} />
              ))}
            </span>
          </div>

          <div className={styles.tailSlot} aria-hidden="true">
            <span className={[styles.tail, reduced ? styles.tailFlat : lifted && styles.tailLifted].filter(Boolean).join(' ')} />
          </div>
        </div>
      </div>
    </section>
  );
}
