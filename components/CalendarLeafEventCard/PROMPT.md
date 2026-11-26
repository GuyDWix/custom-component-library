Create a custom element called "Calendar Leaf Event Card". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: event title and photo, short description, start and end date and time, event time zone, venue, details link and its label, add-to-calendar and confirmation labels. Add other settings if they help.

```tsx
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import styles from './Component.module.css';

export interface CalendarLeafEventCardProps {
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  startDate?: string;
  endDate?: string;
  timeZone?: string;
  venue?: string;
  detailsUrl?: string;
  detailsLabel?: string;
  addLabel?: string;
  addedLabel?: string;
  dateLanguage?: string;
  className?: string;
}

type Stamp = { y: number; mo: number; d: number; h: number; mi: number; timed: boolean };

const parseStamp = (value: string): Stamp | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, mo, d, h: Number(m[4] ?? 0), mi: Number(m[5] ?? 0), timed: m[4] !== undefined };
};

const wallClockMs = (s: Stamp) => Date.UTC(s.y, s.mo - 1, s.d, s.h, s.mi);

const validZone = (tz: string) => {
  if (!tz) return '';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return '';
  }
};

const zoneOffsetMs = (instant: number, tz: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(instant));
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second')) - instant;
};

/** Wall-clock time in `tz` → the real UTC instant (two passes settle DST edges). */
const toInstant = (s: Stamp, tz: string) => {
  const wall = wallClockMs(s);
  const first = wall - zoneOffsetMs(wall, tz);
  return wall - zoneOffsetMs(first, tz);
};

const fmt = (lang: string, s: Stamp, opts: Intl.DateTimeFormatOptions) => {
  const at = new Date(wallClockMs(s));
  try {
    return new Intl.DateTimeFormat(lang, { ...opts, timeZone: 'UTC' }).format(at);
  } catch {
    return new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }).format(at);
  }
};

const zoneName = (lang: string, s: Stamp, tz: string) => {
  try {
    const parts = new Intl.DateTimeFormat(lang, { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date(toInstant(s, tz)));
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
};

const sameDay = (a: Stamp, b: Stamp) => a.y === b.y && a.mo === b.mo && a.d === b.d;

const pad2 = (n: number) => String(n).padStart(2, '0');
const icsDate = (s: Stamp) => `${s.y}${pad2(s.mo)}${pad2(s.d)}`;
const icsLocal = (s: Stamp) => `${icsDate(s)}T${pad2(s.h)}${pad2(s.mi)}00`;
const icsUtc = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (t: string) => t.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

const shiftStamp = (s: Stamp, ms: number): Stamp => {
  const dt = new Date(wallClockMs(s) + ms);
  return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate(), h: dt.getUTCHours(), mi: dt.getUTCMinutes(), timed: s.timed };
};

type IcsInput = { title: string; description: string; venue: string; url: string; start: Stamp; end: Stamp | null; tz: string };

const buildIcs = ({ title, description, venue, url, start, end, tz }: IcsInput) => {
  const finish = end ?? shiftStamp(start, start.timed ? 2 * 3600e3 : 864e5);
  const timeOf = (s: Stamp) => (tz ? `${icsUtc(toInstant(s, tz))}` : icsLocal(s));
  const when = start.timed
    ? [`DTSTART:${timeOf(start)}`, `DTEND:${timeOf(finish)}`]
    : [`DTSTART;VALUE=DATE:${icsDate(start)}`, `DTEND;VALUE=DATE:${icsDate(finish)}`];
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Calendar Leaf Event Card//EN',
    'BEGIN:VEVENT',
    `UID:${icsLocal(start)}-${title.replace(/[^a-z0-9]/gi, '').slice(0, 24) || 'event'}@calendar-leaf`,
    `DTSTAMP:${icsUtc(Date.now())}`,
    ...when,
    `SUMMARY:${icsText(title)}`,
    description && `DESCRIPTION:${icsText(description)}`,
    venue && `LOCATION:${icsText(venue)}`,
    url && /^https?:/.test(url) && `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
};

