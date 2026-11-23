Create a custom element called "Sun Arc Opening Hours". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: hours per weekday (day, opens, closes), closed days, open-now badge on/off, sky tint, time zone, 12-hour or 24-hour clock, title and badge wording. Add other settings if they help.

```tsx
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export interface SunArcDay {
  day: string;
  label: string;
  opens: string;
  closes: string;
  closed?: boolean;
}

export interface SunArcOpeningHoursProps {
  hours?: SunArcDay[];
  title?: string;
  showOpenNow?: boolean;
  skyTint?: string;
  timeZone?: string;
  clock?: '12h' | '24h';
  openNowLabel?: string;
  closesAtLabel?: string;
  opensLabel?: string;
  closedLabel?: string;
  className?: string;
}

export const defaultHours: SunArcDay[] = [
  { day: 'Monday', label: 'Mon', opens: '07:30', closes: '21:00' },
  { day: 'Tuesday', label: 'Tue', opens: '07:30', closes: '21:00', closed: true },
  { day: 'Wednesday', label: 'Wed', opens: '07:30', closes: '21:00' },
  { day: 'Thursday', label: 'Thu', opens: '07:30', closes: '21:00' },
  { day: 'Friday', label: 'Fri', opens: '07:30', closes: '23:00' },
  { day: 'Saturday', label: 'Sat', opens: '08:00', closes: '23:00' },
  { day: 'Sunday', label: 'Sun', opens: '09:00', closes: '18:00' },
];

/* ---------- helpers ---------- */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function parseTime(s: string): number | null {
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*$/.exec(s ?? '');
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2] ?? 0);
  if (h > 24 || mi > 59) return null;
  return h + mi / 60;
}

function formatTime(t: number, clock: '12h' | '24h'): string {
  const total = Math.round(t * 60) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const mm = String(m).padStart(2, '0');
  if (clock === '24h') return `${String(h).padStart(2, '0')}:${mm}`;
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return m ? `${h12}:${mm}${suffix}` : `${h12}${suffix}`;
}

interface DayModel {
  open: boolean;
  o: number;
  c: number;
}

function buildModel(hours: SunArcDay[]) {
  const days: DayModel[] = hours.map((d) => {
    const o = parseTime(d.opens);
    let c = parseTime(d.closes);
    if (d.closed || o === null || c === null) return { open: false, o: 0, c: 0 };
    if (c <= o) c += 24;
    return { open: true, o, c };
  });
  const open = days.filter((d) => d.open);
  let start = 6;
  let end = 22;
  if (open.length) {
    const lo = Math.min(...open.map((d) => d.o));
    const hi = Math.max(...open.map((d) => d.c));
    // at least ~12% of the arc on each side of the open stretch, so the end labels have room
    const room = Math.max(1, (hi - lo) * 0.15);
    start = Math.floor(lo - room);
    end = Math.ceil(hi + room);
  }
  if (end - start < 8) end = start + 8;
  const hourMarks: number[] = [];
  for (let h = Math.ceil(start); h <= Math.floor(end); h++) hourMarks.push(h);
  return { days, start, end, hourMarks };
}

function readNow(timeZone: string): { day: number; t: number } {
  const d = new Date();
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || undefined,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(d);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const day = WEEKDAYS.indexOf(get('weekday'));
    if (day >= 0) {
      return { day, t: (Number(get('hour')) % 24) + Number(get('minute')) / 60 + Number(get('second')) / 3600 };
    }
  } catch {
    /* unknown time zone: fall back to the visitor's clock */
  }
  return { day: (d.getDay() + 6) % 7, t: d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600 };
}

/* ---------- geometry ---------- */

interface Geo {
  W: number;
  compact: boolean;
  pad: number;
  cx: number;
  rx: number;
  ry: number;
  R: number;
  stageH: number;
  hy: number;
  ref: number;
  hoursFs: number;
  dayFs: number;
  textLeft: number;
  textMax: number;
}

const EDGE = 24; // guaranteed distance between any time label and the card edge
const LABEL_GAP = 20;

function makeGeo(W: number, labelW: number): Geo {
  const compact = W < 760;
  const pad = clamp(W * 0.05, 22, 60);
  const cx = W / 2;
  // wide layout: the end labels sit outside the arc, so the arc needs side room for them
  const needInset = (EDGE + labelW + LABEL_GAP * 0.95 - cx * 0.0489) / 0.951;
  const inset = compact ? pad : Math.max(pad, Math.min(needInset, cx * 0.4));
  const rx = cx - inset;
  const ratio = clamp(1.05 - (W - 340) * 0.00068, 0.56, 1.05);
  const ry = rx * ratio;
  const R = clamp(W * 0.034, 17, 42);
  const stageH = Math.round(ry + R * 1.5 + 30);
  const hoursFs = compact ? clamp(W * 0.105, 32, 46) : clamp(W * 0.058, 44, 80);
  const dayFs = compact ? 17 : clamp(W * 0.016, 18, 24);
  const textH = dayFs * 1.3 + 6 + hoursFs * 1.02;
  const hTop = Math.min(30 + textH, ry * 0.93);
  // clearance: measure the arc a little above the readout's top edge and keep the text well clear of the glow
  const yTest = Math.min(hTop + 48, ry * 0.96);
  const textLeft = cx - rx * Math.sqrt(1 - (yTest / ry) ** 2) + 36;
  return {
    W,
    compact,
    pad,
    cx,
    rx,
    ry,
    R,
    stageH,
    hy: stageH,
    ref: compact ? 46 : Math.round(clamp(W * 0.07, 60, 96)),
    hoursFs,
    dayFs,
    textLeft,
    textMax: Math.max(160, W - 2 * textLeft),
  };
}

const pt = (g: Geo, s: number) => ({
  x: g.cx - g.rx * Math.cos(Math.PI * s),
  y: g.hy - g.ry * Math.sin(Math.PI * s),
});

function arcD(g: Geo, a: number, b: number): string {
  if (b - a < 0.002) return '';
  const p = pt(g, a);
  const q = pt(g, b);
  return `M${p.x.toFixed(1)} ${p.y.toFixed(1)}A${g.rx.toFixed(1)} ${g.ry.toFixed(1)} 0 0 1 ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
}

