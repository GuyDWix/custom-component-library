import { useMemo } from 'react';
import GoalJarFill from './Component';
import type { GoalJarFillProps } from './Component';

const worst: GoalJarFillProps = {
  amount: 1234567890,
  goal: 1000000000,
  label:
    'Community orchard, beekeeping cooperative and riverside pantry replanting fund for the Llanfairpwllgwyngyll valley',
  currencySymbol: 'CHF',
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #eef1f3 0%, #dde4e9 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const color = params.get('color') ? `#${params.get('color')}` : undefined;
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <GoalJarFill {...(isWorst ? worst : {})} {...(color ? { liquidColor: color } : {})} />
      </div>
    </div>
  );
}
