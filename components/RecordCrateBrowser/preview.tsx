import { useMemo } from 'react';
import RecordCrateBrowser from './Component';
import type { RecordCrateBrowserProps } from './Component';

const worst: RecordCrateBrowserProps = {
  visibleCount: 8,
  items: [
    {
      image: '',
      title: 'Alexandria Montgomery-Vanderhoeven-Castellanos',
      subtitle:
        'Senior Vice President of Global Partnerships, Strategic Customer Experience and Limited Edition Collaborations, Internationalisation Holdings',
    },
    {
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=640&h=640&fit=crop&auto=format',
      title: 'Extremely Long Album Title That Refuses To End Gracefully At Any Point Whatsoever',
      subtitle: '£999.99 · Mint Condition, Still Sealed, First Pressing With Bonus 12-Inch Disc And Poster',
    },
    { title: 'No Image On This One' },
    {
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=640&h=640&fit=crop&auto=format',
      title: 'Blue Hour Static',
      subtitle: '£12 · NM',
    },
    {
      title: 'The Quietest Recording Ever Pressed Onto A Single Side Of Vinyl',
      subtitle: '£6 · G',
    },
    {
      image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?q=80&w=640&h=640&fit=crop&auto=format',
      title: 'Tide Charts',
    },
    {
      image: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?q=80&w=640&h=640&fit=crop&auto=format',
      title: 'Low Light Room',
      subtitle: '£7.50 · G+',
    },
    { title: 'No', subtitle: '£1' },
    {
      image: 'https://images.unsplash.com/photo-1458560871784-56d23406c091?q=80&w=640&h=640&fit=crop&auto=format',
      title: 'First Verse',
      subtitle: '£11 · VG+',
    },
  ],
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #26221d 0%, #1c1915 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <RecordCrateBrowser {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
