// Decode and inspect SAMLRequest / SAMLResponse values in the browser. Read-only: it does not verify signatures.

export interface SamlCheck {
  ok: boolean | null
  label: string
  detail: string
}

export interface SamlReport {
  kind: 'Response' | 'AuthnRequest' | 'LogoutRequest' | 'LogoutResponse' | 'Unknown'
  binding: 'POST (base64)' | 'Redirect (deflate + base64)' | 'Raw XML'
  xml: string
  fields: [string, string][]
  attributes: [string, string[]][]
  checks: SamlCheck[]
  certificate?: { base64: string; sha1: string; sha256: string }
}

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(clean.padEnd(Math.ceil(clean.length / 4) * 4, '='))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function inflateRaw(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Response(stream).text()
}

async function digest(alg: 'SHA-1' | 'SHA-256', bytes: Uint8Array): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest(alg, bytes))
  return Array.from(d, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join('')
}

/** Accepts raw XML, a base64 POST value, a deflated Redirect value, or a whole URL / form body containing one. */
export async function decodeSaml(input: string): Promise<{ xml: string; binding: SamlReport['binding'] }> {
  let v = input.trim()
  const m = /SAML(?:Request|Response)=([^&\s]+)/.exec(v)
  if (m) v = m[1]
  if (v.startsWith('<')) return { xml: v, binding: 'Raw XML' }
  if (/%[0-9A-F]{2}/i.test(v)) v = decodeURIComponent(v)
  let bytes: Uint8Array
  try {
    bytes = b64ToBytes(v)
  } catch {
    throw new Error('That isn’t base64. Paste the SAMLResponse or SAMLRequest value, the whole URL, or the XML.')
  }
  const text = new TextDecoder().decode(bytes)
  if (text.trimStart().startsWith('<')) return { xml: text, binding: 'POST (base64)' }
  try {
    const xml = await inflateRaw(bytes)
    if (xml.trimStart().startsWith('<')) return { xml, binding: 'Redirect (deflate + base64)' }
  } catch {
    /* fall through */
  }
  throw new Error('Decoded, but it isn’t SAML XML. Check you copied the whole value.')
}

const byLocal = (root: Document | Element, name: string) => Array.from(root.getElementsByTagNameNS('*', name))
const first = (root: Document | Element, name: string) => byLocal(root, name)[0] as Element | undefined

export async function inspectSaml(input: string, opts: { expectedAudience?: string; expectedAcs?: string; now?: Date } = {}): Promise<SamlReport> {
  const { xml, binding } = await decodeSaml(input)
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('The decoded text isn’t well-formed XML.')
  const root = doc.documentElement
  const kind = (['Response', 'AuthnRequest', 'LogoutRequest', 'LogoutResponse'].find((k) => root.localName === k) ?? 'Unknown') as SamlReport['kind']
  const now = opts.now ?? new Date()
  const fields: [string, string][] = []
  const checks: SamlCheck[] = []
  const add = (k: string, v: string | null | undefined) => v && fields.push([k, v])

  add('Message ID', root.getAttribute('ID'))
  add('Issued', root.getAttribute('IssueInstant'))
  add('Issuer', first(root, 'Issuer')?.textContent?.trim())
  add('Destination', root.getAttribute('Destination'))
  add('InResponseTo', root.getAttribute('InResponseTo'))

  if (kind === 'AuthnRequest') {
    add('ACS URL requested', root.getAttribute('AssertionConsumerServiceURL'))
    add('NameID policy', first(root, 'NameIDPolicy')?.getAttribute('Format'))
    add('Requested AuthnContext', first(root, 'AuthnContextClassRef')?.textContent?.trim())
    checks.push({ ok: null, label: 'Issuer is the SP’s Entity ID', detail: 'Entra looks up the enterprise app by this value. If it doesn’t match the Identifier configured in Entra you get AADSTS700016.' })
    return { kind, binding, xml, fields, attributes: [], checks }
  }

  const status = first(root, 'StatusCode')?.getAttribute('Value')
  if (status) {
    add('Status', status.split(':').pop())
    checks.push({ ok: status.endsWith(':Success'), label: 'Status is Success', detail: status })
  }

  if (first(root, 'EncryptedAssertion')) {
    checks.push({ ok: null, label: 'Assertion is encrypted', detail: 'Only the SP’s private key can decrypt it, so the details can’t be shown here. That’s good for privacy.' })
  }

  const assertion = first(root, 'Assertion')
  let certificate: SamlReport['certificate']
  const sigs = byLocal(doc, 'Signature')
  const responseSigned = sigs.some((s) => s.parentElement === root)
  const assertionSigned = !!assertion && sigs.some((s) => s.parentElement === assertion)
  if (kind === 'Response') {
    checks.push({
      ok: responseSigned || assertionSigned,
      label: 'Signed',
      detail: `${assertionSigned ? 'Assertion is signed. ' : ''}${responseSigned ? 'Response is signed. ' : ''}${!responseSigned && !assertionSigned ? 'No signature found. An SP must reject this.' : 'This tool shows where the signature is; the SP verifies it against the IdP certificate.'}`,
    })
  }
  const certText = first(doc, 'X509Certificate')?.textContent?.replace(/\s+/g, '')
  if (certText) {
    try {
      const bytes = b64ToBytes(certText)
      certificate = { base64: certText, sha1: await digest('SHA-1', bytes), sha256: await digest('SHA-256', bytes) }
    } catch {
      /* ignore malformed */
    }
  }

  const attributes: [string, string[]][] = []
  if (assertion) {
    const nameId = first(assertion, 'NameID')
    add('NameID', nameId?.textContent?.trim())
    add('NameID format', nameId?.getAttribute('Format')?.split(':').pop())
    const scd = first(assertion, 'SubjectConfirmationData')
    add('Recipient', scd?.getAttribute('Recipient'))
    const cond = first(assertion, 'Conditions')
    const nb = cond?.getAttribute('NotBefore')
    const na = cond?.getAttribute('NotOnOrAfter')
    add('Valid from', nb)
    add('Valid until', na)
    const audiences = byLocal(assertion, 'Audience').map((a) => a.textContent?.trim() ?? '')
    add('Audience', audiences.join(', '))
    add('Authentication', first(assertion, 'AuthnContextClassRef')?.textContent?.trim().split(':').pop())
    add('SessionIndex', first(assertion, 'AuthnStatement')?.getAttribute('SessionIndex'))

    for (const a of byLocal(assertion, 'Attribute')) {
      attributes.push([a.getAttribute('Name') ?? '?', byLocal(a, 'AttributeValue').map((v) => v.textContent?.trim() ?? '')])
    }

    if (nb || na) {
      const skew = 5 * 60 * 1000
      const inWindow = (!nb || now.getTime() >= Date.parse(nb) - skew) && (!na || now.getTime() < Date.parse(na) + skew)
      checks.push({
        ok: inWindow,
        label: 'Within its validity window',
        detail: inWindow ? 'An SP would accept the timing now (±5 min clock skew).' : `Outside NotBefore/NotOnOrAfter right now. Fine for an old capture; for a live one, check the SP’s clock.`,
      })
    }
    if (opts.expectedAudience) {
      const ok = audiences.includes(opts.expectedAudience.trim())
      checks.push({ ok, label: 'Audience matches your Entity ID', detail: ok ? 'This assertion is for your app.' : `Expected ${opts.expectedAudience}. An SP must reject assertions for other audiences.` })
    }
    if (opts.expectedAcs) {
      const recipient = scd?.getAttribute('Recipient') ?? root.getAttribute('Destination')
      const ok = recipient === opts.expectedAcs.trim()
      checks.push({ ok, label: 'Recipient matches your ACS URL', detail: ok ? 'Sent to the right endpoint.' : `Recipient is ${recipient}. In Entra this is the Reply URL. A mismatch also causes AADSTS50011.` })
    }
    checks.push({
      ok: null,
      label: 'NameID is what the SP expects',
      detail: 'The SP looks users up by this value (UPN, email, employee ID…). If it changes, for example after a name change, the user appears as someone new.',
    })
  }

  return { kind, binding, xml, fields, attributes, checks, certificate }
}

