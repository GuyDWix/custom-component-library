import '@fontsource/fraunces/300.css';
import '@fontsource/fraunces/300-italic.css';
import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/400-italic.css';
import '@fontsource/jetbrains-mono/300.css';
import '@fontsource/jetbrains-mono/300-italic.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/400-italic.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/500-italic.css';
import { useMemo } from 'react';
import FlipFilterGrid from './Component';
import type { FlipFilterCategory, FlipFilterItem } from './Component';

const worstCategories: FlipFilterCategory[] = [
  { name: 'Fresh seasonal fruit and vegetables' },
  { name: 'Bakery' },
  { name: 'Farmhouse dairy and eggs' },
  { name: 'Pantry staples' },
  { name: 'Cut flowers' },
  { name: 'Hot food' },
  { name: 'Preserves, pickles and ferments' },
  { name: 'Empty shelf' },
];

const u = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

const worstItems: FlipFilterItem[] = [
  { title: 'Hand-picked heritage strawberries from the south-facing terrace field', category: 'Fresh seasonal fruit and vegetables', detail: '$6.50 / 250g punnet', image: u('1464965911861-746a04b4bca6') },
  { title: 'Slow-fermented wholegrain sourdough boule with rosemary and sea salt crust', category: 'Bakery', detail: '$7.00 each', image: u('1486887396153-fa416526c108') },
  { title: 'Blue', category: 'Farmhouse dairy and eggs', image: u('1452195100486-9cc805987862') },
  { title: 'Wildflower honey', category: 'Pantry staples', detail: '$12' },
  { title: 'Vine tomatoes', category: 'Fresh seasonal fruit and vegetables', detail: '$5 / kg' },
  { title: 'Butter croissants', category: 'Bakery', detail: '$3.50', image: u('1555507036-ab1f4038808a') },
  { title: 'Farmhouse wheel of mature cheddar aged for eighteen months', category: 'Farmhouse dairy and eggs', detail: '$14', image: u('1486297678162-eb2a19b0a32d') },
  { title: 'House spice blend', category: 'Pantry staples', detail: '$6', image: u('1506368249639-73a05d6f6488') },
  { title: 'Market veg box', category: 'Fresh seasonal fruit and vegetables', detail: '$22 / box', image: u('1566385101042-1a0aa0c1268c') },
  { title: 'Seeded rye loaf', category: 'Bakery', detail: '$8', image: u('1509440159596-0249088772ff') },
  { title: 'Single-origin beans', category: 'Pantry staples', detail: '$16 / 250g', image: u('1509042239860-f550ce710b93') },
  { title: 'Tropical fruit box', category: 'Fresh seasonal fruit and vegetables', detail: '$18', image: u('1610832958506-aa56368176cf') },
  { title: 'Poppy bunch', category: 'Cut flowers', detail: '$9', image: u('1490750967868-88aa4486c946') },
  { title: 'Pickled things', category: 'Preserves, pickles and ferments' },
  { title: 'Chilli oil', category: 'Preserves, pickles and ferments', detail: '$8 / 150ml' },
  { title: 'Flat white', category: 'Hot food', detail: '$4' },
  { title: 'Unfiled curiosity with no category at all', detail: '$1' },
  { title: 'Apricot jam', category: 'Preserves, pickles and ferments', detail: '$7', image: u('1558642452-9d2a7deb7f62') },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  padding: 'clamp(8px, 2.5vw, 32px)',
};

export default function Preview() {
  const worst = useMemo(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('worst') === '1',
    [],
  );
  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1240, margin: '0 auto' }}>
        {worst ? <FlipFilterGrid items={worstItems} categories={worstCategories} /> : <FlipFilterGrid />}
      </div>
    </div>
  );
}
