import { useMemo } from 'react';
import HangingTagCard from './Component';
import type { HangingTagCardProps } from './Component';

const worst: HangingTagCardProps = {
  title: 'Alexandria Montgomery-Vanderhoeven-Castellanos',
  price: '',
  note: 'This piece is the result of a year-long residency exploring clay dug from the riverbed below the studio, fired twice in a hand-built kiln and finished with a glaze recipe that has been passed down through three generations of makers, so no two pieces ever leave the workshop looking quite the same.',
  stringColor: '#31465e',
  inkColor: '#1e3a2f',
  tagShape: 'round',
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #e9eae6 0%, #dcded9 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <HangingTagCard {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
