import '@fontsource/bricolage-grotesque/400.css';
import '@fontsource/bricolage-grotesque/600.css';
import '@fontsource/bricolage-grotesque/800.css';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/700.css';
import { useMemo } from 'react';
import InkSwatchProduct from './Component';
import type { InkSwatchProductProps } from './Component';

const worst: InkSwatchProductProps = {
  title: 'Alexandria Montgomery-Vanderhoeven-Castellanos Signature Colourways Collection',
  variants: [
    { name: 'Vermilion Ember Dusk', color: '#b23a2b', image: '' },
    { name: 'Deep Indigo Midnight', color: '#2c4bb0', image: '' },
    { name: 'Burnt Ochre Canyon', color: '#c07a2b', image: '' },
    { name: 'Moss Fermented Indigo', color: '#5a7048', image: '' },
    { name: 'Powdered Ash Rose', image: '' },
    { name: 'Charcoal Smoke Slate', color: '#4a4a48', image: '' },
    { name: 'Faded Turmeric', color: '#c9a03a', image: '' },
    { name: 'Extremely Long Pigment Name Field', image: '' },
  ],
  defaultIndex: 0,
  swatchShape: 'square',
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #efece5 0%, #e4e0d6 100%)',
};

export default function Preview() {
  const params = useMemo(
    () => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search),
    [],
  );
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1160 }}>
        <InkSwatchProduct {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
