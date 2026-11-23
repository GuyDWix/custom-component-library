import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface ContactSheetPhoto {
  image: string;
  caption?: string;
  picked?: boolean;
}

export interface ContactSheetGalleryProps {
  photos?: ContactSheetPhoto[];
  title?: string;
  rollLabel?: string;
  showFrameNumbers?: boolean;
  markerColor?: string;
  paperTone?: string;
  ariaLabel?: string;
  photoLabel?: string;
  closeLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
  className?: string;
}

const wix = (file: string) => `https://static.wixstatic.com/media/${file}/v1/fill/w_1200,h_800,al_c,q_80,enc_auto/${file}`;

export const defaultPhotos: ContactSheetPhoto[] = [
  { image: wix('c3c3c6aa686f49e7beb397da6634313d.jpg'), caption: 'Valley fog at first light' },
  { image: wix('11062b_231247e6bf4f47129d00c42904595e3d~mv2.jpg'), caption: 'Breakfast before the drive' },
  { image: wix('11062b_3682ebfcb08e4da5b3168b62819a1e68~mv2.jpg'), caption: 'The cove from above', picked: true },
  { image: wix('4c34e844a76749b2b6c4ed85ec5f5c44.jpg'), caption: 'The house we rented' },
  { image: wix('6173e004478846d4b24d399c1d4863bb.jpg'), caption: 'Morning stretch by the pool' },
  { image: wix('11062b_0f39d6e37d0d4cd7b4aeeda30bc35f06~mv2.jpg'), caption: 'Second espresso, no regrets' },
  { image: wix('11062b_4c5469a1a0f14ea8894500f94dec68e2~mv2.jpg'), caption: 'Lena against the white wall', picked: true },
  { image: wix('285487815e3446a78cb72753b064615c.jpg'), caption: 'Lunch on the terrace' },
  { image: wix('66bc23fff16c4862903104a6597141fd.jpg'), caption: 'Dinner at the harbour' },
  { image: wix('3f1a1953c1c64d5fab4cb4d677b726ed.jpg'), caption: 'Last run of the trip' },
  { image: wix('11062b_91fa0735368f425da0bd82073a8c3695~mv2.jpg'), caption: 'Mira, laughing at something off camera', picked: true },
  { image: wix('73f64659826942c7bfd3e9deeeb6a8e7.jpg'), caption: 'Back into the city' },
];

type Phase = 'closed' | 'open' | 'closing';
type Motion = { x: number; y: number; s: number; vx: number; vy: number; vs: number };
type Box = { left: number; top: number; w: number; h: number; pad: number; imgW: number; imgH: number };

const STIFFNESS = 240;
const DAMPING = 23;
const CAPTION_H = 52;
const OPEN_DELAY = 320;
const SWIPE = 56;
const SHEET_HELP = 'Pick a frame to see it large. Arrow keys move between frames; Escape closes.';
const TILT = [-0.35, 0.28, -0.18, 0.4, -0.24];
const RING = 'M78 10C52 0 14 6 6 34C0 58 16 90 50 94C82 97 99 74 96 46C93 20 70 6 44 9C36 10 30 13 26 17';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const pad2 = (n: number) => String(n).padStart(2, '0');
const pickedSet = (photos: ContactSheetPhoto[]) => new Set(photos.flatMap((p, i) => (p.picked ? [i] : [])));
const rest = (): Motion => ({ x: 0, y: 0, s: 1, vx: 0, vy: 0, vs: 0 });

