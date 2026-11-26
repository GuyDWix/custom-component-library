import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, MutableRefObject, RefObject, KeyboardEvent, PointerEvent, WheelEvent } from 'react';
import styles from './Component.module.css';

export interface ScanStripCard {
  image: string;
  imageAlt: string;
  twinTitle: string;
  twinLines: string[];
}

export interface ScanStripProps {
  cards?: ScanStripCard[];
  speed?: number;
  direction?: 'left' | 'right';
  particles?: number;
  className?: string;
}

export const defaultCards: ScanStripCard[] = [
  {
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=640&h=800&fit=crop',
    imageAlt: 'Over-ear headphones on a pale surface',
    twinTitle: 'Studio Over-Ear',
    twinLines: ['Drivers 40 mm beryllium', 'Response 8 Hz to 40 kHz', 'Weight 265 g', 'Battery 38 h, USB-C'],
  },
  {
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=640&h=800&fit=crop',
    imageAlt: 'Red running shoe tilted on a red background',
    twinTitle: 'Tempo Runner',
    twinLines: ['Drop 8 mm', 'Midsole nitrogen foam', 'Weight 238 g', 'Sizes EU 36 to 47'],
  },
  {
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=640&h=800&fit=crop',
    imageAlt: 'Wristwatch with a white dial',
    twinTitle: 'Field Watch 38',
    twinLines: ['Case 38 mm steel', 'Movement automatic, 42 h', 'Glass sapphire', 'Water resistance 100 m'],
  },
  {
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=640&h=800&fit=crop',
    imageAlt: 'Camera lens and body on a table',
    twinTitle: 'Frame Mk II',
    twinLines: ['Sensor 24 MP full frame', 'Burst 12 fps', 'Weight 640 g', 'Weather sealed body'],
  },
  {
    image: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=640&h=800&fit=crop',
    imageAlt: 'White sneaker on a grey backdrop',
    twinTitle: 'Court Low',
    twinLines: ['Upper full-grain leather', 'Sole natural rubber', 'Weight 310 g', 'Resoleable'],
  },
];

const FRICTION = 0.95;
const BEAM_HALF = 2;
const MAX_VELOCITY = 2400;

