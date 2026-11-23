Create a custom element called "Layered Depth Card". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: background image, foreground image (cutout), title, caption, hanging label, layer depth. Add other settings if they help.

```tsx
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface LayeredDepthCardProps {
  /** Back plane. Leave empty to use the painted dusk sky. */
  backgroundImage?: string;
  /** Cut-out product on a transparent background. Leave empty to use the painted hot-air balloon. */
  foregroundImage?: string;
  foregroundAlt?: string;
  title?: string;
  caption?: string;
  label?: string;
  /** How far the layers separate when the card tilts (px at the nearest layer). */
  layerDepth?: number;
}

type Mode = 'idle' | 'pointer' | 'key';
type Enter = 'ssr' | 'pre' | 'go';

const CARD_HELP = 'Move the pointer, drag, or use the arrow keys to shift the layers; Escape lets them settle.';
const REST_X = 0.3;
const REST_Y = -0.18;
const KEY_STEP = 0.5;
const KEY_HOLD_MS = 1600;

const clamp = (v: number, min = -1, max = 1) => Math.min(max, Math.max(min, v));
const n1 = (v: number) => v.toFixed(1);

/* ---------- painted paper geometry (all deterministic) ---------- */

const SKY_BANDS = [
  { fill: '#4a3a95', d: 'M-20 750 L-20 192 C 200 150 360 218 560 186 S 900 148 1220 204 L1220 750 Z' },
  { fill: '#c0507f', d: 'M-20 750 L-20 332 C 220 292 420 346 640 316 S 980 286 1220 338 L1220 750 Z' },
  { fill: '#ff7058', d: 'M-20 750 L-20 446 C 240 414 460 458 700 432 S 1000 408 1220 448 L1220 750 Z' },
  { fill: '#ffae85', d: 'M-20 750 L-20 548 C 260 520 500 560 740 536 S 1020 516 1220 550 L1220 750 Z' },
];

const STARS = [
  [70, 52, 2.6], [168, 108, 1.8], [262, 40, 2.2], [372, 92, 1.6], [470, 36, 2.8], [560, 118, 1.6],
  [650, 60, 2], [742, 28, 1.8], [850, 96, 2.6], [948, 44, 1.8], [1040, 112, 2.2], [1122, 64, 2.8], [1176, 132, 1.6],
];

const FAR_RIDGE =
  'M-20 750 L-20 285 C 130 240 250 270 380 300 S 600 395 760 410 S 1000 380 1100 340 S 1190 320 1220 330 L1220 750 Z';
const MID_RIDGE =
  'M-20 750 L-20 345 C 110 318 250 330 380 372 S 580 440 740 470 S 960 470 1080 440 S 1180 420 1220 428 L1220 750 Z';
const NEAR_RIDGE =
  'M-20 750 L-20 585 C 120 560 300 575 480 615 S 800 655 960 630 S 1140 590 1220 600 L1220 750 Z';

const HOUSES: [number, number, number, number][] = [
  [786, 476, 34, 24], [834, 476, 26, 19], [880, 474, 40, 27], [936, 472, 28, 21], [984, 467, 34, 25], [1040, 454, 26, 21],
];

function pine(x: number, base: number, h: number, w: number) {
  const t = (f: number) => base - h * f;
  const p = (dx: number, y: number) => `${n1(x + dx)} ${n1(y)}`;
  return [
    `M${p(0, t(1))}`,
    `L${p(w * 0.2, t(0.64))} L${p(w * 0.11, t(0.64))}`,
    `L${p(w * 0.32, t(0.36))} L${p(w * 0.18, t(0.36))}`,
    `L${p(w * 0.5, base)} L${p(-w * 0.5, base)}`,
    `L${p(-w * 0.18, t(0.36))} L${p(-w * 0.32, t(0.36))}`,
    `L${p(-w * 0.11, t(0.64))} L${p(-w * 0.2, t(0.64))} Z`,
  ].join(' ');
}

const NEAR_PINES: [number, number, number, number][] = [
  [70, 596, 300, 84], [120, 592, 205, 58],
  [268, 586, 34, 22], [312, 590, 46, 28], [356, 596, 30, 20], [548, 628, 40, 24], [594, 640, 52, 28],
  [990, 636, 110, 48], [1058, 622, 180, 62], [1136, 606, 300, 90],
];

function house([x, y, w, h]: [number, number, number, number]) {
  return `M${x} ${y} V${y - h} L${n1(x + w / 2)} ${n1(y - h - w * 0.34)} L${x + w} ${y - h} V${y} Z`;
}

/** Lens-shaped gore, centred on x=180, from the crown (y=20) to the skirt (y=372). */
function lens(w: number) {
  const r = (v: number) => n1(180 + v);
  return (
    `M180 20 C ${r(w * 1.35)} 20 ${r(w * 1.28)} 190 ${r(w * 0.22)} 372 L${r(-w * 0.22)} 372 ` +
    `C ${r(-w * 1.28)} 190 ${r(-w * 1.35)} 20 180 20 Z`
  );
}

const GORES = [
  { w: 150, fill: '#24216b' },
  { w: 116, fill: '#ff6f5a' },
  { w: 82, fill: '#ffe3cc' },
  { w: 48, fill: '#ff6f5a' },
  { w: 18, fill: '#24216b' },
];

const BUNTING = (() => {
  let d = 'M10 236 H350 V258';
  for (let k = 0; k < 17; k++) d += ` L${350 - k * 20 - 10} 282 L${350 - (k + 1) * 20} 258`;
  return `${d} Z`;
})();

const VALANCE = (() => {
  const scallops = (drop: number) => {
    let d = `M0 -20 H1200 V${30 + drop}`;
    for (let i = 0; i < 20; i++) d += ` Q${1200 - i * 60 - 30} ${62 + drop} ${1200 - (i + 1) * 60} ${30 + drop}`;
    return `${d} Z`;
  };
  return { trim: scallops(10), main: scallops(0) };
})();

const CLOUDS: { cx: number; cy: number; r: number }[][] = [
  [{ cx: 70, cy: 62, r: 30 }, { cx: 112, cy: 46, r: 38 }, { cx: 160, cy: 58, r: 32 }, { cx: 200, cy: 66, r: 22 }],
  [{ cx: 54, cy: 60, r: 24 }, { cx: 96, cy: 44, r: 34 }, { cx: 142, cy: 62, r: 24 }],
  [{ cx: 60, cy: 64, r: 28 }, { cx: 104, cy: 50, r: 36 }, { cx: 150, cy: 56, r: 30 }, { cx: 190, cy: 68, r: 20 }],
];

const SUN_RINGS = [
  { r: 258, fill: '#ff9d7f' },
  { r: 196, fill: '#ffb995' },
  { r: 134, fill: '#ffd3b2' },
  { r: 76, fill: '#ffecd6' },
];

function titleSize(title: string) {
  const len = title.trim().length;
  if (len <= 20) return styles.sizeL;
  if (len <= 34) return styles.sizeM;
  if (len <= 56) return styles.sizeS;
  return styles.sizeXs;
}

/* ---------- component ---------- */

export default function LayeredDepthCard({
  backgroundImage = '',
  foregroundImage = '',
  foregroundAlt = 'Paper-cut hot-air balloon',
  title = 'Dusk Balloon Fair',
  caption = 'Sat 14 June, Harbour Meadow, from 5 pm',
  label = 'Free entry',
  layerDepth = 18,
}: LayeredDepthCardProps) {
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [enter, setEnter] = useState<Enter>('ssr');
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const titleId = `${uid}-title`;
  const f = { sh: `${uid}-sh`, shs: `${uid}-shs`, clip: `${uid}-clip`, flame: `${uid}-flame` };

  const cardRef = useRef<HTMLElement>(null);
  const seen = useRef(false);
  const keyTimer = useRef(0);
  const aim = useRef({ mode: 'idle' as Mode, nx: REST_X, ny: REST_Y, since: 0 });
  const rig = useRef({ nx: REST_X, ny: REST_Y, vx: 0, vy: 0, hero: 0, vh: 0, tag: 0, vt: 0 });

  const depth = clamp(layerDepth, 0, 40);
  const tilt = (depth / 18) * 3.6;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setReduced(mq.matches);
      if (!mq.matches) setEnter((p) => (p === 'ssr' ? (seen.current ? 'go' : 'pre') : p));
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    if (typeof IntersectionObserver === 'undefined') {
      seen.current = true;
      setEnter((p) => (p === 'pre' ? 'go' : p));
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) {
          seen.current = true;
          setEnter((p) => (p === 'pre' ? 'go' : p));
        }
      },
      { threshold: 0.12 },
    );
    io.observe(card);
    return () => io.disconnect();
  }, []);

  useEffect(() => () => window.clearTimeout(keyTimer.current), []);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    if (reduced) {
      ['--nx', '--ny', '--sway', '--tagsway', '--lx'].forEach((k) => card.style.removeProperty(k));
      return;
    }
    if (!inView) return;
    aim.current.since = performance.now();
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const a = aim.current;
      const s = now / 1000;
      let tx = a.nx;
      let ty = a.ny;
      if (a.mode === 'idle') {
        const ease = Math.min(1, (now - a.since) / 2200);
        tx = REST_X * (1 - ease) + (0.16 + Math.sin(s * 0.5) * 0.58) * ease;
        ty = REST_Y * (1 - ease) + (-0.08 + Math.sin(s * 0.37 + 0.9) * 0.36) * ease;
      }
      const m = rig.current;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let n = 0; n < steps; n++) {
        m.vx += (170 * (tx - m.nx) - 17 * m.vx) * h;
        m.vy += (170 * (ty - m.ny) - 17 * m.vy) * h;
        m.nx += m.vx * h;
        m.ny += m.vy * h;
        // pendulums lag behind the card: the balloon swings slowly, the tag overshoots
        m.vh += (62 * (m.vx * 3.2 - m.hero) - 5.4 * m.vh) * h;
        m.hero += m.vh * h;
        m.vt += (54 * (m.vx * 5.4 - m.tag) - 3.4 * m.vt) * h;
        m.tag += m.vt * h;
      }
      card.style.setProperty('--nx', m.nx.toFixed(3));
      card.style.setProperty('--ny', m.ny.toFixed(3));
      card.style.setProperty('--sway', clamp(m.hero, -9, 9).toFixed(2));
      card.style.setProperty('--tagsway', clamp(m.tag, -22, 22).toFixed(2));
      card.style.setProperty('--lx', (m.nx * 8).toFixed(2));
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [reduced, inView]);

  const release = () => {
    aim.current.mode = 'idle';
    aim.current.since = performance.now();
  };

  const aimAt = (e: PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    aim.current.mode = 'pointer';
    aim.current.nx = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1);
    aim.current.ny = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1);
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (reduced || e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    aimAt(e);
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (reduced) return;
    if (e.pointerType === 'mouse' || e.currentTarget.hasPointerCapture(e.pointerId)) aimAt(e);
  };

  const onPointerEnd = (e: PointerEvent<HTMLElement>) => {
    if (e.type === 'pointerleave' && e.pointerType !== 'mouse') return;
    release();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, -KEY_STEP],
      ArrowDown: [0, KEY_STEP],
    };
    if (e.key === 'Escape' || e.key === 'Home') {
      release();
      return;
    }
    const move = moves[e.key];
    if (!move || reduced) return;
    e.preventDefault();
    const a = aim.current;
    const from = a.mode === 'key' ? a : rig.current;
    a.nx = clamp(from.nx + move[0], -0.9, 0.9);
    a.ny = clamp(from.ny + move[1], -0.9, 0.9);
    a.mode = 'key';
    window.clearTimeout(keyTimer.current);
    keyTimer.current = window.setTimeout(release, KEY_HOLD_MS);
  };

  const cardStyle = {
    '--ld': depth,
    '--tilt': tilt.toFixed(2),
    '--play': reduced || !inView ? 'paused' : 'running',
  } as CSSProperties;

  const pc = [styles.plane, enter === 'pre' ? styles.pre : '', enter === 'go' ? styles.go : ''].filter(Boolean).join(' ');
  const bc = `${pc} ${styles.bleed}`;
  const P = (z: number, d: number, from = '0%', fx = '0%') =>
    ({ '--z': z, '--d': `${d}ms`, '--from': from, '--fx': fx }) as CSSProperties;
  const sh = `url(#${f.sh})`;
  const shs = `url(#${f.shs})`;
  const hasBg = Boolean(backgroundImage);

  return (
    <div className={styles.root}>
      <svg className={styles.defs} width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id={f.sh} filterUnits="userSpaceOnUse" x="-200" y="-200" width="1600" height="1200" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="-2" stdDeviation="1.4" floodColor="#0d0b33" floodOpacity="0.4" result="tight" />
            <feDropShadow in="tight" dx="0" dy="-10" stdDeviation="7" floodColor="#0d0b33" floodOpacity="0.34" />
          </filter>
          <filter id={f.shs} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="-1.2" stdDeviation="0.9" floodColor="#0d0b33" floodOpacity="0.42" result="tight" />
            <feDropShadow in="tight" dx="0" dy="-5" stdDeviation="3.4" floodColor="#0d0b33" floodOpacity="0.3" />
          </filter>
        </defs>
      </svg>

      <div className={styles.stage}>
        <article
          ref={cardRef}
          className={styles.card}
          style={cardStyle}
          tabIndex={0}
          aria-labelledby={titleId}
          aria-description={CARD_HELP}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={onPointerEnd}
          onKeyDown={onKeyDown}
          onBlur={release}
        >
          {/* 1 sky */}
          <div className={bc} style={P(-1, 0)} aria-hidden="true">
            {hasBg ? (
              <>
                <img className={styles.bgImg} src={backgroundImage} alt="" draggable={false} />
                <span className={styles.bgTint} />
              </>
            ) : (
              <svg className={styles.svg} viewBox="0 0 1200 750" preserveAspectRatio="xMidYMax slice">
                <rect x="-20" y="-20" width="1240" height="790" fill="#26256f" />
                {STARS.map(([x, y, r], i) => (
                  <circle key={i} cx={x} cy={y} r={r} fill="#fff1e0" opacity="0.85" />
                ))}
                {SKY_BANDS.map((b, i) => (
                  <path key={i} d={b.d} fill={b.fill} filter={sh} />
                ))}
              </svg>
            )}
          </div>

          {/* 2 setting sun */}
          {!hasBg && (
            <div className={pc} style={P(-0.82, 140, '18%')} aria-hidden="true">
              <svg className={styles.sun} viewBox="0 0 520 520">
                {SUN_RINGS.map((s) => (
                  <circle key={s.r} cx="260" cy="260" r={s.r} fill={s.fill} filter={shs} />
                ))}
              </svg>
            </div>
          )}

          {/* 3 paper clouds */}
          <div className={pc} style={P(-0.62, 240)} aria-hidden="true">
            {CLOUDS.map((c, i) => (
              <div key={i} className={`${styles.cloud} ${styles[`cloud${i}` as 'cloud0']}`}>
                <svg className={styles.svg} viewBox="0 0 260 100">
                  <g filter={shs} fill={i === 1 ? '#ffc4b8' : '#ffe3cc'}>
                    {c.map((b, j) => (
                      <circle key={j} cx={b.cx} cy={b.cy} r={b.r} />
                    ))}
                    <rect x={c[0].cx - c[0].r} y="62" width={c[c.length - 1].cx + c[c.length - 1].r - (c[0].cx - c[0].r)} height="30" rx="15" />
                  </g>
                </svg>
              </div>
            ))}
          </div>

          {/* 4 far ridge */}
          <div className={bc} style={P(-0.45, 300, '12%')} aria-hidden="true">
            <svg className={styles.svg} viewBox="0 0 1200 750" preserveAspectRatio="xMidYMax slice">
              <path d={FAR_RIDGE} fill="#b8558c" filter={sh} />
              <path d={FAR_RIDGE} fill="none" stroke="#ffb7a8" strokeOpacity="0.45" strokeWidth="1.6" />
            </svg>
          </div>

          {/* 5 mid ridge with the village */}
          <div className={bc} style={P(-0.2, 400, '14%')} aria-hidden="true">
            <svg className={styles.svg} viewBox="0 0 1200 750" preserveAspectRatio="xMidYMax slice">
              <path d={MID_RIDGE} fill="#4f3687" filter={sh} />
              <path d={MID_RIDGE} fill="none" stroke="#ff9d8c" strokeOpacity="0.4" strokeWidth="1.6" />
              {HOUSES.map((hs, i) => (
                <g key={i}>
                  <path d={house(hs)} fill="#2a1f66" filter={shs} />
                  <rect x={hs[0] + hs[2] * 0.3} y={hs[1] - hs[3] * 0.62} width="5" height="6" rx="1" fill="#ffd9a8" />
                  {hs[2] > 30 && <rect x={hs[0] + hs[2] * 0.62} y={hs[1] - hs[3] * 0.62} width="5" height="6" rx="1" fill="#ffd9a8" />}
                </g>
              ))}
            </svg>
          </div>

          {/* 6 hero */}
          <div className={pc} style={P(0.05, 640, '26%')}>
            <div className={styles.hero}>
              <div className={styles.sway}>
                <div className={styles.bob}>
                  {foregroundImage ? (
                    <img className={styles.heroImg} src={foregroundImage} alt={foregroundAlt} draggable={false} />
                  ) : (
                    <svg className={styles.svg} viewBox="0 0 360 560" aria-hidden="true">
                      <defs>
                        <clipPath id={f.clip}>
                          <path d={lens(150)} />
                        </clipPath>
                        <radialGradient id={f.flame} cx="50%" cy="62%" r="55%">
                          <stop offset="0" stopColor="#fff1e0" />
                          <stop offset="0.45" stopColor="#ffb066" />
                          <stop offset="1" stopColor="#ff6f5a" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      {GORES.map((g) => (
                        <path key={g.w} d={lens(g.w)} fill={g.fill} filter={shs} />
                      ))}
                      {GORES.slice(0, 4).map((g) => (
                        <path key={`s${g.w}`} d={lens(g.w - 5)} fill="none" stroke="#fff1e0" strokeOpacity="0.38" strokeWidth="1.2" strokeDasharray="3 5" />
                      ))}
                      <g clipPath={`url(#${f.clip})`}>
                        <path d={BUNTING} fill="#24216b" filter={shs} />
                        {Array.from({ length: 17 }, (_, k) => (
                          <circle key={k} cx={20 + k * 20} cy="247" r="3.2" fill="#ffe3cc" />
                        ))}
                      </g>
                      <path d="M147 372 L213 372 L205 398 L155 398 Z" fill="#24216b" filter={shs} />
                      <g stroke="#fff1e0" strokeOpacity="0.8" strokeWidth="1.6" strokeLinecap="round">
                        <line x1="150" y1="390" x2="142" y2="470" />
                        <line x1="168" y1="396" x2="160" y2="470" />
                        <line x1="192" y1="396" x2="200" y2="470" />
                        <line x1="210" y1="390" x2="218" y2="470" />
                      </g>
                      <ellipse className={styles.flame} cx="180" cy="408" rx="15" ry="24" fill={`url(#${f.flame})`} />
                      <g filter={shs}>
                        <path d="M140 478 H220 L214 534 Q213 541 206 541 H154 Q147 541 146 534 Z" fill="#d4524f" />
                      </g>
                      <g stroke="#7a2438" strokeOpacity="0.32" strokeWidth="1.4">
                        {[490, 500, 510, 520, 530].map((y) => (
                          <line key={y} x1="144" y1={y} x2="216" y2={y} />
                        ))}
                        {[156, 168, 180, 192, 204].map((x) => (
                          <line key={x} x1={x} y1="480" x2={x} y2="540" />
                        ))}
                      </g>
                      <rect x="134" y="466" width="92" height="14" rx="4" fill="#ffe3cc" filter={shs} />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 7 title, tucked between the mid and near planes */}
          <div className={pc} style={P(0.38, 780, '18%')}>
            <h3 id={titleId} className={`${styles.title} ${titleSize(title)}`}>
              {title}
            </h3>
          </div>

          {/* 8 near ridge */}
          <div className={bc} style={P(0.72, 520, '14%')} aria-hidden="true">
            <svg className={styles.svg} viewBox="0 0 1200 750" preserveAspectRatio="xMidYMax slice">
              <g filter={sh}>
                <path d={NEAR_RIDGE} fill="#1b1951" />
                {NEAR_PINES.map(([x, b, h, w]) => (
                  <path key={x} d={pine(x, b, h, w)} fill="#1b1951" />
                ))}
              </g>
              <path d={NEAR_RIDGE} fill="none" stroke="#ff8f80" strokeOpacity="0.35" strokeWidth="1.6" />
            </svg>
          </div>

          {/* 9 caption */}
          {caption && (
            <div className={pc} style={P(0.86, 1100, '8%')}>
              <p className={`${styles.caption} ${caption.trim().length > 90 ? styles.captionLong : ''}`}>{caption}</p>
            </div>
          )}

          {/* 10 hanging label */}
          {label && (
            <div className={pc} style={P(1.15, 900, '-6%')}>
              <div className={styles.tagAnchor}>
                <div className={`${styles.tagSwing} ${enter === 'go' ? styles.tagGo : ''}`}>
                  <span className={styles.string} />
                  <span className={styles.tag}>
                    <span className={styles.hole} />
                    {label}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 11 proscenium: drapes and valance, closest to the viewer */}
          <div className={pc} style={P(1.65, 1000, '0%', '-12%')} aria-hidden="true">
            <svg className={styles.drapeL} viewBox="0 0 100 750" preserveAspectRatio="none">
              <path d="M0 0 H66 C84 120 44 260 66 380 S84 640 58 750 H0 Z" fill="#15133f" filter={shs} />
              <path d="M30 0 C46 140 18 300 34 440 S46 640 30 750" fill="none" stroke="#2c2a78" strokeWidth="2" opacity="0.7" />
              <path d="M12 0 C22 160 4 320 14 470 S22 660 12 750" fill="none" stroke="#2c2a78" strokeWidth="1.6" opacity="0.5" />
            </svg>
          </div>
          <div className={pc} style={P(1.65, 1000, '0%', '12%')} aria-hidden="true">
            <svg className={styles.drapeR} viewBox="0 0 100 750" preserveAspectRatio="none">
              <path d="M0 0 H66 C84 120 44 260 66 380 S84 640 58 750 H0 Z" fill="#15133f" filter={shs} />
              <path d="M30 0 C46 140 18 300 34 440 S46 640 30 750" fill="none" stroke="#2c2a78" strokeWidth="2" opacity="0.7" />
              <path d="M12 0 C22 160 4 320 14 470 S22 660 12 750" fill="none" stroke="#2c2a78" strokeWidth="1.6" opacity="0.5" />
            </svg>
          </div>
          <div className={pc} style={P(1.65, 1060, '-14%')} aria-hidden="true">
            <svg className={styles.valance} viewBox="0 -20 1200 80">
              <path d={VALANCE.trim} fill="#ff6f5a" filter={shs} />
              <path d={VALANCE.main} fill="#15133f" filter={shs} />
              {Array.from({ length: 20 }, (_, i) => (
                <circle key={i} cx={1170 - i * 60} cy="43" r="3.2" fill="#ffe3cc" />
              ))}
            </svg>
          </div>

          <span className={styles.light} aria-hidden="true" />
          <span className={styles.grain} aria-hidden="true" />
        </article>
      </div>
    </div>
  );
}
```

```css
@font-face {
  font-family: 'Gabarito';
  src: url('./fonts/gabarito-latin-wght-normal.woff2') format('woff2');
  font-weight: 400 900;
  font-style: normal;
  font-display: swap;
}

.root {
  --ld-ink: #15133f;
  --ld-night: #0f0d33;
  --ld-indigo: #26256f;
  --ld-coral: #ff6f5a;
  --ld-cream: #fff1e0;
  --ld-cream-soft: #ffd9c2;
  --ld-font: 'Gabarito', 'Avenir Next', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --ld-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding: 24px;
  border-radius: 36px;
  background:
    radial-gradient(70% 60% at 72% 104%, rgba(255, 111, 90, 0.2), transparent 70%),
    var(--ld-night);
  color: var(--ld-cream);
  font-family: var(--ld-font);
}

.root::selection {
  background: var(--ld-coral);
  color: var(--ld-ink);
}

.defs {
  position: absolute;
  inline-size: 0;
  block-size: 0;
  overflow: hidden;
  pointer-events: none;
}

.stage {
  perspective: 1500px;
}

.card {
  --nx: 0.3;
  --ny: -0.18;
  --sway: 0;
  --tagsway: 0;
  --lx: 2.4;
  --ld: 18;
  --tilt: 3.6;
  --play: running;

  position: relative;
  isolation: isolate;
  overflow: clip;
  box-sizing: border-box;
  inline-size: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 26px;
  background: var(--ld-indigo);
  color: var(--ld-cream);
  touch-action: pan-y;
  outline: none;
  transform: rotateX(calc(var(--ny) * var(--tilt) * -1deg)) rotateY(calc(var(--nx) * var(--tilt) * 1deg));
  box-shadow:
    0 0 0 1px rgba(255, 190, 170, 0.12),
    0 2px 4px rgba(5, 4, 24, 0.5),
    0 28px 50px -14px rgba(5, 4, 24, 0.75);
}

.card:focus-visible {
  outline: 2px solid var(--ld-cream);
  outline-offset: 5px;
}

/* ---------- planes ---------- */

.plane {
  position: absolute;
  inset: 0;
  pointer-events: none;
  will-change: transform;
  transform: translate3d(calc(var(--nx) * var(--z) * var(--ld) * -1px), calc(var(--ny) * var(--z) * var(--ld) * -0.6px), 0);
}

.bleed {
  inset-block: -6%;
  inset-inline: -6%;
}

.pre {
  opacity: 0;
}

.go {
  animation: rise 1150ms var(--d, 0ms) cubic-bezier(0.2, 0.9, 0.25, 1) both;
}

@keyframes rise {
  from {
    translate: var(--fx, 0) var(--from, 0);
    opacity: 0;
  }
  to {
    translate: 0 0;
    opacity: 1;
  }
}

.svg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
}

.bgImg {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  filter: saturate(0.85) contrast(1.05);
}

.bgTint {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(38, 37, 111, 0.82) 0%, rgba(192, 80, 127, 0.5) 55%, rgba(255, 112, 88, 0.45) 100%);
  mix-blend-mode: multiply;
}

