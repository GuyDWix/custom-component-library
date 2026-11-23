import { useMemo } from 'react';
import ShortlistSwipeDeck from './Component';
import type { ShortlistSwipeDeckProps } from './Component';

const longNote =
  'Hand-finished in our workshop from reclaimed timber, upholstered in a heavyweight Belgian linen and delivered fully assembled by a two-person crew who will take away all of the packaging.';

const worst: ShortlistSwipeDeckProps = {
  eyebrow: 'The complete autumn and winter collection for living rooms, studies and libraries',
  keepLabel: 'Add to my shortlist',
  skipLabel: 'Not for me this time',
  trayTitle: 'Everything you have shortlisted so far this visit',
  enquireLabel: 'Send an enquiry about all of these pieces to the studio team',
  doneTitle: 'You have seen every single piece in the collection, thank you for browsing',
  items: [
    { title: 'Alexandria Montgomery-Vanderhoeven Extra-Wide Modular Corner Sofa', note: longNote },
    { image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=720&h=720&fit=crop&auto=format&q=80', title: 'Sofa' },
    { image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=720&h=720&fit=crop&auto=format&q=80', title: 'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch Armchair', note: longNote },
    ...Array.from({ length: 12 }, (_, i) => ({ title: `Occasional piece ${i + 1}`, note: 'Ask us for fabric swatches.' })),
  ],
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #f3efea 0%, #ebe6e1 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <ShortlistSwipeDeck {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
