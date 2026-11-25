import { useEffect, useRef, useState, type RefObject } from 'react';
import { fetchVersion, type Version } from './edits';
import SandboxFrame from './SandboxFrame';
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

function useVersionWhen(name: string, enabled: boolean) {
  const [version, setVersion] = useState<Version | null>(null);
  useEffect(() => {
    if (enabled) fetchVersion(name, true).then(setVersion, () => setVersion(null));
  }, [name, enabled]);
  return version;
}

export default function Thumb({ name, title, hasVersion }: { name: string; title: string; hasVersion: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const near = useNearViewport(ref);
  const [loaded, setLoaded] = useState(false);
  const version = useVersionWhen(name, near && hasVersion);
  const frame = { title: `${title} preview`, width: 1280, height: 800, decorative: true };

  useEffect(() => {
    if (!near) setLoaded(false);
  }, [near]);

  return (
    <div ref={ref} className={`g-thumb${loaded ? ' is-loaded' : ''}`}>
      <div className="g-thumb__placeholder" aria-hidden="true">{title}</div>
      {near && !hasVersion && (
        <ScaledFrame src={`?c=${encodeURIComponent(name)}`} {...frame} onLoad={() => setLoaded(true)} />
      )}
      {near && version && <SandboxFrame name={name} code={version} {...frame} onRendered={() => setLoaded(true)} />}
    </div>
  );
}
