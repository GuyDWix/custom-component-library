Create a custom element called "Contact Sheet Gallery". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: photos (image, caption, picked mark), frame numbers on/off, marker color, table light tone, title, roll label. Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface ContactSheetPhoto {
  image: string;
  caption?: string;
  picked?: boolean;
}

export interface ContactSheetGalleryProps {
  photos?: ContactSheetPhoto[];
  title?: string;
  rollLabel?: string;
  showFrameNumbers?: boolean;
  markerColor?: string;
  paperTone?: string;
  ariaLabel?: string;
  photoLabel?: string;
  closeLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
  className?: string;
}

const wix = (file: string) => `https://static.wixstatic.com/media/${file}/v1/fill/w_1200,h_800,al_c,q_80,enc_auto/${file}`;

export const defaultPhotos: ContactSheetPhoto[] = [
  { image: wix('c3c3c6aa686f49e7beb397da6634313d.jpg'), caption: 'Valley fog at first light' },
  { image: wix('11062b_231247e6bf4f47129d00c42904595e3d~mv2.jpg'), caption: 'Breakfast before the drive' },
  { image: wix('11062b_3682ebfcb08e4da5b3168b62819a1e68~mv2.jpg'), caption: 'The cove from above', picked: true },
  { image: wix('4c34e844a76749b2b6c4ed85ec5f5c44.jpg'), caption: 'The house we rented' },
  { image: wix('6173e004478846d4b24d399c1d4863bb.jpg'), caption: 'Morning stretch by the pool' },
  { image: wix('11062b_0f39d6e37d0d4cd7b4aeeda30bc35f06~mv2.jpg'), caption: 'Second espresso, no regrets' },
  { image: wix('11062b_4c5469a1a0f14ea8894500f94dec68e2~mv2.jpg'), caption: 'Lena against the white wall', picked: true },
  { image: wix('285487815e3446a78cb72753b064615c.jpg'), caption: 'Lunch on the terrace' },
  { image: wix('66bc23fff16c4862903104a6597141fd.jpg'), caption: 'Dinner at the harbour' },
  { image: wix('3f1a1953c1c64d5fab4cb4d677b726ed.jpg'), caption: 'Last run of the trip' },
  { image: wix('11062b_91fa0735368f425da0bd82073a8c3695~mv2.jpg'), caption: 'Mira, laughing at something off camera', picked: true },
  { image: wix('73f64659826942c7bfd3e9deeeb6a8e7.jpg'), caption: 'Back into the city' },
];

type Phase = 'closed' | 'open' | 'closing';
type Motion = { x: number; y: number; s: number; vx: number; vy: number; vs: number };
type Box = { left: number; top: number; w: number; h: number; pad: number; imgW: number; imgH: number };
type Pt = { x: number; y: number };
type LoupeState = { x: number; y: number; vx: number; vy: number };

const STIFFNESS = 240;
const DAMPING = 23;
const L_STIFF = 150;
const L_DAMP = 16;
const CAPTION_H = 52;
const OPEN_DELAY = 340;
const SWIPE = 56;
const ZOOM = 2.15;
const BULGE = 0.42;
const BULGE_SCALE = 30;
const SHEET_HELP =
  'Move over the sheet to inspect frames with the loupe. Pick a frame to see it large. Arrow keys move between frames; Escape closes.';
const TILT = [-0.5, 0.4, -0.3, 0.55, -0.42];
const RING = 'M50 3C77 3 97 23 97 50C97 77 77 97 50 97C23 97 3 77 3 50C3 23 23 3 50 3';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const pad2 = (n: number) => String(n).padStart(2, '0');
const pickedSet = (photos: ContactSheetPhoto[]) => new Set(photos.flatMap((p, i) => (p.picked ? [i] : [])));
const rest = (): Motion => ({ x: 0, y: 0, s: 1, vx: 0, vy: 0, vs: 0 });
const clampChan = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));

