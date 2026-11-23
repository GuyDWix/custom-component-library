import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface ShortlistItem {
  image?: string;
  title: string;
  note?: string;
}

export interface ShortlistSwipeDeckProps {
  items?: ShortlistItem[];
  eyebrow?: string;
  keepLabel?: string;
  skipLabel?: string;
  trayTitle?: string;
  emptyTrayText?: string;
  enquireLabel?: string;
  enquireLink?: string;
  doneTitle?: string;
  restartLabel?: string;
  accentColor?: string;
  cardColor?: string;
  className?: string;
}

const photo = (id: string) => `https://images.unsplash.com/photo-${id}?w=720&h=720&fit=crop&auto=format&q=80`;

export const defaultItems: ShortlistItem[] = [
  { image: photo('1555041469-a586c61ea9bc'), title: 'Fern Velvet Sofa', note: 'Deep green three-seater on solid oak legs. Made to order in six weeks.' },
  { image: photo('1567538096630-e0c55bd6374c'), title: 'Pearl Boudoir Chair', note: 'Button-tufted cream upholstery on whitewashed turned legs.' },
  { image: photo('1507473885765-e6ed057f782c'), title: 'Graphite Arc Lamp', note: 'Matte steel floor lamp with a tilting shade for reading corners.' },
  { image: photo('1503602642458-232111445657'), title: 'Pale Ash Stool', note: 'Counter-height stool in limed ash. Sold singly or as a pair.' },
  { image: photo('1540574163026-643ea20ade25'), title: 'Saddle Leather Sofa', note: 'Vegetable-tanned leather that softens and darkens with every year.' },
  { image: photo('1493663284031-b7e3aefcae8e'), title: 'Dove Chesterfield', note: 'Deep-buttoned grey linen with a low, generous seat.' },
];

type Body = { x: number; y: number; r: number; s: number; vx: number; vy: number; vr: number; vs: number };
type Pose = Pick<Body, 'x' | 'y' | 'r' | 's'>;

const STIFFNESS = 240;
const DAMPING = 23;
const STACK = 2;
const SLOT_R = [0, -3.2, 2.6];
const FLING_SHARE = 0.28;
const CARD_HELP = 'Drag or swipe right to keep, left to skip. Right and left arrow keys do the same.';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const clamp = (v: number, min = -1, max = 1) => Math.min(max, Math.max(min, v));
const rest = (): Body => ({ x: 0, y: 0, r: 0, s: 1, vx: 0, vy: 0, vr: 0, vs: 0 });
const pad = (n: number) => String(n).padStart(2, '0');

function enquireHref(link: string, titles: string[]) {
  if (!titles.length || !link) return link;
  const [base, hash] = link.split('#');
  const list = titles.join(', ');
  const param = base.startsWith('mailto:') ? `body=${encodeURIComponent(`Shortlist: ${list}`)}` : `shortlist=${encodeURIComponent(list)}`;
  return `${base}${base.includes('?') ? '&' : '?'}${param}${hash === undefined ? '' : `#${hash}`}`;
}

function SkipIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function KeepIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20.2s-7.6-4.6-7.6-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.6 2.6c0 5.6-7.6 10.2-7.6 10.2z" fill="currentColor" />
    </svg>
  );
}

