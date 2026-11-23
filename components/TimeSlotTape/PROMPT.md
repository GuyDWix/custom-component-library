Create a custom element called "Time Slot Tape". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: times (list like 09:00 and 09:30), booked times (greyed), button label and link, tape colour. Add other settings if they help.

```tsx
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
  tapeColor?: string;
  inkColor?: string;
  deskColor?: string;
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

function sizing(slots: TimeSlot[]) {
  const longest = Math.max(5, ...slots.map((s) => s.time.length));
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
  tapeColor = '#F3D98B',
  inkColor = '#1C2B4B',
  deskColor = '#F6F0E3',
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
  const trackRef = useRef<HTMLDivElement>(null);
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
    const track = trackRef.current;
    if (track) track.style.transform = `translate3d(${(-(PAD + p + 0.5) * slotRef.current).toFixed(2)}px, 0, 0)`;
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
    '--tst-tape': tapeColor,
    '--tst-ink': inkColor,
    '--tst-desk': deskColor,
    '--tst-slot': `${slot}px`,
    '--tst-num-size': `${font}px`,
    '--tst-pad': `${PAD * slot}px`,
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
      <span className={styles.light} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />

      <div className={styles.inner}>
        {(eyebrow || heading || countText) && (
          <header className={styles.header}>
            <div className={styles.titles}>
              {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
              {heading && <h3 className={styles.heading}>{heading}</h3>}
            </div>
            {count > 0 && countText && <p className={styles.count}>{countText}</p>}
          </header>
        )}

        <div
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
        >
          <div ref={trackRef} className={styles.tape} style={{ transform: `translate3d(${-(PAD + restIndex + 0.5) * slot}px, 0, 0)` }}>
            {slots.map((s, i) => {
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
                  <span className={s.booked ? `${styles.numeral} ${styles.numeralBooked}` : styles.numeral}>{s.time}</span>
                  {s.booked && bookedLabel && <span className={styles.caption}>{bookedLabel}</span>}
                </div>
              );
            })}
          </div>
          <span className={styles.sheen} aria-hidden="true" />
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
```

