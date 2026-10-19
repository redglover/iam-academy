import { describe, expect, it } from 'vitest'
import { deflateRawSync } from 'node:zlib'
import { SAML_DEFAULTS, buildSamlFlow } from '../features/saml/flows'
import { decodeSaml, sampleResponse } from '../features/saml/inspect'
import { seqOutcome } from '../components/Sequence'

describe('SAML simulator', () => {
  it('normal SP- and IdP-initiated sign-in succeeds', () => {
    expect(seqOutcome(buildSamlFlow('sp-initiated', SAML_DEFAULTS))).toBe('success')
    expect(seqOutcome(buildSamlFlow('idp-initiated', SAML_DEFAULTS))).toBe('success')
  })

  it.each([
    ['forged-assertion', 'verifySignature'],
    ['replay', 'checkReplay'],
    ['audience-swap', 'checkAudience'],
    ['expired-cert', 'certMonitoring'],
  ] as const)('%s is decided by %s', (attack, check) => {
    expect(seqOutcome(buildSamlFlow('sp-initiated', { ...SAML_DEFAULTS, attack }))).toBe('blocked')
    expect(seqOutcome(buildSamlFlow('sp-initiated', { ...SAML_DEFAULTS, attack, [check]: false }))).toBe('breach')
  })

  it('only the AuthnRequest flow has InResponseTo to check', () => {
    const sp = buildSamlFlow('sp-initiated', SAML_DEFAULTS).map((s) => s.http ?? '').join('\n')
    const idp = buildSamlFlow('idp-initiated', SAML_DEFAULTS).map((s) => s.http ?? '').join('\n')
    expect(sp).toContain('InResponseTo=')
    expect(idp).not.toContain('InResponseTo=')
  })
})

describe('SAML decoder', () => {
  it('decodes a POST-binding base64 response', async () => {
    const { xml, binding } = await decodeSaml(sampleResponse())
    expect(binding).toBe('POST (base64)')
    expect(xml).toContain('<Audience>https://fjordtech.my.salesforce.com</Audience>')
  })

  it('decodes a Redirect-binding request from a full URL', async () => {
    const req = '<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="_x"/>'
    const value = encodeURIComponent(deflateRawSync(Buffer.from(req)).toString('base64'))
    const { xml, binding } = await decodeSaml(`https://login.microsoftonline.com/t/saml2?SAMLRequest=${value}&RelayState=%2F`)
    expect(binding).toBe('Redirect (deflate + base64)')
    expect(xml).toBe(req)
  })

  it('explains garbage input', async () => {
    await expect(decodeSaml('###')).rejects.toThrow(/base64/)
  })
})
