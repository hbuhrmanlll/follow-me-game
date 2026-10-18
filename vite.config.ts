import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
  plugins: [
    // Makes the game work offline once it has been opened, and lets phones
    // add it to the home screen like an app.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null, // registered in src/main.ts, only for the web version
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Follow Me: Walk with Jesus',
        short_name: 'Follow Me',
        description: 'Walk with Jesus and the twelve disciples through His ministry. A Bible game by Third Heaven Studios.',
        start_url: './',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#1b1410',
        theme_color: '#1b1410',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Save everything the game needs, including Scripture and any voice recordings.
        globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,webp,svg,json,mp3,ogg}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
