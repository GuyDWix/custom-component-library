import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import styles from './Component.module.css';

export type MatBoardFrameFinish = 'oak' | 'walnut' | 'ebony' | 'white';

export interface MatBoardFrameProps {
  image?: string;
  imageAlt?: string;
  contentText?: string;
  title?: string;
  price?: string;
  note?: string;
  matColor?: string;
  frameFinish?: MatBoardFrameFinish;
  className?: string;
}

const finishClass: Record<MatBoardFrameFinish, string> = {
  oak: styles.finishOak,
  walnut: styles.finishWalnut,
  ebony: styles.finishEbony,
  white: styles.finishWhite,
};

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

const STIFFNESS = 90;
const DAMPING = 16;

export default function MatBoardFrame({
  image = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=900&h=1125&fit=crop&q=80',
  imageAlt = 'Still life painting of tulips, roses and wildflowers in a vase on a dark ground',
  contentText = 'The table is set at seven.',
  title = 'Still Life with Tulips',
  price = '€1,450',
  note = 'Archival print on cotton rag, 50 × 62 cm, in a hand-finished oak frame. Signed and numbered, edition of 40. Ships in five working days.',
  matColor = '#e9e0cf',
  frameFinish = 'oak',
  className,
}: MatBoardFrameProps) {
  const [reduced, setReduced] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const uid = useId();
  const noteId = `${uid}-note`;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) {
      root?.style.removeProperty('--mb-sp');
      return;
    }
    let inView = false;
    let frame = 0;
    let last = 0;
    const s = { x: 0, v: 0 };

    const goal = () => {
      const r = root.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      return Math.max(-1, Math.min(1, p));
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const g = goal();
      s.v += (STIFFNESS * (g - s.x) - DAMPING * s.v) * dt;
      s.x += s.v * dt;
      root.style.setProperty('--mb-sp', s.x.toFixed(4));
      frame = Math.abs(g - s.x) > 0.0005 || Math.abs(s.v) > 0.0005 ? requestAnimationFrame(tick) : 0;
    };

    const wake = () => {
      if (!inView || frame) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    s.x = goal();
    root.style.setProperty('--mb-sp', s.x.toFixed(4));

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) wake();
    });
    io.observe(root);
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', wake);
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', wake);
      window.removeEventListener('resize', wake);
      cancelAnimationFrame(frame);
    };
  }, [reduced]);

  const hasNote = note.trim().length > 0;
  const interactive = hasNote && !reduced;
  const open = !interactive || hovered || pinned;

  const onHover = (e: PointerEvent<HTMLElement>, on: boolean) => {
    if (e.pointerType === 'mouse') setHovered(on);
  };

  const rootStyle = { '--mb-mat': matColor } as CSSProperties;
  const plaqueText = (
    <>
      <span className={styles.title}>{title}</span>
      {price && <span className={styles.price}>{price}</span>}
    </>
  );

  return (
    <div
      ref={rootRef}
      className={cx(styles.root, finishClass[frameFinish] ?? styles.finishOak, className)}
      style={rootStyle}
    >
      <span className={styles.wallGrain} aria-hidden="true" />
      <figure
        className={styles.piece}
        onPointerEnter={(e) => onHover(e, true)}
        onPointerLeave={(e) => onHover(e, false)}
      >
        <div className={styles.hang}>
          <span className={styles.spot} aria-hidden="true" />
          <span className={styles.wallShadow} aria-hidden="true" />
          <div className={styles.frame}>
            <span className={styles.railTop} aria-hidden="true" />
            <span className={styles.railBottom} aria-hidden="true" />
            <span className={styles.railLeft} aria-hidden="true" />
            <span className={styles.railRight} aria-hidden="true" />
            <div className={styles.mat}>
              <span className={styles.matTexture} aria-hidden="true" />
              <div className={styles.window}>
                {image ? (
                  <img className={styles.art} src={image} alt={imageAlt} draggable={false} />
                ) : (
                  <div className={styles.textArt}>
                    <p className={styles.textArtCopy}>{contentText}</p>
                  </div>
                )}
                <span className={styles.recess} aria-hidden="true" />
                <span className={styles.bevel} aria-hidden="true" />
                <span className={styles.bevelLight} aria-hidden="true" />
              </div>
            </div>
            <span className={styles.glass} aria-hidden="true" />
          </div>
        </div>

        <figcaption className={cx(styles.plaque, open && styles.plaqueOpen)}>
          <span className={styles.brass} aria-hidden="true" />
          <span className={styles.screwStart} aria-hidden="true" />
          <span className={styles.screwEnd} aria-hidden="true" />
          {interactive ? (
            <button
              type="button"
              className={[styles.plaqueHead, styles.plaqueButton].join(' ')}
              aria-expanded={open}
              aria-controls={noteId}
              onClick={() => setPinned((p) => !p)}
            >
              {plaqueText}
              <span className={cx(styles.chevron, open && styles.chevronOpen)} aria-hidden="true" />
            </button>
          ) : (
            <div className={styles.plaqueHead}>{plaqueText}</div>
          )}
          {hasNote && (
            <div id={noteId} className={cx(styles.noteWrap, open && styles.noteWrapOpen)}>
              <div className={styles.noteClip}>
                <p className={cx(styles.note, open && styles.noteShown)}>{note}</p>
              </div>
            </div>
          )}
        </figcaption>
      </figure>
    </div>
  );
}
