import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import { useMemo } from 'react';
import SizeAgainstObjects from './Component';
import type { SizeAgainstObjectsProps } from './Component';

const worst: SizeAgainstObjectsProps = {
  image: '',
  productName: 'Handwoven Oversized Merino Wool Weekender Travel Duffel Bag with Leather Trim, Limited Edition Colourway',
  productWidth: 23.6,
  productHeight: 13.8,
  unit: 'in',
  compareLabel: 'Compare it with an everyday object you already know well',
  objects: [
    { object: 'a4', label: 'A4 sheet of printer paper' },
    { object: 'can', label: 'Soda can' },
    { object: 'hand', label: 'Average adult hand, fingers spread' },
    { object: 'mug', label: 'Mug' },
    { object: 'phone', label: 'Phone' },
  ],
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1040 }}>
        <SizeAgainstObjects {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
