import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Check, Copy, Eye, EyeOff, KeyRound, Loader2, LogIn, ShieldCheck } from 'lucide-react'
import { base64UrlEncode, createPkcePair, randomString } from '../features/oauth/pkce'
import { buildAuthorizeUrl, explainError, getMe, redeemCode, validateIdToken, type IdTokenCheck, type OAuthError, type TokenResponse } from '../features/oauth/entra'
import { decodeJwt, type DecodedJwt } from '../features/oauth/jwt'
import { CLAIMS, formatClaim } from '../features/oauth/claims'
import { CodeBlock } from '../components/CodeBlock'
import { load, save } from '../lib/storage'
import { useProgress } from '../features/progress/progress'

const CONFIG_KEY = 'iam-oauth-config'
const PENDING_KEY = 'iam-oauth-pending'

interface Config {
  clientId: string
  tenant: string
  extraScopes: string[]
}

interface Pending {
  state: string
  nonce: string
  verifier: string
  clientId: string
  tenant: string
  scopes: string[]
  redirectUri: string
  authorizeUrl: string
}

interface Result {
  authorizeUrl: string
  callback: Record<string, string>
  tokens: TokenResponse
  idToken?: DecodedJwt
  idTokenChecks?: IdTokenCheck[]
  me?: Record<string, unknown>
  meError?: string
}

// Built at runtime from plain JSON, so no token-shaped string sits in the source (secret scanners flag those).
const sampleIdToken = () => {
  const part = (o: object) => base64UrlEncode(new TextEncoder().encode(JSON.stringify(o)))
  const header = { typ: 'JWT', alg: 'RS256', kid: 'sample-key-id' }
  const payload = {
    aud: '6731de76-14a6-49ae-97bc-6eba6914391e',
    iss: 'https://login.microsoftonline.com/b9c9bada-1ba2-4b6b-9dbc-b5e5640f0bcf/v2.0',
    iat: 1792400000,
    nbf: 1792400000,
    exp: 1792403600,
    name: 'Ingrid Haugen',
    nonce: 'n-0S6_WzA2Mj',
    oid: '1d58b16d-6846-4537-a3a8-c08fd363c645',
    preferred_username: 'ingrid.haugen@fjordtech.no',
    tid: 'b9c9bada-1ba2-4b6b-9dbc-b5e5640f0bcf',
    ver: '2.0',
  }
  return `${part(header)}.${part(payload)}.sample-signature`
}

/** One parameter per line, URL-decoded, for reading, not for copying into a browser. */
const prettyUrl = (url: string) => {
  const [base, query = ''] = url.split('?')
  const lines = query.split('&').map((kv) => {
    const [k, v = ''] = kv.split('=')
    return `${k}=${decodeURIComponent(v.replace(/\+/g, ' '))}`
  })
  return `GET ${base}?\n  ${lines.join('\n  &')}`
}

const redirectUri = () => `${window.location.origin}${import.meta.env.BASE_URL}`
const BASE_SCOPES = ['openid', 'profile', 'User.Read']
const OPTIONAL_SCOPES = [
  { id: 'email', hint: 'Adds the email claim to the ID token.' },
  { id: 'offline_access', hint: 'Returns a refresh token (24 h lifetime for SPAs).' },
]

function readPending(): Pending | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as Pending) : null
  } catch {
    return null
  }
}

