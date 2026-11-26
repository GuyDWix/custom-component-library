import { useEffect, useState, type ReactNode } from 'react';
import { SHOW_REVIEW, isRepoName, metaLine, type Entry } from './data';
import { entryFor, useCatalog } from './catalog';
import { fetchVersion, loadRepoCode, type Code, type Version } from './edits';
import Editor from './Editor';
import { CodePanel, PromptPanel } from './PromptPanel';
import SandboxFrame from './SandboxFrame';
import ScaledFrame from './ScaledFrame';
import Segmented from './Segmented';
import StatusControl, { ClaimControl, History } from './StatusBlock';
import Tabs, { TabPanel } from './Tabs';
import { useMe, useWorkState } from './workflow';

const icon = (path: ReactNode) => (
  <svg className="g-seg__icon" viewBox="0 0 16 16" aria-hidden="true">{path}</svg>
);

const DEVICES = [
  { value: 'desktop', label: 'Desktop', icon: icon(<><rect x="1.5" y="2.5" width="13" height="8.5" rx="1.5" /><path d="M5.5 13.5h5M8 11v2.5" /></>) },
  { value: 'mobile', label: 'Mobile', icon: icon(<><rect x="4.5" y="1.5" width="7" height="13" rx="1.5" /><path d="M7.25 12.25h1.5" /></>) },
] as const;

const DATA = [
  { value: 'optimal', label: 'Optimal' },
  { value: 'extreme', label: 'Extreme case' },
] as const;

const TABS = ['Details', 'Prompt', 'Code'] as const;

type Device = (typeof DEVICES)[number]['value'];
type Data = (typeof DATA)[number]['value'];
type Tab = (typeof TABS)[number];

const viewHref = (e: Entry) => `?view=${encodeURIComponent(e.name)}`;
const previewHref = (e: Entry) => `?c=${encodeURIComponent(e.name)}`;
const sentence = (s?: string) => (s ? s[0].toUpperCase() + s.slice(1) : undefined);

function Preview({ entry, code, label }: { entry: Entry; code?: Code; label?: string }) {
  const [device, setDevice] = useState<Device>('desktop');
  const [data, setData] = useState<Data>('optimal');
  const src = previewHref(entry) + (data === 'extreme' ? '&worst=1' : '');
  const title = `${entry.title} live preview`;
  const hasData = !code || !!code.preview;
  const frame = (width: number, height: number, maxScale?: number, grow?: boolean) =>
    code ? (
      <SandboxFrame key={device} name={entry.name} code={code} title={title} width={width} height={height} maxScale={maxScale} grow={grow} worst={data === 'extreme'} />
    ) : (
      <ScaledFrame key={src} src={src} title={title} width={width} height={height} maxScale={maxScale} grow={grow} />
    );

  return (
    <section className="g-preview" aria-label="Live preview">
      <div className="g-preview__bar">
        <Segmented label="Viewport" value={device} options={DEVICES} onChange={setDevice} />
        {hasData && <Segmented label="Data" value={data} options={DATA} onChange={setData} />}
        {code ? (
          label && <span className="g-pill g-pill--edited">{label}</span>
        ) : (
          <a className="g-link g-preview__open" href={src} target="_blank" rel="noreferrer">
            Open full page ↗
          </a>
        )}
      </div>
      {device === 'desktop' ? (
        <div className="g-stage">{frame(1280, 800, undefined, true)}</div>
      ) : (
        <div className="g-stage g-stage--mobile">
          <div className="g-device">{frame(375, 760, 1)}</div>
        </div>
      )}
    </section>
  );
}

function Group({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="g-group" open={open}>
      <summary className="g-group__title">{title}</summary>
      <div className="g-group__body">{children}</div>
    </details>
  );
}

