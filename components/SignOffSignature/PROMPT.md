Create a custom element called "Sign-off Signature". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: note text, signature name, handwriting style, ink color, flourish underline, paper tone, writing speed. Add other settings if they help.

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import styles from './Component.module.css';

export type HandwritingStyle = 'elegant' | 'everyday' | 'quick';
export type PaperTone = 'cream' | 'ivory' | 'white';

export interface SignOffSignatureProps {
  note?: string;
  name?: string;
  handwritingStyle?: HandwritingStyle;
  inkColor?: string;
  showFlourish?: boolean;
  paperTone?: PaperTone;
  /** Writing speed multiplier: 1 = default, higher = faster. Clamped to 0.25-3. */
  speed?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Hand-authored cursive glyph strokes.                                */
/* Units: y grows downward, baseline = 0, x-height = -50, ascender =   */
/* -88, descender <= +30. Each stroke is [startX, startY, then cubic   */
/* segments as (c1x, c1y, c2x, c2y, x, y) groups]. No third-party     */
/* sources; the letterforms are drawn by hand from the concept card.   */
/* ------------------------------------------------------------------ */

type Glyph = { strokes: number[][]; adv: number };

const GLYPHS: Record<string, Glyph> = {
  a: { adv: 63, strokes: [[0, 0, 6, -12, 18, -46, 30, -48, 18, -56, 5, -54, 3, -32, 1, -12, 8, 0, 19, 0, 30, 0, 38, -10, 37, -26, 36, -40, 34, -46, 30, -48, 36, -52, 44, -56, 49, -56]] },
  b: { adv: 64, strokes: [[0, 0, 6, -12, 18, -46, 28, -48, 18, -56, 5, -54, 3, -32, 1, -12, 8, 0, 19, 0, 30, 0, 38, -10, 37, -26, 36, -40, 34, -46, 28, -48, 34, -62, 36, -80, 40, -88, 42, -60, 42, -16, 40, 0, 44, -6, 47, -14, 50, -22]] },
  c: { adv: 58, strokes: [[0, 0, 5, -12, 16, -46, 26, -48, 16, -56, 4, -52, 3, -32, 1, -12, 7, 0, 17, 0, 26, 0, 34, -8, 36, -18, 40, -30, 42, -44, 44, -50]] },
  d: { adv: 61, strokes: [[0, 0, 6, -12, 18, -46, 30, -48, 18, -56, 5, -54, 3, -32, 1, -12, 8, 0, 19, 0, 30, 0, 38, -10, 37, -26, 37, -50, 36, -80, 38, -88, 40, -60, 40, -16, 38, 0, 41, -8, 44, -18, 47, -26]] },
  e: { adv: 58, strokes: [[0, 0, 4, -14, 14, -48, 24, -50, 26, -62, 8, -64, 6, -40, 4, -18, 10, -2, 20, 0, 30, 0, 38, -12, 38, -26, 38, -40, 40, -50, 44, -52]] },
  f: { adv: 48, strokes: [[0, 0, 2, -24, 4, -70, 12, -88, 18, -96, 28, -94, 32, -84, 34, -56, 30, -16, 26, 0, 22, 4, 14, 2, 12, -6], [2, -36, 12, -40, 22, -40, 34, -36]] },
  g: { adv: 38, strokes: [[0, 0, 6, -12, 18, -46, 30, -48, 18, -56, 5, -54, 3, -32, 1, -12, 8, 0, 19, 0, 30, 0, 38, -10, 37, -26, 39, -8, 38, 2, 34, 10, 26, 28, 10, 30, 10, 14, 10, 2, 14, -8, 22, -10]] },
  h: { adv: 67, strokes: [[0, 0, 2, -24, 3, -70, 8, -88, 14, -96, 24, -94, 28, -84, 30, -56, 26, -14, 22, 0, 24, -16, 26, -34, 32, -44, 38, -52, 46, -44, 46, -26, 46, -10, 44, 0, 42, 0, 46, -6, 50, -12, 53, -17]] },
  i: { adv: 40, strokes: [[0, 0, 3, -14, 14, -48, 20, -48, 16, -54, 8, -48, 7, -26, 6, -10, 8, -1, 12, 0, 16, -6, 22, -14, 26, -24], [14, -62, 15, -63, 16, -64, 17, -64]] },
  j: { adv: 28, strokes: [[0, 0, 3, -14, 14, -48, 20, -48, 17, -54, 10, -46, 9, -24, 8, -8, 8, 8, 10, 18, 6, 30, -4, 30, -2, 16, -2, 2, 6, -8, 14, -10], [12, -64, 13, -65, 14, -66, 15, -66]] },
  k: { adv: 57, strokes: [[0, 0, 4, -12, 16, -46, 26, -48, 20, -54, 8, -50, 7, -28, 6, -12, 8, -1, 12, 0], [12, 0, 14, -10, 18, -26, 22, -34, 32, -46, 40, -42, 41, -24, 41, -10, 41, 0, 43, 0]] },
  l: { adv: 49, strokes: [[0, 0, 2, -22, 3, -66, 10, -88, 16, -96, 26, -94, 30, -84, 32, -56, 27, -16, 23, 0, 26, -4, 31, -10, 35, -14]] },
  m: { adv: 70, strokes: [[0, 0, 2, -14, 9, -46, 16, -48, 12, -54, 4, -46, 3, -24, 2, -8, 4, -1, 7, 0, 8, -12, 12, -32, 18, -44, 24, -52, 28, -36, 27, -14, 26, -4, 26, 0, 27, 0, 28, -12, 31, -32, 36, -44, 42, -52, 46, -36, 45, -14, 44, -4, 44, 0, 45, 0, 48, -6, 52, -14, 56, -20]] },
  n: { adv: 52, strokes: [[0, 0, 2, -14, 9, -46, 16, -48, 12, -54, 4, -46, 3, -24, 2, -8, 4, -1, 7, 0, 8, -12, 12, -32, 18, -44, 24, -52, 28, -36, 27, -14, 26, -4, 26, 0, 28, 0, 30, -6, 34, -14, 38, -20]] },
  o: { adv: 56, strokes: [[0, 0, 4, -12, 16, -46, 26, -48, 16, -56, 4, -52, 3, -32, 1, -12, 8, 0, 19, 0, 30, 0, 38, -10, 37, -26, 36, -40, 33, -48, 26, -48, 32, -52, 38, -56, 42, -56]] },
  p: { adv: 38, strokes: [[0, 0, 4, -12, 16, -46, 26, -48, 16, -56, 4, -52, 3, -32, 1, -12, 8, 0, 19, 0, 30, 0, 38, -10, 37, -26, 36, -40, 33, -48, 26, -48, 33, -40, 35, -12, 29, 10, 24, 26, 10, 26, 8, 12, 7, 0, 12, -8, 20, -10]] },
  q: { adv: 40, strokes: [[0, 0, 4, -12, 16, -46, 26, -48, 16, -56, 4, -52, 3, -32, 1, -12, 8, 0, 19, 0, 30, 0, 38, -10, 37, -26, 36, -40, 33, -48, 26, -48, 33, -42, 35, -8, 33, 8, 31, 22, 19, 24, 15, 12, 13, 4, 17, -4, 25, -6]] },
  r: { adv: 55, strokes: [[0, 0, 4, -12, 16, -46, 24, -48, 20, -54, 10, -50, 8, -30, 7, -12, 8, -1, 12, 0, 15, -14, 20, -32, 26, -42, 31, -47, 36, -47, 41, -42]] },
  s: { adv: 54, strokes: [[0, 0, 4, -12, 15, -46, 22, -48, 16, -56, 6, -56, 4, -40, 2, -22, 4, -6, 12, -1, 22, 3, 30, -2, 30, -14, 30, -30, 34, -46, 40, -50]] },
  t: { adv: 48, strokes: [[0, 0, 2, -22, 3, -60, 8, -84, 14, -92, 24, -90, 28, -80, 30, -54, 26, -14, 22, 0], [2, -38, 12, -40, 22, -40, 34, -36]] },
  u: { adv: 58, strokes: [[0, 0, 4, -14, 16, -48, 22, -48, 19, -54, 10, -50, 8, -28, 7, -10, 10, 0, 18, 0, 22, -10, 28, -30, 30, -44, 28, -50, 22, -46, 20, -26, 19, -10, 22, 0, 30, 0, 34, -6, 40, -16, 44, -24]] },
  v: { adv: 57, strokes: [[0, 0, 4, -12, 16, -46, 24, -48, 18, -54, 12, -28, 11, -2, 14, -14, 20, -32, 26, -44, 32, -50, 38, -54, 43, -54]] },
  w: { adv: 59, strokes: [[0, 0, 3, -14, 13, -48, 20, -48, 16, -54, 10, -26, 9, -2, 12, -14, 17, -32, 22, -44, 18, -50, 12, -26, 11, -2, 14, -14, 19, -32, 24, -44, 34, -50, 40, -54, 45, -54]] },
  x: { adv: 54, strokes: [[2, -48, 8, -34, 18, -14, 27, 0], [28, -48, 22, -34, 12, -14, 4, 0, 10, 2, 18, -2, 24, -8]] },
  y: { adv: 38, strokes: [[0, 0, 4, -12, 16, -46, 24, -48, 19, -54, 10, -46, 8, -24, 7, -10, 11, 0, 20, 0, 26, -6, 31, -22, 31, -42, 29, -20, 28, 2, 24, 12, 14, 30, 0, 28, -2, 14, -2, 2, 4, -8, 12, -10]] },
  z: { adv: 50, strokes: [[0, 0, 4, -12, 14, -46, 20, -48, 24, -58, 10, -60, 7, -44, 12, -28, 18, -10, 24, 0, 28, -4, 32, -8, 36, -12]] },

  A: { adv: 60, strokes: [[4, 0, 10, -24, 24, -60, 34, -88, 42, -58, 56, -24, 64, 0], [14, -30, 22, -32, 34, -34, 46, -32]] },
  B: { adv: 70, strokes: [[6, 0, 7, -26, 8, -64, 10, -88], [10, -88, 30, -94, 42, -82, 41, -66, 40, -50, 24, -46, 10, -46], [10, -46, 32, -42, 46, -34, 46, -16, 46, -6, 45, -2, 44, -2, 48, -4, 52, -8, 56, -12]] },
  C: { adv: 68, strokes: [[6, -8, 2, -30, 2, -70, 10, -84, 20, -92, 36, -90, 44, -80, 50, -76, 52, -72, 54, -68]] },
  D: { adv: 62, strokes: [[6, 0, 7, -28, 8, -62, 10, -88], [10, -88, 34, -94, 48, -76, 47, -48, 46, -16, 30, 0, 18, 0, 24, 2, 30, -2, 36, -6]] },
  E: { adv: 58, strokes: [[6, 0, 7, -28, 8, -62, 10, -88], [10, -88, 24, -90, 38, -90, 48, -88], [10, -50, 20, -50, 30, -50, 40, -48], [6, 0, 18, -2, 32, -2, 44, 0]] },
  F: { adv: 64, strokes: [[6, 0, 7, -28, 8, -62, 10, -88], [10, -88, 24, -90, 38, -90, 46, -86], [10, -50, 18, -52, 26, -52, 36, -48, 42, -52, 46, -56, 50, -60]] },
  G: { adv: 64, strokes: [[6, -8, 2, -30, 2, -70, 10, -84, 20, -92, 36, -90, 44, -80, 50, -70, 52, -56, 50, -44, 44, -42, 38, -42, 34, -46]] },
  H: { adv: 74, strokes: [[4, 0, 5, -28, 6, -62, 8, -88], [8, -48, 20, -50, 32, -50, 44, -48], [44, -48, 46, -60, 47, -76, 48, -88, 48, -60, 49, -20, 48, 0, 52, -4, 56, -10, 60, -16]] },
  I: { adv: 42, strokes: [[16, 0, 15, -30, 15, -62, 16, -88], [4, -90, 10, -90, 22, -90, 28, -88], [4, 0, 10, -2, 22, -2, 28, 0]] },
  J: { adv: 44, strokes: [[30, -88, 30, -56, 28, -20, 24, 4, 22, 18, 10, 22, 4, 16, 0, 4, 4, -4, 12, -6]] },
  K: { adv: 70, strokes: [[6, 0, 7, -28, 8, -62, 10, -88], [8, -46, 18, -58, 34, -76, 46, -88], [8, -46, 18, -30, 32, -14, 44, 0, 48, -4, 52, -10, 56, -14]] },
  L: { adv: 56, strokes: [[8, -88, 7, -56, 6, -16, 7, 0, 16, 2, 30, 2, 42, 0]] },
  M: { adv: 74, strokes: [[2, 0, 4, -30, 7, -62, 10, -88, 16, -56, 22, -16, 26, 0, 30, -40, 36, -64, 42, -88, 46, -56, 50, -16, 50, 0, 53, -4, 56, -10, 60, -14]] },
  N: { adv: 66, strokes: [[4, 0, 5, -30, 6, -62, 8, -88, 16, -56, 32, -24, 46, 0, 48, -30, 50, -62, 52, -88]] },
  O: { adv: 62, strokes: [[28, -90, 14, -98, 2, -92, 2, -62, 2, -28, 8, -2, 20, 0, 34, 2, 46, -8, 46, -30, 46, -60, 40, -84, 28, -90, 34, -96, 42, -96, 49, -92]] },
  P: { adv: 52, strokes: [[6, 0, 7, -30, 8, -66, 10, -90], [10, -90, 26, -96, 40, -86, 40, -64, 40, -46, 24, -40, 10, -42, 16, -40, 22, -42, 28, -48]] },
  Q: { adv: 72, strokes: [[28, -90, 14, -98, 2, -92, 2, -62, 2, -28, 8, -2, 20, 0, 34, 2, 46, -8, 46, -30, 46, -60, 40, -84, 28, -90], [40, -8, 44, 6, 52, 12, 58, 6]] },
  R: { adv: 70, strokes: [[6, 0, 7, -28, 8, -62, 10, -88], [10, -88, 28, -94, 40, -84, 40, -66, 40, -50, 24, -44, 10, -46], [10, -46, 20, -40, 32, -22, 44, 0, 48, -4, 52, -10, 56, -14]] },
  S: { adv: 56, strokes: [[40, -90, 24, -98, 8, -90, 8, -64, 6, -36, 10, -12, 22, -8, 34, -4, 42, 4, 40, 12, 34, 22, 22, 26, 14, 22]] },
  T: { adv: 62, strokes: [[26, -88, 25, -56, 23, -18, 20, 0, 16, 4, 8, 2, 6, -4], [4, -88, 16, -92, 34, -92, 48, -88]] },
  U: { adv: 74, strokes: [[4, 0, 4, -30, 6, -62, 8, -88, 10, -50, 16, -10, 26, 0, 36, 0, 44, -10, 46, -30, 48, -56, 50, -74, 52, -88, 56, -90, 58, -88, 60, -86]] },
  V: { adv: 70, strokes: [[2, 0, 3, -30, 5, -62, 8, -88, 16, -56, 34, -24, 44, 0, 48, -4, 52, -10, 56, -14]] },
  W: { adv: 76, strokes: [[2, 0, 3, -30, 6, -62, 8, -88, 12, -56, 20, -22, 24, -8, 28, -50, 32, -72, 38, -88, 44, -52, 50, -22, 54, -8, 58, -62, 60, -76, 62, -86]] },
  X: { adv: 54, strokes: [[4, -88, 12, -60, 32, -28, 48, 0], [46, -88, 36, -58, 16, -26, 4, 0, 10, 2, 20, -2, 28, -6]] },
  Y: { adv: 56, strokes: [[4, -88, 12, -64, 20, -46, 26, -34], [48, -88, 38, -58, 28, -40, 26, -34, 24, -14, 22, 2, 18, 10, 12, 26, 0, 28, -2, 16, -2, 4, 4, -6, 12, -8]] },
  Z: { adv: 58, strokes: [[6, -88, 20, -92, 36, -92, 50, -88], [48, -88, 38, -56, 22, -24, 10, 0, 18, 2, 32, 2, 44, 0]] },

  "'": { adv: 8, strokes: [[0, -70, 1, -74, 2, -78, 3, -82]] },
  '.': { adv: 14, strokes: [[8, -2, 9, -3, 10, -4, 11, -5]] },
  '-': { adv: 22, strokes: [[0, -24, 5, -26, 10, -26, 16, -24]] },
};

const SPACE_ADV = 22;

type PenProfile = { slant: number; advMul: number; thick: number; thin: number; speed: number; jitter: number };

const PEN: Record<HandwritingStyle, PenProfile> = {
  elegant: { slant: 0.14, advMul: 1.06, thick: 7.4, thin: 1.8, speed: 0.46, jitter: 1.6 },
  everyday: { slant: 0.07, advMul: 1.0, thick: 6.0, thin: 2.1, speed: 0.56, jitter: 2.0 },
  quick: { slant: 0.18, advMul: 0.84, thick: 5.0, thin: 1.8, speed: 0.72, jitter: 2.8 },
};

/* ------------------------------ geometry ------------------------------ */

type Pt = { x: number; y: number; w: number; a: number };
type RawStroke = { pts: Pt[]; isDot: boolean; isWordStart: boolean };

const hashString = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const cubic = (p0: number, c1: number, c2: number, p1: number, t: number) => {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t * p1;
};

/** Sample one glyph stroke into a pressure-aware polyline (glyph units). */
const sampleStroke = (
  flat: number[],
  ox: number,
  oy: number,
  pen: PenProfile,
  rng: () => number,
): Pt[] => {
  const raw: { x: number; y: number }[] = [];
  const sx = ox + flat[0];
  const sy = oy + flat[1];
  raw.push({ x: sx, y: sy });
  for (let i = 2; i + 6 <= flat.length; i += 6) {
    const c1x = ox + flat[i];
    const c1y = oy + flat[i + 1];
    const c2x = ox + flat[i + 2];
    const c2y = oy + flat[i + 3];
    const ex = ox + flat[i + 4];
    const ey = oy + flat[i + 5];
    const n = 10;
    for (let k = 1; k <= n; k += 1) {
      const t = k / n;
      raw.push({ x: cubic(sx, c1x, c2x, ex, t), y: cubic(sy, c1y, c2y, ey, t) });
    }
  }
  const pts: Pt[] = raw.map((p) => ({
    x: p.x + pen.slant * -p.y,
    y: p.y,
    w: pen.thin,
    a: 0.9 + rng() * 0.08,
  }));
  // Fountain-pen pressure: downstrokes thick, upstrokes thin.
  for (let i = 0; i < pts.length; i += 1) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const down = Math.max(0, dy / len);
    pts[i].w = pen.thin + (pen.thick - pen.thin) * Math.pow(down, 1.1);
  }
  // Smooth the width profile like real pressure changes.
  for (let i = 1; i < pts.length - 1; i += 1) {
    pts[i].w = (pts[i - 1].w + 2 * pts[i].w + pts[i + 1].w) / 4;
  }
  return pts;
};

