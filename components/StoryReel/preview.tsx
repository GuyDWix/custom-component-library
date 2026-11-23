import { useMemo } from 'react';
import StoryReel from './Component';
import type { StoryReelSlide } from './Component';

const worstSlides: StoryReelSlide[] = [
  {
    image: '',
    caption:
      'A caption with no image at all, which should still look composed rather than broken — the reel keeps its frame, scrim and progress regardless of what is missing.',
  },
  {
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=760&h=950&auto=format&fit=crop',
    alt: 'A set table with plates and glassware',
    caption:
      'Alexandria Montgomery-Vanderhoeven-Castellanos presents the fourteen-course tasting menu of the autumn season, served under the internationalisation holdings of our flagship location.',
  },
  { image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?q=80&w=760&h=950&auto=format&fit=crop' },
  {
    image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=760&h=950&auto=format&fit=crop',
    alt: 'Guests at the counter under warm lamps',
    caption: 'By seven every stool is taken.',
  },
  {
    image: '',
    caption: 'Second slide with no image, checking the fallback monogram once more.',
  },
  {
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=760&h=950&auto=format&fit=crop',
    alt: 'A final coffee poured at the counter',
    caption:
      'Honestly, I did not expect to be writing one of these, because I have worked with a long list of venues over the years and most of them promised the moon and delivered a slightly nicer version of what we already had; this room was different from the very first call, and launch week was the smoothest we have ever had, and our support inbox has been unusually, almost suspiciously, quiet ever since.',
  },
  {
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=760&h=950&auto=format&fit=crop',
    alt: 'Candlelit tables in the dining room at dusk',
    caption: 'Doors at six — cedar, citrus, fresh paint.',
  },
  { image: '', caption: '' },
  {
    image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=760&h=950&auto=format&fit=crop',
    alt: 'A spread of shared dishes on a table',
    caption: 'Family-style plates for the long table by the window.',
  },
  {
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=760&h=950&auto=format&fit=crop',
    alt: 'A plated main course',
    caption: 'Main course: charred leeks, romesco, smoked yogurt.',
  },
  {
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=760&h=950&auto=format&fit=crop',
    alt: 'A grilled dish resting on a board',
    caption: 'Resting the grill platter before the second seating.',
  },
  {
    image: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?q=80&w=760&h=950&auto=format&fit=crop',
    alt: 'A bowl of roasted vegetables',
    caption: 'Last pour at midnight. Same corner, same time, next week.',
  },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #191c21 0%, #0f1114 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <StoryReel {...(isWorst ? { slides: worstSlides, secondsPerSlide: 1.5 } : {})} />
      </div>
    </div>
  );
}
