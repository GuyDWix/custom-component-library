Create a custom element called "Electric Frame". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: heading, body text, button label and link, border color, intensity, speed, corner radius. Add other settings if they help.

```tsx
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import styles from './Component.module.css';

export interface ElectricFrameProps {
  heading?: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  color?: string;
  /** 0-100: how far the border is pulled off its straight line, and glow strength */
  intensity?: number;
  /** 0.25-3: animation speed multiplier */
  speed?: number;
  /** corner radius in px */
  radius?: number;
  /** replaces the default heading/body/CTA */
  children?: ReactNode;
  className?: string;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export default function ElectricFrame({
  heading = 'One plan for the whole studio',
  body = 'Unlimited projects, shared libraries and priority support, billed once a year with no surprise add-ons.',
  ctaLabel = 'Start free trial',
  ctaHref,
  color = '#7cc4ff',
  intensity = 55,
  speed = 1,
  radius = 24,
  children,
  className,
}: ElectricFrameProps) {
  const [reduced, setReduced] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const filterId = `ef${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Drive the offsets from rAF (SMIL on filter primitives starts late in some browsers); pause off-screen
  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg || reduced) return;
    const offsets = Array.from(svg.querySelectorAll('feOffset'));
    const periodMs = 6000 / clamp(speed, 0.25, 3);
    let raf = 0;
    let visible = true;
    const tick = (now: number) => {
      const t = (now % periodMs) / periodMs;
      offsets.forEach((el, i) => {
        const dist = i < 2 ? 700 : 490;
        const v = i % 2 === 0 ? dist * (1 - t) : -dist * t;
        el.setAttribute(i < 2 ? 'dy' : 'dx', v.toFixed(1));
      });
      raf = visible ? requestAnimationFrame(tick) : 0;
    };
    raf = requestAnimationFrame(tick);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    });
    io.observe(root);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [reduced, speed]);

  const k = clamp(intensity, 0, 100) / 100;
  const live = !reduced && k > 0;
  const scale = (14 + k * 30).toFixed(1);
  const style = {
    '--ef-color': color,
    '--ef-radius': `${radius}px`,
    ...(live ? { '--ef-filter': `url(#${filterId})` } : null),
  } as CSSProperties;

  return (
    <div ref={rootRef} className={`${styles.root} ${className ?? ''}`} style={style}>
      {live && (
        <svg ref={svgRef} className={styles.defs} aria-hidden="true" focusable="false">
          <defs>
            <filter id={filterId} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
              {[
                { seed: 1, attr: 'dy', values: '700;0', result: 'n1' },
                { seed: 1, attr: 'dy', values: '0;-700', result: 'n2' },
                { seed: 2, attr: 'dx', values: '490;0', result: 'n3' },
                { seed: 2, attr: 'dx', values: '0;-490', result: 'n4' },
              ].map((n) => (
                <Fragment key={n.result}>
                  <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="8" seed={n.seed} result={`${n.result}t`} />
                  <feOffset in={`${n.result}t`} dx="0" dy="0" result={n.result} />
                </Fragment>
              ))}
              <feComposite in="n1" in2="n2" result="p1" />
              <feComposite in="n3" in2="n4" result="p2" />
              <feBlend in="p1" in2="p2" mode="color-dodge" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale={scale} xChannelSelector="R" yChannelSelector="B" />
            </filter>
          </defs>
        </svg>
      )}
      <div className={styles.bgGlow} aria-hidden="true" />
      <div className={styles.outer} aria-hidden="true" />
      <div className={styles.main} aria-hidden="true" />
      <div className={styles.glowTight} aria-hidden="true" />
      <div className={styles.glowWide} aria-hidden="true" />
      <div className={styles.overlay} aria-hidden="true" />
      <div className={`${styles.overlay} ${styles.overlayHalf}`} aria-hidden="true" />
      <div className={styles.card}>
        {children ?? (
          <>
            <h3 className={styles.heading}>{heading}</h3>
            <hr className={styles.divider} />
            {body && <p className={styles.body}>{body}</p>}
            {ctaLabel &&
              (ctaHref ? (
                <a className={styles.cta} href={ctaHref}>
                  {ctaLabel}
                  <Arrow />
                </a>
              ) : (
                <button type="button" className={styles.cta}>
                  {ctaLabel}
                  <Arrow />
                </button>
              ))}
          </>
        )}
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <svg className={styles.arrow} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

```css
.root {
  --ef-color: #7cc4ff;
  --ef-light: var(--ef-color);
  --ef-tint: color-mix(in srgb, var(--ef-color) 40%, transparent);
  --ef-radius: 24px;
  --ef-filter: none;
  --ef-bg: #2b2b2b;
  --ef-text: #f4f6fa;
  --ef-muted: #adb4c2;
  --ef-font: 'Bricolage Grotesque', system-ui, -apple-system, 'Segoe UI', sans-serif;
  position: relative;
  box-sizing: border-box;
  inline-size: 100%;
  padding: 2px;
  border-radius: var(--ef-radius);
  font-family: var(--ef-font);
  container-type: inline-size;
  background:
    linear-gradient(-30deg, var(--ef-tint), transparent, var(--ef-tint)),
    linear-gradient(#171717, #171717);
}
@supports (color: oklch(from red l c h)) {
  .root {
    --ef-light: oklch(from var(--ef-color) l c h);
    --ef-tint: oklch(from var(--ef-color) 0.3 calc(c / 2) h / 0.4);
  }
}
.defs {
  position: absolute;
  inline-size: 0;
  block-size: 0;
  overflow: hidden;
}
.outer,
.main,
.glowTight,
.glowWide,
.overlay,
.bgGlow {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border-radius: var(--ef-radius);
  pointer-events: none;
}
.outer {
  border: 2px solid color-mix(in srgb, var(--ef-color) 50%, transparent);
}
.main {
  border: 2px solid var(--ef-color);
  inset: -2px 2px 2px -2px;
  filter: var(--ef-filter);
}
.glowTight {
  border: 2px solid color-mix(in srgb, var(--ef-color) 60%, transparent);
  filter: blur(1px);
}
.glowWide {
  border: 2px solid var(--ef-light);
  filter: blur(4px);
}
.overlay,
.overlayHalf {
  mix-blend-mode: overlay;
  transform: scale(1.1);
  filter: blur(16px);
  background: linear-gradient(-30deg, #fff, transparent 30%, transparent 70%, #fff);
}
.overlayHalf {
  opacity: 0.5;
}
.bgGlow {
  z-index: -1;
  opacity: 0.3;
  transform: scale(1.1);
  filter: blur(32px);
  background: linear-gradient(-30deg, var(--ef-light), transparent, var(--ef-color));
}
.card {
  position: relative;
  box-sizing: border-box;
  min-block-size: 30rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: clamp(1.5rem, 9cqi, 3rem);
  color: var(--ef-text);
}
.heading {
  margin: auto 0 0;
  padding-block-end: 1rem;
  font-size: clamp(1.9rem, 10cqi, 2.6rem);
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: -0.025em;
  text-wrap: balance;
  overflow-wrap: anywhere;
}
.divider {
  align-self: stretch;
  margin: 0;
  border: 0;
  block-size: 1px;
  background: currentColor;
  opacity: 0.12;
  mask-image: linear-gradient(to right, transparent, #000, transparent);
}
.body {
  margin: 1rem 0 0;
  max-inline-size: 36ch;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--ef-muted);
  overflow-wrap: anywhere;
}
.cta {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  margin-block-start: 1.4rem;
  padding: 0.75rem 1.2rem;
  border: 1px solid color-mix(in srgb, var(--ef-color) 60%, transparent);
  border-radius: calc(var(--ef-radius) * 0.55);
  background: color-mix(in srgb, var(--ef-color) 12%, transparent);
  color: var(--ef-text);
  font: inherit;
  font-size: 0.95rem;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.2s ease-out, color 0.2s ease-out;
}
.cta:hover {
  background: var(--ef-color);
  color: #07101c;
}
.cta:active {
  transform: translateY(1px);
}
.cta:focus-visible {
  outline: 2px solid var(--ef-text);
  outline-offset: 3px;
}
.arrow {
  flex: none;
  transition: transform 0.2s ease-out;
}
.cta:hover .arrow {
  transform: translateX(3px);
}
@media (prefers-reduced-motion: reduce) {
  .cta,
  .arrow {
    transition: none;
  }
}
```
