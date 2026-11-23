import { useMemo } from 'react';
import PackageSliderCard from './Component';
import type { PackageSliderStop } from './Component';

const worstStops: PackageSliderStop[] = [
  { name: 'Basic', price: '0', items: '' },
  {
    name: 'Comprehensive Wardrobe Restoration and Alterations Programme',
    price: '1,250,000.50',
    tagline:
      'Everything in the previous tier plus an extraordinarily long description that keeps going well past the point anyone would reasonably stop reading it',
    items:
      'Unlimited emergency same-day alterations for weddings, funerals and other events that absolutely cannot wait\nSupercalifragilisticexpialidociousadjustmentswithoutanyspaces\nHem and cuff adjustments',
  },
  { name: 'Ü', price: 'Price on request', tagline: 'Talk to us.', items: 'Hem and cuff adjustments;Steam press' },
  { name: 'Tailored', price: '340', items: 'Hem and cuff adjustments\nSteam press\nWaist taken in\nOne fitting' },
  { name: 'Made to Measure Plus', price: '890', items: 'Hem and cuff adjustments\nSteam press\nWaist taken in\nTwo fittings\nCloth library' },
  {
    name: 'Bespoke Heritage Collection',
    price: '24000',
    items:
      'Hem and cuff adjustments\nSteam press\nWaist taken in\nTwo fittings\nCloth library\nPaper pattern on file\nHand-stitched buttonholes\nLifetime repairs',
  },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #f3eee5 0%, #e7e0d3 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <PackageSliderCard {...(worst ? { stops: worstStops, currencySymbol: 'CHF ', priceNote: 'per garment, excluding cloth and VAT' } : {})} />
      </div>
    </div>
  );
}
