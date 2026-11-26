import '@fontsource/archivo/400.css';
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/700.css';
import { useMemo } from 'react';
import PeelCornerCard from './Component';
import type { PeelCornerCardProps } from './Component';

const worst: PeelCornerCardProps = {
  title: 'Alexandria Montgomery-Vanderhoeven-Castellanos',
  body: 'Senior Vice President of Global Partnerships, Strategic Customer Experience and Limited Edition Collaborations, Internationalisation Holdings, with additional oversight of the seasonal programme and the annual winter market.',
  footnote: 'The Extremely Long Name Bakery and Patissserie Collective · Est. 1897',
  hiddenTitle: 'Congratulations, you have discovered the corner',
  hiddenBody:
    'This is a deliberately very long hidden message so the card has to cope with a corner reveal that keeps going and going past the comfortable limit of the cut area.',
  hiddenCode: 'PEEL-CORNER-SUMMER-SPRING-FOREVER-20XX-NO-DASHES-AT-ALL',
  corner: 'bottom-left',
};

// Full-bleed: the component fills the frame edge to edge, no stage around it.
const frame = {
  minHeight: '100vh',
  display: 'grid',
  alignContent: 'center',
};

export default function Preview() {
  const params = useMemo(
    () => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search),
    [],
  );
  const isWorst = params.get('worst') === '1';

  return (
    <div style={frame}>
      <PeelCornerCard {...(isWorst ? worst : {})} />
    </div>
  );
}
