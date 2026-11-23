const e=`import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';
import powderShoeImg from './images/powder-shoe.jpg';
import onyxShoeImg from './images/onyx-shoe.png';

export interface LenticularSwitchProps {
  imageA?: string;
  imageAAlt?: string;
  imageB?: string;
  imageBAlt?: string;
  stripWidth?: number;
  /** Tint of the strips while they flip: a CSS colour or gradient (e.g. \`#ff7a00\`, \`linear-gradient(90deg, gold, hotpink)\`). Gradients span the whole print. Empty = default multicolour sheen. */
  stripColor?: string;
  hint?: boolean;
  className?: string;
}

const MIN_STRIPS = 10;
const MAX_STRIPS = 44;
const SPREAD = 4;
const GLOBAL_STIFF = 170;
const GLOBAL_DAMP = 18;
const STRIP_STIFF = 310;
const STRIP_DAMP = 25;
const KEY_STEP = 0.07;
const KEY_HOLD_MS = 1600;
const SWAY_SPEED = 0.48;
const SWAY_EASE_MS = 2600;
const HUE_BASE = 200;

const useImageRatio = (src: string) => {
  const [ratio, setRatio] = useState(1.6);
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => img.naturalHeight && setRatio(img.naturalWidth / img.naturalHeight);
    img.src = src;
  }, [src]);
  return ratio;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const clamp01 = (v: number) => clamp(v, 0, 1);

type Mode = 'idle' | 'pointer' | 'key';

const HELP_ANIMATED =
  'Move across the print, or drag on touch, to flip between the two photos. Arrow keys flip step by step; Home and End jump to a photo; Escape lets it drift again.';
const HELP_REDUCED = 'Press Enter, Space or the arrow keys to switch between the two photos.';

const defaultImageA = powderShoeImg;
const defaultImageB = onyxShoeImg;

export default function LenticularSwitch({
  imageA = defaultImageA,
  imageAAlt = 'Knit sneaker in cobalt blue resting on a pale step',
  imageB = defaultImageB,
  imageBAlt = 'Pair of black knit sneakers with white soles on a plinth',
  stripWidth = 26,
  stripColor,
  hint = true,
  className,
}: LenticularSwitchProps) {
  const sw = clamp(stripWidth, 8, 64);
  const hintOn = hint;

  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [paused, setPaused] = useState(false);
  const [showB, setShowB] = useState(false);
  const [stripCount, setStripCount] = useState(() => clamp(Math.round(720 / sw), MIN_STRIPS, MAX_STRIPS));

  const ratioA = useImageRatio(imageA);
  const ratioB = useImageRatio(imageB);
  const rootRef = useRef<HTMLDivElement>(null);
  const openingRef = useRef<HTMLDivElement>(null);
  const stripEls = useRef<(HTMLDivElement | null)[]>([]);
  const motion = useRef({
    gt: 0,
    gv: 0,
    p: new Float32Array(0),
    v: new Float32Array(0),
    stiff: new Float32Array(0),
    damp: new Float32Array(0),
  });
  const target = useRef({ mode: 'idle' as Mode, t: 0, idleSince: 0 });
  const keyTimer = useRef(0);

  const release = useCallback(() => {
    target.current.mode = 'idle';
    target.current.idleSince = performance.now();
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
    const opening = openingRef.current;
    if (!opening) return;
    const measure = () => {
      const w = opening.clientWidth;
      if (w > 0) setStripCount(clamp(Math.round(w / sw), MIN_STRIPS, MAX_STRIPS));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(opening);
    return () => ro.disconnect();
  }, [sw]);

  useEffect(() => () => window.clearTimeout(keyTimer.current), []);

  useEffect(() => {
    if (reduced || !inView) return;
    const opening = openingRef.current;
    const root = rootRef.current;
    if (!opening || !root) return;
    const m = motion.current;
    if (m.p.length !== stripCount) {
      m.p = new Float32Array(stripCount);
      m.v = new Float32Array(stripCount);
      m.stiff = new Float32Array(stripCount);
      m.damp = new Float32Array(stripCount);
      for (let i = 0; i < stripCount; i++) {
        m.stiff[i] = STRIP_STIFF + 55 * Math.sin(i * 2.399);
        m.damp[i] = STRIP_DAMP + 2.5 * Math.cos(i * 1.7);
      }
    }
    const swayOn = hintOn && !paused;
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const tgt = target.current;
      let t = tgt.t;
      if (tgt.mode === 'idle') {
        if (swayOn) {
          const ease = Math.min(1, (now - tgt.idleSince) / SWAY_EASE_MS);
          t = (0.5 - 0.5 * Math.cos((now / 1000) * SWAY_SPEED)) * ease;
        } else {
          t = 0;
        }
      }
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      const n = stripCount;
      for (let s = 0; s < steps; s++) {
        m.gv += (GLOBAL_STIFF * (t - m.gt) - GLOBAL_DAMP * m.gv) * h;
        m.gt += m.gv * h;
        for (let i = 0; i < n; i++) {
          const x = n === 1 ? 0 : i / (n - 1);
          const p = clamp01(t * (1 + SPREAD) - SPREAD * x);
          m.v[i] += (m.stiff[i] * (p - m.p[i]) - m.damp[i] * m.v[i]) * h;
          m.p[i] += m.v[i] * h;
        }
      }
      opening.style.setProperty('--ls-gx', m.gt.toFixed(3));
      root.style.setProperty('--ls-gx', m.gt.toFixed(3));
      const els = stripEls.current;
      for (let i = 0; i < n; i++) {
        const el = els[i];
        if (!el) continue;
        el.style.transform = \`rotateY(\${(m.p[i] * 180).toFixed(2)}deg)\`;
        el.style.setProperty('--s', Math.sin(Math.PI * m.p[i]).toFixed(3));
        el.style.setProperty('--h', (HUE_BASE + m.p[i] * 260 + i * 11).toFixed(1));
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [reduced, inView, stripCount, hintOn, paused]);

  const aim = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    target.current.mode = 'pointer';
    target.current.t = clamp01((e.clientX - rect.left) / rect.width);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced) {
      setShowB((v) => !v);
      return;
    }
    if (e.pointerType !== 'mouse') {
      e.currentTarget.setPointerCapture(e.pointerId);
      aim(e);
    }
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
    if (e.key === 'Escape') {
      release();
      return;
    }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      if (reduced) {
        setShowB(e.key === 'End');
        return;
      }
      target.current.mode = 'key';
      target.current.t = e.key === 'End' ? 1 : 0;
      armKeyRelease();
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (reduced) {
        setShowB(e.key === 'ArrowRight');
        return;
      }
      const t = target.current;
      const from = t.mode === 'key' ? t.t : motion.current.gt;
      t.mode = 'key';
      t.t = clamp01(from + (e.key === 'ArrowRight' ? KEY_STEP : -KEY_STEP));
      armKeyRelease();
      return;
    }
    if (reduced && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setShowB((v) => !v);
    }
  };

  const armKeyRelease = () => {
    window.clearTimeout(keyTimer.current);
    keyTimer.current = window.setTimeout(release, KEY_HOLD_MS);
  };

  const rootStyle = {
    '--ls-img-a': imageA ? \`url("\${imageA}")\` : 'none',
    '--ls-img-b': imageB ? \`url("\${imageB}")\` : 'none',
    '--ls-ar-a': ratioA,
    '--ls-ar-b': ratioB,
    ...(stripColor ? { '--ls-tint': stripColor } : {}),
  } as CSSProperties;
  const openingStyle = { '--ls-n': stripCount } as CSSProperties;
  const ariaLabel = \`Lenticular print switching between \${imageAAlt} and \${imageBAlt}\`;

  const reducedStyle = reduced ? ({ '--ls-gx': showB ? 1 : 0 } as CSSProperties) : undefined;

  return (
    <figure
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={{ ...rootStyle, ...reducedStyle }}
    >
      <div
        ref={openingRef}
        className={styles.opening}
        style={openingStyle}
        role="img"
        aria-label={ariaLabel}
        aria-description={reduced ? HELP_REDUCED : HELP_ANIMATED}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onBlur={release}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerEnd}
      >
        {reduced ? (
          <>
            <span className={styles.flatA} aria-hidden="true" />
            <span className={styles.flatB} aria-hidden="true" style={{ opacity: showB ? 1 : 0 }} />
          </>
        ) : (
          <div className={[styles.strips, stripColor && styles.tinted].filter(Boolean).join(' ')} aria-hidden="true">
            {Array.from({ length: stripCount }, (_, i) => (
              <div
                key={i}
                className={styles.strip}
                style={{ '--i': i } as CSSProperties}
                ref={(el) => {
                  stripEls.current[i] = el;
                }}
              >
                <span className={styles.faceA} />
                <span className={styles.faceB} />
              </div>
            ))}
          </div>
        )}
      </div>
      <figcaption className={styles.caption}>
        <span className={styles.numerals} aria-hidden="true">
          <span className={styles.numA}>01</span>
          <span className={styles.numB}>02</span>
        </span>
        <span className={styles.hintText} aria-hidden="true">
          {reduced ? 'Tap to switch' : 'Move across to turn'}
        </span>
        {hintOn && !reduced && (
          <button
            type="button"
            className={styles.pauseButton}
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Play the drifting motion' : 'Pause the drifting motion'}
            aria-pressed={paused}
          >
            <svg viewBox="0 0 12 12" className={styles.icon} aria-hidden="true">
              {paused ? (
                <path d="M3 1.6v8.8L10.4 6z" />
              ) : (
                <path d="M2.6 1.4h2.6v9.2H2.6zM6.8 1.4h2.6v9.2H6.8z" />
              )}
            </svg>
          </button>
        )}
      </figcaption>
    </figure>
  );
}
`;export{e as default};
