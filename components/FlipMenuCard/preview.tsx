import { useMemo } from 'react';
import FlipMenuCard from './Component';
import type { FlipMenuCardProps } from './Component';

const worst: FlipMenuCardProps = {
  photo: '',
  dishName: 'Alexandria Montgomery-Vanderhoeven-Castellanos Special Rigatoni',
  price: 'Market price',
  tags: ['Spicy', 'Vegetarian option', 'Gluten-free', 'Contains nuts', 'Contains dairy', "Chef's selection"],
  itemNumber: '247',
  ingredients: [
    'Bucatini',
    'Cured guanciale from the hills near Amatrice',
    'San Marzano tomatoes, crushed by hand',
    'Aged Pecorino Romano',
    'Dried chilli',
    'Extra-virgin olive oil',
    'Black pepper, freshly cracked',
    'A pinch of patience',
  ],
  allergens: ['Gluten', 'Dairy', 'Eggs', 'Tree nuts', 'Sesame'],
  tastingNote:
    'The chilli is a whisper, not a shout — simmer it slowly, stir it once more, and ask for extra pecorino if you like it bold. Nonna always did, and Nonna was never wrong about sauce.',
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #f4eeda 0%, #eae0c2 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <FlipMenuCard {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
