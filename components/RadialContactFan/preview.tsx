import '@fontsource/bricolage-grotesque/400.css';
import '@fontsource/bricolage-grotesque/600.css';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/600.css';
import '@fontsource/instrument-sans/700.css';
import { useMemo } from 'react';
import RadialContactFan from './Component';
import type { RadialContactFanAction, RadialContactFanDirection } from './Component';

const worstActions: RadialContactFanAction[] = [
  { label: 'Call the front desk, any hour', icon: 'phone', href: 'tel:+351210000000' },
  { label: 'Directions and parking', icon: 'directions', href: 'https://maps.google.com/?q=Rua+das+Flores+18+Lisbon' },
  { label: 'Message the concierge', icon: 'message', href: 'sms:+351910000000' },
  { label: 'Email the events team', icon: 'mail', href: 'mailto:events@example.com' },
  { label: 'Reservations', icon: 'calendar', href: '#book' },
];

const worstProps = {
  actions: worstActions,
  mainLabel: 'Get in touch with the Marlowe front desk team',
  heading: 'Reservations, private dining, group stays and anything in between, handled at the front desk.',
  note: 'Hotel Marlowe Lisbon Riverside Quarter · open all hours, every day of the year · Rua das Flores 18, 1200-195 Lisbon, Portugal',
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  alignContent: 'center',
  padding: 'clamp(12px, 3vw, 40px)',
};

const directions: RadialContactFanDirection[] = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';
  const dir = params.get('dir') as RadialContactFanDirection | null;
  const fanDirection = dir && directions.includes(dir) ? dir : undefined;

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1280, marginInline: 'auto' }}>
        <RadialContactFan {...(worst ? worstProps : {})} {...(fanDirection ? { fanDirection } : {})} />
      </div>
    </div>
  );
}
