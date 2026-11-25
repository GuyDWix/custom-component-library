import type { Entry } from './data';
import { STATUSES, STATUS_LABEL, statusOf, type Me, type WorkState, type WorkStatus } from './workflow';

export type StatusFilter = 'all' | WorkStatus | 'mine';
export type Filters = { q: string; status: StatusFilter };

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
  { value: 'mine', label: 'Mine' },
];

const isStatusFilter = (v: string | null): v is StatusFilter => STATUS_FILTERS.some((o) => o.value === v);

export function readFilters(): Filters {
  const p = new URLSearchParams(location.search);
  const status = p.get('status');
  return { q: p.get('q') ?? '', status: isStatusFilter(status) ? status : 'all' };
}

export function writeFilters(f: Filters) {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.status !== 'all') p.set('status', f.status);
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

export const matchesSearch = (e: Entry, q: string) => {
  const needle = q.trim().toLowerCase();
  return !needle || [e.title, e.name, e.job].some((s) => s?.toLowerCase().includes(needle));
};

export function matchesStatus(f: StatusFilter, state: WorkState | undefined, me: Me | null) {
  if (f === 'all') return true;
  if (f === 'mine') return !!me && state?.assigneeEmail === me.email;
  return statusOf(state) === f;
}
