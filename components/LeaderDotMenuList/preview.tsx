import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/600-italic.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/cormorant-garamond/700-italic.css';
import { useMemo } from 'react';
import LeaderDotMenuList from './Component';
import type { LeaderDotMenuListProps } from './Component';

const worst: LeaderDotMenuListProps = {
  eyebrow: 'Served every evening from six until the last guest has finished dessert',
  heading: 'The Extraordinarily Long Seasonal Tasting Menu of the Chef',
  currencySymbol: 'CHF ',
  items: [
    {
      name: 'Slow-roasted heritage Gloucestershire Old Spot pork belly with burnt apple purée',
      price: '1,249.50',
      description:
        'A twelve-hour braise finished over embers, served with burnt apple purée, charred hispi cabbage, crackling crumb, pickled mustard seeds, a glossy cider reduction and a small jug of the cooking juices on the side, because honestly nobody ever has enough of them at the table.',
    },
    { name: 'Bouillabaisse', price: '38' },
    { name: 'Pâté', price: '', description: 'House pâté.' },
    { name: 'Supercalifragilisticexpialidociouslylongdishnamewithoutspaces', price: '9', description: 'One word, no breaks.' },
    { name: 'Œufs en meurette', price: '17', description: 'Poached eggs in red wine sauce, lardons, croutons.' },
    { name: 'Salade niçoise', price: '21', description: 'Tuna, olives, green beans, egg, anchovy.' },
    { name: 'Crème brûlée', price: '11', description: 'Vanilla custard, burnt sugar crust.' },
    { name: 'Plateau de fromages', price: '19', description: 'Three French cheeses, walnut bread, quince paste.' },
  ],
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #e8e1d2 0%, #d9d0bd 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 820 }}>
        <LeaderDotMenuList {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
