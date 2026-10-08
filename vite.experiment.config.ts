import { defineConfig } from 'vite';
// Separate build: the existing application's entry and registries are untouched.
export default defineConfig({ base: './', build: {
  target: 'es2020', outDir: 'dist-experiment', chunkSizeWarningLimit: 900,
  rollupOptions: { input: 'experiments/fold-study/index.html' },
} });
