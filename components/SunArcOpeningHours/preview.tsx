import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/600.css';
import '@fontsource/instrument-sans/700.css';
import { useMemo } from 'react';
import SunArcOpeningHours from './Component';
import type { SunArcOpeningHoursProps } from './Component';

const worst: SunArcOpeningHoursProps = {
  title: 'Opening hours at the Riverside Lido Caf\u00E9 and Cold-Water Swimming Club',
  hours: [
    { day: 'Monday', label: 'Monday', opens: '00:00', closes: '23:59' },
    { day: 'Tuesday', label: 'Tuesday', opens: '06:15', closes: '12:45' },
    { day: 'Wednesday', label: 'Wednesday', opens: '', closes: '', closed: true },
    { day: 'Thursday', label: 'Thursday', opens: '18:00', closes: '02:30' },
    { day: 'Friday', label: 'Friday', opens: '07:30', closes: '23:00' },
    { day: 'Saturday', label: 'Saturday', opens: '08:00', closes: '23:45' },
    { day: 'Sunday', label: 'Sunday', opens: '09:00', closes: '18:00' },
  ],
  clock: '24h',
  timeZone: 'Pacific/Auckland',
  openNowLabel: 'We are open right now',
  closesAtLabel: 'and we close at',
  opensLabel: 'but we open again',
  closedLabel: 'Closed for the day',
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #eef0fb 0%, #e4e6f6 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <SunArcOpeningHours {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
