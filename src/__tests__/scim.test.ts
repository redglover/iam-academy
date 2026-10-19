import { describe, expect, it } from 'vitest'
import { ENTERPRISE_SCHEMA, PATCH_SCHEMA, ScimServer, USER_SCHEMA, VALID_TOKEN, parseFilter } from '../features/scim/server'
import { INITIAL_SOURCE, NEW_HIRE, emptyState, runCycle, type SourceUser } from '../features/scim/provisioning'

const clock = () => new Date('2026-10-19T08:00:00Z')
const user = (userName: string, extra = {}) => ({ schemas: [USER_SCHEMA], userName, name: { givenName: 'A', familyName: 'B' }, emails: [{ type: 'work', value: userName }], ...extra })

describe('SCIM server', () => {
  it('creates, reads and enforces userName uniqueness', () => {
    const s = new ScimServer(clock)
    const created = s.handle({ method: 'POST', path: '/Users', body: user('ingrid@x.no') })
    expect(created.status).toBe(201)
    expect(created.body!.active).toBe(true)
    expect(created.body!.meta.location).toContain(`/Users/${created.body!.id}`)
    expect(s.handle({ method: 'GET', path: `/Users/${created.body!.id}` }).status).toBe(200)
    const dup = s.handle({ method: 'POST', path: '/Users', body: user('INGRID@x.no') })
    expect(dup.status).toBe(409)
    expect(dup.body!.scimType).toBe('uniqueness')
  })

  it('filters with eq, co, and/or and extension attributes', () => {
    const s = new ScimServer(clock)
    s.handle({ method: 'POST', path: '/Users', body: user('a@x.no', { [ENTERPRISE_SCHEMA]: { department: 'Sales' } }) })
    s.handle({ method: 'POST', path: '/Users', body: user('b@x.no', { active: false, [ENTERPRISE_SCHEMA]: { department: 'Finance' } }) })
    const q = (f: string) => s.handle({ method: 'GET', path: `/Users?filter=${encodeURIComponent(f)}` }).body!.totalResults
    expect(q('userName eq "A@X.NO"')).toBe(1)
    expect(q('emails.value co "x.no"')).toBe(2)
    expect(q('active eq false or userName eq "a@x.no"')).toBe(2)
    expect(q(`${ENTERPRISE_SCHEMA}:department eq "Finance"`)).toBe(1)
    expect(s.handle({ method: 'GET', path: '/Users?filter=userName%20zz%20%22a%22' }).status).toBe(400)
  })

  it('applies PATCH operations, including value-filtered paths', () => {
    const s = new ScimServer(clock)
    const id = s.handle({ method: 'POST', path: '/Users', body: user('a@x.no') }).body!.id
    const res = s.handle({
      method: 'PATCH',
      path: `/Users/${id}`,
      body: {
        schemas: [PATCH_SCHEMA],
        Operations: [
          { op: 'replace', path: 'active', value: false },
          { op: 'replace', path: 'name.familyName', value: 'Berg' },
          { op: 'replace', path: 'emails[type eq "work"].value', value: 'new@x.no' },
          { op: 'add', path: `${ENTERPRISE_SCHEMA}:department`, value: 'Finance' },
        ],
      },
    })
    expect(res.status).toBe(200)
    expect(res.body!.active).toBe(false)
    expect(res.body!.name.familyName).toBe('Berg')
    expect(res.body!.emails[0].value).toBe('new@x.no')
    expect(res.body![ENTERPRISE_SCHEMA].department).toBe('Finance')
  })

  it('manages group membership and cleans up on user delete', () => {
    const s = new ScimServer(clock)
    const uid = s.handle({ method: 'POST', path: '/Users', body: user('a@x.no') }).body!.id
    const gid = s.handle({ method: 'POST', path: '/Groups', body: { displayName: 'Sales' } }).body!.id
    s.handle({ method: 'PATCH', path: `/Groups/${gid}`, body: { schemas: [PATCH_SCHEMA], Operations: [{ op: 'add', path: 'members', value: [{ value: uid }] }] } })
    expect(s.groups.get(gid)!.members).toHaveLength(1)
    s.handle({ method: 'PATCH', path: `/Groups/${gid}`, body: { schemas: [PATCH_SCHEMA], Operations: [{ op: 'remove', path: `members[value eq "${uid}"]` }] } })
    expect(s.groups.get(gid)!.members).toHaveLength(0)
    expect(s.handle({ method: 'DELETE', path: `/Users/${uid}` }).status).toBe(204)
    expect(s.handle({ method: 'GET', path: `/Users/${uid}` }).status).toBe(404)
  })

  it('rejects bad tokens with 401', () => {
    const s = new ScimServer(clock)
    expect(s.handle({ method: 'GET', path: '/Users', token: 'nope' }).status).toBe(401)
    expect(s.handle({ method: 'GET', path: '/Users', token: VALID_TOKEN }).status).toBe(200)
  })

  it('parses nested filters', () => {
    const p = parseFilter('(userName sw "a" and active eq true) or not (title pr)')
    expect(p({ userName: 'ab', active: true, title: 'x' })).toBe(true)
    expect(p({ userName: 'zz', active: true })).toBe(true)
    expect(p({ userName: 'zz', active: true, title: 'x' })).toBe(false)
  })
})

