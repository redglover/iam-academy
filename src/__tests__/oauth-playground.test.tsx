import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { base64UrlEncode } from '../features/oauth/pkce'
import { ProgressProvider } from '../features/progress/progress'
import { OAuthPlayground } from '../pages/OAuthPlayground'

const TID = 'b9c9bada-1ba2-4b6b-9dbc-b5e5640f0bcf'
const CLIENT = '6731de76-14a6-49ae-97bc-6eba6914391e'
const part = (o: object) => base64UrlEncode(new TextEncoder().encode(JSON.stringify(o)))
const now = () => Math.floor(Date.now() / 1000)
const idToken = (nonce: string) =>
  `${part({ alg: 'RS256' })}.${part({ aud: CLIENT, iss: `https://login.microsoftonline.com/${TID}/v2.0`, nbf: now() - 60, exp: now() + 3600, nonce, tid: TID })}.sig`

const json = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

function signInCallback(tokenNonce: string, graph: () => Promise<Response>) {
  sessionStorage.setItem(
    'iam-oauth-pending',
    JSON.stringify({ state: 's1', nonce: 'n1', verifier: 'v', clientId: CLIENT, tenant: TID, scopes: ['openid'], redirectUri: 'http://localhost/', authorizeUrl: 'https://login.microsoftonline.com/x?a=b' }),
  )
  window.history.replaceState(null, '', '/?code=abc&state=s1')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => (url.includes('/token') ? json({ token_type: 'Bearer', scope: 'openid', expires_in: 3600, access_token: 'opaque', id_token: idToken(tokenNonce) }) : graph())),
  )
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ProgressProvider>
        <OAuthPlayground />
      </ProgressProvider>
    </MemoryRouter>,
  )
}

const badges = () => JSON.parse(localStorage.getItem('iam-progress-v1') ?? '{"badges":[]}').badges

describe('OAuth playground callback', () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => {
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', '/')
  })

  it('discards the response and awards no badge on a nonce mismatch', async () => {
    const graph = vi.fn(async () => json({ displayName: 'Ingrid' }))
    signInCallback('someone-elses-nonce', graph)
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign-in failed: nonce_mismatch')
    expect(screen.queryByText(/Signed in/)).toBeNull()
    expect(graph).not.toHaveBeenCalled()
    expect(badges()).not.toContain('oauth-real')
  })

  it('shows the validation checklist and awards the badge when the token checks out', async () => {
    signInCallback('n1', async () => json({ displayName: 'Ingrid' }))
    expect(await screen.findByText('Signed in as Ingrid')).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'ID token validation' })
    for (const claim of ['nonce', 'iss', 'aud', 'exp / nbf', 'tid']) expect(list).toHaveTextContent(`${claim} passed`)
    await vi.waitFor(() => expect(badges()).toContain('oauth-real'))
  })

  it('shows the message of a network error from Graph instead of {}', async () => {
    signInCallback('n1', async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(await screen.findByText(/Graph call failed:\s*Failed to fetch/)).toBeInTheDocument()
  })
})
