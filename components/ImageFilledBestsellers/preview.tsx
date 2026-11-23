import { useMemo } from 'react';
import ImageFilledBestsellers, { defaultProducts } from './Component';
import type { BestsellerProduct } from './Component';

const worstProducts: BestsellerProduct[] = [
  { name: 'Extra-large hand-laminated triple-chocolate hazelnut praline croissant with sea salt', units: 12345678, photo: defaultProducts[1].photo },
  { name: 'Rye', units: 9876543 },
  { name: 'Pão de queijo tradicional mineiro com queijo canastra curado', units: 4321000, photo: defaultProducts[0].photo },
  { name: 'Matcha 抹茶 latte 🍵', units: 1200000, photo: defaultProducts[2].photo },
  { name: 'Seasonal-wild-foraged-mushroom-and-thyme-galette', units: 640000 },
  { name: 'Margherita', units: 12000, photo: defaultProducts[3].photo },
  { name: 'Grain bowl', units: 3, photo: defaultProducts[4].photo },
  { name: 'Tasting flight of every single seasonal jam we made this summer', units: 0 },
  { name: 'Pancakes', units: 1, photo: defaultProducts[5].photo },
  { name: 'Lemon tart', units: 0 },
  { name: 'Hidden beyond the number shown', units: 0 },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #efe6d6 0%, #f6f1e8 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        {worst ? (
          <ImageFilledBestsellers
            products={worstProducts}
            numberShown={10}
            unitLabel="loaves, pastries and drinks sold this week"
            eyebrow="Our most-loved bakes, brews and seasonal specials across every stall this month"
            heading="The best sellers everybody keeps coming back for"
          />
        ) : (
          <ImageFilledBestsellers />
        )}
      </div>
    </div>
  );
}
