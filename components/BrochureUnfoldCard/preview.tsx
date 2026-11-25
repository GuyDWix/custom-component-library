import '@fontsource/epilogue/400.css';
import '@fontsource/epilogue/500.css';
import '@fontsource/epilogue/700.css';
import '@fontsource/epilogue/800.css';
import { useMemo } from 'react';
import BrochureUnfoldCard from './Component';
import type { BrochurePanel } from './Component';

const worstPanels: BrochurePanel[] = [
  {
    title: 'The Grand Seven-Island Slow Travel Collection for Curious Families',
    text: 'Three small-group escapes for travellers who like to take it slow, with hand-picked stays, local guides, long lunches, early ferries, optional hikes, a private tasting every evening and absolutely no rushing between any of the stops along the way.',
    image: '',
    imageAlt: '',
  },
  {
    title: 'Dolomites-by-Boat-and-Mountain-Trail Experience',
    text: 'Five nights in a lakeside lodge, with mornings paddling glass-flat water, afternoons on mountain trails, evenings at one long shared table, breakfast included on every single day, plus a shuttle from the nearest station and a packed lunch whenever you want one.',
    image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=900&h=900&fit=crop&q=75',
    imageAlt: 'A wooden rowing boat on a green alpine lake below grey peaks',
  },
  {
    title: 'Utah',
    text: '',
    image: '',
    imageAlt: '',
  },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  alignContent: 'center',
  background: '#161b0e',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <BrochureUnfoldCard {...(worst ? { panels: worstPanels } : {})} />
    </div>
  );
}
