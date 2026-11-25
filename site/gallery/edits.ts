import { useEffect, useState } from 'react';
import { transform } from 'sucrase';
import { loadRepoFiles, repoMeta, type RawMeta } from './data';

export type Code = { tsx: string; css: string; preview?: string | null; meta?: RawMeta | null };

export type VersionSummary = {
  id: number;
  name: string;
  authorEmail: string;
  authorName: string | null;
  createdAt: string;
  meta?: RawMeta | null;
  isNew?: boolean;
};

export type Version = VersionSummary & Code;

export type SaveResult =
  | { ok: true; version: Version }
  | { ok: false; conflict: VersionSummary | null }
  | { ok: false; error: string };

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(body?.error ?? `Request failed (${res.status})`), { status: res.status, body });
  return body as T;
}

const versionCache = new Map<string, Promise<Version | null>>();

export function fetchVersion(name: string, cached = false) {
  const hit = cached && versionCache.get(name);
  if (hit) return hit;
  const load = request<Version | null>(`/api/components/${encodeURIComponent(name)}`);
  versionCache.set(name, load);
  return load;
}

const fetchLatestVersions = () => request<VersionSummary[]>('/api/components');

export async function saveVersion(name: string, code: Code, baseVersionId: number | null, force: boolean, isNew: boolean): Promise<SaveResult> {
  try {
    const version = await request<Version>(`/api/components/${encodeURIComponent(name)}`, {
      method: 'POST',
      body: JSON.stringify({ ...code, baseVersionId, force, ...(isNew && { isNew }) }),
    });
    versionCache.delete(name);
    return { ok: true, version };
  } catch (err) {
    const { status, body, message } = err as Error & { status?: number; body?: { latest?: VersionSummary | null } };
    return status === 409 && body && 'latest' in body ? { ok: false, conflict: body.latest ?? null } : { ok: false, error: message };
  }
}

export async function loadRepoCode(name: string): Promise<Code | null> {
  const [tsx, css, preview] = await loadRepoFiles(name);
  return tsx ? { tsx, css: css ?? '', preview: preview ?? null, meta: repoMeta(name) ?? null } : null;
}

export function compile(tsx: string) {
  return transform(tsx, { transforms: ['typescript', 'jsx', 'imports'], jsxRuntime: 'automatic', production: true }).code;
}

const FONTSOURCE_IMPORT = /@fontsource\/([a-z0-9-]+)\/([a-z0-9-]+)\.css/g;

export async function loadFontLinks(name: string, preview?: string | null) {
  const source = preview ?? (await loadRepoFiles(name))[2] ?? '';
  return [...source.matchAll(FONTSOURCE_IMPORT)].map(
    ([, family, weight]) => `https://cdn.jsdelivr.net/npm/@fontsource/${family}@5/${weight}.css`,
  );
}

export const authorOf = (v: VersionSummary) => v.authorName || v.authorEmail;

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function relativeTime(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const [unit, size] = UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? ['second', 1];
  return unit === 'second' ? 'just now' : rtf.format(Math.round(seconds / size), unit);
}

export function useLatestVersions() {
  const [byName, setByName] = useState<Record<string, VersionSummary>>({});
  useEffect(() => {
    fetchLatestVersions()
      .then((list) => Array.isArray(list) && setByName(Object.fromEntries(list.map((v) => [v.name, v]))))
      .catch(() => {});
  }, []);
  return byName;
}
