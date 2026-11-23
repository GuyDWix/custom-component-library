import { useMemo } from 'react';
import LenticularSwitch from './Component';
import type { LenticularSwitchProps } from './Component';

const worst: LenticularSwitchProps = {
  imageB: '',
  imageAAlt:
    'A very long alternative text for the first photo, written the way a meticulous site owner might describe every last detail of the scene, the weather, the light and the season all at once',
  imageBAlt:
    'An equally very long alternative text for the second photo, which in this worst case is missing entirely and falls back to a flat process-magenta panel',
  stripWidth: 8,
  hint: false,
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #f5f4f1 0%, #e9e6e1 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <LenticularSwitch {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
