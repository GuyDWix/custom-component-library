const n=`@font-face {
  font-family: 'Fraunces';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('./fonts/fraunces-latin-variable.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

.root {
  --cv-curtain: #3a2433;
  --cv-curtain-deep: color-mix(in srgb, var(--cv-curtain) 62%, #07040a);
  --cv-curtain-mid: color-mix(in srgb, var(--cv-curtain) 88%, #07040a);
  --cv-curtain-ridge: color-mix(in srgb, var(--cv-curtain) 88%, #f0dfe8);
  --cv-wall: #0d080c;
  --cv-gold: #c9a45c;
  --cv-gold-light: #e2c88f;
  --cv-hair: color-mix(in srgb, var(--cv-gold) 46%, transparent);
  --cv-cream: #f4ece4;
  --cv-glow: #ffc58a;
  --cv-font-display: 'Fraunces', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
  --cv-font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', system-ui, sans-serif;
  --cv-speed: 650ms;
  --cv-ease: cubic-bezier(0.3, 0.8, 0.3, 1);
  --cv-ease-out: cubic-bezier(0.22, 0.9, 0.3, 1);

  display: block;
  box-sizing: border-box;
  inline-size: 100%;
  color: var(--cv-cream);
  font-family: var(--cv-font-ui);
  container-type: inline-size;
}

.root ::selection {
  background: color-mix(in srgb, var(--cv-gold) 40%, transparent);
  color: var(--cv-cream);
}

.card {
  /* drape openness: --cv-p 0 = half-drawn hero state, 1 = gathered to the sides */
  --cv-p: 0;
  --cv-rest: 0.7;
  --cv-gather: 0.15;
  --cv-sx: calc(var(--cv-rest) + (var(--cv-gather) - var(--cv-rest)) * var(--cv-p));
  --cv-tug: 0px;
  --cv-lines: 2;
  --cv-valance: clamp(14px, 2.4cqi, 24px);
  --cv-gutter: clamp(28px, 9cqi, 96px);
  --cv-fold: clamp(44px, 7.5cqi, 84px);
  --cv-pw: 44px;
  --cv-cord: clamp(40px, 8cqi, 96px);
  --cv-velvet:
    repeating-linear-gradient(
      90deg,
      var(--cv-curtain-deep) 0,
      var(--cv-curtain-mid) calc(var(--cv-fold) * 0.3),
      var(--cv-curtain-ridge) calc(var(--cv-fold) * 0.5),
      var(--cv-curtain-mid) calc(var(--cv-fold) * 0.72),
      var(--cv-curtain-deep) var(--cv-fold)
    );

  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  inline-size: 100%;
  aspect-ratio: 16 / 10;
  overflow: clip;
  border-radius: clamp(10px, 1.6cqi, 16px);
  background: var(--cv-wall);
  box-shadow: 0 30px 50px -34px rgba(0, 0, 0, 0.75);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.card[data-open='true'] {
  --cv-p: 1;
}

.card::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cv-gold) 30%, transparent);
}

/* ---------- stage ---------- */

.stage {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: clip;
  background: radial-gradient(70% 90% at 50% 100%, #3b2a24, #140d12 75%);
}

.stageImg {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  transform: scale(1.1);
  filter: saturate(0.7) contrast(1.05) brightness(0.8);
  transition: transform calc(var(--cv-speed) * 1.6) var(--cv-ease-out);
  user-select: none;
}

.card[data-open='true'] .stageImg {
  transform: scale(1.02);
}

.stageFallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background:
    radial-gradient(50% 70% at 50% 85%, color-mix(in srgb, var(--cv-glow) 38%, transparent), transparent 72%),
    #1c1217;
}

.stageMonogram {
  font-family: var(--cv-font-display);
  font-size: clamp(120px, 40cqi, 420px);
  font-weight: 500;
  line-height: 1;
  color: color-mix(in srgb, var(--cv-gold-light) 22%, transparent);
}

.stageGlow {
  position: absolute;
  z-index: 2;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: screen;
  background: radial-gradient(44% 70% at 50% 108%, color-mix(in srgb, var(--cv-glow) 36%, transparent), transparent 74%);
}

.stageDim {
  position: absolute;
  z-index: 3;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  background: linear-gradient(180deg, rgba(13, 8, 12, 0.72), rgba(13, 8, 12, 0.9));
  transition: opacity calc(var(--cv-speed) * 0.9) ease;
}

.card[data-open='true'] .stageDim {
  opacity: 0.86;
  transition-delay: calc(var(--cv-speed) * 0.12);
}

/* ---------- drapes ---------- */

.curtainLeft,
.curtainRight {
  position: absolute;
  inset-block: 0;
  z-index: 3;
  inline-size: 50.5%;
  direction: ltr;
  pointer-events: none;
  will-change: transform;
  transform: scaleX(var(--cv-sx));
  transition: transform var(--cv-speed) var(--cv-ease);
}

.curtainLeft {
  inset-inline-start: 0;
  transform-origin: left center;
}

.curtainRight {
  inset-inline-end: 0;
  transform-origin: right center;
  transition-delay: calc(var(--cv-speed) * 0.06);
}

.card[data-drag='true'] .curtainLeft,
.card[data-drag='true'] .curtainRight {
  transition: none;
}

.clothLeft,
.clothRight {
  position: absolute;
  inset: 0;
  overflow: clip;
  background:
    linear-gradient(180deg, rgba(5, 3, 6, 0.55), rgba(5, 3, 6, 0) 30%),
    linear-gradient(0deg, rgba(5, 3, 6, 0.5), rgba(5, 3, 6, 0) 28%),
    var(--cv-velvet);
}

.clothLeft {
  box-shadow: inset -1px 0 0 var(--cv-hair), 6px 0 28px rgba(0, 0, 0, 0.55);
}

.clothRight {
  box-shadow: inset 1px 0 0 var(--cv-hair), -6px 0 28px rgba(0, 0, 0, 0.55);
}

.foldShade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(90deg, rgba(5, 3, 6, 0.4), transparent 45%, rgba(5, 3, 6, 0.4));
  opacity: 0;
  transition: opacity var(--cv-speed) ease;
}

.card[data-open='true'] .foldShade {
  opacity: 0.6;
}

/* ---------- pull cord ---------- */

.pull {
  position: absolute;
  z-index: 5;
  inset-block-start: 0;
  inset-inline-end: calc(50.5% * var(--cv-sx) - var(--cv-pw) / 2);
  inline-size: var(--cv-pw);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  border: none;
  background: transparent;
  direction: ltr;
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition: inset-inline-end var(--cv-speed) var(--cv-ease);
  transition-delay: calc(var(--cv-speed) * 0.06);
}

.card[data-drag='true'] .pull {
  cursor: grabbing;
  transition: none;
}

.pull:focus-visible {
  outline: 2px solid var(--cv-gold-light);
  outline-offset: 2px;
  border-radius: 6px;
}

.pullCord {
  flex: none;
  inline-size: 1px;
  block-size: calc(var(--cv-valance) + var(--cv-cord) + var(--cv-tug));
  background: linear-gradient(180deg, transparent, var(--cv-gold) 30%);
  transition: block-size calc(var(--cv-speed) * 0.6) var(--cv-ease-out);
}

.card[data-drag='true'] .pullCord {
  transition: none;
}

.pullGrip {
  flex: none;
  inline-size: 18px;
  block-size: 30px;
  border-radius: 9px;
  border: 1px solid var(--cv-gold);
  background: linear-gradient(180deg, color-mix(in srgb, var(--cv-gold) 28%, #120b10), #120b10);
  box-shadow: 0 6px 12px -4px rgba(0, 0, 0, 0.7);
  transition: border-color 200ms ease;
}

.pull:hover .pullGrip,
.pull:focus-visible .pullGrip {
  border-color: var(--cv-gold-light);
}

/* ---------- valance + rail ---------- */

.valance {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  z-index: 6;
  block-size: var(--cv-valance);
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(5, 3, 6, 0.4), transparent),
    var(--cv-velvet);
  box-shadow: 0 8px 18px -6px rgba(0, 0, 0, 0.7);
}

.railLine {
  position: absolute;
  inset-inline: 0;
  inset-block-start: var(--cv-valance);
  z-index: 7;
  block-size: 1px;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--cv-gold) 12%, var(--cv-gold) 88%, transparent);
}

/* ---------- reveal panel + title ---------- */

.overlay {
  position: absolute;
  inset: 0;
  z-index: 8;
  display: flex;
  flex-direction: column;
  padding-block-start: calc(var(--cv-valance) + 6px);
  pointer-events: none;
}

.reveal {
  flex: 1 1 0;
  min-block-size: 0;
  display: flex;
  flex-direction: column;
  justify-content: safe center;
  padding-inline: var(--cv-gutter);
  overflow: clip;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: clamp(12px, 2cqi, 20px);
  inline-size: 100%;
  box-sizing: border-box;
  padding: clamp(14px, 2.4cqi, 28px);
  border: 1px solid var(--cv-hair);
  border-radius: 4px;
  background: linear-gradient(180deg, rgba(20, 13, 18, 0.72), rgba(13, 8, 12, 0.82));
  opacity: 0;
  transition: opacity calc(var(--cv-speed) * 0.3) ease;
}

.card[data-open='true'] .panel {
  opacity: 1;
  transition: opacity calc(var(--cv-speed) * 0.55) ease calc(var(--cv-speed) * 0.3);
}

.priceRow {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 16px;
  padding-block-end: clamp(10px, 1.6cqi, 16px);
  border-block-end: 1px solid var(--cv-hair);
  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity calc(var(--cv-speed) * 0.3) ease,
    transform calc(var(--cv-speed) * 0.3) ease;
}

.price {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  min-inline-size: 0;
  font-family: var(--cv-font-display);
  font-size: clamp(28px, 4cqi, 44px);
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  color: var(--cv-gold-light);
  overflow-wrap: anywhere;
}

.duration {
  max-inline-size: 100%;
  font-size: 12px;
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
  color: color-mix(in srgb, var(--cv-cream) 80%, transparent);
  overflow-wrap: anywhere;
}

.inclusions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px clamp(18px, 3.4cqi, 40px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.inclusion {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-inline-size: 0;
  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity calc(var(--cv-speed) * 0.3) ease,
    transform calc(var(--cv-speed) * 0.3) ease;
}

.inclusionNo {
  flex: none;
  font-family: var(--cv-font-display);
  font-size: 12px;
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
  color: var(--cv-gold);
}

.inclusionText {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--cv-lines);
  line-clamp: var(--cv-lines);
  overflow: hidden;
  min-inline-size: 0;
  font-size: 15px;
  line-height: 1.35;
  color: color-mix(in srgb, var(--cv-cream) 90%, transparent);
  overflow-wrap: anywhere;
}

.card[data-open='true'] .priceRow,
.card[data-open='true'] .inclusion {
  opacity: 1;
  transform: none;
  transition:
    opacity calc(var(--cv-speed) * 0.5) ease calc(var(--cv-speed) * 0.34 + var(--i) * 60ms),
    transform calc(var(--cv-speed) * 0.7) var(--cv-ease-out) calc(var(--cv-speed) * 0.34 + var(--i) * 60ms);
}

.bill {
  position: relative;
  flex: none;
  padding-inline: var(--cv-gutter);
  padding-block: 12px clamp(18px, 2.6cqi, 28px);
}

.bill::before {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block: -28px 0;
  z-index: -1;
  pointer-events: none;
  background: linear-gradient(0deg, rgba(13, 8, 12, 0.95) 0%, rgba(13, 8, 12, 0.8) 60%, rgba(13, 8, 12, 0) 100%);
}

.billRule {
  display: block;
  inline-size: 40px;
  block-size: 1px;
  margin-block-end: 12px;
  background: var(--cv-gold);
}

.title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  overflow: hidden;
  margin: 0;
  font-family: var(--cv-font-display);
  font-size: clamp(22px, 3.4cqi, 40px);
  font-weight: 400;
  line-height: 1.12;
  letter-spacing: -0.01em;
  text-wrap: balance;
  overflow-wrap: anywhere;
  color: var(--cv-cream);
}

/* ---------- container sizing ---------- */

@container (max-width: 820px) {
  .card {
    --cv-lines: 1;
    aspect-ratio: 4 / 3;
  }

  .price {
    font-size: clamp(26px, 5cqi, 38px);
  }

  .title {
    font-size: clamp(22px, 4.4cqi, 32px);
  }
}

@container (max-width: 430px) {
  .card {
    --cv-rest: 0.72;
    --cv-gather: 0.11;
    --cv-gutter: clamp(20px, 7cqi, 30px);
    aspect-ratio: 2 / 3;
  }

  .panel {
    padding: 14px;
  }

  .inclusions {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }

  .inclusionText {
    font-size: 14.5px;
  }

  .price {
    font-size: 28px;
  }

  .title {
    -webkit-line-clamp: 3;
    line-clamp: 3;
    font-size: 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card {
    --cv-p: 1 !important;
  }

  .curtainLeft,
  .curtainRight,
  .pull,
  .foldShade,
  .stageDim,
  .stageImg,
  .pullCord {
    transition: none;
  }

  .stageImg {
    transform: scale(1.02);
  }

  .stageDim {
    opacity: 0.86;
  }

  .foldShade {
    opacity: 0.6;
  }

  .panel,
  .priceRow,
  .inclusion {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
`;export{n as default};
