import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface BentoPhoto {
  image: string;
  caption?: string;
  alt?: string;
}

export interface BentoShuffleGalleryProps {
  photos?: BentoPhoto[];
  shuffleSeconds?: number;
  cornerRadius?: number;
  gap?: number;
  ariaLabel?: string;
  pauseLabel?: string;
  playLabel?: string;
  className?: string;
}

const img = (id: string) => `https://images.unsplash.com/photo-${id}?q=80&w=1200&h=900&fit=crop&auto=format`;

export const defaultPhotos: BentoPhoto[] = [
  { image: img('1565958011703-44f9829ba187'), caption: 'Pistachio tart, spring menu' },
  { image: img('1565299624946-b28f40a0ae38'), caption: 'Wood-fired flatbread' },
  { image: img('1546069901-ba9599a7e63c'), caption: 'Roast squash grain bowl' },
  { image: img('1473093295043-cdd812d0e601'), caption: 'Hand-cut tagliatelle' },
  { image: img('1504674900247-0877df9cc836'), caption: 'The pass, Friday service' },
  { image: img('1414235077428-338989a2e8c0'), caption: 'Long table, Saturday supper' },
];

/* ---------- deterministic bento packing (exact fill, no gaps) ---------- */

interface CellRect {
  c: number;
  r: number;
  w: number;
  h: number;
}

interface BentoLayout {
  cols: number;
  rows: number;
  slots: CellRect[];
}

const BASE: CellRect[] = [
  { c: 0, r: 0, w: 2, h: 2 },
  { c: 2, r: 0, w: 1, h: 1 },
  { c: 3, r: 0, w: 1, h: 2 },
  { c: 2, r: 1, w: 1, h: 1 },
];

function wideLayout(count: number): BentoLayout {
  const slots: CellRect[] = [];
  if (count === 1) {
    slots.push({ c: 0, r: 0, w: 4, h: 2 });
    return { cols: 4, rows: 2, slots };
  }
  if (count === 2) {
    slots.push({ c: 0, r: 0, w: 3, h: 2 }, { c: 3, r: 0, w: 1, h: 2 });
    return { cols: 4, rows: 2, slots };
  }
  if (count === 3) {
    slots.push({ c: 0, r: 0, w: 2, h: 2 }, { c: 2, r: 0, w: 1, h: 2 }, { c: 3, r: 0, w: 1, h: 2 });
    return { cols: 4, rows: 2, slots };
  }
  if (count === 4) {
    slots.push({ c: 0, r: 0, w: 2, h: 2 }, { c: 2, r: 0, w: 1, h: 2 }, { c: 3, r: 0, w: 1, h: 1 }, { c: 3, r: 1, w: 1, h: 1 });
    return { cols: 4, rows: 2, slots };
  }
  if (count === 5) {
    slots.push({ c: 0, r: 0, w: 2, h: 2 }, { c: 2, r: 0, w: 2, h: 1 }, { c: 2, r: 1, w: 1, h: 1 }, { c: 3, r: 1, w: 1, h: 1 });
    return { cols: 4, rows: 2, slots };
  }
  slots.push(...BASE);
  let rows = 3;
  if (count === 6) slots.push({ c: 0, r: 2, w: 2, h: 1 }, { c: 2, r: 2, w: 2, h: 1 });
  else if (count === 7) slots.push({ c: 0, r: 2, w: 1, h: 1 }, { c: 1, r: 2, w: 1, h: 1 }, { c: 2, r: 2, w: 2, h: 1 });
  else slots.push({ c: 0, r: 2, w: 1, h: 1 }, { c: 1, r: 2, w: 1, h: 1 }, { c: 2, r: 2, w: 1, h: 1 }, { c: 3, r: 2, w: 1, h: 1 });
  let k = count - 8;
  while (k > 0) {
    const n = k >= 6 ? 4 : k === 5 ? 3 : k;
    if (n === 4) for (let j = 0; j < 4; j++) slots.push({ c: j, r: rows, w: 1, h: 1 });
    else if (n === 3) slots.push({ c: 0, r: rows, w: 2, h: 1 }, { c: 2, r: rows, w: 1, h: 1 }, { c: 3, r: rows, w: 1, h: 1 });
    else if (n === 2) slots.push({ c: 0, r: rows, w: 2, h: 1 }, { c: 2, r: rows, w: 2, h: 1 });
    else slots.push({ c: 0, r: rows, w: 4, h: 1 });
    k -= n;
    rows += 1;
  }
  return { cols: 4, rows, slots };
}

