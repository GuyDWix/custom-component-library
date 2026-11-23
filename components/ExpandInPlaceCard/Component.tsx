import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import styles from './Component.module.css';

export interface ExpandInPlaceCardProps {
  image?: string;
  imageAlt?: string;
  title?: string;
  summary?: string;
  fullText?: string;
  linkLabel?: string;
  linkUrl?: string;
  accentColor?: string;
  className?: string;
}

const EXPAND_LABEL = 'Expand';
const COLLAPSE_LABEL = 'Collapse';
const MAX_STAGGER_WORDS = 44;

export default function ExpandInPlaceCard({
  image = 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1600&fit=crop&auto=format&q=80',
  imageAlt = 'Weathered wooden jetty reaching into calm water, orange channel buoys marking the lane',
  title = 'Saltwhistle Boatyard',
  summary = 'Haul-out, antifoul and rigging work for boats up to 12 metres, two minutes from the marina gate.',
  fullText =
    'The yard handles everything from a quick scrub and antifoul to a full refit: pressure washing, engine servicing, rig tuning and mast lifts, all done in-house by a crew that has worked this harbour for fifteen years. Winter storage ashore runs October to March, with secure hard standing, shore power and round-the-clock access for owners.',
  linkLabel = 'Book a slot',
  linkUrl = '#booking',
  accentColor = '#ff6a3d',
  className,
}: ExpandInPlaceCardProps) {
  const [open, setOpen] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);
  const uid = useId();
  const titleId = `${uid}-title`;
  const moreId = `${uid}-more`;
  const rootRef = useRef<HTMLElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const reducedRef = useRef(false);
  const wasOpen = useRef(false);

  reducedRef.current = reduced;

  const trimmedFull = fullText.trim();
  const trimmedLabel = linkLabel.trim();
  const trimmedUrl = linkUrl.trim();
  const linkReady = Boolean(trimmedLabel && trimmedUrl);
  const hasMore = Boolean(trimmedFull || linkReady);
  const trimmedImage = image.trim();
  const showPhoto = Boolean(trimmedImage) && !broken;
  const words = trimmedFull ? trimmedFull.split(/\s+/) : [];
  // Display size follows title length so a short name is a poster and a long one still fits.
  const titleLen = title.trim().length;
  const titleTier = titleLen <= 22 ? undefined : titleLen <= 34 ? styles.titleL : titleLen <= 54 ? styles.titleM : styles.titleS;

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.1 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  // A new image source restarts the load state; cached images may be complete before hydration.
  useEffect(() => {
    setBroken(false);
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setLoaded(true);
    else setLoaded(false);
  }, [trimmedImage]);

  useEffect(() => {
    if (!open) return;
    const onDocKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const root = rootRef.current;
      const active = document.activeElement;
      if (!root || !active || active === document.body || root.contains(active)) setOpen(false);
    };
    document.addEventListener('keydown', onDocKey);
    return () => document.removeEventListener('keydown', onDocKey);
  }, [open]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (open && !wasOpen.current) {
      const root = rootRef.current;
      if (root) {
        const run = () => root.scrollIntoView({ behavior: reducedRef.current ? 'auto' : 'smooth', block: 'nearest' });
        if (reducedRef.current) run();
        else t = setTimeout(run, 380);
      }
    }
    wasOpen.current = open;
    return () => {
      if (t) clearTimeout(t);
    };
  }, [open]);

  const onRootClick = (e: MouseEvent<HTMLElement>) => {
    if (!hasMore) return;
    const target = e.target as HTMLElement;
    if (target.closest('a, button')) return;
    toggle();
  };

  const onRootKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape' && open) setOpen(false);
  };

  const rootStyle = { '--ei-accent': accentColor } as CSSProperties;
  const cls = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ');
  const linkArrow = (
    <svg
      className={styles.linkArrow}
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.9 8h10" />
      <path d="M9.2 4.3 12.9 8l-3.7 3.7" />
    </svg>
  );

  return (
    <article
      ref={rootRef}
      className={cls(styles.root, hasMore && styles.rootInteractive, open && styles.rootOpen, className)}
      style={rootStyle}
      aria-labelledby={titleId}
      onClick={hasMore ? onRootClick : undefined}
      onKeyDown={onRootKeyDown}
    >
      <div className={styles.stage}>
        <span className={cls(styles.contours, !inView && styles.contoursPaused, open && styles.contoursHidden)} aria-hidden="true" />
        <span className={cls(styles.ticks, open && styles.ticksHidden)} aria-hidden="true" />

        <div className={styles.photoWrap}>
          <div className={cls(styles.photoFrame, open && styles.photoFrameOpen)}>
            <span className={cls(styles.painted, (!inView || (loaded && showPhoto)) && styles.paintedPaused)} aria-hidden="true">
              <span className={styles.paintedJetty} />
              <span className={styles.paintedBuoyA} />
              <span className={styles.paintedBuoyB} />
            </span>
            {showPhoto && (
              <span className={styles.photoBox}>
                <img
                  ref={imgRef}
                  className={cls(styles.photo, loaded && styles.photoLoaded, open && styles.photoOpen)}
                  src={trimmedImage}
                  alt={imageAlt}
                  draggable={false}
                  decoding="async"
                  onLoad={() => setLoaded(true)}
                  onError={() => setBroken(true)}
                />
              </span>
            )}
            <span className={styles.scrimSide} aria-hidden="true" />
            <span className={cls(styles.scrimFloor, open && styles.scrimFloorOpen)} aria-hidden="true" />
          </div>
        </div>

        {hasMore && (
          <button
            type="button"
            className={cls(styles.toggle, open && styles.toggleOn)}
            aria-expanded={open}
            aria-controls={moreId}
            aria-label={open ? COLLAPSE_LABEL : EXPAND_LABEL}
            onClick={toggle}
          >
            <span className={styles.toggleFace}>
              <svg
                className={cls(styles.toggleIcon, open && styles.toggleIconOn)}
                viewBox="0 0 16 16"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              >
                <path d="M8 2.9v10.2" />
                <path d="M2.9 8h10.2" />
              </svg>
            </span>
          </button>
        )}

        <div className={styles.copy}>
          <h3 id={titleId} className={cls(styles.title, titleTier, open && styles.titleOn)}>
            {title}
          </h3>
          {Boolean(summary.trim()) && <p className={cls(styles.summary, open && styles.summaryOn)}>{summary}</p>}
        </div>
      </div>

      {hasMore && (
        <div id={moreId} className={cls(styles.more, open && styles.moreOpen)} aria-hidden={!open}>
          <div className={styles.moreClip}>
            <div className={styles.moreInner}>
              <span className={cls(styles.rule, open && styles.ruleOn)} aria-hidden="true" />
              {trimmedFull && (
                <p className={styles.fullText}>
                  {words.map((w, i) => (
                    <Fragment key={i}>
                      <span
                        className={cls(styles.word, open && styles.wordOn)}
                        style={{ '--ei-i': Math.min(i, MAX_STAGGER_WORDS) } as CSSProperties}
                      >
                        {w}
                      </span>{' '}
                    </Fragment>
                  ))}
                </p>
              )}
              {trimmedLabel &&
                (linkReady ? (
                  <a className={cls(styles.link, open && styles.linkOn)} href={trimmedUrl} onClick={(e) => e.stopPropagation()}>
                    <span className={styles.linkLabel}>{trimmedLabel}</span>
                    {linkArrow}
                  </a>
                ) : (
                  <button type="button" className={cls(styles.link, open && styles.linkOn)} disabled>
                    <span className={styles.linkLabel}>{trimmedLabel}</span>
                    {linkArrow}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      <span className={styles.grain} aria-hidden="true" />
    </article>
  );
}
