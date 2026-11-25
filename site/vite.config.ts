import { defineConfig, type Plugin } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import react from '@vitejs/plugin-react';

const DISPLAY_KEYS = [
  'display_name', 'category', 'tier', 'job', 'visitor_action', 'owner_settings', 'site_types',
  'mobile', 'motion', 'art_direction', 'status', 'studio2_tested',
];

// Public builds ship only the fields the gallery displays (no notes, provenance or scores)
const publicMeta = (): Plugin => ({
  name: 'public-meta',
  enforce: 'pre',
  load(id) {
    if (process.env.VITE_PUBLIC !== '1' || !/components\/[^/]+\/meta\.json$/.test(id)) return null;
    const meta = JSON.parse(readFileSync(id, 'utf8'));
    return JSON.stringify(Object.fromEntries(DISPLAY_KEYS.filter((k) => k in meta).map((k) => [k, meta[k]])));
  },
});

const COMPONENTS_DIR = new URL('../components/', import.meta.url).pathname;
const ASSET_DIRS = ['images', 'fonts'];
const ASSET_PREFIX = '/component-assets/';

const componentAssets = () =>
  readdirSync(COMPONENTS_DIR).flatMap((name) =>
    ASSET_DIRS.flatMap((dir) => {
      try {
        return readdirSync(join(COMPONENTS_DIR, name, dir)).map((file) => `${name}/${dir}/${file}`);
      } catch {
        return [];
      }
    }),
  );

// Serves components/<Name>/{images,fonts}/* at /component-assets/<Name>/... for the editor sandbox
const assetMime: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const publishComponentAssets = (): Plugin => ({
  name: 'component-assets',
  configureServer(server) {
    server.middlewares.use(ASSET_PREFIX, (req, res, next) => {
      const path = decodeURIComponent(req.url?.split('?')[0].slice(1) ?? '');
      if (!componentAssets().includes(path)) return next();
      res.setHeader('Content-Type', assetMime[extname(path)] ?? 'application/octet-stream');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(readFileSync(join(COMPONENTS_DIR, path)));
    });
  },
  generateBundle() {
    for (const path of componentAssets()) {
      this.emitFile({ type: 'asset', fileName: ASSET_PREFIX.slice(1) + path, source: readFileSync(join(COMPONENTS_DIR, path)) });
    }
  },
});

export default defineConfig({
  plugins: [publicMeta(), publishComponentAssets(), react()],
  server: { fs: { allow: ['..'] } },
});
