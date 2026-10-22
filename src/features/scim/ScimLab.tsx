import { useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Play, RotateCcw, Send, UserPlus } from 'lucide-react'
import { BASE_URL, ENTERPRISE_SCHEMA, GROUP_SCHEMA, PATCH_SCHEMA, ScimServer, USER_SCHEMA, type Json, type ScimRequest, type ScimResponse } from './server'
import { INITIAL_SOURCE, NEW_HIRE, emptyState, runCycle, type Action, type CycleResult, type SourceUser } from './provisioning'
import { CodeBlock } from '../../components/CodeBlock'
import { Tabs } from '../../components/Tabs'
import { useProgress } from '../progress/progress'

const ACTION_STYLE: Record<Action, string> = {
  Create: 'border-join/50 bg-join/10 text-join',
  Update: 'border-move/50 bg-move/10 text-move',
  'Re-enable': 'border-join/50 bg-join/10 text-join',
  Disable: 'border-leave/50 bg-leave/10 text-leave',
  'No change': 'border-line text-muted',
  'Skipped (out of scope)': 'border-line text-muted',
  Failed: 'border-leave bg-leave text-on',
}

const safeDecode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

export function formatRequest(r: ScimRequest) {
  return `${r.method} ${BASE_URL}${safeDecode(r.path)}\nAuthorization: Bearer …\n${r.body ? `Content-Type: application/scim+json\n\n${JSON.stringify(r.body, null, 2)}` : ''}`.trimEnd()
}

