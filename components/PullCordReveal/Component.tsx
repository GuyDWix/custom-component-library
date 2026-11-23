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