const downloadIcs = (ics: string, title: string) => {
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'event'}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
};

const ClockIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.icon}>
    <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 6v4.2l2.8 1.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.icon}>
    <path d="M10 17.5s5.5-5 5.5-9.25a5.5 5.5 0 0 0-11 0C4.5 12.5 10 17.5 10 17.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="10" cy="8.25" r="1.9" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.arrow}>
    <path d="M4 10h11m-4.5-4.5L15 10l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TearIcon = ({ done }: { done: boolean }) => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.ctaIcon}>
    {done ? (
      <path d="M4.5 10.5l3.6 3.6L15.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <>
        <rect x="3.5" y="4.5" width="13" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3.5 8.5h13M7 2.75v3.5M13 2.75v3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    )}
  </svg>
);

const CURL_REST = 28;
const CURL_PEAK = 92;
const T_CURL = 220;
const T_RIP = 560;
const GRAVITY = 2400;

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const easeIn = (p: number) => p * p * p;

export default function CalendarLeafEventCard({
  title = 'Candlelit Winter Supper',
  description = 'Six seasonal courses, natural wines and one long shared table by the fire.',
  image = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&h=1000&fit=crop&auto=format&q=80',
  imageAlt = 'A warmly lit restaurant table set for dinner',
  startDate = '2026-12-12T19:30',
  endDate = '2026-12-12T22:30',
  timeZone = 'Europe/London',
  venue = 'Marlow & Pine, 18 Harbour Street',
  detailsUrl = '#',
  detailsLabel = 'Event details',
  addLabel = 'Add to calendar',
  addedLabel = 'Added',
  dateLanguage = 'en-US',
  className,
}: CalendarLeafEventCardProps) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const rootRef = useRef<HTMLDivElement>(null);
  const leafRef = useRef<HTMLSpanElement>(null);
  const stackRef = useRef<HTMLSpanElement>(null);
  const stubRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef(0);
  const [torn, setTorn] = useState(false);
  const [tearing, setTearing] = useState(false);
  const [seen, setSeen] = useState(false);
  const [hint, setHint] = useState(false);

  const tz = useMemo(() => validZone(timeZone.trim()), [timeZone]);
  const start = useMemo(() => parseStamp(startDate), [startDate]);
  const end = useMemo(() => {
    const e = parseStamp(endDate);
    return e && start && wallClockMs(e) > wallClockMs(start) ? e : null;
  }, [endDate, start]);

  const month = start ? fmt(dateLanguage, start, { month: 'long' }) : '';
  const weekday = start ? fmt(dateLanguage, start, { weekday: 'long' }) : '';
  const year = start ? String(start.y) : '';
  const day = start ? String(start.d) : '–';
  const shortDate = start ? fmt(dateLanguage, start, { weekday: 'short', month: 'short', day: 'numeric' }) : '';
  const fullDate = start ? fmt(dateLanguage, start, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '';

  const startTime = start?.timed ? fmt(dateLanguage, start, { hour: 'numeric', minute: '2-digit' }) : '';
  const timeLine = useMemo(() => {
    if (!start || !start.timed) return '';
    const t = (s: Stamp) => fmt(dateLanguage, s, { hour: 'numeric', minute: '2-digit' });
    const zone = tz ? ` ${zoneName(dateLanguage, start, tz)}` : '';
    if (!end) return `${t(start)}${zone}`;
    const endText = sameDay(start, end) ? t(end) : `${fmt(dateLanguage, end, { month: 'short', day: 'numeric' })}, ${t(end)}`;
    return `${t(start)} – ${endText}${zone}`;
  }, [start, end, dateLanguage, tz]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setSeen(true);
        io.disconnect();
      },
      { threshold: 0.35 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const tearLeaf = () => {
    const leaf = leafRef.current;
    const stack = stackRef.current;
    const stub = stubRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!leaf || !stack || !stub || reduced) {
      setTorn(true);
      return;
    }
    setTearing(true);
    leaf.style.transition = 'none';
    leaf.style.animation = 'none';
    const t0 = performance.now();
    let last = t0;
    let fall: { x: number; y: number; vx: number; vy: number; r: number; vr: number; t: number } | null = null;
    const spring = { y: 2, v: 0, live: false };

    const frame = (now: number) => {
      const t = now - t0;
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      if (t < T_CURL) {
        const p = easeOut(t / T_CURL);
        leaf.style.setProperty('--curl', `${CURL_REST + p * (CURL_PEAK - CURL_REST)}px`);
        leaf.style.transform = `rotate(${p * 1.4}deg) skewY(${-p * 1.2}deg)`;
        stack.style.transform = `translateY(${p * 2}px)`;
      } else if (t < T_RIP) {
        const p = easeIn((t - T_CURL) / (T_RIP - T_CURL));
        leaf.style.setProperty('--curl', `${CURL_PEAK - p * 30}px`);
        leaf.style.transform = `rotate(${1.4 + p * 17}deg) skewY(${-1.2 - p * 2}deg)`;
        stub.style.clipPath = `inset(0 0 0 ${(1 - p) * 100}%)`;
      } else {
        if (!fall) {
          fall = { x: 0, y: 0, vx: 90, vy: -120, r: 18.4, vr: 70, t: 0 };
          stub.style.clipPath = 'inset(0)';
          spring.live = true;
          spring.v = -180;
          setTorn(true);
        }
        fall.t += dt;
        fall.vy += GRAVITY * dt;
        fall.vx *= 1 - 0.6 * dt;
        fall.x += fall.vx * dt;
        fall.y += fall.vy * dt;
        fall.r += fall.vr * dt;
        const flutter = Math.sin(fall.t * 11) * 26 * Math.exp(-fall.t * 1.4);
        const bend = CURL_PEAK - 30 + Math.sin(fall.t * 7.5) * 26 * Math.exp(-fall.t * 0.9);
        leaf.style.setProperty('--curl', `${bend}px`);
        leaf.style.transform = `translate(${fall.x}px, ${fall.y}px) rotate(${fall.r}deg) perspective(900px) rotateY(${flutter}deg) rotateX(${flutter * 0.5}deg)`;
        leaf.style.opacity = String(Math.max(0, 1 - Math.max(0, fall.t - 0.42) / 0.32));
      }

      if (spring.live) {
        spring.v += (-520 * spring.y - 16 * spring.v) * dt;
        spring.y += spring.v * dt;
        stack.style.transform = `translateY(${spring.y}px)`;
        stub.style.transform = `rotate(${spring.y * 0.35}deg)`;
      }

      const done = fall !== null && fall.t > 0.8 && Math.abs(spring.y) < 0.05 && Math.abs(spring.v) < 0.5;
      if (done) {
        leaf.style.visibility = 'hidden';
        stack.style.transform = '';
        stub.style.transform = '';
        setTearing(false);
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  };

  const addToCalendar = () => {
    if (!start) return;
    downloadIcs(buildIcs({ title, description, venue, url: detailsUrl, start, end, tz }), title);
    if (!torn && !tearing) tearLeaf();
  };

  const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');
  const ctaAria = `${addLabel}: ${title}${fullDate ? `, ${fullDate}` : ''}${timeLine ? `, ${timeLine}` : ''}`;
  const hintOn = () => setHint(true);
  const hintOff = () => setHint(false);

  return (
    <div ref={rootRef} className={cx(styles.root, className)}>
      <article className={cx(styles.card, seen && styles.cardSeen)} aria-labelledby={titleId}>
        <span className={styles.atmos} aria-hidden={image ? undefined : true}>
          <span className={styles.atmosTint} />
          {image ? (
            <img className={styles.photo} src={image} alt={imageAlt} draggable={false} />
          ) : (
            <span className={styles.photoFallback} />
          )}
          <span className={styles.atmosLift} />
        </span>
        <span className={styles.grain} aria-hidden="true" />

        <div className={styles.padSlot}>
          <span className={cx(styles.pad, seen && styles.padSeen)} aria-hidden="true">
            <span className={styles.padShadow} />
            <span ref={stackRef} className={styles.stack}>
              <span className={styles.edgeThree} />
              <span className={styles.edgeTwo} />
              <span className={styles.edgeOne} />
              <span className={styles.under}>
                <span className={styles.ghost}>{day}</span>
                <span className={styles.underBody}>
                  <svg viewBox="0 0 48 48" className={styles.tick}>
                    <circle className={cx(styles.tickRing, torn && styles.tickRingOn)} cx="24" cy="24" r="21" />
                    <path className={cx(styles.tickMark, torn && styles.tickMarkOn)} d="M14.5 24.5l6.5 6.5 12.5-14" />
                  </svg>
                  <span className={cx(styles.underLabel, torn && styles.underLabelOn)}>{addedLabel}</span>
                  <span className={cx(styles.underDate, torn && styles.underDateOn)}>{shortDate}</span>
                </span>
              </span>
            </span>

            <span
              ref={leafRef}
              className={cx(styles.leaf, hint && !torn && styles.leafHint, seen && styles.leafSeen, torn && styles.leafTorn, torn && !tearing && styles.leafGone)}
              onClick={addToCalendar}
              onPointerEnter={hintOn}
              onPointerLeave={hintOff}
            >
              <span className={styles.perforation} />
              <span className={styles.leafHead}>
                <span className={styles.month}>{month}</span>
                <span className={styles.weekday}>{weekday}</span>
              </span>
              <span className={styles.day}>{day}</span>
              <span className={styles.leafFoot}>
                <span className={styles.leafTime}>{startTime}</span>
                <span className={styles.leafYear}>{year}</span>
              </span>
              <span className={styles.leafGrain} />
              <span className={styles.curl} />
            </span>

            <span ref={stubRef} className={cx(styles.stub, torn && styles.stubOn)} />
            <span className={styles.binding}>
              <span className={styles.slot} />
              <span className={styles.slot} />
            </span>
          </span>
        </div>

        <div className={styles.info}>
          <h3 id={titleId} className={styles.title}>
            {title}
          </h3>
          {description && <p className={styles.description}>{description}</p>}

          {(timeLine || venue) && (
            <ul className={styles.facts}>
              {timeLine && (
                <li className={styles.fact}>
                  <ClockIcon />
                  <span className={styles.factText}>{timeLine}</span>
                </li>
              )}
              {venue && (
                <li className={styles.fact}>
                  <PinIcon />
                  <span className={styles.factText}>{venue}</span>
                </li>
              )}
            </ul>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={cx(styles.cta, torn && styles.ctaDone)}
              onClick={addToCalendar}
              onPointerEnter={hintOn}
              onPointerLeave={hintOff}
              onFocus={hintOn}
              onBlur={hintOff}
              aria-label={ctaAria}
              aria-description="Downloads a calendar file for this event."
              disabled={!start}
            >
              <TearIcon done={torn} />
              <span className={styles.ctaText}>{torn ? addedLabel : addLabel}</span>
            </button>

            {detailsUrl && detailsLabel && (
              <a className={styles.details} href={detailsUrl}>
                <span className={styles.detailsText}>{detailsLabel}</span>
                <ArrowIcon />
              </a>
            )}
          </div>
        </div>

        <span className={styles.status} role="status">
          {torn ? `${addedLabel}: ${title}` : ''}
        </span>
      </article>
    </div>
  );
}
```

```css
@property --curl {
  syntax: '<length>';
  inherits: true;
  initial-value: 28px;
}

.root {
  --accent: #ff5a36;
  --cl-font-numeral: 'Oswald', 'Arial Narrow', sans-serif;
  --cl-font-display: 'Oswald', 'Arial Narrow', sans-serif;
  --cl-font-ui: system-ui, -apple-system, 'Segoe UI', sans-serif;
  --cl-ease: cubic-bezier(0.16, 1, 0.3, 1);

  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  display: grid;
  justify-items: center;
  color: #f3efe7;
  font-family: var(--cl-font-ui);
}

.card {
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  inline-size: min(100%, 1080px);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 30px;
  padding: 26px 20px 26px;
  border-radius: 24px;
  background: #0d0e12;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.07),
    0 2px 4px rgba(0, 0, 0, 0.3),
    0 40px 80px -36px rgba(0, 0, 0, 0.8);
}

/* Atmosphere: duotone photo, ink → accent */

.atmos {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  border-radius: inherit;
  isolation: isolate;
  -webkit-mask-image: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0.85) 30%, transparent 62%);
  mask-image: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0.85) 30%, transparent 62%);
}

