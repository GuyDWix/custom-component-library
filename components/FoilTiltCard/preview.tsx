import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import { useMemo } from 'react';
import FoilTiltCard from './Component';
import type { FoilTiltCardProps } from './Component';

const worst: FoilTiltCardProps = {
  image: '',
  title: 'Alexandria Montgomery-Vanderhoeven-Castellanos',
  subtitle:
    'Senior Vice President of Global Partnerships, Strategic Customer Experience and Limited Edition Collaborations, Internationalisation Holdings',
  eyebrow: 'Founding crew and honorary lifetime ambassador of the studio',
  serial: 'No. 1,024 / 10,000',
  details: [
    { label: 'Joined', value: '2019' },
    { label: 'Based in', value: 'Llanfairpwllgwyngyll' },
    { label: 'Kilns fired', value: '1,240,000' },
    { label: 'Exhibitions', value: '38' },
    { label: 'Collaborations', value: 'Many' },
    { label: 'Favourite glaze', value: 'Celadon blue' },
  ],
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #f4f2f6 0%, #ecebe6 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <FoilTiltCard {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
