/// <reference types="vitest" />
import { defineConfig } from 'vite'
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
    environment: 'node',
    // UI smoke tests (*.test.tsx) need a DOM; engine tests stay in node.
    environmentMatchGlobs: [['src/**/*.test.tsx', 'jsdom']],
    setupFiles: ['src/test/setup.ts'],
  },
})
