Create a custom element called "Record Crate Browser". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: items (image, title, subtitle), crate colour, sleeve count visible. Add other settings if they help.

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface CrateItem {
  image?: string;
  title: string;
  subtitle?: string;
}

export interface RecordCrateBrowserProps {
  items?: CrateItem[];
  crateColor?: string;
  visibleCount?: number;
  className?: string;
}

const DEFAULT_ITEMS: CrateItem[] = [
  {
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=640&h=640&fit=crop&auto=format',
    title: 'Midnight Pressing',
    subtitle: '£9.50 · VG+',
  },
  {
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=640&h=640&fit=crop&auto=format',
    title: 'Blue Hour Static',
    subtitle: '£12 · NM',
  },
  {
    image: 'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?q=80&w=640&h=640&fit=crop&auto=format',
    title: 'Neon District',
    subtitle: '£8 · VG',
  },
  {
    image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?q=80&w=640&h=640&fit=crop&auto=format',
    title: 'Tide Charts',
    subtitle: '£14 · M',
  },
  {
    image: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?q=80&w=640&h=640&fit=crop&auto=format',
    title: 'Low Light Room',
    subtitle: '£7.50 · G+',
  },
  {
    image: 'https://images.unsplash.com/photo-1458560871784-56d23406c091?q=80&w=640&h=640&fit=crop&auto=format',
    title: 'First Verse',
    subtitle: '£11 · VG+',
  },
];

const SLOTS = [
  { lean: 34, shift: 0, lift: 2 },
  { lean: 56, shift: 18, lift: 6 },
  { lean: 61, shift: -14, lift: 10 },
  { lean: 65, shift: 30, lift: 14 },
  { lean: 68, shift: -26, lift: 18 },
  { lean: 71, shift: 40, lift: 22 },
  { lean: 74, shift: -38, lift: 25 },
  { lean: 77, shift: 48, lift: 28 },
] as const;

const HIDDEN_SLOT = { lean: 82, shift: 0, lift: 36 } as const;

const HELP =
  'Scroll, swipe or use the arrow keys to flick through the crate. Press Enter or Space to open the front sleeve, Escape to put it back.';

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ');

