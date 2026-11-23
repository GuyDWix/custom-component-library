import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
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
  leafColor?: string;
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
  leafColor = '#ff5a36',
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
  const rootStyle = { '--cl-accent': leafColor } as CSSProperties;
  const ctaAria = `${addLabel}: ${title}${fullDate ? `, ${fullDate}` : ''}${timeLine ? `, ${timeLine}` : ''}`;
  const hintOn = () => setHint(true);
  const hintOff = () => setHint(false);

  return (
    <div ref={rootRef} className={cx(styles.root, className)} style={rootStyle}>
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