export default function ShortlistSwipeDeck({
  items = defaultItems,
  eyebrow = 'The autumn edit',
  keepLabel = 'Keep',
  skipLabel = 'Skip',
  trayTitle = 'Your shortlist',
  emptyTrayText = 'Pieces you keep gather here.',
  enquireLabel = 'Enquire about these',
  enquireLink = 'mailto:studio@example.com',
  doneTitle = 'That is the whole collection',
  restartLabel = 'Start again',
  accentColor = '#2343d0',
  cardColor = '#efc5b6',
  className,
}: ShortlistSwipeDeckProps) {
  const count = items.length;
  const [cursor, setCursor] = useState(0);
  const [kept, setKept] = useState<number[]>([]);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [trayOpen, setTrayOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const uid = useId();
  const listId = `${uid}-list`;

  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const restartRef = useRef<HTMLButtonElement>(null);
  const cardEls = useRef<(HTMLElement | null)[]>([]);
  const bodies = useRef<Body[]>([]);
  const flying = useRef(new Map<number, number>());
  const gone = useRef(new Map<number, number>());
  const drag = useRef({ active: false, id: -1, x0: 0, y0: 0, dx: 0, dy: 0, lastX: 0, lastT: 0, vx: 0 });
  const cursorRef = useRef(cursor);
  const reducedRef = useRef(reduced);
  const width = useRef(340);
  const raf = useRef(0);
  const focusNext = useRef(false);

  cursorRef.current = cursor;
  reducedRef.current = reduced;

  const poseFor = useCallback((i: number): Pose => {
    const w = width.current;
    const dir = flying.current.get(i) ?? gone.current.get(i);
    if (dir !== undefined) return { x: dir * w * 1.4, y: -24, r: dir * 24, s: 0.96 };
    const slot = i - cursorRef.current;
    if (slot < 0) return { x: 0, y: 0, r: 0, s: 0.9 };
    if (slot === 0 && drag.current.active) {
      const { dx, dy } = drag.current;
      return { x: dx, y: dy * 0.35, r: clamp(dx * 0.06, -18, 18), s: 1.02 };
    }
    const k = Math.min(slot, STACK + 1);
    return { x: 0, y: k * 15, r: SLOT_R[k] ?? 0, s: 1 - k * 0.055 };
  }, []);

  const paint = useCallback(() => {
    const c = cursorRef.current;
    const d = drag.current;
    const lean = d.active ? clamp(d.dx / (width.current * FLING_SHARE)) : 0;
    rootRef.current?.style.setProperty('--keep-lean', Math.max(0, lean).toFixed(3));
    rootRef.current?.style.setProperty('--skip-lean', Math.max(0, -lean).toFixed(3));
    bodies.current.forEach((b, i) => {
      const el = cardEls.current[i];
      if (!el) return;
      const slot = i - c;
      const dir = flying.current.get(i);
      const stamp = dir ?? (slot === 0 ? lean : 0);
      el.style.transform = `translate3d(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px, 0) rotate(${b.r.toFixed(2)}deg) scale(${b.s.toFixed(4)})`;
      el.style.zIndex = String(dir !== undefined ? 60 : 40 - slot);
      el.style.pointerEvents = slot === 0 && dir === undefined ? 'auto' : 'none';
      el.style.opacity = dir !== undefined || (slot >= 0 && slot <= STACK && !gone.current.has(i)) ? '1' : '0';
      el.style.setProperty('--keep', Math.max(0, stamp).toFixed(3));
      el.style.setProperty('--skip', Math.max(0, -stamp).toFixed(3));
      el.style.setProperty('--depth', String(clamp(slot, 0, STACK)));
    });
  }, []);

  const tick = useCallback(
    (now: number, last: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      let busy = drag.current.active;
      bodies.current.forEach((b, i) => {
        const t = poseFor(i);
        if (reducedRef.current || (drag.current.active && i === cursorRef.current)) {
          Object.assign(b, t, reducedRef.current ? { vx: 0, vy: 0, vr: 0, vs: 0 } : {});
          return;
        }
        for (let n = 0; n < steps; n++) {
          b.vx += (STIFFNESS * (t.x - b.x) - DAMPING * b.vx) * h;
          b.vy += (STIFFNESS * (t.y - b.y) - DAMPING * b.vy) * h;
          b.vr += (STIFFNESS * (t.r - b.r) - DAMPING * b.vr) * h;
          b.vs += (STIFFNESS * (t.s - b.s) - DAMPING * b.vs) * h;
          b.x += b.vx * h;
          b.y += b.vy * h;
          b.r += b.vr * h;
          b.s += b.vs * h;
        }
        const dir = flying.current.get(i);
        if (dir !== undefined && Math.abs(b.x) > width.current * 1.25) {
          flying.current.delete(i);
          gone.current.set(i, dir);
        }
        const moving =
          Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.vr) * 4 > 0.4 ||
          Math.abs(t.x - b.x) + Math.abs(t.y - b.y) + Math.abs(t.r - b.r) > 0.15 ||
          Math.abs(t.s - b.s) > 0.001;
        busy = busy || moving || flying.current.has(i);
      });
      paint();
      raf.current = busy && !reducedRef.current ? requestAnimationFrame((ts) => tick(ts, now)) : 0;
    },
    [paint, poseFor],
  );

  const kick = useCallback(() => {
    if (raf.current) return;
    const start = performance.now();
    raf.current = requestAnimationFrame((t) => tick(t, start - 16));
  }, [tick]);

  const deal = useCallback(
    (n: number, fromBelow: boolean) => {
      flying.current.clear();
      gone.current.clear();
      bodies.current = Array.from({ length: n }, (_, i) => {
        const b = { ...rest(), ...poseFor(i) };
        if (fromBelow && !reducedRef.current) Object.assign(b, { y: 90 + i * 34, s: 0.9, r: i % 2 ? 4 : -4 });
        return b;
      });
    },
    [poseFor],
  );

  const decide = useCallback(
    (dir: 1 | -1) => {
      const c = cursorRef.current;
      const item = items[c];
      if (!item) return;
      const el = cardEls.current[c];
      if (reducedRef.current) {
        el?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'ease-out' });
      } else {
        flying.current.set(c, dir);
        const b = bodies.current[c];
        if (b && !drag.current.active && Math.abs(b.vx) < 200) b.vx = dir * 900;
      }
      if (dir > 0) setKept((k) => (k.includes(c) ? k : [...k, c]));
      setAnnouncement(`${dir > 0 ? keepLabel : skipLabel}: ${item.title}`);
      cursorRef.current = c + 1;
      setCursor(c + 1);
      kick();
    },
    [items, keepLabel, skipLabel, kick],
  );

  const restart = () => {
    cursorRef.current = 0;
    setCursor(0);
    setKept([]);
    deal(count, true);
    focusNext.current = true;
    kick();
  };

  useEffect(() => {
    cursorRef.current = 0;
    setCursor(0);
    setKept([]);
    deal(items.length, false);
  }, [items, deal]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const root = rootRef.current;
    if (!stage || !root) return;
    const ro = new ResizeObserver(() => {
      width.current = stage.clientWidth || 340;
      kick();
    });
    ro.observe(stage);
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(root);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [kick]);

  useIsoLayoutEffect(() => {
    if (bodies.current.length !== count) deal(count, false);
    paint();
    kick();
    if (focusNext.current) {
      focusNext.current = false;
      (cursor < count ? cardEls.current[cursor] : restartRef.current)?.focus({ preventScroll: true });
    }
  }, [cursor, count, reduced, paint, kick, deal]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const front = cardEls.current[cursorRef.current];
    if (reducedRef.current || !front || !front.contains(e.target as Node) || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { active: true, id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, lastX: e.clientX, lastT: e.timeStamp, vx: 0 };
    setDragging(true);
    kick();
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.id) return;
    d.dx = e.clientX - d.x0;
    d.dy = e.clientY - d.y0;
    const dt = Math.max(e.timeStamp - d.lastT, 1);
    d.vx = d.vx * 0.6 + ((e.clientX - d.lastX) / dt) * 0.4;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    kick();
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.id) return;
    d.active = false;
    setDragging(false);
    const b = bodies.current[cursorRef.current];
    if (b) b.vx = d.vx * 1000;
    const flung = Math.abs(d.dx) > width.current * FLING_SHARE || Math.abs(d.vx) > 0.6;
    if (flung) decide(Math.sign(d.dx || d.vx) > 0 ? 1 : -1);
    else kick();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    focusNext.current = true;
    decide(e.key === 'ArrowRight' ? 1 : -1);
  };

  const done = cursor >= count;
  const keptItems = kept.map((i) => items[i]).filter(Boolean);
  const rootStyle = { '--sd-accent': accentColor, '--sd-clay': cardColor } as CSSProperties;
  const cls = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

  return (
    <section ref={rootRef} className={cls(styles.root, className)} style={rootStyle} aria-label={eyebrow || trayTitle}>
      <span className={cls(styles.glowClay, !inView && styles.still)} aria-hidden="true" />
      <span className={cls(styles.glowCobalt, !inView && styles.still)} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />

      <div className={styles.layout}>
        <div className={styles.deckCol}>
          <div className={styles.top}>
            {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
            <span className={styles.counter} aria-hidden="true">
              {pad(Math.min(cursor + 1, count))} / {pad(count)}
            </span>
          </div>

          <div
            ref={stageRef}
            className={cls(styles.stage, dragging && styles.stageDragging)}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onKeyDown}
          >
            <div className={cls(styles.done, done && styles.doneShown)} aria-hidden={!done}>
              <span className={styles.doneMark} aria-hidden="true">
                <KeepIcon />
              </span>
              <p className={styles.doneTitle}>{doneTitle}</p>
              <button ref={restartRef} type="button" className={styles.restart} onClick={restart} tabIndex={done ? 0 : -1}>
                {restartLabel}
              </button>
            </div>

            {items.map((item, i) => {
              const slot = i - cursor;
              const front = slot === 0;
              return (
                <article
                  key={i}
                  ref={(el) => {
                    cardEls.current[i] = el;
                  }}
                  className={styles.card}
                  tabIndex={front ? 0 : -1}
                  aria-hidden={!front}
                  aria-label={item.title}
                  aria-description={front ? CARD_HELP : undefined}
                >
                  <span className={styles.cardStock} aria-hidden="true" />
                  <div className={styles.photoWrap}>
                    {item.image ? (
                      <img
                        className={styles.photo}
                        src={item.image}
                        alt=""
                        draggable={false}
                        loading={i <= STACK ? 'eager' : 'lazy'}
                      />
                    ) : (
                      <span className={styles.monogram} aria-hidden="true">
                        {item.title.trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className={styles.photoGloss} aria-hidden="true" />
                    <span className={styles.stampKeep} aria-hidden="true">
                      {keepLabel}
                    </span>
                    <span className={styles.stampSkip} aria-hidden="true">
                      {skipLabel}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.title}>{item.title}</h3>
                    {item.note && <p className={styles.note}>{item.note}</p>}
                  </div>
                  <span className={styles.cardGrain} aria-hidden="true" />
                  <span className={styles.cardShade} aria-hidden="true" />
                  <span className={styles.cardEdge} aria-hidden="true" />
                </article>
              );
            })}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.skip} onClick={() => decide(-1)} disabled={done}>
              <SkipIcon />
              <span className={styles.actionLabel}>{skipLabel}</span>
            </button>
            <button type="button" className={styles.keep} onClick={() => decide(1)} disabled={done}>
              <KeepIcon />
              <span className={styles.actionLabel}>{keepLabel}</span>
            </button>
          </div>
        </div>

        <aside className={styles.tray} aria-label={trayTitle}>
          <button
            type="button"
            className={styles.trayHead}
            onClick={() => setTrayOpen((o) => !o)}
            aria-expanded={trayOpen}
            aria-controls={listId}
          >
            <span className={styles.thumbs} aria-hidden="true">
              {keptItems.slice(-3).map((it, n) => (
                <span key={`${kept[kept.length - Math.min(3, kept.length) + n]}`} className={styles.thumb}>
                  {it.image ? <img className={styles.thumbImg} src={it.image} alt="" /> : it.title.charAt(0)}
                </span>
              ))}
              {keptItems.length === 0 && <span className={styles.thumbEmpty} />}
            </span>
            <span className={styles.trayTitle}>{trayTitle}</span>
            <span key={keptItems.length} className={styles.badge}>
              {keptItems.length}
            </span>
            <svg className={cls(styles.chevron, trayOpen && styles.chevronOpen)} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div id={listId} className={cls(styles.trayBody, !trayOpen && styles.trayBodyClosed)}>
            <div className={styles.railBox}>
              {keptItems.length === 0 ? (
                <>
                  <p className={styles.trayEmpty}>{emptyTrayText}</p>
                  <ul className={styles.slots} aria-hidden="true">
                    {[0, 1, 2].map((n) => (
                      <li key={n} className={styles.slot} />
                    ))}
                  </ul>
                </>
              ) : (
                <ul className={styles.list}>
                  {kept.map((i) => {
                    const it = items[i];
                    if (!it) return null;
                    return (
                      <li key={i} className={styles.row}>
                        <span className={styles.rowThumb} aria-hidden="true">
                          {it.image ? <img className={styles.thumbImg} src={it.image} alt="" /> : it.title.charAt(0)}
                        </span>
                        <span className={styles.rowTitle}>{it.title}</span>
                        <button
                          type="button"
                          className={styles.remove}
                          onClick={() => setKept((k) => k.filter((x) => x !== i))}
                          aria-label={`Remove ${it.title}`}
                        >
                          <SkipIcon />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {keptItems.length ? (
            <a className={styles.enquire} href={enquireHref(enquireLink, keptItems.map((it) => it.title))}>
              <span className={styles.enquireLabel}>{enquireLabel}</span>
              <Arrow />
            </a>
          ) : (
            <button type="button" className={styles.enquire} disabled>
              <span className={styles.enquireLabel}>{enquireLabel}</span>
              <Arrow />
            </button>
          )}
        </aside>
      </div>

      <p className={styles.srOnly} aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}

function Arrow() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
