import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import { useMemo } from 'react';
import DiffCompareCard from './Component';
import type { DiffCompareRow } from './Component';

const worstRows: DiffCompareRow[] = [
  {
    label: 'Late-booking rescheduling policy and travel coverage outside the city limits',
    valueA:
      'Free rescheduling up to 72 hours before the session, with full travel coverage anywhere within the greater metropolitan region and neighbouring counties at no extra charge.',
    valueB: 'Rescheduling allowed once, travel charged per kilometre.',
  },
  {
    label: 'Very long option name to test wrapping behaviour in a narrow column',
    valueA:
      'This value goes on for quite a while on purpose, because real owners paste whole paragraphs into comparison cells and the layout has to keep looking deliberate instead of falling apart.',
    valueB: 'Short value.',
  },
  { label: 'Price', valueA: '', valueB: '$1,280,000', better: 'lower' },
  { label: 'Price per image', valueA: '$7.65', valueB: '$9.14', better: 'lower' },
  { label: 'Hours', valueA: '8 hours', valueB: '4 hours' },
  { label: 'Photographers', valueA: 'Two', valueB: 'One' },
  { label: 'Finished gallery', valueA: '320 images', valueB: '140 images' },
  { label: 'Delivery time', valueA: '3 weeks', valueB: '3 weeks' },
  { label: 'Online gallery', valueA: '12 months', valueB: '12 months' },
  { label: 'Print release', valueA: 'Included', valueB: 'Included' },
  { label: 'Planning call', valueA: 'Included', valueB: 'Included' },
  { label: 'Engagement shoot', valueA: 'Included', valueB: 'Not included' },
  { label: 'Album credit', valueA: '$150', valueB: '$0' },
  { label: 'Travel radius', valueA: '120 km', valueB: '30 km' },
  { label: 'Second shooter', valueA: 'Available on request', valueB: 'Available on request' },
  { label: 'Same-day sneak peeks', valueA: '', valueB: 'Included' },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
};

export default function Preview() {
  const params = useMemo(
    () => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search),
    []
  );
  const worst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: worst ? 720 : 760 }}>
        <DiffCompareCard
          {...(worst
            ? {
                optionAName: 'Alexandria Montgomery-Vanderhoeven Photography Collective',
                optionBName: 'Studio Compact Package With An Unreasonably Long Name',
                rows: worstRows,
              }
            : {})}
        />
      </div>
    </div>
  );
}
