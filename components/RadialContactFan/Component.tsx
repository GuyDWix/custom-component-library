import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import styles from './Component.module.css';

export type RadialContactFanIcon = 'phone' | 'directions' | 'message' | 'calendar' | 'mail' | 'menu';
export type RadialContactFanDirection = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface RadialContactFanAction {
  label: string;
  icon: RadialContactFanIcon;
  href: string;
}

export interface RadialContactFanProps {
  actions?: RadialContactFanAction[];
  mainLabel?: string;
  heading?: string;
  note?: string;
  buttonColor?: string;
  accentColor?: string;
  fanDirection?: RadialContactFanDirection;
  className?: string;
}

export const defaultActions: RadialContactFanAction[] = [
  { label: 'Call the desk', icon: 'phone', href: 'tel:+351210000000' },
  { label: 'Directions', icon: 'directions', href: 'https://maps.google.com/?q=Rua+das+Flores+18+Lisbon' },
  { label: 'Message us', icon: 'message', href: 'sms:+351910000000' },
  { label: 'Book a table', icon: 'calendar', href: '#book' },
];

// Five discs is the most that fit the arc with readable labels on a phone.
const MAX_ACTIONS = 5;

const FAN_HELP = 'Opens contact options. Use the arrow keys to move between them and Escape to close.';

function Glyph({ name }: { name: RadialContactFanIcon }) {
  switch (name) {
    case 'phone':
      return (
        <>
          <path d="M7.2 3.8h2.4l1.5 3.8-1.9 1.3a11.2 11.2 0 0 0 5.1 5.1l1.3-1.9 3.8 1.5v2.4a2.2 2.2 0 0 1-2.3 2.2C9.9 18 6 14.1 5 6.1a2.2 2.2 0 0 1 2.2-2.3z" />
        </>
      );
    case 'directions':
      return (
        <>
          <path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21z" />
          <circle cx="12" cy="10" r="2.3" />
        </>
      );
    case 'calendar':
      return (
        <>
          <path d="M7 5.5h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3z" />
          <path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4" />
          <circle cx="12" cy="15" r="1.1" />
        </>
      );
    case 'mail':
      return (
        <>
          <path d="M6 5.5h12a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 16V8A2.5 2.5 0 0 1 6 5.5z" />
          <path d="m4.2 8 7.8 5.8L19.8 8" />
        </>
      );
    case 'menu':
      return (
        <>
          <path d="M7 4h10a1.5 1.5 0 0 1 1.5 1.5V20l-3-1.8-2.5 1.8-2.5-1.8-3 1.8V5.5A1.5 1.5 0 0 1 7 4z" />
          <path d="M9 9h6M9 12.5h4" />
        </>
      );
    default:
      return (
        <path d="M6 5.5h12a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-6.2L8 20.5V17H6a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 6 5.5z" />
      );
  }
}

const isExternal = (href: string) => /^https?:\/\//i.test(href);

