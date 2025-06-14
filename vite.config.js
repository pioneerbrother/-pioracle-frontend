// pioracle/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vitePluginMarkdown from 'vite-plugin-markdown';

const { markdown, Mode } = vitePluginMarkdown;

export default defineConfig({ // Removed async if not needed by other plugins
  plugins: [
    react(),
    // Ensure the Sitemap({...}) block is completely GONE from here
     markdown({ mode: [Mode.FRONTMATTER, Mode.MARKDOWN] }), // <-- 2. USE THE PLUGIN
  ],
   resolve: {
    alias: {
      // If a library tries to import "ethers5", make it use the "ethers" package
      'ethers5': 'ethers',
    },
  },
});
