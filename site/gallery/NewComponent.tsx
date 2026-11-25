import { useRef, useState } from 'react';
import Editor from './Editor';

const NAME_RE = /^[A-Z][A-Za-z0-9]+$/;
const BLANK = { tsx: '', css: '' };

function nameError(name: string, taken: (name: string) => boolean) {
  if (!name) return undefined;
  if (!NAME_RE.test(name)) return 'Use PascalCase letters and digits, e.g. PricingFlipCard.';
  if (taken(name)) return `“${name}” already exists.`;
  return undefined;
}

export default function NewComponent({ taken }: { taken: (name: string) => boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const error = nameError(name, taken);

  const show = () => {
    setOpen(true);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();

  return (
    <div className="g-header__new">
      <a className="g-btn g-btn--ghost" href="/api/kit/new" download>Download kit</a>
      <button type="button" className="g-btn g-btn--primary" onClick={show}>Add component</button>
      <dialog
        ref={dialog}
        className="g-dialog g-dialog--wide"
        aria-labelledby="g-new-title"
        onClose={() => { setOpen(false); setName(''); }}
      >
        <div className="g-dialog__body">
          <header className="g-dialog__head">
            <h2 id="g-new-title" className="g-dialog__title">Add component</h2>
            <button type="button" className="g-dialog__close" aria-label="Close" onClick={close} />
          </header>
          <label className="g-editor__field">
            <span className="g-editor__label">Component name</span>
            <input
              className="g-search"
              value={name}
              onChange={(e) => setName(e.target.value.trim())}
              placeholder="PricingFlipCard"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-invalid={!!error}
              aria-describedby="g-new-hint"
            />
          </label>
          <p id="g-new-hint" className={error ? 'g-editor__notice g-editor__notice--bad' : 'g-muted'} role={error ? 'alert' : undefined}>
            {error ?? 'Drop the component folder from your kit, or paste the code.'}
          </p>
          {open && (
            <Editor
              name={name}
              saved={null}
              initial={BLANK}
              isNew
              onPreview={() => {}}
              onSaved={() => location.assign(`?view=${encodeURIComponent(name)}`)}
              onClose={close}
              saveLabel="Add component"
              actionsInFooter
              discardLabel="Cancel"
              blocked={!name || !!error}
            />
          )}
        </div>
      </dialog>
    </div>
  );
}
