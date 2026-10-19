// Decodes a JWT for display. It does NOT verify the signature: that's the resource server's job.

export interface DecodedJwt {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
}

function base64UrlDecode(part: string): string {
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
  const bin = atob(b64)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().split('.')
  if (parts.length !== 3) throw new Error('A JWT has three parts separated by dots: header.payload.signature')
  try {
    return { header: JSON.parse(base64UrlDecode(parts[0])), payload: JSON.parse(base64UrlDecode(parts[1])), signature: parts[2] }
  } catch {
    throw new Error('This doesn’t decode as a JWT. Some access tokens (e.g. for Microsoft Graph with personal accounts) are opaque by design.')
  }
}
