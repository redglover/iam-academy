// OAuth flow simulator engine: turns a flow + options into the sequence of messages between the parties.

export type Actor = 'user' | 'app' | 'idp' | 'api' | 'attacker'
export type FlowId = 'authcode-pkce' | 'client-credentials' | 'device-code'
export type AttackId = 'none' | 'code-interception' | 'csrf' | 'leaked-secret' | 'device-phishing'
export type Credential = 'secret' | 'certificate' | 'managed-identity'

export interface FlowOptions {
  pkce: boolean
  state: boolean
  credential: Credential
  blockDeviceCode: boolean
  attack: AttackId
}

export type StepKind = 'normal' | 'attack' | 'blocked' | 'breach' | 'success'

export interface Step {
  from: Actor
  to: Actor
  title: string
  http?: string
  note: string
  kind: StepKind
}

export const ACTORS: Record<Actor, { name: string; sub: string }> = {
  user: { name: 'User + browser', sub: 'Ingrid' },
  app: { name: 'Client app', sub: 'Fjordtech Portal' },
  idp: { name: 'Authorization server', sub: 'Entra ID' },
  api: { name: 'Resource server', sub: 'Microsoft Graph' },
  attacker: { name: 'Attacker', sub: 'Mallory' },
}

export const FLOWS: Record<FlowId, { title: string; when: string; attacks: { id: AttackId; label: string }[] }> = {
  'authcode-pkce': {
    title: 'Authorization code + PKCE',
    when: 'A user signs in to a web app, SPA or mobile app. The default choice.',
    attacks: [
      { id: 'code-interception', label: 'Attacker intercepts the authorization code' },
      { id: 'csrf', label: 'Attacker forges the callback (login CSRF)' },
    ],
  },
  'client-credentials': {
    title: 'Client credentials',
    when: 'No user. A daemon, script or service calls an API as itself, like the leaver runbook.',
    attacks: [{ id: 'leaked-secret', label: 'Client secret committed to a public Git repo' }],
  },
  'device-code': {
    title: 'Device code',
    when: 'Devices without a browser or keyboard: CLIs, TVs, IoT. The user signs in on another device.',
    attacks: [{ id: 'device-phishing', label: 'Device code phishing email' }],
  },
}

const CLIENT_ID = '6731de76-14a6-49ae-97bc-6eba6914391e'
const TENANT = 'fjordtech.onmicrosoft.com'
const REDIRECT = 'https://portal.fjordtech.no/callback'
const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
const CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
const STATE = 'af0ifjsldkj'
const CODE = '0.AXkA3Lq…Zs8'
const ACCESS = 'eyJ0eXAiOiJKV1QiLCJub25jZSI6…'

export const DEFAULT_OPTIONS: FlowOptions = { pkce: true, state: true, credential: 'certificate', blockDeviceCode: false, attack: 'none' }

export function buildFlow(flow: FlowId, o: FlowOptions): Step[] {
  if (flow === 'client-credentials') return clientCredentials(o)
  if (flow === 'device-code') return deviceCode(o)
  return authCode(o)
}

