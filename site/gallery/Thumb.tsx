import { useEffect, useRef, useState, type RefObject } from 'react';
import ScaledFrame from './ScaledFrame';

const MOUNT_MARGIN = '300px';
const UNMOUNT_MARGIN = '1200px';

function useNearViewport(ref: RefObject<Element>) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const watch = (rootMargin: string, when: boolean) => {
      const io = new IntersectionObserver(([e]) => e.isIntersecting === when && setNear(when), { rootMargin });
      io.observe(el);
      return io;
    };
    const observers = [watch(MOUNT_MARGIN, true), watch(UNMOUNT_MARGIN, false)];
    return () => observers.forEach((io) => io.disconnect());
  }, [ref]);
  return near;
}

export default function Thumb({ name, title }: { name: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const near = useNearViewport(ref);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!near) setLoaded(false);
  }, [near]);

  return (
    <div ref={ref} className={`g-thumb${loaded ? ' is-loaded' : ''}`}>
      <div className="g-thumb__placeholder" aria-hidden="true">{title}</div>
      {near && (
        <ScaledFrame
          src={`?c=${encodeURIComponent(name)}`}
          title={`${title} preview`}
          width={1280}
          height={800}
          decorative
          onLoad={() => setLoaded(true)}
        />
      )}
    </div>
  );
}
