const t=`import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import styles from './Component.module.css';

export type WashEdgeStyle = 'soft' | 'torn';

export interface WatercolourWashFieldProps {
  title?: string;
  body?: string;
  buttonLabel?: string;
  buttonLink?: string;
  /** First pigment (defaults to indigo). */
  colorOne?: string;
  /** Second pigment (defaults to sap green). */
  colorTwo?: string;
  /** 0–100: how much pigment the wash carries. */
  washIntensity?: number;
  /** soft: feathered wet-on-wet edges. torn: crisp, drier edges. */
  edgeStyle?: WashEdgeStyle;
  /** 0–100: how much the pointer feeds a faint extra tint into the wash (0 = off). */
  pointerTint?: number;
  ariaLabel?: string;
  children?: ReactNode;
  className?: string;
}

const TOTAL_TICKS = 380;
const TICK_MS = 1000 / 60;
const FLOW_PASSES = 2;
const TARGET_CELLS = 38000;
const BLOOM_TICKS = [150, 192, 236, 284];
const TINT_CELL = 3;
const TINT_DECAY = 0.9955;
const TINT_EASE = 0.07;
const TINT_ACTIVE = 0.004;

const VERTEX = \`
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
\`;

const FRAGMENT = \`
precision highp float;
uniform sampler2D u_sim;
uniform vec2 u_res;
uniform float u_scale;
uniform vec2 u_grid;
uniform float u_cell;
uniform float u_intensity;
uniform float u_torn;
uniform vec3 u_kA;
uniform vec3 u_kB;
uniform vec3 u_paper;
uniform vec3 u_kC;
uniform sampler2D u_tint;
uniform float u_pointerTint;

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
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = r * p * 2.03 + 3.1;
    a *= 0.5;
  }
  return v;
}
float tooth(vec2 p) {
  return 0.5 * fbm(p / 6.5) + 0.32 * noise(p / 2.4 + 7.0) + 0.18 * noise(p / 1.15 + 19.0);
}
float dec(float v) { return v * v * 1.6; }
float pig(vec2 uv) {
  vec4 t = texture2D(u_sim, uv);
  return dec(t.r) + dec(t.g);
}

void main() {
  vec2 px = gl_FragCoord.xy / u_scale;
  vec2 size = u_res / u_scale;
  vec2 pp = vec2(px.x, size.y - px.y);

  float h = tooth(pp);
  float valley = clamp((0.5 - h) * 2.2, -1.0, 1.0);

  vec2 q = vec2(fbm(pp / 54.0), fbm(pp / 54.0 + 31.0)) - 0.5;
  vec2 fine = vec2(noise(pp / 9.0), noise(pp / 9.0 + 11.0)) - 0.5;
  vec2 warp = q * 2.0 * u_cell * mix(1.5, 2.2, u_torn) + fine * u_cell * (0.3 + 0.5 * u_torn);
  vec2 uv = (pp + warp) / size;
  vec2 uv2 = uv + vec2(0.011, -0.008) + q * 0.05;
  vec4 s = texture2D(u_sim, uv);
  vec4 s2 = texture2D(u_sim, uv2);

  float a = 0.64 * dec(s.r) + 0.42 * dec(s2.r);
  float b = 0.64 * dec(s.g) + 0.42 * dec(s2.g);
  float wet = s.b;
  float dep = s.a;

  float edge = mix(1.0, smoothstep(0.012, 0.11, a + b), u_torn);
  a *= edge;
  b *= edge;

  float drift = fbm(pp / 130.0 + 5.0);
  float depth = 0.78 + 0.44 * fbm(pp / 95.0 + 9.0);
  vec3 kA = mix(u_kA, u_kC, 0.32 * drift);
  vec3 kB = mix(u_kB, u_kC, 0.32 * (1.0 - drift));

  float gran = 0.3 + 0.7 * dep;
  float gA = clamp(1.0 - valley * 0.6 * gran, 0.45, 1.6);
  float gB = clamp(1.0 - valley * 0.3 * gran, 0.6, 1.4);
  float lustre = 1.0 + 0.1 * smoothstep(0.1, 0.9, wet);

  vec3 absorb = (a * gA * kA + b * gB * kB) * depth * u_intensity * lustre;

  vec2 e1 = vec2(1.8 / u_grid.x, 0.0);
  vec2 e2 = vec2(0.0, 1.8 / u_grid.y);
  float gx = pig(uv + e1) - pig(uv - e1);
  float gy = pig(uv + e2) - pig(uv - e2);
  float rim = smoothstep(0.02, 0.3, length(vec2(gx, gy)));
  absorb *= 1.0 + 0.32 * rim * smoothstep(0.02, 0.2, a + b);

  float tint = texture2D(u_tint, pp / size).r;
  absorb += tint * u_pointerTint * u_kC * (0.7 + 0.3 * drift) * (1.0 - 0.25 * valley * gran);

  absorb /= 1.0 + 0.3 * dot(absorb, vec3(0.333));
  vec3 col = u_paper * exp(-absorb);

  float relief = (h - tooth(pp + vec2(1.4, 0.0))) * 0.9 + (h - tooth(pp + vec2(0.0, 1.4))) * 0.6;
  col *= 1.0 + relief * 0.11 + 0.014 * (h - 0.5);
  col *= 1.015 - 0.04 * (pp.y / size.y);
  col *= 1.0 - 0.04 * smoothstep(0.03, 0.5, wet);
  col += (hash(pp) - 0.5) * 0.006;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
\`;

type Rgb = [number, number, number];

const toRgb = (ctx: CanvasRenderingContext2D, value: string, fallback: Rgb): Rgb => {
  ctx.fillStyle = '#000';
  ctx.fillStyle = value || '#000';
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return a === 0 || !value ? fallback : [r / 255, g / 255, b / 255];
};

const absorbance = (c: Rgb): Rgb => [-Math.log(Math.max(c[0], 0.03)), -Math.log(Math.max(c[1], 0.03)), -Math.log(Math.max(c[2], 0.03))];

const compile = (gl: WebGLRenderingContext, type: number, src: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

const cellHash = (x: number, y: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const valueNoise = (x: number, y: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const u = smooth(0, 1, x - xi);
  const v = smooth(0, 1, y - yi);
  return lerp(
    lerp(cellHash(xi, yi), cellHash(xi + 1, yi), u),
    lerp(cellHash(xi, yi + 1), cellHash(xi + 1, yi + 1), u),
    v,
  );
};

const seededRandom = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967295;
};

interface Stroke {
  from: number;
  to: number;
  path: [number, number][];
  radius: number;
  water: number;
  a: number;
  b: number;
}

const STROKES: Stroke[] = [
  { from: 0, to: 34, path: [[-0.05, 0.1], [1.05, 0.2]], radius: 0.2, water: 0.95, a: 0, b: 0 },
  { from: 20, to: 56, path: [[1.05, 0.44], [-0.05, 0.52]], radius: 0.2, water: 0.95, a: 0, b: 0 },
  { from: 42, to: 82, path: [[-0.05, 0.8], [1.05, 0.88]], radius: 0.2, water: 0.95, a: 0, b: 0 },
  { from: 40, to: 100, path: [[1.1, 0.0], [0.8, 0.08], [0.54, 0.04], [0.3, 0.1]], radius: 0.14, water: 0, a: 0.085, b: 0 },
  { from: 60, to: 118, path: [[1.06, 0.2], [0.86, 0.44], [0.96, 0.78]], radius: 0.16, water: 0, a: 0.09, b: 0 },
  { from: 72, to: 96, path: [[0.0, -0.02], [0.2, 0.04]], radius: 0.09, water: 0, a: 0.08, b: 0 },
  { from: 62, to: 124, path: [[1.06, 1.06], [0.76, 0.86], [0.56, 0.7], [0.64, 0.44]], radius: 0.15, water: 0, a: 0, b: 0.085 },
  { from: 80, to: 106, path: [[-0.05, 0.38], [0.1, 0.16]], radius: 0.1, water: 0, a: 0, b: 0.075 },
  { from: 96, to: 130, path: [[0.95, 1.06], [0.5, 1.04]], radius: 0.1, water: 0, a: 0, b: 0.07 },
];

const strokePoint = (path: [number, number][], u: number): [number, number] => {
  const f = u * (path.length - 1);
  const i = Math.min(Math.floor(f), path.length - 2);
  const t = f - i;
  return [lerp(path[i][0], path[i + 1][0], t), lerp(path[i][1], path[i + 1][1], t)];
};

function createSim(gw: number, gh: number, reserve: Float32Array, torn: boolean) {
  const n = gw * gh;
  const unit = Math.sqrt(gw * gh);
  const wet = new Float32Array(n);
  const pa = new Float32Array(n);
  const pb = new Float32Array(n);
  const da = new Float32Array(n);
  const db = new Float32Array(n);
  const dw = new Float32Array(n);
  const dpa = new Float32Array(n);
  const dpb = new Float32Array(n);
  const open = new Float32Array(n);
  const perm = new Float32Array(n);
  const rand = seededRandom(11);
  const flow = torn ? 0.34 : 0.5;
  const mixing = torn ? 0.02 : 0.06;

  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const i = y * gw + x;
      perm[i] = 0.4 + 1.1 * valueNoise(x * 0.23, y * 0.23) * (0.6 + 0.8 * valueNoise(x * 0.7 + 40, y * 0.7));
      open[i] = 1 - 0.94 * reserve[i];
    }
  }

  const flowPass = () => {
    dw.fill(0);
    dpa.fill(0);
    dpb.fill(0);
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x;
        for (let k = 0; k < 2; k++) {
          if (k === 0 ? x + 1 >= gw : y + 1 >= gh) continue;
          const j = k === 0 ? i + 1 : i + gw;
          const wi = wet[i];
          const wj = wet[j];
          if (wi === 0 && wj === 0) continue;
          const d = wi - wj;
          const ad = Math.abs(d);
          const lowest = Math.min(wi, wj);
          const gate = (open[i] + open[j]) * 0.5;
          const mean = (wi + wj) * 0.5;
          if (lowest > 0.02 && ad < 0.0002) continue;
          const hi = d > 0 ? i : j;
          const lo = d > 0 ? j : i;
          let q = flow * ((perm[i] + perm[j]) * 0.5) * gate * (mean + 0.03) * ad;
          q = Math.min(q, 0.2 * ad);
          if (q > 0) {
            dw[hi] -= q;
            dw[lo] += q;
            if (wet[hi] > 0.05) {
              const frac = Math.min(q / Math.max(wet[hi], 0.04), 0.2);
              const ma = pa[hi] * frac;
              const mb = pb[hi] * frac;
              dpa[hi] -= ma;
              dpa[lo] += ma;
              dpb[hi] -= mb;
              dpb[lo] += mb;
            }
          }
          const m = mixing * lowest * gate;
          if (m > 0) {
            const xa = (pa[i] - pa[j]) * m;
            const xb = (pb[i] - pb[j]) * m;
            dpa[i] -= xa;
            dpa[j] += xa;
            dpb[i] -= xb;
            dpb[j] += xb;
          }
        }
      }
    }
    for (let i = 0; i < n; i++) {
      wet[i] = Math.max(wet[i] + dw[i], 0);
      pa[i] = Math.max(pa[i] + dpa[i], 0);
      pb[i] = Math.max(pb[i] + dpb[i], 0);
    }
  };

  const local = () => {
    for (let i = 0; i < n; i++) {
      const w = wet[i];
      if (w === 0 && pa[i] === 0 && pb[i] === 0) continue;
      const w2 = Math.max(w - 0.0017 * (0.75 + 0.5 * (1 - Math.min(w, 1))) * (0.8 + 0.4 * perm[i]), 0);
      wet[i] = w2;
      const settle = w2 < 0.03 ? 1 : 0.004 + 0.09 * (1 - smooth(0.03, 0.4, w2));
      const sa = pa[i] * settle;
      const sb = pb[i] * settle;
      pa[i] -= sa;
      pb[i] -= sb;
      da[i] += sa;
      db[i] += sb;
      if (w2 > 0.2) {
        const lift = (w2 - 0.2) * 0.04;
        const la = da[i] * lift * 0.7;
        const lb = db[i] * lift * 0.4;
        da[i] -= la;
        db[i] -= lb;
        pa[i] += la;
        pb[i] += lb;
      }
    }
  };

  const drop = (cx: number, cy: number, radius: number, water: number, a: number, b: number) => {
    const r = radius * unit;
    const x0 = Math.max(Math.floor(cx - r), 0);
    const x1 = Math.min(Math.ceil(cx + r), gw - 1);
    const y0 = Math.max(Math.floor(cy - r), 0);
    const y1 = Math.min(Math.ceil(cy + r), gh - 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d2 = ((x - cx) * (x - cx) + (y - cy) * (y - cy)) / (r * r);
        if (d2 >= 1) continue;
        const f = (1 - d2) * (1 - d2);
        const i = y * gw + x;
        const k = open[i];
        if (water > 0) wet[i] = Math.max(wet[i], water * Math.min(1, f * 1.7) * (0.3 + 0.7 * k));
        pa[i] += a * f * k;
        pb[i] += b * f * k;
      }
    }
  };

  const pickBloom = () => {
    let best = -1;
    let bx = gw / 2;
    let by = gh / 2;
    for (let s = 0; s < 90; s++) {
      const x = Math.floor(rand() * gw);
      const y = Math.floor(rand() * gh);
      const i = y * gw + x;
      const score = (pa[i] + pb[i] + da[i] + db[i]) * open[i] * (0.6 + rand() * 0.8);
      if (score > best) {
        best = score;
        bx = x;
        by = y;
      }
    }
    return [bx, by];
  };

  const runScript = (tick: number) => {
    for (const stroke of STROKES) {
      if (tick < stroke.from || tick >= stroke.to) continue;
      const u = (tick - stroke.from) / (stroke.to - stroke.from);
      const [px, py] = strokePoint(stroke.path, u);
      const dry = 1 - 0.55 * u;
      const jitter = 0.9 + 0.2 * rand();
      drop(px * gw, py * gh, stroke.radius * jitter, stroke.water, stroke.a * dry, stroke.b * dry);
    }
    if (BLOOM_TICKS.includes(tick)) {
      const [bx, by] = pickBloom();
      drop(bx, by, 0.05 + 0.03 * rand(), 1, 0, 0);
    }
  };

  const tex = new Uint8Array(n * 4);
  const enc = (v: number) => Math.min(Math.sqrt(v / 1.6) * 255, 255);

  return {
    step(tick: number) {
      if (tick < TOTAL_TICKS) runScript(tick);
      for (let p = 0; p < FLOW_PASSES; p++) flowPass();
      local();
    },
    drop,
    wetTotal() {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += wet[i];
      return sum;
    },
    pack() {
      for (let i = 0; i < n; i++) {
        const a = pa[i] + da[i];
        const b = pb[i] + db[i];
        const total = a + b;
        const o = i * 4;
        tex[o] = enc(a);
        tex[o + 1] = enc(b);
        tex[o + 2] = Math.min(wet[i] * 255, 255);
        tex[o + 3] = total > 0.0005 ? ((da[i] + db[i]) / total) * 255 : 0;
      }
      return tex;
    },
  };
}

type Sim = ReturnType<typeof createSim>;

const buildReserve = (gw: number, gh: number, width: number, height: number, rect: DOMRect | null, rootRect: DOMRect) => {
  const reserve = new Float32Array(gw * gh);
  if (!rect) return reserve;
  const sx = width / gw;
  const sy = height / gh;
  const left = rect.left - rootRect.left - 8;
  const right = rect.right - rootRect.left + 8;
  const top = rect.top - rootRect.top - 8;
  const bottom = rect.bottom - rootRect.top + 8;
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const cx = (x + 0.5) * sx;
      const cy = (y + 0.5) * sy;
      const dx = Math.max(left - cx, 0, cx - right);
      const dy = Math.max(top - cy, 0, cy - bottom);
      const dist = Math.hypot(dx, dy) - (valueNoise(x * 0.16, y * 0.16) - 0.5) * 56;
      reserve[y * gw + x] = 1 - smooth(6, 52, dist);
    }
  }
  return reserve;
};

export default function WatercolourWashField({
  title = 'Slow suppers, painted by the season',
  body = 'Seven small courses built around what the market brings in each morning, served at one long table by the window.',
  buttonLabel = 'Reserve a table',
  buttonLink = '#reserve',
  colorOne,
  colorTwo,
  washIntensity = 62,
  edgeStyle = 'soft',
  pointerTint = 50,
  ariaLabel,
  children,
  className,
}: WatercolourWashFieldProps) {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef({ washIntensity, edgeStyle, pointerTint });
  settingsRef.current = { washIntensity, edgeStyle, pointerTint };
  const redrawRef = useRef<() => void>(() => {});
  const rebuildRef = useRef<() => void>(() => {});
  const [painted, setPainted] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const titleId = \`\${useId()}-title\`;

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const content = contentRef.current;
    if (!root || !canvas || !content) return;

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

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const loc = {
      sim: u('u_sim'), res: u('u_res'), scale: u('u_scale'), grid: u('u_grid'), cell: u('u_cell'),
      intensity: u('u_intensity'), torn: u('u_torn'), kA: u('u_kA'), kB: u('u_kB'), kC: u('u_kC'), paper: u('u_paper'), tint: u('u_tint'), pointerTint: u('u_pointerTint'),
    };
    gl.uniform1i(loc.sim, 0);
    gl.uniform1i(loc.tint, 1);
    const tintTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tintTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.activeTexture(gl.TEXTURE0);

    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const readColors = () => {
      const style = getComputedStyle(root);
      const read = (name: string, fallback: Rgb) =>
        probe ? toRgb(probe, style.getPropertyValue(name).trim(), fallback) : fallback;
      const kA = absorbance(read('--wash-color-one', [0.18, 0.23, 0.55]));
      const kB = absorbance(read('--wash-color-two', [0.35, 0.54, 0.18]));
      gl.uniform3fv(loc.kA, kA);
      gl.uniform3fv(loc.kB, kB);
      gl.uniform3fv(loc.kC, [0, 1, 2].map((i) => lerp(kA[i], kB[i], 0.5) * 0.9 + (i === 0 ? 0.03 : 0)));
      gl.uniform3fv(loc.paper, read('--wash-paper', [0.965, 0.957, 0.933]));
    };

    let sim: Sim | null = null;
    let gridW = 0;
    let gridH = 0;
    let tick = 0;
    let catchTo = 0;
    let acc = 0;
    let started = reduced;
    let visible = false;
    let frame = 0;
    let last = 0;
    let finished = false;
    let tintW = 0;
    let tintH = 0;
    let tintField = new Float32Array(0);
    let tintScratch = new Float32Array(0);
    let tintBytes = new Uint8Array(0);
    let tintEnergy = 0;
    let target: [number, number] | null = null;
    let eased: [number, number] | null = null;
    let lastMove = 0;

    const stepTint = (frames: number) => {
      if (!tintW) return;
      const idle = performance.now() - lastMove > 450;
      if (target && eased) {
        const k = 1 - Math.pow(1 - TINT_EASE, frames);
        eased[0] += (target[0] - eased[0]) * k;
        eased[1] += (target[1] - eased[1]) * k;
        if (!idle) {
          const r = 0.13 * Math.sqrt(gridW * gridH) / TINT_CELL;
          const cx = eased[0] / TINT_CELL;
          const cy = eased[1] / TINT_CELL;
          const x0 = Math.max(Math.floor(cx - r), 0);
          const x1 = Math.min(Math.ceil(cx + r), tintW - 1);
          const y0 = Math.max(Math.floor(cy - r), 0);
          const y1 = Math.min(Math.ceil(cy + r), tintH - 1);
          for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
              const d2 = ((x - cx) * (x - cx) + (y - cy) * (y - cy)) / (r * r);
              if (d2 >= 1) continue;
              const i = y * tintW + x;
              tintField[i] = Math.min(tintField[i] + 0.014 * frames * (1 - d2) * (1 - d2), 0.5);
            }
          }
        }
      }
      const decay = Math.pow(TINT_DECAY, frames);
      let peak = 0;
      for (let y = 0; y < tintH; y++) {
        for (let x = 0; x < tintW; x++) {
          const i = y * tintW + x;
          const l = x > 0 ? tintField[i - 1] : tintField[i];
          const rr = x + 1 < tintW ? tintField[i + 1] : tintField[i];
          const u = y > 0 ? tintField[i - tintW] : tintField[i];
          const d = y + 1 < tintH ? tintField[i + tintW] : tintField[i];
          const v = (tintField[i] * 0.6 + (l + rr + u + d) * 0.1) * decay;
          tintScratch[i] = v < 0.0004 ? 0 : v;
          if (v > peak) peak = v;
        }
      }
      [tintField, tintScratch] = [tintScratch, tintField];
      tintEnergy = peak;
    };

    const draw = () => {
      if (!sim) return;
      const { washIntensity: amount, edgeStyle: edge } = settingsRef.current;
      gl.uniform1f(loc.intensity, Math.min(Math.max(amount, 0), 100) / 66);
      gl.uniform1f(loc.torn, edge === 'torn' ? 1 : 0);
      gl.uniform1f(loc.pointerTint, Math.min(Math.max(settingsRef.current.pointerTint, 0), 100) / 50);
      for (let i = 0; i < tintField.length; i++) tintBytes[i] = Math.min(tintField[i] * 510, 255);
      gl.activeTexture(gl.TEXTURE1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, tintW, tintH, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, tintBytes);
      gl.activeTexture(gl.TEXTURE0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gridW, gridH, 0, gl.RGBA, gl.UNSIGNED_BYTE, sim.pack());
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const rebuild = () => {
      const rootRect = root.getBoundingClientRect();
      const { width, height } = rootRect;
      if (width === 0 || height === 0) return;
      const narrow = width < 640;
      const scale = narrow ? 1.25 : Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      gl.viewport(0, 0, canvas.width, canvas.height);
      const cell = Math.max(4, Math.sqrt((width * height) / TARGET_CELLS));
      gridW = Math.ceil(width / cell);
      gridH = Math.ceil(height / cell);
      gl.uniform2f(loc.res, canvas.width, canvas.height);
      gl.uniform1f(loc.scale, scale);
      gl.uniform2f(loc.grid, gridW, gridH);
      gl.uniform1f(loc.cell, width / gridW);
      tintW = Math.ceil(gridW / TINT_CELL);
      tintH = Math.ceil(gridH / TINT_CELL);
      tintField = new Float32Array(tintW * tintH);
      tintScratch = new Float32Array(tintW * tintH);
      tintBytes = new Uint8Array(tintW * tintH);
      tintEnergy = 0;

      const reserve = buildReserve(gridW, gridH, width, height, content.getBoundingClientRect(), rootRect);
      sim = createSim(gridW, gridH, reserve, settingsRef.current.edgeStyle === 'torn');
      catchTo = reduced ? TOTAL_TICKS : started ? Math.max(tick, 1) : 0;
      tick = 0;
      acc = 0;
      finished = false;
      draw();
      if (catchTo > 0) wake();
    };

    const loop = (now: number) => {
      frame = 0;
      if (!sim) return;
      const dt = last ? Math.min(now - last, 64) : 0;
      last = now;
      const catching = tick < catchTo;
      if (!catching) acc += dt;
      const deadline = performance.now() + (catching ? 12 : 8);
      let steps = 0;
      while (steps < 24 && performance.now() < deadline && (catching ? tick < catchTo : acc >= TICK_MS && steps < 3)) {
        if (tick < TOTAL_TICKS + 60) sim.step(tick);
        tick++;
        if (!catching) acc -= TICK_MS;
        steps++;
      }
      if (!reduced && !catching && (target || tintEnergy > 0)) stepTint(Math.max(dt / TICK_MS, 0.5));
      const hidingCanvas = reduced || catching;
      if (!hidingCanvas || tick >= catchTo) {
        draw();
        setPainted(true);
      }
      const running = tick < TOTAL_TICKS || tintEnergy > TINT_ACTIVE || (!!target && performance.now() - lastMove < 900);
      if (!running && !finished) {
        finished = true;
      }
      if ((running || tick < catchTo) && visible) frame = requestAnimationFrame(loop);
      else last = 0;
    };
    function wake() {
      if (!frame && started && visible && sim) frame = requestAnimationFrame(loop);
    }

    readColors();
    rebuild();
    if (!reduced) setRevealed(false);
    else setRevealed(true);

    redrawRef.current = () => {
      readColors();
      draw();
    };
    rebuildRef.current = () => {
      rebuild();
    };

    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(rebuild, 90);
    });
    ro.observe(root);
    ro.observe(content);
    document.fonts?.ready.then(() => rebuild());

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && entry.intersectionRatio >= 0.15 && !started) {
          started = true;
          setRevealed(true);
        }
        if (visible) wake();
        else if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
          last = 0;
        }
      },
      { threshold: [0, 0.15] },
    );
    io.observe(root);

    const onMove = (event: PointerEvent) => {
      if (reduced || event.pointerType === 'touch' || !sim || !started || tick < catchTo || content.contains(event.target as Node)) return;
      const rect = root.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * gridW;
      const y = ((event.clientY - rect.top) / rect.height) * gridH;
      target = [x, y];
      eased = eased ?? [x, y];
      lastMove = performance.now();
      wake();
    };
    root.addEventListener('pointermove', onMove);

    const onLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      frame = 0;
      setPainted(false);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      ro.disconnect();
      io.disconnect();
      root.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('webglcontextlost', onLost);
      redrawRef.current = () => {};
      rebuildRef.current = () => {};
      gl.deleteTexture(texture);
      gl.deleteTexture(tintTexture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  useEffect(() => {
    redrawRef.current();
  }, [colorOne, colorTwo, washIntensity]);

  useEffect(() => {
    rebuildRef.current();
  }, [edgeStyle]);

  const themed = {
    ...(colorOne ? { '--wash-color-one': colorOne } : {}),
    ...(colorTwo ? { '--wash-color-two': colorTwo } : {}),
  } as CSSProperties;

  const titleSize = !title || title.length <= 34 ? 'titleLarge' : title.length <= 70 ? 'titleMedium' : 'titleSmall';

  const items = [
    title ? (
      <h2 key="title" id={titleId} className={\`\${styles.title} \${styles[titleSize]}\`}>
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
      <div className={styles.frame}>
        <div ref={contentRef} className={styles.content}>
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
      </div>
    </section>
  );
}
`;export{t as default};