function authCode(o: FlowOptions): Step[] {
  const authorizeQuery = [
    `client_id=${CLIENT_ID}`,
    'response_type=code',
    `redirect_uri=${encodeURIComponent(REDIRECT)}`,
    'scope=openid%20profile%20User.Read',
    o.state && `state=${STATE}`,
    'nonce=n-0S6_WzA2Mj',
    o.pkce && `code_challenge=${CHALLENGE}`,
    o.pkce && 'code_challenge_method=S256',
  ].filter(Boolean)

  const steps: Step[] = [
    { from: 'user', to: 'app', kind: 'normal', title: 'Ingrid clicks “Sign in with Microsoft”', note: 'The app never sees her password. It sends her to Entra ID instead.' },
    {
      from: 'app',
      to: 'app',
      kind: 'normal',
      title: 'App prepares one-time secrets',
      http: [
        o.state ? `state         = ${STATE}         // remembered in session storage` : '// no state generated',
        'nonce         = n-0S6_WzA2Mj        // will come back inside the ID token',
        o.pkce ? `code_verifier = ${VERIFIER}   // kept secret by the app` : '// no PKCE',
        o.pkce ? `code_challenge = BASE64URL(SHA256(code_verifier)) = ${CHALLENGE}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      note: o.pkce
        ? 'The verifier stays in the app. Only its hash (the challenge) is sent out, so whoever later redeems the code must know the original.'
        : 'Without PKCE, the authorization code alone is enough to get tokens. Keep that in mind.',
    },
    {
      from: 'app',
      to: 'idp',
      kind: 'normal',
      title: 'Browser is redirected to the authorize endpoint',
      http: `HTTP/1.1 302 Found\nLocation: https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize?\n  ${authorizeQuery.join('\n  &')}`,
      note: 'A front-channel request: it travels through the browser address bar, so nothing secret goes in it.',
    },
    {
      from: 'user',
      to: 'idp',
      kind: 'normal',
      title: 'Ingrid signs in, does MFA, and consents',
      http: 'Fjordtech Portal wants to:\n  ✓ Sign you in and read your profile (User.Read)\n  ✓ Maintain access to data you have given it access to\n\n[ Accept ]  [ Cancel ]',
      note: 'Conditional Access runs here: device, location and risk. Consent is where the user (or an admin) approves the scopes.',
    },
    {
      from: 'idp',
      to: 'app',
      kind: 'normal',
      title: 'Entra redirects back with an authorization code',
      http: `HTTP/1.1 302 Found\nLocation: ${REDIRECT}?code=${CODE}${o.state ? `&state=${STATE}` : ''}`,
      note: 'The code is short-lived (minutes) and single-use. It is not a token yet, just a claim ticket.',
    },
  ]

  if (o.attack === 'code-interception') {
    steps.push({
      from: 'attacker',
      to: 'attacker',
      kind: 'attack',
      title: 'Mallory captures the code',
      http: `Leaked via: malicious app registered for the same mobile URL scheme,\nbrowser history, proxy logs, or a Referer header\n→ code=${CODE}`,
      note: 'Redirects pass through places the app doesn’t control. Assume the code can leak.',
    })
    steps.push({
      from: 'attacker',
      to: 'idp',
      kind: 'attack',
      title: 'Mallory tries to redeem it',
      http: `POST /${TENANT}/oauth2/v2.0/token\nContent-Type: application/x-www-form-urlencoded\n\nclient_id=${CLIENT_ID}\n&grant_type=authorization_code\n&code=${CODE}\n&redirect_uri=${encodeURIComponent(REDIRECT)}\n// Mallory does not know the code_verifier`,
      note: 'A public client (SPA, mobile app) has no client secret, so the code is the only proof.',
    })
    steps.push(
      o.pkce
        ? {
            from: 'idp',
            to: 'attacker',
            kind: 'blocked',
            title: 'Rejected: no matching PKCE verifier',
            http: 'HTTP/1.1 400 Bad Request\n{\n  "error": "invalid_grant",\n  "error_description": "AADSTS50148: The code_verifier does not match the code_challenge supplied in the authorization request."\n}',
            note: 'Blocked. Entra remembers the challenge and demands the verifier that hashes to it. Mallory can’t compute it from the hash.',
          }
        : {
            from: 'idp',
            to: 'attacker',
            kind: 'breach',
            title: 'Tokens issued to the attacker',
            http: `HTTP/1.1 200 OK\n{\n  "token_type": "Bearer",\n  "access_token": "${ACCESS}",\n  "id_token": "eyJ…"\n}`,
            note: 'Breach: Mallory can now read Ingrid’s profile through Graph as her. Turn PKCE on and run it again.',
          },
    )
    return steps
  }

  if (o.attack === 'csrf') {
    steps.splice(steps.length - 1, 1, {
      from: 'attacker',
      to: 'user',
      kind: 'attack',
      title: 'Mallory sends Ingrid a link with *her own* code',
      http: `<img src="${REDIRECT}?code=MALLORYS_CODE${o.state ? '&state=guessed' : ''}">`,
      note: 'Mallory signed in to her own account, stopped before redemption, and plants her code in Ingrid’s browser.',
    })
    steps.push(
      o.state
        ? {
            from: 'app',
            to: 'app',
            kind: 'blocked',
            title: 'Rejected: state doesn’t match',
            http: `expected state = ${STATE}\nreceived state = guessed\n→ discard the response`,
            note: 'Blocked. The callback must carry the exact random value this browser generated. Mallory can’t know it.',
          }
        : {
            from: 'app',
            to: 'app',
            kind: 'breach',
            title: 'App signs Ingrid in to Mallory’s account',
            http: 'callback accepted, code redeemed\nsession user = mallory@evil.example',
            note: 'Breach: whatever Ingrid uploads or saves now lands in Mallory’s account. Turn state on and run it again.',
          },
    )
    return steps
  }

  steps.push(
    {
      from: 'app',
      to: 'app',
      kind: 'normal',
      title: o.state ? 'App checks state' : 'App skips the state check',
      http: o.state ? `expected ${STATE} = received ${STATE} ✓` : undefined,
      note: o.state ? 'The response belongs to the request this browser started.' : 'Nothing proves this response belongs to a request this browser started. Try the CSRF attack.',
    },
    {
      from: 'app',
      to: 'idp',
      kind: 'normal',
      title: 'App redeems the code at the token endpoint',
      http: `POST /${TENANT}/oauth2/v2.0/token\nContent-Type: application/x-www-form-urlencoded\n\nclient_id=${CLIENT_ID}\n&grant_type=authorization_code\n&code=${CODE}\n&redirect_uri=${encodeURIComponent(REDIRECT)}${o.pkce ? `\n&code_verifier=${VERIFIER}` : ''}`,
      note: 'A back-channel call: straight from app to Entra, not through the address bar.',
    },
    {
      from: 'idp',
      to: 'app',
      kind: 'normal',
      title: 'Entra returns tokens',
      http: `HTTP/1.1 200 OK\n{\n  "token_type": "Bearer",\n  "scope": "openid profile User.Read",\n  "expires_in": 3600,\n  "access_token": "${ACCESS}",\n  "id_token": "eyJ0eXAiOiJKV1Qi…",\n  "refresh_token": "1.AXkA…"\n}`,
      note: o.pkce ? 'Entra hashed the verifier, compared it to the challenge from step 3, and it matched.' : 'Issued to whoever presented the code.',
    },
    {
      from: 'app',
      to: 'app',
      kind: 'normal',
      title: 'App validates the ID token',
      http: '✓ signature (public key from the JWKS endpoint, matched by kid)\n✓ iss = https://login.microsoftonline.com/{tid}/v2.0\n✓ aud = 6731de76-… (our client ID)\n✓ exp in the future\n✓ nonce = n-0S6_WzA2Mj',
      note: 'The ID token is for the app: it says who signed in. That is the OpenID Connect part.',
    },
    {
      from: 'app',
      to: 'api',
      kind: 'normal',
      title: 'App calls Microsoft Graph with the access token',
      http: `GET https://graph.microsoft.com/v1.0/me\nAuthorization: Bearer ${ACCESS}`,
      note: 'The access token is for the API. The app should treat it as opaque.',
    },
    {
      from: 'api',
      to: 'app',
      kind: 'success',
      title: 'Graph checks the token and answers',
      http: 'HTTP/1.1 200 OK\n{\n  "displayName": "Ingrid Haugen",\n  "jobTitle": "Backend Developer",\n  "userPrincipalName": "ingrid.haugen@fjordtech.no"\n}',
      note: 'Graph verified signature, audience, expiry and that the token holds the User.Read scope.',
    },
  )
  return steps
}

