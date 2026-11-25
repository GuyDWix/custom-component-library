import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import { useMemo } from 'react';
import CustomerDotsWaffle from './Component';
import type { CustomerDotsWaffleProps } from './Component';

const worst: CustomerDotsWaffleProps = {
  percentage: 7,
  statement:
    'of the people who walked into our flagship location during the extended renovation period, the seasonal pop-up weeks and the three weekend-long open days booked a follow-up consultation with a different practitioner within the first calendar year.',
  highlightLabel: 'Booked a follow-up consultation with a different practitioner',
  otherLabel: 'Visited once, enjoyed it, and have not scheduled anything else yet',
  highlightColor: '#e0301f',
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #dde4e0 0%, #cfd8d3 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <CustomerDotsWaffle {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
