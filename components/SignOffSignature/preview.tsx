import { useMemo } from 'react';
import SignOffSignature from './Component';
import type { HandwritingStyle } from './Component';

const worst = {
  name: 'Alexandria Montgomery-Vanderhoeven-Castellanos',
  note: 'Dearest friends — after fourteen years of baking before sunrise, testing every flour we could ship, and arguing gently about cardamom, we are closing this chapter the same way we began it: with a note written by hand, a small bag of something warm, and more gratitude than fits on this card. Thank you for every single morning.',
  handwritingStyle: 'quick' as HandwritingStyle,
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

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 880 }}>
        <SignOffSignature {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
