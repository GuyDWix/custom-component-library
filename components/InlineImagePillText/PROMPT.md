Create a custom element called "Inline Image Pill Text". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: sentence, pills (position = word number to replace, image), pill height, small label, accessibility description. Add other settings if they help.

```tsx
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface InlineImagePill {
  position: number;
  image?: string;
}

export interface InlineImagePillTextProps {
  sentence?: string;
  pills?: InlineImagePill[];
  pillHeight?: number;
  label?: string;
  pillDescription?: string;
  className?: string;
}

const photo = (id: string) => `https://images.unsplash.com/photo-${id}?w=960&h=320&fit=crop&q=75`;

export const defaultSentence =
  'Every plate starts with morning bread, garden tomatoes, a splash of olive oil and a table by the sea.';

export const defaultPills: InlineImagePill[] = [
  { position: 6, image: photo('1509440159596-0249088772ff') },
  { position: 8, image: photo('1546094096-0df4bcaaa337') },
  { position: 13, image: photo('1474979266404-7eaacbcd87c5') },
  { position: 19, image: photo('1507525428034-b723cf961d3e') },
];

const COLLAPSED = 1.6;
const DEFAULT_OPEN = 3.2;
const MIN_OPEN = 2.6;
const MAX_OPEN = 3.6;
const STIFFNESS = 240;
const DAMPING = 21;
const STAGGER_MS = 110;
const DEMO_DELAY_MS = 900;
const DEMO_HOLD_MS = 1700;

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const WORD_EDGES = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u;

type Token = { text: string; pill?: number; lead?: string; word?: string; trail?: string };
type Spring = { f: number; v: number };

function tokenize(sentence: string, pills: InlineImagePill[]): Token[] {
  const byPosition = new Map<number, number>();
  pills.forEach((p, i) => {
    if (!byPosition.has(p.position)) byPosition.set(p.position, i);
  });
  let wordNo = 0;
  return sentence.split(/(\s+)/).filter(Boolean).map((text) => {
    if (/^\s+$/.test(text)) return { text };
    wordNo += 1;
    const pill = byPosition.get(wordNo);
    if (pill === undefined) return { text };
    const [, lead = '', word = text, trail = ''] = text.match(WORD_EDGES) ?? [];
    return { text, pill, lead, word: word || text, trail };
  });
}

