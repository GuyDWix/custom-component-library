Create a custom element called "Watercolour Wash Field". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: small heading, headline, paragraph, button label and link, colours (2), wash intensity, edge style (soft | torn). Add other settings if they help.

```tsx
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import styles from './Component.module.css';

export type WashEdgeStyle = 'soft' | 'torn';

export interface WatercolourWashFieldProps {
  eyebrow?: string;
  title?: string;
  body?: string;
  buttonLabel?: string;
  buttonLink?: string;
  /** First wash colour (defaults to dusty rose). */
  colorOne?: string;
  /** Second wash colour (defaults to sea glass). */
  colorTwo?: string;
  /** 0–100: how much pigment the wash carries. */
  washIntensity?: number;
  edgeStyle?: WashEdgeStyle;
  ariaLabel?: string;
  children?: ReactNode;
  className?: string;
}

const BLOOM_MS = 3400;
const NARROW_PX = 640;

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform vec2 u_res;
uniform float u_scale;
uniform float u_progress;
uniform float u_flow;
uniform float u_dry;
uniform float u_intensity;
uniform float u_torn;
uniform vec3 u_colA;
uniform vec3 u_colB;
uniform vec3 u_paper;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = r * p * 2.03 + 3.1;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 px = gl_FragCoord.xy / u_scale;
  vec2 size = u_res / u_scale;
  float m = min(size.x, size.y);
  vec2 p = px / clamp(m * 0.42, 120.0, 230.0);

  vec2 q = vec2(fbm(p + vec2(0.0, u_flow * 0.35)), fbm(p + vec2(5.2, 1.3) - u_flow * 0.25));
  vec2 r = vec2(fbm(p + 3.2 * q + vec2(1.7, 9.2) + u_flow * 0.18), fbm(p + 3.2 * q + vec2(8.3, 2.8)));
  float f = fbm(p + 2.4 * r);

  float d = min(min(px.x, size.x - px.x), min(px.y, size.y - px.y)) / m;
  float field = d + (f - 0.5) * 0.36;
  field += u_torn * (noise(px / 5.0) - 0.5) * 0.03 + u_torn * (noise(px / 19.0) - 0.5) * 0.05;

  float reach = u_progress * mix(0.13, 0.2, smoothstep(300.0, 520.0, m));
  float soft = mix(0.085, 0.01, u_torn);
  float front = reach - field;
  float wash = smoothstep(-soft * 0.3, soft, front);

  float rimWidth = mix(0.028, 0.011, u_torn);
  float rim = exp(-(front * front) / (rimWidth * rimWidth)) * wash * u_dry;
  float backrun = exp(-pow((front - 0.07) / 0.012, 2.0)) * wash * u_dry * 0.35;
  float pool = exp(-d * m / 22.0) * wash;

  float paperH = fbm(px / 7.0);
  float paperX = fbm((px + vec2(1.4, 0.0)) / 7.0);
  float paperY = fbm((px + vec2(0.0, 1.4)) / 7.0);
  float fiber = noise(px * vec2(0.9, 0.12));

  float density = wash * (0.3 + 0.32 * f) + rim * 0.55 + backrun + pool * 0.4;
  density *= 0.8 + (0.5 - paperH) * 0.9;
  density = max(density, 0.0) * u_intensity;
  float veil = 0.05 * u_progress * u_intensity;

  float mixer = smoothstep(0.32, 0.68, fbm(p * 0.55 + vec2(7.0, 3.0) + q * 0.6));
  vec3 pigment = mix(u_colA, u_colB, mixer);
  vec3 trans = pow(max(pigment, vec3(0.02)), vec3(density * 1.25 + veil));
  vec3 col = u_paper * trans;

  float light = (paperX - paperH) * 1.6 + (paperY - paperH) * 1.1;
  col *= 1.0 + light * 0.2 + (fiber - 0.5) * 0.014;
  col += (hash(px) - 0.5) * 0.018;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

type Rgb = [number, number, number];

const toRgb = (ctx: CanvasRenderingContext2D, value: string, fallback: Rgb): Rgb => {
  ctx.fillStyle = '#000';
  ctx.fillStyle = value || '#000';
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return a === 0 || !value ? fallback : [r / 255, g / 255, b / 255];
};

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const compile = (gl: WebGLRenderingContext, type: number, src: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
};

export default function WatercolourWashField({
  eyebrow = 'Spring tasting menu',
  title = 'Slow suppers, painted by the season',
  body = 'Seven small courses built around what the market brings in each morning, served at one long table by the window.',
  buttonLabel = 'Reserve a table',
  buttonLink = '#reserve',
  colorOne,
  colorTwo,
  washIntensity = 62,
  edgeStyle = 'soft',
  ariaLabel,
  children,
  className,
}: WatercolourWashFieldProps) {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef({ washIntensity, edgeStyle });
  settingsRef.current = { washIntensity, edgeStyle };
  const redrawRef = useRef<() => void>(() => {});
  const [painted, setPainted] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const titleId = `${useId()}-title`;

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const loc = {
      res: u('u_res'), scale: u('u_scale'), progress: u('u_progress'), flow: u('u_flow'), dry: u('u_dry'),
      intensity: u('u_intensity'), torn: u('u_torn'), colA: u('u_colA'), colB: u('u_colB'), paper: u('u_paper'),
    };

    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const readColors = () => {
      const style = getComputedStyle(root);
      const read = (name: string, fallback: Rgb) =>
        probe ? toRgb(probe, style.getPropertyValue(name).trim(), fallback) : fallback;
      gl.uniform3fv(loc.colA, read('--wash-color-one', [0.85, 0.64, 0.66]));
      gl.uniform3fv(loc.colB, read('--wash-color-two', [0.61, 0.78, 0.74]));
      gl.uniform3fv(loc.paper, read('--wash-paper', [0.97, 0.95, 0.92]));
    };

    let narrow = false;
    const resize = () => {
      const { width, height } = root.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      narrow = width < NARROW_PX;
      const scale = narrow ? 0.75 : Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(loc.res, canvas.width, canvas.height);
      gl.uniform1f(loc.scale, scale);
    };

    let elapsed = reduced ? BLOOM_MS : 0;
    const draw = () => {
      const raw = Math.min(elapsed / BLOOM_MS, 1);
      const { washIntensity: amount, edgeStyle: edge } = settingsRef.current;
      gl.uniform1f(loc.progress, easeOut(raw));
      gl.uniform1f(loc.flow, 1.8 * easeOut(raw) + 0.4);
      gl.uniform1f(loc.dry, 0.35 + 0.65 * Math.min(Math.max((raw - 0.35) / 0.65, 0), 1));
      gl.uniform1f(loc.intensity, Math.min(Math.max(amount, 0), 100) / 75);
      gl.uniform1f(loc.torn, edge === 'torn' ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let frame = 0;
    let last = 0;
    let started = reduced;
    let visible = false;
    const tick = (now: number) => {
      elapsed += last ? Math.min(now - last, 64) : 0;
      last = now;
      draw();
      frame = elapsed < BLOOM_MS && visible ? requestAnimationFrame(tick) : 0;
      if (!frame) last = 0;
    };
    const play = () => {
      if (!frame && started && visible && elapsed < BLOOM_MS) frame = requestAnimationFrame(tick);
    };

    readColors();
    resize();
    draw();
    setPainted(true);
    if (!reduced) setRevealed(false);

    redrawRef.current = () => {
      readColors();
      if (!frame) draw();
    };

    const ro = new ResizeObserver(() => {
      resize();
      if (!frame) draw();
    });
    ro.observe(root);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && entry.intersectionRatio >= 0.15 && !started) {
          started = true;
          setRevealed(true);
        }
        if (visible) play();
        else if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
          last = 0;
        }
      },
      { threshold: [0, 0.15] },
    );
    io.observe(root);

    const onLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      frame = 0;
      setPainted(false);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      redrawRef.current = () => {};
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  useEffect(() => {
    redrawRef.current();
  }, [colorOne, colorTwo, washIntensity, edgeStyle]);

  const themed = {
    ...(colorOne ? { '--wash-color-one': colorOne } : {}),
    ...(colorTwo ? { '--wash-color-two': colorTwo } : {}),
  } as CSSProperties;

  const items = [
    eyebrow ? <p key="eyebrow" className={styles.eyebrow}>{eyebrow}</p> : null,
    title ? (
      <h2 key="title" id={titleId} className={styles.title}>
        {title}
      </h2>
    ) : null,
    body ? <p key="body" className={styles.body}>{body}</p> : null,
    children ? <div key="children" className={styles.extra}>{children}</div> : null,
    buttonLabel ? (
      <a key="button" className={styles.button} href={buttonLink || undefined}>
        {buttonLabel}
      </a>
    ) : null,
  ].filter(Boolean);

  return (
    <section
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={themed}
      aria-label={title ? undefined : ariaLabel}
      aria-labelledby={title ? titleId : undefined}
    >
      <div className={styles.fallback} aria-hidden="true" />
      <canvas ref={canvasRef} className={painted ? styles.canvas : styles.canvasHidden} aria-hidden="true" />
      <div className={styles.veil} aria-hidden="true" />
      <div className={styles.content}>
        {items.map((item, index) => (
          <div
            key={index}
            className={revealed ? styles.item : styles.itemHidden}
            style={{ '--stagger': index } as CSSProperties}
          >
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
```

