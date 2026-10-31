import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

// The check-in desk and the MC screen install as their own apps. Browsers may read the manifest link and the
// home-screen name straight from the served HTML (before any script runs), so each gets its own static page with
// them baked in (served by the vercel.json rewrites). Keep in sync with index.html and public/sw.js.
const APP_PAGES = [
  {file: 'check-in.html', manifest: '/manifest-checkin.webmanifest', name: 'Check-in'},
  {file: 'mc.html', manifest: '/manifest-mc.webmanifest', name: 'MC'},
];
const appPages = (): Plugin => ({
  name: 'app-pages',
  apply: 'build',
  writeBundle(options) {
    const dir = options.dir ?? 'dist';
    const index = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    for (const page of APP_PAGES) {
      const html = index
        .replace('href="/manifest.webmanifest"', `href="${page.manifest}"`)
        .replace('name="apple-mobile-web-app-title" content="Giám khảo"', `name="apple-mobile-web-app-title" content="${page.name}"`)
        .replace(/<title>[^<]*<\/title>/, `<title>${page.name} · HIPHOP XỨ TRÀ 2026</title>`);
      if (!html.includes(page.manifest) || !html.includes(`content="${page.name}"`))
        throw new Error(`app-pages: manifest link or app title not found in index.html for ${page.file}`);
      fs.writeFileSync(path.join(dir, page.file), html);
    }
  },
});

// TEST=true in .env: the dev server talks to the local emulators, sample-data tree (`bun run test:db`, see
// docs/dev-database.md). Never for builds, and e2e runs (which set VITE_FIREBASE_EMULATORS themselves) ignore it.
const TEST_EVENT_ID = 'hiphopxutra-2026-dev'; // keep in sync with scripts/db.ts DEV_EVENT_ID

export default defineConfig(({command, mode}) => {
  const test =
    command === 'serve' &&
    loadEnv(mode, process.cwd(), '').TEST === 'true' &&
    process.env.VITE_FIREBASE_EMULATORS === undefined;
  return {
    plugins: [react(), tailwindcss(), appPages()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: test
      ? {
          'import.meta.env.VITE_FIREBASE_EMULATORS': JSON.stringify('true'),
          'import.meta.env.VITE_EVENT_ID': JSON.stringify(TEST_EVENT_ID),
        }
      : {},
  };
});
