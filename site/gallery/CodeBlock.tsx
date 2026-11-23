import { useEffect, useId, useRef, useState } from 'react';

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

export default function CodeBlock({ text, copyLabel, caption }: { text: string; copyLabel: string; caption?: string }) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [copy, setCopy] = useState<CopyState>('idle');
  const timer = useRef<number>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const onCopy = async () => {
    const ok = await copyText(text);
    setCopy(ok ? 'copied' : 'failed');
    if (!ok) setExpanded(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopy('idle'), ok ? 1500 : 4000);
  };

  return (
    <div className="g-prompt">
      <div className="g-prompt__bar">
        <button type="button" className="g-btn g-btn--primary" onClick={onCopy} aria-live="polite">
          {copy === 'copied' ? 'Copied ✓' : copy === 'failed' ? 'Copy failed: select manually' : copyLabel}
        </button>
        <span className="g-muted">{[caption, formatSize(text)].filter(Boolean).join(' · ')}</span>
      </div>
      <pre id={id} className={`g-prompt__body${expanded ? '' : ' is-collapsed'}`}>{text}</pre>
      <button
        type="button"
        className="g-btn g-btn--ghost"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded((x) => !x)}
      >
        {expanded ? 'Collapse' : 'Show all'}
      </button>
    </div>
  );
}
