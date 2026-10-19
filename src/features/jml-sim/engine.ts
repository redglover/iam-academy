import {
  BIRTHRIGHT,
  DEPARTMENT_ROLE,
  ENTITLEMENTS,
  expectedAccess,
  type Department,
  type Identity,
  type IdentityStatus,
  type Persona,
  type SystemId,
} from './model'
import { sodConflicts } from '../rbac-lab/sod'

export type Mode = 'automated' | 'manual'

export type Op =
  | { op: 'status'; status: IdentityStatus }
  | { op: 'dept'; dept: Department; title: string }
  | { op: 'grant'; ent: string }
  | { op: 'revoke'; ent: string }
  | { op: 'account'; system: SystemId; enabled: boolean }
  | { op: 'sessions'; value: boolean }
  | { op: 'mailbox'; value: Identity['mailbox'] }
  | { op: 'none' }

export type StepKind = 'event' | 'decide' | 'add' | 'remove' | 'notify' | 'wait' | 'warn'

export interface Step {
  system: SystemId
  kind: StepKind
  label: string
  detail?: string
  /** Minutes since the HR event, for the timeline. */
  at: number
  op: Op
}

export type HrEvent =
  | { type: 'joiner'; dept: Department }
  | { type: 'mover'; dept: Department }
  | { type: 'leaver' }

/** Access an admin accidentally copies when "modelling" a new hire on a colleague. */
const COLLEAGUE_EXTRAS: Record<Department, string> = {
  Sales: 'crm-export',
  Finance: 'erp-pay-approve',
  Engineering: 'git-prod-deploy',
  People: 'erp-ap-clerk',
}

const H = 60
const D = 24 * H

function grantSteps(ents: string[], at: number, why: string): Step[] {
  return ents.map((ent, i) => {
    const e = ENTITLEMENTS[ent]
    return {
      system: e.system,
      kind: 'add' as const,
      label: `Grant “${e.name}”`,
      detail: why,
      at: at + i,
      op: { op: 'grant', ent } as Op,
    }
  })
}

function revokeSteps(ents: string[], at: number, why: string): Step[] {
  return ents.map((ent, i) => {
    const e = ENTITLEMENTS[ent]
    return {
      system: e.system,
      kind: 'remove' as const,
      label: `Revoke “${e.name}”`,
      detail: why,
      at: at + i,
      op: { op: 'revoke', ent } as Op,
    }
  })
}

export function plan(event: HrEvent, who: Identity, persona: Persona, mode: Mode): Step[] {
  if (event.type === 'joiner') return mode === 'automated' ? joinerAuto(event.dept, who, persona) : joinerManual(event.dept, who, persona)
  if (event.type === 'mover') return mode === 'automated' ? moverAuto(event.dept, who, persona) : moverManual(event.dept, who, persona)
  return mode === 'automated' ? leaverAuto(who) : leaverManual(who)
}

function joinerAuto(dept: Department, who: Identity, p: Persona): Step[] {
  const role = DEPARTMENT_ROLE[dept]
  const birthright = BIRTHRIGHT[who.type].filter((e) => e !== 'entra-account')
  return [
    {
      system: 'hr', kind: 'event', at: 0,
      label: `HR registers new ${who.type} in ${dept}`,
      detail: `Start date in 14 days. Title: ${p.title[dept]}. Manager: ${p.manager}.${who.type === 'contractor' ? ' End date: 6 months.' : ''}`,
      op: { op: 'status', status: 'pre-hire' },
    },
    { system: 'hr', kind: 'event', at: 0, label: 'Position data saved', op: { op: 'dept', dept, title: p.title[dept] } },
    {
      system: 'iga', kind: 'decide', at: 5,
      label: 'IGA picks up the change (HR webhook)',
      detail: `Matches on employee ID ${who.employeeId}, never on name. Finds no existing identity, so this is a new joiner, not a rehire.`,
      op: { op: 'none' },
    },
    {
      system: 'entra', kind: 'add', at: 6,
      label: `Create account ${who.upn}`,
      detail: 'Created disabled. It is enabled automatically on the start date.',
      op: { op: 'account', system: 'entra', enabled: false },
    },
    { system: 'entra', kind: 'add', at: 6, label: 'Grant “User account”', op: { op: 'grant', ent: 'entra-account' } },
    ...grantSteps(birthright, 7, `Birthright access for every ${who.type}.`),
    {
      system: 'iga', kind: 'decide', at: 12,
      label: `Assign business role ${role.role}`,
      detail: `Rule: department = ${dept}. No ticket, no approval needed for the standard bundle.`,
      op: { op: 'none' },
    },
    ...grantSteps(role.entitlements, 13, `Comes from ${role.role}. Pushed via SCIM.`),
    ...(who.type === 'employee'
      ? [{ system: 'm365' as const, kind: 'add' as const, at: 20, label: 'Mailbox created', op: { op: 'mailbox', value: 'user' } as Op }]
      : []),
    {
      system: 'iga', kind: 'notify', at: 21,
      label: `Email to ${p.manager}: “Everything is ready for day one”`,
      detail: 'Includes a Temporary Access Pass so the new hire can register MFA on day one.',
      op: { op: 'none' },
    },
    { system: 'entra', kind: 'wait', at: 14 * D, label: 'Start date, 06:00: account enabled', op: { op: 'account', system: 'entra', enabled: true } },
    { system: 'hr', kind: 'event', at: 14 * D, label: 'Status: active', op: { op: 'status', status: 'active' } },
  ]
}

