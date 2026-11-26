import '@fontsource/anton/400.css';
import { useMemo } from 'react';
import FoldedPaperHeadline from './Component';
import type { FoldedPaperHeadlineProps } from './Component';

const worst: FoldedPaperHeadlineProps = {
  headline: 'Alexandria Montgomery-Vanderhoeven Presents the Annual Origami & Craft Symposium 2026',
  foldCount: 9,
};

// The component is just the strip; the stage only supplies a cream page behind it.
const stage = {
  minHeight: '100vh',
  padding: 'clamp(16px, 4vw, 56px)',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1100 }}>
        <FoldedPaperHeadline {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