export default function InlineImagePillText({
  sentence = defaultSentence,
  pills = defaultPills,
  pillHeight = 92,
  label = 'From our kitchen',
  pillDescription = 'Hover, tap or press Enter to widen the photo. Escape closes it.',
  className,
}: InlineImagePillTextProps) {
  const tokens = useMemo(() => tokenize(sentence, pills), [sentence, pills]);
  const [active, setActive] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(false);
  const [failed, setFailed] = useState<Set<number>>(() => new Set());

  const rootRef = useRef<HTMLElement>(null);
  const pillEls = useRef<(HTMLButtonElement | null)[]>([]);
  const springs = useRef<Spring[]>([]);
  const openRatio = useRef<number[]>([]);
  const pointerKind = useRef<string | null>(null);
  const interacted = useRef(false);
  const activeRef = useRef(active);
  const reducedRef = useRef(reduced);
  const raf = useRef(0);

  activeRef.current = active;
  reducedRef.current = reduced;

  const openFor = (i: number) => openRatio.current[i] ?? DEFAULT_OPEN;

  const target = useCallback((i: number) => {
    if (reducedRef.current) return (COLLAPSED + openFor(i)) / 2;
    return activeRef.current === i ? openFor(i) : COLLAPSED;
  }, []);

  const paint = useCallback(() => {
    springs.current.forEach((s, i) => {
      const el = pillEls.current[i];
      if (!el) return;
      const open = openFor(i);
      el.style.setProperty('--f', s.f.toFixed(4));
      el.style.setProperty('--p', clamp((s.f - COLLAPSED) / (open - COLLAPSED), 0, 1).toFixed(4));
    });
  }, []);

  const tick = useCallback(
    (now: number, last: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      let busy = false;
      springs.current.forEach((s, i) => {
        const to = target(i);
        for (let n = 0; n < steps; n++) {
          s.v += (STIFFNESS * (to - s.f) - DAMPING * s.v) * h;
          s.f += s.v * h;
        }
        if (Math.abs(s.v) < 0.004 && Math.abs(to - s.f) < 0.002) Object.assign(s, { f: to, v: 0 });
        else busy = true;
      });
      paint();
      raf.current = busy ? requestAnimationFrame((t) => tick(t, now)) : 0;
    },
    [paint, target],
  );

  const kick = useCallback(() => {
    if (reducedRef.current || document.visibilityState === 'hidden') {
      springs.current.forEach((s, i) => Object.assign(s, { f: target(i), v: 0 }));
      paint();
      return;
    }
    if (raf.current) return;
    const start = performance.now();
    raf.current = requestAnimationFrame((t) => tick(t, start - 16));
  }, [paint, target, tick]);

  useIsoLayoutEffect(() => {
    const instant = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    reducedRef.current = instant;
    springs.current = pills.map((_, i) => ({ f: springs.current[i]?.f ?? target(i), v: 0 }));
    paint();
  }, [pills, paint, target]);

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
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || reduced || !pills.length || interacted.current) return;
    const entranceMs = 160 + pills.length * STAGGER_MS;
    const open = window.setTimeout(() => {
      if (!interacted.current) setActive(0);
    }, entranceMs + DEMO_DELAY_MS);
    const close = window.setTimeout(() => {
      if (!interacted.current) setActive((cur) => (cur === 0 ? null : cur));
    }, entranceMs + DEMO_DELAY_MS + DEMO_HOLD_MS);
    return () => {
      clearTimeout(open);
      clearTimeout(close);
    };
  }, [inView, reduced, pills]);

  useEffect(() => {
    if (!inView) {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      springs.current.forEach((s, i) => Object.assign(s, { f: target(i), v: 0 }));
      paint();
    }
  }, [inView, paint, target]);

  useEffect(() => {
    kick();
  }, [active, reduced, kick]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const onImageLoad = (i: number, img: HTMLImageElement) => {
    if (!img.naturalWidth || !img.naturalHeight) return;
    openRatio.current[i] = clamp((img.naturalWidth / img.naturalHeight) * 1.05, MIN_OPEN, MAX_OPEN);
    kick();
  };

  const onImageError = (i: number) => setFailed((prev) => new Set(prev).add(i));

  const claim = () => {
    interacted.current = true;
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    claim();
    pointerKind.current = e.pointerType;
  };

  const onClick = (i: number) => {
    const kind = pointerKind.current;
    pointerKind.current = null;
    if (kind === 'mouse') setActive(i);
    else setActive((cur) => (cur === i ? null : i));
  };

  const onFocus = (i: number) => {
    claim();
    if (!pointerKind.current) setActive(i);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    setActive(null);
  };

  const rootStyle = {
    '--ip-pill-h': `${clamp(pillHeight, 40, 110) / 100}em`,
  } as CSSProperties;

  return (
    <section
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setActive(null);
      }}
    >
      <span className={styles.light} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />

      <div className={styles.inner}>
        {label && (
          <p className={styles.label}>
            <span className={styles.rule} aria-hidden="true" />
            {label}
          </p>
        )}

        <p className={styles.sentence}>
          {tokens.map((t, k) => {
            if (t.pill === undefined) return <Fragment key={k}>{t.text}</Fragment>;
            const i = t.pill;
            const src = pills[i]?.image;
            const showImage = Boolean(src) && !failed.has(i);
            const isOpen = active === i;
            return (
              <span key={k} className={styles.slot}>
                {t.lead}
                <button
                  type="button"
                  ref={(el) => {
                    pillEls.current[i] = el;
                  }}
                  className={isOpen ? `${styles.pill} ${styles.pillOpen}` : styles.pill}
                  style={{ animationDelay: `${120 + i * STAGGER_MS}ms` }}
                  aria-pressed={isOpen}
                  aria-description={pillDescription || undefined}
                  onPointerDown={onPointerDown}
                  onPointerEnter={(e) => {
                    if (e.pointerType !== 'mouse') return;
                    claim();
                    setActive(i);
                  }}
                  onPointerLeave={(e) => e.pointerType === 'mouse' && setActive((cur) => (cur === i ? null : cur))}
                  onClick={() => onClick(i)}
                  onFocus={() => onFocus(i)}
                  onKeyDown={onKeyDown}
                >
                  {showImage ? (
                    <img
                      className={styles.photo}
                      src={src}
                      alt=""
                      draggable={false}
                      loading="lazy"
                      onLoad={(e) => onImageLoad(i, e.currentTarget)}
                      onError={() => onImageError(i)}
                    />
                  ) : (
                    <span className={styles.blank} aria-hidden="true" />
                  )}
                  <span className={styles.sheen} aria-hidden="true" />
                  <span className={styles.caption} aria-hidden="true">
                    {t.word}
                  </span>
                  <span className={styles.srOnly}>{t.word}</span>
                </button>
                {t.trail}
              </span>
            );
          })}
        </p>
      </div>
    </section>
  );
}
```

```css
.root {
  --ip-pill-h: 0.86em;
  --ip-font: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --ip-font-label: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: clamp(40px, 8cqi, 96px);
  padding-inline: clamp(20px, 7cqi, 96px);
  background: linear-gradient(170deg, color-mix(in srgb, #e7e4ec 70%, #ffffff) 0%, #e7e4ec 55%, color-mix(in srgb, #e7e4ec 92%, #6f6987) 100%);
  color: #1d1b2c;
  font-family: var(--ip-font);
  border-radius: 20px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    inset 0 0 0 1px rgba(44, 36, 72, 0.06),
    0 1px 2px rgba(44, 36, 72, 0.08),
    0 24px 48px -28px rgba(44, 36, 72, 0.35);
  outline: 1px solid rgba(255, 255, 255, 0.55);
  outline-offset: -12px;
}

.root::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -2;
  pointer-events: none;
  background: radial-gradient(120% 90% at 50% 110%, rgba(138, 132, 160, 0.18) 0%, transparent 70%);
}

.light,
.grain {
  position: absolute;
  pointer-events: none;
  z-index: -1;
}

.light {
  inset-block-start: -40%;
  inset-inline-start: -15%;
  inline-size: 75%;
  aspect-ratio: 1.4;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.25) 55%, transparent 100%);
  filter: blur(40px);
}

