const n=`@font-face {
  font-family: 'Manrope';
  font-style: normal;
  font-weight: 200 800;
  font-display: swap;
  src: url('./fonts/manrope-latin-wght-normal.woff2') format('woff2');
}

@font-face {
  font-family: 'Bricolage Grotesque';
  font-style: normal;
  font-weight: 200 800;
  font-display: swap;
  src: url('./fonts/bricolage-grotesque-latin-wght-normal.woff2') format('woff2');
}

.root {
  --rp-pine: #0e4a3b;
  --rp-pine-deep: #093227;
  --rp-mint: #f5fcf8;
  --rp-mint-deep: #e3f3ea;
  --rp-slate: #1b2a2f;
  --rp-slate-soft: #4d6166;
  --rp-hair: rgba(14, 74, 59, 0.16);
  --rp-gold: #e2b13c;
  --rp-gold-ink: #1b2a2f;
  --rp-font-ui: 'Manrope', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --rp-font-figures: 'Bricolage Grotesque', 'Manrope', 'Helvetica Neue', system-ui, sans-serif;
  --rp-spring: cubic-bezier(0.34, 1.4, 0.5, 1);
  --rp-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.1  0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 .8 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  color: var(--rp-slate);
  font-family: var(--rp-font-ui);
  accent-color: var(--rp-pine);
}

@supports (transition-timing-function: linear(0, 1)) {
  .root {
    --rp-spring: linear(
      0, 0.088, 0.285, 0.51, 0.716, 0.877, 0.988, 1.052, 1.08, 1.082, 1.071, 1.053, 1.034, 1.018, 1.006,
      0.999, 0.994, 0.993, 0.993, 0.995, 0.996, 0.998, 0.999, 1
    );
  }
}

.root *,
.root *::before,
.root *::after {
  box-sizing: border-box;
}

.root ::selection {
  background: var(--rp-pine);
  color: var(--rp-mint);
}

/* ---------- Toggle: hangs over the card's top edge ---------- */

.toggleWrap {
  --rp-pad: 56px;
  position: relative;
  z-index: 3;
  margin-inline-start: var(--rp-pad);
  margin-block-end: -34px;
  inline-size: min(calc(100% - var(--rp-pad)), calc(var(--rp-opts) * 11.5rem));
}

.track {
  padding: 5px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--rp-hair);
  box-shadow:
    0 1px 2px rgba(9, 50, 39, 0.06),
    0 14px 28px -14px rgba(9, 50, 39, 0.28);
}

.trackStack {
  border-radius: 30px;
}

.rail {
  position: relative;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
}

.railStack {
  grid-auto-flow: row;
  grid-auto-columns: auto;
  grid-auto-rows: 1fr;
}

.thumb {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: calc(100% / var(--rp-opts));
  border-radius: 999px;
  background: var(--rp-pine);
  box-shadow: 0 6px 14px -6px rgba(9, 50, 39, 0.55);
  transform: translateX(calc(var(--rp-i) * 100%));
  transition: transform 640ms var(--rp-spring);
  pointer-events: none;
}

.thumbStack {
  inset-block: auto;
  inset-block-start: 0;
  inline-size: 100%;
  block-size: calc(100% / var(--rp-opts));
  border-radius: 25px;
  transform: translateY(calc(var(--rp-i) * 100%));
}

.option {
  position: relative;
  z-index: 1;
  appearance: none;
  min-block-size: 52px;
  margin: 0;
  padding-block: 10px;
  padding-inline: 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--rp-slate-soft);
  font: 700 16px/1.2 var(--rp-font-ui);
  letter-spacing: -0.005em;
  text-align: center;
  overflow-wrap: anywhere;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color 260ms ease;
}

.option:hover {
  color: var(--rp-pine);
}

.optionOn,
.optionOn:hover {
  color: #f4fbf7;
}

.option:focus-visible {
  outline: 3px solid var(--rp-gold);
  outline-offset: 1px;
}

/* ---------- Card ---------- */

.card {
  --rp-pad: 56px;
  position: relative;
  isolation: isolate;
  overflow: clip;
  padding-block: calc(34px + 64px) 40px;
  padding-inline: var(--rp-pad);
  border-radius: 40px;
  background:
    radial-gradient(70% 60% at 8% 0%, #ffffff 0%, transparent 70%),
    linear-gradient(165deg, var(--rp-mint) 0%, var(--rp-mint-deep) 100%);
  border: 1px solid var(--rp-hair);
  box-shadow:
    0 1px 0 #fff inset,
    0 40px 70px -40px rgba(9, 50, 39, 0.4);
}

.sheen,
.grain,
.rosette {
  position: absolute;
  pointer-events: none;
}

.sheen {
  inset: 0;
  z-index: -3;
  background: radial-gradient(45% 55% at 100% 100%, color-mix(in srgb, var(--rp-pine) 9%, transparent), transparent 70%);
}

.grain {
  inset: 0;
  z-index: -1;
  opacity: 0.07;
  background-image: var(--rp-noise);
  mix-blend-mode: multiply;
}

/* engraved banknote rosette: two offset ring sets drift into a moire */
.rosette {
  inset-block-start: -22cqi;
  inset-inline-end: -20cqi;
  z-index: -2;
  inline-size: 66cqi;
  aspect-ratio: 1;
  border-radius: 50%;
}

.ringsA,
.ringsB,
.fan {
  position: absolute;
  inset: 0;
  border-radius: 50%;
}

.ringsA {
  background: repeating-radial-gradient(circle at 50% 50%, transparent 0 7px, color-mix(in srgb, var(--rp-pine) 46%, transparent) 7px 8.2px);
  -webkit-mask-image: radial-gradient(closest-side, #000 20%, rgba(0, 0, 0, 0.55) 62%, transparent 100%);
  mask-image: radial-gradient(closest-side, #000 20%, rgba(0, 0, 0, 0.55) 62%, transparent 100%);
  opacity: 0.5;
}

.fan {
  background: repeating-conic-gradient(from 0deg at 50% 50%, color-mix(in srgb, var(--rp-pine) 34%, transparent) 0deg 0.5deg, transparent 0.5deg 3deg);
  -webkit-mask-image: radial-gradient(closest-side, transparent 24%, #000 34%, #000 52%, transparent 74%);
  mask-image: radial-gradient(closest-side, transparent 24%, #000 34%, #000 52%, transparent 74%);
  opacity: 0.32;
}

.turn {
  position: absolute;
  inset: 0;
  transform: rotate(calc(var(--rp-i) * 47deg));
  transition: transform 1100ms var(--rp-spring);
}

.ringsB {
  transform: translateX(46px);
  background: repeating-radial-gradient(circle at 50% 50%, transparent 0 7px, color-mix(in srgb, var(--rp-gold) 80%, transparent) 7px 8.2px);
  -webkit-mask-image: radial-gradient(closest-side, #000 20%, rgba(0, 0, 0, 0.55) 62%, transparent 100%);
  mask-image: radial-gradient(closest-side, #000 20%, rgba(0, 0, 0, 0.55) 62%, transparent 100%);
  opacity: 0.55;
}

/* ---------- Hero price ---------- */

.hero {
  --rp-size: min(300px, calc(56cqi / (0.64 * var(--rp-n) + 0.6)));
  position: relative;
}

.rule {
  position: absolute;
  inset-inline: calc(var(--rp-pad) * -1);
  inset-block-end: calc(var(--rp-size) * 0.17);
  block-size: 1px;
  background: color-mix(in srgb, var(--rp-pine) 24%, transparent);
}

.price {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  column-gap: 0.32em;
  font-size: var(--rp-size);
  line-height: 1;
  font-family: var(--rp-font-figures);
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: 'tnum' 1, 'lnum' 1;
  color: var(--rp-slate);
}

.currency {
  align-self: flex-start;
  margin-block-start: 0.5em;
  font-size: 0.34em;
  font-weight: 700;
  line-height: 1;
  color: var(--rp-pine);
  letter-spacing: -0.02em;
}

.digits {
  display: inline-flex;
  align-items: stretch;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.slot {
  display: block;
  flex: none;
  text-align: center;
  overflow: hidden;
  transition:
    inline-size 700ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 420ms ease;
}

.slotDigit {
  inline-size: 0.63em;
}

.slotPunc {
  inline-size: 0.26em;
}

.slotGone {
  inline-size: 0;
  opacity: 0;
}

.punc {
  display: block;
  block-size: 1em;
  padding-block-start: 0.04em;
  font-weight: 700;
  color: var(--rp-pine);
}

.window {
  display: block;
  block-size: 1em;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 15%, #000 85%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0, #000 15%, #000 85%, transparent 100%);
}

.strip {
  display: block;
  transform: translateY(calc(var(--rp-d) * -10%));
  transition: transform 1050ms cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: calc(var(--rp-r) * 70ms);
  will-change: transform;
}

.digit {
  display: block;
  block-size: 1em;
  line-height: 1;
  text-align: center;
}

.side {
  --rp-gap: calc(var(--rp-size) * 0.17);
  flex: 1 1 11rem;
  min-inline-size: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding-block: calc(var(--rp-gap) + 2px) var(--rp-gap);
  padding-inline-start: 0.1em;
  font-family: var(--rp-font-ui);
  font-size: 16px;
  line-height: 1.2;
  letter-spacing: 0;
}

.saving {
  display: inline-block;
  max-inline-size: 100%;
  padding-block: 9px;
  padding-inline: 16px;
  border-radius: 999px;
  background: var(--rp-gold);
  color: var(--rp-gold-ink);
  font-size: 15px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--rp-gold-ink) 14%, transparent) inset;
  transform-origin: left center;
  animation: rp-pop 760ms var(--rp-spring) 220ms backwards;
}

.savingGap {
  display: block;
}

.period {
  display: block;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--rp-slate-soft);
  animation: rp-rise 560ms cubic-bezier(0.2, 0.8, 0.2, 1) 180ms backwards;
}

@keyframes rp-pop {
  from {
    opacity: 0;
    transform: scale(0.55) rotate(-6deg);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes rp-rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* ---------- Feature ledger ---------- */

.ledger {
  position: relative;
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(var(--rp-rows), auto);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  column-gap: 56px;
  margin: 0;
  margin-block-start: 40px;
  padding: 0;
  list-style: none;
  border-block-start: 1px solid var(--rp-hair);
}

.item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding-block: 17px;
  border-block-end: 1px solid var(--rp-hair);
  color: var(--rp-slate);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.005em;
}

.tick {
  flex: none;
  display: grid;
  place-items: center;
  inline-size: 24px;
  block-size: 24px;
  margin-block-start: 1px;
  border-radius: 50%;
  background: var(--rp-pine);
  color: #eaf8f1;
}

.text {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.ghost {
  position: absolute;
  margin: 0;
  pointer-events: none;
  animation: rp-ghost 300ms cubic-bezier(0.4, 0, 1, 1) forwards;
}

@keyframes rp-ghost {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
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

/* ---------- Narrow containers ---------- */

@container (max-width: 760px) {
  .toggleWrap {
    --rp-pad: 24px;
  }

  .card {
    --rp-pad: 24px;
    padding-block: calc(34px + 36px) 20px;
    border-radius: 32px;
  }

  .rosette {
    inset-block-start: -30cqi;
    inset-inline-end: -34cqi;
    inline-size: 96cqi;
  }

  .ledger {
    grid-auto-flow: row;
    grid-template-rows: none;
    grid-template-columns: minmax(0, 1fr);
    margin-block-start: 28px;
  }

  .item {
    font-size: 17px;
    padding-block: 15px;
  }
}

@container (max-width: 600px) {
  .toggleWrap {
    inline-size: calc(100% - var(--rp-pad));
    margin-inline-end: var(--rp-pad);
  }

  .hero {
    --rp-size: min(34cqi, calc(78cqi / (0.64 * var(--rp-n) + 0.6)));
  }

  .price {
    row-gap: 14px;
  }

  .side {
    flex: 1 1 100%;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-start;
    gap: 10px 14px;
    padding-block: 0;
    padding-inline-start: 0;
  }

  .rule {
    inset-block-end: auto;
    inset-block-start: calc(var(--rp-size) * 0.83);
  }

  .period {
    font-size: 20px;
  }
}

/* wide-but-stacked options keep the horizontal rail; only narrow containers stack */
@container (min-width: 601px) {
  .trackStack {
    border-radius: 999px;
  }

  .railStack {
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
  }

  .thumbStack {
    inset-block: 0;
    block-size: auto;
    inline-size: calc(100% / var(--rp-opts));
    border-radius: 999px;
    transform: translateX(calc(var(--rp-i) * 100%));
  }
}

@container (min-width: 601px) and (max-width: 760px) {
  .toggleWrap {
    inline-size: min(calc(100% - var(--rp-pad)), calc(var(--rp-opts) * 11.5rem));
  }
}

/* ---------- Reduced motion: instant, still composed ---------- */

@media (prefers-reduced-motion: reduce) {
  .thumb,
  .thumbStack,
  .turn,
  .strip,
  .slot,
  .option {
    transition: none;
  }

  .strip {
    transition-delay: 0s;
  }

  .saving,
  .period,
  .ghost {
    animation: none;
  }

  .ghost {
    display: none;
  }
}
`;export{n as default};
