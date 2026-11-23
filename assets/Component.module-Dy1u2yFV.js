const n=`/* SignOffSignature — fountain-pen letter on laid paper. */

.root {
  --sos-paper: #f7efdf;
  --sos-paper-deep: #efe4cc;
  --sos-edge: rgba(74, 60, 24, 0.14);
  --sos-note-ink: #38332b;
  --sos-ink: #2c2a63;
  --sos-font-note: Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', serif;

  position: relative;
  display: block;
  inline-size: 100%;
  max-inline-size: 660px;
  margin-inline: auto;
  padding: clamp(26px, 5.5%, 46px);
  box-sizing: border-box;
  border-radius: 3px;
  border: 1px solid var(--sos-edge);
  background:
    radial-gradient(130% 90% at 18% 0%, rgba(255, 253, 244, 0.55), rgba(255, 253, 244, 0) 62%),
    repeating-linear-gradient(180deg, rgba(74, 60, 24, 0.028) 0 1px, rgba(0, 0, 0, 0) 1px 7px),
    repeating-linear-gradient(90deg, rgba(74, 60, 24, 0.034) 0 1px, rgba(0, 0, 0, 0) 1px 29px),
    linear-gradient(160deg, var(--sos-paper) 0%, var(--sos-paper-deep) 100%);
  box-shadow:
    0 1px 2px rgba(46, 36, 14, 0.1),
    0 26px 56px -30px rgba(46, 36, 14, 0.4);
  transform: rotate(-0.35deg);
  overflow: hidden;
  color: var(--sos-note-ink);
}

/* Paper grain, kept very quiet. */
.root::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.05;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
}

.root[data-tone='ivory'] {
  --sos-paper: #fbf7ec;
  --sos-paper-deep: #f3ecda;
  --sos-edge: rgba(74, 60, 24, 0.1);
}

.root[data-tone='white'] {
  --sos-paper: #fdfcf8;
  --sos-paper-deep: #f6f3ea;
  --sos-edge: rgba(74, 60, 24, 0.09);
}

.root::selection {
  background: var(--sos-ink);
  color: var(--sos-paper);
}

.note {
  margin: 0;
  font-family: var(--sos-font-note);
  font-style: italic;
  font-size: 21px;
  line-height: 1.68;
  letter-spacing: 0.004em;
  white-space: pre-line;
  text-wrap: pretty;
  color: var(--sos-note-ink);
  animation: sos-note-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both;
}

.sigWrap {
  display: flex;
  justify-content: flex-end;
  margin-block-start: 30px;
  inline-size: 100%;
}

.sig {
  display: block;
  flex: none;
}

@keyframes sos-note-in {
  from {
    opacity: 0;
    transform: translateY(7px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .note {
    animation: none;
  }
}
`;export{n as default};
