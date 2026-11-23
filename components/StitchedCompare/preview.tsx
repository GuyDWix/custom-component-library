import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import StitchedCompare from './Component';

const stage: CSSProperties = {
  minHeight: '100vh',
  boxSizing: 'border-box',
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #efe8d8 0%, #e0d5bc 100%)',
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
  threadColor: '#31506b',
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
