import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export interface WaxSealInviteProps {
  heading?: string;
  text?: string;
  dateLine?: string;
  sealInitials?: string;
  className?: string;
}

type Point = [number, number];
type Vars = Record<string, string | number>;

/* Heading scale: long headings shrink so worst-case content keeps the composition.
   Length thresholds -> font multiplier + measure in ch. */
const headingFit = (len: number) =>
  len <= 26 ? { hf: 1, hch: 16 } : len <= 60 ? { hf: 0.78, hch: 20 } : len <= 120 ? { hf: 0.6, hch: 26 } : { hf: 0.44, hch: 32 };

const round = (n: number) => Math.round(n * 10) / 10;
const lump = (t: number, at: number, width: number) => {
  const d = Math.atan2(Math.sin(t - at), Math.cos(t - at));
  return Math.exp(-((d / width) ** 2));
};

function smoothClosedPath(pts: Point[]) {
  const n = pts.length;
  const p = (i: number) => pts[(i + n) % n];
  let d = `M${round(pts[0][0])},${round(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${round(c1[0])},${round(c1[1])} ${round(c2[0])},${round(c2[1])} ${round(p2[0])},${round(p2[1])}`;
  }
  return `${d}Z`;
}

const BLOB = smoothClosedPath(
  Array.from({ length: 44 }, (_, i): Point => {
    const t = (i / 44) * Math.PI * 2;
    const r =
      84 *
        (1 +
          0.03 * Math.sin(3 * t + 0.7) +
          0.022 * Math.sin(5 * t + 2.1) +
          0.014 * Math.sin(9 * t + 1.3) +
          0.008 * Math.sin(14 * t + 0.4)) +
      8 * lump(t, 0.85, 0.2) +
      5 * lump(t, 3.9, 0.16) +
      4 * lump(t, 5.35, 0.13);
    return [100 + r * Math.cos(t), 100 + r * Math.sin(t)];
  }),
);

const CRACK_ORIGIN: Point = [106, 94];
const CRACK_ANGLES = [-96, -32, 24, 86, 146, 204];
const ray = (deg: number, r: number, jitter: number): Point => {
  const a = (deg * Math.PI) / 180;
  return [
    CRACK_ORIGIN[0] + r * Math.cos(a) - jitter * Math.sin(a),
    CRACK_ORIGIN[1] + r * Math.sin(a) + jitter * Math.cos(a),
  ];
};
const RAYS = CRACK_ANGLES.map((deg, i) => {
  const s = i % 2 ? 1 : -1;
  return [ray(deg, 24, 4 * s), ray(deg, 52, -5 * s), ray(deg, 80, 3 * s), ray(deg, 160, 0)];
});
const fmt = (pts: Point[]) => pts.map(([x, y]) => `${round(x)},${round(y)}`).join(' ');

const SHARDS = CRACK_ANGLES.map((deg, i) => {
  const next = CRACK_ANGLES[(i + 1) % CRACK_ANGLES.length] + (i === CRACK_ANGLES.length - 1 ? 360 : 0);
  const arc = [1, 2].map((k) => ray(deg + ((next - deg) * k) / 3, 160, 0));
  const nextRay = RAYS[(i + 1) % RAYS.length];
  const mid = (((deg + next) / 2) * Math.PI) / 180;
  return {
    points: fmt([CRACK_ORIGIN, ...RAYS[i], ...arc, ...[...nextRay].reverse()]),
    dx: round(Math.cos(mid) * (16 + (i % 3) * 6)),
    dy: round(Math.sin(mid) * (12 + (i % 2) * 6) - 10),
    spin: (i % 2 ? 1 : -1) * (24 + i * 9),
  };
});
const CRACKS = RAYS.map((r) => `M${CRACK_ORIGIN.join(',')} L${fmt(r.slice(0, 3)).replace(/ /g, ' L')}`).join(' ');

const BEADS = Array.from({ length: 40 }, (_, i) => {
  const a = (i / 40) * Math.PI * 2;
  return [round(100 + 56.5 * Math.cos(a)), round(100 + 56.5 * Math.sin(a))];
});

const POCKET = [
  { d: 'M0,5 Q0,0 5,3 L276,186 Q292,197 276,208 L5,381 Q0,384 0,379 Z', fill: 'left' },
  { d: 'M600,5 Q600,0 595,3 L324,186 Q308,197 324,208 L595,381 Q600,384 600,379 Z', fill: 'right' },
  { d: 'M0,384 L0,372 C90,322 196,254 282,212 Q300,203 318,212 C404,254 510,322 600,372 L600,384 Z', fill: 'bottom' },
];
const FLAP_BASE = 'M0,0 L600,0 L600,6 L433,131 L167,131 L0,6 Z';
const FLAP_TIP = 'M165.7,0 L434.3,0 L330,78 Q300,100 270,78 Z';

