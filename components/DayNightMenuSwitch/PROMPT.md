Create a custom element called "Day / Night Menu Switch". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: two menus (title, hours, note, dishes with name, description and price), toggle labels, day colors (sky, paper), evening colors (night sky, lamp glow). Add other settings if they help.

```tsx
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent, RefObject } from 'react';
import styles from './Component.module.css';

export interface DayNightMenuItem {
  name: string;
  description: string;
  price: string;
}

export interface DayNightMenuSwitchProps {
  dayLabel?: string;
  eveningLabel?: string;
  dayTitle?: string;
  eveningTitle?: string;
  dayHours?: string;
  eveningHours?: string;
  dayNote?: string;
  eveningNote?: string;
  dayItems?: DayNightMenuItem[];
  eveningItems?: DayNightMenuItem[];
  dayColor?: string;
  dayPaper?: string;
  eveningColor?: string;
  eveningGlow?: string;
  className?: string;
}

export const defaultDayItems: DayNightMenuItem[] = [
  { name: 'Charred peach & burrata', description: 'Basil oil, toasted pistachio, warm focaccia', price: '$16' },
  { name: 'Citrus-cured sea bream', description: 'Shaved fennel, blood orange, pink peppercorn', price: '$19' },
  { name: 'Wild mushroom tartine', description: 'Soft egg, thyme, aged pecorino on sourdough', price: '$15' },
  { name: 'Saffron risotto', description: 'Roasted lemon, parsley, brown-butter crumb', price: '$21' },
];

export const defaultEveningItems: DayNightMenuItem[] = [
  { name: 'Slow-braised short rib', description: 'Black garlic jus, charred shallot, whipped celeriac', price: '$34' },
  { name: 'Hand-rolled pappardelle', description: 'Duck ragu, orange zest, rosemary, parmesan', price: '$27' },
  { name: 'Whole roasted cauliflower', description: 'Miso butter, golden raisins, toasted hazelnut', price: '$24' },
  { name: 'Burnt honey tart', description: 'Cultured cream, smoked sea salt', price: '$12' },
];

// Fixed star field (x and y in % of the sky, size in px, twinkle offset in ms) so the render is deterministic.
const STARS = [
  { x: 46, y: 7, s: 3, d: 0 },
  { x: 55, y: 20, s: 2, d: 900 },
  { x: 63, y: 9, s: 2, d: 1700 },
  { x: 71, y: 24, s: 3, d: 400 },
  { x: 79, y: 12, s: 2, d: 2300 },
  { x: 86, y: 31, s: 2, d: 1200 },
  { x: 92, y: 8, s: 3, d: 2800 },
  { x: 97, y: 22, s: 2, d: 600 },
  { x: 38, y: 29, s: 2, d: 1900 },
  { x: 24, y: 41, s: 2, d: 300 },
  { x: 12, y: 33, s: 3, d: 1400 },
  { x: 7, y: 47, s: 2, d: 2600 },
  { x: 33, y: 17, s: 2, d: 2100 },
  { x: 68, y: 41, s: 2, d: 800 },
  { x: 50, y: 38, s: 2, d: 1600 },
  { x: 90, y: 47, s: 2, d: 100 },
];

const SWIPE_DISTANCE = 48;
const PANEL_LEAD = 64; // room between the panel's top edge and the first menu row (wide layout)
const WIDE = 760; // keep in sync with the @container breakpoint in the CSS

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ');

function fitWord(el: HTMLElement) {
  el.style.setProperty('--dn-fit', '1');
  let scale = 1;
  for (let i = 0; i < 12 && el.scrollWidth > el.clientWidth + 1; i += 1) {
    scale *= 0.92;
    el.style.setProperty('--dn-fit', scale.toFixed(3));
  }
}

export default function DayNightMenuSwitch({
  dayLabel = 'Lunch',
  eveningLabel = 'Dinner',
  dayTitle = 'Sunlit plates',
  eveningTitle = 'Lamplit plates',
  dayHours = 'Served 12:00 – 15:30',
  eveningHours = 'Served 18:00 – late',
  dayNote = 'Terrace tables, long golden light',
  eveningNote = 'Candles lit at six',
  dayItems = defaultDayItems,
  eveningItems = defaultEveningItems,
  dayColor = '#f6a25c',
  dayPaper = '#fff1de',
  eveningColor = '#2a1234',
  eveningGlow = '#ffb347',
  className,
}: DayNightMenuSwitchProps) {
  const [evening, setEvening] = useState(false);
  const [inView, setInView] = useState(true);
  const helpId = `${useId()}-help`;

  const rootRef = useRef<HTMLDivElement>(null);
  const dayBtn = useRef<HTMLButtonElement>(null);
  const eveBtn = useRef<HTMLButtonElement>(null);
  const dayWord = useRef<HTMLHeadingElement>(null);
  const eveWord = useRef<HTMLHeadingElement>(null);
  const dayList = useRef<HTMLUListElement>(null);
  const eveList = useRef<HTMLUListElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.02 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  // Shrink a giant menu title only when a single long word would not fit its column.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (dayWord.current) fitWord(dayWord.current);
        if (eveWord.current) fitWord(eveWord.current);
      });
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(root);
    if (typeof document !== 'undefined' && document.fonts) void document.fonts.ready.then(run);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [dayTitle, eveningTitle]);

  // Wide layout: sit the cream/night panel's top edge PANEL_LEAD above the tallest list, so the first row clears the curve.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (root.clientWidth < WIDE) {
          root.style.removeProperty('--dn-panel-top');
          return;
        }
        const rootTop = root.getBoundingClientRect().top;
        const tops = [dayList.current, eveList.current].flatMap((el) => (el ? [el.getBoundingClientRect().top - rootTop] : []));
        if (tops.length) root.style.setProperty('--dn-panel-top', `${Math.max(0, Math.round(Math.min(...tops) - PANEL_LEAD))}px`);
      });
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(root);
    if (typeof document !== 'undefined' && document.fonts) void document.fonts.ready.then(run);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [dayItems, eveningItems]);

  const onGroupKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'Home') {
      e.preventDefault();
      setEvening(false);
      dayBtn.current?.focus();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'End') {
      e.preventDefault();
      setEvening(true);
      eveBtn.current?.focus();
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    swipe.current = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.4) setEvening(dx < 0);
  };

  const rootStyle = {
    '--dn-day': dayColor,
    '--dn-paper': dayPaper,
    '--dn-night': eveningColor,
    '--dn-glow': eveningGlow,
    '--dn-play': inView ? 'running' : 'paused',
  } as CSSProperties;

  const optionClass = (selected: boolean) =>
    cx(styles.opt, selected && (evening ? styles.optOnNight : styles.optOn), !selected && evening && styles.optNight);

  const renderPeriod = (
    isEvening: boolean,
    title: string,
    hours: string,
    note: string,
    items: DayNightMenuItem[],
    wordRef: RefObject<HTMLHeadingElement>,
    listRef: RefObject<HTMLUListElement>,
  ) => {
    const hidden = evening !== isEvening;
    const out = isEvening ? styles.outAfter : styles.outBefore;
    return (
      <section className={styles.period} aria-hidden={hidden} aria-label={isEvening ? eveningLabel : dayLabel}>
        <div className={cx(styles.titleBlock, isEvening ? styles.toneNight : styles.toneDay, hidden && styles.titleOut, hidden && out)}>
          <h2 ref={wordRef} className={styles.word}>
            {title}
          </h2>
          <p className={styles.hours}>{hours}</p>
          <p className={styles.note}>{note}</p>
        </div>
        <ul ref={listRef} className={cx(styles.list, isEvening ? styles.toneNight : styles.toneDay, hidden && styles.listOut)}>
          {items.map((item, i) => (
            <li
              key={`${item.name}-${i}`}
              className={cx(styles.item, hidden && (isEvening ? styles.itemOutAfter : styles.itemOutBefore))}
              style={{ '--dn-i': i } as CSSProperties}
            >
              <h3 className={styles.name}>{item.name}</h3>
              <span className={styles.price}>{item.price}</span>
              {item.description ? <p className={styles.desc}>{item.description}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    );
  };

  return (
    <div ref={rootRef} className={cx(styles.root, className)} style={rootStyle}>
      <div className={styles.scene} aria-hidden="true">
        <div className={styles.sky}>
          <div className={cx(styles.skyLayer, styles.skyDay)} />
          <div className={cx(styles.skyLayer, styles.skyNight, evening && styles.fadeIn)} />
          <div className={cx(styles.stars, evening && styles.fadeIn)}>
            {STARS.map((star, i) => (
              <span
                key={i}
                className={cx(styles.star, evening && styles.starLive)}
                style={{ '--dn-x': `${star.x}%`, '--dn-y': `${star.y}%`, '--dn-s': `${star.s}px`, '--dn-d': `${star.d}ms` } as CSSProperties}
              />
            ))}
          </div>

          <div className={cx(styles.wheel, evening ? styles.sunSet : styles.sunRise)}>
            <div className={styles.body}>
              <span className={styles.sunHalo} />
              <span className={styles.sunTicks} />
              <span className={styles.sunRing} />
              <span className={styles.sunDisc}>
                <span className={cx(styles.sunDusk, evening && styles.fadeIn)} />
              </span>
            </div>
          </div>
          <div className={cx(styles.wheel, evening ? styles.moonUp : styles.moonDown)}>
            <div className={styles.body}>
              <span className={styles.moonHalo} />
              <span className={styles.moonRing} />
              <span className={styles.moonDisc} />
            </div>
          </div>

          <div className={cx(styles.rig, evening && styles.rigShift)}>
            <div className={styles.hills}>
              <span className={cx(styles.farB, styles.farBDay)} />
              <span className={cx(styles.farA, styles.farADay)} />
            </div>
            <div className={cx(styles.hills, styles.hillsNight, evening && styles.fadeIn)}>
              <span className={cx(styles.farB, styles.farBNight)} />
              <span className={cx(styles.farA, styles.farANight)} />
            </div>
          </div>
        </div>
        <div className={cx(styles.ground, styles.groundDay)} />
        <div className={cx(styles.ground, styles.groundNight, evening && styles.fadeIn)} />
        <div className={cx(styles.lamp, evening && styles.lampOn)} />
        <div className={styles.grain} />
      </div>

      <div className={styles.frame} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (swipe.current = null)}>
        <div className={styles.switchWrap}>
          <div
            role="radiogroup"
            aria-label="Choose a menu"
            aria-describedby={helpId}
            className={cx(styles.track, evening && styles.trackNight)}
            onKeyDown={onGroupKey}
          >
            <span className={cx(styles.thumb, evening && styles.thumbNight)} aria-hidden="true">
              <span className={cx(styles.glyphRing, evening && styles.glyphRingNight)}>
                <span className={cx(styles.glyphDisc, evening && styles.glyphDiscNight)}>
                  <span className={cx(styles.glyphCut, evening && styles.glyphCutNight)} />
                </span>
              </span>
            </span>
            <button
              ref={dayBtn}
              type="button"
              role="radio"
              aria-checked={!evening}
              className={optionClass(!evening)}
              onClick={() => setEvening(false)}
            >
              {dayLabel}
            </button>
            <button
              ref={eveBtn}
              type="button"
              role="radio"
              aria-checked={evening}
              className={optionClass(evening)}
              onClick={() => setEvening(true)}
            >
              {eveningLabel}
            </button>
          </div>
          <span id={helpId} className={styles.srOnly}>
            Press space, or use the arrow keys, to switch between the two menus. On a touch screen, swipe sideways.
          </span>
          <span className={styles.srOnly} role="status">
            {evening ? eveningTitle : dayTitle}
          </span>
        </div>

        {renderPeriod(false, dayTitle, dayHours, dayNote, dayItems, dayWord, dayList)}
        {renderPeriod(true, eveningTitle, eveningHours, eveningNote, eveningItems, eveWord, eveList)}
      </div>
    </div>
  );
}
```

