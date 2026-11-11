import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
import {galleryImagesPlugin} from './scripts/gallery-images-plugin';

export default defineConfig({
  base: process.env.PAGES_BASE_PATH || '/',
  plugins: [galleryImagesPlugin(), react()],
  build: {
    rolldownOptions: {
      input: {
        gallery: resolve(import.meta.dirname, 'index.html'),
        about: resolve(import.meta.dirname, 'about.html'),
        albums: resolve(import.meta.dirname, 'albums.html'),
      },
    },
  },
  // Load no environment files into the static app. The only public build
  // setting is the GitHub repository name supplied by the Pages workflow.
  envDir: false,
  define: {
    __GITHUB_REPOSITORY__: JSON.stringify(process.env.GITHUB_REPOSITORY || ''),
  },
  server: {
    fs: {deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.dev.vars*', '**/.wrangler/**', '**/.sites-runtime/**']},
    ...(process.env.CODEX_SANDBOX === 'seatbelt' ? {watch: {useFsEvents: false, usePolling: true}} : {}),
  },
});
