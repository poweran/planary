import { defineConfig } from 'vite';

export default defineConfig({
  base: '/planary/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    minify: 'esbuild',
  },
  server: {
    port: 3000,
    open: true,
  },
});
