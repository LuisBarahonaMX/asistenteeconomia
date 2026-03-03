// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [ react(), VitePWA(/* ... */) ],
  server: {
    port: 3000,
    proxy: {
      // cualquier llamada a /openai/* se redirige a https://api.openai.com/*
      '/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/openai/, '')
      }
    }
  }
});
