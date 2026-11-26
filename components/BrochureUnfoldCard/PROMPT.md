Create a custom element called "Brochure Unfold Card". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: three panels (title, text, image). Add other settings if they help.

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from 'react';
import styles from './Component.module.css';

export interface BrochurePanel {
  title: string;
  text: string;
  image: string;
  imageAlt: string;
}

export interface BrochureUnfoldCardProps {
  panels?: BrochurePanel[];
  className?: string;
}

export const defaultPanels: BrochurePanel[] = [
  {
    title: 'Wander Season',
    text: 'Three small-group escapes for travellers who like to take it slow. Hand-picked stays, local guides and no rushing.',
    image: 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=900&h=900&fit=crop&q=75',
    imageAlt: 'Two travellers watching hot-air balloons rise over a rocky valley',
  },
  {
    title: 'Dolomites by Boat',
    text: 'Five nights in a lakeside lodge. Mornings paddling glass-flat water, afternoons on mountain trails, evenings at one long table.',
    image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=900&h=900&fit=crop&q=75',
    imageAlt: 'A wooden rowing boat on a green alpine lake below grey peaks',
  },
  {
    title: 'Utah Open Road',
    text: 'Seven days, one camper van and a route through red canyon country. Campsites booked, sunsets always included.',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&h=900&fit=crop&q=75',
    imageAlt: 'A yellow camper van driving along a desert road between red rock formations',
  },
];

type Sim = { a2: number; v2: number; a3: number; v3: number; rx: number; vrx: number; ry: number; vry: number };

const FOLDED = 180;
const MAX_ANGLE = 179.4;
const MIN_ANGLE = -6;
const STIFFNESS = 120;
const DAMPING = 16.5;
const TILT_STIFFNESS = 70;
const TILT_DAMPING = 12;
const REST_RX = 4;
const REST_RY = -3;
const RAD = Math.PI / 180;
const INTRO_DELAY_MS = 250;
const SWIPE_PX = 36;

const BANDS = [0.06, 0.12, 0.18, 0.24, 0.3, 0.36, 0.42, 0.48, 0.54, 0.6, 0.66, 0.72];
const SCALES = [1, 0.82, 0.66, 0.54, 0.44];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ');

const fit = (s: string, limits: number[]) => {
  const n = s.trim().length;
  let i = 0;
  while (i < limits.length && n > limits[i]) i++;
  return SCALES[i];
};

const HELP = 'Press Enter or Space to unfold the next panel. Swipe sideways or use the arrow keys to open and close panels one by one.';

function Route({ index }: { index: number }) {
  return (
    <svg
      className={styles.route}
      style={{ insetInlineStart: `calc(var(--u) * ${-100 * index})` }}
      viewBox="0 0 300 132"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className={styles.routePath}
        d="M -6 70 C 14 40, 40 14, 70 20 S 96 30, 108 16 S 140 -2, 160 14 S 190 26, 214 12 S 232 4, 250 22"
      />
      <circle className={styles.routePin} cx="70" cy="20" r="2.2" />
      <circle className={styles.routePin} cx="108" cy="16" r="2.2" />
      <circle className={styles.routePin} cx="214" cy="12" r="2.2" />
    </svg>
  );
}

function Strip({ className }: { className: string }) {
  return (
    <div className={className} aria-hidden="true">
      {BANDS.map((f, k) => (
        <span key={k} className={styles.band} style={{ '--f': f, '--o': k % 2 ? 0.5 : 0 } as CSSProperties} />
      ))}
    </div>
  );
}

function Duo({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={cx(styles.duo, className)}>
      {src ? <img className={styles.duoImg} src={src} alt={alt} draggable={false} /> : null}
      <span className={styles.duoTone} aria-hidden="true" />
      <span className={styles.duoDots} aria-hidden="true" />
    </div>
  );
}

