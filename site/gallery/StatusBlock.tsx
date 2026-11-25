import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { relativeTime } from './edits';
import {
  STATUSES, STATUS_LABEL, STATUS_TONE, fetchEvents, firstName, statusOf,
  type Me, type WorkEvent, type WorkStateApi, type WorkStatus,
} from './workflow';

const eventLine = (e: WorkEvent) => {
  const actor = e.actorName || e.actorEmail;
  const what = e.action === 'claim' ? 'claimed it' : e.action === 'release' ? 'released it' : `set ${e.status ? STATUS_LABEL[e.status] ?? e.status : e.action}`;
  return `${actor} ${what}`;
};

export function History({ name, version }: { name: string; version: number }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<WorkEvent[]>();

  useEffect(() => {
    if (open) fetchEvents(name).then(setEvents, () => setEvents([]));
  }, [name, open, version]);

  return (
    <details className="g-group" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="g-group__title">History</summary>
      <div className="g-group__body">
        {!events ? (
          <p className="g-muted">Loading…</p>
        ) : events.length ? (
          <ol className="g-history__list">
            {events.map((e) => (
              <li key={e.id}>
                <span>{eventLine(e)}</span>
                <time className="g-muted" dateTime={e.at} title={new Date(e.at).toLocaleString()}>{relativeTime(e.at)}</time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="g-muted">No changes yet.</p>
        )}
      </div>
    </details>
  );
}

function StatusMenu({ status, disabled, onPick }: { status: WorkStatus; disabled: boolean; onPick: (s: WorkStatus) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    addEventListener('pointerdown', close);
    return () => removeEventListener('pointerdown', close);
  }, [open]);

  const pick = (s: WorkStatus) => {
    setOpen(false);
    root.current?.querySelector('button')?.focus();
    if (s !== status) onPick(s);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return pick(status);
    const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!step || !open) return;
    e.preventDefault();
    const items = [...(root.current?.querySelectorAll<HTMLButtonElement>('[role=menuitemradio]') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(at + step + items.length) % items.length]?.focus();
  };

  return (
    <div className="g-menu" ref={root} onKeyDown={onKeyDown}>
      <button
        type="button"
        className={`g-select g-tone--${STATUS_TONE[status]}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Status: ${STATUS_LABEL[status]}`}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <span className="g-dot" />
        {STATUS_LABEL[status]}
        <span className="g-select__chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="g-menu__list" role="menu" aria-label="Status">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="menuitemradio"
              aria-checked={s === status}
              className={`g-menu__item g-tone--${STATUS_TONE[s]}`}
              autoFocus={s === status}
              onClick={() => pick(s)}
            >
              <span className="g-dot" />
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ClaimControl({ work, me }: { work: WorkStateApi; me: Me | null }) {
  const { state, busy, run } = work;
  const holder = state?.assigneeEmail;
  const claim = () => run({ action: 'claim' });

  if (!holder) {
    return <button type="button" className="g-btn g-btn--primary g-btn--sm" disabled={busy} onClick={claim}>Claim</button>;
  }
  if (holder === me?.email) {
    return (
      <div className="g-claim g-claim--mine">
        <span>You're on it</span>
        <button type="button" className="g-claim__btn" disabled={busy} onClick={() => run({ action: 'release' })}>Release</button>
      </div>
    );
  }
  const who = firstName(state?.assigneeName, holder);
  return (
    <div className="g-claim" title={state?.assigneeName ?? holder}>
      <span>{who} is on it</span>
      <button type="button" className="g-claim__btn" disabled={busy} onClick={() => confirm(`Take over from ${who}?`) && claim()}>
        Take over
      </button>
    </div>
  );
}

export default function StatusControl({ work }: { work: WorkStateApi }) {
  return <StatusMenu status={statusOf(work.state ?? undefined)} disabled={work.busy} onPick={(status) => work.run({ action: 'status', status })} />;
}
