import { useMemo } from 'react';
import { isRepoName, repoEntries, repoMeta, toEntry, type Entry, type RawMeta } from './data';
import { useLatestVersions, type VersionSummary } from './edits';

export const entryFor = (name: string, dbMeta?: RawMeta | null): Entry =>
  toEntry(name, { ...repoMeta(name), ...dbMeta }, isRepoName(name));

export function buildEntries(versions: Record<string, VersionSummary>) {
  const created = Object.values(versions)
    .filter((v) => v.isNew && !isRepoName(v.name))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((v) => entryFor(v.name, v.meta));
  const repo = repoEntries.map((e) => (versions[e.name]?.meta ? entryFor(e.name, versions[e.name].meta) : e));
  return [...created, ...repo];
}

export function useCatalog() {
  const versions = useLatestVersions();
  const entries = useMemo(() => buildEntries(versions), [versions]);
  return { entries, versions };
}
