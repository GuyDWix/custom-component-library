import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/500.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import { useMemo } from 'react';
import AddOnChipTotal from './Component';
import type { AddOnChipTotalProps } from './Component';

const worst: AddOnChipTotalProps = {
  heading: 'Personalise every single detail of your bespoke multi-tier wedding celebration centrepiece',
  itemName: 'Five-tier Sicilian pistachio and Madagascan vanilla bean wedding cake with hand-piped buttercream lacework',
  itemPrice: 1249.5,
  currency: 'CHF ',
  summaryTitle: 'Your complete order summary for collection',
  totalLabel: 'Estimated total including all selected extras',
  buttonLabel: 'Continue to reserve your collection slot and confirm the order',
  buttonLink: '',
  addOns: [
    { name: 'Raspberry coulis', price: 4, selected: true },
    { name: 'Edible 24-carat gold leaf applied by hand across every tier', price: 129.99, selected: true },
    { name: 'Rose', price: 6 },
    { name: 'Handwritten calligraphy message plaque in white chocolate', price: 18 },
    { name: 'Extra cream layer', price: 7, selected: true },
    { name: 'Gift box & ribbon', price: 5 },
    { name: 'Llanfairpwllgwyngyllgogerychwyndrobwllllantysiliogogogoch delivery', price: 1200 },
    { name: 'Candles', price: 2 },
    { name: 'Sparklers ×12', price: 9.5 },
    { name: 'Allergen-free stand', price: 35 },
    { name: 'Fresh berries crown', price: 22 },
    { name: 'Cake knife', price: 0 },
    { name: 'Macaron tower topper with seasonal flavours', price: 64 },
    { name: 'Thank-you cards (50)', price: 30 },
  ],
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #f1ede4 0%, #e8ece0 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1040 }}>
        <AddOnChipTotal {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
