const n=`@property --wcm-dot-color {
  syntax: '<color>';
  inherits: true;
  initial-value: #46536b;
}

@property --wcm-arc-color {
  syntax: '<color>';
  inherits: true;
  initial-value: #46f59c;
}

@font-face {
  font-family: 'Wix Madefor Display';
  src: url('./fonts/WixMadeforDisplay-Regular.ttf') format('truetype');
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: 'Wix Madefor Display';
  src: url('./fonts/WixMadeforDisplay-Bold.ttf') format('truetype');
  font-weight: 700;
  font-display: swap;
}

.frame {
  container: wcm / inline-size;
  inline-size: 100%;
}

.root {
  --wcm-font: 'Wix Madefor Display', 'Avenir Next', 'Segoe UI', 'Helvetica Neue', system-ui, sans-serif;
  --wcm-mono: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
  --wcm-play: paused;
  --wcm-motion-display: block;
  --wcm-vignette: inset 0 0 110px 26px rgba(0, 3, 8, 0.55);

  position: relative;
  isolation: isolate;
  overflow: hidden;
  inline-size: 100%;
  aspect-ratio: 2.05 / 1;
  min-block-size: 308px;
  border-radius: 22px;
  background-color: var(--wcm-bg);
  background-image:
    radial-gradient(85% 62% at 40% 14%, var(--wcm-surface-hi) 0%, transparent 72%),
    linear-gradient(180deg, transparent 58%, var(--wcm-floor) 100%);
  border: 1px solid var(--wcm-frame);
  box-shadow: var(--wcm-shadow);
  color: var(--wcm-ink);
  font-family: var(--wcm-font);
  -webkit-tap-highlight-color: transparent;
}

.root ::selection {
  background: color-mix(in srgb, var(--wcm-arc-color) 30%, transparent);
}

.themeDark {
  --wcm-bg: #04070d;
  --wcm-surface-hi: rgba(70, 245, 156, 0.05);
  --wcm-floor: #01030a;
  --wcm-frame: rgba(140, 255, 190, 0.1);
  --wcm-shadow: inset 0 1px 0 rgba(190, 255, 220, 0.06), 0 46px 90px -52px rgba(0, 4, 10, 0.92);
  --wcm-dot-color: #46536b;
  --wcm-arc-color: #46f59c;
  --wcm-pulse-color: color-mix(in srgb, var(--wcm-arc-color) 14%, #ffffff);
  --wcm-ink: #ecf4ef;
  --wcm-ink-muted: rgba(199, 216, 206, 0.74);
  --wcm-data: rgba(151, 235, 192, 0.82);
  --wcm-chip-bg: rgba(6, 12, 18, 0.92);
  --wcm-chip-border: rgba(140, 255, 190, 0.14);
  --wcm-chip-active: color-mix(in srgb, var(--wcm-arc-color) 42%, transparent);
  --wcm-additive: 1;
  --wcm-grain-opacity: 0.06;
  --wcm-scan-opacity: 0.035;
}

.themeLight {
  --wcm-bg: #e8edf1;
  --wcm-surface-hi: #f9fcfd;
  --wcm-floor: #d5dde4;
  --wcm-frame: rgba(23, 42, 62, 0.12);
  --wcm-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 46px 90px -56px rgba(18, 40, 62, 0.42);
  --wcm-dot-color: #33415c;
  --wcm-arc-color: #0b7d4f;
  --wcm-pulse-color: color-mix(in srgb, var(--wcm-arc-color) 58%, #001c10);
  --wcm-ink: #16243a;
  --wcm-ink-muted: rgba(22, 36, 58, 0.7);
  --wcm-data: #2e5a7a;
  --wcm-chip-bg: rgba(249, 252, 253, 0.94);
  --wcm-chip-border: rgba(23, 42, 62, 0.14);
  --wcm-chip-active: color-mix(in srgb, var(--wcm-arc-color) 45%, transparent);
  --wcm-additive: 0;
  --wcm-grain-opacity: 0.05;
  --wcm-scan-opacity: 0;
  --wcm-vignette: inset 0 0 90px 18px rgba(30, 52, 74, 0.14);
}

.revealed {
  --wcm-play: running;
}

.offscreen {
  --wcm-play: paused;
}

.paused {
  --wcm-motion-display: none;
}

.focusMode {
  --wcm-vignette: inset 0 0 130px 42px rgba(0, 3, 8, 0.64);
}

.canvas {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  pointer-events: none;
}

.vignette {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  box-shadow: var(--wcm-vignette);
  transition: box-shadow 0.6s ease;
}

.marker {
  --reticle-o: 0;
  --core-scale: 1;

  position: absolute;
  z-index: 2;
  inline-size: 44px;
  block-size: 44px;
  margin-block-start: -22px;
  margin-inline-start: -22px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  outline: none;
  opacity: 0;
  animation: wcmMarkerIn 0.5s ease var(--pop, 0s) backwards;
  animation-play-state: var(--wcm-play);
  transition: opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.marker:hover,
.marker:focus-visible {
  --reticle-o: 1;
}

.marker:focus-visible {
  box-shadow: 0 0 0 2px var(--wcm-chip-active), 0 0 0 4px var(--wcm-chip-bg);
}

.markerLinked {
  z-index: 3;
}

.markerActive {
  z-index: 4;
  --reticle-o: 1;
  --reticle-turn: rotate(0deg) scale(1);
  --core-scale: 1.55;
}

.markerDim {
  opacity: 0.34;
}

.reticle {
  --reticle-c: color-mix(in srgb, var(--wcm-arc-color) 62%, #ffffff 38%);

  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  inline-size: 30px;
  block-size: 30px;
  margin-block-start: -15px;
  margin-inline-start: -15px;
  pointer-events: none;
  background-image:
    linear-gradient(var(--reticle-c), var(--reticle-c)),
    linear-gradient(var(--reticle-c), var(--reticle-c)),
    linear-gradient(var(--reticle-c), var(--reticle-c)),
    linear-gradient(var(--reticle-c), var(--reticle-c)),
    linear-gradient(var(--reticle-c), var(--reticle-c)),
    linear-gradient(var(--reticle-c), var(--reticle-c)),
    linear-gradient(var(--reticle-c), var(--reticle-c)),
    linear-gradient(var(--reticle-c), var(--reticle-c));
  background-repeat: no-repeat;
  background-size:
    34% 1.5px, 1.5px 34%,
    34% 1.5px, 1.5px 34%,
    34% 1.5px, 1.5px 34%,
    34% 1.5px, 1.5px 34%;
  background-position:
    0 0, 0 0,
    100% 0, 100% 0,
    0 100%, 0 100%,
    100% 100%, 100% 100%;
  opacity: var(--reticle-o);
  transform: var(--reticle-turn, rotate(45deg) scale(0.72));
  transition:
    opacity 0.24s ease,
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.core {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  inline-size: 9px;
  block-size: 9px;
  margin-block-start: -4.5px;
  margin-inline-start: -4.5px;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(circle at 35% 30%, var(--wcm-pulse-color), var(--wcm-arc-color) 62%);
  box-shadow:
    0 0 0 2.5px var(--wcm-bg),
    0 0 0 3.5px var(--wcm-chip-active),
    0 0 16px 3px color-mix(in srgb, var(--wcm-arc-color) 55%, transparent);
  transform: scale(var(--core-scale));
  transition: transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: wcmCoreIn 0.66s cubic-bezier(0.16, 1, 0.3, 1) calc(var(--pop, 0s) + 0.06s) backwards;
  animation-play-state: var(--wcm-play);
}

.ring {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  inline-size: 9px;
  block-size: 9px;
  margin-block-start: -4.5px;
  margin-inline-start: -4.5px;
  display: var(--wcm-motion-display);
  border: 1.5px solid var(--wcm-arc-color);
  border-radius: 50%;
  pointer-events: none;
  opacity: 0;
  animation: wcmRing 3.4s cubic-bezier(0.2, 0.6, 0.3, 1) calc(var(--i, 0) * -0.43s) infinite;
  animation-play-state: var(--wcm-play);
}

.label {
  position: absolute;
  inset-block-start: calc(50% + var(--ly, -14px));
  inset-inline-start: calc(50% + var(--lx, 12px));
  inline-size: max-content;
  max-inline-size: 22ch;
  padding-block: 5px;
  padding-inline: 9px 10px;
  border: 1px solid var(--wcm-chip-border);
  border-radius: 8px;
  background: var(--wcm-chip-bg);
  color: var(--wcm-ink);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.005em;
  text-align: start;
  overflow-wrap: anywhere;
  pointer-events: none;
  box-shadow: 0 10px 24px -16px rgba(0, 0, 0, 0.55);
  opacity: 0;
  transform: scale(0.9);
  transition:
    opacity 0.28s ease,
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.28s ease;
}

.labelShown {
  opacity: 1;
  transform: none;
}

.labelActive {
  opacity: 1;
  transform: none;
  max-inline-size: 30ch;
  border-color: var(--wcm-chip-active);
}

.hud {
  position: absolute;
  inset-block-end: 14px;
  inset-inline-start: 14px;
  z-index: 5;
  inline-size: min(320px, calc(100% - 88px));
  padding: 14px 16px 13px;
  border: 1px solid var(--wcm-chip-border);
  border-radius: 12px;
  background: var(--wcm-chip-bg);
  box-shadow: 0 20px 44px -22px rgba(0, 0, 0, 0.62);
  pointer-events: none;
  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity 0.3s ease,
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.hudShown {
  opacity: 1;
  transform: none;
}

.hudBody {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hudName {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.012em;
  color: var(--wcm-ink);
  animation: wcmHudIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.hudCoords {
  margin: 0;
  font-family: var(--wcm-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.05em;
  line-height: 1.4;
  color: var(--wcm-data);
  font-variant-numeric: tabular-nums;
  animation: wcmHudIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) 40ms both;
}

.hudRoutes {
  margin: 9px 0 0;
  padding: 9px 0 0;
  border-block-start: 1px solid var(--wcm-chip-border);
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hudRoute {
  display: flex;
  align-items: baseline;
  gap: 10px;
  animation: wcmHudIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) calc(80ms + var(--row, 0) * 45ms) both;
}

.hudRouteName {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.005em;
  color: var(--wcm-ink);
}

.hudRouteKm {
  margin-inline-start: auto;
  font-family: var(--wcm-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.03em;
  line-height: 1.3;
  white-space: nowrap;
  color: var(--wcm-data);
  font-variant-numeric: tabular-nums;
}

.playToggle {
  position: absolute;
  inset-block-end: 14px;
  inset-inline-end: 14px;
  z-index: 5;
  display: grid;
  place-items: center;
  inline-size: 44px;
  block-size: 44px;
  padding: 0;
  border: 1px solid var(--wcm-chip-border);
  border-radius: 50%;
  background: var(--wcm-chip-bg);
  color: var(--wcm-ink);
  cursor: pointer;
  opacity: 0.6;
  transition:
    opacity 0.25s ease,
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    border-color 0.25s ease;
}

.playToggle:hover {
  opacity: 1;
  border-color: var(--wcm-chip-active);
}

.playToggle:active {
  transform: scale(0.92);
}

.playToggle:focus-visible {
  opacity: 1;
  outline: 2px solid var(--wcm-arc-color);
  outline-offset: 3px;
}

.playIcon {
  inline-size: 18px;
  block-size: 18px;
}

.grain {
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.5) 0 1px, transparent 1px 3px),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: var(--wcm-grain-opacity);
  mix-blend-mode: overlay;
}

@container wcm (max-width: 560px) {
  .root {
    aspect-ratio: 0.92;
    min-block-size: 340px;
    border-radius: 16px;
  }

  .playToggle {
    inset-block-end: auto;
    inset-block-start: 10px;
    inset-inline-end: 10px;
  }

  .hud {
    inset-block-end: 10px;
    inset-inline-start: 10px;
    inline-size: calc(100% - 20px);
    padding: 12px 14px 11px;
  }

  .hudName {
    font-size: 15px;
  }

  .hudRouteName {
    font-size: 12.5px;
  }

  .label {
    max-inline-size: 18ch;
    font-size: 12.5px;
    padding-block: 4px;
    padding-inline: 8px 9px;
  }

  .labelActive {
    max-inline-size: 22ch;
  }
}

@container wcm (min-width: 1100px) {
  .root {
    border-radius: 26px;
  }
}

@keyframes wcmMarkerIn {
  from {
    opacity: 0;
  }
}

@keyframes wcmCoreIn {
  from {
    transform: scale(0);
  }
}

@keyframes wcmRing {
  0% {
    opacity: 0.6;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(4.4);
  }
}

@keyframes wcmHudIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .marker,
  .core {
    animation: none;
    opacity: 1;
  }

  .ring {
    display: none;
  }

  .reticle {
    transition: none;
  }

  .core {
    transition: none;
  }

  .label,
  .hud,
  .vignette {
    transition-duration: 0.01ms;
  }

  .hudName,
  .hudCoords,
  .hudRoute {
    animation: none;
  }
}
`;export{n as default};
