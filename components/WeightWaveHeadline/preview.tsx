import { useMemo } from 'react';
import WeightWaveHeadline from './Component';
import type { WeightWaveHeadlineProps } from './Component';

const worst: WeightWaveHeadlineProps = {
  text: 'Pneumonoultramicroscopicsilicovolcanoconiosis and other absurdly long words keep this headline wrapping across far more lines than anyone would ever publish on a real website',
  minWeight: 100,
  maxWeight: 900,
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #d7d4cc 0%, #c9c6be 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <WeightWaveHeadline {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
