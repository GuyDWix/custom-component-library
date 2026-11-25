import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import { useMemo } from 'react';
import MatBoardFrame from './Component';
import type { MatBoardFrameProps } from './Component';

const worst: MatBoardFrameProps = {
  image: '',
  contentText:
    'Our tasting menu changes with every market morning: eleven small courses, built around whatever the boats and the hill farms bring in before dawn, served at one long table',
  title: 'The Extraordinarily Long Seasonal Tasting Menu with Paired Natural Wines from Llanfairpwllgwyngyll',
  price: '€12,450.00 per table of twelve guests',
  note:
    'Booked for private parties only, Thursday to Saturday. Every course is adjusted for allergies when you tell us at least seventy-two hours ahead; the wine pairing can be swapped for our zero-proof fermentation flight. A twenty percent deposit secures the date and is fully refundable until fourteen days before the dinner.',
  matColor: '#dfe3dc',
  frameFinish: 'walnut',
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: '#0b0d10',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <MatBoardFrame {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
