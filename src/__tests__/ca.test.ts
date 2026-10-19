import { describe, expect, it } from 'vitest'
import { evaluate, describePolicy } from '../features/ca/engine'
import { FJORDTECH_POLICIES, type Policy, type SignIn } from '../features/ca/model'
import { MISSIONS, runMission } from '../features/ca/missions'

const si = (p: Partial<SignIn>): SignIn => ({ user: 'ingrid', app: 'office365', device: 'corp-laptop', location: 'home', client: 'browser', signInRisk: 'none', userRisk: 'none', ...p })
const v = (p: Partial<SignIn>, policies: Policy[] = FJORDTECH_POLICIES) => evaluate(policies, si(p)).verdict

describe('Conditional Access evaluation', () => {
  it('a normal sign-in is granted after MFA', () => {
    const r = v({})
    expect(r.decision).toBe('grant')
    expect(r.requirements.map((x) => x.policy.id)).toEqual(['CA001'])
  })

  it('legacy auth is blocked by CA002, and block wins', () => {
    const r = v({ client: 'legacy' })
    expect(r.decision).toBe('block')
    expect(r.blockedBy.map((p) => p.id)).toEqual(['CA002'])
  })

  it('without the legacy block, MFA still cannot be satisfied by legacy clients', () => {
    const r = v({ client: 'legacy' }, FJORDTECH_POLICIES.filter((p) => p.id !== 'CA002'))
    expect(r.decision).toBe('block')
    expect(r.blockedBy).toEqual([])
    expect(r.details[0]).toMatch(/Legacy protocols/)
  })

  it('exclusions beat inclusions: break-glass is allowed', () => {
    expect(v({ user: 'bg', app: 'azure' }).decision).toBe('allow')
  })

  it('all applicable grant controls must be met together', () => {
    const ok = v({ user: 'erik', app: 'azure' })
    expect(ok.decision).toBe('grant')
    expect(ok.requirements.map((r) => r.policy.id).sort()).toEqual(['CA001', 'CA003'])
    const noFido = v({ user: 'erik', app: 'azure' }, FJORDTECH_POLICIES.map((p) => (p.id === 'CA003' ? { ...p, include: ['all-users'] } : p)))
    expect(noFido.decision).toBe('grant')
    expect(v({ app: 'azure' }, FJORDTECH_POLICIES.map((p) => (p.id === 'CA003' ? { ...p, include: ['all-users'] } : p))).decision).toBe('block')
  })

  it('OR grant: app protection satisfies the mobile policy', () => {
    expect(v({ device: 'iphone-mam', client: 'modern' }).decision).toBe('grant')
    expect(v({ device: 'android', client: 'modern' }).decision).toBe('block')
  })

  it('report-only policies are evaluated but not enforced', () => {
    const r = evaluate(FJORDTECH_POLICIES, si({ client: 'device-code' }))
    expect(r.verdict.decision).toBe('grant')
    expect(r.verdict.reportOnly.map((x) => x.policy.id)).toEqual(['CA007'])
  })

  it('no applicable policy means password-only access', () => {
    expect(v({}, []).decision).toBe('allow')
  })

  it('describes policies in one line', () => {
    expect(describePolicy(FJORDTECH_POLICIES[1])).toBe('All users except Break-glass accounts → all apps, when legacy protocol → block')
  })
})

describe('missions', () => {
  it.each(MISSIONS.map((m) => [m.id, m] as const))('%s: solution passes, starting draft fails', (_, m) => {
    expect(runMission(m, m.solution).every((r) => r.pass)).toBe(true)
    expect(runMission(m, m.start).some((r) => !r.pass)).toBe(true)
  })
})
