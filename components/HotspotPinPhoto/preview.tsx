import { useMemo } from 'react';
import HotspotPinPhoto from './Component';
import type { HotspotPinPhotoPin } from './Component';

const worstPins: HotspotPinPhotoPin[] = [
  {
    x: 0,
    y: 0,
    title: 'Corner Shelf Unit With Integrated Warm-LED Lighting System',
    text: 'Solid European oak with a hand-rubbed oil finish, four tiers, integrated warm-LED strip, 180 cm wide — €2,499 including free delivery and assembly anywhere on the mainland',
    link: 'https://example.com/corner-shelf-unit',
  },
  {
    x: 100,
    y: 100,
    title: 'Alexandria Montgomery-Vanderhoeven-Castellanos',
    text: 'Senior Vice President of Global Partnerships, Strategic Customer Experience and Limited Edition Collaborations, Internationalisation Holdings',
  },
  { x: 50, y: 50, title: '', text: '' },
  { x: 100, y: 0, title: 'Only a title, no further text at all' },
  { x: 0, y: 100, title: '', text: 'No title, just a longish piece of text that wraps across several lines inside the paper note card', link: 'https://example.com/untitled-piece' },
  { x: 8, y: 40, title: 'Wall Basket', link: 'https://example.com/wall-basket' },
  { x: 92, y: 42, title: 'Throw Blanket, heavyweight wool, stone grey, 130 × 180 cm, €189', text: '' },
  { x: 30, y: 12, title: 'Pendant Lamp', text: 'Opal glass — €129' },
  { x: 70, y: 88, title: 'Side Table', text: 'Ash burl, 45 cm — €349', link: 'https://example.com/side-table' },
];

const worst = {
  caption:
    'The complete autumn lookbook, photographed over three days at Studio Nordheim in Copenhagen by Alexandria Montgomery-Vanderhoeven-Castellanos',
  pins: worstPins,
};

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
      <div style={{ width: '100%', maxWidth: 1100 }}>
        <HotspotPinPhoto {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