export default function ContactSheetGallery({
  photos = defaultPhotos,
  title = 'A long weekend by the sea',
  rollLabel = 'Roll 07 · 400 · Proof',
  showFrameNumbers = true,
  markerColor = '#D2361F',
  paperTone = '#F2EBDD',
  ariaLabel = 'Contact sheet',
  photoLabel = 'Photo',
  closeLabel = 'Close',
  previousLabel = 'Previous photo',
  nextLabel = 'Next photo',
  className,
}: ContactSheetGalleryProps) {
  const count = photos.length;
  const [cols, setCols] = useState(4);
  const [marked, setMarked] = useState(() => pickedSet(photos));
  const [focusIndex, setFocusIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('closed');
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [swap, setSwap] = useState({ key: 0, dir: 0 });

  const rootRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLElement>(null);
  const frameEls = useRef<(HTMLButtonElement | null)[]>([]);
  const ratios = useRef<number[]>([]);
  const motion = useRef<Motion>(rest());
  const target = useRef({ x: 0, y: 0, s: 1 });
  const box = useRef<Box | null>(null);
  const raf = useRef(0);
  const timer = useRef(0);
  const launching = useRef(false);
  const drag = useRef({ active: false, id: -1, x0: 0, dx: 0 });
  const phaseRef = useRef(phase);
  const indexRef = useRef(index);
  const reducedRef = useRef(reduced);
  const inViewRef = useRef(inView);
  phaseRef.current = phase;
  indexRef.current = index;
  reducedRef.current = reduced;
  inViewRef.current = inView;

  const filterId = `csg-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    setMarked(pickedSet(photos));
    ratios.current = [];
  }, [photos]);

  const computeBox = useCallback((i: number): Box | null => {
    const st = stageRef.current;
    if (!st) return null;
    const W = st.clientWidth;
    const H = st.clientHeight;
    const pad = W < 480 ? 8 : 14;
    const r = ratios.current[i] || 1.5;
    const imgW = Math.max(60, Math.min(W - pad * 2, (H - pad - CAPTION_H) * r));
    const imgH = imgW / r;
    const w = imgW + pad * 2;
    const h = imgH + pad + CAPTION_H;
    return { left: st.offsetLeft + (W - w) / 2, top: st.offsetTop + (H - h) / 2, w, h, pad, imgW, imgH };
  }, []);

  const fitOverlay = useCallback(() => {
    const ov = overlayRef.current;
    const root = rootRef.current;
    if (!ov || !root) return;
    const r = root.getBoundingClientRect();
    const top = Math.max(0, -r.top);
    const bottom = Math.min(r.height, window.innerHeight - r.top);
    const h = Math.min(r.height - top, Math.max(bottom - top, 360));
    ov.style.top = `${top}px`;
    ov.style.height = `${h}px`;
  }, []);

  const placePrint = useCallback((b: Box) => {
    const el = printRef.current;
    if (!el) return;
    Object.assign(el.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.w}px`, height: `${b.h}px`, visibility: 'visible' });
    el.style.setProperty('--pad', `${b.pad}px`);
    el.style.setProperty('--img-h', `${b.imgH}px`);
  }, []);

  const frameOffset = useCallback((i: number, b: Box) => {
    const fr = frameEls.current[i]?.getBoundingClientRect();
    const ov = overlayRef.current?.getBoundingClientRect();
    if (!fr || !ov) return { x: 0, y: 0, s: 1 };
    const s = fr.width / b.imgW;
    return { x: fr.left - ov.left - b.left - b.pad * s, y: fr.top - ov.top - b.top - b.pad * s, s };
  }, []);

  const paint = useCallback(() => {
    const m = motion.current;
    if (printRef.current) printRef.current.style.transform = `translate3d(${m.x.toFixed(2)}px, ${m.y.toFixed(2)}px, 0) scale(${m.s.toFixed(4)})`;
  }, []);

  const finishClose = useCallback(() => {
    setPhase('closed');
    const i = indexRef.current;
    setFocusIndex(i);
    frameEls.current[i]?.focus({ preventScroll: true });
  }, []);

  const step = useCallback(
    (now: number, last: number) => {
      const m = motion.current;
      const t = target.current;
      const dt = Math.min((now - last) / 1000, 1 / 30);
      const n = Math.max(1, Math.ceil(dt * 120));
      const h = dt / n;
      for (let k = 0; k < n; k++) {
        if (!drag.current.active) {
          m.vx += (STIFFNESS * (t.x - m.x) - DAMPING * m.vx) * h;
          m.x += m.vx * h;
        }
        m.vy += (STIFFNESS * (t.y - m.y) - DAMPING * m.vy) * h;
        m.vs += (STIFFNESS * (t.s - m.s) - DAMPING * m.vs) * h;
        m.y += m.vy * h;
        m.s += m.vs * h;
      }
      const settled =
        Math.abs(t.x - m.x) + Math.abs(t.y - m.y) < 0.6 &&
        Math.abs(t.s - m.s) < 0.002 &&
        Math.abs(m.vx) + Math.abs(m.vy) < 8 &&
        Math.abs(m.vs) < 0.02;
      const snap = !inViewRef.current || reducedRef.current;
      if ((settled || snap) && !drag.current.active) {
        Object.assign(m, t, { vx: 0, vy: 0, vs: 0 });
        paint();
        raf.current = 0;
        if (phaseRef.current === 'closing') finishClose();
        return;
      }
      paint();
      raf.current = requestAnimationFrame((next) => step(next, now));
    },
    [paint, finishClose],
  );

  const kick = useCallback(() => {
    if (raf.current) return;
    const start = performance.now();
    raf.current = requestAnimationFrame((t) => step(t, start - 16));
  }, [step]);

  const mark = (i: number) =>
    setMarked((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });

  const launch = useCallback(() => {
    launching.current = true;
    phaseRef.current = 'open';
    setPhase('open');
  }, []);

  const openAt = (i: number) => {
    window.clearTimeout(timer.current);
    const fresh = !marked.has(i);
    mark(i);
    setIndex(i);
    setFocusIndex(i);
    indexRef.current = i;
    if (reducedRef.current || !fresh) launch();
    else timer.current = window.setTimeout(launch, OPEN_DELAY);
  };

  const close = useCallback(() => {
    if (phaseRef.current !== 'open') return;
    const b = box.current;
    if (reducedRef.current || !b) {
      finishClose();
      return;
    }
    phaseRef.current = 'closing';
    setPhase('closing');
    target.current = frameOffset(indexRef.current, b);
    kick();
  }, [finishClose, frameOffset, kick]);

  const go = useCallback(
    (d: number) => {
      if (count < 2) return;
      const j = (indexRef.current + d + count) % count;
      indexRef.current = j;
      setIndex(j);
      mark(j);
      setSwap((s) => ({ key: s.key + 1, dir: d }));
      if (!reducedRef.current && !drag.current.active && Math.abs(motion.current.x) < 1) motion.current.x = d * 28;
      kick();
    },
    [count, kick],
  );

  useIsoLayoutEffect(() => {
    if (phase !== 'open') return;
    if (launching.current) fitOverlay();
    const b = computeBox(index);
    if (!b) return;
    box.current = b;
    placePrint(b);
    if (launching.current) {
      launching.current = false;
      target.current = { x: 0, y: 0, s: 1 };
      motion.current = reducedRef.current ? rest() : { ...rest(), ...frameOffset(index, b) };
      paint();
      kick();
      overlayRef.current?.focus({ preventScroll: true });
    }
  }, [phase, index, fitOverlay, computeBox, placePrint, frameOffset, paint, kick]);

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
    const ro = new ResizeObserver(() => {
      setCols(root.clientWidth < 560 ? 3 : 4);
      if (phaseRef.current !== 'open') return;
      fitOverlay();
      const b = computeBox(indexRef.current);
      if (b) {
        box.current = b;
        placePrint(b);
      }
    });
    ro.observe(root);
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.1 });
    io.observe(root);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [fitOverlay, computeBox, placePrint]);


  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      window.clearTimeout(timer.current);
    },
    [],
  );

  const onSheetKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    let next: number;
    if (e.key in moves) next = focusIndex + moves[e.key];
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    else return;
    e.preventDefault();
    next = Math.max(0, Math.min(count - 1, next));
    setFocusIndex(next);
    frameEls.current[next]?.focus();
  };

  const onOverlayKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      go(e.key === 'ArrowRight' ? 1 : -1);
    } else if (e.key === 'Tab') {
      const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button'));
      if (!items.length) return;
      const at = items.indexOf(document.activeElement as HTMLElement);
      const nextAt = e.shiftKey ? (at <= 0 ? items.length - 1 : at - 1) : (at + 1) % items.length;
      e.preventDefault();
      items[nextAt].focus();
    }
  };

  const onPrintDown = (e: PointerEvent<HTMLElement>) => {
    if (phaseRef.current !== 'open' || e.button !== 0 || count < 2) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { active: true, id: e.pointerId, x0: e.clientX - motion.current.x, dx: motion.current.x };
  };

  const onPrintMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.id) return;
    d.dx = e.clientX - d.x0;
    motion.current.x = reducedRef.current ? 0 : d.dx;
    paint();
  };

  const onPrintUp = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.id) return;
    d.active = false;
    if (Math.abs(d.dx) > SWIPE) go(d.dx < 0 ? 1 : -1);
    kick();
  };

  const current = photos[index];
  const nameOf = (i: number) => photos[i]?.caption || `${photoLabel} ${i + 1}`;
  const strips = Array.from({ length: Math.ceil(count / cols) }, (_, s) => Array.from({ length: cols }, (_, c) => s * cols + c));
  const gridCols = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };
  const isOpen = phase === 'open';
  const introRank = (i: number) => photos.slice(0, i).filter((p) => p.picked).length;
  const rootStyle = { '--csg-paper': paperTone, '--csg-marker': markerColor } as CSSProperties;
  const on = (base: string, active: string, flag: boolean) => (flag ? `${base} ${active}` : base);

  return (
    <section ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle} aria-label={ariaLabel}>
      <span className={styles.light} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />
      <svg className={styles.defs} aria-hidden="true" focusable="false">
        <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="1.8" />
        </filter>
      </svg>

      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.heading}>
            {rollLabel && <p className={styles.eyebrow}>{rollLabel}</p>}
            {title && <h2 className={styles.title}>{title}</h2>}
          </div>
        </header>

        <div className={styles.sheet} role="group" aria-label={ariaLabel} aria-description={SHEET_HELP} onKeyDown={onSheetKey}>
          {strips.map((cells, s) => (
            <div key={s} className={styles.strip} style={{ '--tilt': `${TILT[s % TILT.length]}deg` } as CSSProperties}>
              <div className={styles.bandTop} aria-hidden="true">
                {showFrameNumbers && rollLabel && <span className={styles.edgeLabel}>{rollLabel}</span>}
              </div>
              <div className={styles.frames} style={gridCols}>
                {cells.map((i) => {
                  const photo = photos[i];
                  if (!photo) return <span key={i} className={styles.blank} aria-hidden="true" />;
                  const drawn = inView && marked.has(i);
                  return (
                    <button
                      key={i}
                      ref={(el) => {
                        frameEls.current[i] = el;
                      }}
                      type="button"
                      className={styles.frame}
                      tabIndex={i === focusIndex ? 0 : -1}
                      aria-label={nameOf(i)}
                      aria-haspopup="dialog"
                      onClick={() => openAt(i)}
                      onFocus={() => setFocusIndex(i)}
                    >
                      <img
                        className={styles.thumb}
                        src={photo.image}
                        alt=""
                        draggable={false}
                        loading="lazy"
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          if (img.naturalWidth && img.naturalHeight) ratios.current[i] = img.naturalWidth / img.naturalHeight;
                        }}
                      />
                      <svg
                        className={styles.ring}
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        focusable="false"
                        style={{ '--delay': photo.picked ? `${300 + introRank(i) * 260}ms` : '0ms' } as CSSProperties}
                      >
                        <g filter={`url(#${filterId})`}>
                          <path className={on(styles.ringCore, styles.ringDrawn, drawn)} d={RING} pathLength={1} />
                          <path className={on(styles.ringWax, styles.ringDrawn, drawn)} d={RING} pathLength={1} />
                        </g>
                      </svg>
                    </button>
                  );
                })}
              </div>
              <div className={styles.bandBottom} style={gridCols} aria-hidden="true">
                {showFrameNumbers &&
                  cells.map((i) => (
                    <span key={i} className={styles.edgeNum}>
                      <span>▸ {pad2(i + 1)}</span>
                      <span>{pad2(i + 1)}A</span>
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {phase !== 'closed' && current && (
        <div className={on(styles.backdrop, styles.backdropOn, isOpen)} onClick={close} aria-hidden="true" />
      )}
      {phase !== 'closed' && current && (
        <div
          ref={overlayRef}
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label={nameOf(index)}
          tabIndex={-1}
          onKeyDown={onOverlayKey}
          onClick={(e) => {
            if (e.target === e.currentTarget || e.target === stageRef.current) close();
          }}
        >
          <div ref={stageRef} className={styles.stage} />
          <figure
            ref={printRef}
            className={on(styles.print, styles.printLifted, isOpen)}
            onPointerDown={onPrintDown}
            onPointerMove={onPrintMove}
            onPointerUp={onPrintUp}
            onPointerCancel={onPrintUp}
          >
            <div className={styles.printImage}>
              <img
                key={swap.key}
                className={swap.key ? `${styles.printImg} ${styles.printImgIn}` : styles.printImg}
                style={{ '--dir': swap.dir } as CSSProperties}
                src={current.image}
                alt={current.caption || ''}
                draggable={false}
              />
            </div>
            <span className={styles.printSheen} aria-hidden="true" />
            <figcaption className={on(styles.caption, styles.captionOn, isOpen)}>
              <span className={styles.captionNum} aria-hidden="true">
                {pad2(index + 1)}
              </span>
              {current.caption && <span className={styles.captionText}>{current.caption}</span>}
            </figcaption>
          </figure>

          <div className={on(styles.bar, styles.chromeOn, isOpen)}>
            {count > 1 && (
              <button type="button" className={styles.barButton} aria-label={previousLabel} onClick={() => go(-1)}>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className={styles.srOnly} aria-hidden="true">{previousLabel}</span>
              </button>
            )}
            <span className={styles.counter} aria-live="polite">
              {pad2(index + 1)} / {pad2(count)}
            </span>
            {count > 1 && (
              <button type="button" className={styles.barButton} aria-label={nextLabel} onClick={() => go(1)}>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className={styles.srOnly} aria-hidden="true">{nextLabel}</span>
              </button>
            )}
          </div>

          <button type="button" className={on(styles.close, styles.chromeOn, isOpen)} aria-label={closeLabel} onClick={close}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className={styles.srOnly} aria-hidden="true">{closeLabel}</span>
          </button>
        </div>
      )}
    </section>
  );
}