const sanitize = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '');

function WaxSeal({ id, initials, glint, crack }: { id: string; initials: string; glint: boolean; crack: boolean }) {
  const size = initials.length <= 1 ? 74 : initials.length === 2 ? 60 : initials.length === 3 ? 46 : 36;
  return (
    <svg className={styles.sealSvg} viewBox="-20 -20 240 240" aria-hidden="true">
      <defs>
        <path id={`${id}-blob`} d={BLOB} />
        <clipPath id={`${id}-clip`}>
          <use href={`#${id}-blob`} />
        </clipPath>
        <linearGradient id={`${id}-glint`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-wax`} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="9" result="pool" />
          <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="relief" />
          <feGaussianBlur in="relief" stdDeviation="1.2" result="reliefSoft" />
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="7" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.09 0 0 0 0" result="mottle" />
          <feComposite in="pool" in2="reliefSoft" operator="arithmetic" k1="1" result="relief2" />
          <feComposite in="relief2" in2="mottle" operator="arithmetic" k2="1" k3="1" result="height" />
          <feDiffuseLighting in="height" surfaceScale="7" diffuseConstant="1.2" lightingColor="#fff" result="diffuse">
            <feDistantLight azimuth="235" elevation="48" />
          </feDiffuseLighting>
          <feSpecularLighting in="height" surfaceScale="7" specularConstant="0.9" specularExponent="24" lightingColor="#fff" result="spec">
            <feDistantLight azimuth="235" elevation="54" />
          </feSpecularLighting>
          <feFlood className={styles.floodWax} result="wax" />
          <feComposite in="wax" in2="diffuse" operator="arithmetic" k1="1.12" result="lit" />
          <feComposite in="SourceAlpha" in2="pool" operator="arithmetic" k2="1" k3="-1" result="rim" />
          <feFlood className={styles.floodGlow} result="glowColor" />
          <feComposite in="glowColor" in2="rim" operator="in" result="glow" />
          <feComposite in="glow" in2="lit" operator="arithmetic" k2="0.9" k3="1" result="translucent" />
          <feComposite in="spec" in2="translucent" operator="arithmetic" k2="0.8" k3="1" result="shine" />
          <feComposite in="shine" in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
      <g id={`${id}-body`} filter={`url(#${id}-wax)`}>
        <use href={`#${id}-blob`} fill="#9a9a9a" />
        <circle cx="101.5" cy="98.8" r="66" fill="none" stroke="#e6e6e6" strokeWidth="13" />
        <circle cx="99" cy="101" r="64" fill="none" stroke="#cfcfcf" strokeWidth="6" />
        <circle cx="100" cy="100" r="59.5" fill="#666" />
        <circle cx="100" cy="100" r="52" fill="none" stroke="#a4a4a4" strokeWidth="2.2" />
        {BEADS.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.5" fill="#9c9c9c" />
        ))}
        <text x="100" y="101" className={styles.sealType} fontSize={size} fill="#d2d2d2" textAnchor="middle" dominantBaseline="central">
          {initials}
        </text>
      </g>
      <g clipPath={`url(#${id}-clip)`}>
        <path className={crack ? `${styles.cracks} ${styles.cracking}` : styles.cracks} d={CRACKS} pathLength={120} />
        {glint && <rect className={styles.glint} x="-20" y="-20" width="120" height="240" fill={`url(#${id}-glint)`} />}
      </g>
    </svg>
  );
}

function SealShards({ id }: { id: string }) {
  return (
    <span className={styles.shards} aria-hidden="true">
      {SHARDS.map((s, i) => (
        <span
          key={i}
          className={styles.shard}
          style={{ '--dx': s.dx, '--dy': s.dy, '--spin': s.spin, '--i': i } as CSSProperties}
        >
          <svg className={styles.sealSvg} viewBox="-20 -20 240 240">
            <clipPath id={`${id}-shard${i}`}>
              <polygon points={s.points} />
            </clipPath>
            <g clipPath={`url(#${id}-shard${i})`}>
              <use href={`#${id}-body`} />
              <g clipPath={`url(#${id}-clip)`}>
                <polygon className={styles.shardEdge} points={s.points} />
              </g>
            </g>
          </svg>
        </span>
      ))}
    </span>
  );
}

