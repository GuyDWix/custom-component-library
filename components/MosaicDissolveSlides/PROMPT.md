Create a custom element called "Mosaic Dissolve Slides". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: images (image, caption), tile size, auto-advance on/off, speed (seconds per slide). Add other settings if they help.

```tsx
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import styles from './Component.module.css';

export interface MosaicSlide {
  src: string;
  alt: string;
  caption?: string;
}

export interface MosaicDissolveSlidesProps {
  slides?: MosaicSlide[];
  tileSize?: number;
  autoAdvance?: boolean;
  advanceSeconds?: number;
  className?: string;
}

export const defaultSlides: MosaicSlide[] = [
  {
    src: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'White concrete facade with deep vertical fins',
    caption: 'Lumen House — façade study, south light',
  },
  {
    src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'Open living hall with warm plaster walls and a timber stair',
    caption: 'Lumen House — living hall',
  },
  {
    src: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'Soft daylight falling across a white building core',
    caption: 'Halden Archive — light well',
  },
  {
    src: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'Studio interior with a long timber worktable',
    caption: 'Marais fit-out — studio floor',
  },
  {
    src: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'Glass office tower against a clear sky',
    caption: 'Northbank — east elevation',
  },
];

type Phase = 'idle' | 'flip';

const DISSOLVE_MS = 1150;
const FADE_MS = 240;
const ASPECT = 3 / 2;
const SWIPE_MIN = 44;
const PROGRESS_MIN_SEGMENTS = 2;

const PREV_LABEL = 'Previous slide';
const NEXT_LABEL = 'Next slide';
const PLAY_LABEL = 'Play slideshow';
const PAUSE_LABEL = 'Pause slideshow';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const pad = (n: number) => String(n).padStart(2, '0');

/* ---- WebGL dissolve: pixel blocks swell and shrink as a wave passes, swapping image A for B ---- */

const VERT = `attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `precision highp float;
uniform sampler2D uA;
uniform sampler2D uB;
uniform vec2 uRes;
uniform vec2 uOrigin;
uniform vec2 uCoverA;
uniform vec2 uCoverB;
uniform float uP;
uniform float uCell;
uniform float uMax;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main(){
  vec2 px = gl_FragCoord.xy;
  float d = length(px - uOrigin) / uMax;
  const float W = 0.6;
  float t = clamp((uP * (1.0 + W) - d) / W, 0.0, 1.0);
  float bump = sin(3.14159265 * t);
  float lvl = floor((1.0 - pow(bump, 0.7)) * 5.0);
  float cell = uCell / exp2(lvl);
  vec2 q = (lvl >= 5.0 || bump < 0.003) ? px : (floor(px / cell) + 0.5) * cell;
  float thr = 0.28 + 0.44 * hash(floor(px / uCell));
  float m = step(thr, t);
  vec2 uv = q / uRes;
  vec4 a = texture2D(uA, (uv - 0.5) * uCoverA + 0.5);
  vec4 b = texture2D(uB, (uv - 0.5) * uCoverB + 0.5);
  gl_FragColor = vec4(mix(a.rgb, b.rgb, m), 1.0);
}`;

interface TexEntry {
  tex: WebGLTexture;
  aspect: number;
}

interface Renderer {
  ensure: (src: string) => Promise<void>;
  resize: (cssW: number, cssH: number, dpr: number) => void;
  render: (a: string, b: string, p: number, ox: number, oy: number, cellCss: number) => void;
  dispose: () => void;
}

