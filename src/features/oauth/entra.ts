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
  const json = await readJson(res, 'the token endpoint')
  if (!res.ok) throw json as OAuthError
  return json as TokenResponse
}

export async function getMe(accessToken: string): Promise<Record<string, unknown>> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${accessToken}` } })
  const json = await readJson(res, 'Microsoft Graph')
  if (!res.ok) throw json
  return json as Record<string, unknown>
}

/** Parses a JSON body, or throws a readable OAuthError when something else (a proxy page, a captive portal) answered. */
async function readJson(res: Response, from: string): Promise<unknown> {
  const type = res.headers.get('content-type') ?? ''
  if (!/[/+]json\b/i.test(type)) {
    throw {
      error: 'unexpected_response',
      error_description: `Expected JSON from ${from} but got ${type || 'no content type'} (HTTP ${res.status}). A proxy, firewall or captive portal may be answering instead of Microsoft.`,
    } satisfies OAuthError
  }
  return res.json()
}

export const MSA_TENANT_ID = '9188040d-6c67-4c5b-b112-36a304b66dad'
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Allowed clock skew when checking exp/nbf, in seconds. */
const SKEW = 300

export interface IdTokenCheck {
  claim: string
  ok: boolean
  detail: string
}

/**
 * The checks an app runs on an ID token against the request it sent (signature aside, which needs the tenant's keys).
 * `now` is in seconds since the epoch.
 */
export function validateIdToken(
  payload: Record<string, unknown>,
  expected: { nonce: string; clientId: string; tenant: string },
  now = Math.floor(Date.now() / 1000),
): IdTokenCheck[] {
  const { nonce, iss, aud, exp, nbf, tid } = payload
  const tenant = expected.tenant.trim().toLowerCase() || 'organizations'
  const time = (s: unknown) => (typeof s === 'number' ? new Date(s * 1000).toISOString() : String(s))

  let tidOk: boolean
  let tidDetail: string
  if (typeof tid !== 'string') {
    tidOk = false
    tidDetail = 'tid is missing.'
  } else if (GUID.test(tenant)) {
    tidOk = tid.toLowerCase() === tenant
    tidDetail = tidOk ? 'tid is the tenant you configured.' : `tid ${tid} is not the tenant you configured (${tenant}).`
  } else if (tenant === 'organizations') {
    tidOk = tid.toLowerCase() !== MSA_TENANT_ID
    tidDetail = tidOk ? 'tid is a work or school tenant, as “organizations” allows.' : 'tid is the personal-account tenant, which “organizations” should not allow.'
  } else if (tenant === 'consumers') {
    tidOk = tid.toLowerCase() === MSA_TENANT_ID
    tidDetail = tidOk ? 'tid is the personal-account tenant, as “consumers” requires.' : 'tid is not the personal-account tenant that “consumers” requires.'
  } else {
    tidOk = true
    tidDetail = `“${tenant}” accepts any tenant, so an app would check tid against its own list of allowed tenants.`
  }

  const expectedIss = typeof tid === 'string' ? `https://login.microsoftonline.com/${tid}/v2.0` : undefined
  const audOk = Array.isArray(aud) ? aud.includes(expected.clientId) : aud === expected.clientId
  const expOk = typeof exp === 'number' && now < exp + SKEW
  const nbfOk = nbf === undefined || (typeof nbf === 'number' && now >= nbf - SKEW)

  return [
    {
      claim: 'nonce',
      ok: nonce === expected.nonce,
      detail: nonce === expected.nonce ? 'Matches the nonce this browser sent, so the token was issued for this sign-in.' : 'Does not match the nonce this browser sent. The token may be replayed.',
    },
    {
      claim: 'iss',
      ok: iss !== undefined && iss === expectedIss,
      detail: iss === expectedIss ? `Is ${expectedIss}: issued by Entra ID for the tenant in tid.` : `Expected ${expectedIss ?? 'an issuer built from tid'}, got ${String(iss)}.`,
    },
    {
      claim: 'aud',
      ok: audOk,
      detail: audOk ? 'Is your client ID: the token was issued to this app.' : `Expected your client ID ${expected.clientId}, got ${String(aud)}.`,
    },
    {
      claim: 'exp / nbf',
      ok: expOk && nbfOk,
      detail: !expOk
        ? `Expired at ${time(exp)}.`
        : !nbfOk
          ? `Not valid before ${time(nbf)}.`
          : `Valid now: ${typeof nbf === 'number' ? `from ${time(nbf)} ` : ''}until ${time(exp)}, allowing ${SKEW / 60} minutes of clock skew.`,
    },
    { claim: 'tid', ok: tidOk, detail: tidDetail },
  ]
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
