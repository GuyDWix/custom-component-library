import { useMemo } from 'react';
import LogoSpotlightWall from './Component';
import type { LogoSpotlightWallLogo, LogoSpotlightWallProps } from './Component';

const worstLogos: LogoSpotlightWallLogo[] = [
  { name: 'Internationalisation Holdings Worldwide Limited', result: 'Increased qualified enterprise demo requests by 38% across all regions within a single fiscal quarter' },
  { name: 'X', result: '+1' },
  { name: 'Montgomery-Vanderhoeven Castellanos & Partners LLP' },
  { name: 'Photo logo', image: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=320&h=160&fit=crop', result: 'Image logo, shown in grayscale' },
  { name: 'Llanfairpwllgwyngyllgogerychwyrndrobwll', result: 'Supercalifragilisticexpialidocious-level growth' },
  { name: 'Ω', result: '1,000,000,000 orders' },
  { name: '株式会社サンプル', result: '売上が2倍になりました' },
  { name: 'Brightwater', result: '' },
  { name: 'ORBIT', result: 'Churn halved' },
  { name: 'Tessellate', result: '3× sign-ups' },
  { name: 'Kestrel', result: '£1.2M pipeline' },
  { name: 'Quarry', result: 'Tickets down 44%' },
  { name: 'Marlow', result: 'Bookings up 61%' },
  { name: 'Sable & Co.', result: '9 markets' },
];

const worst: LogoSpotlightWallProps = {
  heading:
    'A very long heading listing every single client, partner, sponsor and collaborator we have ever had the pleasure of working with',
  logos: worstLogos,
  columns: 5,
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #f3efe8 0%, #e9e3d9 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <LogoSpotlightWall {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