export default function ContactSheetGallery({
  photos = defaultPhotos,
  title = 'A long weekend by the sea',
  rollLabel = 'Roll 07 · 400 · Proof',
  showFrameNumbers = true,
  markerColor = '#E8502E',
  paperTone = '#F2EBDD',
  ariaLabel = 'Contact sheet',
  photoLabel = 'Photo',
  closeLabel = 'Close',
  previousLabel = 'Previous photo',
  nextLabel = 'Next photo',
  className,
}: ContactSheetGalleryProps) {
  const count = photos.length;
  const [cols, setCols] = useState(4);
  const [marked, setMarked] = useState(() => pickedSet(photos));
  const [focusIndex, setFocusIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('closed');
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [swap, setSwap] = useState({ key: 0, dir: 0 });
  const [bulge, setBulge] = useState<{ url: string; size: number } | null>(null);

  const rootRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const loupeRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const cloneRef = useRef<HTMLDivElement>(null);
  const frameEls = useRef<(HTMLButtonElement | null)[]>([]);
  const ratios = useRef<number[]>([]);
  const motion = useRef<Motion>(rest());
  const target = useRef({ x: 0, y: 0, s: 1 });
  const box = useRef<Box | null>(null);
  const raf = useRef(0);
  const timer = useRef(0);
  const launching = useRef(false);
  const drag = useRef({ active: false, id: -1, x0: 0, dx: 0 });
  const loupeM = useRef<LoupeState>({ x: 0, y: 0, vx: 0, vy: 0 });
  const loupeT = useRef<Pt>({ x: 0, y: 0 });
  const restPt = useRef<Pt>({ x: 220, y: 140 });
  const loupeD = useRef(160);
  const lensD = useRef(140);
  const bulgeD = useRef(0);
  const idle = useRef(true);
  const entered = useRef(false);
  const phaseRef = useRef(phase);
  const indexRef = useRef(index);
  const reducedRef = useRef(reduced);
  const inViewRef = useRef(inView);
  const restIdx = useRef(0);
  phaseRef.current = phase;
  indexRef.current = index;
  reducedRef.current = reduced;
  inViewRef.current = inView;
  const firstPicked = photos.findIndex((p) => p.picked);
  restIdx.current = firstPicked >= 0 ? firstPicked : 0;

  const uid = useId().replace(/:/g, '');
  const bulgeFilterId = `csg-lens-${uid}`;

  useEffect(() => {
    setMarked(pickedSet(photos));
    ratios.current = [];
  }, [photos]);

  const paintLoupe = useCallback(() => {
    const lp = loupeRef.current;
    const cl = cloneRef.current;
    if (!lp) return;
    const L = loupeM.current;
    const d = loupeD.current;
    lp.style.transform = `translate3d(${(L.x - d / 2).toFixed(1)}px, ${(L.y - d / 2).toFixed(1)}px, 0)`;
    if (!cl) return;
    const dl = lensD.current;
    const cx = L.x;
    const cy = L.y;
    cl.style.transform = `translate3d(${(dl / 2 - cx * ZOOM).toFixed(1)}px, ${(dl / 2 - cy * ZOOM).toFixed(1)}px, 0) scale(${ZOOM})`;
  }, []);

  const computeBox = useCallback((i: number): Box | null => {
    const st = stageRef.current;
    if (!st) return null;
    const W = st.clientWidth;
    const H = st.clientHeight;
    const pad = W < 480 ? 8 : 14;
    const r = ratios.current[i] || 1.5;
    const imgW = Math.max(60, Math.min(W - pad * 2, (H - pad - CAPTION_H) * r));
    const imgH = imgW / r;
    const w = imgW + pad * 2;
    const h = imgH + pad + CAPTION_H;
    return { left: st.offsetLeft + (W - w) / 2, top: st.offsetTop + (H - h) / 2, w, h, pad, imgW, imgH };
  }, []);

  const fitOverlay = useCallback(() => {
    const ov = overlayRef.current;
    const root = rootRef.current;
    if (!ov || !root) return;
    const r = root.getBoundingClientRect();
    const top = Math.max(0, -r.top);
    const bottom = Math.min(r.height, window.innerHeight - r.top);
    const h = Math.min(r.height - top, Math.max(bottom - top, 360));
    ov.style.top = `${top}px`;
    ov.style.height = `${h}px`;
  }, []);

  const placePrint = useCallback((b: Box) => {
    const el = printRef.current;
    if (!el) return;
    Object.assign(el.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.w}px`, height: `${b.h}px`, visibility: 'visible' });
    el.style.setProperty('--pad', `${b.pad}px`);
    el.style.setProperty('--img-h', `${b.imgH}px`);
    el.style.setProperty('--img-w', `${b.imgW}px`);
  }, []);

  const frameOffset = useCallback((i: number, b: Box) => {
    const fr = frameEls.current[i]?.getBoundingClientRect();
    const ov = overlayRef.current?.getBoundingClientRect();
    if (!fr || !ov) return { x: 0, y: 0, s: 0.2 };
    const s = fr.width / b.imgW;
    return { x: fr.left - ov.left - b.left - b.pad * s, y: fr.top - ov.top - b.top - b.pad * s, s };
  }, []);

  const loupeOffset = useCallback((b: Box) => {
    const lp = loupeRef.current;
    const st = stageRef.current;
    if (!lp || !st) return { x: 0, y: 0, s: 0.25 };
    const lr = lp.getBoundingClientRect();
    const sr = st.getBoundingClientRect();
    const d = loupeD.current;
    const s = d / b.imgW;
    const cx = lr.left + d / 2 - sr.left;
    const cy = lr.top + d / 2 - sr.top;
    return { x: cx - s * (b.pad + b.imgW / 2), y: cy - s * (b.pad + b.imgH / 2), s };
  }, []);

  const paint = useCallback(() => {
    const m = motion.current;
    if (printRef.current) printRef.current.style.transform = `translate3d(${m.x.toFixed(2)}px, ${m.y.toFixed(2)}px, 0) scale(${m.s.toFixed(4)})`;
  }, []);

  const finishClose = useCallback(() => {
    setPhase('closed');
    const i = indexRef.current;
    setFocusIndex(i);
    frameEls.current[i]?.focus({ preventScroll: true });
  }, []);

  const step = useCallback(
    (now: number, last: number) => {
      const m = motion.current;
      const t = target.current;
      const L = loupeM.current;
      const LT = loupeT.current;
      const dt = Math.min((now - last) / 1000, 1 / 30);
      const n = Math.max(1, Math.ceil(dt * 120));
      const h = dt / n;
      for (let k = 0; k < n; k++) {
        if (!drag.current.active) {
          m.vx += (STIFFNESS * (t.x - m.x) - DAMPING * m.vx) * h;
          m.x += m.vx * h;
        }
        m.vy += (STIFFNESS * (t.y - m.y) - DAMPING * m.vy) * h;
        m.vs += (STIFFNESS * (t.s - m.s) - DAMPING * m.vs) * h;
        m.y += m.vy * h;
        m.s += m.vs * h;
        L.vx += (L_STIFF * (LT.x - L.x) - L_DAMP * L.vx) * h;
        L.vy += (L_STIFF * (LT.y - L.y) - L_DAMP * L.vy) * h;
        L.x += L.vx * h;
        L.y += L.vy * h;
      }
      const printSettled =
        Math.abs(t.x - m.x) + Math.abs(t.y - m.y) < 0.6 &&
        Math.abs(t.s - m.s) < 0.002 &&
        Math.abs(m.vx) + Math.abs(m.vy) < 8 &&
        Math.abs(m.vs) < 0.02;
      const loupeSettled = Math.abs(LT.x - L.x) + Math.abs(LT.y - L.y) < 0.5 && Math.abs(L.vx) + Math.abs(L.vy) < 5;
      const snap = !inViewRef.current || reducedRef.current;
      if ((printSettled && loupeSettled) || snap) {
        if (!drag.current.active) Object.assign(m, t, { vx: 0, vy: 0, vs: 0 });
        Object.assign(L, LT, { vx: 0, vy: 0 });
        paint();
        paintLoupe();
        raf.current = 0;
        if (phaseRef.current === 'closing') finishClose();
        return;
      }
      paint();
      paintLoupe();
      raf.current = requestAnimationFrame((next) => step(next, now));
    },
    [paint, paintLoupe, finishClose],
  );

  const kick = useCallback(() => {
    if (raf.current) return;
    const start = performance.now();
    raf.current = requestAnimationFrame((t) => step(t, start - 16));
  }, [step]);

  const bulgeFor = useCallback((d: number) => {
    const n = Math.max(64, Math.round(d));
    const cv = document.createElement('canvas');
    cv.width = n;
    cv.height = n;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(n, n);
    const half = n / 2;
    for (let py = 0; py < n; py++) {
      for (let px = 0; px < n; px++) {
        const x = (px + 0.5) / half - 1;
        const y = (py + 0.5) / half - 1;
        const r = Math.min(1, Math.hypot(x, y));
        const u = (BULGE * (1 - r * r)) / (1 + BULGE * (1 - r * r));
        const o = (py * n + px) * 4;
        img.data[o] = clampChan(0.5 - (u * x * half) / BULGE_SCALE);
        img.data[o + 1] = clampChan(0.5 - (u * y * half) / BULGE_SCALE);
        img.data[o + 2] = 128;
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    setBulge({ url: cv.toDataURL(), size: n });
  }, []);

  const measure = useCallback(() => {
    const table = tableRef.current;
    const lp = loupeRef.current;
    const cl = cloneRef.current;
    if (!table || !lp || !cl) return;
    loupeD.current = lp.offsetWidth || 160;
    lensD.current = lensRef.current?.offsetWidth || Math.round(loupeD.current * 0.87);
    cl.style.width = `${table.clientWidth}px`;
    const fr = frameEls.current[restIdx.current]?.getBoundingClientRect();
    const tr = table.getBoundingClientRect();
    if (fr) restPt.current = { x: fr.left - tr.left + fr.width / 2, y: fr.top - tr.top + fr.height / 2 };
    if (idle.current && phaseRef.current === 'closed') {
      loupeT.current = restPt.current;
      if (reducedRef.current) {
        Object.assign(loupeM.current, restPt.current, { vx: 0, vy: 0 });
        paintLoupe();
      }
    }
    if (bulgeD.current !== lensD.current) {
      bulgeD.current = lensD.current;
      bulgeFor(lensD.current);
    }
    kick();
  }, [bulgeFor, paintLoupe, kick]);

  const mark = (i: number) =>
    setMarked((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });

  const launch = useCallback(() => {
    launching.current = true;
    phaseRef.current = 'open';
    setPhase('open');
  }, []);

  const openAt = (i: number) => {
    window.clearTimeout(timer.current);
    const fresh = !marked.has(i);
    mark(i);
    setIndex(i);
    setFocusIndex(i);
    indexRef.current = i;
    setSwap((s) => ({ key: s.key + 1, dir: 0 }));
    if (reducedRef.current || !fresh) launch();
    else timer.current = window.setTimeout(launch, OPEN_DELAY);
  };

  const close = useCallback(() => {
    if (phaseRef.current !== 'open') return;
    const b = box.current;
    const pr = printRef.current;
    if (reducedRef.current || !b) {
      finishClose();
      return;
    }
    phaseRef.current = 'closing';
    setPhase('closing');
    target.current = frameOffset(indexRef.current, b);
    if (pr) pr.style.setProperty('--reveal', `${b.imgW / 2}px`);
    kick();
  }, [finishClose, frameOffset, kick]);

  const go = useCallback(
    (d: number) => {
      if (count < 2) return;
      const j = (indexRef.current + d + count) % count;
      indexRef.current = j;
      setIndex(j);
      mark(j);
      setSwap((s) => ({ key: s.key + 1, dir: d }));
      if (!reducedRef.current && !drag.current.active && Math.abs(motion.current.x) < 1) motion.current.x = d * 28;
      kick();
    },
    [count, kick],
  );

  useIsoLayoutEffect(() => {
    measure();
  }, [measure, photos, cols]);

  useIsoLayoutEffect(() => {
    if (phase !== 'open') return;
    if (launching.current) fitOverlay();
    const b = computeBox(index);
    if (!b) return;
    box.current = b;
    placePrint(b);
    if (launching.current) {
      launching.current = false;
      target.current = { x: 0, y: 0, s: 1 };
      const pr = printRef.current;
      if (pr) {
        if (reducedRef.current) {
          pr.style.setProperty('--mx', `${b.pad + b.imgW / 2}px`);
          pr.style.setProperty('--my', `${b.pad + b.imgH / 2}px`);
          pr.style.setProperty('--reveal', `${b.imgW * 1.75}px`);
        } else {
          pr.style.setProperty('--mx', `${b.pad + b.imgW / 2}px`);
          pr.style.setProperty('--my', `${b.pad + b.imgH / 2}px`);
          pr.style.setProperty('--reveal', `${b.imgW / 2}px`);
          pr.style.transition = 'none';
          pr.getBoundingClientRect();
          pr.style.transition = '';
          const end = `${b.imgW * 1.75}px`;
          requestAnimationFrame(() => pr.style.setProperty('--reveal', end));
        }
      }
      motion.current = reducedRef.current ? rest() : { ...rest(), ...loupeOffset(b) };
      paint();
      kick();
      overlayRef.current?.focus({ preventScroll: true });
    }
  }, [phase, index, fitOverlay, computeBox, placePrint, loupeOffset, paint, kick, measure]);

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
    const ro = new ResizeObserver(() => {
      setCols(root.clientWidth < 560 ? 3 : 4);
      measure();
      if (phaseRef.current !== 'open') return;
      fitOverlay();
      const b = computeBox(indexRef.current);
      if (b) {
        box.current = b;
        placePrint(b);
      }
    });
    ro.observe(root);
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && !entered.current) {
          entered.current = true;
          const rp = restPt.current;
          loupeT.current = rp;
          if (reducedRef.current) {
            Object.assign(loupeM.current, rp, { vx: 0, vy: 0 });
            paintLoupe();
          } else {
            loupeM.current = { x: rp.x, y: rp.y - 34, vx: 0, vy: 0 };
            kick();
          }
        }
      },
      { threshold: 0.1 },
    );
    io.observe(root);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [fitOverlay, computeBox, placePrint, measure, paintLoupe, kick]);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      window.clearTimeout(timer.current);
    },
    [],
  );

  const aimAtFrame = (i: number) => {
    if (phaseRef.current !== 'closed') return;
    const fr = frameEls.current[i];
    const table = tableRef.current;
    if (!fr || !table) return;
    const f = fr.getBoundingClientRect();
    const t = table.getBoundingClientRect();
    const p = { x: f.left - t.left + f.width / 2, y: f.top - t.top + f.height / 2 };
    loupeT.current = p;
    if (reducedRef.current) {
      Object.assign(loupeM.current, p, { vx: 0, vy: 0 });
      paintLoupe();
    } else kick();
  };

  const onTableMove = (e: PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== 'closed') return;
    const table = tableRef.current;
    if (!table) return;
    idle.current = false;
    const t = table.getBoundingClientRect();
    const p = { x: e.clientX - t.left, y: e.clientY - t.top };
    loupeT.current = p;
    if (reducedRef.current) {
      Object.assign(loupeM.current, p, { vx: 0, vy: 0 });
      paintLoupe();
    } else kick();
  };

  const onTableLeave = () => {
    idle.current = true;
    if (phaseRef.current !== 'closed') return;
    loupeT.current = restPt.current;
    if (reducedRef.current) {
      Object.assign(loupeM.current, restPt.current, { vx: 0, vy: 0 });
      paintLoupe();
    } else kick();
  };

  const onSheetKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    let next: number;
    if (e.key in moves) next = focusIndex + moves[e.key];
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    else return;
    e.preventDefault();
    next = Math.max(0, Math.min(count - 1, next));
    setFocusIndex(next);
    frameEls.current[next]?.focus();
  };

  const onOverlayKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      go(e.key === 'ArrowRight' ? 1 : -1);
    } else if (e.key === 'Tab') {
      const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button'));
      if (!items.length) return;
      const at = items.indexOf(document.activeElement as HTMLElement);
      const nextAt = e.shiftKey ? (at <= 0 ? items.length - 1 : at - 1) : (at + 1) % items.length;
      e.preventDefault();
      items[nextAt].focus();
    }
  };

  const onPrintDown = (e: PointerEvent<HTMLElement>) => {
    if (phaseRef.current !== 'open' || e.button !== 0 || count < 2) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { active: true, id: e.pointerId, x0: e.clientX - motion.current.x, dx: motion.current.x };
  };

  const onPrintMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.id) return;
    d.dx = e.clientX - d.x0;
    motion.current.x = reducedRef.current ? 0 : d.dx;
    paint();
  };

  const onPrintUp = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.id) return;
    d.active = false;
    if (Math.abs(d.dx) > SWIPE) go(d.dx < 0 ? 1 : -1);
    kick();
  };

  const current = photos[index];
  const nameOf = (i: number) => photos[i]?.caption || `${photoLabel} ${i + 1}`;
  const strips = Array.from({ length: Math.ceil(count / cols) }, (_, s) => Array.from({ length: cols }, (_, c) => s * cols + c));
  const gridCols = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };
  const isOpen = phase === 'open';
  const introRank = (i: number) => photos.slice(0, i).filter((p) => p.picked).length;
  const rootStyle = { '--csg-paper': paperTone, '--csg-marker': markerColor } as CSSProperties;
  const on = (base: string, active: string, flag: boolean) => (flag ? `${base} ${active}` : base);

  const stripNode = (cells: number[], s: number, clone: boolean) => (
    <div key={s} className={styles.strip} style={{ '--tilt': `${TILT[s % TILT.length]}deg` } as CSSProperties}>
      <div className={styles.bandTop} aria-hidden="true">
        {showFrameNumbers && rollLabel && <span className={styles.edgeLabel}>{rollLabel}</span>}
      </div>
      <div className={styles.frames} style={gridCols}>
        {cells.map((i) => {
          const photo = photos[i];
          if (!photo) return <span key={i} className={styles.blank} aria-hidden="true" />;
          const drawn = inView && marked.has(i);
          const img = (
            <img
              className={styles.thumb}
              src={photo.image}
              alt=""
              draggable={false}
              loading={clone ? 'eager' : 'lazy'}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) ratios.current[i] = img.naturalWidth / img.naturalHeight;
              }}
            />
          );
          const ring = (
            <svg
              className={styles.ring}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
              style={{ '--delay': photo.picked ? `${300 + introRank(i) * 260}ms` : '0ms' } as CSSProperties}
            >
              <path className={on(styles.ringCore, styles.ringDrawn, drawn)} d={RING} pathLength={1} />
            </svg>
          );
          if (clone) {
            return (
              <div key={i} className={styles.frame}>
                {img}
                {ring}
              </div>
            );
          }
          return (
            <button
              key={i}
              ref={(el) => {
                frameEls.current[i] = el;
              }}
              type="button"
              className={styles.frame}
              tabIndex={i === focusIndex ? 0 : -1}
              aria-label={nameOf(i)}
              aria-haspopup="dialog"
              onClick={() => openAt(i)}
              onFocus={() => {
                setFocusIndex(i);
                aimAtFrame(i);
              }}
            >
              {img}
              {ring}
            </button>
          );
        })}
      </div>
      <div className={styles.bandBottom} style={gridCols} aria-hidden="true">
        {showFrameNumbers &&
          cells.map((i) => (
            <span key={i} className={styles.edgeNum}>
              <span>{pad2(i + 1)}</span>
              <span>{pad2(i + 1)}A</span>
            </span>
          ))}
      </div>
    </div>
  );

  return (
    <section ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle} aria-label={ariaLabel}>
      <span className={styles.grain} aria-hidden="true" />
      <svg className={styles.defs} aria-hidden="true" focusable="false">
        {bulge && (
          <filter id={bulgeFilterId} x="-8%" y="-8%" width="116%" height="116%">
            <feImage href={bulge.url} x="0" y="0" width={bulge.size} height={bulge.size} result="map" preserveAspectRatio="none" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={BULGE_SCALE} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        )}
      </svg>

      <header className={styles.header}>
        {title && <h2 className={styles.title}>{title}</h2>}
        {rollLabel && <p className={styles.roll}>{rollLabel}</p>}
      </header>

      <div
        ref={tableRef}
        className={`${styles.panel} ${styles.table}`}
        onPointerMove={onTableMove}
        onPointerLeave={onTableLeave}
      >
        <span className={on(styles.bloom, styles.bloomStill, !inView)} aria-hidden="true" />
        <div
          className={styles.sheet}
          role="group"
          aria-label={ariaLabel}
          aria-description={SHEET_HELP}
          onKeyDown={onSheetKey}
        >
          {strips.map((cells, s) => stripNode(cells, s, false))}
        </div>

        <div ref={loupeRef} className={styles.loupe} aria-hidden="true">
          <div className={on(styles.loupeBody, styles.loupeOn, inView && phase === 'closed')}>
            <span className={styles.loupeHalo} />
            <span className={styles.loupeShadow} />
            <div className={styles.loupeBarrel}>
              <div ref={lensRef} className={styles.lens} style={bulge ? { filter: `url(#${bulgeFilterId})` } : undefined}>
                <div ref={cloneRef} className={`${styles.panel} ${styles.lensClone}`}>
                  <div className={styles.sheet}>{strips.map((cells, s) => stripNode(cells, s, true))}</div>
                </div>
              </div>
              <span className={styles.lensRoom} />
              <span className={styles.lensSpec} />
              <span className={styles.lensFringe} />
              <span className={styles.lensGrain} />
            </div>
          </div>
        </div>
      </div>

      {phase !== 'closed' && current && (
        <div className={on(styles.backdrop, styles.backdropOn, isOpen)} onClick={close} aria-hidden="true" />
      )}
      {phase !== 'closed' && current && (
        <div
          ref={overlayRef}
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label={nameOf(index)}
          tabIndex={-1}
          onKeyDown={onOverlayKey}
          onClick={(e) => {
            if (e.target === e.currentTarget || e.target === stageRef.current) close();
          }}
        >
          <div ref={stageRef} className={styles.stage} />
          <figure
            ref={printRef}
            className={on(styles.print, styles.printLifted, isOpen)}
            onPointerDown={onPrintDown}
            onPointerMove={onPrintMove}
            onPointerUp={onPrintUp}
            onPointerCancel={onPrintUp}
          >
            <div className={styles.printImage}>
              <img
                key={swap.key}
                className={swap.key ? `${styles.printImg} ${styles.printImgIn}` : styles.printImg}
                style={{ '--dir': swap.dir } as CSSProperties}
                src={current.image}
                alt={current.caption || ''}
                draggable={false}
              />
            </div>
            <span className={styles.printSheen} aria-hidden="true" />
            <figcaption className={on(styles.caption, styles.captionOn, isOpen)}>
              <span className={styles.captionNum} aria-hidden="true">
                {pad2(index + 1)}
              </span>
              {current.caption && <span className={styles.captionText}>{current.caption}</span>}
            </figcaption>
          </figure>

          <div className={on(styles.bar, styles.chromeOn, isOpen)}>
            {count > 1 && (
              <button type="button" className={styles.barButton} aria-label={previousLabel} onClick={() => go(-1)}>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className={styles.srOnly} aria-hidden="true">{previousLabel}</span>
              </button>
            )}
            <span className={styles.counter} aria-live="polite">
              {pad2(index + 1)} / {pad2(count)}
            </span>
            {count > 1 && (
              <button type="button" className={styles.barButton} aria-label={nextLabel} onClick={() => go(1)}>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className={styles.srOnly} aria-hidden="true">{nextLabel}</span>
              </button>
            )}
          </div>

          <button type="button" className={on(styles.close, styles.chromeOn, isOpen)} aria-label={closeLabel} onClick={close}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className={styles.srOnly} aria-hidden="true">{closeLabel}</span>
          </button>
        </div>
      )}
    </section>
  );
}
```

```css
@property --reveal {
  syntax: '<length>';
  inherits: false;
  initial-value: 1600px;
}

@font-face {
  font-family: 'Space Grotesk';
  src: url('./fonts/space-grotesk-500.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Space Grotesk';
  src: url('./fonts/space-grotesk-700.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

.root {
  --csg-room: #131417;
  --csg-paper: #f2ebdd;
  --csg-marker: #e8502e;
  --csg-ink: #eeeeea;
  --csg-muted: rgba(238, 238, 234, 0.66);
  --csg-table: color-mix(in srgb, var(--csg-paper) 38%, #e9e9e6);
  --csg-negative: invert(0.92) sepia(0.2) saturate(0.85) hue-rotate(172deg) brightness(1.04) contrast(0.9);
  --csg-amber: #d9b27a;
  --csg-mask: #d88c3c;
  --csg-film: #1b1c1f;
  --csg-loupe: clamp(130px, 27cqi, 225px);
  --csg-font-display: 'Space Grotesk', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --csg-font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  --csg-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.47  0 0 0 0 0.42  0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --csg-holes: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='5'><rect x='3' y='0.5' width='6' height='4' rx='1'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  background:
    var(--csg-room);
  color: var(--csg-ink);
  font-family: var(--csg-font-display);
  border-radius: 6px;
  box-shadow:
    inset 0 0 0 1px rgba(255, 236, 200, 0.05),
    0 1px 2px rgba(0, 0, 0, 0.4),
    0 26px 64px -32px rgba(0, 0, 0, 0.8);
}

.grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 4;
  background-image: var(--csg-noise);
  mix-blend-mode: overlay;
  opacity: 0.07;
}

.defs {
  position: absolute;
  inline-size: 0;
  block-size: 0;
  overflow: hidden;
}

/* ---------- dark margin ---------- */

.header {
  position: relative;
  z-index: 2;
  padding-inline: clamp(18px, 4.5cqi, 56px);
  padding-block: clamp(24px, 4.2cqi, 44px) clamp(18px, 3cqi, 28px);
}

.title {
  margin: 0;
  font-family: var(--csg-font-display);
  font-weight: 500;
  font-size: clamp(26px, 4.6cqi, 46px);
  line-height: 1.08;
  letter-spacing: -0.025em;
  max-inline-size: 20ch;
  color: var(--csg-ink);
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.roll {
  margin: clamp(10px, 1.6cqi, 16px) 0 0;
  font-family: var(--csg-font-mono);
  font-size: 12px;
  line-height: 1.5;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--csg-muted);
  max-inline-size: 100%;
  overflow-wrap: anywhere;
}

/* ---------- the glowing light table ---------- */

.panel {
  position: relative;
  padding-block: clamp(22px, 4cqi, 42px) clamp(30px, 5.5cqi, 54px);
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--csg-table) 70%, #fff) 0%,
      var(--csg-table) 55%,
      color-mix(in srgb, var(--csg-table) 90%, #5d5d5a) 100%);
}

.table {
  z-index: 1;
  touch-action: pan-y pinch-zoom;
  -webkit-tap-highlight-color: transparent;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 0 12px 24px -16px rgba(0, 0, 0, 0.18);
}

.bloom {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(75% 52% at 50% 0%, color-mix(in srgb, var(--csg-paper) 30%, #fff) 0%, transparent 72%);
  mix-blend-mode: screen;
  animation: bloom 7.5s ease-in-out infinite alternate;
}

.bloomStill {
  animation-play-state: paused;
}

@keyframes bloom {
  from {
    opacity: 0.08;
  }
  to {
    opacity: 0.16;
  }
}

.sheet {
  position: relative;
  z-index: 1;
  display: grid;
  gap: clamp(14px, 2.8cqi, 26px);
  touch-action: pan-y pinch-zoom;
}

/* ---------- film strips ---------- */

.strip {
  position: relative;
  inline-size: 102%;
  margin-inline: -1%;
  padding-inline: 10px;
  border-radius: 2px;
  background: linear-gradient(180deg, #232427, var(--csg-film) 40%, #151618);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    0 1px 1px rgba(20, 20, 22, 0.25),
    0 12px 24px -16px rgba(20, 20, 22, 0.45);
  transform: rotate(calc(var(--tilt, 0deg) * 0.5));
}

.bandTop,
.bandBottom {
  position: relative;
  block-size: 20px;
}

.bandTop::before,
.bandBottom::before {
  content: '';
  position: absolute;
  inset-inline: 0;
  block-size: 5px;
  background: color-mix(in srgb, var(--csg-table) 80%, #fff);
  opacity: 0.8;
  -webkit-mask: var(--csg-holes) repeat-x;
  mask: var(--csg-holes) repeat-x;
}

.bandTop::before {
  inset-block-start: 2px;
}

.bandBottom::before {
  inset-block-end: 2px;
}

.bandBottom {
  display: grid;
  column-gap: 6px;
}

.edgeLabel,
.edgeNum {
  font-family: var(--csg-font-mono);
  font-size: 9px;
  line-height: 1;
  letter-spacing: 0.1em;
  color: rgba(217, 178, 122, 0.72);
  white-space: nowrap;
}

.edgeLabel {
  position: absolute;
  inset-block-end: 3px;
  inset-inline-start: 10px;
  max-inline-size: calc(100% - 20px);
  overflow: hidden;
  text-overflow: ellipsis;
}

.edgeNum {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  padding-block-start: 2px;
  padding-inline: 2px;
  overflow: hidden;
  font-variant-numeric: tabular-nums;
}

.frames {
  display: grid;
  gap: 6px;
}

.frame {
  position: relative;
  display: block;
  aspect-ratio: 3 / 2;
  padding: 0;
  border: 0;
  border-radius: 1px;
  background: #0b0b0c;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.07);
  cursor: zoom-in;
  -webkit-tap-highlight-color: transparent;
}

.frame::after {
  content: '';
  position: absolute;
  inset: 0;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.5),
    inset 0 0 12px rgba(0, 0, 0, 0.22);
  pointer-events: none;
}

.frame:focus-visible {
  outline: 2px solid var(--csg-amber);
  outline-offset: 3px;
}

.thumb {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  filter: var(--csg-negative);
  transition: filter 280ms ease;
}

.lensClone .thumb {
  filter: none;
}

.thumb:hover {
  filter: var(--csg-negative) brightness(1.12);
}

.frame:focus-visible::after {
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.5),
    inset 0 0 12px rgba(0, 0, 0, 0.22),
    inset 0 0 22px rgba(255, 224, 170, 0.22);
}

.blank {
  display: block;
  aspect-ratio: 3 / 2;
  background: #0e0e10;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.ring {
  position: absolute;
  inset-block: -10%;
  inset-inline: -5%;
  inline-size: 110%;
  block-size: 120%;
  overflow: visible;
  pointer-events: none;
  z-index: 2;
}

.ringCore {
  fill: none;
  stroke: var(--csg-marker);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1 2;
  stroke-dashoffset: 1;
  transition: stroke-dashoffset 640ms cubic-bezier(0.65, 0.05, 0.3, 1) var(--delay, 0ms);
}

.ringCore {
  stroke-width: 0.8;
  opacity: 0.95;
}

.ringDrawn {
  stroke-dashoffset: 0;
}

/* ---------- the loupe ---------- */

.loupe {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  inline-size: var(--csg-loupe);
  block-size: var(--csg-loupe);
  z-index: 3;
  pointer-events: none;
  will-change: transform;
}

.loupeBody {
  position: absolute;
  inset: 0;
  opacity: 0;
  scale: 1.09;
  transition:
    opacity 520ms ease,
    scale 680ms cubic-bezier(0.3, 1.35, 0.4, 1);
}

.loupeOn {
  opacity: 1;
  scale: 1;
}

.loupeHalo {
  position: absolute;
  inset: -3%;
  border-radius: 50%;
  background: none;
}

.loupeShadow {
  position: absolute;
  inset-inline: 8%;
  inset-block-end: -9%;
  block-size: 16%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(7, 4, 1, 0.5), transparent 72%);
  filter: blur(5px);
}

.loupeBarrel {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(160deg, #3a3b3f, #17181a);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.3),
    0 12px 26px -12px rgba(0, 0, 0, 0.45),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.lens {
  position: absolute;
  inset: 3.5%;
  border-radius: 50%;
  overflow: hidden;
  background: var(--csg-room);
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.55),
    inset 0 0 16px rgba(0, 0, 0, 0.3);
}

.lensClone {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  transform-origin: 0 0;
  will-change: transform;
  pointer-events: none;
}

.lensRoom {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(135% 125% at 50% -12%, rgba(5, 4, 2, 0.52) 0%, rgba(5, 4, 2, 0.1) 42%, transparent 64%);
}

.lensSpec {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(58% 42% at 31% 15%, rgba(255, 249, 236, 0.26) 0%, rgba(255, 249, 236, 0.04) 48%, transparent 72%);
  mix-blend-mode: soft-light;
}

.lensFringe {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.5),
    inset 0 0 10px rgba(10, 10, 12, 0.22);
}

.lensGrain {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-image: var(--csg-noise);
  opacity: 0.06;
  mix-blend-mode: overlay;
}

/* ---------- overlay: the lifted print ---------- */

.overlay {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  block-size: 100%;
  box-sizing: border-box;
  z-index: 10;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  padding-block: 64px 14px;
  padding-inline: 16px;
  outline: none;
}

.backdrop {
  position: absolute;
  inset: 0;
  z-index: 9;
  background: radial-gradient(72% 62% at 50% 44%, rgba(24, 25, 28, 0.72) 0%, rgba(10, 10, 12, 0.92) 100%);
  opacity: 0;
  transition: opacity 380ms ease;
}

.backdropOn {
  opacity: 1;
}

.stage {
  grid-row: 1;
  min-block-size: 0;
}

.print {
  position: absolute;
  margin: 0;
  box-sizing: border-box;
  display: grid;
  grid-template-rows: var(--img-h, 1fr) 1fr;
  padding: var(--pad, 14px);
  padding-block-end: 0;
  border-radius: 2px;
  background: linear-gradient(168deg, #fcfcfa 0%, #f4f3ef 58%, #eae9e4 100%);
  transform-origin: 0 0;
  will-change: transform;
  visibility: hidden;
  touch-action: pan-y;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.3),
    0 4px 10px -4px rgba(0, 0, 0, 0.32);
  transition:
    --reveal 620ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 520ms cubic-bezier(0.16, 1, 0.3, 1);
  -webkit-mask-image: radial-gradient(
    circle at var(--mx, 50%) var(--my, 50%),
    #000 calc(var(--reveal) - 26px),
    transparent var(--reveal)
  );
  mask-image: radial-gradient(
    circle at var(--mx, 50%) var(--my, 50%),
    #000 calc(var(--reveal) - 26px),
    transparent var(--reveal)
  );
}

.print:active {
  cursor: grabbing;
}

.printLifted {
  box-shadow:
    inset 0 1px 0 #fff,
    0 1px 2px rgba(0, 0, 0, 0.32),
    0 18px 36px -12px rgba(0, 0, 0, 0.6),
    0 64px 128px -40px rgba(0, 0, 0, 0.78);
}

.printImage {
  position: relative;
  overflow: hidden;
  background: #161009;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2);
}

.printImg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  pointer-events: none;
  filter: sepia(0.05) contrast(1.03);
}

.printImgIn {
  animation: developIn 660ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes developIn {
  0% {
    opacity: 0;
    filter: var(--csg-negative);
    transform: translateX(calc(var(--dir, 0) * 4%)) scale(1.02);
  }
  28% {
    opacity: 1;
    filter: var(--csg-negative) brightness(1.15);
    transform: none;
  }
  60% {
    filter: invert(0.34) sepia(0.12) saturate(1.1) hue-rotate(158deg) brightness(1.08) contrast(1.02);
  }
  100% {
    opacity: 1;
    filter: sepia(0.05) contrast(1.03);
    transform: none;
  }
}

.printSheen {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(122deg, rgba(255, 255, 255, 0.24) 0%, transparent 36%),
    var(--csg-noise);
  mix-blend-mode: soft-light;
  opacity: 0.7;
}

.caption {
  display: flex;
  align-items: center;
  gap: 14px;
  min-inline-size: 0;
  padding-inline: 2px;
  opacity: 0;
  transition: opacity 300ms ease;
}

.captionOn {
  opacity: 1;
  transition-delay: 240ms;
}

.captionNum {
  flex: none;
  font-family: var(--csg-font-mono);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: #8a4a22;
  font-variant-numeric: tabular-nums;
}

.captionText {
  min-inline-size: 0;
  font-size: 16px;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: #26272a;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.captionText::selection {
  background: #e8502e;
  color: #fff;
}

.bar {
  grid-row: 2;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding-block-start: 14px;
  color: var(--csg-ink);
  opacity: 0;
  transition: opacity 260ms ease;
}

.counter {
  min-inline-size: 76px;
  text-align: center;
  font-family: var(--csg-font-mono);
  font-size: 13px;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
  color: var(--csg-muted);
}

.barButton,
.close {
  display: grid;
  place-items: center;
  inline-size: 48px;
  block-size: 48px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(238, 238, 234, 0.24);
  background: rgba(20, 21, 24, 0.55);
  color: var(--csg-ink);
  cursor: pointer;
  transition:
    background-color 200ms ease,
    border-color 200ms ease,
    opacity 260ms ease,
    transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.barButton:hover,
.close:hover {
  background: rgba(32, 33, 37, 0.75);
  border-color: rgba(238, 238, 234, 0.55);
}

.barButton:active,
.close:active {
  transform: scale(0.92);
}

.barButton:focus-visible,
.close:focus-visible {
  outline: 2px solid var(--csg-amber);
  outline-offset: 3px;
}

.close {
  position: absolute;
  inset-block-start: 12px;
  inset-inline-end: 12px;
  opacity: 0;
}

.chromeOn {
  opacity: 1;
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

/* ---------- responsive (container) ---------- */

@container (max-width: 559px) {
  .ringCore {
    stroke-width: 1.5;
  }

  .overlay {
    padding-block: 48px 10px;
  }
}

@container (min-width: 560px) {
  .strip {
    padding-inline: 14px;
  }

  .frames {
    gap: 9px;
  }

  .bandBottom {
    column-gap: 9px;
  }

  .captionText {
    font-size: 18px;
  }
}

@container (min-width: 900px) {
  .header {
    padding-block-end: clamp(22px, 4cqi, 36px);
  }

  .frames {
    gap: 10px;
  }

  .bandBottom {
    column-gap: 10px;
  }

  .bandTop,
  .bandBottom {
    block-size: 26px;
  }
}

/* ---------- reduced motion ---------- */

@media (prefers-reduced-motion: reduce) {
  .ringCore,
  .print,
  .caption,
  .backdrop,
  .bar,
  .loupeBody {
    transition: none;
  }

  .printImgIn,
  .bloom {
    animation: none;
  }
}
```