function clientCredentials(o: FlowOptions): Step[] {
  const proof =
    o.credential === 'secret'
      ? '&client_secret=Qx58Q~Abc…    // a password for the app'
      : o.credential === 'certificate'
        ? '&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer\n&client_assertion=eyJhbGciOiJSUzI1NiIs…   // JWT signed with the private key'
        : '// none: Azure hands the runbook a token for its managed identity'
  const steps: Step[] = [
    {
      from: 'app',
      to: 'app',
      kind: 'normal',
      title: 'The leaver runbook starts. No user involved',
      http:
        o.credential === 'managed-identity'
          ? 'Connect-MgGraph -Identity'
          : o.credential === 'certificate'
            ? 'Connect-MgGraph -ClientId $appId -TenantId $tenant -CertificateThumbprint $thumb'
            : 'Connect-MgGraph -ClientSecretCredential $cred -TenantId $tenant',
      note: 'The app authenticates as itself. Its permissions are application permissions that an admin consented to in advance.',
    },
    {
      from: 'app',
      to: 'idp',
      kind: 'normal',
      title: o.credential === 'managed-identity' ? 'Token requested from the managed identity endpoint' : 'App requests a token with its own credential',
      http:
        o.credential === 'managed-identity'
          ? 'GET http://169.254.169.254/metadata/identity/oauth2/token?resource=https://graph.microsoft.com\nMetadata: true\n// only reachable from inside the Azure resource'
          : `POST /${TENANT}/oauth2/v2.0/token\nContent-Type: application/x-www-form-urlencoded\n\nclient_id=${CLIENT_ID}\n&grant_type=client_credentials\n&scope=https://graph.microsoft.com/.default\n${proof}`,
      note: '`.default` means “all application permissions already granted to this app”. You can’t ask for more at runtime.',
    },
  ]

  if (o.attack === 'leaked-secret') {
    if (o.credential === 'secret') {
      steps.push(
        {
          from: 'attacker',
          to: 'attacker',
          kind: 'attack',
          title: 'Mallory finds the secret on GitHub',
          http: '# runbook.ps1  (commit 3f2a91c, public repo)\n$secret = "Qx58Q~Abc…"',
          note: 'Bots scan public repos for secrets within minutes of a push.',
        },
        {
          from: 'attacker',
          to: 'idp',
          kind: 'breach',
          title: 'Mallory gets a token with User.ReadWrite.All',
          http: `POST /${TENANT}/oauth2/v2.0/token\n...&grant_type=client_credentials&client_secret=Qx58Q~Abc…\n\nHTTP/1.1 200 OK  { "access_token": "eyJ…" }`,
          note: 'Breach: Mallory can now disable or change every user in the tenant, from anywhere. Switch to a certificate or managed identity.',
        },
      )
    } else {
      steps.push({
        from: 'attacker',
        to: 'attacker',
        kind: 'blocked',
        title: 'Nothing to leak in the repo',
        http: o.credential === 'certificate' ? '# runbook.ps1\n-CertificateThumbprint $thumb   # public value, private key stays in the cert store / Key Vault' : '# runbook.ps1\nConnect-MgGraph -Identity   # no credential at all',
        note: 'Blocked. A thumbprint is public, and a managed identity has no secret to steal. Still use Conditional Access for workload identities and alert on unusual sign-ins.',
      })
    }
    return steps
  }

  steps.push(
    {
      from: 'idp',
      to: 'app',
      kind: 'normal',
      title: 'Entra returns an app-only access token',
      http: 'HTTP/1.1 200 OK\n{\n  "token_type": "Bearer",\n  "expires_in": 3599,\n  "access_token": "eyJ0eXAi…"\n}\n\n// decoded payload:\n{ "aud": "https://graph.microsoft.com", "roles": ["User.ReadWrite.All"], "idtyp": "app" }',
      note: 'Note `roles`, not `scp`: app permissions show up as roles. There is no ID token and no refresh token, because nobody signed in.',
    },
    {
      from: 'app',
      to: 'api',
      kind: 'normal',
      title: 'Runbook disables the leaver',
      http: 'PATCH https://graph.microsoft.com/v1.0/users/{id}\nAuthorization: Bearer eyJ0eXAi…\nContent-Type: application/json\n\n{ "accountEnabled": false }',
      note: 'This is exactly what the automation module’s leaver script does under the hood.',
    },
    { from: 'api', to: 'app', kind: 'success', title: 'Done', http: 'HTTP/1.1 204 No Content', note: 'Least privilege applies to apps too: User.ReadWrite.All is powerful, so review who owns this app.' },
  )
  return steps
}

