import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sanket — Rural Cash-Flow Early Warning',
        short_name: 'Sanket',
        theme_color: '#166534',
        background_color: '#fafaf5',
        display: 'standalone',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      workbox: {
        // precache app shell; API responses network-first with cache fallback
        // so the last-seen state renders fully offline
        runtimeCaching: [{
          urlPattern: /\/api\/.*/,
          handler: 'NetworkFirst',
          options: { cacheName: 'sanket-api', networkTimeoutSeconds: 3 },
        }],
      },
    }),
  ],
  server: {
    host: true, // reachable from phone over hotspot/LAN
    proxy: { '/api': { target: 'http://localhost:8000', rewrite: (p: string) => p.replace(/^\/api/, '') } },
  },
})
