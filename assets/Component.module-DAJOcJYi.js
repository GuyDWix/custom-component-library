const n=`@font-face {
  font-family: 'Barlow Condensed';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('./fonts/barlow-condensed-latin-600-normal.woff2') format('woff2');
}

@font-face {
  font-family: 'Barlow';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('./fonts/barlow-latin-500-normal.woff2') format('woff2');
}

.root {
  --sf-flap: #26282c;
  --sf-digit: #ece5d3;
  --sf-amber: #e3a64f;
  --sf-board: color-mix(in srgb, var(--sf-flap) 50%, #000);
  --sf-wall: color-mix(in srgb, var(--sf-flap) 36%, #040506);
  --sf-flap-hi: color-mix(in srgb, var(--sf-flap) 90%, #fff);
  --sf-flap-lo: color-mix(in srgb, var(--sf-flap) 84%, #000);
  --sf-flap-deep: color-mix(in srgb, var(--sf-flap) 70%, #000);
  --sf-hair: rgba(255, 255, 255, 0.07);
  --sf-font-display: 'Barlow Condensed', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --sf-font-ui: 'Barlow', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;

  /* sizes resolve in descendants, against this container */
  --sf-hp: clamp(10px, 3cqi, 36px);
  --sf-fp: clamp(14px, 3cqi, 36px);
  --sf-gap: clamp(16px, 3cqi, 36px);
  --sf-cg: clamp(2px, 0.5cqi, 4px);
  --sf-avail: calc(100cqi - 2 * var(--sf-hp) - 2 * var(--sf-fp) - 2px);

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 24px;
  background: var(--sf-wall);
  color: var(--sf-digit);
  font-family: var(--sf-font-ui);
}

.hall {
  position: relative;
  box-sizing: border-box;
  padding-inline: var(--sf-hp);
  padding-block-end: clamp(18px, 3.2cqi, 40px);
}

.frame {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  margin-block-start: var(--sf-hp);
  padding: var(--sf-fp);
  border-radius: clamp(14px, 2.2cqi, 24px);
  border: 1px solid var(--sf-hair);
  background: linear-gradient(180deg, color-mix(in srgb, var(--sf-board) 90%, #fff) 0%, var(--sf-board) 38%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 28px 48px -32px rgba(0, 0, 0, 0.8);
}

.light {
  position: absolute;
  z-index: 6;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(80% 50% at 24% 0%, rgba(255, 244, 225, 0.07), transparent 70%),
    linear-gradient(180deg, transparent 65%, rgba(0, 0, 0, 0.16) 100%);
  transition: opacity 1.8s cubic-bezier(0.25, 0.6, 0.2, 1) 0.15s;
}

.lightOff {
  opacity: 0;
}

.board {
  --sf-rest-cols: var(--sf-wide-cols);
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(var(--sf-rest-cols), minmax(0, 1fr));
  gap: var(--sf-gap);
}

.stat {
  --sf-col: calc((var(--sf-avail) - (var(--sf-cols) - 1) * var(--sf-gap)) / var(--sf-cols));
  --sf-cell: max(5px, min(var(--sf-cap), (var(--sf-col) - (var(--sf-count) - 1) * var(--sf-cg)) / var(--sf-n)));
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  border-radius: 10px;
  outline: none;
}

.stat:focus-visible {
  outline: 2px solid var(--sf-amber);
  outline-offset: 8px;
}

.statHero {
  --sf-cols: 1;
  --sf-cap: 168px;
  grid-column: 1 / -1;
}

.statRest {
  --sf-cols: var(--sf-rest-cols);
  --sf-cap: 96px;
  --sf-n: var(--sf-rest-n);
  --sf-count: var(--sf-rest-count);
  border-block-start: 1px solid var(--sf-hair);
  padding-block-start: clamp(14px, 2.2cqi, 26px);
}

.statWide {
  min-inline-size: 0;
}

@container (max-width: 620px) {
  .board {
    --sf-rest-cols: 2;
  }

  .statWide {
    grid-column: 1 / -1;
  }
}

.sr {
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

.digits {
  display: flex;
  gap: var(--sf-cg);
  max-inline-size: 100%;
}

/* ---------- flap cell ---------- */

.cell {
  --sf-h: calc(var(--sf-cell) * 1.4);
  position: relative;
  flex: none;
  inline-size: var(--sf-cell);
  block-size: var(--sf-h);
  perspective: calc(var(--sf-cell) * 5);
}

.cellFixed {
  inline-size: calc(var(--sf-cell) * 0.36);
}

.half {
  position: absolute;
  inset-inline: 0;
  block-size: 50%;
  overflow: hidden;
}

.top {
  inset-block-start: 0;
  border-start-start-radius: calc(var(--sf-cell) * 0.05);
  border-start-end-radius: calc(var(--sf-cell) * 0.05);
  background: linear-gradient(180deg, var(--sf-flap-hi) 0%, var(--sf-flap) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.bottom {
  inset-block-end: 0;
  border-end-start-radius: calc(var(--sf-cell) * 0.05);
  border-end-end-radius: calc(var(--sf-cell) * 0.05);
  background: linear-gradient(180deg, var(--sf-flap-lo) 0%, var(--sf-flap-deep) 100%);
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.35);
}

.glyph {
  position: absolute;
  inset-inline: 0;
  block-size: 200%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--sf-font-display);
  font-weight: 600;
  font-size: calc(var(--sf-h) * 0.8);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: var(--sf-digit);
  transform: translateY(-0.05em);
  user-select: none;
}

.glyphTop {
  inset-block-start: 0;
}

.glyphBottom {
  inset-block-end: 0;
}

.hinge {
  position: absolute;
  z-index: 5;
  inset-inline: 0;
  inset-block-start: calc(50% - 0.5px);
  block-size: 1px;
  background: rgba(0, 0, 0, 0.85);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.05);
}

/* ---------- the two falling flaps ---------- */

.flapTop {
  z-index: 2;
  transform-origin: 50% 100%;
  will-change: transform;
  animation: sfFall var(--sf-fall) cubic-bezier(0.5, 0, 0.9, 0.55) both;
}

.flapBottom {
  z-index: 2;
  transform-origin: 50% 0;
  transform: rotateX(90deg);
  will-change: transform;
  animation: sfLand var(--sf-land) cubic-bezier(0.45, 0, 0.85, 0.6) var(--sf-fall) both;
}

.flapBottomFinal {
  z-index: 2;
  transform-origin: 50% 0;
  transform: rotateX(90deg);
  will-change: transform;
  animation: sfLandFinal var(--sf-land) linear var(--sf-fall) both;
}

.shadeDown,
.shadeUp {
  position: absolute;
  inset: 0;
  background: #000;
  pointer-events: none;
}

.shadeDown {
  opacity: 0;
  animation: sfShadeIn var(--sf-fall) ease-in both;
}

.shadeUp {
  opacity: 0.6;
  animation: sfShadeOut var(--sf-land) ease-out var(--sf-fall) both;
}

@keyframes sfFall {
  from {
    transform: rotateX(0deg);
  }
  to {
    transform: rotateX(-90deg);
  }
}

@keyframes sfLand {
  from {
    transform: rotateX(90deg);
  }
  to {
    transform: rotateX(0deg);
  }
}

@keyframes sfLandFinal {
  0% {
    transform: rotateX(90deg);
    animation-timing-function: cubic-bezier(0.45, 0, 0.9, 0.55);
  }
  52% {
    transform: rotateX(0deg);
    animation-timing-function: cubic-bezier(0.2, 0.7, 0.4, 1);
  }
  68% {
    transform: rotateX(13deg);
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.6);
  }
  82% {
    transform: rotateX(0deg);
    animation-timing-function: cubic-bezier(0.2, 0.7, 0.4, 1);
  }
  91% {
    transform: rotateX(3.5deg);
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.6);
  }
  100% {
    transform: rotateX(0deg);
  }
}

@keyframes sfShadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.7;
  }
}

@keyframes sfShadeOut {
  from {
    opacity: 0.6;
  }
  to {
    opacity: 0;
  }
}

.label {
  box-sizing: border-box;
  max-inline-size: 100%;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-block-start: clamp(12px, 1.8cqi, 20px);
  color: color-mix(in srgb, var(--sf-digit) 52%, var(--sf-board));
  font-family: var(--sf-font-ui);
  font-weight: 500;
  font-size: 12px;
  line-height: 1.3;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  transition: color 0.5s ease;
}

.labelHero {
  font-size: 13px;
}

.labelLit {
  color: color-mix(in srgb, var(--sf-digit) 72%, var(--sf-board));
}

.labelText {
  min-inline-size: 0;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.lamp {
  flex: none;
  inline-size: 14px;
  block-size: 1px;
  background: color-mix(in srgb, var(--sf-amber) 28%, transparent);
  transition:
    background-color 0.4s ease,
    inline-size 0.5s ease;
}

.lampLit {
  background: var(--sf-amber);
  inline-size: 22px;
}

@media (prefers-reduced-motion: reduce) {
  .light,
  .label,
  .lamp {
    transition: none;
  }
}
`;export{n as default};
