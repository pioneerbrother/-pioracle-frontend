// pioracle/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import Sitemap from 'vite-plugin-sitemap';

export default defineConfig(async () => {
  return {
    plugins: [
      react(),
      Sitemap({
        hostname: 'https://pioracle.online',
        dynamicRoutes: [ 
          '/predictions',
          '/resolved-markets',
          '/my-predictions'
        ],
        exclude: [
          '/google3ea9863098b060a5.html' // <<<< Use the actual, correct filename
        ]
      }),
    ],
  };
});
