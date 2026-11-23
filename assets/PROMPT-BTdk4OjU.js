const n=`Create a custom element called "Elastic Choice". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: group heading, options (label, description, price), selected option, primary color (pink), secondary color (blue). Add other settings if they help.

\`\`\`tsx
import { useEffect, useId, useState } from 'react';
import type { CSSProperties } from 'react';
import styles from './Component.module.css';

export interface ElasticChoiceOption {
  label: string;
  description?: string;
  price?: string;
  value?: string;
}

export interface ElasticChoiceProps {
  groupLabel?: string;
  options?: ElasticChoiceOption[];
  value?: string;
  primaryColor?: string;
  secondaryColor?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export const defaultOptions: ElasticChoiceOption[] = [
  { label: 'Starter', description: 'One site, essential tools, community support.', price: '$9/mo' },
  { label: 'Studio', description: 'Custom domain, client proofing and priority support.', price: '$24/mo' },
  { label: 'Agency', description: 'Unlimited sites, team seats and white-label reports.', price: '$69/mo' },
];

const RING_LEN = 2 * Math.PI * 16;

const keyOf = (o: ElasticChoiceOption) => o.value ?? o.label;

export default function ElasticChoice({
  groupLabel = 'Choose your plan',
  options = defaultOptions,
  value,
  primaryColor = '#fc51c9',
  secondaryColor = '#05ddfa',
  onValueChange,
  className,
}: ElasticChoiceProps) {
  const uid = useId();
  const [selected, setSelected] = useState(value ?? (options[0] ? keyOf(options[0]) : ''));

  useEffect(() => {
    if (value !== undefined) setSelected(value);
  }, [value]);

  const choose = (v: string) => {
    setSelected(v);
    onValueChange?.(v);
  };

  const rootStyle = { '--ec-pink': primaryColor, '--ec-blue': secondaryColor } as CSSProperties;

  return (
    <fieldset className={\`\${styles.root} \${className ?? ''}\`} style={rootStyle}>
      <legend className={styles.legend}>{groupLabel}</legend>
      <div className={styles.list}>
        {options.map((o, i) => {
          const v = keyOf(o);
          const checked = v === selected;
          const id = \`\${uid}-\${i}\`;
          const fid = \`ec\${id.replace(/[^a-zA-Z0-9]/g, '')}\`;
          return (
            <label key={id} htmlFor={id} className={checked ? styles.rowOn : styles.row}>
              <input
                id={id}
                className={styles.input}
                type="radio"
                name={\`\${uid}-group\`}
                value={v}
                checked={checked}
                onChange={() => choose(v)}
              />
              <span className={styles.disc}>
                <svg className={styles.defs} width="0" height="0" aria-hidden="true"><defs><filter id={fid} x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="2" dy="2" stdDeviation="6" floodColor="var(--ec-pink)" floodOpacity="1" /></filter></defs></svg>
                <svg className={styles.mark} viewBox="0 0 60 60" aria-hidden="true">
                  <circle className={styles.track} cx="30" cy="30" r="15" transform="rotate(90 30 30)" />
                  <g className={styles.glowed} filter={\`url(#\${fid})\`}>
                    <circle className={checked ? styles.pinkOn : styles.pink} cx="30" cy="30" r="16" transform="rotate(90 30 30)" strokeDasharray={RING_LEN} strokeDashoffset={checked ? 0 : RING_LEN} />
                  </g>
                  <circle className={checked ? styles.blueOn : styles.blue} cx="30" cy="27" r="16" transform="rotate(90 30 30)" strokeDasharray={RING_LEN} strokeDashoffset={checked ? 0 : RING_LEN} />
                </svg>
              </span>
              <span className={styles.text}>
                <span className={styles.label}>{o.label}</span>
                {o.price ? <span className={styles.price}>{o.price}</span> : null}
                {o.description ? <span className={styles.desc}>{o.description}</span> : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
\`\`\`

\`\`\`css
.root {
  --ec-pink: #fc51c9;
  --ec-blue: #05ddfa;
  --ec-bg: #070b1a;
  --ec-ink: #f4f6ff;
  --ec-muted: rgba(244, 246, 255, 0.68);
  --ec-font: 'Inter Tight', 'Inter', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
  --ec-elastic: linear(0, 1.918 3%, 2.653 6%, 2.129 8%, 1.072 11%, 0.308 14%, 0.217 17%, 0.641 19%, 1.151 22%, 1.405 25%, 1.326 28%, 1.071 31%, 0.853 33%, 0.796 36%, 0.884 39%, 1.016 42%, 1.096 44%, 1.091 47%, 1.031 50%, 0.971 53%, 0.948 56%, 0.965 58%, 0.998 61%, 1.022 64%, 1.024 67%, 1.011 69%, 0.995 72%, 0.987 75%, 0.99 78%, 0.998 81%, 1.005 83%, 1.006 86%, 1.004 89%, 1 92%, 0.997 94%, 0.997 97%, 1);

  box-sizing: border-box;
  inline-size: 100%;
  min-inline-size: 0;
  margin: 0;
  padding: clamp(28px, 7cqi, 72px);
  border: 0;
  border-radius: 28px;
  background: radial-gradient(120% 90% at 50% 0%, #101a3d 0%, var(--ec-bg) 62%);
  font-family: var(--ec-font);
  color: var(--ec-ink);
  container-type: inline-size;
}

.legend {
  float: inline-start;
  inline-size: 100%;
  padding: 0;
  margin-block-end: clamp(28px, 6cqi, 56px);
  text-align: center;
  font-size: clamp(1.5rem, 5cqi, 2.5rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.list {
  clear: both;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: clamp(24px, 4cqi, 48px) 20px;
}

.row,
.rowOn {
  position: relative;
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 10px;
  text-align: center;
  cursor: pointer;
}

.input {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  opacity: 0;
}

.disc {
  position: relative;
  display: grid;
  place-items: center;
  inline-size: min(100%, 176px);
  aspect-ratio: 1;
  border-radius: 50%;
  isolation: isolate;
}

.input:focus-visible + .disc {
  outline: 2px solid #fff;
  outline-offset: 6px;
}

.defs {
  position: absolute;
}

.mark {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
}

.track {
  fill: none;
  stroke: rgba(244, 246, 255, 0.2);
  stroke-width: 4;
}

.pink,
.pinkOn,
.blue,
.blueOn {
  fill: none;
  stroke-width: 7;
  stroke-linecap: round;
    transition: stroke-dashoffset 0.3s ease-out;
}

.pink,
.pinkOn {
  stroke: var(--ec-pink);
}

.blue,
.blueOn {
  stroke: var(--ec-blue);
  mix-blend-mode: color-dodge;
}

.pinkOn,
.blueOn {
  transition: stroke-dashoffset 2.5s var(--ec-elastic);
}

.blueOn {
  transition-delay: 0.07s;
}

.price {
  font-size: 0.9375rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--ec-ink);
}

.label {
  font-size: 1.125rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
  color: var(--ec-muted);
  transition: color 0.3s ease-out, text-shadow 0.3s ease-out;
}

.rowOn .label {
  font-weight: 650;
  color: #fff;
  text-shadow: var(--ec-pink) 0 0 12px;
  transition: color 1s ease-out, text-shadow 1s ease-out;
}

.desc {
  max-inline-size: 22ch;
  font-size: 0.875rem;
  line-height: 1.4;
  color: var(--ec-muted);
  overflow-wrap: anywhere;
}

.text {
  display: grid;
  gap: 4px;
  justify-items: center;
  min-inline-size: 0;
}

@media (prefers-reduced-motion: reduce) {
  .pink,
  .pinkOn,
  .blue,
  .blueOn,
  .label,
  .rowOn .label {
    transition: none;
  }
}
\`\`\`
`;export{n as default};
