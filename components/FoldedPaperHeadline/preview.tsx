import { useMemo } from 'react';
import FoldedPaperHeadline from './Component';
import type { FoldedPaperHeadlineProps } from './Component';

const worst: FoldedPaperHeadlineProps = {
  headline: 'Alexandria Montgomery-Vanderhoeven Presents the Annual Origami & Craft Symposium 2026',
  foldCount: 9,
};

// The component is a full-bleed band. The stage is the studio around it: the band sits centered with a little room above
// and below, and its edges feather into the same dark ground so it reads as one lit scene, not a box on a void.
const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  alignContent: 'center',
  background: 'radial-gradient(90% 70% at 50% 50%, #1b120c 0%, #0e0805 100%)',
};

const feather = {
  WebkitMaskImage: 'linear-gradient(180deg, transparent 0, #000 9%, #000 91%, transparent 100%)',
  maskImage: 'linear-gradient(180deg, transparent 0, #000 9%, #000 91%, transparent 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={feather}>
        <FoldedPaperHeadline {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
