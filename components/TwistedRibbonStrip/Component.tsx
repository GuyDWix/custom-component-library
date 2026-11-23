import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import styles from './Component.module.css';

export interface RibbonPhoto {
  image: string;
  caption: string;
}

export interface TwistedRibbonStripProps {
  photos?: RibbonPhoto[];
  /** Glide speed in pixels per second. 0 shows a still ribbon. */
  speed?: number;
  /** How far the ribbon twists at its ends, in degrees (30–96). */
  twistAmount?: number;
  className?: string;
}

const DEFAULT_PHOTOS: RibbonPhoto[] = [
  {
    image:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=640&h=840&fit=crop&crop=faces&auto=format',
    caption: 'Amara Okonkwo — silk study, north light',
  },
  {
    image:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=640&h=840&fit=crop&crop=faces&auto=format',
    caption: 'Jonas Reyes — harbour sessions',
  },
  {
    image:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=640&h=840&fit=crop&crop=faces&auto=format',
    caption: 'Mei Tanaka — silk series no. 4',
  },
  {
    image:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=640&h=840&fit=crop&crop=faces&auto=format',
    caption: 'Elias Brandt — winter portraits, Berlin',
  },
  {
    image:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=640&h=840&fit=crop&crop=faces&auto=format',
    caption: 'Sofia Marchetti — atelier visit, Milan',
  },
  {
    image:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=640&h=840&fit=crop&crop=faces&auto=format',
    caption: 'Noa Kim — rooftop study, golden hour',
  },
];

const REPEAT = 3;
const PANEL_RATIO = 1.3;
const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const pad2 = (n: number) => String(n).padStart(2, '0');

const STRIP_HELP =
  'Photo ribbon. Drag or swipe to move it, hover slows it down, arrow keys step between photos.';

type Tween = { from: number; to: number; start: number } | null;

