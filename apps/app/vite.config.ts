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
      // Our own service worker: precache + Web Push (ADR-0006).
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        // The 3D chunk (three.js) is large; precache it too so the hero opens offline.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      includeAssets: [
        'apple-touch-icon.png',
        'favicon.ico',
        'favicon-32.png',
        'favicon.svg',
        'icons/*',
        'assets/*',
      ],
      manifest: {
        name: 'Seibi',
        short_name: 'Seibi',
        description: 'Mantenimiento de tus Vehículos con total claridad: avisos, historial y precios estimados.',
        lang: 'es',
        dir: 'ltr',
        theme_color: '#121214',
        background_color: '#F2F4F7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
