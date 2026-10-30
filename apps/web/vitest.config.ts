import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Unit test komponen (jsdom). Test berada di samping file: *.test.ts(x).
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