function joinerManual(dept: Department, who: Identity, p: Persona): Step[] {
  const role = DEPARTMENT_ROLE[dept]
  const extra = COLLEAGUE_EXTRAS[dept]
  return [
    { system: 'hr', kind: 'event', at: 0, label: `HR registers new ${who.type} in ${dept}`, detail: 'Start date in 14 days.', op: { op: 'status', status: 'pre-hire' } },
    { system: 'hr', kind: 'event', at: 0, label: 'Position data saved', op: { op: 'dept', dept, title: p.title[dept] } },
    {
      system: 'hr', kind: 'wait', at: 13 * D,
      label: 'HR forgets to email IT until the day before',
      detail: 'No integration, so IT only learns about hires when someone remembers to tell them.',
      op: { op: 'none' },
    },
    { system: 'iga', kind: 'wait', at: 14 * D + 2 * H, label: 'Ticket waits in the service desk queue', op: { op: 'none' } },
    {
      system: 'entra', kind: 'add', at: 14 * D + 5 * H,
      label: `Admin types in account ${who.upn} by hand`,
      detail: 'The new hire spends the first morning without a laptop login.',
      op: { op: 'account', system: 'entra', enabled: true },
    },
    { system: 'hr', kind: 'event', at: 14 * D + 5 * H, label: 'Status: active', op: { op: 'status', status: 'active' } },
    {
      system: 'iga', kind: 'warn', at: 14 * D + 5 * H + 10,
      label: '“Just copy Kari’s access, she has the same job”',
      detail: `Copying a colleague also copies the extras she picked up over the years, here “${ENTITLEMENTS[extra].name}”.`,
      op: { op: 'none' },
    },
    ...grantSteps([...expectedAccess(who.type, dept), extra], 14 * D + 5 * H + 11, 'Copied from colleague.'),
    ...(who.type === 'employee'
      ? [{ system: 'm365' as const, kind: 'add' as const, at: 14 * D + 6 * H, label: 'Mailbox created', op: { op: 'mailbox', value: 'user' } as Op }]
      : []),
    {
      system: 'iga', kind: 'warn', at: 16 * D,
      label: `${role.role} apps finally work on day three`,
      detail: 'Each app had its own ticket and its own admin.',
      op: { op: 'none' },
    },
  ]
}

function moverAuto(dept: Department, who: Identity, p: Persona): Step[] {
  const from = who.department!
  const oldRole = DEPARTMENT_ROLE[from]
  const newRole = DEPARTMENT_ROLE[dept]
  const toRemove = who.entitlements.filter((e) => !expectedAccess(who.type, dept).includes(e))
  const toAdd = expectedAccess(who.type, dept).filter((e) => !who.entitlements.includes(e))
  return [
    { system: 'hr', kind: 'event', at: 0, label: `HR records transfer ${from} → ${dept}`, detail: `New title: ${p.title[dept]}.`, op: { op: 'dept', dept, title: p.title[dept] } },
    {
      system: 'iga', kind: 'decide', at: 5,
      label: 'IGA notices the department attribute changed',
      detail: `Recalculates roles: ${oldRole.role} no longer matches, ${newRole.role} now does.`,
      op: { op: 'none' },
    },
    ...revokeSteps(toRemove, 6, `No longer covered by any role. Least privilege means it goes.`),
    ...grantSteps(toAdd, 10, `Comes from ${newRole.role}.`),
    {
      system: 'iga', kind: 'notify', at: 12,
      label: 'Micro-certification sent to new manager',
      detail: 'The new manager confirms within 7 days that the access fits the new job.',
      op: { op: 'none' },
    },
  ]
}

