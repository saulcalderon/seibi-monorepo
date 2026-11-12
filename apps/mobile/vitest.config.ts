import { defineConfig } from 'vitest/config';

// Unit tests for plain TypeScript modules only (no React Native in Node).
// What needs the phone is proven with the verify skill.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