type Rgb = [number, number, number];
type Dust = { x: number; y: number; vx: number; vy: number; r: number; a: number; life: number; decay: number; t: number; tw: number; amb: boolean };

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const mixWhite = (c: Rgb, k: number): Rgb => [c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k];
const rgba = (c: Rgb, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

function parseColor(ctx: CanvasRenderingContext2D, css: string): Rgb {
  ctx.fillStyle = '#ff5b2e';
  ctx.fillStyle = css;
  const v = String(ctx.fillStyle);
  if (v.startsWith('#')) return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
  const m = v.match(/[\d.]+/g);
  return m ? [+m[0], +m[1], +m[2]] : [255, 91, 46];
}

const gauss = (d: number, k = 4) => (Math.exp(-d * d * k) - Math.exp(-k)) / (1 - Math.exp(-k));

function makeSprite(c: Rgb): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 32;
  const g = cv.getContext('2d');
  if (!g) return cv;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  const hot = mixWhite(c, 0.7);
  for (let i = 0; i <= 10; i++) {
    const d = i / 10;
    grad.addColorStop(d, rgba(i < 4 ? hot : c, gauss(d, 3.2)));
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return cv;
}

function useBeamLayer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  st: MutableRefObject<{ vel: number; scanning: boolean }>,
  opts: { active: boolean; density: number; baseSpeed: number; side: 1 | -1 },
) {
  const { active, density, baseSpeed, side } = opts;
  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const col = parseColor(ctx, getComputedStyle(cv).getPropertyValue('--accent'));
    const light = mixWhite(col, 0.6);
    const sprite = makeSprite(col);
    const pool: Dust[] = [];
    let w = 0;
    let h = 0;
    let glow = 1;
    let acc = 0;
    let scan = 0;
    let raf = 0;

    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    type Layer = { half: number; alpha: number; widen: number; core?: boolean; img?: HTMLCanvasElement };
    const layers: Layer[] = [
      { half: 56, alpha: 0.1, widen: 0.9 },
      { half: 20, alpha: 0.2, widen: 0.7 },
      { half: 6, alpha: 0.42, widen: 0.5 },
      { half: 1.3, alpha: 1, widen: 0.1, core: true },
    ];
    const smooth = (e: number) => e * e * (3 - 2 * e);
    const buildLayers = () => {
      const dpr = cv.width / Math.max(1, w);
      const pad = Math.max(1, ((cv.parentElement?.clientHeight ?? h) - h) / -2) * dpr;
      layers.forEach((L) => {
        const img = document.createElement('canvas');
        img.width = Math.max(2, Math.ceil(L.half * 2 * dpr));
        img.height = cv.height;
        const g = img.getContext('2d');
        if (!g) return;
        const cx = img.width / 2;
        const c = L.core ? light : col;
        for (let y = 0; y < img.height; y++) {
          const e = clamp(Math.min(y, img.height - 1 - y) / pad, 0, 1);
          const fade = smooth(e);
          const half = cx * Math.max(0.04, Math.pow(e, 0.8));
          const grad = g.createLinearGradient(cx - half, 0, cx + half, 0);
          for (let i = 0; i <= 12; i++) {
            const t = i / 12;
            const a = gauss(Math.abs(t * 2 - 1), L.core ? 6 : 4.2) * fade;
            grad.addColorStop(t, L.core ? `rgba(255,255,255,${a})` : rgba(c, a));
          }
          g.fillStyle = grad;
          g.fillRect(cx - half, y, half * 2, 1);
        }
        L.img = img;
      });
    };

    const drawBeam = (t: number, scan: number) => {
      const x = w / 2;
      const flick = 1 + Math.sin(t * 0.021) * 0.04 + Math.sin(t * 0.0073 + 1.3) * 0.05 + (Math.random() - 0.5) * 0.05;
      const k = glow * flick;
      ctx.globalCompositeOperation = 'lighter';
      layers.forEach((L) => {
        if (!L.img) return;
        const lw = L.half * 2 * (1 + L.widen * scan);
        ctx.globalAlpha = clamp(L.alpha * k * (L.core ? 1 : 0.6 + 0.4 * scan + (L === layers[0] ? scan : 0)), 0, 1);
        ctx.drawImage(L.img, x - lw / 2, 0, lw, h);
      });
      ctx.globalAlpha = 1;
    };

    const spawn = (amb: boolean, scan: number, boost: number) => {
      const x = w / 2;
      pool.push(
        amb
          ? { x: x + side * rand(20, w * 0.35), y: rand(h * 0.2, h * 0.8), vx: -side * rand(0.08, 0.35), vy: rand(-0.06, 0.06), r: rand(0.4, 0.9), a: rand(0.12, 0.35), life: 1, decay: rand(0.004, 0.01), t: 0, tw: rand(0.02, 0.06), amb }
          : { x: x + rand(-1.5, 1.5), y: rand(h * 0.2, h * 0.8), vx: side * rand(0.3, 1.6) * boost * (1 + scan * 0.6), vy: rand(-0.2, 0.2), r: (0.4 + Math.pow(Math.random(), 3.5) * 2.2) * (1 + scan * 0.3), a: rand(0.35, 1), life: 1, decay: rand(0.008, 0.03) * (2 - scan * 0.5), t: 0, tw: rand(0.03, 0.09), amb },
      );
    };

    const frame = (now: number, dt: number) => {
      const scanTarget = st.current.scanning ? 1 : 0;
      scan += (scanTarget - scan) * Math.min(1, dt * 3);
      glow += ((1 + scan * 0.9) - glow) * Math.min(1, dt * 3);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, w, h);
      drawBeam(now, scan);
      if (density <= 0) return;
      const boost = 1 + clamp(Math.abs(st.current.vel) / baseSpeed - 1, 0, 3) * 0.5;
      const cap = Math.round((80 + density * 12) * (1 + scan * 2.2));
      acc += (0.8 + density * 0.05) * (1 + scan * 2.5) * boost * dt * 60;
      while (acc >= 1) {
        acc -= 1;
        if (pool.length < cap) spawn(false, scan, boost);
      }
      const ambCount = pool.reduce((n, p) => n + (p.amb ? 1 : 0), 0);
      if (ambCount < density * 0.5 && Math.random() < 0.3) spawn(true, scan, 1);
      ctx.globalCompositeOperation = 'source-over';
      const bx = w / 2;
      const fz = h * 0.3;
      const f = dt * 60;
      for (let i = pool.length - 1; i >= 0; i--) {
        const p = pool[i];
        p.x += p.vx * f;
        p.y += p.vy * f;
        p.t += f;
        p.life -= p.decay * f;
        if (p.life <= 0 || p.x < -10 || p.x > w + 10 || (p.amb && (p.x - bx) * side < 0)) {
          pool[i] = pool[pool.length - 1];
          pool.pop();
          continue;
        }
        const edge = Math.min(1, p.y / fz, (h - p.y) / fz);
        const a = (p.a * p.life + Math.sin(p.t * p.tw) * 0.15) * Math.max(0, edge);
        if (a <= 0.01) continue;
        ctx.globalAlpha = Math.min(1, a);
        ctx.drawImage(sprite, p.x - p.r * 1.5, p.y - p.r * 1.5, p.r * 3, p.r * 3);
      }
      ctx.globalAlpha = 1;
    };

    size();
    buildLayers();
    const ro = new ResizeObserver(() => {
      size();
      buildLayers();
      if (!active) frame(0, 0.016);
    });
    ro.observe(cv);

    if (active) {
      let last = performance.now();
      const loop = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        frame(now, dt);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    } else {
      st.current.scanning = false;
      frame(0, 0.016);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [canvasRef, st, active, density, baseSpeed, side]);
}

