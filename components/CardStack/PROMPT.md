Create a custom element called "Card Stack". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: cards (quote, person name, role, photo), auto-advance seconds, card surface style (glass | paper | solid), small heading, hint text. Add other settings if they help.

```tsx
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface CardStackCard {
  quote: string;
  name: string;
  role: string;
  photo?: string;
}

export type CardSurface = 'glass' | 'paper' | 'solid';

export interface CardStackProps {
  cards?: CardStackCard[];
  autoAdvanceSeconds?: number;
  surface?: CardSurface;
  eyebrow?: string;
  hint?: string;
  ariaLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
  pauseLabel?: string;
  playLabel?: string;
  className?: string;
}

const face = (id: string) => `https://images.unsplash.com/photo-${id}?w=240&h=240&fit=crop&crop=faces`;

export const defaultCards: CardStackCard[] = [
  {
    quote: 'They took a brand we had outgrown and gave it a voice people actually remember. Bookings doubled before the season even started.',
    name: 'Maya Lindqvist',
    role: 'Founder, Saltwater Studio',
    photo: face('1494790108377-be9c29b29330'),
  },
  {
    quote: 'Calm, precise, and impossibly quick. Every handoff felt like opening a gift that had already been checked twice.',
    name: 'Daniel Okafor',
    role: 'Head of Product, Fieldnote',
    photo: face('1507003211169-0a1dd7228f2d'),
  },
  {
    quote: 'Our customers stopped asking how to order and started asking where we had been all their lives.',
    name: 'Inés Carvalho',
    role: 'Owner, Casa Brava Bakery',
    photo: face('1438761681033-6461ffad8d80'),
  },
  {
    quote: 'The rare team that pushes back for the right reasons. The result is quieter, sharper and sells better.',
    name: 'Theo Marchetti',
    role: 'Creative Director, Northlight',
    photo: face('1500648767791-00dcc994a43e'),
  },
  {
    quote: 'I have hired agencies for fifteen years. This is the first one I would hire again without a pitch.',
    name: 'Priya Raman',
    role: 'COO, Arbor & Ash',
    photo: face('1544005313-94ddf0286df2'),
  },
];

type Body = { x: number; y: number; r: number; s: number; vx: number; vy: number; vr: number; vs: number };
type Pose = Pick<Body, 'x' | 'y' | 'r' | 's'>;

