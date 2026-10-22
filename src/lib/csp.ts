// Content Security Policy for the built site. GitHub Pages can't send headers, so it ships as a <meta> tag
// injected at build time (vite.config.ts). Dev is left without it: Vite's HMR needs inline scripts and websockets.
import { createHash } from 'node:crypto'

export const CONNECT_ORIGINS = ['https://login.microsoftonline.com', 'https://graph.microsoft.com']

/** 'sha256-…' sources for every inline <script> in the page, e.g. the theme script in index.html. */
export function inlineScriptHashes(html: string): string[] {
  const hashes: string[] = []
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(m[1])) continue
    hashes.push(`'sha256-${createHash('sha256').update(m[2], 'utf8').digest('base64')}'`)
  }
  return hashes
}

export function buildCsp(html: string): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", ...inlineScriptHashes(html)],
    'style-src': ["'self'"],
    'img-src': ["'self'", 'data:'], // data: for the inline SVG favicon
    'font-src': ["'self'", 'data:'], // Vite inlines small font subsets as data: URIs
    'connect-src': ["'self'", ...CONNECT_ORIGINS], // OAuth playground: token endpoint and Graph /me
    'worker-src': ['blob:'], // canvas-confetti draws in a worker created from a blob
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'none'"],
  }
  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ')
}

/** Inserts the CSP <meta> as the first element of <head>, so it covers everything after it. */
export function injectCsp(html: string): string {
  const csp = buildCsp(html)
  return html.replace(/<head>/i, `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`)
}
