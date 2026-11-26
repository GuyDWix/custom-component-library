import { useEffect, useId, useState } from 'react';
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


  return (
    <fieldset className={`${styles.root} ${className ?? ''}`}>
      <legend className={styles.legend}>{groupLabel}</legend>
      <div className={styles.list}>
        {options.map((o, i) => {
          const v = keyOf(o);
          const checked = v === selected;
          const id = `${uid}-${i}`;
          const fid = `ec${id.replace(/[^a-zA-Z0-9]/g, '')}`;
          return (
            <label key={id} htmlFor={id} className={checked ? styles.rowOn : styles.row}>
              <input
                id={id}
                className={styles.input}
                type="radio"
                name={`${uid}-group`}
                value={v}
                checked={checked}
                onChange={() => choose(v)}
              />
              <span className={styles.disc}>
                <svg className={styles.defs} width="0" height="0" aria-hidden="true"><defs><filter id={fid} x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="2" dy="2" stdDeviation="6" floodColor="var(--accent)" floodOpacity="1" /></filter></defs></svg>
                <svg className={styles.mark} viewBox="0 0 60 60" aria-hidden="true">
                  <circle className={styles.track} cx="30" cy="30" r="15" transform="rotate(90 30 30)" />
                  <g className={styles.glowed} filter={`url(#${fid})`}>
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
