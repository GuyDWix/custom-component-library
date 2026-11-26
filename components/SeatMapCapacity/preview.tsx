import '@fontsource/fraunces/400.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/400-italic.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/500-italic.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/600-italic.css';
import { useMemo } from 'react';
import SeatMapCapacity from './Component';
import type { SeatLayout, SeatMapCapacityProps } from './Component';

const worst: SeatMapCapacityProps = {
  totalSeats: 320,
  seatsTaken: 317,
  rows: 14,
  title: 'The Extraordinarily Long-Named Midsummer Gala Dinner and Charity Auction · Grand Ballroom, East Wing, Level 3',
  calloutText: 'Only {count} seats remaining for this evening, book before they are all gone',
  availableLabel: 'Still available to book online',
  takenLabel: 'Already reserved by guests',
  stageLabel: 'Main stage and orchestra pit with the conductor',
  rowLabel: 'Row',
  seatLabel: 'Seat',
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
  const layout = (params.get('layout') as SeatLayout | null) ?? undefined;

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 980 }}>
        <SeatMapCapacity {...(isWorst ? worst : {})} {...(layout ? { layout } : {})} />
      </div>
    </div>
  );
}
