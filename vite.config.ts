import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

/*
 * GitHub Pages serves the app from /<repo>/, Vercel and any other static host
 * from the root. BASE_PATH switches between them; everything downstream (the
 * router basename, the manifest, the service worker scope) derives from it, so
 * there is one place to change.
 */
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'OpenQuiz',
        short_name: 'OpenQuiz',
        description: 'Open-source, local-first flashcards and study modes.',
        theme_color: '#4255ff',
        background_color: '#0a092d',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'] },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
