import { describe, expect, it } from 'vitest'
import { ACTIVATION_ASSIGNMENTS, GOOD_SETTINGS, MESSY_ASSIGNMENTS, MESSY_GA_SETTINGS } from '../features/pim/model'
import { activeUntil, advanceClock, applyDecisions, approve, auditTenant, deactivate, deny, requestActivation, type ActivationInput, type PimState } from '../features/pim/engine'

const fresh = (): PimState => ({ now: 0, assignments: ACTIVATION_ASSIGNMENTS, settings: GOOD_SETTINGS, requests: [], log: [] })
const erikGa: ActivationInput = { principal: 'erik', role: 'ga', hours: 2, justification: 'Fix CA policy', ticket: 'CHG-1042', method: 'fido2' }

describe('PIM activation', () => {
  it('rejects people who are not eligible', () => {
    const r = requestActivation(fresh(), { ...erikGa, principal: 'nora' })
    expect(r.result.ok).toBe(false)
  })

  it('enforces duration, justification, ticket and phishing-resistant MFA', () => {
    const r = requestActivation(fresh(), { ...erikGa, hours: 8, justification: '', ticket: '', method: 'authenticator' })
    expect(r.result.ok).toBe(false)
    const errors = r.result.ok ? [] : r.result.errors.join(' ')
    expect(errors).toMatch(/Maximum activation/)
    expect(errors).toMatch(/justification/)
    expect(errors).toMatch(/ticket/)
    expect(errors).toMatch(/Phishing-resistant/)
  })

  it('Nora cannot activate a tier-0 group with only Authenticator', () => {
    const r = requestActivation(fresh(), { principal: 'nora', role: 'azure-owners', hours: 1, justification: 'x', ticket: 'INC-1', method: 'authenticator' })
    expect(r.result.ok).toBe(false)
  })

  it('tier-1 roles without approval activate immediately', () => {
    const { state, result } = requestActivation(fresh(), { principal: 'nora', role: 'helpdesk', hours: 8, justification: 'Password resets', ticket: '', method: 'authenticator' })
    expect(result.ok).toBe(true)
    expect(activeUntil(state, 'nora', 'helpdesk')).toBe(8 * 60)
  })

  it('approval: pending until another approver approves, then expires on time', () => {
    let { state } = requestActivation(fresh(), erikGa)
    const req = state.requests[0]
    expect(req.status).toBe('pending')
    expect(activeUntil(state, 'erik', 'ga')).toBeNull()
    expect(approve(state, req.id, 'erik').result.ok).toBe(false)
    expect(approve(state, req.id, 'nora').result.ok).toBe(false)
    state = approve(state, req.id, 'marte').state
    expect(activeUntil(state, 'erik', 'ga')).toBe(120)
    state = advanceClock(state, 60)
    expect(activeUntil(state, 'erik', 'ga')).not.toBeNull()
    state = advanceClock(state, 60)
    expect(activeUntil(state, 'erik', 'ga')).toBeNull()
    expect(state.requests[0].status).toBe('expired')
    expect(state.log.map((l) => l.kind)).toEqual(['request', 'request', 'approve', 'activate', 'expire'])
  })

  it('deny and early deactivation', () => {
    let { state } = requestActivation(fresh(), erikGa)
    state = deny(state, state.requests[0].id, 'marte', 'No change ticket approved').state
    expect(state.requests[0].status).toBe('denied')
    let s2 = requestActivation(fresh(), { principal: 'nora', role: 'ua', hours: 2, justification: 'Onboarding', ticket: '', method: 'authenticator' }).state
    s2 = deactivate(s2, s2.requests[0].id)
    expect(activeUntil(s2, 'nora', 'ua')).toBeNull()
  })

  it('break-glass stays permanently active', () => {
    expect(activeUntil(advanceClock(fresh(), 10_000), 'bg-01', 'ga')).toBe(Infinity)
  })
})

describe('standing access audit', () => {
  it('flags the messy tenant', () => {
    const f = auditTenant(MESSY_ASSIGNMENTS, MESSY_GA_SETTINGS)
    expect(f.filter((x) => x.severity === 'high').length).toBeGreaterThanOrEqual(7)
  })

  it('a correct clean-up reaches zero findings', () => {
    const cleaned = applyDecisions(MESSY_ASSIGNMENTS, { a3: 'eligible', a4: 'remove', a5: 'remove', a6: 'eligible', a7: 'eligible' })
    expect(auditTenant(cleaned, GOOD_SETTINGS.ga)).toEqual([])
  })

  it('removing or demoting break-glass is flagged', () => {
    const cleaned = applyDecisions(MESSY_ASSIGNMENTS, { a1: 'remove', a2: 'eligible', a3: 'eligible', a4: 'remove', a5: 'remove', a6: 'eligible', a7: 'eligible' })
    const f = auditTenant(cleaned, GOOD_SETTINGS.ga)
    expect(f.some((x) => /break-glass/.test(x.text))).toBe(true)
  })
})
