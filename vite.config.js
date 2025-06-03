// pioracle/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import Sitemap from 'vite-plugin-sitemap'; // Your import might be different

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
        robotsTxtOptions: { // This is a common way to structure it, or similar
            enabled: false // Try to find an option to disable robots.txt generation/modification
        }
        // OR try:
        // generateRobotsTxt: false,
        // OR try:
        // robots: false, // If the plugin supports a simple boolean
      }),
    ],
  };
});
