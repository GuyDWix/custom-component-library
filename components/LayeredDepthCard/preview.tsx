import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/dm-sans/900.css';
import { useMemo } from 'react';
import LayeredDepthCard from './Component';
import type { LayeredDepthCardProps } from './Component';

const worst: LayeredDepthCardProps = {
  title: 'The Extraordinarily Long Annual Midsummer Lantern and Hot-Air Balloon Festival of the Harbour Meadow',
  caption:
    'Saturday 14 June to Sunday 22 June, gates open at five in the evening at the Harbour Meadow, with late night food stalls, live music and a closing fireworks display',
  label: 'Early-bird tickets from 18 euros, children under twelve go free',
  layerDepth: 40,
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #17153f 0%, #0c0a2a 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <LayeredDepthCard {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
