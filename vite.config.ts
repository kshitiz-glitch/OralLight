import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  root: 'web',
  publicDir: 'public',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'OralLight',
        short_name: 'OralLight',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b0f14',
        theme_color: '#0ea5e9',
        icons: [
          { src: 'favicon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' }
        ]
      },
      // Week 5: Enable custom service worker with Background Sync
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 25 * 1024 * 1024, // 25 MB — needed for ONNX WASM runtime
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}']
      },
      devOptions: {
        enabled: false, // Disabled in dev to prevent caching issues - enable only when testing PWA features
        type: 'module'
      }
    })
  ],
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  server: {
    port: 5173,
    // Disable caching during development to prevent stale code
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  },
})