.atmosTint,
.atmosLift,
.photoFallback {
  position: absolute;
  inset: 0;
}

.atmosTint {
  background: var(--accent);
}

.photo {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  filter: grayscale(1) contrast(1.3) brightness(0.92);
  mix-blend-mode: multiply;
  user-select: none;
}

.photoFallback {
  background:
    radial-gradient(40% 50% at 78% 30%, rgba(255, 255, 255, 0.5) 0%, transparent 70%),
    radial-gradient(30% 40% at 30% 20%, rgba(255, 255, 255, 0.28) 0%, transparent 70%),
    #000;
  mix-blend-mode: multiply;
}

.atmosLift {
  background: #1a0f0d;
  mix-blend-mode: lighten;
}

.cardSeen .photo {
  animation: drift 2400ms var(--cl-ease) both;
}

.grain {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  opacity: 0.05;
  mix-blend-mode: screen;
  pointer-events: none;
}

/* Pad: the hero */

.padSlot {
  position: relative;
  z-index: 3;
  container-type: inline-size;
  inline-size: min(100%, 440px);
  justify-self: center;
  align-self: start;
}

.pad {
  position: relative;
  display: block;
  inline-size: 100%;
  aspect-ratio: 0.84;
  transform: rotate(-2.5deg);
  transform-origin: 50% 0;
}

