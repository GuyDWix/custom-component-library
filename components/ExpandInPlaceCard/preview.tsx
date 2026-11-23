import { useMemo } from 'react';
import ExpandInPlaceCard from './Component';
import type { ExpandInPlaceCardProps } from './Component';

const worst: ExpandInPlaceCardProps = {
  image: '',
  imageAlt: '',
  title: 'Alexandria Montgomery-Vanderhoeven-Castellanos',
  summary:
    'Senior Vice President of Global Partnerships and Strategic Customer Experience, Internationalisation Holdings, plus an extra long line to stress the two-line clamp of the compact state',
  fullText:
    'Honestly, I did not expect to be writing one of these, because I have worked with a long list of studios over the years and most of them promised the moon and delivered a slightly nicer version of what we already had. This team was different from the very first call: they listened for a full hour before suggesting anything, then came back with three directions that each solved a problem we had not even put into words yet. Launch week was the smoothest we have ever had, and our support inbox has been unusually, almost suspiciously, quiet ever since. I would recommend them to anyone who needs a partner that treats a launch as a beginning rather than a deadline.',
  linkLabel: 'Read the complete service description and booking terms',
  linkUrl: '',
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #10161d 0%, #18222c 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <ExpandInPlaceCard {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
