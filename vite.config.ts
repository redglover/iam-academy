import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { injectCsp } from './src/lib/csp'

// GitHub Pages serves the site from /iam-academy/
export default defineConfig({
  plugins: [
    react(),
    // Build only: the dev server needs inline scripts and websockets for HMR
    { name: 'csp-meta', apply: 'build', transformIndexHtml: { order: 'post', handler: injectCsp } },
  ],
  base: process.env.GITHUB_ACTIONS ? '/iam-academy/' : '/',
  test: {
    setupFiles: ['src/test/setup.ts'],
    // UI smoke tests (*.test.tsx) need a DOM; engine tests stay in node.
    projects: [
      { extends: true, test: { name: 'engine', include: ['src/**/*.test.ts'], environment: 'node' } },
      { extends: true, test: { name: 'ui', include: ['src/**/*.test.tsx'], environment: 'jsdom' } },
    ],
  },
})
