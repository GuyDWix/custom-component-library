import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import styles from './Component.module.css';

export interface FilmStripPhoto {
  image: string;
  caption?: string;
}

export interface FilmStripScrubberProps {
  photos?: FilmStripPhoto[];
  frameRatio?: '16:9' | '3:2' | '4:3' | '1:1';
  filmLabel?: string;
  className?: string;
}

export const defaultPhotos: FilmStripPhoto[] = [
  {
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1080&h=720&fit=crop&crop=faces',
    caption: 'Amara — key light test, 85mm',
  },
  {
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&h=720&fit=crop&crop=faces',
    caption: 'Jonah — north window, f/2.8',
  },
  {
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1080&h=720&fit=crop&crop=faces',
    caption: 'Mira — felt hat, roll 07',
  },
  {
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1080&h=720&fit=crop&crop=faces',
    caption: 'Teo — beard study, silver dish',
  },
  {
    image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1080&h=720&fit=crop&crop=faces',
    caption: 'June — tangerine backdrop',
  },
  {
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1080&h=720&fit=crop&crop=faces',
    caption: 'Rosa — grey seamless, 50mm',
  },
  {
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1080&h=720&fit=crop&crop=faces',
    caption: 'Ada — natural smile, frame 12A',
  },
];

const RATIO: Record<string, { ratio: string; w: number }> = {
  '16:9': { ratio: '16 / 9', w: 16 / 9 },
  '3:2': { ratio: '3 / 2', w: 1.5 },
  '4:3': { ratio: '4 / 3', w: 4 / 3 },
  '1:1': { ratio: '1 / 1', w: 1 },
};

const FRICTION = 4.6;
const STIFF = 180;
const DAMP = 22;
const GLIDE_MIN = 260;
const FLICK_MIN = 60;
const MAX_FLICK = 2600;
const WHEEL_SETTLE_MS = 150;
const CLICK_MAX_MOVE = 8;
const SAMPLE_MS = 90;

type Mode = 'rest' | 'drag' | 'glide' | 'settle';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pad2 = (n: number) => String(n).padStart(2, '0');

const STRIP_HELP =
  'Photo film strip. Drag, swipe or scroll sideways to scrub through the photos; arrow keys step one frame.';

