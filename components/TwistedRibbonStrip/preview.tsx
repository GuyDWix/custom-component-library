import { useMemo } from 'react';
import TwistedRibbonStrip from './Component';
import type { RibbonPhoto } from './Component';

const worst: RibbonPhoto[] = [
  {
    image: '',
    caption:
      'Alexandria Montgomery-Vanderhoeven-Castellanos — Senior Vice President of Global Partnerships, Strategic Customer Experience and Limited Edition Collaborations, Internationalisation Holdings',
  },
  { image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=640&h=840&fit=crop&crop=faces&auto=format', caption: '' },
  { image: '', caption: 'Missing image with a caption that goes on for a while to test the fallback face' },
  { image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=640&h=840&fit=crop&crop=faces&auto=format', caption: 'Mei Tanaka — silk series no. 4' },
  { image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=640&h=840&fit=crop&crop=faces&auto=format', caption: 'Elias Brandt — winter portraits, Berlin' },
  { image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=640&h=840&fit=crop&crop=faces&auto=format', caption: 'Sofia Marchetti — atelier visit, Milan' },
  { image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=640&h=840&fit=crop&crop=faces&auto=format', caption: 'Noa Kim — rooftop study, golden hour' },
  { image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=640&h=840&fit=crop&crop=faces&auto=format', caption: 'Amara Okonkwo — silk study, north light' },
  { image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=640&h=840&fit=crop&crop=faces&auto=format', caption: 'Marcus Oyelaran — studio portrait, one continuous session that ran late into the evening' },
  { image: '', caption: '' },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #eef0ea 0%, #e7e9e2 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <TwistedRibbonStrip {...(isWorst ? { photos: worst, speed: 90 } : {})} />
      </div>
    </div>
  );
}
