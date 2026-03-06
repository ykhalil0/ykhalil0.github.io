import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/games/digital-block-span/' : '/',
  plugins: [react()],
  root: resolve(__dirname, 'game-src'),
  build: {
    outDir: resolve(__dirname, 'games/digital-block-span'),
    emptyOutDir: true,
    assetsDir: 'assets',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
}));