.padSeen {
  animation: hang 1300ms cubic-bezier(0.2, 0.9, 0.3, 1) both;
}

.padShadow {
  position: absolute;
  inset: 36px 5% -4px 7%;
  border-radius: 12px;
  box-shadow:
    0 30px 50px -14px rgba(0, 0, 0, 0.85),
    0 8px 16px -6px rgba(0, 0, 0, 0.6);
}

.binding {
  position: absolute;
  z-index: 6;
  inset-block-start: 0;
  inset-inline: -2px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  block-size: 34px;
  padding-inline: 22%;
  border-radius: 8px 8px 2px 2px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0, rgba(255, 255, 255, 0) 2px),
    linear-gradient(180deg, transparent 70%, rgba(0, 0, 0, 0.22) 100%),
    var(--accent);
  box-shadow: 0 3px 6px -2px rgba(0, 0, 0, 0.55);
}

.slot {
  inline-size: 30px;
  block-size: 9px;
  border-radius: 6px;
  background: #0d0e12;
  box-shadow: inset 0 2px 2px rgba(0, 0, 0, 0.6), 0 1px 0 rgba(255, 255, 255, 0.25);
}

.stack {
  position: absolute;
  z-index: 1;
  inset: 34px 0 0;
}

.edgeOne,
.edgeTwo,
.edgeThree,
.under {
  position: absolute;
  border-radius: 0 0 8px 8px;
}

