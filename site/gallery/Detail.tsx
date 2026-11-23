import { useEffect, useState, type ReactNode } from 'react';
import { entries, metaLine, type Entry } from './data';
import Badges from './Badges';
import PromptPanel from './PromptPanel';
import ScaledFrame from './ScaledFrame';
import Segmented from './Segmented';

const DEVICES = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
] as const;

const DATA = [
  { value: 'normal', label: 'Normal' },
  { value: 'worst', label: 'Worst case' },
] as const;

type Device = (typeof DEVICES)[number]['value'];
type Data = (typeof DATA)[number]['value'];

const viewHref = (e: Entry) => `?view=${encodeURIComponent(e.name)}`;
const previewHref = (e: Entry) => `?c=${encodeURIComponent(e.name)}`;

function Preview({ entry }: { entry: Entry }) {
  const [device, setDevice] = useState<Device>('desktop');
  const [data, setData] = useState<Data>('normal');
  const src = previewHref(entry) + (data === 'worst' ? '&worst=1' : '');
  const title = `${entry.title} live preview`;

  return (
    <section className="g-preview" aria-label="Live preview">
      <div className="g-preview__bar">
        <Segmented label="Viewport" value={device} options={DEVICES} onChange={setDevice} />
        <Segmented label="Data" value={data} options={DATA} onChange={setData} />
        <a className="g-link g-preview__open" href={previewHref(entry)} target="_blank" rel="noreferrer">
          Open full page ↗
        </a>
      </div>
      {device === 'desktop' ? (
        <div className="g-stage">
          <ScaledFrame key={src} src={src} title={title} width={1280} height={800} />
        </div>
      ) : (
        <div className="g-stage g-stage--mobile">
          <div className="g-device">
            <ScaledFrame key={src} src={src} title={title} width={375} height={760} maxScale={1} />
          </div>
        </div>
      )}
    </section>
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

const list = (items: string[]) => (items.length ? <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul> : null);

function Details({ entry }: { entry: Entry }) {
  return (
    <dl className="g-details">
      <Field label="Visitor action">{entry.visitorAction}</Field>
      <Field label="Owner settings">{list(entry.ownerSettings)}</Field>
      <Field label="Mobile">{entry.mobile}</Field>
      <Field label="Motion">{entry.motion}</Field>
      <Field label="Site types">{entry.siteTypes.join(', ') || null}</Field>
      <Field label="Art direction">{entry.artDirection}</Field>
    </dl>
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
            <Badges entry={entry} detailed />
          </header>
          <Preview entry={entry} />
          <div className="g-detail__cols">
            <section aria-labelledby="g-details-h">
              <h2 id="g-details-h" className="g-h2">Details</h2>
              <Details entry={entry} />
            </section>
            <section aria-labelledby="g-prompt-h">
              <h2 id="g-prompt-h" className="g-h2">Prompt</h2>
              <PromptPanel name={entry.name} />
            </section>
          </div>
          <Pager index={index} />
        </>
      ) : (
        <p className="g-empty">No component named “{name}”.</p>
      )}
    </main>
  );
}