export default function BrochureUnfoldCard({
  panels = defaultPanels,
  className,
}: BrochureUnfoldCardProps) {
  const items = (panels.length ? panels : defaultPanels).slice(0, 3);
  const count = items.length;

  const [step, setStep] = useState(1);
  const [reduced, setReduced] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sim = useRef<Sim>({ a2: FOLDED, v2: 0, a3: FOLDED, v3: 0, rx: REST_RX, vrx: 0, ry: REST_RY, vry: 0 });
  const stepRef = useRef(1);
  const countRef = useRef(count);
  const reducedRef = useRef(false);
  const inViewRef = useRef(true);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const tilt = useRef({ x: 0, y: 0 });
  const touched = useRef(false);
  const introDone = useRef(false);
  const introTimer = useRef(0);
  const down = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  countRef.current = count;

  const paint = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const s = sim.current;
    const n = countRef.current;
    const x2 = 1 + Math.cos(s.a2 * RAD);
    const x3 = x2 + Math.cos((s.a2 - s.a3) * RAD);
    let lo = 0;
    let hi = 1;
    if (n >= 2) {
      lo = Math.min(lo, x2);
      hi = Math.max(hi, x2);
    }
    if (n >= 3) {
      lo = Math.min(lo, x3);
      hi = Math.max(hi, x3);
    }
    const set = (k: string, v: string) => stage.style.setProperty(k, v);
    set('--a2', s.a2.toFixed(2));
    set('--a3', s.a3.toFixed(2));
    set('--sh2', ((1 - Math.cos(s.a2 * RAD)) / 2).toFixed(3));
    set('--sh3', ((1 - Math.cos(s.a3 * RAD)) / 2).toFixed(3));
    set('--x0', lo.toFixed(3));
    set('--x1', hi.toFixed(3));
    set('--ext', (hi - lo).toFixed(3));
    set('--sx', (1.5 - (lo + hi) / 2).toFixed(3));
    set('--sy', (-lo).toFixed(3));
    set('--rx', s.rx.toFixed(2));
    set('--ry', s.ry.toFixed(2));
  }, []);

  const tick = useCallback(
    (now: number) => {
      rafRef.current = 0;
      const s = sim.current;
      const dt = Math.min((now - lastRef.current) / 1000, 1 / 30);
      lastRef.current = now;
      const st = stepRef.current;
      const t3 = st >= 3 ? (s.a2 < 110 ? 0 : FOLDED) : FOLDED;
      const t2 = st >= 2 ? 0 : s.a3 > 90 ? FOLDED : 0;
      const lean = clamp((s.v2 + s.v3) * 0.004, -5, 5);
      const trx = REST_RX - tilt.current.y * 3.5;
      const tryy = REST_RY + tilt.current.x * 5 - lean;
      const sub = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / sub;
      for (let k = 0; k < sub; k++) {
        s.v2 += (STIFFNESS * (t2 - s.a2) - DAMPING * s.v2) * h;
        s.a2 += s.v2 * h;
        s.v3 += (STIFFNESS * (t3 - s.a3) - DAMPING * s.v3) * h;
        s.a3 += s.v3 * h;
        s.vrx += (TILT_STIFFNESS * (trx - s.rx) - TILT_DAMPING * s.vrx) * h;
        s.rx += s.vrx * h;
        s.vry += (TILT_STIFFNESS * (tryy - s.ry) - TILT_DAMPING * s.vry) * h;
        s.ry += s.vry * h;
        if (s.a2 > MAX_ANGLE) {
          s.a2 = MAX_ANGLE;
          if (s.v2 > 0) s.v2 = 0;
        } else if (s.a2 < MIN_ANGLE) {
          s.a2 = MIN_ANGLE;
          if (s.v2 < 0) s.v2 = 0;
        }
        if (s.a3 > MAX_ANGLE) {
          s.a3 = MAX_ANGLE;
          if (s.v3 > 0) s.v3 = 0;
        } else if (s.a3 < MIN_ANGLE) {
          s.a3 = MIN_ANGLE;
          if (s.v3 < 0) s.v3 = 0;
        }
      }
      paint();
      const settled =
        Math.abs(t2 - s.a2) < 0.05 &&
        Math.abs(t3 - s.a3) < 0.05 &&
        Math.abs(s.v2) < 0.2 &&
        Math.abs(s.v3) < 0.2 &&
        Math.abs(trx - s.rx) < 0.02 &&
        Math.abs(tryy - s.ry) < 0.02 &&
        Math.abs(s.vrx) < 0.05 &&
        Math.abs(s.vry) < 0.05;
      if (!settled && inViewRef.current && !reducedRef.current) rafRef.current = requestAnimationFrame(tick);
    },
    [paint],
  );

  const kick = useCallback(() => {
    if (rafRef.current || reducedRef.current || !inViewRef.current) return;
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const goTo = useCallback(
    (next: number, byUser: boolean) => {
      if (reducedRef.current) return;
      if (byUser) touched.current = true;
      const n = clamp(next, 1, countRef.current);
      stepRef.current = n;
      setStep(n);
      kick();
    },
    [kick],
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      reducedRef.current = mq.matches;
      setReduced(mq.matches);
      const stage = stageRef.current;
      if (mq.matches) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
        const s = sim.current;
        s.a2 = 0;
        s.a3 = 0;
        s.v2 = 0;
        s.v3 = 0;
        s.rx = 0;
        s.ry = 0;
        s.vrx = 0;
        s.vry = 0;
        stepRef.current = countRef.current;
        setStep(countRef.current);
        stage?.removeAttribute('style');
      } else {
        paint();
      }
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [paint]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const arrive = () => {
      inViewRef.current = true;
      kick();
      if (introDone.current) return;
      introDone.current = true;
      introTimer.current = window.setTimeout(() => {
        if (!touched.current) goTo(countRef.current, false);
      }, INTRO_DELAY_MS);
    };
    if (typeof IntersectionObserver === 'undefined') {
      arrive();
      return () => window.clearTimeout(introTimer.current);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          arrive();
        } else {
          inViewRef.current = false;
          window.cancelAnimationFrame(rafRef.current);
          rafRef.current = 0;
        }
      },
      { threshold: 0.2 },
    );
    io.observe(root);
    return () => {
      io.disconnect();
      window.clearTimeout(introTimer.current);
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [kick, goTo]);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    down.current = { x: e.clientX, y: e.clientY };
    swiped.current = false;
  };

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const d = down.current;
    down.current = null;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.2) {
      swiped.current = true;
      goTo(stepRef.current + (dx < 0 ? 1 : -1), true);
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== 'mouse' || reducedRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    tilt.current.x = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    tilt.current.y = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    kick();
  };

  const onPointerLeave = () => {
    down.current = null;
    tilt.current.x = 0;
    tilt.current.y = 0;
    kick();
  };

  const onClick = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    goTo(stepRef.current >= countRef.current ? 1 : stepRef.current + 1, true);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const st = stepRef.current;
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = st + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = st - 1;
    else if (e.key === 'Home') next = 1;
    else if (e.key === 'End') next = countRef.current;
    if (next === null) return;
    e.preventDefault();
    goTo(next, true);
  };

  const frontShade = (i: number): CSSProperties => ({ '--shv': i === 1 ? 'var(--sh2, 1)' : 'var(--sh3, 1)' }) as CSSProperties;

  const renderFront = (i: number, open: boolean): ReactNode => {
    const p = items[i];
    const title = p.title ?? '';
    const text = p.text ?? '';
    const image = p.image ?? '';
    const alt = p.imageAlt ?? '';
    if (i === 0) {
      return (
        <div className={cx(styles.front, styles.front0)}>
          <span className={styles.paperDots} aria-hidden="true" />
          <div className={styles.sun}>
            <Duo src={image} alt={alt} className={styles.fill} />
          </div>
          <Route index={0} />
          <Strip className={styles.strip0} />
          <div className={styles.block0}>
            <h3 className={styles.coverTitle} style={{ '--ts': fit(title, [11, 18, 28, 48]) } as CSSProperties}>
              {title}
            </h3>
            {text && <p className={styles.coverText}>{text}</p>}
          </div>
          <span className={styles.lip} aria-hidden="true" />
        </div>
      );
    }
    if (i === 1) {
      return (
        <div className={cx(styles.front, styles.front1)} style={frontShade(1)}>
          <span className={styles.paperDots} aria-hidden="true" />
          <Route index={1} />
          <div className={styles.copy1}>
            <h3
              style={{ '--ts': fit(title, [16, 26, 40, 64]), '--rd': '380ms' } as CSSProperties}
              className={cx(styles.title1, styles.reveal, open && styles.revealOn)}
            >
              {title}
            </h3>
            <span className={cx(styles.rule, styles.reveal, open && styles.revealOn)} style={{ '--rd': '450ms' } as CSSProperties} aria-hidden="true" />
            {text && (
              <p className={cx(styles.text1, styles.reveal, open && styles.revealOn)} style={{ '--rd': '520ms' } as CSSProperties}>
                {text}
              </p>
            )}
          </div>
          <span className={styles.disc1} aria-hidden="true" />
          <Strip className={styles.strip1} />
          <span className={styles.base1} aria-hidden="true" />
          <div className={cx(styles.archWrap, styles.reveal, styles.rise, open && styles.revealOn)} style={{ '--rd': '300ms' } as CSSProperties}>
            <Duo src={image} alt={alt} className={styles.arch} />
          </div>
          <span className={styles.crease} aria-hidden="true" />
          <span className={styles.lip} aria-hidden="true" />
          <span className={styles.shade} aria-hidden="true" />
        </div>
      );
    }
    return (
      <div className={cx(styles.front, styles.front2)} style={frontShade(2)}>
        <span className={styles.paperDots} aria-hidden="true" />
        <Route index={2} />
        <Strip className={styles.strip0} />
        <div className={cx(styles.stampWrap, styles.reveal, styles.rise, open && styles.revealOn)} style={{ '--rd': '300ms' } as CSSProperties}>
          <div className={styles.stamp}>
            <Duo src={image} alt={alt} className={styles.stampPic} />
          </div>
          <svg className={styles.postmark} viewBox="0 0 36 22" aria-hidden="true" focusable="false">
            <path d="M0 4 q3 -3 6 0 t6 0 t6 0 t6 0 t6 0 t6 0" />
            <path d="M0 9 q3 -3 6 0 t6 0 t6 0 t6 0 t6 0 t6 0" />
            <path d="M0 14 q3 -3 6 0 t6 0 t6 0 t6 0 t6 0 t6 0" />
            <path d="M0 19 q3 -3 6 0 t6 0 t6 0 t6 0 t6 0 t6 0" />
          </svg>
        </div>
        <div className={styles.block2}>
          <h3
            className={cx(styles.title2, styles.reveal, open && styles.revealOn)}
            style={{ '--ts': fit(title, [16, 26, 40, 64]), '--rd': '420ms' } as CSSProperties}
          >
            {title}
          </h3>
          {text && (
            <p className={cx(styles.text2, styles.reveal, open && styles.revealOn)} style={{ '--rd': '500ms' } as CSSProperties}>
              {text}
            </p>
          )}
        </div>
        <span className={styles.crease} aria-hidden="true" />
        <span className={styles.shade} aria-hidden="true" />
      </div>
    );
  };

  const renderPanel = (i: number): ReactNode => {
    const open = i < step;
    return (
      <div key={i} className={cx(styles.panel, styles[`panel${i}`])} aria-hidden={open ? undefined : true}>
        {renderFront(i, open)}
        <div className={styles.back} aria-hidden="true">
          <span className={styles.backDots} />
        </div>
        {i + 1 < count ? renderPanel(i + 1) : null}
      </div>
    );
  };

  const label = step < count ? `Unfold panel ${step + 1} of ${count}` : 'Fold the brochure closed';

  return (
    <div
      ref={rootRef}
      className={cx(styles.root, className)}
      role="group"
      aria-roledescription="brochure"
      aria-label={items[0]?.title || 'Brochure'}
    >
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.slide}>
          <span className={styles.floor} aria-hidden="true" />
          <div className={styles.book}>{renderPanel(0)}</div>
        </div>
        {!reduced && count > 1 && (
          <button
            type="button"
            className={styles.hit}
            aria-label={label}
            aria-description={HELP}
            aria-expanded={step > 1}
            onClick={onClick}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            onPointerCancel={onPointerLeave}
          />
        )}
      </div>
    </div>
  );
}
```

```css
.root {
  --bc-font: 'Epilogue', 'Helvetica Neue', Arial, sans-serif;
  container-type: inline-size;
  position: relative;
  box-sizing: border-box;
  inline-size: 100%;
  overflow: hidden;
  font-family: var(--bc-font);
  color: #2f3b17;
  background-color: #161b0e;
  background-image: radial-gradient(70% 80% at 50% 38%, rgba(255, 255, 255, 0.22) 0%, transparent 100%);
  -webkit-font-smoothing: antialiased;
}

