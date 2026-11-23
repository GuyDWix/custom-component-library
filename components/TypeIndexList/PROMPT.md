Create a custom element called "Type Index List". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: rows (name, small label, image, link), text color, outline strength, accent color. Add other settings if they help.

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface TypeIndexRow {
  name: string;
  label: string;
  image?: string;
  imageAlt?: string;
  link?: string;
}

export interface TypeIndexListProps {
  rows?: TypeIndexRow[];
  textColor?: string;
  accentColor?: string;
  outlineStrength?: number;
  className?: string;
}

const photo = (id: string) =>
  `https://images.unsplash.com/${id}?q=75&w=1600&h=1000&fit=crop`;

export const defaultRows: TypeIndexRow[] = [
  {
    name: 'Concrete Poem',
    label: 'Identity · Print',
    image: photo('photo-1481277542470-605612bd2d61'),
    imageAlt: 'Minimal white building against a clear sky',
    link: '#concrete-poem',
  },
  {
    name: 'Gray Harbour',
    label: 'Store · Web',
    image: photo('photo-1441986300917-64674bd600d8'),
    imageAlt: 'Clothing rail in a minimal concept store',
    link: '#gray-harbour',
  },
  {
    name: 'Nordlys Press',
    label: 'Editorial · Books',
    image: photo('photo-1454165804606-c3d57bc86b40'),
    imageAlt: 'Open notebook and pen on a work table',
    link: '#nordlys-press',
  },
  {
    name: 'Fjell Studio',
    label: 'Art direction',
    image: photo('photo-1470071459604-3b5ec3a7fe05'),
    imageAlt: 'Fog rolling over dark hills at dawn',
    link: '#fjell-studio',
  },
  {
    name: 'Mono Marathon',
    label: 'Poster series',
    image: photo('photo-1487958449943-2429e8be8625'),
    imageAlt: 'Curved concrete architecture against the sky',
    link: '#mono-marathon',
  },
  {
    name: 'Salt & Silica',
    label: 'Exhibition',
    image: photo('photo-1506905925346-21bda4d32df4'),
    imageAlt: 'Snow-covered mountain under a wide sky',
    link: '#salt-silica',
  },
];

const HELP =
  'Move through the entries to preview them. Use the up and down arrow keys to change entry. On touch screens the first tap previews an entry and the second tap opens its link.';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const pad = (i: number) => String(i + 1).padStart(2, '0');