export default function WaxSealInvite({
  heading = 'Supper after dark',
  text = 'A long table under the station clock: seven courses, natural wines and a late train home. Bring someone you would write a letter to.',
  dateLine = 'Friday 21 March · 8.30 pm',
  sealInitials = 'NP',
  className,
}: WaxSealInviteProps) {
  const [open, setOpen] = useState(false);
  const [played, setPlayed] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [seen, setSeen] = useState(false);
  const uid = sanitize(useId());
  const cardId = `${uid}-card`;
  const headingId = `${uid}-heading`;

  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const envRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);

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
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setSeen(true);
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const env = envRef.current;
    const card = cardRef.current;
    if (!root || !env || !card) return;
    const measure = () => {
      const envH = env.offsetHeight;
      const top = env.offsetTop;
      const cardH = card.offsetHeight;
      const closedH = envH + 2 * top;
      const openH = Math.max(closedH, cardH + 2 * Math.max(28, top * 0.55));
      const inset = envH * 0.05;
      const sink = envH * 0.38;
      const rise = Math.min(-envH * 0.2, envH * 0.62 - (inset + cardH));
      const settledTop = (openH - cardH) / 2 - top - envH * 0.02;
      const settle = settledTop - sink - inset - rise;
      const set = (k: string, v: number) => root.style.setProperty(k, `${Math.round(v)}px`);
      set('--ws-open-h', openH);
      set('--ws-sink', sink);
      set('--ws-rise', rise);
      set('--ws-settle', settle);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    ro.observe(card);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!played || !reduced) return;
    frameRef.current?.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
  }, [open, played, reduced]);

  const toggle = useCallback(() => {
    setPlayed(true);
    setOpen((v) => !v);
  }, []);
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape' && open) toggle();
  };
  const hover = (on: boolean) => rootRef.current?.style.setProperty('--ws-h', on ? '1' : '0');

  const initials = sealInitials.trim().slice(0, 4);
  const animate = played && !reduced;
  const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

  // State classes drive a fixed keyframe timeline (see Component.module.css):
  // .open = full open choreography, .close = reverse, .staticOpen = reduced-motion end state.
  const stateClass = reduced ? (open ? styles.staticOpen : undefined) : open ? styles.open : played ? styles.close : undefined;

  const { hf, hch } = headingFit(heading.length);

  const rootStyle: Vars = {
    '--ws-o': open ? 1 : 0,
    '--ws-hf': hf,
    '--ws-hch': hch,
  };

  return (
    <div ref={rootRef} className={cx(styles.root, stateClass, className)} style={rootStyle as CSSProperties}>
      <span className={styles.lamp} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />
      <div ref={frameRef} className={styles.frame}>
        <div ref={envRef} className={styles.envelope}>
          <span className={cx(styles.layer, styles.back)} aria-hidden="true">
            <span className={styles.backLiner} />
          </span>

          <span className={cx(styles.layer, styles.flapLayer)} aria-hidden="true">
            <span className={styles.flapTug}>
              <span className={styles.flap}>
                <svg className={styles.face} viewBox="0 0 600 131" preserveAspectRatio="none">
                  <path className={styles.flapShadow} d={FLAP_BASE} filter={`url(#${uid}-soft)`} />
                  <path d={FLAP_BASE} fill={`url(#${uid}-g-flap)`} />
                  <path className={styles.paperEdge} d={FLAP_BASE} fill={`url(#${uid}-laid)`} />
                  <path className={styles.crease} d="M2,2.5 L598,2.5" />
                </svg>
                <span className={cx(styles.face, styles.lining, styles.liningBase)}>
                  <span className={cx(styles.liner, styles.linerBase)} />
                </span>
                <span className={styles.tipHinge}>
                  <svg className={cx(styles.face, styles.faceFull)} viewBox="0 0 600 92" preserveAspectRatio="none">
                    <path className={styles.flapShadow} d={FLAP_TIP} filter={`url(#${uid}-soft)`} />
                    <path d={FLAP_TIP} fill={`url(#${uid}-g-tip)`} />
                    <path className={styles.paperEdge} d={FLAP_TIP} fill={`url(#${uid}-laid)`} />
                  </svg>
                  <span className={cx(styles.face, styles.faceFull, styles.lining, styles.liningTip)}>
                    <span className={cx(styles.liner, styles.linerTip)} />
                  </span>
                </span>
              </span>
            </span>
          </span>

          <div className={cx(styles.layer, styles.cardTrack)}>
            <div className={styles.cardLift}>
              <div className={styles.cardSettle}>
                <article ref={cardRef} id={cardId} className={styles.card} aria-hidden={!open} aria-labelledby={headingId}>
                  <h3 id={headingId} className={styles.heading}>
                    {heading}
                  </h3>
                  {text && <p className={styles.text}>{text}</p>}
                  {(dateLine || initials) && (
                    <div className={styles.meta}>
                      {dateLine && <p className={styles.date}>{dateLine}</p>}
                      {initials && (
                        <span className={styles.mark} aria-hidden="true">
                          {initials}
                        </span>
                      )}
                    </div>
                  )}
                </article>
              </div>
            </div>
          </div>

          <svg className={cx(styles.layer, styles.pocket)} viewBox="0 0 600 384" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={`${uid}-g-left`} x1="0" y1="0" x2="1" y2="0.4">
                <stop offset="0" className={styles.stopLit} />
                <stop offset="1" className={styles.stopBase} />
              </linearGradient>
              <linearGradient id={`${uid}-g-right`} x1="1" y1="0" x2="0" y2="0.4">
                <stop offset="0" className={styles.stopShade} />
                <stop offset="1" className={styles.stopDeep} />
              </linearGradient>
              <linearGradient id={`${uid}-g-bottom`} x1="0" y1="0" x2="0.15" y2="1">
                <stop offset="0" className={styles.stopLit} />
                <stop offset="0.55" className={styles.stopBase} />
                <stop offset="1" className={styles.stopShade} />
              </linearGradient>
              <linearGradient id={`${uid}-g-flap`} x1="0" y1="0" x2="0.2" y2="1">
                <stop offset="0" className={styles.stopShade} />
                <stop offset="0.18" className={styles.stopBase} />
                <stop offset="1" className={styles.stopLit} />
              </linearGradient>
              <linearGradient id={`${uid}-g-tip`} x1="0" y1="0" x2="0.2" y2="1">
                <stop offset="0" className={styles.stopLit} />
                <stop offset="1" className={styles.stopBright} />
              </linearGradient>
              <pattern id={`${uid}-laid`} width="54" height="2.6" patternUnits="userSpaceOnUse">
                <rect width="54" height="0.7" className={styles.laidLine} />
                <rect width="1.1" height="2.6" className={styles.chainLine} />
              </pattern>
              <filter id={`${uid}-soft`} x="-10%" y="-10%" width="120%" height="140%">
                <feGaussianBlur stdDeviation="5" />
              </filter>
              <filter id={`${uid}-fold`} x="-10%" y="-10%" width="120%" height="130%">
                <feDropShadow dx="0" dy="2.5" stdDeviation="3.5" floodColor="#000" floodOpacity="0.5" />
              </filter>
            </defs>
            {POCKET.map((p) => (
              <g key={p.fill} filter={`url(#${uid}-fold)`}>
                <path d={p.d} fill={`url(#${uid}-g-${p.fill})`} />
                <path className={styles.paperEdge} d={p.d} fill={`url(#${uid}-laid)`} />
              </g>
            ))}
          </svg>

          <span className={cx(styles.layer, styles.sealLayer)} aria-hidden="true">
            <span className={cx(styles.sealWhole, animate && (open ? styles.sealBreak : styles.sealPress))}>
              <svg className={styles.sealShadow} viewBox="-20 -20 240 240">
                <filter id={`${uid}-blurS`}>
                  <feGaussianBlur stdDeviation="2.4" />
                </filter>
                <filter id={`${uid}-blurL`} x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="10" />
                </filter>
                <use className={styles.shadowFar} href={`#${uid}-blob`} filter={`url(#${uid}-blurL)`} />
                <use className={styles.shadowNear} href={`#${uid}-blob`} filter={`url(#${uid}-blurS)`} />
              </svg>
              <span className={styles.sealLift}>
                <WaxSeal id={uid} initials={initials} glint={seen && !reduced} crack={animate && open} />
              </span>
            </span>
            {animate && open && <SealShards id={uid} />}
          </span>
        </div>
      </div>

      <button
        type="button"
        className={styles.button}
        aria-expanded={open}
        aria-controls={cardId}
        aria-label={open ? `Close the invitation: ${heading}` : `Break the seal to open the invitation: ${heading}`}
        onClick={toggle}
        onKeyDown={onKeyDown}
        onPointerEnter={() => hover(true)}
        onPointerLeave={() => hover(false)}
        onFocus={() => hover(true)}
        onBlur={() => hover(false)}
      />
    </div>
  );
}
