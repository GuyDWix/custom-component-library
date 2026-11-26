import { useEffect, useId, useRef, useState } from 'react';
import type { AnimationEvent, CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface IndexTabPerson {
  name: string;
  role: string;
  photo: string;
  bio: string;
}

export interface IndexTabTeamCardProps {
  people?: IndexTabPerson[];
  stampText?: string;
  fileLabel?: string;
  roleLabel?: string;
  className?: string;
}

export const defaultPeople: IndexTabPerson[] = [
  {
    name: 'Amara Okonkwo',
    role: 'Founding Partner',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=520&h=650&fit=crop&crop=faces',
    bio: 'Opened the practice in 2014 after ten years at the city archive. Leads every client intake and still reads each file twice before it is signed.',
  },
  {
    name: 'Tobias Lindqvist',
    role: 'Lead Surveyor',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=520&h=650&fit=crop&crop=faces',
    bio: 'Measures what others estimate. Fifteen years of boundary disputes settled with a steel tape, a field notebook and a very calm voice.',
  },
  {
    name: 'Priya Raman',
    role: 'Records Manager',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=520&h=650&fit=crop&crop=faces',
    bio: 'Keeps three decades of paperwork findable in under a minute. Believes a good label is a small act of kindness to whoever opens the drawer next.',
  },
  {
    name: 'Mateo Silva',
    role: 'Client Liaison',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=520&h=650&fit=crop&crop=faces',
    bio: 'First voice on the phone and last to leave on a deadline night. Speaks four languages and writes his thank-you notes by hand.',
  },
  {
    name: 'Hannah Weiss',
    role: 'Compliance Counsel',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=520&h=650&fit=crop&crop=faces',
    bio: 'Reads the small print so nobody else has to. Former notary and current keeper of the office rubber stamps, which she names after months.',
  },
];

type Flip = { from: number; to: number; id: number };
type Mode = 'solo' | 'under' | 'flipOut' | 'flipIn' | 'sizer';

const WIDE_FROM = 720;
const FLIP_FALLBACK_MS = 1600;
const PHOTO_TILTS = [2.6, -2.1, 3.3, -1.5, 1.9, -2.8];

function tabLabel(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? '';
  return first.endsWith('.') && parts[1] ? parts[1] : first;
}

interface CardProps {
  person: IndexTabPerson;
  index: number;
  mode: Mode;
  muted?: boolean;
  stampText: string;
  fileLabel: string;
  roleLabel: string;
  onFlipEnd?: () => void;
}

function Card({ person, index, mode, muted, stampText, fileLabel, roleLabel, onFlipEnd }: CardProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const sizer = mode === 'sizer';
  const num = String(index + 1).padStart(2, '0');
  const nameRef = useRef<HTMLHeadingElement>(null);

  // Names never break mid-word: if the longest unbreakable piece (word or hyphen segment) is wider
  // than the column, shrink the name until it fits.
  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    let lastWidth = -1;
    const fit = () => {
      el.style.fontSize = '';
      const avail = el.clientWidth;
      const need = el.scrollWidth;
      if (avail > 0 && need > avail) {
        const base = parseFloat(getComputedStyle(el).fontSize) || 28;
        el.style.fontSize = `${Math.max(12, Math.floor(base * (avail / need) * 10) / 10)}px`;
      }
    };
    fit();
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        if (el.clientWidth === lastWidth) return;
        lastWidth = el.clientWidth;
        fit();
      });
      ro.observe(el);
    }
    let live = true;
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (live) fit();
      });
    }
    return () => {
      live = false;
      ro?.disconnect();
    };
  }, [person.name]);

  const tilt = PHOTO_TILTS[index % PHOTO_TILTS.length];
  const ringLen = Math.min(190, Math.max(70, stampText.trim().length * 16));
  const labelLen = Math.min(120, Math.max(60, fileLabel.trim().length * 16));

  const cardClass = [
    styles.card,
    mode === 'under' && styles.settle,
    mode === 'flipOut' && styles.flipOut,
    mode === 'flipIn' && styles.flipIn,
    sizer && styles.sizer,
  ]
    .filter(Boolean)
    .join(' ');

  const style = {
    '--tilt': `${tilt}deg`,
    '--lag': mode === 'flipIn' ? '280ms' : '0ms',
  } as CSSProperties;

  const handleEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && onFlipEnd) onFlipEnd();
  };

  return (
    <div className={cardClass} style={style} onAnimationEnd={handleEnd} aria-hidden={sizer || muted ? true : undefined}>
      <span className={styles.fibers} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />
      <span className={styles.wear} aria-hidden="true" />
      <span className={styles.hole} aria-hidden="true" />

      <div className={styles.head}>
        <h3 ref={nameRef} className={styles.name}>{person.name}</h3>
        <p className={styles.role}>
          <span className={styles.roleLabel}>{roleLabel}</span>
          <span className={styles.roleValue}>{person.role}</span>
        </p>
      </div>
      <span className={styles.rule} aria-hidden="true" />
      <div className={styles.bio}>
        <span className={styles.bioGap} aria-hidden="true" />
        <p className={styles.bioText}>{person.bio}</p>
      </div>

      {!sizer && (
        <>
          <span className={styles.inkLayer} aria-hidden="true">
            <svg className={styles.stamp} viewBox="0 0 200 200" focusable="false">
              <defs>
                <filter id={`${uid}ink`} x="-6%" y="-6%" width="112%" height="112%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed={index + 2} result="warp" />
                  <feDisplacementMap in="SourceGraphic" in2="warp" scale="3.4" xChannelSelector="R" yChannelSelector="G" result="rough" />
                  <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed={index + 7} result="speck" />
                  <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -5 3.5" result="holes" />
                  <feComposite in="rough" in2="holes" operator="in" />
                </filter>
                <path id={`${uid}top`} d="M 34 100 A 66 66 0 0 1 166 100" />
                <path id={`${uid}bot`} d="M 20 100 A 80 80 0 0 0 180 100" />
              </defs>
              <g filter={`url(#${uid}ink)`} fill="currentColor" stroke="currentColor">
                <circle cx="100" cy="100" r="93" fill="none" strokeWidth="5.5" />
                <circle cx="100" cy="100" r="84" fill="none" strokeWidth="1.6" />
                <circle cx="100" cy="100" r="57" fill="none" strokeWidth="1.6" />
                <circle cx="27" cy="100" r="3.4" stroke="none" />
                <circle cx="173" cy="100" r="3.4" stroke="none" />
                <rect x="66" y="72" width="68" height="2.4" stroke="none" />
                <rect x="66" y="132" width="68" height="2.4" stroke="none" />
                <text className={styles.stampRing} stroke="none" textAnchor="middle" textLength={ringLen} lengthAdjust="spacingAndGlyphs">
                  <textPath href={`#${uid}top`} startOffset="50%">
                    {stampText}
                  </textPath>
                </text>
                <text className={styles.stampRing} stroke="none" textAnchor="middle" textLength={labelLen} lengthAdjust="spacingAndGlyphs">
                  <textPath href={`#${uid}bot`} startOffset="50%">
                    {fileLabel}
                  </textPath>
                </text>
                <text className={styles.stampNumeral} stroke="none" x="100" y="123" textAnchor="middle">
                  {num}
                </text>
              </g>
            </svg>
          </span>

          <div className={styles.photo}>
            <span className={styles.print}>
              {person.photo ? (
                <img className={styles.image} src={person.photo} alt={`Portrait of ${person.name}`} draggable={false} />
              ) : (
                <span className={styles.monogram} aria-hidden="true">
                  {person.name.trim().charAt(0).toUpperCase()}
                </span>
              )}
              <span className={styles.photoTone} aria-hidden="true" />
            </span>
            <svg className={styles.clip} viewBox="0 0 36 100" aria-hidden="true" focusable="false">
              <path
                className={styles.clipWire}
                d="M 12 40 V 16 A 8 8 0 0 1 28 16 V 82 A 12 12 0 0 1 4 82 V 24 A 14 14 0 0 1 32 24 V 70"
              />
              <path
                className={styles.clipShine}
                d="M 12 40 V 16 A 8 8 0 0 1 28 16 V 82 A 12 12 0 0 1 4 82 V 24 A 14 14 0 0 1 32 24 V 70"
                transform="translate(-0.7 -0.7)"
              />
            </svg>
          </div>
        </>
      )}

      <span className={mode === 'under' ? styles.shadeOn : styles.shade} aria-hidden="true" />
    </div>
  );
}

