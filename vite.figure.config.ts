import { defineConfig } from 'vite';
// Separate build for the figure study page; the application's entry is untouched.
export default defineConfig({ base: './', build: {
  target: 'es2020', outDir: 'dist-figure', chunkSizeWarningLimit: 900,
  rollupOptions: { input: 'experiments/figure/index.html' },
} });
