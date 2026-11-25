import { useEffect, useRef, useState, type DragEvent } from 'react';
import type { RawMeta } from './data';
import type { Code } from './edits';

const KIT_FILES = ['Component.tsx', 'Component.module.css', 'preview.tsx', 'meta.json'] as const;
const REQUIRED: KitFile[] = ['Component.tsx', 'Component.module.css'];
const SKIP_DIR = /^(node_modules|skill|dist|\..+)$/;
const IMAGE_PATH = /(^|\/)images\/[^/]+$/;

type KitFile = (typeof KIT_FILES)[number];
type Found = { path: string; file: File };
type Dropped = { code?: Code; present: KitFile[]; hasImages: boolean; error?: string };

const readFile = (entry: FileSystemFileEntry) => new Promise<File>((resolve, reject) => entry.file(resolve, reject));
const readBatch = (reader: FileSystemDirectoryReader) =>
  new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));

async function walk(entry: FileSystemEntry, out: Found[]) {
  if (entry.isFile) return void out.push({ path: entry.fullPath, file: await readFile(entry as FileSystemFileEntry) });
  if (!entry.isDirectory || SKIP_DIR.test(entry.name)) return;
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  for (let batch = await readBatch(reader); batch.length; batch = await readBatch(reader)) {
    for (const child of batch) await walk(child, out);
  }
}

const depth = (path: string) => path.split('/').length;
const basename = (path: string) => path.split('/').pop();

function pick(found: Found[], file: KitFile) {
  return found.filter((f) => basename(f.path) === file).sort((a, b) => depth(a.path) - depth(b.path))[0]?.file;
}

async function parseMeta(file?: File): Promise<RawMeta | null> {
  if (!file) return null;
  const meta = JSON.parse(await file.text());
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) throw new Error('meta.json must be a JSON object.');
  return meta;
}

async function toDropped(found: Found[]): Promise<Dropped> {
  const files = Object.fromEntries(KIT_FILES.map((f) => [f, pick(found, f)])) as Record<KitFile, File | undefined>;
  const present = KIT_FILES.filter((f) => files[f]);
  const hasImages = found.some((f) => IMAGE_PATH.test(f.path));
  if (REQUIRED.some((f) => !files[f])) return { present, hasImages, error: 'Component.tsx and Component.module.css are required.' };
  try {
    const [tsx, css, preview, meta] = await Promise.all([
      files['Component.tsx']!.text(),
      files['Component.module.css']!.text(),
      files['preview.tsx']?.text() ?? null,
      parseMeta(files['meta.json']),
    ]);
    return { code: { tsx, css, preview, meta }, present, hasImages };
  } catch (err) {
    return { present, hasImages, error: `Couldn't read the files: ${(err as Error).message}` };
  }
}

function FileChecklist({ present }: { present: KitFile[] }) {
  return (
    <ul className="g-upload__files">
      {KIT_FILES.map((f) => {
        const ok = present.includes(f);
        return (
          <li key={f} className={ok ? 'is-found' : 'is-missing'}>
            <span aria-hidden="true">{ok ? '✓' : '✕'}</span>
            {f}
            <span className="g-muted">{ok ? 'found' : REQUIRED.includes(f) ? 'missing (required)' : 'missing'}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function Upload({ isNew, onCode }: { isNew: boolean; onCode: (code: Code) => void }) {
  const [over, setOver] = useState(false);
  const [dropped, setDropped] = useState<Dropped>();
  const input = useRef<HTMLInputElement | null>(null);
  const unmounted = useRef(false);

  useEffect(() => () => { unmounted.current = true; }, []);

  const accept = async (read: Promise<Found[]>) => {
    const next: Dropped = await read.then(toDropped, (err: Error) => ({ present: [], hasImages: false, error: err.message }));
    if (unmounted.current) return;
    setDropped(next);
    if (next.code) onCode(next.code);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const entries = [...e.dataTransfer.items].map((i) => i.webkitGetAsEntry()).filter((x): x is FileSystemEntry => !!x);
    accept(Promise.all(entries.map(async (entry) => { const out: Found[] = []; await walk(entry, out); return out; })).then((l) => l.flat()));
  };

  const onPick = (list: FileList | null) => {
    const found = [...(list ?? [])]
      .map((file) => ({ path: file.webkitRelativePath || file.name, file }))
      .filter((f) => !f.path.split('/').slice(1, -1).some((dir) => SKIP_DIR.test(dir)));
    accept(Promise.resolve(found));
  };

  return (
    <div className="g-editor">
      <div
        className={`g-drop${over ? ' is-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <p className="g-drop__title">Drop the <code>component</code> folder here</p>
        <p className="g-muted">We pick up Component.tsx, Component.module.css, preview.tsx and meta.json.</p>
        <button type="button" className="g-btn g-btn--ghost" onClick={() => input.current?.click()}>Choose folder</button>
        <input
          ref={(el) => { input.current = el; el?.setAttribute('webkitdirectory', ''); }}
          type="file"
          multiple
          hidden
          tabIndex={-1}
          onChange={(e) => { onPick(e.target.files); e.target.value = ''; }}
        />
      </div>
      {dropped && <FileChecklist present={dropped.present} />}
      {dropped?.hasImages && (
        <p className="g-editor__notice g-editor__notice--warn">Images aren't uploaded yet. The preview uses the repo's images/ folder{isNew ? ', and new components have none' : ''}.</p>
      )}
      {dropped?.error && <p className="g-editor__notice g-editor__notice--bad" role="alert">{dropped.error}</p>}
    </div>
  );
}