```css
/* Golden hour to candlelight: apricot and cream day, aubergine and amber evening, one sky that swaps the menu. */

@font-face {
  font-family: 'DN Bricolage';
  src: url('./fonts/bricolage-grotesque-latin-var.woff2') format('woff2');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'DN Hanken';
  src: url('./fonts/hanken.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

.root {
  --dn-day: #f6a25c;
  --dn-paper: #fff1de;
  --dn-night: #2a1234;
  --dn-glow: #ffb347;
  --dn-play: running;
  --dn-ink: color-mix(in srgb, var(--dn-night) 88%, #000);
  --dn-ink-soft: color-mix(in srgb, var(--dn-ink) 74%, var(--dn-paper));
  --dn-cream: var(--dn-paper);
  --dn-cream-soft: color-mix(in srgb, var(--dn-paper) 74%, var(--dn-night));
  --dn-sun: color-mix(in srgb, var(--dn-day) 38%, #ffd067);
  --dn-sun-deep: color-mix(in srgb, var(--dn-day) 72%, #ff7a3a);
  --dn-font-display: 'DN Bricolage', 'Bricolage Grotesque', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --dn-font-ui: 'DN Hanken', 'Hanken Grotesk', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --dn-ease: cubic-bezier(0.62, 0.02, 0.28, 1);
  --dn-spring: cubic-bezier(0.34, 1.5, 0.5, 1);
  --dn-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .8 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container: dn / inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  direction: ltr;
  --dn-card-r: 28px;
  --dn-panel-r: calc(var(--dn-card-r) * 1.75);
  border-radius: var(--dn-card-r);
  background: var(--dn-paper);
  color: var(--dn-ink);
  font-family: var(--dn-font-ui);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.root::selection {
  background: var(--dn-glow);
  color: var(--dn-ink);
}

/* ---------------------------------------------------------------- scene */

.scene {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: clip;
  border-radius: inherit;
  pointer-events: none;
}

.sky {
  --dn-px: 50cqw;
  --dn-py: 83cqh;
  --dn-r: min(45cqh, 80cqw);
  --dn-orb: min(26cqh, 24cqw);
  --dn-rise: 10deg;
  --dn-set: 117deg;
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  block-size: 380px;
  container-type: size;
  overflow: clip;
}

.skyLayer {
  position: absolute;
  inset: 0;
  transition: opacity 1400ms ease-in-out 80ms;
}

.skyDay {
  background:
    radial-gradient(70% 60% at 50% 105%, color-mix(in srgb, var(--dn-paper) 92%, #fff) 0%, transparent 70%),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--dn-day) 86%, #ff6f5e) 0%,
      var(--dn-day) 28%,
      color-mix(in srgb, var(--dn-day) 42%, var(--dn-paper)) 64%,
      var(--dn-paper) 100%
    );
}

.skyNight {
  opacity: 0;
  background:
    radial-gradient(80% 46% at 38% 100%, color-mix(in srgb, var(--dn-glow) 42%, transparent) 0%, transparent 72%),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--dn-night) 74%, #000) 0%,
      var(--dn-night) 42%,
      color-mix(in srgb, var(--dn-night) 70%, var(--dn-glow)) 82%,
      color-mix(in srgb, var(--dn-night) 52%, var(--dn-glow)) 100%
    );
}

.fadeIn {
  opacity: 1;
}

.stars {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 1000ms ease-out 700ms;
}

.star {
  position: absolute;
  inset-inline-start: var(--dn-x);
  inset-block-start: var(--dn-y);
  inline-size: var(--dn-s);
  aspect-ratio: 1;
  border-radius: 50%;
  background: color-mix(in srgb, var(--dn-paper) 90%, var(--dn-glow));
  box-shadow: 0 0 7px 1px color-mix(in srgb, var(--dn-glow) 60%, transparent);
}

.starLive {
  animation: twinkle 3600ms ease-in-out var(--dn-d) infinite;
  animation-play-state: var(--dn-play);
}

/* ---------------------------------------------------- sun and moon wheels */

.wheel {
  position: absolute;
  inline-size: calc(var(--dn-r) * 2);
  aspect-ratio: 1;
  inset-inline-start: calc(var(--dn-px) - var(--dn-r));
  inset-block-start: calc(var(--dn-py) - var(--dn-r));
}

.sunRise,
.sunSet,
.moonUp,
.moonDown {
  transition: transform 1700ms var(--dn-ease);
}

.sunRise {
  transform: rotate(var(--dn-rise));
  transition-delay: 360ms;
}

.sunSet {
  transform: rotate(var(--dn-set));
}

.moonDown {
  transform: rotate(calc(var(--dn-set) * -1));
}

.moonUp {
  transform: rotate(var(--dn-rise));
  transition-delay: 360ms;
}

.body {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 50%;
  inline-size: var(--dn-orb);
  aspect-ratio: 1;
  translate: -50% -50%;
}

.sunHalo,
.moonHalo {
  position: absolute;
  inset: -95%;
  border-radius: 50%;
}

.sunHalo {
  background: radial-gradient(
    closest-side,
    color-mix(in srgb, var(--dn-sun) 62%, transparent) 0%,
    color-mix(in srgb, var(--dn-sun) 26%, transparent) 38%,
    transparent 100%
  );
  animation: breathe 7s ease-in-out infinite;
  animation-play-state: var(--dn-play);
}

.sunTicks {
  position: absolute;
  inset: -36%;
  border-radius: 50%;
  background: repeating-conic-gradient(
    from 0deg,
    color-mix(in srgb, #fff 72%, var(--dn-sun)) 0deg 1deg,
    transparent 1deg 6deg
  );
  -webkit-mask-image: radial-gradient(closest-side, transparent 64%, #000 65%, #000 70%, transparent 71%);
  mask-image: radial-gradient(closest-side, transparent 64%, #000 65%, #000 70%, transparent 71%);
  opacity: 0.6;
  animation: spin 120s linear infinite;
  animation-play-state: var(--dn-play);
}

.sunRing,
.moonRing {
  position: absolute;
  inset: -17%;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, #fff 55%, transparent);
  opacity: 0.55;
}

.sunDisc {
  position: absolute;
  inset: 0;
  overflow: clip;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 30%, #fffaf0 0%, #ffeab8 20%, transparent 46%),
    radial-gradient(circle at 50% 50%, var(--dn-sun) 52%, var(--dn-sun-deep) 100%);
  box-shadow:
    inset -6px -8px 18px color-mix(in srgb, var(--dn-sun-deep) 70%, transparent),
    0 0 36px 6px color-mix(in srgb, var(--dn-sun) 50%, transparent);
}

.sunDusk {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  opacity: 0;
  background: radial-gradient(circle at 50% 78%, rgba(226, 70, 52, 0) 0%, rgba(214, 62, 56, 0.62) 100%);
  transition: opacity 1300ms ease-in 200ms;
}

.moonHalo {
  background: radial-gradient(
    closest-side,
    color-mix(in srgb, var(--dn-paper) 34%, transparent) 0%,
    color-mix(in srgb, var(--dn-glow) 18%, transparent) 46%,
    transparent 100%
  );
}

.moonDisc {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 63% 29%, rgba(150, 96, 74, 0.34) 0 7%, rgba(150, 96, 74, 0.14) 8.5%, transparent 9.5%),
    radial-gradient(circle at 34% 44%, rgba(150, 96, 74, 0.3) 0 11%, rgba(150, 96, 74, 0.12) 12.5%, transparent 13.5%),
    radial-gradient(circle at 58% 66%, rgba(150, 96, 74, 0.32) 0 8%, rgba(150, 96, 74, 0.12) 9.5%, transparent 10.5%),
    radial-gradient(circle at 76% 52%, rgba(150, 96, 74, 0.26) 0 4.5%, transparent 5.5%),
    radial-gradient(circle at 44% 22%, rgba(150, 96, 74, 0.22) 0 4%, transparent 5%),
    radial-gradient(circle at 30% 28%, #fffaf0 0%, #ffe9bd 52%, #e4bd86 100%);
  box-shadow:
    inset -9px -7px 20px rgba(120, 66, 70, 0.4),
    0 0 40px 4px color-mix(in srgb, var(--dn-glow) 34%, transparent);
}

/* ------------------------------------------------------------- landscape */

.rig {
  position: absolute;
  inset-block: 0;
  inset-inline: -4%;
  translate: 1.8% 0;
  transition: translate 1900ms var(--dn-ease);
}

.rigShift {
  translate: -1.8% 0;
}

.hills {
  position: absolute;
  inset: 0;
  transition: opacity 1400ms ease-in-out 80ms;
}

.hillsNight {
  opacity: 0;
}

.farA,
.farB {
  position: absolute;
  inset-block-end: -10%;
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
}

.farA {
  inset-inline-start: -26%;
  inline-size: 104%;
  block-size: 30%;
}

.farB {
  inset-inline-start: 22%;
  inline-size: 92%;
  block-size: 24%;
}

.farADay {
  background: color-mix(in srgb, var(--dn-day) 74%, var(--dn-night) 26%);
}

.farBDay {
  background: color-mix(in srgb, var(--dn-day) 86%, var(--dn-night) 14%);
}

.farANight {
  background: color-mix(in srgb, var(--dn-night) 84%, #000);
}

.farBNight {
  background: color-mix(in srgb, var(--dn-night) 90%, var(--dn-glow) 10%);
}

.ground {
  position: absolute;
  inset-block-start: calc(380px - 56px);
  inset-block-end: 0;
  inset-inline: 0;
  border-start-start-radius: var(--dn-panel-r);
  border-start-end-radius: var(--dn-panel-r);
  transition: opacity 1400ms ease-in-out 80ms;
}

.groundDay {
  background: linear-gradient(180deg, var(--dn-paper) 0%, color-mix(in srgb, var(--dn-paper) 86%, var(--dn-day)) 100%);
  box-shadow: inset 0 2px 0 color-mix(in srgb, #fff 80%, transparent);
}

.groundNight {
  opacity: 0;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--dn-night) 72%, #000) 0%,
    color-mix(in srgb, var(--dn-night) 56%, #000) 100%
  );
  box-shadow: inset 0 1.5px 0 color-mix(in srgb, var(--dn-glow) 46%, transparent);
}

.groundNight.fadeIn,
.hillsNight.fadeIn {
  /* the *Night layers start at opacity 0 further down the file, so .fadeIn alone loses the cascade */
  opacity: 1;
}

.lamp {
  position: absolute;
  inset-inline: -20%;
  inset-block-end: -16%;
  block-size: 64%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--dn-glow) 26%, transparent) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 1500ms ease-in-out 500ms;
}

.lampOn {
  opacity: 1;
  animation: flicker 5200ms ease-in-out 2s infinite;
  animation-play-state: var(--dn-play);
}

.grain {
  position: absolute;
  inset: 0;
  background-image: var(--dn-noise);
  background-size: 180px 180px;
  mix-blend-mode: soft-light;
  opacity: 0.32;
}

/* ----------------------------------------------------------------- frame */

.frame {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(224px, auto) auto;
  grid-template-areas:
    'switch'
    'title'
    'list';
  padding-block: 20px 30px;
  padding-inline: 20px;
  touch-action: pan-y;
}

.period {
  display: contents;
}

/* ---------------------------------------------------------------- switch */

.switchWrap {
  grid-area: switch;
  justify-self: start;
  inline-size: min(100%, 380px);
}

.track {
  --dn-focus: var(--dn-ink);
  position: relative;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  min-block-size: 56px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--dn-ink) 20%, transparent);
  background: color-mix(in srgb, var(--dn-paper) 36%, transparent);
  transition:
    background-color 900ms ease-in-out,
    border-color 900ms ease-in-out;
}

.trackNight {
  --dn-focus: var(--dn-cream);
  border-color: color-mix(in srgb, var(--dn-cream) 24%, transparent);
  background: color-mix(in srgb, var(--dn-cream) 8%, transparent);
}

.thumb {
  position: absolute;
  inset-block: 4px;
  inset-inline-start: 4px;
  inline-size: calc((100% - 8px) / 2);
  border-radius: 999px;
  background: var(--dn-ink);
  box-shadow: 0 6px 16px -6px color-mix(in srgb, var(--dn-ink) 60%, transparent);
  transition:
    translate 760ms var(--dn-spring),
    background-color 900ms ease-in-out;
}

.thumbNight {
  translate: 100% 0;
  background: var(--dn-cream);
}

.glyphRing {
  position: absolute;
  inset-inline-start: 11px;
  inset-block: 0;
  margin-block: auto;
  inline-size: 26px;
  block-size: 26px;
  border-radius: 50%;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--dn-sun) 30%, transparent);
  transition: box-shadow 900ms ease-in-out;
}

.glyphRingNight {
  box-shadow: 0 0 0 0 transparent;
}

.glyphDisc {
  position: relative;
  display: block;
  inline-size: 100%;
  block-size: 100%;
  overflow: clip;
  border-radius: 50%;
  background: var(--dn-sun);
  transition: background-color 900ms ease-in-out;
}

.glyphDiscNight {
  background: var(--dn-ink);
}

.glyphCut {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--dn-ink);
  translate: 125% -45%;
  transition:
    translate 900ms var(--dn-ease),
    background-color 900ms ease-in-out;
}

.glyphCutNight {
  background: var(--dn-cream);
  translate: 38% -22%;
}

.opt {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-inline-size: 0;
  min-block-size: 46px;
  padding-block: 8px;
  padding-inline: 46px 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--dn-ink);
  font-family: var(--dn-font-display);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.005em;
  text-align: start;
  text-wrap: balance;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color 700ms ease-in-out;
}

.opt:focus-visible {
  outline: 2px solid var(--dn-focus);
  outline-offset: 2px;
}

.optNight {
  color: var(--dn-cream);
}

.optOn {
  color: var(--dn-paper);
}

.optOnNight {
  color: var(--dn-ink);
}

/* ----------------------------------------------------------------- title */

.toneDay {
  --dn-text: var(--dn-ink);
  --dn-soft: var(--dn-ink-soft);
  --dn-hair: color-mix(in srgb, var(--dn-ink) 16%, transparent);
  --dn-price: var(--dn-ink);
  --dn-dot: var(--dn-sun-deep);
}

.toneNight {
  --dn-text: var(--dn-cream);
  --dn-soft: var(--dn-cream-soft);
  --dn-hair: color-mix(in srgb, var(--dn-cream) 18%, transparent);
  --dn-price: var(--dn-glow);
  --dn-dot: var(--dn-glow);
}

.titleBlock {
  grid-area: title;
  align-self: end;
  min-inline-size: 0;
  padding-block-end: 8px;
  color: var(--dn-text);
  opacity: 1;
  translate: 0 0;
  visibility: visible;
  transition:
    opacity 700ms ease-out 300ms,
    translate 900ms cubic-bezier(0.2, 0.8, 0.2, 1) 260ms,
    visibility 0s linear 0s;
}

.titleOut {
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 320ms ease-in,
    translate 420ms ease-in,
    visibility 0s linear 440ms;
}

.outBefore {
  translate: -40px 0;
}

.outAfter {
  translate: 40px 0;
}

.word {
  margin: 0;
  min-inline-size: 0;
  font-family: var(--dn-font-display);
  font-size: calc(var(--dn-fit, 1) * clamp(40px, 13cqw, 64px));
  font-weight: 700;
  line-height: 0.96;
  letter-spacing: -0.045em;
  text-wrap: balance;
  overflow-wrap: normal;
  word-break: normal;
  hyphens: none;
  unicode-bidi: plaintext;
}

.hours {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 0 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
  unicode-bidi: plaintext;
}

.hours::before {
  content: '';
  flex: none;
  inline-size: 9px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--dn-dot);
}

.note {
  margin: 4px 0 0;
  color: var(--dn-soft);
  font-size: 16px;
  line-height: 1.4;
  unicode-bidi: plaintext;
}

/* ------------------------------------------------------------------ list */

.list {
  grid-area: list;
  align-self: start;
  min-inline-size: 0;
  margin: 0;
  margin-block-start: 64px;
  padding: 0;
  list-style: none;
  color: var(--dn-text);
  visibility: visible;
  transition: visibility 0s linear 0s;
}

.listOut {
  visibility: hidden;
  pointer-events: none;
  transition: visibility 0s linear 480ms;
}

.item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  column-gap: 20px;
  row-gap: 5px;
  padding-block: 15px;
  border-block-end: 1px solid var(--dn-hair);
  opacity: 1;
  translate: 0 0;
  transition:
    opacity 600ms ease-out calc(var(--dn-i, 0) * 70ms + 380ms),
    translate 800ms cubic-bezier(0.2, 0.8, 0.2, 1) calc(var(--dn-i, 0) * 70ms + 340ms);
}

.item:first-child {
  border-block-start: 1px solid var(--dn-hair);
}

.itemOutBefore,
.itemOutAfter {
  opacity: 0;
  transition:
    opacity 280ms ease-in,
    translate 400ms ease-in;
}

.itemOutBefore {
  translate: -36px 0;
}

.itemOutAfter {
  translate: 36px 0;
}

.name {
  grid-column: 1;
  margin: 0;
  min-inline-size: 0;
  font-family: var(--dn-font-display);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.015em;
  text-wrap: balance;
  overflow-wrap: normal;
  word-break: normal;
  hyphens: none;
  unicode-bidi: plaintext;
}

.price {
  grid-column: 2;
  grid-row: 1;
  color: var(--dn-price);
  font-family: var(--dn-font-display);
  font-size: 19px;
  font-weight: 600;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  text-align: end;
  unicode-bidi: plaintext;
}

.desc {
  grid-column: 1 / -1;
  max-inline-size: 48ch;
  margin: 0;
  color: var(--dn-soft);
  font-size: 16px;
  line-height: 1.45;
  text-wrap: pretty;
  unicode-bidi: plaintext;
}

.srOnly {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  overflow: clip;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* ------------------------------------------------------------ wide layout */

@container dn (min-width: 760px) {
  .sky {
    --dn-px: 40cqw;
    --dn-py: 74cqh;
    --dn-r: min(48cqh, 52cqw);
    --dn-orb: min(26cqh, 20cqw);
    block-size: 100%;
  }

  .farA {
    inset-inline-start: -18%;
    inline-size: 78%;
    block-size: 34%;
    inset-block-end: -8%;
  }

  .farB {
    inset-inline-start: 6%;
    inline-size: 46%;
    block-size: 27%;
    inset-block-end: -8%;
  }

  .ground {
    /* the panel starts where the title column ends, so the list sits exactly one gutter inside its left edge;
       its top is set from the measured list (see Component.tsx) so the first row always clears the curve */
    --dn-pad: 48px;
    --dn-gap: 48px;
    inset-block-start: var(--dn-panel-top, 30%);
    inset-inline-start: calc(var(--dn-pad) + (100% - var(--dn-pad) * 2 - var(--dn-gap)) * 5 / 11);
    border-start-end-radius: 0;
  }

  .lamp {
    inset-inline: 30% -10%;
    block-size: 76%;
  }

  .frame {
    min-block-size: max(640px, 54cqw);
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
    grid-template-rows: auto 1fr;
    grid-template-areas:
      'switch list'
      'title list';
    column-gap: 48px;
    padding-block: 40px 44px;
    padding-inline: 48px;
  }

  .list {
    align-self: end;
    margin-block-start: 24px;
  }

  .word {
    font-size: calc(var(--dn-fit, 1) * clamp(64px, 8.6cqw, 124px));
  }

  .name {
    font-size: 22px;
  }

  .price {
    font-size: 20px;
  }

  .item {
    padding-block: 16px;
  }
}

/* ---------------------------------------------------------------- keyframes */

@keyframes twinkle {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}

@keyframes breathe {
  0%,
  100% {
    opacity: 0.8;
    transform: scale(0.96);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes flicker {
  0%,
  100% {
    opacity: 1;
  }
  22% {
    opacity: 0.86;
  }
  41% {
    opacity: 0.97;
  }
  63% {
    opacity: 0.82;
  }
  82% {
    opacity: 0.95;
  }
}

/* Reduced motion: the swap is instant and nothing idles; every state is still a finished scene. */
@media (prefers-reduced-motion: reduce) {
  .skyLayer,
  .stars,
  .hills,
  .rig,
  .ground,
  .lamp,
  .sunRise,
  .sunSet,
  .moonUp,
  .moonDown,
  .sunDusk,
  .track,
  .thumb,
  .glyphRing,
  .glyphDisc,
  .glyphCut,
  .opt,
  .titleBlock,
  .titleOut,
  .list,
  .listOut,
  .item,
  .itemOutBefore,
  .itemOutAfter {
    transition-duration: 0s;
    transition-delay: 0s;
  }

  .starLive,
  .sunHalo,
  .sunTicks,
  .lampOn {
    animation: none;
  }
}
```
