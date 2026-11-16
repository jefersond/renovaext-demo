import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        demo: resolve(__dirname, 'demo/index.html'),
        demoHtml: resolve(__dirname, 'demo.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
