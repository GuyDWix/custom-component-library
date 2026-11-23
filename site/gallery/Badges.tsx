import { SHOW_REVIEW, type Entry } from './data';

type Tone = 'good' | 'warn' | 'bad' | 'muted';
type Pill = { label: string; tone: Tone; title?: string };

const scorePill = (n: number, title: string): Pill => ({
  label: `Craft ${n}`,
  tone: n >= 3 ? 'good' : n === 2 ? 'warn' : 'bad',
  title,
});

function craftPill(raw: unknown): Pill {
  const title = raw == null ? 'Not reviewed' : String(raw);
  if (typeof raw === 'number') return scorePill(raw, title);
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  const m = s.match(/^(?:pass\s*\(\s*(\d)\s*[,)]|(\d)\b)/);
  if (m) return scorePill(Number(m[1] ?? m[2]), title);
  if (s.startsWith('pass')) return { label: 'Craft ✓', tone: 'good', title };
  return { label: 'Craft —', tone: 'muted', title };
}

function statusPill(e: Entry): Pill | null {
  const title = e.statusRaw;
  if (e.status === 'rejected') return { label: 'Rejected', tone: 'bad', title };
  if (e.status === 'backlog') return { label: 'Backlog', tone: 'warn', title };
  return null;
}

const needsAttention = (p: Pill) => p.tone === 'warn' || p.tone === 'bad';

function studio2Pill(raw: unknown): Pill | null {
  if (raw === true) return { label: 'Studio 2 ✓', tone: 'good', title: 'Tested in Studio 2' };
  if (typeof raw === 'string' && raw.trim()) return { label: 'Studio 2 ⚠', tone: 'warn', title: raw };
  return null;
}

export default function Badges({ entry }: { entry: Entry }) {
  if (!SHOW_REVIEW) return null;
  const craft = craftPill(entry.craft);
  const pills = [statusPill(entry), needsAttention(craft) ? craft : null, studio2Pill(entry.studio2)]
    .filter((p): p is Pill => !!p);
  if (!pills.length) return null;
  return (
    <ul className="g-badges" aria-label="Review status">
      {pills.map((p) => (
        <li key={p.label} className={`g-pill g-pill--${p.tone}`} title={p.title}>{p.label}</li>
      ))}
    </ul>
  );
}