.stage {
  --w: min(calc((100cqi - 8cqi) / 3), 430px);
  --u: calc(var(--w) / 100);
  --h: calc(var(--w) * 1.32);
  --cell: calc(var(--u) * 2.2);
  --dir-in: 90deg;
  --a2: 180;
  --a3: 180;
  --sh2: 1;
  --sh3: 1;
  --sx: 1;
  --sy: 0;
  --x0: 0;
  --x1: 1;
  --ext: 1;
  --rx: 4;
  --ry: -3;
  position: relative;
  box-sizing: border-box;
  display: grid;
  justify-content: center;
  padding-block: calc(var(--w) * 0.17);
}

.slide {
  position: relative;
  inline-size: calc(var(--w) * 3);
  block-size: var(--h);
  perspective: calc(var(--w) * 5);
}

.floor {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: calc((var(--x0) + var(--sx)) * var(--w));
  inline-size: calc((var(--x1) - var(--x0)) * var(--w));
  block-size: var(--h);
  border-radius: calc(var(--u) * 0.4);
  box-shadow:
    0 calc(var(--u) * 6) calc(var(--u) * 10) calc(var(--u) * -1.5) rgba(0, 0, 0, 0.6),
    0 calc(var(--u) * 1.4) calc(var(--u) * 2.6) rgba(0, 0, 0, 0.4);
}

