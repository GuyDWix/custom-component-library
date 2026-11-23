const e=`import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import styles from './Component.module.css';

export type HangingTagShape = 'classic' | 'round' | 'arch';

export interface HangingTagCardProps {
  title?: string;
  price?: string;
  note?: string;
  stringColor?: string;
  inkColor?: string;
  tagShape?: HangingTagShape;
  className?: string;
}

/* Resting angle of the tag around its eyelet (center of mass under the hole). */
const SHAPE_REST: Record<HangingTagShape, number> = { classic: 0.14, round: 0, arch: 0 };

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const SHAPE_CLASS: Record<HangingTagShape, string> = {
  classic: styles.shapeClassic,
  round: styles.shapeRound,
  arch: styles.shapeArch,
};

/* String pendulum (around the nail) and tag pendulum (around the eyelet). */
const WS = 2.5; // string natural frequency, rad/s (a heavy tag on a long cord: slow, lazy swing)
const CS = 0.36; // string damping
const WT = 5.0; // tag natural frequency, rad/s
const CT = 1.5; // tag damping
const KC = 1.0; // coupling: nail acceleration felt by the tag
const DRAG_STIFF = 380;
const DRAG_DAMP = 30;
const VEL_MAX = 3;
const DRAG_LIMIT = 1.15;

/* Direction the wall light travels (towards lower right): shadows fall this way. */
const LX = 0.78;
const LY = 0.62;

const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v));

const TAG_HELP =
  'A tag hanging from string. Brush, drag or tap it to swing; arrow keys push it, Escape settles it.';

type Motion = { th: number; w: number; ph: number; pw: number };
type Drag = { on: boolean; target: number; settle: boolean; pivotX: number; pivotY: number; t: number; x: number; y: number };

export default function HangingTagCard({
  title = 'Atelier Mug No. 12',
  price = '$38',
  note = 'Small-batch stoneware, thrown on the wheel and glazed in a soft sage green. Limited run of forty.',
  stringColor = '#a87c4e',
  inkColor = '#2c4a38',
  tagShape = 'classic',
  className,
}: HangingTagCardProps) {
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const uid = useId();
  const titleId = \`\${uid}-title\`;

  const rootRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  const nailRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const noteBoxRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLParagraphElement>(null);
  const motion = useRef<Motion>({ th: 0.07, w: 0, ph: SHAPE_REST[tagShape] + 0.07, pw: 0 });
  const drag = useRef<Drag>({ on: false, target: 0, settle: false, pivotX: 0, pivotY: 0, t: 0, x: 0, y: 0 });

  const paint = useCallback(() => {
    const rig = rigRef.current;
    if (!rig) return;
    const m = motion.current;
    const tot = m.th + m.ph;
    const c = Math.cos(tot);
    const s = Math.sin(tot);
    /* The wall light is fixed (raking in from the upper left). Express its direction in the tag's own,
       rotated frame so the contact shadow stays anchored to the tag and the eyelet highlight stays
       pointed at the light. Same again for the cord, which only turns with the string. */
    const sx = LX * c + LY * s;
    const sy = -LX * s + LY * c;
    const ct = Math.cos(m.th);
    const st = Math.sin(m.th);
    const lift = Math.min(1, Math.abs(m.w) * 0.32 + Math.abs(m.pw) * 0.1);
    const k = 1 + lift * 0.75;
    rig.style.setProperty('--theta', \`\${(m.th * (180 / Math.PI)).toFixed(2)}deg\`);
    rig.style.setProperty('--flop', \`\${(m.ph * (180 / Math.PI)).toFixed(2)}deg\`);
    rig.style.setProperty('--tot', \`\${(tot * (180 / Math.PI)).toFixed(2)}deg\`);
    rig.style.setProperty('--sway', Math.min(1, Math.abs(m.th) / 0.9).toFixed(3));
    rig.style.setProperty('--gx', \`\${(50 + m.th * 26).toFixed(1)}%\`);
    rig.style.setProperty('--lift', lift.toFixed(3));
    rig.style.setProperty('--sux', (sx * k).toFixed(3));
    rig.style.setProperty('--suy', (sy * k).toFixed(3));
    rig.style.setProperty('--cux', (LX * ct + LY * st).toFixed(3));
    rig.style.setProperty('--cuy', (-LX * st + LY * ct).toFixed(3));
    rig.style.setProperty('--lux', (-sx).toFixed(3));
    rig.style.setProperty('--luy', (-sy).toFixed(3));
    rig.style.setProperty('--glint', \`\${(m.th * 90).toFixed(1)}px\`);
  }, []);

  /* Fit the note to the room the tag really has: whole lines only, ellipsis on the last one,
     never a line cut through the middle. Hidden entirely when not even one line fits. */
  const fitNote = useCallback(() => {
    const box = noteBoxRef.current;
    const p = noteRef.current;
    const content = contentRef.current;
    if (!box || !p || !content) return;
    const lh = parseFloat(getComputedStyle(p).lineHeight);
    if (!lh) return;
    const lines = Math.max(0, Math.floor((box.clientHeight + 1) / lh));
    box.style.setProperty('--ht-note-lines', String(lines));
    content.dataset.noteFit = lines < 1 ? 'none' : 'ok';
  }, []);

  useIsoLayoutEffect(() => {
    fitNote();
    const content = contentRef.current;
    if (!content) return;
    const ro = new ResizeObserver(fitNote);
    ro.observe(content);
    document.fonts?.ready.then(fitNote).catch(() => {});
    return () => ro.disconnect();
  }, [fitNote, title, price, note, tagShape]);

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

  useEffect(() => {
    if (reduced) {
      const rest = SHAPE_REST[tagShape];
      motion.current = { th: 0, w: 0, ph: rest + 0.14, pw: 0 };
      paint();
      return;
    }
    if (!inView) return;
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const m = motion.current;
      const d = drag.current;
      const rest = SHAPE_REST[tagShape];
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let n = 0; n < steps; n++) {
        let acc;
        if (d.on) {
          acc = DRAG_STIFF * (d.target - m.th) - DRAG_DAMP * m.w;
        } else {
          acc = -WS * WS * Math.sin(m.th) - (d.settle ? CS * 6 : CS) * m.w;
        }
        m.w = clamp(m.w + acc * h, VEL_MAX);
        m.th += m.w * h;
        const accTag = -WT * WT * Math.sin(m.ph - rest) - (d.settle ? CT * 4 : CT) * m.pw - acc * KC;
        m.pw = clamp(m.pw + accTag * h, VEL_MAX);
        m.ph += m.pw * h;
      }
      if (d.settle && Math.abs(m.th) < 0.02 && Math.abs(m.w) < 0.05 && Math.abs(m.ph - rest) < 0.03 && Math.abs(m.pw) < 0.08) {
        d.settle = false;
      }
      paint();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [reduced, inView, tagShape, paint]);

  const settled = () => {
    const m = motion.current;
    return (
      Math.abs(m.th) < 0.07 &&
      Math.abs(m.w) < 0.2 &&
      Math.abs(m.ph - SHAPE_REST[tagShape]) < 0.12 &&
      Math.abs(m.pw) < 0.35
    );
  };

  const push = (dir: number, stringImp: number, tagImp: number) => {
    const m = motion.current;
    m.w += dir * stringImp;
    m.pw += dir * tagImp;
    drag.current.settle = false;
  };

  const aim = (clientX: number, clientY: number) => {
    const d = drag.current;
    const dx = clientX - d.pivotX;
    const dy = Math.max(clientY - d.pivotY, 30);
    d.target = clamp(Math.atan2(dx, dy), DRAG_LIMIT);
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (reduced) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const nail = nailRef.current?.getBoundingClientRect();
    if (nail) {
      drag.current.pivotX = nail.left + nail.width / 2;
      drag.current.pivotY = nail.top + nail.height / 2;
    }
    drag.current.on = true;
    drag.current.settle = false;
    drag.current.t = performance.now();
    drag.current.x = e.clientX;
    drag.current.y = e.clientY;
    aim(e.clientX, e.clientY);
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (reduced || !drag.current.on) return;
    aim(e.clientX, e.clientY);
  };

  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d.on) return;
    d.on = false;
    const dt = performance.now() - d.t;
    const dist = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    if (e.type === 'pointerup' && dt < 280 && dist < 10) {
      const rect = e.currentTarget.getBoundingClientRect();
      const dir = e.clientX < rect.left + rect.width / 2 ? 1 : -1;
      const touch = e.pointerType !== 'mouse';
      push(dir, touch ? 1.35 : 0.55, touch ? 0.6 : 0.3);
    }
  };

  const onPointerEnter = (e: PointerEvent<HTMLElement>) => {
    if (reduced || e.pointerType !== 'mouse' || drag.current.on || !settled()) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dir = e.clientX < rect.left + rect.width / 2 ? 1 : -1;
    push(dir, 0.75, 0.25);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      drag.current.settle = true;
      return;
    }
    if (reduced) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      push(e.key === 'ArrowRight' ? 1 : -1, 1.1, 0.5);
    }
  };

  const rootStyle = {
    '--ht-string': stringColor,
    '--ht-ink': inkColor,
  } as CSSProperties;

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <span className={styles.wallBroad} aria-hidden="true" />
      <span className={styles.wallPlaster} aria-hidden="true" />
      <span className={styles.wallGrit} aria-hidden="true" />
      <span className={styles.wallSun} aria-hidden="true" />
      <span className={styles.wallVignette} aria-hidden="true" />
      <div className={styles.stage}>
        <div className={[styles.scene, SHAPE_CLASS[tagShape]].join(' ')}>
          <span className={styles.crater} aria-hidden="true" />
          <div ref={rigRef} className={styles.rig}>
            <span className={styles.shadowRig} aria-hidden="true">
              <span className={styles.shadowSoft} />
              <span className={styles.shadowTight} />
            </span>
            <div className={styles.tagWrap}>
              <article
                className={styles.tag}
                tabIndex={0}
                aria-labelledby={title ? titleId : undefined}
                aria-label={title ? undefined : 'Hanging tag'}
                aria-description={TAG_HELP}
                onKeyDown={onKeyDown}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onPointerEnter={onPointerEnter}
              >
                <span className={styles.face} aria-hidden="true" />
                <span className={styles.fleck} aria-hidden="true" />
                <span className={styles.relief} aria-hidden="true" />
                <span className={styles.frame} aria-hidden="true" />
                <span className={styles.glare} aria-hidden="true" />
                <span className={styles.edge} aria-hidden="true" />
                <div ref={contentRef} className={styles.content} data-note-fit="ok">
                  {title && (
                    <h3 id={titleId} className={styles.title}>
                      {title}
                    </h3>
                  )}
                  {price && <p className={styles.price}>{price}</p>}
                  {note && <span className={styles.rule} aria-hidden="true" />}
                  {note && (
                    <div ref={noteBoxRef} className={styles.noteBox}>
                      <p ref={noteRef} className={styles.note}>
                        {note}
                      </p>
                    </div>
                  )}
                </div>
                <span className={styles.patch} aria-hidden="true" />
                <span className={styles.grommet} aria-hidden="true" />
                <span className={styles.grain} aria-hidden="true" />
              </article>
            </div>
            <span className={styles.cord} aria-hidden="true">
              <span className={styles.string} />
            </span>
            <span className={styles.tailA} aria-hidden="true" />
            <span className={styles.tailB} aria-hidden="true" />
            <span className={styles.wraps} aria-hidden="true" />
            <span className={styles.knot} aria-hidden="true" />
          </div>
          <span ref={nailRef} className={styles.nail} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
`;export{e as default};