.edgeThree {
  inset: 0 1.5% 0;
  background: #26272d;
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.08);
}

.edgeTwo {
  inset: 0 1% 5px;
  background: #1d1e23;
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.1);
}

.edgeOne {
  inset: 0 0.5% 10px;
  background: #1a1b20;
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.12);
}

.under {
  inset: 0 0 15px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.35) 0, transparent 26px),
    #111216;
}

.ghost {
  position: absolute;
  inset-inline-start: 7.5cqi;
  inset-block-end: 13cqi;
  font-family: var(--cl-font-numeral);
  font-size: 74cqi;
  font-weight: 700;
  line-height: 0.78;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: transparent;
  -webkit-text-stroke: 1px rgba(243, 239, 231, 0.13);
}

.underBody {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding-inline: 12%;
  text-align: center;
}

.tick {
  inline-size: 64px;
  block-size: 64px;
  color: var(--accent);
}

.tickRing,
.tickMark {
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.tickRing {
  stroke-width: 2;
  stroke-dasharray: 132;
  stroke-dashoffset: 132;
  opacity: 0.45;
}

.tickMark {
  stroke-width: 3.5;
  stroke-dasharray: 32;
  stroke-dashoffset: 32;
}

.tickRingOn {
  animation: draw 620ms var(--cl-ease) 80ms forwards;
}

.tickMarkOn {
  animation: draw 460ms var(--cl-ease) 340ms forwards;
}

.underLabel {
  font-family: var(--cl-font-display);
  font-size: clamp(18px, 6.4cqi, 26px);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: #f3efe7;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  opacity: 0;
  transform: translateY(8px);
}

.underDate {
  font-size: 14px;
  font-weight: 500;
  color: rgba(243, 239, 231, 0.64);
  opacity: 0;
  transform: translateY(6px);
}

.underLabelOn {
  animation: rise 520ms var(--cl-ease) 420ms forwards;
}

.underDateOn {
  animation: rise 520ms var(--cl-ease) 500ms forwards;
}

.stub {
  position: absolute;
  z-index: 5;
  inset-block-start: 32px;
  inset-inline: 0;
  block-size: 13px;
  clip-path: inset(0 0 0 100%);
  transform-origin: 50% 0;
}

.stub::before {
  content: '';
  position: absolute;
  inset: 0;
  background: #16171c;
  clip-path: polygon(0 0, 100% 0, 100% 55%, 97% 80%, 93% 50%, 89% 85%, 84% 55%, 80% 95%, 75% 60%, 70% 88%, 65% 52%, 60% 90%, 55% 58%, 50% 84%, 45% 50%, 40% 92%, 35% 60%, 30% 86%, 25% 54%, 20% 90%, 15% 58%, 10% 84%, 5% 52%, 0 78%);
}

.stubOn {
  clip-path: inset(0);
}

.leaf {
  --curl: 28px;
  position: absolute;
  z-index: 4;
  inset: 34px 0 15px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: 26px 7.5cqi 7cqi;
  border-radius: 0 0 8px 8px;
  background:
    radial-gradient(120% 70% at 15% 0%, rgba(255, 255, 255, 0.06) 0%, transparent 60%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0, transparent 14px),
    #16171c;
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - var(--curl)), calc(100% - var(--curl)) 100%, 0 100%);
  transform-origin: 3% 0;
  cursor: pointer;
  transition: --curl 480ms var(--cl-ease);
  -webkit-tap-highlight-color: transparent;
}

