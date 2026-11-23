import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import styles from './Component.module.css';

export interface NumeralStepsListStep {
  title: string;
  text: string;
}

export interface NumeralStepsListProps {
  heading?: string;
  steps?: NumeralStepsListStep[];
  numeralColor?: string;
  textColor?: string;
  showConnectingLine?: boolean;
  className?: string;
}

export const defaultSteps: NumeralStepsListStep[] = [
  {
    title: 'Feed the starter',
    text: 'Every evening the levain gets a fresh measure of flour and warm water. By morning it has risen again, with the kind of appetite you can almost hear.',
  },
  {
    title: 'Knead by hand',
    text: 'Twenty minutes on the oak table, no machines. The dough changes under your palms from shaggy to smooth, and that is exactly when you stop.',
  },
  {
    title: 'Proof overnight',
    text: 'The loaves rest in the cold room for eleven slow hours. Time does most of the work here; we only keep the temperature honest.',
  },
  {
    title: 'Bake on stone',
    text: 'At dawn the loaves meet the stone floor of the oven at 250 degrees. Within a minute, the crust starts to sing.',
  },
  {
    title: 'Rest, then slice',
    text: 'A full hour of resting before the first cut, so the crumb sets soft and open. Then it goes to the counter, still warm.',
  },
];

// Fraction of the viewport height where the ink level of a numeral is read.
const ACTIVATION_LINE = 0.62;
// Bodoni Moda lining digits inside a line-height:1 box: glyph top and baseline.
const GLYPH_TOP = 0.1025;
const GLYPH_BOTTOM = 0.8725;
// Vertical room above/below the glyph so an empty or full vessel is perfectly clean.
const MARGIN = 0.09;
const SURFACE_POINTS = 14;
const SLICE_COUNT = 10;
const SLICES = Array.from({ length: SLICE_COUNT }, (_, i) => i + 1);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (p: number) => p * p * (3 - 2 * p);

const bez = (a: number, b: number, c: number, d: number, t: number) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

