import { describe, expect, it } from 'vitest'
import { base64UrlEncode, createPkcePair, sha256Base64Url } from '../features/oauth/pkce'
import { decodeJwt } from '../features/oauth/jwt'
import { buildAuthorizeUrl, explainError } from '../features/oauth/entra'
import { DEFAULT_OPTIONS, buildFlow, outcome } from '../features/oauth/flows'

const enc = (o: object) => base64UrlEncode(new TextEncoder().encode(JSON.stringify(o)))

describe('PKCE', () => {
  it('matches the RFC 7636 S256 test vector', async () => {
    expect(await sha256Base64Url('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })

  it('creates a verifier of valid length and charset', async () => {
    const { verifier, challenge } = await createPkcePair()
    expect(verifier).toMatch(/^[A-Za-z0-9\-_]{43,128}$/)
    expect(challenge).toBe(await sha256Base64Url(verifier))
  })
})

describe('JWT decode', () => {
  it('round-trips header and payload, including non-ASCII', () => {
    const token = `${enc({ alg: 'RS256', kid: 'abc' })}.${enc({ name: 'Bjørn Ærlig', aud: 'x' })}.sig`
    const d = decodeJwt(token)
    expect(d.header.kid).toBe('abc')
    expect(d.payload.name).toBe('Bjørn Ærlig')
  })

  it('rejects non-JWTs', () => {
    expect(() => decodeJwt('not-a-token')).toThrow()
  })
})

describe('Entra helpers', () => {
  it('builds an authorize URL with PKCE, state and nonce', () => {
    const url = new URL(
      buildAuthorizeUrl({ tenant: 'organizations', clientId: 'cid', redirectUri: 'http://localhost:5173/', scopes: ['openid', 'User.Read'], state: 's', nonce: 'n', challenge: 'c' }),
    )
    expect(url.origin + url.pathname).toBe('https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize')
    for (const [k, v] of Object.entries({ client_id: 'cid', response_type: 'code', state: 's', nonce: 'n', code_challenge: 'c', code_challenge_method: 'S256', scope: 'openid User.Read' })) {
      expect(url.searchParams.get(k)).toBe(v)
    }
  })

  it('explains common setup errors', () => {
    expect(explainError({ error: 'invalid_request', error_description: 'AADSTS50011: redirect mismatch' })).toMatch(/redirect URI/)
    expect(explainError({ error: 'weird' })).toBeNull()
  })
})

describe('flow simulator', () => {
  it('normal auth code flow succeeds', () => {
    expect(outcome(buildFlow('authcode-pkce', DEFAULT_OPTIONS))).toBe('success')
  })

  it('PKCE decides the code interception attack', () => {
    expect(outcome(buildFlow('authcode-pkce', { ...DEFAULT_OPTIONS, attack: 'code-interception' }))).toBe('blocked')
    expect(outcome(buildFlow('authcode-pkce', { ...DEFAULT_OPTIONS, pkce: false, attack: 'code-interception' }))).toBe('breach')
  })

  it('state decides the CSRF attack', () => {
    expect(outcome(buildFlow('authcode-pkce', { ...DEFAULT_OPTIONS, attack: 'csrf' }))).toBe('blocked')
    expect(outcome(buildFlow('authcode-pkce', { ...DEFAULT_OPTIONS, state: false, attack: 'csrf' }))).toBe('breach')
  })

  it('only client secrets can leak from a repo', () => {
    expect(outcome(buildFlow('client-credentials', { ...DEFAULT_OPTIONS, credential: 'secret', attack: 'leaked-secret' }))).toBe('breach')
    expect(outcome(buildFlow('client-credentials', { ...DEFAULT_OPTIONS, credential: 'managed-identity', attack: 'leaked-secret' }))).toBe('blocked')
  })

  it('Conditional Access stops device code phishing', () => {
    expect(outcome(buildFlow('device-code', { ...DEFAULT_OPTIONS, attack: 'device-phishing' }))).toBe('breach')
    expect(outcome(buildFlow('device-code', { ...DEFAULT_OPTIONS, blockDeviceCode: true, attack: 'device-phishing' }))).toBe('blocked')
  })
})
