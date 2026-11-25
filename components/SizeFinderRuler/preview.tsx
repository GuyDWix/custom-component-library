import '@fontsource/barlow/400.css';
import '@fontsource/barlow/600.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import { useMemo } from 'react';
import SizeFinderRuler from './Component';
import type { SizeFinderRulerProps, SizeRange } from './Component';

const worstNote =
  'Cut generously through the body with a longer hem and a relaxed shoulder, so most customers who sit between two sizes are happier going down one. Layering underneath is comfortable, and the fabric relaxes a little after the first wash, so check the care label before you tumble dry it.';

const worstSizes = [
  'XXS Petite',
  'XS Petite',
  'Small Regular',
  'Medium Regular',
  'Large Regular',
  'Large Tall',
  'Extra Large Tall',
  '2XL Tall Wide',
  '3XL Tall Wide',
  '4XL Tall Extra Wide',
  '5XL Made to order',
];

const worstRanges: SizeRange[] = worstSizes.map((size, i) => ({
  from: 32 + i * 2,
  to: 33.9 + i * 2,
  size,
  note: i % 3 === 0 ? worstNote : 'Fits true to size. Check the care label before washing.',
}));

const worst: SizeFinderRulerProps = {
  measurementLabel:
    'Chest circumference, measured around the fullest part of your chest, under your arms and across your shoulder blades',
  unit: 'in',
  sizeLabel: 'Our recommended size for your measurement',
  ranges: worstRanges,
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(12px, 3vw, 40px)',
  background: '#e9e7e0',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <SizeFinderRuler {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
