import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import styles from './Component.module.css';

export interface WaxSealInviteProps {
  heading?: string;
  text?: string;
  dateLine?: string;
  sealInitials?: string;
  sealColor?: string;
  envelopeColor?: string;
  className?: string;
}

const OVERLAP = 0.3;
const FLAP = 0.6;
const HEADROOM_GAP = 24;

const OPENING = {
  '--ws-o': 1,
  '--ws-flap-z': 2,
  '--ws-d-crack': '0ms',
  '--ws-d-shadow': '100ms',
  '--ws-d-flap': '140ms',
  '--ws-d-flap-z': '440ms',
  '--ws-d-clip': '540ms',
  '--ws-d-card': '540ms',
  '--ws-d-env': '420ms',
  '--ws-t-flap': '620ms',
  '--ws-t-card': '1100ms',
  '--ws-e-card':
    'linear(0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 18.9%, 0.721 25.3%, 0.849 31.5%, 0.937 38.1%, 0.968 41.8%, 0.991 45.7%, 1.006 50.1%, 1.015 55%, 1.017 63.9%, 1.001 85.3%, 1)',
};

const CLOSING = {
  '--ws-o': 0,
  '--ws-flap-z': 6,
  '--ws-d-crack': '980ms',
  '--ws-d-shadow': '940ms',
  '--ws-d-flap': '440ms',
  '--ws-d-flap-z': '720ms',
  '--ws-d-clip': '500ms',
  '--ws-d-card': '0ms',
  '--ws-d-env': '380ms',
  '--ws-t-flap': '560ms',
  '--ws-t-card': '520ms',
  '--ws-e-card': 'cubic-bezier(0.55, 0, 0.3, 1)',
};

const CRUMBS = [0, 1, 2, 3, 4];

function SealFace({ initials, half, glint }: { initials: string; half: string; glint: boolean }) {
  return (
    <span className={`${styles.wax} ${half}`}>
      <span className={styles.stamp}>
        <span className={styles.initials}>{initials}</span>
      </span>
      <span className={styles.gloss} />
      {glint && <span className={styles.glint} />}
      <span className={styles.waxGrain} />
    </span>
  );
}

export default function WaxSealInvite({
  heading = 'Supper at Vale House',
  text = 'Join us for a long-table dinner in the walled garden: six courses from our kitchen, wines from the valley and candlelight until late.',
  dateLine = 'Saturday 14 June · 7 pm',
  sealInitials = 'VH',
  sealColor = '#6d1a24',
  envelopeColor = '#a3b29a',
  className,
}: WaxSealInviteProps) {
  const [open, setOpen] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [seen, setSeen] = useState(false);
  const [moving, setMoving] = useState(false);
  const uid = useId();
  const cardId = `${uid}-card`;

  const rootRef = useRef<HTMLDivElement>(null);
  const envRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

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
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setSeen(true);
        io.disconnect();
      },
      { threshold: 0.35 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const env = envRef.current;
    const card = cardRef.current;
    if (!root || !env || !card) return;
    const measure = () => {
      const envH = env.offsetHeight;
      const cardH = card.offsetHeight;
      const head = Math.max(cardH - envH * OVERLAP, envH * FLAP) + HEADROOM_GAP;
      root.style.setProperty('--ws-env-h', `${envH}px`);
      root.style.setProperty('--ws-head', `${Math.round(head)}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(env);
    ro.observe(card);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (reduced) {
      envRef.current?.animate([{ opacity: 0.15 }, { opacity: 1 }], { duration: 380, easing: 'ease-out' });
      return;
    }
    setMoving(true);
    const t = window.setTimeout(() => setMoving(false), 1800);
    return () => window.clearTimeout(t);
  }, [open, reduced]);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const hover = (on: boolean) => rootRef.current?.style.setProperty('--ws-h', on ? '1' : '0');

  const initials = sealInitials.trim();
  const iniScale = initials.length <= 2 ? 0.34 : initials.length === 3 ? 0.27 : 0.2;
  const glint = seen && !reduced;

  const rootStyle = {
    '--ws-seal': sealColor,
    '--ws-env': envelopeColor,
    '--ws-ini': iniScale,
    '--ws-t-env': moving ? '900ms' : '0ms',
    ...(open ? OPENING : CLOSING),
  } as CSSProperties;

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <span className={styles.grain} aria-hidden="true" />
      <div className={styles.stage}>
        <div
          ref={envRef}
          className={styles.envelope}
          onClick={toggle}
          onPointerEnter={() => hover(true)}
          onPointerLeave={() => hover(false)}
        >
          <span className={styles.ground} aria-hidden="true" />
          <span className={styles.back} aria-hidden="true" />

          <div className={styles.flap} aria-hidden="true">
            <span className={styles.flapOuter} />
            <span className={styles.flapInner} />
            <span className={styles.sealTop}>
              <SealFace initials={initials} half={styles.waxTop} glint={glint} />
            </span>
          </div>

          <div className={styles.sleeve}>
            <article ref={cardRef} id={cardId} className={styles.card} aria-hidden={!open}>
              <span className={styles.cardFrame} aria-hidden="true" />
              <span className={styles.ornament} aria-hidden="true" />
              <h3 className={styles.heading}>{heading}</h3>
              {text && <p className={styles.text}>{text}</p>}
              {dateLine && <p className={styles.date}>{dateLine}</p>}
              <span className={styles.cardTexture} aria-hidden="true" />
            </article>
          </div>

          <span className={styles.pocketLeft} aria-hidden="true" />
          <span className={styles.pocketRight} aria-hidden="true" />
          <span className={styles.pocketBottomWrap} aria-hidden="true">
            <span className={styles.pocketBottom} />
          </span>
          <span className={styles.flapShadowWrap} aria-hidden="true">
            <span className={styles.flapShadow} />
          </span>

          <span className={styles.sealBottom} aria-hidden="true">
            <SealFace initials={initials} half={styles.waxBottom} glint={glint} />
          </span>
          {open && !reduced && (
            <span className={styles.crumbs} aria-hidden="true">
              {CRUMBS.map((i) => (
                <span key={i} className={styles.crumb} style={{ '--i': i } as CSSProperties} />
              ))}
            </span>
          )}

          <button
            type="button"
            className={styles.sealButton}
            aria-expanded={open}
            aria-controls={cardId}
            aria-label={open ? `Close the envelope: ${heading}` : `Break the seal to open: ${heading}`}
          />
        </div>
      </div>
    </div>
  );
}
