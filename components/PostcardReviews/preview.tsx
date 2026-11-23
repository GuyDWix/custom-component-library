import { useMemo } from 'react';
import PostcardReviews from './Component';
import type { PostcardReview } from './Component';

const worstReviews: PostcardReview[] = [
  {
    message:
      'Honestly, I did not expect to be writing one of these, because we have eaten our way along this entire coastline over the years and most places promised the world and served a slightly nicer version of what we make at home. This was different from the very first plate: the bread was still warm, the fish had clearly been in the sea that morning, and the waiter talked us out of ordering too much. We came back three nights in a row, brought my in-laws on the fourth, and have recommended you to everyone in our walking club, the choir and the school gate group chat.',
    name: 'Alexandria Montgomery-Vanderhoeven-Castellanos',
    town: 'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch',
  },
  { message: 'Great.', name: 'Bo', town: 'Ely' },
  { message: 'Lovely staff, perfect chips, will be back next summer with the whole family.', name: 'Jean-Baptiste Dubois-Lefèvre', town: 'Saint-Jean-de-Luz' },
  { message: 'Ten out of ten.', name: 'Ana', town: 'Porto' },
  { message: 'We drove up from the city just for lunch and stayed for dinner too.', name: 'Kwame Mensah', town: 'Cape Coast' },
  { message: 'Best oysters this side of the channel.', name: 'Fiona', town: 'Mersea' },
  { message: 'Cosy, kind, delicious.', name: 'Lars Eriksson', town: 'Gothenburg' },
  { message: 'Our anniversary dinner was perfect.', name: 'Mei & Chen', town: 'Kowloon' },
  { message: 'The lemon tart. That is all.', name: 'Rosa', town: 'Amalfi' },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #eef1ee 0%, #f5f1e8 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <PostcardReviews {...(worst ? { reviews: worstReviews, greeting: 'With warmest wishes and greetings all the way from', stampIcon: 'anchor' as const } : {})} />
      </div>
    </div>
  );
}
