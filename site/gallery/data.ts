export const SHOW_REVIEW = import.meta.env.VITE_PUBLIC !== '1';

type RawMeta = Record<string, unknown>;

export type Status = 'built' | 'rejected' | 'backlog' | 'unknown';

export type Entry = {
  name: string;
  title: string;
  category?: string;
  tier?: string;
  job?: string;
  visitorAction?: string;
  ownerSettings: string[];
  siteTypes: string[];
  mobile?: string;
  motion?: string;
  artDirection?: string;
  status: Status;
  statusRaw?: string;
  craft: unknown;
  studio2: unknown;
};

const metas = import.meta.glob<RawMeta>('../../components/*/meta.json', { eager: true, import: 'default' });
const prompts = import.meta.glob<string>('../../components/*/PROMPT.md', { query: '?raw', import: 'default' });
const components = import.meta.glob<string>('../../components/*/Component.tsx', { query: '?raw', import: 'default' });
const styles = import.meta.glob<string>('../../components/*/Component.module.css', { query: '?raw', import: 'default' });
const previewPaths = Object.keys(import.meta.glob('../../components/*/preview.tsx'));

const folderOf = (path: string) => path.match(/components\/([^/]+)\//)?.[1] ?? path;

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : []);

function parseStatus(raw?: string): Status {
  const s = raw?.toLowerCase() ?? '';
  if (s.startsWith('built')) return 'built';
  if (s.startsWith('rejected')) return 'rejected';
  if (s.startsWith('backlog')) return 'backlog';
  return 'unknown';
}

function toEntry(name: string, meta: RawMeta = {}): Entry {
  const checks = (meta.checks ?? {}) as RawMeta;
  const statusRaw = str(meta.status);
  return {
    name,
    title: str(meta.display_name) ?? name,
    category: str(meta.category),
    tier: str(meta.tier),
    job: str(meta.job),
    visitorAction: str(meta.visitor_action),
    ownerSettings: strList(meta.owner_settings),
    siteTypes: strList(meta.site_types),
    mobile: str(meta.mobile),
    motion: str(meta.motion),
    artDirection: str(meta.art_direction),
    status: parseStatus(statusRaw),
    statusRaw,
    craft: checks.craft,
    studio2: meta.studio2_tested,
  };
}

const metaByName = Object.fromEntries(Object.entries(metas).map(([p, m]) => [folderOf(p), m]));
const shuffleKey = (name: string) => [...name].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0, 29);
const names = [...new Set([...previewPaths.map(folderOf), ...Object.keys(metaByName)])].sort((a, b) => shuffleKey(a) - shuffleKey(b));

export const entries: Entry[] = names.map((n) => toEntry(n, metaByName[n]));

export const uniqueValues = (key: 'category' | 'tier') =>
  [...new Set(entries.map((e) => e[key]).filter((v): v is string => !!v))].sort();

export const metaLine = (e: Entry) => [e.category, e.tier].filter(Boolean).join(' · ');

export const isStudio2Tested = (e: Entry) => e.studio2 === true;

type RawLoaders = Record<string, () => Promise<string>>;

function loadRaw(loaders: RawLoaders, name: string): Promise<string | undefined> {
  const key = Object.keys(loaders).find((p) => folderOf(p) === name);
  return key ? loaders[key]() : Promise.resolve(undefined);
}

export const loadPrompt = (name: string) => loadRaw(prompts, name);

export type SourceFile = { file: string; text: string };

export async function loadCode(name: string): Promise<SourceFile[]> {
  const [tsx, css] = await Promise.all([loadRaw(components, name), loadRaw(styles, name)]);
  return [
    { file: 'Component.tsx', text: tsx },
    { file: 'Component.module.css', text: css },
  ].filter((f): f is SourceFile => !!f.text);
}