function narrowLayout(count: number): BentoLayout {
  const slots: CellRect[] = [{ c: 0, r: 0, w: 2, h: 2 }];
  if (count === 1) return { cols: 2, rows: 2, slots };
  const m = count - 1;
  let r = 2;
  const singles = m - (m % 2);
  for (let j = 0; j < singles; j++) slots.push({ c: j % 2, r: r + Math.floor(j / 2), w: 1, h: 1 });
  r += singles / 2;
  if (m % 2 === 1) {
    slots.push({ c: 0, r, w: 2, h: 1 });
    r += 1;
  }
  return { cols: 2, rows: r, slots };
}

interface TileBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function layoutBoxes(layout: BentoLayout, width: number, gap: number): { boxes: TileBox[]; height: number } {
  const { cols, rows, slots } = layout;
  const cellW = (width - (cols - 1) * gap) / cols;
  const cellH = cellW * (cols === 2 ? 0.82 : 0.74);
  const boxes = slots.map((s) => ({
    x: s.c * (cellW + gap),
    y: s.r * (cellH + gap),
    w: s.w * cellW + (s.w - 1) * gap,
    h: s.h * cellH + (s.h - 1) * gap,
  }));
  return { boxes, height: rows * cellH + (rows - 1) * gap };
}

/* ---------- choreographed spring motion ---------- */

type Body = {
  x: number;
  y: number;
  w: number;
  h: number;
  s: number;
  vx: number;
  vy: number;
  vw: number;
  vh: number;
  vs: number;
  /** shown arc offset and tilt, eased toward the plan so a re-plan never snaps */
  ax: number;
  ay: number;
  r: number;
};
type Role = 'out' | 'in' | 'rest';
type Plan = {
  from: TileBox;
  next: TileBox;
  releaseAt: number;
  nextSlot: number;
  role: Role;
  dist: number;
  arc: number;
  dir: number;
  bumpAt: number;
  bump: { x: number; y: number } | null;
};

const SPRINGS: Record<Role, { k: number; c: number }> = {
  out: { k: 120, c: 14.5 },
  in: { k: 190, c: 22 },
  rest: { k: 170, c: 21 },
};
const SCALE_K = 260;
const SCALE_C = 15;
const LIFT = 1.075;
const WINDUP_MS = 130;
const NARROW_MIN = 520;
const HOVER_COOLDOWN = 450;
/** px the pointer must travel after a trade before hovering can start another */
const MOVE_INTENT = 24;
const RING = 2 * Math.PI * 17;
const EDGE = 12;
/** the first frame is a trade caught mid-air; it completes this long after load (or on the first touch) */
const HOLD_MS = 2500;
const STAGE_T = 0.68;
const STAGE_SIZE_T = 0.9;

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const still = (b: TileBox): Body => ({ x: b.x, y: b.y, w: b.w, h: b.h, s: 1, vx: 0, vy: 0, vw: 0, vh: 0, vs: 0, ax: 0, ay: 0, r: 0 });
const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The slot the airborne tile is flying to in the opening frame. */
const stageSlot = (n: number) => (n >= 4 ? 3 : 1);

/** Opening arrangement: photo 0 is the feature, photo 1 is mid-flight into the stage slot. */
function openingAssign(n: number, auto: boolean): number[] {
  const ids = Array.from({ length: n }, (_, i) => i);
  if (auto && n >= 2) {
    const s = stageSlot(n);
    if (s !== 1) {
      ids[1] = s;
      ids[s] = 1;
    }
  }
  return ids;
}

