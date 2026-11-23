import { useMemo } from 'react';
import ImageFilledBestsellers, { defaultProducts } from './Component';
import type { BestsellerProduct } from './Component';

const worstProducts: BestsellerProduct[] = [
  { name: 'Extra-large hand-finished limited collector edition with a very long descriptive name', units: 12345678, photo: defaultProducts[1].photo },
  { name: 'Basic', units: 9876543 },
  { name: 'Edição tradicional artesanal com acabamento especial de coleção', units: 4321000, photo: defaultProducts[0].photo },
  { name: '限定 Limited 抹茶 set 🍵', units: 1200000, photo: defaultProducts[2].photo },
  { name: 'Seasonal-hand-selected-limited-run-collaboration-edition', units: 640000 },
  { name: 'Classic', units: 12000, photo: defaultProducts[3].photo },
  { name: 'Starter set', units: 3, photo: defaultProducts[4].photo },
  { name: 'Sampler of every single seasonal variant we made this summer', units: 0 },
  { name: 'Mini', units: 1, photo: defaultProducts[5].photo },
  { name: 'Lemon', units: 0 },
  { name: 'Hidden beyond the number shown', units: 0 },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: '#e9e9e6',
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
            unitLabel="units sold across every channel this month"
            heading="The best sellers everybody keeps coming back for"
          />
        ) : (
          <ImageFilledBestsellers />
        )}
      </div>
    </div>
  );
}