export default function RecordCrateBrowser({
  items = DEFAULT_ITEMS,
  crateColor,
  visibleCount = 5,
  className,
}: RecordCrateBrowserProps) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [nudge, setNudge] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const crateRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ y: 0, active: false, moved: false });

  const n = items.length;
  const vis = Math.max(2, Math.min(SLOTS.length, visibleCount, Math.max(n, 2)));
  const current = items[index];

  const rels = useMemo(() => items.map((_, i) => (i - index + n) % n), [items, index, n]);

  const advance = useCallback(
    (dir: number) => {
      if (n < 2) return;
      setOpen(false);
      setIndex((i) => (i + dir + n) % n);
      setNudge((k) => k + 1);
    },
    [n],
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

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    let acc = 0;
    let lock = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      if (now < lock) return;
      acc += e.deltaY;
      if (Math.abs(acc) > 55) {
        advance(acc > 0 ? 1 : -1);
        acc = 0;
        lock = now + 240;
      }
    };
    scene.addEventListener('wheel', onWheel, { passive: false });
    return () => scene.removeEventListener('wheel', onWheel);
  }, [advance]);

  useEffect(() => {
    if (!nudge || reduced) return;
    const crate = crateRef.current;
    if (!crate) return;
    crate.classList.remove(styles.crateNudged);
    void crate.offsetWidth;
    crate.classList.add(styles.crateNudged);
    const t = window.setTimeout(() => crate.classList.remove(styles.crateNudged), 420);
    return () => window.clearTimeout(t);
  }, [nudge, reduced]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { y: e.clientY, active: true, moved: false };
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active) return;
    const dy = d.y - e.clientY;
    if (Math.abs(dy) > 8) d.moved = true;
    if (d.moved && !reduced) {
      const tip = Math.max(-12, Math.min(16, dy * 0.12));
      sceneRef.current?.style.setProperty('--sceneDrag', `${tip.toFixed(2)}deg`);
    }
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    const dy = d.y - e.clientY;
    setDragging(false);
    sceneRef.current?.style.setProperty('--sceneDrag', '0deg');
    if (d.moved && Math.abs(dy) > 44) advance(dy > 0 ? 1 : -1);
  };

  const onFrontClick = () => {
    if (drag.current.moved) {
      drag.current.moved = false;
      return;
    }
    setOpen((o) => !o);
  };

  const onFrontKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    const fwd = e.key === 'ArrowUp' || e.key === 'ArrowRight';
    const back = e.key === 'ArrowDown' || e.key === 'ArrowLeft';
    if (!fwd && !back) return;
    e.preventDefault();
    advance(fwd ? 1 : -1);
  };

  const rootStyle = { '--rc-crate': crateColor } as CSSProperties;

  const renderFace = (item: CrateItem, visible: boolean) => (
    <>
      <span className={styles.sleeveFace}>
        {item.image ? (
          <img className={styles.sleeveImg} src={item.image} alt="" loading="lazy" draggable={false} />
        ) : (
          <span className={styles.sleeveBlank} />
        )}
        <span className={styles.artShade} />
        <span className={styles.artSheen} />
      </span>
      {visible && item.subtitle ? (
        <span className={styles.sticker}>
          <span className={styles.stickerText}>{item.subtitle}</span>
        </span>
      ) : null}
      <span className={styles.sleeveRim} />
    </>
  );

  return (
    <div
      ref={rootRef}
      className={cx(styles.root, !inView && styles.rootPaused, reduced && styles.rootReduced, className)}
      style={rootStyle}
    >
      <span className={styles.bulb} aria-hidden="true" />

      <div
        ref={sceneRef}
        role="group"
        aria-label="Record crate"
        className={cx(styles.scene, open && styles.sceneOpen, dragging && styles.sceneDragging)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <span className={styles.wallType} aria-hidden="true">
          <span key={index} className={styles.wallTypeInner}>
            {current?.title}
          </span>
        </span>

        <div className={styles.stack}>
          <span className={styles.disc} aria-hidden="true">
            <span className={styles.discLabel}>
              <span className={styles.discHole} />
            </span>
          </span>

          {items.map((item, i) => {
            const rel = rels[i];
            const isFront = rel === 0;
            const visible = rel < vis;
            const slot = visible ? SLOTS[rel] : HIDDEN_SLOT;
            const style = {
              '--lean': `${slot.lean}deg`,
              '--shift': `${slot.shift}px`,
              '--lift': `${-slot.lift}px`,
              '--rel': rel,
              zIndex: visible ? 100 - rel : 1,
              opacity: visible ? 1 : 0,
            } as CSSProperties;

            if (isFront && current) {
              return (
                <button
                  key={`${item.title}-${i}`}
                  type="button"
                  className={cx(styles.sleeve, styles.isFront)}
                  style={style}
                  aria-expanded={open}
                  aria-label={`${current.title} — record ${index + 1} of ${n}`}
                  aria-description={HELP}
                  onClick={onFrontClick}
                  onKeyDown={onFrontKey}
                >
                  {renderFace(item, visible)}
                </button>
              );
            }

            return (
              <div key={`${item.title}-${i}`} className={styles.sleeve} style={style} aria-hidden="true">
                {renderFace(item, visible)}
              </div>
            );
          })}
        </div>

        <span className={styles.floorShadow} aria-hidden="true" />

        <div ref={crateRef} className={styles.crate} aria-hidden="true">
          <span className={styles.crateTop} />
          <span className={styles.crateFace} />
          <span className={styles.crateSideL} />
          <span className={styles.crateSideR} />
          <span className={styles.screw} style={{ insetInlineStart: '3%', insetBlockStart: '18%' }} />
          <span className={styles.screw} style={{ insetInlineEnd: '3%', insetBlockStart: '18%' }} />
          <span className={styles.screw} style={{ insetInlineStart: '3%', insetBlockEnd: '10%' }} />
          <span className={styles.screw} style={{ insetInlineEnd: '3%', insetBlockEnd: '10%' }} />
        </div>

        {current && (
          <div className={styles.binCard}>
            <span className={styles.tape} aria-hidden="true" />
            <span className={styles.tape2} aria-hidden="true" />
            <span className={styles.binTitle} aria-live="polite">
              {current.title}
            </span>
            <span className={styles.binCount}>
              {String(index + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      <span className={styles.grain} aria-hidden="true" />
    </div>
  );
}
```

```css
.root {
  --rc-crate: #d6c69e;
  --rc-mustard: #e0a32e;
  --rc-teal: #3aa08c;
  --rc-stage: #241f1a;
  --rc-stage-deep: #16120d;
  --rc-cream: #f2e8d4;
  --rc-ink: #241c10;
  --rc-font-display: 'Futura', 'Avenir Next', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --rc-font-ui: 'Avenir Next', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --rc-font-hand: 'Segoe Print', 'Bradley Hand', 'Chalkboard SE', var(--rc-font-ui);
  --sleeve: clamp(170px, 34cqi, 300px);
  --rc-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding: clamp(20px, 5cqi, 56px) clamp(12px, 3cqi, 32px);
  border-radius: 24px;
  background:
    radial-gradient(56% 42% at 50% 0%, rgba(224, 163, 46, 0.1) 0%, transparent 70%),
    radial-gradient(120% 90% at 50% 110%, rgba(0, 0, 0, 0.55), transparent 62%),
    linear-gradient(180deg, var(--rc-stage) 0%, var(--rc-stage-deep) 100%);
  color: var(--rc-cream);
  font-family: var(--rc-font-ui);
}

.bulb {
  position: absolute;
  inset-inline: 18%;
  inset-block-start: -14%;
  aspect-ratio: 2 / 1;
  background: radial-gradient(closest-side, rgba(228, 168, 60, 0.18), transparent 72%);
  filter: blur(8px);
  pointer-events: none;
}

.grain {
  position: absolute;
  inset: 0;
  z-index: 60;
  background-image: var(--rc-noise);
  opacity: 0.12;
  mix-blend-mode: overlay;
  pointer-events: none;
}

.scene {
  position: relative;
  inline-size: min(100%, 920px);
  margin-inline: auto;
  block-size: clamp(420px, 66cqi, 620px);
  perspective: 1200px;
  perspective-origin: 50% 10%;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.wallType {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 4%;
  z-index: 1;
  display: flex;
  justify-content: center;
  max-block-size: 34%;
  overflow: hidden;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(180deg, #000 55%, transparent 100%);
  mask-image: linear-gradient(180deg, #000 55%, transparent 100%);
}

.wallTypeInner {
  font-family: var(--rc-font-display);
  font-size: clamp(44px, 13cqi, 140px);
  font-weight: 800;
  letter-spacing: -0.045em;
  line-height: 0.94;
  text-align: center;
  text-transform: uppercase;
  text-wrap: balance;
  color: color-mix(in srgb, var(--rc-mustard) 15%, transparent);
  animation: typeIn 720ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes typeIn {
  from {
    opacity: 0;
    transform: translateY(14px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.stack {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 15%;
  z-index: 10;
  block-size: 55%;
  transform-style: preserve-3d;
  animation: stackSway 9s ease-in-out infinite alternate;
}

@keyframes stackSway {
  from {
    transform: rotate(-0.4deg);
  }

  to {
    transform: rotate(0.5deg);
  }
}

.sleeve {
  position: absolute;
  inset-block-end: 0;
  inset-inline-start: 50%;
  inline-size: var(--sleeve);
  aspect-ratio: 1;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-align: start;
  transform-origin: 50% 100%;
  transform: translateX(-50%) translate3d(var(--shift), var(--lift), 0) rotateX(calc(var(--lean) + var(--drag, 0deg)));
  transition:
    transform 620ms cubic-bezier(0.3, 1.36, 0.42, 1),
    opacity 480ms ease;
  transition-delay: calc(var(--rel) * 16ms);
  will-change: transform;
  pointer-events: none;
}

.isFront {
  --drag: var(--sceneDrag, 0deg);
  cursor: pointer;
  pointer-events: auto;
  appearance: none;
}

.isFront:focus-visible {
  outline: 3px solid var(--rc-teal);
  outline-offset: 5px;
  border-radius: 10px;
}

.sleeveFace {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 7px;
  background: linear-gradient(165deg, #ded4c0 0%, #cfc3ab 100%);
  box-shadow:
    0 24px 38px -22px rgba(0, 0, 0, 0.7),
    0 6px 14px -8px rgba(0, 0, 0, 0.5);
}

.sleeveImg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  filter: saturate(0.9) contrast(0.95) brightness(0.94);
  user-select: none;
}

.sleeveBlank {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 50%, transparent 0 33.5%, rgba(120, 100, 60, 0.14) 34% 35%, transparent 36%),
    linear-gradient(165deg, #e6dcc9 0%, #d5c9b1 100%);
}

.artShade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(200deg, rgba(255, 255, 255, 0.14) 0%, transparent 30%, transparent 62%, rgba(40, 24, 6, 0.22) 100%);
}

.artSheen {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.8;
  background: linear-gradient(
    115deg,
    transparent 42%,
    rgba(255, 255, 255, 0.1) 47%,
    rgba(255, 255, 255, 0.16) 50%,
    rgba(255, 255, 255, 0.1) 53%,
    transparent 58%
  );
}

.sleeveRim {
  position: absolute;
  inset: 0;
  border-radius: 7px;
  pointer-events: none;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.22),
    inset 0 0 18px rgba(66, 48, 20, 0.14);
}

.sticker {
  position: absolute;
  inset-block-start: 7%;
  inset-inline-end: 6%;
  max-inline-size: 62%;
  padding: 6px 10px 7px;
  border-radius: 3px;
  background:
    linear-gradient(
      160deg,
      color-mix(in srgb, var(--rc-mustard) 92%, #fff) 0%,
      var(--rc-mustard) 55%,
      color-mix(in srgb, var(--rc-mustard) 86%, #7a4d0e) 100%
    );
  color: #231703;
  box-shadow:
    0 3px 8px -2px rgba(20, 12, 2, 0.55),
    inset 0 0 0 1px rgba(255, 255, 255, 0.25),
    inset 0 0 12px rgba(122, 77, 14, 0.18);
  transform: rotate(-5deg);
  pointer-events: none;
}

.isFront .sticker {
  animation: stickerSettle 620ms cubic-bezier(0.34, 1.56, 0.64, 1) 180ms both;
}

@keyframes stickerSettle {
  from {
    transform: rotate(-9deg) translateY(-6px);
  }

  to {
    transform: rotate(-5deg) translateY(0);
  }
}

.stickerText {
  display: block;
  font-family: var(--rc-font-hand);
  font-size: clamp(12px, 1.9cqi, 15px);
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.stickerText::selection {
  background: color-mix(in srgb, var(--rc-mustard) 55%, #fff);
  color: #231703;
}

.disc {
  position: absolute;
  inset-block-end: -2%;
  inset-inline-start: 50%;
  z-index: 95;
  inline-size: calc(var(--sleeve) * 0.56);
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle at 38% 34%, rgba(255, 255, 255, 0.16) 0 18%, transparent 42%),
    repeating-radial-gradient(circle at 50% 50%, #201d19 0 2.5px, #2a251f 2.5px 5px),
    #1a1713;
  box-shadow:
    0 6px 18px -6px rgba(0, 0, 0, 0.7),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  transform: translateX(-50%) translateX(calc(var(--sleeve) * -0.06)) translateY(10px) scale(0.94);
  opacity: 0;
  transition:
    transform 600ms cubic-bezier(0.3, 1.3, 0.42, 1) 110ms,
    opacity 380ms ease 60ms;
  pointer-events: none;
}

.sceneOpen .disc {
  z-index: 96;
  transform: translateX(-50%) translateX(calc(var(--sleeve) * -0.34)) translateY(2px) scale(1);
  opacity: 1;
}

.discLabel {
  position: absolute;
  inset: 36%;
  border-radius: 50%;
  background: radial-gradient(
    circle at 42% 36%,
    color-mix(in srgb, var(--rc-teal) 70%, #fff) 0%,
    var(--rc-teal) 55%,
    color-mix(in srgb, var(--rc-teal) 72%, #0c2a22) 100%
  );
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
}

.discHole {
  position: absolute;
  inset: 46%;
  border-radius: 50%;
  background: var(--rc-stage);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.5);
}

.floorShadow {
  position: absolute;
  inset-inline: 14%;
  inset-block-end: 0;
  z-index: 30;
  block-size: 44px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(0, 0, 0, 0.55), transparent 72%);
  filter: blur(6px);
  pointer-events: none;
}

.crate {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 2%;
  z-index: 40;
  inline-size: calc(var(--sleeve) * 1.9);
  block-size: calc(var(--sleeve) * 0.56);
  margin-inline: auto;
}

.crateNudged {
  animation: crateNudge 320ms ease-out;
}

@keyframes crateNudge {
  35% {
    transform: translateY(3px);
  }

  0%,
  100% {
    transform: none;
  }
}

.crateTop {
  position: absolute;
  inset-inline: -4px;
  inset-block-start: 0;
  block-size: 11px;
  border-radius: 3px;
  background: repeating-linear-gradient(
    180deg,
    color-mix(in srgb, var(--rc-crate) 92%, #fff) 0 2px,
    color-mix(in srgb, var(--rc-crate) 70%, #3a2c14) 2px 3px
  );
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}

.crateFace {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 10px;
  inset-block-end: 0;
  border-radius: 12px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--rc-crate) 88%, #fff) 0%,
      var(--rc-crate) 22%,
      color-mix(in srgb, var(--rc-crate) 84%, #3a2c14) 100%
    ),
    repeating-linear-gradient(93deg, transparent 0 9px, rgba(90, 70, 38, 0.07) 9px 10px, transparent 10px 23px, rgba(90, 70, 38, 0.05) 23px 24px);
  box-shadow:
    inset 0 0 0 1px rgba(58, 42, 18, 0.28),
    inset 0 -22px 30px -18px rgba(46, 32, 12, 0.5),
    inset 0 14px 18px -14px rgba(255, 255, 255, 0.5);
}

.crateSideL,
.crateSideR {
  position: absolute;
  inset-block: 10px 0;
  inline-size: 10px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--rc-crate) 74%, #2e2010), color-mix(in srgb, var(--rc-crate) 60%, #241a08));
  box-shadow: inset 0 0 0 1px rgba(40, 28, 10, 0.4);
}

.crateSideL {
  inset-inline-start: 0;
  border-start-start-radius: 10px;
  border-end-start-radius: 12px;
}

.crateSideR {
  inset-inline-end: 0;
  border-start-end-radius: 10px;
  border-end-end-radius: 12px;
}

.screw {
  position: absolute;
  inline-size: 7px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff 0 25%, color-mix(in srgb, var(--rc-crate) 40%, #241a08) 62%);
  box-shadow:
    0 1px 1px rgba(255, 255, 255, 0.4),
    inset 0 -1px 2px rgba(0, 0, 0, 0.6);
}

.binCard {
  position: absolute;
  inset-inline: 0;
  inset-block-end: calc(2% + var(--sleeve) * 0.1);
  z-index: 50;
  inline-size: min(52%, 340px);
  margin-inline: auto;
  display: grid;
  gap: 3px;
  padding: 10px 14px 9px;
  border-radius: 4px;
  background: linear-gradient(175deg, #faf3e2 0%, var(--rc-cream) 55%, #e7dabd 100%);
  transform: rotate(-1.2deg);
  box-shadow:
    0 10px 22px -10px rgba(0, 0, 0, 0.55),
    inset 0 0 0 1px rgba(122, 96, 46, 0.18);
  text-align: center;
}

.binTitle {
  font-family: var(--rc-font-display);
  font-size: clamp(15px, 3cqi, 21px);
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.15;
  color: var(--rc-ink);
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.binTitle::selection {
  background: var(--rc-mustard);
  color: var(--rc-ink);
}

.binCount {
  font-family: var(--rc-font-ui);
  font-size: 12.5px;
  letter-spacing: 0.22em;
  color: color-mix(in srgb, var(--rc-ink) 62%, transparent);
  font-variant-numeric: tabular-nums;
}

.tape,
.tape2 {
  position: absolute;
  inset-block-start: -7px;
  inline-size: 34px;
  block-size: 16px;
  background: rgba(255, 255, 255, 0.35);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.tape {
  inset-inline-start: 16%;
  transform: rotate(-3deg);
}

.tape2 {
  inset-inline-end: 16%;
  transform: rotate(2deg);
}

.sceneOpen .isFront {
  transform: translateX(-50%) translateY(calc(var(--sleeve) * -0.42)) scale(1.18) rotateX(5deg);
  transition-duration: 560ms;
}

.sceneDragging .sleeve {
  transition-duration: 90ms;
  transition-delay: 0ms;
}

.rootPaused .stack,
.rootPaused .wallTypeInner,
.rootPaused .sticker {
  animation-play-state: paused;
}

@media (prefers-reduced-motion: reduce) {
  .stack,
  .wallTypeInner,
  .sticker,
  .crateNudged {
    animation: none;
  }

  .sleeve,
  .disc {
    transition-duration: 1ms;
    transition-delay: 0ms;
  }
}
```
