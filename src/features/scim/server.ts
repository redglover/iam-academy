// A small in-memory SCIM 2.0 service provider (RFC 7643/7644): enough of the protocol to learn it by poking at it.

export const USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User'
export const GROUP_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:Group'
export const ENTERPRISE_SCHEMA = 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'
export const LIST_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse'
export const PATCH_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:PatchOp'
export const ERROR_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:Error'

// SCIM resources are open-ended JSON documents.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- arbitrary JSON; callers index into it freely
export type Json = Record<string, any>

export interface ScimRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  body?: Json
  token?: string
}

export interface ScimResponse {
  status: number
  body?: Json
}

export const BASE_URL = 'https://fjordtech.my.salesforce.com/scim/v2'
export const VALID_TOKEN = 'secret-token-123'

const error = (status: number, detail: string, scimType?: string): ScimResponse => ({
  status,
  body: { schemas: [ERROR_SCHEMA], status: String(status), ...(scimType ? { scimType } : {}), detail },
})

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

/** Read a dotted, case-insensitive attribute path, e.g. "name.familyName" or "emails.value". */
function getPath(obj: Json, path: string): unknown[] {
  const parts = path.split('.')
  let current: unknown[] = [obj]
  for (const part of parts) {
    const next: unknown[] = []
    for (const c of current) {
      if (c && typeof c === 'object') {
        const key = Object.keys(c as Json).find((k) => k.toLowerCase() === part.toLowerCase())
        if (key === undefined) continue
        const v = (c as Json)[key]
        if (Array.isArray(v)) next.push(...v)
        else next.push(v)
      }
    }
    current = next
  }
  return current
}

function resolveAttr(resource: Json, attr: string): unknown[] {
  // Allow fully-qualified extension attributes: urn:...:enterprise:2.0:User:department
  const ext = attr.match(/^(urn:.+):([^:]+)$/)
  if (ext) {
    const container = Object.keys(resource).find((k) => k.toLowerCase() === ext[1].toLowerCase())
    return container ? getPath(resource[container], ext[2]) : []
  }
  return getPath(resource, attr)
}

type Pred = (r: Json) => boolean

/** Filter support: eq, ne, co, sw, pr, gt/lt on strings, combined with and/or, plus parentheses. */
export function parseFilter(filter: string): Pred {
  const tokens = filter.match(/"(?:[^"\\]|\\.)*"|\(|\)|[^\s()]+/g) ?? []
  let pos = 0
  const peek = () => tokens[pos]
  const next = () => tokens[pos++]

  const primary = (): Pred => {
    const t = next()
    if (t === undefined) throw new Error('Unexpected end of filter')
    if (t === '(') {
      const p = orExpr()
      if (next() !== ')') throw new Error('Missing )')
      return p
    }
    if (t.toLowerCase() === 'not') {
      const p = primary()
      return (r) => !p(r)
    }
    const attr = t
    const op = (next() ?? '').toLowerCase()
    if (op === 'pr') return (r) => resolveAttr(r, attr).some((v) => v !== null && v !== undefined && v !== '')
    const raw = next()
    if (raw === undefined) throw new Error(`Missing value after ${attr} ${op}`)
    const value: unknown = raw.startsWith('"') ? JSON.parse(raw) : raw === 'true' ? true : raw === 'false' ? false : raw === 'null' ? null : Number(raw)
    const cmp = (v: unknown): boolean => {
      const a = typeof v === 'string' ? v.toLowerCase() : v
      const b = typeof value === 'string' ? value.toLowerCase() : value
      switch (op) {
        case 'eq':
          return a === b
        case 'ne':
          return a !== b
        case 'co':
          return typeof a === 'string' && typeof b === 'string' && a.includes(b)
        case 'sw':
          return typeof a === 'string' && typeof b === 'string' && a.startsWith(b)
        case 'ew':
          return typeof a === 'string' && typeof b === 'string' && a.endsWith(b)
        case 'gt':
          return (a as string) > (b as string)
        case 'lt':
          return (a as string) < (b as string)
        case 'ge':
          return (a as string) >= (b as string)
        case 'le':
          return (a as string) <= (b as string)
        default:
          throw new Error(`Unsupported operator “${op}”`)
      }
    }
    if (op === 'ne') return (r) => resolveAttr(r, attr).every(cmp)
    return (r) => resolveAttr(r, attr).some(cmp)
  }
  const andExpr = (): Pred => {
    let left = primary()
    while (peek()?.toLowerCase() === 'and') {
      next()
      const l = left
      const right = primary()
      left = (r) => l(r) && right(r)
    }
    return left
  }
  function orExpr(): Pred {
    let left = andExpr()
    while (peek()?.toLowerCase() === 'or') {
      next()
      const l = left
      const right = andExpr()
      left = (r) => l(r) || right(r)
    }
    return left
  }
  const p = orExpr()
  if (pos < tokens.length) throw new Error(`Unexpected “${tokens[pos]}” in filter`)
  return p
}