function createRenderer(canvas: HTMLCanvasElement, onLost: () => void, onRestored: () => void): Renderer | null {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl) return null;

  const compile = (type: number, code: string) => {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, code);
    gl.compileShader(sh);
    return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const loc = (n: string) => gl.getUniformLocation(prog, n);
  const u = {
    a: loc('uA'), b: loc('uB'), res: loc('uRes'), origin: loc('uOrigin'),
    coverA: loc('uCoverA'), coverB: loc('uCoverB'), p: loc('uP'), cell: loc('uCell'), max: loc('uMax'),
  };
  gl.uniform1i(u.a, 0);
  gl.uniform1i(u.b, 1);

  const cache = new Map<string, Promise<TexEntry>>();
  const ready = new Map<string, TexEntry>();
  let disposed = false;
  let w = 1;
  let h = 1;

  const upload = (source: TexImageSource | Uint8Array, width: number, height: number): TexEntry => {
    const tex = gl.createTexture() as WebGLTexture;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    if (source instanceof Uint8Array) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { tex, aspect: width / height };
  };

  const placeholder = () => upload(new Uint8Array([26, 28, 31, 255]), ASPECT, 1);

  const ensure = (src: string) => {
    let p = cache.get(src);
    if (!p) {
      p = new Promise<TexEntry>((resolve) => {
        const done = (e: TexEntry) => {
          if (!disposed) ready.set(src, e);
          resolve(e);
        };
        if (!src) return done(placeholder());
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => {
          if (disposed) return resolve(placeholder());
          try {
            done(upload(img, img.naturalWidth, img.naturalHeight));
          } catch {
            done(placeholder());
          }
        };
        img.onerror = () => (disposed ? resolve(placeholder()) : done(placeholder()));
        img.src = src;
      });
      cache.set(src, p);
    }
    return p.then(() => undefined);
  };

  const cover = (aspect: number) => {
    const view = w / h;
    return aspect > view ? [view / aspect, 1] : [1, aspect / view];
  };

  const render: Renderer['render'] = (a, b, p, ox, oy, cellCss) => {
    const ea = ready.get(a);
    const eb = ready.get(b);
    if (!ea || !eb || gl.isContextLost()) return;
    gl.viewport(0, 0, w, h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ea.tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, eb.tex);
    const [ax, ay] = cover(ea.aspect);
    const [bx, by] = cover(eb.aspect);
    const px = ox * w;
    const py = (1 - oy) * h;
    const far = Math.max(
      Math.hypot(px, py), Math.hypot(w - px, py), Math.hypot(px, h - py), Math.hypot(w - px, h - py),
    );
    gl.uniform2f(u.res, w, h);
    gl.uniform2f(u.origin, px, py);
    gl.uniform2f(u.coverA, ax, ay);
    gl.uniform2f(u.coverB, bx, by);
    gl.uniform1f(u.p, p);
    gl.uniform1f(u.cell, Math.max(2, (cellCss * w) / canvas.clientWidth || 2));
    gl.uniform1f(u.max, far);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const resize: Renderer['resize'] = (cssW, cssH, dpr) => {
    w = Math.max(1, Math.round(cssW * dpr));
    h = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
  };

  const lost = (e: Event) => {
    e.preventDefault();
    cache.clear();
    ready.clear();
    onLost();
  };
  const restored = () => onRestored();
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);

  const dispose = () => {
    disposed = true;
    canvas.removeEventListener('webglcontextlost', lost);
    canvas.removeEventListener('webglcontextrestored', restored);
    ready.forEach((e) => gl.deleteTexture(e.tex));
    ready.clear();
    cache.clear();
    gl.deleteBuffer(buf);
    gl.deleteProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };

  return { ensure, resize, render, dispose };
}

