import { useId } from 'react';
import type { CSSProperties } from 'react';
import styles from './Component.module.css';

export interface StarterProps {
  title?: string;
  text?: string;
  buttonLabel?: string;
  buttonLink?: string;
  accentColor?: string;
  className?: string;
}

export default function Starter({
  title = 'Make something people remember',
  text = 'A calm card with one clear message and one clear action. Replace it with your idea.',
  buttonLabel = 'Get started',
  buttonLink = '#',
  accentColor = '#3858e9',
  className,
}: StarterProps) {
  const titleId = useId();
  const style = { '--st-accent': accentColor } as CSSProperties;
  return (
    <section aria-labelledby={titleId} className={[styles.root, className].filter(Boolean).join(' ')} style={style}>
      <div className={styles.card}>
        <span className={styles.glow} aria-hidden="true" />
        <h3 id={titleId} className={styles.title}>{title}</h3>
        {text && <p className={styles.text}>{text}</p>}
        {buttonLabel && (
          <a className={styles.button} href={buttonLink || '#'}>
            {buttonLabel}
          </a>
        )}
      </div>
    </section>
  );
}
