const n=`Create a custom element called "Film Strip Scrubber". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: photos (image and caption), frame ratio, strip colour, edge-print film label. Add other settings if they help.

\`\`\`tsx
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
  stripColor?: string;
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
  stripColor = '#4b5158',
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
    trackRef.current?.style.setProperty('--fs-x', \`\${pos.current.toFixed(2)}px\`);
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
    '--fs-acetate': stripColor,
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
            <p className={styles.caption}>{photo.caption || '\\u00A0'}</p>
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
          aria-valuetext={photo.caption ? \`Frame \${num}A: \${photo.caption}\` : \`Frame \${num}A\`}
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
\`\`\`

\`\`\`css
.root {
  --fs-acetate: #4b5158;
  --fs-amber: #e2a04a;
  --fs-ratio: 3 / 2;
  --fs-ratio-w: 1.5;
  --fs-room: #191c22;
  --fs-room-deep: #111318;
  --fs-ink: #e8ebf0;
  --fs-muted: rgba(232, 235, 240, 0.66);
  --fs-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  --fs-font: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --fs-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --fs-holes: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='18'><rect x='4' y='3.5' width='16' height='11' rx='3' fill='%23d8e1ec' fill-opacity='0.85'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 26px;
  background:
    radial-gradient(130% 52% at 50% 0%, rgba(176, 196, 216, 0.15) 0%, transparent 62%),
    linear-gradient(180deg, var(--fs-room) 0%, var(--fs-room-deep) 100%);
  color: var(--fs-ink);
  font-family: var(--fs-font);
}

.root ::selection {
  background: var(--fs-amber);
  color: #17191d;
}

.grain {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  background-image: var(--fs-noise);
  opacity: 0.12;
  mix-blend-mode: overlay;
}

.stage {
  --fs-gutter: clamp(18px, 3.6cqi, 44px);
  --fs-frame-h: 64px;

  position: relative;
  z-index: 0;
  box-sizing: border-box;
  inline-size: 100%;
  display: grid;
  justify-items: center;
  gap: clamp(20px, 3cqi, 30px);
  padding: clamp(26px, 4cqi, 44px) var(--fs-gutter) clamp(22px, 3.4cqi, 36px);
}

.viewer {
  margin: 0;
  inline-size: min(100%, 700px);
  display: grid;
  gap: 13px;
}

.viewerPanel {
  position: relative;
  border-radius: 16px;
  padding: clamp(9px, 1.3cqi, 13px);
  background: linear-gradient(180deg, #f8fafc 0%, #ebeef1 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 16px 38px -16px rgba(4, 7, 11, 0.72),
    0 28px 90px -26px rgba(157, 183, 209, 0.4);
}

.viewerPhoto {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  aspect-ratio: var(--fs-ratio);
  border-radius: 9px;
  background: #1c2026;
  user-select: none;
  animation: viewerIn 320ms cubic-bezier(0.22, 0.82, 0.3, 1) both;
}

@keyframes viewerIn {
  from {
    opacity: 0;
    transform: scale(1.025);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.viewerSlate {
  display: block;
  inline-size: 100%;
  aspect-ratio: var(--fs-ratio);
  border-radius: 9px;
  background:
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.045) 0 10px, transparent 10px 20px),
    #22262d;
}

.captionRow {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px 24px;
  flex-wrap: wrap;
  padding-inline: 2px;
}

.caption {
  margin: 0;
  min-inline-size: 0;
  font-size: 15.5px;
  line-height: 1.55;
  color: var(--fs-muted);
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.counter {
  flex: none;
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-family: var(--fs-mono);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
}

.nums {
  color: var(--fs-amber);
}

.stock {
  color: var(--fs-muted);
}

.stockDot {
  color: var(--fs-muted);
}

.stripViewport {
  position: relative;
  inline-size: 100%;
  margin-inline: calc(var(--fs-gutter) * -1);
  overflow: clip;
  touch-action: pan-y;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 7%, #000 93%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0, #000 7%, #000 93%, transparent 100%);
}

.stripViewport:active {
  cursor: grabbing;
}

.stripViewport:focus-visible {
  outline: 2.5px solid var(--fs-amber);
  outline-offset: -2.5px;
  -webkit-mask-image: none;
  mask-image: none;
}

.stripTrack {
  position: relative;
  display: flex;
  flex-direction: column;
  inline-size: max-content;
  padding-inline: 50%;
  transform: translate3d(var(--fs-x, 0px), 0, 0);
  will-change: transform;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--fs-acetate) 70%, #ffffff) 0%,
    var(--fs-acetate) 26%,
    color-mix(in srgb, var(--fs-acetate) 84%, #000000) 100%
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    inset 0 -2px 3px rgba(0, 0, 0, 0.32),
    0 16px 34px -14px rgba(0, 0, 0, 0.62);
}

.holesBand {
  flex: none;
  inline-size: 100%;
  block-size: 18px;
  background-image: var(--fs-holes);
  background-repeat: repeat-x;
  background-position: 0 center;
}

.framesRow {
  flex: none;
  display: flex;
  align-items: flex-start;
  padding-block: 9px 0;
}

.slot {
  position: relative;
  margin: 0;
  inline-size: calc(var(--fs-frame-h) * var(--fs-ratio-w));
  padding-inline: 5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

.frame {
  position: relative;
  overflow: hidden;
  inline-size: 100%;
  block-size: var(--fs-frame-h);
  border-radius: 3px;
  background: #23272e;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
  filter: brightness(0.58) saturate(0.5);
  transform: scale(1);
  will-change: transform, filter;
  transition:
    transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1),
    filter 340ms ease;
}

.frameCenter {
  z-index: 1;
  transform: scale(1.1);
  filter: none;
}

.frameImg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  pointer-events: none;
}

.frameSlate {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  background:
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.05) 0 10px, transparent 10px 20px),
    #2b3038;
}

.edge {
  margin-block-start: 7px;
  max-inline-size: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--fs-mono);
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.18em;
  line-height: 1.2;
  text-transform: uppercase;
  color: var(--fs-amber);
}

.gate {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 50%;
  inline-size: calc(var(--fs-frame-h) * var(--fs-ratio-w) + 22px);
  margin-inline-start: calc((var(--fs-frame-h) * var(--fs-ratio-w) + 22px) / -2);
  pointer-events: none;
  z-index: 2;
  box-shadow: inset 0 0 0 1.5px rgba(226, 160, 74, 0.3);
}

.gateCornerTL,
.gateCornerTR,
.gateCornerBL,
.gateCornerBR {
  position: absolute;
  inline-size: 14px;
  block-size: 14px;
}

.gateCornerTL {
  inset-block-start: 3px;
  inset-inline-start: 3px;
  border-block-start: 2.5px solid var(--fs-amber);
  border-inline-start: 2.5px solid var(--fs-amber);
}

.gateCornerTR {
  inset-block-start: 3px;
  inset-inline-end: 3px;
  border-block-start: 2.5px solid var(--fs-amber);
  border-inline-end: 2.5px solid var(--fs-amber);
}

.gateCornerBL {
  inset-block-end: 3px;
  inset-inline-start: 3px;
  border-block-end: 2.5px solid var(--fs-amber);
  border-inline-start: 2.5px solid var(--fs-amber);
}

.gateCornerBR {
  inset-block-end: 3px;
  inset-inline-end: 3px;
  border-block-end: 2.5px solid var(--fs-amber);
  border-inline-end: 2.5px solid var(--fs-amber);
}

@container (min-width: 640px) {
  .stage {
    --fs-frame-h: 86px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .frame {
    transition: none;
    will-change: auto;
  }

  .viewerPhoto {
    animation: none;
  }

  .stripTrack {
    will-change: auto;
  }
}
\`\`\`
`;export{n as default};
