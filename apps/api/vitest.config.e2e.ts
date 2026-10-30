import { defineConfig } from 'vitest/config';

// E2E memakai database test (DATABASE_URL di CI: matwona_test).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    fileParallelism: false,
  },
});