.sun {
  position: absolute;
  inset-inline-start: 42%;
  inset-block-start: 7%;
  inline-size: 46%;
  block-size: auto;
  aspect-ratio: 1;
  overflow: visible;
}

.cloud {
  position: absolute;
  aspect-ratio: 260 / 100;
  animation: drift 46s ease-in-out infinite alternate;
  animation-play-state: var(--play, running);
}

.cloud0 {
  inset-inline-start: 29%;
  inset-block-start: 19%;
  inline-size: 19%;
}

.cloud1 {
  inset-inline-start: 74%;
  inset-block-start: 9%;
  inline-size: 17%;
  animation-duration: 58s;
  animation-direction: alternate-reverse;
}

.cloud2 {
  inset-inline-start: 3%;
  inset-block-start: 33%;
  inline-size: 14%;
  animation-duration: 70s;
}

@keyframes drift {
  from {
    transform: translateX(-9%);
  }
  to {
    transform: translateX(11%);
  }
}

/* ---------- hero ---------- */

.hero {
  position: absolute;
  inset-inline-start: 58%;
  inset-block-start: 5%;
  block-size: 72%;
  aspect-ratio: 360 / 560;
}

.sway {
  inline-size: 100%;
  block-size: 100%;
  transform-origin: 50% 5%;
  transform: rotate(calc(var(--sway) * 1deg));
}

