const n=`import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './Component.module.css';

export interface RollingPriceOption {
  label: string;
  price: number;
  period: string;
  saving: string;
  /** One included feature per line. Lines that appear in several options glide to their new place. */
  features: string;
}

export interface RollingPriceToggleProps {
  options?: RollingPriceOption[];
  currency?: string;
  highlightColor?: string;
  className?: string;
}

export const defaultOptions: RollingPriceOption[] = [
  {
    label: 'Monthly',
    price: 14,
    period: 'per month',
    saving: '',
    features: [
      'Everyday current account',
      'Round-up savings pot',
      'Free cash withdrawals',
      'Card payments abroad',
      'Monthly statements',
    ].join('\\n'),
  },
  {
    label: 'Quarterly',
    price: 39,
    period: 'per quarter',
    saving: 'Save $3 a quarter',
    features: [
      'Everyday current account',
      'Round-up savings pot',
      'Card payments abroad',
      'Free cash withdrawals',
      'Monthly statements',
      'Spending insights',
    ].join('\\n'),
  },
  {
    label: 'Yearly',
    price: 140,
    period: 'per year',
    saving: 'Save $28 a year',
    features: [
      'Boosted savings rate',
      'Card payments abroad',
      'Round-up savings pot',
      'Everyday current account',
      'Free cash withdrawals',
      'Priority phone support',
      'Spending insights',
    ].join('\\n'),
  },
];

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Ghost extends Rect {
  key: string;
  text: string;
}
interface Pending {
  rects: Map<string, Rect>;
  height: number;
}
interface Slot {
  ch: string | null;
  r: number;
}

const SPRING_EASE = 'cubic-bezier(.22, 1.12, .36, 1)';
const SETTLE_EASE = 'cubic-bezier(.2, .8, .2, 1)';

const parseFeatures = (text: string) =>
  text
    .split(/\\r?\\n/)
    .map((t) => t.trim())
    .filter(Boolean);

const keyed = (list: string[]) => {
  const seen = new Map<string, number>();
  return list.map((text) => {
    const n = seen.get(text) ?? 0;
    seen.set(text, n + 1);
    return { key: \`\${text}#\${n}\`, text };
  });
};

const cleanPrice = (v: number) => (Number.isFinite(v) ? Math.round(Math.abs(v) * 100) / 100 : 0);

const formatPrice = (v: number, decimals: number) =>
  cleanPrice(v).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const HELP = 'Use the left and right arrow keys to switch between options. The price and included features update.';

export default function RollingPriceToggle({
  options = defaultOptions,
  currency = '$',
  highlightColor = '#e2b13c',
  className,
}: RollingPriceToggleProps) {
  const opts = options.length > 0 ? options : defaultOptions;
  const [sel, setSel] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const uid = useId();

  const idx = Math.min(sel, opts.length - 1);
  const current = opts[idx];

  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const pending = useRef<Pending | null>(null);
  const ghostTimer = useRef(0);
  const heightTimer = useRef(0);

  const lists = useMemo(() => opts.map((o) => keyed(parseFeatures(o.features))), [opts]);
  const decimals = useMemo(() => (opts.some((o) => !Number.isInteger(cleanPrice(o.price))) ? 2 : 0), [opts]);
  const texts = useMemo(() => opts.map((o) => formatPrice(o.price, decimals)), [opts, decimals]);
  const maxLen = useMemo(() => Math.max(...texts.map((t) => t.length)), [texts]);
  const widthUnits = useMemo(
    () => Math.max(...texts.map((t) => t.replace(/[^0-9]/g, '').length + 0.4 * t.replace(/[0-9]/g, '').length)),
    [texts],
  );

  const priceText = texts[idx];
  const slots: Slot[] = [];
  for (let r = maxLen - 1; r >= 0; r--) {
    slots.push({ ch: priceText[priceText.length - 1 - r] ?? null, r });
  }

  const feats = lists[idx];
  const maxFeatures = Math.max(...lists.map((l) => l.length), 1);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(ghostTimer.current);
      window.clearTimeout(heightTimer.current);
    },
    [],
  );

  const capture = useCallback(
    (next: number) => {
      const ul = listRef.current;
      if (!ul) return;
      const base = ul.getBoundingClientRect();
      const rects = new Map<string, Rect>();
      itemRefs.current.forEach((el, key) => {
        const r = el.getBoundingClientRect();
        rects.set(key, { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height });
      });
      const nextKeys = new Set(lists[next].map((i) => i.key));
      const gone: Ghost[] = [];
      lists[idx].forEach((i) => {
        const rect = rects.get(i.key);
        if (rect && !nextKeys.has(i.key)) gone.push({ key: i.key, text: i.text, ...rect });
      });
      pending.current = { rects, height: ul.offsetHeight };
      setGhosts(gone);
      window.clearTimeout(ghostTimer.current);
      ghostTimer.current = window.setTimeout(() => setGhosts([]), 420);
    },
    [lists, idx],
  );

  const select = (next: number, focus = false) => {
    if (focus) btnRefs.current[next]?.focus();
    if (next === idx) return;
    if (!reduced) capture(next);
    setSel(next);
  };

  // Glide shared features to their new places, fade new ones in, and ease the list height.
  useEffect(() => {
    const pend = pending.current;
    if (!pend) return;
    pending.current = null;
    const ul = listRef.current;
    if (!ul) return;
    const els = itemRefs.current;
    els.forEach((el) => {
      if (typeof el.getAnimations === 'function') el.getAnimations().forEach((a) => a.cancel());
    });

    window.clearTimeout(heightTimer.current);
    ul.style.transition = 'none';
    ul.style.height = '';
    const natural = ul.offsetHeight;
    if (Math.abs(natural - pend.height) > 1) {
      ul.style.height = \`\${pend.height}px\`;
      void ul.offsetHeight;
      ul.style.transition = 'height 560ms cubic-bezier(.22, 1, .36, 1)';
      ul.style.height = \`\${natural}px\`;
      heightTimer.current = window.setTimeout(() => {
        ul.style.transition = '';
        ul.style.height = '';
      }, 620);
    } else {
      ul.style.transition = '';
    }

    if (typeof Element === 'undefined' || typeof Element.prototype.animate !== 'function') return;
    const base = ul.getBoundingClientRect();
    let fresh = 0;
    lists[idx].forEach((item, i) => {
      const el = els.get(item.key);
      if (!el) return;
      const old = pend.rects.get(item.key);
      if (old) {
        const r = el.getBoundingClientRect();
        const dx = old.x - (r.left - base.left);
        const dy = old.y - (r.top - base.top);
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          el.animate(
            [{ transform: \`translate(\${dx}px, \${dy}px)\` }, { transform: 'translate(0px, 0px)' }],
            { duration: 700, delay: i * 26, easing: SPRING_EASE, fill: 'backwards' },
          );
        }
      } else {
        el.animate(
          [
            { opacity: 0, transform: 'translateY(20px)' },
            { opacity: 1, transform: 'translateY(0px)' },
          ],
          { duration: 520, delay: 160 + fresh * 60, easing: SETTLE_EASE, fill: 'backwards' },
        );
        fresh += 1;
      }
    });
  }, [idx, lists]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = opts.length;
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else return;
    e.preventDefault();
    select(next, true);
  };

  const rootStyle = {
    '--rp-gold': highlightColor,
    '--rp-n': widthUnits,
    '--rp-opts': opts.length,
    '--rp-i': idx,
    '--rp-rows': Math.ceil(maxFeatures / 2),
  } as CSSProperties;

  const labelId = \`\${uid}-label\`;
  const listId = \`\${uid}-list\`;
  const stack = opts.length > 3;

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle}>
      <div className={styles.toggleWrap}>
        <div
          className={\`\${styles.track} \${stack ? styles.trackStack : ''}\`}
          role="radiogroup"
          aria-label="Billing option"
          aria-description={HELP}
          onKeyDown={onKeyDown}
        >
          <div className={\`\${styles.rail} \${stack ? styles.railStack : ''}\`}>
            <span className={\`\${styles.thumb} \${stack ? styles.thumbStack : ''}\`} aria-hidden="true" />
            {opts.map((o, i) => (
              <button
                key={i}
                ref={(el) => {
                  btnRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={i === idx}
                tabIndex={i === idx ? 0 : -1}
                className={\`\${styles.option} \${i === idx ? styles.optionOn : ''}\`}
                onClick={() => select(i)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className={styles.card} aria-labelledby={labelId}>
        <span className={styles.sheen} aria-hidden="true" />
        <span className={styles.grain} aria-hidden="true" />
        <span className={styles.rosette} aria-hidden="true">
          <span className={styles.ringsA} />
          <span className={styles.fan} />
          <span className={styles.turn}>
            <span className={styles.ringsB} />
          </span>
        </span>

        <div className={styles.hero}>
          <span className={styles.rule} aria-hidden="true" />
          <div className={styles.price} aria-hidden="true">
            <span className={styles.currency}>{currency}</span>
            <span className={styles.digits}>
              {slots.map((s) => {
                const isDigit = s.ch !== null && /[0-9]/.test(s.ch);
                const gone = s.ch === null;
                const cls = [
                  styles.slot,
                  isDigit || gone ? styles.slotDigit : styles.slotPunc,
                  gone ? styles.slotGone : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                const d = isDigit ? Number(s.ch) : 0;
                return (
                  <span key={s.r} className={cls}>
                    {isDigit || gone ? (
                      <span className={styles.window}>
                        <span className={styles.strip} style={{ '--rp-d': d, '--rp-r': s.r } as CSSProperties}>
                          {DIGITS.map((n) => (
                            <span key={n} className={styles.digit}>
                              {n}
                            </span>
                          ))}
                        </span>
                      </span>
                    ) : (
                      <span className={styles.punc}>{s.ch}</span>
                    )}
                  </span>
                );
              })}
            </span>
            <span className={styles.side}>
              {current.saving ? (
                <span key={\`s\${idx}\`} className={styles.saving}>
                  {current.saving}
                </span>
              ) : (
                <span className={styles.savingGap} />
              )}
              <span key={\`p\${idx}\`} className={styles.period}>
                {current.period}
              </span>
            </span>
          </div>
          <p id={labelId} className={styles.sr} aria-live="polite">
            {\`\${current.label}: \${currency}\${priceText} \${current.period}.\${current.saving ? \` \${current.saving}.\` : ''}\`}
          </p>
        </div>

        <ul ref={listRef} id={listId} className={styles.ledger} aria-label={\`Included with \${current.label}\`}>
          {feats.map((f) => (
            <li
              key={f.key}
              ref={(el) => {
                if (el) itemRefs.current.set(f.key, el);
                else itemRefs.current.delete(f.key);
              }}
              className={styles.item}
            >
              <span className={styles.tick} aria-hidden="true">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                  <path d="M3.4 8.4l3 3 6.2-6.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className={styles.text}>{f.text}</span>
            </li>
          ))}
          {ghosts.map((g) => (
            <li
              key={\`g-\${g.key}\`}
              className={\`\${styles.item} \${styles.ghost}\`}
              aria-hidden="true"
              style={{ insetBlockStart: g.y, insetInlineStart: g.x, inlineSize: g.w, blockSize: g.h }}
            >
              <span className={styles.tick}>
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                  <path d="M3.4 8.4l3 3 6.2-6.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className={styles.text}>{g.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
`;export{n as default};