function Field({ label, children }: { label: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <div className="g-field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Details({ entry, history }: { entry: Entry; history?: ReactNode }) {
  const behavior = [entry.visitorAction, entry.motion, entry.mobile].some(Boolean);
  const look = entry.artDirection || entry.siteTypes.length > 0;
  return (
    <div className="g-groups">
      {behavior && (
        <Group title="How it works" open>
          <dl className="g-fields">
            <Field label="Visitor action">{sentence(entry.visitorAction)}</Field>
            <Field label="Motion">{sentence(entry.motion)}</Field>
            <Field label="Mobile">{sentence(entry.mobile)}</Field>
          </dl>
        </Group>
      )}
      {entry.ownerSettings.length > 0 && (
        <Group title={`Owner settings (${entry.ownerSettings.length})`} open>
          <ul className="g-list">{entry.ownerSettings.map((s) => <li key={s}>{s}</li>)}</ul>
        </Group>
      )}
      {entry.selectableParts.length > 0 && (
        <Group title={`Selectable parts (${entry.selectableParts.length})`} open>
          <ul className="g-list">{entry.selectableParts.map((s) => <li key={s}>{s}</li>)}</ul>
        </Group>
      )}
      {look && (
        <Group title="Look and fit">
          <dl className="g-fields">
            <Field label="Art direction">{sentence(entry.artDirection)}</Field>
            <Field label="Site types">
              {entry.siteTypes.length > 0 && (
                <ul className="g-chips">{entry.siteTypes.map((t) => <li key={t} className="g-chip">{t}</li>)}</ul>
              )}
            </Field>
          </dl>
        </Group>
      )}
      {history}
    </div>
  );
}

type PanelProps = { entry: Entry; code?: Code | null; history?: ReactNode; kit?: ReactNode; onEdit?: () => void };

function Panel({ entry, code, history, kit, onEdit }: PanelProps) {
  const [tab, setTab] = useState<Tab>('Details');
  const actions = (kit || onEdit) && (
    <div className="g-panel__actions">
      {kit}
      {onEdit && <button type="button" className="g-btn g-btn--ghost g-btn--sm" disabled={code === undefined} onClick={onEdit}>Edit</button>}
    </div>
  );
  return (
    <section className="g-panel" aria-label="Component information">
      <Tabs label="Component information" tabs={TABS} value={tab} onChange={setTab} end={actions} />
      <TabPanel tab={tab}>
        {tab === 'Details' && <Details entry={entry} history={history} />}
        {tab === 'Prompt' && <PromptPanel entry={entry} code={code} />}
        {tab === 'Code' && <CodePanel code={code} />}
      </TabPanel>
    </section>
  );
}

function Pager({ entries, index }: { entries: Entry[]; index: number }) {
  const prev = entries[index - 1];
  const next = entries[index + 1];
  return (
    <nav className="g-pager" aria-label="More components">
      {prev ? <a className="g-pager__link" href={viewHref(prev)}><span>← Previous</span>{prev.title}</a> : <span />}
      {next && <a className="g-pager__link g-pager__link--next" href={viewHref(next)}><span>Next →</span>{next.title}</a>}
    </nav>
  );
}

const kitHref = (name: string, isNew: boolean) =>
  isNew ? `/api/kit/new?name=${encodeURIComponent(name)}` : `/api/kit/${encodeURIComponent(name)}`;

function useCode(name: string) {
  const [saved, setSaved] = useState<Version | null>();
  const [repo, setRepo] = useState<Code | null>();
  useEffect(() => {
    fetchVersion(name).then((v) => setSaved(v ?? null), () => setSaved(null));
    loadRepoCode(name).then(setRepo, () => setRepo(null));
  }, [name]);
  const current = saved === undefined ? undefined : saved ?? repo;
  return { saved, setSaved, current };
}

export default function Detail({ name }: { name: string }) {
  const { entries } = useCatalog();
  const me = useMe();
  const work = useWorkState(name);
  const { saved, setSaved, current } = useCode(name);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Code>();
  const inRepo = isRepoName(name);
  const isNew = !inRepo && saved === null;
  const wantsNew = new URLSearchParams(location.search).get('new') === '1';
  const entry = inRepo || saved ? entryFor(name, saved?.meta) : isNew && wantsNew ? entryFor(name) : undefined;
  const index = entries.findIndex((e) => e.name === name);
  const previewCode = draft ?? saved ?? undefined;
  const holder = work.state?.assigneeEmail;
  const showState = SHOW_REVIEW && !isNew && work.state !== undefined;
  const canEdit = work.state !== undefined && (!holder || holder === me?.email);

  const close = () => {
    setEditing(false);
    setDraft(undefined);
  };
  const onSaved = (v: Version) => {
    setSaved(v);
    close();
    work.refresh();
    if (wantsNew) history.replaceState(null, '', `?view=${encodeURIComponent(name)}`);
  };

  useEffect(() => {
    document.title = entry ? `${entry.title} · Component Library` : 'Not found · Component Library';
  }, [entry?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!entry) {
    return (
      <main className="g-page g-page--detail">
        <a className="g-link g-back" href="./">← All components</a>
        <p className={saved === undefined ? 'g-muted' : 'g-empty'}>{saved === undefined ? 'Loading…' : `No component named “${name}”.`}</p>
      </main>
    );
  }

  const kit = SHOW_REVIEW && (
    <a className="g-btn g-btn--ghost g-btn--sm" href={kitHref(name, isNew)} download>
      {isNew ? 'Download blank kit' : 'Download kit'}
    </a>
  );

  const side =
    (isNew || editing) && current !== undefined ? (
      <Editor
        name={name}
        saved={saved ?? null}
        initial={current ?? { tsx: '', css: '' }}
        isNew={isNew}
        onPreview={setDraft}
        onSaved={onSaved}
        onClose={isNew ? undefined : close}
      />
    ) : (
      <Panel
        entry={entry}
        code={current}
        history={SHOW_REVIEW && <History name={name} version={work.changes} />}
        kit={kit}
        onEdit={SHOW_REVIEW && canEdit ? () => setEditing(true) : undefined}
      />
    );

  return (
    <main className="g-page g-page--detail">
      <a className="g-link g-back" href="./">← All components</a>
      <header className="g-detail__head">
        <div className="g-detail__top">
          <div className="g-detail__name">
            <h1 className="g-detail__title">{entry.title}</h1>
            {showState && <ClaimControl work={work} me={me} />}
            {showState && <StatusControl work={work} />}
          </div>
          {isNew && <div className="g-detail__controls">{kit}</div>}
        </div>
        {work.error && <p className="g-editor__notice g-editor__notice--bad" role="alert">{work.error}</p>}
        {metaLine(entry) && <p className="g-card__meta">{metaLine(entry)}</p>}
        {entry.job && <p className="g-detail__job">{entry.job}</p>}
      </header>
      <div className="g-detail__layout">
        {(!isNew || previewCode) && (
          <Preview entry={entry} code={previewCode} label={draft ? 'Unsaved preview' : saved ? 'Edited' : undefined} />
        )}
        {side}
      </div>
      {index >= 0 && <Pager entries={entries} index={index} />}
    </main>
  );
}