// The thread between two numerals, measured in the pixels of its own box.
// Wide box (desktop zigzag): one liquid S-curve swinging from this numeral to the next.
// Narrow box (phone): a gently waving vertical line.
interface Geo {
  d: string;
  xs: number[];
  ys: number[];
  ss: number[];
}
const buildThread = (w: number, h: number, flip: boolean): Geo => {
  const N = 72;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    let x: number;
    let y: number;
    if (w > 48) {
      x = bez(0, 0, w, w, t);
      y = bez(0, h * 1.12, -h * 0.12, h, t);
    } else {
      y = h * t;
      x = w / 2 + 4.5 * Math.sin((y / 58) * Math.PI * 2);
    }
    xs.push(flip ? w - x : x);
    ys.push(y);
  }
  const ss = [0];
  for (let k = 1; k <= N; k++) ss.push(ss[k - 1] + Math.hypot(xs[k] - xs[k - 1], ys[k] - ys[k - 1]));
  const total = ss[N] || 1;
  for (let k = 0; k <= N; k++) ss[k] /= total;
  const d = xs.map((x, k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${ys[k].toFixed(1)}`).join(' ');
  return { d, xs, ys, ss };
};
const pointAt = (g: Geo | undefined, f: number): [number, number] => {
  if (!g) return [0, 0];
  for (let k = 1; k < g.ss.length; k++) {
    if (g.ss[k] >= f) {
      const span = g.ss[k] - g.ss[k - 1] || 1;
      const m = (f - g.ss[k - 1]) / span;
      return [g.xs[k - 1] + (g.xs[k] - g.xs[k - 1]) * m, g.ys[k - 1] + (g.ys[k] - g.ys[k - 1]) * m];
    }
  }
  return [g.xs[g.xs.length - 1], g.ys[g.ys.length - 1]];
};

interface Sim {
  init: boolean;
  live: boolean;
  top: number;
  nv: number; // smoothed, normalised scroll speed (+ = scrolling down)
  L: number; vL: number; // ink level
  S: number; vS: number; // surface slosh (tilt)
  A: number; vA: number; // ripple amplitude
  H: number; vH: number; // extrusion toward the reader
  seg: number; vSeg: number; // thread head
  phase: number;
  cured: boolean;
  arrived: boolean;
}

const makeSim = (): Sim => ({
  init: false, live: true, top: 0, nv: 0,
  L: 0, vL: 0, S: 0, vS: 0, A: 0, vA: 0, H: 0, vH: 0, seg: 0, vSeg: 0,
  phase: 0, cured: false, arrived: false,
});

const spring = (x: number, v: number, target: number, k: number, c: number, dt: number): [number, number] => {
  const nv = v + (-k * (x - target) - c * v) * dt;
  return [x + nv * dt, nv];
};

// Surface of the ink in a glyph box (fractions of its height), as two polygon strings.
const buildSurface = (L: number, S: number, A: number, phase: number) => {
  const level = clamp(L, 0, 1);
  const top = GLYPH_BOTTOM + MARGIN - level * (GLYPH_BOTTOM - GLYPH_TOP + MARGIN * 2);
  const fade = Math.min(1, level * 9, (1 - level) * 9);
  const ys: number[] = [];
  for (let k = 0; k <= SURFACE_POINTS; k++) {
    const x = k / SURFACE_POINTS;
    const meniscus = 0.034 * (Math.exp(-x * 13) + Math.exp(-(1 - x) * 13));
    ys.push(top + fade * (S * (x - 0.5) + A * Math.sin(x * 7 + phase) + 0.4 * A * Math.sin(x * 15 - phase * 1.3) - meniscus));
  }
  const xs = ys.map((_, k) => ((k / SURFACE_POINTS) * 100).toFixed(2));
  const edge = ys.map((y, k) => `${xs[k]}% ${(y * 100).toFixed(2)}%`);
  const poly = `polygon(0% 100%, ${edge.join(', ')}, 100% 100%)`;
  let sheen = 'polygon(0% 0%, 0% 0%, 0% 0%)';
  if (fade > 0.02) {
    const band = 0.05;
    const low = ys.map((y, k) => `${xs[k]}% ${((y + band) * 100).toFixed(2)}%`).reverse();
    sheen = `polygon(${edge.join(', ')}, ${low.join(', ')})`;
  }
  return { poly, sheen };
};

export default function NumeralStepsList({
  heading = 'How we bake',
  steps = defaultSteps,
  numeralColor = '#3f2334',
  textColor = '#3a322f',
  showConnectingLine = true,
  className,
}: NumeralStepsListProps) {
  const uid = useId();
  const headingId = `${uid}-heading`;
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Array<HTMLLIElement | null>>([]);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const threadRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const titleRefs = useRef<Array<HTMLHeadingElement | null>>([]);
  const geo = useRef<Array<Geo | undefined>>([]);
  const sims = useRef<Sim[]>([]);
  const raf = useRef(0);
  const lastT = useRef(0);
  const dirty = useRef(true);

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
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.02 });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  // Thread geometry in real pixels + title fitting (an unbreakable word shrinks to fit before it ever breaks).
  const stepsKey = steps.map((st) => st.title).join('\u0001');
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      threadRefs.current.forEach((th, i) => {
        if (!th) return;
        const w = th.offsetWidth;
        const h = th.offsetHeight;
        if (!w || !h) return;
        const g = buildThread(w, h, w > 48 && i % 2 === 1);
        geo.current[i] = g;
        th.querySelectorAll('path').forEach((pth) => pth.setAttribute('d', g.d));
      });
      titleRefs.current.forEach((el) => {
        if (!el) return;
        el.style.setProperty('--fit', '1');
        el.removeAttribute('data-break');
        // Measure with word-breaking off, so a word that cannot fit shows up as overflow.
        el.style.overflowWrap = 'normal';
        const sw = el.scrollWidth;
        const cw = el.clientWidth;
        el.style.removeProperty('overflow-wrap');
        if (sw > cw + 1) {
          const f = cw / sw;
          el.style.setProperty('--fit', Math.max(0.5, f * 0.99).toFixed(3));
          if (f < 0.5) el.setAttribute('data-break', 'true');
        }
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    if (fonts && fonts.ready) fonts.ready.then(measure).catch(() => undefined);
    return () => ro.disconnect();
  }, [stepsKey, showConnectingLine]);

  useEffect(() => {
    sims.current = steps.map(() => makeSim());
    dirty.current = true;
  }, [steps.length, showConnectingLine]);

  useEffect(() => {
    const lis = stepRefs.current;
    if (reduced) {
      // The stylesheet defaults are the cured, fully readable, slightly extruded state.
      lis.forEach((li) => {
        if (!li) return;
        ['--poly', '--sheen', '--lift', '--rx', '--ry', '--gl', '--q', '--seg', '--px', '--py', '--stretch', '--drop'].forEach((p) =>
          li.style.removeProperty(p),
        );
      });
      return;
    }
    if (!inView) return;

    const step = (now: number) => {
      const dt = clamp((now - lastT.current) / 1000, 0.001, 1 / 30);
      lastT.current = now;
      const list = sims.current;
      const live = list.some((s) => s.live);
      if (!dirty.current && !live) return;
      dirty.current = false;
      const root = rootRef.current;
      const vh = window.innerHeight;
      if (!root || !vh) return;

      // Read pass.
      const rootBottom = root.getBoundingClientRect().bottom;
      // Near the end of the list the reading line slides to the bottom so the last numeral can finish.
      const t = clamp01((vh * 1.35 - rootBottom) / (vh * 0.35));
      const line = vh * ACTIVATION_LINE + (vh * 0.995 - vh * ACTIVATION_LINE) * t;
      const btnRects = buttonRefs.current.map((b) => (b ? b.getBoundingClientRect() : null));
      const thrRects = threadRefs.current.map((th) => (th ? th.getBoundingClientRect() : null));

      // Simulate + write pass.
      list.forEach((s, i) => {
        const li = lis[i];
        const r = btnRects[i];
        if (!li || !r) return;
        const h = Math.max(1, r.height);
        const glyphTop = r.top + GLYPH_TOP * h;
        const raw = clamp01((line - glyphTop) / ((GLYPH_BOTTOM - GLYPH_TOP) * h));
        const Lt = smooth(raw);
        const tr = thrRects[i];
        // The thread leaves the numeral a little before it is full, and lands as the next one begins.
        const lead = 0.22 * h;
        const segT = tr ? clamp01((line - (tr.top - lead)) / Math.max(1, tr.height + lead)) : 0;
        const dir = i % 2 === 0 ? 1 : -1;

        const speed = s.init ? clamp(-(r.top - s.top) / dt / 1800, -1, 1) : 0;
        s.nv += (speed - s.nv) * 0.3;
        s.top = r.top;

        if (!s.init) {
          s.init = true;
          s.L = Lt; s.seg = segT;
          s.cured = Lt > 0.97;
          s.H = s.cured ? 1 : 0;
          s.arrived = segT > 0.985;
        }

        // Beat 1: the level of wet ink rises with the reader, overshooting a touch.
        [s.L, s.vL] = spring(s.L, s.vL, Lt, 150, 17, dt);
        // Beat 2: the surface sloshes against scroll inertia, rippling while it moves.
        [s.S, s.vS] = spring(s.S, s.vS, -s.nv * 0.07, 60, 3.2, dt);
        const filling = s.L > 0.03 && s.L < 0.97;
        const At = filling ? 0.011 + Math.min(0.03, Math.abs(s.vL) * 0.02) : 0;
        [s.A, s.vA] = spring(s.A, s.vA, At, 40, 5, dt);
        s.phase += dt * (3 + Math.abs(s.vL) * 8);

        // Beat 3: once the vessel is full the ink cures and the numeral thuds out toward the reader.
        if (!s.cured && s.L > 0.97) {
          s.cured = true;
          s.vH += 4.5;
          s.vS += 0.9;
          s.vA += 0.2;
        } else if (s.cured && s.L < 0.85) {
          s.cured = false;
        }
        [s.H, s.vH] = spring(s.H, s.vH, s.cured ? 1 : 0, 170, 10, dt);

        // Beat 4: the thread leads the pour, a drop on its head, and splashes into the next numeral.
        [s.seg, s.vSeg] = spring(s.seg, s.vSeg, segT, 150, 20, dt);
        if (tr) {
          if (!s.arrived && s.seg > 0.985) {
            s.arrived = true;
            const next = list[i + 1];
            if (next && next.init) {
              next.vS += 0.6;
              next.vA += 0.35;
            }
          } else if (s.arrived && s.seg < 0.9) {
            s.arrived = false;
          }
        }

        const { poly, sheen } = buildSurface(s.L, s.S, s.A, s.phase);
        const lift = clamp(s.H, 0, 1.4);
        const ry = -15 * lift * dir + s.S * 150;
        const rx = 6 * lift - s.S * 55;
        const seg = clamp01(s.seg);
        const q = smooth(clamp01((s.L - 0.22) / 0.5));
        const st = li.style;
        st.setProperty('--poly', poly);
        st.setProperty('--sheen', sheen);
        st.setProperty('--lift', lift.toFixed(3));
        st.setProperty('--rx', `${rx.toFixed(2)}deg`);
        st.setProperty('--ry', `${ry.toFixed(2)}deg`);
        st.setProperty('--gl', clamp(0.5 - (ry * dir) / 46, 0.05, 0.95).toFixed(3));
        st.setProperty('--q', q.toFixed(3));
        st.setProperty('--seg', seg.toFixed(4));
        const [px, py] = pointAt(geo.current[i], seg);
        st.setProperty('--px', px.toFixed(1));
        st.setProperty('--py', py.toFixed(1));
        st.setProperty('--stretch', (1 + Math.min(1.2, Math.abs(s.vSeg) * 0.4)).toFixed(3));
        st.setProperty('--drop', clamp01(Math.min(seg * 25, (1 - seg) * 18)).toFixed(3));

        s.live =
          Math.abs(s.L - Lt) > 0.0006 || Math.abs(s.vL) > 0.003 ||
          Math.abs(s.S) > 0.0006 || Math.abs(s.vS) > 0.01 ||
          s.A > 0.0006 || Math.abs(s.vA) > 0.01 ||
          Math.abs(s.H - (s.cured ? 1 : 0)) > 0.002 || Math.abs(s.vH) > 0.02 ||
          Math.abs(s.seg - segT) > 0.0006 || Math.abs(s.vSeg) > 0.003 ||
          filling;
      });
    };

    const mark = () => {
      dirty.current = true;
    };
    window.addEventListener('scroll', mark, { passive: true, capture: true });
    window.addEventListener('resize', mark);

    lastT.current = performance.now();
    dirty.current = true;
    step(lastT.current + 16);
    const loop = (now: number) => {
      raf.current = requestAnimationFrame(loop);
      step(now);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('scroll', mark, { capture: true });
      window.removeEventListener('resize', mark);
    };
  }, [reduced, inView, steps.length, showConnectingLine]);

  const jumpTo = (index: number) => {
    const li = stepRefs.current[index];
    if (!li) return;
    li.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  };

  const rootStyle = {
    '--nsl-numeral': numeralColor,
    '--nsl-text': textColor,
  } as CSSProperties;

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <span className={styles.light} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />
      <div className={styles.inner}>
        {heading ? (
          <h2 id={headingId} className={styles.heading}>
            {heading}
          </h2>
        ) : null}
        <ol className={styles.list} aria-labelledby={heading ? headingId : undefined}>
          {steps.map((step, i) => {
            const numeral = String(i + 1).padStart(2, '0');
            const label = `Go to step ${i + 1}${step.title ? `: ${step.title}` : ''}`;
            const rev = i % 2 === 1;
            return (
              <li
                key={i}
                className={[styles.step, rev ? styles.stepRev : '', reduced ? styles.stepStill : styles.stepLive].join(' ')}
                ref={(el) => { stepRefs.current[i] = el; }}
              >
                <div className={styles.rail}>
                  <button
                    type="button"
                    className={styles.numeralButton}
                    onClick={() => jumpTo(i)}
                    aria-label={label}
                    ref={(el) => { buttonRefs.current[i] = el; }}
                  >
                    <span className={styles.stage} aria-hidden="true">
                      <span className={styles.pool} />
                      <span className={styles.numeral}>
                        {numeral.split('').map((d, k) => (
                          <span key={k} className={styles.digit}>
                            <span className={styles.ghost}>{d}</span>
                            {SLICES.map((n) => (
                              <span key={n} className={styles.slice} style={{ '--i': n } as CSSProperties}>
                                {d}
                              </span>
                            ))}
                            <span className={styles.ink}>{d}</span>
                            <span className={styles.sheen}>{d}</span>
                          </span>
                        ))}
                      </span>
                    </span>
                  </button>
                  {showConnectingLine && i < steps.length - 1 && (
                    <span
                      className={[styles.thread, rev ? styles.threadBack : styles.threadFwd].join(' ')}
                      aria-hidden="true"
                      ref={(el) => { threadRefs.current[i] = el; }}
                    >
                      <svg className={styles.threadSvg} focusable="false">
                        <path className={styles.threadTrack} pathLength={1} />
                        <path className={styles.threadInk} pathLength={1} />
                        <path className={styles.threadGlint} pathLength={1} />
                      </svg>
                      <span className={styles.drop} />
                    </span>
                  )}
                </div>
                <div className={styles.body}>
                  <div className={styles.copy}>
                    {step.title ? (
                      <h3 className={styles.title} ref={(el) => { titleRefs.current[i] = el; }}>
                        {step.title}
                      </h3>
                    ) : null}
                    {step.text ? <p className={styles.text}>{step.text}</p> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
