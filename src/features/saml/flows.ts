// SAML 2.0 web SSO simulator engine: flows, the SP's validation checks, and attacks on them.
import type { SeqActor, SeqStep } from '../../components/Sequence'

export type SamlFlowId = 'sp-initiated' | 'idp-initiated'
export type SamlAttack = 'none' | 'forged-assertion' | 'replay' | 'audience-swap' | 'expired-cert'

export interface SamlOptions {
  verifySignature: boolean
  checkAudience: boolean
  checkReplay: boolean
  certMonitoring: boolean
  attack: SamlAttack
}

export const SAML_DEFAULTS: SamlOptions = { verifySignature: true, checkAudience: true, checkReplay: true, certMonitoring: true, attack: 'none' }

export const SAML_ACTORS: Record<'user' | 'sp' | 'idp' | 'attacker', SeqActor> = {
  user: { id: 'user', name: 'User + browser', sub: 'Ingrid' },
  sp: { id: 'sp', name: 'Service provider', sub: 'Salesforce' },
  idp: { id: 'idp', name: 'Identity provider', sub: 'Entra ID' },
  attacker: { id: 'attacker', name: 'Attacker', sub: 'Mallory', danger: true },
}

export const SAML_FLOWS: Record<SamlFlowId, { title: string; when: string }> = {
  'sp-initiated': { title: 'SP-initiated', when: 'The user opens the app first and gets sent to the IdP. The common case, and the safer one.' },
  'idp-initiated': { title: 'IdP-initiated', when: 'The user clicks the app tile in My Apps. The IdP sends an assertion nobody asked for.' },
}

export const SAML_ATTACKS: { id: SamlAttack; label: string }[] = [
  { id: 'forged-assertion', label: 'Attacker forges an assertion for the CEO' },
  { id: 'replay', label: 'Attacker replays a captured SAML response' },
  { id: 'audience-swap', label: 'Assertion for another app is reused here' },
  { id: 'expired-cert', label: 'IdP signing certificate expires (outage)' },
]

const ENTITY_ID = 'https://fjordtech.my.salesforce.com'
const ACS = 'https://fjordtech.my.salesforce.com/saml/acs'
const TENANT = 'b9c9bada-1ba2-4b6b-9dbc-b5e5640f0bcf'
const IDP_ISSUER = `https://sts.windows.net/${TENANT}/`
const REQ_ID = '_c7f2e9a1-0b4d-4e6a-9f3e-5d8a2b1c4e7f'

export function assertionXml(o: { audience: string; nameId: string; inResponseTo?: string; signedBy: string; id?: string }) {
  return `<samlp:Response Destination="${ACS}"${o.inResponseTo ? ` InResponseTo="${o.inResponseTo}"` : ''}>
  <Issuer>${IDP_ISSUER}</Issuer>
  <samlp:Status><samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/></samlp:Status>
  <Assertion ID="${o.id ?? '_a1b2c3d4-5e6f'}" IssueInstant="2026-10-19T08:00:00Z">
    <Issuer>${IDP_ISSUER}</Issuer>
    <ds:Signature> … ${o.signedBy} … </ds:Signature>
    <Subject>
      <NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">${o.nameId}</NameID>
      <SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <SubjectConfirmationData Recipient="${ACS}" NotOnOrAfter="2026-10-19T08:05:00Z"${o.inResponseTo ? ` InResponseTo="${o.inResponseTo}"` : ''}/>
      </SubjectConfirmation>
    </Subject>
    <Conditions NotBefore="2026-10-19T07:55:00Z" NotOnOrAfter="2026-10-19T09:00:00Z">
      <AudienceRestriction><Audience>${o.audience}</Audience></AudienceRestriction>
    </Conditions>
    <AttributeStatement>
      <Attribute Name="http://schemas.microsoft.com/identity/claims/displayname"><AttributeValue>Ingrid Haugen</AttributeValue></Attribute>
      <Attribute Name="http://schemas.microsoft.com/ws/2008/06/identity/claims/groups"><AttributeValue>GRP-Sales</AttributeValue></Attribute>
    </AttributeStatement>
    <AuthnStatement SessionIndex="_a1b2c3d4-5e6f"><AuthnContext><AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:Password</AuthnContextClassRef></AuthnContext></AuthnStatement>
  </Assertion>
</samlp:Response>`
}

