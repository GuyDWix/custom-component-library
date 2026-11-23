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
