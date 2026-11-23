Create a custom element called "Calendar Leaf Event Card". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: event title and photo, short description, start and end date and time, venue, details link and its label, add-to-calendar and confirmation labels, leaf color. Add other settings if they help.

```tsx
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
```

```css
.root {
  --cl-leaf: #e14b32;
  --cl-paper: #fbf8f2;
  --cl-paper-shade: #f1ece2;
  --cl-kraft: #c9a679;
  --cl-kraft-deep: #a9834f;
  --cl-ink: #26231f;
  --cl-muted: rgba(38, 35, 31, 0.64);
  --cl-hairline: rgba(38, 35, 31, 0.12);
  --cl-font-display: 'Fraunces', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
  --cl-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --cl-font-numeral: 'Inter Tight', 'Inter', 'Helvetica Neue', Arial, sans-serif;
  --cl-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.3  0 0 0 .8 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --cl-ease: cubic-bezier(0.22, 1, 0.36, 1);

  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  display: grid;
  justify-items: center;
  color: var(--cl-ink);
  font-family: var(--cl-font-ui);
}

.card {
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  inline-size: min(100%, 420px);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border-radius: 20px;
  background: linear-gradient(180deg, var(--cl-paper) 0%, var(--cl-paper-shade) 100%);
  box-shadow:
    0 0 0 1px var(--cl-hairline),
    0 1px 2px rgba(38, 35, 31, 0.06),
    0 24px 48px -28px rgba(70, 48, 22, 0.38);
}

.grain {
  position: absolute;
  inset: 0;
  z-index: 3;
  border-radius: inherit;
  background-image: var(--cl-noise);
  opacity: 0.12;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.media {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 10.5;
  border-start-start-radius: 20px;
  border-start-end-radius: 20px;
  background: var(--cl-paper-shade);
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  user-select: none;
}

.photoFallback {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(80% 90% at 85% 100%, color-mix(in srgb, var(--cl-leaf) 32%, transparent) 0%, transparent 70%),
    repeating-linear-gradient(90deg, transparent 0 22px, rgba(38, 35, 31, 0.05) 22px 23px),
    linear-gradient(160deg, #efe2cc 0%, #e4cfae 100%);
}

.scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(20, 14, 8, 0.28) 0%, transparent 38%, transparent 72%, rgba(20, 14, 8, 0.12) 100%);
  pointer-events: none;
}

/* Leaf: the hero */

.leafButton {
  position: absolute;
  z-index: 4;
  inset-block-start: 16px;
  inset-inline-start: 16px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  inline-size: 112px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  filter: drop-shadow(0 1px 1px rgba(40, 24, 10, 0.18)) drop-shadow(0 12px 18px rgba(40, 24, 10, 0.28));
  transition: transform 320ms var(--cl-ease);
}

.leafButton:hover {
  transform: translateY(-2px) rotate(-1deg);
}

.leafButton:active {
  transform: translateY(0) scale(0.98);
  transition-duration: 120ms;
}

.leafButton:focus-visible {
  outline: 2.5px solid var(--cl-paper);
  outline-offset: 3px;
  box-shadow: 0 0 0 6px var(--cl-ink);
}

.leafButton:disabled {
  cursor: default;
}

.binding {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-around;
  align-items: center;
  block-size: 16px;
  padding-inline: 18px;
  border-start-start-radius: 8px;
  border-start-end-radius: 8px;
  background-color: var(--cl-kraft);
  background-image:
    var(--cl-noise),
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(0, 0, 0, 0.08));
  background-blend-mode: multiply, normal;
}

.ring {
  inline-size: 7px;
  block-size: 7px;
  border-radius: 50%;
  background: #3a2c1c;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
}

.sheet {
  position: relative;
  display: block;
  block-size: 124px;
}

.under,
.stub,
.leaf {
  position: absolute;
  inset: 0;
}

.under {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding-inline: 8px;
  border-end-start-radius: 8px;
  border-end-end-radius: 8px;
  background: var(--cl-paper);
  text-align: center;
}

.tick {
  inline-size: 40px;
  block-size: 40px;
  color: var(--cl-leaf);
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
  stroke-dasharray: 107;
  stroke-dashoffset: 107;
  opacity: 0.35;
}

.tickMark {
  stroke-width: 3;
  stroke-dasharray: 26;
  stroke-dashoffset: 26;
}

.underLabel {
  font-size: 12.5px;
  font-weight: 650;
  letter-spacing: -0.005em;
  line-height: 1.2;
  color: var(--cl-ink);
  overflow-wrap: anywhere;
  opacity: 0;
  transform: translateY(4px);
}

.underDate {
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cl-muted);
  opacity: 0;
}

.stub {
  inset-block-end: auto;
  block-size: 10px;
  background: var(--cl-leaf);
  clip-path: polygon(0 0, 100% 0, 100% 60%, 94% 100%, 86% 55%, 78% 95%, 70% 50%, 61% 90%, 52% 45%, 44% 100%, 35% 55%, 27% 95%, 18% 50%, 9% 90%, 0 60%);
  opacity: 0;
}

.leaf {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-end-start-radius: 8px;
  border-end-end-radius: 8px;
  background: var(--cl-paper);
  transform-origin: 100% 0;
  will-change: transform;
}

.leafSeen {
  animation: flutter 1.4s var(--cl-ease) 700ms 2;
}

.leafHead {
  position: relative;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  padding: 8px 10px 7px;
  background-color: var(--cl-leaf);
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(0, 0, 0, 0.06));
  color: #fff;
}

.leafHead::after {
  content: '';
  position: absolute;
  inset-inline: 4px;
  inset-block-start: 1px;
  block-size: 1px;
  background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.55) 0 3px, transparent 3px 6px);
}

.month {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
}

.weekday {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.85;
  white-space: nowrap;
}

.leafBody {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 2px 8px 10px;
  background:
    linear-gradient(180deg, rgba(38, 35, 31, 0.06) 0, transparent 6px),
    var(--cl-paper);
}

.day {
  font-family: var(--cl-font-numeral);
  font-size: 56px;
  font-weight: 750;
  line-height: 1;
  letter-spacing: -0.06em;
  font-variant-numeric: tabular-nums;
  color: var(--cl-ink);
  padding-inline-end: 0.06em;
}

.leafCta {
  max-inline-size: 100%;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1.25;
  text-align: center;
  color: var(--cl-leaf);
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  padding-inline: 4px;
}

.curl {
  position: absolute;
  inset-block-end: 0;
  inset-inline-end: 0;
  inline-size: 18px;
  block-size: 18px;
  border-start-start-radius: 4px;
  background: linear-gradient(315deg, transparent 50%, #e7dfd0 50%, #fffdf8 100%);
  box-shadow: -2px -2px 4px -2px rgba(40, 24, 10, 0.25);
  transition: inline-size 300ms var(--cl-ease), block-size 300ms var(--cl-ease);
}


/* Torn state */

.leafTorn {
  animation: tear 900ms cubic-bezier(0.55, 0, 0.25, 1) forwards;
  pointer-events: none;
}

.stubTorn {
  opacity: 1;
  transition: opacity 80ms linear 60ms;
}

.tickRingTorn {
  animation: draw 520ms var(--cl-ease) 380ms forwards;
}

.tickMarkTorn {
  animation: draw 420ms var(--cl-ease) 620ms forwards;
}

.underLabelTorn {
  animation: rise 420ms var(--cl-ease) 720ms forwards;
}

.underDateTorn {
  animation: rise 420ms var(--cl-ease) 820ms forwards;
}

@keyframes tear {
  0% {
    transform: none;
    opacity: 1;
  }
  18% {
    transform: translate(2px, -3px) rotate(4deg) skewY(-2deg);
  }
  55% {
    transform: translate(56px, -52px) rotate(28deg) skewY(-8deg) scale(0.96);
    opacity: 1;
  }
  100% {
    transform: translate(150px, -110px) rotate(62deg) skewY(-14deg) scale(0.82);
    opacity: 0;
  }
}

@keyframes flutter {
  0%,
  100% {
    transform: none;
  }
  30% {
    transform: rotate(1.6deg) skewY(-0.8deg);
  }
  60% {
    transform: rotate(-0.6deg);
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

/* Body */

.body {
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 22px 24px 24px;
}

.title {
  margin: 0;
  font-family: var(--cl-font-display);
  font-size: clamp(23px, 6.6cqi, 30px);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--cl-ink);
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.description {
  margin: 0;
  font-size: 15.5px;
  line-height: 1.5;
  color: var(--cl-muted);
  overflow-wrap: anywhere;
}

.facts {
  display: grid;
  gap: 8px;
  margin: 4px 0 0;
  padding: 14px 0 0;
  list-style: none;
  border-block-start: 1px solid var(--cl-hairline);
}

.fact {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 14.5px;
  line-height: 1.4;
  color: var(--cl-ink);
  font-variant-numeric: tabular-nums;
}

.icon {
  flex: none;
  inline-size: 18px;
  block-size: 18px;
  margin-block-start: 1px;
  color: var(--cl-leaf);
}

.factText {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.details {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-block-size: 44px;
  margin-block-start: 2px;
  padding-inline: 0;
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  color: var(--cl-ink);
  text-decoration: none;
  border-radius: 6px;
}

.details::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
}

.detailsText {
  overflow-wrap: anywhere;
  background: linear-gradient(currentColor, currentColor) 0 100% / 0% 1.5px no-repeat;
  transition: background-size 320ms var(--cl-ease);
}

.details:hover .detailsText,
.details:focus-visible .detailsText {
  background-size: 100% 1.5px;
}

.details:focus-visible {
  outline: 2px solid var(--cl-ink);
  outline-offset: 4px;
}

.arrow {
  flex: none;
  inline-size: 18px;
  block-size: 18px;
  color: var(--cl-leaf);
  transition: transform 320ms var(--cl-ease);
}

.details:hover .arrow {
  transform: translateX(3px);
}

.status {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@container (min-width: 700px) {
  .card {
    inline-size: min(100%, 860px);
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  }

  .media {
    aspect-ratio: auto;
    min-block-size: 340px;
    border-start-end-radius: 0;
    border-end-start-radius: 20px;
  }

  .leafButton {
    inset-block-start: 22px;
    inset-inline-start: 22px;
    inline-size: 124px;
  }

  .sheet {
    block-size: 136px;
  }

  .day {
    font-size: 64px;
  }

  .body {
    align-content: center;
    gap: 14px;
    padding: 40px 40px 36px;
  }

  .title {
    font-size: 34px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .leafSeen {
    animation: none;
  }

  .card[data-torn] .leaf {
    animation: none;
    opacity: 0;
  }

  .card[data-torn] .tickRing,
  .card[data-torn] .tickMark,
  .card[data-torn] .underLabel,
  .underDateTorn {
    animation: none;
    stroke-dashoffset: 0;
    opacity: 1;
    transform: none;
  }

  .leafButton,
  .curl,
  .arrow,
  .detailsText {
    transition: none;
  }
}
```
