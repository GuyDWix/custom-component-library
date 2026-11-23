const n=`.root {
  --ac-cream: #faf6ee;
  --ac-surface: #fffdf9;
  --ac-pistachio: #a9c48a;
  --ac-pistachio-soft: #eaf1df;
  --ac-pistachio-ink: #2c3d26;
  --ac-raspberry: #c0285a;
  --ac-raspberry-deep: #a01f4b;
  --ac-raspberry-tint: #fdecf1;
  --ac-ink: #26261f;
  --ac-muted: #6b6a5d;
  --ac-line: rgba(44, 61, 38, 0.14);
  --ac-font-display: 'Fraunces', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
  --ac-font-ui: 'Inter', 'DM Sans', 'Avenir Next', 'Segoe UI', system-ui, sans-serif;
  --ac-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --ac-spring: cubic-bezier(0.25, 1.25, 0.45, 1);

  position: relative;
  isolation: isolate;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: 32px;
  padding-inline: 20px;
  border-radius: 24px;
  background: var(--ac-cream);
  color: var(--ac-ink);
  font-family: var(--ac-font-ui);
  -webkit-font-smoothing: antialiased;
}

.backdrop {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: clip;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px var(--ac-line);
  pointer-events: none;
}

.glowPistachio,
.glowCream,
.grain {
  position: absolute;
  pointer-events: none;
}

.glowPistachio {
  inset-block-start: -40%;
  inset-inline-end: -20%;
  inline-size: 55%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--ac-pistachio) 40%, transparent), transparent);
  filter: blur(40px);
}

.glowCream {
  inset-block-end: -40%;
  inset-inline-start: -20%;
  inline-size: 60%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--ac-raspberry-tint) 80%, transparent), transparent);
  filter: blur(40px);
}

.grain {
  inset: 0;
  background-image: var(--ac-noise);
  opacity: 0.08;
  mix-blend-mode: multiply;
}

.layout {
  display: grid;
  gap: 28px;
}

.picker {
  display: grid;
  align-content: start;
  gap: 22px;
  min-inline-size: 0;
}

.heading {
  margin: 0;
  font-family: var(--ac-font-display);
  font-size: 30px;
  font-weight: 500;
  line-height: 1.05;
  letter-spacing: -0.025em;
  text-wrap: balance;
  overflow-wrap: anywhere;
  color: var(--ac-pistachio-ink);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chipItem {
  display: flex;
  max-inline-size: 100%;
}

.chip,
.chipOn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  max-inline-size: 100%;
  min-block-size: 46px;
  box-sizing: border-box;
  padding-block: 9px;
  padding-inline: 10px 16px;
  border: 1px solid var(--ac-line);
  border-radius: 999px;
  background: var(--ac-surface);
  color: var(--ac-ink);
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: -0.005em;
  text-align: start;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 1px 2px rgba(44, 61, 38, 0.05);
  transition:
    background-color 200ms ease,
    border-color 200ms ease,
    color 200ms ease,
    transform 220ms var(--ac-spring);
}

.chip:hover {
  border-color: color-mix(in srgb, var(--ac-pistachio-ink) 30%, transparent);
  background: color-mix(in srgb, var(--ac-pistachio-soft) 55%, var(--ac-surface));
}

.chipOn {
  border-color: color-mix(in srgb, var(--ac-raspberry) 45%, transparent);
  background: var(--ac-raspberry-tint);
  color: var(--ac-raspberry-deep);
}

.chipOn:hover {
  border-color: var(--ac-raspberry);
}

.chip:active,
.chipOn:active {
  transform: scale(0.97);
  transition-duration: 90ms;
}

.chip:focus-visible,
.chipOn:focus-visible,
.cta:focus-visible {
  outline: 2px solid var(--ac-raspberry);
  outline-offset: 3px;
}

.chipIcon {
  flex: none;
  display: grid;
  place-items: center;
  inline-size: 24px;
  block-size: 24px;
  border-radius: 50%;
  background: var(--ac-pistachio-soft);
  color: var(--ac-pistachio-ink);
  transition:
    background-color 200ms ease,
    color 200ms ease;
}

.chipOn .chipIcon {
  background: var(--ac-raspberry);
  color: #fff;
}

.iconPlus,
.iconCheck {
  grid-area: 1 / 1;
  inline-size: 14px;
  block-size: 14px;
  transition:
    transform 300ms var(--ac-spring),
    opacity 160ms ease;
}

.iconCheck {
  opacity: 0;
  transform: scale(0.5);
}

.chipOn .iconPlus {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
}

.chipOn .iconCheck {
  opacity: 1;
  transform: none;
}

.chipName {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.chipPrice {
  flex: none;
  font-size: 14px;
  font-weight: 450;
  font-variant-numeric: tabular-nums;
  color: var(--ac-muted);
  transition: color 200ms ease;
}

.chipOn .chipPrice {
  color: color-mix(in srgb, var(--ac-raspberry-deep) 75%, transparent);
}

.ghost {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  z-index: 5;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  padding-inline: 16px;
  border-radius: 999px;
  background: var(--ac-raspberry);
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transform-origin: 0 0;
  pointer-events: none;
  will-change: transform, opacity;
}

.tray {
  position: relative;
  display: grid;
  gap: 18px;
  align-self: start;
  min-inline-size: 0;
  padding-block: 22px;
  padding-inline: 22px;
  border: 1px solid var(--ac-line);
  border-radius: 20px;
  background: var(--ac-surface);
  color: var(--ac-ink);
  box-shadow:
    0 1px 2px rgba(44, 61, 38, 0.04),
    0 12px 32px -18px rgba(44, 61, 38, 0.22);
}

.trayHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.badge {
  flex: none;
  display: grid;
  place-items: center;
  min-inline-size: 24px;
  block-size: 24px;
  box-sizing: border-box;
  padding-inline: 7px;
  border-radius: 999px;
  background: var(--ac-pistachio-soft);
  color: var(--ac-pistachio-ink);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.trayTitle {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ac-muted);
  overflow-wrap: anywhere;
}

.rows {
  display: grid;
  gap: 2px;
  margin: 0;
  margin-inline: -12px;
  padding: 0;
  padding-block-end: 4px;
  list-style: none;
}

.row,
.rowBase,
.rowPending {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding-block: 6px;
  padding-inline: 12px;
  border-radius: 8px;
  font-size: 15px;
  line-height: 1.4;
}

.rowBase {
  margin-block-end: 8px;
  padding-block: 12px;
  border-radius: 12px;
  background: var(--ac-pistachio-soft);
  font-weight: 600;
  color: var(--ac-pistachio-ink);
}

.row {
  color: var(--ac-ink);
}

.rowPending {
  visibility: hidden;
}

.rowName {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.rowLeader {
  flex: 1 1 8px;
}

.rowPrice {
  flex: none;
  font-variant-numeric: tabular-nums;
  color: var(--ac-muted);
}

.rowBase .rowPrice {
  color: inherit;
}

.totalRow {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
  padding-block-start: 16px;
  border-block-start: 1px solid var(--ac-line);
}

.totalLabel {
  font-size: 15px;
  font-weight: 500;
  color: var(--ac-muted);
  overflow-wrap: anywhere;
}

.roller {
  display: inline-flex;
  font-family: var(--ac-font-display);
  font-size: 44px;
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.035em;
  font-variant-numeric: tabular-nums lining-nums;
  color: var(--ac-raspberry-deep);
}

.rollStatic {
  display: inline-block;
  white-space: pre;
}

.rollWindow {
  display: inline-block;
  block-size: 1.1em;
  overflow: hidden;
  mask-image: linear-gradient(180deg, transparent 0, #000 18%, #000 82%, transparent 100%);
}

.rollStrip {
  display: flex;
  flex-direction: column;
  transform: translateY(calc(var(--d) * -1.1em));
  transition: transform 760ms cubic-bezier(0.22, 1.3, 0.4, 1);
}

.rollDigit {
  display: block;
  block-size: 1.1em;
  text-align: center;
}

.cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-block-size: 50px;
  box-sizing: border-box;
  padding-block: 12px;
  padding-inline: 20px;
  border: 0;
  border-radius: 14px;
  background: var(--ac-raspberry);
  color: #fff;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.005em;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(120, 20, 60, 0.18);
  transition:
    background-color 200ms ease,
    transform 220ms var(--ac-spring);
}

.cta:hover {
  background: var(--ac-raspberry-deep);
}

.cta:active {
  transform: scale(0.98);
  transition-duration: 90ms;
}

.ctaLabel {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.ctaArrow {
  flex: none;
  transition: transform 240ms var(--ac-spring);
}

.cta:hover .ctaArrow {
  transform: translateX(3px);
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
}

@container (min-width: 760px) {
  .root {
    padding-block: 48px;
    padding-inline: 44px;
  }

  .layout {
    grid-template-columns: minmax(0, 1.4fr) minmax(280px, 1fr);
    gap: 48px;
    align-items: center;
  }

  .heading {
    font-size: 40px;
  }

  .tray {
    padding-block: 26px;
    padding-inline: 26px;
  }
}

@container (min-width: 900px) {
  .heading {
    font-size: 48px;
  }

  .roller {
    font-size: 52px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chip,
  .chipOn,
  .chipIcon,
  .chipPrice,
  .cta,
  .ctaArrow,
  .iconPlus,
  .iconCheck,
  .rollStrip {
    transition: none;
  }

  .chip:active,
  .chipOn:active,
  .cta:active,
  .cta:hover .ctaArrow {
    transform: none;
  }
}
`;export{n as default};
