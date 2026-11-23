const n=`@property --ifb-p {
  syntax: '<percentage>';
  inherits: true;
  initial-value: 100%;
}

.root {
  --ifb-highlight: #d23a1b;
  --ifb-surface: #f4f3ef;
  --ifb-card: #ffffff;
  --ifb-ink: #16181d;
  --ifb-muted: #555b66;
  --ifb-line: rgba(22, 24, 29, 0.14);
  --ifb-shadow: 22, 24, 29;
  --ifb-font: 'Avenir Next', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --ifb-play: running;

  position: relative;
  isolation: isolate;
  overflow: clip;
  container-type: inline-size;
  box-sizing: border-box;
  inline-size: 100%;
  padding-block: 40px;
  padding-inline: 20px;
  border-radius: 20px;
  background: var(--ifb-surface);
  color: var(--ifb-ink);
  font-family: var(--ifb-font);
  box-shadow: inset 0 0 0 1px var(--ifb-line);
}

.paused {
  --ifb-play: paused;
}

.inner {
  --tagw: 0px;
  display: grid;
  gap: 32px;
  max-inline-size: 1080px;
  margin-inline: auto;
}

.header {
  display: grid;
  gap: 24px;
  align-items: end;
}

.titles {
  display: grid;
  gap: 16px;
  min-inline-size: 0;
}

.heading {
  margin: 0;
  font-size: 40px;
  font-weight: 750;
  line-height: 1.05;
  letter-spacing: -0.03em;
  text-wrap: balance;
  overflow-wrap: break-word;
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}

.row {
  --h: 60px;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.lead {
  --h: 84px;
}

.rank {
  font-size: 22px;
  font-weight: 750;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--ifb-highlight);
  font-variant-numeric: tabular-nums lining-nums;
}

.rankArmed {
  opacity: 0;
}

.rankPlay {
  animation: rise 700ms cubic-bezier(0.16, 1, 0.3, 1) calc(var(--i) * 110ms) both;
}

.track {
  --lift: 0;
  --zoom: 1;
  position: relative;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  grid-template-rows: minmax(40px, auto) 10px;
  column-gap: 12px;
  row-gap: 10px;
  align-items: center;
  inline-size: 100%;
  min-block-size: 64px;
  margin: 0;
  padding: 10px 12px 10px 10px;
  border: 0;
  border-radius: 14px;
  background: var(--ifb-card);
  box-shadow: 0 0 0 1px var(--ifb-line);
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: box-shadow 200ms ease;
}

.track:hover {
  --lift: 1;
  --zoom: 1.05;
}

.track:focus-visible {
  outline: 3px solid var(--ifb-ink);
  outline-offset: 3px;
}

.trackActive {
  --lift: 1;
  box-shadow: 0 0 0 2px var(--ifb-highlight);
}

.thumb {
  grid-row: 1 / span 2;
  position: relative;
  inline-size: 48px;
  block-size: 48px;
  border-radius: 10px;
  overflow: hidden;
  background: #d9dadd;
}

.photo {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  pointer-events: none;
  transform: scale(var(--zoom));
  transition: transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
}

.stripes {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(115deg, #c9cbd0 0 14px, #dcdde1 14px 28px);
}

.groove,
.fill {
  grid-column: 2 / -1;
  grid-row: 2;
  block-size: 10px;
  border-radius: 999px;
}

.groove {
  inline-size: calc(100% - var(--tagw));
  background: rgba(var(--ifb-shadow), 0.08);
}

.fill {
  position: relative;
  inline-size: calc((100% - var(--tagw)) * var(--fill));
  overflow: hidden;
  background: #c9cbd0;
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

.fillArmed {
  --ifb-p: 0%;
}

.fillPlay {
  animation: grow 1100ms cubic-bezier(0.22, 1, 0.36, 1) calc(var(--i) * 110ms + 100ms) both;
}

.reveal {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 999px;
  clip-path: inset(0 calc(100% - var(--ifb-p)) 0 0 round 999px);
}

.scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(10, 12, 16, 0.12), transparent 70%);
  border-radius: inherit;
}

.edge {
  position: absolute;
  inset-block: 0;
  inset-inline-start: var(--ifb-p);
  inline-size: 2px;
  margin-inline-start: -2px;
  background: #fff;
  box-shadow: 0 0 10px 2px rgba(255, 255, 255, 0.7);
  opacity: 0;
  pointer-events: none;
}

.edgePlay {
  animation: edge 1100ms cubic-bezier(0.22, 1, 0.36, 1) calc(var(--i) * 110ms + 100ms) both;
}

.name {
  grid-column: 2;
  grid-row: 1;
  min-inline-size: 0;
  font-size: 16px;
  font-weight: 650;
  line-height: 1.25;
  letter-spacing: -0.01em;
  overflow-wrap: break-word;
  hyphens: auto;
}

.lateArmed {
  opacity: 0;
}

.namePlay {
  animation: fadeIn 500ms ease-out calc(var(--i) * 110ms + 600ms) backwards;
}

.tag {
  --ty: 0%;
  grid-column: 3;
  grid-row: 1;
  justify-self: end;
  align-self: center;
  transform: translateY(var(--ty));
}

.tagPlay {
  animation: tagIn 600ms cubic-bezier(0.16, 1, 0.3, 1) calc(var(--i) * 110ms + 700ms) backwards;
}

.tagBody {
  position: relative;
  display: grid;
  justify-items: start;
  min-inline-size: 56px;
  padding: 5px 10px 5px 22px;
  background: var(--ifb-ink);
  color: #fff;
  clip-path: polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 0 50%);
}

.tagBody::before {
  content: '';
  position: absolute;
  inset-inline-start: 10px;
  inset-block-start: calc(50% - 3px);
  inline-size: 6px;
  block-size: 6px;
  border-radius: 50%;
  background: var(--ifb-surface);
}

.tagCount {
  font-size: 18px;
  font-weight: 750;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.tagUnit {
  max-inline-size: 56px;
  font-size: 14px;
  line-height: 1.15;
  color: #d4d6db;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

@container (min-width: 560px) {
  .root {
    padding-block: 56px;
    padding-inline: 32px;
  }

  .inner {
    --tagw: 132px;
    gap: 40px;
  }

  .tagUnit {
    max-inline-size: calc(var(--tagw) - 52px);
  }

  .heading {
    font-size: 52px;
  }

  .list {
    gap: 14px;
  }

  .row {
    grid-template-columns: 56px minmax(0, 1fr);
    gap: 16px;
  }

  .rank {
    font-size: 36px;
  }

  .track {
    display: block;
    block-size: var(--h);
    min-block-size: 0;
    padding: 0;
    border-radius: 999px;
    background: transparent;
    box-shadow: none;
  }

  .trackActive {
    box-shadow: none;
  }

  .track:focus-visible {
    outline-offset: 5px;
  }

  .thumb {
    display: none;
  }

  .groove,
  .fill {
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    block-size: auto;
  }

  .groove {
    background: rgba(var(--ifb-shadow), 0.07);
    box-shadow: inset 0 0 0 1px var(--ifb-line);
  }

  .trackActive .groove {
    box-shadow: inset 0 0 0 2px var(--ifb-highlight);
  }

  .scrim {
    background: linear-gradient(90deg, rgba(10, 12, 16, 0.82) 0%, rgba(10, 12, 16, 0.5) 40%, rgba(10, 12, 16, 0) 85%);
  }

  .name {
    font-size: 17px;
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: 26px;
    max-inline-size: calc((100% - var(--tagw)) * var(--fill) - 44px);
    transform: translateY(-50%);
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.5);
  }

  .tag {
    --ty: -50%;
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: calc((100% - var(--tagw)) * var(--fill) + 14px);
  }
}

@container (min-width: 900px) {
  .root {
    padding-inline: 48px;
  }

  .inner {
    --tagw: 150px;
  }

  .heading {
    font-size: 60px;
  }

  .row {
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 20px;
  }

  .lead {
    --h: 100px;
  }

  .rank {
    font-size: 44px;
  }

  .name {
    font-size: 18px;
  }

  .tagCount {
    font-size: 22px;
  }
}

@keyframes grow {
  from {
    --ifb-p: 0%;
  }
  to {
    --ifb-p: 100%;
  }
}

@keyframes edge {
  0% {
    opacity: 0;
  }
  8%,
  70% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(40%);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes tagIn {
  from {
    opacity: 0;
    transform: translate(-12px, var(--ty));
  }
  to {
    opacity: 1;
    transform: translate(0, var(--ty));
  }
}

@keyframes settle {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .photo,
  .fill {
    transition: none;
  }
}
`;export{n as default};
