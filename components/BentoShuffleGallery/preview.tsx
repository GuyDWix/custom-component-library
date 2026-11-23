import { useMemo } from 'react';
import BentoShuffleGallery from './Component';
import type { BentoPhoto } from './Component';

const worstPhotos: BentoPhoto[] = [
  {
    image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?q=80&w=1200&h=900&fit=crop&auto=format',
    caption: 'The absolutely enormous sharing platter we only serve at the harvest supper club on the last Friday of every month',
  },
  { image: '', caption: 'A photo that is missing its image' },
  {
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1200&h=900&fit=crop&auto=format',
    caption: 'Line-caught sea bream with a rather long list of seasonal accompaniments and sauces',
  },
  { image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1200&h=900&fit=crop&auto=format' },
  {
    image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=1200&h=900&fit=crop&auto=format',
    caption: 'Hand-cut tagliatelle',
    alt: 'Tagliatelle with slow-braised ragu',
  },
  { image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1200&h=900&fit=crop&auto=format', caption: 'Wood-fired flatbread' },
  { image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&h=900&fit=crop&auto=format', caption: 'The pass, Friday service' },
  {
    image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?q=80&w=1200&h=900&fit=crop&auto=format',
    caption: 'Pistachio tart, spring menu, baked by Alexandria Montgomery-Vanderhoeven-Castellanos',
  },
  { image: '', caption: 'Another missing image with a very long caption indeed to test the placeholder tile' },
  { image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1200&h=900&fit=crop&auto=format', caption: 'Sea bream, second angle' },
  { image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1200&h=900&fit=crop&auto=format', caption: 'Grain bowl, again' },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #f6f2e8 0%, #eee7d8 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <BentoShuffleGallery {...(worst ? { photos: worstPhotos, shuffleSeconds: 3, cornerRadius: 8, gap: 6 } : {})} />
      </div>
    </div>
  );
}
