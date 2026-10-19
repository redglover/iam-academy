// PIM: Fjordtech's privileged roles, role settings, people and assignments.

export type RoleId = 'ga' | 'pra' | 'ua' | 'helpdesk' | 'azure-owners' | 'sec-reader'
export type Method = 'authenticator' | 'fido2'

export interface Role {
  id: RoleId
  name: string
  tier: 0 | 1 | 2
  kind: 'Entra role' | 'PIM for Groups'
  can: string
}

export interface RoleSettings {
  maxHours: number
  mfa: 'mfa' | 'phishing-resistant'
  requireJustification: boolean
  requireTicket: boolean
  requireApproval: boolean
  approvers: string[]
  eligibleExpiryDays: number | null
}

export interface Person {
  id: string
  name: string
  emoji: string
  title: string
  methods: Method[]
  kind: 'human' | 'breakglass' | 'service' | 'leaver'
}

export interface Assignment {
  id: string
  principal: string
  role: RoleId
  type: 'eligible' | 'active'
  /** Minutes on the simulated clock, or null for permanent. */
  end: number | null
  requestId?: string
}

export const ROLES: Record<RoleId, Role> = {
  ga: { id: 'ga', name: 'Global Administrator', tier: 0, kind: 'Entra role', can: 'Everything in the tenant, including changing other admins and Conditional Access.' },
  pra: { id: 'pra', name: 'Privileged Role Administrator', tier: 0, kind: 'Entra role', can: 'Assign any role to anyone, including Global Administrator.' },
  'azure-owners': { id: 'azure-owners', name: 'PIM-Azure-Prod-Owners (group)', tier: 0, kind: 'PIM for Groups', can: 'Owner on the production Azure subscription: delete or reconfigure every resource.' },
  ua: { id: 'ua', name: 'User Administrator', tier: 1, kind: 'Entra role', can: 'Create, edit and delete users and groups, and reset passwords for non-admins.' },
  helpdesk: { id: 'helpdesk', name: 'Helpdesk Administrator', tier: 1, kind: 'Entra role', can: 'Reset passwords and MFA for non-admin users.' },
  'sec-reader': { id: 'sec-reader', name: 'Security Reader', tier: 2, kind: 'Entra role', can: 'Read security reports and sign-in logs. No changes.' },
}

export const PEOPLE: Person[] = [
  { id: 'erik', name: 'Erik Dahl', emoji: '🧑‍🔧', title: 'IAM engineer', methods: ['authenticator', 'fido2'], kind: 'human' },
  { id: 'nora', name: 'Nora Bakke', emoji: '🎧', title: 'Service desk', methods: ['authenticator'], kind: 'human' },
  { id: 'marte', name: 'Marte Lie', emoji: '👩‍⚖️', title: 'Head of IT security (approver)', methods: ['authenticator', 'fido2'], kind: 'human' },
  { id: 'kari', name: 'Kari Lunde', emoji: '👩‍💼', title: 'Security analyst', methods: ['authenticator'], kind: 'human' },
  { id: 'bg-01', name: 'BG-01', emoji: '🧯', title: 'Break-glass account', methods: ['fido2'], kind: 'breakglass' },
  { id: 'bg-02', name: 'BG-02', emoji: '🧯', title: 'Break-glass account', methods: ['fido2'], kind: 'breakglass' },
  { id: 'tom', name: 'Tom Vik', emoji: '🧳', title: 'Former consultant (contract ended in March)', methods: ['authenticator'], kind: 'leaver' },
  { id: 'svc-sync', name: 'svc-legacy-sync', emoji: '⚙️', title: 'Old service account from a 2019 migration', methods: [], kind: 'service' },
]

export const person = (id: string) => PEOPLE.find((p) => p.id === id)!

export const GOOD_SETTINGS: Record<RoleId, RoleSettings> = {
  ga: { maxHours: 4, mfa: 'phishing-resistant', requireJustification: true, requireTicket: true, requireApproval: true, approvers: ['marte'], eligibleExpiryDays: 180 },
  pra: { maxHours: 4, mfa: 'phishing-resistant', requireJustification: true, requireTicket: true, requireApproval: true, approvers: ['marte'], eligibleExpiryDays: 180 },
  'azure-owners': { maxHours: 4, mfa: 'phishing-resistant', requireJustification: true, requireTicket: true, requireApproval: true, approvers: ['marte'], eligibleExpiryDays: 180 },
  ua: { maxHours: 8, mfa: 'mfa', requireJustification: true, requireTicket: false, requireApproval: false, approvers: [], eligibleExpiryDays: 365 },
  helpdesk: { maxHours: 8, mfa: 'mfa', requireJustification: true, requireTicket: false, requireApproval: false, approvers: [], eligibleExpiryDays: 365 },
  'sec-reader': { maxHours: 8, mfa: 'mfa', requireJustification: false, requireTicket: false, requireApproval: false, approvers: [], eligibleExpiryDays: null },
}

const DAY = 24 * 60

/** The well-run tenant used in the activation tab: everyone is eligible, nobody is standing admin. */
export const ACTIVATION_ASSIGNMENTS: Assignment[] = [
  { id: 'e1', principal: 'erik', role: 'ga', type: 'eligible', end: 180 * DAY },
  { id: 'e2', principal: 'erik', role: 'azure-owners', type: 'eligible', end: 180 * DAY },
  { id: 'e3', principal: 'nora', role: 'helpdesk', type: 'eligible', end: 365 * DAY },
  { id: 'e4', principal: 'nora', role: 'ua', type: 'eligible', end: 365 * DAY },
  { id: 'e5', principal: 'nora', role: 'azure-owners', type: 'eligible', end: 30 * DAY },
  { id: 'e6', principal: 'marte', role: 'pra', type: 'eligible', end: 180 * DAY },
  { id: 'e7', principal: 'bg-01', role: 'ga', type: 'active', end: null },
  { id: 'e8', principal: 'bg-02', role: 'ga', type: 'active', end: null },
]

/** The messy tenant for the clean-up tab. */
export const MESSY_ASSIGNMENTS: Assignment[] = [
  { id: 'a1', principal: 'bg-01', role: 'ga', type: 'active', end: null },
  { id: 'a2', principal: 'bg-02', role: 'ga', type: 'active', end: null },
  { id: 'a3', principal: 'erik', role: 'ga', type: 'active', end: null },
  { id: 'a4', principal: 'tom', role: 'ga', type: 'active', end: null },
  { id: 'a5', principal: 'svc-sync', role: 'ga', type: 'active', end: null },
  { id: 'a6', principal: 'marte', role: 'pra', type: 'active', end: null },
  { id: 'a7', principal: 'nora', role: 'ua', type: 'active', end: null },
  { id: 'a8', principal: 'kari', role: 'sec-reader', type: 'active', end: null },
]

export const MESSY_GA_SETTINGS: RoleSettings = { maxHours: 24, mfa: 'mfa', requireJustification: false, requireTicket: false, requireApproval: false, approvers: [], eligibleExpiryDays: null }

export const formatClock = (min: number) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const total = 9 * 60 + min
  const d = Math.floor(total / DAY)
  const h = Math.floor((total % DAY) / 60)
  const m = total % 60
  return `${d < 7 ? days[d] : `Day ${d + 1}`} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
