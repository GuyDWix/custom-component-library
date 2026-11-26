import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import { useMemo } from 'react';
import PortraitCallouts from './Component';
import type { PortraitCalloutsProps } from './Component';

const worst: PortraitCalloutsProps = {
  image: '',
  name: 'Alexandria Montgomery-Vanderhoeven-Castellanos',
  role: 'Founder, executive head chef and part-time forager-in-residence, The Long Table Supper Club and Cookery School',
  callouts: [
    { label: 'Years in the trade', text: 'Twenty-seven years across eleven kitchens on three continents, from Lyon to Lima' },
    { label: 'Favourite tool', text: 'A hand-forged carbon-steel gyuto knife, sharpened every single Sunday morning' },
    { label: 'Signature piece', text: 'Smoked beetroot tartare with horseradish snow' },
    { label: 'An unreasonably long label for a callout fact', text: 'Supercalifragilisticexpialidociouslyfermentedsourdough' },
    { label: 'Off the clock', text: 'Wild swimming' },
    { label: 'Sixth fact (should be hidden)', text: 'Only five callouts are shown' },
  ],
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
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <PortraitCallouts {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
