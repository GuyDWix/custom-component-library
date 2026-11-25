import { createServer } from 'node:http';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, posix, relative } from 'node:path';
import { crc32 } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const {
  PORT = '3000',
  PUBLIC_URL = 'https://blitz-app-production.up.railway.app',
  DATABASE_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  SESSION_SECRET,
  RAILWAY_ENVIRONMENT,
} = process.env;
const DEV_USER_EMAIL = RAILWAY_ENVIRONMENT ? undefined : process.env.DEV_USER_EMAIL;

if (!DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!SESSION_SECRET && !DEV_USER_EMAIL) throw new Error('SESSION_SECRET is required');

const DIST = fileURLToPath(new URL('../site/dist/', import.meta.url));
const COMPONENTS = fileURLToPath(new URL('../components/', import.meta.url));
const KIT_SKILL = fileURLToPath(new URL('../kit/skill/', import.meta.url));
const KIT_TEMPLATE = fileURLToPath(new URL('../kit/template/', import.meta.url));
const ROOT_PACKAGE = fileURLToPath(new URL('../package.json', import.meta.url));
const HOSTED_DOMAIN = 'wix.com';
const SESSION_COOKIE = 'session';
const STATE_COOKIE = 'oauth_state';
const SESSION_TTL_S = 7 * 24 * 3600;
const MAX_BODY = 2 * 1024 * 1024;
const NAME_RE = /^[A-Za-z0-9]+$/;
const STATUSES = ['backlog', 'in_progress', 'approved', 'rejected'];
const COMPONENT_FILES = { tsx: 'Component.tsx', css: 'Component.module.css', preview: 'preview.tsx', meta: 'meta.json' };
const PUBLIC_PATHS = [/^\/auth\//, /^\/sandbox\.html$/, /^\/component-assets\//];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const pool = new pg.Pool({ connectionString: DATABASE_URL });
pool.on('error', (err) => console.error('pg pool error', err));
await pool.query(`
  CREATE TABLE IF NOT EXISTS component_versions (
    id serial primary key,
    component text not null,
    tsx text not null,
    css text not null,
    author_email text not null,
    author_name text,
    created_at timestamptz default now()
  );
  CREATE INDEX IF NOT EXISTS component_versions_latest ON component_versions (component, id DESC);
  ALTER TABLE component_versions ADD COLUMN IF NOT EXISTS preview text;
  ALTER TABLE component_versions ADD COLUMN IF NOT EXISTS meta jsonb;
  CREATE TABLE IF NOT EXISTS component_state (
    component text primary key,
    status text not null,
    assignee_email text,
    assignee_name text,
    updated_by text,
    updated_at timestamptz default now()
  );
  CREATE TABLE IF NOT EXISTS component_events (
    id serial primary key,
    component text not null,
    action text not null,
    status text,
    assignee_name text,
    actor_email text,
    actor_name text,
    at timestamptz default now()
  );
  CREATE INDEX IF NOT EXISTS component_events_latest ON component_events (component, id DESC);
`);

const REPO_NAMES = new Set(
  (await readdir(COMPONENTS, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name),
);

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// --- cookies & signing ---

const sign = (value) => createHmac('sha256', SESSION_SECRET ?? '').update(value).digest('base64url');

function verify(signed) {
  const at = signed?.lastIndexOf('.') ?? -1;
  if (at < 1) return null;
  const value = signed.slice(0, at);
  const a = Buffer.from(signed.slice(at + 1));
  const b = Buffer.from(sign(value));
  return a.length === b.length && timingSafeEqual(a, b) ? value : null;
}

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie ?? '').split(';').map((c) => c.trim().split('=')).filter(([k, v]) => k && v)
      .map(([k, v]) => [k, decodeURIComponent(v)]),
  );
}

const isLocal = (req) => /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(req.headers.host ?? '');

