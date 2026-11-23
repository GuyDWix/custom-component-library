Create a custom element called "Pull Cord Reveal". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: cover image, cover image description, image underneath, underneath image description, cord label, offer title, offer note, shade colour. Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface PullCordRevealProps {
  coverImage?: string;
  coverAlt?: string;
  revealImage?: string;
  revealAlt?: string;
  cordLabel?: string;
  offerTitle?: string;
  offerNote?: string;
  shadeColor?: string;
  className?: string;
}

const STIFFNESS = 170;
const DAMPING = 18;
const THROW_SPEED = 1.5;
const TAP_SLOP = 7;

const RING_K = 230;
const RING_C = 7.5;
const LEAN_K = 42;
const LEAN_C = 3.2;
const CORD_K = 13;
const CORD_C = 1.5;
const TAG_K = 30;
const TAG_C = 1.3;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const SHADE_HELP =
  'Drag the cord down, or use the down and up arrow keys, to lower and raise the shade.';

const NOTCHES = [0, 60, 120, 180, 240, 300];

export default function PullCordReveal({
  coverImage = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1600&auto=format&fit=crop',
  coverAlt = 'A warmly lit restaurant room with guests at small candle-lit tables',
  revealImage = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1400&auto=format&fit=crop',
  revealAlt = 'A plated evening dish with roasted vegetables and herbs',
  cordLabel = "Tonight's menu",
  offerTitle = 'Two courses, one price',
  offerNote = 'Sunday to Thursday, seatings at 19:00 and 21:30',
  shadeColor = '#e7dcc4',
  className,
}: PullCordRevealProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);

  const rootRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const cordRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const reducedRef = useRef(false);

  const motion = useRef({ t: 0, v: 0 });
  const stop = useRef(0);
  const drag = useRef({ on: false, y0: 0, x0: 0, t0: 0, moved: 0, lastAt: 0 });
  // Secondary motion: ring spring, shade lean, cord pendulum, tag pendulum.
  const phys = useRef({
    r: 0,
    rv: 0,
    l: 0,
    lw: 0,
    c: 0,
    cw: 0,
    g: 0,
    gw: 0,
    pv: 0,
    dx: 0,
    mountedAt: 0,
  });
  const sizes = useRef({ dip: 140, w: 600 });

  const measure = useCallback(() => {
    const pane = paneRef.current;
    const cord = cordRef.current;
    if (!pane || !cord) return;
    const cordH = cord.offsetHeight;
    const tail = (handleRef.current?.offsetHeight ?? 0) + (dropRef.current?.offsetHeight ?? 0) + 10;
    sizes.current.dip = clamp(pane.offsetHeight * 0.34, 70, Math.max(70, cordH * 0.84 - tail));
    sizes.current.w = pane.offsetWidth;
  }, []);

  useEffect(() => {
    const pane = paneRef.current;
    const cord = cordRef.current;
    const handle = handleRef.current;
    const drop = dropRef.current;
    if (!pane || !cord || !handle) return;
    const ro = new ResizeObserver(measure);
    ro.observe(pane);
    ro.observe(cord);
    if (drop) ro.observe(drop);
    measure();
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      reducedRef.current = mq.matches;
      setReduced(mq.matches);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    phys.current.mountedAt = performance.now();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const paint = useCallback(() => {
    const pane = paneRef.current;
    if (!pane) return;
    const { t, v } = motion.current;
    const p = phys.current;
    const now = performance.now();
    const tt = clamp(t, -0.04, 1.05);
    const set = (k: string, val: string) => pane.style.setProperty(k, val);
    set('--t', tt.toFixed(4));
    set('--u', (1 - clamp(t, 0, 1)).toFixed(4));
    set('--v', Math.min(1, Math.abs(v) * 0.35).toFixed(3));
    set('--roll', `${(tt * 220).toFixed(1)}px`);
    set('--spin', `${(tt * 640).toFixed(1)}deg`);
    set('--ring', `${(clamp(p.r, -0.06, 1.12) * sizes.current.dip).toFixed(1)}px`);
    let idle = 0;
    let idleLean = 0;
    if (!reducedRef.current) {
      const ramp = Math.min(1, (now - (p.mountedAt || now)) / 4000);
      idle = 0.7 * Math.sin(now / 1100) * ramp;
      idleLean = 0.1 * Math.sin(now / 1700) * ramp;
    }
    set('--sway', `${(clamp(p.c, -22, 22) + idle).toFixed(2)}deg`);
    set('--tag', `${clamp(p.g, -26, 26).toFixed(2)}deg`);
    const lean = clamp(p.l, -1.4, 1.4) + idleLean;
    set('--lean', `${lean.toFixed(3)}deg`);
    set('--leanpx', `${((Math.tan((lean * Math.PI) / 180) * sizes.current.w) / 2).toFixed(2)}px`);
    const pct = Math.round(clamp(t, 0, 1) * 100);
    const handle = handleRef.current;
    if (handle) {
      handle.setAttribute('aria-valuenow', String(pct));
      handle.setAttribute(
        'aria-valuetext',
        pct === 0 ? 'shade up' : pct === 100 ? 'shade fully lowered' : `${pct}% lowered`,
      );
    }
  }, []);

  useEffect(() => {
    paint();
  }, [paint, reduced]);

  useEffect(() => {
    if (reduced || !inView) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const m = motion.current;
      const p = phys.current;
      const dragging = drag.current.on;
      const acc = clamp((m.v - p.pv) / Math.max(dt, 1e-3), -500, 500);
      p.pv = m.v;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        if (!dragging) {
          m.v += (STIFFNESS * (stop.current - m.t) - DAMPING * m.v) * h;
          m.t += m.v * h;
        }
        // Ring hangs on the cord: stiff while held, springy once let go.
        const kR = dragging ? 900 : RING_K;
        const cR = dragging ? 52 : RING_C;
        p.rv += (kR * (m.t - p.r) - cR * p.rv) * h;
        p.r += p.rv * h;
        // Shade leans as it accelerates and settles.
        p.lw += (-LEAN_K * p.l - LEAN_C * p.lw + 0.12 * acc) * h;
        p.l += p.lw * h;
        // Cord pendulum (follows the pointer sideways while held).
        const ca = dragging
          ? 90 * (p.dx - p.c) - 14 * p.cw
          : -CORD_K * p.c - CORD_C * p.cw;
        p.cw += ca * h;
        p.c += p.cw * h;
        // Tag hangs from the cord end and lags behind it.
        const ga = -TAG_K * p.g - TAG_C * p.gw - 0.85 * ca;
        p.gw += ga * h;
        p.g += p.gw * h;
      }
      paint();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced, inView, paint]);

  const kick = (dir: number) => {
    const p = phys.current;
    p.cw += dir * 26;
    p.gw -= dir * 20;
  };

  const goTo = useCallback(
    (target: number, fromUser = false) => {
      const m = motion.current;
      if (reduced) {
        m.t = target;
        m.v = 0;
        phys.current.r = target;
        paint();
        return;
      }
      if (fromUser) {
        const p = phys.current;
        const dir = target > m.t ? 1 : -1;
        p.cw += dir * 26;
        p.gw -= dir * 20;
      }
      stop.current = target;
    },
    [reduced, paint],
  );

  const onCordDown = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    handleRef.current?.focus({ preventScroll: true });
    const m = motion.current;
    if (reduced) {
      m.t = m.t < 0.5 ? 1 : 0;
      m.v = 0;
      phys.current.r = m.t;
      paint();
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      on: true,
      y0: e.clientY,
      x0: e.clientX,
      t0: m.t,
      moved: 0,
      lastAt: performance.now(),
    };
  };

  const onCordMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.on) return;
    const now = performance.now();
    const delta = e.clientY - drag.current.y0;
    drag.current.moved = Math.max(drag.current.moved, Math.abs(delta));
    phys.current.dx = clamp((e.clientX - drag.current.x0) * 0.12, -14, 14);
    const t = clamp(drag.current.t0 + delta / Math.max(40, sizes.current.dip), 0, 1);
    const m = motion.current;
    const dt = Math.max((now - drag.current.lastAt) / 1000, 1e-4);
    m.v = (t - m.t) / dt;
    drag.current.lastAt = now;
    m.t = t;
    paint();
  };

  const onCordUp = () => {
    if (!drag.current.on) return;
    drag.current.on = false;
    const m = motion.current;
    let target = m.t > 0.5 ? 1 : 0;
    if (Math.abs(m.v) > THROW_SPEED) target = m.v > 0 ? 1 : 0;
    if (drag.current.moved < TAP_SLOP) target = m.t > 0.5 ? 0 : 1;
    stop.current = target;
    phys.current.dx = 0;
    kick(clamp(m.v, -3, 3) / 3 || (target ? 1 : -1));
  };

  const onCordClick = (e: MouseEvent<HTMLDivElement>) => e.stopPropagation();

  const onPaneClick = () => {
    goTo(motion.current.t > 0.5 ? 0 : 1, true);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const m = motion.current;
    if (e.key === 'ArrowDown' || e.key === 'End') {
      e.preventDefault();
      goTo(1, true);
    } else if (e.key === 'ArrowUp' || e.key === 'Home') {
      e.preventDefault();
      goTo(0, true);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goTo(m.t > 0.5 ? 0 : 1, true);
    }
  };

  const rootStyle = { '--pc-shade': shadeColor || '#e7dcc4' } as CSSProperties;
  const ref = (name: string) => `url(#${uid}${name})`;

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
    >
      <span className={styles.plaster} aria-hidden="true" />

      <svg className={styles.defs} width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${uid}b`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#9a7940" />
            <stop offset="0.45" stopColor="#c4a263" />
            <stop offset="1" stopColor="#8a6a34" />
          </linearGradient>
          <linearGradient id={`${uid}d`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d9bb7e" />
            <stop offset="1" stopColor="#94733a" />
          </linearGradient>
          <linearGradient id={`${uid}w`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6e4a26" />
            <stop offset="0.45" stopColor="#a47339" />
            <stop offset="1" stopColor="#5c3d1f" />
          </linearGradient>
        </defs>
      </svg>

      <div className={styles.stage}>
        <div className={styles.window}>
          <div className={styles.reveal}>
            <div ref={paneRef} className={styles.pane} onClick={onPaneClick}>
              <div className={styles.sash}>
                <div className={styles.view}>
                  {coverImage ? (
                    <img
                      className={styles.viewPhoto}
                      src={coverImage}
                      alt={coverAlt}
                      draggable={false}
                    />
                  ) : (
                    <span className={styles.viewFallback} aria-hidden="true" />
                  )}
                  <span className={styles.viewDusk} aria-hidden="true" />
                  <span className={styles.viewSheen} aria-hidden="true" />
                  <span className={styles.barV1} aria-hidden="true" />
                  <span className={styles.barV2} aria-hidden="true" />
                  <span className={styles.barH} aria-hidden="true" />
                  <span className={styles.viewEdge} aria-hidden="true" />
                </div>
              </div>

              <span className={styles.hang} aria-hidden="true" />

              <div className={styles.shadeWrap}>
                <div className={styles.shadeFace}>
                  {revealImage ? (
                    <>
                      <img
                        className={styles.shadePhoto}
                        src={revealImage}
                        alt={revealAlt}
                        draggable={false}
                      />
                      <span className={styles.offerScrim} aria-hidden="true" />
                      {(offerTitle || offerNote) && (
                        <div className={styles.offer}>
                          {offerTitle && <h3 className={styles.offerTitle}>{offerTitle}</h3>}
                          {offerTitle && offerNote && (
                            <span className={styles.offerRule} aria-hidden="true" />
                          )}
                          {offerNote && <p className={styles.offerNote}>{offerNote}</p>}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={styles.shadeBlank}>
                      {offerTitle && <h3 className={styles.shadeBlankTitle}>{offerTitle}</h3>}
                      {offerNote && <p className={styles.shadeBlankNote}>{offerNote}</p>}
                    </div>
                  )}
                </div>
                <span className={styles.shadeWeave} aria-hidden="true" />
                          <span className={styles.shadeGlow} aria-hidden="true" />
                          <span className={styles.shadeTop} aria-hidden="true" />
                <span className={styles.shadeEdge} aria-hidden="true" />
              </div>

              <span className={styles.hem} aria-hidden="true" />
              <span className={styles.roll} aria-hidden="true" />

              {[styles.bracketL, styles.bracketR].map((side) => (
                <svg
                  key={side}
                  className={`${styles.bracket} ${side}`}
                  viewBox="0 0 36 52"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M3 0H33V37.5Q33 48 18 48Q3 48 3 37.5Z" fill={ref('b')} />
                  <circle cx="18" cy="22" r="7.6" fill="rgba(40,24,6,0.55)" />
                  <circle cx="18" cy="22" r="6" fill={ref('b')} />
                  <circle cx="18" cy="22" r="2.6" fill="#3a2a12" />
                </svg>
              ))}

              <svg className={styles.arm} viewBox="0 0 30 66" aria-hidden="true" focusable="false">
                <rect x="6" y="0" width="18" height="8" rx="1.6" fill={ref('b')} />
                <rect x="12.2" y="8" width="5.6" height="28" fill={ref('b')} />
                <g className={styles.wheel}>
                  <circle cx="15" cy="46" r="11.4" fill={ref('b')} />
                  <circle cx="15" cy="46" r="8" fill="#2a1a08" />
                  <path d="M15 38.4V41.4" stroke="rgba(214,180,120,0.8)" strokeWidth="1.2" />
                  <circle cx="15" cy="46" r="2.6" fill={ref('b')} />
                </g>
                <path d="M6.8 46A8.2 8.2 0 0 0 23.2 46" fill="none" stroke="#cdb88c" strokeWidth="2" />
              </svg>

              <div
                ref={cordRef}
                className={styles.cord}
                onPointerDown={onCordDown}
                onPointerMove={onCordMove}
                onPointerUp={onCordUp}
                onPointerCancel={onCordUp}
                onClick={onCordClick}
              >
                <span className={styles.cordLine} aria-hidden="true" />
                <div
                  ref={handleRef}
                  className={styles.cordHandle}
                  role="slider"
                  tabIndex={0}
                  aria-label="Window shade"
                  aria-orientation="vertical"
                  aria-description={SHADE_HELP}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={0}
                  onKeyDown={onKeyDown}
                >
                  <svg viewBox="0 0 64 64" className={styles.ringSvg} aria-hidden="true" focusable="false">
                    <circle cx="32" cy="32" r="25" fill="none" stroke={ref('d')} strokeWidth="6" />
                  </svg>
                </div>
                <div ref={dropRef} className={styles.drop}>
                  <svg viewBox="0 0 24 54" className={styles.acorn} aria-hidden="true" focusable="false">
                    <ellipse cx="12" cy="3" rx="3.4" ry="3" fill="none" stroke={ref('b')} strokeWidth="1.5" />
                    <path d="M7 6H17L18.6 12H5.4Z" fill={ref('b')} />
                    <path
                      d="M9.4 15.2C4 18.4 2 27.2 5 34C7 38.6 10 41 10.8 44L10 47C10 49.6 11 52 12 52C13 52 14 49.6 14 47L13.2 44C14 41 17 38.6 19 34C22 27.2 20 18.4 14.6 15.2Z"
                      fill={ref('w')}
                    />
                  </svg>
                  {cordLabel && (
                    <div className={styles.tagSwing}>
                      <span className={styles.thread} aria-hidden="true" />
                      <span className={styles.tag}>{cordLabel}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <span className={styles.sill} aria-hidden="true" />
      </div>
    </div>
  );
}
```

