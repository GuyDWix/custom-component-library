import '@fontsource/bricolage-grotesque/400.css';
import '@fontsource/bricolage-grotesque/600.css';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/600.css';
import '@fontsource/instrument-sans/700.css';
import { useMemo } from 'react';
import WatercolourWashField from './Component';
import type { WashEdgeStyle } from './Component';

const worst = {
  title: 'An extraordinarily long-winded headline about Mediterranean-inspired, locally-sourced, zero-waste neighbourhood dining experiences',
  body:
    'Every Thursday, Friday and Saturday evening we open the long table by the window for a slow, seven-course supper built entirely around whatever the farmers, foragers and fishermen bring to our kitchen door that morning. Menus change without notice, dietary requirements are welcomed with forty-eight hours of warning, and the last seating is at nine-thirty sharp, after which the candles are lit and nobody is rushed out.',
  buttonLabel: 'Reserve your place at the long table for this coming weekend',
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';
  const edgeStyle = (params.get('edge') as WashEdgeStyle | null) ?? (isWorst ? 'torn' : 'soft');

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <WatercolourWashField edgeStyle={edgeStyle} {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