.book {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: rotateX(calc(var(--rx) * 1deg)) rotateY(calc(var(--ry) * 1deg)) translateX(calc(var(--sx) * var(--w)));
  will-change: transform;
}

/* panels: nested hinges (panel 2 hangs off panel 1, panel 3 off panel 2) */
.panel {
  position: absolute;
  inline-size: var(--w);
  block-size: var(--h);
  transform-style: preserve-3d;
}

.panel0 {
  inset-block-start: 0;
  inset-inline-start: 0;
}

.panel1 {
  inset-block-start: 0;
  inset-inline-start: 100%;
  transform-origin: left center;
  transform: translateZ(-1px) rotateY(calc(var(--a2) * 1deg));
}

.panel2 {
  inset-block-start: 0;
  inset-inline-start: 100%;
  transform-origin: left center;
  transform: translateZ(1px) rotateY(calc(var(--a3) * -1deg));
}

.front,
.back {
  position: absolute;
  inset: 0;
  overflow: hidden;
  backface-visibility: hidden;
  border-radius: calc(var(--u) * 0.35);
}

.front {
  isolation: isolate;
  background:
    radial-gradient(120% 90% at 18% 8%, rgba(255, 255, 255, 0.28), transparent 62%),
    #e7d8b4;
  box-shadow: inset 0 0 0 calc(var(--u) * 0.2) rgba(40, 28, 6, 0.1);
}

