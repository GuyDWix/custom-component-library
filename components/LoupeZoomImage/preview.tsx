import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/600.css';
import '@fontsource/instrument-sans/700.css';
import { useMemo } from 'react';
import LoupeZoomImage from './Component';
import type { LoupeZoomImageProps } from './Component';

const worst: LoupeZoomImageProps = {
  image: '',
  caption: 'Alexandra-Marietta Vanderveld-Sonnenberg, Atelier of Contemporary Horology and Micro-Mechanics',
  detail:
    'Polished silver case with a hand-engraved bezel, white enamel dial with black Roman numerals, blued steel hands, hand-wound manufacture movement, 42 hours power reserve',
  loupeSize: 440,
  zoom: 4,
  aspectRatio: '16 / 9',
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
      <div style={{ width: '100%', maxWidth: 1020 }}>
        <LoupeZoomImage {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
