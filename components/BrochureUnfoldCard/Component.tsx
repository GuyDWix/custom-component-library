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
