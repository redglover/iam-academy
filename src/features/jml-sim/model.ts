// The fictional company "Fjordtech AS" used across every lab.

export type SystemId = 'hr' | 'iga' | 'entra' | 'm365' | 'crm' | 'erp' | 'git' | 'vpn' | 'hris'

export interface SystemInfo {
  id: SystemId
  name: string
  short: string
  blurb: string
}

export const SYSTEMS: Record<SystemId, SystemInfo> = {
  hr: { id: 'hr', name: 'HR system (Workday)', short: 'HR', blurb: 'Authoritative source. HR says who works here, in what job, from when to when.' },
  iga: { id: 'iga', name: 'IGA engine (SailPoint / Omada)', short: 'IGA', blurb: 'The brain. Turns HR facts into access decisions using roles, policies and workflows.' },
  entra: { id: 'entra', name: 'Entra ID + AD', short: 'Entra', blurb: 'The primary directory. One account per person, groups drive app access.' },
  m365: { id: 'm365', name: 'Microsoft 365', short: 'M365', blurb: 'Licence, mailbox, Teams, OneDrive.' },
  crm: { id: 'crm', name: 'Salesforce', short: 'CRM', blurb: 'Customer data. Provisioned with SCIM.' },
  erp: { id: 'erp', name: 'Visma ERP', short: 'ERP', blurb: 'Invoices and payments. Sensitive. SoD rules apply.' },
  git: { id: 'git', name: 'GitHub Enterprise', short: 'GitHub', blurb: 'Source code. Provisioned with SCIM via an Entra enterprise app.' },
  vpn: { id: 'vpn', name: 'VPN / ZTNA', short: 'VPN', blurb: 'Remote network access.' },
  hris: { id: 'hris', name: 'HR self-service', short: 'HRIS', blurb: 'Employee data. Personal data under GDPR.' },
}

export type Department = 'Sales' | 'Finance' | 'Engineering' | 'People'
export const DEPARTMENTS: Department[] = ['Sales', 'Finance', 'Engineering', 'People']

export type WorkerType = 'employee' | 'contractor'

export interface Entitlement {
  id: string
  system: SystemId
  name: string
  risk: 'low' | 'medium' | 'high'
}

export const ENTITLEMENTS: Record<string, Entitlement> = {
  'entra-account': { id: 'entra-account', system: 'entra', name: 'User account', risk: 'low' },
  'm365-e3': { id: 'm365-e3', system: 'm365', name: 'M365 E3 licence + mailbox', risk: 'low' },
  'm365-f1': { id: 'm365-f1', system: 'm365', name: 'M365 F1 licence (no mailbox)', risk: 'low' },
  'vpn-user': { id: 'vpn-user', system: 'vpn', name: 'VPN user', risk: 'medium' },
  'hris-self': { id: 'hris-self', system: 'hris', name: 'Own profile', risk: 'low' },
  'crm-sales': { id: 'crm-sales', system: 'crm', name: 'Sales user', risk: 'medium' },
  'crm-export': { id: 'crm-export', system: 'crm', name: 'Bulk export customers', risk: 'high' },
  'erp-ap-clerk': { id: 'erp-ap-clerk', system: 'erp', name: 'Register supplier invoices', risk: 'medium' },
  'erp-vendor-create': { id: 'erp-vendor-create', system: 'erp', name: 'Create / edit vendors', risk: 'high' },
  'erp-pay-approve': { id: 'erp-pay-approve', system: 'erp', name: 'Approve payments', risk: 'high' },
  'git-member': { id: 'git-member', system: 'git', name: 'Org member', risk: 'medium' },
  'git-prod-deploy': { id: 'git-prod-deploy', system: 'git', name: 'Production deploy', risk: 'high' },
  'hris-hr-admin': { id: 'hris-hr-admin', system: 'hris', name: 'HR admin (all employees)', risk: 'high' },
}

/** Birthright access: everyone of a worker type gets it on day one, no request needed. */
export const BIRTHRIGHT: Record<WorkerType, string[]> = {
  employee: ['entra-account', 'm365-e3', 'vpn-user', 'hris-self'],
  contractor: ['entra-account', 'm365-f1', 'vpn-user'],
}

/** Business roles: the department decides the bundle. */
export const DEPARTMENT_ROLE: Record<Department, { role: string; entitlements: string[] }> = {
  Sales: { role: 'BR-Sales-Rep', entitlements: ['crm-sales'] },
  Finance: { role: 'BR-Finance-AP', entitlements: ['erp-ap-clerk'] },
  Engineering: { role: 'BR-Engineer', entitlements: ['git-member'] },
  People: { role: 'BR-People-Partner', entitlements: ['hris-hr-admin'] },
}

export type IdentityStatus = 'none' | 'pre-hire' | 'active' | 'terminated'

export interface AccountState {
  enabled: boolean
  sessions: boolean
}

export interface Identity {
  name: string
  emoji: string
  employeeId: string
  upn: string
  type: WorkerType
  department: Department | null
  title: string
  manager: string
  status: IdentityStatus
  /** Every entitlement the person actually holds right now. */
  entitlements: string[]
  /** Accounts in target systems that exist (enabled or not). */
  accounts: Partial<Record<SystemId, AccountState>>
  mailbox: 'none' | 'user' | 'shared'
}

export interface Persona {
  key: string
  name: string
  emoji: string
  employeeId: string
  type: WorkerType
  title: Record<Department, string>
  manager: string
}

export const PERSONAS: Persona[] = [
  {
    key: 'ingrid',
    name: 'Ingrid Haugen',
    emoji: '🧑‍💻',
    employeeId: 'E10421',
    type: 'employee',
    title: { Sales: 'Account Executive', Finance: 'Accounts Payable Specialist', Engineering: 'Backend Developer', People: 'HR Business Partner' },
    manager: 'Lars Berg',
  },
  {
    key: 'ola',
    name: 'Ola Nordmann',
    emoji: '🧔',
    employeeId: 'E10388',
    type: 'employee',
    title: { Sales: 'Key Account Manager', Finance: 'Financial Controller', Engineering: 'Platform Engineer', People: 'Recruiter' },
    manager: 'Marte Lie',
  },
  {
    key: 'sanjay',
    name: 'Sanjay Rao',
    emoji: '🧑‍🔧',
    employeeId: 'C20077',
    type: 'contractor',
    title: { Sales: 'Sales Consultant', Finance: 'ERP Consultant', Engineering: 'DevOps Consultant', People: 'HR Consultant' },
    manager: 'Lars Berg',
  },
]

export function makeUpn(name: string): string {
  const ascii = name
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  return ascii.split(/\s+/).join('.') + '@fjordtech.no'
}

export function emptyIdentity(p: Persona): Identity {
  return {
    name: p.name,
    emoji: p.emoji,
    employeeId: p.employeeId,
    upn: makeUpn(p.name),
    type: p.type,
    department: null,
    title: '—',
    manager: p.manager,
    status: 'none',
    entitlements: [],
    accounts: {},
    mailbox: 'none',
  }
}

/** What a person in this position *should* have according to policy. */
export function expectedAccess(type: WorkerType, dept: Department | null): string[] {
  if (!dept) return []
  return [...BIRTHRIGHT[type], ...DEPARTMENT_ROLE[dept].entitlements]
}
