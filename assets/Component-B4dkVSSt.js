const e=`import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export interface LeaderDotMenuItem {
  name: string;
  price?: string;
  description?: string;
}

export interface LeaderDotMenuListProps {
  eyebrow?: string;
  heading?: string;
  items?: LeaderDotMenuItem[];
  currencySymbol?: string;
  textColor?: string;
  accentColor?: string;
  paperColor?: string;
  className?: string;
}

export const defaultItems: LeaderDotMenuItem[] = [
  { name: 'Soupe à l’oignon', price: '14', description: 'Slow-caramelised onion broth, toasted country bread, a lid of melted Gruyère.' },
  { name: 'Moules marinières', price: '24', description: 'Rope-grown mussels in white wine, garlic and parsley, with grilled sourdough for the juices.' },
  { name: 'Steak frites', price: '32', description: 'Hanger steak cooked to your liking, shallot butter, hand-cut fries and peppery watercress.' },
  { name: 'Confit de canard', price: '29', description: 'Crisp duck leg on Puy lentils with roasted plums and a thyme jus.' },
  { name: 'Tarte Tatin', price: '12', description: 'Upside-down caramelised apples on butter pastry, served warm with crème fraîche.' },
];

export default function LeaderDotMenuList({
  eyebrow = 'Served from six',
  heading = 'Le Dîner',
  items = defaultItems,
  currencySymbol = '$',
  textColor = '#1f2a44',
  accentColor = '#a8392b',
  paperColor = '#f6efdf',
  className,
}: LeaderDotMenuListProps) {
  const [open, setOpen] = useState<number | null>(0);
  const [reduced, setReduced] = useState(false);
  const uid = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = items.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: i === last ? 0 : i + 1,
      ArrowUp: i === 0 ? last : i - 1,
      Home: 0,
      End: last,
    };
    const next = moves[e.key];
    if (next === undefined) return;
    e.preventDefault();
    buttons.current[next]?.focus();
  };

  const rootStyle = {
    '--ldm-ink': textColor,
    '--ldm-accent': accentColor,
    '--ldm-paper': paperColor,
  } as CSSProperties;

  const formatPrice = (price?: string) => (price ? \`\${currencySymbol}\${price}\` : '');

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <span className={styles.grain} aria-hidden="true" />
      <span className={styles.vignette} aria-hidden="true" />

      <div className={styles.sheet}>
        {(eyebrow || heading) && (
          <header className={styles.header}>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            {heading && <h2 className={styles.heading}>{heading}</h2>}
            <span className={styles.fleuron} aria-hidden="true" />
          </header>
        )}

        <ul className={styles.list}>
          {items.map((item, i) => {
            const isOpen = reduced || open === i;
            const nameId = \`\${uid}-n\${i}\`;
            const panelId = \`\${uid}-p\${i}\`;
            const price = formatPrice(item.price);
            const hasDescription = Boolean(item.description);
            const line = (
              <>
                <span id={nameId} className={styles.name}>
                  {item.name}
                </span>
                <span className={styles.leader} aria-hidden="true">
                  <span className={styles.leaderFill} />
                </span>
                {price && <span className={styles.price}>{price}</span>}
              </>
            );

            return (
              <li
                key={i}
                className={[styles.item, isOpen && !reduced ? styles.itemOpen : ''].filter(Boolean).join(' ')}
              >
                {hasDescription && !reduced ? (
                  <button
                    ref={(el) => {
                      buttons.current[i] = el;
                    }}
                    type="button"
                    className={styles.row}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    aria-description="Shows the description. Arrow keys move between dishes."
                    onClick={() => setOpen(isOpen ? null : i)}
                    onKeyDown={(e) => onKeyDown(e, i)}
                  >
                    {line}
                  </button>
                ) : (
                  <div className={styles.rowStatic}>{line}</div>
                )}

                {hasDescription && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={nameId}
                    className={[styles.panel, isOpen ? styles.panelOpen : ''].filter(Boolean).join(' ')}
                    aria-hidden={!isOpen}
                  >
                    <div className={styles.panelInner}>
                      <p className={styles.description}>{item.description}</p>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
`;export{e as default};
