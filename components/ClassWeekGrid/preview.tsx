import { useMemo } from 'react';
import ClassWeekGrid from './Component';
import type { ClassBlock, ClassType } from './Component';

const worstTypes: ClassType[] = [
  { name: 'Pilates', color: '#7e9b7c' },
  { name: 'Yoga', color: '#c27a5c' },
  { name: 'Strength', color: '#4b6b8c' },
  { name: 'Postnatal recovery and pelvic-floor strength', color: '#a58aa8' },
  { name: 'Breathwork', color: '#c9a24f' },
  { name: 'Mobility', color: '#5f9a98' },
];

const longNames = [
  'Advanced Prenatal Reformer Pilates for Returning Athletes (Intermediate, Mixed Levels)',
  'Unbelievablylongclassnamewithoutanyspacesatall Sunrise Edition',
  'Slow Flow',
  'Hot Power Vinyasa Yoga with Live Percussion',
  'Strength Lab: Heavy Barbell Fundamentals and Technique Clinic',
  'Yin',
];
const days = ['Mon', 'Tuesday', 'Wed', 'Thursday', 'Fri', 'Saturday', 'Sun'];
const starts: [string, string][] = [
  ['06:00', '06:30'],
  ['06:30', '07:45'],
  ['07:00', '08:00'],
  ['09:15', '10:15'],
  ['12:00', '12:45'],
  ['17:30', '18:30'],
  ['18:00', '19:30'],
  ['19:45', '21:00'],
];

const worstClasses: ClassBlock[] = days.flatMap((day, d) =>
  starts.map(([start, end], s) => ({
    name: longNames[(d + s) % longNames.length],
    day,
    start,
    end,
    type: worstTypes[(d * 3 + s) % worstTypes.length].name,
  })),
);

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(12px, 3vw, 48px)',
  background: '#e8e3d7',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1240 }}>
        {worst ? (
          <ClassWeekGrid classes={worstClasses} types={worstTypes} weekStartsOn="sunday" timeFormat="24h" />
        ) : (
          <ClassWeekGrid />
        )}
      </div>
    </div>
  );
}
