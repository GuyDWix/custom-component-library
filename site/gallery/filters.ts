import { SHOW_REVIEW, isStudio2Tested, type Entry } from './data';

export const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'built', label: 'Built' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'studio2', label: 'Tested in Studio 2' },
] as const;

export type StatusFilter = (typeof STATUS_OPTIONS)[number]['value'];
export type Filters = { cat: string; tier: string; status: StatusFilter };

const isStatus = (v: string | null): v is StatusFilter => STATUS_OPTIONS.some((o) => o.value === v);

export function readFilters(): Filters {
  const p = new URLSearchParams(location.search);
  const status = p.get('status');
  return {
    cat: p.get('cat') ?? '',
    tier: p.get('tier') ?? '',
    status: SHOW_REVIEW && isStatus(status) ? status : 'all',
  };
}

export function writeFilters(f: Filters) {
  const p = new URLSearchParams();
  if (f.cat) p.set('cat', f.cat);
  if (f.tier) p.set('tier', f.tier);
  if (f.status !== 'all') p.set('status', f.status);
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

const matchesStatus = (e: Entry, s: StatusFilter) =>
  s === 'all' || (s === 'studio2' ? isStudio2Tested(e) : e.status === s);

export const applyFilters = (list: Entry[], f: Filters) =>
  list.filter((e) => (!f.cat || e.category === f.cat) && (!f.tier || e.tier === f.tier) && matchesStatus(e, f.status));
