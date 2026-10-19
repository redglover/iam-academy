// Conditional Access evaluation, modelled on how Entra ID combines policies.
import { APPS, CLIENTS, CONTROLS, DEVICES, LOCATIONS, TAG_LABELS, USERS, type Control, type Policy, type SignIn } from './model'

export interface PolicyResult {
  policy: Policy
  applies: boolean
  reasons: string[]
}

export interface ControlCheck {
  control: Control
  ok: boolean
  why: string
}

export interface Requirement {
  policy: Policy
  operator: 'AND' | 'OR'
  checks: ControlCheck[]
  satisfied: boolean
}

export interface Verdict {
  decision: 'block' | 'grant' | 'allow'
  headline: string
  details: string[]
  blockedBy: Policy[]
  requirements: Requirement[]
  reportOnly: PolicyResult[]
}

const tagList = (tags: string[]) => tags.map((t) => TAG_LABELS[t] ?? t).join(', ')

export function matchPolicy(p: Policy, s: SignIn): PolicyResult {
  const user = USERS.find((u) => u.id === s.user)!
  const device = DEVICES.find((d) => d.id === s.device)!
  const c = p.conditions
  const miss = (why: string): PolicyResult => ({ policy: p, applies: false, reasons: [why] })

  if (!p.include.some((t) => user.tags.includes(t))) return miss(`${user.name} isn’t in the included users (${tagList(p.include) || 'none selected'}).`)
  const excludedBy = p.exclude.filter((t) => user.tags.includes(t))
  if (excludedBy.length) return miss(`${user.name} is excluded (${tagList(excludedBy)}). Exclusions always win over inclusions.`)
  if (p.apps !== 'all' && !p.apps.includes(s.app)) return miss(`${APPS[s.app]} isn’t a target app of this policy.`)
  if (c.clients?.length && !c.clients.includes(s.client)) return miss(`Client app condition not met: this sign-in uses ${CLIENTS[s.client].toLowerCase()}.`)
  if (c.platforms?.length && !c.platforms.includes(device.platform)) return miss(`Device platform condition not met (${device.platform}).`)
  if (c.locations === 'untrusted' && s.location === 'office') return miss('Sign-in is from a trusted location, which this policy leaves out.')
  if (c.locations === 'blocked' && s.location !== 'blocked') return miss('Location condition not met: not from a blocked country.')
  if (c.signInRisk?.length && !c.signInRisk.includes(s.signInRisk)) return miss(`Sign-in risk is ${s.signInRisk}, not ${c.signInRisk.join('/')}.`)
  if (c.userRisk?.length && !c.userRisk.includes(s.userRisk)) return miss(`User risk is ${s.userRisk}, not ${c.userRisk.join('/')}.`)

  const why: string[] = [`${user.name} is in scope`, p.apps === 'all' ? 'all apps are targeted' : `${APPS[s.app]} is targeted`]
  if (c.clients?.length) why.push(`client is ${CLIENTS[s.client].toLowerCase()}`)
  if (c.platforms?.length) why.push(`platform is ${device.platform}`)
  if (c.locations && c.locations !== 'any') why.push(`location: ${LOCATIONS[s.location]}`)
  if (c.signInRisk?.length) why.push(`sign-in risk is ${s.signInRisk}`)
  if (c.userRisk?.length) why.push(`user risk is ${s.userRisk}`)
  return { policy: p, applies: true, reasons: [why.join(', ') + '.'] }
}

export function checkControl(control: Control, s: SignIn): ControlCheck {
  const user = USERS.find((u) => u.id === s.user)!
  const device = DEVICES.find((d) => d.id === s.device)!
  const legacy = s.client === 'legacy'
  const hasMfa = user.methods.some((m) => m !== 'password')
  switch (control) {
    case 'mfa':
      if (legacy) return { control, ok: false, why: 'Legacy protocols can’t show an MFA prompt, so this requirement can never be met.' }
      if (!hasMfa) return { control, ok: false, why: `${user.name} has no MFA method, and a service account has no human to answer a prompt.` }
      return { control, ok: true, why: `${user.name} gets an MFA prompt (${user.methods.includes('fido2') ? 'security key or authenticator' : 'authenticator app'}).` }
    case 'phish-mfa':
      if (legacy) return { control, ok: false, why: 'Legacy protocols can’t do any MFA.' }
      if (!user.methods.includes('fido2')) return { control, ok: false, why: `${user.name} has no phishing-resistant method (FIDO2 key, passkey or Windows Hello). Authenticator push isn’t enough.` }
      return { control, ok: true, why: `${user.name} signs in with a FIDO2 security key.` }
    case 'compliant':
      return device.compliant
        ? { control, ok: true, why: `${device.label} is enrolled in Intune and compliant.` }
        : { control, ok: false, why: `${device.label} isn’t a compliant device.` }
    case 'app-protection':
      return device.appProtection && s.client === 'modern'
        ? { control, ok: true, why: 'Outlook on the phone is covered by an Intune app protection policy.' }
        : { control, ok: false, why: device.appProtection ? 'App protection only applies to the protected mobile app, not a browser.' : 'No app protection policy on this device.' }
    case 'password-change': {
      const mfa = checkControl('mfa', s)
      return mfa.ok
        ? { control, ok: true, why: 'The user is asked to change their password after MFA (secure password change).' }
        : { control, ok: false, why: 'A secure password change requires MFA first, which this sign-in can’t do.' }
    }
  }
}