const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

/** Build every ink stroke (signature + flourish) for the given name. */
const buildStrokes = (
  name: string,
  style: HandwritingStyle,
  showFlourish: boolean,
): { strokes: RawStroke[]; minX: number; maxX: number; minY: number; maxY: number } | null => {
  const cleaned = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (!cleaned) return null;
  const pen = PEN[style];
  const rng = mulberry32(hashString(`${cleaned}|${style}`));
  const strokes: RawStroke[] = [];
  let ox = 0;
  let oy = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let isWordStart = true;

  const track = (pts: Pt[]) => {
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  };

  for (const ch of cleaned) {
    if (ch === ' ') {
      ox += SPACE_ADV * pen.advMul;
      isWordStart = true;
      continue;
    }
    const glyph = GLYPHS[ch];
    if (!glyph) continue;
    const gx = ox + (rng() - 0.5) * pen.jitter;
    const gy = oy + (rng() - 0.5) * pen.jitter;
    for (const flat of glyph.strokes) {
      const pts = sampleStroke(flat, gx, gy, pen, rng);
      let length = 0;
      for (let i = 1; i < pts.length; i += 1) length += dist(pts[i - 1], pts[i]);
      strokes.push({ pts, isDot: length < 6, isWordStart });
      isWordStart = false;
      track(pts);
    }
    ox += glyph.adv * pen.advMul + (rng() - 0.5) * pen.jitter;
  }
  if (!strokes.length) return null;

  if (showFlourish) {
    const w = Math.max(40, maxX - minX);
    const fy = 14;
    const main: number[] = [minX - 8, fy, minX + 0.14 * w, fy + 14, minX + 0.3 * w, fy + 18, minX + 0.52 * w, fy + 10,
      minX + 0.6 * w, fy + 2, minX + 0.72 * w, fy + 2, minX + 0.73 * w, fy + 10,
      minX + 0.74 * w, fy + 18, minX + 0.64 * w, fy + 18, minX + 0.63 * w, fy + 11,
      minX + 0.66 * w, fy + 14, minX + 0.82 * w, fy + 18, minX + 0.97 * w, fy + 10,
      minX + 1.02 * w, fy + 6, minX + 1.05 * w, fy + 4, minX + 1.08 * w, fy + 2];
    const echo: number[] = [minX - 4, fy + 10, minX + 0.2 * w, fy + 22, minX + 0.5 * w, fy + 22, minX + 0.95 * w, fy + 14];
    for (const flat of [main, echo]) {
      const pts = sampleStroke(flat, 0, 0, { ...pen, thick: pen.thick * 0.7, thin: pen.thin * 0.6 }, rng);
      // Flourishes taper away from their start.
      for (let i = 0; i < pts.length; i += 1) {
        const t = i / (pts.length - 1 || 1);
        pts[i].w *= 1 - 0.45 * t;
        pts[i].a = 0.62 + 0.2 * (1 - t);
      }
      strokes.push({ pts, isDot: false, isWordStart: true });
      track(pts);
    }
  }
  return { strokes, minX, maxX, minY, maxY };
};

