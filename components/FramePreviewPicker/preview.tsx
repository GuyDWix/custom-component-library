import { useMemo } from 'react';
import FramePreviewPicker from './Component';
import type { FramePreviewPickerProps } from './Component';

const worst: FramePreviewPickerProps = {
  image: '',
  imageAlt: '',
  frameGroupLabel: 'Frame style and finish',
  sizeGroupLabel: 'Print size',
  frameStyles: [
    { name: 'Flemish Ebonised Oak', color: '#3d3226', finish: 'wood' },
    { name: 'Museum Black — Satin Deep Charcoal', color: '#26251f', finish: 'matte' },
    { name: 'Unlacquered Solid Brass', color: '#b28c44', finish: 'metal' },
    { name: 'Antique Silvered Bronze', color: '#9a9a94', finish: 'metal' },
    { name: 'Washed Ash', color: '#cdb89b', finish: 'wood' },
  ],
  sizes: [
    { label: 'Mini 21 × 29.7 cm', widthCm: 21, heightCm: 29.7 },
    { label: 'Small 30 × 40 cm', widthCm: 30, heightCm: 40 },
    { label: 'Medium 50 × 70 cm', widthCm: 50, heightCm: 70 },
    { label: 'Large 70 × 100 cm', widthCm: 70, heightCm: 100 },
    { label: 'Oversize 90 × 130 cm', widthCm: 90, heightCm: 130 },
    { label: 'Grand 100 × 150 cm', widthCm: 100, heightCm: 150 },
  ],
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #eef0e7 0%, #e0e4d5 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';
  const orientation = params.get('orientation') === 'landscape' ? 'landscape' : 'portrait';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <FramePreviewPicker {...(isWorst ? worst : {})} orientation={orientation} />
      </div>
    </div>
  );
}
