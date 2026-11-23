const n=`@font-face {
  font-family: "Bricolage Grotesque";
  src: url("./fonts/bricolage-grotesque-latin-var.woff2") format("woff2");
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}

.root {
  --bs-radius: 22px;
  --bs-gap: 14px;
  --bs-ink: #232634;
  --bs-ink-soft: #565b6e;
  --bs-surface: #e7eaf0;
  --bs-wash: #d9dde6;
  --bs-accent: #4a55c9;
  --bs-hi: rgba(255, 255, 255, 0.95);
  --bs-lo: rgba(139, 148, 170, 0.5);
  --bs-font-ui:
    "Bricolage Grotesque", "Helvetica Neue", "Segoe UI", system-ui, sans-serif;

  position: relative;
  isolation: isolate;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: 0;
  padding-inline: 0;
  color: var(--bs-ink);
  font-family: var(--bs-font-ui);
}

.root::selection {
  background: var(--bs-accent);
  color: var(--bs-surface);
}

.inner {
  position: relative;
  max-inline-size: 1160px;
  margin-inline: auto;
}

.deck {
  position: relative;
}

.stage {
  position: relative;
  outline: none;
  touch-action: pan-y;
  transition: height 520ms cubic-bezier(0.22, 1, 0.36, 1);
}

.stage:focus-visible {
  outline: 2px solid var(--bs-accent);
  outline-offset: 8px;
  border-radius: var(--bs-radius);
}

/* soft-UI: tiles are raised from the surface by a paired light/dark shadow; a tile in flight lifts further */
.tile {
  --bs-sx: 0;
  --bs-sy: 0;
  --bs-lf: 0;

  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  container-type: size;
  display: block;
  padding: 0;
  border: 0;
  overflow: clip;
  border-radius: var(--bs-radius);
  background: var(--bs-wash);
  cursor: pointer;
  transform-origin: 50% 50%;
  -webkit-tap-highlight-color: transparent;
  will-change: transform;
  box-shadow:
    -6px -6px 14px var(--bs-hi),
    7px 8px 16px var(--bs-lo),
    0 calc(var(--bs-lf) * 20px) calc(var(--bs-lf) * 34px) calc(var(--bs-lf) * -10px) rgba(35, 38, 52, calc(var(--bs-lf) * 0.3));
}

.tile:focus-visible {
  outline: 2px solid var(--bs-accent);
  outline-offset: 3px;
}

.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  pointer-events: none;
}

.missing {
  display: grid;
  place-items: center;
  inline-size: 100%;
  block-size: 100%;
  background: var(--bs-wash);
  color: var(--bs-ink-soft);
  font-size: 32px;
  font-weight: 600;
  user-select: none;
}

/* one small chip; sized to its tile so it stays proportionate mid-trade */
.chipFeature {
  position: absolute;
  z-index: 1;
  inset-block-end: 12px;
  inset-inline-start: 12px;
  box-sizing: border-box;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  max-inline-size: calc(100% - 24px);
  padding: 0.5em 0.95em;
  border-radius: 999px;
  background: rgba(22, 24, 34, 0.68);
  -webkit-backdrop-filter: blur(14px) saturate(1.5);
  backdrop-filter: blur(14px) saturate(1.5);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
  color: #ffffff;
  font-size: clamp(12px, 2.6cqi, 15px);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.25;
  overflow: hidden;
  overflow-wrap: anywhere;
  animation: chipIn 520ms cubic-bezier(0.22, 1, 0.36, 1) 300ms backwards;
}

.chipDot {
  display: inline-block;
  inline-size: 0.5em;
  block-size: 0.5em;
  margin-inline-end: 0.55em;
  border-radius: 50%;
  background: #b8c0ff;
  vertical-align: 0.08em;
}

/* other tiles stay clean; their caption shows for keyboard users */
.chipQuiet {
  position: absolute;
  z-index: 1;
  inset-block-end: 10px;
  inset-inline-start: 10px;
  box-sizing: border-box;
  max-inline-size: calc(100% - 20px);
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(22, 24, 34, 0.68);
  -webkit-backdrop-filter: blur(14px) saturate(1.5);
  backdrop-filter: blur(14px) saturate(1.5);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
  pointer-events: none;
}

.tile:focus-visible .chipQuiet,
.tile:hover .chipQuiet {
  opacity: 1;
  transition: opacity 200ms ease;
}

/* hover is a quiet affordance only: the photo eases in, nothing moves or reflows */
.photo {
  transition: transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
}

.tile:hover .photo {
  transform: scale(1.04);
}

.tile[data-detail="1"] .chipFeature {
  opacity: 0;
}

/* glass detail panel over the foot of the featured tile */
.panel {
  position: absolute;
  z-index: 5;
  inset-inline-start: calc(var(--bs-fx, 0px) + 12px);
  inset-block-start: calc(var(--bs-fy, 0px) + var(--bs-fh, 0px) - 12px);
  inline-size: calc(var(--bs-fw, 0px) - 24px);
  max-block-size: calc(var(--bs-fh, 0px) - 24px);
  box-sizing: border-box;
  overflow: auto;
  transform: translateY(-100%);
  padding: 16px 18px 16px 18px;
  border-radius: max(calc(var(--bs-radius) - 6px), 6px);
  background: rgba(22, 24, 34, 0.74);
  -webkit-backdrop-filter: blur(18px) saturate(1.5);
  backdrop-filter: blur(18px) saturate(1.5);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 14px 30px -12px rgba(22, 24, 34, 0.5);
  color: #ffffff;
  animation: panelIn 520ms cubic-bezier(0.22, 1, 0.36, 1) 300ms backwards;
}

.panelTitle {
  margin: 0;
  font-size: clamp(15px, 2.4cqi, 20px);
  font-weight: 650;
  letter-spacing: -0.015em;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.panelText {
  margin: 6px 0 0;
  max-inline-size: 52ch;
  font-size: 14px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.9);
  overflow-wrap: anywhere;
}

.panelMeta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.panelMeta li {
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.pause {
  position: absolute;
  inset-block-start: 12px;
  inset-inline-end: 12px;
  z-index: 6;
  display: grid;
  place-items: center;
  inline-size: 40px;
  block-size: 40px;
  padding: 0;
  border-radius: 50%;
  border: 0;
  background: var(--bs-surface);
  color: var(--bs-ink);
  cursor: pointer;
  box-shadow: -3px -3px 8px var(--bs-hi), 4px 4px 10px var(--bs-lo);
  transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 200ms ease;
}

.pause:hover {
  transform: scale(1.06);
}

.pause:active,
.pause[aria-pressed="true"] {
  transform: scale(0.96);
  box-shadow: inset -2px -2px 5px var(--bs-hi), inset 3px 3px 7px var(--bs-lo);
}

.pause:focus-visible {
  outline: 2px solid var(--bs-accent);
  outline-offset: 3px;
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
  stroke-width: 1.6;
}

.ringTrack {
  stroke: rgba(35, 38, 52, 0.14);
}

.ringFill {
  stroke: var(--bs-accent);
  stroke-linecap: round;
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

@container (max-width: 560px) {
  .pause {
    inset-block-start: 8px;
    inset-inline-end: 8px;
    inline-size: 38px;
    block-size: 38px;
  }
}

@keyframes panelIn {
  from {
    opacity: 0;
    translate: 0 10px;
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}

@keyframes chipIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tile,
  .pause,
  .stage {
    transition: none;
  }

  .chipFeature,
  .panel {
    animation: none;
  }

  .photo {
    transition: none;
  }

  .tile:hover .photo {
    transform: none;
  }
}
`;export{n as default};