```css
.root {
  --wash-color-one: #d6a2a6;
  --wash-color-two: #98c6bb;
  --wash-paper: #f7f2ea;
  --wash-ink: #3b3437;
  --wash-ink-soft: #6a5e61;
  --wash-accent: #8e4f5a;
  --wash-display-font: 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif;
  --wash-body-font: 'Avenir Next', Avenir, 'Segoe UI', 'Helvetica Neue', sans-serif;

  position: relative;
  isolation: isolate;
  overflow: hidden;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  min-block-size: 480px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  place-items: center;
  padding-block: clamp(64px, 10%, 128px);
  padding-inline: clamp(24px, 8%, 120px);
  background: var(--wash-paper);
  color: var(--wash-ink);
  font-family: var(--wash-body-font);
  border-radius: 6px;
  box-shadow:
    0 1px 0 rgb(255 255 255 / 0.7) inset,
    0 0 0 1px rgb(80 60 60 / 0.06),
    0 30px 60px -34px rgb(70 45 50 / 0.35);
}

.fallback {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(ellipse 60% 55% at 0% 0%, color-mix(in srgb, var(--wash-color-one) 70%, transparent), transparent 70%),
    radial-gradient(ellipse 55% 60% at 100% 100%, color-mix(in srgb, var(--wash-color-two) 70%, transparent), transparent 70%),
    radial-gradient(ellipse 45% 50% at 100% 0%, color-mix(in srgb, var(--wash-color-two) 45%, transparent), transparent 70%),
    radial-gradient(ellipse 50% 45% at 0% 100%, color-mix(in srgb, var(--wash-color-one) 45%, transparent), transparent 70%),
    var(--wash-paper);
  box-shadow: inset 0 0 28px color-mix(in srgb, var(--wash-color-one) 55%, transparent);
}

.canvas,
.canvasHidden {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: block;
  inline-size: 100%;
  block-size: 100%;
  transition: opacity 400ms ease-out;
}

.canvasHidden {
  opacity: 0;
}

.veil {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: radial-gradient(
    ellipse 52% 46% at 50% 50%,
    color-mix(in srgb, var(--wash-paper) 62%, transparent),
    transparent 100%
  );
}

.content {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(14px, 2cqi, 22px);
  inline-size: 100%;
  max-inline-size: 40rem;
  min-inline-size: 0;
  text-align: center;
}

.item,
.itemHidden {
  max-inline-size: 100%;
  min-inline-size: 0;
  transition:
    opacity 900ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 1100ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 900ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: calc(700ms + var(--stagger, 0) * 140ms);
}

.itemHidden {
  opacity: 0;
  transform: translateY(14px);
  filter: blur(6px);
  transition-delay: 0ms;
}

.eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--wash-accent);
  overflow-wrap: anywhere;
}

.title {
  margin: 0;
  font-family: var(--wash-display-font);
  font-weight: 500;
  font-size: clamp(32px, 6.4cqi, 66px);
  line-height: 1.04;
  letter-spacing: -0.022em;
  color: var(--wash-ink);
  text-wrap: balance;
  overflow-wrap: anywhere;
  text-shadow: 0 1px 0 rgb(255 255 255 / 0.45);
}

.body {
  margin: 0;
  max-inline-size: 34rem;
  font-size: clamp(15px, 1.7cqi, 18px);
  line-height: 1.6;
  color: var(--wash-ink-soft);
  text-wrap: pretty;
  overflow-wrap: anywhere;
}

.extra {
  max-inline-size: 100%;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-block-size: 46px;
  max-inline-size: 100%;
  box-sizing: border-box;
  margin-block-start: 6px;
  padding-block: 12px;
  padding-inline: 26px;
  border-radius: 999px;
  background: var(--wash-ink);
  color: var(--wash-paper);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-decoration: none;
  text-align: center;
  overflow-wrap: anywhere;
  box-shadow:
    0 1px 0 rgb(255 255 255 / 0.18) inset,
    0 10px 22px -12px rgb(59 52 55 / 0.7);
  transition:
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 260ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 200ms ease-out;
}

.button:hover {
  transform: translateY(-2px);
  background: var(--wash-accent);
  box-shadow:
    0 1px 0 rgb(255 255 255 / 0.2) inset,
    0 16px 28px -14px rgb(142 79 90 / 0.75);
}

.button:active {
  transform: translateY(0) scale(0.98);
}

.button:focus-visible {
  outline: 2px solid var(--wash-accent);
  outline-offset: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .item,
  .itemHidden,
  .canvas,
  .canvasHidden,
  .button {
    transition: none;
  }
}
```
