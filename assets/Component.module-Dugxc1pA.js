const n=`@font-face {
  font-family: 'SwatchFanInterTight';
  src: url('./fonts/inter-tight-latin.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

.root {
  --sf-counter: #eceae5;
  --sf-counter-deep: #e2dfd8;
  --sf-paper: #fbfaf7;
  --sf-paper-shade: #f4f2ed;
  --sf-ink: #1d1c1a;
  --sf-muted: #5b5852;
  --sf-hairline: rgba(29, 28, 26, 0.12);
  --sf-font-display: 'SwatchFanInterTight', 'Helvetica Neue', system-ui, sans-serif;
  --sf-font-ui: 'SwatchFanInterTight', 'Helvetica Neue', system-ui, sans-serif;
  --tint: #7d8b6f;
  --cw: 167px;
  --ch: 326px;
  --t: 570px;
  --px: 340px;
  --py: 584px;
  --fx: 75px;
  --fy: 26px;
  --fw: 558px;
  --fh: 290px;
  --mt: 34px;
  --ms: 9px;
  --hy: 17px;
  --rad: 24px;
  --mat: 10px;
  --side-font: 13px;
  --sidelen: 180px;
  --sidevis: visible;
  --spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  position: relative;
  isolation: isolate;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  max-inline-size: 680px;
  margin-inline: auto;
  border-radius: var(--rad);
  color: var(--sf-ink);
  color-scheme: light;
  font-family: var(--sf-font-ui);
  box-shadow: 0 1px 2px rgba(29, 28, 26, 0.08), 0 28px 48px -28px rgba(29, 28, 26, 0.38);
}

.root ::selection {
  background: color-mix(in srgb, var(--tint) 40%, var(--sf-paper));
  color: var(--sf-ink);
}

.sheet {
  position: absolute;
  inset: 0;
  z-index: -2;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(80% 45% at 30% 0%, rgba(255, 255, 255, 0.7), transparent 70%),
    linear-gradient(180deg, var(--sf-counter) 0%, var(--sf-counter-deep) 100%);
}

/* ---------- the table: framed photo, then the fan on top of it ---------- */

.table {
  position: relative;
  block-size: var(--t);
  direction: ltr;
}

/* Paint light pooling on the counter around the chips. */
.pool {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-color: var(--tint);
  mix-blend-mode: multiply;
  opacity: 0.4;
  -webkit-mask-image: radial-gradient(70% 55% at 50% 100%, #000 0%, rgba(0, 0, 0, 0.45) 55%, transparent 100%);
  mask-image: radial-gradient(70% 55% at 50% 100%, #000 0%, rgba(0, 0, 0, 0.45) 55%, transparent 100%);
  pointer-events: none;
  transition: background-color 460ms cubic-bezier(0.4, 0, 0.2, 1);
}

.idle .pool {
  animation: breathe 6s ease-in-out infinite alternate;
}

/* The photo sits on a clean mat. */
.frame {
  position: absolute;
  z-index: 1;
  inset-inline-start: var(--fx);
  inset-block-start: var(--fy);
  inline-size: var(--fw);
  block-size: var(--fh);
  box-sizing: border-box;
  padding: var(--mat);
  border-radius: 6px;
  background: linear-gradient(160deg, #ffffff 0%, #f6f4ef 100%);
  box-shadow:
    0 0 0 1px rgba(29, 28, 26, 0.08),
    0 2px 4px rgba(29, 28, 26, 0.08),
    0 22px 36px -18px rgba(29, 28, 26, 0.36);
  transform-origin: 50% 80%;
}

.stage {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  inline-size: 100%;
  block-size: 100%;
  border-radius: 2px;
  background: var(--sf-counter-deep);
}

/* The mat's cut edge: the picture sits slightly recessed. */
.stage::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(29, 28, 26, 0.12);
  pointer-events: none;
  z-index: 3;
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  user-select: none;
  filter: saturate(1.3) contrast(1.08) brightness(0.96);
}

.tintDepth,
.tintGlow,
.vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* A faint overall cast, kept low so the photo's own colour stays rich. */
.tintDepth {
  background-color: var(--tint);
  mix-blend-mode: color;
  opacity: 0.34;
  transition: background-color 460ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Paint light pooling up from the chips: the visible tint layer. */
.tintGlow {
  background-color: var(--tint);
  mix-blend-mode: multiply;
  opacity: 0.8;
  -webkit-mask-image: radial-gradient(80% 95% at 50% 118%, #000 0%, rgba(0, 0, 0, 0.5) 45%, transparent 100%);
  mask-image: radial-gradient(80% 95% at 50% 118%, #000 0%, rgba(0, 0, 0, 0.5) 45%, transparent 100%);
  transition: background-color 460ms cubic-bezier(0.4, 0, 0.2, 1);
}

.vignette {
  background:
    radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(30, 24, 14, 0.18) 100%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, transparent 28%);
}

.tintStatic {
  transition: none;
}

/* ---------- no-image fallback: a calm wall with one soft swatch and a few dots ---------- */

.wall {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: linear-gradient(165deg, #f1efea 0%, #e3e0d8 100%);
}

.swath {
  position: absolute;
  inset-inline-start: 8%;
  inset-block-start: 12%;
  inline-size: 62%;
  block-size: 46%;
  border-radius: 6px;
  background-color: var(--tint);
  background-image: linear-gradient(155deg, rgba(255, 255, 255, 0.16), transparent 55%);
  box-shadow: 0 1px 2px rgba(29, 28, 26, 0.12), 0 14px 22px -14px rgba(29, 28, 26, 0.4);
  transition: background-color 460ms cubic-bezier(0.4, 0, 0.2, 1);
}

.dab {
  position: absolute;
  inset-inline-start: var(--dx);
  inset-block-start: var(--dy);
  inline-size: var(--ds);
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--pig);
  box-shadow: 0 0 0 2px #fff, 0 6px 10px -4px rgba(29, 28, 26, 0.4);
  transform: scale(0.94);
  transition: transform 520ms var(--spring);
}

.dabOn {
  transform: scale(1.2);
}

/* ---------- the fan: the hero ---------- */

.fan {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  -webkit-tap-highlight-color: transparent;
}

/* Each chip is pivoted at one point hidden behind the counter lip; the component sets its transform. */
.chip {
  position: absolute;
  inset-inline-start: calc(var(--px) - var(--cw) / 2);
  inset-block-start: calc(var(--py) - var(--ch));
  inline-size: var(--cw);
  block-size: var(--ch);
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  pointer-events: auto;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  transform-origin: 50% 100%;
  outline: none;
}

.chip:focus-visible .card {
  outline: 3px solid var(--sf-ink);
  outline-offset: 3px;
}

/* Paper-card chip: one soft shadow system cast from the upper left. */
.card {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  background: linear-gradient(180deg, var(--sf-paper) 0%, var(--sf-paper-shade) 100%);
  box-shadow:
    0 0 0 1px rgba(29, 28, 26, 0.1),
    calc(var(--ex) * var(--k) * 1px) calc(var(--ey) * var(--k) * 2px) calc(var(--k) * 3px) rgba(29, 28, 26, 0.14),
    calc(var(--ex) * var(--k) * 8px) calc(var(--ey) * var(--k) * 10px) calc(var(--k) * 18px) -6px rgba(29, 28, 26, 0.32);
}

/* Chips further from the picked one sit a little deeper in the pile. */
.card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: rgba(29, 28, 26, var(--shade));
  pointer-events: none;
}

/* Flat pigment face with a quiet top light. */
.face {
  position: absolute;
  inset-block-start: var(--mt);
  inset-block-end: 0;
  inset-inline: var(--ms);
  overflow: hidden;
  border-radius: 2px 2px 0 0;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.12) 0%, transparent 45%, rgba(0, 0, 0, 0.08) 100%),
    var(--pig);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
}

/* The picked chip carries its name as display type. */
.big {
  position: absolute;
  inset-block-start: 12px;
  inset-inline: 12px;
  z-index: 1;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
  font-family: var(--sf-font-display);
  font-size: var(--big);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.035em;
  color: var(--on);
  overflow-wrap: anywhere;
  hyphens: auto;
  text-wrap: balance;
}

/* Everyone else is printed along the exposed edge, like a paint deck. */
.sideBox {
  position: absolute;
  inset-block-start: calc(var(--mt) + 13px);
  inline-size: 17px;
  block-size: var(--sidelen);
  visibility: var(--sidevis);
  z-index: 1;
}

.sideL {
  inset-inline-start: calc(var(--ms) + 7px);
}

.sideR {
  inset-inline-end: calc(var(--ms) + 7px);
}

.side {
  display: block;
  max-height: 100%;
  writing-mode: vertical-rl;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--sf-font-display);
  font-size: var(--side-font);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0;
  color: var(--on);
}

/* Fine hairline pivot ring. */
.eyelet {
  position: absolute;
  inset-block-start: calc(var(--hy) - 4px);
  inset-inline-start: calc(50% + var(--hx) - 4px);
  inline-size: 8px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(29, 28, 26, 0.55) 0 1.5px, transparent 2px);
  box-shadow: 0 0 0 0.5px rgba(29, 28, 26, 0.45), inset 0 0 0 0.5px rgba(255, 255, 255, 0.7);
}

/* ---------- the counter lip: label and price ---------- */

.body {
  position: relative;
  z-index: 6;
  display: grid;
  gap: 12px;
  padding: clamp(22px, 4.4cqi, 30px) clamp(20px, 4.8cqi, 32px) clamp(24px, 4.6cqi, 32px);
  border-end-start-radius: var(--rad);
  border-end-end-radius: var(--rad);
  background: linear-gradient(180deg, #ffffff 0%, var(--sf-paper) 100%);
  box-shadow:
    0 -1px 0 rgba(255, 255, 255, 0.9),
    0 -10px 20px -12px rgba(29, 28, 26, 0.3);
}

.body::before {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  block-size: 1px;
  background: rgba(29, 28, 26, 0.1);
  pointer-events: none;
}

.counterGlow {
  position: absolute;
  inset: 0;
  border-end-start-radius: inherit;
  border-end-end-radius: inherit;
  background-color: var(--tint);
  opacity: 0.2;
  -webkit-mask-image: radial-gradient(60% 90% at 50% 0%, #000 0%, transparent 100%);
  mask-image: radial-gradient(60% 90% at 50% 0%, #000 0%, transparent 100%);
  pointer-events: none;
  transition: background-color 460ms cubic-bezier(0.4, 0, 0.2, 1);
}

.titleRow {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px 20px;
}

.title {
  flex: 1 1 230px;
  min-inline-size: 0;
  margin: 0;
  font-family: var(--sf-font-display);
  font-size: clamp(26px, 5.8cqi, 40px);
  font-weight: 700;
  line-height: 1.02;
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

/* Very long product names step down and cap at three lines so the card height stays bounded. */
.titleLong {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  font-size: clamp(21px, 4.2cqi, 27px);
  line-height: 1.06;
  letter-spacing: -0.03em;
}

.price {
  flex: none;
  margin: 0;
  font-family: var(--sf-font-display);
  font-size: clamp(22px, 4.4cqi, 28px);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.colorRow {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  min-inline-size: 0;
  margin: 0;
}

.dot {
  flex: none;
  inline-size: 18px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--tint);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.14), 0 0 0 2px #fff, 0 0 0 3px rgba(29, 28, 26, 0.12);
  transition: background-color 460ms cubic-bezier(0.4, 0, 0.2, 1);
}

.colorName {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
  animation: rise 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.colorNameStatic {
  animation: none;
}

.count {
  flex: none;
  font-size: 14px;
  font-weight: 600;
  color: var(--sf-muted);
  font-variant-numeric: tabular-nums;
}

.cardEdge {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px var(--sf-hairline);
  pointer-events: none;
  z-index: 9;
}

@keyframes breathe {
  from {
    opacity: 0.3;
  }
  to {
    opacity: 0.48;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;export{n as default};