export function formatResponse(r: ScimResponse) {
  const text: Record<number, string> = { 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict' }
  return `HTTP/1.1 ${r.status} ${text[r.status] ?? ''}${r.body ? `\nContent-Type: application/scim+json\n\n${JSON.stringify(r.body, null, 2)}` : ''}`
}

export function ScimLab() {
  const server = useRef(new ScimServer())
  const [, force] = useState(0)
  const refresh = () => force((n) => n + 1)
  const [tab, setTab] = useState<'cycle' | 'console'>('cycle')

  return (
    <section className="my-8 rounded-[1.75rem] border-2 border-ink bg-fog p-3 sm:p-5" aria-label="SCIM lab">
      <Tabs
        label="SCIM lab"
        value={tab}
        onChange={setTab}
        tabs={[
          ['cycle', 'Provisioning cycle'],
          ['console', 'SCIM console'],
        ]}
        extra={
          <span className="ml-auto text-sm text-muted">
            Both tabs talk to the same SCIM server, running in your browser: <code className="text-xs">{BASE_URL}</code>
          </span>
        }
      >
        {tab === 'cycle' ? <CycleTab server={server.current} onChange={refresh} /> : <ConsoleTab server={server.current} onChange={refresh} />}
      </Tabs>
    </section>
  )
}

function AppUsers({ server }: { server: ScimServer }) {
  const users = [...server.users.values()]
  const id = useId()
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-paper p-4">
      <h3 id={id} className="text-base font-semibold">
        Salesforce users (the SCIM app)
      </h3>
      {users.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No users yet. Run a provisioning cycle or POST one in the console.</p>
      ) : (
        // Focusable so the table can be scrolled sideways from the keyboard on narrow screens.
        <div className="mt-2 overflow-x-auto" tabIndex={0} role="group" aria-labelledby={id}>
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-1.5 pr-3 font-semibold">id</th>
                <th className="py-1.5 pr-3 font-semibold">userName</th>
                <th className="py-1.5 pr-3 font-semibold">department</th>
                <th className="py-1.5 font-semibold">active</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={`border-b border-line/60 last:border-0 ${u.active === false ? 'text-muted line-through decoration-leave/60' : ''}`}>
                  <td className="py-1.5 pr-3 font-mono text-xs">{u.id}</td>
                  <td className="py-1.5 pr-3 font-mono text-xs">{u.userName}</td>
                  <td className="py-1.5 pr-3">{u[ENTERPRISE_SCHEMA]?.department ?? '–'}</td>
                  <td className={`py-1.5 font-semibold no-underline ${u.active === false ? 'text-leave' : 'text-join'}`}>{String(u.active)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CycleTab({ server, onChange }: { server: ScimServer; onChange: () => void }) {
  const [source, setSource] = useState<SourceUser[]>(() => INITIAL_SOURCE.map((u) => ({ ...u })))
  const [state, setState] = useState(emptyState)
  const [result, setResult] = useState<CycleResult | null>(null)
  const [tokenExpired, setTokenExpired] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const [said, setSaid] = useState('')
  const seen = useRef(new Set<Action>())
  const { award } = useProgress()

  const edit = (key: string, patch: Partial<SourceUser>) => setSource((s) => s.map((u) => (u.key === key ? { ...u, ...patch } : u)))
  const kari = source.find((u) => u.key === 'kari')!
  const pending = state.snapshot ? source.filter((u) => state.snapshot![u.key] !== JSON.stringify(u)).length : source.length

  const run = () => {
    const r = runCycle(source, server, state, tokenExpired ? 'expired-token' : undefined)
    setResult(r.result)
    setState(r.state)
    setOpen(null)
    onChange()
    r.result.entries.forEach((e) => seen.current.add(e.action))
    if (['Create', 'Update', 'Disable'].every((a) => seen.current.has(a as Action))) award('scim-cycle')
  }

  const reset = () => {
    server.users.clear()
    server.groups.clear()
    setSource(INITIAL_SOURCE.map((u) => ({ ...u })))
    setState(emptyState())
    setResult(null)
    setTokenExpired(false)
    setSaid('')
    onChange()
  }

  return (
    <div className="mt-4 grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-line bg-paper p-4">
          <h3 className="text-base font-semibold">Entra ID: users assigned to the Salesforce app</h3>
          <p className="text-sm text-muted">Change things here, then run a cycle. Scope: “Sync only assigned users and groups”.</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="py-1.5 pr-2 font-semibold">User</th>
                  <th className="py-1.5 pr-2 font-semibold">Department</th>
                  <th className="py-1.5 pr-2 font-semibold">Enabled</th>
                  <th className="py-1.5 font-semibold">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {source.map((u) => (
                  <tr key={u.key} className="border-b border-line/60 last:border-0">
                    <td className="py-1.5 pr-2">
                      <span className="font-semibold">
                        {u.givenName} {u.surname}
                      </span>
                      <span className="block font-mono text-xs text-muted">{u.upn}</span>
                    </td>
                    <td className="py-1.5 pr-2">
                      <select
                        value={u.department}
                        onChange={(e) => edit(u.key, { department: e.target.value })}
                        aria-label={`Department for ${u.givenName}`}
                        className="rounded-md border-2 border-muted/70 bg-paper px-1.5 py-1"
                      >
                        {['Sales', 'Finance', 'Engineering', 'People'].map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--join))]" checked={u.accountEnabled} onChange={(e) => edit(u.key, { accountEnabled: e.target.checked })} aria-label={`${u.givenName} account enabled`} />
                    </td>
                    <td className="py-1.5">
                      <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--key))]" checked={u.assigned} onChange={(e) => edit(u.key, { assigned: e.target.checked })} aria-label={`${u.givenName} assigned to app`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* One-shot buttons use aria-disabled so they keep keyboard focus after being pressed. */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="btn py-1 text-sm"
              aria-disabled={source.some((u) => u.key === 'ola')}
              onClick={() => {
                if (source.some((u) => u.key === 'ola')) return
                setSource((s) => [...s, { ...NEW_HIRE }])
                setSaid(`${NEW_HIRE.givenName} ${NEW_HIRE.surname} added to the table.`)
              }}
            >
              <UserPlus size={15} /> Hire Ola (joiner)
            </button>
            <button
              className="btn py-1 text-sm"
              aria-disabled={kari.surname === 'Strand'}
              onClick={() => {
                if (kari.surname === 'Strand') return
                edit('kari', { surname: 'Strand', upn: 'kari.strand@fjordtech.no', mail: 'kari.strand@fjordtech.no' })
                setSaid('Kari is now Kari Strand, kari.strand@fjordtech.no.')
              }}
            >
              Kari changes surname
            </button>
            <span className="sr-only" aria-live="polite">
              {said}
            </span>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--leave))]" checked={tokenExpired} onChange={(e) => setTokenExpired(e.target.checked)} />
            The app’s secret token has expired
          </label>
        </div>
        <AppUsers server={server} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-key" onClick={run}>
          <Play size={16} /> Run {state.snapshot ? 'incremental' : 'initial'} cycle
        </button>
        <span className="text-sm text-muted">
          {state.snapshot ? `${pending} changed user${pending === 1 ? '' : 's'} since the last cycle` : 'The first cycle evaluates every user in scope.'}
        </span>
        <button className="btn btn-ghost ml-auto py-1 text-sm" onClick={reset}>
          <RotateCcw size={15} /> Reset
        </button>
      </div>

      {result && (
        <div className="rounded-2xl border border-line bg-paper p-4" aria-live="polite">
          <h3 className="text-base font-semibold">Provisioning log: {result.kind.toLowerCase()} cycle</h3>
          {result.entries.length === 0 && <p className="mt-2 text-sm text-muted">Nothing changed in Entra since the last cycle, so nothing was sent. That’s what incremental cycles are for.</p>}
          <ul className="mt-2 grid gap-2">
            {result.entries.map((e, i) => (
              <li key={i} className="rounded-xl border border-line">
                <button className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left" onClick={() => setOpen(open === i ? null : i)} aria-expanded={e.exchanges.length ? open === i : undefined}>
                  <span className={`chip text-xs font-bold ${ACTION_STYLE[e.action]}`}>{e.action}</span>
                  <span className="font-semibold">{e.user}</span>
                  <span className="min-w-0 flex-1 text-sm text-muted">{e.reason}</span>
                  {e.exchanges.length > 0 && (
                    <span className="flex items-center gap-1 text-sm text-key">
                      {e.exchanges.length} request{e.exchanges.length > 1 ? 's' : ''} <ChevronDown size={15} className={open === i ? 'rotate-180' : ''} aria-hidden />
                    </span>
                  )}
                </button>
                {open === i && (
                  <div className="border-t border-line px-3 pb-1">
                    {e.exchanges.map((x, k) => (
                      <div key={k}>
                        <CodeBlock title={`Request ${k + 1}`} lang="http" code={formatRequest(x.req)} />
                        <CodeBlock title="Response" lang="http" code={formatResponse(x.res)} />
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ConsoleTab({ server, onChange }: { server: ScimServer; onChange: () => void }) {
  const [method, setMethod] = useState<ScimRequest['method']>('GET')
  const [path, setPath] = useState('/ServiceProviderConfig')
  const [body, setBody] = useState('')
  const [history, setHistory] = useState<{ req: ScimRequest; res: ScimResponse }[]>([])
  const [bodyError, setBodyError] = useState('')
  const { award } = useProgress()

  const firstUser = [...server.users.values()][0]
  const firstGroup = [...server.groups.values()][0]
  const examples = useMemo(() => {
    const uid = firstUser?.id ?? '{id}'
    const ex: { label: string; method: ScimRequest['method']; path: string; body?: Json }[] = [
      { label: 'What does the app support?', method: 'GET', path: '/ServiceProviderConfig' },
      { label: 'List users', method: 'GET', path: '/Users?startIndex=1&count=10' },
      { label: 'Find by userName', method: 'GET', path: `/Users?filter=userName eq "${firstUser?.userName ?? 'ingrid.haugen@fjordtech.no'}"` },
      {
        label: 'Create a user',
        method: 'POST',
        path: '/Users',
        body: {
          schemas: [USER_SCHEMA, ENTERPRISE_SCHEMA],
          userName: 'nora.bakke@fjordtech.no',
          externalId: 'nora.bakke',
          name: { givenName: 'Nora', familyName: 'Bakke' },
          displayName: 'Nora Bakke',
          emails: [{ type: 'work', primary: true, value: 'nora.bakke@fjordtech.no' }],
          active: true,
          [ENTERPRISE_SCHEMA]: { department: 'People', employeeNumber: 'E10512' },
        },
      },
      { label: 'Deactivate (leaver)', method: 'PATCH', path: `/Users/${uid}`, body: { schemas: [PATCH_SCHEMA], Operations: [{ op: 'replace', path: 'active', value: false }] } },
      {
        label: 'Change department (mover)',
        method: 'PATCH',
        path: `/Users/${uid}`,
        body: { schemas: [PATCH_SCHEMA], Operations: [{ op: 'replace', path: `${ENTERPRISE_SCHEMA}:department`, value: 'Finance' }] },
      },
      { label: 'Create a group', method: 'POST', path: '/Groups', body: { schemas: [GROUP_SCHEMA], displayName: 'Sales Team', members: [] } },
      {
        label: 'Add member to group',
        method: 'PATCH',
        path: `/Groups/${firstGroup?.id ?? '{groupId}'}`,
        body: { schemas: [PATCH_SCHEMA], Operations: [{ op: 'add', path: 'members', value: [{ value: uid }] }] },
      },
      { label: 'Hard delete', method: 'DELETE', path: `/Users/${uid}` },
      { label: 'Duplicate → 409', method: 'POST', path: '/Users', body: { schemas: [USER_SCHEMA], userName: firstUser?.userName ?? 'nora.bakke@fjordtech.no' } },
    ]
    return ex
  }, [firstUser, firstGroup])

  const send = () => {
    let parsed: Json | undefined
    if (body.trim() && method !== 'GET' && method !== 'DELETE') {
      try {
        parsed = JSON.parse(body)
      } catch (e) {
        setBodyError(`Body isn’t valid JSON: ${(e as Error).message}`)
        return
      }
    }
    setBodyError('')
    const req: ScimRequest = { method, path: path.trim().replace(/ /g, '%20'), body: parsed }
    const res = server.handle(req)
    setHistory((h) => [{ req, res }, ...h].slice(0, 6))
    onChange()
    if (res.status < 300) award('scim-console')
  }

  const latest = history[0]

  return (
    <div className="mt-4 grid gap-4">
      <div className="rounded-2xl border border-line bg-paper p-4">
        <p className="text-sm font-semibold">Examples</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {examples.map((e) => (
            <button
              key={e.label}
              className="chip border-line py-1 text-sm hover:border-ink"
              onClick={() => {
                setMethod(e.method)
                setPath(e.path)
                setBody(e.body ? JSON.stringify(e.body, null, 2) : '')
              }}
            >
              <span className="font-mono text-xs font-bold">{e.method}</span> {e.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <select value={method} onChange={(e) => setMethod(e.target.value as ScimRequest['method'])} aria-label="HTTP method" className="rounded-lg border-2 border-muted/70 bg-paper px-2 py-1.5 font-mono text-sm font-bold">
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <label className="flex min-w-0 flex-1 items-center rounded-lg border-2 border-muted/70 bg-paper focus-within:border-key">
            <span className="hidden pl-2 font-mono text-xs text-muted sm:inline">/scim/v2</span>
            <span className="sr-only">Path</span>
            <input value={path} onChange={(e) => setPath(e.target.value)} spellCheck={false} className="min-w-0 flex-1 bg-transparent px-2 py-1.5 font-mono text-sm outline-none" />
          </label>
          <button className="btn btn-key py-1.5" onClick={send}>
            <Send size={15} /> Send
          </button>
        </div>
        {method !== 'GET' && method !== 'DELETE' && (
          <label className="mt-3 block">
            <span className="text-sm font-semibold">Body (application/scim+json)</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} spellCheck={false} className="mt-1 w-full rounded-xl border-2 border-muted/70 bg-paper p-3 font-mono text-xs focus:border-key" />
          </label>
        )}
        {bodyError && (
          <p className="mt-2 text-sm text-leave" role="alert">
            {bodyError}
          </p>
        )}
      </div>

      {latest && (
        <div aria-live="polite">
          <CodeBlock title="Request" lang="http" code={formatRequest(latest.req)} />
          <CodeBlock title={`Response: ${latest.res.status}`} lang="http" code={formatResponse(latest.res)} />
        </div>
      )}
      <AppUsers server={server} />
    </div>
  )
}
