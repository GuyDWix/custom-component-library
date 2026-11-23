import { useEffect, useState, type ReactNode } from 'react';
import { entries, metaLine, type Entry } from './data';
import Badges from './Badges';
import { CodePanel, PromptPanel } from './PromptPanel';
import ScaledFrame from './ScaledFrame';
import Segmented from './Segmented';

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

function Preview({ entry }: { entry: Entry }) {
  const [device, setDevice] = useState<Device>('desktop');
  const [data, setData] = useState<Data>('optimal');
  const src = previewHref(entry) + (data === 'extreme' ? '&worst=1' : '');
  const title = `${entry.title} live preview`;

  return (
    <section className="g-preview" aria-label="Live preview">
      <div className="g-preview__bar">
        <Segmented label="Viewport" value={device} options={DEVICES} onChange={setDevice} />
        <Segmented label="Data" value={data} options={DATA} onChange={setData} />
        <a className="g-link g-preview__open" href={src} target="_blank" rel="noreferrer">
          Open full page ↗
        </a>
      </div>
      {device === 'desktop' ? (
        <div className="g-stage">
          <ScaledFrame key={src} src={src} title={title} width={1280} height={800} fitContent />
        </div>
      ) : (
        <div className="g-stage g-stage--mobile">
          <div className="g-device">
            <ScaledFrame key={src} src={src} title={title} width={375} height={760} maxScale={1} fitContent />
          </div>
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

function Details({ entry }: { entry: Entry }) {
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
    </div>
  );
}

function Panel({ entry }: { entry: Entry }) {
  const [tab, setTab] = useState<Tab>('Details');
  const id = (t: Tab) => `g-tab-${t.toLowerCase()}`;
  return (
    <section className="g-panel" aria-label="Component information">
      <div className="g-tabs" role="tablist" aria-label="Component information">
        {TABS.map((t) => (
          <button
            key={t}
            id={id(t)}
            type="button"
            role="tab"
            className="g-tab"
            aria-selected={t === tab}
            aria-controls={`${id(t)}-panel`}
            tabIndex={t === tab ? 0 : -1}
            onClick={() => setTab(t)}
            onKeyDown={(e) => {
              const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
              if (!step) return;
              const next = TABS[(TABS.indexOf(tab) + step + TABS.length) % TABS.length];
              setTab(next);
              document.getElementById(id(next))?.focus();
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div id={`${id(tab)}-panel`} role="tabpanel" aria-labelledby={id(tab)} className="g-tabpanel">
        {tab === 'Details' && <Details entry={entry} />}
        {tab === 'Prompt' && <PromptPanel name={entry.name} />}
        {tab === 'Code' && <CodePanel name={entry.name} />}
      </div>
    </section>
  );
}

function Pager({ index }: { index: number }) {
  const prev = entries[index - 1];
  const next = entries[index + 1];
  return (
    <nav className="g-pager" aria-label="More components">
      {prev ? <a className="g-pager__link" href={viewHref(prev)}><span>← Previous</span>{prev.title}</a> : <span />}
      {next && <a className="g-pager__link g-pager__link--next" href={viewHref(next)}><span>Next →</span>{next.title}</a>}
    </nav>
  );
}

export default function Detail({ name }: { name: string }) {
  const index = entries.findIndex((e) => e.name === name);
  const entry = entries[index];

  useEffect(() => {
    document.title = entry ? `${entry.title} · Component Library` : 'Not found · Component Library';
  }, [entry]);

  return (
    <main className="g-page g-page--detail">
      <a className="g-link g-back" href="./">← All components</a>
      {entry ? (
        <>
          <header className="g-detail__head">
            <h1 className="g-detail__title">{entry.title}</h1>
            {metaLine(entry) && <p className="g-card__meta">{metaLine(entry)}</p>}
            {entry.job && <p className="g-detail__job">{entry.job}</p>}
            <Badges entry={entry} />
          </header>
          <div className="g-detail__layout">
            <Preview entry={entry} />
            <Panel entry={entry} />
          </div>
          <Pager index={index} />
        </>
      ) : (
        <p className="g-empty">No component named “{name}”.</p>
      )}
    </main>
  );
}
