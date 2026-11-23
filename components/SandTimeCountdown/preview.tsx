import { useMemo } from 'react';
import SandTimeCountdown from './Component';
import type { SandTimeFrameStyle } from './Component';

const DAY = 86400000;

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(12px, 3vw, 40px)',
  background: '#031013',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';
  const done = params.get('done') === '1';
  const frame = (params.get('frame') as SandTimeFrameStyle | null) ?? 'columns';
  const now = useMemo(() => Date.now(), []);

  const props = worst
    ? {
        heading: 'The Annual Midsummer Observatory Open Night, Members Preview, Telescope Hall and Rooftop Terrace',
        daysLabel: 'Days remaining',
        hoursLabel: 'Hours remaining',
        minutesLabel: 'Minutes remaining',
        targetDate: new Date(now + 436 * DAY + 5 * 3600000 + 37 * 60000).toISOString(),
        startDate: new Date(now - 20 * DAY).toISOString(),
        finishedMessage:
          'The doors are open and the telescopes are warmed up, so come on in, find a seat on the terrace and let us show you the sky.',
        sandColor: '#f0b64c',
      }
    : {};
  const finished = done ? { targetDate: new Date(now - 60000).toISOString(), startDate: new Date(now - 30 * DAY).toISOString() } : {};

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <SandTimeCountdown frameStyle={frame} {...props} {...finished} />
      </div>
    </div>
  );
}
