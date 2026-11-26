import '@fontsource/archivo/400.css';
import '@fontsource/archivo/700.css';
import '@fontsource/archivo/900.css';
import { useMemo } from 'react';
import SundialShadowHeadline from './Component';

const WORST_TEXT =
  'The longest afternoon drifts sideways through heat haze, salt flats and the slow arithmetic of daylight';

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
};

export default function Preview() {
  const params = useMemo(
    () => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search),
    []
  );
  const worst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <SundialShadowHeadline text={worst ? WORST_TEXT : undefined} />
      </div>
    </div>
  );
}
