import { useMemo } from 'react';
import SeasonRibbon from './Component';
import type { SeasonItem } from './Component';

const worstItems: SeasonItem[] = [
  { name: "Hand-picked heritage Cox's Orange Pippin apples from the walled orchard at Llanfairpwllgwyngyll", firstMonth: 9, lastMonth: 11 },
  { name: 'Wild garlic', firstMonth: 3, lastMonth: 4 },
  { name: 'Year-round sourdough', firstMonth: 1, lastMonth: 12 },
  { name: 'Christmas pudding and mince pie hampers', firstMonth: 11, lastMonth: 12 },
  { name: 'Seville marmalade oranges', firstMonth: 1, lastMonth: 1 },
  { name: 'Jerusalem artichokes', firstMonth: 10, lastMonth: 3 },
  { name: 'Elderflower cordial', firstMonth: 5, lastMonth: 6 },
  { name: 'Pumpkins', firstMonth: 10, lastMonth: 10 },
  { name: 'Rhubarb (forced and field-grown, everything but the turn of the summer)', firstMonth: 12, lastMonth: 11 },
  { name: 'Supercalifragilisticexpialidocious pickled gooseberries', firstMonth: 7, lastMonth: 9 },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'radial-gradient(90% 70% at 20% 0%, #24402e 0%, #14241a 70%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <SeasonRibbon {...(isWorst ? { items: worstItems } : {})} />
      </div>
    </div>
  );
}
