import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const base = '/EH-Diet-Tracker/';
export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg', 'apple-touch-icon-180x180.png'],
    manifest: {
      id: base, name: 'מעקב תפריט', short_name: 'התפריט שלי', description: 'מעקב אישי אחר התפריט, הבריאות וההרגלים שלך',
      lang: 'he', dir: 'rtl', start_url: `${base}#/today`, scope: base, display: 'standalone',
      theme_color: '#1f7a4d', background_color: '#f6f7f2',
      icons: [
        { src: `${base}pwa-192x192.png`, sizes: '192x192', type: 'image/png' },
        { src: `${base}pwa-512x512.png`, sizes: '512x512', type: 'image/png' },
        { src: `${base}maskable-icon-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: { importScripts: ['push-sw.js'], globPatterns: ['**/*.{js,css,html,svg,png,woff2,ico}'], navigateFallback: `${base}index.html`, cleanupOutdatedCaches: true },
  })],
});
