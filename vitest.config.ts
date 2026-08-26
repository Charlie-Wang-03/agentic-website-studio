import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/wayfinder-e2e/**', 'node_modules/**', '.tmp/**'],
  },
});
