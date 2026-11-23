Create a custom element called "Loupe Zoom Image". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: image, image description, zoom level, loupe size, rim color, caption, detail line, photo aspect ratio. Add other settings if they help.

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface LoupeZoomImageProps {
  image?: string;
  imageAlt?: string;
  caption?: string;
  detail?: string;
  zoom?: number;
  loupeSize?: number;
  rimColor?: string;
  aspectRatio?: string;
  className?: string;
}

/* Built-in product shot: a vector wristwatch on linen. Self-contained (no network, no fonts) so the
   stage is never empty, and razor sharp under the loupe at any zoom. Also the fallback if a photo fails. */
function buildWatchArt(): string {
  const f = (n: number) => n.toFixed(2);
  let sun = '';
  for (let i = 0; i < 90; i++) {
    sun += `<line transform="rotate(${i * 2})" y1="-318" y2="318" stroke="${i % 2 ? 'rgba(96,82,52,.07)' : 'rgba(255,255,255,.34)'}" stroke-width="1.1"/>`;
  }
  let rings = '';
  for (let r = 40; r < 318; r += 14) rings += `<circle r="${r}" fill="none" stroke="rgba(80,66,40,.035)" stroke-width="1"/>`;
  let ticks = '';
  for (let i = 0; i < 300; i++) {
    if (i % 25 === 0) continue;
    const major = i % 5 === 0;
    ticks += `<line transform="rotate(${f(i * 1.2)})" y1="-296" y2="${major ? -282 : -289}" stroke="#2a251c" stroke-width="${major ? 3 : 1.2}" stroke-linecap="round"/>`;
  }
  let batons = '';
  for (let i = 0; i < 12; i++) {
    if (i === 6) continue;
    const a = i * 30;
    if (i === 0) {
      batons += `<g transform="rotate(${a})"><rect x="-17" y="-284" width="12" height="74" rx="2.5" fill="url(#steel)" stroke="#6c6f74" stroke-width="1"/><rect x="5" y="-284" width="12" height="74" rx="2.5" fill="url(#steel)" stroke="#6c6f74" stroke-width="1"/><rect x="-14" y="-278" width="6" height="62" fill="#ecf2d2"/><rect x="8" y="-278" width="6" height="62" fill="#ecf2d2"/></g>`;
    } else {
      const wide = i % 3 === 0;
      const w = wide ? 20 : 14;
      batons += `<g transform="rotate(${a})"><rect x="${-w / 2}" y="-284" width="${w}" height="${wide ? 70 : 58}" rx="2.5" fill="url(#steel)" stroke="#6c6f74" stroke-width="1"/><rect x="${-w / 2 + 3.5}" y="-278" width="${w - 7}" height="${wide ? 58 : 46}" fill="#ecf2d2"/></g>`;
    }
  }
  let knurl = '';
  for (let i = 0; i < 150; i++) knurl += `<line transform="rotate(${f(i * 2.4)})" y1="-368" y2="-356" stroke="rgba(30,32,36,.22)" stroke-width="2.2"/>`;
  let subTicks = '';
  for (let i = 0; i < 60; i++) subTicks += `<line transform="rotate(${i * 6})" y1="-58" y2="${i % 5 ? -53 : -48}" stroke="#2a251c" stroke-width="${i % 5 ? 1 : 1.8}"/>`;

  const hand = (rot: number, body: string, lume: string) =>
    `<g transform="rotate(${rot})"><g transform="translate(9 13)" opacity=".3" filter="url(#blur)">${body.replace(/(fill|stroke)="(?!none)[^"]*"/g, '$1="#201808"')}</g>${body}${lume}</g>`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">` +
    `<defs>` +
    `<radialGradient id="bg" cx=".45" cy=".42" r=".8"><stop offset="0" stop-color="#ded7c8"/><stop offset="1" stop-color="#b6ae9b"/></radialGradient>` +
    `<pattern id="wv" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 .5H5" stroke="rgba(255,255,255,.2)"/><path d="M0 3H5" stroke="rgba(70,58,34,.12)"/><path d="M.5 0V5" stroke="rgba(255,255,255,.12)"/><path d="M3 0V5" stroke="rgba(70,58,34,.09)"/></pattern>` +
    `<linearGradient id="strap" x1="0" x2="1"><stop offset="0" stop-color="#150f0b"/><stop offset=".1" stop-color="#3a2b20"/><stop offset=".5" stop-color="#2b2018"/><stop offset=".9" stop-color="#3b2c21"/><stop offset="1" stop-color="#130d09"/></linearGradient>` +
    `<linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7f7f5"/><stop offset=".28" stop-color="#a7abb0"/><stop offset=".52" stop-color="#eef0f1"/><stop offset=".78" stop-color="#7b7f85"/><stop offset="1" stop-color="#d3d6d9"/></linearGradient>` +
    `<linearGradient id="steelRev" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#e9ebec"/><stop offset=".35" stop-color="#9a9ea3"/><stop offset=".6" stop-color="#f4f5f5"/><stop offset="1" stop-color="#85898f"/></linearGradient>` +
    `<radialGradient id="dial" cx=".38" cy=".33" r=".85"><stop offset="0" stop-color="#fffdf7"/><stop offset=".62" stop-color="#f0e9d8"/><stop offset="1" stop-color="#d9cfb7"/></radialGradient>` +
    `<radialGradient id="sub" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#f3ecdc"/><stop offset="1" stop-color="#d2c8af"/></radialGradient>` +
    `<linearGradient id="glare" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".6" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<clipPath id="dc"><circle r="318"/></clipPath>` +
    `<clipPath id="sc"><path d="M-205 -520H205L196 520H-196Z"/></clipPath>` +
    `<filter id="blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>` +
    `<filter id="blurL" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="22"/></filter>` +
    `<filter id="gr" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .05  0 0 0 0 .03  0 0 0 0 .02  0 0 0 1.1 -.42"/></filter>` +
    `<filter id="ln" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".6 .02" numOctaves="3" seed="9"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .25  0 0 0 0 .15  0 0 0 .5 -.12"/></filter>` +
    `</defs>` +
    `<rect width="1600" height="1000" fill="url(#bg)"/><rect width="1600" height="1000" fill="url(#wv)"/><rect width="1600" height="1000" filter="url(#ln)" opacity=".7"/>` +
    `<g transform="translate(720 500)">` +
    `<g transform="translate(26 40)" opacity=".42" filter="url(#blurL)"><circle r="372" fill="#2a2010"/><path d="M-200 -520H200L190 520H-190Z" fill="#2a2010"/></g>` +
    `<g clip-path="url(#sc)"><path d="M-205 -520H205L196 520H-196Z" fill="url(#strap)"/><rect x="-205" y="-520" width="410" height="1040" filter="url(#gr)" opacity=".8"/>` +
    `<path d="M-173 -520V520M173 -520V520" stroke="rgba(0,0,0,.45)" stroke-width="3" stroke-dasharray="15 10" stroke-linecap="round" transform="translate(1.5 2)"/>` +
    `<path d="M-173 -520V520M173 -520V520" stroke="#dcc790" stroke-width="2.6" stroke-dasharray="15 10" stroke-linecap="round"/>` +
    `<ellipse cx="0" cy="468" rx="12" ry="15" fill="#0d0907"/><ellipse cx="0" cy="466" rx="12" ry="14" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="1.5"/></g>` +
    `<g><rect x="205" y="-420" width="54" height="190" rx="18" fill="url(#steel)" stroke="#6b6e73"/><rect x="-259" y="-420" width="54" height="190" rx="18" fill="url(#steelRev)" stroke="#6b6e73"/><rect x="205" y="230" width="54" height="190" rx="18" fill="url(#steel)" stroke="#6b6e73"/><rect x="-259" y="230" width="54" height="190" rx="18" fill="url(#steelRev)" stroke="#6b6e73"/></g>` +
    `<rect x="364" y="-26" width="44" height="52" rx="9" fill="url(#steelRev)" stroke="#5f6267"/><path d="M376 -22V22M386 -22V22M396 -22V22" stroke="rgba(20,22,26,.3)" stroke-width="2"/>` +
    `<circle r="372" fill="url(#steel)" stroke="#5b5e63" stroke-width="2"/>${knurl}` +
    `<circle r="352" fill="url(#steelRev)" stroke="#55585d" stroke-width="2"/><circle r="330" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="3"/><circle r="324" fill="#5a5d62"/>` +
    `<circle r="318" fill="url(#dial)"/><g clip-path="url(#dc)">${rings}${sun}` +
    `<circle r="302" fill="none" stroke="rgba(60,48,26,.28)" stroke-width="1.4"/><circle r="302" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1" transform="translate(0 1.4)"/>` +
    `<circle r="310" fill="none" stroke="rgba(60,48,26,.13)" stroke-width="16"/>` +
    `${ticks}${batons}` +
    `<path d="M0 -190 l14 20 l-14 20 l-14 -20z" fill="url(#steel)" stroke="#6c6f74" stroke-width="1"/>` +
    `<g transform="translate(0 150)"><circle r="68" fill="url(#sub)"/><circle r="68" fill="none" stroke="rgba(60,48,26,.4)" stroke-width="2"/><circle r="64" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1"/>${subTicks}<line x1="0" y1="9" x2="0" y2="-44" stroke="#2a251c" stroke-width="2.4" transform="rotate(118)"/><circle r="5" fill="#2a251c"/></g>` +
    `</g>` +
    hand(305, `<path d="M0 -196 L13 -150 L10 -22 L-10 -22 L-13 -150Z" fill="url(#steel)" stroke="#5f6267" stroke-width="1.2"/>`, `<path d="M0 -178 L6.5 -148 L5 -46 L-5 -46 L-6.5 -148Z" fill="#ecf2d2"/>`) +
    hand(60, `<path d="M0 -284 L11 -236 L8.5 -22 L-8.5 -22 L-11 -236Z" fill="url(#steel)" stroke="#5f6267" stroke-width="1.2"/>`, `<path d="M0 -268 L5.5 -232 L4 -46 L-4 -46 L-5.5 -232Z" fill="#ecf2d2"/>`) +
    hand(162, `<path d="M0 -296 V70" fill="none" stroke="#b8442a" stroke-width="3.2" stroke-linecap="round"/>`, `<circle cy="42" r="10" fill="#b8442a"/>`) +
    `<circle r="16" fill="url(#steel)" stroke="#5f6267" stroke-width="1.5"/><circle r="6" fill="#2a251c"/>` +
    `<g clip-path="url(#dc)"><ellipse cx="-110" cy="-150" rx="270" ry="105" transform="rotate(-36 -110 -150)" fill="url(#glare)"/></g>` +
    `</g></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const WATCH_ART = buildWatchArt();

const REST = { x: 0.52, y: 0.6, tilt: -9, scale: 0.94 };
const STIFF = 120;
const DAMP = 15;
const TILT_STIFF = 120;
const TILT_DAMP = 13;
const KEY_STEP = 0.07;
const TAP_MS = 260;
const TAP_DIST = 14;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const clampFrac = (v: number) => clamp(v, -0.08, 1.08);

const LOUPE_HELP =
  'Move the pointer over the image to inspect it through the loupe. Arrow keys move the loupe; Escape sets it back down. On a touch screen, tap to place the loupe, or hold and drag to move it above your finger.';

type Mode = 'idle' | 'pointer' | 'key' | 'touch';

interface MotionState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tilt: number;
  vTilt: number;
  scale: number;
  vScale: number;
}

interface TargetState {
  mode: Mode;
  x: number;
  y: number;
}

export default function LoupeZoomImage({
  image = WATCH_ART,
  imageAlt = 'Silver wristwatch with a cream dial on a dark leather strap, lying on linen',
  caption = 'Sterling wristwatch, ref. 1948',
  detail = 'Polished silver case, enamel dial with a sunburst finish, hand-wound movement',
  zoom = 2.6,
  loupeSize = 320,
  rimColor = '#b08a3c',
  aspectRatio = '16 / 10',
  className,
}: LoupeZoomImageProps) {
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [broken, setBroken] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const lensImgRef = useRef<HTMLImageElement>(null);
  const shadowRef = useRef<HTMLSpanElement>(null);
  const photoRef = useRef<HTMLImageElement>(null);

  const sizeRef = useRef({ w: 0, h: 0 });
  // Which way the handle points (mirrored toward the side of the frame with room), with hysteresis.
  const handleDir = useRef({ x: 1, y: 1 });
  const zoomRef = useRef(2.6);
  const lensPxRef = useRef(320);
  const motion = useRef<MotionState>({
    x: REST.x,
    y: REST.y,
    vx: 0,
    vy: 0,
    tilt: REST.tilt,
    vTilt: 0,
    scale: REST.scale,
    vScale: 0,
  });
  const target = useRef<TargetState>({ mode: 'idle', x: REST.x, y: REST.y });
  const toggled = useRef(false);
  const touchStart = useRef({ t: 0, x: 0, y: 0, moved: 0 });

  const zoomLevel = clamp(zoom, 1.4, 4);
  zoomRef.current = zoomLevel;
  lensPxRef.current = clamp(loupeSize, 140, 440);

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
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  /* A photo that fails (bad URL, blocked host, failed before hydration) falls back to the built-in shot. */
  useEffect(() => {
    setBroken(false);
    const img = photoRef.current;
    if (img && img.complete && img.naturalWidth === 0 && image) setBroken(true);
  }, [image]);

  const paint = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const { w, h } = sizeRef.current;
    const s = lensPxRef.current;
    const z = zoomRef.current;
    const m = motion.current;
    const set = (k: string, v: string) => frame.style.setProperty(k, v);
    set('--lz-tx', `${(m.x * w).toFixed(1)}px`);
    set('--lz-ty', `${(m.y * h).toFixed(1)}px`);
    set('--lz-scale', m.scale.toFixed(3));
    set('--lz-tilt', `${m.tilt.toFixed(2)}deg`);
    const gx = clamp(m.vx * w * 0.05, -11, 11);
    const gy = clamp(m.vy * h * 0.05, -11, 11);
    set('--lz-gx', `${gx.toFixed(1)}px`);
    set('--lz-gy', `${gy.toFixed(1)}px`);
    set('--lz-drag', `${(-gx * 1.1).toFixed(1)}px`);
    set('--lz-mx', `${(-(m.x * w * z - s / 2)).toFixed(1)}px`);
    set('--lz-my', `${(-(m.y * h * z - s / 2)).toFixed(1)}px`);

    // Keep the handle inside the frame: point it toward the side with more room, and shorten it if neither fits.
    const reach = s * 0.95;
    const hd = handleDir.current;
    const px = m.x * w;
    const py = m.y * h;
    const stick = s * 0.12;
    if (hd.x > 0 ? w - px < reach && px > w - px + stick : px < w - px - stick) hd.x = -hd.x;
    if (hd.y > 0 ? h - py < reach && py > h - py + stick : py < h - py - stick) hd.y = -hd.y;
    const roomX = hd.x > 0 ? w - px : px;
    const roomY = hd.y > 0 ? h - py : py;
    const k = clamp(Math.min(roomX, roomY) / reach, 0.55, 1);
    set('--lz-hx', String(hd.x));
    set('--lz-hy', String(hd.y));
    set('--lz-hk', k.toFixed(3));
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    const lensImg = lensImgRef.current;
    const lens = lensRef.current;
    const shadow = shadowRef.current;
    if (!frame) return;
    const apply = () => {
      const rect = frame.getBoundingClientRect();
      sizeRef.current = { w: rect.width, h: rect.height };
      lensPxRef.current = clamp(
        Math.min(clamp(loupeSize, 140, 440), rect.width * 0.52, rect.height * 0.8),
        96,
        440,
      );
      frame.style.setProperty('--lz-size', `${lensPxRef.current.toFixed(1)}px`);
      if (lensImg) {
        const z = zoomRef.current;
        lensImg.style.width = `${(rect.width * z).toFixed(1)}px`;
        lensImg.style.height = `${(rect.height * z).toFixed(1)}px`;
      }
      if (lens) lens.style.opacity = '1';
      if (shadow) shadow.style.opacity = '1';
      paint();
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [paint, zoomLevel, loupeSize]);

  useEffect(() => {
    if (reduced) {
      const t = target.current;
      const m = motion.current;
      m.x = t.x;
      m.y = t.y;
      m.vx = 0;
      m.vy = 0;
      m.tilt = t.mode === 'idle' ? REST.tilt : 0;
      m.vTilt = 0;
      m.scale = t.mode === 'idle' ? REST.scale : 1;
      m.vScale = 0;
      paint();
      return;
    }
    if (!inView) return;
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const t = target.current;
      const m = motion.current;
      const engaged = t.mode !== 'idle';
      let ty = t.y;
      let tTilt = engaged ? 0 : REST.tilt;
      if (!engaged) {
        const s = now / 1000;
        ty += Math.sin(s * 0.85) * 0.004;
        tTilt += Math.sin(s * 0.85 + 1.1) * 1.3;
      }
      const tScale = engaged ? 1 : REST.scale;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let n = 0; n < steps; n++) {
        m.vx += (STIFF * (t.x - m.x) - DAMP * m.vx) * h;
        m.vy += (STIFF * (ty - m.y) - DAMP * m.vy) * h;
        m.x += m.vx * h;
        m.y += m.vy * h;
        m.vTilt += (TILT_STIFF * (tTilt - m.tilt) - TILT_DAMP * m.vTilt) * h;
        m.tilt += m.vTilt * h;
        m.vScale += (STIFF * (tScale - m.scale) - DAMP * m.vScale) * h;
        m.scale += m.vScale * h;
      }
      paint();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [reduced, inView, paint]);

  const framePoint = (clientX: number, clientY: number) => {
    const frame = frameRef.current;
    if (!frame) return null;
    const rect = frame.getBoundingClientRect();
    return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height };
  };

  const engage = useCallback(
    (mode: Mode, x: number, y: number) => {
      const t = target.current;
      t.mode = mode;
      t.x = clampFrac(x);
      t.y = clampFrac(y);
      if (reduced) {
        const m = motion.current;
        m.x = t.x;
        m.y = t.y;
        m.vx = 0;
        m.vy = 0;
        m.tilt = mode === 'idle' ? REST.tilt : 0;
        m.vTilt = 0;
        m.scale = mode === 'idle' ? REST.scale : 1;
        m.vScale = 0;
        paint();
      }
    },
    [reduced, paint],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    touchStart.current = { t: performance.now(), x: e.clientX, y: e.clientY, moved: 0 };
    const p = framePoint(e.clientX, e.clientY - lensPxRef.current * 0.62);
    if (p) engage('touch', p.x, p.y);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') {
      const p = framePoint(e.clientX, e.clientY);
      if (p) engage('pointer', p.x, p.y);
      return;
    }
    const st = touchStart.current;
    if (!st.t) return;
    st.moved = Math.max(st.moved, Math.hypot(e.clientX - st.x, e.clientY - st.y));
    const p = framePoint(e.clientX, e.clientY - lensPxRef.current * 0.62);
    if (p) engage('touch', p.x, p.y);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    const st = touchStart.current;
    if (!st.t) return;
    const quick = performance.now() - st.t < TAP_MS && st.moved < TAP_DIST;
    touchStart.current = { t: 0, x: 0, y: 0, moved: 0 };
    if (quick && toggled.current) {
      toggled.current = false;
      engage('idle', REST.x, REST.y);
      return;
    }
    toggled.current = true;
    engage('key', target.current.x, target.current.y);
  };

  const onPointerCancel = () => {
    touchStart.current = { t: 0, x: 0, y: 0, moved: 0 };
    if (!toggled.current) engage('idle', REST.x, REST.y);
  };

  const onPointerLeave = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    engage('idle', REST.x, REST.y);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      toggled.current = false;
      engage('idle', REST.x, REST.y);
      return;
    }
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, -KEY_STEP],
      ArrowDown: [0, KEY_STEP],
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    toggled.current = true;
    const t = target.current;
    const base = t.mode === 'idle' ? motion.current : t;
    engage('key', base.x + move[0], base.y + move[1]);
  };

  const onBlur = () => {
    toggled.current = false;
    engage('idle', REST.x, REST.y);
  };

  const useArt = !image || broken;
  const src = useArt ? WATCH_ART : image;
  const photoAlt = imageAlt || caption || 'Zoomable image';
  const magLabel = `×${zoomLevel % 1 === 0 ? zoomLevel.toFixed(0) : zoomLevel.toFixed(1)}`;
  const rootStyle = {
    '--lz-rim': rimColor,
    '--lz-size': `${clamp(loupeSize, 140, 440)}px`,
    '--lz-zoom': zoomLevel,
  } as CSSProperties;
  const frameStyle = { aspectRatio } as CSSProperties;

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <span className={styles.grain} aria-hidden="true" />

      <div
        className={styles.stage}
        tabIndex={0}
        role="group"
        aria-label={photoAlt}
        aria-description={LOUPE_HELP}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerLeave}
      >
        <div ref={frameRef} className={styles.frame} style={frameStyle}>
          <img
            ref={photoRef}
            className={styles.photo}
            src={src}
            alt=""
            draggable={false}
            onError={() => setBroken(true)}
          />
          <span className={styles.lensShadow} ref={shadowRef} aria-hidden="true" />
          <div ref={lensRef} className={styles.lens} aria-hidden="true">
            <span className={styles.handle}>
              <span className={styles.ferrule} />
              <span className={styles.grip} />
              <span className={styles.cap} />
            </span>
            <span className={styles.rim} />
            <span className={styles.bezel} />
            <span className={styles.view}>
              <img ref={lensImgRef} className={styles.lensImage} src={src} alt="" draggable={false} />
              <span className={styles.depth} />
              <span className={styles.fringe} />
              <span className={styles.curved} />
              <span className={styles.glint} />
            </span>
          </div>
        </div>
      </div>

      <div className={styles.caption}>
        <div className={styles.captionText}>
          <h3 className={styles.captionTitle}>{caption}</h3>
          {detail && <p className={styles.captionDetail}>{detail}</p>}
        </div>
        <span className={styles.mag}>{magLabel}</span>
      </div>
    </div>
  );
}
```

```css
/* Jeweller's bench — linen, a polished brass loupe, ebony grip, a bleeding product print */

@font-face {
  font-family: 'Schibsted Grotesk';
  src: url('./fonts/schibsted-500.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Schibsted Grotesk';
  src: url('./fonts/schibsted-700.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

.root {
  --lz-rim: #b08a3c;
  --lz-size: 320px;
  --lz-zoom: 2.6;
  --lz-linen: #ebe5d7;
  --lz-linen-deep: #ddd4c1;
  --lz-ink: #261f14;
  --lz-muted: #5a5242;
  --lz-font-display: 'Schibsted Grotesk', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --lz-font-ui: 'Schibsted Grotesk', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --lz-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.42  0 0 0 0 0.38  0 0 0 0 0.3  0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  display: grid;
  border-radius: 22px;
  background:
    repeating-linear-gradient(0deg, transparent 0 3px, rgba(112, 98, 70, 0.05) 3px 4px),
    repeating-linear-gradient(90deg, transparent 0 3px, rgba(112, 98, 70, 0.05) 3px 4px),
    linear-gradient(180deg, var(--lz-linen) 0%, var(--lz-linen-deep) 100%);
  color: var(--lz-ink);
  font-family: var(--lz-font-ui);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--lz-ink) 10%, transparent),
    0 30px 60px -34px rgba(52, 40, 18, 0.55);
}

.grain {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: var(--lz-noise);
  opacity: 0.16;
  mix-blend-mode: multiply;
}

.stage {
  position: relative;
  z-index: 2;
  outline: none;
  user-select: none;
  touch-action: pan-y pinch-zoom;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

.stage:focus-visible {
  box-shadow: inset 0 0 0 3px var(--lz-linen), inset 0 0 0 5px var(--lz-rim);
}

@media (hover: hover) and (pointer: fine) {
  .stage {
    cursor: none;
  }
}

.frame {
  --lz-tx: 0px;
  --lz-ty: 0px;
  --lz-scale: 0.94;
  --lz-tilt: -9deg;
  --lz-gx: 0px;
  --lz-gy: 0px;
  --lz-drag: 0px;
  --lz-mx: 0px;
  --lz-my: 0px;

  position: relative;
  min-block-size: 220px;
  background: #cbc3b0;
  box-shadow: 0 1px 0 color-mix(in srgb, var(--lz-rim) 45%, transparent);
}

.photo {
  position: absolute;
  inset: 0;
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

/* ---------- the loupe ---------- */

.lensShadow {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  z-index: 2;
  inline-size: calc(var(--lz-size) * 0.98);
  aspect-ratio: 1;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(closest-side, rgba(36, 26, 8, 0.5) 0%, rgba(36, 26, 8, 0.22) 66%, transparent 100%);
  filter: blur(13px);
  transform:
    translate3d(calc(var(--lz-tx) + var(--lz-drag)), calc(var(--lz-ty) + var(--lz-size) * 0.07), 0)
    translate(-50%, -50%)
    scale(var(--lz-scale));
}

.lens {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  z-index: 3;
  inline-size: var(--lz-size);
  aspect-ratio: 1;
  pointer-events: none;
  opacity: 0;
  will-change: transform;
  filter: drop-shadow(0 3px 3px rgba(30, 22, 6, 0.4));
  transform:
    translate3d(var(--lz-tx), var(--lz-ty), 0)
    translate(-50%, -50%)
    rotate(var(--lz-tilt))
    scale(var(--lz-scale));
}

/* handle: brass ferrule, ebony grip with a turned rib pattern, brass end cap */
.handle {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: calc(50% - var(--lz-size) * 0.07);
  inline-size: calc(var(--lz-size) * 0.14);
  block-size: calc(var(--lz-size) * 1.2);
  transform-origin: 50% 0;
  /* mirrored toward the side of the frame with room (--lz-hx/--lz-hy) and shortened to fit (--lz-hk) */
  transform: scale(var(--lz-hx, 1), var(--lz-hy, 1)) rotate(-45deg) scale(1, var(--lz-hk, 1));
  transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

@media (prefers-reduced-motion: reduce) {
  .handle {
    transition: none;
  }
}

.ferrule {
  position: absolute;
  inset-block-start: calc(var(--lz-size) * 0.4);
  inset-inline: 0;
  block-size: calc(var(--lz-size) * 0.24);
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--lz-rim), #000 58%) 0%,
    color-mix(in srgb, var(--lz-rim), #fff 52%) 26%,
    color-mix(in srgb, var(--lz-rim), #000 8%) 54%,
    color-mix(in srgb, var(--lz-rim), #000 62%) 100%
  );
  clip-path: polygon(24% 0, 76% 0, 100% 100%, 0 100%);
}

.grip {
  position: absolute;
  inset-block-start: calc(var(--lz-size) * 0.6);
  inset-inline: 9%;
  block-size: calc(var(--lz-size) * 0.5);
  background:
    repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0 2px, transparent 2px calc(var(--lz-size) * 0.055)),
    linear-gradient(90deg, #070504 0%, #4b3b2b 26%, #1b140d 56%, #060403 100%);
  clip-path: polygon(0 0, 100% 0, 112% 100%, -12% 100%);
}

.cap {
  position: absolute;
  inset-block-start: calc(var(--lz-size) * 1.07);
  inset-inline: -7%;
  block-size: calc(var(--lz-size) * 0.12);
  border-radius: 45% 45% 50% 50%;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--lz-rim), #000 58%) 0%,
    color-mix(in srgb, var(--lz-rim), #fff 56%) 30%,
    color-mix(in srgb, var(--lz-rim), #000 12%) 62%,
    color-mix(in srgb, var(--lz-rim), #000 60%) 100%
  );
}

/* the thick polished brass rim */
.rim {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(
    from 210deg,
    color-mix(in srgb, var(--lz-rim), #fff 62%) 0%,
    color-mix(in srgb, var(--lz-rim), #000 14%) 12%,
    color-mix(in srgb, var(--lz-rim), #fff 34%) 26%,
    color-mix(in srgb, var(--lz-rim), #000 42%) 45%,
    color-mix(in srgb, var(--lz-rim), #fff 66%) 60%,
    color-mix(in srgb, var(--lz-rim), #fff 6%) 74%,
    color-mix(in srgb, var(--lz-rim), #000 22%) 86%,
    color-mix(in srgb, var(--lz-rim), #fff 62%) 100%
  );
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--lz-rim), #000 62%),
    inset 0 2px 1px color-mix(in srgb, var(--lz-rim), #fff 74%),
    inset 0 -3px 5px color-mix(in srgb, var(--lz-rim), #000 52%);
}

/* inner stepped bezel, catches light opposite the outer edge */
.bezel {
  position: absolute;
  inset: calc(var(--lz-size) * 0.052);
  border-radius: 50%;
  background: conic-gradient(
    from 30deg,
    color-mix(in srgb, var(--lz-rim), #000 52%),
    color-mix(in srgb, var(--lz-rim), #fff 40%),
    color-mix(in srgb, var(--lz-rim), #000 40%),
    color-mix(in srgb, var(--lz-rim), #fff 30%),
    color-mix(in srgb, var(--lz-rim), #000 52%)
  );
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--lz-rim), #000 66%);
}

.view {
  position: absolute;
  inset: calc(var(--lz-size) * 0.082);
  border-radius: 50%;
  overflow: hidden;
  background: #211b10;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--lz-rim), #000 62%),
    inset 0 3px 10px rgba(24, 18, 6, 0.55);
}

.lensImage {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  inline-size: calc(var(--lz-zoom) * 100%);
  block-size: calc(var(--lz-zoom) * 100%);
  max-inline-size: none;
  object-fit: cover;
  user-select: none;
  will-change: transform;
  transform: translate3d(var(--lz-mx), var(--lz-my), 0);
}

/* thick-glass edge: darkens and bends toward the rim */
.depth {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(closest-side, transparent 66%, rgba(20, 14, 4, 0.18) 88%, rgba(20, 14, 4, 0.5) 100%);
}

/* chromatic fringe: red and blue dispersion at the glass edge */
.fringe {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
  box-shadow:
    inset 4px 0 7px rgba(255, 52, 52, 0.55),
    inset -4px 0 7px rgba(52, 118, 255, 0.6),
    inset 0 4px 7px rgba(90, 255, 170, 0.22),
    inset 0 -4px 7px rgba(255, 70, 200, 0.2);
  mix-blend-mode: screen;
  opacity: 0.8;
}

/* curved glare: a crescent hugging the upper-left of the glass, drifting with velocity */
.curved {
  position: absolute;
  inset: 3%;
  border-radius: 50%;
  pointer-events: none;
  background: linear-gradient(142deg, rgba(255, 255, 255, 0.78) 0%, rgba(255, 255, 255, 0.2) 38%, transparent 56%);
  -webkit-mask-image: radial-gradient(ellipse 54% 54% at 60% 62%, transparent 95%, #000 100%);
  mask-image: radial-gradient(ellipse 54% 54% at 60% 62%, transparent 95%, #000 100%);
  transform: translate3d(var(--lz-gx), var(--lz-gy), 0);
  mix-blend-mode: screen;
}

.glint {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
  background:
    radial-gradient(5% 4.5% at 70% 12%, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.25) 50%, transparent 78%),
    radial-gradient(22% 9% at 30% 90%, rgba(255, 255, 255, 0.2) 0%, transparent 100%),
    linear-gradient(210deg, rgba(255, 255, 255, 0.1) 0%, transparent 34%);
  transform: translate3d(var(--lz-gx), var(--lz-gy), 0);
  mix-blend-mode: screen;
}

/* ---------- caption ---------- */

.caption {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: clamp(18px, 3.4cqi, 34px) clamp(20px, 4cqi, 40px) clamp(20px, 3.6cqi, 36px);
}

.captionText {
  min-inline-size: 0;
  display: grid;
  gap: 6px;
}

.captionTitle {
  margin: 0;
  font-family: var(--lz-font-display);
  font-size: clamp(20px, 3.3cqi, 30px);
  font-weight: 700;
  line-height: 1.14;
  letter-spacing: -0.02em;
  color: var(--lz-ink);
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.captionDetail {
  margin: 0;
  max-inline-size: 52ch;
  font-size: clamp(14px, 1.9cqi, 16px);
  font-weight: 500;
  line-height: 1.5;
  color: var(--lz-muted);
  overflow-wrap: anywhere;
}

.mag {
  flex: none;
  padding: 4px 12px;
  border: 1px solid color-mix(in srgb, var(--lz-rim) 70%, transparent);
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  color: color-mix(in srgb, var(--lz-rim), #000 52%);
  white-space: nowrap;
}

.captionTitle::selection,
.captionDetail::selection {
  background: color-mix(in srgb, var(--lz-rim) 30%, transparent);
}
```
