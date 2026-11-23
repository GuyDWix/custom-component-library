const n=`@font-face {
  font-family: 'Special Elite';
  font-style: normal;
  font-display: swap;
  font-weight: 400;
  src: url('./fonts/special-elite-latin-400-normal.woff2') format('woff2');
}

@font-face {
  font-family: 'Archivo';
  font-style: normal;
  font-display: swap;
  font-weight: 700;
  src: url('./fonts/archivo-latin-700-normal.woff2') format('woff2');
}

@font-face {
  font-family: 'Archivo';
  font-style: normal;
  font-display: swap;
  font-weight: 800;
  src: url('./fonts/archivo-latin-800-normal.woff2') format('woff2');
}

.root {
  --it-tab: #5f6b34;
  --it-tab-ink: #f7f1d6;
  --it-tone: #ebd7a3;
  --it-ink: #2b281f;
  --it-desk: #d2d7cb;
  --it-desk-deep: #bcc3b4;
  --it-stamp: #2a3a93;
  --it-rule: #c4584a;
  --it-radius: 7px;
  --it-font-display: 'Archivo', 'Helvetica Neue', Arial, sans-serif;
  --it-font-type: 'Special Elite', 'Courier New', Courier, monospace;

  --it-ink-soft: color-mix(in srgb, var(--it-ink) 80%, var(--it-tone));
  --it-ruled: color-mix(in srgb, var(--it-ink) 16%, transparent);
  --it-tone-hi: color-mix(in srgb, var(--it-tone) 80%, #fff);
  --it-tone-lo: color-mix(in srgb, var(--it-tone) 88%, #6a4a10);
  --it-edge: color-mix(in srgb, var(--it-tone) 62%, #4a3208);
  --it-edge-deep: color-mix(in srgb, var(--it-tone) 42%, #3a2606);
  --it-tab-deep: color-mix(in srgb, var(--it-tab) 78%, #000);
  --it-focus: #243587;

  --it-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --it-fibers: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='0.9 0.03' numOctaves='2' seed='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.42  0 0 0 0 0.28  0 0 0 0 0.08  0 0 0 1.2 -0.42'/></filter><rect width='100%' height='100%' filter='url(%23f)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 28px;
  background: linear-gradient(165deg, color-mix(in srgb, var(--it-desk) 84%, #fff) 0%, var(--it-desk) 46%, var(--it-desk-deep) 100%);
  color: var(--it-ink);
  font-family: var(--it-font-display);
}

.light,
.blinds,
.deskGrain {
  position: absolute;
  pointer-events: none;
  z-index: 0;
}

.light {
  inset: 0;
  background:
    radial-gradient(60% 55% at 18% 8%, rgba(255, 255, 255, 0.6) 0%, transparent 70%),
    radial-gradient(70% 60% at 100% 100%, rgba(40, 52, 38, 0.18) 0%, transparent 70%);
}

.blinds {
  inset: -30% -10%;
  background: repeating-linear-gradient(
    108deg,
    transparent 0 52px,
    rgba(36, 50, 36, 0.1) 52px 108px
  );
  filter: blur(9px);
  -webkit-mask-image: linear-gradient(100deg, #000 0%, #000 45%, transparent 85%);
  mask-image: linear-gradient(100deg, #000 0%, #000 45%, transparent 85%);
  animation: blindsDrift 38s ease-in-out infinite alternate;
}

.deskGrain {
  inset: 0;
  background-image: var(--it-noise);
  opacity: 0.2;
  mix-blend-mode: multiply;
}

@keyframes blindsDrift {
  from {
    transform: translate3d(-3%, 0, 0);
  }
  to {
    transform: translate3d(4%, 2%, 0);
  }
}

.stage {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  padding-block: 46px 40px;
  padding-inline: 14px;
}

.file {
  display: flex;
  flex-direction: column;
  max-inline-size: 1060px;
  margin-inline: auto;
  transform: rotate(-0.5deg);
}

/* ---------- tabs ---------- */

.tabsWrap {
  position: relative;
  z-index: 1;
  margin-block-end: -12px;
  margin-inline: -14px;
}

.tabs {
  position: relative;
  display: flex;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-block: 12px 12px;
  padding-inline: 20px;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 var(--it-fade-s, 0px), #000 calc(100% - var(--it-fade-e, 0px)), transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0, #000 var(--it-fade-s, 0px), #000 calc(100% - var(--it-fade-e, 0px)), transparent 100%);
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tab,
.tabOn {
  all: unset;
  box-sizing: border-box;
  flex: none;
  display: flex;
  align-items: center;
  inline-size: max-content;
  min-inline-size: 88px;
  max-inline-size: calc(100cqi - 96px);
  min-block-size: 48px;
  padding-block: 8px;
  padding-inline: 18px;
  border-radius: 12px 12px 0 0;
  background: var(--it-tab);
  color: var(--it-tab-ink);
  font-family: var(--it-font-type);
  font-size: 15px;
  line-height: 1;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 0 0 1px rgba(0, 0, 0, 0.12),
    0 -2px 6px -3px rgba(24, 32, 20, 0.35);
  transition:
    transform 560ms cubic-bezier(0.34, 1.5, 0.5, 1),
    background-color 260ms ease,
    box-shadow 260ms ease;
}

.tab:hover {
  transform: translateY(-3px);
}

.tabOn {
  background: var(--it-tab-deep);
  transform: translateY(-9px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.24),
    inset 0 0 0 1px rgba(0, 0, 0, 0.18),
    0 -4px 10px -3px rgba(24, 32, 20, 0.45);
}

.tab:focus-visible,
.tabOn:focus-visible {
  outline: 3px solid var(--it-focus);
  outline-offset: 2px;
}

/* Names are never truncated: narrow tabs size to the label, wide tabs scale it, then wrap. */
.tabLabel {
  min-inline-size: 0;
  line-height: 1.15;
  letter-spacing: 0.09em;
  text-align: center;
  white-space: normal;
  overflow-wrap: anywhere;
}

/* ---------- deck ---------- */

.deckWrap {
  position: relative;
  z-index: 2;
  --gs: 0.55;
}

.ghostA,
.ghostB,
.ghostC {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  border-radius: var(--it-radius);
  background: linear-gradient(180deg, var(--it-tone-hi) 0%, var(--it-tone-lo) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    0 1px 0 var(--it-edge),
    0 8px 14px -8px rgba(24, 32, 20, 0.4);
  animation: nudge 640ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.ghostA {
  translate: calc(var(--gs) * -7px) calc(var(--gs) * -10px);
  rotate: -0.5deg;
  filter: brightness(0.97);
}

.ghostB {
  translate: calc(var(--gs) * 8px) calc(var(--gs) * -19px);
  rotate: 0.6deg;
  filter: brightness(0.94);
  animation-delay: 40ms;
}

.ghostC {
  translate: calc(var(--gs) * -4px) calc(var(--gs) * -28px);
  rotate: -0.3deg;
  filter: brightness(0.91);
  animation-delay: 80ms;
}

@keyframes nudge {
  from {
    transform: translateY(9px);
  }
  to {
    transform: none;
  }
}

.deck {
  position: relative;
  z-index: 1;
  display: grid;
  perspective: 1800px;
  perspective-origin: 50% 20%;
  touch-action: pan-y;
  border-radius: var(--it-radius);
  outline: none;
}

.deck:focus-visible {
  outline: 3px solid var(--it-focus);
  outline-offset: 6px;
}

.card {
  --pw: clamp(100px, 30cqi, 148px);
  --ptop: 12px;
  --pright: 14px;
  --pad-top: 28px;
  --pad-x: 22px;
  --lh: 28px;
  --gap-h: 0px;

  position: relative;
  z-index: 2;
  grid-area: 1 / 1;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  isolation: isolate;
  /* bottom padding is the reserved stamp zone: the bio always ends above the ink stamp */
  padding-block: var(--pad-top) 112px;
  padding-inline: var(--pad-x);
  border-radius: var(--it-radius);
  background:
    linear-gradient(172deg, var(--it-tone-hi) 0%, var(--it-tone) 38%, var(--it-tone-lo) 100%);
  color: var(--it-ink);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform-origin: 50% 100%;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.6),
    0 1px 0 var(--it-edge),
    0 2px 0 var(--it-edge),
    0 3px 0 var(--it-edge-deep),
    0 26px 36px -20px rgba(24, 34, 22, 0.55),
    0 8px 14px -8px rgba(24, 34, 22, 0.32);
}

.sizer {
  visibility: hidden;
  pointer-events: none;
  z-index: 0;
}

.fibers,
.grain,
.wear,
.shade,
.shadeOn,
.inkLayer {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}

.fibers {
  background-image: var(--it-fibers);
  opacity: 0.55;
  mix-blend-mode: multiply;
}

.grain {
  background-image: var(--it-noise);
  opacity: 0.14;
  mix-blend-mode: multiply;
}

.wear {
  background:
    linear-gradient(112deg, rgba(255, 255, 255, 0.34) 0%, transparent 34%),
    linear-gradient(0deg, rgba(90, 58, 10, 0.12) 0%, transparent 22%);
}

.hole {
  position: absolute;
  inset-block-end: 20px;
  inset-inline: 0;
  margin-inline: auto;
  inline-size: 20px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--it-desk-deep);
  box-shadow:
    inset 0 3px 4px rgba(24, 24, 12, 0.45),
    0 1px 0 rgba(255, 255, 255, 0.4);
}

.shade,
.shadeOn {
  z-index: 6;
  background: linear-gradient(180deg, rgba(30, 22, 8, 0.5) 0%, rgba(30, 22, 8, 0.12) 65%, transparent 100%);
  opacity: 0;
}

.shadeOn {
  animation: shadeOut 720ms cubic-bezier(0.4, 0, 0.8, 0.6) both;
}

@keyframes shadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* ---------- content ---------- */

.head {
  position: relative;
  z-index: 2;
  display: grid;
  align-content: start;
  gap: 14px;
  padding-inline-end: calc(var(--pw) + var(--pright) - var(--pad-x) + 16px);
  min-block-size: max(0px, calc(var(--ptop) + var(--pw) * 1.25 - var(--pad-top) - 70px));
}

.name {
  margin: 0;
  font-family: var(--it-font-display);
  font-size: clamp(28px, 8.4cqi, 40px);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.035em;
  color: var(--it-ink);
  /* never break inside a word: wrap only at spaces and hyphens; the size is fitted to the longest piece in the component */
  min-inline-size: 0;
  overflow-wrap: normal;
  word-break: normal;
  hyphens: manual;
  text-wrap: balance;
  animation: rise 560ms cubic-bezier(0.2, 0.8, 0.2, 1) calc(var(--lag) + 200ms) both;
}

.name::selection,
.roleValue::selection,
.bioText::selection {
  background: color-mix(in srgb, var(--it-stamp) 78%, transparent);
  color: var(--it-tone-hi);
}

.role {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 12px;
  margin: 0;
  padding-block-end: 7px;
  border-block-end: 1px solid color-mix(in srgb, var(--it-ink) 38%, transparent);
  animation: rise 560ms cubic-bezier(0.2, 0.8, 0.2, 1) calc(var(--lag) + 290ms) both;
}

.roleLabel {
  font-family: var(--it-font-type);
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--it-ink-soft);
}

.roleValue {
  min-inline-size: 0;
  font-family: var(--it-font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.005em;
  overflow-wrap: anywhere;
}

.rule {
  position: relative;
  z-index: 1;
  flex: none;
  block-size: 2px;
  margin-block: 18px 8px;
  border-radius: 1px;
  background: var(--it-rule);
  opacity: 0.72;
}

.bio {
  position: relative;
  z-index: 1;
  min-block-size: calc(var(--lh) * 4);
  background-image: repeating-linear-gradient(
    180deg,
    transparent 0,
    transparent calc(var(--lh) - 1px),
    var(--it-ruled) calc(var(--lh) - 1px),
    var(--it-ruled) var(--lh)
  );
}

.bioGap {
  float: inline-end;
  inline-size: calc(var(--pw) + var(--pright) - var(--pad-x) + 16px);
  block-size: var(--gap-h);
}

.bioText {
  margin: 0;
  font-family: var(--it-font-type);
  font-size: 14.5px;
  line-height: var(--lh);
  letter-spacing: 0.01em;
  color: var(--it-ink);
  overflow-wrap: anywhere;
  text-shadow: 0 0 0.7px currentColor;
  animation: typeIn 1000ms cubic-bezier(0.35, 0.6, 0.3, 1) calc(var(--lag) + 380ms) both;
}

/* ---------- photo, clip, stamp ---------- */

.photo {
  position: absolute;
  z-index: 3;
  inset-block-start: var(--ptop);
  inset-inline-end: var(--pright);
  inline-size: var(--pw);
  aspect-ratio: 4 / 5;
  transform: rotate(var(--tilt));
  animation: slap 640ms cubic-bezier(0.2, 0.9, 0.3, 1) calc(var(--lag) + 240ms) both;
}

.print {
  position: relative;
  display: block;
  box-sizing: border-box;
  overflow: hidden;
  inline-size: 100%;
  block-size: 100%;
  padding: 7px;
  border-radius: 2px;
  background: #f6f2e7;
  box-shadow:
    inset 0 0 0 1px rgba(60, 44, 12, 0.12),
    0 2px 3px rgba(40, 30, 10, 0.28),
    0 20px 28px -14px rgba(40, 30, 10, 0.55);
}

.image {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  filter: grayscale(0.32) sepia(0.2) contrast(1.05);
  user-select: none;
}

.monogram {
  display: grid;
  place-items: center;
  inline-size: 100%;
  block-size: 100%;
  background: color-mix(in srgb, var(--it-tab) 30%, #f6f2e7);
  font-family: var(--it-font-display);
  font-size: 56px;
  font-weight: 800;
  color: var(--it-tab-deep);
}

.photoTone {
  position: absolute;
  inset: 7px;
  background: linear-gradient(160deg, rgba(255, 244, 214, 0.18), rgba(110, 76, 20, 0.16));
  mix-blend-mode: multiply;
  pointer-events: none;
}

.clip {
  position: absolute;
  /* narrow: the clip stays inside the card edge so it never sits over the tab row */
  inset-block-start: -6px;
  inset-inline-start: 16%;
  inline-size: 30px;
  block-size: 84px;
  overflow: visible;
  rotate: 7deg;
  filter: drop-shadow(0 3px 2px rgba(20, 20, 10, 0.35));
}

.clipWire {
  fill: none;
  stroke: #858b90;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.clipShine {
  fill: none;
  stroke: #e9edee;
  stroke-width: 0.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.inkLayer {
  z-index: 2;
  overflow: hidden;
}

.stamp {
  position: absolute;
  inset-block-end: -26px;
  inset-inline-end: 18px;
  inline-size: 124px;
  block-size: 124px;
  color: var(--it-stamp);
  opacity: 0.9;
  mix-blend-mode: multiply;
  transform: rotate(-13deg);
  animation: stampIn 520ms cubic-bezier(0.2, 0.9, 0.3, 1) calc(var(--lag) + 460ms) both;
}

.stampRing {
  font-family: var(--it-font-display);
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.stampNumeral {
  font-family: var(--it-font-display);
  font-size: 56px;
  font-weight: 800;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}

/* ---------- flip choreography ---------- */

.flipOut {
  z-index: 4;
  animation: flipOut 720ms both;
}

.flipIn {
  z-index: 4;
  animation: flipIn 780ms both;
}

.settle {
  animation: settle 760ms both;
}

@keyframes flipOut {
  0% {
    transform: translateY(0) rotateX(0deg);
    animation-timing-function: cubic-bezier(0.3, 0.7, 0.4, 1);
  }
  15% {
    transform: translateY(-5px) rotateX(5deg);
    animation-timing-function: cubic-bezier(0.55, 0.06, 0.7, 0.4);
  }
  100% {
    transform: translateY(30px) rotateX(-97deg);
  }
}

@keyframes flipIn {
  0% {
    transform: translateY(30px) rotateX(-97deg);
    animation-timing-function: cubic-bezier(0.2, 0.7, 0.3, 1);
  }
  62% {
    transform: translateY(-3px) rotateX(4deg);
    animation-timing-function: ease-in-out;
  }
  82% {
    transform: translateY(1px) rotateX(-1.2deg);
    animation-timing-function: ease-out;
  }
  100% {
    transform: none;
  }
}

@keyframes settle {
  0% {
    transform: translateY(14px) scale(0.982);
    animation-timing-function: cubic-bezier(0.2, 0.7, 0.3, 1);
  }
  58% {
    transform: translateY(0) scale(1);
    animation-timing-function: ease-out;
  }
  70% {
    transform: translateY(2.5px) scale(0.9985);
    animation-timing-function: ease-out;
  }
  100% {
    transform: none;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes typeIn {
  from {
    clip-path: inset(0 0 100% 0);
  }
  to {
    clip-path: inset(0 0 -6px 0);
  }
}

@keyframes slap {
  0% {
    opacity: 0;
    transform: translate(-18px, -28px) rotate(calc(var(--tilt) - 9deg)) scale(1.1);
  }
  55% {
    opacity: 1;
    transform: translate(0, 1px) rotate(var(--tilt)) scale(0.985);
  }
  100% {
    opacity: 1;
    transform: rotate(var(--tilt)) scale(1);
  }
}

@keyframes stampIn {
  0% {
    opacity: 0;
    transform: rotate(-13deg) scale(1.75);
  }
  42% {
    opacity: 0.95;
    transform: rotate(-13deg) scale(0.93);
  }
  68% {
    opacity: 0.9;
    transform: rotate(-13deg) scale(1.03);
  }
  100% {
    opacity: 0.9;
    transform: rotate(-13deg) scale(1);
  }
}

.sr {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* ---------- wide: tabs on the right edge of the card ---------- */

@container (min-width: 720px) {
  .stage {
    padding-block: 92px 76px;
    padding-inline: 56px;
  }

  .file {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 170px;
    transform: rotate(-1.1deg);
  }

  .tabsWrap {
    grid-column: 2;
    grid-row: 1;
    margin-block-end: 0;
    margin-inline: -18px 0;
  }

  .tabs {
    position: absolute;
    inset: 0;
    flex-direction: column;
    gap: 9px;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior-y: contain;
    padding-block: 40px 24px;
    padding-inline: 0 30px;
    -webkit-mask-image: none;
    mask-image: none;
  }

  .tab,
  .tabOn {
    inline-size: 100%;
    max-inline-size: none;
    min-inline-size: 0;
    min-block-size: 52px;
    padding-block: 10px;
    padding-inline: 30px 12px;
    border-radius: 0 12px 12px 0;
    font-size: 15.5px;
    box-shadow:
      inset 1px 0 0 rgba(255, 255, 255, 0.18),
      inset 0 0 0 1px rgba(0, 0, 0, 0.12),
      3px 4px 8px -4px rgba(24, 32, 20, 0.4);
  }

  .tabLabel {
    inline-size: 100%;
    text-align: start;
    /* scale the name to the tab (monospace-ish: ~0.76em per letter incl. tracking), floor 12px, then it wraps */
    font-size: clamp(12px, calc(114px / (var(--n, 8) * 0.76)), 15.5px);
  }

  .tab:hover {
    transform: translateX(6px);
  }

  .tabOn {
    transform: translateX(20px);
    box-shadow:
      inset 1px 0 0 rgba(255, 255, 255, 0.22),
      inset 0 0 0 1px rgba(0, 0, 0, 0.18),
      5px 7px 12px -5px rgba(24, 32, 20, 0.5);
  }

  .deckWrap {
    grid-column: 1;
    grid-row: 1;
    --gs: 1;
  }

  .card {
    --pw: 252px;
    --ptop: -46px;
    --pright: 46px;
    --pad-top: 56px;
    --pad-x: 56px;
    --lh: 33px;
    --gap-h: 46px;
    padding-block-end: 152px;
  }

  .name {
    font-size: clamp(52px, 6.4cqi, 80px);
    letter-spacing: -0.045em;
    line-height: 0.96;
  }

  .role {
    gap: 2px 14px;
    padding-block-end: 9px;
    max-inline-size: 440px;
  }

  .roleLabel {
    font-size: 14px;
  }

  .roleValue {
    font-size: 19px;
  }

  .rule {
    margin-block: 20px 10px;
  }

  .bioText {
    font-size: 17px;
  }

  .print {
    padding: 9px;
  }

  .photoTone {
    inset: 9px;
  }

  .clip {
    inset-block-start: -30px;
    inset-inline-start: 18%;
    inline-size: 38px;
    block-size: 106px;
  }

  .hole {
    inset-block-end: 24px;
    inline-size: 24px;
  }

  .stamp {
    inset-block-end: -30px;
    inset-inline-end: 52px;
    inline-size: 164px;
    block-size: 164px;
  }

  .monogram {
    font-size: 88px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .blinds,
  .ghostA,
  .ghostB,
  .ghostC,
  .name,
  .role,
  .bioText,
  .photo,
  .stamp,
  .flipOut,
  .flipIn,
  .settle,
  .shadeOn {
    animation: none;
  }

  .tab,
  .tabOn {
    transition: none;
  }
}
`;export{n as default};
