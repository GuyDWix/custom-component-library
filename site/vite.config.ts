import { defineConfig, type Plugin } from 'vite';
import { readFileSync } from 'node:fs';
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

export default defineConfig({
  plugins: [publicMeta(), react()],
  server: { fs: { allow: ['..'] } },
});
