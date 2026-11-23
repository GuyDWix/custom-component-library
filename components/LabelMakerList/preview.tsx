import { useMemo } from 'react';
import LabelMakerList from './Component';
import type { LabelMakerListProps } from './Component';

const worst: LabelMakerListProps = {
  labels: [
    'Dichlorodifluoromethane',
    'Senior Vice President of Global Partnerships, Strategic Customer Experience and Limited Edition Collaborations, Internationalisation Holdings',
    'X',
    'Hydrofluorocarbon refrigerant recovery and certified disposal',
    'Engraving',
    'Notary',
    'Watch batteries',
    'Ultrasonic cleaning',
    'Blade sharpening',
    'Film scanning',
    'Repairs while you wait',
    'Gift wrapping',
    'Antler classification',
  ],
  stripsPerRow: 2,
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: '#f2f1ec',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <LabelMakerList {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
