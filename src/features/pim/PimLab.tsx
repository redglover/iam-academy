import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, FastForward, KeyRound, RotateCcw, ShieldCheck, Trash2, UserCheck, XCircle } from 'lucide-react'
import { ACTIVATION_ASSIGNMENTS, GOOD_SETTINGS, MESSY_ASSIGNMENTS, MESSY_GA_SETTINGS, ROLES, formatClock, person, type Method, type RoleId, type RoleSettings } from './model'
import { activeUntil, advanceClock, applyDecisions, approve, auditScore, auditTenant, deactivate, deny, requestActivation, validateActivation, type Decision, type PimState } from './engine'
import { Toggle } from '../../components/Sequence'
import { useProgress } from '../progress/progress'
import { celebrate } from '../../lib/confetti'

const TIER_STYLE = { 0: 'border-leave/50 bg-leave/10 text-leave', 1: 'border-move/50 bg-move/10 text-move', 2: 'border-line text-muted' } as const
const input = 'w-full rounded-lg border-2 border-line bg-paper px-2.5 py-1.5 text-sm focus:border-key'
const fresh = (): PimState => ({ now: 0, assignments: ACTIVATION_ASSIGNMENTS, settings: GOOD_SETTINGS, requests: [], log: [] })

function TierChip({ role }: { role: RoleId }) {
  const r = ROLES[role]
  return <span className={`chip text-xs font-bold ${TIER_STYLE[r.tier]}`}>Tier {r.tier}</span>
}

