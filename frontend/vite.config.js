/**
 * MiseEnPlace (frontend) — Configuration de Vite et de Vitest.
 *
 * En développement, les appels à /api sont redirigés vers le backend (port 3001).
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
});
