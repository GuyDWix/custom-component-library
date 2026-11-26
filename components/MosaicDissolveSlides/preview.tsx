import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import { useMemo } from 'react';
import MosaicDissolveSlides from './Component';
import type { MosaicDissolveSlidesProps, MosaicSlide } from './Component';

const worstSlides: MosaicSlide[] = [
  {
    src: '',
    alt: 'An empty source with only this very long alternative description standing in for a missing caption on the opening slide of the slideshow',
  },
  {
    src: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'White concrete facade with deep vertical fins',
    caption:
      'Lumen House — façade study, south light, second iteration with revised fin spacing and a longer note about the lime render and the acoustic baffles that runs well past what the placard was meant to hold',
  },
  {
    src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'Open living hall with warm plaster walls and a timber stair',
    caption: 'Living hall',
  },
  {
    src: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'Soft daylight falling across a white building core',
  },
  {
    src: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'Studio interior with a long timber worktable',
    caption:
      'Alexandria Montgomery-Vanderhoeven-Castellanos Memorial Studio Fit-Out, Marais — studio floor, joinery and lighting package',
  },
  {
    src: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'Glass office tower against a clear sky',
    caption: 'Northbank — east elevation',
  },
  {
    src: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1200&h=800&fit=crop&auto=format',
    alt: 'Bright office lounge with meeting tables',
    caption: 'Northbank — reception lounge',
  },
  {
    src: '',
    alt: 'Another empty source slide without a caption, relying entirely on this alternative text',
    caption: '',
  },
];

const worst: MosaicDissolveSlidesProps = {
  slides: worstSlides,
  tileSize: 28,
  advanceSeconds: 2.5,
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
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <MosaicDissolveSlides {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
