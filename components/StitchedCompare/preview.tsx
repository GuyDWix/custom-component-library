import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import StitchedCompare from './Component';

const stage: CSSProperties = {
  minHeight: '100vh',
  boxSizing: 'border-box',
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: '#faf8f4',
};

const worst = {
  beforeImage: '',
  afterImage: '',
  beforeAlt: 'No before photo supplied yet',
  afterAlt: 'No after photo supplied yet',
  beforeLabel:
    'Before — structural restoration, steam-cleaned beech frame and full re-upholstery in madder-dyed Belgian linen with hand-finished double piping and antique brass hardware',
  afterLabel:
    'After — delivered in six weeks, hand-stitched seams, feather-wrapped cushions and a ten-year workshop guarantee, photographed on delivery day in the client sitting room',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1160 }}>
        <StitchedCompare {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
