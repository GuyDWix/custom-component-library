import '@fontsource/oswald/400.css';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/600.css';
import '@fontsource/oswald/700.css';
import { useMemo } from 'react';
import CalendarLeafEventCard from './Component';
import type { CalendarLeafEventCardProps } from './Component';

const worst: CalendarLeafEventCardProps = {
  image: '',
  title: 'The Extraordinarily Long Annual Midwinter Neighbourhood Supper, Silent Auction and Charity Fundraiser Evening',
  description:
    'Join us for an evening of seasonal tasting menus, live acoustic sets from three local bands, a silent auction with more than forty lots donated by neighbourhood makers, and a late-night dessert bar that runs until the very last guest has gone home.',
  startDate: '2026-12-31T21:00',
  endDate: '2027-01-01T02:30',
  venue: 'The Grand Assembly Rooms at Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch Community Hall, Upper Level',
  detailsLabel: 'Read the full programme, menu and accessibility information',
  addLabel: 'Save this date to my calendar',
  addedLabel: 'Saved to your calendar, see you there',
  timeZone: 'America/Los_Angeles',
  dateLanguage: 'en-GB',
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
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <CalendarLeafEventCard {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
