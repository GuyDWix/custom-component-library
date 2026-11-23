import { useMemo } from 'react';
import ServingScaleCard from './Component';
import type { ServingScaleCardProps } from './Component';

const worst: ServingScaleCardProps = {
  image: '',
  eyebrow: 'Sunday family feast · serves a crowd · make-ahead friendly · 3 hours 45 minutes',
  title: 'Slow-braised Moroccan-spiced lamb shoulder with preserved lemon, apricots and herbed giant couscous',
  baseServings: 12,
  ingredients: [
    { name: 'Bone-in lamb shoulder, trimmed of excess fat and scored', amount: 2.4, unit: 'kg' },
    { name: 'Preserved lemons, flesh discarded, rind finely sliced', amount: 3, unit: 'whole' },
    { name: 'Dried apricots', amount: 250, unit: 'g' },
    { name: 'Ras el hanout', amount: 2.5, unit: 'heaped tablespoons' },
    { name: 'Saffron threads, bloomed in warm water', amount: 0.25, unit: 'tsp' },
    { name: 'Chicken or vegetable stock', amount: 1.5, unit: 'litres' },
    { name: 'Giant couscous', amount: 900, unit: 'g' },
    { name: 'Flat-leaf parsley, coriander and mint, roughly chopped', amount: 1, unit: 'large bunch' },
    { name: 'Toasted flaked almonds', amount: 75, unit: 'g' },
    { name: 'Pomegranate seeds' },
    { name: 'Salt and freshly ground black pepper', unit: 'to taste' },
  ],
  methodNote:
    'Rub the lamb with the spices the night before. Brown it hard in a heavy casserole, add the stock, lemons and apricots, cover and braise at 160°C for three and a half hours, basting every hour, until the meat falls away from the bone. Rest for twenty minutes while the couscous cooks, then fold through the herbs and scatter with almonds and pomegranate.',
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #ece7dc 0%, #e3e6ee 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 880 }}>
        <ServingScaleCard {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
