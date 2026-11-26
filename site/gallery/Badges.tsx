import { SHOW_REVIEW } from './data';
import { STATUS_LABEL, STATUS_TONE, firstName, statusOf, type WorkState } from './workflow';

export default function Badges({ state }: { state: WorkState | null }) {
  if (!SHOW_REVIEW) return null;
  const status = statusOf(state ?? undefined);
  const label = [firstName(state?.assigneeName, state?.assigneeEmail), STATUS_LABEL[status]].filter(Boolean).join(' · ');
  return (
    <ul className="g-badges" aria-label="Review status">
      <li className={`g-pill g-pill--${STATUS_TONE[status]}`} title={state?.assigneeName ?? undefined}>{label}</li>
    </ul>
  );
}
