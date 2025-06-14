// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No markdown imports are needed here anymore.

export default defineConfig({
  plugins: [
    react(),
    // No markdown plugin is needed in this array.
  ],
  resolve: {
    alias: {
      'ethers5': 'ethers',
    },
  },
});
