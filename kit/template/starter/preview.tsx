import { useMemo } from 'react';
import '@fontsource/wix-madefor-display/400.css';
import '@fontsource/wix-madefor-display/600.css';
import Starter from './Component';
import type { StarterProps } from './Component';

const worst: StarterProps = {
  title: 'An extraordinarily-long-hyphenated-headline-that-refuses-to-wrap-politely across every single line',
  text: 'This paragraph is far longer than one sentence. It keeps going to show how the card copes when an owner pastes a whole description where a short line was expected, and it must still read cleanly at every width.',
  buttonLabel: 'Continue to the very long call to action that an owner typed in full',
  buttonLink: '',
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: '#eef0f3',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';
  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <Starter {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
