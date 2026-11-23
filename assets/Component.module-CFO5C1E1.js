const n=`@font-face {
  font-family: 'Jost Glass';
  src: url('./fonts/jost-latin-300-normal.woff2') format('woff2');
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Space Grotesk Glass';
  src: url('./fonts/space-grotesk-500.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

/* Dark cinematic architecture: full-bleed photo, smoked-glass slabs, one pale ink */
.root {
  --sd-night: #07080a;
  --sd-smoke: linear-gradient(180deg, #151920 0%, #0b0d11 100%);
  --sd-ink: #f1efe9;
  --sd-ink-dim: rgba(241, 239, 233, 0.66);
  --sd-font-display: 'Jost Glass', system-ui, sans-serif;
  --sd-font-ui: 'Space Grotesk Glass', ui-monospace, Menlo, sans-serif;
  --sd-gutter: clamp(18px, 4cqi, 56px);
  --sd-dwell: 7000ms;
  --sd-n: 6;

  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  inline-size: 100%;
  container-type: inline-size;
  overflow: clip;
  background: var(--sd-night);
  color: var(--sd-ink);
  font-family: var(--sd-font-ui);
  outline: none;
}

.root ::selection {
  background: rgba(241, 239, 233, 0.3);
  color: #fff;
}

.root:focus-visible {
  outline: 2px solid var(--sd-ink);
  outline-offset: -4px;
}

.window {
  position: relative;
  direction: ltr;
  aspect-ratio: 21 / 9;
  overflow: clip;
  background: var(--sd-night);
  touch-action: pan-y;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

@container (max-width: 900px) {
  .window {
    aspect-ratio: 16 / 10;
  }
}

@container (max-width: 560px) {
  .window {
    aspect-ratio: 4 / 5;
  }
}

/* ---------- photo layers ---------- */

.slide {
  position: absolute;
  /* bleed past the clipped window: no edge bands at fractional sizes */
  inset: -3px;
  inline-size: calc(100% + 6px);
  block-size: calc(100% + 6px);
  object-fit: cover;
  opacity: 0;
  transform: scale(1.02);
  transition: opacity 420ms ease;
  background: linear-gradient(168deg, #1b1e24 0%, #0d0f12 100%);
  pointer-events: none;
  user-select: none;
}

.slideActive {
  opacity: 1;
  z-index: 1;
  animation: sdDrift var(--sd-dwell) cubic-bezier(0.37, 0.16, 0.63, 0.84) both;
}

.root[data-playing='false'] .slideActive,
.root[data-visible='false'] .slideActive {
  animation-play-state: paused;
}

@keyframes sdDrift {
  from {
    transform: scale(1.03) translate(0, 0);
  }

  to {
    transform: scale(1.09) translate(-1%, 0.6%);
  }
}

/* low grade so type and controls hold on any photo */
.light {
  position: absolute;
  inset: -3px;
  z-index: 2;
  pointer-events: none;
  background:
    linear-gradient(0deg, rgba(7, 8, 10, 0.86) 0%, rgba(7, 8, 10, 0.5) 30%, transparent 62%),
    rgba(7, 8, 10, 0.12);
}

/* ---------- smoked-glass slabs ---------- */

.deck {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}

.panel {
  position: absolute;
  /* bleed past the clipped window so subpixel rounding never shows the photo */
  inset-block: -3px;
  /* opaque slabs: no see-through seams */
  margin-inline-end: -1px;
  box-sizing: content-box;
  padding-inline-end: 1px;
  background: var(--sd-smoke);
  will-change: transform;
  transition: transform var(--sd-dur, 700ms) cubic-bezier(0.76, 0, 0.18, 1) var(--sd-d, 0ms);
}

/* open: slabs parked fully clear of the photo */
.panel {
  transform: translateX(calc(var(--sd-sign) * var(--sd-off) * 100%));
}

.root[data-phase='closing'] .panel,
.root[data-phase='closed'] .panel {
  transform: translateX(0);
}

/* ---------- type ---------- */

.hud {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  z-index: 4;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  column-gap: var(--sd-gutter);
  padding: 0 var(--sd-gutter) clamp(18px, 3.2cqi, 44px);
  pointer-events: none;
}

.caption {
  min-inline-size: 0;
  max-inline-size: min(100%, 22em);
}

.captionText {
  margin: 0;
  font-family: var(--sd-font-display);
  font-weight: 300;
  font-size: clamp(30px, 6.2cqi, 92px);
  line-height: 1.08;
  letter-spacing: -0.035em;
  text-wrap: balance;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
  color: var(--sd-ink);
  opacity: 0;
  transform: translateY(0.35em);
  transition: opacity 700ms ease, transform 900ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.root[data-phase='open'] .captionText {
  opacity: 1;
  transform: none;
  transition-delay: 120ms;
}

.controls {
  display: flex;
  align-items: center;
  gap: 2px;
  pointer-events: auto;
  padding-block-end: 0.4em;
}

.count {
  margin-inline-end: clamp(8px, 1.4cqi, 20px);
  font-size: 13px;
  letter-spacing: 0.1em;
  font-variant-numeric: tabular-nums;
  color: var(--sd-ink);
  white-space: nowrap;
}

.countSep {
  color: var(--sd-ink-dim);
}

.pauseBtn,
.nav {
  appearance: none;
  display: grid;
  place-items: center;
  inline-size: 44px;
  block-size: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--sd-ink);
  cursor: pointer;
  transition: background-color 200ms ease, transform 200ms ease;
  -webkit-tap-highlight-color: transparent;
}

.pauseBtn:hover,
.nav:hover {
  background: rgba(241, 239, 233, 0.14);
}

.nav:active,
.pauseBtn:active {
  transform: scale(0.94);
}

.navPrev:hover .navIcon {
  transform: translateX(-2px);
}

.navNext:hover .navIcon {
  transform: translateX(2px);
}

.pauseBtn:focus-visible,
.nav:focus-visible {
  outline: 2px solid var(--sd-ink);
  outline-offset: 1px;
}

.navIcon {
  inline-size: 20px;
  block-size: 20px;
  transition: transform 200ms ease;
}

.pauseIcon {
  inline-size: 14px;
  block-size: 14px;
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

@container (max-width: 560px) {
  .hud {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 8px;
  }

  .controls {
    justify-content: space-between;
    margin-inline: -12px;
    padding-inline: 12px;
  }

  .count {
    margin-inline-end: auto;
  }

  .captionText {
    font-size: clamp(28px, 10cqi, 44px);
  }
}

/* reduced motion: slabs stay parked, photos simply crossfade */
@media (prefers-reduced-motion: reduce) {
  .panel {
    transition: none;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  .slideActive {
    animation: none;
  }

  .captionText,
  .root[data-phase='open'] .captionText {
    transition: none;
    transform: none;
    opacity: 1;
  }

  .nav,
  .pauseBtn,
  .navIcon {
    transition: none;
  }
}
`;export{n as default};
