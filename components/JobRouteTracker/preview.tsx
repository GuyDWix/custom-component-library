import { useMemo } from 'react';
import JobRouteTracker from './Component';
import type { JobRouteTrackerProps } from './Component';

const worst: JobRouteTrackerProps = {
  title: 'The complete, start-to-finish journey of your whole-house renovation, extension and landscaping project',
  currentStage: 6,
  markerIcon: 'parcel',
  hereLabel: 'You are right here',
  nextLabel: 'Coming up next',
  stages: [
    {
      name: 'Initial on-site measure and structural survey with the whole household',
      description:
        'Our surveyor and project lead spend half a day measuring every room, checking load-bearing walls, drains, the roof space and the loft access, and listening to how each person in the household uses the house from early morning until late at night.',
    },
    {
      name: 'Concept design and budget workshop',
      description:
        'Three layout options, each with a rough cost range, so you can decide what matters most before we draw anything in detail.',
    },
    { name: 'Planning permission and neighbour notices', description: '' },
    {
      name: 'Detailed drawings, engineering calculations and fixed-price quotation',
      description:
        'Full technical drawings, a structural engineer sign-off and a line-by-line fixed price with a clear list of what is and is not included.',
    },
    {
      name: 'Material ordering, lead times and delivery scheduling',
      description:
        'Long-lead items such as windows, steel beams and bespoke joinery are ordered first so nothing holds up the build later on.',
    },
    {
      name: 'Groundworks and foundations',
      description: 'Excavation, drainage runs, concrete and the first inspection visit from building control.',
    },
    {
      name: 'Structural shell, roofing and weatherproofing',
      description: 'Walls, steelwork and roof go up until the building is wind and watertight.',
    },
    {
      name: 'First-fix electrics, plumbing and underfloor heating',
      description: 'Everything that disappears behind plaster and floors is installed, tested and photographed.',
    },
    {
      name: 'Plastering, decorating and second fix',
      description: 'Smooth walls, paint, sockets, switches, radiators, sanitaryware and kitchen units.',
    },
    {
      name: 'Landscaping, final inspection and handover walkthrough',
      description: 'Paths, planting and fencing, a snagging list closed out together, and the keys, certificates and guarantees in one folder.',
    },
  ],
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(12px, 3vw, 48px)',
  background: 'linear-gradient(180deg, #eceeea 0%, #e3e7e1 100%)',
};

export default function Preview() {
  const worstCase = useMemo(
    () => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search).get('worst') === '1',
    [],
  );
  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1240 }}>
        <JobRouteTracker {...(worstCase ? worst : {})} />
      </div>
    </div>
  );
}
