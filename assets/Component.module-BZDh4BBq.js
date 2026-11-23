const n=`@font-face {
  font-family: 'Gabarito';
  src: url('./fonts/gabarito-latin-wght-normal.woff2') format('woff2');
  font-weight: 400 900;
  font-style: normal;
  font-display: swap;
}

.root {
  --ld-ink: #15133f;
  --ld-night: #0f0d33;
  --ld-indigo: #26256f;
  --ld-coral: #ff6f5a;
  --ld-cream: #fff1e0;
  --ld-cream-soft: #ffd9c2;
  --ld-font: 'Gabarito', 'Avenir Next', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --ld-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding: 24px;
  border-radius: 36px;
  background:
    radial-gradient(70% 60% at 72% 104%, rgba(255, 111, 90, 0.2), transparent 70%),
    var(--ld-night);
  color: var(--ld-cream);
  font-family: var(--ld-font);
}

.root::selection {
  background: var(--ld-coral);
  color: var(--ld-ink);
}

.defs {
  position: absolute;
  inline-size: 0;
  block-size: 0;
  overflow: hidden;
  pointer-events: none;
}

.stage {
  perspective: 1500px;
}

.card {
  --nx: 0.3;
  --ny: -0.18;
  --sway: 0;
  --tagsway: 0;
  --lx: 2.4;
  --ld: 18;
  --tilt: 3.6;
  --play: running;

  position: relative;
  isolation: isolate;
  overflow: clip;
  box-sizing: border-box;
  inline-size: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 26px;
  background: var(--ld-indigo);
  color: var(--ld-cream);
  touch-action: pan-y;
  outline: none;
  transform: rotateX(calc(var(--ny) * var(--tilt) * -1deg)) rotateY(calc(var(--nx) * var(--tilt) * 1deg));
  box-shadow:
    0 0 0 1px rgba(255, 190, 170, 0.12),
    0 2px 4px rgba(5, 4, 24, 0.5),
    0 28px 50px -14px rgba(5, 4, 24, 0.75);
}

.card:focus-visible {
  outline: 2px solid var(--ld-cream);
  outline-offset: 5px;
}

/* ---------- planes ---------- */

.plane {
  position: absolute;
  inset: 0;
  pointer-events: none;
  will-change: transform;
  transform: translate3d(calc(var(--nx) * var(--z) * var(--ld) * -1px), calc(var(--ny) * var(--z) * var(--ld) * -0.6px), 0);
}

.bleed {
  inset-block: -6%;
  inset-inline: -6%;
}

.pre {
  opacity: 0;
}

.go {
  animation: rise 1150ms var(--d, 0ms) cubic-bezier(0.2, 0.9, 0.25, 1) both;
}

@keyframes rise {
  from {
    translate: var(--fx, 0) var(--from, 0);
    opacity: 0;
  }
  to {
    translate: 0 0;
    opacity: 1;
  }
}

.svg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
}

.bgImg {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  filter: saturate(0.85) contrast(1.05);
}

.bgTint {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(38, 37, 111, 0.82) 0%, rgba(192, 80, 127, 0.5) 55%, rgba(255, 112, 88, 0.45) 100%);
  mix-blend-mode: multiply;
}

.sun {
  position: absolute;
  inset-inline-start: 42%;
  inset-block-start: 7%;
  inline-size: 46%;
  block-size: auto;
  aspect-ratio: 1;
  overflow: visible;
}

.cloud {
  position: absolute;
  aspect-ratio: 260 / 100;
  animation: drift 46s ease-in-out infinite alternate;
  animation-play-state: var(--play, running);
}

.cloud0 {
  inset-inline-start: 29%;
  inset-block-start: 19%;
  inline-size: 19%;
}

.cloud1 {
  inset-inline-start: 74%;
  inset-block-start: 9%;
  inline-size: 17%;
  animation-duration: 58s;
  animation-direction: alternate-reverse;
}

.cloud2 {
  inset-inline-start: 3%;
  inset-block-start: 33%;
  inline-size: 14%;
  animation-duration: 70s;
}

@keyframes drift {
  from {
    transform: translateX(-9%);
  }
  to {
    transform: translateX(11%);
  }
}

/* ---------- hero ---------- */

.hero {
  position: absolute;
  inset-inline-start: 58%;
  inset-block-start: 5%;
  block-size: 72%;
  aspect-ratio: 360 / 560;
}

.sway {
  inline-size: 100%;
  block-size: 100%;
  transform-origin: 50% 5%;
  transform: rotate(calc(var(--sway) * 1deg));
}

.bob {
  inline-size: 100%;
  block-size: 100%;
  animation: bob 6.5s ease-in-out infinite alternate;
  animation-play-state: var(--play, running);
}

@keyframes bob {
  from {
    transform: translateY(-1.4%);
  }
  to {
    transform: translateY(1.8%);
  }
}

.heroImg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 2px rgba(13, 11, 51, 0.45)) drop-shadow(0 18px 22px rgba(13, 11, 51, 0.45));
}

.flame {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: flicker 1.7s ease-in-out infinite alternate;
  animation-play-state: var(--play, running);
}

@keyframes flicker {
  0% {
    opacity: 0.82;
    transform: scale(1, 0.92);
  }
  45% {
    opacity: 1;
    transform: scale(1.06, 1.1);
  }
  100% {
    opacity: 0.88;
    transform: scale(0.96, 0.98);
  }
}

/* ---------- type ---------- */

.title {
  position: absolute;
  inset-inline-start: 9.5%;
  /* the box floor sits above the highest near-hill tip (about 75% of the card), so the title grows upward and is never covered */
  inset-block-end: 27%;
  box-sizing: border-box;
  inline-size: 42%;
  margin: 0;
  padding-block: 0.22em 0.16em;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
  overflow: hidden;
  overflow-wrap: anywhere;
  text-wrap: balance;
  color: var(--ld-cream);
  font-family: var(--ld-font);
  font-weight: 900;
  line-height: 0.92;
  letter-spacing: -0.035em;
  text-shadow: 0 -2px 3px rgba(13, 11, 51, 0.4), 0 -10px 22px rgba(13, 11, 51, 0.5);
}

.sizeL {
  font-size: clamp(36px, 8.4cqi, 124px);
}

.sizeM {
  font-size: clamp(30px, 6.4cqi, 96px);
}

.sizeS {
  font-size: clamp(26px, 4.8cqi, 72px);
}

.sizeXs {
  font-size: clamp(22px, 3.7cqi, 56px);
  line-height: 0.98;
}

.caption {
  position: absolute;
  inset-inline-start: 9.5%;
  inset-block-end: 6.4%;
  box-sizing: border-box;
  inline-size: 56%;
  margin: 0;
  color: var(--ld-cream-soft);
  font-family: var(--ld-font);
  font-weight: 500;
  font-size: clamp(14px, 1.45cqi, 22px);
  line-height: 1.3;
  letter-spacing: 0.005em;
  text-wrap: balance;
  overflow-wrap: anywhere;
  text-shadow: 0 -1px 2px rgba(13, 11, 51, 0.5);
}

/* ---------- hanging label ---------- */

.tagAnchor {
  position: absolute;
  inset-inline-start: 13%;
  inset-block-start: 3%;
  inline-size: 0;
}

.tagSwing {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  display: grid;
  justify-items: center;
  inline-size: max-content;
  transform: translateX(-50%) rotate(calc(var(--tagsway) * 1deg));
  transform-origin: 50% 0;
  filter: drop-shadow(0 -1px 1px rgba(13, 11, 51, 0.4)) drop-shadow(0 10px 12px rgba(13, 11, 51, 0.4));
}

.tagGo {
  animation: tag-drop 1900ms 1150ms cubic-bezier(0.3, 0.7, 0.4, 1) both;
}

@keyframes tag-drop {
  0% {
    rotate: 30deg;
  }
  16% {
    rotate: -19deg;
  }
  32% {
    rotate: 12deg;
  }
  48% {
    rotate: -6.5deg;
  }
  64% {
    rotate: 3.2deg;
  }
  80% {
    rotate: -1.3deg;
  }
  100% {
    rotate: 0deg;
  }
}

.string {
  display: block;
  inline-size: 1.5px;
  block-size: clamp(36px, 9cqi, 112px);
  background: rgba(255, 241, 224, 0.75);
}

.tag {
  position: relative;
  display: block;
  overflow: hidden;
  box-sizing: border-box;
  /* the string hangs at 13% of the card: keep half the tag width inside that, with room for the swing and parallax */
  max-inline-size: 17cqi;
  padding-block: 1.3em 0.7em;
  padding-inline: 1.1em;
  background: var(--ld-cream);
  color: var(--ld-ink);
  font-family: var(--ld-font);
  font-weight: 700;
  font-size: clamp(13px, 1.5cqi, 22px);
  line-height: 1.15;
  letter-spacing: 0.005em;
  text-align: center;
  text-wrap: balance;
  overflow-wrap: anywhere;
  clip-path: polygon(14% 0, 86% 0, 100% 14%, 100% 100%, 0 100%, 0 14%);
}

/* the clamp lives on the inner text so the tag's padding can never reveal a sixth line */
.tagText {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
  overflow: hidden;
}

.hole {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 0.5em;
  inline-size: 0.5em;
  block-size: 0.5em;
  margin-inline-start: -0.25em;
  border-radius: 50%;
  background: var(--ld-night);
  box-shadow: 0 0 0 1.5px rgba(255, 190, 170, 0.5);
}

/* ---------- proscenium ---------- */

.drapeL,
.drapeR {
  position: absolute;
  inset-block: -2%;
  inline-size: 14%;
  block-size: 104%;
  overflow: visible;
}

.drapeL {
  inset-inline-start: -6%;
}

.drapeR {
  inset-inline-end: -6%;
  transform: scaleX(-1);
}

.valance {
  position: absolute;
  inset-inline: -6%;
  inset-block-start: -2%;
  inline-size: 112%;
  block-size: auto;
  aspect-ratio: 1200 / 80;
  overflow: visible;
}

/* ---------- light and print texture ---------- */

.light {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(48% 62% at calc(66% + var(--lx) * 1%) 56%, rgba(255, 140, 100, 0.2), transparent 72%),
    radial-gradient(130% 100% at 50% 50%, transparent 52%, rgba(10, 9, 40, 0.5) 100%);
}

.grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: var(--ld-noise);
  background-size: 180px 180px;
  opacity: 0.5;
  mix-blend-mode: overlay;
}

/* ---------- narrow containers ---------- */

@container (max-width: 640px) {
  .root {
    padding: 10px;
    border-radius: 28px;
  }

  .card {
    aspect-ratio: 4 / 5;
    border-radius: 20px;
  }

  .sun {
    inset-inline-start: 18%;
    inset-block-start: 14%;
    inline-size: 84%;
  }

  .cloud0 {
    inset-inline-start: 2%;
    inset-block-start: 16%;
    inline-size: 36%;
  }

  .cloud1 {
    inset-inline-start: 70%;
    inset-block-start: 10%;
    inline-size: 28%;
  }

  .cloud2 {
    inset-inline-start: 26%;
    inset-block-start: 31%;
    inline-size: 26%;
  }

  .hero {
    inset-inline-start: 47%;
    inset-block-start: 6%;
    block-size: 46%;
  }

  .title {
    inset-inline-start: 8%;
    inset-block-end: 23%;
    /* stop short of the right drape so long titles are never clipped by it */
    inline-size: 76%;
  }

  .sizeL {
    font-size: clamp(34px, 15cqi, 80px);
  }

  .sizeM {
    font-size: clamp(28px, 11cqi, 64px);
  }

  .sizeS {
    font-size: clamp(24px, 8.4cqi, 48px);
  }

  .sizeXs {
    font-size: clamp(20px, 6.6cqi, 40px);
  }

  .caption {
    inset-inline-start: 8%;
    inset-block-end: 6%;
    inline-size: 82%;
    font-size: 14px;
  }

  /* long captions wrap to 4+ lines at this width: tighten and drop them so they stay clear of the title above */
  .captionLong {
    inset-block-end: 2%;
    font-size: 13px;
    line-height: 1.22;
  }

  .tagAnchor {
    inset-inline-start: 30%;
    inset-block-start: 4%;
  }

  .string {
    block-size: 34px;
  }

  .tag {
    /* string at 30%: half width stays inside it with room for swing and parallax */
    max-inline-size: 44cqi;
    font-size: 13px;
  }

  .drapeL,
  .drapeR {
    inline-size: 20%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .go,
  .tagGo,
  .bob,
  .cloud,
  .flame {
    animation: none;
  }

  .pre {
    opacity: 1;
  }
}
`;export{n as default};