.bob {
  inline-size: 100%;
  block-size: 100%;
  animation: bob 6.5s ease-in-out infinite alternate;
  animation-play-state: var(--play, running);
}

@keyframes bob {
  from {
    transform: translateY(-1.4%);
  }
  to {
    transform: translateY(1.8%);
  }
}

.heroImg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 2px rgba(13, 11, 51, 0.45)) drop-shadow(0 18px 22px rgba(13, 11, 51, 0.45));
}

.flame {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: flicker 1.7s ease-in-out infinite alternate;
  animation-play-state: var(--play, running);
}

@keyframes flicker {
  0% {
    opacity: 0.82;
    transform: scale(1, 0.92);
  }
  45% {
    opacity: 1;
    transform: scale(1.06, 1.1);
  }
  100% {
    opacity: 0.88;
    transform: scale(0.96, 0.98);
  }
}

/* ---------- type ---------- */

.title {
  position: absolute;
  inset-inline-start: 9.5%;
  /* the box floor sits above the highest near-hill tip (about 75% of the card), so the title grows upward and is never covered */
  inset-block-end: 27%;
  box-sizing: border-box;
  inline-size: 42%;
  margin: 0;
  padding-block: 0.22em 0.16em;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
  overflow: hidden;
  overflow-wrap: anywhere;
  text-wrap: balance;
  color: var(--ld-cream);
  font-family: var(--ld-font);
  font-weight: 900;
  line-height: 0.92;
  letter-spacing: -0.035em;
  text-shadow: 0 -2px 3px rgba(13, 11, 51, 0.4), 0 -10px 22px rgba(13, 11, 51, 0.5);
}

