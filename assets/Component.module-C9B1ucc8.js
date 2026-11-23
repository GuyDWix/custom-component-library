const n=`@font-face {
  font-family: 'Bricolage Grotesque';
  font-style: normal;
  font-weight: 500 700;
  font-display: swap;
  src: url('./fonts/bricolage-latin.woff2') format('woff2');
}

@font-face {
  font-family: 'DM Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./fonts/dmmono-latin.woff2') format('woff2');
}

.root {
  --ss-beam: #ff5b2e;
  --ss-stage: #121410;
  --ss-sheet: #e8ebdf;
  --ss-ink: #161a14;
  --ss-mute: #4d5448;
  --ss-card: 280px;
  --ss-font-display: 'Bricolage Grotesque', 'Helvetica Neue', Arial, system-ui, sans-serif;
  --ss-font-mono: 'DM Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;

  position: relative;
  box-sizing: border-box;
  inline-size: 100%;
  overflow: clip;
  border-radius: 24px;
  background:
    radial-gradient(70% 90% at 50% 50%, color-mix(in srgb, var(--ss-beam) 9%, transparent), transparent 70%),
    var(--ss-stage);
  padding-block: 96px;
}

.viewport {
  position: relative;
  block-size: calc(var(--ss-card) * 1.3);
  touch-action: pan-y;
  cursor: grab;
  user-select: none;
  outline: none;
}

.viewport:active {
  cursor: grabbing;
}

.viewport:focus-visible {
  outline: 2px solid var(--ss-beam);
  outline-offset: 6px;
  border-radius: 12px;
}

.card {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: var(--ss-card);
  will-change: transform;
  container-type: inline-size;
  --cut-l: 0%;
  --cut-r: 0%;
  border-radius: 14px;
  outline: none;
}

.card:focus-visible {
  outline: 2px solid var(--ss-beam);
  outline-offset: 3px;
}

.photo,
.twin {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  overflow: hidden;
}

.photo {
  background: #262a22;
  color: #c9cdbf;
  font: 400 12px/1.3 var(--ss-font-mono);
  clip-path: inset(0 0 0 var(--cut-r));
  box-shadow: 0 18px 40px rgb(0 0 0 / 0.45);
}

.twin {
  box-sizing: border-box;
  padding: 22px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--ss-ink);
  background-color: var(--ss-sheet);
  background-image:
    linear-gradient(color-mix(in srgb, var(--ss-ink) 9%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--ss-ink) 9%, transparent) 1px, transparent 1px);
  background-size: 20px 20px;
  clip-path: inset(0 calc(100% - var(--cut-l)) 0 0);
}

.flip .photo {
  clip-path: inset(0 calc(100% - var(--cut-l)) 0 0);
}

.flip .twin {
  clip-path: inset(0 0 0 var(--cut-r));
}

.img {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  pointer-events: none;
}

.tag {
  position: absolute;
  inset-block-start: 14px;
  inset-inline-start: 14px;
  font: 400 12px/1 var(--ss-font-mono);
  letter-spacing: 0.08em;
  color: #fff;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgb(18 20 16 / 0.62);
}

.corner {
  position: absolute;
  inset-block-start: 12px;
  inset-inline-end: 12px;
  inline-size: 22px;
  block-size: 22px;
  border-block-start: 2px solid var(--ss-ink);
  border-inline-end: 2px solid var(--ss-ink);
}

.twinIdx {
  margin: 0;
  font: 400 12px/1 var(--ss-font-mono);
  letter-spacing: 0.12em;
  color: var(--ss-mute);
}

.twinTitle {
  margin: 0 0 6px;
  padding-inline-end: 28px;
  font: 600 clamp(20px, 7.5cqi, 26px) / 1.08 var(--ss-font-display);
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.lines {
  margin: auto 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0;
  border-block-start: 2px solid var(--ss-ink);
}

.line {
  display: flex;
  gap: 12px;
  align-items: baseline;
  padding-block: 8px;
  border-block-end: 1px solid color-mix(in srgb, var(--ss-ink) 28%, transparent);
  font: 400 13px/1.3 var(--ss-font-mono);
  overflow-wrap: anywhere;
}

.lineNo {
  flex: none;
  color: color-mix(in srgb, var(--ss-beam) 70%, var(--ss-ink));
  font-size: 12px;
}

.beamCanvas {
  position: absolute;
  inset-block: -96px;
  inset-inline: 0;
  inline-size: 100%;
  block-size: calc(100% + 192px);
  z-index: 5;
  pointer-events: none;
}

.sweep::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 14px;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ss-beam) 45%, transparent), transparent);
  animation: sweep 0.7s ease-out forwards;
}

.pause {
  position: absolute;
  inset-block-end: 12px;
  inset-inline-end: 14px;
  inline-size: 32px;
  block-size: 32px;
  display: grid;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 0.28);
  border-radius: 50%;
  background: transparent;
  color: #fff;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s ease-out, border-color 0.2s ease-out;
}

.pause:hover {
  opacity: 1;
  border-color: rgb(255 255 255 / 0.6);
}

.pause:focus-visible {
  outline: 2px solid var(--ss-beam);
  outline-offset: 2px;
  opacity: 1;
}

.bars {
  inline-size: 10px;
  block-size: 11px;
  border-inline: 3px solid currentcolor;
}

.play {
  inline-size: 0;
  block-size: 0;
  margin-inline-start: 2px;
  border-block: 6px solid transparent;
  border-inline-start: 10px solid currentcolor;
}

/* Reduced motion: static laser, no particles or auto-scroll; twin on hover/focus */
.reduced .twin {
  clip-path: inset(0 0 0 100%);
  transition: clip-path 0.2s ease-out;
}

.reduced .photo {
  background: #262a22;
  color: #c9cdbf;
  font: 400 12px/1.3 var(--ss-font-mono);
  clip-path: none;
}

.reduced .card:hover .twin,
.reduced .card:focus-visible .twin {
  clip-path: inset(0);
}

@keyframes sweep {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  45% {
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sweep::after {
    animation: none;
  }
}
`;export{n as default};
