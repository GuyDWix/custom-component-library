import { useMemo } from 'react';
import DayNightMenuSwitch from './Component';
import type { DayNightMenuItem } from './Component';

const worstDay: DayNightMenuItem[] = [
  {
    name: 'Slow-roasted heritage tomato and burrata salad with basil oil',
    description:
      'Grown by the Castellanos family two valleys over, served with warm sourdough focaccia, toasted pistachio crumble, aged balsamic and a generous drizzle of cold-pressed olive oil.',
    price: '$1,240.00',
  },
  { name: 'Citrus-cured Mediterranean sea bream crudo', description: 'Shaved fennel, blood orange, pink peppercorn', price: '$19' },
  { name: 'Wild mushroom tartine', description: '', price: '$15' },
  { name: 'Saffron risotto with roasted lemon and brown butter', description: 'Parsley, parmesan crisp, preserved lemon rind', price: '$21' },
  { name: 'Charred peach & burrata', description: 'Basil oil, toasted pistachio, warm focaccia', price: '$16' },
  { name: 'Grilled halloumi flatbread', description: 'Whipped feta, honey, chilli, mint and sumac onions', price: '$17' },
  { name: 'Chilled cucumber and buttermilk soup', description: 'Dill oil, toasted rye, pickled mustard seed', price: '$13' },
];

const worstEvening: DayNightMenuItem[] = [
  {
    name: 'Twenty-hour slow-braised short rib with black garlic jus',
    description:
      'Charred shallot, whipped celeriac, horseradish cream and a glaze that takes two days to reduce, plated with seasonal greens and bone-marrow butter.',
    price: '$134.00 per table',
  },
  { name: 'Hand-rolled pappardelle with duck ragu', description: 'Orange zest, rosemary, parmesan', price: '$27' },
  { name: 'Whole roasted cauliflower', description: '', price: '$24' },
  { name: 'Burnt honey tart with cultured cream', description: 'Smoked sea salt, bee pollen, thyme', price: '$12' },
  { name: 'Roast hen of the woods mushroom', description: 'Barley, sherry, shaved winter truffle and crispy sage', price: '$29' },
  { name: 'Dry-aged duck breast', description: 'Cherry, fennel pollen, charred endive, jus', price: '$38' },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  padding: 'clamp(8px, 1.6vw, 20px)',
  background: '#ece4dc',
};

export default function Preview() {
  const worst = useMemo(
    () => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search).get('worst') === '1',
    [],
  );

  return (
    <div style={stage}>
      {worst ? (
        <DayNightMenuSwitch
          dayLabel="Weekday midday tasting"
          eveningLabel="Late evening supper club"
          dayTitle="The Extraordinarily Long Midday Table"
          eveningTitle="Candlelit Neighbourhood Supper Experience"
          dayHours="Served Monday to Friday, 12:00 – 15:30, last orders at 15:00"
          eveningHours="Served Tuesday to Sunday, 18:00 – late, booking advised"
          dayNote="Terrace tables, long golden light and a very generous set of seasonal specials for everyone"
          eveningNote="Candles are lit at six, the kitchen takes its last order after the second sitting"
          dayItems={worstDay}
          eveningItems={worstEvening}
        />
      ) : (
        <DayNightMenuSwitch />
      )}
    </div>
  );
}
