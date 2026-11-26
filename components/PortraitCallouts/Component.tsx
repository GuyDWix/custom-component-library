import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react';
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
  className?: string;
}

export const defaultCallouts: PortraitCallout[] = [
  { label: 'Years at the bench', text: '31, since an apprenticeship in Oaxaca' },
  { label: 'Favourite tool', text: 'A 1940s No. 4 smoothing plane' },
  { label: 'Signature piece', text: 'The walnut Riverbend dining table' },
  { label: 'Off the clock', text: 'Restoring old fishing reels' },
];

type Spot = { fx: number; fy: number };
type Leader = { d: string; joints: [number, number][]; tx: number; ty: number };

const MAX_CALLOUTS = 5;
const WIDE_AT = 760;
const LONG_NAME = 22;
const ELBOW_OUT = 26;
const ELBOW_STEP = 12;
const FIT_PULL = 0.6;
const FIT_MIN = 0.14;
const FIT_MAX = 0.92;
const SNAP = 28;

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

const spotFor = (index: number, startCount: number, total: number): Spot => {
  const atStart = index < startCount;
  const k = atStart ? index : index - startCount;
  const n = atStart ? startCount : total - startCount;
  const [top, bottom] = atStart ? [0.36, 0.76] : [0.5, 0.82];
  const fy = n > 1 ? top + ((bottom - top) * k) / (n - 1) : (top + bottom) / 2;
  return { fx: atStart ? 0.2 : 0.8, fy };
};

const offsetIn = (el: HTMLElement, stage: HTMLElement) => {
  let x = el.offsetWidth / 2;
  let y = el.offsetHeight / 2;
  let node: HTMLElement | null = el;
  while (node && node !== stage) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
};

