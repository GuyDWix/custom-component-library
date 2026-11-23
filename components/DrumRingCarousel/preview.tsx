import { useMemo } from 'react';
import DrumRingCarousel, { defaultPhotos } from './Component';
import type { DrumPhoto } from './Component';

const worstPhotos: DrumPhoto[] = [
  ...defaultPhotos.map((p, i) => ({
    ...p,
    caption:
      i % 2
        ? 'Retrospective of the Llanfairpwllgwyngyll Collective: twelve years of architectural photography from the northern coastline'
        : p.caption,
  })),
  { image: '', caption: 'Untitled (missing image)' },
  { image: defaultPhotos[2].image, caption: '' },
  ...defaultPhotos.slice(0, 6),
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #0c111d 0%, #05070d 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <DrumRingCarousel {...(worst ? { photos: worstPhotos } : {})} />
      </div>
    </div>
  );
}
