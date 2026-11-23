import { useMemo } from 'react';
import DevelopingPolaroidRow, { defaultPhotos } from './Component';
import type { DevelopingPolaroidPhoto } from './Component';

const worstPhotos: DevelopingPolaroidPhoto[] = [
  {
    image: defaultPhotos[1].image,
    caption:
      'Grandma Montgomery-Vanderhoeven’s ninetieth birthday dinner at the old harbour restaurant, everyone squeezed round one table',
  },
  { image: '', caption: 'this one never developed' },
  { image: defaultPhotos[3].image },
  { image: defaultPhotos[0].image, caption: 'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch' },
  ...defaultPhotos,
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #f3efe8 0%, #ebe6dd 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <DevelopingPolaroidRow {...(isWorst ? { photos: worstPhotos } : {})} />
      </div>
    </div>
  );
}
