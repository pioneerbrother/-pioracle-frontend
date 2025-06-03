// pioracle/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import Sitemap from 'vite-plugin-sitemap'; // Assuming this is your import

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
        exclude: ['/google3ea9863098b060a5'],
        robots: [ // <<< MAKE SURE THIS IS HERE
          {
            userAgent: '*',
            allow: '/',
            // The plugin should add the Sitemap directive based on this
          },
        ],
      }),
    ],
  };
});
