import { useMemo } from 'react';
import InkBleedHeadline from './Component';
import type { InkBleedHeadlineProps } from './Component';

const worst: InkBleedHeadlineProps = {
  headline:
    'International Calligraphic Correspondence Society Winter Symposium & Exhibition',
  inkColor: '#141414',
  paperTone: '#efe7d2',
  speed: 0.5,
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #262019 0%, #1b1712 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <InkBleedHeadline {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