function moverManual(dept: Department, who: Identity, p: Persona): Step[] {
  const from = who.department!
  const toAdd = expectedAccess(who.type, dept).filter((e) => !who.entitlements.includes(e))
  return [
    { system: 'hr', kind: 'event', at: 0, label: `HR records transfer ${from} → ${dept}`, detail: `New title: ${p.title[dept]}.`, op: { op: 'dept', dept, title: p.title[dept] } },
    { system: 'iga', kind: 'wait', at: 2 * D, label: 'New manager emails IT: “Please give access like the rest of the team”', op: { op: 'none' } },
    ...grantSteps(toAdd, 3 * D, 'Requested by email.'),
    {
      system: 'iga', kind: 'warn', at: 3 * D + 1,
      label: `Nobody asks to remove the ${from} access`,
      detail: 'The old manager has moved on, and the new manager doesn’t know what is there. This is privilege creep.',
      op: { op: 'none' },
    },
  ]
}

function leaverAuto(who: Identity): Step[] {
  const accountSystems = Object.keys(who.accounts) as SystemId[]
  const appAccounts = accountSystems.filter((s) => s !== 'entra')
  return [
    { system: 'hr', kind: 'event', at: 0, label: 'Termination effective today, 16:00', op: { op: 'status', status: 'terminated' } },
    { system: 'iga', kind: 'decide', at: 1, label: 'IGA starts the leaver workflow', detail: 'Order matters: lock first, then clean up.', op: { op: 'none' } },
    { system: 'entra', kind: 'remove', at: 1, label: 'Disable account', detail: 'Block sign-in. Disabled, not deleted, so it can be restored and audited.', op: { op: 'account', system: 'entra', enabled: false } },
    {
      system: 'entra', kind: 'remove', at: 2,
      label: 'Revoke all sessions and refresh tokens',
      detail: 'A disabled account can still have valid tokens on a phone for up to an hour. Revoking kills them now.',
      op: { op: 'sessions', value: false },
    },
    ...appAccounts.map((s, i) => ({
      system: s, kind: 'remove' as const, at: 3 + i,
      label: 'Deactivate app account (SCIM active=false)',
      op: { op: 'account', system: s, enabled: false } as Op,
    })),
    ...revokeSteps(who.entitlements.filter((e) => e !== 'entra-account' && ENTITLEMENTS[e].system !== 'm365'), 6, 'Remove all group memberships and roles.'),
    ...(who.mailbox === 'user'
      ? [{
          system: 'm365' as const, kind: 'remove' as const, at: 8,
          label: 'Convert mailbox to shared, delegate to manager',
          detail: 'Keeps business email. Frees the licence.',
          op: { op: 'mailbox', value: 'shared' } as Op,
        }]
      : []),
    ...revokeSteps(who.entitlements.filter((e) => ENTITLEMENTS[e].system === 'm365'), 9, 'Licence back in the pool.'),
    { system: 'iga', kind: 'notify', at: 10, label: 'Manager gets checklist: collect laptop and badge', op: { op: 'none' } },
    { system: 'iga', kind: 'wait', at: 30 * D, label: 'Day 30: account deleted per retention policy', op: { op: 'revoke', ent: 'entra-account' } },
  ]
}

function leaverManual(who: Identity): Step[] {
  return [
    { system: 'hr', kind: 'event', at: 0, label: 'Termination effective today, 16:00', op: { op: 'status', status: 'terminated' } },
    {
      system: 'hr', kind: 'wait', at: 9 * D,
      label: 'IT hears about it nine days later',
      detail: 'For nine days a former employee could still log in.',
      op: { op: 'none' },
    },
    { system: 'entra', kind: 'remove', at: 9 * D + 1, label: 'Admin disables the AD account', op: { op: 'account', system: 'entra', enabled: false } },
    {
      system: 'iga', kind: 'warn', at: 9 * D + 2,
      label: 'Sessions not revoked',
      detail: 'The phone app keeps working until the token expires.',
      op: { op: 'none' },
    },
    {
      system: 'iga', kind: 'warn', at: 9 * D + 3,
      label: 'SaaS apps not on the checklist',
      detail: `${Object.keys(who.accounts).filter((s) => s !== 'entra').length} app account(s) with their own logins stay active. These are orphan accounts.`,
      op: { op: 'none' },
    },
    { system: 'm365', kind: 'warn', at: 9 * D + 4, label: 'Licence still assigned', detail: 'Fjordtech keeps paying for it.', op: { op: 'none' } },
  ]
}

