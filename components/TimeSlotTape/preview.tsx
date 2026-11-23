import { useMemo } from 'react';
import TimeSlotTape from './Component';
import type { TimeSlot } from './Component';

const worstSlots: TimeSlot[] = Array.from({ length: 40 }, (_, i) => {
  const start = 8 * 60 + i * 15;
  const end = start + 45;
  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
  };
  return { time: `${fmt(start)} – ${fmt(end)}`, booked: i % 3 === 1 || (i > 4 && i < 9) };
});

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: '#0b0c0f',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1100 }}>
        {worst ? (
          <TimeSlotTape
            slots={worstSlots}
            startTime="nope"
            eyebrow="Saturday 23 November 2026 · Extended bespoke three-piece suit consultation with measurements, fabric selection and a second fitting"
            heading="Choose a time that suits you for your complete made-to-measure wardrobe consultation appointment"
            bookedLabel="Fully booked, join the waitlist"
            buttonLabel="Confirm my appointment request for {time} and continue to payment details"
            buttonLink=""
          />
        ) : (
          <TimeSlotTape />
        )}
      </div>
    </div>
  );
}