.front2 {
  background:
    radial-gradient(120% 90% at 18% 8%, rgba(255, 255, 255, 0.2), transparent 62%),
    #f2a35f;
}

.back {
  transform: rotateY(180deg);
  background: #2f3b17;
  box-shadow: inset 0 0 0 calc(var(--u) * 0.2) rgba(255, 255, 255, 0.08);
}

.backDots {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(
    circle at 50% 50%,
    color-mix(in srgb, #f2a35f 55%, transparent) calc(var(--cell) * 0.2),
    transparent calc(var(--cell) * 0.2 + 0.6px)
  );
  background-size: var(--cell) var(--cell);
}

.paperDots {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(
    circle at 50% 50%,
    color-mix(in srgb, #2f3b17 10%, transparent) 0.7px,
    transparent 1.1px
  );
  background-size: calc(var(--u) * 1.1) calc(var(--u) * 1.1);
}

/* printed route line, continuous across all three panels */
.route {
  position: absolute;
  inset-block-start: 0;
  inline-size: calc(var(--u) * 300);
  block-size: calc(var(--u) * 132);
  overflow: visible;
  pointer-events: none;
}

.routePath {
  fill: none;
  stroke: #2f3b17;
  stroke-width: 0.9;
  stroke-linecap: round;
  stroke-dasharray: 0.1 2.6;
}

.routePin {
  fill: #f2a35f;
  stroke: #2f3b17;
  stroke-width: 0.7;
}

/* halftone dot ramp */
.strip0 {
  position: absolute;
  inset-inline: 0;
  inset-block-end: calc(var(--u) * 65);
  display: block;
}

.strip1 {
  position: absolute;
  inset-inline: 0;
  inset-block-end: calc(var(--u) * 5);
  display: block;
}

.band {
  display: block;
  block-size: var(--cell);
  background-image: radial-gradient(
    circle at 50% 50%,
    #2f3b17 calc(var(--cell) * var(--f)),
    transparent calc(var(--cell) * var(--f) + 0.7px)
  );
  background-size: var(--cell) var(--cell);
  background-position: calc(var(--cell) * var(--o)) 0;
}

/* duotone photo: olive shadows, apricot highlights, printed dot screen */
.duo {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: inherit;
  background: #f2a35f;
}

.fill {
  inline-size: 100%;
  block-size: 100%;
}

.duoImg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  filter: grayscale(1) contrast(1.12) brightness(1.18);
  mix-blend-mode: multiply;
}

.duoTone {
  position: absolute;
  inset: 0;
  background: #2f3b17;
  mix-blend-mode: lighten;
}

.duoDots {
  --c2: calc(var(--u) * 1.25);
  position: absolute;
  inset: 0;
  background-image: radial-gradient(
    circle at 50% 50%,
    color-mix(in srgb, #2f3b17 34%, transparent) calc(var(--c2) * 0.27),
    transparent calc(var(--c2) * 0.27 + 0.6px)
  );
  background-size: var(--c2) var(--c2);
}

/* cover */
.sun {
  position: absolute;
  inset-inline-start: calc(var(--u) * 16);
  inset-block-start: calc(var(--u) * 8);
  inline-size: calc(var(--u) * 68);
  block-size: calc(var(--u) * 68);
  border-radius: 50%;
  box-shadow:
    0 0 0 calc(var(--u) * 1.8) #e7d8b4,
    0 0 0 calc(var(--u) * 2.3) #2f3b17;
}

.block0 {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  box-sizing: border-box;
  block-size: calc(var(--u) * 65);
  padding: calc(var(--u) * 5) calc(var(--u) * 8) calc(var(--u) * 7);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: calc(var(--u) * 3);
  background: #2f3b17;
  color: #e7d8b4;
  border-block-start: calc(var(--u) * 0.6) solid #f2a35f;
}

.coverTitle {
  margin: 0;
  padding-block-end: 0.06em;
  font-size: calc(var(--u) * 15.5 * var(--ts, 1));
  line-height: 0.98;
  font-weight: 800;
  letter-spacing: -0.045em;
  text-wrap: balance;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.coverText {
  margin: 0;
  font-size: max(13px, calc(var(--u) * 4.1));
  line-height: 1.45;
  font-weight: 450;
  color: color-mix(in srgb, #e7d8b4 88%, transparent);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  overflow-wrap: anywhere;
}

/* middle panel */
.copy1 {
  position: absolute;
  inset-inline: calc(var(--u) * 8);
  inset-block-start: calc(var(--u) * 25);
  block-size: calc(var(--u) * 56);
  display: flex;
  flex-direction: column;
  gap: calc(var(--u) * 3);
  overflow: hidden;
}

.title1 {
  margin: 0;
  flex: none;
  padding-block-end: 0.06em;
  font-size: calc(var(--u) * 11 * var(--ts, 1));
  line-height: 1;
  font-weight: 800;
  letter-spacing: -0.04em;
  text-wrap: balance;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.rule {
  display: block;
  flex: none;
  inline-size: calc(var(--u) * 12);
  block-size: calc(var(--u) * 1);
  border-radius: calc(var(--u) * 1);
  background: #f2a35f;
}

.text1 {
  margin: 0;
  font-size: max(13px, calc(var(--u) * 4.1));
  line-height: 1.5;
  font-weight: 450;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.disc1 {
  position: absolute;
  inset-inline-start: calc(var(--u) * 9);
  inset-block-end: calc(var(--u) * 33);
  inline-size: calc(var(--u) * 15);
  block-size: calc(var(--u) * 15);
  border-radius: 50%;
  background: #f2a35f;
}

.base1 {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  block-size: calc(var(--u) * 5);
  background: #2f3b17;
}

.archWrap {
  position: absolute;
  inset-inline-end: calc(var(--u) * 8);
  inset-block-end: 0;
  inline-size: calc(var(--u) * 50);
  block-size: calc(var(--u) * 50);
}

.arch {
  inline-size: 100%;
  block-size: 100%;
  border-start-start-radius: calc(var(--u) * 25);
  border-start-end-radius: calc(var(--u) * 25);
  border-end-start-radius: 0;
  border-end-end-radius: 0;
  box-shadow:
    0 0 0 calc(var(--u) * 1.6) #e7d8b4,
    0 0 0 calc(var(--u) * 2.1) #2f3b17;
}

/* right panel */
.stampWrap {
  position: absolute;
  inset-inline-start: calc(var(--u) * 24);
  inset-block-start: calc(var(--u) * 10);
  inline-size: calc(var(--u) * 50);
  block-size: calc(var(--u) * 56);
}

.stamp {
  box-sizing: border-box;
  inline-size: 100%;
  block-size: 100%;
  padding: calc(var(--u) * 3.4);
  rotate: -3.5deg;
  background: #e7d8b4;
  box-shadow:
    0 calc(var(--u) * 2.2) calc(var(--u) * 4) rgba(60, 30, 4, 0.4),
    0 0 0 calc(var(--u) * 0.2) rgba(0, 0, 0, 0.1);
}

.stampPic {
  inline-size: 100%;
  block-size: 100%;
  border-radius: 0;
}

.postmark {
  position: absolute;
  inset-inline-start: calc(var(--u) * 32);
  inset-block-start: calc(var(--u) * 18);
  inline-size: calc(var(--u) * 36);
  block-size: calc(var(--u) * 22);
  rotate: -9deg;
  fill: none;
  stroke: #2f3b17;
  stroke-width: 0.55;
  stroke-linecap: round;
  overflow: visible;
}

.block2 {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  box-sizing: border-box;
  block-size: calc(var(--u) * 65);
  padding: calc(var(--u) * 6) calc(var(--u) * 8) calc(var(--u) * 7);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: calc(var(--u) * 3);
  background: #2f3b17;
  color: #e7d8b4;
}

.title2 {
  margin: 0;
  padding-block-end: 0.06em;
  font-size: calc(var(--u) * 10.5 * var(--ts, 1));
  line-height: 1;
  font-weight: 800;
  letter-spacing: -0.04em;
  text-wrap: balance;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.text2 {
  margin: 0;
  font-size: max(13px, calc(var(--u) * 4.1));
  line-height: 1.5;
  font-weight: 450;
  color: #f2a35f;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
  overflow-wrap: anywhere;
}

/* crease shading, fold highlight and angle shading */
.crease {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: calc(var(--u) * 8);
  pointer-events: none;
  background: linear-gradient(var(--dir-in), rgba(28, 20, 4, 0.34), rgba(28, 20, 4, 0.1) 40%, transparent);
}

.lip {
  position: absolute;
  inset-block: 0;
  inset-inline-end: 0;
  inline-size: calc(var(--u) * 1.4);
  pointer-events: none;
  background: linear-gradient(to left, rgba(255, 255, 255, 0.34), transparent);
}

.shade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: var(--shv, 0);
  background: linear-gradient(var(--dir-in), rgba(18, 12, 2, 0.7), rgba(18, 12, 2, 0.22));
}

/* content reveal once a panel lies flat */
.reveal {
  opacity: 0;
  translate: 0 calc(var(--u) * 2.4);
  transition:
    opacity 380ms cubic-bezier(0.3, 0, 0.7, 1),
    translate 380ms cubic-bezier(0.3, 0, 0.7, 1);
}

.rise {
  translate: 0 calc(var(--u) * 12);
}

.revealOn {
  opacity: 1;
  translate: 0 0;
  transition:
    opacity 480ms cubic-bezier(0.2, 0.7, 0.2, 1) var(--rd, 0ms),
    translate 720ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms);
}

/* interaction layer */
.hit {
  position: absolute;
  inset: 0;
  z-index: 4;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: calc(var(--u) * 2);
  background: transparent;
  cursor: pointer;
  touch-action: pan-y;
  -webkit-tap-highlight-color: transparent;
}

.hit:focus-visible {
  outline: 2px solid #f2a35f;
  outline-offset: -6px;
}

/* narrow containers: panels unfold downward, one by one */
@container (max-width: 999px) {
  .stage {
    --w: min(calc(100cqi - 12cqi), 440px);
    --dir-in: 180deg;
    padding-block: calc(var(--w) * 0.1);
  }

  .slide {
    inline-size: var(--w);
    block-size: calc(var(--ext) * var(--h));
  }

  .floor {
    inset-inline-start: 0;
    inset-block-start: calc((var(--x0) + var(--sy)) * var(--h));
    inline-size: var(--w);
    block-size: calc((var(--x1) - var(--x0)) * var(--h));
  }

  .book {
    transform: rotateX(calc(var(--rx) * 1deg)) rotateY(calc(var(--ry) * 1deg)) translateY(calc(var(--sy) * var(--h)));
  }

  .panel1 {
    inset-inline-start: 0;
    inset-block-start: 100%;
    transform-origin: center top;
    transform: translateZ(-1px) rotateX(calc(var(--a2) * -1deg));
  }

  .panel2 {
    inset-inline-start: 0;
    inset-block-start: 100%;
    transform-origin: center top;
    transform: translateZ(1px) rotateX(calc(var(--a3) * 1deg));
  }

  .crease {
    inset-inline: 0;
    inset-block: 0 auto;
    inline-size: auto;
    block-size: calc(var(--u) * 8);
  }

  .lip {
    inset-inline: 0;
    inset-block: auto 0;
    inline-size: auto;
    block-size: calc(var(--u) * 1.4);
    background: linear-gradient(to top, rgba(255, 255, 255, 0.34), transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .stage {
    --a2: 0;
    --a3: 0;
    --sh2: 0;
    --sh3: 0;
    --sx: 0;
    --sy: 0;
    --x0: 0;
    --x1: 3;
    --ext: 3;
    --rx: 0;
    --ry: 0;
  }

  .reveal,
  .rise,
  .revealOn {
    opacity: 1;
    translate: 0 0;
    transition: none;
  }

  .book {
    will-change: auto;
  }
}
```