.sizeL {
  font-size: clamp(36px, 8.4cqi, 124px);
}

.sizeM {
  font-size: clamp(30px, 6.4cqi, 96px);
}

.sizeS {
  font-size: clamp(26px, 4.8cqi, 72px);
}

.sizeXs {
  font-size: clamp(22px, 3.7cqi, 56px);
  line-height: 0.98;
}

.caption {
  position: absolute;
  inset-inline-start: 9.5%;
  inset-block-end: 6.4%;
  box-sizing: border-box;
  inline-size: 56%;
  margin: 0;
  color: var(--ld-cream-soft);
  font-family: var(--ld-font);
  font-weight: 500;
  font-size: clamp(14px, 1.45cqi, 22px);
  line-height: 1.3;
  letter-spacing: 0.005em;
  text-wrap: balance;
  overflow-wrap: anywhere;
  text-shadow: 0 -1px 2px rgba(13, 11, 51, 0.5);
}

/* ---------- hanging label ---------- */

.tagAnchor {
  position: absolute;
  inset-inline-start: 13%;
  inset-block-start: 3%;
  inline-size: 0;
}

.tagSwing {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  display: grid;
  justify-items: center;
  inline-size: max-content;
  transform: translateX(-50%) rotate(calc(var(--tagsway) * 1deg));
  transform-origin: 50% 0;
  filter: drop-shadow(0 -1px 1px rgba(13, 11, 51, 0.4)) drop-shadow(0 10px 12px rgba(13, 11, 51, 0.4));
}

