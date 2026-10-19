// PIM activation workflow and standing-access audit. Pure functions over plain state.
import { ROLES, person, type Assignment, type Method, type RoleId, type RoleSettings } from './model'

export type RequestStatus = 'pending' | 'denied' | 'active' | 'expired' | 'deactivated'

export interface ActivationRequest {
  id: string
  principal: string
  role: RoleId
  hours: number
  justification: string
  ticket: string
  status: RequestStatus
  createdAt: number
  approver?: string
}

export interface LogEntry {
  at: number
  actor: string
  text: string
  kind: 'request' | 'approve' | 'deny' | 'activate' | 'expire' | 'deactivate' | 'error'
}

export interface PimState {
  now: number
  assignments: Assignment[]
  settings: Record<RoleId, RoleSettings>
  requests: ActivationRequest[]
  log: LogEntry[]
}

export interface ActivationInput {
  principal: string
  role: RoleId
  hours: number
  justification: string
  ticket: string
  method: Method
}

export type Result = { ok: true; message: string } | { ok: false; errors: string[] }

let seq = 0
const nextId = () => `req-${++seq}`

export const activeUntil = (s: PimState, principal: string, role: RoleId): number | null => {
  const a = s.assignments.find((x) => x.principal === principal && x.role === role && x.type === 'active' && (x.end === null || x.end > s.now))
  return a ? (a.end ?? Infinity) : null
}

export function validateActivation(s: PimState, input: ActivationInput): string[] {
  const set = s.settings[input.role]
  const role = ROLES[input.role]
  const who = person(input.principal)
  const errors: string[] = []
  const eligible = s.assignments.find((a) => a.principal === input.principal && a.role === input.role && a.type === 'eligible')
  if (!eligible) errors.push(`${who.name} isn’t eligible for ${role.name}.`)
  else if (eligible.end !== null && eligible.end <= s.now) errors.push(`${who.name}’s eligibility for ${role.name} has expired. Ask for it to be renewed.`)
  if (activeUntil(s, input.principal, input.role) !== null) errors.push(`${role.name} is already active.`)
  if (s.requests.some((r) => r.principal === input.principal && r.role === input.role && r.status === 'pending')) errors.push('There is already a pending request for this role.')
  if (input.hours > set.maxHours) errors.push(`Maximum activation for ${role.name} is ${set.maxHours} h. You asked for ${input.hours} h.`)
  if (input.hours <= 0) errors.push('Choose a duration.')
  if (set.requireJustification && !input.justification.trim()) errors.push('A justification is required.')
  if (set.requireTicket && !input.ticket.trim()) errors.push('A ticket number is required.')
  if (!who.methods.includes(input.method)) errors.push(`${who.name} has no ${input.method === 'fido2' ? 'FIDO2 security key' : 'Authenticator app'} registered.`)
  else if (set.mfa === 'phishing-resistant' && input.method !== 'fido2')
    errors.push('This role requires the Conditional Access authentication context “Phishing-resistant MFA”. Authenticator push doesn’t qualify. Use a FIDO2 key, passkey or Windows Hello.')
  if (set.requireApproval && set.approvers.length === 0) errors.push('This role requires approval but has no approvers configured. Fix the role settings.')
  return errors
}

function activate(s: PimState, req: ActivationRequest): PimState {
  const end = s.now + req.hours * 60
  return {
    ...s,
    assignments: [...s.assignments, { id: `act-${req.id}`, principal: req.principal, role: req.role, type: 'active', end, requestId: req.id }],
    requests: s.requests.map((r) => (r.id === req.id ? { ...r, status: 'active' as const } : r)),
  }
}