export default function FilmStripScrubber({
  photos = defaultPhotos,
  frameRatio = '3:2',
  filmLabel = 'PORTRA 400',
  className,
}: FilmStripScrubberProps) {
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [index, setIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const pos = useRef(0);
  const vel = useRef(0);
  const mode = useRef<Mode>('rest');
  const settleTo = useRef(0);
  const raf = useRef(0);
  const lastT = useRef(0);
  const samples = useRef<Array<{ t: number; x: number }>>([]);
  const moved = useRef(0);
  const lastPX = useRef(0);
  const wheelTimer = useRef(0);
  const idxRef = useRef(0);
  const reducedRef = useRef(false);
  const inViewRef = useRef(true);
  const metrics = useRef({ t0: 0, stride: 1, count: 0, ok: false });

  reducedRef.current = reduced;
  inViewRef.current = inView;

  const count = photos.length;

  const targetX = useCallback((i: number) => {
    const m = metrics.current;
    return m.t0 - i * m.stride;
  }, []);

  const nearestIndex = useCallback((x: number) => {
    const m = metrics.current;
    if (!m.ok || m.count < 1) return 0;
    return clamp(Math.round((m.t0 - x) / m.stride), 0, m.count - 1);
  }, []);

  const bounds = useCallback(() => {
    const m = metrics.current;
    return { lo: m.t0 - Math.max(0, m.count - 1) * m.stride, hi: m.t0 };
  }, []);

  const paint = useCallback(() => {
    trackRef.current?.style.setProperty('--fs-x', `${pos.current.toFixed(2)}px`);
  }, []);

  const syncIndex = useCallback(() => {
    const i = nearestIndex(pos.current);
    if (i !== idxRef.current) {
      idxRef.current = i;
      setIndex(i);
    }
  }, [nearestIndex]);

  const step = useCallback(
    (now: number) => {
      raf.current = 0;
      const dt = Math.min((now - lastT.current) / 1000, 1 / 30);
      lastT.current = now;
      if (mode.current === 'glide') {
        const { lo, hi } = bounds();
        pos.current += vel.current * dt;
        vel.current *= Math.exp(-FRICTION * dt);
        if (pos.current > hi) {
          pos.current = hi;
          vel.current = 0;
        }
        if (pos.current < lo) {
          pos.current = lo;
          vel.current = 0;
        }
        if (Math.abs(vel.current) < GLIDE_MIN) {
          mode.current = 'settle';
          settleTo.current = targetX(nearestIndex(pos.current));
        }
      } else if (mode.current === 'settle') {
        const f = STIFF * (settleTo.current - pos.current) - DAMP * vel.current;
        vel.current += f * dt;
        pos.current += vel.current * dt;
        if (Math.abs(settleTo.current - pos.current) < 0.5 && Math.abs(vel.current) < 15) {
          pos.current = settleTo.current;
          vel.current = 0;
          mode.current = 'rest';
        }
      }
      paint();
      syncIndex();
      if (mode.current !== 'rest' && inViewRef.current) {
        raf.current = requestAnimationFrame(step);
      }
    },
    [bounds, nearestIndex, paint, syncIndex, targetX],
  );

  const ensureLoop = useCallback(() => {
    lastT.current = performance.now();
    if (!raf.current) raf.current = requestAnimationFrame(step);
  }, [step]);

  const snapNow = useCallback(
    (i: number) => {
      mode.current = 'rest';
      vel.current = 0;
      pos.current = targetX(clamp(i, 0, Math.max(0, metrics.current.count - 1)));
      paint();
      syncIndex();
    },
    [paint, syncIndex, targetX],
  );

  const goTo = useCallback(
    (i: number) => {
      if (!metrics.current.ok) return;
      const target = clamp(i, 0, metrics.current.count - 1);
      if (reducedRef.current) {
        snapNow(target);
        return;
      }
      mode.current = 'settle';
      settleTo.current = targetX(target);
      ensureLoop();
    },
    [ensureLoop, snapNow, targetX],
  );

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

  const measure = useCallback(() => {
    const vp = viewportRef.current;
    const track = trackRef.current;
    if (!vp || !track) return;
    const slots = track.querySelectorAll<HTMLElement>('[data-slot]');
    if (!slots.length) return;
    const first = slots[0];
    const second = slots[Math.min(1, slots.length - 1)];
    const vw = vp.clientWidth;
    const m = metrics.current;
    m.t0 = vw / 2 - first.offsetLeft - first.offsetWidth / 2;
    m.stride = slots.length > 1 ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
    m.count = slots.length;
    m.ok = true;
    const maxI = slots.length - 1;
    if (idxRef.current > maxI) {
      idxRef.current = maxI;
      setIndex(maxI);
    }
    pos.current = m.t0 - idxRef.current * m.stride;
    vel.current = 0;
    paint();
  }, [paint]);

  useEffect(() => {
    measure();
    const vp = viewportRef.current;
    if (!vp) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(vp);
    return () => ro.disconnect();
  }, [measure, count, frameRatio]);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      window.clearTimeout(wheelTimer.current);
    },
    [],
  );

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      if (!metrics.current.ok || !inViewRef.current) return;
      const unit = e.deltaMode === 1 ? 33 : 1;
      const raw = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!raw) return;
      const d = raw * unit;
      const { lo, hi } = bounds();
      if ((d > 0 && pos.current >= hi - 0.5) || (d < 0 && pos.current <= lo + 0.5)) return;
      e.preventDefault();
      mode.current = 'drag';
      vel.current = 0;
      pos.current = clamp(pos.current - d, lo, hi);
      paint();
      syncIndex();
      window.clearTimeout(wheelTimer.current);
      wheelTimer.current = window.setTimeout(() => {
        if (mode.current !== 'drag') return;
        if (reducedRef.current) {
          snapNow(nearestIndex(pos.current));
        } else {
          mode.current = 'settle';
          settleTo.current = targetX(nearestIndex(pos.current));
          ensureLoop();
        }
      }, WHEEL_SETTLE_MS);
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [bounds, ensureLoop, nearestIndex, paint, snapNow, syncIndex, targetX]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (!metrics.current.ok) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    mode.current = 'drag';
    vel.current = 0;
    moved.current = 0;
    lastPX.current = e.clientX;
    samples.current = [{ t: performance.now(), x: pos.current }];
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (mode.current !== 'drag' || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - lastPX.current;
    if (!dx) return;
    lastPX.current = e.clientX;
    const { lo, hi } = bounds();
    pos.current = clamp(pos.current + dx, lo, hi);
    moved.current += Math.abs(dx);
    const now = performance.now();
    samples.current.push({ t: now, x: pos.current });
    while (samples.current.length > 2 && now - samples.current[0].t > SAMPLE_MS) samples.current.shift();
    paint();
    syncIndex();
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (mode.current !== 'drag') return;
    mode.current = 'rest';
    if (moved.current <= CLICK_MAX_MOVE) return;
    const s = samples.current;
    const first = s[0];
    const now = performance.now();
    const v =
      first && now - first.t > 0 ? ((pos.current - first.x) / (now - first.t)) * 1000 : 0;
    if (reducedRef.current) {
      snapNow(nearestIndex(pos.current));
    } else if (Math.abs(v) > FLICK_MIN) {
      vel.current = clamp(v, -MAX_FLICK, MAX_FLICK);
      mode.current = 'glide';
      ensureLoop();
    } else {
      mode.current = 'settle';
      settleTo.current = targetX(nearestIndex(pos.current));
      ensureLoop();
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = idxRef.current + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = idxRef.current - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = metrics.current.count - 1;
    if (next === null) return;
    e.preventDefault();
    goTo(next);
  };

  if (!count) return null;

  const safeIndex = clamp(index, 0, count - 1);
  const photo = photos[safeIndex];
  const r = RATIO[frameRatio] ?? RATIO['3:2'];
  const rootStyle = {
    '--fs-ratio': r.ratio,
    '--fs-ratio-w': String(r.w),
  } as CSSProperties;
  const num = pad2(safeIndex + 1);
  const total = pad2(count);

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <span className={styles.grain} aria-hidden="true" />

      <div className={styles.stage}>
        <figure className={styles.viewer}>
          <div className={styles.viewerPanel}>
            {photo.image ? (
              <img
                key={safeIndex}
                className={styles.viewerPhoto}
                src={photo.image}
                alt={photo.caption || 'Portfolio photo'}
                draggable={false}
              />
            ) : (
              <span className={styles.viewerSlate} aria-hidden="true" />
            )}
          </div>
          <figcaption className={styles.captionRow}>
            <p className={styles.caption}>{photo.caption || '\u00A0'}</p>
            <span className={styles.counter}>
              {filmLabel ? (
                <>
                  <span className={styles.stock}>{filmLabel}</span>
                  <span className={styles.stockDot} aria-hidden="true">
                    ·
                  </span>
                </>
              ) : null}
              <span className={styles.nums}>
                {num} / {total}
              </span>
            </span>
          </figcaption>
        </figure>

        <div
          ref={viewportRef}
          className={styles.stripViewport}
          role="slider"
          tabIndex={0}
          aria-label={STRIP_HELP}
          aria-orientation="horizontal"
          aria-valuemin={1}
          aria-valuemax={count}
          aria-valuenow={safeIndex + 1}
          aria-valuetext={photo.caption ? `Frame ${num}A: ${photo.caption}` : `Frame ${num}A`}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div ref={trackRef} className={styles.stripTrack}>
            <span className={styles.holesBand} aria-hidden="true" />
            <div className={styles.framesRow}>
              {photos.map((p, i) => (
                <figure
                  key={i}
                  data-slot=""
                  className={styles.slot}
                  onClick={() => {
                    if (moved.current < CLICK_MAX_MOVE) goTo(i);
                  }}
                >
                  <span
                    className={[styles.frame, i === safeIndex ? styles.frameCenter : '']
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {p.image ? (
                      <img
                        className={styles.frameImg}
                        src={p.image}
                        alt=""
                        draggable={false}
                        loading="lazy"
                      />
                    ) : (
                      <span className={styles.frameSlate} aria-hidden="true" />
                    )}
                  </span>
                  <span className={styles.edge} aria-hidden="true">
                    {pad2(i + 1)}A
                  </span>
                </figure>
              ))}
            </div>
            <span className={styles.holesBand} aria-hidden="true" />
          </div>

          <span className={styles.gate} aria-hidden="true">
            <span className={styles.gateCornerTL} />
            <span className={styles.gateCornerTR} />
            <span className={styles.gateCornerBL} />
            <span className={styles.gateCornerBR} />
          </span>
        </div>
      </div>
    </div>
  );
}
