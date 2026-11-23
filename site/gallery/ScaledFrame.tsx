import { useLayoutEffect, useRef, useState } from 'react';

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

type Props = {
  src: string;
  title: string;
  width: number;
  height: number;
  maxScale?: number;
  decorative?: boolean;
  onLoad?: () => void;
};

export default function ScaledFrame({ src, title, width, height, maxScale = Infinity, decorative, onLoad }: Props) {
  const [ref, box] = useWidth<HTMLDivElement>();
  const scale = box ? Math.min(box / width, maxScale) : 0;
  return (
    <div ref={ref} className="g-frame" style={{ height: height * scale }}>
      {scale > 0 && (
        <iframe
          src={src}
          title={title}
          onLoad={onLoad}
          className={decorative ? 'g-frame__iframe g-frame__iframe--inert' : 'g-frame__iframe'}
          style={{ width, height, transform: `scale(${scale})` }}
          {...(decorative && { tabIndex: -1, 'aria-hidden': true })}
        />
      )}
    </div>
  );
}
