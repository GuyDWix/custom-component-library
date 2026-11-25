import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import { useMemo } from 'react';
import FilmStripScrubber from './Component';
import type { FilmStripPhoto } from './Component';

const worst: FilmStripPhoto[] = [
  {
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1080&h=720&fit=crop&crop=faces',
    caption:
      'Alexandria Montgomery-Vanderhoeven-Castellanos, Senior Vice President of Global Partnerships and Strategic Customer Experience, photographed on location at the Internationalisation Holdings winter retreat with a very long roll of film',
  },
  {
    image: '',
    caption: 'Pneumonoultramicroscopicsilicovolcanoconiosis-Studiengesellschaft — unexposed frame, keep for reference',
  },
  {
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&h=720&fit=crop&crop=faces',
    caption: '',
  },
  {
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1080&h=720&fit=crop&crop=faces',
    caption:
      'Mira — felt hat and a caption that goes on and on about the north-facing window, the f/2.8 aperture, the roll number, the lab that developed it and the scanning settings used',
  },
  { image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1080&h=720&fit=crop&crop=faces', caption: 'Teo — beard study' },
  { image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1080&h=720&fit=crop&crop=faces', caption: 'June — tangerine' },
  { image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1080&h=720&fit=crop&crop=faces', caption: 'Rosa — grey seamless' },
  { image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1080&h=720&fit=crop&crop=faces', caption: 'Ada — natural smile' },
  {
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=1080&h=720&fit=crop&crop=faces',
    caption: 'Noor — studio floor test strip with a deliberately overlong caption for the worst case pass',
  },
  { image: '', caption: '' },
  { image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1080&h=720&fit=crop&crop=faces', caption: 'Ivo — key grip' },
  { image: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=1080&h=720&fit=crop&crop=faces', caption: 'Lena — follow focus' },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #101218 0%, #0c0e12 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <FilmStripScrubber {...(isWorst ? { photos: worst } : {})} />
      </div>
    </div>
  );
}
