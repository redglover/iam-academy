import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { buildCsp, injectCsp, inlineScriptHashes } from '../lib/csp'
import { MODULES } from '../data/modules'

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
const directive = (csp: string, name: string) => csp.split('; ').find((d) => d.startsWith(`${name} `))?.split(' ').slice(1)

describe('Content Security Policy', () => {
  it('hashes the inline theme script exactly as browsers do', () => {
    const body = html.match(/<script>([\s\S]*?)<\/script>/)![1]
    const expected = `'sha256-${createHash('sha256').update(body).digest('base64')}'`
    expect(inlineScriptHashes(html)).toEqual([expected])
    expect(directive(buildCsp(html), 'script-src')).toEqual(["'self'", expected])
  })

  it('skips external scripts', () => {
    expect(inlineScriptHashes('<script type="module" src="/src/main.tsx"></script>')).toEqual([])
  })

  it('only lets the page talk to itself, Entra ID and Microsoft Graph', () => {
    expect(directive(buildCsp(html), 'connect-src')).toEqual(["'self'", 'https://login.microsoftonline.com', 'https://graph.microsoft.com'])
  })

  it('never allows unsafe-inline or unsafe-eval', () => {
    expect(buildCsp(html)).not.toMatch(/unsafe-/)
  })

  it('puts the meta tag first in <head>', () => {
    expect(injectCsp(html)).toMatch(/<head>\s*<meta http-equiv="Content-Security-Policy" content="default-src 'self'; /)
  })

  it('matches the policy quoted in the OAuth module', () => {
    const block = MODULES.find((m) => m.slug === 'oauth')!.blocks.find((b) => b.t === 'code' && b.lang === 'html')
    const quoted = block?.t === 'code' ? block.code : ''
    for (const name of ['script-src', 'connect-src']) expect(quoted).toContain(`${name} ${directive(buildCsp(html), name)!.join(' ')};`)
  })
})