const cx = (parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ');

type Slot = { t: number; b: number };

export default function TypeIndexList({
  rows = defaultRows,
  textColor = '#23262b',
  accentColor = '#1f45d3',
  outlineStrength = 1.5,
  className,
}: TypeIndexListProps) {
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState<'down' | 'up'>('down');
  const [slot, setSlot] = useState<Slot | null>(null);
  const [live, setLive] = useState(false);

  const rootRef = useRef<HTMLElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const rowRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const suppressUntil = useRef(0);
  const frame = useRef(0);

  const count = rows.length;
  const current = count > 0 ? Math.min(active, count - 1) : 0;

  const rootStyle = {
    '--ti-ink': textColor,
    '--ti-accent': accentColor,
    '--ti-stroke': `${clamp(outlineStrength, 0.75, 3)}px`,
  } as CSSProperties;

  const go = (i: number) => {
    if (i === current) return;
    setDir(i > current ? 'down' : 'up');
    setActive(i);
  };

  // The slot is the active row's box (plus a little bleed), measured from layout.
  const measure = useCallback(() => {
    const field = fieldRef.current;
    const item = itemRefs.current[current];
    if (!field || !item) return;
    const f = field.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    const bleed = Math.round(Math.min(20, r.height * 0.14));
    const t = Math.round(r.top - f.top) - bleed;
    const b = Math.round(f.bottom - r.bottom) - bleed;
    setSlot((prev) => (prev && prev.t === t && prev.b === b ? prev : { t, b }));
  }, [current]);

  useEffect(() => {
    measure();
  }, [measure, count]);

  // Names wrap only at spaces and hyphens. A single word wider than the row shrinks (--fit) instead of breaking mid-word.
  const fit = useCallback(() => {
    const field = fieldRef.current;
    if (!field) return;
    const names = Array.from(field.querySelectorAll<HTMLElement>('[data-ti-name]'));
    names.forEach((n) => {
      n.style.setProperty('--fit', '1');
      n.style.setProperty('--ti-wrap', 'normal');
    });
    const out = names.map((n) => {
      const sw = n.scrollWidth;
      const cw = n.clientWidth;
      if (!(sw > cw + 1) || cw <= 0) return { fit: 1, wrap: 'normal' };
      const ratio = cw / sw;
      // Shrink down to 30%; a single word longer than that has no natural break, so it may wrap as a last resort.
      return { fit: Math.max(0.3, Math.floor(ratio * 100) / 100), wrap: ratio < 0.3 ? 'anywhere' : 'normal' };
    });
    names.forEach((n, i) => {
      n.style.setProperty('--fit', String(out[i].fit));
      n.style.setProperty('--ti-wrap', out[i].wrap);
    });
  }, []);

  useEffect(() => {
    fit();
  }, [fit, rows]);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      fit();
      measure();
    });
    ro.observe(field);
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    let alive = true;
    if (fonts && fonts.ready) {
      fonts.ready.then(() => {
        if (!alive) return;
        fit();
        measure();
      });
    }
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [measure, fit]);

  // Transitions stay off for the first measured frame so the slot does not sweep in from nowhere.
  useEffect(() => {
    if (!slot || live) return undefined;
    const id = requestAnimationFrame(() => setLive(true));
    return () => cancelAnimationFrame(id);
  }, [slot, live]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // Pointer position drives the 3D shear of the letters and the parallax of the print.
  const track = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return;
    const root = rootRef.current;
    if (!root) return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = root.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const nx = clamp(((clientX - r.left) / r.width) * 2 - 1, -1, 1);
      const ny = clamp(((clientY - r.top) / r.height) * 2 - 1, -1, 1);
      root.style.setProperty('--px', nx.toFixed(3));
      root.style.setProperty('--py', ny.toFixed(3));
    });
  };

  const settle = () => {
    cancelAnimationFrame(frame.current);
    const root = rootRef.current;
    if (!root) return;
    root.style.setProperty('--px', '0');
    root.style.setProperty('--py', '0');
  };

  const enter = (i: number) => (e: PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType === 'mouse') go(i);
  };

  const down = (i: number) => (e: PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType === 'mouse') return;
    if (i !== current) {
      suppressUntil.current = Date.now() + 700;
      go(i);
    }
  };

  const click = (e: MouseEvent<HTMLAnchorElement>) => {
    if (Date.now() < suppressUntil.current) e.preventDefault();
  };

  const keys = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const from = rowRefs.current.findIndex((el) => el === document.activeElement);
    if (from < 0) return;
    const to = clamp(from + (e.key === 'ArrowDown' ? 1 : -1), 0, count - 1);
    e.preventDefault();
    rowRefs.current[to]?.focus();
  };

  const slotStyle = {
    '--slot-t': `${slot ? slot.t : 0}px`,
    '--slot-b': `${slot ? slot.b : 0}px`,
  } as CSSProperties;

  return (
    <nav
      ref={rootRef}
      className={cx([styles.root, className])}
      style={rootStyle}
      aria-label="Index"
      aria-description={HELP}
      onPointerMove={track}
      onPointerLeave={settle}
    >
      <div className={styles.inner}>
        <div className={styles.field} ref={fieldRef}>
          {count > 0 && (
            <div
              className={cx([
                styles.stage,
                !!slot && styles.stageOn,
                live && styles.stageLive,
                dir === 'down' ? styles.down : styles.up,
              ])}
              style={slotStyle}
              aria-hidden="true"
            >
              <div className={styles.window}>
                <div className={styles.pan}>
                  {rows.map((row, i) => (
                    <span key={i} className={cx([styles.layer, i === current && styles.layerOn])}>
                      {row.image ? (
                        <img
                          className={styles.photo}
                          src={row.image}
                          alt=""
                          loading={i === 0 ? 'eager' : 'lazy'}
                          decoding="async"
                          draggable={false}
                        />
                      ) : (
                        <span className={styles.blank} />
                      )}
                    </span>
                  ))}
                </div>
                <span className={styles.tint} />
              </div>
            </div>
          )}

          <ul className={styles.list} onKeyDown={keys}>
            {rows.map((row, i) => {
              const on = i === current;
              const itemStyle = { '--d': i - current } as CSSProperties;
              return (
                <li
                  key={i}
                  className={styles.item}
                  style={itemStyle}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                >
                  <a
                    className={styles.row}
                    ref={(el) => {
                      rowRefs.current[i] = el;
                    }}
                    href={row.link || undefined}
                    tabIndex={row.link ? undefined : 0}
                    aria-label={row.label ? `${row.name}. ${row.label}` : row.name}
                    aria-current={on ? 'true' : undefined}
                    onFocus={() => go(i)}
                    onPointerEnter={enter(i)}
                    onPointerDown={down(i)}
                    onClick={click}
                  >
                    <span className={styles.head} aria-hidden="true">
                      <span className={cx([styles.num, on && styles.numOn])}>{pad(i)}</span>
                      <span className={cx([styles.nameWrap, on && styles.nameWrapOn])} data-ti-name="">
                        <span className={cx([styles.outline, on && styles.outlineOn])}>{row.name}</span>
                        <span className={cx([styles.fill, on && styles.fillOn])}>{row.name}</span>
                      </span>
                      {row.label && (
                        <span className={cx([styles.label, on && styles.labelOn])}>{row.label}</span>
                      )}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <span className={styles.grain} aria-hidden="true" />
    </nav>
  );
}
```

```css
@property --slot-t {
  syntax: '<length>';
  inherits: true;
  initial-value: 0px;
}

@property --slot-b {
  syntax: '<length>';
  inherits: true;
  initial-value: 0px;
}

@font-face {
  font-family: 'Big Shoulders Display';
  src: url('./fonts/big-shoulders-display-latin-800-normal.woff2') format('woff2');
  font-weight: 800;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Inter';
  src: url('./fonts/inter-latin-500-normal.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Inter';
  src: url('./fonts/inter-latin-600-normal.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

.root {
  --ti-ink: #23262b;
  --ti-accent: #1f45d3;
  --ti-stroke: 1.5px;
  --ti-paper: #f4f5f7;
  --ti-ground-hi: #f0f1f3;
  --ti-ground: #e7e9ed;
  --ti-hair: color-mix(in srgb, var(--ti-ink) 17%, transparent);
  --ti-muted: color-mix(in srgb, var(--ti-ink) 74%, transparent);
  --ti-font-display: 'Big Shoulders Display', 'Avenir Next Condensed', 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif;
  --ti-font-ui: 'Inter', 'Helvetica Neue', Arial, system-ui, sans-serif;
  --ti-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.14  0 0 0 0 0.15  0 0 0 0 0.17  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --px: 0;
  --py: 0;

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  background: linear-gradient(180deg, var(--ti-ground-hi) 0%, var(--ti-ground) 100%);
  color: var(--ti-ink);
  font-family: var(--ti-font-ui);
}

.root ::selection {
  background: var(--ti-accent);
  color: #fff;
}

.inner {
  --ti-pad-x: clamp(20px, 4.5cqi, 56px);
  position: relative;
  box-sizing: border-box;
  padding-block: clamp(28px, 5cqi, 64px);
  padding-inline: var(--ti-pad-x);
}

.grain {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background-image: var(--ti-noise);
  opacity: 0.4;
  mix-blend-mode: multiply;
}

.field {
  position: relative;
}

/* ---- the slot: a cobalt-inked print seen through the active row ---- */

.stage {
  position: absolute;
  inset-block: 0;
  inset-inline: calc(var(--ti-pad-x) * -1);
  z-index: 0;
  pointer-events: none;
  opacity: 0;
  filter: drop-shadow(0 8px 26px color-mix(in srgb, var(--ti-accent) 42%, transparent));
}

.stageOn {
  opacity: 1;
}

.stageLive {
  transition: opacity 480ms ease;
}

/* Squeegee: the leading edge of the slot lands first, the trailing edge drags behind. */
.stageLive.down {
  transition:
    opacity 480ms ease,
    --slot-b 620ms cubic-bezier(0.16, 1, 0.3, 1),
    --slot-t 780ms cubic-bezier(0.65, 0, 0.35, 1) 60ms;
}

.stageLive.up {
  transition:
    opacity 480ms ease,
    --slot-t 620ms cubic-bezier(0.16, 1, 0.3, 1),
    --slot-b 780ms cubic-bezier(0.65, 0, 0.35, 1) 60ms;
}

.window {
  position: absolute;
  inset: 0;
  isolation: isolate;
  overflow: hidden;
  background: #0a1233;
  clip-path: inset(var(--slot-t) 0 var(--slot-b) 0);
}

.pan {
  position: absolute;
  inset: 0;
  transform: translate3d(calc(var(--px) * -1.8%), calc(var(--py) * -2.5%), 0) scale(1.1);
  transition: transform 900ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.layer {
  position: absolute;
  inset: 0;
  display: block;
  opacity: 0;
  transform: scale(1.07);
  transition:
    opacity 640ms ease,
    transform 1100ms cubic-bezier(0.22, 1, 0.36, 1);
}

.layerOn {
  opacity: 1;
  transform: scale(1);
  transition-duration: 460ms, 1100ms;
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  filter: grayscale(1) contrast(1.08) brightness(1.12);
  user-select: none;
}

.blank {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  background: repeating-linear-gradient(
    135deg,
    #ffffff 0 9px,
    #c9ceda 9px 10px
  );
}

/* Ink: white paper becomes cobalt, shadows stay deep, so one ink prints the whole picture. */
.tint {
  position: absolute;
  inset: 0;
  background: var(--ti-accent);
  mix-blend-mode: multiply;
}

/* ---- the index ---- */

.list {
  position: relative;
  z-index: 1;
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  border-block-start: 1px solid var(--ti-hair);
}

.item {
  display: grid;
}

.row {
  position: relative;
  display: block;
  /* top/bottom padding leave glyph headroom: the active band's bleed (up to 20px) never reaches neighbouring glyphs */
  padding-block: clamp(26px, 3cqi, 36px) clamp(18px, 2cqi, 24px);
  border-block-end: 1px solid var(--ti-hair);
  color: inherit;
  text-decoration: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.row:focus-visible {
  outline: 2px solid #fff;
  outline-offset: -5px;
  box-shadow: inset 0 0 0 2px var(--ti-ink);
}

.head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  column-gap: clamp(12px, 2cqi, 22px);
  align-items: baseline;
}

.num {
  font-family: var(--ti-font-ui);
  font-size: clamp(12px, 1.3cqi, 14px);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
  color: var(--ti-muted);
  transition: color 320ms ease 120ms;
}

.numOn {
  color: #fff;
}

.nameWrap {
  position: relative;
  display: block;
  min-inline-size: 0;
  transform-origin: 0 55%;
  transform: perspective(1200px) rotateX(calc(var(--py) * -3deg))
    rotateY(calc(var(--px) * 4.5deg)) skewX(calc(var(--px) * var(--d) * -1.5deg));
  transition: transform 560ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.nameWrapOn {
  transform: perspective(1200px) rotateX(calc(var(--py) * -2deg))
    rotateY(calc(var(--px) * 2deg)) skewX(calc(var(--px) * -6deg));
}

.outline,
.fill {
  display: block;
  font-family: var(--ti-font-display);
  font-size: calc(clamp(40px, 10cqi, 132px) * var(--fit, 1));
  font-weight: 800;
  line-height: 0.9;
  letter-spacing: 0.005em;
  text-transform: uppercase;
  /* natural break points only (spaces, hyphens); an over-wide single word is shrunk by the component (--fit) */
  overflow-wrap: var(--ti-wrap, normal);
  word-break: normal;
  hyphens: manual;
}

.outline {
  color: transparent;
  -webkit-text-stroke: var(--ti-stroke) color-mix(in srgb, var(--ti-ink) 62%, transparent);
  transition: -webkit-text-stroke-color 320ms ease;
}

.outlineOn {
  -webkit-text-stroke-color: rgba(255, 255, 255, 0.85);
}

/* Solid ink: knocked out of the cobalt as the slot arrives, wiped in from the left. */
.fill {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  inline-size: 100%;
  color: #fff;
  clip-path: inset(-8% 104% -8% -2%);
  transition: clip-path 560ms cubic-bezier(0.65, 0, 0.35, 1);
}

.fillOn {
  clip-path: inset(-8% -2% -8% -2%);
  transition-delay: 140ms;
}

.label {
  max-inline-size: 36cqi;
  font-size: clamp(12px, 1.2cqi, 13px);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-align: end;
  color: var(--ti-muted);
  overflow-wrap: anywhere;
  transition: color 320ms ease 120ms;
}

.labelOn {
  color: #fff;
}

@container (max-width: 759px) {
  .head {
    grid-template-columns: auto minmax(0, 1fr);
    row-gap: 6px;
  }

  .label {
    grid-column: 2;
    justify-self: start;
    text-align: start;
    max-inline-size: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stageLive,
  .stageLive.down,
  .stageLive.up,
  .pan,
  .layer,
  .nameWrap,
  .outline,
  .fill,
  .num,
  .label {
    transition: none;
  }

  .pan,
  .nameWrap,
  .nameWrapOn {
    transform: none;
  }

  .pan {
    transform: scale(1.04);
  }

  .layerOn {
    transform: none;
  }
}
```
