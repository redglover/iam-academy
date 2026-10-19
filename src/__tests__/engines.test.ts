import { describe, expect, it } from 'vitest'
import { PERSONAS, emptyIdentity, expectedAccess, makeUpn } from '../features/jml-sim/model'
import { findings, plan, runAll } from '../features/jml-sim/engine'
import { SCENARIOS, score } from '../features/automation/pipeline'
import { sodConflicts } from '../features/rbac-lab/sod'

const ingrid = PERSONAS[0]

function joined(mode: 'automated' | 'manual', dept: 'Sales' | 'Finance' = 'Sales') {
  const start = emptyIdentity(ingrid)
  return runAll(start, plan({ type: 'joiner', dept }, start, ingrid, mode))
}

describe('JML engine', () => {
  it('transliterates Norwegian letters in usernames', () => {
    expect(makeUpn('Bjørn Ærlig Åsen')).toBe('bjorn.aerlig.asen@fjordtech.no')
  })

  it('automated joiner grants exactly the policy access', () => {
    const who = joined('automated')
    expect(who.status).toBe('active')
    expect(new Set(who.entitlements)).toEqual(new Set(expectedAccess('employee', 'Sales')))
    expect(who.accounts.entra?.enabled).toBe(true)
    expect(findings(who)).toEqual([])
  })

  it('manual joiner copies extra access from a colleague', () => {
    const who = joined('manual', 'Finance')
    const f = findings(who)
    expect(f.some((x) => x.title.startsWith('Excess access'))).toBe(true)
    expect(f.some((x) => x.title.startsWith('SoD conflict'))).toBe(true)
  })

  it('automated mover removes old department access', () => {
    const who = joined('automated')
    const moved = runAll(who, plan({ type: 'mover', dept: 'Finance' }, who, ingrid, 'automated'))
    expect(moved.entitlements).not.toContain('crm-sales')
    expect(moved.entitlements).toContain('erp-ap-clerk')
    expect(findings(moved)).toEqual([])
  })

  it('manual mover causes privilege creep', () => {
    const who = joined('automated')
    const moved = runAll(who, plan({ type: 'mover', dept: 'Finance' }, who, ingrid, 'manual'))
    expect(moved.entitlements).toContain('crm-sales')
    expect(findings(moved).length).toBeGreaterThan(0)
  })

  it('automated leaver leaves nothing behind', () => {
    const who = joined('automated')
    const left = runAll(who, plan({ type: 'leaver' }, who, ingrid, 'automated'))
    expect(left.status).toBe('terminated')
    expect(findings(left)).toEqual([])
    expect(left.mailbox).toBe('shared')
  })

  it('manual leaver leaves orphan accounts and live sessions', () => {
    const who = joined('automated')
    const left = runAll(who, plan({ type: 'leaver' }, who, ingrid, 'manual'))
    const titles = findings(left).map((f) => f.title)
    expect(titles.some((t) => t.startsWith('Orphan account'))).toBe(true)
    expect(titles).toContain('Live sessions after termination')
  })
})

describe('pipeline validator', () => {
  const leaver = SCENARIOS.find((s) => s.id === 'leaver')!
  const joiner = SCENARIOS.find((s) => s.id === 'joiner')!

  it('accepts a model leaver runbook', () => {
    const ids = ['trigger', 'validate', 'lookup', 'retry', 'disable', 'revoke', 'groups', 'scim', 'mailbox', 'license', 'notify', 'log']
    expect(leaver.validate(ids)).toEqual([])
    expect(score(leaver.validate(ids))).toBe(100)
  })

  it('flags revoke before disable', () => {
    const issues = leaver.validate(['trigger', 'lookup', 'revoke', 'disable'])
    expect(issues.some((i) => i.level === 'error' && i.message.includes('Revoke runs before disable'))).toBe(true)
  })

  it('flags immediate delete and emailed passwords', () => {
    expect(leaver.validate(['trigger', 'delete']).some((i) => i.message.includes('irreversible'))).toBe(true)
    expect(joiner.validate(['trigger', 'password-mail']).some((i) => i.message.includes('Never email passwords'))).toBe(true)
  })

  it('accepts a model joiner runbook', () => {
    const ids = ['trigger', 'validate', 'lookup', 'upn', 'retry', 'create', 'manager', 'birthright', 'role', 'license', 'tap', 'schedule', 'notify', 'log']
    expect(joiner.validate(ids)).toEqual([])
  })
})

describe('SoD', () => {
  it('detects toxic combinations', () => {
    expect(sodConflicts(['erp-vendor-create', 'erp-pay-approve']).map((r) => r.id)).toEqual(['SOD-01'])
    expect(sodConflicts(['crm-sales'])).toEqual([])
  })
})
