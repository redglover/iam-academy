// Plain-English explanations of common token claims.

export const CLAIMS: Record<string, string> = {
  iss: 'Issuer: who minted the token. For Entra: https://login.microsoftonline.com/{tenant}/v2.0.',
  aud: 'Audience: who the token is for. An ID token’s audience is your app’s client ID; an access token’s is the API.',
  sub: 'Subject: a stable, app-specific identifier for the user.',
  oid: 'Object ID: the user’s ID in the Entra tenant. The same across all apps in that tenant.',
  tid: 'Tenant ID: which Entra directory the user signed in from.',
  exp: 'Expires at (Unix time). After this, the token must be rejected.',
  iat: 'Issued at (Unix time).',
  nbf: 'Not valid before (Unix time).',
  nonce: 'The random value your app sent in the request. Checking it stops replayed ID tokens.',
  name: 'Display name.',
  preferred_username: 'Usually the UPN or email. Readable, but can change: never use it as a key.',
  email: 'Email address, if the email scope was granted and the user has one.',
  scp: 'Scopes: delegated permissions granted to the app for this user (e.g. User.Read).',
  roles: 'App roles: permissions assigned to a user or, in client credentials, to the application itself.',
  ver: 'Token version (1.0 or 2.0).',
  aio: 'Internal Entra value. Ignore it.',
  uti: 'Unique token identifier. Internal.',
  rh: 'Internal Entra value. Ignore it.',
  sid: 'Session ID: identifies the sign-in session.',
  azp: 'Authorized party: the client ID of the app that requested the token.',
  appid: 'Client ID of the app that requested the token (v1 tokens).',
  idp: 'Identity provider, when the user came from another directory or a personal account.',
  amr: 'Authentication methods used, e.g. pwd, mfa.',
  acr: 'Authentication context class.',
  alg: 'Signing algorithm. RS256 means RSA signature with SHA-256.',
  kid: 'Key ID: which of the issuer’s public keys signed this token. Look it up in the JWKS endpoint.',
  typ: 'Token type.',
}

export function formatClaim(key: string, value: unknown): string {
  if ((key === 'exp' || key === 'iat' || key === 'nbf') && typeof value === 'number') {
    return `${value} (${new Date(value * 1000).toLocaleString()})`
  }
  return typeof value === 'string' ? value : JSON.stringify(value)
}