export function requestActivation(s: PimState, input: ActivationInput): { state: PimState; result: Result } {
  const who = person(input.principal)
  const role = ROLES[input.role]
  const errors = validateActivation(s, input)
  if (errors.length) {
    return { state: { ...s, log: [...s.log, { at: s.now, actor: who.name, kind: 'error', text: `Activation of ${role.name} rejected: ${errors[0]}` }] }, result: { ok: false, errors } }
  }
  const set = s.settings[input.role]
  const req: ActivationRequest = { id: nextId(), principal: input.principal, role: input.role, hours: input.hours, justification: input.justification, ticket: input.ticket, status: 'pending', createdAt: s.now }
  let next: PimState = {
    ...s,
    requests: [...s.requests, req],
    log: [
      ...s.log,
      {
        at: s.now,
        actor: who.name,
        kind: 'request',
        text: `Requested ${role.name} for ${input.hours} h. MFA: ${input.method === 'fido2' ? 'FIDO2 key' : 'Authenticator'}.${input.justification ? ` Justification: “${input.justification}”.` : ''}${input.ticket ? ` Ticket ${input.ticket}.` : ''}`,
      },
    ],
  }
  if (set.requireApproval) {
    const names = set.approvers.map((a) => person(a).name).join(', ')
    next = { ...next, log: [...next.log, { at: s.now, actor: 'PIM', kind: 'request', text: `Approval required. Email sent to ${names}.` }] }
    return { state: next, result: { ok: true, message: `Pending approval from ${names}.` } }
  }
  next = activate(next, req)
  next = { ...next, log: [...next.log, { at: s.now, actor: 'PIM', kind: 'activate', text: `${role.name} active for ${who.name} for ${input.hours} h.` }] }
  return { state: next, result: { ok: true, message: `${role.name} is active for ${input.hours} h.` } }
}

export function approve(s: PimState, requestId: string, approver: string): { state: PimState; result: Result } {
  const req = s.requests.find((r) => r.id === requestId)
  if (!req || req.status !== 'pending') return { state: s, result: { ok: false, errors: ['No pending request with that id.'] } }
  const set = s.settings[req.role]
  if (approver === req.principal) return { state: s, result: { ok: false, errors: ['You can’t approve your own activation, even if you are an approver.'] } }
  if (!set.approvers.includes(approver)) return { state: s, result: { ok: false, errors: [`${person(approver).name} isn’t an approver for ${ROLES[req.role].name}.`] } }
  let next: PimState = { ...s, requests: s.requests.map((r) => (r.id === requestId ? { ...r, approver } : r)) }
  next = activate(next, { ...req, approver })
  next = {
    ...next,
    log: [
      ...next.log,
      { at: s.now, actor: person(approver).name, kind: 'approve', text: `Approved ${person(req.principal).name}’s request for ${ROLES[req.role].name}.` },
      { at: s.now, actor: 'PIM', kind: 'activate', text: `${ROLES[req.role].name} active for ${person(req.principal).name} for ${req.hours} h.` },
    ],
  }
  return { state: next, result: { ok: true, message: 'Approved. The role is active.' } }
}

export function deny(s: PimState, requestId: string, approver: string, reason = ''): { state: PimState; result: Result } {
  const req = s.requests.find((r) => r.id === requestId)
  if (!req || req.status !== 'pending') return { state: s, result: { ok: false, errors: ['No pending request with that id.'] } }
  if (!s.settings[req.role].approvers.includes(approver) || approver === req.principal) return { state: s, result: { ok: false, errors: ['Only another approver can deny this request.'] } }
  return {
    state: {
      ...s,
      requests: s.requests.map((r) => (r.id === requestId ? { ...r, status: 'denied' as const, approver } : r)),
      log: [...s.log, { at: s.now, actor: person(approver).name, kind: 'deny', text: `Denied ${person(req.principal).name}’s request for ${ROLES[req.role].name}.${reason ? ` “${reason}”` : ''}` }],
    },
    result: { ok: true, message: 'Denied.' },
  }
}

export function advanceClock(s: PimState, minutes: number): PimState {
  const now = s.now + minutes
  const expiring = s.assignments.filter((a) => a.type === 'active' && a.requestId && a.end !== null && a.end <= now)
  return {
    ...s,
    now,
    assignments: s.assignments.filter((a) => !expiring.includes(a)),
    requests: s.requests.map((r) => (expiring.some((a) => a.requestId === r.id) ? { ...r, status: 'expired' as const } : r)),
    log: [...s.log, ...expiring.map((a) => ({ at: a.end!, actor: 'PIM', kind: 'expire' as const, text: `${ROLES[a.role].name} expired for ${person(a.principal).name}. Back to no standing access.` }))],
  }
}

