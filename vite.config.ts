import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

// TEST=true in .env: the dev server talks to the local emulators, sample-data tree (`bun run test:db`, see
// docs/dev-database.md). Never for builds, and e2e runs (which set VITE_FIREBASE_EMULATORS themselves) ignore it.
const TEST_EVENT_ID = 'hiphopxutra-2026-dev'; // keep in sync with scripts/db.ts DEV_EVENT_ID

export default defineConfig(({command, mode}) => {
  const test =
    command === 'serve' &&
    loadEnv(mode, process.cwd(), '').TEST === 'true' &&
    process.env.VITE_FIREBASE_EMULATORS === undefined;
  return {
    plugins: [react(), tailwindcss()],
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
