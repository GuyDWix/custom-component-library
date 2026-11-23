const n=`import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export type PeelCorner = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface PeelCornerCardProps {
  title?: string;
  body?: string;
  footnote?: string;
  hiddenTitle?: string;
  hiddenBody?: string;
  hiddenCode?: string;
  peelColor?: string;
  corner?: PeelCorner;
  className?: string;
}

/**
 * Peel geometry lives in "corner space": the peeled corner is the origin O,
 * u runs along the top/bottom edge and v along the side edge, both pointing
 * away from the corner. A peel of distance d lifts the sticker along a crease
 * from A = (d, 0) to B = (0, d). The crease bows toward the corner
 * (quadratic Bezier, control at k*d on both axes). Everything on the corner
 * side of the crease is cut away from the sticker (clipped to the sticker's
 * own outline) and shown again as the folded flap, reflected across the fold,
 * so a deep peel can overhang the card edge like a real lifted vinyl corner.
 */
interface CornerVecs {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

const CORNER_VECS: Record<PeelCorner, CornerVecs> = {
  'top-right': { ax: -1, ay: 0, bx: 0, by: 1 },
  'top-left': { ax: 1, ay: 0, bx: 0, by: 1 },
  'bottom-right': { ax: -1, ay: 0, bx: 0, by: -1 },
  'bottom-left': { ax: 1, ay: 0, bx: 0, by: -1 },
};

// Where the print-stress shading sits, per corner.
const CORNER_POS: Record<PeelCorner, { x: number; y: number }> = {
  'top-right': { x: 1, y: 0 },
  'top-left': { x: 0, y: 0 },
  'bottom-right': { x: 1, y: 1 },
  'bottom-left': { x: 0, y: 1 },
};

// Copy hangs on the edge opposite the peel; the brand strip sits beside it.
const LAYOUT_CLASS: Record<PeelCorner, string> = {
  'top-right': 'layoutTopRight',
  'top-left': 'layoutTopLeft',
  'bottom-right': 'layoutBottomRight',
  'bottom-left': 'layoutBottomLeft',
};

const MESSAGE_ANCHOR: Record<PeelCorner, string> = {
  'top-right': 'messageTopRight',
  'top-left': 'messageTopLeft',
  'bottom-right': 'messageBottomRight',
  'bottom-left': 'messageBottomLeft',
};

const STIFFNESS = 168;
const DAMPING = 21;
const STICKER_INSET = 0; // the sticker is the whole component: full bleed
const RADIUS = 20; // keep in sync with --pc-radius in Component.module.css
const BLEED_RATIO = 0;
const SAMPLES = 28;
const BIG = 6000;
const DMAX_RATIO = 1.12; // of the shorter side, never deeper than the card is tall
const IDLE_RATIO = 0.5; // idle corner = half the shorter side, a hero-sized curl
const HOLD_RATIO = 0.92;
const HOLD_TRIGGER = 0.6;
const TOGGLE_RATIO = 0.72; // a click above this peel level smooths the sticker back
const TAP_SLOP = 9;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const CARD_HELP =
  'Promo card with a peeling sticker corner. Press Enter or Space to peel the corner back and reveal the hidden message; press Escape to smooth it back.';

type Vtx = { u: number; v: number; c: boolean };

/** Sutherland-Hodgman against one half-plane nx*u + ny*v + k >= 0. \`c\` marks points on the crease. */
function clipHalfPlane(poly: Vtx[], nx: number, ny: number, k: number): Vtx[] {
  const out: Vtx[] = [];
  const f = (p: Vtx) => nx * p.u + ny * p.v + k;
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const fc = f(cur);
    const fp = f(prev);
    const cross = () => {
      const t = fp / (fp - fc);
      return {
        u: prev.u + (cur.u - prev.u) * t,
        v: prev.v + (cur.v - prev.v) * t,
        c: prev.c && cur.c,
      };
    };
    if (fc >= 0) {
      if (fp < 0) out.push(cross());
      out.push(cur);
    } else if (fp >= 0) {
      out.push(cross());
    }
  }
  return out;
}

/** Longest unbreakable run in the title, in characters (hyphens are break points). */
function longestWord(text: string) {
  let longest = 1;
  for (const w of text.split(/[\\s\\u2013\\u2014-]+/)) longest = Math.max(longest, w.length);
  return longest;
}

type Frame = 'tall' | 'square' | 'wide';

// Copy-area budget per frame shape, in container-width units (card width = 100).
const FRAMES: Record<Frame, { width: number; height: number; bodyWidth: number; cap: number }> = {
  tall: { width: 84, height: 74, bodyWidth: 66, cap: 15 },
  square: { width: 84, height: 54, bodyWidth: 66, cap: 12 },
  wide: { width: 58, height: 38, bodyWidth: 38, cap: 8 },
};

/** Body size in container-width units; the CSS floor keeps it readable. */
function bodySizeCqi(body: string, frame: Frame) {
  const n = body.length;
  if (frame === 'wide') return n <= 110 ? 1.55 : n <= 180 ? 1.4 : 1.25;
  if (n <= 110) return 4.1;
  if (n <= 180) return 3.6;
  return 3.2;
}

/**
 * Headline size in container-width units. The copy block (headline + body) has
 * a fixed budget per frame shape: the headline gets whatever height the body
 * leaves, and no single word may be wider than a line.
 */
function titleSizeCqi(title: string, body: string, frame: Frame) {
  const f = FRAMES[frame];
  const n = Math.max(6, title.trim().length);
  const b = bodySizeCqi(body, frame);
  const bodyLines = body ? Math.ceil((body.length * 0.55 * b) / f.bodyWidth) : 0;
  const bodyHeight = bodyLines * b * 1.42 + (body ? (frame === 'wide' ? 2.4 : 3.4) : 0);
  const titleHeight = clamp(f.height - bodyHeight, 14, f.height);
  const byArea = 0.93 * Math.sqrt((f.width * titleHeight) / (n * 0.56 * 1.0));
  const byWord = f.width / (longestWord(title) * 0.6);
  return clamp(Math.min(byArea, byWord, f.cap), 5.2, f.cap);
}

/** Keeps "6 a.m." and similar number + unit pairs on one line. */
function glueUnits(text: string) {
  return text.replace(/(\\d)\\s+(a\\.m\\.|p\\.m\\.|am\\b|pm\\b)/gi, '$1\\u00a0$2');
}

/** Keeps dashes glued to their word so a range like "Tue-Sun" never splits across lines. */
function glueDashes(text: string) {
  return text.replace(/([\\u2013\\u2014-])/g, '\\u2060$1\\u2060');
}

export default function PeelCornerCard({
  title = 'Baked at 6 a.m. Gone by noon.',
  body = 'Saffron buns, lemon tarts and the season\\u2019s last olive loaves, straight from the oven to the counter.',
  footnote = 'St. Ada\\u2019s Bakery \\u00b7 Open Tue\\u2013Sun',
  hiddenTitle = 'You found it',
  hiddenBody = 'Members get a free lemon tart with any loaf this week. Show this card at the counter.',
  hiddenCode = 'LEMON-TART',
  peelColor = '#e6b85c',
  corner = 'top-right',
  className,
}: PeelCornerCardProps) {
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const uid = useId();
  const titleId = \`\${uid}-title\`;
  const hiddenId = \`\${uid}-hidden\`;

  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const stickerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const suppressClickRef = useRef(false);

  const sizeRef = useRef({ cw: 0, ch: 0, sw: 0, sh: 0, dpr: 1, bleed: 0 });
  const motionRef = useRef({ d: 0, v: 0 });
  const targetRef = useRef({
    d: 0,
    mode: 'idle' as 'idle' | 'drag' | 'held',
    pointerX: 0,
    pointerY: 0,
    downAt: 0,
    downX: 0,
    downY: 0,
  });
  const cornerRef = useRef<PeelCorner>(corner);
  const colorRef = useRef(peelColor);
  const reducedRef = useRef(false);

  cornerRef.current = corner;
  colorRef.current = peelColor;
  reducedRef.current = reduced;

  const dMax = useCallback(() => {
    const { sw, sh } = sizeRef.current;
    return Math.max(24, Math.min(Math.min(sw, sh) * DMAX_RATIO, sh));
  }, []);

  /** All polygons for one frame, in sticker-local pixels. */
  const geometry = useCallback(
    (d: number) => {
      const { sw, sh } = sizeRef.current;
      const cv = CORNER_VECS[cornerRef.current];
      const originX = cv.ax < 0 ? sw : 0;
      const originY = cv.by < 0 ? sh : 0;
      const p = clamp(d / dMax(), 0, 1);
      const k = 0.34 + 0.17 * p;
      const toXY = (u: number, v: number): [number, number] => [
        originX + cv.ax * u + cv.bx * v,
        originY + cv.ay * u + cv.by * v,
      ];

      // Crease samples A -> B in corner space.
      const crease: [number, number][] = [];
      for (let i = 0; i < SAMPLES; i++) {
        const t = i / (SAMPLES - 1);
        const s = 1 - t;
        crease.push([
          s * s * d + 2 * s * t * k * d,
          2 * s * t * k * d + t * t * d,
        ]);
      }

      // Sticker front: the quadrant beyond the crease (huge far corners, clipped by the box).
      const front = [
        toXY(d, 0),
        toXY(BIG, 0),
        toXY(BIG, BIG),
        toXY(0, BIG),
        ...crease
          .slice()
          .reverse()
          .map(([u, v]) => toXY(u, v)),
      ];

      // Cut-away region = corner triangle under the crease, trimmed to the sticker outline.
      let cut: Vtx[] = [
        { u: 0, v: 0, c: false },
        ...crease.map(([u, v]) => ({ u, v, c: true })),
      ];
      cut = clipHalfPlane(cut, 1, 0, 0);
      cut = clipHalfPlane(cut, -1, 0, sw);
      cut = clipHalfPlane(cut, 0, 1, 0);
      cut = clipHalfPlane(cut, 0, -1, sh);

      // Flap: crease points stay put, outline points reflect across the fold (u+v=d).
      const flap = cut.map((q) => {
        const [x, y] = q.c ? toXY(q.u, q.v) : toXY(d - q.v, d - q.u);
        return { x, y, c: q.c };
      });
      const cutPx = cut.map((q) => {
        const [x, y] = toXY(q.u, q.v);
        return { x, y, c: q.c };
      });
      const creasePx = crease.map(([u, v]) => toXY(u, v));
      const apex = toXY(0.25 * d + 0.5 * k * d, 0.25 * d + 0.5 * k * d);
      const tip = toXY(d, d);

      return { cv, front, flap, cutPx, creasePx, apex, tip, p, d, k };
    },
    [dMax],
  );

  const drawFrame = useCallback(() => {
    const sticker = stickerRef.current;
    const canvas = canvasRef.current;
    const card = cardRef.current;
    if (!sticker || !canvas) return;
    const { cw, ch, dpr, bleed } = sizeRef.current;
    const g = geometry(motionRef.current.d);
    const { cv, p } = g;

    // 1. Sticker front: everything beyond the crease.
    sticker.style.clipPath = \`polygon(\${g.front.map(([x, y]) => \`\${x}px \${y}px\`).join(', ')})\`;

    // 2. Peel progress drives the hidden message and the print stress.
    if (card) {
      card.style.setProperty('--pc-p', p.toFixed(3));
      card.style.setProperty('--pc-m', clamp((p - 0.64) / 0.3, 0, 1).toFixed(3));
    }

    // 3. Canvas: flap, vinyl edges, crease highlight, layered shadows.
    const ctx = canvas.getContext('2d');
    if (!ctx || cw === 0 || ch === 0) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw + bleed * 2, ch);
    if (g.d < 1.2 || g.flap.length < 3) return;

    const ox = bleed + STICKER_INSET;
    const oy = STICKER_INSET;
    const pathOf = (pts: { x: number; y: number }[]) => {
      const path = new Path2D();
      pts.forEach((q, i) => (i === 0 ? path.moveTo(ox + q.x, oy + q.y) : path.lineTo(ox + q.x, oy + q.y)));
      path.closePath();
      return path;
    };
    // The flap keeps the sticker's rounded corners: arc every non-crease vertex.
    const roundedPathOf = (pts: { x: number; y: number; c: boolean }[], r: number) => {
      const path = new Path2D();
      const n = pts.length;
      const at = (i: number) => pts[(i + n) % n];
      const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
        x: ox + (a.x + b.x) / 2,
        y: oy + (a.y + b.y) / 2,
      });
      const m0 = mid(at(-1), at(0));
      path.moveTo(m0.x, m0.y);
      for (let i = 0; i < n; i++) {
        const prev = at(i - 1);
        const cur = at(i);
        const next = at(i + 1);
        const m = mid(cur, next);
        if (cur.c) {
          path.lineTo(ox + cur.x, oy + cur.y);
          path.lineTo(m.x, m.y);
        } else {
          const rr = Math.min(
            r,
            Math.hypot(next.x - cur.x, next.y - cur.y) / 2,
            Math.hypot(cur.x - prev.x, cur.y - prev.y) / 2,
          );
          path.arcTo(ox + cur.x, oy + cur.y, m.x, m.y, rr);
        }
      }
      path.closePath();
      return path;
    };
    const flap = roundedPathOf(g.flap, RADIUS);
    const cutPath = pathOf(g.cutPx);
    const creasePath = new Path2D();
    g.creasePx.forEach(([x, y], i) =>
      i === 0 ? creasePath.moveTo(ox + x, oy + y) : creasePath.lineTo(ox + x, oy + y),
    );

    const bisX = cv.ax + cv.bx; // +-1, points into the card
    const bisY = cv.ay + cv.by;
    const apexX = ox + g.apex[0];
    const apexY = oy + g.apex[1];
    const tipX = ox + g.tip[0];
    const tipY = oy + g.tip[1];

    // 3a. Shadows the lifted flap throws, three layers: contact, body, ambient.
    ctx.save();
    ctx.fillStyle = '#d8d4c6';
    const layers: [number, number, number, number][] = [
      // blur, offset, alpha, spread-with-peel
      [2, 1, 0.3, 0],
      [22, 11, 0.2, 8],
    ];
    for (const [blur, off, alpha, grow] of layers) {
      const o = (off + grow * p) * dpr;
      ctx.shadowColor = \`rgba(38, 26, 10, \${alpha})\`;
      ctx.shadowBlur = (blur + grow * p) * dpr;
      ctx.shadowOffsetX = bisX * o;
      ctx.shadowOffsetY = bisY * o;
      ctx.fill(flap);
    }
    ctx.restore();

    // 3b. The lifting vinyl edge also darkens the card face it uncovered.
    ctx.save();
    ctx.clip(cutPath);
    for (const [alpha, off, w] of [
      [0.16, 4, 10],
    ] as [number, number, number][]) {
      ctx.save();
      ctx.translate(-bisX * off, -bisY * off);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'rgb(0, 0, 0)';
      ctx.lineWidth = w;
      ctx.lineJoin = 'round';
      ctx.stroke(creasePath);
      ctx.restore();
    }
    ctx.restore();

    // 3c. The back of the vinyl: frosted clear adhesive tinted by the ink on the
    // other side. Dark where it rolls away at the crease, a bright cylinder
    // highlight just behind it, then softening toward the tip.
    const back = ctx.createLinearGradient(apexX, apexY, tipX, tipY);
    back.addColorStop(0, '#8a8272');
    back.addColorStop(0.07, '#cfc8b6');
    back.addColorStop(0.16, '#fbf8ef');
    back.addColorStop(0.4, '#f1ede1');
    back.addColorStop(0.8, '#e6e1d2');
    back.addColorStop(1, '#d3cdbb');
    ctx.fillStyle = back;
    ctx.fill(flap);

    ctx.save();
    ctx.clip(flap);
    // Faint ink show-through from the printed side.
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = colorRef.current;
    ctx.fillRect(0, 0, cw + bleed * 2, ch);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // Roll shading across the crease: edges of the flap fall away from the light.
    const [aX, aY] = g.creasePx[0];
    const [bX, bY] = g.creasePx[g.creasePx.length - 1];
    const roll = ctx.createLinearGradient(ox + aX, oy + aY, ox + bX, oy + bY);
    roll.addColorStop(0, 'rgba(60, 50, 26, 0.16)');
    roll.addColorStop(0.28, 'rgba(60, 50, 26, 0)');
    roll.addColorStop(0.72, 'rgba(60, 50, 26, 0)');
    roll.addColorStop(1, 'rgba(60, 50, 26, 0.16)');
    ctx.fillStyle = roll;
    ctx.fillRect(0, 0, cw + bleed * 2, ch);
    ctx.restore();

    // 3d. Hairline edge on the flap outline.
    ctx.save();
    ctx.clip(flap);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(70, 50, 16, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.stroke(flap);
    ctx.restore();

    // 3f. Curled-edge highlight: glossy vinyl catching light along the crease,
    // a soft halo then a crisp line that fades toward the ends.
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.globalAlpha = 1;
    const shine = ctx.createLinearGradient(ox + aX, oy + aY, ox + bX, oy + bY);
    shine.addColorStop(0, 'rgba(255, 255, 248, 0)');
    shine.addColorStop(0.2, 'rgba(255, 255, 248, 0.3)');
    shine.addColorStop(0.5, 'rgba(255, 255, 250, 0.55)');
    shine.addColorStop(0.8, 'rgba(255, 255, 248, 0.3)');
    shine.addColorStop(1, 'rgba(255, 255, 248, 0)');
    ctx.strokeStyle = shine;
    ctx.lineWidth = 1.2;
    ctx.stroke(creasePath);
    ctx.restore();
  }, [geometry]);

  // Sizes, canvas backing store, and the off-screen pause.
  useEffect(() => {
    const root = rootRef.current;
    const card = cardRef.current;
    const canvas = canvasRef.current;
    if (!root || !card || !canvas) return;
    const measure = () => {
      const rect = card.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const bleed = Math.round(rect.width * BLEED_RATIO);
      sizeRef.current = {
        cw: rect.width,
        ch: rect.height,
        sw: Math.max(1, rect.width - STICKER_INSET * 2),
        sh: Math.max(1, rect.height - STICKER_INSET * 2),
        dpr,
        bleed,
      };
      canvas.style.left = \`\${-bleed}px\`;
      canvas.style.width = \`\${rect.width + bleed * 2}px\`;
      canvas.style.height = \`\${rect.height}px\`;
      canvas.width = Math.round((rect.width + bleed * 2) * dpr);
      canvas.height = Math.round(rect.height * dpr);
      drawFrame();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(card);
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(root);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [drawFrame]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Motion loop: spring toward the target peel, with idle breathing on top.
  useEffect(() => {
    if (reduced) {
      // Static and finished: the corner is pre-peeled and the message is showing.
      motionRef.current = { d: dMax() * HOLD_RATIO, v: 0 };
      targetRef.current.mode = 'idle';
      drawFrame();
      return;
    }
    if (!inView) return;
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const t = targetRef.current;
      const max = dMax();
      const { sw, sh } = sizeRef.current;
      const base = Math.min(sw, sh);
      let goal: number;
      if (t.mode === 'drag') {
        const cv = CORNER_VECS[cornerRef.current];
        const originX = cv.ax < 0 ? sw : 0;
        const originY = cv.by < 0 ? sh : 0;
        // The flap tip sits at (d, d) in corner space, so it tracks the pointer at (u + v) / 2.
        const along = (t.pointerX - originX) * cv.ax + (t.pointerY - originY) * cv.by;
        goal = clamp(along * 0.54, base * IDLE_RATIO * 0.5, max);
      } else if (t.mode === 'held') {
        goal = max * HOLD_RATIO;
      } else {
        const breathe = Math.sin((now / 1000) * 0.9) * base * 0.02;
        goal = Math.max(30, max * IDLE_RATIO) + breathe + t.d;
      }
      const m = motionRef.current;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        m.v += (STIFFNESS * (goal - m.d) - DAMPING * m.v) * h;
        m.d += m.v * h;
      }
      if (t.mode === 'idle' && Math.abs(goal - m.d) < 0.5 && Math.abs(m.v) < 0.4) {
        m.d = goal; // settle instead of micro-jittering around the breath
        m.v = 0;
      }
      drawFrame();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [reduced, inView, dMax, drawFrame]);

  // Repaint once when theming props change while the loop is parked.
  useEffect(() => {
    if (reduced || !inView) drawFrame();
  }, [peelColor, corner, reduced, inView, drawFrame]);

  const cornerPoint = useCallback(() => {
    const { sw, sh } = sizeRef.current;
    const cv = CORNER_VECS[cornerRef.current];
    return { x: cv.ax < 0 ? sw : 0, y: cv.by < 0 ? sh : 0 };
  }, []);

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const t = targetRef.current;
    const sticker = stickerRef.current;
    if (!sticker) return;
    const r = sticker.getBoundingClientRect();
    if (t.mode === 'drag') {
      t.pointerX = e.clientX - r.left;
      t.pointerY = e.clientY - r.top;
      return;
    }
    if (e.pointerType !== 'mouse' || reducedRef.current) return;
    const { x, y } = cornerPoint();
    const dist = Math.hypot(e.clientX - r.left - x, e.clientY - r.top - y);
    const zone = Math.min(r.width, r.height) * 0.62;
    t.d = clamp((1 - dist / zone) * Math.min(r.width, r.height) * 0.1, 0, 40);
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (reducedRef.current) return;
    const sticker = stickerRef.current;
    if (!sticker) return;
    const r = sticker.getBoundingClientRect();
    const { x, y } = cornerPoint();
    const nearCorner =
      Math.hypot(e.clientX - r.left - x, e.clientY - r.top - y) < Math.min(r.width, r.height) * 0.62;
    const t = targetRef.current;
    t.downAt = performance.now();
    t.downX = e.clientX;
    t.downY = e.clientY;
    if (nearCorner) {
      e.currentTarget.setPointerCapture(e.pointerId);
      t.mode = 'drag';
      t.pointerX = e.clientX - r.left;
      t.pointerY = e.clientY - r.top;
    }
  };

  const onPointerEnd = (e: PointerEvent<HTMLElement>) => {
    const t = targetRef.current;
    if (t.mode !== 'drag') return;
    const moved = Math.hypot(e.clientX - t.downX, e.clientY - t.downY);
    if (e.type === 'pointercancel') {
      t.mode = 'idle';
      t.d = 0;
      suppressClickRef.current = true;
      return;
    }
    if (moved >= TAP_SLOP) {
      // A real drag: keep it peeled past the threshold, and let the
      // click that follows do nothing.
      t.mode = motionRef.current.d > dMax() * HOLD_TRIGGER ? 'held' : 'idle';
      suppressClickRef.current = true;
    } else {
      // A tap near the corner: drop to idle and let the click toggle.
      t.mode = 'idle';
    }
    t.d = 0;
  };

  const onCardClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (reducedRef.current) return;
    const t = targetRef.current;
    t.mode = motionRef.current.d > dMax() * TOGGLE_RATIO ? 'idle' : 'held';
    t.d = 0;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      targetRef.current.mode = 'idle';
      targetRef.current.d = 0;
      return;
    }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (reducedRef.current) return;
    const t = targetRef.current;
    t.mode = t.mode === 'held' ? 'idle' : 'held';
    t.d = 0;
  };

  const layoutClass = styles[LAYOUT_CLASS[corner]];
  const messageClass = styles[MESSAGE_ANCHOR[corner]];
  const cornerPos = CORNER_POS[corner];
  const stripLines = footnote
    .split(/\\s*[\\u00b7\\u2022|]\\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const rootStyle = {
    '--pc-peel': peelColor,
    '--pc-cx': cornerPos.x,
    '--pc-cy': cornerPos.y,
    '--pc-corner-x': \`\${cornerPos.x * 100}%\`,
    '--pc-corner-y': \`\${cornerPos.y * 100}%\`,
    '--pc-opp-x': \`\${(1 - cornerPos.x) * 100}%\`,
    '--pc-opp-y': \`\${(1 - cornerPos.y) * 100}%\`,
    '--pc-title-tall': \`\${titleSizeCqi(title, body, 'tall').toFixed(2)}cqi\`,
    '--pc-title-square': \`\${titleSizeCqi(title, body, 'square').toFixed(2)}cqi\`,
    '--pc-title-wide': \`\${titleSizeCqi(title, body, 'wide').toFixed(2)}cqi\`,
    '--pc-body-tall': \`\${bodySizeCqi(body, 'tall')}cqi\`,
    '--pc-body-wide': \`\${bodySizeCqi(body, 'wide')}cqi\`,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
    >
      <article
        ref={cardRef}
        className={[styles.card, layoutClass].join(' ')}
        tabIndex={0}
        aria-labelledby={titleId}
        aria-description={CARD_HELP}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerCancel={onPointerEnd}
        onPointerUp={onPointerEnd}
        onClick={onCardClick}
        onKeyDown={onKeyDown}
      >
        <span className={styles.well} aria-hidden="true" />
        <div className={[styles.message, messageClass].join(' ')} role="group" aria-labelledby={hiddenId}>
          <h4 id={hiddenId} className={styles.hiddenTitle}>
            {hiddenTitle}
          </h4>
          <p className={styles.hiddenBody}>{hiddenBody}</p>
          {hiddenCode && <span className={styles.hiddenCode}>{glueDashes(hiddenCode)}</span>}
        </div>

        <div ref={stickerRef} className={styles.sticker}>
          <span className={styles.vinylGloss} aria-hidden="true" />
          <div className={styles.print}>
            <div className={styles.copy}>
              <h3 id={titleId} className={styles.title}>
                {glueUnits(title)}
              </h3>
              {body && <p className={styles.body}>{body}</p>}
            </div>
            {stripLines.length > 0 && (
              <p className={styles.strip}>
                <span className={styles.stripLead}>{glueDashes(stripLines[0])}</span>
                {stripLines.slice(1).map((line, i) => (
                  <span key={i} className={styles.stripLine}>
                    {glueDashes(line)}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>

        <canvas ref={canvasRef} className={styles.peelCanvas} aria-hidden="true" />
      </article>
    </div>
  );
}
`;export{n as default};
