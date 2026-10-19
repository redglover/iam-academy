// Minimal Microsoft identity platform (v2.0) client for a public SPA. Raw HTTP on purpose, so you can see every request.

export interface AuthorizeParams {
  tenant: string
  clientId: string
  redirectUri: string
  scopes: string[]
  state: string
  nonce: string
  challenge: string
}

export const authority = (tenant: string) => `https://login.microsoftonline.com/${encodeURIComponent(tenant || 'organizations')}`

export function buildAuthorizeUrl(p: AuthorizeParams): string {
  const q = new URLSearchParams({
    client_id: p.clientId,
    response_type: 'code',
    redirect_uri: p.redirectUri,
    response_mode: 'query',
    scope: p.scopes.join(' '),
    state: p.state,
    nonce: p.nonce,
    code_challenge: p.challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  })
  return `${authority(p.tenant)}/oauth2/v2.0/authorize?${q}`
}

export interface TokenResponse {
  token_type: string
  scope: string
  expires_in: number
  access_token: string
  id_token?: string
  refresh_token?: string
}

export interface OAuthError {
  error: string
  error_description?: string
}

export async function redeemCode(o: { tenant: string; clientId: string; redirectUri: string; code: string; verifier: string; scopes: string[] }) {
  const body = new URLSearchParams({
    client_id: o.clientId,
    grant_type: 'authorization_code',
    code: o.code,
    redirect_uri: o.redirectUri,
    code_verifier: o.verifier,
    scope: o.scopes.join(' '),
  })
  const res = await fetch(`${authority(o.tenant)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json()
  if (!res.ok) throw json as OAuthError
  return json as TokenResponse
}

export async function getMe(accessToken: string): Promise<Record<string, unknown>> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${accessToken}` } })
  const json = await res.json()
  if (!res.ok) throw json
  return json
}

/** Friendly fixes for the errors people hit most when setting this up. */
export function explainError(e: OAuthError): string | null {
  const d = `${e.error} ${e.error_description ?? ''}`
  if (d.includes('AADSTS50011')) return 'The redirect URI doesn’t match. Copy the exact URI from step 1 on this page into the app registration (trailing slash included).'
  if (d.includes('AADSTS9002326') || d.includes('AADSTS9002327'))
    return 'The redirect URI is registered under the “Web” platform. Remove it there and add it under “Single-page application”, which allows the token request from a browser.'
  if (d.includes('AADSTS700054')) return 'The app isn’t allowed to receive this response type. Register the redirect URI under the “Single-page application” platform.'
  if (d.includes('AADSTS700016')) return 'Client ID not found in this tenant. Check the client ID, or change the tenant to “common” or your tenant ID.'
  if (d.includes('AADSTS50020') || d.includes('AADSTS50194'))
    return 'Your account isn’t in the app’s tenant. Use your tenant ID, or set “Supported account types” to multitenant (+ personal accounts if you use one).'
  if (d.includes('AADSTS65001') || e.error === 'consent_required') return 'Consent is missing. Sign in again and accept, or grant admin consent under API permissions.'
  if (e.error === 'access_denied') return 'Sign-in was cancelled or consent was declined.'
  if (d.includes('AADSTS54005') || d.includes('AADSTS70008')) return 'The authorization code was already used or has expired. Codes are single-use and short-lived. Sign in again.'
  return null
}
