import { useMemo } from 'react';
import RedlineRevisionText from './Component';
import type { RedlineSegment } from './Component';

const worstSegments: RedlineSegment[] = [
  { text: 'For more than twenty-five years our internationally recognised multidisciplinary studio has ' },
  { text: 'made', replacement: 'carefully handcrafted and relentlessly user-tested' },
  { text: ' websites, ' },
  { text: 'brochures, catalogues, leaflets and assorted printed collateral', replacement: 'campaigns' },
  { text: ' and ' },
  { text: '', replacement: 'award-winning' },
  { text: ' identities for ' },
  { text: 'companies', replacement: 'Anticonstitutionnellement-Großunternehmen' },
  { text: ' that want to be ' },
  { text: 'noticed', replacement: 'remembered' },
  { text: ' ' },
  { text: 'someday', replacement: 'tomorrow' },
  { text: '.' },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'radial-gradient(120% 90% at 50% 0%, #e7e8e6 0%, #d5d6d3 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 980 }}>
        <RedlineRevisionText
          {...(worst
            ? {
                segments: worstSegments,
                label: 'Galley proof · Corporate capabilities statement, revised draft four for client sign-off',
                note: 'Much better — but please trim this before it goes to the printer on Thursday morning. R.',
              }
            : {})}
        />
      </div>
    </div>
  );
}
