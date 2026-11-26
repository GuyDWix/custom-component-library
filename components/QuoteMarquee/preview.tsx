import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import QuoteMarquee from './Component';
import type { Quote } from './Component';

const WORST_QUOTES: Quote[] = [
  {
    text:
      'Honestly I was skeptical at first because we had already tried three other tools that promised the same thing, but after the first week our whole team, including the two people who usually refuse to change anything, had moved over without being asked. The onboarding was gentle, the defaults were sensible, and every time we hit an edge case the answer was already in the help docs. Worth it.',
    name: 'Maximiliana Alexandra Wolfeschlegelsteinhausen-Bergerdorff',
    role: 'Senior Vice President of Customer Experience & Operational Excellence, Internationale Handelsgesellschaft',
    rating: 3,
  },
];

const page: CSSProperties = {
  minHeight: '100vh',
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 4,
  padding: '48px 0',
  boxSizing: 'border-box',
  overflowX: 'hidden',
};

const heading: CSSProperties = {
  margin: 0,
  padding: '0 24px',
  textAlign: 'center',
  color: '#f6efe4',
  fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
  fontSize: 28,
  fontWeight: 600,
  letterSpacing: '-0.02em',
};

export default function Preview() {
  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.background = '#120d11';
  }, []);
  const worst = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('worst') === '1';
  return (
    <main style={page}>
      <h2 style={heading}>What our customers say</h2>
      {worst ? <QuoteMarquee quotes={WORST_QUOTES} /> : <QuoteMarquee />}
    </main>
  );
}
