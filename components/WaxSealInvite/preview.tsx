import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import { useEffect, useMemo, useRef } from 'react';
import WaxSealInvite from './Component';
import type { WaxSealInviteProps } from './Component';

const worst: WaxSealInviteProps = {
  heading: 'The Montgomery-Vanderhoeven-Castellanos Midsummer Garden Supper and Annual Founders Celebration',
  text: 'Join us for an unhurried long-table dinner in the walled garden behind the old orangery: six seasonal courses from our kitchen, natural wines from small growers across the valley, a string trio until the light goes, then coffee, petits fours and candlelight in the glasshouse until very late. Dress is garden-party smart; flat shoes are wise on the lawn. Vegetarian and allergy-friendly menus on request.',
  dateLine: 'Saturday 14 June 2027 · arrivals from 6.30 pm, dinner seated at 7.15 pm sharp',
  sealInitials: 'MVC',
  sealColor: '#c2352a',
  envelopeColor: '#22304f',
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #0b0d14 0%, #07080c 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';
  const startOpen = isWorst || params.get('open') === '1';
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (startOpen) ref.current?.querySelector('button')?.click();
  }, [startOpen]);

  return (
    <div style={stage}>
      <div ref={ref} style={{ width: '100%', maxWidth: 880 }}>
        <WaxSealInvite {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
