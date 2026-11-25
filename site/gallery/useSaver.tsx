import { useState } from 'react';
import { authorOf, compile, relativeTime, saveVersion, type Code, type Version, type VersionSummary } from './edits';
import { postState } from './workflow';

type Options = { name: string; saved: Version | null; isNew: boolean; onSaved: (version: Version) => void };

export function useSaver({ name, saved, isNew, onSaved }: Options) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [conflict, setConflict] = useState<VersionSummary | null | undefined>();

  const save = async (code: Code, force = false) => {
    try {
      compile(code.tsx);
      if (code.preview) compile(code.preview);
    } catch (err) {
      return setError(`Fix the compile error before saving: ${(err as Error).message}`);
    }
    setBusy(true);
    setError(undefined);
    const result = await saveVersion(name, code, saved?.id ?? null, force, isNew);
    if (result.ok && isNew) await postState(name, { action: 'claim' }).catch(() => {});
    setBusy(false);
    if (result.ok) {
      setConflict(undefined);
      return onSaved(result.version);
    }
    if ('conflict' in result) setConflict(result.conflict);
    else setError(result.error);
  };

  const notices = (code: Code) => (
    <>
      {conflict !== undefined && (
        <div className="g-editor__notice g-editor__notice--warn" role="alert">
          <span>Someone saved a newer version while you were editing{conflict ? ` (${authorOf(conflict)} · ${relativeTime(conflict.createdAt)})` : ''}. Saving will replace it.</span>
          <button type="button" className="g-btn g-btn--ghost" disabled={busy} onClick={() => save(code, true)}>Save anyway</button>
        </div>
      )}
      {error && <p className="g-editor__notice g-editor__notice--bad" role="alert">{error}</p>}
    </>
  );

  return { busy, save, notices };
}
