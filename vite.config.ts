/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves the site from /iam-academy/
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/iam-academy/' : '/',
  test: { environment: 'node' },
})