export default function RadialContactFan({
  actions = defaultActions,
  mainLabel = 'Contact the desk',
  heading = 'Anything you need, at the front desk.',
  note = 'Hotel Marlowe · open all hours · Rua das Flores 18, Lisbon',
  buttonColor = '#14213f',
  accentColor = '#b98b46',
  fanDirection = 'bottom-right',
  className,
}: RadialContactFanProps) {
  const [open, setOpen] = useState(false);
  const [inView, setInView] = useState(true);
  const uid = useId();
  const fanId = `${uid}-fan`;

  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const viaKey = useRef(false);

  const list = actions.slice(0, MAX_ACTIONS);
  const n = list.length;
  const fromLeft = fanDirection.endsWith('left');
  const fromTop = fanDirection.startsWith('top');
  const labelSide = fromLeft ? 'right' : 'left';

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const inside = rootRef.current?.contains(document.activeElement);
      setOpen(false);
      if (inside) mainRef.current?.focus();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && viaKey.current) itemRefs.current[0]?.focus();
    viaKey.current = false;
  }, [open]);

  const onMainClick = (e: MouseEvent<HTMLElement>) => {
    if (!open) viaKey.current = e.detail === 0;
    setOpen((v) => !v);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    const backward = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
    if (!forward && !backward && e.key !== 'Home' && e.key !== 'End') return;
    if (!open) {
      if (e.target === mainRef.current && (forward || backward)) {
        e.preventDefault();
        viaKey.current = true;
        setOpen(true);
      }
      return;
    }
    const els = itemRefs.current.filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;
    e.preventDefault();
    const at = els.indexOf(document.activeElement as HTMLElement);
    let next = 0;
    if (e.key === 'End') next = els.length - 1;
    else if (forward) next = at < 0 ? 0 : (at + 1) % els.length;
    else if (backward) next = at < 0 ? els.length - 1 : (at - 1 + els.length) % els.length;
    els[next].focus();
  };

  const rootStyle = { '--rcf-navy': buttonColor, '--rcf-brass': accentColor } as CSSProperties;
  const state = open ? 'true' : 'false';

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
      onKeyDown={onKeyDown}
    >
      <div className={styles.frame}>
        <span className={styles.light} aria-hidden="true" />
        <span className={styles.grain} aria-hidden="true" />

        {(heading || note) && (
          <div className={styles.copy} data-v={fromTop ? 'top' : 'bottom'} data-h={fromLeft ? 'left' : 'right'}>
            {heading && <h2 className={styles.heading}>{heading}</h2>}
            {note && <p className={styles.note}>{note}</p>}
          </div>
        )}

        <div className={styles.stage} data-from={fanDirection} data-v={fromTop ? 'top' : 'bottom'}>
          <span className={styles.bloom} data-open={state} aria-hidden="true" />
          <span className={styles.track} data-open={state} aria-hidden="true" />
          <span className={styles.ticks} data-open={state} aria-hidden="true" />

          <span className={styles.mainLabel} data-open={state} aria-hidden="true" onClick={onMainClick}>
            {mainLabel}
          </span>

          <button
            ref={mainRef}
            type="button"
            className={styles.main}
            aria-expanded={open}
            aria-controls={fanId}
            aria-label={mainLabel}
            aria-description={FAN_HELP}
            onClick={onMainClick}
          >
            <span className={styles.pulse} data-run={inView ? 'true' : 'false'} data-open={state} aria-hidden="true" />
            <span className={styles.mainFace} aria-hidden="true">
              <span className={styles.mainBody} />
              <span className={styles.mainSheen} />
              <span className={styles.mainGloss} />
              <svg className={styles.bell} data-open={state} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5.2 16.5a6.8 6.8 0 0 1 13.6 0z" />
                <path d="M3.5 19.5h17M10.5 6.6h3M12 6.6v2.6" />
              </svg>
              <svg className={styles.cross} data-open={state} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                <path d="M7 7l10 10M17 7 7 17" />
              </svg>
            </span>
          </button>

          <ul id={fanId} className={styles.fan} data-from={fanDirection} aria-label="Contact options">
            {list.map((a, i) => {
              const armStyle = {
                '--i': i,
                '--ri': n - 1 - i,
                '--f': n > 1 ? i / (n - 1) : 0,
              } as CSSProperties;
              const face = (
                <>
                  <span className={styles.disc} aria-hidden="true">
                    <span className={styles.discBody} />
                    <span className={styles.discGloss} />
                    <svg className={styles.glyph} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <Glyph name={a.icon} />
                    </svg>
                  </span>
                  <span className={styles.label} data-side={labelSide} data-open={state}>
                    {a.label}
                  </span>
                </>
              );
              return (
                <li key={i} className={styles.arm} data-open={state} style={armStyle}>
                  <span className={styles.reach} data-open={state}>
                    <span className={styles.upright} data-open={state}>
                      {a.href ? (
                        <a
                          ref={(el) => {
                            itemRefs.current[i] = el;
                          }}
                          className={styles.item}
                          href={a.href}
                          {...(isExternal(a.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                          onClick={() => setOpen(false)}
                        >
                          {face}
                        </a>
                      ) : (
                        <button
                          ref={(el) => {
                            itemRefs.current[i] = el;
                          }}
                          type="button"
                          className={styles.item}
                          disabled
                        >
                          {face}
                        </button>
                      )}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
