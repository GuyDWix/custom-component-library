const n=`import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  /** what selects a weekday: a click/tap on the strip (default), or hovering it */
  selectTrigger?: 'click' | 'hover';
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
  const m = /^\\s*(\\d{1,2})(?::(\\d{2}))?\\s*$/.exec(s ?? '');
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
  if (clock === '24h') return \`\${String(h).padStart(2, '0')}:\${mm}\`;
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return m ? \`\${h12}:\${mm}\${suffix}\` : \`\${h12}\${suffix}\`;
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
    ref: compact ? 20 : 28,
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
  return \`M\${p.x.toFixed(1)} \${p.y.toFixed(1)}A\${g.rx.toFixed(1)} \${g.ry.toFixed(1)} 0 0 1 \${q.x.toFixed(1)} \${q.y.toFixed(1)}\`;
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
  selectTrigger = 'click',
  className,
}: SunArcOpeningHoursProps) {
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
  const coreRemainRef = useRef<SVGPathElement>(null);
  const coreBrightRef = useRef<SVGPathElement>(null);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
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
      return { open: true, text: \`\${openNowLabel} \\u00B7 \${closesAtLabel} \${formatTime(today.c, clock)}\` };
    }
    for (let k = 0; k <= n; k++) {
      const idx = (now.day + k) % n;
      const d = model.days[idx];
      if (!d || !d.open) continue;
      if (k === 0 && now.t >= d.o) continue;
      const when = k === 0 ? formatTime(d.o, clock) : \`\${hours[idx]?.label ?? ''} \${formatTime(d.o, clock)}\`;
      return { open: false, text: \`\${closedLabel} \\u00B7 \${opensLabel} \${when}\` };
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
      el.style.transform = \`translate(\${left.toFixed(1)}px, \${top.toFixed(1)}px)\`;
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
    const sy = p.y + (1 - lift) * Math.max(g.R * 2.6, g.stageH - p.y + 120);

    box.style.setProperty('--sx', \`\${p.x.toFixed(1)}px\`);
    box.style.setProperty('--sb', \`\${(g.stageH - sy).toFixed(1)}px\`);
    box.style.setProperty('--phase', clamp(sx * 0.82 + (1 - lift1) * 0.22, 0, 1).toFixed(3));
    box.style.setProperty('--lift', lift1.toFixed(3));
    if (sunRef.current) sunRef.current.style.transform = \`translate3d(\${p.x.toFixed(1)}px, \${sy.toFixed(1)}px, 0)\`;

    const sa = clamp(e.ga.x, 0, 1);
    const sb = Math.max(sa, clamp(e.gb.x, 0, 1));
    const el = clamp(sx, sa, sb);
    const setPath = (node: SVGPathElement | null, a: number, b: number, opacity: number, width: number) => {
      if (!node) return;
      node.setAttribute('d', arcD(g, a, b));
      node.setAttribute('opacity', (opacity * amt).toFixed(3));
      node.setAttribute('stroke-width', (width * (0.25 + 0.75 * amt)).toFixed(2));
    };
    setPath(coreRemainRef.current, el, sb, 0.55, 1.5);
    setPath(coreBrightRef.current, sa, el, 1, 2.25);

    const marks = modelRef.current;
    const span = marks.end - marks.start;
    dotRefs.current.forEach((c, i) => {
      if (!c) return;
      const h = marks.hourMarks[i];
      if (h === undefined) return;
      const s = (h - marks.start) / span;
      const lit = amt > 0.05 && s >= sa - 0.002 && s <= el + 0.002;
      c.setAttribute('fill', lit ? '#fff4d6' : 'currentColor');
      c.setAttribute('fill-opacity', lit ? '1' : '0.4');
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
        aim(e.lift, nowT >= dm.o && nowT <= dm.c ? 1 : 0, 120, 14, intro ? 120 : 0);
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
      aim(e.lift, isToday && nowT >= dm.o && nowT <= dm.c && !reduced ? 1 : 0, 120, 14);
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
    '--sa-pad': \`\${g.pad.toFixed(1)}px\`,
    '--sa-R': \`\${g.R.toFixed(1)}px\`,
    '--sa-ref': \`\${g.ref}px\`,
    '--sa-hours-fs': \`\${g.hoursFs.toFixed(1)}px\`,
    '--sa-day-fs': \`\${g.dayFs.toFixed(1)}px\`,
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
        key={\`d\${dispIdx}\`}
        className={[styles.dayName, showReadoutAnim ? styles.rise : ''].filter(Boolean).join(' ')}
        style={{ '--d': '0ms' } as CSSProperties}
      >
        {day.day}
      </p>
      <p
        key={\`h\${dispIdx}\`}
        className={[styles.hours, showReadoutAnim ? styles.rise : ''].filter(Boolean).join(' ')}
        style={{ '--d': '70ms' } as CSSProperties}
      >
        {hoursText ? (
          <>
            <span>{hoursText[0]}</span>
            <span className={styles.hoursDash}>{'\\u2013'}</span>
            <span>{hoursText[1]}</span>
          </>
        ) : (
          closedLabel
        )}
      </p>
    </div>
  ) : null;

  const summary = day
    ? \`\${day.day}: \${hoursText ? \`\${hoursText[0]} to \${hoursText[1]}\` : closedLabel}.\${status.text ? \` \${status.text}.\` : ''}\`
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
            viewBox={\`0 0 \${g.W} \${g.stageH}\`}
            aria-hidden="true"
            focusable="false"
          >
            <path className={styles.track} d={arcD(g, 0, 1)} />
            <path ref={coreRemainRef} fill="none" stroke="#f3d9b0" strokeLinecap="round" opacity="0" />
            <path ref={coreBrightRef} fill="none" stroke="#fff6e0" strokeLinecap="round" opacity="0" />
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
                    r={h % 3 === 0 ? 2.6 : 1.5}
                    fill="currentColor"
                    fillOpacity="0.5"
                  />
                );
              })}
            </g>
          </svg>

          <div className={styles.sunLayer} aria-hidden="true">
            <div ref={sunRef} className={styles.sunPos}>
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
            const range = m && m.open ? \`\${fmt(m.o)}\\u2013\${fmt(m.c)}\` : closedLabel;
            return (
              <button
                key={i}
                ref={(el) => {
                  chipRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={i === baseIdx}
                aria-label={\`\${d.day}, \${m && m.open ? \`\${fmt(m.o)} to \${fmt(m.c)}\` : closedLabel}\${isToday ? ', today' : ''}\`}
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
                  if (e.pointerType === 'mouse' && selectTrigger === 'hover') setHov(i);
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
`;export{n as default};