export default function MosaicDissolveSlides({
  slides = defaultSlides,
  tileSize = 56,
  autoAdvance = true,
  advanceSeconds = 5,
  className,
}: MosaicDissolveSlidesProps) {
  const count = slides.length;
  const tileTarget = clamp(tileSize, 28, 96);
  const holdMs = clamp(advanceSeconds, 2.5, 30) * 1000;

  const [index, setIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [origin, setOrigin] = useState({ x: 0.5, y: 0.5 });
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [hover, setHover] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [playOn, setPlayOn] = useState(autoAdvance);
  const [glReady, setGlReady] = useState(false);
  const [glKey, setGlKey] = useState(0);
  const [viewW, setViewW] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<Renderer | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const autoRemaining = useRef(holdMs);

  const safeIndex = count > 0 ? ((index % count) + count) % count : 0;
  const current: MosaicSlide | undefined = count > 0 ? slides[safeIndex] : undefined;
  const back: MosaicSlide | undefined = nextIndex !== null ? slides[nextIndex] : current;
  const captionText = (current?.caption ?? '').trim() || (current?.alt ?? '').trim();
  const frontSrc = current?.src ?? '';
  const backSrc = back?.src ?? '';
  const useGL = glReady && !reduced;
  const cellCss = clamp(Math.min(tileTarget, viewW / 8 || tileTarget), 12, 96);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (reduced) setPlayOn(false);
  }, [reduced]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.12 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  // GL lifecycle: created once motion is allowed, disposed on unmount / reduced-motion / context loss.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduced) return;
    const r = createRenderer(
      canvas,
      () => setGlReady(false),
      () => setGlKey((k) => k + 1),
    );
    if (!r) return;
    glRef.current = r;
    setGlReady(true);
    return () => {
      glRef.current = null;
      setGlReady(false);
      r.dispose();
    };
  }, [reduced, glKey]);

  // Viewport size drives canvas resolution and the cell size.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w < 40) return;
      setViewW(w);
      glRef.current?.resize(w, w / ASPECT, Math.min(window.devicePixelRatio || 1, 2));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [glReady]);

  // Rest frame: the canvas always shows the current slide (same pixels as the fallback image).
  useLayoutEffect(() => {
    const r = glRef.current;
    if (!useGL || !r || phase !== 'idle') return;
    let cancelled = false;
    const draw = () => r.render(frontSrc, frontSrc, 0, 0.5, 0.5, cellCss);
    r.ensure(frontSrc).then(() => !cancelled && draw());
    return () => {
      cancelled = true;
    };
  }, [useGL, phase, frontSrc, viewW, cellCss]);

  const commit = useCallback((target: number) => {
    setIndex(target);
    setNextIndex(null);
    setPhase('idle');
  }, []);

  const goTo = useCallback(
    (target: number, ox: number, oy: number) => {
      if (phase !== 'idle' || count < 2) return;
      const t = ((target % count) + count) % count;
      if (t === safeIndex) return;
      setOrigin({ x: clamp(ox, 0, 1), y: clamp(oy, 0, 1) });
      setNextIndex(t);
      setPhase('flip');
    },
    [phase, count, safeIndex],
  );

  // Dissolve driver: one rAF loop writes the shader's progress; commits when the wave has crossed the frame.
  useEffect(() => {
    const r = glRef.current;
    if (phase !== 'flip' || nextIndex === null || !useGL || !r) return;
    let cancelled = false;
    let raf = 0;
    Promise.all([r.ensure(frontSrc), r.ensure(backSrc)]).then(() => {
      if (cancelled) return;
      const t0 = performance.now();
      const frame = (now: number) => {
        const p = clamp((now - t0) / DISSOLVE_MS, 0, 1);
        r.render(frontSrc, backSrc, easeInOut(p), origin.x, origin.y, cellCss);
        if (p < 1) raf = requestAnimationFrame(frame);
        else commit(nextIndex);
      };
      raf = requestAnimationFrame(frame);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [phase, nextIndex, useGL, frontSrc, backSrc, origin, cellCss, commit]);

  // Static fallback (reduced motion, no WebGL): plain crossfade.
  useEffect(() => {
    if (phase !== 'flip' || nextIndex === null || useGL) return;
    const id = window.setTimeout(() => commit(nextIndex), FADE_MS + 60);
    return () => window.clearTimeout(id);
  }, [phase, nextIndex, useGL, commit]);

  // Warm the neighbouring slides so the first dissolve never waits on a download or decode.
  useEffect(() => {
    if (count < 2 || !inView) return;
    [safeIndex + 1, safeIndex - 1].forEach((i) => {
      const src = slides[((i % count) + count) % count]?.src;
      if (!src) return;
      glRef.current?.ensure(src);
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      img.decode?.().catch(() => {});
    });
  }, [slides, count, safeIndex, inView, glReady]);

  const isPlaying =
    playOn && inView && !hover && !focusWithin && phase === 'idle' && count > 1;

  // Fresh countdown for every slide; keep the remaining time across hover pauses.
  useEffect(() => {
    autoRemaining.current = holdMs;
  }, [holdMs, safeIndex]);

  useEffect(() => {
    if (!isPlaying) return;
    const startedAt = Date.now();
    const remaining = Math.max(60, autoRemaining.current);
    const id = window.setTimeout(() => goTo(safeIndex + 1, 0.5, 0.5), remaining);
    return () => {
      window.clearTimeout(id);
      autoRemaining.current = Math.max(0, remaining - (Date.now() - startedAt));
    };
  }, [isPlaying, safeIndex, goTo]);

  const onRootFocus = (e: ReactFocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(true);
  };
  const onRootBlur = (e: ReactFocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
  };

  const onViewportClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ox = (e.clientX - rect.left) / rect.width;
    const oy = (e.clientY - rect.top) / rect.height;
    setPlayOn(false);
    goTo(safeIndex + 1, ox, oy);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    suppressClick.current = false;
    if (e.pointerType === 'mouse') return;
    swipeStart.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = swipeStart.current;
    swipeStart.current = null;
    if (!s || e.pointerType === 'mouse') return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    suppressClick.current = true;
    setPlayOn(false);
    if (dx < 0) goTo(safeIndex + 1, 1, 0.5);
    else goTo(safeIndex - 1, 0, 0.5);
  };

  const onPrev = () => {
    setPlayOn(false);
    goTo(safeIndex - 1, 0, 0.5);
  };
  const onNext = () => {
    setPlayOn(false);
    goTo(safeIndex + 1, 1, 0.5);
  };

  const rootStyle = { '--md-fade': `${FADE_MS}ms` } as CSSProperties;
  const bg = (src: string) => (src ? { backgroundImage: `url("${src}")` } : undefined);

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
      data-phase={phase}
      data-motion={reduced ? 'reduced' : 'full'}
      data-render={useGL ? 'gl' : 'static'}
      data-inview={inView ? 'in' : 'out'}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={onRootFocus}
      onBlur={onRootBlur}
    >
      <div
        ref={viewportRef}
        className={styles.viewport}
        onClick={onViewportClick}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipeStart.current = null;
        }}
      >
        <span
          className={[styles.base, frontSrc ? '' : styles.placeholder].filter(Boolean).join(' ')}
          style={bg(frontSrc)}
          role="img"
          aria-label={current?.alt ?? ''}
        />
        {phase === 'flip' && !useGL && (
          <span
            className={[styles.base, styles.fade, backSrc ? '' : styles.placeholder].filter(Boolean).join(' ')}
            style={bg(backSrc)}
            aria-hidden="true"
          />
        )}
        <canvas key={glKey} ref={canvasRef} className={styles.canvas} hidden={!useGL} aria-hidden="true" />
      </div>

      <div className={styles.meta}>
        <span className={styles.counter} aria-hidden="true">
          <span className={styles.counterNow}>{pad(safeIndex + 1)}</span>
          <span className={styles.counterTotal}>/{pad(Math.max(count, 1))}</span>
        </span>
        <p className={styles.caption} aria-live={isPlaying ? 'off' : 'polite'} aria-atomic="true">
          <span className={styles.captionText} key={safeIndex}>
            {captionText}
          </span>
        </p>
        <div className={styles.controls}>
          <button
            type="button"
            className={[styles.ctrl, styles.ctrlText].join(' ')}
            aria-label={playOn ? PAUSE_LABEL : PLAY_LABEL}
            onClick={() => setPlayOn((p) => !p)}
          >
            {playOn ? 'Pause' : 'Play'}
          </button>
          <button type="button" className={styles.ctrl} aria-label={PREV_LABEL} onClick={onPrev}>
            <svg className={styles.ctrlIcon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M13 8H3M7 4 3 8l4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button type="button" className={styles.ctrl} aria-label={NEXT_LABEL} onClick={onNext}>
            <svg className={styles.ctrlIcon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </div>

      {count >= PROGRESS_MIN_SEGMENTS && (
        <div className={styles.progress} aria-hidden="true">
          {slides.map((_, k) => (
            <span
              key={k}
              className={[styles.seg, k < safeIndex ? styles.segDone : ''].filter(Boolean).join(' ')}
            >
              {k === safeIndex && (
                <span
                  className={[styles.segFill, playOn ? styles.segFillRun : ''].filter(Boolean).join(' ')}
                  key={`fill-${safeIndex}-${playOn}`}
                  style={{ animationDuration: `${holdMs}ms`, animationPlayState: isPlaying ? 'running' : 'paused' }}
                />
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

```css
@font-face {
  font-family: 'Space Grotesk';
  font-style: normal;
  font-display: swap;
  font-weight: 500;
  src: url('./fonts/space-grotesk-500.woff2') format('woff2');
}

.root {
  --md-ink: #0c0d0f;
  --md-paper: #ecebe6;
  --md-dim: #9a9b98;
  --md-line: #2a2c2f;
  --md-signal: #c8ff3a;
  --md-font: 'Space Grotesk', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;

  position: relative;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  overflow: clip;
  background: var(--md-ink);
  color: var(--md-paper);
  font-family: var(--md-font);
  font-weight: 500;
  font-synthesis: none;
  font-variant-numeric: tabular-nums;
}

.viewport {
  position: relative;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  cursor: pointer;
  touch-action: pan-y;
  background: var(--md-ink);
}

.base {
  position: absolute;
  inset: 0;
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;
}

.placeholder {
  background-color: #1a1c1f;
}

.canvas {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  display: block;
}

.fade {
  animation: md-fade var(--md-fade) linear both;
}

@keyframes md-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.meta {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: end;
  column-gap: clamp(16px, 4cqi, 40px);
  padding: clamp(16px, 3cqi, 28px) clamp(16px, 3cqi, 28px) clamp(14px, 2.4cqi, 22px);
}

.counter {
  display: inline-flex;
  align-items: baseline;
  gap: 0.15em;
  line-height: 0.85;
  letter-spacing: -0.04em;
}

.counterNow {
  font-size: clamp(56px, 15cqi, 144px);
}

.counterTotal {
  font-size: clamp(14px, 1.8cqi, 18px);
  letter-spacing: 0;
  color: var(--md-dim);
}

.caption {
  margin: 0;
  align-self: end;
  font-size: clamp(14px, 1.9cqi, 17px);
  line-height: 1.35;
  color: var(--md-paper);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.captionText {
  animation: md-caption 360ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes md-caption {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.controls {
  display: flex;
  gap: 8px;
}

.ctrl {
  appearance: none;
  display: inline-grid;
  place-items: center;
  box-sizing: border-box;
  min-inline-size: 44px;
  block-size: 44px;
  padding: 0;
  border: 1px solid var(--md-line);
  border-radius: 0;
  background: transparent;
  color: var(--md-paper);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    color 160ms ease,
    border-color 160ms ease;
}

.ctrlText {
  padding-inline: 14px;
  color: var(--md-dim);
}

.ctrlIcon {
  inline-size: 16px;
  block-size: 16px;
}

@media (hover: hover) {
  .ctrl:hover {
    background: var(--md-paper);
    border-color: var(--md-paper);
    color: var(--md-ink);
  }
}

.ctrl:active {
  background: var(--md-paper);
  color: var(--md-ink);
}

.ctrl:focus-visible {
  outline: 2px solid var(--md-signal);
  outline-offset: 2px;
}

.progress {
  display: flex;
  gap: 4px;
  padding: 0 clamp(16px, 3cqi, 28px) clamp(16px, 3cqi, 28px);
}

.seg {
  position: relative;
  flex: 1 1 0;
  block-size: 2px;
  background: var(--md-line);
  overflow: hidden;
}

.segDone,
.segFill {
  background: var(--md-paper);
}

.segDone {
  inline-size: 100%;
}

.segFill {
  position: absolute;
  inset: 0;
}

.segFillRun {
  background: var(--md-signal);
  transform-origin: left center;
  animation: md-progress linear both;
}

@keyframes md-progress {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

@container (max-width: 560px) {
  .meta {
    grid-template-columns: auto 1fr;
    row-gap: 14px;
  }
  .caption {
    grid-column: 1 / -1;
    grid-row: 2;
  }
  .controls {
    justify-self: end;
  }
}

@media (prefers-reduced-motion: reduce) {
  .captionText {
    animation: none;
  }
  .ctrl {
    transition: none;
  }
}
```
