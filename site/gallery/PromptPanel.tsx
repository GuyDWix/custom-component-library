import { useEffect, useRef, useState } from 'react';
import { loadPrompt } from './data';

type CopyState = 'idle' | 'copied' | 'failed';

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

const formatSize = (text: string) => `${Math.max(1, Math.round(new Blob([text]).size / 1024))} KB`;

export default function PromptPanel({ name }: { name: string }) {
  const [prompt, setPrompt] = useState<string | null | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);
  const [copy, setCopy] = useState<CopyState>('idle');
  const timer = useRef<number>();

  useEffect(() => {
    loadPrompt(name).then((p) => setPrompt(p ?? null), () => setPrompt(null));
    return () => clearTimeout(timer.current);
  }, [name]);

  const onCopy = async () => {
    if (!prompt) return;
    const ok = await copyText(prompt);
    setCopy(ok ? 'copied' : 'failed');
    if (!ok) setExpanded(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopy('idle'), ok ? 1500 : 4000);
  };

  if (prompt === null) return <p className="g-muted">No prompt for this component yet.</p>;

  return (
    <div className="g-prompt">
      <div className="g-prompt__bar">
        <button type="button" className="g-btn g-btn--primary" onClick={onCopy} disabled={!prompt} aria-live="polite">
          {copy === 'copied' ? 'Copied ✓' : copy === 'failed' ? 'Copy failed: select manually' : 'Copy prompt'}
        </button>
        {prompt && <span className="g-muted">{formatSize(prompt)}</span>}
      </div>
      {prompt === undefined ? (
        <p className="g-muted">Loading prompt…</p>
      ) : (
        <>
          <pre id="g-prompt-body" className={`g-prompt__body${expanded ? '' : ' is-collapsed'}`}>{prompt}</pre>
          <button
            type="button"
            className="g-btn g-btn--ghost"
            aria-expanded={expanded}
            aria-controls="g-prompt-body"
            onClick={() => setExpanded((x) => !x)}
          >
            {expanded ? 'Collapse prompt' : 'Show full prompt'}
          </button>
        </>
      )}
    </div>
  );
}
