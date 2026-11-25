import { useEffect, useRef, useState } from 'react';
import { authorOf, relativeTime, type Code, type Version, type VersionSummary } from './edits';
import Tabs, { TabPanel } from './Tabs';
import Upload from './Upload';
import { useSaver } from './useSaver';

const EDIT_TABS = ['Upload folder', 'Edit code'] as const;
const TYPING_DELAY_MS = 400;

type EditTab = (typeof EDIT_TABS)[number];

type Props = {
  name: string;
  saved: Version | null;
  initial: Code;
  isNew: boolean;
  onPreview: (code?: Code) => void;
  onSaved: (version: Version) => void;
  onClose?: () => void;
  saveLabel?: string;
  discardLabel?: string;
  blocked?: boolean;
  actionsInFooter?: boolean;
};

const savedLine = (v: VersionSummary | null) =>
  v ? `Last saved by ${authorOf(v)} · ${relativeTime(v.createdAt)}` : 'Repo version';

function CodeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="g-editor__field">
      <span className="g-editor__label">{label}</span>
      <textarea
        className="g-editor__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
      />
    </label>
  );
}

export default function Editor({ name, saved, initial, isNew, onPreview, onSaved, onClose, saveLabel = 'Save', discardLabel = 'Discard', blocked, actionsInFooter }: Props) {
  const [tab, setTab] = useState<EditTab>('Upload folder');
  const [code, setCode] = useState<Code>(initial);
  const [dirty, setDirty] = useState(false);
  const [uploads, setUploads] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const { busy, save, notices } = useSaver({ name, saved, isNew, onSaved });

  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (next: Code, delay = 0) => {
    setCode(next);
    setDirty(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onPreview(next), delay);
  };
  const type = (patch: Partial<Code>) => change({ ...code, ...patch }, TYPING_DELAY_MS);

  const discard = () => {
    clearTimeout(timer.current);
    onPreview(undefined);
    if (onClose) return onClose();
    setCode(initial);
    setDirty(false);
    setUploads((n) => n + 1);
  };

  const actions = (
    <>
      <button type="button" className="g-btn g-btn--ghost g-btn--sm" disabled={busy || (!onClose && !dirty)} onClick={discard}>{discardLabel}</button>
      <button type="button" className="g-btn g-btn--primary g-btn--sm" disabled={busy || blocked || !dirty || !code.tsx.trim()} onClick={() => save(code)}>
        {busy ? 'Saving…' : saveLabel}
      </button>
    </>
  );

  return (
    <section className="g-panel" aria-label="Edit component">
      <Tabs label="Edit component" tabs={EDIT_TABS} value={tab} onChange={setTab} end={actionsInFooter ? undefined : actions} />
      {notices(code)}
      <TabPanel tab="Upload folder" hidden={tab !== 'Upload folder'}>
        <Upload key={uploads} isNew={isNew} onCode={(next) => change(next)} />
      </TabPanel>
      <TabPanel tab="Edit code" hidden={tab !== 'Edit code'}>
        <div className="g-editor">
          <p className="g-muted">{dirty ? 'Unsaved changes · preview updates as you type' : savedLine(saved)}</p>
          <CodeField label="Component.tsx" value={code.tsx} onChange={(tsx) => type({ tsx })} />
          <CodeField label="Component.module.css" value={code.css} onChange={(css) => type({ css })} />
        </div>
      </TabPanel>
      {actionsInFooter && <footer className="g-dialog__footer">{actions}</footer>}
    </section>
  );
}
