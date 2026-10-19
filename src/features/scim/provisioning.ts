// Simulates the Entra ID provisioning service pushing users to an app over SCIM.
import { ENTERPRISE_SCHEMA, PATCH_SCHEMA, USER_SCHEMA, VALID_TOKEN, type Json, type ScimRequest, type ScimResponse, type ScimServer } from './server'

export interface SourceUser {
  key: string
  givenName: string
  surname: string
  upn: string
  mail: string
  jobTitle: string
  department: string
  employeeId: string
  accountEnabled: boolean
  assigned: boolean
}

/** Entra’s default attribute mappings for a non-gallery SCIM app (simplified). */
export const MAPPINGS: { source: string; target: string; matching?: boolean }[] = [
  { source: 'userPrincipalName', target: 'userName', matching: true },
  { source: 'Not([IsSoftDeleted]) (accountEnabled && assigned)', target: 'active' },
  { source: 'displayName', target: 'displayName' },
  { source: 'givenName', target: 'name.givenName' },
  { source: 'surname', target: 'name.familyName' },
  { source: 'mail', target: 'emails[type eq "work"].value' },
  { source: 'jobTitle', target: 'title' },
  { source: 'mailNickname', target: 'externalId' },
  { source: 'department', target: `${ENTERPRISE_SCHEMA}:department` },
  { source: 'employeeId', target: `${ENTERPRISE_SCHEMA}:employeeNumber` },
]

export function toScimUser(u: SourceUser): Json {
  return {
    schemas: [USER_SCHEMA, ENTERPRISE_SCHEMA],
    userName: u.upn,
    active: true,
    displayName: `${u.givenName} ${u.surname}`,
    name: { givenName: u.givenName, familyName: u.surname },
    emails: [{ type: 'work', primary: true, value: u.mail }],
    title: u.jobTitle,
    externalId: u.upn.split('@')[0],
    [ENTERPRISE_SCHEMA]: { department: u.department, employeeNumber: u.employeeId },
  }
}

/** The attributes the service compares, as [SCIM PATCH path, value] pairs. */
function comparable(u: Json): [string, unknown][] {
  return [
    ['userName', u.userName],
    ['displayName', u.displayName],
    ['name.givenName', u.name?.givenName],
    ['name.familyName', u.name?.familyName],
    ['emails[type eq "work"].value', u.emails?.find((e: Json) => e.type === 'work')?.value],
    ['title', u.title],
    ['externalId', u.externalId],
    [`${ENTERPRISE_SCHEMA}:department`, u[ENTERPRISE_SCHEMA]?.department],
    [`${ENTERPRISE_SCHEMA}:employeeNumber`, u[ENTERPRISE_SCHEMA]?.employeeNumber],
  ]
}

export type Action = 'Create' | 'Update' | 'Disable' | 'Re-enable' | 'No change' | 'Skipped (out of scope)' | 'Failed'

export interface Exchange {
  req: ScimRequest
  res: ScimResponse
}

export interface LogEntry {
  user: string
  action: Action
  reason: string
  exchanges: Exchange[]
}

export interface CycleResult {
  kind: 'Initial' | 'Incremental'
  entries: LogEntry[]
}

export interface ProvisioningState {
  /** Entra remembers which target object belongs to which source user after the first match. */
  links: Record<string, string>
  /** Snapshot of each source user at the last cycle: the “watermark” for incremental cycles. */
  snapshot: Record<string, string> | null
}

export const emptyState = (): ProvisioningState => ({ links: {}, snapshot: null })

