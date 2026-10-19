// Build-a-policy missions. Each is checked by running test sign-ins through the real evaluator.
import { evaluate, type Verdict } from './engine'
import type { Control, Policy, SignIn } from './model'

export interface MissionTest {
  name: string
  signIn: SignIn
  expect: Verdict['decision']
  controls?: Control[]
}

export interface Mission {
  id: string
  title: string
  goal: string
  hint: string
  start: Policy
  solution: Policy
  tests: MissionTest[]
}

const base: SignIn = { user: 'ingrid', app: 'office365', device: 'corp-laptop', location: 'home', client: 'browser', signInRisk: 'none', userRisk: 'none' }
const si = (p: Partial<SignIn>): SignIn => ({ ...base, ...p })

const draft = (id: string, name: string, p: Partial<Policy>): Policy => ({
  id,
  name,
  state: 'on',
  include: ['all-users'],
  exclude: [],
  apps: 'all',
  conditions: {},
  grant: { block: false, require: ['mfa'], operator: 'AND' },
  ...p,
})

export const MISSIONS: Mission[] = [
  {
    id: 'm1',
    title: 'MFA for everyone, without locking yourself out',
    goal: 'Require MFA for all users on all apps, and switch the policy on. The break-glass account must still get in with no requirements, even when MFA itself is broken.',
    hint: 'Report-only doesn’t enforce anything. And every policy needs the break-glass group in its exclusions.',
    start: draft('M1', 'All users: require MFA', { state: 'report' }),
    solution: draft('M1', 'All users: require MFA', { exclude: ['grp:breakglass'] }),
    tests: [
      { name: 'Ingrid opens Office 365 in a browser', signIn: si({}), expect: 'grant', controls: ['mfa'] },
      { name: 'Pia the guest opens Salesforce', signIn: si({ user: 'guest', app: 'salesforce' }), expect: 'grant', controls: ['mfa'] },
      { name: 'Break-glass signs in to the Azure portal during an outage', signIn: si({ user: 'bg', app: 'azure' }), expect: 'allow' },
    ],
  },
  {
    id: 'm2',
    title: 'Block legacy authentication',
    goal: 'Block sign-ins over legacy protocols (IMAP, SMTP, basic auth) for everyone except break-glass, without touching normal browser and app sign-ins.',
    hint: 'Use the client apps condition so the policy only applies to legacy clients.',
    start: draft('M2', 'All users: block legacy auth', { grant: { block: true }, exclude: ['grp:breakglass'] }),
    solution: draft('M2', 'All users: block legacy auth', { grant: { block: true }, exclude: ['grp:breakglass'], conditions: { clients: ['legacy'] } }),
    tests: [
      { name: 'Ingrid’s old mail client uses IMAP', signIn: si({ client: 'legacy' }), expect: 'block' },
      { name: 'svc-scanner sends scans over SMTP AUTH', signIn: si({ user: 'svc', client: 'legacy', device: 'linux', location: 'office' }), expect: 'block' },
      { name: 'Ingrid uses Outlook in a browser', signIn: si({}), expect: 'allow' },
      { name: 'Kari uses the Teams desktop app', signIn: si({ user: 'kari', client: 'modern' }), expect: 'allow' },
    ],
  },
  {
    id: 'm3',
    title: 'Phishing-resistant MFA for admins',
    goal: 'Admins must use phishing-resistant MFA (FIDO2, passkey, Windows Hello) on every app. Regular users and break-glass must not be affected by this policy.',
    hint: 'Target the admin roles, not all users, and pick the phishing-resistant control.',
    start: draft('M3', 'Admins: phishing-resistant MFA', {}),
    solution: draft('M3', 'Admins: phishing-resistant MFA', { include: ['role:admin'], exclude: ['grp:breakglass'], grant: { block: false, require: ['phish-mfa'], operator: 'AND' } }),
    tests: [
      { name: 'Erik opens the Azure portal', signIn: si({ user: 'erik', app: 'azure' }), expect: 'grant', controls: ['phish-mfa'] },
      { name: 'Ingrid opens Office 365', signIn: si({}), expect: 'allow' },
      { name: 'Break-glass opens the Azure portal', signIn: si({ user: 'bg', app: 'azure' }), expect: 'allow' },
    ],
  },
  {
    id: 'm4',
    title: 'Finance data only on managed devices',
    goal: 'Visma ERP may only be used from compliant Fjordtech devices. Other apps must keep working from personal devices.',
    hint: 'Narrow the target apps, then require a compliant device.',
    start: draft('M4', 'Visma: compliant device', { exclude: ['grp:breakglass'], grant: { block: false, require: ['compliant'], operator: 'AND' } }),
    solution: draft('M4', 'Visma: compliant device', { exclude: ['grp:breakglass'], apps: ['visma'], grant: { block: false, require: ['compliant'], operator: 'AND' } }),
    tests: [
      { name: 'Kari opens Visma on her Fjordtech laptop', signIn: si({ user: 'kari', app: 'visma' }), expect: 'grant', controls: ['compliant'] },
      { name: 'Kari opens Visma on her personal Mac', signIn: si({ user: 'kari', app: 'visma', device: 'personal-mac' }), expect: 'block' },
      { name: 'Kari reads Office 365 mail on her personal Mac', signIn: si({ user: 'kari', device: 'personal-mac' }), expect: 'allow' },
    ],
  },
  {
    id: 'm5',
    title: 'Stop risky sign-ins',
    goal: 'Block sign-ins that Entra ID Protection rates as high risk. Low and medium risk must not be blocked by this policy. Keep break-glass out of it.',
    hint: 'Use the sign-in risk condition with only the level you mean.',
    start: draft('M5', 'Block risky sign-ins', { exclude: ['grp:breakglass'], grant: { block: true }, conditions: { signInRisk: ['medium', 'high'] } }),
    solution: draft('M5', 'Block risky sign-ins', { exclude: ['grp:breakglass'], grant: { block: true }, conditions: { signInRisk: ['high'] } }),
    tests: [
      { name: 'Ingrid: impossible travel, high risk', signIn: si({ signInRisk: 'high', location: 'abroad' }), expect: 'block' },
      { name: 'Ingrid: unfamiliar hotel Wi-Fi, medium risk', signIn: si({ signInRisk: 'medium', location: 'abroad' }), expect: 'allow' },
      { name: 'Break-glass flagged high risk during an incident', signIn: si({ user: 'bg', signInRisk: 'high', app: 'azure' }), expect: 'allow' },
    ],
  },
  {
    id: 'm6',
    title: 'Shut down device code phishing',
    goal: 'Nobody at Fjordtech uses the device code flow. Block it for everyone except break-glass, and make sure it is actually enforced.',
    hint: 'Report-only is how you test a policy, not how you enforce it.',
    start: draft('M6', 'Block device code flow', { state: 'report', exclude: ['grp:breakglass'], grant: { block: true }, conditions: { clients: ['device-code'] } }),
    solution: draft('M6', 'Block device code flow', { exclude: ['grp:breakglass'], grant: { block: true }, conditions: { clients: ['device-code'] } }),
    tests: [
      { name: 'Ingrid enters a code from a phishing email', signIn: si({ client: 'device-code' }), expect: 'block' },
      { name: 'Erik runs az login --use-device-code', signIn: si({ user: 'erik', client: 'device-code', app: 'azure' }), expect: 'block' },
      { name: 'Ingrid signs in normally', signIn: si({}), expect: 'allow' },
    ],
  },
]

export interface TestResult {
  test: MissionTest
  pass: boolean
  got: Verdict
  why: string
}

export function runMission(m: Mission, policy: Policy): TestResult[] {
  return m.tests.map((test) => {
    const { verdict } = evaluate([policy], test.signIn)
    const controlsOk = !test.controls || test.controls.every((c) => verdict.requirements.some((r) => r.checks.some((k) => k.control === c)))
    const pass = verdict.decision === test.expect && controlsOk
    const label = { block: 'blocked', grant: 'granted with controls', allow: 'allowed with no requirements' }
    const why = pass
      ? `${label[verdict.decision][0].toUpperCase()}${label[verdict.decision].slice(1)}, as expected.`
      : verdict.decision !== test.expect
        ? `Expected ${label[test.expect]}, got ${label[verdict.decision]}. ${verdict.details[0] ?? ''}`
        : `Granted, but without the required control (${test.controls!.join(', ')}).`
    return { test, pass, got: verdict, why }
  })
}
