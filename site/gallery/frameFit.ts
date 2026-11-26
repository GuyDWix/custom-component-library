import { useEffect, useState, type CSSProperties, type RefObject } from 'react';

type Box = { x: number; y: number; w: number; h: number; painted?: boolean };
type FrameMessage = { type: 'frame'; box: Box | null; docHeight: number };

const FILLS_VIEWPORT = 0.92;
const PAINTED_FILLS = 0.99;
const PADDING = 0.08;
const MAX_ZOOM = 2;
const MAX_CROP = 1.2;
const MAX_GROW = 1.5;

export const thumbQuery = (scroll?: number) => `thumb=1${scroll ? `&scroll=${scroll}` : ''}`;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** Frames `box` (frame px) into a `width`×`height` card shown at `base` scale, never exposing the frame's edges. */
function fitTransform(box: Box | null, width: number, height: number, frameHeight: number, base: number): CSSProperties {
  const fills = box?.painted ? PAINTED_FILLS : FILLS_VIEWPORT;
  const fillsCard = box && box.w >= width * fills && box.h >= height * fills && box.h <= height / fills;
  if (!box || fillsCard) return { transform: `scale(${base})` };
  const contain = Math.min(width / box.w, height / box.h);
  const cover = Math.max(width / box.w, height / box.h);
  const fit = box.painted ? Math.min(cover, contain * MAX_CROP) : contain * (1 - 2 * PADDING);
  const zoom = base * clamp(fit, 1, MAX_ZOOM);
  const tall = box.h * zoom > height * base;
  const tx = (width * base) / 2 - (box.x + box.w / 2) * zoom;
  const ty = tall ? -box.y * zoom : (height * base) / 2 - (box.y + box.h / 2) * zoom;
  const x = clamp(tx, width * base - width * zoom, 0);
  const y = clamp(ty, height * base - frameHeight * zoom, 0);
  return { transform: `translate(${x}px, ${y}px) scale(${zoom})` };
}

const sameBox = (a: Box | null, b: Box | null) =>
  a === b || (!!a && !!b && (['x', 'y', 'w', 'h'] as const).every((k) => Math.abs(a[k] - b[k]) < 2));

type Options = { fit: boolean; grow: boolean; width: number; height: number; base: number };

/**
 * Listens to the in-frame probe. `grow` lets a frame stretch (up to MAX_GROW) to content that only slightly
 * overflows, so it doesn't scroll for nothing; `fit` frames the content box into the card.
 * `ready` flips on the first report (or after a fallback delay).
 */
export function useFrameFit(frame: RefObject<HTMLIFrameElement>, { fit, grow, width, height, base }: Options) {
  const [box, setBox] = useState<Box | null>(null);
  const [frameHeight, setFrameHeight] = useState(height);
  const [ready, setReady] = useState(!fit);

  useEffect(() => {
    if (!fit && !grow) return;
    const onMessage = (e: MessageEvent<FrameMessage>) => {
      if (e.source !== frame.current?.contentWindow || e.data?.type !== 'frame') return;
      setBox((prev) => (sameBox(prev, e.data.box) ? prev : e.data.box));
      if (grow) setFrameHeight((prev) => Math.max(prev, Math.min(Math.ceil(e.data.docHeight), height * MAX_GROW)));
      setReady(true);
    };
    const fallback = setTimeout(() => setReady(true), 3000);
    addEventListener('message', onMessage);
    return () => {
      clearTimeout(fallback);
      removeEventListener('message', onMessage);
    };
  }, [frame, fit, grow, height]);

  const style = fit ? fitTransform(box, width, height, frameHeight, base) : { transform: `scale(${base})` };
  return { style: { width, height: frameHeight, ...style }, frameHeight, ready };
}
