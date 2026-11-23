const n=`@property --pc-sx {
  syntax: '<percentage>';
  inherits: true;
  initial-value: 50%;
}

@property --pc-sy {
  syntax: '<percentage>';
  inherits: true;
  initial-value: 50%;
}

.root {
  --pc-line: #ffffff;
  --pc-cobalt: #1c3fd6;
  --pc-cobalt-deep: #0a1a78;
  --pc-cobalt-light: #4f74ff;
  --pc-accent: #e3ff5a;
  --pc-ink: #ffffff;
  --pc-label: #c4cfff;
  --pc-muted: #d5dcff;
  --pc-font-display: 'Inter Tight', 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --pc-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --pc-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .8 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --pc-out: cubic-bezier(0.16, 1, 0.3, 1);
  --pc-inout: cubic-bezier(0.65, 0, 0.35, 1);

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: 40px 44px;
  padding-inline: 20px;
  border-radius: 28px;
  background: var(--pc-cobalt);
  color: var(--pc-ink);
  font-family: var(--pc-font-ui);
  accent-color: var(--pc-accent);
}

.root::selection,
.name::selection,
.wordInner::selection,
.role::selection,
.label::selection,
.text::selection {
  background: var(--pc-accent);
  color: var(--pc-cobalt-deep);
}

.keylight,
.sweep,
.grain {
  position: absolute;
  pointer-events: none;
  z-index: -1;
}

.keylight {
  inset-block-start: -10%;
  inset-inline-start: 0;
  inline-size: 100%;
  block-size: 85%;
  background: radial-gradient(46% 62% at 46% 30%, color-mix(in srgb, var(--pc-cobalt-light) 80%, #fff 8%) 0%, transparent 72%);
  transform-origin: 46% 30%;
}

.sweep {
  inset: 0;
  background:
    linear-gradient(180deg, transparent 58%, color-mix(in srgb, var(--pc-cobalt-deep) 55%, transparent) 100%),
    radial-gradient(130% 100% at 50% 40%, transparent 55%, color-mix(in srgb, var(--pc-cobalt-deep) 70%, transparent) 100%);
}

.grain {
  inset: 0;
  background-image: var(--pc-noise);
  opacity: 0.2;
  mix-blend-mode: soft-light;
}

.figure {
  margin: 0;
}

.stage {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: 'portrait' 'caption' 'start' 'end';
  justify-items: stretch;
}

.portrait {
  grid-area: portrait;
  position: relative;
  justify-self: center;
  inline-size: min(100%, 420px);
  z-index: 1;
}

.cast {
  position: absolute;
  z-index: -1;
  inset-block: 20% -7%;
  inset-inline: 22% -13%;
  border-radius: 4px;
  background: radial-gradient(closest-side, rgba(3, 9, 58, 0.85), rgba(3, 9, 58, 0.45) 60%, transparent);
  filter: blur(26px);
  transform: skewX(-6deg);
}

.frame {
  position: relative;
  aspect-ratio: 4 / 5;
  border-radius: 6px;
  overflow: hidden;
  background: var(--pc-cobalt-deep);
  box-shadow:
    0 2px 4px rgba(3, 9, 58, 0.35),
    0 30px 60px -24px rgba(3, 9, 58, 0.8);
}

.lens {
  position: absolute;
  inset: 0;
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  user-select: none;
  filter: contrast(1.06) saturate(1.04);
  transform: scale(1.04);
  transform-origin: var(--pc-sx) var(--pc-sy);
  transition:
    transform 900ms var(--pc-out),
    filter 600ms var(--pc-out);
}

.photoFocused {
  transform: scale(1.12);
}

.monogram {
  display: grid;
  place-items: center;
  block-size: 100%;
  font-family: var(--pc-font-display);
  font-size: 112px;
  font-weight: 600;
  letter-spacing: -0.04em;
  color: color-mix(in srgb, var(--pc-ink) 85%, transparent);
  background:
    radial-gradient(70% 55% at 30% 20%, color-mix(in srgb, var(--pc-cobalt-light) 70%, transparent), transparent 70%),
    linear-gradient(160deg, var(--pc-cobalt) 0%, var(--pc-cobalt-deep) 100%);
}

.spill {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--pc-cobalt) 34%, transparent) 0%, transparent 22%, transparent 78%, color-mix(in srgb, var(--pc-cobalt) 34%, transparent) 100%),
    linear-gradient(180deg, transparent 62%, color-mix(in srgb, var(--pc-cobalt-deep) 48%, transparent) 100%);
  mix-blend-mode: multiply;
}

.shade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: color-mix(in srgb, var(--pc-cobalt-deep) 72%, transparent);
  mask-image: radial-gradient(ellipse 24% 19.2% at var(--pc-sx) var(--pc-sy), transparent 62%, #000 100%);
  opacity: 0;
  transition:
    opacity 420ms var(--pc-out),
    --pc-sx 700ms var(--pc-out),
    --pc-sy 700ms var(--pc-out);
}

.shadeFocused {
  opacity: 1;
}

.ring {
  position: absolute;
  inset-inline-start: var(--pc-sx);
  inset-block-start: var(--pc-sy);
  inline-size: 36%;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--pc-line) 80%, transparent);
  box-shadow: 0 0 0 1px rgba(3, 9, 58, 0.18);
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.6);
  transition:
    opacity 320ms var(--pc-out),
    transform 620ms var(--pc-out);
}

.ringFocused {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.anchor {
  position: absolute;
  z-index: 2;
  display: grid;
  place-items: center;
  inline-size: 26px;
  block-size: 26px;
  margin-inline-start: -13px;
  margin-block-start: -13px;
  border-radius: 50%;
  background: var(--pc-accent);
  color: var(--pc-cobalt-deep);
  box-shadow:
    0 0 0 1.5px var(--pc-cobalt-deep),
    0 4px 10px -2px rgba(3, 9, 58, 0.55);
  transition: transform 420ms var(--pc-out);
}

.anchorActive {
  transform: scale(1.18);
}

.anchorNum {
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.ripple {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid var(--pc-accent);
  opacity: 0;
}

.edge {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.marks {
  position: absolute;
  inset: -14px;
  pointer-events: none;
  --m: color-mix(in srgb, var(--pc-ink) 55%, transparent);
  background:
    linear-gradient(var(--m), var(--m)) top left / 14px 1px no-repeat,
    linear-gradient(var(--m), var(--m)) top left / 1px 14px no-repeat,
    linear-gradient(var(--m), var(--m)) top right / 14px 1px no-repeat,
    linear-gradient(var(--m), var(--m)) top right / 1px 14px no-repeat,
    linear-gradient(var(--m), var(--m)) bottom left / 14px 1px no-repeat,
    linear-gradient(var(--m), var(--m)) bottom left / 1px 14px no-repeat,
    linear-gradient(var(--m), var(--m)) bottom right / 14px 1px no-repeat,
    linear-gradient(var(--m), var(--m)) bottom right / 1px 14px no-repeat;
}

.caption {
  grid-area: caption;
  display: grid;
  gap: 12px;
  margin-block-start: 36px;
  min-inline-size: 0;
}

.name {
  font-family: var(--pc-font-display);
  font-size: 48px;
  font-weight: 600;
  line-height: 0.95;
  letter-spacing: -0.04em;
  overflow-wrap: anywhere;
}

.nameLong {
  font-size: 36px;
  line-height: 1;
}

.word {
  display: inline-block;
  max-inline-size: 100%;
  overflow: clip;
  overflow-clip-margin: 0.12em;
  padding-block-end: 0.08em;
  vertical-align: top;
}

.wordInner {
  display: inline-block;
  max-inline-size: 100%;
}

.role {
  max-inline-size: 34ch;
  font-size: 17px;
  line-height: 1.45;
  color: var(--pc-muted);
  text-wrap: pretty;
  overflow-wrap: anywhere;
}

.columnStart,
.columnEnd {
  position: relative;
  z-index: 3;
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.columnStart {
  grid-area: start;
  margin-block-start: 28px;
  border-block-start: 1px solid color-mix(in srgb, var(--pc-ink) 18%, transparent);
}

.columnEnd {
  grid-area: end;
}

.item {
  display: block;
  border-block-end: 1px solid color-mix(in srgb, var(--pc-ink) 18%, transparent);
}


.callout {
  position: relative;
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  align-items: start;
  column-gap: 16px;
  inline-size: 100%;
  min-block-size: 44px;
  margin: 0;
  padding-block: 16px;
  padding-inline: 0;
  border: 0;
  border-radius: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 320ms var(--pc-out);
}

.callout:focus-visible {
  outline: 2px solid var(--pc-accent);
  outline-offset: 4px;
  border-radius: 4px;
}

.calloutDim {
  opacity: 0.42;
}

.marker {
  display: grid;
  place-items: center;
  inline-size: 26px;
  block-size: 26px;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: var(--pc-cobalt-deep);
  background: var(--pc-accent);
  transition: transform 420ms var(--pc-out);
}

.markerActive {
  transform: scale(1.12);
}

.pin {
  display: none;
}

.copy {
  display: grid;
  gap: 4px;
  min-inline-size: 0;
}

.label {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: 0.005em;
  color: var(--pc-label);
  overflow-wrap: anywhere;
  transition: color 320ms var(--pc-out);
}

.labelActive {
  color: var(--pc-accent);
}

.text {
  font-size: 19px;
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: -0.012em;
  color: var(--pc-ink);
  text-wrap: pretty;
  overflow-wrap: anywhere;
}

.leaders {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  z-index: 2;
  overflow: visible;
  pointer-events: none;
}

.leader {
  transition: opacity 320ms var(--pc-out);
}

.leaderDim {
  opacity: 0.22;
}

.halo {
  fill: none;
  stroke: var(--pc-cobalt-deep);
  stroke-opacity: 0.35;
  stroke-width: 3;
  stroke-linejoin: miter;
}

.line {
  fill: none;
  stroke: var(--pc-line);
  stroke-width: 1;
  stroke-linejoin: miter;
  stroke-dasharray: 1;
  shape-rendering: geometricPrecision;
  transition: stroke-width 320ms var(--pc-out);
}

.lineActive {
  stroke-width: 1.75;
}

.joint {
  fill: var(--pc-cobalt);
  stroke: var(--pc-line);
  stroke-width: 1;
  transform-box: fill-box;
  transform-origin: center;
}

.terminal {
  fill: var(--pc-accent);
  stroke: var(--pc-cobalt-deep);
  stroke-width: 1.25;
  transform-box: fill-box;
  transform-origin: center;
  transition: transform 420ms var(--pc-out);
}

.terminalActive {
  transform: scale(1.45);
}

/* entrance choreography: light → push-in → name → anchors → lines → facts */
.keylightShown {
  animation: light 1400ms var(--pc-out) both;
}

.portraitShown {
  animation: push 1700ms var(--pc-out) 80ms both;
}

.frameShown {
  animation: wipe 1000ms var(--pc-inout) 80ms both;
}

.lensShown {
  animation: focus 1600ms var(--pc-out) 120ms both;
}

.marksShown {
  animation: fade 700ms var(--pc-out) 700ms both;
}

.castShown {
  animation: fade 1200ms var(--pc-out) 400ms both;
}

.wordHidden,
.roleHidden,
.copyHidden,
.markerHidden,
.anchorHidden,
.jointHidden,
.terminalHidden {
  opacity: 0;
}

.lineHidden {
  stroke-dashoffset: 1;
}

.wordShown {
  animation: riseWord 900ms var(--pc-out) both;
  animation-delay: calc(380ms + var(--w) * 90ms);
}

.roleShown {
  animation: rise 700ms var(--pc-out) 640ms both;
}

.anchorShown {
  animation: pop 560ms var(--pc-out) both;
  animation-delay: calc(820ms + var(--i) * 130ms);
}

.rippleShown {
  animation: ripple 1100ms var(--pc-out) both;
  animation-delay: calc(900ms + var(--i) * 130ms);
}

.lineShown {
  animation: draw 760ms var(--pc-inout) both;
  animation-delay: calc(980ms + var(--i) * 130ms);
}

.jointShown {
  animation: pop 420ms var(--pc-out) both;
  animation-delay: calc(1180ms + var(--i) * 130ms + var(--j) * 160ms);
}

.terminalShown {
  animation: pop 480ms var(--pc-out) both;
  animation-delay: calc(1560ms + var(--i) * 130ms);
}

.markerShown {
  animation: pop 480ms var(--pc-out) both;
  animation-delay: calc(900ms + var(--i) * 110ms);
}

.copyShown {
  animation: rise 720ms var(--pc-out) both;
  animation-delay: calc(1500ms + var(--i) * 130ms);
}

@keyframes light {
  from {
    opacity: 0;
    transform: scale(0.7);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes push {
  from {
    transform: scale(0.93) translateY(18px);
  }
  to {
    transform: none;
  }
}

@keyframes wipe {
  from {
    clip-path: inset(100% 0 0 0 round 6px);
  }
  to {
    clip-path: inset(0 0 0 0 round 6px);
  }
}

@keyframes focus {
  from {
    transform: scale(1.2);
    filter: blur(10px) brightness(0.7);
  }
  to {
    transform: none;
    filter: none;
  }
}

@keyframes fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes riseWord {
  from {
    transform: translateY(105%);
  }
  to {
    transform: none;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes pop {
  0% {
    opacity: 0;
    transform: scale(0.2);
  }
  60% {
    opacity: 1;
    transform: scale(1.15);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes ripple {
  0% {
    opacity: 0.9;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(3.2);
  }
}

@keyframes draw {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}

@container (min-width: 760px) {
  .root {
    padding-block: 64px;
    padding-inline: 56px;
  }

  .stage {
    grid-template-columns: minmax(0, 0.78fr) minmax(320px, 1.2fr) minmax(0, 1.05fr);
    grid-template-rows: auto 1fr;
    grid-template-areas:
      'start portrait caption'
      'start portrait end';
    column-gap: 80px;
    align-items: start;
  }

  .portrait {
    inline-size: 100%;
  }

  .caption {
    margin-block-start: 0;
    margin-inline-start: -116px;
    gap: 18px;
    position: relative;
    z-index: 4;
  }

  .name {
    font-size: clamp(56px, 7.6cqi, 104px);
    line-height: 0.9;
    text-wrap: balance;
    text-shadow: 0 1px 2px rgba(3, 9, 58, 0.25), 0 8px 30px rgba(3, 9, 58, 0.3);
  }

  .nameLong {
    font-size: clamp(40px, 4.6cqi, 60px);
  }

  .role {
    margin-inline-start: 116px;
  }

  .columnStart {
    align-self: center;
    margin-block-start: 22%;
    gap: 28px;
  }

  .columnEnd {
    align-self: center;
    margin-block-start: 48px;
    gap: 22px;
  }

  .columnStart,
  .columnEnd {
    display: grid;
  }

  .item,
  .columnStart {
    border-block: 0;
  }

  .callout {
    grid-template-columns: minmax(0, 1fr);
    padding-block: 6px;
  }

  .marker,
  .anchorNum {
    display: none;
  }

  .anchor {
    inline-size: 14px;
    block-size: 14px;
    margin-inline-start: -7px;
    margin-block-start: -7px;
    background: var(--pc-cobalt-deep);
    box-shadow:
      inset 0 0 0 1.5px var(--pc-line),
      inset 0 0 0 4px var(--pc-cobalt-deep),
      inset 0 0 0 7px var(--pc-accent),
      0 2px 6px rgba(3, 9, 58, 0.5);
  }

  .anchorActive {
    transform: scale(1.4);
  }

  .pin {
    display: block;
    position: absolute;
    inset-block-start: 15px;
    inset-inline-start: -18px;
    inline-size: 1px;
    block-size: 1px;
  }

  .pinStart {
    inset-inline-start: auto;
    inset-inline-end: -18px;
  }

  .calloutStart {
    text-align: end;
  }

  .copyStart {
    justify-items: end;
  }
}

@media (prefers-reduced-motion: reduce) {
  .photo,
  .shade,
  .ring,
  .anchor,
  .marker,
  .terminal,
  .line {
    transition: opacity 200ms ease;
  }

  .photoFocused {
    transform: scale(1.04);
  }

  .keylightShown,
  .portraitShown,
  .frameShown,
  .lensShown,
  .marksShown,
  .castShown,
  .wordShown,
  .roleShown,
  .anchorShown,
  .rippleShown,
  .lineShown,
  .jointShown,
  .terminalShown,
  .markerShown,
  .copyShown {
    animation: none;
  }

  .wordHidden,
  .roleHidden,
  .copyHidden,
  .markerHidden,
  .anchorHidden,
  .jointHidden,
  .terminalHidden {
    opacity: 1;
  }

  .lineHidden {
    stroke-dashoffset: 0;
  }
}
`;export{n as default};