export default function BentoShuffleGallery({
  photos = defaultPhotos,
  shuffleSeconds = 5,
  cornerRadius = 22,
  gap = 14,
  ariaLabel = 'Photo gallery',
  pauseLabel = 'Pause shuffle',
  playLabel = 'Resume shuffle',
  className,
}: BentoShuffleGalleryProps) {
  const count = photos.length;
  const radius = clamp(cornerRadius, 0, 48);
  const gapPx = clamp(gap, 0, 36);
  const autoOn = count > 1 && shuffleSeconds > 0;

  const [assign, setAssign] = useState<number[]>(() => openingAssign(photos.length, photos.length > 1 && shuffleSeconds > 0));
  const [reduced, setReduced] = useState(false);
  const [playOn, setPlayOn] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [inView, setInView] = useState(true);

  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const tileEls = useRef<(HTMLButtonElement | null)[]>([]);
  const bodies = useRef<Body[]>([]);
  const plan = useRef<Plan[]>([]);
  const boxes = useRef<TileBox[]>([]);
  const bounds = useRef({ w: 0, h: 0 });
  const assignRef = useRef(assign);
  const reducedRef = useRef(reduced);
  const autoRef = useRef(autoOn);
  const prevPhotos = useRef(photos);
  const started = useRef(false);
  const hold = useRef(false);
  const raf = useRef(0);
  const elapsed = useRef(0);
  const lastHover = useRef(0);
  /** hover intent: the tile the pointer rests on, promoted as soon as the cooldown allows (never dropped) */
  const hoverTarget = useRef<number | null>(null);
  const hoverTimer = useRef(0);
  /** a deliberate pointer move since the last trade: layout shifting under a still (or jittering) cursor must not start a trade */
  const pointerMoved = useRef(true);
  const pointerAt = useRef({ x: 0, y: 0 });
  const anchorAt = useRef({ x: 0, y: 0 });

  reducedRef.current = reduced;
  autoRef.current = autoOn;

  /** Writes every body to the DOM. Returns true while the eased arc/tilt is still catching up. */
  const paint = useCallback((snap = false): boolean => {
    const { w: bw, h: bh } = bounds.current;
    let moving = false;
    bodies.current.forEach((b, i) => {
      const el = tileEls.current[i];
      const p = plan.current[i];
      if (!el) return;
      let ax = 0;
      let ay = 0;
      let rot = 0;
      let tx = 0;
      let ty = 0;
      if (p && p.role !== 'rest' && p.dist > 1) {
        const remX = p.next.x - b.x;
        const remY = p.next.y - b.y;
        const rem = Math.hypot(remX, remY);
        const prog = clamp(1 - rem / p.dist, 0, 1);
        const bow = Math.sin(Math.PI * prog);
        const dx = (p.next.x - p.from.x) / p.dist;
        const dy = (p.next.y - p.from.y) / p.dist;
        const amp = clamp(p.dist * 0.3, 24, 150) * (p.role === 'out' ? 1 : 0.65) * bow;
        ax = -dy * p.arc * amp;
        ay = dx * p.arc * amp;
        rot = bow * p.dir * (p.role === 'out' ? 5.2 : 1.8);
        if (rem > 1) {
          tx = remX / rem;
          ty = remY / rem;
        }
      }
      if (snap) {
        b.ax = ax;
        b.ay = ay;
        b.r = rot;
      } else {
        b.ax += (ax - b.ax) * 0.3;
        b.ay += (ay - b.ay) * 0.3;
        b.r += (rot - b.r) * 0.3;
        if (Math.abs(ax - b.ax) + Math.abs(ay - b.ay) + Math.abs(rot - b.r) * 4 > 0.2) moving = true;
      }
      const x = bw > 0 ? clamp(b.x + b.ax, -EDGE, Math.max(-EDGE, bw - b.w + EDGE)) : b.x + b.ax;
      const y = bh > 0 ? clamp(b.y + b.ay, -EDGE, Math.max(-EDGE, bh - b.h + EDGE)) : b.y + b.ay;
      el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${b.r.toFixed(2)}deg) scale(${b.s.toFixed(4)})`;
      el.style.width = `${b.w.toFixed(2)}px`;
      el.style.height = `${b.h.toFixed(2)}px`;
      // light falls from the upper left; a tile in flight also throws its shadow toward where it is going
      const lift = clamp((b.s - 1) / (LIFT - 1), 0, 1.2);
      const feature = p?.nextSlot === 0 ? 1 : 0;
      el.style.setProperty('--bs-sx', (3 + feature * 3 + tx * 38 * lift).toFixed(2));
      el.style.setProperty('--bs-sy', (6 + feature * 6 + ty * 22 * lift + 16 * lift).toFixed(2));
      el.style.setProperty('--bs-lf', lift.toFixed(3));
      const lifted = b.s > 1.015;
      el.style.zIndex = lifted ? '4' : p?.nextSlot === 0 ? '3' : '1';
      el.dataset.lift = lifted ? '1' : '0';
    });
    return moving;
  }, []);

  const tick = useCallback(
    (now: number, last: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      let busy = false;
      bodies.current.forEach((b, i) => {
        const p = plan.current[i];
        if (!p) return;
        const released = now >= p.releaseAt;
        const target = released ? p.next : p.from;
        const sp = SPRINGS[p.role];
        if (p.bump && now >= p.bumpAt) {
          b.vx += p.bump.x;
          b.vy += p.bump.y;
          p.bump = null;
        }
        let sTarget = 1;
        if (p.role === 'out' && p.dist > 1) {
          const rem = Math.hypot(p.next.x - b.x, p.next.y - b.y);
          if (!released || rem > p.dist * 0.16) sTarget = LIFT;
        } else if (p.role === 'in' && !released) {
          sTarget = 0.96;
        }
        for (let n = 0; n < steps; n++) {
          b.vx += (sp.k * (target.x - b.x) - sp.c * b.vx) * h;
          b.vy += (sp.k * (target.y - b.y) - sp.c * b.vy) * h;
          b.vw += (sp.k * (target.w - b.w) - sp.c * b.vw) * h;
          b.vh += (sp.k * (target.h - b.h) - sp.c * b.vh) * h;
          b.vs += (SCALE_K * (sTarget - b.s) - SCALE_C * b.vs) * h;
          b.x += b.vx * h;
          b.y += b.vy * h;
          b.w += b.vw * h;
          b.h += b.vh * h;
          b.s += b.vs * h;
        }
        busy =
          busy ||
          !!p.bump ||
          !released ||
          Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.vw) + Math.abs(b.vh) + Math.abs(b.vs) * 100 > 0.5 ||
          Math.abs(target.x - b.x) + Math.abs(target.y - b.y) + Math.abs(target.w - b.w) + Math.abs(target.h - b.h) + Math.abs(sTarget - b.s) * 100 > 0.2;
      });
      const moving = paint();
      raf.current = busy || moving ? requestAnimationFrame((t) => tick(t, now)) : 0;
    },
    [paint],
  );

  const kick = useCallback(() => {
    if (raf.current || reducedRef.current) return;
    const start = performance.now();
    raf.current = requestAnimationFrame((t) => tick(t, start - 16));
  }, [tick]);

  /** Opening frame: a trade caught mid-air. Photo 1 (lifted, tilted) is halfway to its new slot; photo 0 has already landed as the feature. */
  const stagePose = useCallback(
    (bx: TileBox[]) => {
      const cur = assignRef.current;
      const s = stageSlot(cur.length);
      const flier = cur[s];
      const hero = cur[0];
      const from = bx[0];
      const dest = bx[s] ?? bx[0];
      const dist = Math.hypot(dest.x - from.x, dest.y - from.y) || 1;
      const airCx = lerp(from.x, dest.x, STAGE_T) + lerp(from.w, dest.w, STAGE_SIZE_T) / 2;
      const airCy = lerp(from.y, dest.y, STAGE_T) + lerp(from.h, dest.h, STAGE_SIZE_T) / 2;
      const nextBodies: Body[] = [];
      const nextPlan: Plan[] = [];
      for (let p = 0; p < cur.length; p++) {
        const slot = cur.indexOf(p);
        const box = bx[slot] ?? bx[0];
        if (p === flier) {
          nextBodies[p] = {
            ...still({ x: lerp(from.x, dest.x, STAGE_T), y: lerp(from.y, dest.y, STAGE_T), w: lerp(from.w, dest.w, STAGE_SIZE_T), h: lerp(from.h, dest.h, STAGE_SIZE_T) }),
            s: LIFT,
          };
          nextPlan[p] = {
            from,
            next: dest,
            releaseAt: Infinity,
            nextSlot: s,
            role: 'out',
            dist,
            arc: (dest.x - from.x) / dist > 0 ? -1 : 1,
            dir: Math.sign(dest.x - from.x) || 1,
            bumpAt: 0,
            bump: null,
          };
        } else if (p === hero) {
          nextBodies[p] = still(box);
          nextPlan[p] = { from: dest, next: box, releaseAt: 0, nextSlot: 0, role: 'in', dist, arc: 1, dir: 1, bumpAt: 0, bump: null };
        } else {
          // neighbours are nudged out from under the flying tile
          const cx = box.x + box.w / 2 - airCx;
          const cy = box.y + box.h / 2 - airCy;
          const cd = Math.hypot(cx, cy) || 1;
          const push = 7 * clamp(1 - cd / (bounds.current.w * 0.45), 0, 1);
          const b = still(box);
          b.x += (cx / cd) * push;
          b.y += (cy / cd) * push;
          nextBodies[p] = b;
          nextPlan[p] = { from: box, next: box, releaseAt: 0, nextSlot: slot, role: 'rest', dist: 0, arc: 1, dir: 1, bumpAt: 0, bump: null };
        }
      }
      bodies.current = nextBodies;
      plan.current = nextPlan;
      paint(true);
    },
    [paint],
  );

  /** Everything at rest in its slot, no trade in flight. */
  const settle = useCallback(() => {
    hold.current = false;
    plan.current = plan.current.map((p) => ({ ...p, from: p.next, role: 'rest' as Role, dist: 0, releaseAt: 0, bump: null }));
    bodies.current = plan.current.map((p) => still(p.next));
    paint(true);
  }, [paint]);

  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const width = stage.clientWidth;
    if (width <= 0 || count === 0) return;
    const layout = width < NARROW_MIN ? narrowLayout(count) : wideLayout(count);
    const { boxes: nextBoxes, height } = layoutBoxes(layout, width, gapPx);
    boxes.current = nextBoxes;
    bounds.current = { w: width, h: height };
    stage.style.height = `${Math.round(height)}px`;
    if (!started.current) {
      hold.current = autoRef.current && count > 1 && !prefersReduced();
      if (hold.current) elapsed.current = Math.max(0, Math.max(shuffleSeconds, 2) * 1000 - HOLD_MS);
    }
    if (hold.current) {
      stagePose(nextBoxes);
      started.current = true;
      return;
    }
    const now = performance.now();
    plan.current = Array.from({ length: count }, (_, p) => {
      const box = nextBoxes[assignRef.current.indexOf(p)] ?? nextBoxes[0];
      return { from: box, next: box, releaseAt: now, nextSlot: assignRef.current.indexOf(p), role: 'rest' as Role, dist: 0, arc: 1, dir: 1, bumpAt: 0, bump: null };
    });
    if (!started.current) {
      bodies.current = plan.current.map((p) => still(p.next));
      started.current = true;
      paint(true);
    } else {
      kick();
    }
  }, [count, gapPx, shuffleSeconds, kick, paint, stagePose]);

  /** Trade the feature slot with another photo's slot: one choreographed swap. */
  const commit = useCallback(
    (next: number[]) => {
      hold.current = false;
      const now = performance.now();
      const current = assignRef.current;
      const outPhoto = current[0];
      const inPhoto = next[0];
      const swapSlot = next.indexOf(outPhoto);
      const outBox = boxes.current[swapSlot] ?? boxes.current[0];
      const inBox = boxes.current[current.indexOf(inPhoto)] ?? boxes.current[0];
      const outBody = bodies.current[outPhoto];
      const outFrom = outBody ? { x: outBody.x, y: outBody.y, w: outBody.w, h: outBody.h } : boxes.current[0];
      const odx = outBox.x - outFrom.x;
      const ody = outBox.y - outFrom.y;
      const od = Math.hypot(odx, ody) || 1;
      // bow the outgoing tile upward (or sideways when level); the incoming tile bows the opposite way
      const arc = odx / od > 0 ? -1 : 1;
      const featureCenter = { x: (boxes.current[0]?.x ?? 0) + (boxes.current[0]?.w ?? 0) / 2, y: (boxes.current[0]?.y ?? 0) + (boxes.current[0]?.h ?? 0) / 2 };
      const swapCenter = { x: inBox.x + inBox.w / 2, y: inBox.y + inBox.h / 2 };
      const mid = { x: (featureCenter.x + swapCenter.x) / 2, y: (featureCenter.y + swapCenter.y) / 2 };

      plan.current = Array.from({ length: next.length }, (_, p) => {
        const slot = next.indexOf(p);
        const b = bodies.current[p];
        const to = boxes.current[slot] ?? boxes.current[0];
        const from = b ? { x: b.x, y: b.y, w: b.w, h: b.h } : boxes.current[current.indexOf(p)] ?? to;
        const role: Role = p === outPhoto ? 'out' : p === inPhoto ? 'in' : 'rest';
        const dist = Math.hypot(to.x - from.x, to.y - from.y);
        const dir = Math.sign(to.x - from.x) || 1;
        let bump: Plan['bump'] = null;
        let bumpAt = 0;
        if (role === 'rest') {
          const cx = to.x + to.w / 2 - mid.x;
          const cy = to.y + to.h / 2 - mid.y;
          const cd = Math.hypot(cx, cy) || 1;
          const reach = Math.max(bounds.current.w, 1);
          const fall = clamp(1 - cd / (reach * 0.75), 0.25, 1);
          bump = { x: (cx / cd) * 300 * fall, y: (cy / cd) * 300 * fall };
          bumpAt = now + WINDUP_MS + (cd / reach) * 220;
        }
        return {
          from,
          next: to,
          releaseAt: role === 'out' ? now + WINDUP_MS : now + (role === 'in' ? 40 : 0),
          nextSlot: slot,
          role,
          dist,
          arc,
          dir,
          bumpAt,
          bump,
        };
      });
      assignRef.current = next;
      setAssign(next);
      elapsed.current = 0;
      if (reducedRef.current) {
        settle();
      } else {
        const inBody = bodies.current[inPhoto];
        if (inBody) inBody.s = Math.min(inBody.s, 0.985);
        kick();
      }
    },
    [kick, settle],
  );

  const promote = useCallback(
    (photo: number) => {
      const cur = assignRef.current;
      if (photo < 0 || photo >= cur.length || cur[0] === photo) return;
      const slot = cur.indexOf(photo);
      const next = [...cur];
      next[0] = photo;
      next[slot] = cur[0];
      commit(next);
    },
    [commit],
  );

  const advance = useCallback(() => {
    const n = count;
    if (n < 2) return;
    if (hold.current) {
      // let the trade caught in the opening frame finish
      hold.current = false;
      const now = performance.now();
      plan.current.forEach((p) => {
        p.releaseAt = p.role === 'out' ? now + 60 : now;
      });
      kick();
      return;
    }
    promote((assignRef.current[0] + 1) % n);
  }, [count, kick, promote]);

  useIsoLayoutEffect(() => {
    if (prevPhotos.current !== photos) {
      prevPhotos.current = photos;
      const fresh = openingAssign(photos.length, autoRef.current);
      assignRef.current = fresh;
      started.current = false;
      hold.current = false;
      bodies.current = [];
      plan.current = [];
      setAssign(fresh);
    }
    measure();
  }, [photos, measure]);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(stage);
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.12 });
    io.observe(root);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [measure]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setReduced(mq.matches);
      if (mq.matches) {
        setPlayOn(false);
        if (hold.current) settle();
      }
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [settle]);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      window.clearTimeout(hoverTimer.current);
    },
    [],
  );

  const playing = autoOn && playOn && !reduced && inView && !hovered && !focusWithin;

  useEffect(() => {
    if (!playing) return;
    const ring = ringRef.current;
    const duration = Math.max(shuffleSeconds, 2) * 1000;
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      elapsed.current += now - last;
      last = now;
      if (elapsed.current >= duration) {
        elapsed.current = 0;
        advance();
      }
      if (ring) ring.style.strokeDashoffset = String(RING * (1 - clamp(elapsed.current / duration, 0, 1)));
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [playing, shuffleSeconds, advance]);

  const scheduleHover = (photo: number) => {
    window.clearTimeout(hoverTimer.current);
    const wait = Math.max(0, HOVER_COOLDOWN - (performance.now() - lastHover.current));
    const go = () => {
      if (hoverTarget.current !== photo) return;
      hoverTarget.current = null;
      lastHover.current = performance.now();
      pointerMoved.current = false;
      anchorAt.current = { ...pointerAt.current };
      promote(photo);
    };
    // a trade in flight is re-planned from where the tiles are, so a second hover queues instead of being dropped
    if (wait === 0) go();
    else hoverTimer.current = window.setTimeout(go, wait);
  };

  const onTileEnter = (e: PointerEvent<HTMLButtonElement>, photo: number) => {
    if (e.pointerType !== 'mouse' || reducedRef.current) return;
    hoverTarget.current = photo;
    // layout shifting under a still cursor is not intent: wait for the pointer to actually move
    if (pointerMoved.current) scheduleHover(photo);
  };

  const onTileLeave = (photo: number) => {
    if (hoverTarget.current !== photo) return;
    hoverTarget.current = null;
    window.clearTimeout(hoverTimer.current);
  };

  const onRootMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    pointerAt.current = { x: e.clientX, y: e.clientY };
    if (pointerMoved.current) return;
    if (Math.hypot(e.clientX - anchorAt.current.x, e.clientY - anchorAt.current.y) < MOVE_INTENT) return;
    pointerMoved.current = true;
    if (hoverTarget.current !== null) scheduleHover(hoverTarget.current);
  };

  const onTileActivate = (photo: number) => {
    lastHover.current = performance.now();
    hoverTarget.current = null;
    pointerMoved.current = false;
    anchorAt.current = { ...pointerAt.current };
    window.clearTimeout(hoverTimer.current);
    promote(photo);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = count;
    if (n < 2) return;
    const feature = assignRef.current[0];
    const moves: Record<string, number> = {
      ArrowRight: (feature + 1) % n,
      ArrowDown: (feature + 1) % n,
      ArrowLeft: (feature - 1 + n) % n,
      ArrowUp: (feature - 1 + n) % n,
      Home: 0,
      End: n - 1,
    };
    const target = moves[e.key];
    if (target === undefined) return;
    e.preventDefault();
    promote(target);
  };

  const rootStyle = {
    '--bs-radius': `${radius}px`,
    '--bs-gap': `${gapPx}px`,
  } as CSSProperties;

  if (count === 0) return null;

  const featured = photos[assign[0]];
  const featuredName = featured?.caption || featured?.alt || 'Photo';

  return (
    <section
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
      aria-label={ariaLabel}
      data-live={inView && !reduced ? 'on' : 'off'}
      onFocus={() => setFocusWithin(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
      }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onPointerMove={onRootMove}
    >
      <div className={styles.inner}>
        <div className={styles.table}>
          <div className={styles.deck}>
            <div
              ref={stageRef}
              className={styles.stage}
              tabIndex={0}
              aria-description="Use the arrow keys to choose the featured photo; Enter makes the focused photo the feature."
              onKeyDown={onKeyDown}
            >
              {photos.map((photo, p) => {
                const slot = assign.indexOf(p);
                const isFeature = slot === 0;
                const initial = photo.caption?.trim().charAt(0).toUpperCase() || '·';
                const label = photo.caption || photo.alt;
                return (
                  <button
                    key={p}
                    type="button"
                    ref={(el) => {
                      tileEls.current[p] = el;
                    }}
                    className={styles.tile}
                    aria-label={`${photo.caption || photo.alt || 'Photo'}${isFeature ? ' — featured' : ''}`}
                    onPointerEnter={(e) => onTileEnter(e, p)}
                    onPointerLeave={() => onTileLeave(p)}
                    onClick={() => onTileActivate(p)}
                  >
                    {photo.image ? (
                      <img className={styles.photo} src={photo.image} alt="" loading="lazy" draggable={false} />
                    ) : (
                      <span className={styles.missing} aria-hidden="true">
                        {initial}
                      </span>
                    )}
                    {label && (
                      <span key={isFeature ? 'feature' : 'quiet'} className={isFeature ? styles.chipFeature : styles.chipQuiet}>
                        {isFeature && <i className={styles.chipDot} aria-hidden="true" />}
                        {label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <span className={styles.srOnly} role="status" aria-live={playing ? 'off' : 'polite'}>
              {`Featured: ${featuredName}`}
            </span>

            {autoOn && !reduced && (
              <button
                type="button"
                className={styles.pause}
                aria-label={playOn ? pauseLabel : playLabel}
                aria-pressed={!playOn}
                onClick={() => setPlayOn((v) => !v)}
              >
                <svg className={styles.ring} viewBox="0 0 40 40" aria-hidden="true">
                  <circle className={styles.ringTrack} cx="20" cy="20" r="17" />
                  <circle ref={ringRef} className={styles.ringFill} cx="20" cy="20" r="17" strokeDasharray={RING} strokeDashoffset={RING} />
                </svg>
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  {playOn ? (
                    <path d="M8.5 5.5v13M15.5 5.5v13" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
                  ) : (
                    <path d="M8 5.2v13.6a.6.6 0 0 0 .9.5l10.4-6.8a.6.6 0 0 0 0-1L8.9 4.7a.6.6 0 0 0-.9.5z" fill="currentColor" />
                  )}
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
