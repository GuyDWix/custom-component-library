Create a custom element called "Radial Contact Fan". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: actions (label, icon, link), main button label, button color, fan direction, heading and note, brass edge color. Add other settings if they help.

```tsx
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
                    <svg className={styles.glyph} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
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
```

```css
/* Concierge desk: warm ivory surface, navy glass trigger, hairline chips, one top-left light, expo-out motion. */

@property --rcf-draw {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

.root {
  --rcf-navy: #14213f;
  --rcf-brass: #b98b46;
  --rcf-navy-hi: color-mix(in srgb, var(--rcf-navy) 62%, #7f93cf);
  --rcf-navy-lo: color-mix(in srgb, var(--rcf-navy) 68%, #000);
  --rcf-brass-hi: color-mix(in srgb, var(--rcf-brass) 45%, #fff3d1);
  --rcf-brass-lo: color-mix(in srgb, var(--rcf-brass) 62%, #2e1f08);
  --rcf-ivory: #f6f1e6;
  --rcf-ivory-hi: #fffdf8;
  --rcf-ivory-lo: #e8dfca;
  --rcf-ink: color-mix(in srgb, var(--rcf-navy) 82%, #000);
  --rcf-muted: color-mix(in srgb, var(--rcf-navy) 66%, var(--rcf-ivory));
  --rcf-hair: color-mix(in srgb, var(--rcf-brass) 42%, transparent);
  --rcf-font-display: 'Bricolage Grotesque', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --rcf-font-ui: 'Instrument Sans', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --rcf-spring: cubic-bezier(0.34, 1.2, 0.5, 1);
  --rcf-out: cubic-bezier(0.16, 1, 0.3, 1);

  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  font-family: var(--rcf-font-ui);
  color: var(--rcf-ink);
  -webkit-tap-highlight-color: transparent;
}

@supports (transition-timing-function: linear(0, 1)) {
  .root {
    --rcf-spring: linear(
      0,
      0.32 5%,
      0.68 11%,
      0.9 18%,
      1.02 26%,
      1.035 32%,
      1.02 40%,
      1.006 50%,
      1
    );
  }
}

.frame {
  --md: 80px;
  --ad: 52px;
  --edge: 16px;
  --r: clamp(160px, 34cqi, 250px);
  --a0: 6;
  --a1: 88;
  --cx: calc(var(--edge) + var(--md) / 2);
  --cy: calc(var(--edge) + var(--md) / 2);

  position: relative;
  isolation: isolate;
  overflow: clip;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border-radius: clamp(22px, 3.4cqi, 36px);
  background:
    radial-gradient(90% 70% at 8% 0%, var(--rcf-ivory-hi) 0%, transparent 62%),
    linear-gradient(168deg, var(--rcf-ivory) 0%, var(--rcf-ivory-lo) 100%);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--rcf-brass) 18%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 1px 2px rgba(20, 24, 40, 0.08),
    0 28px 56px -28px rgba(20, 24, 40, 0.4);
}

@container (min-width: 760px) {
  .frame {
    --md: 104px;
    --ad: 68px;
    --edge: 40px;
    --r: clamp(230px, 27cqi, 340px);
    --a0: 4;
    --a1: 84;
  }
}


.light {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}

.light {
  background: radial-gradient(60% 55% at 100% 100%, color-mix(in srgb, var(--rcf-navy) 9%, transparent) 0%, transparent 70%);
}

/* ---------- headline block ---------- */

.copy {
  box-sizing: border-box;
  grid-column: 1;
  display: grid;
  gap: 16px;
  align-content: start;
  padding: clamp(24px, 4.4cqi, 48px);
  padding-block-end: clamp(8px, 2cqi, 20px);
  min-inline-size: 0;
}

.copy[data-v='bottom'] {
  grid-row: 1;
  align-self: start;
}

.copy[data-v='top'] {
  grid-row: 2;
  align-self: end;
  align-content: end;
  padding-block-end: clamp(24px, 4.4cqi, 48px);
  padding-block-start: clamp(8px, 2cqi, 20px);
}

.heading {
  margin: 0;
  max-inline-size: 13em;
  font-family: var(--rcf-font-display);
  font-weight: 600;
  font-size: clamp(1.75rem, 4.6cqi, 3.75rem);
  line-height: 1.04;
  letter-spacing: -0.03em;
  color: var(--rcf-ink);
  text-wrap: balance;
  overflow-wrap: normal;
  word-break: normal;
}

.note {
  margin: 0;
  max-inline-size: 30em;
  font-size: clamp(0.875rem, 1.35cqi, 1rem);
  line-height: 1.5;
  font-weight: 450;
  letter-spacing: 0.01em;
  color: var(--rcf-muted);
  text-wrap: pretty;
}

.heading::selection,
.note::selection,
.label::selection,
.mainLabel::selection {
  background: var(--rcf-brass);
  color: var(--rcf-navy-lo);
}

/* ---------- stage: the fan lives here ---------- */

.stage {
  --base: 0deg;
  --sign: -1;
  --flip: -1;
  --mfrom: 0deg;
  --ax: calc(100% - var(--cx));
  --ay: calc(100% - var(--cy));
  --lab-x: calc(-100% - var(--md) / 2 - 12px);

  position: relative;
  grid-column: 1;
  min-block-size: calc(var(--r) + var(--ad) / 2 + var(--cy) + 40px);
}

.stage[data-v='bottom'] {
  grid-row: 2;
}

.stage[data-v='top'] {
  grid-row: 1;
}

/* bottom-right: fan rises up and to the left */
.stage[data-from='bottom-left'] {
  --base: 0deg;
  --sign: 1;
  --flip: 1;
  --mfrom: 0deg;
  --ax: var(--cx);
  --ay: calc(100% - var(--cy));
  --lab-x: calc(var(--md) / 2 + 12px);
  --lab-origin: 0% 50%;
}

.stage[data-from='top-right'] {
  --base: 180deg;
  --sign: 1;
  --flip: 1;
  --mfrom: 180deg;
  --ax: calc(100% - var(--cx));
  --ay: var(--cy);
  --lab-x: calc(-100% - var(--md) / 2 - 12px);
}

.stage[data-from='top-left'] {
  --base: 180deg;
  --sign: -1;
  --flip: -1;
  --mfrom: 180deg;
  --ax: var(--cx);
  --ay: var(--cy);
  --lab-x: calc(var(--md) / 2 + 12px);
  --lab-origin: 0% 50%;
}

@container (min-width: 760px) {
  .copy {
    grid-row: 1;
    align-self: start;
    max-inline-size: min(66cqi, max(40cqi, calc(100cqi - var(--cx) - var(--r) - var(--ad) / 2 - 30px)));
    padding-block-end: clamp(24px, 4.4cqi, 48px);
  }

  .copy[data-v='bottom'] {
    grid-row: 1;
  }

  .copy[data-v='top'] {
    grid-row: 1;
    align-self: end;
    padding-block-start: clamp(24px, 4.4cqi, 48px);
  }

  .copy[data-h='left'] {
    justify-self: end;
  }

  .stage,
  .stage[data-v='top'],
  .stage[data-v='bottom'] {
    grid-row: 1;
    min-block-size: max(calc(var(--r) + var(--ad) / 2 + var(--cy) + 52px), 36cqi);
  }
}

/* ---------- engraved dial: bloom, track, ticks ---------- */

.bloom,
.track,
.ticks,
.pulse {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.bloom,
.track,
.ticks {
  inset-inline-start: var(--ax);
  inset-block-start: var(--ay);
  translate: -50% -50%;
  aspect-ratio: 1;
}

.bloom {
  inline-size: calc((var(--r) + var(--ad) / 2 + 30px) * 2);
  background: radial-gradient(circle at center, var(--rcf-navy) 0%, var(--rcf-navy) 30%, var(--rcf-navy-lo) 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.1),
    0 30px 70px -24px color-mix(in srgb, var(--rcf-navy) 60%, transparent);
  scale: 0.04;
  opacity: 0;
  visibility: hidden;
  transition:
    scale 380ms cubic-bezier(0.5, 0, 0.75, 0) 60ms,
    opacity 260ms ease-in 120ms,
    visibility 0s linear 420ms;
}

.bloom[data-open='true'] {
  scale: 1;
  opacity: 0.97;
  visibility: visible;
  transition:
    scale 800ms var(--rcf-out),
    opacity 220ms ease-out,
    visibility 0s;
}

.track {
  inline-size: calc(var(--r) * 2);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-sizing: border-box;
  scale: var(--flip) 1;
  --rcf-draw: 0deg;
  mask-image: conic-gradient(from var(--mfrom), #000 var(--rcf-draw), transparent var(--rcf-draw));
  -webkit-mask-image: conic-gradient(from var(--mfrom), #000 var(--rcf-draw), transparent var(--rcf-draw));
  transition: --rcf-draw 320ms ease-in;
}

.track[data-open='true'] {
  --rcf-draw: 100deg;
  transition: --rcf-draw 1000ms var(--rcf-out) 120ms;
}

.ticks {
  inline-size: calc((var(--r) + var(--ad) / 2 + 22px) * 2);
  background: repeating-conic-gradient(rgba(255, 255, 255, 0.5) 0deg 0.3deg, transparent 0.3deg 3deg);
  scale: var(--flip) 1;
  --rcf-draw: 0deg;
  mask-image:
    radial-gradient(closest-side, transparent calc(100% - 10px), #000 calc(100% - 10px)),
    conic-gradient(from var(--mfrom), #000 var(--rcf-draw), transparent var(--rcf-draw));
  mask-composite: intersect;
  -webkit-mask-image:
    radial-gradient(closest-side, transparent calc(100% - 10px), #000 calc(100% - 10px)),
    conic-gradient(from var(--mfrom), #000 var(--rcf-draw), transparent var(--rcf-draw));
  -webkit-mask-composite: source-in;
  opacity: 0.45;
  transition: --rcf-draw 300ms ease-in;
}

.ticks[data-open='true'] {
  --rcf-draw: 100deg;
  transition: --rcf-draw 1200ms var(--rcf-out) 240ms;
}

/* ---------- main disc ---------- */

.main {
  position: absolute;
  inset-inline-start: var(--ax);
  inset-block-start: var(--ay);
  translate: -50% -50%;
  z-index: 3;
  box-sizing: border-box;
  inline-size: var(--md);
  block-size: var(--md);
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--rcf-ivory-hi);
  cursor: pointer;
  touch-action: manipulation;
  outline: none;
}

.pulse {
  inset: calc(var(--md) * -0.14);
  border: 1px solid var(--rcf-brass);
  opacity: 0;
  animation: rcfPulse 2600ms cubic-bezier(0.2, 0.6, 0.3, 1) 1200ms 2 both;
}

.pulse[data-run='false'] {
  animation-play-state: paused;
}

.pulse[data-open='true'] {
  animation: none;
}

@keyframes rcfPulse {
  0% {
    opacity: 0.55;
    scale: 0.92;
  }
  70% {
    opacity: 0;
    scale: 1.32;
  }
  100% {
    opacity: 0;
    scale: 1.32;
  }
}

.mainFace {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(155deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.06) 40%, rgba(255, 255, 255, 0.28));
  box-shadow:
    0 1px 2px rgba(12, 16, 30, 0.25),
    0 12px 24px -8px rgba(12, 16, 30, 0.5),
    0 28px 48px -24px rgba(12, 16, 30, 0.45);
  transition: scale 420ms var(--rcf-spring);
}

.main:active .mainFace {
  scale: 0.95;
  transition-duration: 120ms;
}

.main:focus-visible {
  box-shadow:
    0 0 0 3px var(--rcf-ivory-hi),
    0 0 0 6px var(--rcf-navy);
}

.mainBody,
.mainSheen,
.mainGloss {
  position: absolute;
  inset: 1px;
  border-radius: 50%;
}

.mainBody {
  background: radial-gradient(120% 120% at 28% 14%, var(--rcf-navy-hi) 0%, var(--rcf-navy) 52%, var(--rcf-navy-lo) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    inset 0 -10px 18px rgba(0, 0, 0, 0.28);
}

.mainSheen {
  background: conic-gradient(from 30deg, transparent 0%, rgba(255, 255, 255, 0.12) 10%, transparent 22%, transparent 52%, rgba(255, 255, 255, 0.07) 62%, transparent 74%);
}

.mainGloss {
  background: radial-gradient(60% 34% at 34% 14%, rgba(255, 255, 255, 0.2), transparent 75%);
}

.bell,
.cross {
  position: absolute;
  inline-size: 40%;
  block-size: 40%;
  color: var(--rcf-ivory-hi);
  transition:
    rotate 560ms var(--rcf-out),
    scale 560ms var(--rcf-out),
    opacity 200ms ease-out;
}

.bell {
  rotate: 0deg;
  scale: 1;
  opacity: 1;
}

.bell[data-open='true'] {
  rotate: -90deg;
  scale: 0.4;
  opacity: 0;
}

.cross {
  rotate: 90deg;
  scale: 0.4;
  opacity: 0;
}

.cross[data-open='true'] {
  rotate: 0deg;
  scale: 1;
  opacity: 1;
}

/* ---------- pills: main label and action labels ---------- */

.mainLabel,
.label {
  box-sizing: border-box;
  inline-size: max-content;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--rcf-ivory-hi);
  border: 1px solid rgba(20, 24, 40, 0.08);
  color: var(--rcf-ink);
  font-family: var(--rcf-font-ui);
  font-size: 0.875rem;
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: 0;
  text-wrap: balance;
  overflow-wrap: normal;
  word-break: normal;
  hyphens: manual;
  box-shadow:
    inset 0 1px 0 #fff,
    0 1px 2px rgba(12, 16, 30, 0.14),
    0 8px 18px -8px rgba(12, 16, 30, 0.4);
}

.mainLabel {
  position: absolute;
  inset-inline-start: var(--ax);
  inset-block-start: var(--ay);
  translate: var(--lab-x) -50%;
  z-index: 2;
  max-inline-size: calc(100cqi - var(--cx) - var(--md) / 2 - 12px - var(--edge));
  cursor: pointer;
  transition:
    opacity 260ms ease-out 120ms,
    scale 420ms var(--rcf-spring) 120ms,
    visibility 0s;
  transform-origin: var(--lab-origin, 100% 50%);
}

.mainLabel[data-open='true'] {
  opacity: 0;
  scale: 0.9;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 140ms ease-in,
    scale 200ms ease-in,
    visibility 0s linear 160ms;
}

/* ---------- the arc ---------- */

.fan {
  margin: 0;
  padding: 0;
  list-style: none;
}

.arm {
  --t: calc(var(--a0) + var(--f) * (var(--a1) - var(--a0)));
  position: absolute;
  inset-inline-start: var(--ax);
  inset-block-start: var(--ay);
  inline-size: 0;
  block-size: 0;
  z-index: 4;
  transform: rotate(var(--base));
  visibility: hidden;
  transition:
    transform 420ms cubic-bezier(0.5, 0, 0.75, 0) calc(var(--ri) * 28ms),
    visibility 0s linear calc(var(--ri) * 28ms + 440ms);
}

.arm[data-open='true'] {
  transform: rotate(calc(var(--base) + var(--sign) * var(--t) * 1deg));
  visibility: visible;
  transition:
    transform 850ms var(--rcf-out) calc(var(--i) * 60ms),
    visibility 0s;
}

.reach {
  position: absolute;
  inset-inline-start: 0;
  inset-block-start: 0;
  inline-size: var(--ad);
  block-size: var(--ad);
  translate: -50% -50%;
  transform: translateY(0);
  transition: transform 380ms cubic-bezier(0.5, 0, 0.75, 0) calc(var(--ri) * 28ms);
}

.reach[data-open='true'] {
  transform: translateY(calc(var(--r) * -1));
  transition: transform 700ms var(--rcf-out) calc(var(--i) * 60ms);
}

.upright {
  position: absolute;
  inset: 0;
  transform: rotate(calc(var(--base) * -1));
  scale: 0.45;
  opacity: 0;
  transition:
    transform 420ms cubic-bezier(0.5, 0, 0.75, 0) calc(var(--ri) * 28ms),
    scale 380ms ease-in calc(var(--ri) * 28ms),
    opacity 200ms ease-in calc(var(--ri) * 28ms + 120ms);
}

.upright[data-open='true'] {
  transform: rotate(calc((var(--base) + var(--sign) * var(--t) * 1deg) * -1));
  scale: 1;
  opacity: 1;
  transition:
    transform 850ms var(--rcf-out) calc(var(--i) * 60ms),
    scale 700ms var(--rcf-spring) calc(var(--i) * 60ms),
    opacity 160ms ease-out calc(var(--i) * 60ms);
}

.item {
  position: absolute;
  inset: 0;
  display: block;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--rcf-ink);
  text-decoration: none;
  cursor: pointer;
  outline: none;
  touch-action: manipulation;
}

.disc {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(155deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.35));
  box-shadow:
    0 1px 2px rgba(12, 16, 30, 0.25),
    0 8px 16px -6px rgba(12, 16, 30, 0.5);
  transition:
    scale 360ms var(--rcf-spring),
    box-shadow 220ms ease-out;
}

.discBody,
.discGloss {
  position: absolute;
  inset: 1px;
  border-radius: 50%;
}

.discBody {
  background: radial-gradient(120% 120% at 30% 14%, var(--rcf-ivory-hi) 0%, var(--rcf-ivory) 58%, var(--rcf-ivory-lo) 100%);
  box-shadow: inset 0 -5px 9px rgba(120, 90, 40, 0.1);
}

.discGloss {
  background: radial-gradient(60% 34% at 34% 14%, rgba(255, 255, 255, 0.6), transparent 75%);
}

.glyph {
  position: relative;
  inline-size: 46%;
  block-size: 46%;
  color: var(--rcf-navy);
  stroke-width: 1.6;
}

.item:active .disc {
  scale: 0.93;
  transition-duration: 100ms;
}

.item:focus-visible {
  box-shadow:
    0 0 0 3px var(--rcf-ivory-hi),
    0 0 0 6px var(--rcf-navy);
}

@media (hover: hover) {
  .item:hover .disc {
    scale: 1.06;
  }

  .main:hover .mainFace {
    scale: 1.04;
  }
}

.label {
  position: absolute;
  inset-block-start: 50%;
  max-inline-size: min(16rem, calc(100cqi - var(--cx) - var(--r) * sin(calc(var(--t) * 1deg)) - var(--ad) / 2 - 24px));
  opacity: 0;
  translate: var(--lx, 0px) -50%;
  transition:
    opacity 140ms ease-in,
    translate 220ms ease-in;
}

.label[data-side='left'] {
  inset-inline-end: calc(100% + 12px);
  --lx: 14px;
}

.label[data-side='right'] {
  inset-inline-start: calc(100% + 12px);
  --lx: -14px;
}

.label[data-open='true'] {
  opacity: 1;
  translate: 0px -50%;
  transition:
    opacity 260ms ease-out calc(var(--i) * 60ms + 280ms),
    translate 600ms var(--rcf-out) calc(var(--i) * 60ms + 280ms);
}

/* ---------- reduced motion: no arc, actions appear instantly in a row ---------- */

@media (prefers-reduced-motion: reduce) {
  .bloom,
  .track,
  .ticks,
  .pulse {
    display: none;
  }

  .mainFace,
  .disc,
  .bell,
  .cross,
  .mainLabel,
  .mainLabel[data-open='true'],
  .arm,
  .arm[data-open='true'],
  .reach,
  .reach[data-open='true'],
  .upright,
  .upright[data-open='true'],
  .label,
  .label[data-open='true'] {
    transition: none;
  }

  .fan {
    position: absolute;
    z-index: 4;
    inset-inline: var(--edge);
    display: flex;
    flex-wrap: wrap;
    gap: 14px 12px;
    align-items: flex-start;
    justify-content: flex-end;
    inset-block-end: calc(var(--edge) + var(--md) + 22px);
  }

  .fan[data-from='bottom-left'],
  .fan[data-from='top-left'] {
    justify-content: flex-start;
  }

  .fan[data-from='top-left'],
  .fan[data-from='top-right'] {
    inset-block-end: auto;
    inset-block-start: calc(var(--edge) + var(--md) + 22px);
  }

  .arm,
  .arm[data-open='true'] {
    position: relative;
    inset: auto;
    inline-size: 6.5rem;
    block-size: auto;
    transform: none;
  }

  .reach,
  .reach[data-open='true'] {
    position: relative;
    inset: auto;
    inline-size: 100%;
    block-size: auto;
    translate: none;
    transform: none;
    display: grid;
    justify-items: center;
  }

  .upright,
  .upright[data-open='true'] {
    position: relative;
    inset: auto;
    inline-size: 100%;
    transform: none;
    scale: 1;
    opacity: 1;
    display: grid;
    justify-items: center;
  }

  .item {
    position: relative;
    inset: auto;
    inline-size: 100%;
    display: grid;
    justify-items: center;
    gap: 8px;
    border-radius: 14px;
  }

  .disc {
    position: relative;
    inset: auto;
    inline-size: var(--ad);
    block-size: var(--ad);
  }

  .label,
  .label[data-side='left'],
  .label[data-side='right'],
  .label[data-open='true'] {
    position: relative;
    inset: auto;
    inline-size: auto;
    max-inline-size: 100%;
    text-align: center;
    opacity: 1;
    translate: none;
  }
}
```
