import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface ClothesPegPhoto {
  image: string;
  caption?: string;
  alt?: string;
}

export interface ClothesPegGalleryProps {
  photos?: ClothesPegPhoto[];
  breezeStrength?: number;
  stringColor?: string;
  className?: string;
}

const img = (id: string) => `https://images.unsplash.com/${id}?w=900&h=900&fit=crop&auto=format&q=70`;

export const defaultPhotos: ClothesPegPhoto[] = [
  { image: img('photo-1507525428034-b723cf961d3e'), caption: 'First swim of the summer' },
  { image: img('photo-1414235077428-338989a2e8c0'), caption: 'Long table, late lunch' },
  { image: img('photo-1490750967868-88aa4486c946'), caption: 'Tulips from the market' },
  { image: img('photo-1511632765486-a01980e01a18'), caption: 'The whole crew, finally' },
  { image: img('photo-1504674900247-0877df9cc836'), caption: 'Supper on the terrace' },
  { image: img('photo-1501785888041-af3ef285b470'), caption: 'Lake road at golden hour' },
];

type Swing = { a: number; v: number };
type Geo = { x: number; y: number; t: number; row: number };
type Rect = { x: number; y: number; w: number; h: number };

const PAD_TOP = 64;
const PEG_GRIP = 12;
const CAPTION_H = 30;
const OPEN_CAPTION_H = 74;
const SWING_K = 17;
const SWING_C = 1.5;
const FLIGHT_K = 150;
const FLIGHT_C = 19;

const HELP = 'Photos hang on a washing line. Press Enter on a photo to unclip it to a large view; Escape re-hangs it.';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const curve = (sag: number) => `M 0 0 Q 50 ${(sag * 2).toFixed(2)} 100 0`;
const minHeight = (width: number, h: number) => Math.max(h, width >= 640 ? 480 : 420);
const restTilt = (i: number) => (((i * 37) % 7) - 3) * 0.7;

function layoutFor(width: number, count: number) {
  const perRow = clamp(Math.floor(width / 190), 2, 6);
  const rows = Math.max(1, Math.ceil(count / perRow));
  const balanced = Math.ceil(count / rows);
  const slot = (width - 32) / balanced;
  const pw = clamp(slot * 0.86, 96, 220);
  const ph = (pw - 16) * 1.2 + 8 + CAPTION_H;
  const sag = clamp(width * 0.045, 18, 46);
  const rowH = ph + sag + 34;
  const content = PAD_TOP + rows * rowH + 28;
  const top = PAD_TOP + Math.max(0, minHeight(width, content) - content) * 0.4;
  const geo: Geo[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / balanced);
    const inRow = Math.min(balanced, count - row * balanced);
    const j = i - row * balanced;
    const t = (j + 0.5) / inRow * 0.88 + 0.06;
    geo.push({ x: t * width, y: top + row * rowH + sag * 4 * t * (1 - t), t, row });
  }
  return { rows, pw, ph, sag, rowH, top, geo, height: content };
}

function openRect(width: number, height: number, ph: number): Rect & { frame: number } {
  const wide = width >= 640;
  const aspect = wide ? 1.35 : 0.9;
  const frame = wide ? 36 : 24;
  const maxW = Math.min(width - (wide ? 140 : 24), 780);
  const maxH = Math.max(height - (wide ? 70 : 28), ph * 1.4);
  const iw = Math.min(maxW - frame, (maxH - frame - OPEN_CAPTION_H) * aspect);
  const w = iw + frame;
  const h = iw / aspect + frame + OPEN_CAPTION_H;
  return { x: (width - w) / 2, y: Math.max(14, (height - h) / 2), w, h, frame };
}

