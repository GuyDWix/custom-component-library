import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/600.css';
import { useMemo } from 'react';
import ContactSheetGallery, { defaultPhotos } from './Component';
import type { ContactSheetPhoto } from './Component';

const longCaption =
  'The whole family on the pier just after the rain stopped, everyone squinting into a sun that came out for exactly four minutes before disappearing again for the rest of the afternoon';

const worstPhotos: ContactSheetPhoto[] = Array.from({ length: 23 }, (_, i) => {
  const base = defaultPhotos[i % defaultPhotos.length];
  if (i % 5 === 1) return { image: base.image };
  if (i % 5 === 3) return { image: base.image, caption: longCaption, picked: i === 3 };
  if (i === 7) return { image: base.image, caption: 'Unbreakable_filename_DSC_000000000000000000000000000000000007.jpg' };
  return { ...base, picked: i === 12 };
});

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: '#f4f4f2',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <ContactSheetGallery
          {...(worst
            ? {
                photos: worstPhotos,
                rollLabel: 'Roll 0000000000000000000000000017 · Daylight 400 · Proof sheet, do not crop',
              }
            : {})}
        />
      </div>
    </div>
  );
}
