import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/600.css';
import '@fontsource/instrument-sans/700.css';
import { useMemo } from 'react';
import CubeFacesCard from './Component';
import type { CubeFacesCardProps } from './Component';

const worst: CubeFacesCardProps = {
  faces: [
    {
      icon: 'overview',
      label: 'Overview of everything we do',
      title: 'An extraordinarily long headline about a private afternoon at the potter’s wheel in our Lisbon studio',
      body: 'Throw, trim and glaze your own complete set of bowls, plates, mugs and serving dishes with a patient studio potter beside you at every single step of the process, with clay, tools, aprons and firing all included.',
      figure: '3 hrs 45 min',
      figureNote: 'per session, for up to four people at a time, including a break for tea',
    },
    {
      icon: 'process',
      label: 'Process',
      title: 'From wet clay to glazed piece',
      body: '',
      figure: '10 days',
      figureNote: '',
    },
    {
      icon: 'price',
      label: 'Price and what is included',
      title: 'One price',
      body: 'Clay, glazes, two firings and a studio potter at your side.',
      figure: '',
      figureNote: '',
    },
    {
      icon: 'proof',
      label: 'Proof',
      title: 'Loved by 1,200 guests',
      body: 'Supercalifragilisticexpialidocious-quality feedback from guests across Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch.',
      figure: '4.9/5 stars',
      figureNote: 'from 312 reviews',
    },
  ],
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(12px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #eef0f5 0%, #e3e6ee 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <CubeFacesCard {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