```css
.root {
  --tst-tape: #f3d98b;
  --tst-ink: #1c2b4b;
  --tst-desk: #f6f0e3;
  --tst-brass: #b68a3e;
  --tst-brass-light: #f6e2ae;
  --tst-brass-dark: #6e4f1c;
  --tst-muted: color-mix(in srgb, var(--tst-ink) 66%, var(--tst-desk));
  --tst-slot: 126px;
  --tst-num-size: 28px;
  --tst-pad: 1260px;
  --tst-play: running;
  --tst-font-display: 'Iowan Old Style', 'Baskerville', 'Libre Baskerville', 'Palatino Linotype', Georgia, serif;
  --tst-font-num: 'DIN Alternate', 'DIN 2014', 'Bahnschrift', 'Barlow Semi Condensed', 'Roboto Condensed', 'Arial Narrow', sans-serif;
  --tst-font-ui: 'Avenir Next', 'Segoe UI', 'Helvetica Neue', system-ui, sans-serif;
  --tst-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --tst-fibre: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='60'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='.9 .04' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.1  0 0 0 .28 0'/></filter><rect width='100%' height='100%' filter='url(%23f)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: 40px 36px;
  padding-inline: 20px;
  border-radius: 28px;
  background:
    radial-gradient(80% 70% at 18% 0%, rgba(255, 252, 244, 0.95) 0%, transparent 62%),
    linear-gradient(180deg, color-mix(in srgb, var(--tst-desk) 82%, #fff) 0%, var(--tst-desk) 55%, color-mix(in srgb, var(--tst-desk) 90%, var(--tst-brass)) 100%);
  color: var(--tst-ink);
  font-family: var(--tst-font-ui);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 30px 60px -40px rgba(28, 43, 75, 0.45);
}

.light,
.grain {
  position: absolute;
  pointer-events: none;
  z-index: -1;
}

.light {
  inset-block-start: -30%;
  inset-inline-end: -15%;
  inline-size: 65%;
  aspect-ratio: 1.6;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--tst-tape) 55%, transparent) 0%, transparent 100%);
  filter: blur(48px);
  opacity: 0.8;
}

.grain {
  inset: 0;
  background-image: var(--tst-noise);
  mix-blend-mode: multiply;
  opacity: 0.16;
}

.inner {
  display: grid;
  gap: 28px;
  max-inline-size: 1080px;
  margin-inline: auto;
}

.header {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: 12px 32px;
}

.titles {
  display: grid;
  gap: 10px;
  min-inline-size: 0;
  flex: 1 1 320px;
}

.eyebrow {
  margin: 0;
  font-family: var(--tst-font-num);
  font-size: 14px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--tst-brass-dark);
  overflow-wrap: anywhere;
}

.heading {
  margin: 0;
  font-family: var(--tst-font-display);
  font-weight: 600;
  font-size: clamp(28px, 6cqi, 42px);
  line-height: 1.05;
  letter-spacing: -0.02em;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.count {
  margin: 0;
  padding-block: 6px;
  padding-inline: 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--tst-ink) 14%, transparent);
  background: color-mix(in srgb, #fff 45%, transparent);
  font-family: var(--tst-font-num);
  font-size: 14px;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  color: var(--tst-muted);
}

.viewport {
  position: relative;
  block-size: 172px;
  margin-inline: -20px;
  overflow: clip;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
  mask-image: linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%);
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%);
}

.grabbing {
  cursor: grabbing;
}

.viewport:focus-visible {
  --tst-focus: 0 0 0 3px var(--tst-desk), 0 0 0 6px var(--tst-ink),;
}

.tape {
  position: absolute;
  inset-block: 26px 30px;
  inset-inline-start: 50%;
  display: flex;
  padding-inline: var(--tst-pad);
  border-radius: 3px;
  will-change: transform;
  background-color: var(--tst-tape);
  background-image:
    linear-gradient(90deg, transparent calc(50% - 1px), var(--tst-ink) calc(50% - 1px), var(--tst-ink) calc(50% + 1px), transparent calc(50% + 1px)),
    linear-gradient(90deg, transparent calc(50% - 1px), var(--tst-ink) calc(50% - 1px), var(--tst-ink) calc(50% + 1px), transparent calc(50% + 1px)),
    linear-gradient(90deg, color-mix(in srgb, var(--tst-ink) 80%, transparent) 0 1.5px, transparent 1.5px),
    linear-gradient(90deg, color-mix(in srgb, var(--tst-ink) 80%, transparent) 0 1.5px, transparent 1.5px),
    linear-gradient(90deg, color-mix(in srgb, var(--tst-ink) 55%, transparent) 0 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--tst-ink) 55%, transparent) 0 1px, transparent 1px),
    linear-gradient(180deg, transparent 5px, color-mix(in srgb, var(--tst-ink) 30%, transparent) 5px 6px, transparent 6px calc(100% - 6px), color-mix(in srgb, var(--tst-ink) 30%, transparent) calc(100% - 6px) calc(100% - 5px), transparent calc(100% - 5px)),
    var(--tst-fibre),
    var(--tst-noise);
  background-size:
    var(--tst-slot) 26px,
    var(--tst-slot) 26px,
    var(--tst-slot) 17px,
    var(--tst-slot) 17px,
    calc(var(--tst-slot) / 4) 10px,
    calc(var(--tst-slot) / 4) 10px,
    100% 100%,
    220px 60px,
    160px 160px;
  background-position:
    0 0,
    0 100%,
    0 0,
    0 100%,
    0 0,
    0 100%,
    0 0,
    0 0,
    0 0;
  background-repeat: repeat-x, repeat-x, repeat-x, repeat-x, repeat-x, repeat-x, no-repeat, repeat, repeat;
  background-blend-mode: normal, normal, normal, normal, normal, normal, normal, multiply, soft-light;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    inset 0 -2px 0 rgba(110, 79, 28, 0.18),
    0 2px 3px rgba(28, 43, 75, 0.18),
    0 18px 26px -14px rgba(28, 43, 75, 0.42);
}

.slot {
  --near: 0;
  --far: 1;
  position: relative;
  flex: 0 0 var(--tst-slot);
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 4px;
  cursor: pointer;
}

.numeral {
  display: block;
  max-inline-size: calc(var(--tst-slot) * 0.62);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--tst-font-num);
  font-size: var(--tst-num-size);
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--tst-ink);
  opacity: calc(1 - var(--far) * 0.4);
  font-weight: 700;
  transform: scale(calc(1 + var(--near) * 0.5)) translateY(calc(var(--near) * -1px));
  text-shadow:
    0 1px 0 rgba(255, 255, 255, calc(var(--near) * 0.55)),
    0 6px 14px rgba(110, 79, 28, calc(var(--near) * 0.22));
}

.booked {
  cursor: not-allowed;
  background-image: repeating-linear-gradient(-45deg, transparent 0 7px, color-mix(in srgb, var(--tst-ink) 9%, transparent) 7px 8px);
  background-size: 100% 46%;
  background-position: 50% 50%;
  background-repeat: no-repeat;
}

.numeralBooked {
  opacity: 0.38;
  text-decoration: line-through;
  text-decoration-thickness: 2px;
}

.caption {
  max-inline-size: calc(var(--tst-slot) - 20px);
  font-family: var(--tst-font-num);
  font-size: 11px;
  line-height: 1.2;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-align: center;
  overflow-wrap: anywhere;
  color: color-mix(in srgb, var(--tst-ink) 72%, var(--tst-tape));
}

.sheen {
  position: absolute;
  inset-block: 26px 30px;
  inset-inline: 0;
  pointer-events: none;
  border-radius: 3px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0.08) 22%, transparent 45%, rgba(110, 79, 28, 0.06) 78%, rgba(110, 79, 28, 0.16) 100%),
    radial-gradient(40% 120% at 50% 50%, rgba(255, 250, 230, 0.14) 0%, transparent 70%);
}

.pin {
  position: absolute;
  inset-block: 6px 16px;
  inset-inline-start: 50%;
  inline-size: 18px;
  margin-inline-start: -9px;
  pointer-events: none;
}

.needle {
  position: absolute;
  inset-block: 14px 0;
  mask-image: linear-gradient(180deg, #000 0 40px, transparent 40px calc(100% - 34px), #000 calc(100% - 34px));
  -webkit-mask-image: linear-gradient(180deg, #000 0 40px, transparent 40px calc(100% - 34px), #000 calc(100% - 34px));
  inset-inline-start: 8px;
  inline-size: 2px;
  border-radius: 1px;
  background: linear-gradient(180deg, var(--tst-brass) 0%, var(--tst-brass-dark) 100%);
  box-shadow: 3px 2px 3px rgba(28, 43, 75, 0.25);
}

.pinHead {
  position: absolute;
  inset-block-start: 6px;
  inset-inline-start: 0;
  inline-size: 18px;
  block-size: 18px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 30%, #fffaf0 0%, var(--tst-brass-light) 18%, var(--tst-brass) 55%, var(--tst-brass-dark) 100%);
  box-shadow:
    var(--tst-focus,)
    inset 0 -1px 2px rgba(60, 40, 10, 0.4),
    0 3px 6px rgba(28, 43, 75, 0.35),
    4px 6px 8px rgba(28, 43, 75, 0.16);
}

.pinHead::after {
  content: '';
  position: absolute;
  inset: 2px 5px 9px 3px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  filter: blur(1px);
  animation: glint 6s ease-in-out infinite;
  animation-play-state: var(--tst-play);
}

.footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px 24px;
}

.button {
  position: relative;
  flex: 0 1 auto;
  display: inline-block;
  min-block-size: 56px;
  min-inline-size: 200px;
  max-inline-size: 100%;
  box-sizing: border-box;
  padding-block: 16px;
  padding-inline: 28px;
  line-height: 1.4;
  border: 0;
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, transparent 50%),
    var(--tst-ink);
  color: var(--tst-desk);
  font-family: var(--tst-font-ui);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.01em;
  text-align: center;
  text-decoration: none;
  text-wrap: balance;
  overflow-wrap: anywhere;
  cursor: pointer;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    inset 0 0 0 1px color-mix(in srgb, var(--tst-brass) 40%, transparent),
    0 10px 22px -10px rgba(28, 43, 75, 0.6);
  transition:
    transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.button:hover {
  transform: translateY(-2px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    inset 0 0 0 1px color-mix(in srgb, var(--tst-brass) 55%, transparent),
    0 16px 28px -12px rgba(28, 43, 75, 0.6);
}

.button:active {
  transform: translateY(0) scale(0.97);
}

.button:focus-visible {
  outline: 3px solid var(--tst-brass);
  outline-offset: 3px;
}

.button:disabled {
  cursor: not-allowed;
  transform: none;
  background: color-mix(in srgb, var(--tst-ink) 18%, var(--tst-desk));
  color: var(--tst-ink);
  box-shadow: none;
}

.buttonTime {
  display: inline-block;
  font-family: var(--tst-font-num);
  font-size: 1.12em;
  font-variant-numeric: tabular-nums;
  color: var(--tst-tape);
  animation: timeIn 0.38s cubic-bezier(0.2, 0.9, 0.3, 1.3);
}

@container (max-width: 520px) {
  .viewport {
    block-size: 184px;
  }

  .button {
    flex-basis: 100%;
    min-block-size: 60px;
  }
}

@container (min-width: 900px) {
  .inner {
    padding-inline: 16px;
    gap: 36px;
  }

  .viewport {
    margin-inline: -36px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pinHead::after,
  .buttonTime {
    animation: none;
  }

  .button {
    transition: none;
  }
}

@keyframes glint {
  0%,
  70%,
  100% {
    opacity: 0.85;
  }
  80% {
    opacity: 0.3;
  }
  88% {
    opacity: 1;
  }
}

@keyframes timeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```
