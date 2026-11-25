import { useCallback, useEffect, useState } from 'react';
import { request } from './edits';

export const STATUSES = ['backlog', 'in_progress', 'approved', 'rejected'] as const;
export type WorkStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<WorkStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'In progress',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const STATUS_TONE: Record<WorkStatus, string> = {
  backlog: 'muted',
  in_progress: 'accent',
  approved: 'good',
  rejected: 'bad',
};

export type Me = { email: string; name: string };

export type WorkState = {
  name: string;
  status: WorkStatus;
  assigneeEmail: string | null;
  assigneeName: string | null;
  updatedBy: string | null;
  updatedAt: string;
};

export type WorkEvent = {
  id: number;
  action: string;
  status: WorkStatus | null;
  assigneeName: string | null;
  actorEmail: string;
  actorName: string | null;
  at: string;
};

export type StateAction = { action: 'claim' | 'release' } | { action: 'status'; status: WorkStatus };

const LEGACY_STATUS: Record<string, WorkStatus> = { done: 'in_progress' };
export const statusOf = (s?: WorkState): WorkStatus =>
  !s ? 'backlog' : STATUSES.includes(s.status) ? s.status : LEGACY_STATUS[s.status] ?? 'backlog';
export const firstName = (name?: string | null, email?: string | null) =>
  name?.trim().split(/\s+/)[0] || email?.split('@')[0] || '';

export const postState = (name: string, body: StateAction) =>
  request<WorkState>(`/api/components/${encodeURIComponent(name)}/state`, { method: 'POST', body: JSON.stringify(body) });

export const fetchStates = () =>
  request<WorkState[]>('/api/state').then((list) => (Array.isArray(list) ? list : []));

export const fetchEvents = (name: string) =>
  request<WorkEvent[]>(`/api/components/${encodeURIComponent(name)}/events`).then((list) => (Array.isArray(list) ? list : []));

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    request<Me>('/api/me').then((m) => setMe(m?.email ? m : null), () => {});
  }, []);
  return me;
}

export function useWorkState(name: string) {
  const [state, setState] = useState<WorkState | null>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [changes, setChanges] = useState(0);

  const refresh = useCallback(() => {
    fetchStates().then((list) => setState(list.find((s) => s.name === name) ?? null), () => setState(null));
  }, [name]);

  useEffect(refresh, [refresh]);

  const run = async (body: StateAction) => {
    setBusy(true);
    setError(undefined);
    try {
      setState(await postState(name, body));
      setChanges((n) => n + 1);
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  };

  return { state, busy, error, changes, run, refresh };
}

export type WorkStateApi = ReturnType<typeof useWorkState>;

export function useStates() {
  const [byName, setByName] = useState<Record<string, WorkState>>({});
  useEffect(() => {
    fetchStates()
      .then((list) => setByName(Object.fromEntries(list.map((s) => [s.name, s]))))
      .catch(() => {});
  }, []);
  return byName;
}