/** Apply one PATCH operation. Supports simple paths, sub-attributes, and value filters like emails[type eq "work"].value / members[value eq "id"]. */
function applyOp(resource: Json, op: Json): string | null {
  const kind = String(op.op ?? '').toLowerCase()
  if (!['add', 'replace', 'remove'].includes(kind)) return `Unknown op “${op.op}”. Use add, replace or remove.`
  const path: string | undefined = op.path

  if (!path) {
    if (kind === 'remove') return 'remove requires a path'
    if (!op.value || typeof op.value !== 'object') return 'add/replace without a path needs an object value'
    for (const [k, v] of Object.entries(op.value as Json)) {
      if (k.includes('.')) {
        applyOp(resource, { op: kind, path: k, value: v })
      } else if (kind === 'add' && Array.isArray(v) && Array.isArray(resource[k])) {
        resource[k] = [...resource[k], ...v]
      } else {
        resource[k] = v
      }
    }
    return null
  }

  const filtered = path.match(/^([\w:.]+)\[(.+)\](?:\.(\w+))?$/)
  if (filtered) {
    const [, attr, expr, sub] = filtered
    const list: Json[] = Array.isArray(resource[attr]) ? resource[attr] : []
    let pred: Pred
    try {
      pred = parseFilter(expr)
    } catch (e) {
      return (e as Error).message
    }
    if (kind === 'remove' && !sub) {
      resource[attr] = list.filter((item) => !pred(item))
      return null
    }
    const matches = list.filter(pred)
    if (!matches.length) return `No ${attr} matched [${expr}]`
    for (const m of matches) {
      if (kind === 'remove') delete m[sub!]
      else if (sub) m[sub] = op.value
      else Object.assign(m, op.value)
    }
    return null
  }

  // Extension attribute: urn:...:User:department
  const ext = path.match(/^(urn:.+):([^:]+)$/)
  const target = ext ? (resource[ext[1]] ??= {}) : resource
  const parts = (ext ? ext[2] : path).split('.')
  let obj: Json = target
  for (const p of parts.slice(0, -1)) obj = obj[p] ??= {}
  const leaf = parts[parts.length - 1]
  if (kind === 'remove') delete obj[leaf]
  else if (kind === 'add' && Array.isArray(obj[leaf]) && Array.isArray(op.value)) {
    const existing: Json[] = obj[leaf]
    const values: Json[] = op.value
    obj[leaf] = [...existing, ...values.filter((v) => !existing.some((e) => JSON.stringify(e) === JSON.stringify(v)))]
  } else obj[leaf] = op.value
  return null
}

export class ScimServer {
  users = new Map<string, Json>()
  groups = new Map<string, Json>()
  private seq = 1
  private clock: () => Date

  constructor(clock: () => Date = () => new Date()) {
    this.clock = clock
  }

  private newId() {
    return `u-${(this.seq++).toString().padStart(4, '0')}`
  }

  private meta(type: 'User' | 'Group', id: string, created?: string) {
    const now = this.clock().toISOString()
    return { resourceType: type, created: created ?? now, lastModified: now, location: `${BASE_URL}/${type}s/${id}`, version: `W/"${this.seq}${id.slice(-2)}"` }
  }

