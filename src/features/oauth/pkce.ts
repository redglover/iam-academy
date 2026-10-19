// PKCE (RFC 7636) and random values for state/nonce, using Web Crypto.

/** URL-safe random string; 48 random bytes give 64 characters. */
export function randomString(bytes = 48): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(bytes)))
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return base64UrlEncode(new Uint8Array(digest))
}

export async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomString()
  return { verifier, challenge: await sha256Base64Url(verifier) }
}
