import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const gameRoot = resolve(__dirname, 'game-src');

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/games/' : '/',
  plugins: [
    react(),
    command === 'serve' &&
      !isPreview && {
      name: 'development-csp',
      transformIndexHtml(html) {
        return html
          .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
          .replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
          .replace("connect-src 'none'", "connect-src 'self' ws:");
      },
    },
  ].filter(Boolean),
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
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
}));
