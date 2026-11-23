import { useMemo } from 'react';
import EmbroideredWord from './Component';
import type { EmbroideredWordProps, StitchStyle } from './Component';

const worst: EmbroideredWordProps = {
  text: 'Handmade in small batches at our seaside studio since 1987, Llanfairpwllgwyngyll',
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #f3efe8 0%, #ebe5da 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';
  const stitchStyle = (params.get('style') as StitchStyle | null) ?? 'satin';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1100 }}>
        <EmbroideredWord stitchStyle={stitchStyle} {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