export function runCycle(source: SourceUser[], server: ScimServer, state: ProvisioningState, token = VALID_TOKEN): { result: CycleResult; state: ProvisioningState } {
  const kind = state.snapshot ? 'Incremental' : 'Initial'
  const links = { ...state.links }
  const entries: LogEntry[] = []
  const send = (ex: Exchange[], req: ScimRequest) => {
    const res = server.handle({ ...req, token })
    ex.push({ req, res })
    return res
  }

  const candidates = state.snapshot ? source.filter((u) => state.snapshot![u.key] !== JSON.stringify(u)) : source

  for (const u of candidates) {
    const ex: Exchange[] = []
    const name = `${u.givenName} ${u.surname}`
    const inScope = u.assigned
    const shouldBeActive = inScope && u.accountEnabled

    if (!inScope && !links[u.key]) {
      entries.push({ user: name, action: 'Skipped (out of scope)', reason: 'Not assigned to the app, and no account exists there.', exchanges: [] })
      continue
    }

    // Find the target user: by stored link, else by the matching attribute.
    let target: Json | undefined
    if (links[u.key]) {
      const res = send(ex, { method: 'GET', path: `/Users/${links[u.key]}` })
      if (res.status === 200) target = res.body
      else delete links[u.key]
    }
    if (!target) {
      const res = send(ex, { method: 'GET', path: `/Users?filter=${encodeURIComponent(`userName eq "${u.upn}"`)}` })
      if (res.status === 401) {
        entries.push({ user: name, action: 'Failed', reason: 'The app rejected the secret token (HTTP 401). After repeated failures Entra puts the job in quarantine.', exchanges: ex })
        continue
      }
      target = res.body?.Resources?.[0]
      if (target) links[u.key] = target.id
    }

    if (!target) {
      if (!shouldBeActive) {
        entries.push({ user: name, action: 'Skipped (out of scope)', reason: 'Disabled in Entra and not present in the app. Nothing to create.', exchanges: ex })
        continue
      }
      const res = send(ex, { method: 'POST', path: '/Users', body: toScimUser(u) })
      if (res.status === 201) links[u.key] = res.body!.id
      entries.push({
        user: name,
        action: res.status === 201 ? 'Create' : 'Failed',
        reason: res.status === 201 ? 'Assigned and enabled, but no matching user in the app (matched on userName).' : `The app answered ${res.status}: ${res.body?.detail}`,
        exchanges: ex,
      })
      continue
    }

    if (!shouldBeActive) {
      if (target.active === false) {
        entries.push({ user: name, action: 'No change', reason: 'Already deactivated in the app.', exchanges: ex })
        continue
      }
      send(ex, { method: 'PATCH', path: `/Users/${target.id}`, body: { schemas: [PATCH_SCHEMA], Operations: [{ op: 'replace', path: 'active', value: false }] } })
      entries.push({
        user: name,
        action: 'Disable',
        reason: !inScope ? 'Removed from the app’s assignments, so the account is soft-deleted (active = false).' : 'Account disabled in Entra (a leaver), so it is deactivated in the app.',
        exchanges: ex,
      })
      continue
    }

    const want = comparable(toScimUser(u))
    const have = new Map(comparable(target))
    const ops: Json[] = want.filter(([path, v]) => have.get(path) !== v).map(([path, value]) => ({ op: 'replace', path, value }))
    const reactivate = target.active === false
    if (reactivate) ops.unshift({ op: 'replace', path: 'active', value: true })
    if (!ops.length) {
      entries.push({ user: name, action: 'No change', reason: 'The app already matches Entra.', exchanges: ex })
      continue
    }
    send(ex, { method: 'PATCH', path: `/Users/${target.id}`, body: { schemas: [PATCH_SCHEMA], Operations: ops } })
    entries.push({
      user: name,
      action: reactivate ? 'Re-enable' : 'Update',
      reason: [
        reactivate && 'Back in scope and enabled (a rehire or re-assignment).',
        ops.some((o) => o.path !== 'active') && `Changed: ${ops.filter((o) => o.path !== 'active').map((o) => o.path.split(':').pop()).join(', ')}.`,
      ]
        .filter(Boolean)
        .join(' '),
      exchanges: ex,
    })
  }

  const snapshot = Object.fromEntries(source.map((u) => [u.key, JSON.stringify(u)]))
  return { result: { kind, entries }, state: { links, snapshot } }
}

export const INITIAL_SOURCE: SourceUser[] = [
  { key: 'ingrid', givenName: 'Ingrid', surname: 'Haugen', upn: 'ingrid.haugen@fjordtech.no', mail: 'ingrid.haugen@fjordtech.no', jobTitle: 'Account Executive', department: 'Sales', employeeId: 'E10421', accountEnabled: true, assigned: true },
  { key: 'kari', givenName: 'Kari', surname: 'Lunde', upn: 'kari.lunde@fjordtech.no', mail: 'kari.lunde@fjordtech.no', jobTitle: 'Sales Manager', department: 'Sales', employeeId: 'E10107', accountEnabled: true, assigned: true },
  { key: 'lars', givenName: 'Lars', surname: 'Berg', upn: 'lars.berg@fjordtech.no', mail: 'lars.berg@fjordtech.no', jobTitle: 'Engineering Manager', department: 'Engineering', employeeId: 'E10055', accountEnabled: true, assigned: false },
]

export const NEW_HIRE: SourceUser = {
  key: 'ola',
  givenName: 'Ola',
  surname: 'Nordmann',
  upn: 'ola.nordmann@fjordtech.no',
  mail: 'ola.nordmann@fjordtech.no',
  jobTitle: 'Key Account Manager',
  department: 'Sales',
  employeeId: 'E10388',
  accountEnabled: true,
  assigned: true,
}