export default function PortraitCallouts({
  image = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&h=1125&fit=crop&crop=faces',
  imageAlt,
  name = 'Tomás Ibarra',
  role = 'Master cabinetmaker, Ibarra & Daughters',
  callouts = defaultCallouts,
  className,
}: PortraitCalloutsProps) {
  const items = callouts.slice(0, MAX_CALLOUTS);
  const startCount = Math.ceil(items.length / 2);
  const uid = useId();

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const pinRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const lastPointer = useRef('mouse');

  const [phase, setPhase] = useState<'armed' | 'play'>('armed');
  const [active, setActive] = useState<number | null>(null);
  const [spot, setSpot] = useState<Spot>({ fx: 0.5, fy: 0.5 });
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [fitted, setFitted] = useState<number[] | null>(null);

  const spots = items.map((_, i) => {
    const s = spotFor(i, startCount, items.length);
    return fitted?.[i] === undefined ? s : { fx: s.fx, fy: fitted[i] };
  });

  const measure = useCallback(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const frame = frameRef.current;
    if (!root || !stage || !frame) return;
    if (root.clientWidth < WIDE_AT) {
      setLeaders([]);
      setFitted(null);
      return;
    }
    const frameAt = offsetIn(frame, stage);
    const fw = frame.offsetWidth;
    const fh = frame.offsetHeight;
    const left = frameAt.x - fw / 2;
    const top = frameAt.y - fh / 2;
    const edges = [left, left + fw];
    const perSide = [0, 0];
    const fys: number[] = [];
    const next = items.map((_, i) => {
      const pin = pinRefs.current[i];
      const base = spotFor(i, startCount, items.length);
      fys[i] = base.fy;
      if (!pin) return { d: '', joints: [], tx: 0, ty: 0 };
      const t = offsetIn(pin, stage);
      fys[i] = Math.min(FIT_MAX, Math.max(FIT_MIN, base.fy * (1 - FIT_PULL) + ((t.y - top) / fh) * FIT_PULL));
      if (Math.abs(top + fys[i] * fh - t.y) < SNAP && t.y > top + fh * FIT_MIN && t.y < top + fh * FIT_MAX) fys[i] = (t.y - top) / fh;
      const a = { x: left + base.fx * fw, y: top + fys[i] * fh };
      const side = i < startCount ? 0 : 1;
      const dir = side === 0 ? -1 : 1;
      const gutter = Math.abs(t.x - edges[side]);
      const jx = edges[side] + dir * Math.min(gutter * 0.5 + perSide[side]++ * ELBOW_STEP, gutter - ELBOW_OUT);
      const bends = Math.abs(t.y - a.y) > 3;
      const d = bends
        ? `M${a.x.toFixed(1)} ${a.y.toFixed(1)} H${jx.toFixed(1)} V${t.y.toFixed(1)} H${t.x.toFixed(1)}`
        : `M${a.x.toFixed(1)} ${a.y.toFixed(1)} H${t.x.toFixed(1)}`;
      const joints: [number, number][] = bends ? [[jx, a.y], [jx, t.y]] : [];
      return { d, joints, tx: t.x, ty: t.y };
    });
    setBox({ w: stage.offsetWidth, h: stage.offsetHeight });
    setLeaders(next);
    setFitted(fys);
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
      { threshold: 0.2 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const focusOn = (i: number | null) => {
    setActive(i);
    if (i !== null) setSpot(spots[i]);
  };

  const notePointer = (e: PointerEvent) => {
    lastPointer.current = e.pointerType;
  };

  const onEnter = (i: number) => (e: PointerEvent) => {
    notePointer(e);
    if (e.pointerType === 'mouse') focusOn(i);
  };

  const onLeave = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') focusOn(null);
  };

  const onTap = (i: number) => {
    if (lastPointer.current === 'mouse') return;
    focusOn(active === i ? null : i);
  };

  const shown = phase === 'play';
  const focused = active !== null;
  const longName = name.length > LONG_NAME;
  const words = name.split(/\s+/).filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
  const rootStyle = {
    '--pc-sx': `${(spot.fx * 100).toFixed(1)}%`,
    '--pc-sy': `${(spot.fy * 100).toFixed(1)}%`,
  } as CSSProperties;

  const renderCallout = (c: PortraitCallout, i: number) => {
    const isActive = active === i;
    const atStart = i < startCount;
    const order = atStart ? i : i - startCount;
    return (
      <li key={i} className={styles.item} style={{ '--i': i, '--k': order } as CSSProperties}>
        <button
          type="button"
          className={cx(
            styles.callout,
            atStart && styles.calloutStart,
            isActive && styles.calloutActive,
            active !== null && !isActive && styles.calloutDim,
          )}
          aria-pressed={isActive}
          aria-description="Highlights this detail on the portrait"
          onPointerEnter={onEnter(i)}
          onPointerLeave={onLeave}
          onPointerDown={notePointer}
          onClick={() => onTap(i)}
          onFocus={() => focusOn(i)}
          onBlur={() => focusOn(null)}
        >
          <span className={cx(styles.marker, shown ? styles.markerShown : styles.markerHidden, isActive && styles.markerActive)} aria-hidden="true">
            {i + 1}
          </span>
          <span
            ref={(el) => {
              pinRefs.current[i] = el;
            }}
            className={cx(styles.pin, atStart && styles.pinStart)}
            aria-hidden="true"
          />
          <span className={cx(styles.copy, atStart && styles.copyStart, shown ? styles.copyShown : styles.copyHidden)}>
            <span className={cx(styles.label, isActive && styles.labelActive)}>{c.label}</span>
            <span className={styles.text}>{c.text}</span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <div
      ref={rootRef}
      className={cx(styles.root, className)}
      style={rootStyle}
    >
      <span className={cx(styles.keylight, shown && styles.keylightShown)} aria-hidden="true" />
      <span className={styles.sweep} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />

      <figure className={styles.figure} aria-labelledby={`${uid}-name`}>
        <div ref={stageRef} className={styles.stage}>
          <div className={cx(styles.portrait, shown && styles.portraitShown)}>
            <span className={cx(styles.cast, shown && styles.castShown)} aria-hidden="true" />
            <div ref={frameRef} className={cx(styles.frame, shown && styles.frameShown)}>
              <div className={cx(styles.lens, shown && styles.lensShown)}>
                {image ? (
                  <img
                    className={cx(styles.photo, focused && styles.photoFocused)}
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
              </div>
              <span className={styles.spill} aria-hidden="true" />
              <span className={cx(styles.shade, focused && styles.shadeFocused)} aria-hidden="true" />
              <span className={cx(styles.ring, focused && styles.ringFocused)} aria-hidden="true" />
              {spots.map((s, i) => (
                <span
                  key={i}
                  className={cx(styles.anchor, active === i && styles.anchorActive, shown ? styles.anchorShown : styles.anchorHidden)}
                  style={{ insetInlineStart: `${s.fx * 100}%`, insetBlockStart: `${s.fy * 100}%`, '--i': i } as CSSProperties}
                  aria-hidden="true"
                >
                  <span className={cx(styles.ripple, shown && styles.rippleShown)} />
                  <span className={styles.anchorNum}>{i + 1}</span>
                </span>
              ))}
              <span className={styles.edge} aria-hidden="true" />
            </div>
            <span className={cx(styles.marks, shown && styles.marksShown)} aria-hidden="true" />
          </div>

          <figcaption className={styles.caption}>
            <span id={`${uid}-name`} className={cx(styles.name, longName && styles.nameLong)}>
              {words.map((w, i) => (
                <Fragment key={i}>
                  <span className={styles.word}>
                    <span className={cx(styles.wordInner, shown ? styles.wordShown : styles.wordHidden)} style={{ '--w': i } as CSSProperties}>
                      {w}
                    </span>
                  </span>
                  {i < words.length - 1 ? ' ' : ''}
                </Fragment>
              ))}
            </span>
            {role && <span className={cx(styles.role, shown ? styles.roleShown : styles.roleHidden)}>{role}</span>}
          </figcaption>

          <ul className={styles.columnStart} aria-label={`Facts about ${name}`}>
            {items.slice(0, startCount).map((c, i) => renderCallout(c, i))}
          </ul>

          {items.length > startCount && (
            <ul className={styles.columnEnd} aria-label={`More facts about ${name}`}>
              {items.slice(startCount).map((c, j) => renderCallout(c, startCount + j))}
            </ul>
          )}

          {leaders.length > 0 && (
            <svg className={styles.leaders} width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} aria-hidden="true">
              {leaders.map((l, i) => (
                <g
                  key={i}
                  className={cx(styles.leader, active !== null && active !== i && styles.leaderDim)}
                  style={{ '--i': i } as CSSProperties}
                >
                  <path className={styles.halo} d={l.d} />
                  <path className={cx(styles.line, shown ? styles.lineShown : styles.lineHidden, active === i && styles.lineActive)} d={l.d} pathLength={1} />
                  {l.joints.map(([x, y], j) => (
                    <rect
                      key={j}
                      className={cx(styles.joint, shown ? styles.jointShown : styles.jointHidden)}
                      x={x - 2.5}
                      y={y - 2.5}
                      width={5}
                      height={5}
                      style={{ '--j': j } as CSSProperties}
                    />
                  ))}
                  <circle className={cx(styles.terminal, shown ? styles.terminalShown : styles.terminalHidden, active === i && styles.terminalActive)} cx={l.tx} cy={l.ty} r={3.5} />
                </g>
              ))}
            </svg>
          )}
        </div>
      </figure>
    </div>
  );
}
