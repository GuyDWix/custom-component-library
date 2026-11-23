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