describe('provisioning cycles', () => {
  const actions = (r: ReturnType<typeof runCycle>) => Object.fromEntries(r.result.entries.map((e) => [e.user, e.action]))

  it('initial cycle creates assigned users and skips unassigned ones', () => {
    const s = new ScimServer(clock)
    const r = runCycle(INITIAL_SOURCE, s, emptyState())
    expect(r.result.kind).toBe('Initial')
    expect(actions(r)).toEqual({ 'Ingrid Haugen': 'Create', 'Kari Lunde': 'Create', 'Lars Berg': 'Skipped (out of scope)' })
    expect(s.users.size).toBe(2)
  })

  it('incremental cycles handle joiner, mover and leaver, and only touch changed users', () => {
    const s = new ScimServer(clock)
    let src: SourceUser[] = INITIAL_SOURCE.map((u) => ({ ...u }))
    let st = runCycle(src, s, emptyState()).state

    const quiet = runCycle(src, s, st)
    expect(quiet.result.kind).toBe('Incremental')
    expect(quiet.result.entries).toHaveLength(0)

    src = [...src.map((u) => (u.key === 'ingrid' ? { ...u, department: 'Finance', jobTitle: 'Controller' } : u.key === 'kari' ? { ...u, accountEnabled: false } : u)), { ...NEW_HIRE }]
    const r = runCycle(src, s, st)
    expect(actions(r)).toEqual({ 'Ingrid Haugen': 'Update', 'Kari Lunde': 'Disable', 'Ola Nordmann': 'Create' })
    const kari = [...s.users.values()].find((u) => u.userName === 'kari.lunde@fjordtech.no')!
    expect(kari.active).toBe(false)
    st = r.state

    src = src.map((u) => (u.key === 'kari' ? { ...u, accountEnabled: true } : u))
    expect(actions(runCycle(src, s, st))).toEqual({ 'Kari Lunde': 'Re-enable' })
  })

  it('unassigning soft-deletes, and a bad token fails', () => {
    const s = new ScimServer(clock)
    let src = INITIAL_SOURCE.map((u) => ({ ...u }))
    const st = runCycle(src, s, emptyState()).state
    src = src.map((u) => (u.key === 'ingrid' ? { ...u, assigned: false } : u))
    expect(actions(runCycle(src, s, st))).toEqual({ 'Ingrid Haugen': 'Disable' })
    expect(actions(runCycle(INITIAL_SOURCE, new ScimServer(clock), emptyState(), 'expired'))['Ingrid Haugen']).toBe('Failed')
  })
})
