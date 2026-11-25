import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import { useMemo } from 'react';
import SplitFlapStats from './Component';
import type { SplitFlapStat } from './Component';

const worstStats: SplitFlapStat[] = [
  { value: '1,284,903,771', label: 'Parcels delivered across every country and territory we currently serve worldwide' },
  { value: '99.98%', label: 'On-time arrival rate during the busiest holiday trading period of the year' },
  { value: '2,400+', label: 'Neighbourhood pick-up points' },
  { value: '4.97/5', label: 'Average customer satisfaction' },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #e8e9ec 0%, #dcdde1 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <SplitFlapStats {...(worst ? { stats: worstStats } : {})} />
      </div>
    </div>
  );
}
