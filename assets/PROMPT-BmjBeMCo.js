const n=`Create a custom element called "Bento Shuffle Gallery". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: photos (image, caption, description, meta), shuffle speed, corner roundness, gap. Add other settings if they help.

\`\`\`tsx
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export interface BentoPhoto {
  image: string;
  caption?: string;
  alt?: string;
  description?: string;
  meta?: string[];
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

const img = (id: string) => \`https://images.unsplash.com/photo-\${id}?q=80&w=1200&h=900&fit=crop&auto=format\`;

export const defaultPhotos: BentoPhoto[] = [
  { image: img('1565958011703-44f9829ba187'), caption: 'Pistachio tart, spring menu', description: 'Crisp shell, pistachio cream and seasonal fruit.', meta: ['Dessert', 'Serves 8', '25 min'] },
  { image: img('1565299624946-b28f40a0ae38'), caption: 'Wood-fired flatbread', description: 'Blistered crust with charred greens and soft cheese.', meta: ['Starter', 'To share', '12 min'] },
  { image: img('1546069901-ba9599a7e63c'), caption: 'Roast squash grain bowl', description: 'Warm grains, roast squash and a toasted seed crunch.', meta: ['Main', 'Vegan', '30 min'] },
  { image: img('1473093295043-cdd812d0e601'), caption: 'Hand-cut tagliatelle', description: 'Fresh egg pasta folded through a slow-braised ragu.', meta: ['Main', 'Serves 2', '40 min'] },
  { image: img('1504674900247-0877df9cc836'), caption: 'The pass, Friday service', description: 'Plates leave the pass hot, in order, one table at a time.', meta: ['Behind the scenes', '7 pm', '12 cooks'] },
  { image: img('1414235077428-338989a2e8c0'), caption: 'Long table, Saturday supper', description: 'One long table, family-style plates and no rush.', meta: ['Event', 'Saturdays', '24 seats'] },
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
      el.style.transform = \`translate(\${x.toFixed(2)}px, \${y.toFixed(2)}px) rotate(\${b.r.toFixed(2)}deg) scale(\${b.s.toFixed(4)})\`;
      el.style.width = \`\${b.w.toFixed(2)}px\`;
      el.style.height = \`\${b.h.toFixed(2)}px\`;
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
    stage.style.height = \`\${Math.round(height)}px\`;
    const f = nextBoxes[0];
    stage.style.setProperty('--bs-fx', \`\${f.x.toFixed(1)}px\`);
    stage.style.setProperty('--bs-fy', \`\${f.y.toFixed(1)}px\`);
    stage.style.setProperty('--bs-fw', \`\${f.w.toFixed(1)}px\`);
    stage.style.setProperty('--bs-fh', \`\${f.h.toFixed(1)}px\`);
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

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const playing = autoOn && playOn && !reduced && inView && !focusWithin;

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

  const hasDetail = (p?: BentoPhoto) => !!p && (!!p.description || !!p.meta?.length);

  const onTileActivate = (photo: number) => {
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
    '--bs-radius': \`\${radius}px\`,
    '--bs-gap': \`\${gapPx}px\`,
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
      onFocus={(e) => setFocusWithin(e.target.matches(':focus-visible'))}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
      }}
    >
      <div className={styles.inner}>
          <div className={styles.deck}>
            <div
              ref={stageRef}
              className={styles.stage}
              tabIndex={0}
              aria-description="Use the arrow keys to choose the featured photo; Enter on a photo makes it the feature."
              onKeyDown={onKeyDown}
            >
              {photos.map((photo, p) => {
                const slot = assign.indexOf(p);
                const isFeature = slot === 0;
                const initial = photo.caption?.trim().charAt(0).toUpperCase() || '·';
                const label = photo.caption || photo.alt;
                const detail = isFeature && hasDetail(photo);
                return (
                  <button
                    key={p}
                    type="button"
                    ref={(el) => {
                      tileEls.current[p] = el;
                    }}
                    className={styles.tile}
                    aria-label={\`\${photo.caption || photo.alt || 'Photo'}\${isFeature ? ' — featured' : ''}\`}
                    data-detail={detail ? '1' : undefined}
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
              {hasDetail(featured) && (
                <div key={assign[0]} className={styles.panel}>
                  <h3 className={styles.panelTitle}>{featuredName}</h3>
                  {featured.description && <p className={styles.panelText}>{featured.description}</p>}
                  {!!featured.meta?.length && (
                    <ul className={styles.panelMeta}>
                      {featured.meta.slice(0, 3).map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <span className={styles.srOnly} role="status" aria-live={playing ? 'off' : 'polite'}>
              {\`Featured: \${featuredName}\`}
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
    </section>
  );
}
\`\`\`

\`\`\`css
@font-face {
  font-family: "Bricolage Grotesque";
  src: url("./fonts/bricolage-grotesque-latin-var.woff2") format("woff2");
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}

.root {
  --bs-radius: 22px;
  --bs-gap: 14px;
  --bs-ink: #232634;
  --bs-ink-soft: #565b6e;
  --bs-surface: #e7eaf0;
  --bs-wash: #d9dde6;
  --bs-accent: #4a55c9;
  --bs-hi: rgba(255, 255, 255, 0.95);
  --bs-lo: rgba(139, 148, 170, 0.5);
  --bs-font-ui:
    "Bricolage Grotesque", "Helvetica Neue", "Segoe UI", system-ui, sans-serif;

  position: relative;
  isolation: isolate;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: 0;
  padding-inline: 0;
  color: var(--bs-ink);
  font-family: var(--bs-font-ui);
}

.root::selection {
  background: var(--bs-accent);
  color: var(--bs-surface);
}

.inner {
  position: relative;
  max-inline-size: 1160px;
  margin-inline: auto;
}

.deck {
  position: relative;
}

.stage {
  position: relative;
  outline: none;
  touch-action: pan-y;
  transition: height 520ms cubic-bezier(0.22, 1, 0.36, 1);
}

.stage:focus-visible {
  outline: 2px solid var(--bs-accent);
  outline-offset: 8px;
  border-radius: var(--bs-radius);
}

/* soft-UI: tiles are raised from the surface by a paired light/dark shadow; a tile in flight lifts further */
.tile {
  --bs-sx: 0;
  --bs-sy: 0;
  --bs-lf: 0;

  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  container-type: size;
  display: block;
  padding: 0;
  border: 0;
  overflow: clip;
  border-radius: var(--bs-radius);
  background: var(--bs-wash);
  cursor: pointer;
  transform-origin: 50% 50%;
  -webkit-tap-highlight-color: transparent;
  will-change: transform;
  box-shadow:
    -6px -6px 14px var(--bs-hi),
    7px 8px 16px var(--bs-lo),
    0 calc(var(--bs-lf) * 20px) calc(var(--bs-lf) * 34px) calc(var(--bs-lf) * -10px) rgba(35, 38, 52, calc(var(--bs-lf) * 0.3));
}

.tile:focus-visible {
  outline: 2px solid var(--bs-accent);
  outline-offset: 3px;
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  pointer-events: none;
}

.missing {
  display: grid;
  place-items: center;
  inline-size: 100%;
  block-size: 100%;
  background: var(--bs-wash);
  color: var(--bs-ink-soft);
  font-size: 32px;
  font-weight: 600;
  user-select: none;
}

/* one small chip; sized to its tile so it stays proportionate mid-trade */
.chipFeature {
  position: absolute;
  z-index: 1;
  inset-block-end: 12px;
  inset-inline-start: 12px;
  box-sizing: border-box;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  max-inline-size: calc(100% - 24px);
  padding: 0.5em 0.95em;
  border-radius: 999px;
  background: rgba(22, 24, 34, 0.68);
  -webkit-backdrop-filter: blur(14px) saturate(1.5);
  backdrop-filter: blur(14px) saturate(1.5);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
  color: #ffffff;
  font-size: clamp(12px, 2.6cqi, 15px);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.25;
  overflow: hidden;
  overflow-wrap: anywhere;
  animation: chipIn 520ms cubic-bezier(0.22, 1, 0.36, 1) 300ms backwards;
}

.chipDot {
  display: inline-block;
  inline-size: 0.5em;
  block-size: 0.5em;
  margin-inline-end: 0.55em;
  border-radius: 50%;
  background: #b8c0ff;
  vertical-align: 0.08em;
}

/* other tiles stay clean; their caption shows for keyboard users */
.chipQuiet {
  position: absolute;
  z-index: 1;
  inset-block-end: 10px;
  inset-inline-start: 10px;
  box-sizing: border-box;
  max-inline-size: calc(100% - 20px);
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(22, 24, 34, 0.68);
  -webkit-backdrop-filter: blur(14px) saturate(1.5);
  backdrop-filter: blur(14px) saturate(1.5);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
  pointer-events: none;
}

.tile:focus-visible .chipQuiet,
.tile:hover .chipQuiet {
  opacity: 1;
  transition: opacity 200ms ease;
}

/* hover is a quiet affordance only: the photo eases in, nothing moves or reflows */
.photo {
  transition: transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
}

.tile:hover .photo {
  transform: scale(1.04);
}

.tile[data-detail="1"] .chipFeature {
  opacity: 0;
}

/* glass detail panel over the foot of the featured tile */
.panel {
  position: absolute;
  z-index: 5;
  inset-inline-start: calc(var(--bs-fx, 0px) + 12px);
  inset-block-start: calc(var(--bs-fy, 0px) + var(--bs-fh, 0px) - 12px);
  inline-size: calc(var(--bs-fw, 0px) - 24px);
  max-block-size: calc(var(--bs-fh, 0px) - 24px);
  box-sizing: border-box;
  overflow: auto;
  transform: translateY(-100%);
  padding: 16px 18px 16px 18px;
  border-radius: max(calc(var(--bs-radius) - 6px), 6px);
  background: rgba(22, 24, 34, 0.74);
  -webkit-backdrop-filter: blur(18px) saturate(1.5);
  backdrop-filter: blur(18px) saturate(1.5);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 14px 30px -12px rgba(22, 24, 34, 0.5);
  color: #ffffff;
  animation: panelIn 520ms cubic-bezier(0.22, 1, 0.36, 1) 300ms backwards;
}

.panelTitle {
  margin: 0;
  font-size: clamp(15px, 2.4cqi, 20px);
  font-weight: 650;
  letter-spacing: -0.015em;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.panelText {
  margin: 6px 0 0;
  max-inline-size: 52ch;
  font-size: 14px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.9);
  overflow-wrap: anywhere;
}

.panelMeta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.panelMeta li {
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.pause {
  position: absolute;
  inset-block-start: 12px;
  inset-inline-end: 12px;
  z-index: 6;
  display: grid;
  place-items: center;
  inline-size: 40px;
  block-size: 40px;
  padding: 0;
  border-radius: 50%;
  border: 0;
  background: var(--bs-surface);
  color: var(--bs-ink);
  cursor: pointer;
  box-shadow: -3px -3px 8px var(--bs-hi), 4px 4px 10px var(--bs-lo);
  transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 200ms ease;
}

.pause:hover {
  transform: scale(1.06);
}

.pause:active,
.pause[aria-pressed="true"] {
  transform: scale(0.96);
  box-shadow: inset -2px -2px 5px var(--bs-hi), inset 3px 3px 7px var(--bs-lo);
}

.pause:focus-visible {
  outline: 2px solid var(--bs-accent);
  outline-offset: 3px;
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
  stroke-width: 1.6;
}

.ringTrack {
  stroke: rgba(35, 38, 52, 0.14);
}

.ringFill {
  stroke: var(--bs-accent);
  stroke-linecap: round;
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

@container (max-width: 560px) {
  .pause {
    inset-block-start: 8px;
    inset-inline-end: 8px;
    inline-size: 38px;
    block-size: 38px;
  }
}

@keyframes panelIn {
  from {
    opacity: 0;
    translate: 0 10px;
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}

@keyframes chipIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tile,
  .pause,
  .stage {
    transition: none;
  }

  .chipFeature,
  .panel {
    animation: none;
  }

  .photo {
    transition: none;
  }

  .tile:hover .photo {
    transform: none;
  }
}
\`\`\`
`;export{n as default};
