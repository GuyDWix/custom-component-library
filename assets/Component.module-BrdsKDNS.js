const n=`.root {
  --ldm-ink: #1f2a44;
  --ldm-accent: #a8392b;
  --ldm-paper: #f6efdf;
  --ldm-muted: color-mix(in srgb, var(--ldm-ink) 76%, var(--ldm-paper));
  --ldm-dot: color-mix(in srgb, var(--ldm-ink) 42%, var(--ldm-paper));
  --ldm-font-serif: 'Cormorant Garamond', 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif;
  --ldm-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.27  0 0 0 0 0.15  0 0 0 .8 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: 40px;
  padding-inline: 20px;
  border-radius: 4px;
  background:
    radial-gradient(90% 60% at 22% 0%, color-mix(in srgb, #fff 55%, transparent) 0%, transparent 70%),
    repeating-linear-gradient(0deg, color-mix(in srgb, var(--ldm-ink) 2.5%, transparent) 0 1px, transparent 1px 5px),
    var(--ldm-paper);
  color: var(--ldm-ink);
  font-family: var(--ldm-font-serif);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #fff 70%, transparent),
    0 1px 2px color-mix(in srgb, var(--ldm-ink) 14%, transparent),
    0 28px 56px -30px color-mix(in srgb, var(--ldm-ink) 45%, transparent);
}

.grain,
.vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.grain {
  z-index: 2;
  background-image: var(--ldm-noise);
  opacity: 0.2;
  mix-blend-mode: multiply;
}

.vignette {
  z-index: -1;
  background: radial-gradient(120% 90% at 50% 40%, transparent 55%, color-mix(in srgb, #8a6a3a 14%, transparent) 100%);
}

.sheet {
  position: relative;
  max-inline-size: 640px;
  margin-inline: auto;
  padding-block: 28px 18px;
  border-block: 3px double color-mix(in srgb, var(--ldm-ink) 62%, transparent);
}

.header {
  display: grid;
  justify-items: center;
  gap: 6px;
  margin-block-end: 22px;
  text-align: center;
}

.eyebrow {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  font-variant-caps: all-small-caps;
  letter-spacing: 0.24em;
  color: var(--ldm-accent);
  overflow-wrap: anywhere;
}

.heading {
  margin: 0;
  font-size: clamp(36px, 9cqi, 54px);
  font-weight: 500;
  font-style: italic;
  line-height: 1;
  letter-spacing: -0.015em;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.fleuron {
  position: relative;
  display: block;
  inline-size: 132px;
  block-size: 9px;
  margin-block-start: 8px;
  background:
    linear-gradient(90deg, transparent, var(--ldm-dot) 70%, transparent 70%) left center / 50% 1px no-repeat,
    linear-gradient(270deg, transparent, var(--ldm-dot) 70%, transparent 70%) right center / 50% 1px no-repeat;
}

.fleuron::before {
  content: '';
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  inline-size: 7px;
  block-size: 7px;
  background: var(--ldm-accent);
  transform: translate(-50%, -50%) rotate(45deg);
}

.list {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  --ldm-lit: 0;
  --ldm-open: 0;

  position: relative;
}

.item::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset-block: 2px;
  inset-inline: -14px;
  border-radius: 10px;
  background:
    radial-gradient(80% 120% at 0% 0%, color-mix(in srgb, #fff 60%, transparent), transparent 70%),
    color-mix(in srgb, var(--ldm-accent) 7%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ldm-accent) 12%, transparent);
  opacity: var(--ldm-open);
  transition: opacity 360ms cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

.item:hover,
.item:focus-within {
  --ldm-lit: 1;
}

.itemOpen {
  --ldm-lit: 1;
  --ldm-open: 1;
}

.row,
.rowStatic {
  box-sizing: border-box;
  display: flex;
  align-items: baseline;
  align-items: last baseline;
  inline-size: 100%;
  min-block-size: 48px;
  padding-block: 12px 8px;
  padding-inline: 0;
  margin: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
}

.row {
  cursor: pointer;
  border-radius: 6px;
  -webkit-tap-highlight-color: transparent;
}

.row:focus-visible {
  outline: 2px solid var(--ldm-accent);
  outline-offset: 4px;
}

.name {
  flex: 0 1 auto;
  min-inline-size: 0;
  font-size: 18.5px;
  font-weight: 600;
  font-variant-caps: small-caps;
  letter-spacing: 0.04em;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.leader {
  position: relative;
  flex: 1 1 24px;
  min-inline-size: 24px;
  block-size: 4px;
  margin-inline: 8px;
  background: radial-gradient(circle, var(--ldm-dot) 1px, transparent 1.4px) right bottom / 8px 4px repeat-x;
}

.leaderFill {
  position: absolute;
  inset: -1px 0;
  background: radial-gradient(circle, var(--ldm-accent) 1.6px, transparent 2px) right center / 8px 6px repeat-x;
  clip-path: inset(0 calc((1 - var(--ldm-lit)) * 100%) 0 0);
  transition: clip-path 680ms cubic-bezier(0.65, 0, 0.35, 1);
}

.price {
  flex: none;
  max-inline-size: 45%;
  font-size: 18.5px;
  font-weight: 600;
  font-variant-numeric: lining-nums tabular-nums;
  letter-spacing: 0.01em;
  line-height: 1.2;
  text-align: end;
  overflow-wrap: anywhere;
  color: color-mix(in srgb, var(--ldm-accent) calc(var(--ldm-lit) * 100%), var(--ldm-ink));
  transition: color 420ms cubic-bezier(0.22, 1, 0.36, 1) 160ms;
}

.panel {
  --ldm-reveal: 0;

  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 480ms cubic-bezier(0.22, 1, 0.36, 1);
}

.panelOpen {
  --ldm-reveal: 1;

  grid-template-rows: 1fr;
}

.panelInner {
  min-block-size: 0;
  overflow: hidden;
}

.description {
  max-inline-size: 48ch;
  margin: 0;
  padding-block: 0 16px;
  font-size: 18px;
  font-style: italic;
  line-height: 1.45;
  color: var(--ldm-muted);
  overflow-wrap: anywhere;
  opacity: var(--ldm-reveal);
  transform: translateY(calc((1 - var(--ldm-reveal)) * -6px));
  transition:
    opacity 360ms cubic-bezier(0.22, 1, 0.36, 1) 90ms,
    transform 480ms cubic-bezier(0.22, 1, 0.36, 1);
}

@container (min-width: 440px) {
  .name,
  .price {
    font-size: 21px;
    letter-spacing: 0.05em;
  }

  .leader {
    margin-inline: 10px;
  }
}

@container (min-width: 720px) {
  .sheet {
    padding-block: 40px 26px;
  }

  .header {
    margin-block-end: 30px;
  }

  .name,
  .price {
    font-size: 23px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .item::before,
  .leaderFill,
  .price,
  .panel,
  .description {
    transition: none;
  }
}
`;export{n as default};