/* ---------- springs ---------- */

interface Spring {
  x: number;
  v: number;
  to: number;
  k: number;
  c: number;
  wake: number;
}
const spring = (x: number, k: number, c: number): Spring => ({ x, v: 0, to: x, k, c, wake: 0 });

function stepSpring(s: Spring, now: number, dt: number): boolean {
  if (now < s.wake) return true;
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / steps;
  for (let n = 0; n < steps; n++) {
    s.v += (s.k * (s.to - s.x) - s.c * s.v) * h;
    s.x += s.v * h;
  }
  if (Math.abs(s.to - s.x) < 0.0003 && Math.abs(s.v) < 0.0006) {
    s.x = s.to;
    s.v = 0;
    return false;
  }
  return true;
}

interface Engine {
  sun: Spring;
  lift: Spring;
  ga: Spring;
  gb: Spring;
  amt: Spring;
  timer: number;
  intro: boolean;
}

const BARS = 9;
const SWIPE = 44;

export default function SunArcOpeningHours({
  hours = defaultHours,
  title = 'Opening hours',
  showOpenNow = true,
  skyTint = '#9ba7f5',
  timeZone = 'Europe/Lisbon',
  clock = '12h',
  openNowLabel = 'Open now',
  closesAtLabel = 'closes at',
  opensLabel = 'opens',
  closedLabel = 'Closed',
  className,
}: SunArcOpeningHoursProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [W, setW] = useState(960);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [now, setNow] = useState<{ day: number; t: number } | null>(null);
  const [started, setStarted] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [hov, setHov] = useState<number | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const haloAllRef = useRef<SVGPathElement>(null);
  const haloBrightRef = useRef<SVGPathElement>(null);
  const coreRemainRef = useRef<SVGPathElement>(null);
  const coreBrightRef = useRef<SVGPathElement>(null);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const barRefs = useRef<(SVGRectElement | null)[]>([]);
  const endARef = useRef<HTMLSpanElement>(null);
  const endBRef = useRef<HTMLSpanElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const labelW = useRef({ a: 60, b: 60 });
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);

  const eng = useRef<Engine | null>(null);
  if (!eng.current) {
    eng.current = {
      sun: spring(0, 60, 11),
      lift: spring(0, 120, 14),
      ga: spring(0, 90, 12),
      gb: spring(0, 55, 10),
      amt: spring(0, 90, 15),
      timer: 0,
      intro: true,
    };
  }

  const hoursKey = JSON.stringify(hours);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const model = useMemo(() => buildModel(hours), [hoursKey]);
  const n = hours.length;
  const geo = useMemo(() => makeGeo(W, clock === '24h' ? 48 : 66), [W, clock]);
  const geoRef = useRef(geo);
  geoRef.current = geo;
  const modelRef = useRef(model);
  modelRef.current = model;

  const todayIdx = now && now.day < n ? now.day : -1;
  const firstOpen = Math.max(0, model.days.findIndex((d) => d.open));
  const baseIdx = sel ?? (todayIdx >= 0 ? todayIdx : firstOpen);
  const dispIdx = clamp(hov ?? baseIdx, 0, Math.max(0, n - 1));
  const day = hours[dispIdx];
  const dm = model.days[dispIdx];

  /* live status line (about right now, regardless of the day being previewed) */
  const status = useMemo(() => {
    if (!now) return { open: false, text: '' };
    const today = model.days[now.day];
    if (today && today.open && now.t >= today.o && now.t < today.c) {
      return { open: true, text: `${openNowLabel} \u00B7 ${closesAtLabel} ${formatTime(today.c, clock)}` };
    }
    for (let k = 0; k <= n; k++) {
      const idx = (now.day + k) % n;
      const d = model.days[idx];
      if (!d || !d.open) continue;
      if (k === 0 && now.t >= d.o) continue;
      const when = k === 0 ? formatTime(d.o, clock) : `${hours[idx]?.label ?? ''} ${formatTime(d.o, clock)}`;
      return { open: false, text: `${closedLabel} \u00B7 ${opensLabel} ${when}` };
    }
    return { open: false, text: closedLabel };
  }, [now, model, n, hours, clock, openNowLabel, closesAtLabel, opensLabel, closedLabel]);

  /* ---------- painting (imperative, no React renders per frame) ---------- */

  const placeLabel = useCallback(
    (el: HTMLSpanElement | null, s: number, w: number, g: Geo, show: number, sunX: number, sunY: number) => {
      if (!el) return;
      const h = 24;
      const p = pt(g, s);
      let nx = (p.x - g.cx) / (g.rx * g.rx);
      let ny = (p.y - g.hy) / (g.ry * g.ry);
      const len = Math.hypot(nx, ny) || 1;
      nx /= len;
      ny /= len;
      // wide: label outside the arc (arc is inset to make room). compact: label inside the arc, away from the card edge.
      const dir = g.compact ? -1 : 1;
      const off = g.compact ? 16 : LABEL_GAP;
      const dx = nx * dir;
      const dy = ny * dir;
      const ax = p.x + dx * off;
      const ay = p.y + dy * off;
      const tx = dx < -0.2 ? -100 : dx > 0.2 ? 0 : -50;
      const ty = dy < -0.6 ? -100 : dy > 0.6 ? 0 : -50;
      const left = clamp(ax + (tx / 100) * w, EDGE, Math.max(EDGE, g.W - EDGE - w));
      const top = clamp(ay + (ty / 100) * h, 6, g.hy - h - 10);
      // fade out while the sun is over the label (the sun already marks that moment)
      const cxp = clamp(sunX, left, left + w);
      const cyp = clamp(sunY, top, top + h);
      const dist = Math.hypot(sunX - cxp, sunY - cyp);
      const clear = clamp((dist - g.R * 1.05) / (g.R * 0.9), 0, 1);
      el.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`;
      el.style.opacity = String(clamp(show, 0, 1) * clear);
    },
    [],
  );

  const paint = useCallback(() => {
    const g = geoRef.current;
    const e = eng.current;
    const box = boxRef.current;
    if (!e || !box) return;
    const sx = clamp(e.sun.x, -0.04, 1.04);
    const lift = clamp(e.lift.x, 0, 1.1);
    const lift1 = Math.min(lift, 1);
    const amt = clamp(e.amt.x, 0, 1);
    const p = pt(g, sx);
    const sy = p.y + (1 - lift) * g.R * 2.6;

    box.style.setProperty('--sx', `${p.x.toFixed(1)}px`);
    box.style.setProperty('--sb', `${(g.stageH - sy).toFixed(1)}px`);
    box.style.setProperty('--phase', clamp(sx * 0.82 + (1 - lift1) * 0.22, 0, 1).toFixed(3));
    box.style.setProperty('--lift', lift1.toFixed(3));
    if (sunRef.current) sunRef.current.style.transform = `translate3d(${p.x.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;

    const sa = clamp(e.ga.x, 0, 1);
    const sb = Math.max(sa, clamp(e.gb.x, 0, 1));
    const el = clamp(sx, sa, sb);
    const setPath = (node: SVGPathElement | null, a: number, b: number, opacity: number, width: number) => {
      if (!node) return;
      node.setAttribute('d', arcD(g, a, b));
      node.setAttribute('opacity', (opacity * amt).toFixed(3));
      node.setAttribute('stroke-width', (width * (0.25 + 0.75 * amt)).toFixed(2));
    };
    setPath(haloAllRef.current, sa, sb, 0.34, 20);
    setPath(haloBrightRef.current, sa, el, 0.95, 22);
    setPath(coreRemainRef.current, el, sb, 0.6, 3);
    setPath(coreBrightRef.current, sa, el, 1, 6);

    const marks = modelRef.current;
    const span = marks.end - marks.start;
    dotRefs.current.forEach((c, i) => {
      if (!c) return;
      const h = marks.hourMarks[i];
      if (h === undefined) return;
      const s = (h - marks.start) / span;
      const lit = amt > 0.05 && s >= sa - 0.002 && s <= el + 0.002;
      c.setAttribute('fill', lit ? '#fff7cf' : 'currentColor');
      c.setAttribute('fill-opacity', lit ? '1' : '0.5');
    });

    const shift = sx * 24;
    barRefs.current.forEach((r, i) => {
      if (!r) return;
      const w = g.R * 2.4 * (1 - i / (BARS + 2)) * (0.7 + 0.3 * Math.sin(i * 2.3 + shift));
      const c = p.x + Math.sin(i * 1.9 + shift * 0.7) * (2 + i * 1.5);
      r.setAttribute('x', (c - w / 2).toFixed(1));
      r.setAttribute('width', Math.max(2, w).toFixed(1));
      r.setAttribute('opacity', (lift1 * (0.92 - i * 0.085)).toFixed(3));
    });

    const lw = labelW.current;
    placeLabel(endARef.current, sa, lw.a, g, amt * 1.4 - 0.4, p.x, sy);
    placeLabel(endBRef.current, sb, lw.b, g, amt * 1.4 - 0.4, p.x, sy);
  }, [placeLabel]);

  /* ---------- animation loop ---------- */

  const raf = useRef(0);
  const last = useRef(0);
  const run = useRef(false);

  const tick = useCallback(
    (t: number) => {
      const e = eng.current;
      if (!e) return;
      const dt = Math.min((t - last.current) / 1000, 1 / 30);
      last.current = t;
      let moving = false;
      for (const s of [e.sun, e.lift, e.ga, e.gb, e.amt]) {
        if (stepSpring(s, t, dt)) moving = true;
      }
      paint();
      raf.current = moving && run.current ? requestAnimationFrame(tick) : 0;
    },
    [paint],
  );

  const kick = useCallback(() => {
    if (raf.current || !run.current) return;
    last.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  }, [tick]);

  /* ---------- environment ---------- */

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
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setW(w);
    });
    ro.observe(root);
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(root);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!inView) return;
    const sync = () =>
      setNow((prev) => {
        const next = readNow(timeZone);
        if (prev && prev.day === next.day && Math.floor(prev.t * 60) === Math.floor(next.t * 60)) return prev;
        return next;
      });
    sync();
    const id = window.setInterval(sync, 20000);
    return () => window.clearInterval(id);
  }, [timeZone, inView]);

  useEffect(() => {
    if (inView && now && !started) setStarted(true);
  }, [inView, now, started]);

  useEffect(() => {
    run.current = started && inView && !reduced;
    if (run.current) kick();
    else if (raf.current) {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    }
  }, [started, inView, reduced, kick]);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      window.clearTimeout(eng.current?.timer);
    },
    [],
  );

  /* ---------- targets for the day on display ---------- */

  const todayKey = now && now.day === dispIdx ? Math.floor(now.t * 60) : -2;

  useEffect(() => {
    const e = eng.current;
    if (!started || !e || !dm) return;
    window.clearTimeout(e.timer);
    const span = model.end - model.start;
    const S = (t: number) => clamp((t - model.start) / span, 0, 1);
    const isToday = todayKey >= 0;
    const nowT = todayKey >= 0 ? todayKey / 60 : 0;
    const t0 = performance.now();
    const aim = (s: Spring, to: number, k?: number, c?: number, delay = 0) => {
      s.to = to;
      if (k) s.k = k;
      if (c) s.c = c;
      s.wake = delay ? t0 + delay : 0;
    };
    const intro = e.intro && !reduced;
    e.intro = false;

    if (dm.open) {
      aim(e.amt, 1, 90, 15, intro ? 420 : 0);
      aim(e.ga, S(dm.o), 90, 12);
      aim(e.gb, S(dm.c), 55, 10);
      if (e.amt.x < 0.03) {
        e.ga.x = e.ga.to;
        e.gb.x = e.gb.to;
        e.ga.v = 0;
        e.gb.v = 0;
      }
      if (reduced) {
        aim(e.sun, S(dm.o));
        aim(e.lift, 1);
      } else if (isToday) {
        aim(e.sun, S(nowT), intro ? 34 : 60, intro ? 8.5 : 11, intro ? 260 : 0);
        aim(e.lift, nowT >= model.start && nowT <= model.end ? 1 : 0, 120, 14, intro ? 120 : 0);
      } else {
        aim(e.lift, 1, 120, 14, intro ? 120 : 0);
        aim(e.sun, S(dm.o), 120, 16, intro ? 260 : 0);
        e.timer = window.setTimeout(
          () => {
            aim(e.sun, S(dm.c), 34, 8.5);
            kick();
          },
          intro ? 1100 : 460,
        );
      }
    } else {
      aim(e.amt, 0, 90, 15);
      aim(e.lift, isToday && nowT >= model.start && nowT <= model.end && !reduced ? 1 : 0, 120, 14);
      if (isToday && !reduced) aim(e.sun, S(nowT), 60, 11);
    }

    if (reduced) {
      for (const s of [e.sun, e.lift, e.ga, e.gb, e.amt]) {
        s.x = s.to;
        s.v = 0;
        s.wake = 0;
      }
      paint();
    } else {
      kick();
    }
  }, [started, dispIdx, model, todayKey, reduced, dm, kick, paint]);

  useEffect(() => {
    if (endARef.current) labelW.current.a = endARef.current.offsetWidth || 60;
    if (endBRef.current) labelW.current.b = endBRef.current.offsetWidth || 60;
    paint();
  }, [geo, model, dispIdx, clock, started, paint]);

  /* ---------- interaction ---------- */

  const choose = (i: number) => {
    setSel(i);
    setHov(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!n) return;
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (baseIdx + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (baseIdx - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    choose(next);
    chipRefs.current[next]?.focus();
  };

  const onStageDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onStageUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.id !== e.pointerId || !n) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy) * 1.5) {
      choose(dx < 0 ? (baseIdx + 1) % n : (baseIdx - 1 + n) % n);
    }
  };

  /* ---------- render ---------- */

  const g = geo;
  const span = model.end - model.start;
  const fmt = (t: number) => formatTime(t, clock);
  const hoursText = dm && dm.open ? [fmt(dm.o), fmt(dm.c)] : null;
  const chipHours = g.W >= 760;
  // when the full weekday name does not fit its chip, use the first two letters (Mo, Tu, We, Th...), never one
  const chipW = (g.W - 2 * g.pad - 6 * Math.max(0, n - 1)) / Math.max(1, n);
  const fullFits = hours.every((d) => Array.from(d.label).length * 10 + 14 <= chipW);
  const shortLabels = (() => {
    for (let len = 2; len <= 4; len++) {
      const list = hours.map((d) => Array.from(d.label).slice(0, len).join(''));
      if (new Set(list).size === list.length) return list;
    }
    return hours.map((d) => d.label);
  })();
  const showReadoutAnim = !reduced;

  const rootStyle = {
    '--sa-tint': skyTint,
    '--sa-pad': `${g.pad.toFixed(1)}px`,
    '--sa-R': `${g.R.toFixed(1)}px`,
    '--sa-ref': `${g.ref}px`,
    '--sa-hours-fs': `${g.hoursFs.toFixed(1)}px`,
    '--sa-day-fs': `${g.dayFs.toFixed(1)}px`,
    '--n': Math.max(1, n),
    '--i': dispIdx,
  } as CSSProperties;

  const readout = day ? (
    <div
      className={[styles.readout, g.compact ? styles.readoutCompact : ''].filter(Boolean).join(' ')}
      style={
        g.compact
          ? { opacity: started ? 1 : 0 }
          : { insetInlineStart: g.textLeft, insetBlockEnd: 30, maxInlineSize: g.textMax, opacity: started ? 1 : 0 }
      }
    >
      <p
        key={`d${dispIdx}`}
        className={[styles.dayName, showReadoutAnim ? styles.rise : ''].filter(Boolean).join(' ')}
        style={{ '--d': '0ms' } as CSSProperties}
      >
        {day.day}
      </p>
      <p
        key={`h${dispIdx}`}
        className={[styles.hours, showReadoutAnim ? styles.rise : ''].filter(Boolean).join(' ')}
        style={{ '--d': '70ms' } as CSSProperties}
      >
        {hoursText ? (
          <>
            <span>{hoursText[0]}</span>
            <span className={styles.hoursDash}>{'\u2013'}</span>
            <span>{hoursText[1]}</span>
          </>
        ) : (
          closedLabel
        )}
      </p>
    </div>
  ) : null;

  const summary = day
    ? `${day.day}: ${hoursText ? `${hoursText[0]} to ${hoursText[1]}` : closedLabel}.${status.text ? ` ${status.text}.` : ''}`
    : '';

  return (
    <div
      ref={rootRef}
      className={[styles.root, g.compact ? styles.rootCompact : '', className].filter(Boolean).join(' ')}
      style={rootStyle}
    >
      <div ref={boxRef} className={styles.box}>
        <span className={styles.sky} aria-hidden="true" />
        <span className={styles.skyGlow} aria-hidden="true" />

        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          {showOpenNow && status.text && (
            <p className={styles.badge} style={{ opacity: started ? 1 : 0 }}>
              <span className={status.open ? styles.dotOpen : styles.dotClosed} aria-hidden="true" />
              <span>{status.text}</span>
            </p>
          )}
        </div>

        <div
          className={styles.stage}
          style={{ blockSize: g.stageH }}
          onPointerDown={onStageDown}
          onPointerUp={onStageUp}
          onPointerCancel={() => {
            swipe.current = null;
          }}
        >
          <svg
            className={styles.arcSvg}
            width={g.W}
            height={g.stageH}
            viewBox={`0 0 ${g.W} ${g.stageH}`}
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <filter id={`${uid}-blur`} x="-20%" y="-60%" width="140%" height="220%">
                <feGaussianBlur stdDeviation={g.compact ? 6 : 9} />
              </filter>
            </defs>
            <path className={styles.track} d={arcD(g, 0, 1)} />
            <g filter={`url(#${uid}-blur)`} stroke="#ffe27a" fill="none" strokeLinecap="round">
              <path ref={haloAllRef} opacity="0" />
              <path ref={haloBrightRef} opacity="0" stroke="#fff3b8" />
            </g>
            <path ref={coreRemainRef} fill="none" stroke="#ffeaa0" strokeLinecap="round" opacity="0" />
            <path ref={coreBrightRef} fill="none" stroke="#fffbe4" strokeLinecap="round" opacity="0" />
            <g className={styles.dots}>
              {model.hourMarks.map((h, i) => {
                const p = pt(g, (h - model.start) / span);
                return (
                  <circle
                    key={h}
                    ref={(el) => {
                      dotRefs.current[i] = el;
                    }}
                    cx={p.x}
                    cy={p.y}
                    r={h % 3 === 0 ? 3.2 : 1.9}
                    fill="currentColor"
                    fillOpacity="0.5"
                  />
                );
              })}
            </g>
          </svg>

          <div className={styles.sunLayer} aria-hidden="true">
            <div ref={sunRef} className={styles.sunPos}>
              <span className={styles.bloom} />
              <span className={styles.ring} />
              <span className={styles.disc} />
            </div>
          </div>

          <span ref={endARef} className={styles.endLabel} style={{ opacity: 0 }} aria-hidden="true">
            {dm && dm.open ? fmt(dm.o) : ''}
          </span>
          <span ref={endBRef} className={styles.endLabel} style={{ opacity: 0 }} aria-hidden="true">
            {dm && dm.open ? fmt(dm.c) : ''}
          </span>

          {!g.compact && readout}
        </div>
      </div>

      <div className={styles.water}>
        <svg
          className={styles.waterSvg}
          width={g.W}
          height={g.ref}
          viewBox={`0 0 ${g.W} ${g.ref}`}
          aria-hidden="true"
          focusable="false"
        >
          <path className={styles.ropePeach} d={`M0 ${g.ref * 0.46}H${g.W}`} />
          <path className={styles.ropeFoam} d={`M0 ${g.ref * 0.46}H${g.W}`} />
          {Array.from({ length: BARS }, (_, i) => (
            <rect
              key={i}
              ref={(el) => {
                barRefs.current[i] = el;
              }}
              className={styles.bar}
              y={4 + i * ((g.ref - 10) / BARS)}
              height={g.compact ? 2.4 : 3}
              rx={1.5}
              opacity="0"
            />
          ))}
        </svg>

        {g.compact && readout}

        <div
          className={styles.chips}
          role="radiogroup"
          aria-label={title}
          aria-description="Choose a weekday with the left and right arrow keys, or swipe the sky sideways."
          onKeyDown={onKeyDown}
          onPointerLeave={() => setHov(null)}
        >
          {started && n > 0 && (
            <span
              className={styles.pill}
              aria-hidden="true"
              style={reduced ? { transition: 'none' } : undefined}
            />
          )}
          {hours.map((d, i) => {
            const m = model.days[i];
            const checked = started && i === dispIdx;
            const isToday = i === todayIdx;
            const range = m && m.open ? `${fmt(m.o)}\u2013${fmt(m.c)}` : closedLabel;
            return (
              <button
                key={i}
                ref={(el) => {
                  chipRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={i === baseIdx}
                aria-label={`${d.day}, ${m && m.open ? `${fmt(m.o)} to ${fmt(m.c)}` : closedLabel}${isToday ? ', today' : ''}`}
                tabIndex={i === baseIdx ? 0 : -1}
                className={[
                  styles.chip,
                  g.compact ? styles.chipCompact : '',
                  checked ? styles.chipOn : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => choose(i)}
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse') setHov(i);
                }}
                onFocus={() => setHov(null)}
              >
                {isToday && <span className={checked ? styles.todayDotOn : styles.todayDot} aria-hidden="true" />}
                <span className={styles.chipLabel}>{fullFits ? d.label : shortLabels[i]}</span>
                {!g.compact && chipHours && <span className={styles.chipHours}>{range}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <span className={styles.grain} aria-hidden="true" />
      <p className={styles.srOnly} aria-live="polite">
        {summary}
      </p>
    </div>
  );
}
```

```css
@font-face {
  font-family: 'Instrument Sans';
  src: url('./fonts/instrument-sans-latin-wght.woff2') format('woff2');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}

.root {
  --sa-ink: #1c1a57;
  --sa-tint: #9ba7f5;
  --sa-peach: #ffd2b0;
  --sa-dusk: #ffae9e;
  --sa-butter: #ffe27a;
  --sa-foam: #f6f2ff;
  --sa-gap: 6px;
  --sa-font: 'Instrument Sans', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --sa-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.11  0 0 0 0 0.10  0 0 0 0 0.34  0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 28px;
  background: var(--sa-ink);
  color: var(--sa-ink);
  font-family: var(--sa-font);
  box-shadow:
    0 34px 70px -38px rgba(32, 28, 110, 0.6),
    0 2px 6px rgba(32, 28, 110, 0.12);
}

.root::selection {
  background: var(--sa-butter);
  color: var(--sa-ink);
}

.rootCompact {
  border-radius: 22px;
}

.box {
  position: relative;
  z-index: 1;
}

/* ---------- sky ---------- */

.sky {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    color-mix(
        in oklab,
        var(--sa-tint) calc((1 - var(--phase, 0.3)) * 100%),
        color-mix(in oklab, var(--sa-tint) 78%, #2d2a8a)
      )
      0%,
    color-mix(
        in oklab,
        color-mix(in oklab, var(--sa-tint) 52%, #ffdcc8) calc((1 - var(--phase, 0.3)) * 100%),
        color-mix(in oklab, var(--sa-tint) 66%, #f3b9d8)
      )
      58%,
    color-mix(in oklab, var(--sa-peach) calc((1 - var(--phase, 0.3)) * 100%), var(--sa-dusk)) 100%
  );
}

.skyGlow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: calc(0.3 + 0.7 * var(--lift, 0));
  background: radial-gradient(
    ellipse 48% 66% at var(--sx, 20%) calc(100% - var(--sb, 0px)),
    rgba(255, 241, 182, 0.95) 0,
    rgba(255, 226, 160, 0.52) 17%,
    rgba(255, 207, 170, 0.24) 42%,
    transparent 74%
  );
}

/* ---------- header ---------- */

.header {
  position: relative;
  z-index: 4;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding-block: clamp(18px, 3.4cqi, 34px) 0;
  padding-inline: var(--sa-pad);
}

.title {
  margin: 0;
  max-inline-size: 100%;
  font-size: clamp(1.0625rem, 1.7cqi, 1.375rem);
  font-weight: 620;
  letter-spacing: -0.015em;
  line-height: 1.2;
  text-wrap: balance;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  max-inline-size: 100%;
  box-sizing: border-box;
  padding-block: 9px;
  padding-inline: 13px 17px;
  border: 1px solid rgba(28, 26, 87, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: 0 8px 20px -12px rgba(28, 26, 87, 0.45);
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.005em;
  font-variant-numeric: tabular-nums;
  transition: opacity 700ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.dotOpen,
.dotClosed {
  flex: none;
  inline-size: 10px;
  block-size: 10px;
  border-radius: 50%;
}

.dotOpen {
  background: var(--sa-butter);
  box-shadow:
    0 0 0 2px var(--sa-ink),
    0 0 0 6px rgba(255, 226, 122, 0.55);
}

.dotClosed {
  box-shadow: inset 0 0 0 2px var(--sa-ink);
}

/* ---------- stage (the arc) ---------- */

.stage {
  position: relative;
  z-index: 2;
  touch-action: pan-y;
}

.arcSvg {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  overflow: visible;
  pointer-events: none;
  color: var(--sa-ink);
}

.track {
  fill: none;
  stroke: var(--sa-ink);
  stroke-opacity: 0.42;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-dasharray: 0.1 8;
}

.dots {
  color: var(--sa-ink);
}

.sunLayer {
  position: absolute;
  inset: 0;
  clip-path: inset(-500px -500px 0 -500px);
  pointer-events: none;
}

.sunPos {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  inline-size: 0;
  block-size: 0;
  will-change: transform;
}

.bloom {
  position: absolute;
  inset-block-start: calc(var(--sa-R) * -3.6);
  inset-inline-start: calc(var(--sa-R) * -3.6);
  inline-size: calc(var(--sa-R) * 7.2);
  block-size: calc(var(--sa-R) * 7.2);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 244, 190, 0.95) 0,
    rgba(255, 230, 140, 0.55) 17%,
    rgba(255, 214, 160, 0.2) 40%,
    transparent 68%
  );
}

.ring {
  position: absolute;
  inset-block-start: calc(var(--sa-R) * -1.62);
  inset-inline-start: calc(var(--sa-R) * -1.62);
  inline-size: calc(var(--sa-R) * 3.24);
  block-size: calc(var(--sa-R) * 3.24);
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 50%;
}

.disc {
  position: absolute;
  inset-block-start: calc(var(--sa-R) * -1);
  inset-inline-start: calc(var(--sa-R) * -1);
  inline-size: calc(var(--sa-R) * 2);
  block-size: calc(var(--sa-R) * 2);
  border-radius: 50%;
  background: radial-gradient(circle at 38% 32%, #fffbe3 0, #fff2ad 30%, var(--sa-butter) 62%, #ffd257 100%);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.55),
    0 0 34px 6px rgba(255, 230, 130, 0.75);
}

.endLabel {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  z-index: 3;
  padding-block: 2px;
  font-size: 0.9375rem;
  font-weight: 650;
  letter-spacing: -0.005em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  pointer-events: none;
  will-change: transform;
}

/* ---------- readout ---------- */

.readout {
  position: absolute;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-sizing: border-box;
  color: var(--sa-ink);
  transition: opacity 700ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.readoutCompact {
  position: relative;
  gap: 2px;
  margin-block: 6px 18px;
  color: var(--sa-foam);
}

.dayName {
  margin: 0;
  font-size: var(--sa-day-fs);
  font-weight: 620;
  letter-spacing: -0.012em;
  line-height: 1.3;
  opacity: 0.82;
}

.hours {
  margin: 0;
  font-size: var(--sa-hours-fs);
  font-weight: 540;
  letter-spacing: -0.048em;
  line-height: 1.02;
  font-variant-numeric: tabular-nums;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.hoursDash {
  margin-inline: 0.14em;
  font-weight: 380;
  opacity: 0.5;
}

.rise {
  animation: rise 680ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: var(--d, 0ms);
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* ---------- water ---------- */

.water {
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  padding-block: var(--sa-ref) clamp(16px, 2.6cqi, 28px);
  padding-inline: var(--sa-pad);
  border-block-start: 1px solid rgba(255, 255, 255, 0.6);
  background: linear-gradient(
    180deg,
    color-mix(in oklab, var(--sa-tint) 60%, var(--sa-ink)) 0%,
    color-mix(in oklab, var(--sa-tint) 22%, var(--sa-ink)) 48%,
    var(--sa-ink) 100%
  );
  color: var(--sa-foam);
}

.waterSvg {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  pointer-events: none;
}

.ropePeach,
.ropeFoam {
  fill: none;
  stroke-width: 5;
  stroke-linecap: round;
  stroke-dasharray: 0.1 24;
}

.ropePeach {
  stroke: var(--sa-peach);
  stroke-opacity: 0.8;
}

.ropeFoam {
  stroke: var(--sa-foam);
  stroke-opacity: 0.7;
  stroke-dashoffset: -12;
}

.bar {
  fill: #fff0a6;
}

/* ---------- weekday chips ---------- */

.chips {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--n, 7), minmax(0, 1fr));
  gap: var(--sa-gap);
}

.pill {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: calc((100% - (var(--n, 7) - 1) * var(--sa-gap)) / var(--n, 7));
  border-radius: 16px;
  background: var(--sa-butter);
  box-shadow: 0 10px 24px -12px rgba(255, 226, 122, 0.85);
  transform: translateX(calc(var(--i, 0) * (100% + var(--sa-gap))));
  transition: transform 640ms cubic-bezier(0.3, 1.32, 0.45, 1);
}

.chip {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-inline-size: 0;
  min-block-size: 74px;
  box-sizing: border-box;
  padding-block: 8px;
  padding-inline: 4px;
  border: 1px solid rgba(246, 242, 255, 0.22);
  border-radius: 16px;
  background: rgba(246, 242, 255, 0.07);
  color: var(--sa-foam);
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color 220ms ease,
    border-color 220ms ease,
    color 220ms ease;
}

.chip:hover {
  background: rgba(246, 242, 255, 0.16);
}

.chip:focus-visible {
  outline: 2px solid var(--sa-butter);
  outline-offset: 3px;
}

.chipCompact {
  padding-inline: 2px;
  min-block-size: 48px;
  border-radius: 13px;
}

.chipOn {
  border-color: transparent;
  background: transparent;
  color: var(--sa-ink);
}

.chipOn:hover {
  background: transparent;
}

.chipLabel {
  max-inline-size: 100%;
  overflow: hidden;
  font-size: 0.9375rem;
  font-weight: 640;
  letter-spacing: -0.005em;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chipHours {
  max-inline-size: 100%;
  overflow: hidden;
  font-size: 0.8125rem;
  font-weight: 450;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  opacity: 0.86;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todayDot,
.todayDotOn {
  position: absolute;
  inset-block-start: 7px;
  inset-inline-end: 7px;
  inline-size: 6px;
  block-size: 6px;
  border-radius: 50%;
}

.todayDot {
  background: var(--sa-butter);
}

.todayDotOn {
  background: var(--sa-ink);
}

/* ---------- finish ---------- */

.grain {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  background-image: var(--sa-noise);
  background-size: 180px 180px;
  mix-blend-mode: multiply;
  opacity: 0.17;
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
}

@media (prefers-reduced-motion: reduce) {
  .rise {
    animation: none;
  }

  .pill {
    transition: none;
  }

  .badge,
  .readout {
    transition: none;
  }
}
```
