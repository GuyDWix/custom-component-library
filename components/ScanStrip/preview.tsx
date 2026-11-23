import { useMemo } from 'react';
import ScanStrip from './Component';
import type { ScanStripProps } from './Component';

const worst: ScanStripProps = {
  cards: [
    {
      image: '',
      imageAlt: 'Missing image',
      twinTitle: 'Extraordinarily Long Product Name With Many Modifiers And Revisions',
      twinLines: [
        'Pneumatochromatographically-calibrated housing',
        'Response 8 Hz to 40 kHz across all operating modes',
        'Weight 265 g',
        'Battery 38 h, USB-C fast charging with passthrough',
        'Warranty 5 years',
        'Colours Many',
      ],
    },
    { image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=640&h=800&fit=crop', imageAlt: 'Shoe', twinTitle: 'Tempo', twinLines: [] },
  ],
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: '#0a0b09',
};

export default function Preview() {
  const isWorst = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search).get('worst') === '1', []);
  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <ScanStrip {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
