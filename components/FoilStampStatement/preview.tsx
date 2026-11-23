import { useMemo } from 'react';
import FoilStampStatement from './Component';
import type { FoilStampStatementProps } from './Component';

const worst: FoilStampStatementProps = {
  statement:
    'Alexandria & Maximilian-Georges-Hochberg request the pleasure of your company at an evening celebration at the Hippopotomonstrosesquipedalian Pavilion',
  detail:
    'Saturday the twelfth of September two thousand twenty-seven at half past four in the afternoon · Villa Cimballone above Lago di Varenna, Lombardia',
  foilFinish: 'silver',
  sheenStrength: 0.3,
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #efede7 0%, #e3e1d8 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <FoilStampStatement {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
