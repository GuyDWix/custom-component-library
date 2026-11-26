import { useEffect, useMemo, useRef, useState } from 'react';
import { compile, loadFontLinks, type Code } from './edits';
import { useShownWhenFitted, useWidth } from './ScaledFrame';
import { thumbQuery, useFrameFit } from './frameFit';

type SandboxMessage =
  | { type: 'ready' | 'rendered' }
  | { type: 'error'; message: string };

type Props = {
  name: string;
  code: Code;
  title: string;
  width: number;
  height: number;
  maxScale?: number;
  worst?: boolean;
  decorative?: boolean;
  onRendered?: () => void;
  fit?: { scroll?: number };
  grow?: boolean;
};

const assetBase = (name: string) => `${location.origin}/component-assets/${name}/`;

function useCompiled(tsx: string, preview?: string | null) {
  return useMemo(() => {
    try {
      return { js: compile(tsx), previewJs: preview ? compile(preview) : undefined };
    } catch (err) {
      return { error: `Compile error: ${(err as Error).message}` };
    }
  }, [tsx, preview]);
}

export default function SandboxFrame({ name, code, title, width, height, maxScale = Infinity, worst, decorative, onRendered, fit, grow }: Props) {
  const [ref, box] = useWidth<HTMLDivElement>();
  const frame = useRef<HTMLIFrameElement>(null);
  const [loads, setLoads] = useState(0);
  const [fonts, setFonts] = useState<string[]>([]);
  const [runtimeError, setRuntimeError] = useState<string>();
  const compiled = useCompiled(code.tsx, code.preview);
  const scale = box ? Math.min(box / width, maxScale) : 0;
  const [rendered, setRendered] = useState(false);
  const fitted = useFrameFit(frame, { fit: !!fit, grow: !!grow, width, height, base: scale });
  useShownWhenFitted(rendered, fitted.ready, onRendered);

  useEffect(() => {
    loadFontLinks(name, code.preview).then(setFonts, () => setFonts([]));
  }, [name, code.preview]);

  useEffect(() => {
    const onMessage = (e: MessageEvent<SandboxMessage>) => {
      if (e.source !== frame.current?.contentWindow) return;
      const msg = e.data;
      if (msg.type === 'ready') setLoads((n) => n + 1);
      if (msg.type === 'rendered') {
        setRuntimeError(undefined);
        setRendered(true);
      }
      if (msg.type === 'error') setRuntimeError(msg.message);
    };
    addEventListener('message', onMessage);
    return () => removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!loads || !compiled.js) return;
    setRuntimeError(undefined);
    frame.current?.contentWindow?.postMessage(
      { type: 'render', js: compiled.js, previewJs: compiled.previewJs, css: code.css, fonts, assetBase: assetBase(name) },
      '*',
    );
  }, [loads, compiled, code.css, fonts, name]);

  const error = compiled.error ?? runtimeError;
  return (
    <>
      {error && !decorative && <pre className="g-sandbox__error" role="alert">{error}</pre>}
      <div ref={ref} className="g-frame" style={{ height: (fit ? height : fitted.frameHeight) * scale }}>
        {scale > 0 && (
          <iframe
            ref={frame}
            src={`/sandbox.html?${[worst && 'worst=1', fit && thumbQuery(fit.scroll)].filter(Boolean).join('&')}`}
            sandbox="allow-scripts"
            title={title}
            className={decorative ? 'g-frame__iframe g-frame__iframe--inert' : 'g-frame__iframe'}
            style={fitted.style}
            {...(decorative && { tabIndex: -1, 'aria-hidden': true })}
          />
        )}
      </div>
    </>
  );
}
