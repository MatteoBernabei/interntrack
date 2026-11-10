import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Test configuration only: the app build still uses vite.config.ts.
export default defineConfig({
  plugins: [
    {
      // The app reads its settings as `(import.meta as any).env`. The production build understands it;
      // the test runner needs the plain form to be able to simulate the settings.
      name: 'plain-import-meta-env',
      enforce: 'pre',
      transform(code: string, id: string) {
        if (!id.includes('/src/') || !code.includes('(import.meta as any).env')) return null;
        return { code: code.split('(import.meta as any).env').join('import.meta.env'), map: null };
      },
    },
    react(),
  ],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['tests/setup.ts'],
    css: false,
    testTimeout: 60000,
    // each test file gets its own module registry: demo and real mode never share state
    isolate: true,
  },
});