export function deactivate(s: PimState, requestId: string): PimState {
  const a = s.assignments.find((x) => x.requestId === requestId)
  if (!a) return s
  return {
    ...s,
    assignments: s.assignments.filter((x) => x !== a),
    requests: s.requests.map((r) => (r.id === requestId ? { ...r, status: 'deactivated' as const } : r)),
    log: [...s.log, { at: s.now, actor: person(a.principal).name, kind: 'deactivate', text: `Deactivated ${ROLES[a.role].name} early. Done with the task.` }],
  }
}

// ── Standing-access clean-up ─────────────────────────────────────────────

export type Decision = 'keep' | 'eligible' | 'remove'

export interface Finding {
  severity: 'high' | 'medium'
  text: string
}

const DAY = 24 * 60

export function applyDecisions(assignments: Assignment[], decisions: Record<string, Decision>, expiryDays = 180): Assignment[] {
  return assignments.flatMap((a) => {
    const d = decisions[a.id] ?? 'keep'
    if (d === 'remove') return []
    if (d === 'eligible') return [{ ...a, type: 'eligible' as const, end: expiryDays * DAY }]
    return [a]
  })
}

export function auditTenant(assignments: Assignment[], ga: RoleSettings): Finding[] {
  const out: Finding[] = []
  const permanentBg = assignments.filter((a) => a.role === 'ga' && a.type === 'active' && a.end === null && person(a.principal).kind === 'breakglass')
  if (permanentBg.length < 2)
    out.push({ severity: 'high', text: `Only ${permanentBg.length} break-glass account(s) are permanent Global Admins. Keep two, permanently active and excluded from Conditional Access: PIM itself depends on being able to sign in.` })

  for (const a of assignments) {
    const p = person(a.principal)
    const role = ROLES[a.role]
    if (p.kind === 'breakglass') {
      if (a.type === 'eligible') out.push({ severity: 'high', text: `${p.name} is only eligible. A break-glass account can’t depend on PIM activation in an emergency.` })
      continue
    }
    if (p.kind === 'leaver') {
      out.push({ severity: 'high', text: `${p.name} left Fjordtech but still holds ${role.name} (${a.type}). Remove it, and disable the account.` })
      continue
    }
    if (p.kind === 'service') {
      out.push({ severity: 'high', text: `${p.name} holds ${role.name}. A service account can’t do MFA or activate roles. Remove it and give the workload a scoped role or a managed identity.` })
      continue
    }
    if (a.type === 'active' && a.end === null && role.tier === 0) out.push({ severity: 'high', text: `${p.name} has standing (permanent active) ${role.name}. Make it eligible.` })
    else if (a.type === 'active' && a.end === null && role.tier === 1) out.push({ severity: 'medium', text: `${p.name} has standing ${role.name}. Tier-1 roles should be eligible too.` })
    if (a.type === 'eligible' && a.end === null && role.tier === 0) out.push({ severity: 'medium', text: `${p.name}’s eligibility for ${role.name} never expires. Time-bound eligibility forces a re-justification.` })
  }

  if (ga.maxHours > 8) out.push({ severity: 'high', text: `Global Administrator can be activated for ${ga.maxHours} h. That’s standing access in disguise. Use 4 h or less.` })
  else if (ga.maxHours > 4) out.push({ severity: 'medium', text: `Global Administrator activation of ${ga.maxHours} h is long. Most tasks fit in 1–4 h.` })
  if (ga.mfa !== 'phishing-resistant') out.push({ severity: 'high', text: 'Global Administrator activation accepts any MFA. Require phishing-resistant MFA through an authentication context.' })
  if (!ga.requireApproval) out.push({ severity: 'high', text: 'Global Administrator activation needs no approval. A stolen eligible account becomes Global Admin in a minute.' })
  else if (ga.approvers.length === 0) out.push({ severity: 'high', text: 'Approval is required for Global Administrator, but no approvers are set.' })
  if (!ga.requireJustification) out.push({ severity: 'medium', text: 'No justification is required for Global Administrator. The audit log won’t say why anyone was admin.' })
  if (!ga.requireTicket) out.push({ severity: 'medium', text: 'No ticket number is required for Global Administrator. Tie every activation to a change or incident.' })
  return out
}

export const auditScore = (f: Finding[]) => Math.max(0, 100 - f.filter((x) => x.severity === 'high').length * 15 - f.filter((x) => x.severity === 'medium').length * 5)
