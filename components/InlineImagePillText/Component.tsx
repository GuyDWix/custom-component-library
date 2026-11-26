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
