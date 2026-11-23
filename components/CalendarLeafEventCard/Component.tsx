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

const utc = (s: Stamp) => new Date(Date.UTC(s.y, s.mo - 1, s.d, s.h, s.mi));

const fmt = (lang: string, s: Stamp, opts: Intl.DateTimeFormatOptions) => {
  try {
    return new Intl.DateTimeFormat(lang, { ...opts, timeZone: 'UTC' }).format(utc(s));
  } catch {
    return new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }).format(utc(s));
  }
};

const sameDay = (a: Stamp, b: Stamp) => a.y === b.y && a.mo === b.mo && a.d === b.d;

const pad2 = (n: number) => String(n).padStart(2, '0');
const icsDate = (s: Stamp) => `${s.y}${pad2(s.mo)}${pad2(s.d)}`;
const icsDateTime = (s: Stamp) => `${icsDate(s)}T${pad2(s.h)}${pad2(s.mi)}00`;
const icsText = (t: string) => t.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

const fromDate = (dt: Date, timed: boolean): Stamp => ({
  y: dt.getUTCFullYear(),
  mo: dt.getUTCMonth() + 1,
  d: dt.getUTCDate(),
  h: dt.getUTCHours(),
  mi: dt.getUTCMinutes(),
  timed,
});

const buildIcs = (title: string, description: string, venue: string, url: string, start: Stamp, end: Stamp | null) => {
  const finish = end ?? fromDate(new Date(utc(start).getTime() + (start.timed ? 2 * 3600e3 : 864e5)), start.timed);
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}00Z`;
  const when = start.timed
    ? [`DTSTART:${icsDateTime(start)}`, `DTEND:${icsDateTime(finish)}`]
    : [`DTSTART;VALUE=DATE:${icsDate(start)}`, `DTEND;VALUE=DATE:${icsDate(finish)}`];
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Calendar Leaf Event Card//EN',
    'BEGIN:VEVENT',
    `UID:${icsDateTime(start)}-${title.replace(/[^a-z0-9]/gi, '').slice(0, 24) || 'event'}@calendar-leaf`,
    `DTSTAMP:${stamp}`,
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

const ClockIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.icon}>
    <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 6v4.2l2.8 1.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.icon}>
    <path
      d="M10 17.5s5.5-5 5.5-9.25a5.5 5.5 0 0 0-11 0C4.5 12.5 10 17.5 10 17.5Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="8.25" r="1.9" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.arrow}>
    <path d="M4 10h11m-4.5-4.5L15 10l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function CalendarLeafEventCard({
  title = 'Candlelit Winter Supper',
  description = 'Six seasonal courses, natural wines and one long shared table by the fire.',
  image = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=960&h=720&fit=crop&auto=format&q=80',
  imageAlt = 'A warmly lit restaurant table set for dinner',
  startDate = '2026-12-12T19:30',
  endDate = '2026-12-12T22:30',
  venue = 'Marlow & Pine, 18 Harbour Street',
  detailsUrl = '#',
  detailsLabel = 'Event details',
  addLabel = 'Add to calendar',
  addedLabel = 'Added',
  dateLanguage = 'en-US',
  leafColor = '#e14b32',
  className,
}: CalendarLeafEventCardProps) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [torn, setTorn] = useState(false);
  const [seen, setSeen] = useState(false);

  const start = useMemo(() => parseStamp(startDate), [startDate]);
  const end = useMemo(() => {
    const e = parseStamp(endDate);
    return e && start && utc(e) > utc(start) ? e : null;
  }, [endDate, start]);

  const month = start ? fmt(dateLanguage, start, { month: 'short' }) : '';
  const weekday = start ? fmt(dateLanguage, start, { weekday: 'short' }) : '';
  const day = start ? String(start.d) : '—';
  const fullDate = start ? fmt(dateLanguage, start, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '';

  const timeLine = useMemo(() => {
    if (!start || !start.timed) return '';
    const t = (s: Stamp) => fmt(dateLanguage, s, { hour: 'numeric', minute: '2-digit' });
    if (!end) return t(start);
    const endText = sameDay(start, end) ? t(end) : `${fmt(dateLanguage, end, { month: 'short', day: 'numeric' })}, ${t(end)}`;
    return `${t(start)} – ${endText}`;
  }, [start, end, dateLanguage]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setSeen(true);
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const addToCalendar = () => {
    if (!start) return;
    const ics = buildIcs(title, description, venue, detailsUrl, start, end);
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'event'}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    setTorn(true);
  };

  const cx = (base: string, onTorn: string, extra = '') => [base, torn && onTorn, extra].filter(Boolean).join(' ');
  const rootStyle = { '--cl-leaf': leafColor } as CSSProperties;
  const leafAria = `${torn ? `${addedLabel}. ` : ''}${addLabel}: ${title}${fullDate ? `, ${fullDate}` : ''}${timeLine ? `, ${timeLine}` : ''}`;

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <article className={styles.card} aria-labelledby={titleId}>
        <span className={styles.grain} aria-hidden="true" />

        <div className={styles.media}>
          {image ? (
            <img className={styles.photo} src={image} alt={imageAlt} draggable={false} />
          ) : (
            <span className={styles.photoFallback} aria-hidden="true" />
          )}
          <span className={styles.scrim} aria-hidden="true" />
        </div>

        <button
          type="button"
          className={styles.leafButton}
          onClick={addToCalendar}
          aria-label={leafAria}
          aria-description="Downloads a calendar file for this event."
          disabled={!start}
        >
          <span className={styles.binding} aria-hidden="true">
            <span className={styles.ring} />
            <span className={styles.ring} />
          </span>
          <span className={styles.sheet} aria-hidden="true">
            <span className={styles.under}>
              <svg viewBox="0 0 40 40" className={styles.tick}>
                <circle className={cx(styles.tickRing, styles.tickRingTorn)} cx="20" cy="20" r="17" />
                <path className={cx(styles.tickMark, styles.tickMarkTorn)} d="M12.5 20.5l5 5 10-11" />
              </svg>
              <span className={cx(styles.underLabel, styles.underLabelTorn)}>{addedLabel}</span>
              <span className={cx(styles.underDate, styles.underDateTorn)}>
                {month} {day}
              </span>
            </span>
            <span className={cx(styles.stub, styles.stubTorn)} />
            <span className={cx(styles.leaf, styles.leafTorn, seen ? styles.leafSeen : '')}>
              <span className={styles.leafHead}>
                <span className={styles.month}>{month}</span>
                <span className={styles.weekday}>{weekday}</span>
              </span>
              <span className={styles.leafBody}>
                <span className={styles.day}>{day}</span>
                <span className={styles.leafCta}>{addLabel}</span>
              </span>
              <span className={styles.curl} />
            </span>
          </span>
        </button>

        <div className={styles.body}>
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

          {detailsUrl && detailsLabel && (
            <a className={styles.details} href={detailsUrl}>
              <span className={styles.detailsText}>{detailsLabel}</span>
              <ArrowIcon />
            </a>
          )}
        </div>

        <span className={styles.status} role="status">
          {torn ? addedLabel : ''}
        </span>
      </article>
    </div>
  );
}
