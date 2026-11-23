import { useLayoutEffect, useRef, useState } from 'react';

const MAX_FIT_RATIO = 4;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function useContentHeight(minHeight: number, enabled: boolean) {
  const [height, setHeight] = useState(minHeight);
  const observer = useRef<ResizeObserver>();
  const watch = (frame: HTMLIFrameElement) => {
    observer.current?.disconnect();
    const doc = frame.contentDocument;
    if (!enabled || !doc) return;
    const measure = () =>
      setHeight(Math.min(Math.max(minHeight, doc.documentElement.scrollHeight), minHeight * MAX_FIT_RATIO));
    observer.current = new ResizeObserver(measure);
    observer.current.observe(doc.body);
    measure();
  };
  useLayoutEffect(() => () => observer.current?.disconnect(), []);
  return [height, watch] as const;
}

type Props = {
  src: string;
  title: string;
  width: number;
  height: number;
  maxScale?: number;
  fitContent?: boolean;
  decorative?: boolean;
  onLoad?: () => void;
};

export default function ScaledFrame({ src, title, width, height, maxScale = Infinity, fitContent, decorative, onLoad }: Props) {
  const [ref, box] = useWidth<HTMLDivElement>();
  const [frameHeight, watch] = useContentHeight(height, !!fitContent);
  const scale = box ? Math.min(box / width, maxScale) : 0;
  return (
    <div ref={ref} className="g-frame" style={{ height: frameHeight * scale }}>
      {scale > 0 && (
        <iframe
          src={src}
          title={title}
          onLoad={(e) => { watch(e.currentTarget); onLoad?.(); }}
          className={decorative ? 'g-frame__iframe g-frame__iframe--inert' : 'g-frame__iframe'}
          style={{ width, height: frameHeight, transform: `scale(${scale})` }}
          {...(decorative && { tabIndex: -1, 'aria-hidden': true })}
        />
      )}
    </div>
  );
}
