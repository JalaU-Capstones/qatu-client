import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/',
  server: {
    port: 5173,
    proxy: {
      // API (existing)
      '/v1': 'http://localhost:3000',
      // Storage (ADR-019 Phase 2) — resolve to Supabase CLI on host.
      // Paths are preserved: /avatars/u/f.png -> http://localhost:54321/storage/v1/object/public/avatars/u/f.png
      '/avatars': {
        target: 'http://localhost:54321/storage/v1/object/public',
        changeOrigin: true,
      },
      '/product-images': {
        target: 'http://localhost:54321/storage/v1/object/public',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
