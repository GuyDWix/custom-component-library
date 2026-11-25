Create a custom element called "Expand In-Place Card". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: image, image alt text, title, summary, full text, link label, link URL, accent color. Add other settings if they help.

```tsx
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
      onKeyDown={onRootKeyDown}
    >
      <div className={styles.card} onClick={hasMore ? onRootClick : undefined}>
      <div className={styles.stage}>
        <span className={cls(styles.contours, open && styles.contoursHidden)} aria-hidden="true" />

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
            className={styles.toggle}
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
                strokeWidth="1.5"
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
      </div>
    </article>
  );
}
```

```css
.root {
  --ei-accent: #ff6a3d;
  --ei-on-accent: #1c0f08;
  --ei-panel: #263341;
  --ei-panel-raise: #3a5064;
  --ei-panel-deep: #18212b;
  --ei-ink: #f4f8fb;
  --ei-ink-soft: rgba(244, 248, 251, 0.84);
  --ei-line: rgba(244, 248, 251, 0.18);
  --ei-font-display: 'Archivo', system-ui, -apple-system, sans-serif;
  --ei-font-ui: 'Archivo', system-ui, -apple-system, sans-serif;
  --ei-spring: cubic-bezier(0.34, 1.38, 0.5, 1);
  --ei-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ei-grow: cubic-bezier(0.32, 0.72, 0, 1);
  --ei-ease: cubic-bezier(0.22, 0.8, 0.24, 1);

  position: relative;
  isolation: isolate;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  color: var(--ei-ink);
  font-family: var(--ei-font-ui);
  scrollbar-color: color-mix(in srgb, var(--ei-accent) 70%, transparent) transparent;
  -webkit-font-smoothing: antialiased;
}

/* ---------- card: the surface that grows ----------
   .root is the stable frame (the container); the card inside is a compact teaser
   about half the frame wide and banner-low. Opening grows it to the full frame
   width and the full stage height, from its own centre line, so the size contrast
   between the two states IS the expand effect. */

.card {
  /* collapsed geometry */
  --ei-cw: min(100cqi, max(380px, 46cqi));
  --ei-h0: 148px;
  --ei-lm: calc(var(--ei-cw) * 0.4);
  --ei-r: calc(var(--ei-h0) / 2 - 8px);
  --ei-ax: calc(var(--ei-lm) + var(--ei-r));
  --ei-ay: calc(var(--ei-h0) / 2);
  --ei-pad0: 22px;
  /* expanded geometry */
  --ei-h: clamp(400px, 40cqi, 520px);
  --ei-pad: clamp(24px, 3.6cqi, 46px);

  position: relative;
  box-sizing: border-box;
  inline-size: var(--ei-cw);
  margin-inline: auto;
  overflow: hidden;
  border-radius: 22px;
  background:
    radial-gradient(80% 90% at 0% 0%, var(--ei-panel-raise) 0%, transparent 64%),
    linear-gradient(170deg, var(--ei-panel) 0%, var(--ei-panel-deep) 100%);
  box-shadow:
    inset 0 0 0 1px rgba(244, 248, 251, 0.07),
    0 30px 60px -34px rgba(6, 10, 15, 0.8),
    0 6px 16px -6px rgba(6, 10, 15, 0.5);
  transition:
    inline-size 1000ms var(--ei-grow),
    border-radius 1000ms var(--ei-grow);
}

.rootOpen .card {
  inline-size: 100%;
  border-radius: 32px;
}

@container (max-inline-size: 639px) {
  .card {
    --ei-cw: 100cqi;
    --ei-h0: 112px;
    --ei-lm: calc(var(--ei-cw) * 0.44);
    --ei-pad0: 16px;
    --ei-h: clamp(500px, 138cqi, 620px);
    --ei-pad: 24px;
  }
}

.root ::selection {
  background: var(--ei-accent);
  color: var(--ei-on-accent);
}

.rootInteractive .card {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.rootOpen .card {
  cursor: default;
}

/* ---------- stage: the shared element ----------
   Collapsed: a low banner, text on the slate at left, an arched window of photo at
   right. Expanded: the arch opens to the whole stage. Both are the same box, so the
   photo, scrims and copy simply ride the growth. */

.stage {
  position: relative;
  display: grid;
  align-items: stretch;
  box-sizing: border-box;
  min-block-size: var(--ei-h0);
  transition: min-block-size 1000ms var(--ei-grow);
}

.rootOpen .stage {
  min-block-size: calc(var(--ei-h) + 40px);
}

/* the photo layer; the frame inside morphs */
.photoWrap {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.photoFrame {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #10202d;
  clip-path: inset(8px 8px 8px var(--ei-lm) round var(--ei-r) 14px 14px var(--ei-r));
  transition: clip-path 1000ms var(--ei-grow);
}

@media (hover: hover) {
  .photoFrame:hover {
    --ei-hover: 1;
  }
}

.photoFrameOpen,
.photoFrameOpen:hover {
  --ei-hover: 0;
  clip-path: inset(0 0 0 0 round 0 0 0 0);
  transition-duration: 1000ms;
}

/* CSS-painted harbour: always under the photo, so the frame can never be blank */
.painted {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background:
    radial-gradient(55% 38% at 68% 51%, rgba(255, 220, 178, 0.6), transparent 72%),
    linear-gradient(180deg, #3b82bd 0%, #86b9d8 33%, #efd8bd 50.6%, #2b658d 51%, #18435f 74%, #0c202f 100%);
}

.painted::after {
  content: '';
  position: absolute;
  inset-block: 51% 0;
  inset-inline: -40px;
  background: repeating-linear-gradient(180deg, transparent 0 8px, rgba(255, 255, 255, 0.08) 8px 9px);
  animation: eiDrift 7s ease-in-out infinite alternate;
}

.paintedPaused::after {
  animation-play-state: paused;
}

.paintedJetty {
  position: absolute;
  inset-block: 50% 0;
  inset-inline: 30%;
  clip-path: polygon(40% 0, 60% 0, 100% 100%, 0 100%);
  background:
    repeating-linear-gradient(180deg, rgba(10, 8, 6, 0.34) 0 2px, transparent 2px 16px),
    linear-gradient(180deg, #6c5a48 0%, #8d7761 38%, #3b2f26 100%);
}

.paintedBuoyA,
.paintedBuoyB {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle at 34% 30%, #ffc2a3 0%, var(--ei-accent) 55%, #9a3516 100%);
}

.paintedBuoyA {
  inset-inline-start: 64%;
  inset-block-start: 53.4%;
  inline-size: 18px;
  block-size: 18px;
}

.paintedBuoyB {
  inset-inline-start: 74%;
  inset-block-start: 51.8%;
  inline-size: 11px;
  block-size: 11px;
}

.photoBox {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.photoBoxOpen {
  inset: 0;
}

.photo {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  object-position: 50% 62%;
  opacity: 0;
  transform: scale(1.16) translate3d(-1%, 2%, 0);
  scale: calc(1 + var(--ei-hover, 0) * 0.04);
  transform-origin: 62% 70%;
  transition:
    opacity 700ms var(--ei-ease),
    transform 1700ms var(--ei-expo),
    scale 700ms var(--ei-ease);
}

.photoLoaded {
  opacity: 1;
}

.photoOpen {
  transform: scale(1) translate3d(0, 0, 0);
}

.scrimSide {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(62% 70% at 0% 0%, rgba(12, 21, 30, 0.62) 0%, rgba(12, 21, 30, 0.2) 52%, transparent 78%),
    radial-gradient(60% 60% at 0% 100%, rgba(12, 21, 30, 0.7) 0%, transparent 74%);
}

.scrimFloor {
  position: absolute;
  inset: 0;
  opacity: 0.55;
  background: linear-gradient(
    0deg,
    rgba(14, 22, 30, 0.88) 0%,
    rgba(14, 22, 30, 0.5) 22%,
    transparent 58%
  );
  transition: opacity 900ms var(--ei-ease);
}

.scrimFloorOpen {
  opacity: 1;
  background: linear-gradient(
    0deg,
    var(--ei-panel-deep) 0%,
    rgba(24, 33, 43, 0.82) 14%,
    rgba(14, 22, 30, 0.5) 38%,
    transparent 70%
  );
}

/* three quiet chart rings, centred on the arch, in the slate margin */
.contours {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(
    circle at var(--ei-ax) var(--ei-ay),
    transparent 0,
    transparent calc(var(--ei-r) + 15px),
    rgba(244, 248, 251, 0.14) calc(var(--ei-r) + 15px) calc(var(--ei-r) + 16px),
    transparent calc(var(--ei-r) + 16px),
    transparent calc(var(--ei-r) + 33px),
    rgba(244, 248, 251, 0.09) calc(var(--ei-r) + 33px) calc(var(--ei-r) + 34px),
    transparent calc(var(--ei-r) + 34px),
    transparent calc(var(--ei-r) + 55px),
    rgba(244, 248, 251, 0.06) calc(var(--ei-r) + 55px) calc(var(--ei-r) + 56px),
    transparent calc(var(--ei-r) + 56px)
  );
  transition: opacity 620ms var(--ei-ease);
}

.contoursHidden {
  opacity: 0;
}

/* ---------- title + summary ---------- */

.copy {
  position: relative;
  z-index: 2;
  display: grid;
  align-content: space-between;
  box-sizing: border-box;
  min-inline-size: 0;
  padding-block: 16px;
  padding-inline: var(--ei-pad0);
  pointer-events: none;
  transition: padding 1000ms var(--ei-grow);
}

.rootOpen .copy {
  padding-block: clamp(26px, 3.4cqi, 44px) clamp(26px, 3.4cqi, 42px);
  padding-inline: var(--ei-pad);
}

/* narrow: the text block is bottom-anchored in both states, so it rides the growth down */
@container (max-inline-size: 639px) {
  .copy {
    align-content: end;
    padding-block: 14px;
  }

  .rootOpen .copy {
    padding-block: 26px 28px;
  }
}

.title {
  /* open size per tier (the poster) and collapsed size per tier (the teaser) */
  --ei-title-size: min(6.4cqi, 80px);
  --ei-open-scale: 1.1;
  --ei-t0: max(15px, calc(var(--ei-cw) * 0.065));
  margin: 0;
  padding-block-end: 0.06em;
  max-inline-size: 47%;
  font-family: var(--ei-font-display);
  font-size: var(--ei-t0);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: -0.035em;
  color: var(--ei-ink);
  text-wrap: balance;
  overflow-wrap: anywhere;
  hyphens: auto;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  text-shadow: 0 1px 12px rgba(8, 14, 20, 0.4);
  transition:
    font-size 1000ms var(--ei-grow) 40ms,
    max-inline-size 1000ms var(--ei-grow) 40ms,
    margin 1000ms var(--ei-grow) 40ms;
}

.titleL {
  --ei-title-size: min(5.4cqi, 66px);
  --ei-open-scale: 1.15;
  --ei-t0: max(15px, calc(var(--ei-cw) * 0.056));
}

.titleM {
  --ei-title-size: min(4.4cqi, 54px);
  --ei-open-scale: 1;
  --ei-t0: max(14px, calc(var(--ei-cw) * 0.046));
}

.titleS {
  --ei-title-size: min(3.6cqi, 44px);
  --ei-open-scale: 1;
  --ei-t0: max(13px, calc(var(--ei-cw) * 0.04));
}

@container (max-inline-size: 639px) {
  .title {
    --ei-title-size: 11.6cqi;
    max-inline-size: 58%;
    margin-block-end: 5px;
  }

  .titleL {
    --ei-title-size: 9.4cqi;
  }

  .titleM {
    --ei-title-size: 7.4cqi;
  }

  .titleS {
    --ei-title-size: 6.4cqi;
  }
}

.titleOn {
  font-size: calc(var(--ei-title-size) * var(--ei-open-scale));
  max-inline-size: 50%;
  line-height: 0.92;
  -webkit-line-clamp: 4;
  line-clamp: 4;
}

@container (max-inline-size: 639px) {
  .titleOn {
    max-inline-size: 100%;
    margin-block-end: 16px;
  }
}

.summary {
  margin: 0;
  max-inline-size: calc(var(--ei-cw) * 0.56);
  font-size: clamp(12.5px, calc(var(--ei-cw) * 0.026), 15px);
  font-weight: 450;
  line-height: 1.45;
  color: var(--ei-ink-soft);
  text-shadow: 0 1px 10px rgba(8, 14, 20, 0.45);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  overflow: hidden;
  transition:
    font-size 1000ms var(--ei-grow) 40ms,
    max-inline-size 1000ms var(--ei-grow) 40ms,
    transform 800ms var(--ei-expo),
    color 400ms var(--ei-ease);
}

@container (max-inline-size: 639px) {
  .summary {
    max-inline-size: calc(var(--ei-cw) * 0.56);
  }
}

.summaryOn {
  max-inline-size: 31ch;
  font-size: clamp(15px, 1.5cqi, 18px);
  line-height: 1.5;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  transform: translate3d(0, -2px, 0);
  color: var(--ei-ink);
}

@container (max-inline-size: 639px) {
  .summaryOn {
    font-size: 15px;
    max-inline-size: 36ch;
  }
}

/* ---------- toggle: a flat plus control with a hairline border ---------- */

.toggle {
  position: absolute;
  inset-block-start: 9px;
  inset-inline-end: 9px;
  z-index: 5;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  inline-size: 44px;
  block-size: 44px;
  padding: 0;
  border: 1px solid rgba(244, 248, 251, 0.4);
  border-radius: 50%;
  background: rgba(14, 22, 30, 0.42);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  color: var(--ei-ink);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color 240ms var(--ei-ease),
    border-color 240ms var(--ei-ease),
    transform 240ms var(--ei-ease),
    inset 1000ms var(--ei-grow);
}

.rootOpen .toggle {
  inset-block-start: 16px;
  inset-inline-end: 16px;
}

.toggleFace {
  display: grid;
  place-items: center;
}

@media (hover: hover) {
  .toggle:hover {
    background: rgba(244, 248, 251, 0.16);
    border-color: rgba(244, 248, 251, 0.85);
  }
}

.toggle:active {
  transform: scale(0.95);
}

.toggle:focus-visible,
.link:focus-visible {
  outline: 2px solid var(--ei-ink);
  outline-offset: 3px;
}

.toggleIcon {
  inline-size: 18px;
  block-size: 18px;
  transition: transform 420ms var(--ei-ease);
}

.toggleIconOn {
  transform: rotate(45deg);
}

/* ---------- details ---------- */

.more {
  display: grid;
  grid-template-rows: 0fr;
  visibility: hidden;
  background: var(--ei-panel-deep);
  transition:
    grid-template-rows 760ms var(--ei-expo),
    visibility 0s linear 760ms;
}

.moreOpen {
  grid-template-rows: 1fr;
  visibility: visible;
  transition:
    grid-template-rows 960ms var(--ei-expo) 200ms,
    visibility 0s;
}

.moreClip {
  min-block-size: 0;
  overflow: hidden;
}

.moreInner {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 2fr);
  align-items: start;
  column-gap: clamp(24px, 5cqi, 64px);
  row-gap: 22px;
  padding-block: 6px clamp(30px, 4.4cqi, 52px);
  padding-inline: var(--ei-pad);
}

@container (max-inline-size: 639px) {
  .moreInner {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 20px;
  }
}

.rule {
  display: block;
  grid-column: 1 / -1;
  inline-size: 72px;
  block-size: 3px;
  border-radius: 3px;
  background: var(--ei-accent);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 220ms var(--ei-ease);
}

.ruleOn {
  transform: scaleX(1);
  transition: transform 760ms var(--ei-expo) 380ms;
}

.fullText {
  grid-column: 2;
  grid-row: 2;
  margin: 0;
  max-inline-size: 60ch;
  font-size: clamp(16px, 1.7cqi, 20px);
  line-height: 1.62;
  color: var(--ei-ink-soft);
  text-wrap: pretty;
  overflow-wrap: anywhere;
}

@container (max-inline-size: 639px) {
  .fullText {
    grid-column: 1;
    grid-row: auto;
    font-size: 16px;
  }
}

.word {
  display: inline-block;
  opacity: 0;
  transform: translate3d(0, 0.6em, 0);
  transition:
    opacity 140ms linear,
    transform 140ms linear;
}

.wordOn {
  opacity: 1;
  transform: translate3d(0, 0, 0);
  transition:
    opacity 520ms var(--ei-ease) calc(520ms + var(--ei-i) * 15ms),
    transform 760ms var(--ei-expo) calc(520ms + var(--ei-i) * 15ms);
}

.link {
  grid-column: 1;
  grid-row: 2;
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  min-block-size: 54px;
  max-inline-size: 100%;
  padding-block: 0;
  padding-inline: 26px 22px;
  border: 0;
  border-radius: 999px;
  background: var(--ei-accent);
  color: var(--ei-on-accent);
  font-family: var(--ei-font-ui);
  font-size: 16px;
  font-weight: 650;
  letter-spacing: -0.005em;
  text-decoration: none;
  cursor: pointer;
  opacity: 0;
  transform: translate3d(0, 14px, 0);
  transition:
    opacity 140ms linear,
    transform 140ms linear;
}

@container (max-inline-size: 639px) {
  .link {
    grid-row: auto;
  }
}

.linkOn {
  opacity: 1;
  transform: translate3d(0, 0, 0);
  transition:
    opacity 520ms var(--ei-ease) 780ms,
    transform 800ms var(--ei-spring) 780ms;
}

.link:disabled {
  cursor: not-allowed;
  filter: saturate(0.4);
}

.linkLabel {
  min-inline-size: 0;
  overflow-wrap: anywhere;
  text-align: start;
}

.linkArrow {
  flex: none;
  inline-size: 18px;
  block-size: 18px;
  transition: transform 360ms var(--ei-spring);
}

@media (hover: hover) {
  .link:hover .linkArrow {
    transform: translate3d(4px, 0, 0);
  }
}

@keyframes eiDrift {
  from {
    transform: translate3d(-26px, 0, 0);
  }
  to {
    transform: translate3d(0, 0, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .card,
  .copy,
  .stage,
  .photoFrame,
  .photo,
  .scrimFloor,
  .contours,
  .title,
  .summary,
  .toggle,
  .toggleIcon,
  .more,
  .moreOpen,
  .rule,
  .ruleOn,
  .word,
  .wordOn,
  .link,
  .linkOn,
  .linkArrow {
    transition: none;
  }

  .painted::after {
    animation: none;
  }
}
```
