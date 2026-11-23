Create a custom element called "Pull Cord Reveal". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: cover image, cover image description, image underneath, underneath image description, cord label, offer title, offer note, shade colour. Add other settings if they help.

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
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

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const SHADE_HELP =
  'Drag the cord down, or use the down and up arrow keys, to lower and raise the shade.';

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
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);

  const rootRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const cordRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const reducedRef = useRef(false);

  const motion = useRef({ t: 0, v: 0 });
  const stop = useRef(0);
  const drag = useRef({ on: false, y0: 0, x0: 0, t0: 0, moved: 0, lastAt: 0 });
  // Secondary motion: pull spring, shade lean, cord pendulum.
  const phys = useRef({
    r: 0,
    rv: 0,
    l: 0,
    lw: 0,
    c: 0,
    cw: 0,
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
    const tail = (handleRef.current?.offsetHeight ?? 0) + 10;
    sizes.current.dip = clamp(pane.offsetHeight * 0.34, 70, Math.max(70, cordH * 0.84 - tail));
    sizes.current.w = pane.offsetWidth;
  }, []);

  useEffect(() => {
    const pane = paneRef.current;
    const cord = cordRef.current;
    const handle = handleRef.current;
    if (!pane || !cord || !handle) return;
    const ro = new ResizeObserver(measure);
    ro.observe(pane);
    ro.observe(cord);
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
    set('--ring', `${(clamp(p.r, -0.06, 1.12) * sizes.current.dip).toFixed(1)}px`);
    let idle = 0;
    let idleLean = 0;
    if (!reducedRef.current) {
      const ramp = Math.min(1, (now - (p.mountedAt || now)) / 4000);
      idle = 0.7 * Math.sin(now / 1100) * ramp;
      idleLean = 0.1 * Math.sin(now / 1700) * ramp;
    }
    set('--sway', `${(clamp(p.c, -22, 22) + idle).toFixed(2)}deg`);
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
        // Pull hangs on the cord: stiff while held, springy once let go.
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

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
    >
      <span className={styles.plaster} aria-hidden="true" />

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
                  aria-label={cordLabel ? `Window shade: ${cordLabel}` : 'Window shade'}
                  aria-orientation="vertical"
                  aria-description={SHADE_HELP}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={0}
                  onKeyDown={onKeyDown}
                >
                  <span className={styles.pull} aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

```css
/* Interior-product shot: slim satin frame, fabric roller shade, minimal cord */

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
  --pc-wall: #1b1c1b;
  --pc-frame: #2a2c2a;
  --pc-shade: #ddd6c7;
  --pc-ink: #23201a;
  --pc-pull: #34373a;
  --pc-font-ui: 'Hanken Grotesk', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --pc-font-display: 'Cormorant Garamond', 'Iowan Old Style', Palatino, Georgia, serif;

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  background: linear-gradient(176deg, #232524 0%, var(--pc-wall) 60%, #141514 100%);
  color: #f3eee4;
  font-family: var(--pc-font-ui);
}

.root::selection {
  background: #5a5448;
  color: #f6f1e6;
}

.plaster {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: radial-gradient(120% 90% at 50% 40%, transparent 50%, rgba(0, 0, 0, 0.35) 100%);
}

.stage {
  position: relative;
  z-index: 2;
  display: grid;
  justify-items: center;
  padding: clamp(28px, 7cqi, 72px) clamp(20px, 5cqi, 56px);
}

/* ---- Slim satin frame ---- */

.window {
  --cw: clamp(7px, 1.2cqi, 13px);
  position: relative;
  box-sizing: border-box;
  inline-size: min(100%, 960px);
  aspect-ratio: 4 / 3;
  padding: var(--cw);
  background: linear-gradient(160deg, #3a3d3a 0%, var(--pc-frame) 45%, #1f211f 100%);
  border-radius: 3px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 0 0 1px rgba(0, 0, 0, 0.55),
    0 30px 60px -28px rgba(0, 0, 0, 0.75);
  cursor: pointer;
}

.reveal {
  position: relative;
  box-sizing: border-box;
  block-size: 100%;
  border-radius: 1px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
}

.pane {
  --t: 0;
  --u: 1;
  --v: 0;
  --ring: 0px;
  --sway: 0deg;
  --lean: 0deg;
  --leanpx: 0px;

  --rmax: clamp(8px, 1.5cqi, 15px);
  --rmin: calc(var(--rmax) * 0.5);
  --rad: calc(var(--rmin) + var(--u) * (var(--rmax) - var(--rmin)));
  --ax: calc(var(--rmax) + 4px);
  --bw: clamp(30px, 5cqi, 52px);
  --cx: clamp(48px, 7cqi, 80px);
  --cordw: 32px;
  --rs: 28px;

  position: relative;
  block-size: 100%;
  overflow: clip;
  background: #120f0c;
}

/* ---- Window view ---- */

.sash {
  position: absolute;
  inset: 0;
}

.view {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #181513;
}

.viewPhoto {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  filter: saturate(0.94) brightness(0.92);
  user-select: none;
}

.viewFallback {
  position: absolute;
  inset: 0;
  background: linear-gradient(190deg, #3a3b40 0%, #403a35 50%, #211b16 100%);
}

.viewDusk {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(30, 36, 52, 0.18) 0%, transparent 45%, rgba(14, 8, 4, 0.22) 100%);
}

.viewSheen {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(112deg, transparent 20%, rgba(255, 246, 230, 0.06) 32%, transparent 44%);
}

.viewEdge {
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.45);
}

/* ---- Fabric shade ---- */

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
    linear-gradient(180deg, rgba(14, 10, 6, 0.78) 0%, rgba(14, 10, 6, 0.5) 32%, transparent 66%),
    linear-gradient(90deg, rgba(14, 10, 6, 0.32), transparent 60%);
}

.offer {
  position: absolute;
  z-index: 2;
  inset-block-start: calc(var(--bw) + clamp(10px, 2.6cqi, 32px));
  inset-inline-start: clamp(20px, 5cqi, 56px);
  inset-inline-end: calc(var(--cx) + 28px);
}

.offerTitle {
  margin: 0;
  font-family: var(--pc-font-display);
  font-size: clamp(24px, 5.2cqi, 50px);
  font-weight: 600;
  line-height: 1.04;
  letter-spacing: -0.005em;
  color: #faf5ea;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.offerRule {
  display: block;
  inline-size: clamp(28px, 3.4cqi, 44px);
  border-block-start: 1px solid rgba(250, 245, 234, 0.7);
  margin-block: clamp(10px, 1.6cqi, 16px) clamp(8px, 1.3cqi, 12px);
}

.offerNote {
  margin: 0;
  font-size: clamp(13px, 1.5cqi, 16px);
  line-height: 1.5;
  color: rgba(250, 245, 234, 0.9);
  max-inline-size: 40ch;
  overflow-wrap: anywhere;
  letter-spacing: 0.015em;
}

.shadeBlank {
  position: absolute;
  inset-block: var(--bw) 0;
  inset-inline-start: 0;
  inset-inline-end: calc(var(--cx) + 28px);
  display: grid;
  align-content: center;
  padding: 6% 6% 8%;
}

.shadeBlankTitle {
  margin: 0;
  font-family: var(--pc-font-display);
  font-size: clamp(24px, 5.4cqi, 52px);
  font-weight: 600;
  color: var(--pc-ink);
  line-height: 1.06;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.shadeBlankNote {
  margin: clamp(8px, 1.6cqi, 16px) 0 0;
  font-size: clamp(13px, 1.5cqi, 16px);
  color: color-mix(in srgb, var(--pc-ink) 82%, transparent);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

/* Fabric feel: broad, soft luminance drift (no stripes) */
.shadeWeave {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(90% 60% at 30% 20%, rgba(255, 250, 238, 0.1), transparent 70%),
    linear-gradient(90deg, rgba(0, 0, 0, 0.05), transparent 20%, rgba(255, 255, 255, 0.03) 55%, rgba(0, 0, 0, 0.06));
  mix-blend-mode: soft-light;
}

.shadeGlow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 244, 224, 0.08), transparent 55%, rgba(30, 20, 10, 0.12));
}

/* Cloth curving up into the roll */
.shadeTop {
  position: absolute;
  inset-inline: 0;
  inset-block-start: calc(var(--ax) + var(--rad) - 2px);
  block-size: clamp(18px, 4cqi, 44px);
  pointer-events: none;
  background: linear-gradient(180deg, rgba(14, 8, 3, 0.34), rgba(14, 8, 3, 0.1) 50%, transparent);
}

.shadeEdge {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(90deg, rgba(20, 12, 4, 0.16), transparent 5%, transparent 95%, rgba(20, 12, 4, 0.2));
}

/* Soft shadow the shade casts on the glass */
.hang {
  position: absolute;
  z-index: 15;
  inset-inline: 0;
  inset-block-start: calc(var(--t) * 100%);
  block-size: clamp(24px, 6cqi, 64px);
  transform-origin: 50% 0;
  transform: rotate(var(--lean));
  opacity: min(1, calc(var(--t) * 7));
  pointer-events: none;
  background: linear-gradient(180deg, rgba(6, 3, 0, 0.4), rgba(6, 3, 0, 0.12) 45%, transparent);
}

/* Weighted bottom bar */
.hem {
  position: absolute;
  z-index: 30;
  inset-inline: 0;
  inset-block-start: calc(var(--t) * 100%);
  block-size: clamp(6px, 1cqi, 10px);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--pc-shade) 88%, #fff 12%) 0%,
    color-mix(in srgb, var(--pc-shade) 78%, #2a1c0c 22%) 100%
  );
  box-shadow: 0 4px 8px -4px rgba(6, 3, 0, 0.5);
  transform: translateY(-100%) rotate(var(--lean)) scaleY(calc(1 - var(--v) * 0.1));
  pointer-events: none;
}

/* Fabric roll; thins as the shade unwinds */
.roll {
  position: absolute;
  z-index: 40;
  inset-inline: 0;
  inset-block-start: calc(var(--ax) - var(--rad));
  block-size: calc(var(--rad) * 2);
  background:
    linear-gradient(
      180deg,
      rgba(20, 12, 4, 0.42) 0%,
      rgba(20, 12, 4, 0.06) 22%,
      rgba(255, 248, 232, 0.22) 40%,
      transparent 60%,
      rgba(20, 12, 4, 0.34) 100%
    ),
    var(--pc-shade);
  box-shadow: 0 4px 8px -5px rgba(8, 4, 0, 0.5);
  pointer-events: none;
}

/* ---- Pull cord ---- */

.cord {
  position: absolute;
  z-index: 60;
  inset-block-start: var(--ax);
  inset-block-end: 3%;
  inset-inline-end: calc(var(--cx) - var(--cordw) / 2);
  inline-size: var(--cordw);
  display: flex;
  flex-direction: column;
  align-items: center;
  transform-origin: 50% 0;
  transform: rotate(var(--sway));
  filter: drop-shadow(1px 3px 2px rgba(5, 2, 0, 0.3));
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
  inline-size: 1.5px;
  block-size: calc(18% + var(--ring));
  background: linear-gradient(90deg, #f1ece0, #b9b2a2);
}

.cordHandle {
  position: relative;
  flex: none;
  inline-size: var(--rs);
  block-size: 46px;
  display: grid;
  justify-items: center;
  align-items: start;
  border-radius: 8px;
  outline: none;
  z-index: 2;
}

.pull {
  display: block;
  inline-size: 7px;
  block-size: 34px;
  border-radius: 4px;
  background: linear-gradient(90deg, #50555a 0%, var(--pc-pull) 45%, #1f2225 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.cordHandle:focus-visible {
  box-shadow:
    0 0 0 2px var(--pc-wall),
    0 0 0 4px #f3eee4;
}

@container (max-width: 560px) {
  .window {
    aspect-ratio: 4 / 5;
  }
}
```