type Layout = {
  strokes: RawStroke[];
  scale: number;
  pxW: number;
  pxH: number;
  offX: number;
  offY: number;
};

const buildLayout = (
  name: string,
  style: HandwritingStyle,
  showFlourish: boolean,
  availPx: number,
): Layout | null => {
  const built = buildStrokes(name, style, showFlourish);
  if (!built) return null;
  const padL = 10;
  const padT = 16;
  const padB = 14;
  const wUnits = built.maxX - built.minX + padL + 10;
  const hUnits = built.maxY - built.minY + padT + padB;
  const scale = Math.max(0.12, Math.min(0.62, availPx / wUnits));
  return {
    strokes: built.strokes,
    scale,
    pxW: Math.ceil(wUnits * scale),
    pxH: Math.ceil(hUnits * scale),
    offX: padL - built.minX,
    offY: padT - built.minY,
  };
};

/* ------------------------------ timeline ------------------------------ */

type InkBeat = { kind: 'ink'; stroke: RawStroke; cum: number[]; len: number; t0: number; dur: number };
type LiftBeat = { kind: 'lift'; x0: number; y0: number; x1: number; y1: number; t0: number; dur: number };
type RiseBeat = { kind: 'rise'; x: number; y: number; t0: number; dur: number };
type Beat = InkBeat | LiftBeat | RiseBeat;

