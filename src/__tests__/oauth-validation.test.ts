import { afterEach, describe, expect, it, vi } from 'vitest'
import { MSA_TENANT_ID, getMe, redeemCode, validateIdToken } from '../features/oauth/entra'

const TID = 'b9c9bada-1ba2-4b6b-9dbc-b5e5640f0bcf'
const CLIENT = '6731de76-14a6-49ae-97bc-6eba6914391e'
const NOW = 1792401000
const payload = { aud: CLIENT, iss: `https://login.microsoftonline.com/${TID}/v2.0`, nbf: 1792400000, exp: 1792403600, nonce: 'n1', tid: TID }
const expected = { nonce: 'n1', clientId: CLIENT, tenant: TID }
const failed = (checks: { claim: string; ok: boolean }[]) => checks.filter((c) => !c.ok).map((c) => c.claim)

describe('validateIdToken', () => {
  it('passes a token that matches the request', () => {
    const checks = validateIdToken(payload, expected, NOW)
    expect(checks.map((c) => c.claim)).toEqual(['nonce', 'iss', 'aud', 'exp / nbf', 'tid'])
    expect(failed(checks)).toEqual([])
  })

  it.each([
    [{ nonce: 'other' }, 'nonce'],
    [{ iss: 'https://evil.example/v2.0' }, 'iss'],
    [{ aud: 'someone-else' }, 'aud'],
    [{ exp: NOW - 301 }, 'exp / nbf'],
    [{ nbf: NOW + 301 }, 'exp / nbf'],
  ])('fails %o on %s', (patch, claim) => {
    expect(failed(validateIdToken({ ...payload, ...patch }, expected, NOW))).toEqual([claim])
  })

  it('allows five minutes of clock skew', () => {
    expect(failed(validateIdToken({ ...payload, exp: NOW - 299, nbf: NOW + 299 }, expected, NOW))).toEqual([])
  })

  it('checks tid against the configured tenant', () => {
    const other = '00000000-0000-0000-0000-000000000001'
    const token = { ...payload, tid: other, iss: `https://login.microsoftonline.com/${other}/v2.0` }
    expect(failed(validateIdToken(token, expected, NOW))).toEqual(['tid'])
    expect(failed(validateIdToken(token, { ...expected, tenant: 'organizations' }, NOW))).toEqual([])
    expect(failed(validateIdToken(token, { ...expected, tenant: 'consumers' }, NOW))).toEqual(['tid'])
    expect(failed(validateIdToken(token, { ...expected, tenant: 'common' }, NOW))).toEqual([])
    const msa = { ...payload, tid: MSA_TENANT_ID, iss: `https://login.microsoftonline.com/${MSA_TENANT_ID}/v2.0` }
    expect(failed(validateIdToken(msa, { ...expected, tenant: 'organizations' }, NOW))).toEqual(['tid'])
    expect(failed(validateIdToken(msa, { ...expected, tenant: 'consumers' }, NOW))).toEqual([])
  })

  it('fails tid and iss when tid is missing', () => {
    const rest: Record<string, unknown> = { ...payload }
    delete rest.tid
    expect(failed(validateIdToken(rest, expected, NOW))).toEqual(['iss', 'tid'])
  })
})

describe('non-JSON responses', () => {
  afterEach(() => vi.unstubAllGlobals())
  const stub = (body: string, type: string, status = 200) =>
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status, headers: { 'content-type': type } })))
  const code = { tenant: 'organizations', clientId: CLIENT, redirectUri: 'http://localhost/', code: 'c', verifier: 'v', scopes: ['openid'] }

  it('rejects an HTML page from the token endpoint with a clear error', async () => {
    stub('<html>Proxy login</html>', 'text/html; charset=utf-8', 403)
    await expect(redeemCode(code)).rejects.toMatchObject({ error: 'unexpected_response', error_description: expect.stringMatching(/Expected JSON from the token endpoint but got text\/html.*HTTP 403/) })
  })

  it('still parses JSON errors and tokens', async () => {
    stub('{"error":"invalid_grant"}', 'application/json; charset=utf-8', 400)
    await expect(redeemCode(code)).rejects.toEqual({ error: 'invalid_grant' })
    stub('{"displayName":"Ingrid"}', 'application/json;odata.metadata=minimal')
    await expect(getMe('t')).resolves.toEqual({ displayName: 'Ingrid' })
  })
})