export default function TwistedRibbonStrip({
  photos = DEFAULT_PHOTOS,
  speed = 42,
  twistAmount = 80,
  className,
}: TwistedRibbonStripProps) {
  const list = photos.length > 0 ? photos : DEFAULT_PHOTOS;
  const n = list.length;
  const panelCount = n * REPEAT;

  const [reduced, setReduced] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [width, setWidth] = useState(960);
  const [centreIdx, setCentreIdx] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<Array<HTMLDivElement | null>>([]);
  const setPanel = useCallback(
    (i: number) => (el: HTMLDivElement | null) => {
      panelsRef.current[i] = el;
    },
    []
  );

  const offsetRef = useRef(0);
  const velRef = useRef(0);
  const slowRef = useRef(1);
  const draggingRef = useRef(false);
  const hoveredRef = useRef(false);
  const playingRef = useRef(true);
  const inViewRef = useRef(true);
  const tweenRef = useRef<Tween>(null);
  const introStartRef = useRef<number | null>(null);
  const lastCentreRef = useRef(0);
  const pointerRef = useRef({ x: 0, t: 0, vel: 0 });

  // Layout parameters, recomputed on every render; the rAF loop reads them via ref.
  const params = useMemo(() => {
    const small = width < 480;
    const spacing = clamp(width / 4.6, 148, 300);
    const panelW = spacing * 0.94;
    const halfSpan = width / 2 + panelW * 0.75;
    const twist = clamp(twistAmount, 30, 96) * (small ? 0.72 : 1);
    return {
      spacing,
      panelW,
      halfSpan,
      loop: panelCount * spacing,
      twistRight: twist,
      twistLeft: twist + 18,
      depth: 80 + width * 0.04,
      speedPx: clamp(speed, 0, 140) * (small ? 0.55 : 1),
    };
  }, [width, twistAmount, speed, panelCount]);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  playingRef.current = playing;

  // Reduced motion: switch to the flat, scroll-snapped strip.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Size to the container.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && Math.abs(w - width) > 1) setWidth(w);
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [width]);

  // Pause the loop while off-screen.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        inViewRef.current = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  // The ribbon loop: glide + twist + sheen + inertia + keyboard tweens.
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let last = performance.now();

    const step = (now: number) => {
      const p = paramsRef.current;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (introStartRef.current === null) introStartRef.current = now;
      const elapsed = now - introStartRef.current;

      // Speed easing: hover slows to a drift, pause and drag stop the glide.
      const slowTarget = draggingRef.current ? 0 : hoveredRef.current || !playingRef.current ? 0.12 : 1;
      slowRef.current += (slowTarget - slowRef.current) * Math.min(1, dt * 5);

      const tw = tweenRef.current;
      if (tw) {
        const k = clamp((now - tw.start) / 420, 0, 1);
        offsetRef.current = tw.from + (tw.to - tw.from) * EASE_OUT(k);
        if (k >= 1) tweenRef.current = null;
        velRef.current = 0;
      } else {
        offsetRef.current += p.speedPx * slowRef.current * dt + velRef.current * dt;
        velRef.current *= Math.exp(-dt * 3.4);
      }

      // Centre photo caption.
      const k = Math.round(offsetRef.current / p.spacing);
      const centre = ((k % n) + n) % n;
      if (centre !== lastCentreRef.current) {
        lastCentreRef.current = centre;
        setCentreIdx(centre);
      }

      if (inViewRef.current) {
        const introDone = elapsed > 120 + panelCount * 40 + 700;
        for (let i = 0; i < panelCount; i++) {
          const el = panelsRef.current[i];
          if (!el) continue;
          const raw = i * p.spacing - offsetRef.current;
          const c = (((raw % p.loop) + p.loop) % p.loop) - p.loop / 2;
          const t = c / p.halfSpan;
          const at = Math.abs(t);
          if (at > 1.35) {
            el.style.opacity = '0';
            continue;
          }
          let op = at > 0.82 ? clamp((1 - at) / 0.18, 0, 1) : 1;
          let lift = 0;
          let extra = 0;
          if (!introDone) {
            const ip = EASE_OUT(clamp((elapsed - 120 - i * 40) / 640, 0, 1));
            op *= ip;
            lift = (1 - ip) * 34;
            extra = (1 - ip) * -26;
          }
          const angle = (t >= 0 ? t * p.twistRight : t * p.twistLeft) + extra;
          const z = -p.depth * t * t;
          const y = t * t * 10 + lift;
          el.style.transform = `translate(-50%, -50%) translate3d(${c.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${angle.toFixed(2)}deg)`;
          el.style.opacity = op.toFixed(3);
          el.style.setProperty('--shine', `${clamp(50 + t * 58, 0, 100).toFixed(1)}%`);
          el.style.setProperty('--shadow-o', (0.34 * Math.pow(Math.max(0, 1 - at), 1.5) * (op || 0)).toFixed(3));
        }
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduced, n, panelCount]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    draggingRef.current = true;
    tweenRef.current = null;
    velRef.current = 0;
    pointerRef.current = { x: e.clientX, t: performance.now(), vel: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const now = performance.now();
    const dx = e.clientX - pointerRef.current.x;
    const dtm = Math.max(now - pointerRef.current.t, 1);
    offsetRef.current -= dx;
    pointerRef.current.vel = pointerRef.current.vel * 0.6 + (-dx / dtm) * 1000 * 0.4;
    pointerRef.current.x = e.clientX;
    pointerRef.current.t = now;
  }, []);

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    velRef.current = clamp(pointerRef.current.vel, -2200, 2200);
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const p = paramsRef.current;
      const tw = tweenRef.current;
      const from = tw ? tw.to : offsetRef.current;
      tweenRef.current = { from, to: from + p.spacing * dir, start: performance.now() };
    },
    []
  );

  const stageStyle = {
    '--pw': `${params.panelW.toFixed(1)}px`,
    blockSize: `${Math.round(params.panelW * PANEL_RATIO + 96)}px`,
  } as CSSProperties;

  const caption = list[centreIdx]?.caption ?? '';

  if (reduced) {
    return (
      <div className={`${styles.root} ${className ?? ''}`} ref={rootRef}>
        <div
          className={styles.staticScroll}
          tabIndex={0}
          role="list"
          aria-label={`Photo strip. ${STRIP_HELP}`}
        >
          {list.map((photo, i) => (
            <figure className={styles.staticCard} role="listitem" key={i}>
              <div className={styles.staticMat}>
                {photo.image ? (
                  <img className={styles.staticImg} src={photo.image} alt={photo.caption} loading="lazy" />
                ) : (
                  <div className={styles.staticEmpty}>{photo.caption}</div>
                )}
              </div>
              <figcaption className={styles.staticCaption}>
                <span className={styles.counter}>{pad2(i + 1)} / {pad2(n)}</span>
                <span>{photo.caption}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className={styles.grain} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={`${styles.root} ${className ?? ''}`} ref={rootRef}>
      <div
        className={styles.stage}
        ref={stageRef}
        style={stageStyle}
        tabIndex={0}
        role="group"
        aria-label={STRIP_HELP}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerEnter={() => {
          hoveredRef.current = true;
        }}
        onPointerLeave={() => {
          hoveredRef.current = false;
        }}
      >
        <div className={styles.ribbonShadow} aria-hidden="true" />
        {Array.from({ length: panelCount }, (_, i) => {
          const photo = list[i % n];
          return (
            <div className={styles.panel} key={i} ref={setPanel(i)}>
              <div className={styles.faceFront}>
                <div className={styles.mat}>
                  {photo.image ? (
                    <img className={styles.photo} src={photo.image} alt={photo.caption} loading="lazy" draggable={false} />
                  ) : (
                    <div className={styles.photoAlt}>{photo.caption}</div>
                  )}
                </div>
                <div className={styles.sheen} aria-hidden="true" />
              </div>
              <div className={styles.faceBack} aria-hidden="true">
                <div className={styles.sheen} />
              </div>
            </div>
          );
        })}
        <button
          type="button"
          className={styles.pauseButton}
          aria-label={playing ? 'Pause the ribbon' : 'Play the ribbon'}
          onClick={() => setPlaying((v) => !v)}
        >
          {playing ? (
            <svg className={styles.pauseIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            </svg>
          ) : (
            <svg className={styles.pauseIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>
      <div className={styles.captionRow}>
        <span className={styles.captionText} key={centreIdx} aria-live={playing ? 'off' : 'polite'}>
          {caption}
        </span>
        <span className={styles.counter} aria-hidden="true">
          {pad2(centreIdx + 1)} / {pad2(n)}
        </span>
      </div>
      <div className={styles.grain} aria-hidden="true" />
    </div>
  );
}
