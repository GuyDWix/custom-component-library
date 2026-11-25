import '@fontsource/archivo/400.css';
import '@fontsource/archivo/700.css';
import '@fontsource/archivo/800.css';
import '@fontsource/ibm-plex-mono/400.css';
import { useMemo } from 'react';
import IndexTabTeamCard from './Component';
import type { IndexTabTeamCardProps } from './Component';

const worst: IndexTabTeamCardProps = {
  stampText: 'Registered members of the permanent staff',
  fileLabel: 'File reference number',
  people: [
    {
      name: 'Alexandria Montgomery-Vanderhoeven-Castellanos',
      role: 'Senior Vice President of Global Partnerships and Strategic Customer Experience',
      photo: '',
      bio: 'Joined the practice as a trainee in 2009 and has since worked on more than four hundred boundary, probate and land-registry matters across eleven jurisdictions. She chairs the standards committee, mentors every new starter during their first year, keeps the office archive in an order nobody else understands, and still insists on reading every single file twice before it is signed, stamped, scanned and put away in the correct drawer.',
    },
    {
      name: 'Dr. Bartholomew Featherstonehaugh',
      role: 'Lead Surveyor',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=520&h=650&fit=crop&crop=faces',
      bio: 'Measures what others estimate.',
    },
    {
      name: 'Li Wei',
      role: 'Records',
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=520&h=650&fit=crop&crop=faces',
      bio: 'Keeps paperwork findable.',
    },
    {
      name: 'Maximilian Oyelaran-Smith',
      role: 'Client Liaison',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=520&h=650&fit=crop&crop=faces',
      bio: 'First voice on the phone and last to leave on a deadline night.',
    },
    {
      name: 'Hannah Weiss',
      role: 'Compliance Counsel',
      photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=520&h=650&fit=crop&crop=faces',
      bio: 'Reads the small print so nobody else has to.',
    },
    {
      name: 'Sven Åkesson',
      role: 'Archive Assistant',
      photo: '',
      bio: 'Scans, labels and re-shelves.',
    },
    {
      name: 'Noor Haddad',
      role: 'Notary',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=520&h=650&fit=crop&crop=faces',
      bio: 'Witnesses signatures with a steady hand.',
    },
    {
      name: 'Joaquín de la Vega',
      role: 'Intern',
      photo: '',
      bio: 'Learning the drawers.',
    },
    {
      name: 'Ingrid Solheim',
      role: 'Office Manager',
      photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=520&h=650&fit=crop&crop=faces',
      bio: 'Keeps the kettle and the calendar running.',
    },
  ],
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #e7e9e2 0%, #dfe2da 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <IndexTabTeamCard {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