.leafHint {
  --curl: 58px;
}

/* Torn top edge (mirrors the stub's ragged rip) + the live curl corner. */
.leafTorn {
  clip-path: polygon(
    0 15px,
    3% 4px,
    6% 16px,
    9.5% 5px,
    13% 14px,
    16.5% 6px,
    20% 15px,
    24% 4px,
    27.5% 13px,
    31% 6px,
    35% 16px,
    38.5% 5px,
    42% 14px,
    46% 4px,
    49.5% 15px,
    53% 6px,
    57% 13px,
    60.5% 4px,
    64% 16px,
    67.5% 6px,
    71% 14px,
    75% 4px,
    78.5% 15px,
    82% 5px,
    86% 13px,
    89.5% 6px,
    93% 16px,
    96.5% 5px,
    100% 12px,
    100% calc(100% - var(--curl)),
    calc(100% - var(--curl)) 100%,
    0 100%
  );
}

.leafSeen {
  animation: curlHint 1500ms var(--cl-ease) 1300ms 1;
}

.leafGone {
  visibility: hidden;
  opacity: 0;
  transition:
    opacity 260ms ease-out,
    visibility 0s linear 260ms;
}

.perforation {
  position: absolute;
  inset-block-start: 11px;
  inset-inline: 10px;
  block-size: 3px;
  background: radial-gradient(circle, rgba(0, 0, 0, 0.85) 1.2px, transparent 1.6px) 0 50% / 7px 3px repeat-x;
  opacity: 0.9;
}