function CopyField({ value, label }: { value: string; label: string }) {
  const [ok, setOk] = useState(false)
  return (
    <span className="mt-1 flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-fog px-2.5 py-1.5 text-sm">{value}</code>
      <span className="sr-only" aria-live="polite">
        {ok ? 'Copied' : ''}
      </span>
      <button
        className="btn py-1 text-sm"
        aria-label={`Copy ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setOk(true)
            setTimeout(() => setOk(false), 1500)
          } catch {
            /* clipboard blocked */
          }
        }}
      >
        {ok ? <Check size={15} /> : <Copy size={15} />}
      </button>
    </span>
  )
}

function ClaimsTable({ jwt, title }: { jwt: DecodedJwt; title: string }) {
  return (
    <div className="my-4 overflow-x-auto rounded-badge border border-line bg-paper" tabIndex={0} role="group" aria-label={title}>
      <p className="border-b border-line px-4 py-2.5 font-display font-semibold">{title}</p>
      <table className="w-full min-w-[560px] text-left text-sm">
        <tbody>
          {[...Object.entries(jwt.header).map(([k, v]) => ['header', k, v] as const), ...Object.entries(jwt.payload).map(([k, v]) => ['payload', k, v] as const)].map(([part, k, v]) => (
            <tr key={part + k} className="border-b border-line/60 align-top last:border-0">
              <td className="whitespace-nowrap px-4 py-2 font-mono font-bold">
                {k}
                {part === 'header' && <span className="ml-1.5 font-sans text-xs font-normal text-muted">header</span>}
              </td>
              <td className="max-w-[18rem] break-all px-4 py-2 font-mono text-xs">{formatClaim(k, v)}</td>
              <td className="px-4 py-2 text-muted">{CLAIMS[k] ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="flex items-center gap-3 text-2xl font-bold sm:text-[1.75rem]">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-key font-display text-lg text-on">{n}</span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function OAuthPlayground() {
  const [config, setConfig] = useState<Config>(() => load<Config>(CONFIG_KEY, { clientId: '', tenant: 'organizations', extraScopes: [] }))
  const [preview, setPreview] = useState<{ url: string } | null>(null)
  const [status, setStatus] = useState<'idle' | 'redeeming' | 'done' | 'error'>('idle')
  const [error, setError] = useState<OAuthError | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [pasted, setPasted] = useState('')
  const handled = useRef(false)
  const { award } = useProgress()

  useEffect(() => save(CONFIG_KEY, config), [config])

  const scopes = useMemo(() => [...BASE_SCOPES, ...config.extraScopes], [config.extraScopes])
  const validClientId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.clientId.trim())

  // Preview the authorize URL with placeholder values so learners can read it before signing in.
  useEffect(() => {
    setPreview({
      url: buildAuthorizeUrl({
        tenant: config.tenant.trim(),
        clientId: config.clientId.trim() || '<client-id>',
        redirectUri: redirectUri(),
        scopes,
        state: '<random state>',
        nonce: '<random nonce>',
        challenge: '<BASE64URL(SHA256(verifier))>',
      }),
    })
  }, [config, scopes])

  // Handle the redirect back from Entra ID.
  useEffect(() => {
    if (handled.current) return
    const params = new URLSearchParams(window.location.search)
    if (!params.has('code') && !params.has('error')) return
    handled.current = true
    const callback = Object.fromEntries(params.entries())
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`)
    const pending = readPending()
    try {
      sessionStorage.removeItem(PENDING_KEY)
    } catch {
      /* ignore */
    }

    if (callback.error) {
      setError({ error: callback.error, error_description: callback.error_description })
      setStatus('error')
      return
    }
    if (!pending || pending.state !== callback.state) {
      setError({ error: 'state_mismatch', error_description: 'The state in the callback doesn’t match the one this browser sent, so the response was discarded. That is the CSRF protection working. Start the sign-in from this page.' })
      setStatus('error')
      return
    }

    setStatus('redeeming')
    ;(async () => {
      try {
        const tokens = await redeemCode({ ...pending, code: callback.code })
        let idToken: DecodedJwt | undefined
        try {
          idToken = tokens.id_token ? decodeJwt(tokens.id_token) : undefined
        } catch {
          /* leave undefined */
        }
        const idTokenChecks = idToken ? validateIdToken(idToken.payload, pending) : undefined
        // Like a state mismatch, a nonce mismatch means the tokens can't be trusted: discard them before using the access token.
        if (idTokenChecks?.find((c) => c.claim === 'nonce')?.ok === false) {
          setError({ error: 'nonce_mismatch', error_description: 'The nonce in the ID token doesn’t match the one this browser sent, so the tokens were discarded. That is the replay protection working. Start the sign-in from this page.' })
          setStatus('error')
          return
        }
        const r: Result = { authorizeUrl: pending.authorizeUrl, callback, tokens, idToken, idTokenChecks }
        try {
          r.me = await getMe(tokens.access_token)
        } catch (e) {
          r.meError = e instanceof Error ? e.message : JSON.stringify(e)
        }
        setResult(r)
        setStatus('done')
        award('oauth-real')
      } catch (e) {
        setError((e as OAuthError).error ? (e as OAuthError) : { error: 'network_error', error_description: String(e) })
        setStatus('error')
      }
    })()
  }, [award])

  const signIn = async () => {
    const { verifier, challenge } = await createPkcePair()
    const state = randomString(24)
    const nonce = randomString(24)
    const p = { tenant: config.tenant.trim() || 'organizations', clientId: config.clientId.trim(), redirectUri: redirectUri(), scopes, state, nonce, challenge }
    const authorizeUrl = buildAuthorizeUrl(p)
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ ...p, verifier, authorizeUrl } satisfies Pending))
    } catch {
      setError({ error: 'storage_blocked', error_description: 'This browser blocks session storage, so the app can’t remember the PKCE verifier across the redirect.' })
      setStatus('error')
      return
    }
    window.location.assign(authorizeUrl)
  }

  let pastedJwt: DecodedJwt | null = null
  let pastedError = ''
  if (pasted.trim()) {
    try {
      pastedJwt = decodeJwt(pasted)
    } catch (e) {
      pastedError = (e as Error).message
    }
  }

  let accessJwt: DecodedJwt | null = null
  if (result) {
    try {
      accessJwt = decodeJwt(result.tokens.access_token)
    } catch {
      accessJwt = null
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10">
      <h1 className="text-4xl font-extrabold sm:text-5xl">OAuth playground</h1>
      <p className="mt-3 max-w-[62ch] text-xl text-muted">
        Register your own app in Entra ID, sign in for real with authorization code + PKCE, and look inside the tokens you get back. Everything runs in your
        browser. There is no backend and no client secret.
      </p>
      <p className="mt-3 text-sm text-muted">
        New to OAuth? Read the <Link to="/learn/oauth" className="text-key underline">OAuth module</Link> and try the simulator first.
      </p>

      {status === 'redeeming' && (
        <div className="mt-8 flex items-center gap-3 rounded-badge border-2 border-key bg-key/10 p-4" role="status">
          <Loader2 className="animate-spin text-key" size={20} /> Redeeming the authorization code at the token endpoint…
        </div>
      )}

      {status === 'error' && error && (
        <div className="mt-8 rounded-badge border-2 border-leave bg-leave/[.07] p-4" role="alert">
          <p className="flex items-center gap-2 font-display text-lg font-bold">
            <AlertTriangle className="text-leave" size={20} /> Sign-in failed: {error.error}
          </p>
          {explainError(error) && <p className="mt-1 font-semibold">{explainError(error)}</p>}
          {error.error_description && <p className="mt-2 break-words font-mono text-xs text-muted">{error.error_description}</p>}
        </div>
      )}

      {status === 'done' && result && (
        <section className="mt-8 rounded-[1.75rem] border-2 border-join bg-join/[.05] p-4 sm:p-6" aria-label="Sign-in result">
          <p className="flex items-center gap-2 font-display text-2xl font-bold">
            <ShieldCheck className="text-join" /> Signed in{result.me?.displayName ? ` as ${String(result.me.displayName)}` : ''}
          </p>
          <p className="mt-1 text-muted">Here is everything that happened, in order. Tokens live only in this page’s memory and are gone when you reload.</p>

          <h3 className="mt-6 text-lg font-semibold">1. The authorize request your browser was sent to</h3>
          <CodeBlock title="Front channel: through the address bar" lang="http" code={prettyUrl(result.authorizeUrl)} />

          <h3 className="text-lg font-semibold">2. The callback Entra redirected back with</h3>
          <CodeBlock
            title="Query parameters on the redirect URI"
            lang="http"
            code={Object.entries(result.callback)
              .map(([k, v]) => `${k} = ${k === 'code' ? v.slice(0, 24) + '…  (single-use, already redeemed)' : v}`)
              .join('\n')}
            notes={['The state matched the value stored before the redirect, so the response belongs to this browser.']}
          />

          <h3 className="text-lg font-semibold">3. The token response</h3>
          <div className="my-4 rounded-badge border border-line bg-paper p-4 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="font-semibold">token_type</dt>
              <dd>{result.tokens.token_type}</dd>
              <dt className="font-semibold">scope</dt>
              <dd className="font-mono text-xs">{result.tokens.scope}</dd>
              <dt className="font-semibold">expires_in</dt>
              <dd>{result.tokens.expires_in} seconds</dd>
              <dt className="font-semibold">refresh_token</dt>
              <dd>{result.tokens.refresh_token ? 'yes (you asked for offline_access)' : 'no'}</dd>
              <dt className="font-semibold">access_token</dt>
              <dd className="min-w-0">
                <span className="break-all font-mono text-xs">{showToken ? result.tokens.access_token : `${result.tokens.access_token.slice(0, 16)}… (${result.tokens.access_token.length} chars)`}</span>
                <button className="ml-2 inline-flex items-center gap-1 text-key" onClick={() => setShowToken((v) => !v)} aria-label={showToken ? 'Hide access token' : 'Show access token'}>
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />} {showToken ? 'Hide' : 'Show'}
                </button>
              </dd>
            </dl>
            <p className="mt-3 text-muted">An access token is a bearer token: anyone holding it can use it until it expires. Never paste real tokens into websites or chats.</p>
          </div>

          {result.idToken && (
            <>
              <h3 className="text-lg font-semibold">4. Your ID token, decoded</h3>
              {result.idTokenChecks && (
                <div className="my-4 rounded-badge border border-line bg-paper p-4 text-sm">
                  <p className="font-semibold">Validating it against the request this browser sent</p>
                  <ul className="mt-2 space-y-1.5" aria-label="ID token validation">
                    {result.idTokenChecks.map((c) => (
                      <li key={c.claim} className="flex gap-2">
                        <span className={`shrink-0 font-bold ${c.ok ? 'text-join' : 'text-leave'}`} aria-hidden>
                          {c.ok ? '✓' : '✗'}
                        </span>
                        <span>
                          <code>{c.claim}</code>
                          <span className="sr-only">{c.ok ? ' passed' : ' failed'}</span>: {c.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-muted">
                    An app also verifies the signature with the tenant’s published keys. This page skips that: the token came straight from the token endpoint over
                    HTTPS, which is enough for a browser app that only reads it.
                  </p>
                </div>
              )}
              <ClaimsTable jwt={result.idToken} title="ID token: for this app, about you" />
            </>
          )}

          {accessJwt && (
            <>
              <h3 className="text-lg font-semibold">5. Your access token, decoded</h3>
              <p className="mt-1 text-sm text-muted">
                Peeking for learning only. Apps must treat access tokens as opaque. Only the API (here Microsoft Graph) validates them. Look for{' '}
                <code>aud</code> and <code>scp</code>.
              </p>
              <ClaimsTable jwt={accessJwt} title="Access token: for Microsoft Graph" />
            </>
          )}

          <h3 className="text-lg font-semibold">6. Calling Microsoft Graph with the access token</h3>
          <CodeBlock
            title="GET https://graph.microsoft.com/v1.0/me"
            lang="json"
            code={result.me ? JSON.stringify(result.me, null, 2) : `Graph call failed:\n${result.meError}`}
          />
        </section>
      )}

      <Section n={1} title="Register an app in Entra ID">
        <ol className="max-w-[70ch] space-y-3">
          <li>
            Open <a className="text-key underline" href="https://entra.microsoft.com" target="_blank" rel="noreferrer">entra.microsoft.com</a> and go to{' '}
            <strong>App registrations → New registration</strong> (under Entra ID, or Identity → Applications in older menus).
          </li>
          <li>
            <strong>Name:</strong> IAM Academy playground. <strong>Supported account types:</strong> “Accounts in this organizational directory only” is the safest.
            Choose the multitenant + personal accounts option only if you want to sign in with accounts from other tenants.
          </li>
          <li>
            <strong>Redirect URI:</strong> platform <strong>Single-page application (SPA)</strong>, with exactly this value:
            <CopyField value={redirectUri()} label="redirect URI" />
            <span className="mt-1 block text-sm text-muted">Redirect URIs must match exactly: scheme, host, path, trailing slash. Add the localhost one too if you run the site locally.</span>
          </li>
          <li>
            Click <strong>Register</strong>. On the overview page copy the <strong>Application (client) ID</strong> and the <strong>Directory (tenant) ID</strong>.
          </li>
          <li>
            Under <strong>API permissions</strong> you’ll see <code>Microsoft Graph → User.Read</code> (delegated). That’s all this needs. No client secret: an SPA
            is a <em>public client</em> and can’t keep one.
          </li>
        </ol>
        <p className="mt-4 max-w-[70ch] rounded-xl bg-ink/[.04] p-3 text-sm">
          <strong>No tenant?</strong> Your work tenant may allow users to register apps. Ask IT first. Otherwise, create a free Azure account, which comes with its own
          Entra directory where you are the admin.
        </p>
      </Section>

      <Section n={2} title="Configure and sign in">
        <div className="grid gap-4 rounded-badge border border-line bg-paper p-4 sm:p-5">
          <label className="block">
            <span className="font-semibold">Application (client) ID</span>
            <input
              value={config.clientId}
              onChange={(e) => setConfig((c) => ({ ...c, clientId: e.target.value }))}
              placeholder="00000000-0000-0000-0000-000000000000"
              aria-invalid={!!config.clientId && !validClientId}
              aria-describedby={config.clientId && !validClientId ? 'client-id-error' : undefined}
              className="mt-1 w-full rounded-lg border-2 border-muted/70 bg-paper px-3 py-2 font-mono text-sm focus:border-key"
              spellCheck={false}
            />
            {config.clientId && !validClientId && (
              <span id="client-id-error" className="mt-1 block text-sm text-leave">
                A client ID is a GUID like 6731de76-14a6-49ae-97bc-6eba6914391e.
              </span>
            )}
          </label>
          <label className="block">
            <span className="font-semibold">Tenant</span>
            <input
              value={config.tenant}
              onChange={(e) => setConfig((c) => ({ ...c, tenant: e.target.value }))}
              className="mt-1 w-full rounded-lg border-2 border-muted/70 bg-paper px-3 py-2 font-mono text-sm focus:border-key"
              spellCheck={false}
            />
            <span className="mt-1 block text-sm text-muted">
              Your <strong>Directory (tenant) ID</strong> for a single-tenant app. <code>organizations</code> = any work account, <code>common</code> = work + personal,{' '}
              <code>consumers</code> = personal only. Must fit the account types you chose.
            </span>
          </label>
          <fieldset>
            <legend className="font-semibold">Scopes</legend>
            <p className="text-sm text-muted">
              Always: <code>openid profile User.Read</code>
            </p>
            <div className="mt-2 grid gap-1.5">
              {OPTIONAL_SCOPES.map((s) => (
                <label key={s.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[rgb(var(--key))]"
                    checked={config.extraScopes.includes(s.id)}
                    onChange={(e) => setConfig((c) => ({ ...c, extraScopes: e.target.checked ? [...c.extraScopes, s.id] : c.extraScopes.filter((x) => x !== s.id) }))}
                  />
                  <span>
                    <code>{s.id}</code>: {s.hint}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <button className="btn btn-key px-5 py-2.5" disabled={!validClientId} onClick={signIn}>
              <LogIn size={18} /> Sign in with Microsoft
            </button>
            <p className="mt-2 text-sm text-muted">You’ll leave this page, sign in at login.microsoftonline.com, consent, and come back here.</p>
          </div>
        </div>
        {preview && (
          <CodeBlock
            title="The authorize request this button will send"
            lang="http"
            code={prettyUrl(preview.url)}
            notes={[
              '`response_type=code`: authorization code flow.',
              '`code_challenge` + `S256`: PKCE. The verifier is generated on click and kept in session storage until you return.',
              '`state` and `nonce`: fresh random values per sign-in, checked on the way back.',
              '`response_mode=query`: the code comes back in the URL query string.',
            ]}
          />
        )}
      </Section>

      <Section n={3} title="Decode any JWT">
        <p className="max-w-[70ch]">Paste a token to see what’s inside. Decoding happens locally in your browser. Still, don’t paste production tokens anywhere you don’t trust.</p>
        <label className="mt-3 block">
          <span className="sr-only">JWT</span>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={4}
            placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOi…"
            className="w-full rounded-xl border-2 border-muted/70 bg-paper p-3 font-mono text-xs focus:border-key"
            spellCheck={false}
          />
        </label>
        {pastedError && (
          <p className="mt-2 text-sm text-leave" role="alert">
            {pastedError}
          </p>
        )}
        {pastedJwt && <ClaimsTable jwt={pastedJwt} title="Decoded token (signature not verified)" />}
        {!pasted && (
          <button
            className="btn mt-2 py-1.5 text-sm"
            onClick={() =>
              setPasted(
                sampleIdToken(),
              )
            }
          >
            <KeyRound size={15} /> Try a sample ID token
          </button>
        )}
      </Section>
    </div>
  )
}
