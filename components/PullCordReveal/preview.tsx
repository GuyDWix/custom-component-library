import { useMemo } from 'react';
import PullCordReveal from './Component';
import type { PullCordRevealProps } from './Component';

const worst: PullCordRevealProps = {
  coverImage: '',
  revealImage: '',
  cordLabel: 'Grand reopening celebrations — this Saturday only',
  offerTitle: 'The Alexandria Montgomery-Vanderhoeven anniversary tasting menu, edition seven',
  offerNote:
    'A five-course celebration of everything the kitchen has learned this year, served family-style with paired cordials and a very long story about the founder.',
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #16100b 0%, #221a11 100%)',
};

export default function Preview() {
  const params = useMemo(
    () => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search),
    [],
  );
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <PullCordReveal {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