function cookie(req, name, value, maxAge) {
  const attrs = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`];
  if (!isLocal(req)) attrs.push('Secure');
  return attrs.join('; ');
}

const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const decode = (str) => JSON.parse(Buffer.from(str, 'base64url').toString());

function getSession(req) {
  if (DEV_USER_EMAIL) return { email: DEV_USER_EMAIL, name: DEV_USER_EMAIL.split('@')[0] };
  const value = verify(parseCookies(req)[SESSION_COOKIE]);
  if (!value) return null;
  try {
    const session = decode(value);
    return session.exp > Date.now() / 1000 ? { email: session.email, name: session.name } : null;
  } catch {
    return null;
  }
}

// --- responses ---

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}

const sendJson = (res, status, data) => send(res, status, JSON.stringify(data), { 'Content-Type': TYPES['.json'] });

const redirect = (res, location, cookies = []) => send(res, 302, '', { Location: location, 'Set-Cookie': cookies });

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const page = (res, status, title, body) => send(res, status,
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title>` +
  '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#141414;color:#f5f5f5;font:15px/1.5 system-ui,sans-serif">' +
  `<main style="text-align:center;padding:24px"><h1 style="font-size:22px;margin:0 0 8px">${escapeHtml(title)}</h1><p style="color:#b8b8b8;margin:0">${body}</p></main>`,
  { 'Content-Type': TYPES['.html'] });

// --- auth ---

const redirectUri = () => new URL('/auth/callback', PUBLIC_URL).href;
const safeNext = (next) => (typeof next === 'string' && /^\/(?![\/\\])/.test(next) ? next : '/');

function login(req, res, url) {
  const state = randomBytes(24).toString('base64url');
  const payload = encode({ state, next: safeNext(url.searchParams.get('next')) });
  const authorize = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorize.search = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID ?? '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    hd: HOSTED_DOMAIN,
    prompt: 'select_account',
    state,
  }).toString();
  redirect(res, authorize.href, [cookie(req, STATE_COOKIE, `${payload}.${sign(payload)}`, 600)]);
}

async function callback(req, res, url) {
  const clearState = cookie(req, STATE_COOKIE, '', 0);
  const stored = verify(parseCookies(req)[STATE_COOKIE]);
  const { state, next } = stored ? decode(stored) : {};
  if (!state || state !== url.searchParams.get('state')) {
    return page(res, 400, 'Sign-in expired', '<a style="color:#6f9bff" href="/auth/login">Try again</a>');
  }
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: url.searchParams.get('code') ?? '',
      client_id: GOOGLE_CLIENT_ID ?? '',
      client_secret: GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  });
  const token = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !token.id_token) throw new HttpError(502, 'Google sign-in failed');
  // id_token comes straight from Google's token endpoint over TLS, so the signature check is optional (OIDC 3.1.3.7)
  const claims = decode(token.id_token.split('.')[1]);
  if (claims.hd !== HOSTED_DOMAIN || claims.email_verified !== true) {
    return redirect(res, '/auth/denied', [clearState]);
  }
  const session = encode({ email: claims.email, name: claims.name ?? claims.email, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S });
  redirect(res, safeNext(next), [clearState, cookie(req, SESSION_COOKIE, `${session}.${sign(session)}`, SESSION_TTL_S)]);
}

function authRoute(req, res, url) {
  switch (url.pathname) {
    case '/auth/login': return login(req, res, url);
    case '/auth/callback': return callback(req, res, url);
    case '/auth/logout':
      res.setHeader('Set-Cookie', cookie(req, SESSION_COOKIE, '', 0));
      return page(res, 200, 'Signed out', '<a style="color:#6f9bff" href="/auth/login">Sign in again</a>');
    case '/auth/denied':
      return page(res, 403, 'Access denied', `Sign in with a verified @${HOSTED_DOMAIN} Google account. <a style="color:#6f9bff" href="/auth/login">Try again</a>`);
    default: throw new HttpError(404, 'Not found');
  }
}

// --- API ---

const toVersion = (row) => row && {
  id: row.id,
  name: row.component,
  tsx: row.tsx,
  css: row.css,
  preview: row.preview,
  meta: row.meta,
  authorEmail: row.author_email,
  authorName: row.author_name,
  createdAt: row.created_at,
};

const toState = (row) => ({
  name: row.component,
  status: row.status,
  assigneeEmail: row.assignee_email,
  assigneeName: row.assignee_name,
  updatedBy: row.updated_by,
  updatedAt: row.updated_at,
});

const toEvent = (row) => ({
  id: row.id,
  action: row.action,
  status: row.status,
  assigneeName: row.assignee_name,
  actorEmail: row.actor_email,
  actorName: row.actor_name,
  at: row.at,
});

const LATEST = 'SELECT * FROM component_versions WHERE component = $1 ORDER BY id DESC LIMIT 1';

const latestVersion = async (db, name) => toVersion((await db.query(LATEST, [name])).rows[0]) ?? null;

