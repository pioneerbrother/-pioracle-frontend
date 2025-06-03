// pioracle/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Ensure there are NO imports for 'vite-plugin-sitemap' here

export default defineConfig({ // Removed async if not needed by other plugins
  plugins: [
    react(),
    // Ensure the Sitemap({...}) block is completely GONE from here
  ],
});