.leafHead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  min-inline-size: 0;
}

.month {
  font-family: var(--cl-font-display);
  font-size: clamp(18px, 7cqi, 30px);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--accent);
  overflow-wrap: anywhere;
}

.weekday {
  font-size: clamp(13px, 4cqi, 17px);
  font-weight: 500;
  color: rgba(243, 239, 231, 0.64);
  white-space: nowrap;
}

.day {
  align-self: end;
  margin-inline-start: -0.035em;
  font-family: var(--cl-font-numeral);
  font-size: 74cqi;
  font-weight: 700;
  line-height: 0.78;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: #f3efe7;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.5);
}

.leafFoot {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-block-start: 6cqi;
  padding-block-start: 12px;
  padding-inline-end: 9cqi;
  border-block-start: 1px solid rgba(243, 239, 231, 0.12);
  font-size: clamp(13px, 4cqi, 17px);
  font-variant-numeric: tabular-nums;
}

.leafTime {
  font-weight: 650;
  color: #f3efe7;
}

.leafYear {
  color: rgba(243, 239, 231, 0.64);
}

.leafGrain {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  opacity: 0.06;
  mix-blend-mode: screen;
  pointer-events: none;
}

.curl {
  position: absolute;
  inset-block-end: 0;
  inset-inline-end: 0;
  inline-size: var(--curl);
  block-size: var(--curl);
  filter: drop-shadow(-4px -3px 5px rgba(0, 0, 0, 0.55));
  pointer-events: none;
}

.curl::before {
  content: '';
  position: absolute;
  inset: 0;
  border-start-start-radius: 30% 30%;
  background: linear-gradient(135deg, #9c968b 0%, #d8d2c6 38%, #f6f2ea 62%, #e2dccf 100%);
  clip-path: polygon(0 0, 100% 0, 0 100%);
}

/* Info */

.info {
  position: relative;
  z-index: 2;
  display: grid;
  align-content: end;
  gap: 14px;
  min-inline-size: 0;
}

.title {
  margin: 0;
  font-family: var(--cl-font-display);
  font-size: clamp(28px, 8.6cqi, 36px);
  font-weight: 700;
  line-height: 1.04;
  letter-spacing: -0.03em;
  color: #f3efe7;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.description {
  margin: 0;
  max-inline-size: 46ch;
  font-size: 16px;
  line-height: 1.55;
  color: rgba(243, 239, 231, 0.64);
  overflow-wrap: anywhere;
}

.facts {
  display: grid;
  gap: 10px;
  margin: 6px 0 0;
  padding: 18px 0 0;
  list-style: none;
  border-block-start: 1px solid rgba(243, 239, 231, 0.12);
}

.fact {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 15px;
  line-height: 1.45;
  color: #f3efe7;
  font-variant-numeric: tabular-nums;
}

.icon {
  flex: none;
  inline-size: 18px;
  block-size: 18px;
  margin-block-start: 2px;
  color: var(--accent);
}

.factText {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 24px;
  margin-block-start: 12px;
}

.cta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-block-size: 50px;
  max-inline-size: 100%;
  padding: 12px 22px 12px 18px;
  border: 0;
  border-radius: 14px;
  background: var(--accent);
  color: #160b08;
  font: inherit;
  font-size: 15.5px;
  font-weight: 650;
  letter-spacing: -0.005em;
  line-height: 1.25;
  text-align: start;
  cursor: pointer;
  box-shadow: 0 12px 28px -14px color-mix(in srgb, var(--accent) 80%, transparent);
  transition:
    transform 220ms var(--cl-ease),
    background-color 220ms var(--cl-ease),
    color 220ms var(--cl-ease),
    box-shadow 220ms var(--cl-ease);
  -webkit-tap-highlight-color: transparent;
}

.cta:hover {
  transform: translateY(-1px);
  background-color: color-mix(in srgb, var(--accent) 88%, white);
}

.cta:active {
  transform: scale(0.98);
  transition-duration: 100ms;
}