async function readJson(req) {
  if (!/^application\/json\b/.test(req.headers['content-type'] ?? '')) throw new HttpError(415, 'Expected application/json');
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, 'Body too large (max 2MB)');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

async function transaction(name, work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [name]);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

function parseVersionBody(body) {
  const { tsx, css, preview, meta, baseVersionId = null, force = false, isNew = false } = body ?? {};
  if (typeof tsx !== 'string' || !tsx.trim() || typeof css !== 'string') throw new HttpError(400, 'tsx and css must be strings');
  if (preview != null && typeof preview !== 'string') throw new HttpError(400, 'preview must be a string');
  if (meta != null && !isPlainObject(meta)) throw new HttpError(400, 'meta must be an object');
  return { tsx, css, preview, meta, baseVersionId, force, isNew };
}

function saveVersion(name, body, user) {
  const { tsx, css, preview, meta, baseVersionId, force, isNew } = parseVersionBody(body);
  return transaction(name, async (client) => {
    const latest = await latestVersion(client, name);
    if (isNew && (REPO_NAMES.has(name) || latest)) throw new HttpError(409, 'Name taken');
    if (!isNew && !force && (latest?.id ?? null) !== baseVersionId) {
      const { tsx: _t, css: _c, preview: _p, ...summary } = latest ?? {};
      throw new HttpError(409, 'A newer version was saved', { latest: latest ? summary : null });
    }
    if (!isNew && !latest && !REPO_NAMES.has(name)) throw new HttpError(404, 'Unknown component');
    const base = latest ?? (await repoBase(name));
    const keptMeta = meta ?? base?.meta;
    const { rows } = await client.query(
      'INSERT INTO component_versions (component, tsx, css, preview, meta, author_email, author_name) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, tsx, css, preview ?? base?.preview ?? null, keptMeta ? JSON.stringify(keptMeta) : null, user.email, user.name],
    );
    return toVersion(rows[0]);
  });
}

async function listComponents() {
  const { rows } = await pool.query(
    'SELECT DISTINCT ON (component) id, component, meta, author_email, author_name, created_at FROM component_versions ORDER BY component, id DESC',
  );
  return rows.map((row) => ({ ...toVersion(row), isNew: !REPO_NAMES.has(row.component) }));
}

async function assertExists(name) {
  if (!REPO_NAMES.has(name) && !(await latestVersion(pool, name))) throw new HttpError(404, 'Unknown component');
}

function nextState(current, body, user) {
  const status = current?.status ?? 'backlog';
  const assignee = { assignee_email: current?.assignee_email ?? null, assignee_name: current?.assignee_name ?? null };
  switch (body?.action) {
    case 'claim':
      return { status: status === 'backlog' ? 'in_progress' : status, assignee_email: user.email, assignee_name: user.name };
    case 'release':
      return { status, assignee_email: null, assignee_name: null };
    case 'status':
      if (!STATUSES.includes(body.status)) throw new HttpError(400, `status must be one of ${STATUSES.join(', ')}`);
      return { status: body.status, ...assignee };
    default: throw new HttpError(400, 'action must be claim, release or status');
  }
}

async function changeState(name, body, user) {
  await assertExists(name);
  return transaction(name, async (client) => {
    const current = (await client.query('SELECT * FROM component_state WHERE component = $1', [name])).rows[0];
    const next = nextState(current, body, user);
    const { rows } = await client.query(
      `INSERT INTO component_state (component, status, assignee_email, assignee_name, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (component) DO UPDATE SET status = $2, assignee_email = $3, assignee_name = $4, updated_by = $5, updated_at = now()
       RETURNING *`,
      [name, next.status, next.assignee_email, next.assignee_name, user.email],
    );
    await client.query(
      'INSERT INTO component_events (component, action, status, assignee_name, actor_email, actor_name) VALUES ($1, $2, $3, $4, $5, $6)',
      [name, body.action, next.status, next.assignee_name, user.email, user.name],
    );
    return toState(rows[0]);
  });
}

async function listEvents(name) {
  const { rows } = await pool.query('SELECT * FROM component_events WHERE component = $1 ORDER BY id DESC LIMIT 50', [name]);
  return rows.map(toEvent);
}

// --- kit ---

const readOptional = (file) => readFile(file).catch(() => null);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(entries.map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : e.isFile() ? [join(dir, e.name)] : [])));
  return nested.flat();
}