const smoothstep = (t: number) => t * t * (3 - 2 * t);

const buildBeats = (strokes: RawStroke[], speed: number): { beats: Beat[]; total: number } => {
  const beats: Beat[] = [];
  let t = 0;
  let px = strokes[0].pts[0].x - 46;
  let py = strokes[0].pts[0].y - 64;
  for (const stroke of strokes) {
    const start = stroke.pts[0];
    const end = stroke.pts[stroke.pts.length - 1];
    const gap = Math.hypot(start.x - px, start.y - py);
    const liftDur = t === 0 ? 420 : Math.min(380, 70 + gap * (stroke.isWordStart ? 1.1 : 0.8));
    beats.push({ kind: 'lift', x0: px, y0: py, x1: start.x, y1: start.y, t0: t, dur: liftDur });
    t += liftDur;
    const cum: number[] = [0];
    for (let i = 1; i < stroke.pts.length; i += 1) cum.push(cum[i - 1] + dist(stroke.pts[i - 1], stroke.pts[i]));
    const len = cum[cum.length - 1];
    const dur = stroke.isDot ? 90 : Math.max(60, len / speed);
    beats.push({ kind: 'ink', stroke, cum, len, t0: t, dur });
    t += dur;
    px = end.x;
    py = end.y;
  }
  beats.push({ kind: 'rise', x: px, y: py, t0: t, dur: 460 });
  return { beats, total: t + 460 };
};

