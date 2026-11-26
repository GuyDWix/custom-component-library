import '@fontsource/wix-madefor-display/400.css';
import '@fontsource/wix-madefor-display/700.css';
import { useMemo } from 'react';
import HoneycombLens, { defaultPhotos } from './Component';
import type { HoneycombLensPhoto } from './Component';

const longCaption =
  'The long communal table on a late summer evening, laid with the whole harvest and shared with everyone from the neighbourhood until the candles burned out';

const worstPhotos: HoneycombLensPhoto[] = [
  ...defaultPhotos,
  ...defaultPhotos.map((p, i) =>
    i % 3 === 0 ? { ...p, caption: longCaption } : i % 4 === 1 ? { image: p.image } : p,
  ),
  { image: '', caption: 'Missing image' },
  { image: defaultPhotos[0].image, caption: 'Supercalifragilisticexpialidocious-honeycomb-harvest-festival' },
  { image: defaultPhotos[1].image },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <HoneycombLens {...(worst ? { photos: worstPhotos } : {})} />
      </div>
    </div>
  );
}
