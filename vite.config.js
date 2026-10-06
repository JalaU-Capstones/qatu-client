import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/',
  server: {
    port: 5173,
    proxy: {
      '/v1': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
  },
});
