import '@fontsource/gloock/400.css';
import { useMemo } from 'react';
import LazySusanMenu from './Component';
import type { LazySusanItem } from './Component';

const worstItems: LazySusanItem[] = [
  {
    image: '',
    name: 'Grilled octopus with smoked paprika aioli, confit fingerling potatoes and charred lemon',
    price: '€1,240.50',
  },
  {
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=560&h=560&fit=crop&q=80',
    name: 'Margherita di bufala con fior di latte fresco e basilico dal giardino della nonna',
    price: 'CHF 16.90',
  },
  {
    image: '',
    name: '',
    price: '$0',
  },
  {
    image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=560&h=560&fit=crop&q=80',
    name: 'Tagliatelle al ragù bianco di maiale, salvia e parmigiano ventiquattro mesi',
    price: '£19.00',
  },
  {
    image: '',
    name: 'A',
    price: 'Price upon request at the counter, please ask our staff for today’s selection',
  },
  {
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=560&h=560&fit=crop&q=80',
    name: 'Harvest grain bowl with roasted delicata squash, pomegranate molasses and whipped feta',
    price: '$14',
  },
  {
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=560&h=560&fit=crop&q=80',
    name: 'Seared duck breast, cherry jus, celeriac purée and a jus gras finishing',
    price: '€26',
  },
  {
    image: '',
    name: 'Vanilla panna cotta with roasted strawberry and cracked black pepper',
    price: '$9',
  },
  {
    image: '',
    name: 'Sourdough with cultured butter and smoked sea salt',
    price: '$6',
  },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <LazySusanMenu items={isWorst ? worstItems : undefined} />
      </div>
    </div>
  );
}
