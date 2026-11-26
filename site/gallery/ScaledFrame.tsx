import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { thumbQuery, useFrameFit } from './frameFit';

export function useWidth<T extends HTMLElement>() {
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
  fit?: { scroll?: number };
  grow?: boolean;
};

export function useShownWhenFitted(loaded: boolean, fitted: boolean, onShown?: () => void) {
  const shown = useRef(onShown);
  shown.current = onShown;
  useEffect(() => {
    if (loaded && fitted) shown.current?.();
  }, [loaded, fitted]);
}

export default function ScaledFrame({ src, title, width, height, maxScale = Infinity, decorative, onLoad, fit, grow }: Props) {
  const [ref, box] = useWidth<HTMLDivElement>();
  const frame = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const scale = box ? Math.min(box / width, maxScale) : 0;
  const fitted = useFrameFit(frame, { fit: !!fit, grow: !!grow, width, height, base: scale });
  useShownWhenFitted(loaded, fitted.ready, onLoad);
  return (
    <div ref={ref} className="g-frame" style={{ height: (fit ? height : fitted.frameHeight) * scale }}>
      {scale > 0 && (
        <iframe
          ref={frame}
          src={fit ? `${src}&${thumbQuery(fit.scroll)}` : src}
          title={title}
          onLoad={() => setLoaded(true)}
          className={decorative ? 'g-frame__iframe g-frame__iframe--inert' : 'g-frame__iframe'}
          style={fitted.style}
          {...(decorative && { tabIndex: -1, 'aria-hidden': true })}
        />
      )}
    </div>
  );
}