function ActivateTab() {
  const [state, setState] = useState<PimState>(fresh)
  const [me, setMe] = useState<'erik' | 'nora'>('erik')
  const [role, setRole] = useState<RoleId>('ga')
  const [hours, setHours] = useState(2)
  const [justification, setJustification] = useState('')
  const [ticket, setTicket] = useState('')
  const [method, setMethod] = useState<Method>('authenticator')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const { award } = useProgress()

  const mine = state.assignments.filter((a) => a.principal === me && a.type === 'eligible')
  const set = state.settings[role]
  const errors = validateActivation(state, { principal: me, role, hours, justification, ticket, method })
  const pending = state.requests.filter((r) => r.status === 'pending')

  useEffect(() => {
    const first = state.assignments.find((a) => a.principal === me && a.type === 'eligible')
    if (first) setRole(first.role)
    setMethod('authenticator')
    setMessage(null)
  }, [me]) // only when switching person

  useEffect(() => {
    if (state.requests.some((r) => r.status === 'expired' && r.approver)) award('pim-activator')
  }, [state.requests, award])

  const run = (fn: () => { state: PimState; result: { ok: true; message: string } | { ok: false; errors: string[] } }) => {
    const r = fn()
    setState(r.state)
    setMessage(r.result.ok ? { ok: true, text: r.result.message } : { ok: false, text: r.result.errors.join(' ') })
  }

  return (
    <div className="mt-4 grid gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-paper p-3">
        <span className="flex items-center gap-1.5 font-display text-lg font-bold">
          <Clock size={18} /> {formatClock(state.now)}
        </span>
        <button className="btn py-1 text-sm" onClick={() => {
            setState((s) => advanceClock(s, 60))
            setMessage(null)
          }}>
          <FastForward size={15} /> +1 h
        </button>
        <button className="btn py-1 text-sm" onClick={() => {
            setState((s) => advanceClock(s, 240))
            setMessage(null)
          }}>
          <FastForward size={15} /> +4 h
        </button>
        <button
          className="btn btn-ghost ml-auto py-1 text-sm"
          onClick={() => {
            setState(fresh())
            setMessage(null)
          }}
        >
          <RotateCcw size={15} /> Reset
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid content-start gap-4">
          <div className="rounded-2xl border border-line bg-paper p-4">
            <p className="text-sm font-semibold">You are</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(['erik', 'nora'] as const).map((id) => {
                const p = person(id)
                return (
                  <button key={id} onClick={() => setMe(id)} aria-pressed={me === id} className={`chip py-1.5 text-sm ${me === id ? 'border-ink bg-ink text-paper' : 'border-line bg-paper'}`}>
                    <span aria-hidden>{p.emoji}</span> {p.name}, {p.title}
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-sm font-semibold">My roles</p>
            <ul className="mt-1.5 grid gap-1.5">
              {mine.map((a) => {
                const until = activeUntil(state, me, a.role)
                const isPending = pending.some((r) => r.principal === me && r.role === a.role)
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => setRole(a.role)}
                      aria-pressed={role === a.role}
                      className={`flex w-full flex-wrap items-center gap-2 rounded-xl border-2 px-3 py-2 text-left ${role === a.role ? 'border-key bg-key/5' : 'border-line hover:border-ink'}`}
                    >
                      <TierChip role={a.role} />
                      <span className="min-w-0 flex-1 font-semibold">{ROLES[a.role].name}</span>
                      <span className={`text-sm font-semibold ${until !== null ? 'text-join' : isPending ? 'text-move' : 'text-muted'}`}>
                        {until !== null ? `Active until ${formatClock(until)}` : isPending ? 'Pending approval' : 'Eligible'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-paper p-4">
            <h4 className="text-base font-semibold">Activate {ROLES[role].name}</h4>
            <p className="mt-1 text-xs text-muted">
              Role settings: max {set.maxHours} h, {set.mfa === 'phishing-resistant' ? 'phishing-resistant MFA' : 'MFA'}
              {set.requireJustification && ', justification'}
              {set.requireTicket && ', ticket number'}
              {set.requireApproval ? `, approval by ${set.approvers.map((a) => person(a).name).join(', ')}` : ', no approval'}.
            </p>
            <div className="mt-3 grid gap-3">
              <label className="block text-sm">
                <span className="font-semibold">
                  Duration: {hours} h <span className="font-normal text-muted">(max {set.maxHours} h)</span>
                </span>
                <input type="range" min={1} max={8} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="mt-1 w-full accent-[rgb(var(--key))]" />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Justification</span>
                <input className={`${input} mt-1`} value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Update the Conditional Access policy for guests" />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Ticket number</span>
                <input className={`${input} mt-1`} value={ticket} onChange={(e) => setTicket(e.target.value)} placeholder="CHG-1042" />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Sign-in method used for this activation</span>
                <select className={`${input} mt-1 font-semibold`} value={method} onChange={(e) => setMethod(e.target.value as Method)}>
                  <option value="authenticator">Authenticator app push</option>
                  <option value="fido2">FIDO2 security key</option>
                </select>
              </label>
            </div>
            {errors.length > 0 && (
              <ul className="mt-3 space-y-1">
                {errors.map((e) => (
                  <li key={e} className="flex gap-1.5 text-sm text-leave">
                    <XCircle size={16} className="mt-0.5 shrink-0" /> {e}
                  </li>
                ))}
              </ul>
            )}
            <button className="btn btn-key mt-3" disabled={errors.length > 0} onClick={() => run(() => requestActivation(state, { principal: me, role, hours, justification, ticket, method }))}>
              <KeyRound size={16} /> Activate
            </button>
            {message && <p className={`mt-2 text-sm font-semibold ${message.ok ? 'text-join' : 'text-leave'}`} role="status">{message.text}</p>}
          </div>
        </div>

        <div className="grid content-start gap-4">
          <div className="rounded-2xl border border-line bg-paper p-4">
            <h4 className="flex items-center gap-2 text-base font-semibold">
              <UserCheck size={17} /> Approvals inbox
            </h4>
            {pending.length === 0 ? (
              <p className="mt-1 text-sm text-muted">No pending requests.</p>
            ) : (
              <ul className="mt-2 grid gap-2">
                {pending.map((r) => (
                  <li key={r.id} className="rounded-xl border-2 border-move/50 bg-move/[.05] p-3 text-sm">
                    <p>
                      <strong>{person(r.principal).name}</strong> wants <strong>{ROLES[r.role].name}</strong> for {r.hours} h.
                    </p>
                    <p className="text-muted">
                      “{r.justification}” {r.ticket && `(${r.ticket})`}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button className="btn border-join py-1 text-sm" onClick={() => run(() => approve(state, r.id, 'marte'))}>
                        Approve as Marte
                      </button>
                      <button className="btn border-leave py-1 text-sm" onClick={() => run(() => deny(state, r.id, 'marte', 'No approved change for this'))}>
                        Deny as Marte
                      </button>
                      <button className="btn btn-ghost py-1 text-sm" onClick={() => run(() => approve(state, r.id, r.principal))}>
                        Approve it yourself
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-paper p-4">
            <h4 className="text-base font-semibold">What {person(me).name} can do right now</h4>
            <ul className="mt-2 space-y-1.5 text-sm">
              {mine.map((a) => {
                const until = activeUntil(state, me, a.role)
                return (
                  <li key={a.id} className={`flex gap-2 ${until !== null ? '' : 'text-muted'}`}>
                    {until !== null ? <ShieldCheck size={16} className="mt-0.5 shrink-0 text-join" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
                    <span>
                      <strong>{ROLES[a.role].name}:</strong>{' '}
                      {until !== null ? (
                        <>
                          {ROLES[a.role].can}
                          {state.requests.find((r) => r.principal === me && r.role === a.role && r.status === 'active') && (
                            <button className="ml-2 text-key underline" onClick={() => setState((s) => deactivate(s, s.requests.find((r) => r.principal === me && r.role === a.role && r.status === 'active')!.id))}>
                              Deactivate
                            </button>
                          )}
                        </>
                      ) : (
                        'not active. Eligible only, so no admin rights.'
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-paper p-4">
            <h4 className="text-base font-semibold">Audit log</h4>
            {state.log.length === 0 ? (
              <p className="mt-1 text-sm text-muted">Every request, approval, activation and expiry is recorded here.</p>
            ) : (
              <ol className="mt-2 space-y-1.5 border-l-2 border-line pl-4 text-sm">
                {state.log.map((l, i) => (
                  <li key={i} className="relative">
                    <span
                      className={`absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-paper ${
                        l.kind === 'error' || l.kind === 'deny' ? 'bg-leave' : l.kind === 'activate' || l.kind === 'approve' ? 'bg-join' : l.kind === 'expire' ? 'bg-auto' : 'bg-key'
                      }`}
                      aria-hidden
                    />
                    <span className="font-mono text-xs text-muted">{formatClock(l.at)}</span> <strong>{l.actor}:</strong> {l.text}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CleanupTab() {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  const [ga, setGa] = useState<RoleSettings>(MESSY_GA_SETTINGS)
  const { award } = useProgress()
  const celebrated = useRef(false)
  const result = useMemo(() => applyDecisions(MESSY_ASSIGNMENTS, decisions), [decisions])
  const findings = useMemo(() => auditTenant(result, ga), [result, ga])
  const highs = findings.filter((f) => f.severity === 'high').length
  const score = auditScore(findings)

  useEffect(() => {
    if (highs === 0) award('pim-cleaner')
    if (findings.length === 0 && !celebrated.current) {
      celebrated.current = true
      celebrate()
    }
  }, [highs, findings.length, award])

  const setG = (p: Partial<RoleSettings>) => setGa((g) => ({ ...g, ...p }))

  return (
    <div className="mt-4 grid gap-4">
      <div className="rounded-2xl border border-line bg-paper p-4">
        <h4 className="text-base font-semibold">Fjordtech’s privileged role assignments today</h4>
        <p className="text-sm text-muted">Everything is permanent and active. Decide what each assignment should become.</p>
        <ul className="mt-3 grid gap-2">
          {MESSY_ASSIGNMENTS.map((a) => {
            const p = person(a.principal)
            const d = decisions[a.id] ?? 'keep'
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-2.5">
                <span className="text-xl" aria-hidden>
                  {p.emoji}
                </span>
                <span className="min-w-[10rem] flex-1">
                  <span className="font-semibold">{p.name}</span>
                  <span className="block text-xs text-muted">{p.title}</span>
                </span>
                <span className="flex min-w-[12rem] flex-1 items-center gap-1.5 text-sm">
                  <TierChip role={a.role} /> {ROLES[a.role].name}
                </span>
                <span className="inline-flex rounded-lg border border-line p-0.5 text-xs" role="group" aria-label={`Decision for ${p.name}`}>
                  {(
                    [
                      ['keep', 'Keep permanent'],
                      ['eligible', 'Make eligible'],
                      ['remove', 'Remove'],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      onClick={() => setDecisions((m) => ({ ...m, [a.id]: v }))}
                      aria-pressed={d === v}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold ${d === v ? (v === 'remove' ? 'bg-leave text-white' : v === 'eligible' ? 'bg-join text-white' : 'bg-ink text-paper') : 'text-muted'}`}
                    >
                      {v === 'remove' && <Trash2 size={12} />}
                      {label}
                    </button>
                  ))}
                </span>
              </li>
            )
          })}
        </ul>
        <p className="mt-2 text-xs text-muted">“Make eligible” creates a time-bound eligible assignment that expires after 180 days.</p>
      </div>

      <div className="rounded-2xl border border-line bg-paper p-4">
        <h4 className="text-base font-semibold">Global Administrator role settings</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-semibold">Maximum activation duration</span>
            <select className={`${input} mt-1 font-semibold`} value={ga.maxHours} onChange={(e) => setG({ maxHours: Number(e.target.value) })}>
              {[1, 2, 4, 8, 24].map((h) => (
                <option key={h} value={h}>
                  {h} hours
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-semibold">On activation, require</span>
            <select className={`${input} mt-1 font-semibold`} value={ga.mfa} onChange={(e) => setG({ mfa: e.target.value as RoleSettings['mfa'] })}>
              <option value="mfa">Any Entra MFA</option>
              <option value="phishing-resistant">Auth context: phishing-resistant MFA</option>
            </select>
          </label>
          <Toggle on={ga.requireJustification} onChange={(v) => setG({ requireJustification: v })} label="Require justification" hint="Why is this person becoming admin?" />
          <Toggle on={ga.requireTicket} onChange={(v) => setG({ requireTicket: v })} label="Require ticket information" hint="Link to a change or incident." />
          <Toggle on={ga.requireApproval} onChange={(v) => setG({ requireApproval: v })} label="Require approval to activate" hint="A second person signs off." />
          {ga.requireApproval && (
            <div className="text-sm">
              <p className="font-semibold">Approvers</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {['marte', 'erik'].map((id) => (
                  <button
                    key={id}
                    onClick={() => setG({ approvers: ga.approvers.includes(id) ? ga.approvers.filter((x) => x !== id) : [...ga.approvers, id] })}
                    aria-pressed={ga.approvers.includes(id)}
                    className={`chip py-1 text-sm ${ga.approvers.includes(id) ? 'border-ink bg-ink text-paper' : 'border-line'}`}
                  >
                    {person(id).name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`rounded-2xl border-2 p-4 ${findings.length === 0 ? 'border-join bg-join/[.06]' : highs ? 'border-leave/50 bg-leave/[.04]' : 'border-move/50 bg-move/[.04]'}`} aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-base font-semibold">
            {findings.length === 0 ? 'Zero standing privilege, except break-glass. Well done.' : `Findings: ${highs} high, ${findings.length - highs} medium`}
          </h4>
          <span className="font-display text-2xl font-bold tabular-nums">{score}/100</span>
        </div>
        <ul className="mt-2 space-y-1.5">
          {findings.map((f, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <AlertTriangle size={16} className={`mt-0.5 shrink-0 ${f.severity === 'high' ? 'text-leave' : 'text-move'}`} aria-label={f.severity} />
              {f.text}
            </li>
          ))}
          {findings.length === 0 && (
            <li className="flex gap-2 text-sm">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-join" /> Admins activate when needed, with phishing-resistant MFA, a reason, a ticket and a second pair of eyes. Break-glass stays ready.
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

export function PimLab() {
  const [tab, setTab] = useState<'activate' | 'cleanup'>('activate')
  return (
    <section className="my-8 rounded-[1.75rem] border-2 border-ink bg-fog p-3 sm:p-5" aria-label="PIM lab">
      <div className="flex flex-wrap gap-2" role="tablist">
        {(
          [
            ['activate', 'Activate a role'],
            ['cleanup', 'Clean up standing access'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`chip py-1.5 font-display text-sm font-semibold ${tab === id ? 'border-ink bg-ink text-paper' : 'border-line bg-paper'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'activate' ? <ActivateTab /> : <CleanupTab />}
    </section>
  )
}
