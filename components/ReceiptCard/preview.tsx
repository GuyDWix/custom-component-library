import { useMemo } from 'react';
import ReceiptCard from './Component';
import type { ReceiptItem } from './Component';

const worstItems: ReceiptItem[] = [
  { name: 'Extra-large oat milk cappuccino with an additional shot of single-origin Ethiopian espresso and cinnamon', price: 7.85 },
  { name: 'Tea', price: 2 },
  { name: 'Smoked salmon, crème fraîche and dill on toasted sourdough', price: 14.5 },
  { name: 'Gift wrapping (no charge)' },
  { name: 'Croissant', price: 3.8 },
  { name: 'Pain au chocolat', price: 3.9 },
  { name: 'Seasonal fruit bowl with granola, honey and Greek yoghurt', price: 9.25 },
  { name: 'Sparkling water 750ml', price: 4 },
  { name: 'Banana bread', price: 3.6 },
  { name: 'Catering platter for twelve people', price: 1249.99 },
  { name: 'Iced matcha', price: 5.5 },
  { name: 'Takeaway cup deposit', price: 0.5 },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #efe6da 0%, #f6f1ea 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1100 }}>
        <ReceiptCard
          {...(worst
            ? {
                title: 'The Very Long Named Neighbourhood Bakery & Coffee Roasters',
                subtitle: '1847 Westminster Bridge Road, Unit 12B, Riverside Market Hall',
                meta: '',
                items: worstItems,
                totalLabel: 'Amount due including service',
                currency: 'CHF ',
                footerNote: 'Thank you for visiting! Bring this receipt back within thirty days for a free pastry with any hot drink.',
              }
            : {})}
        />
      </div>
    </div>
  );
}
