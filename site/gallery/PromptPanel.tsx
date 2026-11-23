import { useEffect, useState } from 'react';
import { loadCode, loadPrompt, type SourceFile } from './data';
import CodeBlock from './CodeBlock';

function useLoaded<T>(load: () => Promise<T>, deps: unknown[]) {
  const [value, setValue] = useState<T | null | undefined>(undefined);
  useEffect(() => {
    setValue(undefined);
    load().then((v) => setValue(v ?? null), () => setValue(null));
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return value;
}

export function PromptPanel({ name }: { name: string }) {
  const prompt = useLoaded(() => loadPrompt(name), [name]);
  if (prompt === undefined) return <p className="g-muted">Loading prompt…</p>;
  if (!prompt) return <p className="g-muted">No prompt for this component yet.</p>;
  return <CodeBlock text={prompt} copyLabel="Copy prompt" />;
}

export function CodePanel({ name }: { name: string }) {
  const files = useLoaded<SourceFile[]>(() => loadCode(name), [name]);
  if (files === undefined) return <p className="g-muted">Loading code…</p>;
  if (!files?.length) return <p className="g-muted">No code for this component yet.</p>;
  return (
    <div className="g-code">
      {files.map((f) => <CodeBlock key={f.file} text={f.text} copyLabel="Copy" caption={f.file} />)}
    </div>
  );
}
