// Conditional Access: Fjordtech's users, apps, sign-in signals and baseline policy set.

export type Method = 'password' | 'authenticator' | 'fido2'
export type AppId = 'office365' | 'azure' | 'salesforce' | 'visma'
export type Platform = 'windows' | 'macos' | 'ios' | 'android' | 'linux'
export type LocationId = 'office' | 'home' | 'abroad' | 'blocked'
export type Client = 'browser' | 'modern' | 'legacy' | 'device-code'
export type Risk = 'none' | 'low' | 'medium' | 'high'
export type Control = 'mfa' | 'phish-mfa' | 'compliant' | 'app-protection' | 'password-change'

export interface CaUser {
  id: string
  name: string
  emoji: string
  role: string
  tags: string[]
  methods: Method[]
}

export interface Device {
  id: string
  label: string
  platform: Platform
  compliant: boolean
  appProtection: boolean
}

export interface SignIn {
  user: string
  app: AppId
  device: string
  location: LocationId
  client: Client
  signInRisk: Risk
  userRisk: Risk
}

export interface Policy {
  id: string
  name: string
  state: 'on' | 'report' | 'off'
  include: string[]
  exclude: string[]
  apps: 'all' | AppId[]
  conditions: {
    clients?: Client[]
    platforms?: Platform[]
    locations?: 'any' | 'untrusted' | 'blocked'
    signInRisk?: Risk[]
    userRisk?: Risk[]
  }
  grant: { block: true } | { block: false; require: Control[]; operator: 'AND' | 'OR' }
}

export const USERS: CaUser[] = [
  { id: 'ingrid', name: 'Ingrid Haugen', emoji: '🧑‍💻', role: 'Sales', tags: ['all-users', 'member', 'grp:sales'], methods: ['password', 'authenticator'] },
  { id: 'kari', name: 'Kari Lunde', emoji: '👩‍💼', role: 'Finance (AP)', tags: ['all-users', 'member', 'grp:finance'], methods: ['password', 'authenticator'] },
  { id: 'erik', name: 'Erik Dahl', emoji: '🧑‍🔧', role: 'Global Administrator', tags: ['all-users', 'member', 'role:admin'], methods: ['password', 'authenticator', 'fido2'] },
  { id: 'guest', name: 'Pia (partner, guest)', emoji: '🧳', role: 'Guest from consulting firm', tags: ['all-users', 'guest'], methods: ['password', 'authenticator'] },
  { id: 'svc', name: 'svc-scanner', emoji: '🖨️', role: 'Service account (scan-to-email)', tags: ['all-users', 'member', 'grp:service-accounts'], methods: ['password'] },
  { id: 'bg', name: 'BG-01 break-glass', emoji: '🧯', role: 'Emergency access', tags: ['all-users', 'member', 'grp:breakglass'], methods: ['password', 'fido2'] },
]

export const TAG_LABELS: Record<string, string> = {
  'all-users': 'All users',
  member: 'Members',
  guest: 'Guests',
  'grp:sales': 'Sales group',
  'grp:finance': 'Finance group',
  'role:admin': 'Admin roles',
  'grp:service-accounts': 'Service accounts',
  'grp:breakglass': 'Break-glass accounts',
}

export const APPS: Record<AppId, string> = {
  office365: 'Office 365',
  azure: 'Azure & admin portals',
  salesforce: 'Salesforce',
  visma: 'Visma ERP',
}

export const DEVICES: Device[] = [
  { id: 'corp-laptop', label: 'Fjordtech laptop (Intune-compliant)', platform: 'windows', compliant: true, appProtection: false },
  { id: 'personal-mac', label: 'Personal Mac (unmanaged)', platform: 'macos', compliant: false, appProtection: false },
  { id: 'iphone-mam', label: 'Personal iPhone, Outlook app with app protection', platform: 'ios', compliant: false, appProtection: true },
  { id: 'android', label: 'Personal Android, no protection', platform: 'android', compliant: false, appProtection: false },
  { id: 'linux', label: 'Unknown Linux machine', platform: 'linux', compliant: false, appProtection: false },
]

export const LOCATIONS: Record<LocationId, string> = {
  office: 'Oslo office (trusted named location)',
  home: 'Home, Norway',
  abroad: 'Hotel in Spain',
  blocked: 'Country on Fjordtech’s block list',
}

export const CLIENTS: Record<Client, string> = {
  browser: 'Browser',
  modern: 'Mobile / desktop app (modern auth)',
  legacy: 'Legacy protocol (IMAP, SMTP, basic auth)',
  'device-code': 'Device code flow',
}

export const CONTROLS: Record<Control, string> = {
  mfa: 'Require MFA',
  'phish-mfa': 'Require phishing-resistant MFA',
  compliant: 'Require compliant device',
  'app-protection': 'Require app protection policy',
  'password-change': 'Require password change',
}

export const RISKS: Risk[] = ['none', 'low', 'medium', 'high']

const BG = ['grp:breakglass']

export const FJORDTECH_POLICIES: Policy[] = [
  { id: 'CA001', name: 'All users: require MFA', state: 'on', include: ['all-users'], exclude: BG, apps: 'all', conditions: {}, grant: { block: false, require: ['mfa'], operator: 'AND' } },
  { id: 'CA002', name: 'All users: block legacy authentication', state: 'on', include: ['all-users'], exclude: BG, apps: 'all', conditions: { clients: ['legacy'] }, grant: { block: true } },
  { id: 'CA003', name: 'Admins: require phishing-resistant MFA', state: 'on', include: ['role:admin'], exclude: BG, apps: 'all', conditions: {}, grant: { block: false, require: ['phish-mfa'], operator: 'AND' } },
  { id: 'CA004', name: 'Visma ERP: require compliant device', state: 'on', include: ['all-users'], exclude: BG, apps: ['visma'], conditions: {}, grant: { block: false, require: ['compliant'], operator: 'AND' } },
  { id: 'CA005', name: 'All users: block high sign-in risk', state: 'on', include: ['all-users'], exclude: BG, apps: 'all', conditions: { signInRisk: ['high'] }, grant: { block: true } },
  {
    id: 'CA006',
    name: 'High user risk: secure password change',
    state: 'on',
    include: ['all-users'],
    exclude: BG,
    apps: 'all',
    conditions: { userRisk: ['high'] },
    grant: { block: false, require: ['mfa', 'password-change'], operator: 'AND' },
  },
  { id: 'CA007', name: 'All users: block device code flow', state: 'report', include: ['all-users'], exclude: BG, apps: 'all', conditions: { clients: ['device-code'] }, grant: { block: true } },
  { id: 'CA008', name: 'All users: block blocked countries', state: 'on', include: ['all-users'], exclude: BG, apps: 'all', conditions: { locations: 'blocked' }, grant: { block: true } },
  {
    id: 'CA009',
    name: 'Mobile Office 365: compliant device or app protection',
    state: 'on',
    include: ['all-users'],
    exclude: BG,
    apps: ['office365'],
    conditions: { platforms: ['ios', 'android'] },
    grant: { block: false, require: ['compliant', 'app-protection'], operator: 'OR' },
  },
]
