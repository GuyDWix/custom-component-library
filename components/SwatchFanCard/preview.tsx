import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import { useMemo } from 'react';
import SwatchFanCard from './Component';
import type { SwatchFanCardProps } from './Component';

const worst: SwatchFanCardProps = {
  image: '',
  productName: 'Alexandria Montgomery-Vanderhoeven-Castellanos Special Edition Lounge Chair',
  price: '$1,240,500.00',
  swatches: [
    { name: 'Terracotta of the Late-Afternoon Courtyard', color: '#c05b38' },
    { name: 'Sage Ritual', color: '#7d8b6f' },
    { name: 'Cobalt Counter', color: '#2f5da8' },
    { name: 'Marigold Noon', color: '#d9a125' },
    { name: 'Damson Dusk', color: '#5b2e4f' },
    { name: 'Olive Grove at Dusk', color: '#6b7042' },
    { name: 'Prussian Night Shift', color: '#274a72' },
    { name: 'Chalk', color: '#cfc4a6' },
  ],
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #e6e1d4 0%, #d7d0bf 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <SwatchFanCard {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
