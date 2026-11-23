const n=`@font-face {
  font-family: 'Inter Tight';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('./fonts/inter-tight-latin-700-normal.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Inter Tight';
  font-style: normal;
  font-weight: 800;
  font-display: swap;
  src: url('./fonts/inter-tight-latin-800-normal.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

.root {
  --ss-accent: #ff6b4a;
  --ss-panel: #1c4a2d;
  --ss-bg: #0a120d;
  --ss-ink: #f4f7f1;
  --ss-ink-2: color-mix(in srgb, var(--ss-ink) 78%, var(--ss-panel));
  --ss-ink-3: color-mix(in srgb, var(--ss-ink) 62%, var(--ss-panel));
  --ss-line: color-mix(in srgb, var(--ss-ink) 13%, transparent);
  --ss-font-display: 'Inter Tight', 'SF Pro Display', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --ss-font-ui: 'Inter', 'SF Pro Text', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --ss-roll: cubic-bezier(0.2, 1.18, 0.32, 1);
  --ss-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ss-grain: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>");
  --ss-stage: 440px;

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  border-radius: 28px;
  background:
    radial-gradient(90% 70% at 20% 100%, color-mix(in srgb, var(--ss-panel) 55%, transparent) 0%, transparent 70%),
    var(--ss-bg);
  color: var(--ss-ink);
  font-family: var(--ss-font-ui);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.2),
    0 40px 80px -36px rgba(6, 18, 10, 0.55);
}

.root ::selection {
  background: var(--ss-accent);
  color: #fff;
}

.frame {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

.media {
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  block-size: var(--ss-stage);
  overflow: hidden;
  background: color-mix(in srgb, var(--ss-panel) 40%, var(--ss-bg));
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  object-position: 50% 40%;
  transform-origin: 30% 60%;
  filter: brightness(0.84) saturate(1.08);
}

.photo[data-beat='a'] {
  animation: pushA 900ms var(--ss-out);
}

.photo[data-beat='b'] {
  animation: pushB 900ms var(--ss-out);
}

.scrim {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(0deg, var(--ss-bg) 0%, color-mix(in srgb, var(--ss-bg) 86%, transparent) 30%, color-mix(in srgb, var(--ss-bg) 40%, transparent) 58%, transparent 78%),
    linear-gradient(90deg, color-mix(in srgb, var(--ss-bg) 55%, transparent) 0%, transparent 60%),
    radial-gradient(130% 90% at 50% 40%, transparent 55%, color-mix(in srgb, var(--ss-bg) 45%, transparent) 100%);
}

.hero {
  position: relative;
  display: grid;
  align-content: end;
  gap: 6px;
  min-block-size: var(--ss-stage);
  min-inline-size: 0;
  box-sizing: border-box;
  padding-block: 28px 22px;
  padding-inline: 22px;
}

.heroLabel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.servingsLabel {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.005em;
  color: var(--ss-ink);
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.45);
  overflow-wrap: anywhere;
}

.factor {
  padding-block: 4px;
  padding-inline: 10px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  color: var(--ss-ink-2);
  background: color-mix(in srgb, var(--ss-ink) 12%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ss-ink) 16%, transparent);
  transition:
    background-color 240ms ease,
    color 240ms ease,
    box-shadow 240ms ease;
}

.factor[data-on] {
  color: #fff;
  background: var(--ss-accent);
  box-shadow: 0 6px 18px -8px var(--ss-accent);
}

.factor[data-beat='a'] {
  animation: popA 520ms var(--ss-roll) 90ms;
}

.factor[data-beat='b'] {
  animation: popB 520ms var(--ss-roll) 90ms;
}

.count {
  justify-self: start;
  margin-inline-start: calc(-22px - 0.05em);
  border-radius: 18px;
  font-family: var(--ss-font-display);
  font-size: clamp(180px, 56cqi, 280px);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--ss-ink);
  outline: none;
  cursor: default;
}

.count:focus-visible {
  box-shadow: 0 0 0 3px var(--ss-bg), 0 0 0 5px var(--ss-accent);
}

.numeral {
  --sd: 1;
  display: block;
  text-shadow: 0 0.02em 0.12em rgba(0, 0, 0, 0.35);
}

.numeral[data-beat='a'] {
  animation: smearA 620ms var(--ss-out);
}

.numeral[data-beat='b'] {
  animation: smearB 620ms var(--ss-out);
}

.controls {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 48px;
  align-items: center;
  gap: 10px;
  margin-block-start: 10px;
}

.btn {
  display: grid;
  place-items: center;
  inline-size: 48px;
  block-size: 48px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ss-ink) 10%, transparent);
  color: var(--ss-ink);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ss-ink) 22%, transparent);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition:
    transform 420ms var(--ss-roll),
    background-color 160ms ease,
    opacity 160ms ease;
}

.btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ss-ink) 18%, transparent);
}

.btn:active:not(:disabled) {
  transform: scale(0.9);
  transition-duration: 90ms, 160ms, 160ms;
}

.btn:disabled {
  cursor: default;
  opacity: 0.3;
}

.dial {
  position: relative;
  block-size: 56px;
  overflow: hidden;
  direction: ltr;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
  mask-image: linear-gradient(90deg, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%);
}

.dial[data-dragging] {
  cursor: grabbing;
}

.track {
  position: absolute;
  inset-block: 0;
  left: 50%;
  transform: translateX(calc(var(--pos) * var(--ss-gap) * -1));
  transition: transform 640ms var(--ss-roll);
}

.dial[data-dragging] .track {
  transition: none;
}

.tick,
.tickMajor {
  position: absolute;
  inset-block-start: 6px;
  left: calc(var(--n) * var(--ss-gap));
  inline-size: 1px;
  block-size: 12px;
  margin-left: -0.5px;
  background: color-mix(in srgb, var(--ss-ink) 32%, transparent);
  transition: background-color 200ms ease, transform 420ms var(--ss-roll);
  transform-origin: 50% 0;
}

.tickMajor {
  inline-size: 2px;
  margin-left: -1px;
  block-size: 20px;
  border-radius: 1px;
  background: color-mix(in srgb, var(--ss-ink) 62%, transparent);
}

.tick[data-on],
.tickMajor[data-on] {
  background: var(--ss-ink);
  transform: scaleY(1.35);
}

.tickNum {
  position: absolute;
  inset-block-start: 26px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ss-ink-3);
}

.tickMajor[data-on] .tickNum {
  color: var(--ss-ink);
  transform: translateX(-50%) scaleY(0.74);
}

.needle {
  position: absolute;
  inset-block-start: 0;
  left: 50%;
  inline-size: 3px;
  block-size: 30px;
  margin-left: -1.5px;
  border-radius: 2px;
  background: var(--ss-accent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--ss-accent) 70%, transparent);
}

.panel {
  position: relative;
  isolation: isolate;
  display: grid;
  align-content: start;
  gap: 28px;
  min-inline-size: 0;
  margin: 0;
  padding-block: 28px 30px;
  padding-inline: 22px;
  overflow: clip;
  background:
    radial-gradient(120% 60% at 100% 0%, color-mix(in srgb, var(--ss-panel) 82%, #c9f2b8) 0%, transparent 62%),
    linear-gradient(180deg, var(--ss-panel) 0%, color-mix(in srgb, var(--ss-panel) 78%, #000) 100%);
  box-shadow: none;
}

.grain {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: var(--ss-grain);
  opacity: 0.07;
  mix-blend-mode: overlay;
}

.head {
  display: grid;
  gap: 10px;
}

.title {
  margin: 0;
  font-family: var(--ss-font-display);
  font-size: clamp(28px, 8cqi, 34px);
  font-weight: 700;
  line-height: 1.04;
  letter-spacing: -0.03em;
  text-wrap: balance;
  overflow-wrap: break-word;
}

.subtitle {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--ss-ink-2);
  overflow-wrap: anywhere;
}

.section {
  display: grid;
  gap: 6px;
}

.sectionLabel {
  margin: 0;
  padding-block-end: 8px;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.005em;
  color: var(--ss-ink);
  border-block-end: 1px solid color-mix(in srgb, var(--ss-ink) 26%, transparent);
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: grid;
  grid-template-columns: 2.9em 4.8em minmax(0, 1fr);
  align-items: baseline;
  gap: 0 10px;
  padding-block: 11px;
  border-block-end: 1px solid var(--ss-line);
}

.row:last-child {
  border-block-end: 0;
}

.qty {
  position: relative;
  justify-self: end;
  display: inline-flex;
  align-items: baseline;
}

.amount {
  font-family: var(--ss-font-display);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ss-ink);
}

.amount .strip {
  transition-delay: calc(180ms + min(var(--i, 0), 12) * 34ms);
}

.sweep {
  position: absolute;
  inset-inline: 0;
  inset-block-end: -5px;
  block-size: 2px;
  border-radius: 2px;
  background: var(--ss-accent);
  transform-origin: 0 50%;
  transform: scaleX(0);
  opacity: 0;
  animation: sweep 900ms var(--ss-out) calc(200ms + min(var(--i, 0), 12) * 34ms);
}

.unit,
.unitOnly {
  font-size: 14px;
  font-weight: 500;
  color: var(--ss-ink-3);
  overflow-wrap: anywhere;
}

.unitOnly {
  font-style: italic;
}

.name {
  grid-column: 3;
  min-inline-size: 0;
  font-size: 16px;
  line-height: 1.4;
  color: var(--ss-ink);
  overflow-wrap: anywhere;
}

.method {
  display: grid;
  gap: 12px;
}

.methodText {
  margin: 0;
  max-inline-size: 62ch;
  font-size: 15px;
  line-height: 1.6;
  color: var(--ss-ink-2);
  overflow-wrap: break-word;
}

.roll {
  display: inline-flex;
  align-items: baseline;
  font-variant-numeric: tabular-nums lining-nums;
  line-height: 1;
}

.digit {
  display: inline-block;
  block-size: 1.08em;
  overflow: hidden;
  animation: enter 460ms var(--ss-roll) both;
}

.bigRoll {
  letter-spacing: 0;
}

.bigRoll .digit {
  margin-inline-end: -0.05em;
  block-size: 0.86em;
  mask-image: linear-gradient(180deg, transparent 0%, #000 7%, #000 95%, transparent 100%);
}

.strip {
  display: flex;
  flex-direction: column;
  transform: translateY(calc(var(--d) * -1.08em));
  transition: transform 720ms var(--ss-roll);
}

.bigRoll .strip {
  transform: translateY(calc(var(--d) * -0.86em));
  transition-delay: 40ms;
}

.cell {
  display: block;
  block-size: 1.08em;
  line-height: 1.08em;
  text-align: center;
}

.bigRoll .cell {
  block-size: 0.86em;
  line-height: 0.86em;
}

.glyph {
  display: inline-block;
  line-height: 1.08em;
  animation: enter 460ms var(--ss-roll) both;
}

.srOnly {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

@container (min-width: 760px) {
  .frame {
    grid-template-columns: minmax(0, 1fr);
  }

  .media {
    block-size: 580px;
  }

  .hero {
    min-block-size: 580px;
    padding-block: 40px 36px;
    padding-inline: 44px 32px;
  }

  .count {
    margin-inline-start: calc(-44px - 0.05em);
    font-size: min(400px, 46cqi);
  }

  .controls {
    max-inline-size: 560px;
  }

  .tick {
    block-size: 14px;
  }

  .tickMajor {
    block-size: 24px;
  }

  .tickNum {
    inset-block-start: 30px;
  }

  .row {
    grid-template-columns: 3.4em 5.6em minmax(0, 1fr);
    gap: 0 14px;
  }

  .servingsLabel {
    font-size: 18px;
  }

  .panel {
    margin: 0;
    padding-block: 40px 44px;
    padding-inline: 44px;
    gap: 32px;
  }

  .title {
    font-size: clamp(34px, 3.6cqi, 42px);
  }
}

@keyframes pushA {
  35% {
    transform: scale(1.03);
    filter: brightness(1.08);
  }
}

@keyframes pushB {
  35% {
    transform: scale(1.03);
    filter: brightness(1.08);
  }
}

@keyframes smearA {
  18% {
    filter: blur(1.2px);
    text-shadow:
      0 calc(var(--sd) * 0.07em) 0.02em color-mix(in srgb, var(--ss-ink) 45%, transparent),
      0 calc(var(--sd) * 0.16em) 0.05em color-mix(in srgb, var(--ss-ink) 22%, transparent),
      0 calc(var(--sd) * 0.27em) 0.08em color-mix(in srgb, var(--ss-ink) 9%, transparent);
    transform: scaleY(1.04);
  }
}

@keyframes smearB {
  18% {
    filter: blur(1.2px);
    text-shadow:
      0 calc(var(--sd) * 0.07em) 0.02em color-mix(in srgb, var(--ss-ink) 45%, transparent),
      0 calc(var(--sd) * 0.16em) 0.05em color-mix(in srgb, var(--ss-ink) 22%, transparent),
      0 calc(var(--sd) * 0.27em) 0.08em color-mix(in srgb, var(--ss-ink) 9%, transparent);
    transform: scaleY(1.04);
  }
}

@keyframes popA {
  40% {
    transform: scale(1.14);
  }
}

@keyframes popB {
  40% {
    transform: scale(1.14);
  }
}

@keyframes sweep {
  0% {
    opacity: 1;
    transform: scaleX(0);
  }
  45% {
    opacity: 1;
    transform: scaleX(1);
  }
  100% {
    opacity: 0;
    transform: scaleX(1);
  }
}

@keyframes enter {
  from {
    opacity: 0;
    transform: translateY(0.35em);
  }
}

@media (prefers-reduced-motion: reduce) {
  .strip,
  .track,
  .btn,
  .tick,
  .tickMajor {
    transition: none;
  }

  .digit,
  .glyph,
  .photo,
  .numeral,
  .factor,
  .sweep {
    animation: none;
  }
}
`;export{n as default};