/** A realistic, unsigned sample response for practising. */
export function sampleResponse(now = new Date()): string {
  const iso = (ms: number) => new Date(now.getTime() + ms).toISOString().replace(/\.\d{3}Z$/, 'Z')
  const xml = `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="_9f1c2e7a-3b4d-4c5e-8f6a-1b2c3d4e5f60" Version="2.0" IssueInstant="${iso(0)}" Destination="https://fjordtech.my.salesforce.com/saml/acs" InResponseTo="_c7f2e9a1-0b4d-4e6a-9f3e-5d8a2b1c4e7f"><Issuer xmlns="urn:oasis:names:tc:SAML:2.0:assertion">https://sts.windows.net/b9c9bada-1ba2-4b6b-9dbc-b5e5640f0bcf/</Issuer><samlp:Status><samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/></samlp:Status><Assertion xmlns="urn:oasis:names:tc:SAML:2.0:assertion" ID="_a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d" IssueInstant="${iso(0)}" Version="2.0"><Issuer>https://sts.windows.net/b9c9bada-1ba2-4b6b-9dbc-b5e5640f0bcf/</Issuer><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo><Reference URI="#_a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d"/></SignedInfo><SignatureValue>c2FtcGxlLXNpZ25hdHVyZS1ub3QtcmVhbA==</SignatureValue><KeyInfo><X509Data><X509Certificate>U2FtcGxlIGNlcnRpZmljYXRlIGJ5dGVzIGZvciBJQU0gQWNhZGVteSAobm90IGEgcmVhbCBjZXJ0aWZpY2F0ZSk=</X509Certificate></X509Data></KeyInfo></Signature><Subject><NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">ingrid.haugen@fjordtech.no</NameID><SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer"><SubjectConfirmationData InResponseTo="_c7f2e9a1-0b4d-4e6a-9f3e-5d8a2b1c4e7f" NotOnOrAfter="${iso(5 * 60e3)}" Recipient="https://fjordtech.my.salesforce.com/saml/acs"/></SubjectConfirmation></Subject><Conditions NotBefore="${iso(-5 * 60e3)}" NotOnOrAfter="${iso(60 * 60e3)}"><AudienceRestriction><Audience>https://fjordtech.my.salesforce.com</Audience></AudienceRestriction></Conditions><AttributeStatement><Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"><AttributeValue>ingrid.haugen@fjordtech.no</AttributeValue></Attribute><Attribute Name="http://schemas.microsoft.com/identity/claims/displayname"><AttributeValue>Ingrid Haugen</AttributeValue></Attribute><Attribute Name="http://schemas.microsoft.com/ws/2008/06/identity/claims/groups"><AttributeValue>GRP-Sales</AttributeValue><AttributeValue>GRP-All-Employees</AttributeValue></Attribute></AttributeStatement><AuthnStatement AuthnInstant="${iso(0)}" SessionIndex="_a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d"><AuthnContext><AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</AuthnContextClassRef></AuthnContext></AuthnStatement></Assertion></samlp:Response>`
  return btoa(xml)
}
