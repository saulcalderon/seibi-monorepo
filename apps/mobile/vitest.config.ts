import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Unit tests for plain TypeScript modules only (no React Native in Node).
// What needs the phone is proven with the verify skill. `@/` resolves as in
// tsconfig.json, so a tested module can use the app's import paths.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