export function evaluate(policies: Policy[], s: SignIn): { results: PolicyResult[]; verdict: Verdict } {
  const results = policies.filter((p) => p.state !== 'off').map((p) => matchPolicy(p, s))
  const enforced = results.filter((r) => r.applies && r.policy.state === 'on')
  const reportOnly = results.filter((r) => r.applies && r.policy.state === 'report')

  const blockedBy = enforced.filter((r) => r.policy.grant.block).map((r) => r.policy)
  if (blockedBy.length) {
    return {
      results,
      verdict: {
        decision: 'block',
        headline: 'Access blocked',
        details: [`Blocked by ${blockedBy.map((p) => p.id).join(', ')}. When any applicable policy blocks, block wins, whatever else the other policies would allow.`],
        blockedBy,
        requirements: [],
        reportOnly,
      },
    }
  }

  const requirements: Requirement[] = enforced.map((r) => {
    const g = r.policy.grant as Extract<Policy['grant'], { block: false }>
    const checks = g.require.map((c) => checkControl(c, s))
    const satisfied = g.operator === 'AND' ? checks.every((c) => c.ok) : checks.some((c) => c.ok)
    return { policy: r.policy, operator: g.operator, checks, satisfied }
  })

  if (!requirements.length) {
    const user = USERS.find((u) => u.id === s.user)!
    return {
      results,
      verdict: {
        decision: 'allow',
        headline: 'Allowed with password only',
        details: [`No enforced policy applies, so ${user.name} gets in with just the primary sign-in. Make sure that is intentional.`],
        blockedBy: [],
        requirements,
        reportOnly,
      },
    }
  }

  const unmet = requirements.filter((r) => !r.satisfied)
  if (unmet.length) {
    return {
      results,
      verdict: {
        decision: 'block',
        headline: 'Blocked: a requirement can’t be met',
        details: unmet.map((r) => `${r.policy.id}: ${r.checks.filter((c) => !c.ok).map((c) => c.why).join(' ')}`),
        blockedBy: [],
        requirements,
        reportOnly,
      },
    }
  }

  const steps = [...new Set(requirements.flatMap((r) => r.checks.filter((c) => c.ok).map((c) => CONTROLS[c.control].replace('Require ', ''))))]
  return {
    results,
    verdict: {
      decision: 'grant',
      headline: steps.length ? `Granted after: ${steps.join(', ')}` : 'Granted (the policy has no grant controls selected)',
      details: ['Every applicable policy’s grant controls are satisfied. All policies must be satisfied together.'],
      blockedBy: [],
      requirements,
      reportOnly,
    },
  }
}

/** Human-readable one-line summary of a policy. */
export function describePolicy(p: Policy): string {
  const who = `${tagList(p.include) || 'nobody'}${p.exclude.length ? ` except ${tagList(p.exclude)}` : ''}`
  const apps = p.apps === 'all' ? 'all apps' : p.apps.map((a) => APPS[a]).join(', ')
  const c = p.conditions
  const when = [
    c.clients?.length && c.clients.map((x) => CLIENTS[x].split(' (')[0].toLowerCase()).join('/'),
    c.platforms?.length && c.platforms.join('/'),
    c.locations === 'untrusted' && 'outside trusted locations',
    c.locations === 'blocked' && 'from blocked countries',
    c.signInRisk?.length && `sign-in risk ${c.signInRisk.join('/')}`,
    c.userRisk?.length && `user risk ${c.userRisk.join('/')}`,
  ].filter(Boolean)
  const then = p.grant.block ? 'block' : p.grant.require.map((x) => CONTROLS[x].replace('Require ', '')).join(p.grant.operator === 'AND' ? ' and ' : ' or ')
  return `${who} → ${apps}${when.length ? `, when ${when.join(', ')}` : ''} → ${then || 'nothing selected'}`
}