const filesUnder = async (dir, prefix) =>
  Promise.all((await walk(dir)).map(async (file) => ({ path: posix.join(prefix, relative(dir, file).split('\\').join('/')), data: await readFile(file) })));

const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

function zip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { path, data } of files) {
    const name = Buffer.from(path);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, data);
    centrals.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

const FALLBACK_PREVIEW = "import Component from './Component';\n\nexport default function Preview() {\n  return <Component />;\n}\n";

const fontPackages = (preview) => [...preview.matchAll(/['"]@fontsource\/([a-z0-9-]+)[/'"]/g)].map((m) => `@fontsource/${m[1]}`);

async function kitPackage(name, preview) {
  const template = JSON.parse(await readFile(join(KIT_TEMPLATE, 'package.json'), 'utf8'));
  const root = JSON.parse(await readFile(ROOT_PACKAGE, 'utf8'));
  const rootVersions = { ...root.dependencies, ...root.devDependencies };
  const pin = (deps) => Object.fromEntries(Object.entries(deps).map(([dep, v]) => [dep, rootVersions[dep] ?? v]));
  const fonts = Object.fromEntries(fontPackages(preview).map((dep) => [dep, '^5']));
  const pkg = {
    ...template,
    name: `${name.toLowerCase()}-kit`,
    dependencies: pin(template.dependencies),
    devDependencies: { ...pin(template.devDependencies), ...fonts },
  };
  return JSON.stringify(pkg, null, 2) + '\n';
}

async function kitZip(name, component, images) {
  const scaffold = (await filesUnder(KIT_TEMPLATE, '')).filter((f) => !f.path.startsWith('starter/') && f.path !== 'package.json');
  const files = [
    ...scaffold,
    { path: 'package.json', data: Buffer.from(await kitPackage(name, component.preview)) },
    ...Object.entries(COMPONENT_FILES).map(([key, file]) => ({ path: `component/${file}`, data: Buffer.from(component[key]) })),
    ...images,
    ...(await filesUnder(KIT_SKILL, 'skill')),
  ];
  return zip(files.map((f) => ({ ...f, path: `${name}-kit/${f.path}` })));
}

const readRepoFile = (name, key) => readOptional(join(COMPONENTS, name, COMPONENT_FILES[key])).then((b) => b?.toString() ?? null);

async function repoBase(name) {
  if (!REPO_NAMES.has(name)) return null;
  const [preview, meta] = await Promise.all([readRepoFile(name, 'preview'), readRepoFile(name, 'meta')]);
  return { preview, meta: meta ? JSON.parse(meta) : null };
}

async function existingKit(name) {
  const latest = await latestVersion(pool, name);
  if (!latest && !REPO_NAMES.has(name)) throw new HttpError(404, 'Unknown component');
  const pick = async (key) => latest?.[key] ?? (await readRepoFile(name, key));
  const meta = latest?.meta ? JSON.stringify(latest.meta, null, 2) + '\n' : await readRepoFile(name, 'meta');
  const component = {
    tsx: await pick('tsx'),
    css: await pick('css'),
    preview: (await pick('preview')) ?? FALLBACK_PREVIEW,
    meta: meta ?? JSON.stringify({ name, display_name: humanize(name) }, null, 2) + '\n',
  };
  const assets = await Promise.all(['images', 'fonts'].map((dir) => filesUnder(join(COMPONENTS, name, dir), `component/${dir}`)));
  return kitZip(name, component, assets.flat());
}

const humanize = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');

async function blankKit(name = 'MyComponent') {
  if (!NAME_RE.test(name)) throw new HttpError(400, 'Invalid component name');
  const starter = (key) => readFile(join(KIT_TEMPLATE, 'starter', COMPONENT_FILES[key]), 'utf8');
  const rename = async (key) => (await starter(key)).replaceAll('Starter', name);
  const meta = { ...JSON.parse(await starter('meta')), name, display_name: humanize(name) };
  const component = {
    tsx: await rename('tsx'),
    css: await starter('css'),
    preview: await rename('preview'),
    meta: JSON.stringify(meta, null, 2) + '\n',
  };
  return kitZip(name, component, []);
}

const sendZip = (res, filename, data) => send(res, 200, data, {
  'Content-Type': 'application/zip',
  'Content-Disposition': `attachment; filename="${filename}"`,
});

async function kit(req, res, url, name) {
  if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed');
  if (name === 'new') {
    const newName = url.searchParams.get('name') || undefined;
    if (newName && (REPO_NAMES.has(newName) || (await latestVersion(pool, newName)))) throw new HttpError(409, 'Name taken');
    return sendZip(res, `${newName ?? 'component'}-kit.zip`, await blankKit(newName));
  }
  if (!NAME_RE.test(name)) throw new HttpError(400, 'Invalid component name');
  return sendZip(res, `${name}-kit.zip`, await existingKit(name));
}

// --- API router ---

function only(req, method) {
  if (req.method !== method) throw new HttpError(405, 'Method not allowed');
}

async function componentRoute(req, res, name, sub, user) {
  if (!NAME_RE.test(name)) throw new HttpError(400, 'Invalid component name');
  if (!sub) {
    if (req.method === 'GET') return sendJson(res, 200, await latestVersion(pool, name));
    if (req.method === 'POST') return sendJson(res, 201, await saveVersion(name, await readJson(req), user));
    throw new HttpError(405, 'Method not allowed');
  }
  if (sub === 'state') {
    only(req, 'POST');
    return sendJson(res, 200, await changeState(name, await readJson(req), user));
  }
  if (sub === 'events') {
    only(req, 'GET');
    return sendJson(res, 200, await listEvents(name));
  }
  throw new HttpError(404, 'Not found');
}

async function api(req, res, url, user) {
  const [, , resource, name, sub, ...rest] = url.pathname.split('/');
  if (rest.length) throw new HttpError(404, 'Not found');
  if (resource === 'me' && !name) {
    only(req, 'GET');
    return sendJson(res, 200, user);
  }
  if (resource === 'state' && !name) {
    only(req, 'GET');
    const { rows } = await pool.query('SELECT * FROM component_state ORDER BY component');
    return sendJson(res, 200, rows.map(toState));
  }
  if (resource === 'kit' && name && !sub) return kit(req, res, url, name);
  if (resource !== 'components') throw new HttpError(404, 'Not found');
  if (!name) {
    only(req, 'GET');
    return sendJson(res, 200, await listComponents());
  }
  return componentRoute(req, res, name, sub, user);
}

// --- static ---

// Decoded and normalized, so auth checks and file lookup see the same path
function staticPath(url) {
  let pathname;
  try {
    pathname = posix.normalize(decodeURIComponent(url.pathname));
  } catch {
    throw new HttpError(400, 'Bad path');
  }
  if (!pathname.startsWith('/') || pathname.includes('\0') || pathname.includes('\\')) throw new HttpError(400, 'Bad path');
  return pathname;
}

async function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed');
  const file = join(DIST, pathname);
  if (!file.startsWith(DIST)) throw new HttpError(403, 'Forbidden');

  const found = await stat(file).then((s) => s.isFile(), () => false);
  // Unknown extensionless paths fall back to the SPA shell; missing assets stay 404
  const target = found ? file : !extname(pathname) ? join(DIST, 'index.html') : null;
  if (!target) throw new HttpError(404, 'Not found');

  const headers = {
    'Content-Type': TYPES[extname(target)] ?? 'application/octet-stream',
    'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  };
  if (pathname.startsWith('/component-assets/')) headers['Access-Control-Allow-Origin'] = '*';
  if (pathname === '/sandbox.html') headers['Content-Security-Policy'] = 'sandbox allow-scripts';
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : await readFile(target));
}

// --- router ---

async function handle(req, res) {
  const url = new URL(req.url ?? '/', 'http://local');
  if (url.pathname.startsWith('/auth/')) return authRoute(req, res, url);
  const isApi = url.pathname.startsWith('/api/');
  const pathname = isApi ? url.pathname : staticPath(url);
  const isPublic = PUBLIC_PATHS.some((re) => re.test(pathname));
  const user = getSession(req);
  if (!user && !isPublic) {
    if (isApi) throw new HttpError(401, 'Sign in required');
    return redirect(res, `/auth/login?next=${encodeURIComponent(url.pathname + url.search)}`);
  }
  return isApi ? api(req, res, url, user) : serveStatic(req, res, pathname);
}

createServer((req, res) => {
  handle(req, res).catch((err) => {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error(err);
    if (res.headersSent) return res.end();
    const message = status === 500 ? 'Server error' : err.message;
    if (req.url?.startsWith('/api/')) sendJson(res, status, { error: message, ...err.extra });
    else page(res, status, message, '');
  });
}).listen(Number(PORT), () => console.log(`Listening on :${PORT}`));
