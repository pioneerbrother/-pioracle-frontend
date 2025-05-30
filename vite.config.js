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
        // Exclude the Google HTML verification file PATH AS THE PLUGIN SEES IT
        exclude: ['/google3ea9863098b060a5'] // <<< REMOVE .html FROM THE EXCLUDE PATH
      }),
    ],
  };
});