export function applyStep(who: Identity, step: Step): Identity {
  const op = step.op
  switch (op.op) {
    case 'status':
      return { ...who, status: op.status }
    case 'dept':
      return { ...who, department: op.dept, title: op.title }
    case 'grant': {
      if (who.entitlements.includes(op.ent)) return who
      const sys = ENTITLEMENTS[op.ent].system
      const accounts = who.accounts[sys] ? who.accounts : { ...who.accounts, [sys]: { enabled: sys === 'entra' ? (who.accounts.entra?.enabled ?? false) : true, sessions: false } }
      return { ...who, entitlements: [...who.entitlements, op.ent], accounts }
    }
    case 'revoke': {
      const entitlements = who.entitlements.filter((e) => e !== op.ent)
      const sys = ENTITLEMENTS[op.ent].system
      const stillUsed = entitlements.some((e) => ENTITLEMENTS[e].system === sys)
      const accounts = { ...who.accounts }
      // An account with no entitlements left is removed, except the primary directory account.
      if (!stillUsed && (sys !== 'entra' || op.ent === 'entra-account')) delete accounts[sys]
      return { ...who, entitlements, accounts }
    }
    case 'account': {
      const prev = who.accounts[op.system] ?? { enabled: false, sessions: false }
      return { ...who, accounts: { ...who.accounts, [op.system]: { enabled: op.enabled, sessions: op.enabled ? true : prev.sessions } } }
    }
    case 'sessions': {
      const accounts = Object.fromEntries(
        Object.entries(who.accounts).map(([k, v]) => [k, { ...v!, sessions: op.value }]),
      ) as Identity['accounts']
      return { ...who, accounts }
    }
    case 'mailbox':
      return { ...who, mailbox: op.value }
    case 'none':
      return who
  }
}

export function runAll(who: Identity, steps: Step[]): Identity {
  return steps.reduce(applyStep, who)
}

export interface Finding {
  severity: 'high' | 'medium'
  title: string
  detail: string
}

/** Compare what someone holds against policy, the way an auditor would. */
export function findings(who: Identity): Finding[] {
  const out: Finding[] = []
  if (who.status === 'terminated') {
    for (const [sys, acc] of Object.entries(who.accounts)) {
      if (acc?.enabled) out.push({ severity: 'high', title: `Orphan account in ${sys.toUpperCase()}`, detail: 'Enabled account belonging to someone who has left.' })
    }
    if (Object.values(who.accounts).some((a) => a?.sessions)) {
      out.push({ severity: 'high', title: 'Live sessions after termination', detail: 'Tokens were never revoked.' })
    }
    const paid = who.entitlements.filter((e) => ENTITLEMENTS[e].system === 'm365')
    if (paid.length) out.push({ severity: 'medium', title: 'Licence still assigned', detail: 'Paying for a user who left.' })
    return out
  }
  if (who.status === 'none') return out
  const expected = new Set(expectedAccess(who.type, who.department))
  for (const e of who.entitlements) {
    if (!expected.has(e)) {
      out.push({
        severity: ENTITLEMENTS[e].risk === 'high' ? 'high' : 'medium',
        title: `Excess access: ${ENTITLEMENTS[e].name}`,
        detail: 'Not covered by any role for the current job.',
      })
    }
  }
  for (const r of sodConflicts(who.entitlements)) {
    out.push({ severity: 'high', title: `SoD conflict ${r.id}`, detail: r.why })
  }
  return out
}

export function formatElapsed(min: number): string {
  if (min < 60) return `+${min} min`
  if (min < D) return `+${Math.round(min / H)} h`
  const d = Math.floor(min / D)
  const h = Math.round((min % D) / H)
  return h ? `+${d} d ${h} h` : `+${d} d`
}
