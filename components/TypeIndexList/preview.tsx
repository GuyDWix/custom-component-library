import { useMemo } from 'react';
import TypeIndexList from './Component';
import type { TypeIndexRow } from './Component';

const worstRows: TypeIndexRow[] = [
  {
    name: 'Alexandria Montgomery-Vanderhoeven-Castellanos',
    label:
      'Senior Vice President of Global Brand Partnerships and Strategic Storytelling, Internationalisation Holdings',
    image: '',
    link: '',
  },
  {
    name: 'Supercalifragilisticexpialidocious',
    label: 'Identity · Print',
    image: 'https://images.unsplash.com/photo-1481277542470-605612bd2d61?q=75&w=1600&h=1000&fit=crop',
    link: '#long-word',
  },
  {
    name: 'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch Studio',
    label: 'Editorial · Books, typography and unusually long place names',
    image: '',
    link: '#long-name',
  },
  {
    name: 'Kern',
    label: '',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=75&w=1600&h=1000&fit=crop',
  },
  {
    name: 'Gray Harbour',
    label: 'Store · Web',
    image: '',
    link: '#gray-harbour',
  },
  {
    name: 'Nordlys Press',
    label: 'Editorial · Books',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=75&w=1600&h=1000&fit=crop',
    link: '#nordlys-press',
  },
  {
    name: 'Fjell Studio',
    label: 'Art direction',
    image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=75&w=1600&h=1000&fit=crop',
    link: '#fjell-studio',
  },
  {
    name: 'Mono Marathon',
    label: 'Poster series',
    image: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=75&w=1600&h=1000&fit=crop',
    link: '',
  },
  {
    name: 'Salt & Silica',
    label: 'Exhibition',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=75&w=1600&h=1000&fit=crop',
    link: '#salt-silica',
  },
  {
    name: 'Studio Kern',
    label: 'Wayfinding',
    image: '',
    link: '#studio-kern',
  },
  {
    name: 'Halftone House',
    label: 'Print · Zines',
    image: '',
    link: '#halftone-house',
  },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 48px)',
  background: 'linear-gradient(180deg, #dfe2e6 0%, #e9ebee 100%)',
};

export default function Preview() {
  const params = useMemo(
    () => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search),
    [],
  );
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <TypeIndexList
          {...(isWorst ? { rows: worstRows, outlineStrength: 3 } : {})}
        />
      </div>
    </div>
  );
}