export function buildSamlFlow(flow: SamlFlowId, o: SamlOptions): SeqStep[] {
  const sp = flow === 'sp-initiated'
  const steps: SeqStep[] = sp
    ? [
        { from: 'user', to: 'sp', kind: 'normal', title: 'Ingrid opens Salesforce', http: `GET ${ENTITY_ID}/`, note: 'No session yet. Salesforce trusts Entra ID for sign-in, so it won’t ask for a password.' },
        {
          from: 'sp',
          to: 'idp',
          kind: 'normal',
          title: 'Salesforce sends an AuthnRequest via the browser',
          http: `<!-- HTTP-Redirect binding: deflated, base64-encoded, put in the URL -->
GET https://login.microsoftonline.com/${TENANT}/saml2?SAMLRequest=fZFdS8MwFIb…&RelayState=%2Fhome

<!-- decoded -->
<samlp:AuthnRequest ID="${REQ_ID}" Version="2.0"
    IssueInstant="2026-10-19T08:00:00Z"
    AssertionConsumerServiceURL="${ACS}">
  <saml:Issuer>${ENTITY_ID}</saml:Issuer>
</samlp:AuthnRequest>`,
          note: 'The **Issuer** is Salesforce’s Entity ID. Entra uses it to find the matching enterprise app. The request **ID** is remembered for later.',
        },
      ]
    : [
        { from: 'user', to: 'idp', kind: 'normal', title: 'Ingrid clicks the Salesforce tile in My Apps', http: 'GET https://myapps.microsoft.com → Salesforce', note: 'No AuthnRequest. The flow starts at the identity provider.' },
      ]

  steps.push({
    from: 'user',
    to: 'idp',
    kind: 'normal',
    title: 'Ingrid signs in to Entra ID (if she has no session)',
    note: 'Password, MFA and Conditional Access happen here, at the IdP. Salesforce never sees any of it. It only gets the result.',
  })

  const expired = o.attack === 'expired-cert'
  steps.push(
    {
      from: 'idp',
      to: 'user',
      kind: 'normal',
      title: 'Entra returns an auto-submitting form with the signed SAML response',
      http: `<!-- HTTP-POST binding -->
<form method="POST" action="${ACS}">
  <input type="hidden" name="SAMLResponse" value="PHNhbWxwOlJlc3BvbnNlIERlc3RpbmF0aW9uPSJodHRwczovL2Zqb3Jk…"/>
  <input type="hidden" name="RelayState" value="/home"/>
</form>
<script>document.forms[0].submit()</script>`,
      note: 'The assertion is too big for a URL, so it travels in a POST body through the browser. Base64, not encrypted, so anyone with the browser can read it.',
    },
    {
      from: 'user',
      to: 'sp',
      kind: 'normal',
      title: 'The browser posts it to Salesforce’s ACS URL',
      http: assertionXml({
        audience: ENTITY_ID,
        nameId: 'ingrid.haugen@fjordtech.no',
        inResponseTo: sp ? REQ_ID : undefined,
        signedBy: expired && !o.certMonitoring ? 'signed with the NEW Entra certificate (rotated yesterday)' : 'signed with Entra’s SAML signing certificate',
      }),
      note: 'The **Assertion Consumer Service (ACS)** URL is Entra’s “Reply URL”. Inside: who (NameID), for whom (Audience), how long (Conditions), extra attributes, and the signature.',
    },
  )

  if (expired) {
    steps.push(
      o.certMonitoring
        ? {
            from: 'sp',
            to: 'sp',
            kind: 'blocked',
            title: 'Signature valid: the rotation was planned',
            http: 'Entra: new certificate created 60 days before expiry, expiry emails at 60/30/7 days\nSalesforce: new certificate uploaded, then made active in Entra\n✓ signature verifies with the new certificate',
            note: 'Outage avoided. Certificate expiry is one of the most common causes of SAML outages. Track every SAML app’s certificate and who must update the SP side.',
          }
        : {
            from: 'sp',
            to: 'sp',
            kind: 'breach',
            title: 'Signature invalid. Nobody can sign in',
            http: 'SAML validation failed: signature does not match the configured IdP certificate\n(thumbprint on file: 3F2A…91C — expired 2026-10-18)',
            note: 'Outage: Monday morning, the whole sales team is locked out until someone uploads the new certificate to Salesforce. Turn on certificate monitoring and run it again.',
          },
    )
    return steps
  }

  const checks = [
    o.verifySignature ? '✓ signature: signed by the Entra certificate we have on file' : '– signature: not checked',
    '✓ Issuer = https://sts.windows.net/{tenant}/',
    o.checkAudience ? `✓ Audience = ${ENTITY_ID} (that’s us)` : '– audience: not checked',
    '✓ Destination / Recipient = our ACS URL',
    '✓ NotBefore ≤ now < NotOnOrAfter (allowing a few minutes of clock skew)',
    o.checkReplay ? (sp ? `✓ InResponseTo = ${REQ_ID} (a request we sent)\n✓ assertion ID never seen before → remember it` : '✓ assertion ID never seen before → remember it\n  (IdP-initiated: no InResponseTo to check)') : '– replay: not checked',
  ]
  steps.push(
    { from: 'sp', to: 'sp', kind: 'normal', title: 'Salesforce validates the assertion', http: checks.join('\n'), note: 'This list is where SAML security lives. Skipping any one check opens a hole, as the attacks show.' },
    {
      from: 'sp',
      to: 'user',
      kind: 'success',
      title: 'Ingrid is signed in',
      http: `Set-Cookie: sid=…; Secure; HttpOnly\nLocation: ${ENTITY_ID}/home   (from RelayState)`,
      note: 'Salesforce matches the NameID to the user whose Federation ID is ingrid.haugen@fjordtech.no and creates its own session. From now on Entra is out of the loop until that session ends.',
    },
  )

  if (o.attack === 'none') return steps

  if (o.attack === 'forged-assertion') {
    steps.push(
      {
        from: 'attacker',
        to: 'attacker',
        kind: 'attack',
        title: 'Mallory writes her own assertion',
        http: assertionXml({ audience: ENTITY_ID, nameId: 'ceo@fjordtech.no', signedBy: 'signed with MALLORY’S OWN key (or not signed at all)', id: '_forged-0001' }),
        note: 'The XML format is public. Anyone can type an assertion. Only the signature proves Entra wrote it.',
      },
      { from: 'attacker', to: 'sp', kind: 'attack', title: 'Mallory posts it to the ACS URL', http: `POST ${ACS}\nSAMLResponse=PHNhbWxwOlJlc3BvbnNl…`, note: 'The ACS endpoint is on the internet. Anyone can post to it.' },
      o.verifySignature
        ? { from: 'sp', to: 'attacker', kind: 'blocked', title: 'Rejected: signature invalid', http: 'SAML validation failed: assertion is not signed by a trusted IdP certificate', note: 'Blocked. Without Entra’s private key Mallory cannot produce a valid signature. Libraries must also verify that the signature covers the assertion they read (XML signature wrapping attacks target that gap).' }
        : { from: 'sp', to: 'attacker', kind: 'breach', title: 'Mallory is signed in as the CEO', http: 'Set-Cookie: sid=… (user: ceo@fjordtech.no)', note: 'Breach. Without signature validation SAML is just “trust whatever XML arrives”. Turn signature verification on and run it again.' },
    )
  }

  if (o.attack === 'replay') {
    steps.push(
      {
        from: 'attacker',
        to: 'attacker',
        kind: 'attack',
        title: 'Mallory gets a copy of Ingrid’s SAML response',
        http: '# salesforce-login-issue.har  (Ingrid sent it to the service desk)\nPOST /saml/acs  SAMLResponse=PHNhbWxwOlJlc3BvbnNl…',
        note: 'HAR files, proxy logs, a shared computer: a bearer assertion is worth a session to whoever holds it, until it expires.',
      },
      { from: 'attacker', to: 'sp', kind: 'attack', title: 'Mallory posts the same response again, within its validity window', http: `POST ${ACS}\nSAMLResponse=PHNhbWxwOlJlc3BvbnNl…   (identical, still validly signed)`, note: 'The signature is still valid because it is the real thing.' },
      o.checkReplay
        ? { from: 'sp', to: 'attacker', kind: 'blocked', title: 'Rejected: assertion already used', http: `SAML validation failed: assertion ID _a1b2c3d4-5e6f was already consumed${sp ? `\n(and InResponseTo ${REQ_ID} is no longer pending)` : ''}`, note: 'Blocked. The SP accepts each assertion once and keeps used IDs until they would have expired anyway.' }
        : { from: 'sp', to: 'attacker', kind: 'breach', title: 'Mallory is signed in as Ingrid', http: 'Set-Cookie: sid=… (user: ingrid.haugen@fjordtech.no)', note: 'Breach. Turn on replay checks and run it again. And never share HAR files with live sessions in them.' },
    )
  }

  if (o.attack === 'audience-swap') {
    steps.push(
      {
        from: 'attacker',
        to: 'attacker',
        kind: 'attack',
        title: 'Ingrid signs in to “Fjordtech Lunch”, an app Mallory controls',
        http: assertionXml({ audience: 'https://lunch.fjordtech-app.com', nameId: 'ingrid.haugen@fjordtech.no', signedBy: 'signed with Entra’s SAML signing certificate', id: '_lunch-7781' }),
        note: 'A real assertion, really signed by Entra, but issued to a different app. Some IdPs use the same signing certificate for many apps.',
      },
      { from: 'attacker', to: 'sp', kind: 'attack', title: 'Mallory forwards it to Salesforce', http: `POST ${ACS}\nSAMLResponse=<the lunch app’s assertion>`, note: 'Signature checks pass: Entra did sign it.' },
      o.checkAudience
        ? { from: 'sp', to: 'attacker', kind: 'blocked', title: 'Rejected: audience mismatch', http: `SAML validation failed: Audience https://lunch.fjordtech-app.com ≠ ${ENTITY_ID}`, note: 'Blocked. The audience says who the assertion is for, and it isn’t Salesforce.' }
        : { from: 'sp', to: 'attacker', kind: 'breach', title: 'Mallory is signed in to Salesforce as Ingrid', http: 'Set-Cookie: sid=… (user: ingrid.haugen@fjordtech.no)', note: 'Breach. Any app that receives Ingrid’s assertions can impersonate her here. Turn on the audience check.' },
    )
  }

  return steps
}