.tagGo {
  animation: tag-drop 1900ms 1150ms cubic-bezier(0.3, 0.7, 0.4, 1) both;
}

@keyframes tag-drop {
  0% {
    rotate: 30deg;
  }
  16% {
    rotate: -19deg;
  }
  32% {
    rotate: 12deg;
  }
  48% {
    rotate: -6.5deg;
  }
  64% {
    rotate: 3.2deg;
  }
  80% {
    rotate: -1.3deg;
  }
  100% {
    rotate: 0deg;
  }
}

.string {
  display: block;
  inline-size: 1.5px;
  block-size: clamp(36px, 9cqi, 112px);
  background: rgba(255, 241, 224, 0.75);
}

.tag {
  position: relative;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
  overflow: hidden;
  box-sizing: border-box;
  /* the string hangs at 13% of the card: keep half the tag width inside that, with room for the swing and parallax */
  max-inline-size: 17cqi;
  padding-block: 1.3em 0.7em;
  padding-inline: 1.1em;
  background: var(--ld-cream);
  color: var(--ld-ink);
  font-family: var(--ld-font);
  font-weight: 700;
  font-size: clamp(13px, 1.5cqi, 22px);
  line-height: 1.15;
  letter-spacing: 0.005em;
  text-align: center;
  text-wrap: balance;
  overflow-wrap: anywhere;
  clip-path: polygon(14% 0, 86% 0, 100% 14%, 100% 100%, 0 100%, 0 14%);
}

