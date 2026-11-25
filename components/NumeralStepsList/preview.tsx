import '@fontsource/bodoni-moda/400.css';
import '@fontsource/bodoni-moda/800.css';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/700.css';
import { useMemo } from 'react';
import NumeralStepsList from './Component';
import type { NumeralStepsListStep } from './Component';

const worstSteps: NumeralStepsListStep[] = [
  {
    title: 'Consultation, discovery and the careful alignment of every stakeholder on shared objectives',
    text: 'An opening step that says far more than any owner will ever write, testing how the numeral, the connecting rule and the body copy behave when a single paragraph runs on for four or five full lines without breaking the rhythm of the rail or pushing the layout sideways.',
  },
  {
    title: 'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch',
    text: 'A single unbreakable place name to test wrapping in the title column.',
  },
  { title: 'A step with no body copy at all', text: '' },
  { title: '', text: 'A step with no title, so the body copy has to stand on its own without any heading above it.' },
  { title: 'Short one', text: 'Brief.' },
  {
    title: 'Review, refine, and agree on the final scope before anything is signed or promised',
    text: 'Another long paragraph to make sure the list still reads calmly when several steps in a row carry this much copy.',
  },
  { title: 'Handover', text: 'The final step.' },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #dcd8d1 0%, #d2cec7 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <NumeralStepsList {...(isWorst ? { heading: '', steps: worstSteps } : {})} />
      </div>
    </div>
  );
}
