import { useMemo } from 'react';
import ThemeLensReviews from './Component';
import type { ThemeLensReview, ThemeLensTheme } from './Component';

const longText =
  'I have eaten at a frankly embarrassing number of neighbourhood places over the past decade and most of them blur together, but this one stuck with me for weeks afterwards. Our server, who had clearly been on her feet since breakfast, still found time to walk us through the whole menu twice without a hint of impatience. The braised short rib was cooked perfectly and the sauce had that deep, glossy, slow-simmered taste you only get when somebody genuinely cares. We waited maybe forty minutes for mains on a packed Saturday, which nobody minded because the bread kept arriving. The bill was higher than our usual spot but honestly worth every penny for an evening like that.';

const worstReviews: ThemeLensReview[] = [
  { text: longText, name: 'Alexandria Montgomery-Vanderhoeven-Castellanos', detail: 'Celebrating a very long overdue reunion with eleven cousins from four different countries' },
  { text: 'Fine.', name: 'Bo' },
  { text: 'Pricey but the staff are lovely and the coffee is excellent', name: 'Χριστίνα Παπαδοπούλου' },
  { text: 'Superbly attentive service!!! Everything arrived fast and fresh 🍋🍋', name: 'Ngozi Adebayo-Williams', detail: 'Brunch' },
  { text: 'Nothing about this review mentions any of the themes at all, it is just about the music and the lighting in the back room.', name: 'Lee', detail: 'Drinks' },
  { text: 'A reasonable price for very fresh fish. The wait was short.', name: 'Pedro Henrique Albuquerque de Souza Junior' },
  { text: 'Staff were quick to fix a mistake with our order and did not charge for it.', name: 'Mia', detail: 'Takeaway' },
  { text: longText.slice(0, 260), name: 'Siobhán Ní Bhriain' },
];

const worstThemes: ThemeLensTheme[] = [
  { label: 'Service and hospitality from the floor team', keywords: 'server, staff, attentive, service, lovely' },
  { label: 'Price', keywords: 'price, pricey, bill, worth, charge' },
  { label: 'Speed', keywords: 'fast, quick, wait, minutes' },
  { label: 'Quality', keywords: 'fresh, perfectly, excellent, taste' },
  { label: 'Atmosphere', keywords: 'music, lighting, room' },
  { label: 'Accessibility for wheelchairs and prams', keywords: 'wheelchair, ramp, pram' },
  { label: 'Empty', keywords: '' },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(12px, 3vw, 48px)',
  background: '#f2f3f6',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1240 }}>
        <ThemeLensReviews {...(worst ? { reviews: worstReviews, themes: worstThemes } : {})} />
      </div>
    </div>
  );
}
