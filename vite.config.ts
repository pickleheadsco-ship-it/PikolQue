import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Plugin to generate 200.html for Cloudflare Pages native SPA fallback
const cloudflareSpaFallbackPlugin = () => ({
  name: 'cloudflare-spa-fallback',
  closeBundle() {
    const distDir = path.resolve(__dirname, 'dist');
    const indexPath = path.resolve(distDir, 'index.html');
    const spaPath = path.resolve(distDir, '200.html');
    const notFoundPath = path.resolve(distDir, '404.html');

    if (fs.existsSync(indexPath)) {
      fs.copyFileSync(indexPath, spaPath);
      fs.copyFileSync(indexPath, notFoundPath);
    }
  },
});

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), cloudflareSpaFallbackPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