function deviceCode(o: FlowOptions): Step[] {
  const phishing = o.attack === 'device-phishing'
  const starter: Actor = phishing ? 'attacker' : 'app'
  const steps: Step[] = [
    {
      from: starter,
      to: starter,
      kind: phishing ? 'attack' : 'normal',
      title: phishing ? 'Mallory starts a device code flow on her laptop' : 'Ingrid runs a CLI that needs to sign in',
      http: phishing ? '$ az login --use-device-code' : '$ fjordctl login',
      note: phishing ? 'Any public client ID works, e.g. a well-known Microsoft one.' : 'The CLI can’t show a browser, so it uses the device code flow.',
    },
    {
      from: starter,
      to: 'idp',
      kind: phishing ? 'attack' : 'normal',
      title: 'Request a device code',
      http: `POST /${TENANT}/oauth2/v2.0/devicecode\n\nclient_id=${CLIENT_ID}&scope=openid%20profile%20User.Read%20offline_access`,
      note: 'No redirect URI. The token will be collected by polling.',
    },
    {
      from: 'idp',
      to: starter,
      kind: 'normal',
      title: 'Entra returns a user code',
      http: '{\n  "user_code": "FJRD-8K2Q",\n  "device_code": "GMMhmHCXhWEzkobqIHGG_EnNYYsAkukHspeYUk9E8…",\n  "verification_uri": "https://microsoft.com/devicelogin",\n  "expires_in": 900,\n  "interval": 5\n}',
      note: 'The user code is short so a human can type it. The device code stays with the requester.',
    },
    phishing
      ? {
          from: 'attacker',
          to: 'user',
          kind: 'attack',
          title: 'Mallory emails Ingrid',
          http: 'From: IT Service Desk <it-support@fjordtech-helpdesk.com>\nSubject: Action required: verify your account\n\nGo to https://microsoft.com/devicelogin and enter FJRD-8K2Q.',
          note: 'The link is a real Microsoft page, so the usual “check the URL” advice doesn’t help.',
        }
      : { from: 'app', to: 'user', kind: 'normal', title: 'CLI shows instructions', http: 'To sign in, open https://microsoft.com/devicelogin and enter the code FJRD-8K2Q', note: 'Ingrid uses her phone or laptop browser.' },
  ]

  if (phishing && o.blockDeviceCode) {
    steps.push({
      from: 'idp',
      to: 'user',
      kind: 'blocked',
      title: 'Conditional Access blocks the sign-in',
      http: 'AADSTS53003: Access has been blocked by Conditional Access policies.\nPolicy: “Block device code flow” (Authentication flows condition)',
      note: 'Blocked. Most organizations don’t need device code flow at all. Block it, with exceptions for the few groups that do.',
    })
    return steps
  }

  steps.push(
    { from: 'user', to: 'idp', kind: 'normal', title: 'Ingrid enters the code, signs in and does MFA', note: 'MFA succeeds. It’s really her. That is exactly why this attack works.' },
    {
      from: starter,
      to: 'idp',
      kind: phishing ? 'attack' : 'normal',
      title: 'Requester polls the token endpoint',
      http: `POST /${TENANT}/oauth2/v2.0/token\n\ngrant_type=urn:ietf:params:oauth:grant-type:device_code\n&client_id=${CLIENT_ID}\n&device_code=GMMhmHCX…\n\n← 400 { "error": "authorization_pending" }   (repeat every 5 s)\n← 200 { "access_token": "eyJ…", "refresh_token": "1.AXk…" }`,
      note: 'Whoever holds the device code gets the tokens, not whoever typed the user code.',
    },
    phishing
      ? {
          from: 'idp',
          to: 'attacker',
          kind: 'breach',
          title: 'Mallory holds Ingrid’s tokens, MFA included',
          http: 'access_token  → read mail, files, Teams as Ingrid\nrefresh_token → keep access for days',
          note: 'Breach. Turn on the Conditional Access policy that blocks device code flow and run it again.',
        }
      : { from: 'idp', to: 'app', kind: 'success', title: 'CLI receives tokens', http: '{ "access_token": "eyJ…", "refresh_token": "1.AXk…", "expires_in": 3600 }', note: 'Signed in. The CLI can now call APIs as Ingrid.' },
  )
  return steps
}

export function outcome(steps: Step[]): 'breach' | 'blocked' | 'success' {
  if (steps.some((s) => s.kind === 'breach')) return 'breach'
  if (steps.some((s) => s.kind === 'blocked')) return 'blocked'
  return 'success'
}
