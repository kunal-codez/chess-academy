import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'manifest.webmanifest',
        'icons/*.png',
        'icons/*.svg',
        'engine/stockfish.js',
        'engine/stockfish.wasm',
        'engine/stockfish.wasm.js'
      ],
      manifest: {
        name: 'Chess Opening Academy',
        short_name: 'Chess Academy',
        description: 'Professional, 100% offline chess opening academy, repertoire preparation, analysis, and spaced repetition training platform.',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB for openings-data.js (~2.25MB) and stockfish binaries
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,json}']
      }
    })
  ],
  worker: {
    format: 'es'
  },
  server: {
    port: 3000,
    open: false
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'openings-data': ['./src/data/openings/openings.json']
        }
      }
    }
  }
});
