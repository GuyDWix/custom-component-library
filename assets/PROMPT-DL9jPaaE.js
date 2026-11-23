const n=`Create a custom element called "Receipt Card". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: title, address line, order details line, line items (name, price), total label, currency symbol, footer note, paper tint, ink color, background color. Add other settings if they help.

\`\`\`tsx
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
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
  paperTint?: string;
  inkColor?: string;
  groundColor?: string;
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

const money = (currency: string, n: number) => \`\${currency}\${n.toFixed(2)}\`;
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
  paperTint = '#fbf8f1',
  inkColor = '#34312c',
  groundColor = '#b8875a',
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
    el.style.setProperty('--rc-cut', \`\${Math.max(f.bodyH - revealed, 0).toFixed(2)}px\`);
    el.style.setProperty('--rc-jx', \`\${(noise(seed) * 0.8 * shake).toFixed(2)}px\`);
    el.style.setProperty('--rc-jr', \`\${(noise(seed + 3) * 0.16 * shake).toFixed(3)}deg\`);
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

  const rootStyle = {
    '--rc-paper': paperTint,
    '--rc-ink': inkColor,
    '--rc-ground': groundColor,
  } as CSSProperties;

  return (
    <section
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
      aria-label={ariaLabel}
    >
      <span className={styles.light} aria-hidden="true" />
      <span className={styles.cork} aria-hidden="true" />

      <div className={styles.stack}>
        <div className={styles.printer} aria-hidden="true">
          <span className={printing ? \`\${styles.led} \${styles.ledOn}\` : styles.led} />
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
                <span key={i} className={styles.bar} style={{ inlineSize: \`\${w}px\`, marginInlineEnd: \`\${(w % 3) + 1}px\` }} />
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
\`\`\`

\`\`\`css
.root {
  --rc-paper: #fbf8f1;
  --rc-ink: #34312c;
  --rc-ground: #b8875a;
  --rc-printer: #2b2926;
  --rc-led: #7fe08a;
  --rc-font: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  --rc-width: 340px;
  --rc-cork-dark: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='230' height='230'><filter id='c' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='.42' numOctaves='2' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .3  0 0 0 0 .16  0 0 0 0 .06  -7 0 0 0 2.66'/></filter><rect width='100%' height='100%' filter='url(%23c)'/></svg>");
  --rc-cork-light: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='170' height='170'><filter id='l' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='1' seed='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 .9  0 0 0 0 .74  7 0 0 0 -4.48'/></filter><rect width='100%' height='100%' filter='url(%23l)'/></svg>");
  --rc-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: 0 56px;
  padding-inline: 20px;
  background: var(--rc-ground);
  color: var(--rc-ink);
  font-family: var(--rc-font);
  border-radius: 28px;
  box-shadow: inset 0 0 0 1px rgba(60, 35, 12, 0.18), inset 0 -40px 80px rgba(60, 32, 10, 0.22);
}

.light,
.cork {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
}

.light {
  background:
    radial-gradient(60% 70% at 28% 0%, rgba(255, 236, 205, 0.55) 0%, transparent 70%),
    radial-gradient(90% 80% at 50% 120%, rgba(70, 38, 12, 0.35) 0%, transparent 70%);
}

.cork {
  background-image: var(--rc-cork-light), var(--rc-cork-dark), var(--rc-noise);
  background-size: 170px 170px, 230px 230px, 160px 160px;
  opacity: 0.7;
}

.stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  inline-size: min(100%, var(--rc-width));
  margin-inline: auto;
}

.printer {
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  inline-size: calc(100% + 28px);
  max-inline-size: calc(100cqi + 24px);
  block-size: 38px;
  border-end-start-radius: 14px;
  border-end-end-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.14) 62%, rgba(0, 0, 0, 0.25) 100%),
    var(--rc-printer);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.12) inset,
    0 14px 24px -10px rgba(40, 20, 4, 0.6),
    0 2px 3px rgba(40, 20, 4, 0.35);
}

.slot {
  position: absolute;
  inset-inline: 10px;
  inset-block-end: 8px;
  block-size: 5px;
  border-radius: 3px;
  background: #0d0c0b;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.16), inset 0 1px 2px rgba(0, 0, 0, 0.9);
}

.led {
  position: absolute;
  inset-block-start: 9px;
  inset-inline-end: 16px;
  inline-size: 6px;
  block-size: 6px;
  border-radius: 50%;
  background: #4c5a4c;
  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.5);
  transition: background-color 300ms ease, box-shadow 300ms ease;
}

.ledOn {
  background: var(--rc-led);
  box-shadow: 0 0 8px 1px var(--rc-led);
  animation: blink 520ms ease-in-out infinite alternate;
}

.paper {
  --rc-cut: 0px;
  --rc-jx: 0px;
  --rc-jr: 0deg;

  position: relative;
  z-index: 1;
  inline-size: 100%;
  margin-block-start: -14px;
  transform: translateX(var(--rc-jx)) rotate(var(--rc-jr));
  transform-origin: 50% 0;
  clip-path: inset(0 -80px -120px -80px);
  filter: drop-shadow(0 2px 1.5px rgba(50, 26, 6, 0.28)) drop-shadow(0 18px 22px rgba(50, 26, 6, 0.32));
}

.body {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding-block: 34px 6px;
  padding-inline: 26px;
  background:
    linear-gradient(90deg, rgba(196, 160, 96, 0.14) 0%, transparent 9%, transparent 91%, rgba(196, 160, 96, 0.14) 100%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.07) 0, transparent 26px),
    radial-gradient(120% 40% at 100% 0%, rgba(214, 186, 128, 0.16) 0%, transparent 70%),
    var(--rc-paper);
  clip-path: inset(0 0 var(--rc-cut) 0);
}

.paperGrain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(90deg, transparent 0 41px, rgba(255, 255, 255, 0.55) 41px 42px, transparent 42px 67px, rgba(160, 140, 110, 0.12) 67px 68px),
    var(--rc-noise);
  background-size: auto, 160px 160px;
  mix-blend-mode: multiply;
  opacity: 0.2;
}

.head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
}

.title {
  margin: 0 0 6px;
  font-size: 26px;
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  text-wrap: balance;
  overflow-wrap: anywhere;
  text-shadow: 0 0 0.6px var(--rc-ink);
}

.sub {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  letter-spacing: 0.02em;
  opacity: 0.78;
  overflow-wrap: anywhere;
}

.rule,
.ruleDouble {
  display: block;
  block-size: 0;
  margin-block: 16px;
  border-block-start: 1.5px dashed color-mix(in srgb, var(--rc-ink) 55%, transparent);
}

.ruleDouble {
  block-size: 3px;
  margin-block: 14px 10px;
  border-block-end: 1.5px dashed color-mix(in srgb, var(--rc-ink) 55%, transparent);
}

.items {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 15px;
  line-height: 1.35;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 0.5px var(--rc-ink);
}

.name {
  flex: 0 1 auto;
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.leader {
  flex: 1 1 14px;
  min-inline-size: 14px;
  align-self: flex-end;
  margin-block-end: 0.32em;
  border-block-end: 2px dotted color-mix(in srgb, var(--rc-ink) 38%, transparent);
}

.price {
  flex: none;
  font-weight: 600;
}

.total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 0.6px var(--rc-ink);
}

.totalLabel {
  min-inline-size: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.totalValue {
  flex: none;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.footer {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  text-align: center;
  letter-spacing: 0.04em;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.barcode {
  display: flex;
  justify-content: center;
  block-size: 38px;
  margin-block: 16px 4px;
  opacity: 0.82;
}

.bar {
  display: block;
  flex: none;
  background: var(--rc-ink);
}

.tailSlot {
  transform: translateY(calc(var(--rc-cut) * -1));
}

.tail {
  display: block;
  block-size: 30px;
  background:
    linear-gradient(90deg, rgba(196, 160, 96, 0.14) 0%, transparent 9%, transparent 91%, rgba(196, 160, 96, 0.14) 100%),
    linear-gradient(180deg, transparent 20%, rgba(255, 255, 255, 0.35) 55%, rgba(150, 118, 70, 0.2) 100%),
    var(--rc-paper);
  -webkit-mask: conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 14px 100%;
  mask: conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 14px 100%;
  transform: perspective(420px) rotateX(-18deg);
  transform-origin: 50% 0;
  transition: transform 620ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.tailLifted {
  transform: perspective(420px) rotateX(-46deg) translateY(-2px);
}

.tailFlat {
  transform: none;
  transition: none;
}

@keyframes blink {
  from {
    opacity: 0.55;
  }
  to {
    opacity: 1;
  }
}

@container (max-width: 420px) {
  .body {
    padding-block-start: 28px;
    padding-inline: 18px;
  }

  .title {
    font-size: 22px;
  }

  .items {
    gap: 6px;
  }

  .rule {
    margin-block: 12px;
  }

  .barcode {
    block-size: 26px;
    margin-block-start: 12px;
  }

  .tail {
    block-size: 22px;
  }
}

@container (min-width: 900px) {
  .stack {
    --rc-width: 380px;
  }
}
\`\`\`
`;export{n as default};
