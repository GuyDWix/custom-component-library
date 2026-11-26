import type { Entry } from './data';
import type { Code } from './edits';
import CodeBlock from './CodeBlock';

const lowerFirst = (s: string) => s[0].toLowerCase() + s.slice(1);
const withNewline = (s: string) => (s.endsWith('\n') ? s : `${s}\n`);

const buildPrompt = (entry: Entry, code: Code) =>
  `Create a custom element called "${entry.title}". Build it exactly as this React reference (same look, behavior and defaults).\n\n` +
  `The site owner must be able to change: ${entry.ownerSettings.map(lowerFirst).join(', ')}. Add other settings if they help.\n\n` +
  (entry.selectableParts.length
    ? `The site owner must be able to select and style each of these separately: ${entry.selectableParts.map(lowerFirst).join(', ')}.\n\n`
    : '') +
  `\`\`\`tsx\n${withNewline(code.tsx)}\`\`\`\n\n` +
  `\`\`\`css\n${withNewline(code.css)}\`\`\`\n`;

const NO_CODE = <p className="g-muted">No code for this component yet.</p>;

export function PromptPanel({ entry, code }: { entry: Entry; code?: Code | null }) {
  if (code === undefined) return <p className="g-muted">Loading prompt…</p>;
  if (!code) return NO_CODE;
  return <CodeBlock text={buildPrompt(entry, code)} copyLabel="Copy prompt" />;
}

export function CodePanel({ code }: { code?: Code | null }) {
  if (code === undefined) return <p className="g-muted">Loading code…</p>;
  if (!code) return NO_CODE;
  const files = [
    { file: 'Component.tsx', text: code.tsx },
    { file: 'Component.module.css', text: code.css },
  ].filter((f) => f.text);
  return (
    <div className="g-code">
      {files.map((f) => <CodeBlock key={f.file} text={f.text} copyLabel="Copy" caption={f.file} />)}
    </div>
  );
}
