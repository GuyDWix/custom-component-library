import { useEffect, useMemo, useState } from 'react';
import { SHOW_REVIEW, entries, metaLine, uniqueValues, type Entry } from './data';
import { STATUS_OPTIONS, applyFilters, readFilters, writeFilters, type Filters } from './filters';
import Badges from './Badges';
import Segmented from './Segmented';
import Thumb from './Thumb';

const categories = uniqueValues('category');
const tiers = uniqueValues('tier');

function Select({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="g-select">
      <span className="g-select__label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Card({ entry }: { entry: Entry }) {
  const muted = SHOW_REVIEW && (entry.status === 'rejected' || entry.status === 'backlog');
  return (
    <li>
      <a className={`g-card${muted ? ' g-card--muted' : ''}`} href={`?view=${encodeURIComponent(entry.name)}`}>
        <Thumb name={entry.name} title={entry.title} />
        <div className="g-card__body">
          <h2 className="g-card__title">{entry.title}</h2>
          {metaLine(entry) && <p className="g-card__meta">{metaLine(entry)}</p>}
          {entry.job && <p className="g-card__job">{entry.job}</p>}
          <Badges entry={entry} />
        </div>
      </a>
    </li>
  );
}

export default function Grid() {
  const [filters, setFilters] = useState<Filters>(readFilters);
  const shown = useMemo(() => applyFilters(entries, filters), [filters]);
  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  useEffect(() => writeFilters(filters), [filters]);
  useEffect(() => {
    document.title = 'Custom Component Library';
  }, []);

  return (
    <main className="g-page">
      <header className="g-header">
        <h1 className="g-header__title">Custom Component Library</h1>
        <p className="g-header__count">
          {shown.length === entries.length ? `${entries.length} components` : `${shown.length} of ${entries.length} components`}
        </p>
      </header>

      <div className="g-filters" role="search">
        <Select label="Category" value={filters.cat} options={categories} onChange={(cat) => set({ cat })} />
        <Select label="Tier" value={filters.tier} options={tiers} onChange={(tier) => set({ tier })} />
        {SHOW_REVIEW && (
          <Segmented label="Status" value={filters.status} options={STATUS_OPTIONS} onChange={(status) => set({ status })} />
        )}
      </div>

      {shown.length ? (
        <ul className="g-grid">
          {shown.map((e) => <Card key={e.name} entry={e} />)}
        </ul>
      ) : (
        <p className="g-empty">No components match these filters.</p>
      )}
    </main>
  );
}
