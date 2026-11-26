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
        if (!/\d/.test(ch)) {
          return (
            <span key={`s${fromRight}`} className={styles.rollStatic}>
              {ch}
            </span>
          );
        }
        const style = { '--d': ch, transitionDelay: `${fromRight * 45}ms` } as CSSProperties;
        return (
          <span key={`d${fromRight}`} className={styles.rollWindow}>
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
  const headingId = `${uid}-heading`;
  const summaryId = `${uid}-summary`;

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
      ghost.style.inlineSize = `${c.width}px`;
      ghost.style.blockSize = `${c.height}px`;
      root.appendChild(ghost);

      const curve = springCurve();
      const frames = curve.map((p, k) => {
        const arc = Math.sin(Math.PI * clamp01(p));
        const x = fx + dx * p;
        const y = fy + dy * p - lift * arc;
        const s = 1 + (scale - 1) * p + 0.08 * arc;
        const fade = k / (curve.length - 1);
        return {
          transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(tilt * arc).toFixed(2)}deg) scale(${s.toFixed(3)})`,
          boxShadow: `0 ${(2 + 16 * arc).toFixed(1)}px ${(6 + 22 * arc).toFixed(1)}px -${(2 + 8 * arc).toFixed(1)}px rgba(120, 30, 60, ${(0.18 + 0.22 * arc).toFixed(2)})`,
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
            [{ backgroundColor: '#fdecf1' }, { backgroundColor: 'transparent' }],
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
              {`${totalLabel} ${totalText}`}
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
