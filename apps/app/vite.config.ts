import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'assets/*'],
      manifest: {
        name: 'Seibi',
        short_name: 'Seibi',
        description: 'Mantenimiento con total claridad',
        lang: 'es',
        dir: 'ltr',
        theme_color: '#c40000',
        background_color: '#fdf5cb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cache the app shell + media so the PWA opens offline (read-only cache;
        // see docs/adr/0001-frontend-stack.md).
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'video',
            handler: 'CacheFirst',
            options: {
              cacheName: 'seibi-media',
              expiration: { maxEntries: 8 },
              rangeRequests: true,
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
