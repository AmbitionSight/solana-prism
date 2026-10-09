import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Load-bearing, not cosmetic. With Vitest's default (`css: false`), a CSS
    // file imported with `?raw` resolves to an EMPTY string — so
    // no-hardcoded-pixels.test.ts got the right number of keys containing
    // nothing, and its stylesheet half became a check that could not fail.
    // Turning this off silently re-breaks iron rule 2's only machine guard.
    css: true,
  },
});
