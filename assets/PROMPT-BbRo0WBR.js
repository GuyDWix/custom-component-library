const n=`Create a custom element called "Add-On Chip Total". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: heading, base item and price, add-ons (name, price, selected by default), currency symbol, summary title and total label, button label and link. Add other settings if they help.

\`\`\`tsx
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import styles from './Component.module.css';

export interface AddOn {
  name: string;
  price: number;
  selected?: boolean;
}

export interface AddOnChipTotalProps {
  heading?: string;
  itemName?: string;
  itemPrice?: number;
  addOns?: AddOn[];
  currency?: string;
  summaryTitle?: string;
  totalLabel?: string;
  buttonLabel?: string;
  buttonLink?: string;
  className?: string;
}

export const defaultAddOns: AddOn[] = [
  { name: 'Raspberry coulis', price: 4, selected: true },
  { name: 'Gold leaf', price: 9 },
  { name: 'Candied rose petals', price: 6, selected: true },
  { name: 'Handwritten message', price: 3 },
  { name: 'Extra cream layer', price: 7 },
  { name: 'Gift box & ribbon', price: 5 },
];

type Flight = { ghost: HTMLElement; anim: Animation };

const STIFFNESS = 190;
const DAMPING = 21;
const FRAME = 1 / 60;

const springCurve = () => {
  let p = 0;
  let v = 0;
  const out = [0];
  for (let i = 0; i < 90; i++) {
    v += (STIFFNESS * (1 - p) - DAMPING * v) * FRAME;
    p += v * FRAME;
    out.push(p);
    if (Math.abs(1 - p) < 0.002 && Math.abs(v) < 0.02) break;
  }
  out[out.length - 1] = 1;
  return out;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function RollingNumber({ text }: { text: string }) {
  const chars = text.split('');
  return (
    <span className={styles.roller} aria-hidden="true">
      {chars.map((ch, i) => {
        const fromRight = chars.length - 1 - i;
        if (!/\\d/.test(ch)) {
          return (
            <span key={\`s\${fromRight}\`} className={styles.rollStatic}>
              {ch}
            </span>
          );
        }
        const style = { '--d': ch, transitionDelay: \`\${fromRight * 45}ms\` } as CSSProperties;
        return (
          <span key={\`d\${fromRight}\`} className={styles.rollWindow}>
            <span className={styles.rollStrip} style={style}>
              {'0123456789'.split('').map((n) => (
                <span key={n} className={styles.rollDigit}>
                  {n}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

const PlusIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className={styles.iconPlus}>
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className={styles.iconCheck}>
    <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

export default function AddOnChipTotal({
  heading = 'Dress up your cake',
  itemName = 'Pistachio celebration cake, 8 inch',
  itemPrice = 48,
  addOns = defaultAddOns,
  currency = '$',
  summaryTitle = 'Your box',
  totalLabel = 'Total',
  buttonLabel = 'Book a pickup',
  buttonLink = 'https://www.example.com/book',
  className,
}: AddOnChipTotalProps) {
  const uid = useId();
  const headingId = \`\${uid}-heading\`;
  const summaryId = \`\${uid}-summary\`;

  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  const [inFlight, setInFlight] = useState<number[]>([]);

  const rootRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rowRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const flights = useRef(new Map<number, Flight>());
  const queued = useRef(new Set<number>());

  const isSelected = useCallback(
    (i: number) => overrides[i] ?? Boolean(addOns[i]?.selected),
    [overrides, addOns],
  );

  const withCents = useMemo(
    () => [itemPrice, ...addOns.map((a) => a.price)].some((p) => !Number.isInteger(p)),
    [itemPrice, addOns],
  );
  const fmt = (n: number) =>
    currency +
    n.toLocaleString('en-US', { minimumFractionDigits: withCents ? 2 : 0, maximumFractionDigits: 2 });

  const landed = addOns.map((_, i) => i).filter((i) => isSelected(i) && !inFlight.includes(i));
  const total = landed.reduce((sum, i) => sum + (Number(addOns[i].price) || 0), Number(itemPrice) || 0);
  const totalText = fmt(Math.round(total * 100) / 100);

  const endFlight = useCallback((i: number) => {
    const f = flights.current.get(i);
    if (f) {
      f.anim.cancel();
      f.ghost.remove();
      flights.current.delete(i);
    }
    queued.current.delete(i);
  }, []);

  useEffect(() => {
    const map = flights.current;
    return () => {
      map.forEach((f) => {
        f.anim.cancel();
        f.ghost.remove();
      });
      map.clear();
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    queued.current.forEach((i) => {
      if (flights.current.has(i)) return;
      const chip = chipRefs.current[i];
      const row = rowRefs.current[i];
      if (!chip || !row) {
        queued.current.delete(i);
        setInFlight((list) => list.filter((n) => n !== i));
        return;
      }
      const r = root.getBoundingClientRect();
      const c = chip.getBoundingClientRect();
      const t = row.getBoundingClientRect();
      const scale = Math.min(1, Math.max(0.7, t.height / c.height + 0.25));
      const fx = c.left - r.left;
      const fy = c.top - r.top;
      const dx = t.left - r.left - fx;
      const dy = t.top - r.top + (t.height - c.height * scale) / 2 - fy;
      const lift = Math.min(150, 48 + Math.hypot(dx, dy) * 0.28);
      const tilt = dx >= 0 ? -7 : 7;

      const ghost = document.createElement('span');
      ghost.className = styles.ghost;
      ghost.textContent = addOns[i].name;
      ghost.style.inlineSize = \`\${c.width}px\`;
      ghost.style.blockSize = \`\${c.height}px\`;
      root.appendChild(ghost);

      const curve = springCurve();
      const frames = curve.map((p, k) => {
        const arc = Math.sin(Math.PI * clamp01(p));
        const x = fx + dx * p;
        const y = fy + dy * p - lift * arc;
        const s = 1 + (scale - 1) * p + 0.08 * arc;
        const fade = k / (curve.length - 1);
        return {
          transform: \`translate(\${x.toFixed(1)}px, \${y.toFixed(1)}px) rotate(\${(tilt * arc).toFixed(2)}deg) scale(\${s.toFixed(3)})\`,
          boxShadow: \`0 \${(2 + 16 * arc).toFixed(1)}px \${(6 + 22 * arc).toFixed(1)}px -\${(2 + 8 * arc).toFixed(1)}px rgba(120, 30, 60, \${(0.18 + 0.22 * arc).toFixed(2)})\`,
          opacity: fade > 0.86 ? String(1 - (fade - 0.86) * 3.5) : '1',
        };
      });
      const anim = ghost.animate(frames, { duration: (curve.length - 1) * FRAME * 1000, easing: 'linear', fill: 'forwards' });
      flights.current.set(i, { ghost, anim });
      anim.onfinish = () => {
        endFlight(i);
        setInFlight((list) => list.filter((n) => n !== i));
        requestAnimationFrame(() => {
          const row = rowRefs.current[i]?.parentElement;
          row?.animate(
            [{ transform: 'translateX(-6px)', opacity: 0.4 }, { transform: 'none', opacity: 1 }],
            { duration: 420, easing: 'cubic-bezier(.2,1.3,.4,1)' },
          );
          row?.animate(
            [{ backgroundColor: 'var(--ac-raspberry-tint)' }, { backgroundColor: 'transparent' }],
            { duration: 900, easing: 'cubic-bezier(.4,0,.2,1)' },
          );
          badgeRef.current?.animate(
            [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }],
            { duration: 420, easing: 'cubic-bezier(.3,1.5,.5,1)' },
          );
          trayRef.current?.animate(
            [{ transform: 'translateY(0)' }, { transform: 'translateY(2px)' }, { transform: 'translateY(0)' }],
            { duration: 360, easing: 'cubic-bezier(.3,1.4,.5,1)' },
          );
        });
      };
    });
  }, [inFlight, addOns, endFlight]);

  const toggle = (i: number) => {
    const next = !isSelected(i);
    setOverrides((o) => ({ ...o, [i]: next }));
    endFlight(i);
    if (next && !prefersReducedMotion()) {
      queued.current.add(i);
      setInFlight((list) => (list.includes(i) ? [...list] : [...list, i]));
    } else {
      setInFlight((list) => list.filter((n) => n !== i));
    }
  };

  const ButtonTag = buttonLink ? 'a' : 'button';

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')}>
      <span className={styles.backdrop} aria-hidden="true">
        <span className={styles.glowPistachio} />
        <span className={styles.glowCream} />
        <span className={styles.grain} />
      </span>

      <div className={styles.layout}>
        <section className={styles.picker} aria-labelledby={headingId}>
          {heading && (
            <h3 id={headingId} className={styles.heading}>
              {heading}
            </h3>
          )}
          <ul className={styles.chips}>
            {addOns.map((a, i) => {
              const on = isSelected(i);
              return (
                <li key={i} className={styles.chipItem}>
                  <button
                    ref={(el) => {
                      chipRefs.current[i] = el;
                    }}
                    type="button"
                    className={on ? styles.chipOn : styles.chip}
                    aria-pressed={on}
                    aria-controls={summaryId}
                    onClick={() => toggle(i)}
                  >
                    <span className={styles.chipIcon} aria-hidden="true">
                      <PlusIcon />
                      <CheckIcon />
                    </span>
                    <span className={styles.chipName}>{a.name}</span>
                    <span className={styles.chipPrice}>+{fmt(Number(a.price) || 0)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <div ref={trayRef} id={summaryId} className={styles.tray}>
          <div className={styles.trayHead}>
            {summaryTitle && <p className={styles.trayTitle}>{summaryTitle}</p>}
            <span ref={badgeRef} className={styles.badge} aria-hidden="true">
              {landed.length + 1}
            </span>
          </div>
          <ul className={styles.rows}>
            <li className={styles.rowBase}>
              <span className={styles.rowName}>{itemName}</span>
              <span className={styles.rowLeader} aria-hidden="true" />
              <span className={styles.rowPrice}>{fmt(Number(itemPrice) || 0)}</span>
            </li>
            {addOns.map((a, i) =>
              isSelected(i) ? (
                <li key={i} className={inFlight.includes(i) ? styles.rowPending : styles.row}>
                  <span
                    ref={(el) => {
                      rowRefs.current[i] = el;
                    }}
                    className={styles.rowName}
                  >
                    {a.name}
                  </span>
                  <span className={styles.rowLeader} aria-hidden="true" />
                  <span className={styles.rowPrice}>+{fmt(Number(a.price) || 0)}</span>
                </li>
              ) : null,
            )}
          </ul>
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>{totalLabel}</span>
            <RollingNumber text={totalText} />
            <span className={styles.srOnly} aria-live="polite">
              {\`\${totalLabel} \${totalText}\`}
            </span>
          </div>
          <ButtonTag
            className={styles.cta}
            {...(buttonLink ? { href: buttonLink } : { type: 'button' as const })}
          >
            <span className={styles.ctaLabel}>{buttonLabel}</span>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className={styles.ctaArrow}>
              <path d="M3 8h9M8.5 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </ButtonTag>
        </div>
      </div>
    </div>
  );
}
\`\`\`

\`\`\`css
.root {
  --ac-cream: #faf6ee;
  --ac-surface: #fffdf9;
  --ac-pistachio: #a9c48a;
  --ac-pistachio-soft: #eaf1df;
  --ac-pistachio-ink: #2c3d26;
  --ac-raspberry: #c0285a;
  --ac-raspberry-deep: #a01f4b;
  --ac-raspberry-tint: #fdecf1;
  --ac-ink: #26261f;
  --ac-muted: #6b6a5d;
  --ac-line: rgba(44, 61, 38, 0.14);
  --ac-font-display: 'Fraunces', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
  --ac-font-ui: 'Inter', 'DM Sans', 'Avenir Next', 'Segoe UI', system-ui, sans-serif;
  --ac-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --ac-spring: cubic-bezier(0.25, 1.25, 0.45, 1);

  position: relative;
  isolation: isolate;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: 32px;
  padding-inline: 20px;
  border-radius: 24px;
  background: var(--ac-cream);
  color: var(--ac-ink);
  font-family: var(--ac-font-ui);
  -webkit-font-smoothing: antialiased;
}

.backdrop {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: clip;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px var(--ac-line);
  pointer-events: none;
}

.glowPistachio,
.glowCream,
.grain {
  position: absolute;
  pointer-events: none;
}

.glowPistachio {
  inset-block-start: -40%;
  inset-inline-end: -20%;
  inline-size: 55%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--ac-pistachio) 40%, transparent), transparent);
  filter: blur(40px);
}

.glowCream {
  inset-block-end: -40%;
  inset-inline-start: -20%;
  inline-size: 60%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--ac-raspberry-tint) 80%, transparent), transparent);
  filter: blur(40px);
}

.grain {
  inset: 0;
  background-image: var(--ac-noise);
  opacity: 0.08;
  mix-blend-mode: multiply;
}

.layout {
  display: grid;
  gap: 28px;
}

.picker {
  display: grid;
  align-content: start;
  gap: 22px;
  min-inline-size: 0;
}

.heading {
  margin: 0;
  font-family: var(--ac-font-display);
  font-size: 30px;
  font-weight: 500;
  line-height: 1.05;
  letter-spacing: -0.025em;
  text-wrap: balance;
  overflow-wrap: anywhere;
  color: var(--ac-pistachio-ink);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chipItem {
  display: flex;
  max-inline-size: 100%;
}

.chip,
.chipOn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  max-inline-size: 100%;
  min-block-size: 46px;
  box-sizing: border-box;
  padding-block: 9px;
  padding-inline: 10px 16px;
  border: 1px solid var(--ac-line);
  border-radius: 999px;
  background: var(--ac-surface);
  color: var(--ac-ink);
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: -0.005em;
  text-align: start;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 1px 2px rgba(44, 61, 38, 0.05);
  transition:
    background-color 200ms ease,
    border-color 200ms ease,
    color 200ms ease,
    transform 220ms var(--ac-spring);
}

.chip:hover {
  border-color: color-mix(in srgb, var(--ac-pistachio-ink) 30%, transparent);
  background: color-mix(in srgb, var(--ac-pistachio-soft) 55%, var(--ac-surface));
}

.chipOn {
  border-color: color-mix(in srgb, var(--ac-raspberry) 45%, transparent);
  background: var(--ac-raspberry-tint);
  color: var(--ac-raspberry-deep);
}

.chipOn:hover {
  border-color: var(--ac-raspberry);
}

.chip:active,
.chipOn:active {
  transform: scale(0.97);
  transition-duration: 90ms;
}

.chip:focus-visible,
.chipOn:focus-visible,
.cta:focus-visible {
  outline: 2px solid var(--ac-raspberry);
  outline-offset: 3px;
}

.chipIcon {
  flex: none;
  display: grid;
  place-items: center;
  inline-size: 24px;
  block-size: 24px;
  border-radius: 50%;
  background: var(--ac-pistachio-soft);
  color: var(--ac-pistachio-ink);
  transition:
    background-color 200ms ease,
    color 200ms ease;
}

.chipOn .chipIcon {
  background: var(--ac-raspberry);
  color: #fff;
}

.iconPlus,
.iconCheck {
  grid-area: 1 / 1;
  inline-size: 14px;
  block-size: 14px;
  transition:
    transform 300ms var(--ac-spring),
    opacity 160ms ease;
}

.iconCheck {
  opacity: 0;
  transform: scale(0.5);
}

.chipOn .iconPlus {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
}

.chipOn .iconCheck {
  opacity: 1;
  transform: none;
}

.chipName {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.chipPrice {
  flex: none;
  font-size: 14px;
  font-weight: 450;
  font-variant-numeric: tabular-nums;
  color: var(--ac-muted);
  transition: color 200ms ease;
}

.chipOn .chipPrice {
  color: color-mix(in srgb, var(--ac-raspberry-deep) 75%, transparent);
}

.ghost {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  z-index: 5;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  padding-inline: 16px;
  border-radius: 999px;
  background: var(--ac-raspberry);
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transform-origin: 0 0;
  pointer-events: none;
  will-change: transform, opacity;
}

.tray {
  position: relative;
  display: grid;
  gap: 18px;
  align-self: start;
  min-inline-size: 0;
  padding-block: 22px;
  padding-inline: 22px;
  border: 1px solid var(--ac-line);
  border-radius: 20px;
  background: var(--ac-surface);
  color: var(--ac-ink);
  box-shadow:
    0 1px 2px rgba(44, 61, 38, 0.04),
    0 12px 32px -18px rgba(44, 61, 38, 0.22);
}

.trayHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.badge {
  flex: none;
  display: grid;
  place-items: center;
  min-inline-size: 24px;
  block-size: 24px;
  box-sizing: border-box;
  padding-inline: 7px;
  border-radius: 999px;
  background: var(--ac-pistachio-soft);
  color: var(--ac-pistachio-ink);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.trayTitle {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ac-muted);
  overflow-wrap: anywhere;
}

.rows {
  display: grid;
  gap: 2px;
  margin: 0;
  margin-inline: -12px;
  padding: 0;
  padding-block-end: 4px;
  list-style: none;
}

.row,
.rowBase,
.rowPending {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding-block: 6px;
  padding-inline: 12px;
  border-radius: 8px;
  font-size: 15px;
  line-height: 1.4;
}

.rowBase {
  margin-block-end: 8px;
  padding-block: 12px;
  border-radius: 12px;
  background: var(--ac-pistachio-soft);
  font-weight: 600;
  color: var(--ac-pistachio-ink);
}

.row {
  color: var(--ac-ink);
}

.rowPending {
  visibility: hidden;
}

.rowName {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.rowLeader {
  flex: 1 1 8px;
}

.rowPrice {
  flex: none;
  font-variant-numeric: tabular-nums;
  color: var(--ac-muted);
}

.rowBase .rowPrice {
  color: inherit;
}

.totalRow {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
  padding-block-start: 16px;
  border-block-start: 1px solid var(--ac-line);
}

.totalLabel {
  font-size: 15px;
  font-weight: 500;
  color: var(--ac-muted);
  overflow-wrap: anywhere;
}

.roller {
  display: inline-flex;
  font-family: var(--ac-font-display);
  font-size: 44px;
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.035em;
  font-variant-numeric: tabular-nums lining-nums;
  color: var(--ac-raspberry-deep);
}

.rollStatic {
  display: inline-block;
  white-space: pre;
}

.rollWindow {
  display: inline-block;
  block-size: 1.1em;
  overflow: hidden;
  mask-image: linear-gradient(180deg, transparent 0, #000 18%, #000 82%, transparent 100%);
}

.rollStrip {
  display: flex;
  flex-direction: column;
  transform: translateY(calc(var(--d) * -1.1em));
  transition: transform 760ms cubic-bezier(0.22, 1.3, 0.4, 1);
}

.rollDigit {
  display: block;
  block-size: 1.1em;
  text-align: center;
}

.cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-block-size: 50px;
  box-sizing: border-box;
  padding-block: 12px;
  padding-inline: 20px;
  border: 0;
  border-radius: 14px;
  background: var(--ac-raspberry);
  color: #fff;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.005em;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(120, 20, 60, 0.18);
  transition:
    background-color 200ms ease,
    transform 220ms var(--ac-spring);
}

.cta:hover {
  background: var(--ac-raspberry-deep);
}

.cta:active {
  transform: scale(0.98);
  transition-duration: 90ms;
}

.ctaLabel {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.ctaArrow {
  flex: none;
  transition: transform 240ms var(--ac-spring);
}

.cta:hover .ctaArrow {
  transform: translateX(3px);
}

.srOnly {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@container (min-width: 760px) {
  .root {
    padding-block: 48px;
    padding-inline: 44px;
  }

  .layout {
    grid-template-columns: minmax(0, 1.4fr) minmax(280px, 1fr);
    gap: 48px;
    align-items: center;
  }

  .heading {
    font-size: 40px;
  }

  .tray {
    padding-block: 26px;
    padding-inline: 26px;
  }
}

@container (min-width: 900px) {
  .heading {
    font-size: 48px;
  }

  .roller {
    font-size: 52px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chip,
  .chipOn,
  .chipIcon,
  .chipPrice,
  .cta,
  .ctaArrow,
  .iconPlus,
  .iconCheck,
  .rollStrip {
    transition: none;
  }

  .chip:active,
  .chipOn:active,
  .cta:active,
  .cta:hover .ctaArrow {
    transform: none;
  }
}
\`\`\`
`;export{n as default};
