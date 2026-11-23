import { useMemo } from 'react';
import ElasticChoice from './Component';
import type { ElasticChoiceProps } from './Component';

const worst: ElasticChoiceProps = {
  groupLabel: 'Choose the subscription tier that best fits how your organisation operates',
  options: [
    { label: 'Enterprise Multi-Region Governance and Compliance Suite', description: 'Dedicated success manager, single sign-on across every subsidiary, audit logs retained for seven years, custom data residency and a quarterly business review with your leadership team.', price: '$12,499.00/mo' },
    { label: 'Pro', price: '$24' },
    { label: 'Supercalifragilisticexpialidocious_unbreakable_option_name_without_spaces', description: 'Short.' },
    { label: 'Free' },
    { label: 'Team', description: 'Up to ten collaborators.', price: '$49/mo' },
    { label: 'Non-profit', description: 'Verified charities only.', price: '$0' },
  ],
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: '#03050d',
};

export default function Preview() {
  const isWorst = useMemo(
    () => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search).get('worst') === '1',
    [],
  );
  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 880 }}>
        <ElasticChoice {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
