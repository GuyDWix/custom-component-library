import '@fontsource/bricolage-grotesque/400.css';
import '@fontsource/bricolage-grotesque/600.css';
import '@fontsource/bricolage-grotesque/700.css';
import { useMemo } from 'react';
import ElectricFrame from './Component';
import type { ElectricFrameProps } from './Component';

const worst: ElectricFrameProps = {
  heading: 'Internationalisation-ready Enterprise Collaboration Infrastructure for Extraordinarily Distributed Organisations',
  body: 'Supercalifragilisticexpialidocious_unbroken_string_of_text_that_keeps_going_and_going. Unlimited projects, shared libraries, audit trails, regional data residency, priority support and a dedicated success manager for every single workspace.',
  ctaLabel: 'Start your fourteen day free trial today',
  intensity: 100,
  speed: 3,
  radius: 40,
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: '#0d0d0d',
};

export default function Preview() {
  const isWorst = useMemo(
    () => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search).get('worst') === '1',
    [],
  );
  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <ElectricFrame {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