  handle(req: ScimRequest): ScimResponse {
    if (req.token !== undefined && req.token !== VALID_TOKEN) return error(401, 'Authorization failed: the bearer token is invalid or expired.')
    const url = new URL(req.path.replace(/^\/?(scim\/v2)?\/?/, '/'), 'http://scim.local')
    const segs = url.pathname.split('/').filter(Boolean)
    const [collection, id] = segs
    const q = url.searchParams

    if (collection === 'ServiceProviderConfig' && req.method === 'GET') {
      return {
        status: 200,
        body: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
          patch: { supported: true },
          bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
          filter: { supported: true, maxResults: 200 },
          changePassword: { supported: false },
          sort: { supported: false },
          etag: { supported: false },
          authenticationSchemes: [{ type: 'oauthbearertoken', name: 'OAuth Bearer Token', description: 'Authentication with a bearer token in the Authorization header' }],
        },
      }
    }
    if (collection === 'ResourceTypes' && req.method === 'GET') {
      return {
        status: 200,
        body: {
          schemas: [LIST_SCHEMA],
          totalResults: 2,
          Resources: [
            { id: 'User', name: 'User', endpoint: '/Users', schema: USER_SCHEMA, schemaExtensions: [{ schema: ENTERPRISE_SCHEMA, required: false }] },
            { id: 'Group', name: 'Group', endpoint: '/Groups', schema: GROUP_SCHEMA },
          ],
        },
      }
    }

    const store = collection === 'Users' ? this.users : collection === 'Groups' ? this.groups : null
    if (!store) return error(404, `Unknown endpoint /${collection ?? ''}. Try /Users, /Groups, /ServiceProviderConfig or /ResourceTypes.`)
    const type = collection === 'Users' ? 'User' : 'Group'

    if (req.method === 'GET' && !id) {
      let list = [...store.values()]
      const filter = q.get('filter')
      if (filter) {
        try {
          const pred = parseFilter(filter)
          list = list.filter(pred)
        } catch (e) {
          return error(400, `Invalid filter: ${(e as Error).message}`, 'invalidFilter')
        }
      }
      const start = Math.max(1, Number(q.get('startIndex') ?? 1))
      const count = Math.max(0, Number(q.get('count') ?? 100))
      const page = list.slice(start - 1, start - 1 + count)
      return { status: 200, body: { schemas: [LIST_SCHEMA], totalResults: list.length, startIndex: start, itemsPerPage: page.length, Resources: clone(page) } }
    }

    if (req.method === 'POST' && !id) {
      const body = req.body
      if (!body) return error(400, 'Request body is required.', 'invalidSyntax')
      if (type === 'User') {
        if (!body.userName) return error(400, 'userName is required.', 'invalidValue')
        if ([...store.values()].some((u) => String(u.userName).toLowerCase() === String(body.userName).toLowerCase()))
          return error(409, `A user with userName “${body.userName}” already exists.`, 'uniqueness')
      } else {
        if (!body.displayName) return error(400, 'displayName is required.', 'invalidValue')
        if ([...store.values()].some((g) => g.displayName === body.displayName)) return error(409, `Group “${body.displayName}” already exists.`, 'uniqueness')
      }
      const newId = this.newId()
      const resource: Json = { ...clone(body), id: newId, meta: this.meta(type, newId) }
      if (type === 'User' && resource.active === undefined) resource.active = true
      if (type === 'Group') resource.members ??= []
      store.set(newId, resource)
      return { status: 201, body: clone(resource) }
    }

    if (!id) return error(405, `${req.method} is not allowed on /${collection}.`)
    const existing = store.get(id)
    if (!existing) return error(404, `${type} ${id} not found.`)

    switch (req.method) {
      case 'GET':
        return { status: 200, body: clone(existing) }
      case 'PUT': {
        if (!req.body) return error(400, 'Request body is required.', 'invalidSyntax')
        const replaced: Json = { ...clone(req.body), id, meta: this.meta(type, id, existing.meta.created) }
        store.set(id, replaced)
        return { status: 200, body: clone(replaced) }
      }
      case 'PATCH': {
        const ops: Json[] | undefined = req.body?.Operations
        if (!Array.isArray(ops)) return error(400, 'PATCH body needs an “Operations” array (schema urn:ietf:params:scim:api:messages:2.0:PatchOp).', 'invalidSyntax')
        const draft = clone(existing)
        for (const op of ops) {
          const problem = applyOp(draft, op)
          if (problem) return error(400, problem, 'invalidPath')
        }
        draft.meta = this.meta(type, id, existing.meta.created)
        store.set(id, draft)
        return { status: 200, body: clone(draft) }
      }
      case 'DELETE':
        store.delete(id)
        if (type === 'User') for (const g of this.groups.values()) g.members = (g.members ?? []).filter((m: Json) => m.value !== id)
        return { status: 204 }
      default:
        return error(405, `${req.method} is not supported.`)
    }
  }
}
