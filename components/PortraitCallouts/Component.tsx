import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface PortraitCallout {
  label: string;
  text: string;
}

export interface PortraitCalloutsProps {
  image?: string;
  imageAlt?: string;
  name?: string;
  role?: string;
  callouts?: PortraitCallout[];
  lineColor?: string;
  className?: string;
}

export const defaultCallouts: PortraitCallout[] = [
  { label: 'Years at the bench', text: '31, since an apprenticeship in Oaxaca' },
  { label: 'Favourite tool', text: 'A 1940s No. 4 smoothing plane' },
  { label: 'Signature piece', text: 'The walnut Riverbend dining table' },
  { label: 'Off the clock', text: 'Restoring old fishing reels' },
];

type Leader = { d: string; ax: number; ay: number };

const MAX_CALLOUTS = 5;
const WIDE_AT = 720;
const SHOULDER = 26;

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

export default function PortraitCallouts({
  image = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=720&h=900&fit=crop&crop=faces',
  imageAlt,
  name = 'Tomás Ibarra',
  role = 'Master cabinetmaker, Ibarra & Daughters',
  callouts = defaultCallouts,
  lineColor = '#6b4f33',
  className,
}: PortraitCalloutsProps) {
  const items = callouts.slice(0, MAX_CALLOUTS);
  const startCount = Math.ceil(items.length / 2);
  const uid = useId();

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const lastPointer = useRef('mouse');

  const [phase, setPhase] = useState<'armed' | 'play'>('armed');
  const [active, setActive] = useState<number | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const measure = useCallback(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const plate = plateRef.current;
    if (!root || !stage || !plate) return;
    if (root.clientWidth < WIDE_AT) {
      setLeaders([]);
      return;
    }
    const s = stage.getBoundingClientRect();
    const p = plate.getBoundingClientRect();
    const midX = p.left + p.width / 2;
    const perSide = [0, 0];
    const sideCount = [startCount, items.length - startCount];
    const next = dotRefs.current.slice(0, items.length).map((dot) => {
      if (!dot) return { d: '', ax: 0, ay: 0 };
      const r = dot.getBoundingClientRect();
      const dx = r.left + r.width / 2 - s.left;
      const dy = r.top + r.height / 2 - s.top;
      const fromStart = r.left + r.width / 2 < midX;
      const side = fromStart ? 0 : 1;
      const k = perSide[side]++;
      const n = sideCount[side];
      const ax = p.left - s.left + p.width * (fromStart ? 0.22 : 0.78);
      const ay = p.top - s.top + p.height * (n > 1 ? 0.3 + (0.46 * k) / (n - 1) : 0.48);
      const dir = fromStart ? 1 : -1;
      const end = dx + dir * (r.width / 2 + 5);
      const shoulder = end + dir * SHOULDER;
      return { d: `M${ax.toFixed(1)} ${ay.toFixed(1)} L${shoulder.toFixed(1)} ${dy.toFixed(1)} L${end.toFixed(1)} ${dy.toFixed(1)}`, ax, ay };
    });
    setBox({ w: s.width, h: s.height });
    setLeaders(next);
  }, [items.length, startCount]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    const root = rootRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!root || reduced || typeof IntersectionObserver === 'undefined') {
      setPhase('play');
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setPhase('play');
        io.disconnect();
      },
      { threshold: 0.25 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const notePointer = (e: PointerEvent) => {
    lastPointer.current = e.pointerType;
  };

  const onEnter = (i: number) => (e: PointerEvent) => {
    notePointer(e);
    if (e.pointerType === 'mouse') setActive(i);
  };

  const onLeave = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') setActive(null);
  };

  const onTap = (i: number) => {
    if (lastPointer.current === 'mouse') return;
    setActive((cur) => (cur === i ? null : i));
  };

  const shown = phase === 'play';
  const rootStyle = { '--pc-line': lineColor } as CSSProperties;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  const renderCallout = (c: PortraitCallout, i: number) => {
    const isActive = active === i;
    const isDim = active !== null && !isActive;
    const atStart = i < startCount;
    return (
      <li key={i} className={styles.item} style={{ '--i': i } as CSSProperties}>
        <button
          type="button"
          className={cx(
            styles.callout,
            atStart && styles.calloutStart,
            shown ? styles.calloutShown : styles.calloutHidden,
            isActive && styles.calloutActive,
            isDim && styles.calloutDim,
          )}
          aria-pressed={isActive}
          onPointerEnter={onEnter(i)}
          onPointerLeave={onLeave}
          onPointerDown={notePointer}
          onClick={() => onTap(i)}
          onFocus={() => setActive(i)}
          onBlur={() => setActive(null)}
        >
          <span className={styles.tick} aria-hidden="true" />
          <span
            ref={(el) => {
              dotRefs.current[i] = el;
            }}
            className={cx(styles.dot, atStart && styles.dotStart, shown ? styles.dotShown : styles.dotHidden)}
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <span className={cx(styles.copy, atStart && styles.copyStart, shown ? styles.copyShown : styles.copyHidden)}>
            <span className={styles.label}>{c.label}</span>
            <span className={styles.text}>{c.text}</span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <div ref={rootRef} className={cx(styles.root, className)} style={rootStyle}>
      <span className={styles.paper} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />
      <span className={styles.frame} aria-hidden="true" />

      <figure className={styles.figure} aria-labelledby={`${uid}-name`}>
        <div ref={stageRef} className={styles.stage}>
          <ul className={styles.columnStart} aria-label={`Facts about ${name}`}>
            {items.slice(0, startCount).map((c, i) => renderCallout(c, i))}
          </ul>

          <div className={styles.center}>
            <div ref={plateRef} className={styles.plate}>
              <div className={styles.mat}>
                {image ? (
                  <img
                    className={styles.photo}
                    src={image}
                    alt={imageAlt ?? `Portrait of ${name}`}
                    draggable={false}
                    onLoad={measure}
                  />
                ) : (
                  <span className={styles.monogram} aria-hidden="true">
                    {initials}
                  </span>
                )}
                <span className={styles.tone} aria-hidden="true" />
              </div>
              <span className={styles.cornerA} aria-hidden="true" />
              <span className={styles.cornerB} aria-hidden="true" />
              <span className={styles.cornerC} aria-hidden="true" />
              <span className={styles.cornerD} aria-hidden="true" />
            </div>
            <figcaption className={styles.caption}>
              <span id={`${uid}-name`} className={styles.name}>
                {name}
              </span>
              {role && <span className={styles.role}>{role}</span>}
            </figcaption>
          </div>

          {items.length > startCount && (
            <ul className={styles.columnEnd} aria-label={`More facts about ${name}`}>
              {items.slice(startCount).map((c, j) => renderCallout(c, startCount + j))}
            </ul>
          )}

          {leaders.length > 0 && (
            <svg className={styles.leaders} width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} aria-hidden="true">
              {leaders.map((l, i) => {
                const isActive = active === i;
                const isDim = active !== null && !isActive;
                const style = { '--i': i } as CSSProperties;
                return (
                  <g key={i} className={isDim ? styles.leaderDim : undefined} style={style}>
                    <path className={styles.halo} d={l.d} pathLength={1} />
                    <path className={cx(styles.line, shown ? styles.lineShown : styles.lineHidden, isActive && styles.lineActive)} d={l.d} pathLength={1} />
                    <circle
                      className={cx(styles.anchor, shown ? styles.anchorShown : styles.anchorHidden, isActive && styles.anchorActive)}
                      cx={l.ax}
                      cy={l.ay}
                      r={4.5}
                    />
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </figure>
    </div>
  );
}
