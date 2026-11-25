import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/500.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/fraunces/700.css';
import { useMemo } from 'react';
import CurtainRevealCard from './Component';
import type { CurtainRevealCardDetail } from './Component';

const worstDetails: CurtainRevealCardDetail[] = [
  { text: 'Deep double-cleanse and gentle enzyme peel suited to combination, sensitive and sun-stressed skin' },
  { text: 'Lymphatic sculpting massage with warm basalt stones and cold rose-quartz finishing' },
  { text: 'Warm velvet recovery mask with blackcurrant seed oil and aloe ferment' },
  { text: 'Neck, shoulder and scalp release with extended pressure-point work' },
  { text: 'Complimentary herbal tea ceremony and home-care ritual walkthrough' },
  { text: 'Follow-up skin check-in with your assigned aesthetician within two weeks of your visit' },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #171114 0%, #221619 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1040 }}>
        <CurtainRevealCard
          {...(worst
            ? {
                serviceName:
                  'Alexandria Montgomery-Vanderhoeven-Castellanos Signature Evening Restoration Facial for Combination, Sensitive and Sun-Stressed Skin',
                price: '$1,800 per session, gratuity and VAT included',
                duration: '2 hours 45 minutes, including consultation',
                details: worstDetails,
                image: '',
                imageAlt: '',
              }
            : {})}
        />
      </div>
    </div>
  );
}