.hole {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 0.5em;
  inline-size: 0.5em;
  block-size: 0.5em;
  margin-inline-start: -0.25em;
  border-radius: 50%;
  background: var(--ld-night);
  box-shadow: 0 0 0 1.5px rgba(255, 190, 170, 0.5);
}

/* ---------- proscenium ---------- */

.drapeL,
.drapeR {
  position: absolute;
  inset-block: -2%;
  inline-size: 14%;
  block-size: 104%;
  overflow: visible;
}

.drapeL {
  inset-inline-start: -6%;
}

.drapeR {
  inset-inline-end: -6%;
  transform: scaleX(-1);
}

.valance {
  position: absolute;
  inset-inline: -6%;
  inset-block-start: -2%;
  inline-size: 112%;
  block-size: auto;
  aspect-ratio: 1200 / 80;
  overflow: visible;
}

/* ---------- light and print texture ---------- */

.light {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(48% 62% at calc(66% + var(--lx) * 1%) 56%, rgba(255, 140, 100, 0.2), transparent 72%),
    radial-gradient(130% 100% at 50% 50%, transparent 52%, rgba(10, 9, 40, 0.5) 100%);
}

.grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: var(--ld-noise);
  background-size: 180px 180px;
  opacity: 0.5;
  mix-blend-mode: overlay;
}

