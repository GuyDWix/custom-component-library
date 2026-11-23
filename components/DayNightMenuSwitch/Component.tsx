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
        <ul className={cx(styles.list, isEvening ? styles.toneNight : styles.toneDay, hidden && styles.listOut)}>
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

        {renderPeriod(false, dayTitle, dayHours, dayNote, dayItems, dayWord)}
        {renderPeriod(true, eveningTitle, eveningHours, eveningNote, eveningItems, eveWord)}
      </div>
    </div>
  );
}
