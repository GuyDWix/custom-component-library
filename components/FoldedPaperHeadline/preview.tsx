import { useMemo } from 'react';
import FoldedPaperHeadline from './Component';
import type { FoldedPaperHeadlineProps } from './Component';

const worst: FoldedPaperHeadlineProps = {
  headline: 'Alexandria Montgomery-Vanderhoeven Presents the Annual Origami & Craft Symposium 2026',
  foldCount: 9,
};

// The component is a full-bleed band on its own cream ground; the stage just centers it.
const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  alignContent: 'center',
  background: '#f0e5cf',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <FoldedPaperHeadline {...(isWorst ? worst : {})} />
    </div>
  );
}
