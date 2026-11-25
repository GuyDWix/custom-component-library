import type { ReactNode } from 'react';

export const tabId = (t: string) => `g-tab-${t.toLowerCase().replace(/\s+/g, '-')}`;

export default function Tabs<T extends string>({ label, tabs, value, onChange, end }: {
  label: string;
  tabs: readonly T[];
  value: T;
  onChange: (t: T) => void;
  end?: ReactNode;
}) {
  return (
    <div className="g-tabbar">
      <div className="g-tabs" role="tablist" aria-label={label}>
        {tabs.map((t) => (
          <button
            key={t}
            id={tabId(t)}
            type="button"
            role="tab"
            className="g-tab"
            aria-selected={t === value}
            aria-controls={`${tabId(t)}-panel`}
            tabIndex={t === value ? 0 : -1}
            onClick={() => onChange(t)}
            onKeyDown={(e) => {
              const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
              if (!step) return;
              const next = tabs[(tabs.indexOf(value) + step + tabs.length) % tabs.length];
              onChange(next);
              document.getElementById(tabId(next))?.focus();
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {end && <div className="g-tabbar__end">{end}</div>}
    </div>
  );
}

export function TabPanel({ tab, hidden, children }: { tab: string; hidden?: boolean; children: ReactNode }) {
  return (
    <div id={`${tabId(tab)}-panel`} role="tabpanel" aria-labelledby={tabId(tab)} className="g-tabpanel" hidden={hidden}>
      {children}
    </div>
  );
}
