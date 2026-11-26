import { useEffect, useMemo, useState } from 'react';
import { SHOW_REVIEW, metaLine, type Entry } from './data';
import { STATUS_FILTERS, matchesSearch, matchesStatus, readFilters, writeFilters, type Filters } from './filters';
import Badges from './Badges';
import { useCatalog } from './catalog';
import { authorOf, relativeTime, type VersionSummary } from './edits';
import NewComponent from './NewComponent';
import Thumb from './Thumb';
import { statusOf, useMe, useStates, type WorkState } from './workflow';

function StatusChips({ value, counts, onChange }: {
  value: Filters['status'];
  counts: Record<string, number>;
  onChange: (v: Filters['status']) => void;
}) {
  return (
    <ul className="g-statuses" aria-label="Status">
      {STATUS_FILTERS.map((o) => (
        <li key={o.value}>
          <button type="button" className="g-status-chip" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
            <span className="g-status-chip__count">{counts[o.value] ?? 0}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Card({ entry, edit, state }: { entry: Entry; edit?: VersionSummary; state?: WorkState }) {
  const muted = SHOW_REVIEW && statusOf(state) === 'rejected';
  return (
    <li>
      <a className={`g-card${muted ? ' g-card--muted' : ''}`} href={`?view=${encodeURIComponent(entry.name)}`}>
        <Thumb name={entry.name} title={entry.title} hasVersion={!!edit} />
        <div className="g-card__body">
          <h2 className="g-card__title">{entry.title}</h2>
          {metaLine(entry) && <p className="g-card__meta">{metaLine(entry)}</p>}
          {entry.job && <p className="g-card__job">{entry.job}</p>}
          <Badges state={state ?? null} />
          {edit && (
            <span className="g-pill g-pill--edited g-card__edited" title={`Edited by ${authorOf(edit)} · ${relativeTime(edit.createdAt)}`}>
              {entry.inRepo ? 'Edited' : 'New'}
            </span>
          )}
        </div>
      </a>
    </li>
  );
}

export default function Grid() {
  const [filters, setFilters] = useState<Filters>(readFilters);
  const { entries, versions } = useCatalog();
  const states = useStates();
  const me = useMe();
  const found = useMemo(() => entries.filter((e) => matchesSearch(e, filters.q)), [entries, filters.q]);
  const shown = useMemo(
    () => (SHOW_REVIEW ? found.filter((e) => matchesStatus(filters.status, states[e.name], me)) : found),
    [found, filters.status, states, me],
  );
  const counts = useMemo(
    () => Object.fromEntries(STATUS_FILTERS.map((o) => [o.value, found.filter((e) => matchesStatus(o.value, states[e.name], me)).length])),
    [found, states, me],
  );
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
        {SHOW_REVIEW && <NewComponent taken={(name) => entries.some((e) => e.name === name)} />}
      </header>

      <div className="g-filters" role="search">
        <input
          type="search"
          className="g-search"
          placeholder="Search components"
          aria-label="Search components"
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
        />
        {SHOW_REVIEW && <StatusChips value={filters.status} counts={counts} onChange={(status) => set({ status })} />}
      </div>

      {shown.length ? (
        <ul className="g-grid">
          {shown.map((e) => <Card key={e.name} entry={e} edit={versions[e.name]} state={states[e.name]} />)}
        </ul>
      ) : (
        <p className="g-empty">No components match these filters.</p>
      )}
    </main>
  );
}
