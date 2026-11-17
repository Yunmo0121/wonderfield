import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// base: './' keeps asset paths relative, so the build works on GitHub Pages
// (https://<user>.github.io/wonderfield/) without extra configuration.
// Every issue is its own page: add it to `input` when it is ready.
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'index.html'),
        synchrony: resolve(__dirname, 'synchrony/index.html'),
      },
    },
  },
});