const pad = (n: number) => String(n).padStart(2, '0');

type Item = { key: string; i: number; hidden: boolean };

export default function ScanStrip({
  cards = defaultCards,
  speed = 70,
  direction = 'left',
  particles = 60,
  className,
}: ScanStripProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);
  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [dims, setDims] = useState({ w: 0, card: 280, gap: 28 });
  const st = useRef({ pos: 0, vel: 0, drag: false, lastX: 0, lastT: 0, mv: 0, step: 0, scanned: new Set<number>(), scanning: false });

  const stride = dims.card + dims.gap;
  const loop = Math.max(1, cards.length) * stride;
  const copies = reduced ? 1 : Math.max(1, Math.ceil((dims.w + stride) / loop) + 1);
  const items: Item[] = [];
  for (let c = 0; c < copies; c++) cards.forEach((_, i) => items.push({ key: `${c}-${i}`, i, hidden: c > 0 }));
  const dir = direction === 'right' ? 1 : -1;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const card = Math.round(Math.min(300, Math.max(190, w * 0.62)));
      setDims({ w, card, gap: Math.round(card * 0.1) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const paint = useCallback(() => {
    const s = st.current;
    const { w, card } = dims;
    const beamX = w / 2;
    const total = loop * copies;
    s.pos = ((s.pos % loop) + loop) % loop;
    let scanning = false;
    items.forEach((it, n) => {
      const el = cardEls.current[n];
      if (!el) return;
      let x = s.pos + n * stride - stride;
      x = ((x % total) + total) % total - stride;
      el.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      if (reduced) return;
      const left = Math.max(0, Math.min(card, beamX - BEAM_HALF - x));
      const right = Math.max(0, Math.min(card, beamX + BEAM_HALF - x));
      el.style.setProperty('--cut-l', `${((left / card) * 100).toFixed(2)}%`);
      el.style.setProperty('--cut-r', `${((right / card) * 100).toFixed(2)}%`);
      const crossing = left > 0 && left < card;
      if (crossing) scanning = true;
      if (crossing && !el.dataset.scanned) {
        el.dataset.scanned = '1';
        el.classList.remove(styles.sweep);
        void el.offsetWidth;
        el.classList.add(styles.sweep);
      } else if (!crossing) delete el.dataset.scanned;
    });
    s.scanning = scanning;
  }, [dims, items.length, loop, copies, reduced, stride]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reduced || paused || !inView || !dims.w) {
      paint();
      return;
    }
    const s = st.current;
    if (!s.vel) s.vel = speed;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!s.drag) {
        if (s.vel > speed) s.vel = Math.max(speed, s.vel * Math.pow(FRICTION, dt * 60));
        else s.vel = speed;
        s.pos += s.vel * dir * dt;
      }
      if (s.step) {
        const d = s.step * Math.min(1, dt * 9);
        s.pos += d;
        s.step -= d;
        if (Math.abs(s.step) < 0.3) s.step = 0;
      }
      paint();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, paused, inView, dims.w, speed, dir, paint]);

  useBeamLayer(canvasRef, st, { active: !reduced && !paused && inView && dims.w > 0, density: reduced ? 0 : clamp(particles, 0, 100), baseSpeed: Math.max(1, speed), side: dir === -1 ? 1 : -1 });

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const s = st.current;
    s.drag = true;
    s.lastX = e.clientX;
    s.lastT = performance.now();
    s.mv = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    if (!s.drag) return;
    const now = performance.now();
    const dx = e.clientX - s.lastX;
    const dt = Math.max(1, now - s.lastT) / 1000;
    s.mv = s.mv * 0.6 + (dx / dt) * 0.4;
    s.pos += dx;
    s.lastX = e.clientX;
    s.lastT = now;
    if (reduced || paused) paint();
  };
  const onUp = () => {
    const s = st.current;
    if (!s.drag) return;
    s.drag = false;
    if (Math.abs(s.mv) > speed) s.vel = Math.min(MAX_VELOCITY, Math.abs(s.mv));
  };
  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (!d) return;
    st.current.pos -= Math.sign(d) * 20;
    if (reduced || paused) paint();
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const d = (e.key === 'ArrowLeft' ? -1 : 1) * stride;
    if (reduced || paused) {
      st.current.pos += d;
      paint();
    } else st.current.step += d;
  };

  const style = { '--ss-card': `${dims.card}px` } as CSSProperties;

  return (
    <div ref={rootRef} className={`${styles.root} ${reduced ? styles.reduced : dir === 1 ? styles.flip : ''} ${className ?? ''}`} style={style}>
      <div
        className={styles.viewport}
        role="region"
        aria-roledescription="carousel"
        aria-label="Product strip. Left and right arrow keys move the strip."
        tabIndex={0}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={onWheel}
        onKeyDown={onKey}
      >
        <canvas ref={canvasRef} className={styles.beamCanvas} aria-hidden="true" />
        {items.map((it, n) => {
          const c = cards[it.i];
          return (
            <div
              key={it.key}
              ref={(el) => {
                cardEls.current[n] = el;
              }}
              className={styles.card}
              aria-hidden={it.hidden || undefined}
              tabIndex={reduced && !it.hidden ? 0 : undefined}
              role={it.hidden ? undefined : 'group'}
              aria-roledescription={it.hidden ? undefined : 'slide'}
              aria-label={it.hidden ? undefined : `${it.i + 1} of ${cards.length}: ${c.twinTitle}`}
            >
              <div className={styles.photo}>
                <img className={styles.img} src={c.image} alt={c.imageAlt} draggable={false} loading="lazy" />
                <span className={styles.tag}>{pad(it.i + 1)}</span>
              </div>
              <div className={styles.twin}>
                <span className={styles.corner} aria-hidden="true" />
                <p className={styles.twinIdx}>{`FIG. ${pad(it.i + 1)}`}</p>
                <h3 className={styles.twinTitle}>{c.twinTitle}</h3>
                <ul className={styles.lines}>
                  {c.twinLines.map((l, k) => (
                    <li key={k} className={styles.line}>
                      <span className={styles.lineNo} aria-hidden="true">
                        {pad(k + 1)}
                      </span>
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
      {!reduced && (
        <button type="button" className={styles.pause} onClick={() => setPaused((p) => !p)} aria-pressed={paused} aria-label={paused ? 'Resume scrolling' : 'Pause scrolling'}>
          <span className={paused ? styles.play : styles.bars} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
