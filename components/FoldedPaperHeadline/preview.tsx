import { useMemo } from 'react';
import FoldedPaperHeadline from './Component';
import type { FoldedPaperHeadlineProps } from './Component';

const worst: FoldedPaperHeadlineProps = {
  headline: 'Alexandria Montgomery-Vanderhoeven Presents the Annual Origami & Craft Symposium 2026',
  foldCount: 9,
};

// The component is a full-bleed band on its own cream ground; the stage just centers it.
const stage = {
  minHeight: '260vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  alignContent: 'space-around',
  background: '#f0e5cf',
};

const hint = {
  margin: 0,
  padding: '40vh 16px',
  textAlign: 'center' as const,
  font: '600 14px/1.4 system-ui, sans-serif',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: '#16120f',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <p style={hint}>Scroll to fold and unfold</p>
      <FoldedPaperHeadline {...(isWorst ? worst : {})} />
      <p style={hint}>Scroll back up to refold</p>
    </div>
  );
}
