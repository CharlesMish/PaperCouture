import { defineConfig } from 'vite';
// Separate build for the placement review page; the application's entry is untouched.
export default defineConfig({ base: './', build: {
  target: 'es2020', outDir: 'dist-placement', chunkSizeWarningLimit: 900,
  rollupOptions: { input: 'experiments/placement/index.html' },
} });
