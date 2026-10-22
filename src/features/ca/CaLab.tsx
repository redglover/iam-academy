import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, CircleSlash, Eye, Lightbulb, ShieldCheck, ShieldX, XCircle } from 'lucide-react'
import {
  APPS,
  CLIENTS,
  CONTROLS,
  DEVICES,
  FJORDTECH_POLICIES,
  LOCATIONS,
  RISKS,
  TAG_LABELS,
  USERS,
  type AppId,
  type Client,
  type Control,
  type Platform,
  type Policy,
  type Risk,
  type SignIn,
} from './model'
import { describePolicy, evaluate, type Verdict } from './engine'
import { MISSIONS, runMission } from './missions'
import { CA_MISSIONS_KEY, useProgress } from '../progress/progress'
import { Tabs } from '../../components/Tabs'
import { load, save } from '../../lib/storage'
import { celebrate } from '../../lib/confetti'

const select = 'w-full rounded-lg border-2 border-muted/70 bg-paper px-2 py-1.5 text-sm font-semibold focus:border-key'

function Chip({ on, onClick, children, tone = 'key' }: { on: boolean; onClick: () => void; children: React.ReactNode; tone?: 'key' | 'leave' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`chip py-1 text-sm ${on ? (tone === 'leave' ? 'border-leave bg-leave text-on' : 'border-ink bg-ink text-paper') : 'border-line bg-paper hover:border-ink'}`}
    >
      {children}
    </button>
  )
}

const toggleIn = <T,>(list: T[] | undefined, v: T): T[] => ((list ?? []).includes(v) ? (list ?? []).filter((x) => x !== v) : [...(list ?? []), v])

function VerdictCard({ verdict }: { verdict: Verdict }) {
  const style = {
    block: { cls: 'border-leave bg-leave/[.08]', icon: <ShieldX className="shrink-0 text-leave" size={26} /> },
    grant: { cls: 'border-join bg-join/[.08]', icon: <ShieldCheck className="shrink-0 text-join" size={26} /> },
    allow: { cls: 'border-move bg-move/[.08]', icon: <CircleSlash className="shrink-0 text-move" size={26} /> },
  }[verdict.decision]
  return (
    <div className={`rounded-2xl border-2 p-4 ${style.cls}`} aria-live="polite">
      <p className="flex items-center gap-2 font-display text-2xl font-bold">
        {style.icon} {verdict.headline}
      </p>
      {verdict.details.map((d, i) => (
        <p key={i} className="mt-1.5">
          {d}
        </p>
      ))}
      {verdict.requirements.length > 0 && verdict.decision !== 'block' && (
        <ul className="mt-2 space-y-1 text-sm">
          {verdict.requirements.map((r) => (
            <li key={r.policy.id}>
              <strong>{r.policy.id}</strong>: {r.checks.filter((c) => c.ok).map((c) => c.why).join(' ')}
            </li>
          ))}
        </ul>
      )}
      {verdict.reportOnly.length > 0 && (
        <p className="mt-2 text-sm text-muted">
          Report-only: {verdict.reportOnly.map((r) => `${r.policy.id} would have ${r.policy.grant.block ? 'blocked' : 'required controls'}`).join('; ')}. Nothing was enforced; this
          shows up in the sign-in logs so you can test before switching on.
        </p>
      )}
    </div>
  )
}

const PRESETS: { label: string; s: Partial<SignIn> }[] = [
  { label: 'Ingrid reads mail at home', s: {} },
  { label: 'Ingrid’s old IMAP client', s: { client: 'legacy' } },
  { label: 'Scanner sends via SMTP', s: { user: 'svc', client: 'legacy', device: 'linux', location: 'office' } },
  { label: 'Erik opens the Azure portal', s: { user: 'erik', app: 'azure' } },
  { label: 'Kari: Visma on personal Mac', s: { user: 'kari', app: 'visma', device: 'personal-mac' } },
  { label: 'Outlook app on iPhone', s: { device: 'iphone-mam', client: 'modern' } },
  { label: 'Device code phishing', s: { client: 'device-code' } },
  { label: 'Impossible travel', s: { location: 'abroad', signInRisk: 'high' } },
  { label: 'Break-glass at 3 a.m.', s: { user: 'bg', app: 'azure', location: 'abroad' } },
]