/* ------------------------------ rendering ----------------------------- */

const drawInkBeat = (
  ctx: CanvasRenderingContext2D,
  beat: InkBeat,
  target: number,
  scale: number,
  offX: number,
  offY: number,
  ink: string,
) => {
  const pts = beat.stroke.pts;
  if (beat.stroke.isDot) {
    if (target < beat.len * 0.4) return;
    const p = pts[pts.length - 1];
    ctx.globalAlpha = 0.97;
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc((p.x + offX) * scale, (p.y + offY) * scale, Math.max(2.6, p.w * 0.55) * scale, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.strokeStyle = ink;
  let i = 1;
  for (; i < pts.length && beat.cum[i] <= target; i += 1) {
    ctx.globalAlpha = (pts[i - 1].a + pts[i].a) / 2;
    ctx.lineWidth = Math.max(0.5, ((pts[i - 1].w + pts[i].w) / 2) * scale);
    ctx.beginPath();
    ctx.moveTo((pts[i - 1].x + offX) * scale, (pts[i - 1].y + offY) * scale);
    ctx.lineTo((pts[i].x + offX) * scale, (pts[i].y + offY) * scale);
    ctx.stroke();
  }
  if (i < pts.length && i > 1) {
    const prevCum = beat.cum[i - 1];
    const f = (target - prevCum) / (beat.cum[i] - prevCum || 1);
    const ax = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f;
    const ay = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f;
    ctx.globalAlpha = pts[i - 1].a;
    ctx.lineWidth = Math.max(0.5, pts[i - 1].w * scale);
    ctx.beginPath();
    ctx.moveTo((pts[i - 1].x + offX) * scale, (pts[i - 1].y + offY) * scale);
    ctx.lineTo((ax + offX) * scale, (ay + offY) * scale);
    ctx.stroke();
  }
  // Ink pools where the pen rests.
  const done = target >= beat.len;
  if (done && pts.length > 3) {
    const p = pts[pts.length - 1];
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc((p.x + offX) * scale, (p.y + offY) * scale, Math.max(0.7, p.w * 0.5 * scale), 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawShine = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, alpha: number) => {
  if (alpha <= 0.01) return;
  ctx.globalAlpha = 0.1 * alpha;
  ctx.fillStyle = '#14122e';
  ctx.beginPath();
  ctx.ellipse(x + 2.5 * s, y + 3.5 * s, 4.5 * s, 2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.2 * alpha;
  ctx.fillStyle = '#fffdf2';
  ctx.beginPath();
  ctx.arc(x, y, 5.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.55 * alpha;
  ctx.beginPath();
  ctx.arc(x, y, 1.9 * s, 0, Math.PI * 2);
  ctx.fill();
};

/** Position of the pen tip along an ink stroke at a given distance. */
const pointAt = (beat: InkBeat, target: number): { x: number; y: number } => {
  const pts = beat.stroke.pts;
  let i = 1;
  while (i < pts.length && beat.cum[i] < target) i += 1;
  if (i >= pts.length) return pts[pts.length - 1];
  const f = (target - beat.cum[i - 1]) / (beat.cum[i] - beat.cum[i - 1] || 1);
  return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f };
};

const drawFrame = (
  ctx: CanvasRenderingContext2D,
  beats: Beat[],
  t: number,
  total: number,
  layout: Layout,
  ink: string,
) => {
  const { scale, offX, offY } = layout;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let penX = 0;
  let penY = 0;
  let shineAlpha = 0;
  for (const beat of beats) {
    if (beat.kind === 'ink') {
      const local = t < beat.t0 ? 0 : Math.min(1, (t - beat.t0) / beat.dur);
      const target = smoothstep(local) * beat.len;
      drawInkBeat(ctx, beat, target, scale, offX, offY, ink);
      if (local > 0 && local < 1) {
        const tip = pointAt(beat, target);
        penX = (tip.x + offX) * scale;
        penY = (tip.y + offY) * scale;
        shineAlpha = 1;
      }
    } else if (beat.kind === 'lift') {
      const local = t < beat.t0 ? 0 : Math.min(1, (t - beat.t0) / beat.dur);
      const e = smoothstep(local);
      const liftH = Math.min(26, 10 + Math.hypot(beat.x1 - beat.x0, beat.y1 - beat.y0) * 0.08);
      penX = (beat.x0 + (beat.x1 - beat.x0) * e + offX) * scale;
      penY = (beat.y0 + (beat.y1 - beat.y0) * e - Math.sin(Math.PI * e) * liftH + offY) * scale;
      if (local > 0 && local < 1) shineAlpha = 1;
      else if (local >= 1) { penX = (beat.x1 + offX) * scale; penY = (beat.y1 + offY) * scale; }
    } else {
      const local = t < beat.t0 ? 0 : Math.min(1, (t - beat.t0) / beat.dur);
      const e = smoothstep(local);
      penX = (beat.x + offX) * scale;
      penY = (beat.y - e * 20 + offY) * scale;
      shineAlpha = 1 - e;
    }
  }
  if (t < total - 30 && shineAlpha > 0) {
    drawShine(ctx, penX, penY, scale, shineAlpha);
  }
  ctx.globalAlpha = 1;
};

/* ------------------------------ component ----------------------------- */

export const DEFAULT_NOTE =
  'Thank you for a wonderful year together. Your trust means everything to us — and there is a little of it in every piece we make.';

export default function SignOffSignature({
  note = DEFAULT_NOTE,
  name = 'Amelia Hart',
  handwritingStyle = 'elegant',
  inkColor = '#2c2a63',
  showFlourish = true,
  paperTone = 'cream',
  speed = 1,
  className,
}: SignOffSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef(0);
  const startedRef = useRef(false);
  const [availPx, setAvailPx] = useState(560);
  const [reduced, setReduced] = useState(false);
  const rate = Math.min(3, Math.max(0.25, Number.isFinite(speed) ? speed : 1));
  const [inView, setInView] = useState(false);

  const layout = useMemo(
    () => buildLayout(name, handwritingStyle, showFlourish, availPx),
    [name, handwritingStyle, showFlourish, availPx],
  );

  const timeline = useMemo(
    () => (layout ? buildBeats(layout.strokes, PEN[handwritingStyle].speed) : null),
    [layout, handwritingStyle],
  );

  // Respect reduced motion.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Size the canvas to its container, then to the drawing.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setAvailPx(Math.max(120, w));
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [layout !== null]);

  // Pause off-screen; draw only when visible.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const io = new IntersectionObserver((entries) => setInView(entries[0].isIntersecting), { threshold: 0.3 });
    io.observe(canvas);
    return () => io.disconnect();
  }, [layout !== null]);

  // The drawing loop (canvas work happens here, never during render).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout || !timeline) return;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(layout.pxW * dpr);
    canvas.height = Math.round(layout.pxH * dpr);
    canvas.style.width = `${layout.pxW}px`;
    canvas.style.height = `${layout.pxH}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    if (reduced || !inView) {
      if (reduced) drawFrame(ctx, timeline.beats, Infinity, timeline.total, layout, inkColor);
      return;
    }
    if (startedRef.current && elapsedRef.current >= timeline.total) {
      drawFrame(ctx, timeline.beats, Infinity, timeline.total, layout, inkColor);
      return;
    }
    startedRef.current = true;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      elapsedRef.current += Math.min(64, now - last) * rate;
      last = now;
      const t = elapsedRef.current;
      drawFrame(ctx, timeline.beats, t, timeline.total, layout, inkColor);
      if (t < timeline.total) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [layout, timeline, inkColor, reduced, inView, rate]);

  const rootStyle = { '--sos-ink': inkColor } as CSSProperties;

  return (
    <article
      className={`${styles.root}${className ? ` ${className}` : ''}`}
      data-tone={paperTone}
      style={rootStyle}
    >
      {note ? <p className={styles.note}>{note}</p> : null}
      {layout ? (
        <div className={styles.sigWrap} ref={wrapRef}>
          <canvas
            ref={canvasRef}
            className={styles.sig}
            width={0}
            height={0}
            role="img"
            aria-label={`Handwritten signature of ${name}`}
          />
        </div>
      ) : null}
    </article>
  );
}
```

```css
/* SignOffSignature — fountain-pen letter on laid paper. */

.root {
  --sos-paper: #f7efdf;
  --sos-paper-deep: #efe4cc;
  --sos-edge: rgba(74, 60, 24, 0.14);
  --sos-note-ink: #38332b;
  --sos-ink: #2c2a63;
  --sos-font-note: Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', serif;

  position: relative;
  display: block;
  inline-size: 100%;
  max-inline-size: 660px;
  margin-inline: auto;
  padding: clamp(26px, 5.5%, 46px);
  box-sizing: border-box;
  border-radius: 3px;
  border: 1px solid var(--sos-edge);
  background:
    radial-gradient(130% 90% at 18% 0%, rgba(255, 253, 244, 0.55), rgba(255, 253, 244, 0) 62%),
    repeating-linear-gradient(180deg, rgba(74, 60, 24, 0.028) 0 1px, rgba(0, 0, 0, 0) 1px 7px),
    repeating-linear-gradient(90deg, rgba(74, 60, 24, 0.034) 0 1px, rgba(0, 0, 0, 0) 1px 29px),
    linear-gradient(160deg, var(--sos-paper) 0%, var(--sos-paper-deep) 100%);
  box-shadow:
    0 1px 2px rgba(46, 36, 14, 0.1),
    0 26px 56px -30px rgba(46, 36, 14, 0.4);
  transform: rotate(-0.35deg);
  overflow: hidden;
  color: var(--sos-note-ink);
}

/* Paper grain, kept very quiet. */
.root::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.05;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
}

.root[data-tone='ivory'] {
  --sos-paper: #fbf7ec;
  --sos-paper-deep: #f3ecda;
  --sos-edge: rgba(74, 60, 24, 0.1);
}

.root[data-tone='white'] {
  --sos-paper: #fdfcf8;
  --sos-paper-deep: #f6f3ea;
  --sos-edge: rgba(74, 60, 24, 0.09);
}

.root::selection {
  background: var(--sos-ink);
  color: var(--sos-paper);
}

.note {
  margin: 0;
  font-family: var(--sos-font-note);
  font-style: italic;
  font-size: 21px;
  line-height: 1.68;
  letter-spacing: 0.004em;
  white-space: pre-line;
  text-wrap: pretty;
  color: var(--sos-note-ink);
  animation: sos-note-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both;
}

.sigWrap {
  display: flex;
  justify-content: flex-end;
  margin-block-start: 30px;
  inline-size: 100%;
}

.sig {
  display: block;
  flex: none;
}

@keyframes sos-note-in {
  from {
    opacity: 0;
    transform: translateY(7px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .note {
    animation: none;
  }
}
```