export default function ClothesPegGallery({
  photos = defaultPhotos,
  breezeStrength = 4,
  stringColor = '#b48a57',
  className,
}: ClothesPegGalleryProps) {
  const uid = useId();
  const [width, setWidth] = useState(960);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [active, setActive] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const hangerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const stringRefs = useRef<(SVGPathElement | null)[]>([]);
  const flyRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const swings = useRef<Swing[]>([]);
  const flight = useRef({ p: 0, v: 0, target: 0 });
  const breeze = useRef(breezeStrength);
  const kick = useRef(0);

  breeze.current = clamp(breezeStrength, 0, 10);
  const L = useMemo(() => layoutFor(width, photos.length), [width, photos.length]);
  const layout = useRef(L);
  layout.current = L;
  while (swings.current.length < photos.length) swings.current.push({ a: restTilt(swings.current.length), v: 0 });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.02 });
    ro.observe(root);
    io.observe(root);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const hungRect = useCallback((i: number): Rect & { a: number } => {
    const { geo, pw, ph } = layout.current;
    const g = geo[i];
    return { x: g.x - pw / 2, y: g.y - PEG_GRIP, w: pw, h: ph, a: swings.current[i]?.a ?? 0 };
  }, []);

  const paintFlight = useCallback(
    (i: number) => {
      const fly = flyRef.current;
      if (!fly) return;
      const { p } = flight.current;
      const s = hungRect(i);
      const e = openRect(width, minHeight(width, layout.current.height), layout.current.ph);
      const set = (k: string, v: string) => fly.style.setProperty(k, v);
      set('left', `${lerp(s.x, e.x, p)}px`);
      set('top', `${lerp(s.y, e.y, p)}px`);
      set('width', `${Math.max(40, lerp(s.w, e.w, p))}px`);
      set('height', `${Math.max(40, lerp(s.h, e.h, p))}px`);
      set('--cpg-rot', `${lerp(s.a, 0, clamp(p, 0, 1)) - Math.sin(clamp(p, 0, 1) * Math.PI) * 5}deg`);
      set('--cpg-lift', clamp(p, 0, 1).toFixed(3));
      set('--cpg-pad', `${lerp(8, e.frame / 2, clamp(p, 0, 1))}px`);
      set('--cpg-foot', `${lerp(CAPTION_H, OPEN_CAPTION_H, clamp(p, 0, 1))}px`);
      scrimRef.current?.style.setProperty('opacity', clamp(p, 0, 1).toFixed(3));
    },
    [hungRect, width],
  );

  useEffect(() => {
    if (reduced || !inView) return;
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const s = now / 1000;
      const { geo, sag, rows } = layout.current;
      const wind = playing ? breeze.current : 0;
      const gust = 0.55 + 0.45 * Math.sin(s * 0.21) * Math.sin(s * 0.13 + 1.2);
      const steps = 3;
      const h = dt / steps;
      let energy = Math.abs(kick.current);
      const rowBob = (r: number) => wind * gust * Math.sin(s * 0.8 + r * 1.3) * 0.7;

      geo.forEach((g, i) => {
        const sw = swings.current[i];
        const force =
          wind * gust * (Math.sin(s * 1.05 - g.t * 3.1 + g.row) * 9 + Math.sin(s * 2.3 + i * 1.7) * 3.5);
        for (let n = 0; n < steps; n++) {
          sw.v += (-SWING_K * (sw.a - restTilt(i) * 0.4) - SWING_C * sw.v + force) * h;
          sw.a += sw.v * h;
        }
        energy += Math.abs(sw.v);
        const bob = rowBob(g.row) * 4 * g.t * (1 - g.t);
        hangerRefs.current[i]?.style.setProperty('transform', `translate3d(0, ${bob.toFixed(2)}px, 0) rotate(${sw.a.toFixed(2)}deg)`);
      });

      for (let r = 0; r < rows; r++) {
        const d = curve(sag + rowBob(r));
        for (let k = 0; k < 3; k++) stringRefs.current[r * 3 + k]?.setAttribute('d', d);
      }

      const f = flight.current;
      if (active !== null) {
        for (let n = 0; n < steps; n++) {
          f.v += (FLIGHT_K * (f.target - f.p) - FLIGHT_C * f.v) * h;
          f.p += f.v * h;
        }
        paintFlight(active);
        energy += Math.abs(f.v) + Math.abs(f.target - f.p);
        if (f.target === 0 && Math.abs(f.p) < 0.004 && Math.abs(f.v) < 0.05) {
          setActive(null);
          const sw = swings.current[active];
          if (sw) sw.v += 60;
        }
      }
      kick.current = 0;
      if (!playing && energy < 0.02 && active === null) return;
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [reduced, inView, playing, active, paintFlight]);

  useEffect(() => {
    if (active === null) return;
    if (reduced) paintFlight(active);
  }, [active, reduced, paintFlight, width]);

  useEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true });
  }, [open]);

  const unclip = (i: number) => {
    flight.current = { p: 0, v: 0, target: 1 };
    if (reduced) flight.current.p = 1;
    setActive(i);
    setOpen(true);
  };

  const rehang = () => {
    if (active === null) return;
    flight.current.target = 0;
    setOpen(false);
    triggerRefs.current[active]?.focus({ preventScroll: true });
    if (reduced) {
      flight.current.p = 0;
      setActive(null);
    } else if (!inView) {
      setActive(null);
    }
  };

  const nudge = (i: number) => (e: PointerEvent<HTMLButtonElement>) => {
    if (reduced || e.pointerType !== 'mouse') return;
    const sw = swings.current[i];
    if (sw) sw.v += clamp(e.movementX, -12, 12) * 2.2;
    kick.current = 1;
  };

  const onDialogKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      rehang();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      closeRef.current?.focus();
    }
  };

  const rootStyle = {
    '--cpg-string': stringColor,
    '--cpg-pw': `${L.pw}px`,
    '--cpg-ph': `${L.ph}px`,
    minBlockSize: `${minHeight(width, L.height)}px`,
  } as CSSProperties;

  const shown = active !== null ? photos[active] : null;
  const dialogLabel = shown ? shown.caption || shown.alt || 'Photo' : '';

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
      data-still={reduced || !playing || !inView ? '' : undefined}
    >
      <span className={styles.sun} aria-hidden="true" />
      <span className={styles.rays} aria-hidden="true" />
      <span className={styles.cloudA} aria-hidden="true" />
      <span className={styles.cloudB} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />

      <ul className={styles.line} aria-label="Photo gallery" aria-description={HELP} aria-hidden={open || undefined}>
        {Array.from({ length: L.rows }, (_, r) => (
          <li key={`s${r}`} className={styles.stringRow} aria-hidden="true" style={{ insetBlockStart: L.top + r * L.rowH, blockSize: L.sag }}>
            <svg className={styles.stringSvg} viewBox={`0 0 100 ${L.sag}`} preserveAspectRatio="none">
              {[styles.stringShadow, styles.stringBase, styles.stringTwist].map((cls, k) => (
                <path
                  key={cls}
                  ref={(el) => { stringRefs.current[r * 3 + k] = el; }}
                  className={cls}
                  d={curve(L.sag)}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          </li>
        ))}
        {photos.map((p, i) => {
          const g = L.geo[i];
          const label = p.caption || p.alt || `Photo ${i + 1}`;
          const hanging = active !== i;
          return (
            <li key={i} className={styles.slot} style={{ insetInlineStart: g.x, insetBlockStart: g.y }}>
              <div
                ref={(el) => { hangerRefs.current[i] = el; }}
                className={styles.hanger}
                style={{ transform: `rotate(${restTilt(i)}deg)` }}
              >
                <button
                  ref={(el) => { triggerRefs.current[i] = el; }}
                  type="button"
                  className={styles.print}
                  data-away={hanging ? undefined : ''}
                  aria-label={label}
                  aria-haspopup="dialog"
                  tabIndex={hanging && !open ? 0 : -1}
                  onClick={() => unclip(i)}
                  onPointerMove={nudge(i)}
                >
                  <span className={styles.photoWell}>
                    {p.image ? (
                      <img className={styles.photo} src={p.image} alt="" draggable={false} />
                    ) : (
                      <span className={styles.blank} aria-hidden="true">{label.charAt(0)}</span>
                    )}
                    <span className={styles.sheen} aria-hidden="true" />
                  </span>
                  {p.caption && <span className={styles.caption}>{p.caption}</span>}
                  <span className={styles.paper} aria-hidden="true" />
                </button>
                <span className={styles.peg} data-empty={hanging ? undefined : ''} aria-hidden="true">
                  <span className={styles.pegSpring} />
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {!reduced && (
        <button
          type="button"
          className={styles.pause}
          aria-label={playing ? 'Pause the breeze' : 'Resume the breeze'}
          aria-pressed={!playing}
          onClick={() => setPlaying((v) => !v)}
        >
          <svg viewBox="0 0 16 16" className={styles.pauseIcon} aria-hidden="true">
            {playing ? <path d="M4.5 3h2.4v10H4.5zM9.1 3h2.4v10H9.1z" /> : <path d="M5 3l8 5-8 5z" />}
          </svg>
        </button>
      )}

      {shown && (
        <>
          <div ref={scrimRef} className={styles.scrim} onClick={rehang} aria-hidden="true" style={{ opacity: reduced ? 1 : 0 }} />
          <div
            ref={flyRef}
            className={styles.fly}
            role="dialog"
            aria-modal="true"
            aria-label={dialogLabel}
            aria-describedby={`${uid}-cap`}
            onKeyDown={onDialogKey}
            data-open={open ? '' : undefined}
            onClick={rehang}
          >
            <span className={styles.flyWell}>
              {shown.image ? (
                <img className={styles.photo} src={shown.image} alt={shown.alt || shown.caption || ''} draggable={false} />
              ) : (
                <span className={styles.blank} aria-hidden="true">{dialogLabel.charAt(0)}</span>
              )}
              <span className={styles.sheen} aria-hidden="true" />
            </span>
            <span className={styles.flyFoot}>
              <span id={`${uid}-cap`} className={styles.flyCaption}>{shown.caption}</span>
              <span className={styles.flyCount} aria-hidden="true">
                {String((active ?? 0) + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
              </span>
            </span>
            <span className={styles.paper} aria-hidden="true" />
            <button ref={closeRef} type="button" className={styles.close} aria-label="Re-hang photo" onClick={rehang}>
              <svg viewBox="0 0 16 16" className={styles.closeIcon} aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
