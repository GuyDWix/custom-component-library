const n=`.root {
  --cs-accent: #2448d8;
  --cs-sky: #cfe0f3;
  --cs-bg: #f6f4ef;
  --cs-ink: #121c38;
  --cs-muted: rgba(18, 28, 56, 0.6);
  --cs-shadow: 28, 52, 110;
  --cs-font-quote: 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif;
  --cs-font-ui: 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --cs-font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  --cs-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: 56px 48px;
  padding-inline: 20px;
  background:
    radial-gradient(70% 55% at 12% 8%, rgba(255, 255, 255, 0.85) 0%, transparent 60%),
    linear-gradient(180deg, var(--cs-sky) 0%, color-mix(in srgb, var(--cs-sky) 45%, var(--cs-bg)) 46%, var(--cs-bg) 100%);
  color: var(--cs-ink);
  font-family: var(--cs-font-ui);
  border-radius: 32px;
}

.glowA,
.glowB,
.grain {
  position: absolute;
  pointer-events: none;
  z-index: -1;
}

.glowA {
  inset-block-start: -14%;
  inset-inline-end: -10%;
  inline-size: 70%;
  aspect-ratio: 1.8;
  border-radius: 50%;
  background: radial-gradient(closest-side, #fff 0%, rgba(255, 255, 255, 0.7) 45%, transparent 100%);
  filter: blur(36px);
  opacity: 0.95;
  animation: drift 22s ease-in-out infinite alternate;
}

.glowB {
  inset-block-end: -24%;
  inset-inline-start: 10%;
  inline-size: 60%;
  aspect-ratio: 1.6;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--cs-accent) 22%, transparent) 0%, transparent 100%);
  filter: blur(56px);
  opacity: 0.7;
  animation: drift 28s ease-in-out -9s infinite alternate-reverse;
}

.grain {
  inset: 0;
  background-image: var(--cs-noise);
  mix-blend-mode: soft-light;
  opacity: 0.45;
}

.inner {
  display: grid;
  gap: 36px;
  max-inline-size: 1080px;
  margin-inline: auto;
}

.meta {
  order: 2;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  column-gap: 20px;
  row-gap: 14px;
}

.eyebrow {
  grid-column: 1 / -1;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--cs-font-mono);
  font-size: 14px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--cs-muted);
}

.eyebrow::before {
  content: '';
  inline-size: 28px;
  block-size: 1px;
  background: var(--cs-accent);
  flex: none;
}

.counter {
  display: flex;
  align-items: baseline;
  font-family: var(--cs-font-quote);
  font-variant-numeric: tabular-nums lining-nums;
  line-height: 0.82;
  overflow: hidden;
  padding-block: 0.06em;
}

.numeral {
  display: inline-block;
  font-size: 76px;
  font-weight: 400;
  letter-spacing: -0.06em;
  color: var(--cs-ink);
}

.numeralIn {
  animation: rise 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.total {
  margin-inline-start: 6px;
  font-size: 22px;
  letter-spacing: -0.02em;
  color: var(--cs-accent);
  font-style: italic;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.hint {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 14px;
  color: var(--cs-muted);
}

.navButton,
.playButton {
  position: relative;
  display: grid;
  place-items: center;
  inline-size: 48px;
  block-size: 48px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.5);
  color: var(--cs-ink);
  cursor: pointer;
  backdrop-filter: blur(10px);
  box-shadow: inset 0 1px 0 #fff, 0 6px 16px -8px rgba(var(--cs-shadow), 0.35);
  transition: background-color 220ms ease, border-color 220ms ease, transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.navButton:hover,
.playButton:hover {
  background: rgba(255, 255, 255, 0.92);
  border-color: #fff;
}

.navButton:active,
.playButton:active {
  transform: scale(0.92);
}

.navButton:focus-visible,
.playButton:focus-visible,
.stage:focus-visible {
  outline: 2px solid var(--cs-accent);
  outline-offset: 4px;
}

.playButton {
  border-color: transparent;
}

.ring {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  transform: rotate(-90deg);
}

.ringTrack,
.ringFill {
  fill: none;
  stroke-width: 1.5;
}

.ringTrack {
  stroke: rgba(18, 28, 56, 0.12);
}

.ringFill {
  stroke: var(--cs-accent);
  stroke-linecap: round;
}

.stage {
  order: 1;
  position: relative;
  inline-size: 100%;
  max-inline-size: 580px;
  margin-inline: auto;
  padding-block-start: 84px;
  padding-block-end: 20px;
  perspective: 1400px;
  touch-action: pan-y;
  border-radius: 28px;
  outline: none;
}

.deck {
  position: relative;
  display: grid;
  transform-origin: 50% 70%;
  will-change: transform;
}

.floor {
  position: absolute;
  inset-inline: 8%;
  inset-block-end: -26px;
  block-size: 56px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(var(--cs-shadow), 0.32), transparent);
  filter: blur(10px);
  pointer-events: none;
}

.card {
  --card-ink: var(--cs-ink);
  --card-muted: var(--cs-muted);
  --card-rule: rgba(18, 28, 56, 0.1);
  --lift: calc(1 - var(--depth, 0) * 0.3);
  --mx: 50%;
  --my: 30%;

  grid-area: 1 / 1;
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-block-size: 340px;
  padding: 28px 28px 26px;
  border-radius: 28px;
  color: var(--card-ink);
  transform-origin: 50% 90%;
  will-change: transform;
  user-select: none;
  -webkit-user-select: none;
  cursor: grab;
  transition: opacity 360ms ease;
  overflow: hidden;
}

.card:active {
  cursor: grabbing;
}

.card::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--cs-noise);
  mix-blend-mode: soft-light;
  opacity: 0.35;
  pointer-events: none;
}

.card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(60% 50% at var(--mx) var(--my), rgba(255, 255, 255, 0.7), transparent 70%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 400ms ease;
}

.front::after {
  opacity: 1;
}

.shade {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: linear-gradient(180deg, #d6e3f3, #b4c7e2);
  opacity: calc(var(--depth, 0) * 0.3);
  pointer-events: none;
  transition: opacity 420ms ease;
}

.glass {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 34%),
    linear-gradient(160deg, rgba(250, 252, 255, 0.82) 0%, rgba(232, 240, 250, 0.64) 100%);
  border: 1px solid rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  box-shadow:
    inset 0 1px 0 #fff,
    inset 0 -1px 0 rgba(var(--cs-shadow), 0.08),
    0 1px 2px rgba(var(--cs-shadow), 0.1),
    0 14px 28px -14px rgba(var(--cs-shadow), calc(0.34 * var(--lift))),
    0 44px 80px -36px rgba(var(--cs-shadow), calc(0.42 * var(--lift)));
}

.paper {
  background: radial-gradient(120% 80% at 20% 0%, #ffffff 0%, #f6f6f3 55%, #ecebe6 100%);
  border: 1px solid #fff;
  box-shadow:
    inset 0 1px 0 #fff,
    inset 0 -2px 6px rgba(var(--cs-shadow), 0.05),
    0 1px 2px rgba(var(--cs-shadow), 0.12),
    0 14px 28px -14px rgba(var(--cs-shadow), calc(0.3 * var(--lift))),
    0 44px 80px -36px rgba(var(--cs-shadow), calc(0.38 * var(--lift)));
}

.solid {
  --card-ink: #f3f6fc;
  --card-muted: rgba(243, 246, 252, 0.66);
  --card-rule: rgba(255, 255, 255, 0.14);

  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 30%),
    linear-gradient(160deg, color-mix(in srgb, var(--cs-accent) 32%, #16224a) 0%, #101a38 100%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.28),
    0 1px 2px rgba(var(--cs-shadow), 0.2),
    0 14px 28px -14px rgba(var(--cs-shadow), calc(0.45 * var(--lift))),
    0 44px 80px -36px rgba(var(--cs-shadow), calc(0.5 * var(--lift)));
}

.cardTop,
.quote,
.person {
  position: relative;
  z-index: 1;
  opacity: max(0, 1 - var(--depth, 0) * 0.65);
  transition: opacity 420ms ease;
}

.cardTop {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.quoteMark {
  display: block;
  font-family: var(--cs-font-quote);
  font-size: 88px;
  line-height: 1;
  margin-block: -14px -36px;
  color: var(--cs-accent);
  text-shadow: 0 6px 18px color-mix(in srgb, var(--cs-accent) 30%, transparent);
}

.cardIndex {
  font-family: var(--cs-font-mono);
  font-size: 14px;
  letter-spacing: 0.12em;
  color: var(--card-muted);
  font-variant-numeric: tabular-nums;
}

.quote {
  flex: 1;
  margin: 0;
  font-family: var(--cs-font-quote);
  font-size: 23px;
  line-height: 1.34;
  letter-spacing: -0.012em;
  text-wrap: pretty;
  overflow-wrap: break-word;
}

.quoteLong {
  font-size: 18px;
  line-height: 1.45;
}

.person {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-block-start: 18px;
  border-block-start: 1px solid var(--card-rule);
  min-inline-size: 0;
}

.photo,
.monogram {
  flex: none;
  inline-size: 48px;
  block-size: 48px;
  border-radius: 50%;
  box-shadow:
    0 0 0 2px #fff,
    0 0 0 4px color-mix(in srgb, var(--cs-accent) 70%, transparent),
    0 8px 18px -6px rgba(var(--cs-shadow), 0.4);
}

.photo {
  object-fit: cover;
  pointer-events: none;
}

.monogram {
  display: grid;
  place-items: center;
  background: var(--card-ink);
  color: var(--cs-bg);
  font-size: 15px;
  font-weight: 650;
  letter-spacing: 0.04em;
}

.personText {
  display: grid;
  gap: 2px;
  min-inline-size: 0;
}

.name {
  font-size: 16px;
  font-weight: 650;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.role {
  font-size: 14px;
  color: var(--card-muted);
  overflow-wrap: anywhere;
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

@container (max-width: 420px) {
  .meta {
    column-gap: 12px;
  }

  .controls {
    gap: 8px;
  }
}

@container (min-width: 900px) {
  .inner {
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
    align-items: center;
    gap: 72px;
  }

  .meta {
    order: 1;
    grid-template-columns: 1fr;
    row-gap: 28px;
  }

  .stage {
    order: 2;
    margin-inline: 0 auto;
    padding-block-start: 124px;
  }

  .numeral {
    font-size: 184px;
  }

  .total {
    font-size: 36px;
    margin-inline-start: 10px;
  }

  .controls {
    justify-content: flex-start;
  }

  .card {
    min-block-size: 380px;
    padding: 36px 36px 30px;
  }

  .quote {
    font-size: 27px;
  }

  .quoteLong {
    font-size: 20px;
  }
}

@keyframes rise {
  from {
    transform: translateY(70%);
    opacity: 0;
    filter: blur(6px);
  }
  to {
    transform: none;
    opacity: 1;
    filter: none;
  }
}

@keyframes drift {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(-12%, 10%, 0) scale(1.15);
  }
}

@media (prefers-reduced-motion: reduce) {
  .glowA,
  .glowB {
    animation: none;
  }

  .numeralIn {
    animation: fade 400ms ease both;
  }

  .navButton,
  .playButton {
    transition: background-color 220ms ease, border-color 220ms ease;
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
`;export{n as default};
