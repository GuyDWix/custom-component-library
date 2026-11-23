import { useMemo } from 'react';
import BlackHoleIntro from './Component';

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';
  return (
    <div style={{ minHeight: '100vh', display: 'grid', background: '#06070b' }}>
      <BlackHoleIntro label={worst ? 'Step inside the experience' : undefined} density={worst ? 2 : 1} />
    </div>
  );
}
