import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/400-italic.css';
import '@fontsource/fraunces/500.css';
import '@fontsource/fraunces/500-italic.css';
import '@fontsource/fraunces/700.css';
import '@fontsource/fraunces/700-italic.css';
import { useMemo } from 'react';
import MarkerHighlightHeadline from './Component';
import type { MarkerHighlightHeadlineProps } from './Component';

const variants: MarkerHighlightHeadlineProps[] = [
  {},
  {
    kicker: 'Spring menu',
    headline: 'Slow bread, wild greens and a very good reason to stay late.',
    markedWords: [{ phrase: 'wild greens' }, { phrase: 'stay late' }],
    markStyle: 'underline',
    markerColor: '#ff7a3d',
  },
  {
    kicker: '',
    headline: 'Three days. One city. Zero boring talks.',
    markedWords: [{ phrase: 'Zero' }],
    markStyle: 'circle',
    markerColor: '#3d7bff',
  },
];

const worst: MarkerHighlightHeadlineProps = {
  kicker: 'Annual report of the International Association of Extraordinarily Long Organisation Names, volume twelve',
  headline:
    'We rebuilt the Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch booking flow from scratch so that every single customer, everywhere in the world, can finally check out in under thirty seconds without ever talking to a human being',
  markedWords: [
    { phrase: 'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch booking flow' },
    { phrase: 'every single customer, everywhere in the world' },
    { phrase: 'thirty seconds' },
    { phrase: 'not in the headline' },
    { phrase: '' },
    { phrase: 'human' },
  ],
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #efece4 0%, #e6e2d6 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200, display: 'grid', gap: 24 }}>
        {isWorst ? (
          <MarkerHighlightHeadline {...worst} />
        ) : (
          variants.map((v, i) => <MarkerHighlightHeadline key={i} {...v} />)
        )}
      </div>
    </div>
  );
}
