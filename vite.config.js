// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Import the entire package as the default export 'pkg'
import pkg from 'vite-plugin-markdown';

// Destructure the 'markdown' function and 'Mode' object from the package
const { markdown, Mode } = pkg;

export default defineConfig({
  plugins: [
    react(),
    // Use the correctly imported markdown function
    markdown({ mode: [Mode.FRONTMATTER, Mode.MARKDOWN] }),
  ],
  resolve: {
    alias: {
      'ethers5': 'ethers',
    },
  },
});