export default function IndexTabTeamCard({
  people = defaultPeople,
  stampText = 'Staff register',
  fileLabel = 'File no.',
  roleLabel = 'Role',
  className,
}: IndexTabTeamCardProps) {
  const count = people.length;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [active, setActive] = useState(0);
  const [flip, setFlip] = useState<Flip | null>(null);
  const [tick, setTick] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [wide, setWide] = useState(true);
  const [announce, setAnnounce] = useState('');
  const [fade, setFade] = useState({ start: false, end: false });

  const rootRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const flipId = useRef(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const mounted = useRef(false);

  const current = Math.min(active, Math.max(count - 1, 0));
  const tabId = (i: number) => `${uid}-tab-${i}`;
  const panelId = `${uid}-panel`;

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
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.02 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= WIDE_FROM));
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  const measureTabs = () => {
    const list = tabsRef.current;
    if (!list) return;
    const max = list.scrollWidth - list.clientWidth;
    const pos = Math.abs(list.scrollLeft);
    const next = { start: max > 1 && pos > 2, end: max > 1 && pos < max - 2 };
    setFade((f) => (f.start === next.start && f.end === next.end ? f : next));
  };

  useEffect(() => {
    measureTabs();
    const list = tabsRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measureTabs);
    ro.observe(list);
    return () => ro.disconnect();
  }, [count, wide]);

  useEffect(() => {
    if (!flip) return;
    const t = window.setTimeout(() => setFlip(null), FLIP_FALLBACK_MS);
    return () => window.clearTimeout(t);
  }, [flip]);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const list = tabsRef.current;
    const tab = tabRefs.current[current];
    if (!list || !tab) return;
    const behavior = reduced ? 'auto' : 'smooth';
    if (list.scrollWidth > list.clientWidth + 1) {
      list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2, behavior });
    }
    if (list.scrollHeight > list.clientHeight + 1) {
      list.scrollTo({ top: tab.offsetTop - (list.clientHeight - tab.offsetHeight) / 2, behavior });
    }
  }, [current, reduced]);

  const goTo = (next: number) => {
    if (next === current || next < 0 || next >= count) return;
    if (reduced) {
      setFlip(null);
    } else {
      flipId.current += 1;
      setFlip({ from: current, to: next, id: flipId.current });
      setTick((t) => t + 1);
    }
    setActive(next);
    const p = people[next];
    setAnnounce(`${p.name}, ${p.role}. ${next + 1} of ${count}.`);
  };

  const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (current + 1) % count;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (current - 1 + count) % count;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    if (next < 0) return;
    e.preventDefault();
    goTo(next);
    tabRefs.current[next]?.focus();
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    swipe.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(current + (dx < 0 ? 1 : -1));
  };

  if (count === 0) return null;

  const activeFlip = flip && flip.to === current && flip.from < count ? flip : null;
  const forward = activeFlip ? activeFlip.to > activeFlip.from : true;

  const layers: Array<{ index: number; mode: Mode }> = [];
  if (activeFlip && forward) {
    layers.push({ index: activeFlip.to, mode: 'under' });
    layers.push({ index: activeFlip.from, mode: 'flipOut' });
  } else if (activeFlip) {
    // going back: the earlier card flips up and lands on top of the one in front
    layers.push({ index: activeFlip.from, mode: 'solo' });
    layers.push({ index: activeFlip.to, mode: 'flipIn' });
  } else {
    layers.push({ index: current, mode: 'solo' });
  }

  const paused = { animationPlayState: inView ? 'running' : 'paused' } as CSSProperties;

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')}>
      <span className={styles.light} aria-hidden="true" />
      <span className={styles.blinds} style={paused} aria-hidden="true" />
      <span className={styles.deskGrain} aria-hidden="true" />

      <div className={styles.stage}>
        <div className={styles.file}>
          <div className={styles.tabsWrap}>
            <div
              ref={tabsRef}
              className={styles.tabs}
              role="tablist"
              aria-label="Team members"
              aria-description="Choose a tab or use the arrow keys to flip the card to that person."
              aria-orientation={wide ? 'vertical' : 'horizontal'}
              onKeyDown={onTabKeyDown}
              onScroll={measureTabs}
              style={
                {
                  '--it-fade-s': fade.start ? '34px' : '0px',
                  '--it-fade-e': fade.end ? '34px' : '0px',
                } as CSSProperties
              }
            >
              {people.map((p, i) => (
                <button
                  key={i}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  id={tabId(i)}
                  type="button"
                  role="tab"
                  aria-selected={i === current}
                  aria-controls={panelId}
                  tabIndex={i === current ? 0 : -1}
                  className={i === current ? styles.tabOn : styles.tab}
                  onClick={() => goTo(i)}
                >
                  <span className={styles.tabLabel} style={{ '--n': Math.max(Array.from(tabLabel(p.name)).length, 4) } as CSSProperties}>
                    {tabLabel(p.name)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.deckWrap}>
            <span key={`a${tick}`} className={styles.ghostA} aria-hidden="true" />
            <span key={`b${tick}`} className={styles.ghostB} aria-hidden="true" />
            <span key={`c${tick}`} className={styles.ghostC} aria-hidden="true" />

            <div
              id={panelId}
              className={styles.deck}
              role="tabpanel"
              tabIndex={0}
              aria-labelledby={tabId(current)}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={() => {
                swipe.current = null;
              }}
            >
              {people.map((p, i) => (
                <Card
                  key={`s${i}`}
                  person={p}
                  index={i}
                  mode="sizer"
                  stampText={stampText}
                  fileLabel={fileLabel}
                  roleLabel={roleLabel}
                />
              ))}
              {layers.map((layer) => (
                <Card
                  key={`l${layer.index}`}
                  person={people[layer.index]}
                  index={layer.index}
                  mode={layer.mode}
                  muted={layer.index !== current}
                  stampText={stampText}
                  fileLabel={fileLabel}
                  roleLabel={roleLabel}
                  onFlipEnd={
                    layer.mode === 'flipOut' || layer.mode === 'flipIn'
                      ? () => setFlip((f) => (f && activeFlip && f.id === activeFlip.id ? null : f))
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <span className={styles.sr} role="status" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}