const SLOT_X = [0, -20, 22, -10];
const SLOT_R = [0, -4.6, 3.8, -2];
const STIFFNESS = 300;
const DAMPING = 27;
const FLY_ANGLE = 15;
const LONG_QUOTE = 220;
const RING = 2 * Math.PI * 21;

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const restBody = (): Body => ({ x: 0, y: 0, r: 0, s: 1, vx: 0, vy: 0, vr: 0, vs: 0 });
const pad = (n: number) => String(n).padStart(2, '0');
const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export default function CardStack({
  cards = defaultCards,
  autoAdvanceSeconds = 6,
  surface = 'glass',
  eyebrow = 'Kind words from clients',
  hint = 'Drag, tap or use the arrow keys',
  ariaLabel = 'Client testimonials',
  previousLabel = 'Previous card',
  nextLabel = 'Next card',
  pauseLabel = 'Pause',
  playLabel = 'Play',
  className,
}: CardStackProps) {
  const count = cards.length;
  const canCycle = count > 1;
  const autoOn = canCycle && autoAdvanceSeconds > 0;

  const [order, setOrder] = useState<number[]>(() => cards.map((_, i) => i));
  const [reduced, setReduced] = useState(false);
  const [playOn, setPlayOn] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [inView, setInView] = useState(true);
  const [depth, setDepth] = useState(3);
  const [stepped, setStepped] = useState(false);

  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);
  const deckTilt = useRef({ rx: 0, ry: 0, vrx: 0, vry: 0 });
  const bodies = useRef<Body[]>([]);
  const orderRef = useRef(order);
  const flying = useRef(new Map<number, number>());
  const drag = useRef({ active: false, id: -1, x0: 0, y0: 0, dx: 0, dy: 0, lastX: 0, lastT: 0, vx: 0, moved: false });
  const tilt = useRef({ x: 0, y: 0 });
  const width = useRef(480);
  const depthRef = useRef(depth);
  const reducedRef = useRef(reduced);
  const raf = useRef(0);
  const elapsed = useRef(0);

  depthRef.current = depth;
  reducedRef.current = reduced;

  const poseFor = useCallback((i: number): Pose => {
    const w = width.current;
    const dir = flying.current.get(i);
    if (dir !== undefined) return { x: dir * w * 1.2, y: -36, r: dir * FLY_ANGLE, s: 0.98 };
    const pos = orderRef.current.indexOf(i);
    const slot = Math.min(pos, depthRef.current);
    const gap = w < 420 ? 34 : 38;
    const t = tilt.current;
    if (pos === 0 && drag.current.active) {
      const { dx, dy } = drag.current;
      return { x: dx, y: dy * 0.3, r: dx * 0.05, s: 1.02 };
    }
    return {
      x: (SLOT_X[slot] ?? 0) * (w / 520) + t.x * slot * 7,
      y: -slot * gap + t.y * slot * 4,
      r: SLOT_R[slot] ?? 0,
      s: 1 - slot * 0.045,
    };
  }, []);

  const measure = useCallback(() => {
    width.current = stageRef.current?.clientWidth || 480;
    depthRef.current = width.current < 440 ? 2 : 3;
    setDepth(depthRef.current);
  }, []);

  const settle = useCallback(
    (n: number) => {
      bodies.current = Array.from({ length: n }, (_, i) => ({ ...restBody(), ...poseFor(i) }));
    },
    [poseFor],
  );

  useEffect(() => {
    const fresh = cards.map((_, i) => i);
    orderRef.current = fresh;
    flying.current.clear();
    measure();
    settle(cards.length);
    setOrder(fresh);
  }, [cards, measure, settle]);

  const paint = useCallback(() => {
    const ord = orderRef.current;
    const d = deckTilt.current;
    if (deckRef.current) deckRef.current.style.transform = `rotateX(${d.rx.toFixed(2)}deg) rotateY(${d.ry.toFixed(2)}deg)`;
    bodies.current.forEach((b, i) => {
      const el = cardEls.current[i];
      if (!el) return;
      const pos = ord.indexOf(i);
      const isFlying = flying.current.has(i);
      el.style.transform = `translate(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px) rotate(${b.r.toFixed(2)}deg) scale(${b.s.toFixed(4)})`;
      el.style.zIndex = String(isFlying ? 300 : 100 - pos);
      el.style.opacity = isFlying || pos <= depthRef.current ? '1' : '0';
      el.style.setProperty('--depth', String(isFlying ? 0 : Math.min(pos, depthRef.current)));
    });
  }, []);

  const tick = useCallback(
    (now: number, last: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      let busy = drag.current.active;
      const d = deckTilt.current;
      const tx = drag.current.active ? 0 : -tilt.current.y * 5;
      const ty = drag.current.active ? 0 : tilt.current.x * 7;
      if (reducedRef.current) Object.assign(d, { rx: 0, ry: 0, vrx: 0, vry: 0 });
      else {
        for (let n = 0; n < steps; n++) {
          d.vrx += (STIFFNESS * (tx - d.rx) - DAMPING * d.vrx) * h;
          d.vry += (STIFFNESS * (ty - d.ry) - DAMPING * d.vry) * h;
          d.rx += d.vrx * h;
          d.ry += d.vry * h;
        }
        busy = busy || Math.abs(d.vrx) + Math.abs(d.vry) > 0.4 || Math.abs(tx - d.rx) + Math.abs(ty - d.ry) > 0.05;
      }
      bodies.current.forEach((b, i) => {
        const target = poseFor(i);
        if (reducedRef.current) {
          Object.assign(b, target, { vx: 0, vy: 0, vr: 0, vs: 0 });
          return;
        }
        if (drag.current.active && orderRef.current[0] === i) {
          Object.assign(b, target);
          return;
        }
        for (let n = 0; n < steps; n++) {
          b.vx += (STIFFNESS * (target.x - b.x) - DAMPING * b.vx) * h;
          b.vy += (STIFFNESS * (target.y - b.y) - DAMPING * b.vy) * h;
          b.vr += (STIFFNESS * (target.r - b.r) - DAMPING * b.vr) * h;
          b.vs += (STIFFNESS * (target.s - b.s) - DAMPING * b.vs) * h;
          b.x += b.vx * h;
          b.y += b.vy * h;
          b.r += b.vr * h;
          b.s += b.vs * h;
        }
        if (flying.current.has(i) && Math.abs(b.x) > width.current * 0.78) flying.current.delete(i);
        const moving =
          Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.vr) * 4 > 0.4 ||
          Math.abs(target.x - b.x) + Math.abs(target.y - b.y) + Math.abs(target.r - b.r) > 0.15 ||
          Math.abs(target.s - b.s) > 0.001;
        busy = busy || moving || flying.current.has(i);
      });
      paint();
      raf.current = busy && !reducedRef.current ? requestAnimationFrame((t) => tick(t, now)) : 0;
    },
    [paint, poseFor],
  );

  const kick = useCallback(() => {
    if (raf.current) return;
    const start = performance.now();
    raf.current = requestAnimationFrame((t) => tick(t, start - 16));
  }, [tick]);

  const commitOrder = useCallback(
    (next: number[]) => {
      orderRef.current = next;
      setOrder(next);
      setStepped(true);
      elapsed.current = 0;
      if (reducedRef.current) {
        cardEls.current[next[0]]?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
      }
      kick();
    },
    [kick],
  );

  const goNext = useCallback(
    (dir = 1) => {
      const ord = orderRef.current;
      if (ord.length < 2) return;
      const front = ord[0];
      if (!reducedRef.current) flying.current.set(front, dir >= 0 ? 1 : -1);
      commitOrder([...ord.slice(1), front]);
    },
    [commitOrder],
  );

  const goPrev = useCallback(() => {
    const ord = orderRef.current;
    if (ord.length < 2) return;
    const back = ord[ord.length - 1];
    flying.current.delete(back);
    const b = bodies.current[back];
    if (b && !reducedRef.current) Object.assign(b, { x: -width.current * 1.2, y: -36, r: -FLY_ANGLE, vx: 0, vy: 0, vr: 0 });
    commitOrder([back, ...ord.slice(0, -1)]);
  }, [commitOrder]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setReduced(mq.matches);
      if (mq.matches) setPlayOn(false);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const root = rootRef.current;
    if (!stage || !root) return;
    const ro = new ResizeObserver(() => {
      measure();
      kick();
    });
    ro.observe(stage);
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.15 });
    io.observe(root);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [kick, measure]);

  useIsoLayoutEffect(() => {
    if (bodies.current.length !== cards.length) {
      measure();
      settle(cards.length);
    }
    paint();
    kick();
  }, [order, depth, reduced, cards, paint, kick, measure, settle]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const isPlaying = autoOn && playOn && !hovered && !focused && !dragging && inView;

  useEffect(() => {
    const ring = ringRef.current;
    if (!isPlaying) return;
    const duration = autoAdvanceSeconds * 1000;
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      elapsed.current += now - last;
      last = now;
      if (elapsed.current >= duration) goNext(1);
      if (ring) ring.style.strokeDashoffset = String(RING * (1 - Math.min(elapsed.current / duration, 1)));
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [isPlaying, autoAdvanceSeconds, goNext]);

  useEffect(() => {
    if (ringRef.current && !isPlaying) {
      const duration = Math.max(autoAdvanceSeconds, 1) * 1000;
      ringRef.current.style.strokeDashoffset = String(RING * (1 - Math.min(elapsed.current / duration, 1)));
    }
  }, [order, isPlaying, autoAdvanceSeconds]);

  const frontEl = () => cardEls.current[orderRef.current[0]];

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = frontEl();
    if (!canCycle || !el || !el.contains(e.target as Node) || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { active: true, id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, lastX: e.clientX, lastT: e.timeStamp, vx: 0, moved: false };
    tilt.current = { x: 0, y: 0 };
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d.active && e.pointerId === d.id) {
      d.dx = e.clientX - d.x0;
      d.dy = e.clientY - d.y0;
      if (Math.hypot(d.dx, d.dy) > 6) d.moved = true;
      const dt = Math.max(e.timeStamp - d.lastT, 1);
      d.vx = d.vx * 0.6 + ((e.clientX - d.lastX) / dt) * 0.4;
      d.lastX = e.clientX;
      d.lastT = e.timeStamp;
      if (reducedRef.current) d.dx = d.dy = 0;
      kick();
      return;
    }
    if (e.pointerType !== 'mouse' || reducedRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    tilt.current = { x: px * 2 - 1, y: py * 2 - 1 };
    const el = frontEl();
    el?.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
    el?.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    kick();
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0;
    d.active = false;
    setDragging(false);
    const front = orderRef.current[0];
    const b = bodies.current[front];
    if (!d.moved) {
      goNext(1);
      return;
    }
    const flung = Math.abs(dx) > width.current * 0.26 || Math.abs(d.vx) > 0.55;
    if (b) b.vx = d.vx * 1000;
    if (flung) goNext(Math.sign(dx || d.vx));
    else kick();
  };

  const onPointerLeave = () => {
    tilt.current = { x: 0, y: 0 };
    kick();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!canCycle) return;
    const keys: Record<string, () => void> = {
      ArrowRight: () => goNext(1),
      ArrowDown: () => goNext(1),
      ArrowLeft: goPrev,
      ArrowUp: goPrev,
      Enter: () => goNext(1),
      ' ': () => goNext(1),
    };
    const action = keys[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  };

  const frontIndex = order[0] ?? 0;
  const surfaceClass = styles[surface] ?? styles.glass;

  return (
    <section
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <span className={styles.glowA} aria-hidden="true" />
      <span className={styles.glowB} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.meta}>
          {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
          <div className={styles.counter} aria-hidden="true">
            <span key={frontIndex} className={stepped ? `${styles.numeral} ${styles.numeralIn}` : styles.numeral}>
              {pad(frontIndex + 1)}
            </span>
            <span className={styles.total}>/{pad(count)}</span>
          </div>
          {canCycle && (
            <div className={styles.controls}>
              <button type="button" className={styles.navButton} aria-label={previousLabel} onClick={goPrev}>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className={styles.srOnly} aria-hidden="true">{previousLabel}</span>
              </button>
              <button type="button" className={styles.navButton} aria-label={nextLabel} onClick={() => goNext(1)}>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className={styles.srOnly} aria-hidden="true">{nextLabel}</span>
              </button>
              {autoOn && (
                <button
                  type="button"
                  className={styles.playButton}
                  aria-label={playOn ? pauseLabel : playLabel}
                  aria-pressed={!playOn}
                  onClick={() => setPlayOn((p) => !p)}
                >
                  <svg className={styles.ring} viewBox="0 0 48 48" aria-hidden="true">
                    <circle className={styles.ringTrack} cx="24" cy="24" r="21" />
                    <circle ref={ringRef} className={styles.ringFill} cx="24" cy="24" r="21" strokeDasharray={RING} strokeDashoffset={RING} />
                  </svg>
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    {playOn ? (
                      <path d="M8 5.5v13M16 5.5v13" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                    ) : (
                      <path d="M8 5.2v13.6a.6.6 0 00.9.5l10.4-6.8a.6.6 0 000-1L8.9 4.7a.6.6 0 00-.9.5z" fill="currentColor" />
                    )}
                  </svg>
                  <span className={styles.srOnly} aria-hidden="true">{playOn ? pauseLabel : playLabel}</span>
                </button>
              )}
            </div>
          )}
          {canCycle && hint && <p className={styles.hint}>{hint}</p>}
        </div>

        <div
          ref={stageRef}
          className={styles.stage}
          tabIndex={0}
          aria-live={isPlaying ? 'off' : 'polite'}
          aria-atomic="false"
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={onPointerLeave}
        >
          <div ref={deckRef} className={styles.deck}>
            <span className={styles.floor} aria-hidden="true" />
            {cards.map((card, i) => {
              const pos = order.indexOf(i);
              const isFront = pos === 0;
              return (
                <div
                  key={i}
                  ref={(el) => {
                    cardEls.current[i] = el;
                  }}
                  className={[styles.card, surfaceClass, isFront && styles.front].filter(Boolean).join(' ')}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} / ${count}`}
                  aria-hidden={!isFront}
                  style={{ zIndex: 100 - pos, opacity: pos <= depth ? 1 : 0 }}
                >
                  <span className={styles.shade} aria-hidden="true" />
                  <div className={styles.cardTop}>
                    <span className={styles.quoteMark} aria-hidden="true">
                      &ldquo;
                    </span>
                    <span className={styles.cardIndex} aria-hidden="true">
                      {pad(i + 1)}
                    </span>
                  </div>
                  <blockquote className={card.quote.length > LONG_QUOTE ? `${styles.quote} ${styles.quoteLong}` : styles.quote}>
                    {card.quote}
                  </blockquote>
                  <div className={styles.person}>
                    {card.photo ? (
                      <img className={styles.photo} src={card.photo} alt="" draggable={false} loading="lazy" />
                    ) : (
                      <span className={styles.monogram} aria-hidden="true">
                        {initials(card.name)}
                      </span>
                    )}
                    <span className={styles.personText}>
                      <span className={styles.name}>{card.name}</span>
                      <span className={styles.role}>{card.role}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
```

```css
.root {
  --cs-font-quote: 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif;
  --cs-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --cs-font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: 56px 48px;
  padding-inline: 20px;
  background: linear-gradient(180deg, #cfe0f3 0%, color-mix(in srgb, #cfe0f3 45%, #f6f4ef) 46%, #f6f4ef 100%);
  color: #121c38;
  font-family: var(--cs-font-ui);
  border-radius: 32px;
}

.root::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: radial-gradient(70% 55% at 12% 8%, rgba(255, 255, 255, 0.85) 0%, transparent 60%);
}

.glowA,
.glowB,
.grain {
  position: absolute;
  pointer-events: none;
  z-index: -1;
}

.glowA {
  inset-block-start: -14%;
  inset-inline-end: -10%;
  inline-size: 70%;
  aspect-ratio: 1.8;
  border-radius: 50%;
  background: radial-gradient(closest-side, #fff 0%, rgba(255, 255, 255, 0.7) 45%, transparent 100%);
  filter: blur(36px);
  opacity: 0.95;
  animation: drift 22s ease-in-out infinite alternate;
}

.glowB {
  inset-block-end: -24%;
  inset-inline-start: 10%;
  inline-size: 60%;
  aspect-ratio: 1.6;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, #2448d8 22%, transparent) 0%, transparent 100%);
  filter: blur(56px);
  opacity: 0.7;
  animation: drift 28s ease-in-out -9s infinite alternate-reverse;
}

.grain {
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  mix-blend-mode: soft-light;
  opacity: 0.45;
}

.inner {
  display: grid;
  gap: 36px;
  max-inline-size: 1080px;
  margin-inline: auto;
}

.meta {
  order: 2;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  column-gap: 20px;
  row-gap: 14px;
}

.eyebrow {
  grid-column: 1 / -1;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--cs-font-mono);
  font-size: 14px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(18, 28, 56, 0.6);
}

.eyebrow::before {
  content: '';
  inline-size: 28px;
  block-size: 1px;
  background: #2448d8;
  flex: none;
}

.counter {
  display: flex;
  align-items: baseline;
  font-family: var(--cs-font-quote);
  font-variant-numeric: tabular-nums lining-nums;
  line-height: 0.82;
  overflow: hidden;
  padding-block: 0.06em;
}

.numeral {
  display: inline-block;
  font-size: 76px;
  font-weight: 400;
  letter-spacing: -0.06em;
  color: #121c38;
}

.numeralIn {
  animation: rise 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.total {
  margin-inline-start: 6px;
  font-size: 22px;
  letter-spacing: -0.02em;
  color: #2448d8;
  font-style: italic;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.hint {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 14px;
  color: rgba(18, 28, 56, 0.6);
}

.navButton,
.playButton {
  position: relative;
  display: grid;
  place-items: center;
  inline-size: 48px;
  block-size: 48px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.5);
  color: #121c38;
  cursor: pointer;
  backdrop-filter: blur(10px);
  box-shadow: inset 0 1px 0 #fff, 0 6px 16px -8px rgba(28, 52, 110, 0.35);
  transition: background-color 220ms ease, border-color 220ms ease, transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.navButton:hover,
.playButton:hover {
  background: rgba(255, 255, 255, 0.92);
  border-color: #fff;
}

.navButton:active,
.playButton:active {
  transform: scale(0.92);
}

.navButton:focus-visible,
.playButton:focus-visible,
.stage:focus-visible {
  outline: 2px solid #2448d8;
  outline-offset: 4px;
}

.playButton {
  border-color: transparent;
}

.ring {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  transform: rotate(-90deg);
}

.ringTrack,
.ringFill {
  fill: none;
  stroke-width: 1.5;
}

.ringTrack {
  stroke: rgba(18, 28, 56, 0.12);
}

.ringFill {
  stroke: #2448d8;
  stroke-linecap: round;
}

.stage {
  order: 1;
  position: relative;
  inline-size: 100%;
  max-inline-size: 580px;
  margin-inline: auto;
  padding-block-start: 84px;
  padding-block-end: 20px;
  perspective: 1400px;
  touch-action: pan-y;
  border-radius: 28px;
  outline: none;
}

.deck {
  position: relative;
  display: grid;
  transform-origin: 50% 70%;
  will-change: transform;
}

.floor {
  position: absolute;
  inset-inline: 8%;
  inset-block-end: -26px;
  block-size: 56px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(28, 52, 110, 0.32), transparent);
  filter: blur(10px);
  pointer-events: none;
}

.card {
  --card-ink: #121c38;
  --card-muted: rgba(18, 28, 56, 0.6);
  --card-rule: rgba(18, 28, 56, 0.1);
  --lift: calc(1 - var(--depth, 0) * 0.3);
  --mx: 50%;
  --my: 30%;

  grid-area: 1 / 1;
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-block-size: 340px;
  padding: 28px 28px 26px;
  border-radius: 28px;
  color: var(--card-ink);
  transform-origin: 50% 90%;
  will-change: transform;
  user-select: none;
  -webkit-user-select: none;
  cursor: grab;
  transition: opacity 360ms ease;
  overflow: hidden;
}

.card:active {
  cursor: grabbing;
}

.card::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  mix-blend-mode: soft-light;
  opacity: 0.35;
  pointer-events: none;
}

.card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(60% 50% at var(--mx) var(--my), rgba(255, 255, 255, 0.7), transparent 70%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 400ms ease;
}

.front::after {
  opacity: 1;
}

.shade {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: linear-gradient(180deg, #d6e3f3, #b4c7e2);
  opacity: calc(var(--depth, 0) * 0.3);
  pointer-events: none;
  transition: opacity 420ms ease;
}

.glass {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 34%),
    linear-gradient(160deg, rgba(250, 252, 255, 0.82) 0%, rgba(232, 240, 250, 0.64) 100%);
  border: 1px solid rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  box-shadow:
    inset 0 1px 0 #fff,
    inset 0 -1px 0 rgba(28, 52, 110, 0.08),
    0 1px 2px rgba(28, 52, 110, 0.1),
    0 14px 28px -14px rgba(28, 52, 110, calc(0.34 * var(--lift))),
    0 44px 80px -36px rgba(28, 52, 110, calc(0.42 * var(--lift)));
}

.paper {
  background: radial-gradient(120% 80% at 20% 0%, #ffffff 0%, #f6f6f3 55%, #ecebe6 100%);
  border: 1px solid #fff;
  box-shadow:
    inset 0 1px 0 #fff,
    inset 0 -2px 6px rgba(28, 52, 110, 0.05),
    0 1px 2px rgba(28, 52, 110, 0.12),
    0 14px 28px -14px rgba(28, 52, 110, calc(0.3 * var(--lift))),
    0 44px 80px -36px rgba(28, 52, 110, calc(0.38 * var(--lift)));
}

.solid {
  --card-ink: #f3f6fc;
  --card-muted: rgba(243, 246, 252, 0.66);
  --card-rule: rgba(255, 255, 255, 0.14);

  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 30%),
    linear-gradient(160deg, color-mix(in srgb, #2448d8 32%, #16224a) 0%, #101a38 100%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.28),
    0 1px 2px rgba(28, 52, 110, 0.2),
    0 14px 28px -14px rgba(28, 52, 110, calc(0.45 * var(--lift))),
    0 44px 80px -36px rgba(28, 52, 110, calc(0.5 * var(--lift)));
}

.cardTop,
.quote,
.person {
  position: relative;
  z-index: 1;
  opacity: max(0, 1 - var(--depth, 0) * 0.65);
  transition: opacity 420ms ease;
}

.cardTop {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.quoteMark {
  display: block;
  font-family: var(--cs-font-quote);
  font-size: 88px;
  line-height: 1;
  margin-block: -14px -36px;
  color: #2448d8;
  text-shadow: 0 6px 18px color-mix(in srgb, #2448d8 30%, transparent);
}

.cardIndex {
  font-family: var(--cs-font-mono);
  font-size: 14px;
  letter-spacing: 0.12em;
  color: var(--card-muted);
  font-variant-numeric: tabular-nums;
}

.quote {
  flex: 1;
  margin: 0;
  font-family: var(--cs-font-quote);
  font-size: 23px;
  line-height: 1.34;
  letter-spacing: -0.012em;
  text-wrap: pretty;
  overflow-wrap: break-word;
}

.quoteLong {
  font-size: 18px;
  line-height: 1.45;
}

.person {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-block-start: 18px;
  border-block-start: 1px solid var(--card-rule);
  min-inline-size: 0;
}

.photo,
.monogram {
  flex: none;
  inline-size: 48px;
  block-size: 48px;
  border-radius: 50%;
  box-shadow:
    0 0 0 2px #fff,
    0 0 0 4px color-mix(in srgb, #2448d8 70%, transparent),
    0 8px 18px -6px rgba(28, 52, 110, 0.4);
}

.photo {
  object-fit: cover;
  pointer-events: none;
}

.monogram {
  display: grid;
  place-items: center;
  background: var(--card-ink);
  color: #f6f4ef;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: 0.04em;
}

.personText {
  display: grid;
  gap: 2px;
  min-inline-size: 0;
}

.name {
  font-size: 16px;
  font-weight: 650;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.role {
  font-size: 14px;
  color: var(--card-muted);
  overflow-wrap: anywhere;
}

.srOnly {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

@container (max-width: 420px) {
  .meta {
    column-gap: 12px;
  }

  .controls {
    gap: 8px;
  }
}

@container (min-width: 900px) {
  .inner {
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
    align-items: center;
    gap: 72px;
  }

  .meta {
    order: 1;
    grid-template-columns: 1fr;
    row-gap: 28px;
  }

  .stage {
    order: 2;
    margin-inline: 0 auto;
    padding-block-start: 124px;
  }

  .numeral {
    font-size: 184px;
  }

  .total {
    font-size: 36px;
    margin-inline-start: 10px;
  }

  .controls {
    justify-content: flex-start;
  }

  .card {
    min-block-size: 380px;
    padding: 36px 36px 30px;
  }

  .quote {
    font-size: 27px;
  }

  .quoteLong {
    font-size: 20px;
  }
}

@keyframes rise {
  from {
    transform: translateY(70%);
    opacity: 0;
    filter: blur(6px);
  }
  to {
    transform: none;
    opacity: 1;
    filter: none;
  }
}

@keyframes drift {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(-12%, 10%, 0) scale(1.15);
  }
}

@media (prefers-reduced-motion: reduce) {
  .glowA,
  .glowB {
    animation: none;
  }

  .numeralIn {
    animation: fade 400ms ease both;
  }

  .navButton,
  .playButton {
    transition: background-color 220ms ease, border-color 220ms ease;
  }
}

@keyframes fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```
