import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface TimeSlot {
  time: string;
  booked?: boolean;
}

export interface TimeSlotTapeProps {
  slots?: TimeSlot[];
  startTime?: string;
  eyebrow?: string;
  heading?: string;
  openCountLabel?: string;
  bookedLabel?: string;
  buttonLabel?: string;
  buttonLink?: string;
  noTimesLabel?: string;
  ariaLabel?: string;
  className?: string;
}

const BOOKED = new Set(['09:30', '10:00', '11:30', '13:00', '13:30', '15:00', '16:30']);

export const defaultSlots: TimeSlot[] = Array.from({ length: 18 }, (_, i) => {
  const time = `${String(9 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
  return { time, booked: BOOKED.has(time) };
});

const PAD = 10;
const TAPE_HELP = 'Drag the tape, tap a time or use the arrow keys; Home and End jump to the first and last free time.';
const STIFFNESS = 190;
const DAMPING = 20;
const MAX_FONT = 28;
const MIN_FONT = 15;
const RANGE = /\s+[–—-]\s+/;
const MAX_VELOCITY = 40;

const isOpen = (s?: TimeSlot) => !!s && !s.booked;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const rubber = (over: number) => over / (1 + over * 1.6);

function nearestOpen(slots: TimeSlot[], i: number) {
  for (let d = 0; d < slots.length; d++) {
    if (isOpen(slots[i - d])) return i - d;
    if (isOpen(slots[i + d])) return i + d;
  }
  return -1;
}

function stepOpen(slots: TimeSlot[], from: number, dir: number, count = 1) {
  let found = from;
  for (let i = from + dir, n = 0; i >= 0 && i < slots.length && n < count; i += dir) {
    if (isOpen(slots[i])) {
      found = i;
      n++;
    }
  }
  return found;
}

const splitRange = (time: string) => {
  const [start, ...rest] = time.split(RANGE);
  return { start, end: rest.join(' – ') };
};

function sizing(slots: TimeSlot[]) {
  const longest = Math.max(5, ...slots.map((s) => splitRange(s.time).start.length));
  const font = clamp(Math.round((MAX_FONT * 7) / longest), MIN_FONT, MAX_FONT);
  const slot = clamp(Math.round((longest * font * 0.56) / 0.62), 112, 260);
  return { font, slot };
}

export default function TimeSlotTape({
  slots = defaultSlots,
  startTime = '10:30',
  eyebrow = 'Thursday 14 March · Tailored fitting, 45 min',
  heading = 'Choose your fitting time',
  openCountLabel = '{count} of {total} times open',
  bookedLabel = 'Booked',
  buttonLabel = 'Book {time}',
  buttonLink = '#book',
  noTimesLabel = 'No times left today',
  ariaLabel = 'Appointment time',
  className,
}: TimeSlotTapeProps) {
  const count = slots.length;
  const openCount = slots.filter(isOpen).length;
  const { font, slot } = useMemo(() => sizing(slots), [slots]);
  const startIndex = useMemo(() => {
    const wanted = slots.findIndex((s) => s.time === startTime);
    return nearestOpen(slots, wanted >= 0 ? wanted : 0);
  }, [slots, startTime]);
  const restIndex = Math.max(startIndex, 0);

  const [selected, setSelected] = useState(startIndex);
  const [reduced, setReduced] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [inView, setInView] = useState(true);

  const rootRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLSpanElement>(null);
  const slotEls = useRef<(HTMLDivElement | null)[]>([]);
  const motion = useRef({ p: restIndex, v: 0, target: restIndex, armed: false, centre: restIndex });
  const drag = useRef({ active: false, id: -1, x0: 0, p0: 0, lastX: 0, lastT: 0, vel: 0, moved: false, touch: false, tapIndex: -1 });
  const slotsRef = useRef(slots);
  const slotRef = useRef(slot);
  const reducedRef = useRef(reduced);
  const raf = useRef(0);

  slotsRef.current = slots;
  slotRef.current = slot;
  reducedRef.current = reduced;

  const paint = useCallback(() => {
    const { p } = motion.current;
    viewportRef.current?.style.setProperty('--tst-x', `${(-(PAD + p + 0.5) * slotRef.current).toFixed(2)}px`);
    slotEls.current.forEach((el, i) => {
      if (!el) return;
      const d = Math.abs(i - p);
      el.style.setProperty('--near', smooth(clamp(1 - d, 0, 1)).toFixed(3));
      el.style.setProperty('--far', clamp(d / 3, 0, 1).toFixed(3));
    });
  }, []);

  const bump = useCallback(() => {
    pinRef.current?.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(2px) scale(0.94)' }, { transform: 'translateY(0)' }],
      { duration: 220, easing: 'cubic-bezier(.2,.9,.3,1.4)' },
    );
    if (drag.current.touch && typeof navigator !== 'undefined') navigator.vibrate?.(8);
  }, []);

  const tick = useCallback(
    (now: number, last: number) => {
      const m = motion.current;
      const dt = Math.min((now - last) / 1000, 1 / 30);
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      if (!drag.current.active) {
        if (reducedRef.current) Object.assign(m, { p: m.target, v: 0 });
        else
          for (let n = 0; n < steps; n++) {
            m.v += (STIFFNESS * (m.target - m.p) - DAMPING * m.v) * h;
            m.p += m.v * h;
          }
        if (m.armed && Math.abs(m.target - m.p) < 0.03) {
          m.armed = false;
          bump();
        }
      }
      const list = slotsRef.current;
      const centre = clamp(Math.round(m.p), 0, list.length - 1);
      if (centre !== m.centre) {
        m.centre = centre;
        if (drag.current.active) {
          if (drag.current.touch) navigator.vibrate?.(4);
          const open = nearestOpen(list, centre);
          if (open >= 0) setSelected(open);
        }
      }
      const busy = drag.current.active || Math.abs(m.v) > 0.005 || Math.abs(m.target - m.p) > 0.0005;
      if (!busy) m.p = m.target;
      paint();
      raf.current = busy ? requestAnimationFrame((t) => tick(t, now)) : 0;
    },
    [bump, paint],
  );

  const kick = useCallback(() => {
    if (raf.current) return;
    const start = performance.now();
    raf.current = requestAnimationFrame((t) => tick(t, start - 16));
  }, [tick]);

  const goTo = useCallback(
    (i: number, velocity = 0) => {
      if (!isOpen(slotsRef.current[i])) return;
      const m = motion.current;
      m.target = i;
      m.v = velocity;
      m.armed = !reducedRef.current && Math.abs(m.p - i) > 0.05;
      if (reducedRef.current) m.p = i;
      setSelected(i);
      kick();
    },
    [kick],
  );

  useEffect(() => {
    Object.assign(motion.current, { p: restIndex, v: 0, target: restIndex, armed: false, centre: restIndex });
    setSelected(startIndex);
    paint();
  }, [restIndex, startIndex, slot, paint]);

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
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || count === 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const hit = (e.target as HTMLElement).closest<HTMLElement>('[data-slot]');
    drag.current = {
      active: true,
      id: e.pointerId,
      x0: e.clientX,
      p0: motion.current.p,
      lastX: e.clientX,
      lastT: e.timeStamp,
      vel: 0,
      moved: false,
      touch: e.pointerType !== 'mouse',
      tapIndex: hit ? Number(hit.dataset.slot) : -1,
    };
    motion.current.v = 0;
    motion.current.armed = false;
    setDragging(true);
    kick();
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.id) return;
    const w = slotRef.current;
    const dx = e.clientX - d.x0;
    if (Math.abs(dx) > 6) d.moved = true;
    if (!d.moved) return;
    const last = count - 1;
    let p = d.p0 - dx / w;
    if (p < 0) p = -rubber(-p);
    else if (p > last) p = last + rubber(p - last);
    motion.current.p = p;
    const dt = Math.max((e.timeStamp - d.lastT) / 1000, 0.001);
    d.vel = d.vel * 0.5 + (-(e.clientX - d.lastX) / w / dt) * 0.5;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    kick();
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.id) return;
    d.active = false;
    setDragging(false);
    const list = slotsRef.current;
    if (!d.moved) {
      const open = d.tapIndex >= 0 ? nearestOpen(list, d.tapIndex) : -1;
      if (open >= 0) goTo(open);
      else kick();
      return;
    }
    const recent = e.timeStamp - d.lastT < 80;
    const vel = recent ? clamp(d.vel, -MAX_VELOCITY, MAX_VELOCITY) : 0;
    const projected = clamp(Math.round(motion.current.p + vel * 0.26), 0, list.length - 1);
    const open = nearestOpen(list, projected);
    if (open >= 0) goTo(open, vel * 0.6);
    else kick();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const from = motion.current.target;
    const keys: Record<string, () => number> = {
      ArrowRight: () => stepOpen(slots, from, 1),
      ArrowDown: () => stepOpen(slots, from, 1),
      ArrowLeft: () => stepOpen(slots, from, -1),
      ArrowUp: () => stepOpen(slots, from, -1),
      PageDown: () => stepOpen(slots, from, 1, 4),
      PageUp: () => stepOpen(slots, from, -1, 4),
      Home: () => nearestOpen(slots, 0),
      End: () => nearestOpen(slots, count - 1),
    };
    const next = keys[e.key];
    if (!next) return;
    e.preventDefault();
    goTo(next());
  };

  const current = slots[selected];
  const [labelBefore, ...labelRest] = buttonLabel.split('{time}');
  const labelAfter = labelRest.join('{time}');
  const countText = openCountLabel.replace('{count}', String(openCount)).replace('{total}', String(count));

  const rootStyle = {
    '--tst-slot': `${slot}px`,
    '--tst-num-size': `${font}px`,
    '--tst-pad': `${PAD * slot}px`,
    '--tst-count': count,
    '--tst-play': inView && !dragging ? 'running' : 'paused',
  } as CSSProperties;

  const buttonContent = current ? (
    <>
      {labelBefore}
      {labelRest.length > 0 && (
        <span key={current.time} className={styles.buttonTime}>
          {current.time}
        </span>
      )}
      {labelAfter}
    </>
  ) : null;

  return (
    <section ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle} aria-label={ariaLabel}>
      <div className={styles.inner}>
        {(eyebrow || heading || countText) && (
          <header className={styles.header}>
            <div className={styles.titles}>
              {heading && <h3 className={styles.heading}>{heading}</h3>}
              {eyebrow && <p className={styles.detail}>{eyebrow}</p>}
            </div>
            {count > 0 && countText && <p className={styles.count}>{countText}</p>}
          </header>
        )}

        <div
          ref={viewportRef}
          className={dragging ? `${styles.viewport} ${styles.grabbing}` : styles.viewport}
          role="slider"
          aria-description={TAPE_HELP}
          dir="ltr"
          tabIndex={0}
          aria-label={ariaLabel}
          aria-valuemin={0}
          aria-valuemax={Math.max(count - 1, 0)}
          aria-valuenow={Math.max(selected, 0)}
          aria-valuetext={current?.time ?? noTimesLabel}
          aria-disabled={openCount === 0 || undefined}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ '--tst-x': `${-(PAD + restIndex + 0.5) * slot}px` } as CSSProperties}
        >
          <span className={styles.rail} aria-hidden="true" />
          <span className={styles.ticks} aria-hidden="true" />
          <span className={styles.lens} aria-hidden="true" />
          <div className={styles.tape}>
            {slots.map((s, i) => {
              const { start, end } = splitRange(s.time);
              const near = smooth(clamp(1 - Math.abs(i - restIndex), 0, 1));
              return (
                <div
                  key={`${i}-${s.time}`}
                  ref={(el) => {
                    slotEls.current[i] = el;
                  }}
                  data-slot={i}
                  className={s.booked ? `${styles.slot} ${styles.booked}` : styles.slot}
                  style={{ '--near': near, '--far': clamp(Math.abs(i - restIndex) / 3, 0, 1) } as CSSProperties}
                  aria-hidden="true"
                >
                  <span className={s.booked ? `${styles.numeral} ${styles.numeralBooked}` : styles.numeral}>{start}</span>
                  {end && <span className={styles.rangeEnd}>{end}</span>}
                  {s.booked && bookedLabel && <span className={styles.caption}>{bookedLabel}</span>}
                </div>
              );
            })}
          </div>
          <span className={styles.pin} aria-hidden="true">
            <span className={styles.needle} />
            <span ref={pinRef} className={styles.pinHead} />
          </span>
        </div>

        <div className={styles.footer}>
          {!current || openCount === 0 ? (
            <button type="button" className={styles.button} disabled>
              {noTimesLabel}
            </button>
          ) : buttonLink ? (
            <a className={styles.button} href={buttonLink} aria-live="polite">
              {buttonContent}
            </a>
          ) : (
            <button type="button" className={styles.button} aria-live="polite">
              {buttonContent}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
