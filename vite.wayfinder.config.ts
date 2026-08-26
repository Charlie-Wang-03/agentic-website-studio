import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  root: path.resolve('pilots/wayfinder'),
  build: { outDir: path.resolve('.tmp/wayfinder-dist'), emptyOutDir: true },
  server: { host: '127.0.0.1', port: 4173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
