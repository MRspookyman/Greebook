/// <reference types="vitest/config" />
import { execFileSync } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Timestamp also distinguishes rebuilds of the same commit (and works without .git on CI).
let revision = 'build'
try {
  revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()
} catch {
  // Cloudflare may supply a checkout without Git metadata.
}
const buildId = `${revision}-${Date.now()}`

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(buildId),
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // The app offers «Actualizar» (see main.tsx) instead of reloading by itself.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon-180x180.png', 'favicon.ico'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Only the alphabets Spanish needs are kept for offline use.
        globIgnores: ['**/*vietnamese*'],
      },
      manifest: {
        name: 'Greenbook',
        short_name: 'Greenbook',
        description: 'Dos velas y una estantería: lo que leemos, juntos',
        lang: 'es',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0e1b15',
        theme_color: '#0e1b15',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
