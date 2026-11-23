const e=`import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface FoilTiltCardDetail {
  label: string;
  value: string;
}

export interface FoilTiltCardProps {
  image?: string;
  imageAlt?: string;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  serial?: string;
  details?: FoilTiltCardDetail[];
  foilColor?: string;
  tiltStrength?: number;
  className?: string;
}

export const defaultDetails: FoilTiltCardDetail[] = [
  { label: 'Joined', value: '2019' },
  { label: 'Based in', value: 'Lisbon' },
  { label: 'Kilns fired', value: '1,240' },
];

type Motion = { rx: number; ry: number; nx: number; ny: number; vrx: number; vry: number; vnx: number; vny: number };
type Mode = 'idle' | 'pointer' | 'key';

const STIFFNESS = 210;
const DAMPING = 19;
const KEY_STEP = 0.45;
const KEY_HOLD_MS = 1600;

const clamp = (v: number, min = -1, max = 1) => Math.min(max, Math.max(min, v));

const CARD_HELP = 'Move, drag or use the arrow keys to tilt; Escape lets the card settle.';

export default function FoilTiltCard({
  image = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=720&h=560&fit=crop&crop=faces',
  imageAlt = 'Portrait of Amara Okonkwo',
  title = 'Amara Okonkwo',
  subtitle = 'Head of Ceramics, Studio Lumen',
  eyebrow = 'Founding crew',
  serial = 'No. 07 / 24',
  details = defaultDetails,
  foilColor = '#b69cff',
  tiltStrength = 16,
  className,
}: FoilTiltCardProps) {
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const uid = useId();
  const titleId = \`\${uid}-title\`;

  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const motion = useRef<Motion>({ rx: 0, ry: 0, nx: 0, ny: 0, vrx: 0, vry: 0, vnx: 0, vny: 0 });
  const target = useRef({ mode: 'idle' as Mode, nx: 0, ny: 0, idleSince: 0 });
  const strength = useRef(tiltStrength);
  const keyTimer = useRef(0);

  strength.current = clamp(tiltStrength, 0, 40);

  const release = useCallback(() => {
    target.current.mode = 'idle';
    target.current.idleSince = performance.now();
  }, []);

  const paint = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const m = motion.current;
    const set = (k: string, v: string) => scene.style.setProperty(k, v);
    set('--rx', \`\${m.rx.toFixed(2)}deg\`);
    set('--ry', \`\${m.ry.toFixed(2)}deg\`);
    set('--nx', m.nx.toFixed(3));
    set('--ny', m.ny.toFixed(3));
    set('--px', \`\${(50 + m.nx * 50).toFixed(2)}%\`);
    set('--py', \`\${(50 + m.ny * 50).toFixed(2)}%\`);
    set('--hyp', Math.min(1, Math.hypot(m.nx, m.ny)).toFixed(3));
  }, []);

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
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) {
      sceneRef.current?.removeAttribute('style');
      return;
    }
    if (!inView) return;
    target.current.idleSince = performance.now();
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const t = target.current;
      let tx = t.nx;
      let ty = t.ny;
      let lean = 1;
      if (t.mode === 'idle') {
        const s = now / 1000;
        const ease = Math.min(1, (now - t.idleSince) / 2400);
        tx = Math.sin(s * 0.55) * 0.62 * ease;
        ty = Math.sin(s * 0.41 + 0.9) * 0.42 * ease;
        lean = 0.4;
      }
      const goal = { rx: -ty * strength.current * lean, ry: tx * strength.current * lean, nx: tx, ny: ty };
      const m = motion.current;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let n = 0; n < steps; n++) {
        m.vrx += (STIFFNESS * (goal.rx - m.rx) - DAMPING * m.vrx) * h;
        m.vry += (STIFFNESS * (goal.ry - m.ry) - DAMPING * m.vry) * h;
        m.vnx += (STIFFNESS * (goal.nx - m.nx) - DAMPING * m.vnx) * h;
        m.vny += (STIFFNESS * (goal.ny - m.ny) - DAMPING * m.vny) * h;
        m.rx += m.vrx * h;
        m.ry += m.vry * h;
        m.nx += m.vnx * h;
        m.ny += m.vny * h;
      }
      paint();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [reduced, inView, paint]);

  useEffect(() => () => window.clearTimeout(keyTimer.current), []);

  const aim = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    target.current.mode = 'pointer';
    target.current.nx = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1);
    target.current.ny = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    aim(e);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    if (e.pointerType === 'mouse' || e.currentTarget.hasPointerCapture(e.pointerId)) aim(e);
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
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
    const t = target.current;
    const from = t.mode === 'key' ? t : motion.current;
    t.nx = clamp(from.nx + move[0], -0.9, 0.9);
    t.ny = clamp(from.ny + move[1], -0.9, 0.9);
    t.mode = 'key';
    window.clearTimeout(keyTimer.current);
    keyTimer.current = window.setTimeout(release, KEY_HOLD_MS);
  };

  const rootStyle = { '--ft-foil': foilColor } as CSSProperties;
  const monogram = title.trim().charAt(0).toUpperCase();

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <span className={styles.glowLilac} aria-hidden="true" />
      <span className={styles.glowMint} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />

      <div
        ref={sceneRef}
        className={styles.scene}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerEnd}
      >
        <span className={styles.shadow} aria-hidden="true" />
        <article
          className={styles.card}
          tabIndex={0}
          aria-labelledby={titleId}
          aria-description={CARD_HELP}
          onKeyDown={onKeyDown}
          onBlur={release}
        >
          <span className={styles.stock} aria-hidden="true" />
          <span className={styles.foilField} aria-hidden="true" />
          <span className={styles.lines} aria-hidden="true" />

          {(eyebrow || serial) && (
            <div className={styles.top}>
              {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
              {serial && <span className={styles.serial}>{serial}</span>}
            </div>
          )}

          <div className={styles.window}>
            <div className={styles.windowInner}>
              {image ? (
                <img className={styles.photo} src={image} alt={imageAlt} draggable={false} />
              ) : (
                <span className={styles.monogram} aria-hidden="true">
                  {monogram}
                </span>
              )}
              <span className={styles.holo} aria-hidden="true" />
              <span className={styles.windowGlare} aria-hidden="true" />
            </div>
            <span className={styles.seal} aria-hidden="true">
              <span className={styles.sealStar} />
            </span>
          </div>

          <div className={styles.body}>
            <h3 id={titleId} className={styles.title}>
              {title}
            </h3>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>

          {details.length > 0 && (
            <dl className={styles.details}>
              {details.map((d, i) => (
                <div key={i} className={styles.detail}>
                  <dt className={styles.detailLabel}>{d.label}</dt>
                  <dd className={styles.detailValue}>{d.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <span className={styles.grainCard} aria-hidden="true" />
          <span className={styles.glare} aria-hidden="true" />
          <span className={styles.edge} aria-hidden="true" />
        </article>
      </div>
    </div>
  );
}
`;export{e as default};
