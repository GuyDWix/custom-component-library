const n=`Create a custom element called "Wax Seal Invite". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: card heading, card text, date line, seal initials, seal color, envelope color. Add other settings if they help.

\`\`\`tsx
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export interface WaxSealInviteProps {
  heading?: string;
  text?: string;
  dateLine?: string;
  sealInitials?: string;
  sealColor?: string;
  envelopeColor?: string;
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
  let d = \`M\${round(pts[0][0])},\${round(pts[0][1])}\`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += \`C\${round(c1[0])},\${round(c1[1])} \${round(c2[0])},\${round(c2[1])} \${round(p2[0])},\${round(p2[1])}\`;
  }
  return \`\${d}Z\`;
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
const fmt = (pts: Point[]) => pts.map(([x, y]) => \`\${round(x)},\${round(y)}\`).join(' ');

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
const CRACKS = RAYS.map((r) => \`M\${CRACK_ORIGIN.join(',')} L\${fmt(r.slice(0, 3)).replace(/ /g, ' L')}\`).join(' ');

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
        <path id={\`\${id}-blob\`} d={BLOB} />
        <clipPath id={\`\${id}-clip\`}>
          <use href={\`#\${id}-blob\`} />
        </clipPath>
        <linearGradient id={\`\${id}-glint\`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={\`\${id}-wax\`} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
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
      <g id={\`\${id}-body\`} filter={\`url(#\${id}-wax)\`}>
        <use href={\`#\${id}-blob\`} fill="#9a9a9a" />
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
      <g clipPath={\`url(#\${id}-clip)\`}>
        <path className={crack ? \`\${styles.cracks} \${styles.cracking}\` : styles.cracks} d={CRACKS} pathLength={120} />
        {glint && <rect className={styles.glint} x="-20" y="-20" width="120" height="240" fill={\`url(#\${id}-glint)\`} />}
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
            <clipPath id={\`\${id}-shard\${i}\`}>
              <polygon points={s.points} />
            </clipPath>
            <g clipPath={\`url(#\${id}-shard\${i})\`}>
              <use href={\`#\${id}-body\`} />
              <g clipPath={\`url(#\${id}-clip)\`}>
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
  sealColor = '#d9432c',
  envelopeColor = '#1c2747',
  className,
}: WaxSealInviteProps) {
  const [open, setOpen] = useState(false);
  const [played, setPlayed] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [seen, setSeen] = useState(false);
  const uid = sanitize(useId());
  const cardId = \`\${uid}-card\`;
  const headingId = \`\${uid}-heading\`;

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
      const set = (k: string, v: number) => root.style.setProperty(k, \`\${Math.round(v)}px\`);
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
    '--ws-seal': sealColor,
    '--ws-env': envelopeColor,
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
                  <path className={styles.flapShadow} d={FLAP_BASE} filter={\`url(#\${uid}-soft)\`} />
                  <path d={FLAP_BASE} fill={\`url(#\${uid}-g-flap)\`} />
                  <path className={styles.paperEdge} d={FLAP_BASE} fill={\`url(#\${uid}-laid)\`} />
                  <path className={styles.crease} d="M2,2.5 L598,2.5" />
                </svg>
                <span className={cx(styles.face, styles.lining, styles.liningBase)}>
                  <span className={cx(styles.liner, styles.linerBase)} />
                </span>
                <span className={styles.tipHinge}>
                  <svg className={cx(styles.face, styles.faceFull)} viewBox="0 0 600 92" preserveAspectRatio="none">
                    <path className={styles.flapShadow} d={FLAP_TIP} filter={\`url(#\${uid}-soft)\`} />
                    <path d={FLAP_TIP} fill={\`url(#\${uid}-g-tip)\`} />
                    <path className={styles.paperEdge} d={FLAP_TIP} fill={\`url(#\${uid}-laid)\`} />
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
              <linearGradient id={\`\${uid}-g-left\`} x1="0" y1="0" x2="1" y2="0.4">
                <stop offset="0" className={styles.stopLit} />
                <stop offset="1" className={styles.stopBase} />
              </linearGradient>
              <linearGradient id={\`\${uid}-g-right\`} x1="1" y1="0" x2="0" y2="0.4">
                <stop offset="0" className={styles.stopShade} />
                <stop offset="1" className={styles.stopDeep} />
              </linearGradient>
              <linearGradient id={\`\${uid}-g-bottom\`} x1="0" y1="0" x2="0.15" y2="1">
                <stop offset="0" className={styles.stopLit} />
                <stop offset="0.55" className={styles.stopBase} />
                <stop offset="1" className={styles.stopShade} />
              </linearGradient>
              <linearGradient id={\`\${uid}-g-flap\`} x1="0" y1="0" x2="0.2" y2="1">
                <stop offset="0" className={styles.stopShade} />
                <stop offset="0.18" className={styles.stopBase} />
                <stop offset="1" className={styles.stopLit} />
              </linearGradient>
              <linearGradient id={\`\${uid}-g-tip\`} x1="0" y1="0" x2="0.2" y2="1">
                <stop offset="0" className={styles.stopLit} />
                <stop offset="1" className={styles.stopBright} />
              </linearGradient>
              <pattern id={\`\${uid}-laid\`} width="54" height="2.6" patternUnits="userSpaceOnUse">
                <rect width="54" height="0.7" className={styles.laidLine} />
                <rect width="1.1" height="2.6" className={styles.chainLine} />
              </pattern>
              <filter id={\`\${uid}-soft\`} x="-10%" y="-10%" width="120%" height="140%">
                <feGaussianBlur stdDeviation="5" />
              </filter>
              <filter id={\`\${uid}-fold\`} x="-10%" y="-10%" width="120%" height="130%">
                <feDropShadow dx="0" dy="2.5" stdDeviation="3.5" floodColor="#000" floodOpacity="0.5" />
              </filter>
            </defs>
            {POCKET.map((p) => (
              <g key={p.fill} filter={\`url(#\${uid}-fold)\`}>
                <path d={p.d} fill={\`url(#\${uid}-g-\${p.fill})\`} />
                <path className={styles.paperEdge} d={p.d} fill={\`url(#\${uid}-laid)\`} />
              </g>
            ))}
          </svg>

          <span className={cx(styles.layer, styles.sealLayer)} aria-hidden="true">
            <span className={cx(styles.sealWhole, animate && (open ? styles.sealBreak : styles.sealPress))}>
              <svg className={styles.sealShadow} viewBox="-20 -20 240 240">
                <filter id={\`\${uid}-blurS\`}>
                  <feGaussianBlur stdDeviation="2.4" />
                </filter>
                <filter id={\`\${uid}-blurL\`} x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="10" />
                </filter>
                <use className={styles.shadowFar} href={\`#\${uid}-blob\`} filter={\`url(#\${uid}-blurL)\`} />
                <use className={styles.shadowNear} href={\`#\${uid}-blob\`} filter={\`url(#\${uid}-blurS)\`} />
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
        aria-label={open ? \`Close the invitation: \${heading}\` : \`Break the seal to open the invitation: \${heading}\`}
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
\`\`\`

\`\`\`css
.root {
  --ws-seal: #d9432c;
  --ws-env: #1c2747;
  --ws-paper: #f3f2ee;
  --ws-ink: color-mix(in oklab, var(--ws-env) 86%, black);
  --ws-muted: color-mix(in oklab, var(--ws-ink) 74%, var(--ws-paper));
  --ws-stage: color-mix(in oklab, var(--ws-env) 42%, #05060b);
  --ws-font-display: 'Inter Tight', 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --ws-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --ws-font-seal: 'Didot', 'Bodoni 72', 'Bodoni Moda', 'Playfair Display', Georgia, serif;
  --ws-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .8 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --ws-spring: linear(0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 18.9%, 0.721 25.3%, 0.849 31.5%, 0.937 38.1%, 0.968 41.8%, 0.991 45.7%, 1.006 50.1%, 1.015 55%, 1.017 63.9%, 1.001 85.3%, 1);
  --ws-easeOut: cubic-bezier(0.22, 1, 0.36, 1);
  --ws-laid: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='140'><path d='M0 2h160M0 13h160M0 25h160M0 36h160M0 48h160M0 60h160M0 71h160M0 83h160M0 94h160M0 106h160M0 118h160M0 129h160' stroke='rgb(26,36,74)' stroke-opacity='.045' stroke-width='.8'/><path d='M0 6h160M0 17h160M0 29h160M0 41h160M0 52h160M0 64h160M0 76h160M0 87h160M0 99h160M0 111h160M0 123h160M0 134h160' stroke='rgb(26,36,74)' stroke-opacity='.026' stroke-width='.6'/><path d='M30 0v140M92 0v140M151 0v140' stroke='rgb(26,36,74)' stroke-opacity='.014' stroke-width='1.2'/></svg>");
  --ws-gutter: clamp(16px, 6cqi, 64px);
  --ws-w: min(calc(100cqi - 2 * var(--ws-gutter)), 620px);
  --ws-o: 0;
  --ws-h: 0;

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  min-block-size: calc(var(--ws-o) * var(--ws-open-h, 0px));
  border-radius: 28px;
  background:
    radial-gradient(90% 70% at 78% 112%, color-mix(in oklab, var(--ws-seal) 16%, transparent) 0%, transparent 62%),
    linear-gradient(165deg, color-mix(in oklab, var(--ws-stage) 88%, #6f82c4) 0%, var(--ws-stage) 46%, color-mix(in oklab, var(--ws-stage) 80%, black) 100%);
  color: var(--ws-ink);
  font-family: var(--ws-font-ui);
}

/* Open/close state classes (set from TSX) drive the fixed keyframe timeline below. */
.open {
  transition: min-block-size 900ms var(--ws-easeOut) 620ms;
}

.close {
  transition: min-block-size 650ms cubic-bezier(0.4, 0, 0.2, 1) 260ms;
}

.lamp {
  position: absolute;
  inset-block-start: -30%;
  inset-inline-start: -10%;
  inline-size: 80%;
  aspect-ratio: 1;
  z-index: -1;
  pointer-events: none;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in oklab, #b9c6f0 26%, transparent), transparent);
  filter: blur(30px);
}

.grain {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
  background-image: var(--ws-noise);
  opacity: 0.11;
  mix-blend-mode: overlay;
}

.frame {
  display: grid;
  justify-items: center;
  padding-block: clamp(44px, 11cqi, 96px);
  padding-inline: var(--ws-gutter);
}

.envelope {
  position: relative;
  inline-size: var(--ws-w);
  aspect-ratio: 600 / 384;
  transform-origin: 50% 60%;
  transform: rotate(-2.4deg);
}

.layer {
  position: absolute;
  inset: 0;
}

.back {
  z-index: 1;
  border-radius: 6px;
  background: linear-gradient(180deg, color-mix(in oklab, var(--ws-env) 70%, black) 0%, color-mix(in oklab, var(--ws-env) 86%, black) 60%);
  box-shadow:
    inset 0 1px 0 color-mix(in oklab, var(--ws-env) 60%, white),
    0 1px 2px rgba(0, 0, 0, 0.45),
    0 6px 12px -4px rgba(0, 0, 0, 0.45),
    calc(var(--ws-w) * 0.04) calc(var(--ws-w) * 0.07) calc(var(--ws-w) * 0.09) calc(var(--ws-w) * -0.02) rgba(0, 0, 0, 0.6);
}

.backLiner {
  position: absolute;
  inset-block: 2.6% 38%;
  inset-inline: 2.4%;
  border-radius: 3px 3px 0 0;
  box-shadow: inset 0 calc(var(--ws-w) * 0.03) calc(var(--ws-w) * 0.04) rgba(0, 0, 0, 0.45);
}

.liner,
.backLiner {
  background:
    repeating-linear-gradient(45deg, color-mix(in oklab, var(--ws-paper) 26%, transparent) 0 1px, transparent 1px 11px),
    repeating-linear-gradient(-45deg, color-mix(in oklab, var(--ws-paper) 26%, transparent) 0 1px, transparent 1px 11px),
    radial-gradient(120% 90% at 30% 0%, color-mix(in oklab, var(--ws-seal) 92%, white) 0%, transparent 70%),
    color-mix(in oklab, var(--ws-seal) 78%, black);
}

.flapLayer {
  z-index: calc(5 - var(--ws-o) * 3);
}

.open .flapLayer {
  transition: z-index 0s linear 520ms;
}

.close .flapLayer {
  transition: z-index 0s linear 980ms;
}

.flapTug {
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  block-size: calc(223 / 384 * 100%);
  transform-origin: 50% 0;
  transform-style: preserve-3d;
  transform: perspective(1500px) rotateX(calc(var(--ws-h) * (1 - var(--ws-o)) * 9deg));
  transition: transform 420ms cubic-bezier(0.34, 1.4, 0.64, 1);
}

.flap {
  position: absolute;
  inset: 0;
  transform-origin: 50% 0;
  transform-style: preserve-3d;
}

.open .flap {
  animation: flapOpen 960ms var(--ws-spring) 420ms both;
}

.close .flap {
  animation: flapClose 560ms cubic-bezier(0.5, 0, 0.25, 1) 560ms both;
}

.face {
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  inline-size: 100%;
  block-size: calc(131 / 223 * 100%);
  overflow: visible;
  backface-visibility: hidden;
}

.tipHinge {
  position: absolute;
  inset-block-start: calc(130 / 223 * 100%);
  inset-inline: 0;
  block-size: calc(92 / 223 * 100%);
  transform-origin: 50% 0;
  transform-style: preserve-3d;
}

.faceFull {
  block-size: 100%;
}

/* The tip folds against the flap swing: the readable 3D bend beat. */
.open .tipHinge {
  animation: tipBendOpen 960ms var(--ws-spring) 420ms both;
}

.close .tipHinge {
  animation: tipBendClose 520ms cubic-bezier(0.3, 0, 0.3, 1) 560ms both;
}

@keyframes tipBendOpen {
  0% { transform: rotateX(0deg); }
  34% { transform: rotateX(-38deg); }
  64% { transform: rotateX(15deg); }
  100% { transform: rotateX(0deg); }
}

@keyframes tipBendClose {
  0% { transform: rotateX(0deg); }
  40% { transform: rotateX(26deg); }
  100% { transform: rotateX(0deg); }
}

.lining {
  transform: rotateY(180deg);
  background: color-mix(in oklab, var(--ws-env) 80%, black);
}

.liningBase {
  clip-path: polygon(0% 0%, 100% 0%, 100% 4.6%, 72.2% 100%, 27.8% 100%, 0% 4.6%);
}

.liningTip {
  clip-path: polygon(27.6% 0%, 72.4% 0%, 55% 84.8%, 50% 96%, 45% 84.8%);
}

.liner {
  position: absolute;
  inset: 0;
}

.linerBase {
  clip-path: polygon(2.6% 6%, 97.4% 6%, 97.4% 9.5%, 70.6% 100%, 29.4% 100%, 2.6% 9.5%);
  background-position: 0 0;
}

.linerTip {
  clip-path: polygon(29.4% 0%, 70.6% 0%, 54% 76%, 50% 86%, 46% 76%);
}

.flapShadow {
  fill: rgba(0, 0, 0, 0.55);
  transform: translateY(5px);
  opacity: calc(1 - var(--ws-o));
}

.open .flapShadow {
  transition: opacity 220ms ease 160ms;
}

.close .flapShadow {
  transition: opacity 320ms ease 950ms;
}

.crease {
  fill: none;
  stroke: rgba(0, 0, 0, 0.35);
  stroke-width: 1.4;
  vector-effect: non-scaling-stroke;
}

.paperEdge {
  stroke: color-mix(in oklab, var(--ws-env) 45%, white);
  stroke-opacity: 0.32;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.laidLine {
  fill: rgba(255, 255, 255, 0.045);
}

.chainLine {
  fill: rgba(255, 255, 255, 0.03);
}

.stopBright {
  stop-color: color-mix(in oklab, var(--ws-env) 84%, white);
}

.stopLit {
  stop-color: color-mix(in oklab, var(--ws-env) 92%, white);
}

.stopBase {
  stop-color: var(--ws-env);
}

.stopShade {
  stop-color: color-mix(in oklab, var(--ws-env) 84%, black);
}

.stopDeep {
  stop-color: color-mix(in oklab, var(--ws-env) 72%, black);
}

.cardTrack {
  z-index: calc(3 + var(--ws-o) * 4);
  clip-path: inset(-400% -40% 0% -40%);
}

.open .cardTrack {
  animation: clipOpen 760ms ease-in 700ms both;
  transition: z-index 0s linear 1140ms;
}

.close .cardTrack {
  animation: clipClose 180ms ease-in 900ms both;
  transition: z-index 0s linear 520ms;
}

.cardLift {
  position: absolute;
  inset-block-start: 5%;
  inset-inline-start: 8%;
  inline-size: 84%;
}

.open .cardLift {
  animation: cardRise 640ms var(--ws-easeOut) 700ms both;
}

.close .cardLift {
  animation: cardRiseIn 460ms cubic-bezier(0.4, 0, 0.2, 1) 380ms both;
}

.cardSettle {
  transform-origin: 50% 0;
}

.open .cardSettle {
  animation: settleOut 980ms var(--ws-spring) 1240ms both;
}

.close .cardSettle {
  animation: settleIn 480ms cubic-bezier(0.5, 0, 0.3, 1) 40ms both;
}

.card {
  position: relative;
  box-sizing: border-box;
  display: grid;
  gap: clamp(12px, 2.4cqi, 18px);
  padding-block: clamp(24px, 5.4cqi, 44px) clamp(20px, 4.4cqi, 34px);
  padding-inline: clamp(22px, 5.4cqi, 44px);
  border-radius: 3px;
  background:
    var(--ws-laid) 0 0 / 160px 140px,
    radial-gradient(120% 80% at 18% 0%, #fff 0%, transparent 60%),
    var(--ws-paper);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    inset 0 -1px 0 rgba(20, 28, 60, 0.12),
    0 1px 2px rgba(0, 0, 0, 0.3),
    0 calc(4px + var(--ws-o) * 26px) calc(8px + var(--ws-o) * 46px) calc(var(--ws-o) * -8px) rgba(0, 0, 0, calc(0.3 + var(--ws-o) * 0.32));
  color: var(--ws-ink);
}

.open .card {
  transition: box-shadow 900ms ease 1240ms;
}

.close .card {
  transition: box-shadow 520ms ease 320ms;
}

.heading {
  margin: 0;
  max-inline-size: calc(var(--ws-hch, 16) * 1ch);
  font-family: var(--ws-font-display);
  font-size: calc(clamp(26px, 6.2cqi, 46px) * var(--ws-hf, 1));
  font-weight: 650;
  line-height: 1.02;
  letter-spacing: -0.035em;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.text {
  margin: 0;
  max-inline-size: 46ch;
  font-size: clamp(14px, 2.1cqi, 16px);
  line-height: 1.58;
  color: var(--ws-muted);
  text-wrap: pretty;
  overflow-wrap: anywhere;
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-block-start: clamp(4px, 1.4cqi, 12px);
  padding-block-start: clamp(12px, 2.2cqi, 16px);
  border-block-start: 1px solid color-mix(in oklab, var(--ws-ink) 16%, transparent);
}

.date {
  margin: 0;
  font-size: clamp(13px, 1.9cqi, 15px);
  font-weight: 600;
  letter-spacing: 0.005em;
  font-variant-numeric: tabular-nums lining-nums;
  color: color-mix(in oklab, var(--ws-seal) 86%, black);
  overflow-wrap: anywhere;
}

.mark {
  flex: none;
  display: grid;
  place-items: center;
  inline-size: 38px;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1.5px solid color-mix(in oklab, var(--ws-seal) 80%, black);
  box-shadow: inset 0 0 0 3px var(--ws-paper), inset 0 0 0 4px color-mix(in oklab, var(--ws-seal) 45%, transparent);
  font-family: var(--ws-font-seal);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: color-mix(in oklab, var(--ws-seal) 86%, black);
}

.heading::selection,
.text::selection,
.date::selection {
  background: color-mix(in oklab, var(--ws-seal) 30%, transparent);
  color: var(--ws-ink);
}

.pocket {
  z-index: 4;
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
}

.sealLayer {
  z-index: 6;
}

.sealWhole,
.shards {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 55.4%;
  inline-size: 24.5%;
  aspect-ratio: 1;
  translate: -50% -50%;
}

.sealShadow,
.sealSvg {
  position: absolute;
  inset: -10%;
  inline-size: 120%;
  block-size: 120%;
  overflow: visible;
}

.shadowFar {
  fill: rgba(4, 6, 14, 0.75);
  transform-box: fill-box;
  transform-origin: center;
  transform: translate(calc(5px + var(--ws-h) * 7px), calc(9px + var(--ws-h) * 12px)) scale(calc(1 + var(--ws-h) * 0.05));
  opacity: calc(0.85 - var(--ws-h) * 0.25);
  transition: transform 420ms cubic-bezier(0.34, 1.3, 0.64, 1), opacity 420ms ease;
}

.shadowNear {
  fill: rgba(4, 6, 14, 0.8);
  transform-box: fill-box;
  transform-origin: center;
  transform: translate(1.5px, 3px);
  opacity: calc(0.9 - var(--ws-h) * 0.7);
  transition: opacity 300ms ease;
}

.sealLift {
  position: absolute;
  inset: 0;
  transform: translateY(calc(var(--ws-h) * -6%)) scale(calc(1 + var(--ws-h) * 0.045)) rotate(calc(var(--ws-h) * -4deg));
  transition: transform 460ms cubic-bezier(0.34, 1.5, 0.64, 1);
}

.floodWax {
  flood-color: var(--ws-seal);
}

.floodGlow {
  flood-color: color-mix(in oklab, var(--ws-seal) 60%, #ffc27a);
}

.sealType {
  font-family: var(--ws-font-seal);
  font-weight: 700;
  letter-spacing: -0.01em;
}

.cracks {
  fill: none;
  stroke: rgba(30, 4, 0, 0.75);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-dasharray: 120;
  stroke-dashoffset: 120;
  opacity: 0;
}

.cracking {
  animation: crackDraw 240ms cubic-bezier(0.2, 0.8, 0.3, 1) forwards;
}

@keyframes crackDraw {
  to {
    stroke-dashoffset: 0;
    opacity: 1;
  }
}

.glint {
  mix-blend-mode: screen;
  transform: translateX(-160px) skewX(-18deg);
  animation: glintSweep 1500ms cubic-bezier(0.45, 0, 0.25, 1) 900ms both;
}

@keyframes glintSweep {
  to {
    transform: translateX(260px) skewX(-18deg);
  }
}

.sealBreak {
  animation: sealBreak 320ms cubic-bezier(0.3, 0, 0.4, 1) 180ms both;
}

@keyframes sealBreak {
  0% { transform: scale(1); opacity: 1; }
  55% { transform: scale(1.045) translateY(-2%); opacity: 1; }
  100% { transform: scale(0.93); opacity: 0; }
}

.sealPress {
  animation: sealPress 460ms cubic-bezier(0.3, 0, 0.3, 1) 1120ms both;
}

@keyframes sealPress {
  0% { transform: translateY(-16%) scale(1.26); opacity: 0; }
  35% { opacity: 1; }
  58% { transform: translateY(0) scale(0.93); }
  80% { transform: scale(1.02); }
  100% { transform: scale(1); opacity: 1; }
}

.shard {
  position: absolute;
  inset: 0;
  filter: drop-shadow(1px 3px 3px rgba(0, 0, 0, 0.45));
  will-change: transform, opacity;
  animation: shardFall 1150ms calc(300ms + var(--i) * 30ms) both;
}

@keyframes shardFall {
  0% {
    transform: translate(0, 0) rotate(0deg);
    opacity: 1;
    animation-timing-function: cubic-bezier(0.2, 0.7, 0.35, 1);
  }
  22% {
    transform: translate(calc(var(--dx) * 1.4 * var(--ws-w) / 600), calc(var(--dy) * 1.4 * var(--ws-w) / 600)) rotate(calc(var(--spin) * 0.35deg));
    opacity: 1;
    animation-timing-function: cubic-bezier(0.5, 0, 0.85, 0.45);
  }
  78% {
    opacity: 1;
  }
  100% {
    transform: translate(calc(var(--dx) * 2.4 * var(--ws-w) / 600), calc((var(--dy) + 340) * var(--ws-w) / 600)) rotate(calc(var(--spin) * 1.2deg));
    opacity: 0;
  }
}

.shardEdge {
  fill: none;
  stroke: color-mix(in oklab, var(--ws-seal) 55%, #ffd2a0);
  stroke-width: 2.4;
  stroke-opacity: 0.9;
}

.button {
  position: absolute;
  inset: 0;
  z-index: 30;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: inherit;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.button:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--ws-seal) 70%, white);
  outline-offset: -6px;
}

/* --- Open choreography (fixed timeline, every beat capturable) ---
   0-240ms    cracks draw across the seal
   180-500ms  seal flexes, bursts and vanishes
   300-1450ms shards arc out, spin and fall
   420-1380ms flap swings open in 3D while the tip folds against it
   480-1380ms envelope sinks into the stage
   700-1460ms clip releases as the card rises
   1240-2220ms card swings forward and settles on a spring
   Closing mirrors it (card returns first, then the flap, then a fresh seal presses on). */

.open .envelope {
  animation: envTilt 900ms var(--ws-easeOut) 480ms both;
}

.close .envelope {
  animation: envTiltIn 700ms cubic-bezier(0.4, 0, 0.2, 1) 380ms both;
}

@keyframes envTilt {
  from { transform: translate(0, 0) rotate(-2.4deg); }
  to {
    transform: translate(calc(var(--ws-w) * -0.045), var(--ws-sink, 0px)) rotate(-5deg);
  }
}

@keyframes envTiltIn {
  from {
    transform: translate(calc(var(--ws-w) * -0.045), var(--ws-sink, 0px)) rotate(-5deg);
  }
  to { transform: translate(0, 0) rotate(-2.4deg); }
}

@keyframes flapOpen {
  from { transform: rotateX(0deg); }
  to { transform: rotateX(166deg); }
}

@keyframes flapClose {
  from { transform: rotateX(166deg); }
  to { transform: rotateX(0deg); }
}

@keyframes cardRise {
  from { transform: translateY(0); }
  to { transform: translateY(var(--ws-rise, 0px)); }
}

@keyframes cardRiseIn {
  from { transform: translateY(var(--ws-rise, 0px)); }
  to { transform: translateY(0); }
}

@keyframes settleOut {
  from { transform: translate(0, 0) rotate(0deg); }
  to {
    transform: translate(calc(var(--ws-w) * 0.07), var(--ws-settle, 0px)) rotate(6.4deg);
  }
}

@keyframes settleIn {
  from {
    transform: translate(calc(var(--ws-w) * 0.07), var(--ws-settle, 0px)) rotate(6.4deg);
  }
  to { transform: translate(0, 0) rotate(0deg); }
}

@keyframes clipOpen {
  from { clip-path: inset(-400% -40% 0% -40%); }
  to { clip-path: inset(-400% -40% -400% -40%); }
}

@keyframes clipClose {
  from { clip-path: inset(-400% -40% -400% -40%); }
  to { clip-path: inset(-400% -40% 0% -40%); }
}

/* Reduced motion: jump straight to the open end state (with the JS crossfade). */
.staticOpen .envelope {
  transform: translate(calc(var(--ws-w) * -0.045), var(--ws-sink, 0px)) rotate(-5deg);
}

.staticOpen .flap {
  transform: rotateX(166deg);
}

.staticOpen .flapShadow {
  opacity: 0;
}

.staticOpen .cardTrack {
  z-index: 7;
  clip-path: inset(-400% -40% -400% -40%);
}

.staticOpen .cardLift {
  transform: translateY(var(--ws-rise, 0px));
}

.staticOpen .cardSettle {
  transform: translate(calc(var(--ws-w) * 0.07), var(--ws-settle, 0px)) rotate(6.4deg);
}

.staticOpen .sealWhole {
  opacity: 0;
}

.staticOpen .cracks {
  opacity: 1;
  stroke-dashoffset: 0;
}

@container (max-width: 520px) {
  .cardLift {
    inset-inline-start: 4%;
    inline-size: 92%;
  }
}
\`\`\`
`;export{n as default};
