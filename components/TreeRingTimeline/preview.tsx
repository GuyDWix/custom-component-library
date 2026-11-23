import { useMemo } from 'react';
import TreeRingTimeline from './Component';
import type { RingThickness, TreeRingMilestone, WoodTone } from './Component';

const worstMilestones: TreeRingMilestone[] = Array.from({ length: 36 }, (_, i) => ({
  year: String(1989 + i),
  title:
    i % 5 === 0
      ? 'The year we finally expanded the original workshop into the neighbouring warehouse and hired an entire second shift'
      : i % 7 === 3
        ? 'Überarbeitungsvorschlagsdokumentationsverfahren'
        : `Milestone of year ${1989 + i}`,
  note:
    i === 35
      ? 'Thirty-six years in, the original founders still open the shop most mornings, and the team has grown to more than two hundred people across eleven locations in four countries, each of them baking with the same patience and stubbornness we started with.'
      : i % 3 === 0
        ? undefined
        : 'A short note about what changed.',
}));

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: '#ece4d6',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const worst = params.get('worst') === '1';
  const woodTone = (params.get('tone') as WoodTone | null) ?? 'oak';
  const ringThickness = (params.get('rings') as RingThickness | null) ?? 'natural';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <TreeRingTimeline
          woodTone={woodTone}
          ringThickness={ringThickness}
          {...(worst
            ? {
                milestones: worstMilestones,
                centreLabel: 'Hand-built furniture and joinery since nineteen eighty-nine',
                centreCaption: '',
                eyebrow: 'Thirty-six years of the Montgomery-Vanderhoeven Woodworking Collective',
              }
            : {})}
        />
      </div>
    </div>
  );
}
