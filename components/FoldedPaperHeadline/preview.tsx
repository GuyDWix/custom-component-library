import { useMemo } from 'react';
import FoldedPaperHeadline from './Component';
import type { FoldedPaperHeadlineProps } from './Component';

const worst: FoldedPaperHeadlineProps = {
  headline: 'Alexandria Montgomery-Vanderhoeven Presents the Annual Origami & Craft Symposium 2026',
  foldCount: 9,
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  alignItems: 'end',
  justifyContent: 'center',
  paddingBlock: '50vh 14vh',
  paddingInline: '16px',
  background: '#0f0c0a',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1160 }}>
        <FoldedPaperHeadline {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
