Create a custom element called "Swatch Fan Card". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: product image, product image description, product name, swatches (name and colour), price. Add other settings if they help.

```tsx
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export interface SwatchFanSwatch {
  name: string;
  color: string;
}

export interface SwatchFanCardProps {
  image?: string;
  imageAlt?: string;
  productName?: string;
  price?: string;
  swatches?: SwatchFanSwatch[];
  className?: string;
}

export const defaultSwatches: SwatchFanSwatch[] = [
  { name: 'Sage Ritual', color: '#7d8b6f' },
  { name: 'Terracotta Sun', color: '#c05b38' },
  { name: 'Cobalt Counter', color: '#2f5da8' },
  { name: 'Marigold Noon', color: '#d9a125' },
  { name: 'Damson Dusk', color: '#5b2e4f' },
];

const GROUP_LABEL = 'Colour swatches';
const GROUP_HELP =
  'Hover or tap a swatch to preview it. Arrow keys move between swatches; Enter or Space picks one.';

/* Where each paint dab lands on the no-image wall (percent of the framed panel). */
const DABS = [
  { x: 70, y: 8, s: 20, r: 14 },
  { x: 84, y: 40, s: 13, r: -20 },
  { x: 4, y: 58, s: 14, r: 24 },
  { x: 55, y: 3, s: 10, r: -10 },
  { x: 88, y: 9, s: 8, r: 30 },
  { x: 3, y: 7, s: 9, r: -26 },
  { x: 74, y: 58, s: 8, r: 8 },
  { x: 16, y: 72, s: 7, r: -14 },
];

const RAD = Math.PI / 180;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ---------- colour helpers: print the name in whichever of ink / paper reads better ---------- */

function parseColor(c: string): [number, number, number] | null {
  const s = c.trim();
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, (ch) => ch + ch) : hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgb = s.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

function luminance([r, g, b]: [number, number, number]) {
  const f = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

const PAPER_L = luminance([251, 250, 247]);
const INK_L = luminance([29, 28, 26]);

/* true = print in paper, false = print in ink */
function printLight(color: string): boolean {
  const rgb = parseColor(color);
  if (!rgb) return true;
  const l = luminance(rgb);
  const withPaper = (PAPER_L + 0.05) / (l + 0.05);
  const withInk = (l + 0.05) / (INK_L + 0.05);
  return withPaper >= withInk * 0.8;
}

/* ---------- layout: everything is sized from the card width and swatch count ---------- */

interface Geo {
  cw: number;
  ch: number;
  t: number;
  fx: number;
  fy: number;
  fw: number;
  fh: number;
  px: number;
  py: number;
  S: number;
  G: number;
  lean: number;
  grow: number;
  lift: number;
  hover: number;
  mt: number;
  ms: number;
  hy: number;
  hxIn: number;
  radius: number;
  sideLen: number;
  compact: boolean;
}

function layoutFan(w: number, n: number): Geo {
  const compact = w < 520;
  const cw = clamp(Math.round(w * (compact ? 0.31 : 0.285)), 92, 200);
  const ch = Math.round(cw * (compact ? 2.1 : 1.8));
  const fw = Math.round(w * 0.82);
  const fx = Math.round(w * 0.11);
  const fh = Math.round(fw * 0.48);
  const fy = compact ? 18 : 26;
  const over = compact ? 10 : 14;
  const t = fy + fh - Math.round(fh * 0.2) + ch - over;

  const margin = Math.round(w * 0.03) + 4;
  let maxA = 46;
  while (maxA > 20 && ch * Math.sin(maxA * RAD) + (cw / 2) * Math.cos(maxA * RAD) > w / 2 - margin) maxA -= 1;

  const lean = 0.5;
  const G = compact ? 14 : 15;
  const den = Math.max(n - 2 - (lean * (n - 1)) / 2, 0.6);
  const S = clamp((maxA - G) / den, 4, 15);

  /* Names printed up the exposed edge only as long as the slice stays wide enough to read. */
  const mt = compact ? 27 : 34;
  const sideLen = Math.floor(Math.min(ch * 0.58, ch - mt - 13 - 15 / (S * RAD)));

  return {
    cw,
    ch,
    t,
    fx,
    fy,
    fw,
    fh,
    px: w / 2,
    py: t + over,
    S,
    G,
    lean,
    grow: 0.12,
    lift: Math.round(ch * 0.07),
    hover: compact ? 8 : 12,
    mt,
    ms: compact ? 7 : 9,
    hy: compact ? 13 : 17,
    hxIn: compact ? 15 : 20,
    radius: compact ? 20 : 24,
    sideLen,
    compact,
  };
}

/* ---------- a tiny spring sim so chips, string and frame all move from one source of truth ---------- */

interface Sim {
  pos: number;
  posV: number;
  open: number[];
  openV: number[];
  hov: number[];
  hovV: number[];
}

interface Target {
  sel: number;
  opened: boolean;
  openedAt: number;
  preview: number | null;
}

const POS_K = 210;
const POS_C = 19;
const OPEN_K = 150;
const OPEN_C = 12.5;
const HOV_K = 320;
const HOV_C = 26;

function fitSim(sim: Sim, n: number, openedNow: boolean) {
  while (sim.open.length < n) {
    sim.open.push(openedNow ? 1 : 0);
    sim.openV.push(0);
    sim.hov.push(0);
    sim.hovV.push(0);
  }
  if (sim.open.length > n) {
    sim.open.length = n;
    sim.openV.length = n;
    sim.hov.length = n;
    sim.hovV.length = n;
  }
}

export default function SwatchFanCard({
  image = 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1400&h=900&fit=crop&auto=format&q=80',
  imageAlt = 'Lounge armchair in the studio corner',
  productName = 'Marlowe Lounge Chair',
  price = '$1,280',
  swatches: swatchesProp,
  className,
}: SwatchFanCardProps) {
  const swatches = swatchesProp ?? defaultSwatches;
  const n = swatches.length;

  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [opened, setOpened] = useState(false);
  const [width, setWidth] = useState(680);
  const [selected, setSelected] = useState(0);
  const [preview, setPreview] = useState<number | null>(null);
  const [hot, setHot] = useState(false);
  const [, setFrame] = useState(0);

  const uid = useId();
  const titleId = `${uid}-title`;

  const rootRef = useRef<HTMLElement | null>(null);
  const chipRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const simRef = useRef<Sim>({ pos: 0, posV: 0, open: [], openV: [], hov: [], hovV: [] });
  const targetRef = useRef<Target>({ sel: 0, opened: false, openedAt: 0, preview: null });
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const reducedRef = useRef(false);

  const selIdx = n ? Math.min(selected, n - 1) : -1;
  const shown = preview !== null && preview < n ? preview : selIdx;
  const tint = shown >= 0 ? swatches[shown].color : 'transparent';
  const idle = inView && !hot && !reduced && n > 0;

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
    if (typeof IntersectionObserver === 'undefined') {
      setOpened(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setOpened(true);
      },
      { threshold: 0.12 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = (w: number) => {
      if (w > 0) setWidth(Math.round(w));
    };
    measure(root.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => measure(entry.contentRect.width));
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  /* Drive the springs. The loop only runs while something is still moving. */
  useEffect(() => {
    reducedRef.current = reduced;
    const sim = simRef.current;
    const tg = targetRef.current;
    const count = n;
    fitSim(sim, count, opened);
    if (opened && !tg.opened) tg.openedAt = performance.now();
    tg.opened = opened;
    tg.sel = Math.max(selIdx, 0);
    tg.preview = preview;

    if (reduced) {
      sim.pos = tg.sel;
      sim.posV = 0;
      for (let i = 0; i < count; i++) {
        sim.open[i] = 1;
        sim.openV[i] = 0;
        sim.hov[i] = 0;
        sim.hovV[i] = 0;
      }
      setFrame((f) => f + 1);
      return;
    }

    const tick = (now: number) => {
      const s = simRef.current;
      const g = targetRef.current;
      const m = s.open.length;
      const dt = Math.min(Math.max((now - lastRef.current) / 1000, 0), 0.05);
      lastRef.current = now;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      let busy = false;

      for (let q = 0; q < steps; q++) {
        s.posV += (-POS_K * (s.pos - g.sel) - POS_C * s.posV) * h;
        s.pos += s.posV * h;
        for (let i = 0; i < m; i++) {
          const wait = g.opened ? Math.abs(i - g.sel) * 75 : 0;
          const ot = g.opened && now - g.openedAt >= wait ? 1 : 0;
          s.openV[i] += (-OPEN_K * (s.open[i] - ot) - OPEN_C * s.openV[i]) * h;
          s.open[i] += s.openV[i] * h;
          const ht = g.preview === i ? 1 : 0;
          s.hovV[i] += (-HOV_K * (s.hov[i] - ht) - HOV_C * s.hovV[i]) * h;
          s.hov[i] += s.hovV[i] * h;
        }
      }

      if (Math.abs(s.pos - g.sel) < 0.0006 && Math.abs(s.posV) < 0.004) {
        s.pos = g.sel;
        s.posV = 0;
      } else busy = true;
      for (let i = 0; i < m; i++) {
        const wait = g.opened ? Math.abs(i - g.sel) * 75 : 0;
        const ot = g.opened ? 1 : 0;
        if (g.opened && now - g.openedAt < wait) busy = true;
        if (Math.abs(s.open[i] - ot) < 0.0006 && Math.abs(s.openV[i]) < 0.004) {
          if (!(g.opened && now - g.openedAt < wait)) {
            s.open[i] = ot;
            s.openV[i] = 0;
          }
        } else busy = true;
        const ht = g.preview === i ? 1 : 0;
        if (Math.abs(s.hov[i] - ht) < 0.0006 && Math.abs(s.hovV[i]) < 0.004) {
          s.hov[i] = ht;
          s.hovV[i] = 0;
        } else busy = true;
      }

      setFrame((f) => f + 1);
      rafRef.current = busy && !reducedRef.current ? requestAnimationFrame(tick) : 0;
    };

    if (!rafRef.current) {
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [selIdx, opened, preview, reduced, n]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    },
    [],
  );

  /* ---------- geometry for this frame ---------- */
  const sim = simRef.current;
  fitSim(sim, n, opened || reduced);
  const geo = layoutFan(width, n);
  const center = (n - 1) / 2;
  const pos = n ? sim.pos : 0;
  let openSum = 0;
  for (let i = 0; i < n; i++) openSum += clamp(sim.open[i], 0, 1);
  const avgOpen = n ? openSum / n : 1;

  const angleAt = (i: number) => {
    const d = i - pos;
    const ad = Math.abs(d);
    return geo.lean * (pos - center) * geo.S + (d < 0 ? -1 : 1) * (geo.G * Math.min(ad, 1) + geo.S * Math.max(ad - 1, 0));
  };
  /* Keep the whole fan balanced on the card: slide the pivot against the fan's average lean. */
  const mid = n > 1 ? (angleAt(0) + angleAt(n - 1)) / 2 : 0;
  const pxs = geo.px - mid * RAD * geo.ch * 0.8;

  const items = swatches.map((sw, i) => {
    const d = i - pos;
    const ad = Math.abs(d);
    const base = angleAt(i);
    const o = Math.max(sim.open[i], 0);
    const wr = Math.max(0, 1 - ad);
    const w = wr * wr * (3 - 2 * wr);
    const hv = sim.hov[i];
    const theta = base * (0.06 + 0.94 * o);
    const grown = Math.min(o, 1);
    const scale = 1 + geo.grow * w * grown;
    const lift = geo.lift * w * grown + geo.hover * hv;
    const ty = geo.ch * 0.15 * (1 - o) - lift;
    const hx = clamp(d, -1, 1) * (geo.cw / 2 - geo.hxIn);

    const c = Math.cos(theta * RAD);
    const s = Math.sin(theta * RAD);
    /* Light falls from the upper left: express its screen-space shadow vector in the chip's rotated frame. */
    const lxv = 0.45 * c + 0.89 * s;
    const lyv = -0.45 * s + 0.89 * c;

    const hpx = hx * scale;
    const hpy = -(geo.ch - geo.hy) * scale + ty;
    return {
      sw,
      i,
      d,
      ad,
      w,
      theta,
      scale,
      ty,
      hx,
      hv,
      lxv,
      lyv,
      k: 1 + 1.3 * w * grown + 0.5 * hv,
      X: pxs + hpx * c - hpy * s,
      Y: geo.py + hpx * s + hpy * c,
      z: 100 - Math.round(ad * 2) + (d < 0 ? 0 : 1),
    };
  });

  const onGroupKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!n) return;
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = (selIdx + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = (selIdx - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next === null) return;
    e.preventDefault();
    setSelected(next);
    chipRefs.current[next]?.focus();
  };

  const onGroupBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setHot(false);
      setPreview(null);
    }
  };

  const rootStyle = {
    '--tint': tint,
    '--cw': `${geo.cw}px`,
    '--ch': `${geo.ch}px`,
    '--t': `${geo.t}px`,
    '--px': `${pxs.toFixed(1)}px`,
    '--py': `${geo.py}px`,
    '--fx': `${geo.fx}px`,
    '--fy': `${geo.fy}px`,
    '--fw': `${geo.fw}px`,
    '--fh': `${geo.fh}px`,
    '--mt': `${geo.mt}px`,
    '--ms': `${geo.ms}px`,
    '--hy': `${geo.hy}px`,
    '--sidelen': `${Math.max(geo.sideLen, 0)}px`,
    '--sidevis': geo.sideLen >= 40 ? 'visible' : 'hidden',
    '--rad': `${geo.radius}px`,
    '--mat': geo.compact ? '7px' : '10px',
    '--side-font': geo.compact ? '12px' : '13px',
  } as CSSProperties;

  const frameStyle = {
    transform: `rotate(${(-1.2 + (pos - center) * 0.4).toFixed(3)}deg) translateY(${((1 - clamp(avgOpen, 0, 1)) * -10).toFixed(2)}px)`,
  } as CSSProperties;

  const titleLong = (productName?.length ?? 0) > 34;

  return (
    <article
      ref={rootRef}
      className={[styles.root, idle && styles.idle, reduced && styles.reduced, className].filter(Boolean).join(' ')}
      style={rootStyle}
      aria-labelledby={productName ? titleId : undefined}
      aria-label={productName ? undefined : 'Product'}
    >
      <span className={styles.sheet} aria-hidden="true" />

      <div className={styles.table}>
        <span className={[styles.pool, reduced && styles.tintStatic].filter(Boolean).join(' ')} aria-hidden="true" />

        <div className={styles.frame} style={frameStyle}>
          <div className={styles.stage}>
            {image ? (
              <img className={styles.photo} src={image} alt={imageAlt} draggable={false} decoding="async" />
            ) : (
              <div className={styles.wall} aria-hidden="true">
                <span className={[styles.swath, reduced && styles.tintStatic].filter(Boolean).join(' ')} />
                {swatches.slice(0, DABS.length).map((sw, i) => {
                  const d = DABS[i];
                  return (
                    <span
                      key={`${sw.name}-${i}`}
                      className={[styles.dab, i === shown && styles.dabOn].filter(Boolean).join(' ')}
                      style={
                        {
                          '--pig': sw.color,
                          '--dx': `${d.x}%`,
                          '--dy': `${d.y}%`,
                          '--ds': `${d.s}%`,
                          '--dr': `${d.r}deg`,
                        } as CSSProperties
                      }
                    />
                  );
                })}
              </div>
            )}
            <span className={[styles.tintDepth, reduced && styles.tintStatic].filter(Boolean).join(' ')} aria-hidden="true" />
            <span className={[styles.tintGlow, reduced && styles.tintStatic].filter(Boolean).join(' ')} aria-hidden="true" />
            <span className={styles.vignette} aria-hidden="true" />
          </div>
        </div>

        {n > 0 && (
          <div
            className={styles.fan}
            role="radiogroup"
            aria-label={GROUP_LABEL}
            aria-description={GROUP_HELP}
            onPointerEnter={() => setHot(true)}
            onPointerLeave={() => {
              setHot(false);
              setPreview(null);
            }}
            onFocusCapture={() => setHot(true)}
            onBlur={onGroupBlur}
            onKeyDown={onGroupKeyDown}
          >
            {items.map((it) => {
              const isOn = it.i === selIdx;
              const light = printLight(it.sw.color);
              const tokens = it.sw.name.split(/[\s-]+/).filter(Boolean);
              const longest = tokens.reduce((m, tk) => Math.max(m, tk.length), 4);
              const availW = geo.cw - geo.ms * 2 - (geo.compact ? 18 : 26);
              const bigSize = clamp(Math.floor(availW / (longest * 0.56)), geo.compact ? 13 : 18, geo.compact ? 28 : 34);
              const bigOpacity = clamp((it.w - 0.35) / 0.5, 0, 1);
              const sideOpacity = 1 - clamp(it.w / 0.45, 0, 1);
              const side = it.d < 0 ? styles.sideL : styles.sideR;
              const style = {
                '--pig': it.sw.color,
                '--on': light ? '#fbfaf7' : '#1d1c1a',
                '--ex': it.lxv.toFixed(3),
                '--ey': it.lyv.toFixed(3),
                '--k': it.k.toFixed(2),
                '--hx': `${it.hx.toFixed(1)}px`,
                '--shade': (0.1 * Math.min(it.ad, 3) / 3).toFixed(3),
                '--big': `${bigSize}px`,
                transform: `rotate(${it.theta.toFixed(3)}deg) translateY(${it.ty.toFixed(2)}px) scale(${it.scale.toFixed(4)})`,
                zIndex: it.z,
              } as CSSProperties;
              return (
                <button
                  key={`${it.sw.name}-${it.i}`}
                  type="button"
                  role="radio"
                  aria-checked={isOn}
                  aria-label={it.sw.name}
                  tabIndex={isOn ? 0 : -1}
                  className={styles.chip}
                  style={style}
                  ref={(el) => {
                    chipRefs.current[it.i] = el;
                  }}
                  onPointerEnter={() => setPreview(it.i)}
                  onFocus={() => setPreview(it.i)}
                  onClick={() => setSelected(it.i)}
                >
                  <span className={styles.card}>
                    <span className={styles.face} aria-hidden="true">
                      <span className={styles.big} style={{ opacity: bigOpacity }}>
                        {it.sw.name}
                      </span>
                    </span>
                    <span
                      className={[styles.sideBox, side].join(' ')}
                      style={{ opacity: sideOpacity }}
                      aria-hidden="true"
                    >
                      <span className={styles.side}>{it.sw.name}</span>
                    </span>
                    <span className={styles.eyelet} aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className={styles.body}>
        <span className={[styles.counterGlow, reduced && styles.tintStatic].filter(Boolean).join(' ')} aria-hidden="true" />
        {(productName || price) && (
          <div className={styles.titleRow}>
            {productName && (
              <h3 id={titleId} className={[styles.title, titleLong && styles.titleLong].filter(Boolean).join(' ')}>
                {productName}
              </h3>
            )}
            {price && <p className={styles.price}>{price}</p>}
          </div>
        )}
        {n > 0 && (
          <p className={styles.colorRow}>
            <span className={styles.dot} aria-hidden="true" />
            <span
              key={shown}
              className={[styles.colorName, reduced && styles.colorNameStatic].filter(Boolean).join(' ')}
            >
              {swatches[Math.max(shown, 0)].name}
            </span>
            <span className={styles.count}>
              {`${String(Math.max(shown, 0) + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`}
            </span>
          </p>
        )}
      </div>

      <span className={styles.cardEdge} aria-hidden="true" />
    </article>
  );
}
```

```css
.root {
  --sf-font-display: 'Inter', 'Helvetica Neue', system-ui, sans-serif;
  --sf-font-ui: 'Inter', 'Helvetica Neue', system-ui, sans-serif;
  --tint: #7d8b6f;
  --cw: 167px;
  --ch: 326px;
  --t: 570px;
  --px: 340px;
  --py: 584px;
  --fx: 75px;
  --fy: 26px;
  --fw: 558px;
  --fh: 290px;
  --mt: 34px;
  --ms: 9px;
  --hy: 17px;
  --rad: 24px;
  --mat: 10px;
  --side-font: 13px;
  --sidelen: 180px;
  --sidevis: visible;
  --spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  position: relative;
  isolation: isolate;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  max-inline-size: 680px;
  margin-inline: auto;
  border-radius: var(--rad);
  color: #1d1c1a;
  color-scheme: light;
  font-family: var(--sf-font-ui);
  box-shadow: 0 1px 2px rgba(29, 28, 26, 0.08), 0 28px 48px -28px rgba(29, 28, 26, 0.38);
}

.root ::selection {
  background: color-mix(in srgb, var(--tint) 40%, #fbfaf7);
  color: #1d1c1a;
}

.sheet {
  position: absolute;
  inset: 0;
  z-index: -2;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(80% 45% at 30% 0%, rgba(255, 255, 255, 0.7), transparent 70%),
    linear-gradient(180deg, #eceae5 0%, #e2dfd8 100%);
}

/* ---------- the table: framed photo, then the fan on top of it ---------- */

.table {
  position: relative;
  block-size: var(--t);
  direction: ltr;
}

/* Paint light pooling on the counter around the chips. */
.pool {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-color: var(--tint);
  mix-blend-mode: multiply;
  opacity: 0.4;
  -webkit-mask-image: radial-gradient(70% 55% at 50% 100%, #000 0%, rgba(0, 0, 0, 0.45) 55%, transparent 100%);
  mask-image: radial-gradient(70% 55% at 50% 100%, #000 0%, rgba(0, 0, 0, 0.45) 55%, transparent 100%);
  pointer-events: none;
  transition: background-color 460ms cubic-bezier(0.4, 0, 0.2, 1);
}

.idle .pool {
  animation: breathe 6s ease-in-out infinite alternate;
}

/* The photo sits on a clean mat. */
.frame {
  position: absolute;
  z-index: 1;
  inset-inline-start: var(--fx);
  inset-block-start: var(--fy);
  inline-size: var(--fw);
  block-size: var(--fh);
  box-sizing: border-box;
  padding: var(--mat);
  border-radius: 6px;
  background: linear-gradient(160deg, #ffffff 0%, #f6f4ef 100%);
  box-shadow:
    0 0 0 1px rgba(29, 28, 26, 0.08),
    0 2px 4px rgba(29, 28, 26, 0.08),
    0 22px 36px -18px rgba(29, 28, 26, 0.36);
  transform-origin: 50% 80%;
}

.stage {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  inline-size: 100%;
  block-size: 100%;
  border-radius: 2px;
  background: #e2dfd8;
}

/* The mat's cut edge: the picture sits slightly recessed. */
.stage::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(29, 28, 26, 0.12);
  pointer-events: none;
  z-index: 3;
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  user-select: none;
  filter: saturate(1.3) contrast(1.08) brightness(0.96);
}

.tintDepth,
.tintGlow,
.vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* A faint overall cast, kept low so the photo's own colour stays rich. */
.tintDepth {
  background-color: var(--tint);
  mix-blend-mode: color;
  opacity: 0.34;
  transition: background-color 460ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Paint light pooling up from the chips: the visible tint layer. */
.tintGlow {
  background-color: var(--tint);
  mix-blend-mode: multiply;
  opacity: 0.8;
  -webkit-mask-image: radial-gradient(80% 95% at 50% 118%, #000 0%, rgba(0, 0, 0, 0.5) 45%, transparent 100%);
  mask-image: radial-gradient(80% 95% at 50% 118%, #000 0%, rgba(0, 0, 0, 0.5) 45%, transparent 100%);
  transition: background-color 460ms cubic-bezier(0.4, 0, 0.2, 1);
}

.vignette {
  background:
    radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(30, 24, 14, 0.18) 100%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, transparent 28%);
}

.tintStatic {
  transition: none;
}

/* ---------- no-image fallback: a calm wall with one soft swatch and a few dots ---------- */

.wall {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: linear-gradient(165deg, #f1efea 0%, #e3e0d8 100%);
}

.swath {
  position: absolute;
  inset-inline-start: 8%;
  inset-block-start: 12%;
  inline-size: 62%;
  block-size: 46%;
  border-radius: 6px;
  background-color: var(--tint);
  background-image: linear-gradient(155deg, rgba(255, 255, 255, 0.16), transparent 55%);
  box-shadow: 0 1px 2px rgba(29, 28, 26, 0.12), 0 14px 22px -14px rgba(29, 28, 26, 0.4);
  transition: background-color 460ms cubic-bezier(0.4, 0, 0.2, 1);
}

.dab {
  position: absolute;
  inset-inline-start: var(--dx);
  inset-block-start: var(--dy);
  inline-size: var(--ds);
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--pig);
  box-shadow: 0 0 0 2px #fff, 0 6px 10px -4px rgba(29, 28, 26, 0.4);
  transform: scale(0.94);
  transition: transform 520ms var(--spring);
}

.dabOn {
  transform: scale(1.2);
}

/* ---------- the fan: the hero ---------- */

.fan {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  -webkit-tap-highlight-color: transparent;
}

/* Each chip is pivoted at one point hidden behind the counter lip; the component sets its transform. */
.chip {
  position: absolute;
  inset-inline-start: calc(var(--px) - var(--cw) / 2);
  inset-block-start: calc(var(--py) - var(--ch));
  inline-size: var(--cw);
  block-size: var(--ch);
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  pointer-events: auto;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  transform-origin: 50% 100%;
  outline: none;
}

.chip:focus-visible .card {
  outline: 3px solid #1d1c1a;
  outline-offset: 3px;
}

/* Paper-card chip: one soft shadow system cast from the upper left. */
.card {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  background: linear-gradient(180deg, #fbfaf7 0%, #f4f2ed 100%);
  box-shadow:
    0 0 0 1px rgba(29, 28, 26, 0.1),
    calc(var(--ex) * var(--k) * 1px) calc(var(--ey) * var(--k) * 2px) calc(var(--k) * 3px) rgba(29, 28, 26, 0.14),
    calc(var(--ex) * var(--k) * 8px) calc(var(--ey) * var(--k) * 10px) calc(var(--k) * 18px) -6px rgba(29, 28, 26, 0.32);
}

/* Chips further from the picked one sit a little deeper in the pile. */
.card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: rgba(29, 28, 26, var(--shade));
  pointer-events: none;
}

/* Flat pigment face with a quiet top light. */
.face {
  position: absolute;
  inset-block-start: var(--mt);
  inset-block-end: 0;
  inset-inline: var(--ms);
  overflow: hidden;
  border-radius: 2px 2px 0 0;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.12) 0%, transparent 45%, rgba(0, 0, 0, 0.08) 100%),
    var(--pig);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
}

/* The picked chip carries its name as display type. */
.big {
  position: absolute;
  inset-block-start: 12px;
  inset-inline: 12px;
  z-index: 1;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
  font-family: var(--sf-font-display);
  font-size: var(--big);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.035em;
  color: var(--on);
  overflow-wrap: anywhere;
  hyphens: auto;
  text-wrap: balance;
}

/* Everyone else is printed along the exposed edge, like a paint deck. */
.sideBox {
  position: absolute;
  inset-block-start: calc(var(--mt) + 13px);
  inline-size: 17px;
  block-size: var(--sidelen);
  visibility: var(--sidevis);
  z-index: 1;
}

.sideL {
  inset-inline-start: calc(var(--ms) + 7px);
}

.sideR {
  inset-inline-end: calc(var(--ms) + 7px);
}

.side {
  display: block;
  max-height: 100%;
  writing-mode: vertical-rl;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--sf-font-display);
  font-size: var(--side-font);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0;
  color: var(--on);
}

/* Fine hairline pivot ring. */
.eyelet {
  position: absolute;
  inset-block-start: calc(var(--hy) - 4px);
  inset-inline-start: calc(50% + var(--hx) - 4px);
  inline-size: 8px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(29, 28, 26, 0.55) 0 1.5px, transparent 2px);
  box-shadow: 0 0 0 0.5px rgba(29, 28, 26, 0.45), inset 0 0 0 0.5px rgba(255, 255, 255, 0.7);
}

/* ---------- the counter lip: label and price ---------- */

.body {
  position: relative;
  z-index: 6;
  display: grid;
  gap: 12px;
  padding: clamp(22px, 4.4cqi, 30px) clamp(20px, 4.8cqi, 32px) clamp(24px, 4.6cqi, 32px);
  border-end-start-radius: var(--rad);
  border-end-end-radius: var(--rad);
  background: linear-gradient(180deg, #ffffff 0%, #fbfaf7 100%);
  box-shadow:
    0 -1px 0 rgba(255, 255, 255, 0.9),
    0 -10px 20px -12px rgba(29, 28, 26, 0.3);
}

.body::before {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  block-size: 1px;
  background: rgba(29, 28, 26, 0.1);
  pointer-events: none;
}

.counterGlow {
  position: absolute;
  inset: 0;
  border-end-start-radius: inherit;
  border-end-end-radius: inherit;
  background-color: var(--tint);
  opacity: 0.2;
  -webkit-mask-image: radial-gradient(60% 90% at 50% 0%, #000 0%, transparent 100%);
  mask-image: radial-gradient(60% 90% at 50% 0%, #000 0%, transparent 100%);
  pointer-events: none;
  transition: background-color 460ms cubic-bezier(0.4, 0, 0.2, 1);
}

.titleRow {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px 20px;
}

.title {
  flex: 1 1 230px;
  min-inline-size: 0;
  margin: 0;
  font-family: var(--sf-font-display);
  font-size: clamp(26px, 5.8cqi, 40px);
  font-weight: 700;
  line-height: 1.02;
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

/* Very long product names step down and cap at three lines so the card height stays bounded. */
.titleLong {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  font-size: clamp(21px, 4.2cqi, 27px);
  line-height: 1.06;
  letter-spacing: -0.03em;
}

.price {
  flex: none;
  margin: 0;
  font-family: var(--sf-font-display);
  font-size: clamp(22px, 4.4cqi, 28px);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.colorRow {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  min-inline-size: 0;
  margin: 0;
}

.dot {
  flex: none;
  inline-size: 18px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--tint);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.14), 0 0 0 2px #fff, 0 0 0 3px rgba(29, 28, 26, 0.12);
  transition: background-color 460ms cubic-bezier(0.4, 0, 0.2, 1);
}

.colorName {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
  animation: rise 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.colorNameStatic {
  animation: none;
}

.count {
  flex: none;
  font-size: 14px;
  font-weight: 600;
  color: #5b5852;
  font-variant-numeric: tabular-nums;
}

.cardEdge {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(29, 28, 26, 0.12);
  pointer-events: none;
  z-index: 9;
}

@keyframes breathe {
  from {
    opacity: 0.3;
  }
  to {
    opacity: 0.48;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```
