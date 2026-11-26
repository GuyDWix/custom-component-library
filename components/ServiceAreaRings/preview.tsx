import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/600.css';
import '@fontsource/instrument-sans/700.css';
import { useMemo } from 'react';
import ServiceAreaRings from './Component';
import type { ServiceAreaNeighbourhood, ServiceAreaRing } from './Component';

const worstRings: ServiceAreaRing[] = [
  { distance: 'Within 1.5 kilometres', time: '15 to 20 minutes', fee: 'Free over $25, otherwise $1.99' },
  { distance: 'Within 3 kilometres', time: '25–35 minutes, longer at peak hours', fee: '$3.49' },
  { distance: '5 km', time: '40–50 min', fee: '$5.00' },
  { distance: '8 km', time: '55–70 min', fee: '$7.50' },
  { distance: '12 km', time: 'About an hour and a half', fee: '$9.90' },
  { distance: 'Up to 20 km by arrangement', time: '2 hours', fee: 'Quoted per order' },
];

const worstNeighbourhoods: ServiceAreaNeighbourhood[] = [
  { name: 'Old Harbour Quarter', ring: 1 },
  { name: 'Westbourne-on-the-Heights Industrial Estate', ring: 1 },
  { name: 'Quay', ring: 1 },
  { name: 'Saint Bartholomew’s Court', ring: 2 },
  { name: 'Lighthouse Hill', ring: 2 },
  { name: 'Ropewalk Mews and the Saltings', ring: 2 },
  { name: 'Fishmarket Row', ring: 2 },
  { name: 'Marlow Heights', ring: 2 },
  { name: 'Tidewater Park', ring: 2 },
  { name: 'North Cove Garden Village', ring: 2 },
  { name: 'Gull Lane', ring: 3 },
  { name: 'Brightwater Estate East', ring: 3 },
  { name: 'Northgate', ring: 3 },
  { name: 'Cornmarket Square', ring: 4 },
  { name: 'Windmill Fields', ring: 4 },
  { name: 'Upper Sandwick', ring: 4 },
  { name: 'Eastfield', ring: 5 },
  { name: 'Lower Penhallow-by-the-Sea', ring: 5 },
  { name: 'Skerry Point', ring: 6 },
  { name: 'Gannet Bay Holiday Park', ring: 6 },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <ServiceAreaRings
          {...(worst
            ? {
                rings: worstRings,
                neighbourhoods: worstNeighbourhoods,
                centreLabel: 'The Old Harbour Master’s Fish and Chip Kitchen & Oyster Bar',
              }
            : {})}
        />
      </div>
    </div>
  );
}