.grain {
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  mix-blend-mode: multiply;
  opacity: 0.16;
}

.inner {
  display: grid;
  gap: clamp(20px, 3.2cqi, 36px);
  max-inline-size: 1120px;
  margin-inline: auto;
}

.label {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0;
  font-family: var(--ip-font-label);
  font-size: 14px;
  letter-spacing: 0.08em;
  color: color-mix(in srgb, #1d1b2c 68%, #e7e4ec);
}

.rule {
  flex: none;
  inline-size: 36px;
  block-size: 1px;
  background: currentColor;
}

.sentence {
  margin: 0;
  font-size: clamp(28px, 5.6cqi, 78px);
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.035em;
  text-wrap: pretty;
  overflow-wrap: anywhere;
  color: #1d1b2c;
}

.slot {
  white-space: nowrap;
}

.pill {
  --f: 1.6;
  --p: 0;

  position: relative;
  display: inline-block;
  box-sizing: border-box;
  inline-size: calc(var(--ip-pill-h) * var(--f));
  block-size: var(--ip-pill-h);
  margin-inline: 0.06em;
  padding: 0;
  vertical-align: middle;
  translate: 0 calc(-0.06em - var(--p) * 0.05em);
  transform: scale(calc(1 + var(--p) * 0.06));
  overflow: hidden;
  border: max(2px, 0.045em) solid #ffffff;
  border-radius: 999px;
  background: color-mix(in srgb, #e7e4ec 70%, #1d1b2c);
  animation: pillIn 900ms cubic-bezier(0.34, 1.4, 0.5, 1) both;
  font: inherit;
  color: #fff;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  box-shadow:
    0 0.02em 0.04em rgba(44, 36, 72, 0.18),
    0 calc(0.1em + var(--p) * 0.12em) calc(0.24em + var(--p) * 0.3em) calc(-0.08em - var(--p) * 0.04em) rgba(44, 36, 72, calc(0.3 + var(--p) * 0.12));
}

.pill:focus-visible {
  outline: max(2px, 0.04em) solid #1d1b2c;
  outline-offset: max(3px, 0.05em);
}

.pillOpen {
  z-index: 1;
}

.photo,
.blank {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  scale: calc(1.22 - var(--p) * 0.22);
  user-select: none;
}

.blank {
  background:
    radial-gradient(80% 120% at 30% 20%, rgba(255, 255, 255, 0.55), transparent 60%),
    linear-gradient(135deg, color-mix(in srgb, #e7e4ec 55%, #9c8fc4), color-mix(in srgb, #e7e4ec 40%, #1d1b2c));
}

.sheen {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, transparent 38%),
    linear-gradient(0deg, rgba(14, 10, 28, calc(var(--p) * 0.55)) 0%, transparent 62%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.caption {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 14%;
  padding-inline: 0.9em;
  overflow: hidden;
  font-family: var(--ip-font-label);
  font-size: max(10px, calc(var(--ip-pill-h) * 0.2));
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.06em;
  text-align: start;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: lowercase;
  opacity: clamp(0, var(--p) * 1.6 - 0.6, 1);
  translate: 0 calc((1 - var(--p)) * 0.3em);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
}


.srOnly {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

@keyframes pillIn {
  from {
    opacity: 0;
    scale: 0.2 0.6;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pill {
    --f: 2.25;
    animation: none;
  }
}

@container (max-width: 520px) {
  .caption {
    display: none;
  }
}
```