/* ---------- narrow containers ---------- */

@container (max-width: 640px) {
  .root {
    padding: 10px;
    border-radius: 28px;
  }

  .card {
    aspect-ratio: 4 / 5;
    border-radius: 20px;
  }

  .sun {
    inset-inline-start: 18%;
    inset-block-start: 14%;
    inline-size: 84%;
  }

  .cloud0 {
    inset-inline-start: 2%;
    inset-block-start: 16%;
    inline-size: 36%;
  }

  .cloud1 {
    inset-inline-start: 70%;
    inset-block-start: 10%;
    inline-size: 28%;
  }

  .cloud2 {
    inset-inline-start: 26%;
    inset-block-start: 31%;
    inline-size: 26%;
  }

  .hero {
    inset-inline-start: 47%;
    inset-block-start: 6%;
    block-size: 46%;
  }

  .title {
    inset-inline-start: 8%;
    inset-block-end: 23%;
    inline-size: 84%;
  }

  .sizeL {
    font-size: clamp(34px, 15cqi, 80px);
  }

  .sizeM {
    font-size: clamp(28px, 11cqi, 64px);
  }

  .sizeS {
    font-size: clamp(24px, 8.4cqi, 48px);
  }

  .sizeXs {
    font-size: clamp(20px, 6.6cqi, 40px);
  }

  .caption {
    inset-inline-start: 8%;
    inset-block-end: 6%;
    inline-size: 82%;
    font-size: 14px;
  }

  /* long captions wrap to 4+ lines at this width: tighten and drop them so they stay clear of the title above */
  .captionLong {
    inset-block-end: 2%;
    font-size: 13px;
    line-height: 1.22;
  }

  .tagAnchor {
    inset-inline-start: 30%;
    inset-block-start: 4%;
  }

  .string {
    block-size: 34px;
  }

  .tag {
    /* string at 30%: half width stays inside it with room for swing and parallax */
    max-inline-size: 44cqi;
    font-size: 13px;
  }

  .drapeL,
  .drapeR {
    inline-size: 20%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .go,
  .tagGo,
  .bob,
  .cloud,
  .flame {
    animation: none;
  }

  .pre {
    opacity: 1;
  }
}
```
