const e=`import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export type SundialLightMode = 'pointer' | 'auto';

export interface SundialShadowHeadlineProps {
  text?: string;
  textColor?: string;
  shadowColor?: string;
  skyColor?: string;
  groundColor?: string;
  sunColor?: string;
  tickColor?: string;
  lightMode?: SundialLightMode;
  showSun?: boolean;
  className?: string;
}

type Sun = { x: number; y: number; vx: number; vy: number };
type Vec = { x: number; y: number; vx: number; vy: number };
type Override = { x: number; y: number; until: number };
type Sprites = {
  shadow: HTMLCanvasElement;
  text: HTMLCanvasElement;
  w: number;
  h: number;
  x0: number;
  y0: number;
};

const SUN_STIFF = 88;
const SUN_DAMP = 13.5;
const SHADOW_STIFF = 170;
const SHADOW_DAMP = 12;
const ARC_SECONDS = 46;
const POINTER_HOLD_MS = 4200;
const KEY_HOLD_MS = 2600;
const KEY_STEP = 0.06;
const DPR_CAP = 2;

const DEFAULT_TEXT = 'High Noon';
const DEFAULT_TEXT_COLOR = '#c8491f';
const DEFAULT_SHADOW_COLOR = '#5d2e42';
const FALLBACK_FONT = "'Archivo Black', 'Arial Black', 'Helvetica Neue', system-ui, sans-serif";

const HELP =
  'Move the pointer to swing the light. Arrow keys also steer it, and Escape returns it to rest.';
const ARIA_PAUSE = 'Pause the moving light';
const ARIA_PLAY = 'Play the moving light';

const SUN_MIN_X = 0.07;
const SUN_MAX_X = 0.93;
const SUN_MIN_Y = 0.09;
const SUN_MAX_Y = 0.5;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const setCtxFont = (ctx: CanvasRenderingContext2D, fs: number, family: string) => {
  ctx.font = \`900 \${fs}px \${family}\`;
  const tunable = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  tunable.letterSpacing = \`\${(-0.032 * fs).toFixed(2)}px\`;
};

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] => {
  const words = text.split(/\\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    if (ctx.measureText(word).width > maxW) {
      if (cur) {
        lines.push(cur);
        cur = '';
      }
      let chunk = '';
      for (const ch of Array.from(word)) {
        if (chunk && ctx.measureText(chunk + ch).width > maxW) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      cur = chunk;
      continue;
    }
    const test = cur ? \`\${cur} \${word}\` : word;
    if (!cur || ctx.measureText(test).width <= maxW) {
      cur = test;
    } else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
};

const balanceTwo = (ctx: CanvasRenderingContext2D, words: string[], maxW: number): string[] => {
  let best: string[] | null = null;
  let bestMax = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const m = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
    if (m <= maxW && m < bestMax) {
      bestMax = m;
      best = [a, b];
    }
  }
  return best ?? [words.join(' ')];
};

export default function SundialShadowHeadline({
  text = DEFAULT_TEXT,
  textColor = DEFAULT_TEXT_COLOR,
  shadowColor = DEFAULT_SHADOW_COLOR,
  skyColor,
  groundColor,
  sunColor,
  tickColor,
  lightMode = 'pointer',
  showSun = true,
  className,
}: SundialShadowHeadlineProps) {
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [paused, setPaused] = useState(false);
  const uid = useId();
  const titleId = \`\${uid}-title\`;

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sunPosRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const spriteRef = useRef<Sprites | null>(null);
  const sunRef = useRef<Sun>({ x: 0.84, y: 0.4, vx: 0, vy: 0 });
  const shadowRef = useRef<Vec>({ x: 0, y: 0, vx: 0, vy: 0 });
  const overrideRef = useRef<Override>({ x: 0.6, y: 0.24, until: 0 });
  const nudgeRef = useRef({ x: 0, y: 0 });
  const arcRef = useRef(3.2);
  const idleStartRef = useRef(0);
  const pausedRef = useRef(false);
  const reducedRef = useRef(false);
  const propsRef = useRef({ text, textColor, shadowColor, lightMode, showSun });

  propsRef.current = { text, textColor, shadowColor, lightMode, showSun };
  pausedRef.current = paused;
  reducedRef.current = reduced;

  const drawFrame = useCallback(() => {
    const ctx = ctxRef.current;
    const spr = spriteRef.current;
    const { w, h } = sizeRef.current;
    if (!ctx || !spr || w < 2) return;

    const sun = sunRef.current;
    const sx = sun.x * w;
    const sy = sun.y * h;
    sunPosRef.current?.style.setProperty('transform', \`translate3d(\${sx.toFixed(1)}px, \${sy.toFixed(1)}px, 0)\`);

    ctx.clearRect(0, 0, w, h);
    const sv = shadowRef.current;
    const len = Math.hypot(sv.x, sv.y);
    if (len > 0.75 && spr.w > 0) {
      const dx = sv.x / len;
      const dy = sv.y / len;
      const step = Math.max(2, len / 240);
      const n = Math.min(500, Math.ceil(len / step));
      for (let i = 1; i <= n; i++) {
        const d = i * step;
        ctx.drawImage(spr.shadow, spr.x0 + dx * d, spr.y0 + dy * d, spr.w, spr.h);
      }
      ctx.drawImage(spr.shadow, spr.x0 + sv.x, spr.y0 + sv.y, spr.w, spr.h);
    }
    ctx.drawImage(spr.text, spr.x0, spr.y0, spr.w, spr.h);
  }, []);

  const shadowTarget = useCallback(
    (w: number, h: number, sx: number, sy: number) => {
      const spr = spriteRef.current;
      if (!spr) return { x: 0, y: 0 };
      const cx = w / 2;
      const cy = spr.y0 + spr.h / 2;
      let vx = cx - sx;
      let vy = cy - sy;
      const d = Math.hypot(vx, vy);
      if (d < 1) {
        vx = 0;
        vy = 1;
      } else {
        vx /= d;
        vy /= d;
      }
      const elev = clamp((cy - sy) / Math.max(1, cy - h * 0.08), 0.12, 1);
      const targetLen = h * (0.13 + 0.5 * (1 - elev));
      let ang = Math.atan2(vy, vx);
      const root = rootRef.current;
      if (root) {
        const rect = root.getBoundingClientRect();
        const vh = window.innerHeight || rect.height * 2;
        const p = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
        ang += (p - 0.5) * 0.42;
      }
      return { x: Math.cos(ang) * targetLen, y: Math.sin(ang) * targetLen };
    },
    []
  );

  const drawStatic = useCallback(() => {
    const spr = spriteRef.current;
    const { w, h } = sizeRef.current;
    if (!spr || w < 2) return;
    const sun = sunRef.current;
    sun.vx = 0;
    sun.vy = 0;
    const t = shadowTarget(w, h, sun.x * w, sun.y * h);
    const sv = shadowRef.current;
    sv.x = t.x;
    sv.y = t.y;
    sv.vx = 0;
    sv.vy = 0;
    drawFrame();
  }, [drawFrame, shadowTarget]);

  const rebuild = useCallback(() => {
    const root = rootRef.current;
    const { w, h, dpr } = sizeRef.current;
    if (!root || w < 2 || h < 2) return;
    const p = propsRef.current;
    const family =
      getComputedStyle(root).getPropertyValue('--sd-font').trim() || FALLBACK_FONT;
    const scratch = document.createElement('canvas');
    const mctx = scratch.getContext('2d');
    if (!mctx) return;

    const maxW = w * 0.86;
    const lh = 1.07;
    const maxLines = 4;
    const maxH = h * 0.42;
    let lo = 14;
    let hi = Math.max(15, Math.min(h * 0.3, w * 0.34));
    let fs = 14;
    let lines: string[] = [];
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      setCtxFont(mctx, mid, family);
      const cand = wrapText(mctx, p.text, maxW);
      const fits =
        cand.length > 0 &&
        cand.length <= maxLines &&
        cand.every((l) => mctx.measureText(l).width <= maxW) &&
        cand.length * mid * lh <= maxH;
      if (fits) {
        fs = mid;
        lines = cand;
        lo = mid;
      } else {
        hi = mid;
      }
      if (hi - lo < 0.5) break;
    }
    if (lines.length === 0) {
      setCtxFont(mctx, fs, family);
      lines = wrapText(mctx, p.text, maxW).slice(0, maxLines);
    }
    if (lines.length === 2) {
      setCtxFont(mctx, fs, family);
      const words = lines.join(' ').split(' ');
      const balanced = balanceTwo(mctx, words, maxW);
      if (balanced.length === 2) lines = balanced;
    }

    setCtxFont(mctx, fs, family);
    const widths = lines.map((l) => mctx.measureText(l).width);
    const textW = lines.length ? Math.max(...widths) : 0;
    const spriteW = Math.max(1, Math.ceil(textW + fs * 0.14));
    const spriteH = Math.max(1, Math.ceil(lines.length * fs * lh + fs * 0.34));

    const make = (color: string) => {
      const cvs = document.createElement('canvas');
      cvs.width = Math.max(1, Math.ceil(spriteW * dpr));
      cvs.height = Math.max(1, Math.ceil(spriteH * dpr));
      const c = cvs.getContext('2d');
      if (c) {
        c.scale(dpr, dpr);
        setCtxFont(c, fs, family);
        c.textAlign = 'center';
        c.textBaseline = 'alphabetic';
        c.fillStyle = color;
        lines.forEach((line, i) => {
          c.fillText(line, spriteW / 2, fs * 0.82 + i * fs * lh);
        });
      }
      return cvs;
    };

    const horizonY = h * 0.68;
    const lastBaseline = fs * 0.82 + (lines.length - 1) * fs * lh;
    const y0 = horizonY - h * 0.05 - lastBaseline;
    const x0 = (w - spriteW) / 2;

    spriteRef.current = { shadow: make(p.shadowColor), text: make(p.textColor), w: spriteW, h: spriteH, x0, y0 };
    if (reducedRef.current) drawStatic();
    else drawFrame();
  }, [drawFrame, drawStatic]);

  const measure = useCallback(() => {
    const root = rootRef.current;
    const cvs = canvasRef.current;
    if (!root || !cvs) return;
    const w = root.clientWidth;
    const h = root.clientHeight;
    if (w < 2 || h < 2) return;
    const dpr = clamp(window.devicePixelRatio || 1, 1, DPR_CAP);
    cvs.width = Math.round(w * dpr);
    cvs.height = Math.round(h * dpr);
    sizeRef.current = { w, h, dpr };
    const ctx = cvs.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxRef.current = ctx;
    }
    rebuild();
  }, [rebuild]);

  const step = useCallback(
    (dt: number, now: number) => {
      const { w, h } = sizeRef.current;
      const p = propsRef.current;
      const sun = sunRef.current;
      let tx: number;
      let ty: number;

      if (p.lightMode === 'auto') {
        if (!pausedRef.current) arcRef.current += dt;
        const pt = (arcRef.current % ARC_SECONDS) / ARC_SECONDS;
        tx = 0.16 + 0.68 * pt;
        ty = 0.55 - 0.4 * Math.sin(pt * Math.PI);
        const nudge = nudgeRef.current;
        tx += nudge.x;
        ty += nudge.y;
        const decay = Math.pow(0.22, dt);
        nudge.x *= decay;
        nudge.y *= decay;
      } else if (overrideRef.current.until > now) {
        tx = overrideRef.current.x;
        ty = overrideRef.current.y;
      } else {
        const e = Math.min(1, (now - idleStartRef.current) / 2600);
        const s = now / 1000;
        tx = 0.6 + Math.sin(s * 0.22) * 0.13 * e;
        ty = 0.24 + Math.sin(s * 0.15 + 1.2) * 0.06 * e;
        if (pausedRef.current) {
          tx = sun.x;
          ty = sun.y;
        }
      }
      tx = clamp(tx, SUN_MIN_X, SUN_MAX_X);
      ty = clamp(ty, SUN_MIN_Y, SUN_MAX_Y);

      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const hh = dt / steps;
      for (let i = 0; i < steps; i++) {
        sun.vx += (SUN_STIFF * (tx - sun.x) - SUN_DAMP * sun.vx) * hh;
        sun.vy += (SUN_STIFF * (ty - sun.y) - SUN_DAMP * sun.vy) * hh;
        sun.x += sun.vx * hh;
        sun.y += sun.vy * hh;
      }

      const spr = spriteRef.current;
      if (spr && w >= 2) {
        const t = shadowTarget(w, h, sun.x * w, sun.y * h);
        const sv = shadowRef.current;
        for (let i = 0; i < steps; i++) {
          sv.vx += (SHADOW_STIFF * (t.x - sv.x) - SHADOW_DAMP * sv.vx) * hh;
          sv.vy += (SHADOW_STIFF * (t.y - sv.y) - SHADOW_DAMP * sv.vy) * hh;
          sv.x += sv.vx * hh;
          sv.y += sv.vy * hh;
        }
      }
    },
    [shadowTarget]
  );

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
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let disposed = false;
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    measure();
    const fonts = document.fonts;
    if (fonts?.ready) {
      fonts.ready.then(() => {
        if (!disposed) rebuild();
      }).catch(() => {});
    }
    return () => {
      disposed = true;
      ro.disconnect();
    };
  }, [measure, rebuild]);

  useEffect(() => {
    rebuild();
  }, [text, textColor, shadowColor, rebuild]);

  useEffect(() => {
    if (!reduced) return;
    const sun = sunRef.current;
    sun.x = 0.74;
    sun.y = 0.185;
    drawStatic();
  }, [reduced, drawStatic]);

  useEffect(() => {
    if (reduced || !inView) return;
    idleStartRef.current = performance.now();
    let id = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      step(dt, now);
      drawFrame();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [reduced, inView, step, drawFrame]);

  const aim = (e: PointerEvent<HTMLDivElement>) => {
    if (propsRef.current.lightMode === 'auto') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    const ny = clamp((e.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
    overrideRef.current = { x: nx, y: ny, until: performance.now() + POINTER_HOLD_MS };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (reducedRef.current || e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    aim(e);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reducedRef.current) return;
    if (e.pointerType === 'mouse' || e.currentTarget.hasPointerCapture(e.pointerId)) aim(e);
  };

  const onPointerLeave = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    overrideRef.current = { ...overrideRef.current, until: 0 };
    idleStartRef.current = performance.now();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, -KEY_STEP * 0.7],
      ArrowDown: [0, KEY_STEP * 0.7],
    };
    if (e.key === 'Escape' || e.key === 'Home') {
      e.preventDefault();
      overrideRef.current = { ...overrideRef.current, until: 0 };
      nudgeRef.current = { x: 0, y: 0 };
      if (reducedRef.current) {
        const sun = sunRef.current;
        sun.x = 0.74;
        sun.y = 0.185;
        drawStatic();
      }
      return;
    }
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    const now = performance.now();
    if (propsRef.current.lightMode === 'auto') {
      const nudge = nudgeRef.current;
      nudge.x = clamp(nudge.x + move[0], -0.3, 0.3);
      nudge.y = clamp(nudge.y + move[1], -0.2, 0.2);
      if (reducedRef.current) drawStatic();
      return;
    }
    const fresh = overrideRef.current.until > now;
    const bx = fresh ? overrideRef.current.x : sunRef.current.x;
    const by = fresh ? overrideRef.current.y : sunRef.current.y;
    overrideRef.current = {
      x: clamp(bx + move[0], SUN_MIN_X, SUN_MAX_X),
      y: clamp(by + move[1], SUN_MIN_Y, SUN_MAX_Y),
      until: now + KEY_HOLD_MS,
    };
    if (reducedRef.current) {
      const sun = sunRef.current;
      sun.x = overrideRef.current.x;
      sun.y = overrideRef.current.y;
      drawStatic();
    }
  };

  const themeVars = {
    '--sd-ink': shadowColor,
    ...(skyColor && { '--sd-sky': skyColor }),
    ...(groundColor && { '--sd-ground': groundColor }),
    ...(sunColor && { '--sd-sun': sunColor }),
    ...(tickColor && { '--sd-tick': tickColor }),
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      style={themeVars}
      className={[styles.root, className].filter(Boolean).join(' ')}
      tabIndex={0}
      aria-labelledby={titleId}
      aria-description={HELP}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div ref={sunPosRef} className={styles.sun} aria-hidden="true">
        <span className={styles.sunGlow} />
        {showSun && (
          <>
            <span className={styles.sunRing} />
            <span className={styles.sunDisc} />
          </>
        )}
      </div>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <span className={styles.ticks} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />
      <h2 id={titleId} className={styles.srOnly}>
        {text}
      </h2>
      {!reduced && (
        <button
          type="button"
          className={styles.pauseButton}
          aria-label={paused ? ARIA_PLAY : ARIA_PAUSE}
          aria-pressed={paused}
          onClick={() => setPaused((v) => !v)}
        >
          <svg className={styles.pauseIcon} viewBox="0 0 12 12" aria-hidden="true" focusable="false">
            {paused ? (
              <path d="M2.5 1.2 L10.6 6 2.5 10.8 Z" />
            ) : (
              <>
                <rect x="1.6" y="1.2" width="2.9" height="9.6" rx="0.9" />
                <rect x="7.5" y="1.2" width="2.9" height="9.6" rx="0.9" />
              </>
            )}
          </svg>
        </button>
      )}
    </div>
  );
}
`;export{e as default};
