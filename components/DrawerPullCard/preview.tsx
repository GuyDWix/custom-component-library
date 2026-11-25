import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/600.css';
import '@fontsource/instrument-sans/700.css';
import { useMemo } from 'react';
import DrawerPullCard from './Component';
import type { DrawerPullCardProps } from './Component';

const worst: DrawerPullCardProps = {
  image: '',
  title: 'The Old Joinery & Cabinet Works of Llanfairpwllgwyngyll',
  subtitle:
    'Bespoke kitchens, fitted wardrobes and heirloom dining tables, made by hand since 1972 under the same slate roof',
  handleLabel: 'Seasonal opening hours and holiday exceptions',
  rows: [
    { label: 'Mon – Thu', value: '17:00 – 23:00' },
    { label: 'Fri – Sat', value: '16:00 – 01:00' },
    { label: 'Sunday', value: '12:00 – 22:00' },
    { label: 'Bank holidays', value: 'By appointment only' },
    { label: 'Workshop visits', value: 'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch' },
    { label: 'Walk-ins', value: 'Bar only, from 16:00' },
    { label: 'Last seating', value: '22:30' },
    { label: 'Commissions', value: 'Open for spring 2027' },
  ],
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(20px, 4vw, 40px)',
  background: '#e6e1d9',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 960 }}>
        <DrawerPullCard {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