```css
/* Evening window: painted sash window, linen roller shade, plain brass hardware */

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-display: swap;
  font-weight: 600;
  src: url('./fonts/cormorant-garamond-latin-600-normal.woff2') format('woff2');
}

@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-display: swap;
  font-weight: 500;
  src: url('./fonts/hanken-grotesk-latin-500-normal.woff2') format('woff2');
}

.root {
  --pc-wall: #2b1f1a;
  --pc-wall-lit: #6a4228;
  --pc-frame: #27362f;
  --pc-shade: #e7dcc4;
  --pc-brass: #b48a4a;
  --pc-brass-hi: #e1be7e;
  --pc-ink: #2b1f14;
  --pc-font-ui: 'Hanken Grotesk', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --pc-font-display: 'Cormorant Garamond', 'Iowan Old Style', Palatino, Georgia, serif;

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  background: linear-gradient(172deg, #302621 0%, var(--pc-wall) 55%, #1c1613 100%);
  color: #f3e9d7;
  font-family: var(--pc-font-ui);
}

.root::selection {
  background: #7a5735;
  color: #f6ecda;
}

.defs {
  position: absolute;
  inline-size: 0;
  block-size: 0;
  overflow: hidden;
  pointer-events: none;
}

.plaster {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: radial-gradient(130% 100% at 50% 38%, transparent 42%, rgba(6, 3, 2, 0.4) 100%);
}

.stage {
  position: relative;
  z-index: 2;
  display: grid;
  justify-items: center;
  padding: clamp(28px, 7cqi, 72px) clamp(20px, 5cqi, 56px) clamp(40px, 9cqi, 88px);
}

/* ---- Casing: mitred border = four differently lit faces ---- */

.window {
  --cw: clamp(16px, 3.3cqi, 34px);
  position: relative;
  box-sizing: border-box;
  inline-size: min(100%, 960px);
  aspect-ratio: 4 / 3;
  border: var(--cw) solid var(--pc-frame);
  border-top-color: color-mix(in srgb, var(--pc-frame) 80%, #ffe2b8 20%);
  border-left-color: color-mix(in srgb, var(--pc-frame) 88%, #ffe2b8 12%);
  border-right-color: color-mix(in srgb, var(--pc-frame) 68%, #000 32%);
  border-bottom-color: color-mix(in srgb, var(--pc-frame) 52%, #000 48%);
  border-radius: 3px;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.5),
    24px 34px 56px -24px rgba(3, 1, 0, 0.7);
  cursor: pointer;
}

/* ---- Reveal: the deep jambs the shade is hung inside ---- */

.reveal {
  --jd: clamp(9px, 2cqi, 22px);
  position: relative;
  box-sizing: border-box;
  block-size: 100%;
  border: var(--jd) solid var(--pc-frame);
  border-top-color: color-mix(in srgb, var(--pc-frame) 36%, #000 64%);
  border-left-color: color-mix(in srgb, var(--pc-frame) 58%, #000 42%);
  border-right-color: color-mix(in srgb, var(--pc-frame) 60%, #000 20%);
  border-bottom-color: color-mix(in srgb, var(--pc-frame) 44%, #000 30%);
}

.pane {
  --t: 0;
  --u: 1;
  --v: 0;
  --ring: 0px;
  --sway: 0deg;
  --tag: 0deg;
  --lean: 0deg;
  --leanpx: 0px;
  --roll: 0px;
  --spin: 0deg;

  --bw: clamp(26px, 4.4cqi, 46px);
  --ax: calc(var(--bw) * 0.62);
  --rmax: calc(var(--bw) * 0.46);
  --rmin: calc(var(--bw) * 0.27);
  --rad: calc(var(--rmin) + var(--u) * (var(--rmax) - var(--rmin)));
  --cx: clamp(68px, 10cqi, 104px);
  --cordw: 44px;
  --rs: clamp(30px, 3.8cqi, 40px);
  --sw: clamp(6px, 1.15cqi, 13px);
  --bar: clamp(5px, 0.9cqi, 9px);
  --g1: calc(var(--sw) + (100% - var(--sw) * 2) * 0.335);
  --g2: calc(var(--sw) + (100% - var(--sw) * 2) * 0.7);
  --g3: calc(var(--sw) + (100% - var(--sw) * 2) * 0.27);

  position: relative;
  block-size: 100%;
  overflow: clip;
  background: #120c07;
}

/* ---- Sash + glass ---- */

.sash {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: var(--sw) solid var(--pc-frame);
  border-top-color: color-mix(in srgb, var(--pc-frame) 84%, #ffe2b8 16%);
  border-left-color: color-mix(in srgb, var(--pc-frame) 90%, #ffe2b8 10%);
  border-right-color: color-mix(in srgb, var(--pc-frame) 74%, #000 26%);
  border-bottom-color: color-mix(in srgb, var(--pc-frame) 60%, #000 40%);
}

.view {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #170f0a;
}

.viewPhoto {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  filter: saturate(0.96) brightness(0.9);
  user-select: none;
}

.viewFallback {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(190deg, #3a3a44 0%, #4a3f3a 45%, #231a14 100%);
}

.viewDusk {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(40, 46, 70, 0.22) 0%, transparent 40%, rgba(22, 12, 6, 0.28) 100%);
}

.viewSheen {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(108deg, transparent 18%, rgba(255, 244, 226, 0.07) 30%, transparent 42%);
}

.barV1,
.barV2,
.barH {
  position: absolute;
  pointer-events: none;
}

.barV1,
.barV2 {
  inset-block: 0;
  inline-size: var(--bar);
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--pc-frame) 70%, #ffdca8 30%) 0 1px,
    color-mix(in srgb, var(--pc-frame) 92%, #ffe2b8 8%) 1px calc(100% - 2px),
    color-mix(in srgb, var(--pc-frame) 55%, #000 45%) calc(100% - 2px)
  );
  box-shadow:
    3px 0 5px rgba(0, 0, 0, 0.28);
}

.barV1 {
  inset-inline-start: calc(33.5% - var(--bar) / 2);
}

.barV2 {
  inset-inline-start: calc(70% - var(--bar) / 2);
}

.barH {
  inset-inline: 0;
  inset-block-start: calc(27% - var(--bar) / 2);
  block-size: var(--bar);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--pc-frame) 66%, #ffdca8 34%) 0 1px,
    color-mix(in srgb, var(--pc-frame) 92%, #ffe2b8 8%) 1px calc(100% - 2px),
    color-mix(in srgb, var(--pc-frame) 52%, #000 48%) calc(100% - 2px)
  );
  box-shadow:
    0 3px 5px rgba(0, 0, 0, 0.28);
}

.viewEdge {
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.55),
    inset 5px 6px 12px -4px rgba(0, 0, 0, 0.5);
}

/* ---- Linen shade ---- */

.shadeWrap {
  position: absolute;
  inset: 0;
  z-index: 20;
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(var(--t) * 100% + var(--leanpx)),
    0 calc(var(--t) * 100% - var(--leanpx))
  );
}

.shadeFace {
  position: absolute;
  inset: 0;
  background: var(--pc-shade);
}

.shadePhoto {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  filter: saturate(0.9) contrast(1.02) brightness(0.96);
  user-select: none;
}

.offerScrim {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(18, 9, 3, 0.86) 0%, rgba(18, 9, 3, 0.62) 34%, transparent 70%),
    linear-gradient(90deg, rgba(18, 9, 3, 0.4), transparent 62%);
}

.offer {
  position: absolute;
  z-index: 2;
  inset-block-start: calc(var(--bw) * 1.5 + clamp(14px, 3.2cqi, 38px));
  inset-inline-start: clamp(18px, 4.5cqi, 52px);
  inset-inline-end: calc(var(--cx) + 32px);
}

.offerTitle {
  margin: 0;
  font-family: var(--pc-font-display);
  font-size: clamp(24px, 5.6cqi, 54px);
  font-weight: 600;
  line-height: 1.02;
  letter-spacing: -0.005em;
  color: #f8eedb;
  text-wrap: balance;
  overflow-wrap: anywhere;
  text-shadow: 0 1px 12px rgba(10, 5, 1, 0.4);
}

.offerRule {
  display: block;
  inline-size: clamp(36px, 4cqi, 54px);
  border-block-start: 2px solid rgba(225, 190, 126, 0.95);
  margin-block: clamp(8px, 1.4cqi, 14px) clamp(6px, 1.2cqi, 12px);
}

.offerNote {
  margin: 0;
  font-size: clamp(13px, 1.55cqi, 17px);
  line-height: 1.45;
  color: rgba(248, 238, 219, 0.92);
  max-inline-size: 40ch;
  overflow-wrap: anywhere;
  letter-spacing: 0.01em;
}

.shadeBlank {
  position: absolute;
  inset-block: calc(var(--bw) * 1.5) 0;
  inset-inline-start: 0;
  inset-inline-end: calc(var(--cx) + 32px);
  display: grid;
  align-content: center;
  padding: 6% 6% 8%;
}

.shadeBlankTitle {
  margin: 0;
  font-family: var(--pc-font-display);
  font-size: clamp(24px, 5.8cqi, 56px);
  font-weight: 600;
  color: var(--pc-ink);
  line-height: 1.04;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.shadeBlankNote {
  margin: clamp(8px, 1.6cqi, 16px) 0 0;
  font-size: clamp(13px, 1.6cqi, 17px);
  color: color-mix(in srgb, var(--pc-ink) 82%, transparent);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

/* Linen: a faint thread line */
.shadeWeave {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(70, 44, 16, 0.06) 0 1px, transparent 1px 3px);
}

/* Soft daylight through the cloth */
.shadeGlow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 240, 215, 0.1), transparent 60%, rgba(60, 40, 20, 0.1));
}

/* Cloth turning up into the roll, and ambient occlusion from the jambs */
.shadeTop {
  position: absolute;
  inset-inline: 0;
  inset-block-start: calc(var(--ax) + var(--rad) - 3px);
  block-size: clamp(22px, 5cqi, 56px);
  pointer-events: none;
  background: linear-gradient(180deg, rgba(20, 10, 3, 0.4), rgba(20, 10, 3, 0.12) 45%, transparent);
}

.shadeEdge {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    rgba(40, 24, 8, 0.2),
    transparent 6%,
    transparent 93%,
    rgba(40, 24, 8, 0.24)
  );
}

/* Shadow the hanging shade throws on the glass below it */
.hang {
  position: absolute;
  z-index: 15;
  inset-inline: 0;
  inset-block-start: calc(var(--t) * 100%);
  block-size: clamp(30px, 8cqi, 84px);
  transform-origin: 50% 0;
  transform: rotate(var(--lean));
  opacity: min(1, calc(var(--t) * 7));
  pointer-events: none;
  background:
    linear-gradient(90deg, transparent 30%, rgba(4, 2, 0, 0.22)),
    linear-gradient(180deg, rgba(6, 3, 0, 0.5), rgba(6, 3, 0, 0.2) 34%, rgba(6, 3, 0, 0.06) 68%, transparent);
}

.hem {
  position: absolute;
  z-index: 30;
  inset-inline: 0;
  inset-block-start: calc(var(--t) * 100%);
  block-size: clamp(12px, 2cqi, 20px);
  background: linear-gradient(
    180deg,
    var(--pc-shade) 0%,
    color-mix(in srgb, var(--pc-shade) 80%, #3a2008 20%) 100%
  );
  border-radius: 1px 1px 3px 3px;
  box-shadow: 0 6px 10px -4px rgba(6, 3, 0, 0.5);
  transform: translateY(-100%) rotate(var(--lean)) scaleY(calc(1 - var(--v) * 0.1));
  pointer-events: none;
}

/* Linen roll on a fixed axis; it thins as the shade unwinds */
.roll {
  position: absolute;
  z-index: 40;
  inset-inline: calc(var(--bw) * 0.5);
  inset-block-start: calc(var(--ax) - var(--rad));
  block-size: calc(var(--rad) * 2);
  background:
    linear-gradient(
      180deg,
      rgba(22, 11, 3, 0.5) 0%,
      rgba(22, 11, 3, 0.12) 18%,
      rgba(255, 246, 224, 0.26) 36%,
      transparent 58%,
      rgba(22, 11, 3, 0.4) 100%
    ),
    var(--pc-shade);
  border-radius: 2px;
  box-shadow: 0 5px 9px -5px rgba(8, 4, 0, 0.5);
  pointer-events: none;
}

.bracket {
  position: absolute;
  z-index: 50;
  inset-block-start: 0;
  inline-size: var(--bw);
  block-size: auto;
  filter: drop-shadow(2px 3px 2px rgba(6, 3, 0, 0.45));
  pointer-events: none;
}

.bracketL {
  inset-inline-start: 0;
}

.bracketR {
  inset-inline-end: 0;
}

.arm {
  position: absolute;
  z-index: 55;
  inset-block-start: 0;
  inset-inline-end: calc(var(--cx) - var(--bw) * 0.4);
  inline-size: calc(var(--bw) * 0.8);
  block-size: auto;
  filter: drop-shadow(2px 3px 2px rgba(6, 3, 0, 0.4));
  pointer-events: none;
}

.wheel {
  transform-origin: 15px 46px;
  transform: rotate(var(--spin));
}

/* ---- Pull cord ---- */

.cord {
  position: absolute;
  z-index: 60;
  inset-block-start: calc(var(--bw) * 1.477);
  inset-block-end: 3%;
  inset-inline-end: calc(var(--cx) - var(--cordw) / 2);
  inline-size: var(--cordw);
  display: flex;
  flex-direction: column;
  align-items: center;
  transform-origin: 50% 0;
  transform: rotate(var(--sway));
  filter: drop-shadow(2px 4px 3px rgba(5, 2, 0, 0.35));
  touch-action: none;
  cursor: grab;
  -webkit-tap-highlight-color: transparent;
}

.cord:active {
  cursor: grabbing;
}

.cordLine {
  position: relative;
  flex: none;
  inline-size: clamp(2px, 0.28cqi, 3px);
  block-size: calc(14% + var(--ring));
  margin-block-end: -2px;
  border-radius: 2px;
  background:
    repeating-linear-gradient(-60deg, rgba(60, 42, 16, 0.4) 0 1px, transparent 1px 3px),
    #cdb88c;
}

.cordHandle {
  position: relative;
  flex: none;
  inline-size: var(--rs);
  aspect-ratio: 1;
  border-radius: 50%;
  outline: none;
  z-index: 2;
}

.ringSvg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
}

.cordHandle:focus-visible {
  box-shadow:
    0 0 0 3px var(--pc-wall),
    0 0 0 6px var(--pc-brass-hi);
}

.drop {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-block-start: -5px;
}

.acorn {
  display: block;
  inline-size: clamp(12px, 1.5cqi, 16px);
  block-size: auto;
  overflow: visible;
}

.tagSwing {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-block-start: -3px;
  transform-origin: 50% 0;
  transform: rotate(var(--tag));
}

.thread {
  display: block;
  flex: none;
  inline-size: 1px;
  block-size: clamp(8px, 1.2cqi, 12px);
  background: #cdb88c;
}

.tag {
  position: relative;
  box-sizing: border-box;
  inline-size: max-content;
  max-inline-size: min(calc(var(--cx) * 2 - 14px), 190px);
  padding: 15px 11px 9px;
  background: #efe4cb;
  color: var(--pc-ink);
  font-family: var(--pc-font-ui);
  font-size: clamp(12.5px, 1.2cqi, 14px);
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: 0.02em;
  text-align: center;
  overflow-wrap: anywhere;
  clip-path: polygon(16% 0, 84% 0, 100% 18%, 100% 100%, 0 100%, 0 18%);
}

.tag::before {
  content: '';
  position: absolute;
  inset-block-start: 5px;
  inset-inline-start: calc(50% - 4px);
  inline-size: 8px;
  block-size: 8px;
  border-radius: 50%;
  background: #b8985c;
}

/* ---- Sill ---- */

.sill {
  position: relative;
  z-index: 1;
  inline-size: calc(min(100%, 960px) + clamp(22px, 5cqi, 70px));
  block-size: clamp(16px, 2.8cqi, 30px);
  margin-block-start: -2px;
  border-radius: 2px 2px 6px 6px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--pc-frame) 60%, #e8c28c 40%) 0 36%,
      color-mix(in srgb, var(--pc-frame) 70%, #000 30%) 36% 100%
    );
  box-shadow:
    inset 0 1px 0 rgba(255, 232, 196, 0.25),
    0 18px 26px -12px rgba(3, 1, 0, 0.65);
}

@container (max-width: 560px) {
  .window {
    aspect-ratio: 4 / 5;
  }
}

```
