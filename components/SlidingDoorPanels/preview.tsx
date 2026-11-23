import { useMemo } from 'react';
import SlidingDoorPanels from './Component';
import type { SlidingDoorImage } from './Component';

const worstImages: SlidingDoorImage[] = [
  {
    image: '',
    caption: '',
    alt: '',
  },
  {
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1600&auto=format&fit=crop',
    caption:
      'A remarkably long caption written for the worst case, the sort of line a zealous copywriter produces when nobody sets a character limit, and it keeps running well past the width of the plaque and forcing several wrapped lines of sumi ink on rice paper',
    alt: 'Sunlight falling through a green forest',
  },
  {
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1600&auto=format&fit=crop',
    caption: '',
    alt: 'A candlelit restaurant table',
  },
  {
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1600&auto=format&fit=crop',
    caption: 'Alexandria Montgomery-Vanderhoeven-Castellanos hosts the annual gathering of the extended family association',
    alt: 'A calm living room interior',
  },
  {
    image: '',
    caption: 'The room between photographs',
    alt: '',
  },
  {
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1600&auto=format&fit=crop',
    caption: 'From the kitchen: today’s small plates, yesterday’s leftovers and tomorrow’s ambitions, served together on one very long oak table with everything that could not fit on the menu',
    alt: 'Freshly prepared food on a table',
  },
  {
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1600&auto=format&fit=crop',
    caption: 'Evening settles over the courtyard',
    alt: 'A modern house by a pool at dusk',
  },
  {
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1600&auto=format&fit=crop',
    caption: 'A short one',
    alt: 'Mountains under a clear sky',
  },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #f4f2ec 0%, #eae6dc 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <SlidingDoorPanels
          {...(isWorst ? { images: worstImages, panelCount: 10 } : {})}
        />
      </div>
    </div>
  );
}
