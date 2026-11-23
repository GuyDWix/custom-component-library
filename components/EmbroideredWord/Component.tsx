import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import styles from './Component.module.css';

export type StitchStyle = 'satin' | 'running';

export interface EmbroideredWordProps {
  text?: string;
  threadColor?: string;
  fabricColor?: string;
  stitchStyle?: StitchStyle;
  className?: string;
}

type Glyph = { line: number; L: number; R: number };
type Layout = { key: string; glyphs: Glyph[]; minX: number; maxX: number };
type Pt = [number, number];

const FONT = 100;
const LINE = 124;
const CAP = 70;
const MASK_TOP = -100;
const MASK_BOTTOM = 34;
const PAD = 44;
const EDGE = 14;
const SLANT = (24 * Math.PI) / 180;
const TAN = Math.tan(SLANT);
const COS = Math.cos(SLANT);
const NEEDLE_TILT = 32;
const EYE: Pt = [51 * Math.sin((NEEDLE_TILT * Math.PI) / 180), -51 * Math.cos((NEEDLE_TILT * Math.PI) / 180)];
const MAX_FONT_PX = 150;
const RUN_BUDGET_S = 2.6;

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const easeInOut = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && next.length > maxChars) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

/** Rect [L,R]x[T,B] clipped to the half-plane x + TAN*y <= c (the stitched side of the sweep). */
function sweptRect(L: number, R: number, T: number, B: number, c: number): Pt[] {
  const rect: Pt[] = [[L, T], [R, T], [R, B], [L, B]];
  const out: Pt[] = [];
  rect.forEach((a, i) => {
    const b = rect[(i + 1) % 4];
    const da = a[0] + TAN * a[1] - c;
    const db = b[0] + TAN * b[1] - c;
    if (da <= 0) out.push(a);
    if (da < 0 !== db < 0 && da !== db) {
      const t = da / (da - db);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  });
  return out;
}

const STITCH_HELP = 'Embroidered lettering. Hovering or tapping a letter sews it again.';

export default function EmbroideredWord({
  text = 'Made by hand',
  threadColor = '#a3302a',
  fabricColor = '#e7dcc7',
  stitchStyle = 'satin',
  className,
}: EmbroideredWordProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (k: string) => `ew${uid}${k}`;
  const satin = stitchStyle !== 'running';

  const [maxChars, setMaxChars] = useState(18);
  const [scale, setScale] = useState(1);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(false);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [wake, setWake] = useState(0);

  const lines = useMemo(() => wrap(text, maxChars), [text, maxChars]);
  const linesKey = lines.join('\n');
  const fresh = layout?.key === linesKey ? layout : null;
  const glyphs = fresh?.glyphs ?? null;

  const longest = Math.max(1, ...lines.map((l) => l.length));
  const minX = fresh ? fresh.minX - PAD : -(longest * 31) - PAD;
  const maxX = fresh ? fresh.maxX + PAD : longest * 31 + PAD;
  const vb = { x: minX, y: MASK_TOP - PAD, w: maxX - minX, h: (lines.length - 1) * LINE + MASK_BOTTOM - MASK_TOP + PAD * 2 };

  const grain = clamp(0.95 / scale, 1, 1.8);
  const pitch = satin ? 3.6 * grain : 11.5 * grain;
  const dash = `${7 * grain} ${4.5 * grain}`;

  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lineRefs = useRef<(SVGTextElement | null)[]>([]);
  const polyRefs = useRef<(SVGPolygonElement | null)[]>([]);
  const needleRef = useRef<SVGGElement>(null);
  const threadRef = useRef<SVGPathElement>(null);
  const startTailRef = useRef<SVGGElement>(null);
  const endTailRef = useRef<SVGGElement>(null);

  const prog = useRef<number[]>([]);
  const queue = useRef<number[]>([]);
  const started = useRef(false);
  const pitchRef = useRef(pitch);
  pitchRef.current = pitch;
  const nd = useRef({ x: 0, y: 0, vx: 0, vy: 0, o: 0, ax: 0, ay: 0, sag: 0, sagV: 0, t: 0 });

  const order = useMemo(() => (glyphs ? glyphs.map((_, i) => i) : []), [glyphs]);

  const sweep = useCallback((g: Glyph) => {
    const hx = pitchRef.current / COS;
    const base = g.line * LINE;
    const T = base + MASK_TOP;
    const B = base + MASK_BOTTOM;
    return { T, B, base, hx, c0: Math.floor((g.L + TAN * T) / hx) * hx, c1: Math.ceil((g.R + TAN * B) / hx) * hx };
  }, []);

  const edgeAt = useCallback(
    (i: number, y: number) => {
      if (!glyphs) return 0;
      const g = glyphs[i];
      const s = sweep(g);
      const c = s.c0 + easeInOut(clamp(prog.current[i] ?? 0, 0, 1)) * (s.c1 - s.c0);
      return clamp(c - TAN * y, g.L, g.R);
    },
    [glyphs, sweep],
  );

  const paint = useCallback(() => {
    if (!glyphs) return;
    glyphs.forEach((g, i) => {
      const poly = polyRefs.current[i];
      if (!poly) return;
      const p = clamp(prog.current[i] ?? 1, 0, 1);
      const s = sweep(g);
      const steps = Math.max(1, Math.round((s.c1 - s.c0) / s.hx));
      const c = p >= 1 ? s.c1 + 1 : s.c0 + Math.floor(easeInOut(p) * steps) * s.hx;
      const pts = p <= 0 ? [] : sweptRect(g.L, g.R, s.T, s.B, c);
      poly.setAttribute('points', pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '));
    });

    const first = order[0];
    const last = order[order.length - 1];
    if (startTailRef.current) startTailRef.current.style.opacity = first !== undefined && prog.current[first] > 0 ? '1' : '0';
    if (endTailRef.current) {
      const done = last !== undefined && queue.current.length === 0 && prog.current[last] >= 1;
      endTailRef.current.style.opacity = done ? '1' : '0';
    }

    const n = nd.current;
    const needle = needleRef.current;
    const thread = threadRef.current;
    if (!needle || !thread) return;
    needle.style.opacity = n.o.toFixed(3);
    thread.style.opacity = n.o.toFixed(3);
    needle.setAttribute('transform', `translate(${n.x.toFixed(2)} ${n.y.toFixed(2)})`);
    const ex = n.x + EYE[0];
    const ey = n.y + EYE[1];
    const sag = 12 + n.sag * 18;
    const mx = (n.ax + ex) / 2;
    const my = (n.ay + ey) / 2 + sag;
    thread.setAttribute(
      'd',
      `M${n.ax.toFixed(2)} ${n.ay.toFixed(2)} Q${mx.toFixed(2)} ${my.toFixed(2)} ${ex.toFixed(2)} ${ey.toFixed(2)} c5 -4 9 4 11 15`,
    );
  }, [glyphs, order, sweep]);

  useIsoLayoutEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    io.observe(root);
    const ro = new ResizeObserver(() => {
      setMaxChars(clamp(Math.floor((root.clientWidth - 48) / 34), 6, 18));
      const vbw = svg.viewBox.baseVal?.width || 1;
      setScale(Math.round((svg.clientWidth / vbw) * 20) / 20 || 1);
    });
    ro.observe(root);
    ro.observe(svg);
    return () => {
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  useIsoLayoutEffect(() => {
    let live = true;
    const measure = () => {
      if (!live) return;
      const out: Glyph[] = [];
      let lo = Infinity;
      let hi = -Infinity;
      lines.forEach((str, li) => {
        const el = lineRefs.current[li];
        if (!el || !str) return;
        const row: { x0: number; x1: number }[] = [];
        let off = 0;
        for (const ch of Array.from(str)) {
          try {
            const a = el.getStartPositionOfChar(off).x;
            const b = el.getEndPositionOfChar(off).x;
            if (ch.trim()) row.push({ x0: Math.min(a, b), x1: Math.max(a, b) });
          } catch {
            /* unmeasurable code unit */
          }
          off += ch.length;
        }
        row.sort((p, q) => p.x0 - q.x0);
        row.forEach((g, k) => {
          const prev = row[k - 1];
          const next = row[k + 1];
          const L = prev ? (prev.x1 + g.x0) / 2 : g.x0 - EDGE;
          const R = next ? (g.x1 + next.x0) / 2 : g.x1 + EDGE;
          out.push({ line: li, L, R });
        });
        const bb = el.getBBox();
        lo = Math.min(lo, bb.x - EDGE);
        hi = Math.max(hi, bb.x + bb.width + EDGE);
      });
      if (!Number.isFinite(lo)) {
        lo = -40;
        hi = 40;
      }
      setLayout({ key: linesKey, glyphs: out, minX: lo, maxX: hi });
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => undefined);
    return () => {
      live = false;
    };
  }, [linesKey]);

  useIsoLayoutEffect(() => {
    if (!glyphs) return;
    prog.current = glyphs.map(() => (reduced ? 1 : 0));
    queue.current = reduced ? [] : [...order];
    started.current = false;
    Object.assign(nd.current, { o: 0, sag: 0, sagV: 0, vx: 0, vy: 0 });
    paint();
  }, [glyphs, order, reduced, stitchStyle, paint]);

  useEffect(() => {
    if (!glyphs || reduced || !inView) return;
    const n = nd.current;
    const letterDur = clamp(RUN_BUDGET_S / Math.max(1, order.length), 0.16, 0.42);
    let last = performance.now();
    const delayUntil = started.current ? 0 : last + 260;
    if (!started.current && order.length) {
      const g = glyphs[order[0]];
      Object.assign(n, { x: g.L - 70, y: g.line * LINE - CAP - 70, ax: g.L, ay: g.line * LINE - CAP * 0.4 });
    }
    started.current = true;
    let raf = 0;

    const spring = (k: number, h: number, pos: number, vel: number, goal: number, zeta: number) => {
      const v = vel + (k * (goal - pos) - 2 * zeta * Math.sqrt(k) * vel) * h;
      return [pos + v * h, v];
    };

    const tick = (now: number) => {
      const dt = Math.min(1, (now - last) / 1000);
      last = now;
      const q = queue.current;
      let gx = n.x;
      let gy = n.y;
      let show = 0;
      if (now >= delayUntil && q.length) {
        const i = q[0];
        const g = glyphs[i];
        n.t += dt;
        prog.current[i] = Math.min(1, prog.current[i] + dt / letterDur);
        const base = g.line * LINE;
        const yT = base - CAP - 4;
        const yB = base + 4;
        gy = (yT + yB) / 2 + ((yB - yT) / 2) * Math.sin(n.t * Math.PI * 2 * 4.5);
        gx = edgeAt(i, gy);
        n.ax = edgeAt(i, base - CAP * 0.4);
        n.ay = base - CAP * 0.4;
        show = 1;
        if (prog.current[i] >= 1) {
          q.shift();
          n.sagV -= 11;
        }
      } else if (now >= delayUntil) {
        gx = n.x + 60;
        gy = n.y - 80;
        n.ax = n.x;
        n.ay = n.y;
      } else {
        show = n.o;
      }

      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let s = 0; s < steps; s++) {
        [n.x, n.vx] = spring(900, h, n.x, n.vx, gx, 0.85);
        [n.y, n.vy] = spring(900, h, n.y, n.vy, gy, 0.85);
        [n.sag, n.sagV] = spring(160, h, n.sag, n.sagV, 0, 0.28);
      }
      n.o += (show - n.o) * Math.min(1, dt * (show ? 14 : 6));

      paint();
      const settled = !q.length && n.o < 0.01 && Math.abs(n.sagV) < 0.01;
      if (settled) {
        n.o = 0;
        paint();
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [glyphs, order, reduced, inView, wake, stitchStyle, edgeAt, paint]);

  const restitch = (i: number) => {
    if (reduced || !glyphs) return;
    const q = queue.current;
    if (q[0] === i) return;
    q.forEach((j) => {
      prog.current[j] = 1;
    });
    prog.current[i] = 0;
    queue.current = [i];
    setWake((w) => w + 1);
  };

  const rootStyle = { '--ew-thread': threadColor, '--ew-fabric': fabricColor } as CSSProperties;
  const maxWidth = `min(100%, ${Math.round((vb.w * MAX_FONT_PX) / FONT)}px)`;
  const firstGlyph = glyphs && order.length ? glyphs[order[0]] : null;
  const lastGlyph = glyphs && order.length ? glyphs[order[order.length - 1]] : null;

  const textLayer = (cls: string, extra?: Record<string, string | number>, withRef = false) =>
    lines.map((line, li) => (
      <text
        key={li}
        ref={
          withRef
            ? (el) => {
                lineRefs.current[li] = el;
              }
            : undefined
        }
        className={cls}
        x={0}
        y={li * LINE}
        textAnchor="middle"
        fontSize={FONT}
        {...extra}
      >
        {line}
      </text>
    ));

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <span className={styles.weave} aria-hidden="true" />
      <span className={styles.slub} aria-hidden="true" />
      <span className={styles.hem} aria-hidden="true" />

      <svg
        ref={svgRef}
        className={styles.art}
        style={{ maxInlineSize: maxWidth }}
        viewBox={`${vb.x.toFixed(2)} ${vb.y.toFixed(2)} ${vb.w.toFixed(2)} ${vb.h.toFixed(2)}`}
        role="img"
        aria-label={text}
        aria-description={STITCH_HELP}
      >
        <defs>
          <linearGradient id={id('t')} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" className={styles.stopDeep} />
            <stop offset="0.42" className={styles.stopLight} />
            <stop offset="0.62" className={styles.stopMid} />
            <stop offset="1" className={styles.stopDeep} />
          </linearGradient>
          <pattern
            id={id('s')}
            patternUnits="userSpaceOnUse"
            width={pitch}
            height={pitch}
            patternTransform={`rotate(${(SLANT * 180) / Math.PI})`}
          >
            <rect width={pitch} height={pitch} fill={`url(#${id('t')})`} />
            <rect x={pitch - 0.35 * grain} width={0.35 * grain} height={pitch} className={styles.gap} />
          </pattern>
          <linearGradient
            id={id('h')}
            gradientUnits="userSpaceOnUse"
            x1={vb.x}
            y1={MASK_TOP}
            x2={vb.x + 170}
            y2={MASK_TOP + 120}
            spreadMethod="reflect"
          >
            <stop offset="0" className={styles.sheenOff} />
            <stop offset="0.55" className={styles.sheenOff} />
            <stop offset="1" className={styles.sheenOn} />
          </linearGradient>
          <linearGradient id={id('n')} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#7d8186" />
            <stop offset="0.38" stopColor="#fbfbfa" />
            <stop offset="0.62" stopColor="#c4c7cb" />
            <stop offset="1" stopColor="#62666b" />
          </linearGradient>
          <filter id={id('r')} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.8" result="b" />
            <feSpecularLighting in="b" surfaceScale="3.2" specularConstant="0.75" specularExponent="16" lightingColor="#fff4e8" result="s">
              <feDistantLight azimuth="225" elevation="48" />
            </feSpecularLighting>
            <feComposite in="s" in2="SourceAlpha" operator="in" result="sl" />
            <feComposite in="SourceGraphic" in2="sl" operator="arithmetic" k2="1" k3="0.5" />
          </filter>
          <filter id={id('b')} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          <mask id={id('m')} maskUnits="userSpaceOnUse" x={vb.x} y={vb.y} width={vb.w} height={vb.h}>
            {glyphs ? (
              glyphs.map((_, i) => (
                <polygon
                  key={i}
                  ref={(el) => {
                    polyRefs.current[i] = el;
                  }}
                  fill="#fff"
                />
              ))
            ) : (
              <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="#fff" />
            )}
          </mask>
        </defs>

        <g mask={`url(#${id('m')})`}>
          {satin ? (
            <>
              <g transform="translate(1.6 3.2)" filter={`url(#${id('b')})`}>
                {textLayer(styles.shadow)}
              </g>
              {textLayer(styles.base, undefined, true)}
              <g filter={`url(#${id('r')})`}>{textLayer(styles.satin, { fill: `url(#${id('s')})` })}</g>
              {textLayer(styles.sheen, { fill: `url(#${id('h')})` })}
              {textLayer(styles.edge, { strokeDasharray: `${2.4 * grain} ${0.9 * grain}` })}
            </>
          ) : (
            <>
              <g transform="translate(1.4 2.6)" filter={`url(#${id('b')})`}>
                {textLayer(styles.runShadow, { strokeDasharray: dash, strokeWidth: 3.6 * grain })}
              </g>
              {textLayer(styles.runThread, { strokeDasharray: dash, strokeWidth: 3.4 * grain }, true)}
              {textLayer(styles.runShine, { strokeDasharray: dash, strokeWidth: 1.1 * grain })}
            </>
          )}
        </g>

        {firstGlyph && (
          <g
            ref={startTailRef}
            className={styles.tail}
            transform={`translate(${firstGlyph.L + EDGE + 4} ${firstGlyph.line * LINE - CAP * 0.3}) scale(-1 1)`}
          >
            <Tail />
          </g>
        )}
        {lastGlyph && (
          <g
            ref={endTailRef}
            className={styles.tail}
            transform={`translate(${lastGlyph.R - EDGE - 4} ${lastGlyph.line * LINE - CAP * 0.3})`}
          >
            <Tail />
          </g>
        )}

        {glyphs && !reduced && (
          <>
            <path ref={threadRef} className={styles.thread} />
            <g ref={needleRef} className={styles.needle}>
              <g transform={`rotate(${NEEDLE_TILT})`}>
                <path className={styles.needleShadow} d={NEEDLE_PATH} transform="translate(3 4)" />
                <path d={NEEDLE_PATH} fill={`url(#${id('n')})`} className={styles.needleBody} />
                <ellipse cx="0" cy="-51" rx="0.55" ry="3.4" className={styles.needleEye} />
              </g>
            </g>
            {glyphs.map((g, i) => (
                <rect
                  key={i}
                  className={styles.hit}
                  x={g.L}
                  y={g.line * LINE + MASK_TOP}
                  width={g.R - g.L}
                  height={MASK_BOTTOM - MASK_TOP}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && restitch(i)}
                  onPointerDown={(e) => e.pointerType !== 'mouse' && restitch(i)}
                />
            ))}
          </>
        )}
      </svg>
    </div>
  );
}

const NEEDLE_PATH = 'M0 0 L1.25 -10 L1.5 -52 Q1.5 -58 0 -58 Q-1.5 -58 -1.5 -52 L-1.25 -10 Z';

function Tail() {
  return (
    <>
      <path className={styles.tailThread} d="M0 0 C7 4 13 12 20 25" />
      <path className={styles.tailShine} d="M1 -0.5 C7.5 3.5 13 11 19.5 23" />
      <path className={styles.fiber} d="M20 25 c1.5 3 2.5 6.5 2.2 10" />
      <path className={styles.fiber} d="M20 25 c3 2 6 3 9.5 2.6" />
      <path className={styles.fiber} d="M20 25 c-0.4 3.2 -1.6 6 -4 8.2" />
    </>
  );
}
