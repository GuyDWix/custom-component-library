import { useMemo } from 'react';
import ClothesPegGallery, { defaultPhotos } from './Component';
import type { ClothesPegPhoto } from './Component';

const worstPhotos: ClothesPegPhoto[] = [
  ...defaultPhotos,
  {
    image: defaultPhotos[1].image,
    caption:
      'The very long and winding caption from the annual Llanfairpwllgwyngyll village midsummer feast, written by an enthusiastic guest who had a lot to say about the cake',
  },
  { image: '', caption: 'Missing photo' },
  { image: defaultPhotos[3].image },
  { image: defaultPhotos[0].image, caption: 'Supercalifragilisticexpialidociousandthensome' },
  ...defaultPhotos.slice(2, 6),
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 0,
  background: '#fbfaf8',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <ClothesPegGallery {...(worst ? { photos: worstPhotos, breezeStrength: 10 } : {})} />
      </div>
    </div>
  );
}
