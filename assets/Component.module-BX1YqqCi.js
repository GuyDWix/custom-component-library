const n=`@font-face {
  font-family: 'Instrument Sans SAR';
  src: url('./fonts/instrument-sans-latin-wght.woff2') format('woff2');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}

.root {
  --sar-font: 'Instrument Sans SAR', 'Avenir Next', 'Segoe UI', 'Helvetica Neue', system-ui, sans-serif;
  --sar-paper: #e1eee7;
  --sar-paper-hi: #f2f9f5;
  --sar-paper-deep: #d3e5dc;
  --sar-strip: #d4e6dd;
  --sar-card: #f6fbf8;
  --sar-ink: #14284b;
  --sar-ink-soft: rgba(20, 40, 75, 0.68);
  --sar-hair: rgba(20, 40, 75, 0.2);
  --sar-accent: #ff5a1f;
  --sar-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --sar-spring: cubic-bezier(0.34, 1.45, 0.5, 1);
  --sar-play: paused;

  position: relative;
  isolation: isolate;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--sar-ink) 24%, transparent);
  background: var(--sar-paper);
  color: var(--sar-ink);
  font-family: var(--sar-font);
  font-variant-numeric: tabular-nums;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset, 0 28px 60px -40px rgba(20, 40, 75, 0.55);
}

.root[data-phase='play'] {
  --sar-play: running;
}

.root ::selection {
  background: color-mix(in srgb, var(--sar-accent) 30%, transparent);
}

.root button:focus-visible {
  outline: 2px solid var(--sar-accent);
  outline-offset: 2px;
}

/* ---------- chart ---------- */

.chart {
  position: relative;
  direction: ltr;
  overflow: hidden;
  background:
    radial-gradient(120% 95% at var(--px, 20%) var(--py, 85%), var(--sar-paper-hi) 0%, var(--sar-paper) 52%, var(--sar-paper-deep) 100%);
}

.svg {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  display: block;
  overflow: visible;
}

.grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: multiply;
  opacity: 0.42;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .08 0 0 0 0 .16 0 0 0 0 .3 0 0 0 .5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}

.layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* chart ink */

.strip {
  fill: var(--sar-strip);
}

.baseline {
  stroke: var(--sar-ink);
  stroke-opacity: 0.55;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.crossTick {
  fill: none;
  stroke: var(--sar-ink);
  stroke-opacity: 0.7;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.depth {
  fill: var(--sar-ink);
}

.contour {
  fill: none;
  stroke: var(--sar-ink);
  stroke-opacity: 0.3;
  stroke-width: 0.8;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.ring {
  fill: none;
  stroke: var(--sar-ink);
  stroke-opacity: 0.82;
  stroke-width: 1.25;
  vector-effect: non-scaling-stroke;
}

.ticks {
  fill: none;
  stroke: var(--sar-ink);
  stroke-opacity: 0.55;
  stroke-width: 0.9;
  vector-effect: non-scaling-stroke;
}

.bearing {
  fill: none;
  stroke: var(--sar-ink);
  stroke-opacity: 0.22;
  stroke-width: 0.8;
  stroke-dasharray: 2 5;
  vector-effect: non-scaling-stroke;
}

.mark {
  fill: none;
  stroke: var(--sar-ink);
  stroke-opacity: 0.34;
  stroke-width: 0.9;
  vector-effect: non-scaling-stroke;
}

.tint {
  fill: var(--sar-accent);
  opacity: 0;
  pointer-events: none;
  transition: opacity 320ms var(--sar-ease);
}

.tint[data-on='true'] {
  opacity: 0.17;
}

.edge {
  fill: none;
  stroke: var(--sar-accent);
  stroke-width: 2.4;
  opacity: 0;
  pointer-events: none;
  vector-effect: non-scaling-stroke;
  transition: opacity 260ms var(--sar-ease);
}

.edge[data-on='true'] {
  opacity: 1;
}

.ripple {
  fill: none;
  stroke: var(--sar-accent);
  stroke-width: 2;
  pointer-events: none;
  vector-effect: non-scaling-stroke;
  transform-box: view-box;
  animation: sar-ripple 820ms var(--sar-ease) both;
  animation-play-state: var(--sar-play);
}

.route {
  stroke: var(--sar-accent);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-dasharray: 1;
  pointer-events: none;
  vector-effect: non-scaling-stroke;
  animation: sar-route 520ms var(--sar-ease) both;
  animation-play-state: var(--sar-play);
}

.neat {
  fill: var(--sar-ink);
  fill-opacity: 0.82;
}

.neatLine {
  fill: none;
  stroke: var(--sar-ink);
  stroke-opacity: 0.85;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.roseSolid {
  fill: var(--sar-ink);
  stroke: var(--sar-ink);
  stroke-width: 0.8;
  stroke-linejoin: round;
}

.roseHollow {
  fill: var(--sar-paper-hi);
  stroke: var(--sar-ink);
  stroke-width: 0.8;
  stroke-linejoin: round;
}

.halo {
  fill: var(--sar-accent);
  fill-opacity: 0.22;
  transform-box: view-box;
  animation: sar-halo 1500ms var(--sar-ease) 520ms backwards;
  animation-play-state: var(--sar-play);
}

.pinRing {
  fill: var(--sar-accent);
  stroke: var(--sar-paper-hi);
  stroke-width: 3;
}

.pinCore {
  fill: var(--sar-paper-hi);
}

.hit {
  fill: transparent;
  pointer-events: all;
  cursor: pointer;
}

/* intro choreography: every layer rests in its final state; \`data-phase\` only
   holds the "from" state until the component scrolls into view */

.ringIn,
.contourIn,
.tickIn,
.roseIn,
.pinIn {
  transform-box: view-box;
}

.ringIn {
  animation: sar-ring 1150ms var(--sar-ease) calc(280ms + var(--i, 0) * 130ms) backwards;
  animation-play-state: var(--sar-play);
}

.contourIn {
  animation: sar-contour 1250ms var(--sar-ease) calc(480ms + var(--i, 0) * 130ms) backwards;
  animation-play-state: var(--sar-play);
}

.tickIn {
  animation: sar-ticks 1300ms var(--sar-ease) calc(560ms + var(--i, 0) * 130ms) backwards;
  animation-play-state: var(--sar-play);
}

.roseIn {
  animation: sar-rose 1000ms var(--sar-ease) 340ms backwards;
  animation-play-state: var(--sar-play);
}

.pinIn {
  animation: sar-pin 760ms var(--sar-spring) 120ms backwards;
  animation-play-state: var(--sar-play);
}

.fadeIn {
  animation: sar-fade 700ms var(--sar-ease) backwards;
  animation-play-state: var(--sar-play);
}

.fadeLate {
  animation: sar-fade 900ms var(--sar-ease) 700ms backwards;
  animation-play-state: var(--sar-play);
}

/* ---------- labels ---------- */

.centre {
  position: absolute;
  margin: 0;
  box-sizing: border-box;
  color: var(--sar-ink);
  font-size: 15px;
  font-weight: 650;
  line-height: 1.25;
  letter-spacing: -0.01em;
  overflow-wrap: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  pointer-events: none;
  animation: sar-fade 800ms var(--sar-ease) 600ms backwards;
  animation-play-state: var(--sar-play);
}

.centre::before {
  content: '';
  display: inline-block;
  inline-size: 9px;
  block-size: 9px;
  margin-inline-end: 9px;
  border-radius: 50%;
  background: var(--sar-accent);
  vertical-align: 0.05em;
}

.hood {
  position: absolute;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 6px 12px 6px 9px;
  border: 1px solid var(--sar-hair);
  border-radius: 16px;
  background: color-mix(in srgb, var(--sar-paper-hi) 90%, transparent);
  box-shadow: 0 1px 2px rgba(20, 40, 75, 0.08), 0 8px 18px -12px rgba(20, 40, 75, 0.4);
  color: var(--sar-ink);
  font: inherit;
  font-size: 13px;
  font-weight: 560;
  line-height: 1.25;
  text-align: start;
  cursor: pointer;
  pointer-events: auto;
  translate: -14px -50%;
  /* sized by its own text, never by the room left to the right edge */
  inline-size: max-content;
  max-inline-size: 176px;
  transition:
    background-color 200ms var(--sar-ease),
    color 200ms var(--sar-ease),
    border-color 200ms var(--sar-ease),
    box-shadow 200ms var(--sar-ease);
  animation: sar-hood 640ms var(--sar-spring) var(--d, 0ms) backwards;
  animation-play-state: var(--sar-play);
}

.hoodLeft {
  flex-direction: row-reverse;
  padding: 6px 9px 6px 12px;
  translate: calc(-100% + 14px) -50%;
}

.hoodMark {
  flex: none;
  inline-size: 10px;
  block-size: 10px;
  border-radius: 50%;
  background: var(--sar-ink);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sar-ink) 14%, transparent);
  transition:
    background-color 200ms var(--sar-ease),
    box-shadow 200ms var(--sar-ease);
}

.hoodText {
  min-inline-size: 0;
  overflow-wrap: break-word;
  text-wrap: balance;
}

/* hidden twin layer: the real label boxes are measured here so layout never guesses text width */
.measure {
  position: absolute;
  inset: 0;
  overflow: hidden;
  visibility: hidden;
  pointer-events: none;
}

.measure .hood {
  inset-inline-start: 0;
  inset-block-start: 0;
  translate: none;
  animation: none;
}

.hood:hover,
.hood[data-active='true'] {
  border-color: var(--sar-ink);
  background: var(--sar-ink);
  color: var(--sar-paper-hi);
}

.hood:hover .hoodMark,
.hood[data-active='true'] .hoodMark {
  background: var(--sar-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sar-accent) 35%, transparent);
}

.hoodCompact {
  padding: 0;
  gap: 8px;
  min-inline-size: 30px;
  min-block-size: 30px;
  justify-content: center;
  border-radius: 15px;
  translate: -15px -50%;
}

.hoodCompact:has(.hoodText) {
  justify-content: flex-start;
  padding: 6px 12px 6px 10px;
}

.hoodCompact.hoodLeft {
  translate: calc(-100% + 15px) -50%;
}

.hoodCompact.hoodLeft:has(.hoodText) {
  justify-content: flex-start;
  padding: 6px 10px 6px 12px;
}

/* ring scale on the legend strip (wide) */

.scale {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.pill {
  position: absolute;
  box-sizing: border-box;
  margin: 0;
  padding: 4px 11px;
  min-block-size: 28px;
  border: 1px solid var(--sar-hair);
  border-radius: 14px;
  background: var(--sar-paper-hi);
  color: var(--sar-ink);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
  text-align: center;
  inline-size: max-content;
  overflow-wrap: break-word;
  cursor: pointer;
  pointer-events: auto;
  translate: calc(-100% + 3px) 0;
  transition:
    background-color 200ms var(--sar-ease),
    color 200ms var(--sar-ease),
    border-color 200ms var(--sar-ease);
  animation: sar-hood 600ms var(--sar-ease) var(--d, 0ms) backwards;
  animation-play-state: var(--sar-play);
}

.pill:hover,
.pill[data-active='true'] {
  border-color: var(--sar-ink);
  background: var(--sar-ink);
  color: var(--sar-paper-hi);
}

/* ---------- cartouche (wide) and card (compact) ---------- */

.cartouche {
  position: absolute;
  inset-inline-start: 34px;
  inset-block-start: 34px;
  box-sizing: border-box;
  padding: 22px 22px 20px;
  border: 1px solid color-mix(in srgb, var(--sar-ink) 38%, transparent);
  border-radius: 6px;
  background: var(--sar-card);
  box-shadow: 0 1px 2px rgba(20, 40, 75, 0.1), 0 22px 40px -24px rgba(20, 40, 75, 0.5);
  animation: sar-cart 800ms var(--sar-ease) 1100ms backwards;
  animation-play-state: var(--sar-play);
}

.cartouche::after {
  content: '';
  position: absolute;
  inset: 4px;
  border: 1px solid color-mix(in srgb, var(--sar-ink) 18%, transparent);
  border-radius: 3px;
  pointer-events: none;
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.time {
  margin: 0;
  min-inline-size: 0;
  font-weight: 620;
  line-height: 1.05;
  letter-spacing: -0.035em;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.timeL {
  font-size: 44px;
}

.timeM {
  font-size: 32px;
}

.timeS {
  font-size: 24px;
  letter-spacing: -0.02em;
  line-height: 1.12;
}

.mini {
  flex: none;
  inline-size: 40px;
  block-size: 40px;
  margin-block-start: 4px;
  overflow: visible;
}

.miniArc {
  fill: none;
  stroke: var(--sar-ink);
  stroke-opacity: 0.4;
  stroke-width: 1.4;
  stroke-linecap: round;
  transition:
    stroke 260ms var(--sar-ease),
    stroke-opacity 260ms var(--sar-ease),
    stroke-width 260ms var(--sar-ease);
}

.miniArc[data-active='true'] {
  stroke: var(--sar-accent);
  stroke-opacity: 1;
  stroke-width: 3;
}

.miniPin {
  fill: var(--sar-accent);
}

.swap {
  animation: sar-swap 440ms var(--sar-ease) backwards;
  animation-play-state: var(--sar-play);
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 28px;
  margin: 16px 0 0;
  padding: 14px 0 0;
  border-block-start: 1px solid var(--sar-hair);
}

.fact {
  min-inline-size: 0;
}

.fact dt {
  margin: 0 0 3px;
  color: var(--sar-ink-soft);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
}

.fact dd {
  margin: 0;
  font-size: 19px;
  font-weight: 620;
  line-height: 1.15;
  letter-spacing: -0.015em;
  overflow-wrap: anywhere;
}

.hoodRow {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 320ms var(--sar-ease),
    opacity 240ms var(--sar-ease);
}

.hoodRow[data-open='true'] {
  grid-template-rows: 1fr;
  opacity: 1;
}

.hoodRowInner {
  min-block-size: 0;
  overflow: hidden;
}

.hoodRowText {
  display: flex;
  align-items: center;
  gap: 9px;
  padding-block-start: 14px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.hoodRowMark {
  flex: none;
  inline-size: 9px;
  block-size: 9px;
  border-radius: 50%;
  background: var(--sar-accent);
}

.card {
  box-sizing: border-box;
  padding: 18px 18px 22px;
  border-block-start: 1px solid color-mix(in srgb, var(--sar-ink) 30%, transparent);
  background: var(--sar-card);
}

.card .facts {
  margin-block-start: 14px;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-block-end: 18px;
}

.tab {
  box-sizing: border-box;
  min-block-size: 36px;
  margin: 0;
  padding: 6px 14px;
  border: 1px solid var(--sar-hair);
  border-radius: 18px;
  background: transparent;
  color: var(--sar-ink);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  overflow-wrap: anywhere;
  cursor: pointer;
  transition:
    background-color 200ms var(--sar-ease),
    color 200ms var(--sar-ease),
    border-color 200ms var(--sar-ease);
}

.tab[data-active='true'] {
  border-color: var(--sar-ink);
  background: var(--sar-ink);
  color: var(--sar-paper-hi);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
}

.chipItem {
  display: contents;
}

.chip {
  box-sizing: border-box;
  min-block-size: 36px;
  max-inline-size: 100%;
  margin: 0;
  padding: 6px 13px;
  border: 1px solid var(--sar-hair);
  border-radius: 18px;
  background: var(--sar-paper-hi);
  color: var(--sar-ink);
  font: inherit;
  font-size: 14px;
  font-weight: 540;
  line-height: 1.25;
  text-align: start;
  overflow-wrap: anywhere;
  cursor: pointer;
  transition:
    background-color 200ms var(--sar-ease),
    color 200ms var(--sar-ease),
    border-color 200ms var(--sar-ease);
}

.chip[data-active='true'],
.chip:hover {
  border-color: var(--sar-ink);
  background: var(--sar-ink);
  color: var(--sar-paper-hi);
}

.card .time.timeL {
  font-size: clamp(32px, 11cqi, 44px);
}

/* ---------- keyframes ---------- */

@keyframes sar-ring {
  from {
    transform: scale(0.02);
    opacity: 0;
  }
  35% {
    opacity: 1;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes sar-contour {
  from {
    transform: scale(0.6);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes sar-ticks {
  from {
    transform: rotate(-16deg) scale(0.94);
    opacity: 0;
  }
  to {
    transform: rotate(0) scale(1);
    opacity: 1;
  }
}

@keyframes sar-rose {
  from {
    transform: rotate(-70deg) scale(0.4);
    opacity: 0;
  }
  to {
    transform: rotate(0) scale(1);
    opacity: 1;
  }
}

@keyframes sar-pin {
  from {
    transform: scale(2.6);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes sar-halo {
  from {
    transform: scale(0.3);
    opacity: 0.9;
  }
  to {
    transform: scale(2.6);
    opacity: 0;
  }
}

@keyframes sar-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes sar-hood {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.88);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes sar-cart {
  from {
    opacity: 0;
    transform: translateX(-16px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes sar-swap {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes sar-ripple {
  from {
    transform: scale(0.04);
    opacity: 0.7;
  }
  to {
    transform: scale(1);
    opacity: 0;
  }
}

@keyframes sar-route {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* reduced motion: every layer simply rests in its final state */

.root[data-phase='static'] .ripple {
  display: none;
}

.root[data-phase='static'] *,
.root[data-phase='static'] *::before,
.root[data-phase='static'] *::after {
  animation: none !important;
  transition-duration: 0.01ms !important;
}
`;export{n as default};
