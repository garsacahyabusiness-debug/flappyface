import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  const rawBase = process.env.VITE_BASE_PATH || '/';
  const basePath = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        filename: 'service-worker.js',
        manifestFilename: 'manifest.json',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'offline.html',
        ],
        manifest: {
          id: basePath,
          name: 'FLAPPY FACE',
          short_name: 'FLAPPY FACE',
          description: 'One tap. Endless chaos. A cute face-powered arcade flying game.',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#69C9FF',
          background_color: '#69C9FF',
          start_url: basePath,
          scope: basePath,
          categories: ['games', 'arcade'],
          icons: [
            {
              src: `${basePath}pwa-192x192.png`,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${basePath}pwa-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${basePath}pwa-maskable-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cacheId: 'flappy-face-v1',
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,mp3,wav,ogg}'],
          navigateFallback: `${basePath}index.html`,
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              // Same-origin static resources (never caches blob:, data:, camera streams, or user photos)
              urlPattern: ({url, request}) => {
                if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
                if (url.origin !== self.location.origin) return false;
                if (request.mode === 'navigate') return false;
                if (url.pathname.includes('user-photo') || url.pathname.includes('camera')) {
                  return false;
                }
                return ['script', 'style', 'image', 'font', 'audio'].includes(request.destination);
              },
              handler: 'CacheFirst',
              options: {
                cacheName: 'flappy-face-static-v1',
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'flappy-face-fonts-css-v1',
                expiration: {
                  maxEntries: 8,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'flappy-face-fonts-files-v1',
                expiration: {
                  maxEntries: 16,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        // Disable dev-mode SW injection (it calls import.meta.hot.send which fails when HMR WS is disabled);
        // production build still generates service-worker.js and manifest.json normally.
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      forwardConsole: false,
    },
  };
});
