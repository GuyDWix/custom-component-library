import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import { useMemo } from 'react';
import InlineImagePillText from './Component';
import type { InlineImagePill } from './Component';

const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=960&h=320&fit=crop&q=75`;

const worstSentence =
  'Our extraordinarily-long-hyphenated-signature-tasting-menu travels from sourdough fermented for seventy-two hours, through heirloom tomatoes, cold-pressed olive oil, wood-fired vegetables and hand-rolled pasta, all the way to a long candle-lit table beside the sea where the evening lasts as long as the conversation does.';

const worstPills: InlineImagePill[] = [
  { position: 2, image: img('1414235077428-338989a2e8c0') },
  { position: 6, image: img('1509440159596-0249088772ff') },
  { position: 12, image: img('1546094096-0df4bcaaa337') },
  { position: 15 },
  { position: 15, image: img('1490645935967-10de6ba17061') },
  { position: 16, image: 'https://images.unsplash.com/photo-missing-image' },
  { position: 32, image: img('1507525428034-b723cf961d3e') },
  { position: 99, image: img('1474979266404-7eaacbcd87c5') },
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
        <InlineImagePillText
          {...(worst
            ? {
                sentence: worstSentence,
                pills: worstPills,
                pillHeight: 120,
                label: 'A very long gallery label that keeps going to test how the small caption line wraps',
              }
            : {})}
        />
      </div>
    </div>
  );
}
