const n=`.root {
  --trt-ground: #f7f8f5;
  --trt-surface: #ffffff;
  --trt-ink: #1d3a2b;
  --trt-muted: #4f6458;
  --trt-accent: #2c6a47;
  --trt-hairline: rgba(29, 58, 43, 0.14);
  --trt-tint: rgba(44, 106, 71, 0.07);
  --trt-honey: #e2b878;
  --trt-walnut: #8a5a34;
  --trt-latewood: #6b3f22;
  --trt-bark: #4a2e1c;
  --trt-bark-edge: #2e1b10;
  --trt-font: Seravek, 'Gill Sans Nova', 'Segoe UI', Ubuntu, Calibri, 'Source Sans 3', system-ui, sans-serif;

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: 40px;
  padding-inline: 20px;
  border-radius: 24px;
  border: 1px solid var(--trt-hairline);
  background: var(--trt-ground);
  color: var(--trt-ink);
  font-family: var(--trt-font);
  -webkit-font-smoothing: antialiased;
}

.root::selection,
.year::selection,
.title::selection,
.note::selection,
.rowYear::selection,
.rowTitle::selection,
.stampLabel::selection,
.stampCaption::selection {
  background: color-mix(in srgb, var(--trt-accent) 22%, transparent);
  color: var(--trt-ink);
}

.walnut {
  --trt-honey: #c08a55;
  --trt-walnut: #5b3720;
  --trt-latewood: #3f2414;
  --trt-bark: #33200f;
  --trt-bark-edge: #1f130a;
}

.ash {
  --trt-honey: #efd9b2;
  --trt-walnut: #b88f62;
  --trt-latewood: #8e6743;
  --trt-bark: #6a5442;
  --trt-bark-edge: #45352a;
}

.inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 28px;
  max-inline-size: 1120px;
  margin-inline: auto;
}

.discCol {
  display: grid;
  justify-items: center;
  gap: 12px;
  min-inline-size: 0;
}

.disc {
  position: relative;
  inline-size: min(100%, 320px);
  aspect-ratio: 1;
  border-radius: 50%;
  outline: none;
}

.disc:focus-visible {
  outline: 2px solid var(--trt-accent);
  outline-offset: 6px;
}

.svg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
}

.shadow {
  fill: rgba(28, 36, 26, 0.3);
}

.edge {
  fill: var(--trt-bark-edge);
}

.bark {
  fill: var(--trt-bark);
  stroke: var(--trt-bark-edge);
  stroke-width: 1.5;
}

.cambium {
  fill: color-mix(in srgb, var(--trt-honey) 55%, #fff6e4);
}

.band {
  fill: color-mix(in srgb, var(--trt-walnut) var(--heart), var(--trt-honey));
  transform-origin: 240px 240px;
}

.pith {
  fill: color-mix(in srgb, var(--trt-walnut) 80%, var(--trt-bark));
}

.ray {
  stroke: #fff3dc;
  stroke-width: 0.8;
  stroke-linecap: round;
  mix-blend-mode: soft-light;
}

.growth {
  fill: none;
  stroke: var(--trt-latewood);
  stroke-width: 0.55;
  opacity: 0.32;
}

.line {
  fill: none;
  stroke: var(--trt-latewood);
  stroke-linejoin: round;
  opacity: 0.82;
}

.lineActive {
  stroke: var(--trt-bark-edge);
  opacity: 1;
}

.fiber {
  fill: #fff;
  mix-blend-mode: multiply;
  opacity: 0.55;
  pointer-events: none;
}

.check {
  fill: var(--trt-bark-edge);
  opacity: 0.7;
}

.light {
  pointer-events: none;
}

.hit {
  fill: transparent;
  pointer-events: all;
  cursor: pointer;
}

.pin {
  fill: var(--trt-surface);
  stroke: var(--trt-ink);
  stroke-width: 2;
  pointer-events: none;
  transition: cy 520ms cubic-bezier(0.34, 1.45, 0.5, 1);
}

.stamp {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 1px;
  inline-size: 21%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: var(--trt-surface);
  box-shadow:
    0 0 0 1px var(--trt-hairline),
    0 4px 12px -2px rgba(20, 30, 22, 0.28);
  pointer-events: none;
  text-align: center;
  overflow: hidden;
}

.stampCaption {
  font-size: 9px;
  font-weight: 500;
  line-height: 1.1;
  color: var(--trt-muted);
}

.stampLabel {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  max-inline-size: 86%;
  overflow: hidden;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: var(--trt-ink);
  overflow-wrap: anywhere;
}

.tag {
  position: absolute;
  inset-inline-start: 50%;
  display: none;
  align-items: baseline;
  gap: 8px;
  max-inline-size: 72%;
  padding-block: 7px;
  padding-inline: 12px;
  transform: translate(-50%, calc(-100% - 12px));
  border: 1px solid var(--trt-hairline);
  border-radius: 10px;
  background: var(--trt-surface);
  box-shadow: 0 8px 20px -10px rgba(20, 30, 22, 0.35);
  pointer-events: none;
  white-space: nowrap;
  transition: inset-block-start 520ms cubic-bezier(0.34, 1.45, 0.5, 1);
}

.tagYear {
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums lining-nums;
  color: var(--trt-accent);
}

.tagTitle {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  color: var(--trt-ink);
}

.story {
  display: grid;
  align-content: start;
  gap: 28px;
  min-inline-size: 0;
}

.feature {
  display: grid;
  gap: 10px;
}

.year {
  margin: 0;
  font-size: clamp(56px, 18cqi, 96px);
  font-weight: 600;
  line-height: 0.9;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums lining-nums;
  color: var(--trt-ink);
  overflow-wrap: anywhere;
}

.title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.015em;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.note {
  margin: 0;
  max-inline-size: 46ch;
  font-size: 17px;
  line-height: 1.55;
  color: var(--trt-muted);
  text-wrap: pretty;
  overflow-wrap: anywhere;
}

.list {
  display: grid;
  margin-block: 0;
  margin-inline: -10px;
  padding: 0;
  list-style: none;
  border-block-start: 1px solid var(--trt-hairline);
  scrollbar-color: color-mix(in srgb, var(--trt-ink) 28%, transparent) transparent;
}

.item {
  border-block-end: 1px solid var(--trt-hairline);
}

.row {
  display: grid;
  grid-template-columns: 4em minmax(0, 1fr);
  align-items: baseline;
  gap: 12px;
  inline-size: 100%;
  min-block-size: 44px;
  padding-block: 11px;
  padding-inline: 10px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--trt-ink);
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition:
    background-color 180ms ease-out,
    color 180ms ease-out;
}

.row:hover {
  background: var(--trt-tint);
}

.row:focus-visible {
  outline: 2px solid var(--trt-accent);
  outline-offset: -2px;
}

.rowActive {
  background: color-mix(in srgb, var(--trt-accent) 11%, transparent);
}

.rowYear {
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums lining-nums;
  color: var(--trt-accent);
  overflow-wrap: anywhere;
}

.rowTitle {
  font-size: 16px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

@container (min-width: 560px) {
  .disc {
    inline-size: min(100%, 420px);
  }

  .tag {
    display: inline-flex;
  }

  .stamp {
    inline-size: 17%;
  }

  .stampCaption {
    font-size: 11px;
  }

  .stampLabel {
    font-size: 14px;
  }
}

@container (min-width: 820px) {
  .root {
    padding-block: 64px;
    padding-inline: 56px;
  }

  .inner {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
    align-items: center;
    gap: 56px;
  }

  .disc {
    inline-size: min(100%, 540px);
  }

  .list {
    max-block-size: 372px;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  .title {
    font-size: 28px;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .band {
    animation: grow 900ms cubic-bezier(0.22, 1, 0.36, 1) calc(var(--i) * var(--stagger)) both paused;
  }

  .line,
  .growth {
    stroke-dasharray: 1 1;
    animation: draw 1100ms cubic-bezier(0.65, 0, 0.35, 1) calc(var(--i) * var(--stagger) + 120ms) both paused;
  }

  .light {
    animation: breathe 7s ease-in-out infinite alternate paused;
  }

  .play .band,
  .play .line,
  .play .growth,
  .play .light {
    animation-play-state: running;
  }

  .yearIn {
    animation: rise 520ms cubic-bezier(0.22, 1, 0.36, 1);
  }
}

@keyframes grow {
  from {
    opacity: 0;
    transform: scale(0.9);
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

@keyframes breathe {
  from {
    opacity: 0.75;
  }
  to {
    opacity: 1;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
}
`;export{n as default};
