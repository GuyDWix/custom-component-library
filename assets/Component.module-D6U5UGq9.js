const n=`.root {
  --rc-crate: #3a3631;
  --rc-mustard: #e0a32e;
  --rc-teal: #3aa08c;
  --rc-stage: #241f1a;
  --rc-stage-deep: #16120d;
  --rc-cream: #f2e8d4;
  --rc-ink: #241c10;
  --rc-font-display: 'Futura', 'Avenir Next', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --rc-font-ui: 'Avenir Next', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --sleeve: clamp(170px, 34cqi, 300px);
  --rc-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding: clamp(20px, 5cqi, 56px) clamp(12px, 3cqi, 32px);
  border-radius: 24px;
  background:
    radial-gradient(56% 42% at 50% 0%, rgba(224, 163, 46, 0.1) 0%, transparent 70%),
    radial-gradient(120% 90% at 50% 110%, rgba(0, 0, 0, 0.55), transparent 62%),
    linear-gradient(180deg, var(--rc-stage) 0%, var(--rc-stage-deep) 100%);
  color: var(--rc-cream);
  font-family: var(--rc-font-ui);
}

.bulb {
  position: absolute;
  inset-inline: 18%;
  inset-block-start: -14%;
  aspect-ratio: 2 / 1;
  background: radial-gradient(closest-side, rgba(228, 168, 60, 0.18), transparent 72%);
  filter: blur(8px);
  pointer-events: none;
}

.grain {
  position: absolute;
  inset: 0;
  z-index: 60;
  background-image: var(--rc-noise);
  opacity: 0.06;
  mix-blend-mode: overlay;
  pointer-events: none;
}

.scene {
  position: relative;
  inline-size: min(100%, 920px);
  margin-inline: auto;
  block-size: clamp(420px, 66cqi, 620px);
  perspective: 1200px;
  perspective-origin: 50% 10%;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.wallType {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 4%;
  z-index: 1;
  display: flex;
  justify-content: center;
  max-block-size: 34%;
  overflow: hidden;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(180deg, #000 55%, transparent 100%);
  mask-image: linear-gradient(180deg, #000 55%, transparent 100%);
}

.wallTypeInner {
  font-family: var(--rc-font-display);
  font-size: clamp(44px, 13cqi, 140px);
  font-weight: 800;
  letter-spacing: -0.045em;
  line-height: 0.94;
  text-align: center;
  text-transform: uppercase;
  text-wrap: balance;
  color: color-mix(in srgb, var(--rc-mustard) 15%, transparent);
  animation: typeIn 720ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes typeIn {
  from {
    opacity: 0;
    transform: translateY(14px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.stack {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 15%;
  z-index: 10;
  block-size: 55%;
  transform-style: preserve-3d;
  animation: stackSway 9s ease-in-out infinite alternate;
}

@keyframes stackSway {
  from {
    transform: rotate(-0.4deg);
  }

  to {
    transform: rotate(0.5deg);
  }
}

.sleeve {
  position: absolute;
  inset-block-end: 0;
  inset-inline-start: 50%;
  inline-size: var(--sleeve);
  aspect-ratio: 1;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-align: start;
  transform-origin: 50% 100%;
  transform: translateX(-50%) translate3d(var(--shift), var(--lift), 0) rotateX(calc(var(--lean) + var(--drag, 0deg)));
  transition:
    transform 620ms cubic-bezier(0.3, 1.36, 0.42, 1),
    opacity 480ms ease;
  transition-delay: calc(var(--rel) * 16ms);
  will-change: transform;
  pointer-events: none;
}

.isFront {
  --drag: var(--sceneDrag, 0deg);
  cursor: pointer;
  pointer-events: auto;
  appearance: none;
}

.isFront:focus-visible {
  outline: 3px solid var(--rc-teal);
  outline-offset: 5px;
  border-radius: 10px;
}

.sleeveFace {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 7px;
  background: linear-gradient(165deg, #ded4c0 0%, #cfc3ab 100%);
  box-shadow:
    0 24px 38px -22px rgba(0, 0, 0, 0.7),
    0 6px 14px -8px rgba(0, 0, 0, 0.5);
}

.sleeveImg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  filter: saturate(0.9) contrast(0.95) brightness(0.94);
  user-select: none;
}

.sleeveBlank {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 50%, transparent 0 33.5%, rgba(120, 100, 60, 0.14) 34% 35%, transparent 36%),
    linear-gradient(165deg, #e6dcc9 0%, #d5c9b1 100%);
}

.artShade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(200deg, rgba(255, 255, 255, 0.14) 0%, transparent 30%, transparent 62%, rgba(40, 24, 6, 0.22) 100%);
}

.artSheen {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.8;
  background: linear-gradient(
    115deg,
    transparent 42%,
    rgba(255, 255, 255, 0.1) 47%,
    rgba(255, 255, 255, 0.16) 50%,
    rgba(255, 255, 255, 0.1) 53%,
    transparent 58%
  );
}

.sleeveRim {
  position: absolute;
  inset: 0;
  border-radius: 7px;
  pointer-events: none;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.22),
    inset 0 0 18px rgba(66, 48, 20, 0.14);
}

.sticker {
  position: absolute;
  inset-block-start: 6%;
  inset-inline-end: 6%;
  max-inline-size: 62%;
  padding: 5px 9px 6px;
  border-radius: 3px;
  background: var(--rc-mustard);
  color: #231703;
  box-shadow: 0 2px 6px -2px rgba(20, 12, 2, 0.5);
  pointer-events: none;
}

.isFront .sticker {
  animation: stickerIn 420ms cubic-bezier(0.2, 0.8, 0.2, 1) 160ms both;
}

@keyframes stickerIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.stickerText {
  display: block;
  font-family: var(--rc-font-ui);
  font-size: clamp(12px, 1.9cqi, 14px);
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.stickerText::selection {
  background: #231703;
  color: var(--rc-mustard);
}

.disc {
  position: absolute;
  inset-block-end: -2%;
  inset-inline-start: 50%;
  z-index: 95;
  inline-size: calc(var(--sleeve) * 0.56);
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle at 38% 34%, rgba(255, 255, 255, 0.16) 0 18%, transparent 42%),
    repeating-radial-gradient(circle at 50% 50%, #201d19 0 2.5px, #2a251f 2.5px 5px),
    #1a1713;
  box-shadow:
    0 6px 18px -6px rgba(0, 0, 0, 0.7),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  transform: translateX(-50%) translateX(calc(var(--sleeve) * -0.06)) translateY(10px) scale(0.94);
  opacity: 0;
  transition:
    transform 600ms cubic-bezier(0.3, 1.3, 0.42, 1) 110ms,
    opacity 380ms ease 60ms;
  pointer-events: none;
}

.sceneOpen .disc {
  z-index: 96;
  transform: translateX(-50%) translateX(calc(var(--sleeve) * -0.34)) translateY(2px) scale(1);
  opacity: 1;
}

.discLabel {
  position: absolute;
  inset: 36%;
  border-radius: 50%;
  background: radial-gradient(
    circle at 42% 36%,
    color-mix(in srgb, var(--rc-teal) 70%, #fff) 0%,
    var(--rc-teal) 55%,
    color-mix(in srgb, var(--rc-teal) 72%, #0c2a22) 100%
  );
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
}

.discHole {
  position: absolute;
  inset: 46%;
  border-radius: 50%;
  background: var(--rc-stage);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.5);
}

.floorShadow {
  position: absolute;
  inset-inline: 14%;
  inset-block-end: 0;
  z-index: 30;
  block-size: 44px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(0, 0, 0, 0.55), transparent 72%);
  filter: blur(6px);
  pointer-events: none;
}

.crate {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 2%;
  z-index: 40;
  inline-size: calc(var(--sleeve) * 1.9);
  block-size: calc(var(--sleeve) * 0.56);
  margin-inline: auto;
}

.crateNudged {
  animation: crateNudge 320ms ease-out;
}

@keyframes crateNudge {
  35% {
    transform: translateY(3px);
  }

  0%,
  100% {
    transform: none;
  }
}

.crateFace {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--rc-crate) 90%, #fff) 0%,
    var(--rc-crate) 30%,
    color-mix(in srgb, var(--rc-crate) 82%, #000) 100%
  );
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.06),
    0 22px 34px -16px rgba(0, 0, 0, 0.7);
}

.crateLip {
  position: absolute;
  inset-inline: 14px;
  inset-block-start: 0;
  block-size: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4) 30%, rgba(255, 255, 255, 0.4) 70%, transparent);
  pointer-events: none;
}

.neighbour {
  cursor: pointer;
  pointer-events: auto;
}

.neighbour:hover .sleeveFace {
  filter: brightness(1.1);
}

.nav {
  position: relative;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 3cqi, 28px);
  inline-size: min(100%, 560px);
  margin: clamp(10px, 2cqi, 20px) auto 0;
}

.navBtn {
  display: grid;
  place-items: center;
  flex: none;
  inline-size: 44px;
  block-size: 44px;
  padding: 0;
  border: 1px solid rgba(242, 232, 212, 0.2);
  border-radius: 50%;
  background: transparent;
  color: var(--rc-cream);
  cursor: pointer;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
}

.navBtn:hover:not(:disabled) {
  background: rgba(242, 232, 212, 0.08);
  border-color: rgba(242, 232, 212, 0.4);
}

.navBtn:active:not(:disabled) {
  transform: scale(0.94);
}

.navBtn:disabled,
.navCount:disabled {
  opacity: 0.4;
  cursor: default;
}

.navBtn:focus-visible,
.navCount:focus-visible,
.jumpItem:focus-visible {
  outline: 2px solid var(--rc-teal);
  outline-offset: 3px;
}

.navIcon {
  inline-size: 20px;
  block-size: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.navMeta {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 2px;
  min-inline-size: 0;
  flex: 1;
  text-align: center;
}

.navTitle {
  max-inline-size: 100%;
  font-family: var(--rc-font-display);
  font-size: clamp(16px, 3cqi, 21px);
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.2;
  color: var(--rc-cream);
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.navCount {
  min-block-size: 44px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: color-mix(in srgb, var(--rc-cream) 72%, transparent);
  font: inherit;
  font-size: 13px;
  letter-spacing: 0.2em;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: color 160ms ease;
}

.navCount:hover:not(:disabled),
.navCount[aria-expanded='true'] {
  color: var(--rc-cream);
}

.jump {
  position: absolute;
  inset-block-end: 100%;
  inset-inline: 50%;
  inline-size: min(300px, 80cqi);
  max-block-size: 240px;
  margin-block-end: 4px;
  margin-inline-start: calc(min(300px, 80cqi) / -2);
  overflow-y: auto;
  padding: 6px;
  border: 1px solid rgba(242, 232, 212, 0.14);
  border-radius: 12px;
  background: #1f1b17;
  box-shadow: 0 18px 36px -12px rgba(0, 0, 0, 0.8);
  text-align: start;
}

.jumpItem {
  display: flex;
  align-items: baseline;
  gap: 12px;
  inline-size: 100%;
  min-block-size: 40px;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: color-mix(in srgb, var(--rc-cream) 78%, transparent);
  font: inherit;
  font-size: 14px;
  text-align: start;
  cursor: pointer;
}

.jumpItem:hover {
  background: rgba(242, 232, 212, 0.07);
  color: var(--rc-cream);
}

.jumpItem[aria-current='true'] {
  background: rgba(242, 232, 212, 0.1);
  color: var(--rc-cream);
}

.jumpNum {
  flex: none;
  font-size: 12px;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
  color: var(--rc-mustard);
}

.jumpTitle {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.sceneOpen .isFront {
  transform: translateX(-50%) translateY(calc(var(--sleeve) * -0.42)) scale(1.18) rotateX(5deg);
  transition-duration: 560ms;
}

.sceneDragging .sleeve {
  transition-duration: 90ms;
  transition-delay: 0ms;
}

.rootPaused .stack,
.rootPaused .wallTypeInner,
.rootPaused .sticker {
  animation-play-state: paused;
}

@media (prefers-reduced-motion: reduce) {
  .stack,
  .wallTypeInner,
  .sticker,
  .crateNudged {
    animation: none;
  }

  .sleeve,
  .disc,
  .navBtn {
    transition-duration: 1ms;
    transition-delay: 0ms;
  }
}
`;export{n as default};
