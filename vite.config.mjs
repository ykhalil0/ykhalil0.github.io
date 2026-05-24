import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const gameRoot = resolve(__dirname, 'game-src');

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/games/' : '/',
  plugins: [react()],
  root: gameRoot,
  build: {
    outDir: resolve(__dirname, 'games'),
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        digitalBlockSpan: resolve(gameRoot, 'digital-block-span/index.html'),
        reverseCorsiBlock: resolve(gameRoot, 'reverse-corsi-block/index.html'),
      },
    },
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