.cta:focus-visible {
  outline: 2px solid #f3efe7;
  outline-offset: 3px;
}

.cta:disabled {
  cursor: default;
  opacity: 0.5;
}

.ctaDone {
  background: transparent;
  color: #f3efe7;
  box-shadow: inset 0 0 0 1px rgba(243, 239, 231, 0.24);
}

.ctaDone:hover {
  background-color: rgba(243, 239, 231, 0.06);
}

.ctaIcon {
  flex: none;
  inline-size: 20px;
  block-size: 20px;
}

.ctaText {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.details {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-block-size: 44px;
  max-inline-size: 100%;
  font-size: 15px;
  font-weight: 600;
  color: #f3efe7;
  text-decoration: none;
  border-radius: 6px;
}

.detailsText {
  overflow-wrap: anywhere;
  background: linear-gradient(currentColor, currentColor) 0 100% / 0% 1px no-repeat;
  transition: background-size 320ms var(--cl-ease);
}

.details:hover .detailsText,
.details:focus-visible .detailsText {
  background-size: 100% 1px;
}

.details:focus-visible {
  outline: 2px solid #f3efe7;
  outline-offset: 4px;
}

.arrow {
  flex: none;
  inline-size: 18px;
  block-size: 18px;
  color: var(--accent);
  transition: transform 320ms var(--cl-ease);
}

.details:hover .arrow {
  transform: translateX(3px);
}

.title::selection,
.description::selection,
.factText::selection,
.detailsText::selection {
  background: var(--accent);
  color: #160b08;
}

.status {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@container (min-width: 760px) {
  .card {
    grid-template-columns: minmax(0, 1fr);
    gap: 30px;
    padding: 46px 56px 56px;
    border-radius: 28px;
  }

  /* The photo is an atmospheric band only; the pad is the whole field. */
  .atmos {
    -webkit-mask-image: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0.82) 32%, transparent 58%);
    mask-image: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0.82) 32%, transparent 58%);
  }

  .padSlot {
    justify-self: stretch;
    inline-size: 100%;
  }

  .pad {
    aspect-ratio: 1.8;
  }

  .month {
    font-size: min(6cqi, 60px);
  }

  .weekday {
    font-size: min(2.6cqi, 24px);
  }

  .day {
    font-size: 33cqi;
  }

  .leaf {
    padding-block-end: 4cqi;
  }

  .leafFoot {
    margin-block-start: 2cqi;
    font-size: min(2.4cqi, 22px);
  }

  .ghost {
    font-size: 62cqi;
    inset-block-end: 3cqi;
  }

  .info {
    align-content: start;
  }

  .title {
    font-size: clamp(34px, 4.3cqi, 50px);
  }

  .description {
    font-size: 17px;
  }
}

@keyframes hang {
  0% {
    transform: translateY(-22px) rotate(-7deg);
  }
  55% {
    transform: translateY(2px) rotate(-1deg);
  }
  78% {
    transform: translateY(-1px) rotate(-3deg);
  }
  100% {
    transform: rotate(-2.5deg);
  }
}

@keyframes drift {
  from {
    transform: scale(1.12) translateY(-2%);
  }
  to {
    transform: none;
  }
}

@keyframes curlHint {
  0%,
  100% {
    --curl: 28px;
  }
  35% {
    --curl: 64px;
  }
  60% {
    --curl: 40px;
  }
}

@keyframes draw {
  to {
    stroke-dashoffset: 0;
    opacity: 1;
  }
}

@keyframes rise {
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .padSeen,
  .leafSeen,
  .cardSeen .photo {
    animation: none;
  }

  .tickRingOn,
  .tickMarkOn {
    animation: none;
    stroke-dashoffset: 0;
    opacity: 1;
  }

  .underLabelOn,
  .underDateOn {
    animation: none;
    opacity: 1;
    transform: none;
  }

  .leaf,
  .cta,
  .arrow,
  .detailsText {
    transition: none;
  }

  .leafGone {
    transition: opacity 200ms linear, visibility 0s linear 200ms;
  }
}
```
