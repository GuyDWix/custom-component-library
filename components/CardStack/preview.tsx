import '@fontsource/inter/400.css';
import '@fontsource/inter/400-italic.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/700-italic.css';
import { useMemo } from 'react';
import CardStack from './Component';
import type { CardStackCard, CardSurface } from './Component';

const worstCards: CardStackCard[] = [
  {
    quote:
      'Honestly, I did not expect to be writing one of these, because I have worked with a long list of studios over the years and most of them promised the moon and delivered a slightly nicer version of what we already had. This team was different from the very first call: they listened for an hour before suggesting anything, then came back with three directions that each solved a problem we had not even put into words yet. Launch week was the smoothest we have ever had, and our support inbox has been unusually, almost suspiciously, quiet ever since.',
    name: 'Alexandria Montgomery-Vanderhoeven-Castellanos',
    role: 'Senior Vice President of Global Partnerships and Strategic Customer Experience, Internationalisation Holdings',
  },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #e9eef4 0%, #f4f3ef 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';
  const surface = (params.get('surface') as CardSurface | null) ?? 'glass';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <CardStack surface={surface} {...(worst ? { cards: worstCards } : {})} />
      </div>
    </div>
  );
}