const BASE_SIGNIN: SignIn = { user: 'ingrid', app: 'office365', device: 'corp-laptop', location: 'home', client: 'browser', signInRisk: 'none', userRisk: 'none' }

function WhatIf() {
  const [policies, setPolicies] = useState<Policy[]>(FJORDTECH_POLICIES)
  const [s, setS] = useState<SignIn>(BASE_SIGNIN)
  const tried = useRef(new Set<string>())
  const { award } = useProgress()
  const { results, verdict } = useMemo(() => evaluate(policies, s), [policies, s])
  const set = (p: Partial<SignIn>) => setS((x) => ({ ...x, ...p }))

  useEffect(() => {
    tried.current.add(JSON.stringify(s))
    if (tried.current.size >= 5) award('ca-detective')
  }, [s, award])

  const field = (label: string, el: React.ReactNode) => (
    <label className="block text-sm">
      <span className="font-semibold">{label}</span>
      <span className="mt-1 block">{el}</span>
    </label>
  )

  return (
    <div className="mt-4 grid gap-4">
      <div className="rounded-2xl border border-line bg-paper p-4">
        <p className="text-sm font-semibold">Try a scenario</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.label} className="chip border-line py-1 text-sm hover:border-ink" onClick={() => setS({ ...BASE_SIGNIN, ...p.s })}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {field(
            'User',
            <select className={select} value={s.user} onChange={(e) => set({ user: e.target.value })}>
              {USERS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.emoji} {u.name}: {u.role}
                </option>
              ))}
            </select>,
          )}
          {field(
            'App',
            <select className={select} value={s.app} onChange={(e) => set({ app: e.target.value as AppId })}>
              {Object.entries(APPS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>,
          )}
          {field(
            'Device',
            <select className={select} value={s.device} onChange={(e) => set({ device: e.target.value })}>
              {DEVICES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>,
          )}
          {field(
            'Client',
            <select className={select} value={s.client} onChange={(e) => set({ client: e.target.value as Client })}>
              {Object.entries(CLIENTS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>,
          )}
          {field(
            'Location',
            <select className={select} value={s.location} onChange={(e) => set({ location: e.target.value as SignIn['location'] })}>
              {Object.entries(LOCATIONS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>,
          )}
          <div className="grid grid-cols-2 gap-3">
            {field(
              'Sign-in risk',
              <select className={select} value={s.signInRisk} onChange={(e) => set({ signInRisk: e.target.value as Risk })}>
                {RISKS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>,
            )}
            {field(
              'User risk',
              <select className={select} value={s.userRisk} onChange={(e) => set({ userRisk: e.target.value as Risk })}>
                {RISKS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>,
            )}
          </div>
        </div>
      </div>

      <VerdictCard verdict={verdict} />

      <div className="rounded-2xl border border-line bg-paper p-4">
        <h3 className="text-base font-semibold">Fjordtech’s policies</h3>
        <p className="text-sm text-muted">Every policy is checked; the ones that apply are combined. Switch policies off or to report-only to see what changes.</p>
        <ul className="mt-3 grid gap-2">
          {policies.map((p) => {
            const r = results.find((x) => x.policy.id === p.id)
            const applies = r?.applies
            return (
              <li
                key={p.id}
                className={`rounded-xl border-2 p-3 ${p.state === 'off' ? 'border-dashed border-line opacity-60' : applies ? (p.grant.block ? 'border-leave/60' : 'border-join/60') : 'border-line'}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold">{p.id}</span>
                  <span className="min-w-0 flex-1 font-semibold">{p.name}</span>
                  <span className="inline-flex rounded-lg border border-line p-0.5 text-xs" role="group" aria-label={`State of ${p.id}`}>
                    {(['on', 'report', 'off'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setPolicies((ps) => ps.map((x) => (x.id === p.id ? { ...x, state: st } : x)))}
                        aria-pressed={p.state === st}
                        className={`rounded-md px-2 py-0.5 font-semibold ${p.state === st ? 'bg-ink text-paper' : 'text-muted'}`}
                      >
                        {st === 'on' ? 'On' : st === 'report' ? 'Report-only' : 'Off'}
                      </button>
                    ))}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{describePolicy(p)}</p>
                {p.state !== 'off' && r && (
                  <p className={`mt-1.5 flex gap-1.5 text-sm ${applies ? (p.grant.block ? 'text-leave' : 'text-join') : 'text-muted'}`}>
                    {applies ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden /> : <XCircle size={16} className="mt-0.5 shrink-0" aria-hidden />}
                    <span>
                      <strong>{applies ? (p.state === 'report' ? 'Applies (report-only)' : 'Applies') : 'Doesn’t apply'}:</strong> {r.reasons.join(' ')}
                    </span>
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function PolicyForm({ p, onChange }: { p: Policy; onChange: (p: Policy) => void }) {
  const set = (patch: Partial<Policy>) => onChange({ ...p, ...patch })
  const cond = (patch: Partial<Policy['conditions']>) => set({ conditions: { ...p.conditions, ...patch } })
  const includeTags = ['all-users', 'guest', 'grp:finance', 'role:admin', 'grp:service-accounts']
  const excludeTags = ['grp:breakglass', 'grp:service-accounts', 'guest']
  const require = p.grant.block ? [] : p.grant.require
  const operator = p.grant.block ? 'AND' : p.grant.operator
  const section = (title: string, children: React.ReactNode) => (
    <fieldset className="border-t border-line pt-3 first:border-0 first:pt-0">
      <legend className="float-left mb-1.5 w-full text-sm font-semibold">{title}</legend>
      <div className="clear-both flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  )

  return (
    <div className="grid gap-3 rounded-2xl border border-line bg-paper p-4">
      {section(
        'State',
        (['on', 'report', 'off'] as const).map((st) => (
          <Chip key={st} on={p.state === st} onClick={() => set({ state: st })}>
            {st === 'on' ? 'On' : st === 'report' ? 'Report-only' : 'Off'}
          </Chip>
        )),
      )}
      {section(
        'Users: include',
        includeTags.map((t) => (
          <Chip key={t} on={p.include.includes(t)} onClick={() => set({ include: toggleIn(p.include, t) })}>
            {TAG_LABELS[t]}
          </Chip>
        )),
      )}
      {section(
        'Users: exclude',
        excludeTags.map((t) => (
          <Chip key={t} tone="leave" on={p.exclude.includes(t)} onClick={() => set({ exclude: toggleIn(p.exclude, t) })}>
            {TAG_LABELS[t]}
          </Chip>
        )),
      )}
      {section(
        'Target apps',
        <>
          <Chip on={p.apps === 'all'} onClick={() => set({ apps: 'all' })}>
            All apps
          </Chip>
          {(Object.keys(APPS) as AppId[]).map((a) => (
            <Chip
              key={a}
              on={p.apps !== 'all' && p.apps.includes(a)}
              onClick={() => {
                const next = toggleIn(p.apps === 'all' ? [] : p.apps, a)
                set({ apps: next.length ? next : 'all' })
              }}
            >
              {APPS[a]}
            </Chip>
          ))}
        </>,
      )}
      {section(
        'Condition: client apps (none selected = any)',
        (Object.keys(CLIENTS) as Client[]).map((c) => (
          <Chip key={c} on={!!p.conditions.clients?.includes(c)} onClick={() => cond({ clients: toggleIn(p.conditions.clients, c) })}>
            {CLIENTS[c].split(' (')[0]}
          </Chip>
        )),
      )}
      {section(
        'Condition: device platforms (none = any)',
        (['windows', 'macos', 'ios', 'android', 'linux'] as Platform[]).map((pl) => (
          <Chip key={pl} on={!!p.conditions.platforms?.includes(pl)} onClick={() => cond({ platforms: toggleIn(p.conditions.platforms, pl) })}>
            {pl}
          </Chip>
        )),
      )}
      {section(
        'Condition: locations',
        (
          [
            ['any', 'Any location'],
            ['untrusted', 'Outside trusted locations'],
            ['blocked', 'Blocked countries'],
          ] as const
        ).map(([v, label]) => (
          <Chip key={v} on={(p.conditions.locations ?? 'any') === v} onClick={() => cond({ locations: v })}>
            {label}
          </Chip>
        )),
      )}
      {section(
        'Condition: sign-in risk (none = any)',
        (['low', 'medium', 'high'] as Risk[]).map((r) => (
          <Chip key={r} on={!!p.conditions.signInRisk?.includes(r)} onClick={() => cond({ signInRisk: toggleIn(p.conditions.signInRisk, r) })}>
            {r}
          </Chip>
        )),
      )}
      {section(
        'Grant',
        <>
          <Chip tone="leave" on={p.grant.block} onClick={() => set({ grant: { block: true } })}>
            Block access
          </Chip>
          <Chip on={!p.grant.block} onClick={() => set({ grant: { block: false, require: require.length ? require : ['mfa'], operator } })}>
            Grant access, requiring…
          </Chip>
        </>,
      )}
      {!p.grant.block && (
        <div className="-mt-1 flex flex-wrap gap-1.5 pl-4">
          {(Object.keys(CONTROLS) as Control[]).map((c) => (
            <Chip key={c} on={require.includes(c)} onClick={() => set({ grant: { block: false, require: toggleIn(require, c), operator } })}>
              {CONTROLS[c].replace('Require ', '')}
            </Chip>
          ))}
          {require.length > 1 && (
            <span className="ml-2 inline-flex rounded-lg border border-line p-0.5 text-xs" role="group" aria-label="How the controls combine">
              {(['AND', 'OR'] as const).map((op) => (
                <button key={op} onClick={() => set({ grant: { block: false, require, operator: op } })} aria-pressed={operator === op} className={`rounded-md px-2 py-0.5 font-semibold ${operator === op ? 'bg-ink text-paper' : 'text-muted'}`}>
                  {op === 'AND' ? 'Require all' : 'Require one'}
                </button>
              ))}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function Missions() {
  const [idx, setIdx] = useState(0)
  const mission = MISSIONS[idx]
  const [drafts, setDrafts] = useState<Record<string, Policy>>(() => Object.fromEntries(MISSIONS.map((m) => [m.id, m.start])))
  const [done, setDone] = useState<string[]>(() => load<string[]>(CA_MISSIONS_KEY, []))
  const [showHint, setShowHint] = useState(false)
  const [revealed, setRevealed] = useState<string[]>([])
  const { award } = useProgress()
  const missionTitle = useRef<HTMLHeadingElement>(null)
  const draft = drafts[mission.id]
  const results = useMemo(() => runMission(mission, draft), [mission, draft])
  const allPass = results.every((r) => r.pass)

  useEffect(() => setShowHint(false), [idx])

  useEffect(() => {
    if (!allPass || done.includes(mission.id) || revealed.includes(mission.id)) return
    const next = [...done, mission.id]
    setDone(next)
    save(CA_MISSIONS_KEY, next)
    celebrate()
    if (MISSIONS.every((m) => next.includes(m.id))) award('ca-architect')
  }, [allPass, mission.id, done, revealed, award])

  return (
    <div className="mt-4 grid gap-4">
      <div className="flex flex-wrap gap-1.5">
        {MISSIONS.map((m, i) => (
          <button
            key={m.id}
            onClick={() => setIdx(i)}
            aria-pressed={i === idx}
            className={`chip py-1 text-sm ${i === idx ? 'border-ink bg-ink text-paper' : 'border-line bg-paper'}`}
          >
            {done.includes(m.id) && <CheckCircle2 size={14} className={i === idx ? '' : 'text-join'} role="img" aria-label="Completed:" />} Mission {i + 1}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-line bg-paper p-4">
        <h3 className="text-lg font-semibold" tabIndex={-1} ref={missionTitle}>
          {mission.title}
        </h3>
        <p className="mt-1 max-w-[68ch]">{mission.goal}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn btn-ghost py-1 text-sm" onClick={() => setShowHint((v) => !v)} aria-expanded={showHint} aria-controls="ca-mission-hint">
            <Lightbulb size={15} /> {showHint ? 'Hide hint' : 'Hint'}
          </button>
          <button className="btn btn-ghost py-1 text-sm" onClick={() => {
              setRevealed((r) => [...r, mission.id])
              setDrafts((d) => ({ ...d, [mission.id]: mission.solution }))
            }}
          >
            <Eye size={15} /> Show a solution
          </button>
          <button className="btn btn-ghost py-1 text-sm" onClick={() => {
              setRevealed((r) => r.filter((x) => x !== mission.id))
              setDrafts((d) => ({ ...d, [mission.id]: mission.start }))
            }}
          >
            Reset policy
          </button>
        </div>
        {showHint && (
          <p id="ca-mission-hint" className="mt-2 rounded-lg bg-move/10 p-2.5 text-sm">
            {mission.hint}
          </p>
        )}
      </div>

      <PolicyForm p={draft} onChange={(p) => setDrafts((d) => ({ ...d, [mission.id]: p }))} />
      <p className="text-sm text-muted">
        <strong className="text-ink">Your policy:</strong> {describePolicy(draft)}
        {draft.state !== 'on' && ` (${draft.state === 'report' ? 'report-only' : 'off'})`}
      </p>

      <div className={`rounded-2xl border-2 p-4 ${allPass ? 'border-join bg-join/[.06]' : 'border-line bg-paper'}`} aria-live="polite">
        <h3 className="text-base font-semibold">{allPass ? (revealed.includes(mission.id) && !done.includes(mission.id) ? 'All tests pass with the sample solution. Reset and build it yourself to complete the mission.' : 'All tests pass. Mission complete.') : `Test sign-ins: ${results.filter((r) => r.pass).length} of ${results.length} passing`}</h3>
        <ul className="mt-2 space-y-2">
          {results.map((r) => (
            <li key={r.test.name} className="flex gap-2 text-sm">
              {r.pass ? <CheckCircle2 size={18} className="shrink-0 text-join" role="img" aria-label="Pass:" /> : <XCircle size={18} className="shrink-0 text-leave" role="img" aria-label="Fail:" />}
              <span>
                <strong>{r.test.name}.</strong> {r.why}
              </span>
            </li>
          ))}
        </ul>
        {allPass && idx < MISSIONS.length - 1 && (
          <button
            className="btn btn-key mt-3 py-1.5 text-sm"
            onClick={() => {
              setIdx(idx + 1)
              missionTitle.current?.focus() // this button goes away with the next mission
            }}
          >
            Next mission
          </button>
        )}
      </div>
    </div>
  )
}

export function CaLab() {
  const [tab, setTab] = useState<'whatif' | 'missions'>('whatif')
  return (
    <section className="my-8 rounded-[1.75rem] border-2 border-ink bg-fog p-3 sm:p-5" aria-label="Conditional Access lab">
      <Tabs
        label="Conditional Access lab"
        value={tab}
        onChange={setTab}
        tabs={[
          ['whatif', 'What If'],
          ['missions', 'Policy missions'],
        ]}
      >
        {tab === 'whatif' ? <WhatIf /> : <Missions />}
      </Tabs>
    </section>
  )
}
