import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'three': resolve(__dirname, 'js/vendor/three.module.js'),
    },
  },
  build: {
    cssMinify: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        borrow: resolve(__dirname, 'borrow.html'),
        stake: resolve(__dirname, 'stake.html'),
        loan: resolve(__dirname, 'loan.html'),
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://188.240.231.66:4000',
        changeOrigin: true,
      },
    },
  },
});
