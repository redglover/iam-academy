import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Bot, CheckCircle2, FastForward, Hand, RotateCcw, ShieldAlert } from 'lucide-react'
import { DEPARTMENTS, PERSONAS, SYSTEMS, type Department } from './model'
import { findings, formatElapsed, type Mode, type StepKind } from './engine'
import { IdBadge } from './IdBadge'
import { useJmlPlayer } from './useJmlPlayer'
import { useProgress } from '../progress/progress'

const KIND_STYLE: Record<StepKind, string> = {
  event: 'bg-key',
  decide: 'bg-auto',
  add: 'bg-join',
  remove: 'bg-leave',
  notify: 'bg-auto',
  wait: 'bg-muted',
  warn: 'bg-move',
}

const EVENT_NAME = { joiner: 'Joiner', mover: 'Mover', leaver: 'Leaver' } as const

export function JmlSimulator() {
  const [personaKey, setPersonaKey] = useState(PERSONAS[0].key)
  const persona = PERSONAS.find((p) => p.key === personaKey)!
  const [mode, setMode] = useState<Mode>('manual')
  const [dept, setDept] = useState<Department>('Sales')
  const { who, log, shown, playing, fire, skip, reset } = useJmlPlayer(persona)
  const { award, addXp } = useProgress()
  const logEnd = useRef<HTMLLIElement>(null)

  const issues = useMemo(() => findings(who), [who])
  const canHire = who.status === 'none'
  const canMove = who.status === 'active'
  const canLeave = who.status === 'active' || who.status === 'pre-hire'
  const moveTargets = DEPARTMENTS.filter((d) => d !== who.department)

  useEffect(() => {
    if (!moveTargets.includes(dept) && !canHire) setDept(moveTargets[0])
  }, [who.department])

  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [shown, log.length])

  // Achievements, evaluated when a run finishes.
  useEffect(() => {
    if (playing || !log.length) return
    addXp(10)
    if (issues.length >= 3 && log.some((l) => l.mode === 'manual')) award('jml-manual')
    const autoTypes = new Set(log.filter((l) => l.mode === 'automated').map((l) => l.event.type))
    if (autoTypes.size === 3 && log.every((l) => l.mode === 'automated') && issues.length === 0) award('jml-auto')
  }, [playing, log.length])

  const last = log[log.length - 1]
  const elapsed = last && !playing ? last.steps[last.steps.length - 1]?.at ?? 0 : null

  return (
    <section className="not-prose my-8 rounded-[1.75rem] border-2 border-ink bg-fog p-3 sm:p-5" aria-label="JML simulator">
      {/* controls */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Person</legend>
          <div className="flex flex-wrap gap-1.5">
            {PERSONAS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPersonaKey(p.key)}
                aria-pressed={p.key === personaKey}
                className={`chip py-1.5 text-sm ${p.key === personaKey ? 'border-ink bg-ink text-paper' : 'border-line bg-paper hover:border-ink'}`}
              >
                <span aria-hidden>{p.emoji}</span> {p.name.split(' ')[0]}
                {p.type === 'contractor' && <span className="opacity-70">(contractor)</span>}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">How Fjordtech works</legend>
          <div className="inline-flex rounded-xl border-2 border-ink bg-paper p-0.5">
            {(['manual', 'automated'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-display text-sm font-semibold ${
                  mode === m ? (m === 'manual' ? 'bg-move text-white' : 'bg-auto text-white') : 'text-muted'
                }`}
              >
                {m === 'manual' ? <Hand size={15} /> : <Bot size={15} />}
                {m === 'manual' ? 'Manual tickets' : 'Automated IAM'}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-paper p-3">
        <span className="mr-1 text-sm font-semibold">HR event:</span>
        {(canHire || canMove) && (
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">Department</span>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value as Department)}
              className="rounded-lg border-2 border-line bg-paper px-2 py-1.5 font-semibold"
              disabled={playing}
            >
              {(canHire ? DEPARTMENTS : moveTargets).map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
        )}
        <button className="btn border-join py-1.5 text-sm" disabled={!canHire || playing} onClick={() => fire({ type: 'joiner', dept }, mode)}>
          Hire into {canHire ? dept : '…'}
        </button>
        <button className="btn border-move py-1.5 text-sm" disabled={!canMove || playing} onClick={() => fire({ type: 'mover', dept }, mode)}>
          Transfer to {canMove ? dept : '…'}
        </button>
        <button className="btn border-leave py-1.5 text-sm" disabled={!canLeave || playing} onClick={() => fire({ type: 'leaver' }, mode)}>
          Terminate
        </button>
        <span className="ml-auto flex gap-1">
          {playing && (
            <button className="btn btn-ghost py-1.5 text-sm" onClick={skip}>
              <FastForward size={15} /> Skip
            </button>
          )}
          <button className="btn btn-ghost py-1.5 text-sm" onClick={reset} disabled={!log.length}>
            <RotateCcw size={15} /> Reset
          </button>
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div>
          <IdBadge who={who} />
        </div>

        <div className="grid min-w-0 content-start gap-4">
          {/* audit log */}
          <div className="rounded-2xl border border-line bg-paper">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <h4 className="text-base font-semibold">Audit log</h4>
              {elapsed !== null && (
                <span className={`chip text-xs ${last.mode === 'manual' ? 'border-move/50 text-move' : 'border-auto/50 text-auto'}`}>
                  {EVENT_NAME[last.event.type]} took {formatElapsed(elapsed).slice(1)}
                </span>
              )}
            </div>
            <ol className="max-h-[22rem] space-y-0 overflow-y-auto px-4 py-3" aria-live="polite">
              {!log.length && (
                <li className="py-8 text-center text-muted">
                  Pick a person and a department, then fire an HR event. Each step shows up here as the system performs it.
                </li>
              )}
              {log.map((entry, li) => {
                const visible = li === log.length - 1 ? entry.steps.slice(0, shown) : entry.steps
                return (
                  <li key={li} className="mb-3">
                    <p className={`mb-1.5 text-sm font-bold ${entry.mode === 'manual' ? 'text-move' : 'text-auto'}`}>
                      {EVENT_NAME[entry.event.type]}, {entry.mode === 'manual' ? 'manual' : 'automated'}
                    </p>
                    <ol className="space-y-1.5 border-l-2 border-line pl-4">
                      {visible.map((s, i) => (
                        <li key={i} className="relative">
                          <span className={`absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-paper ${KIND_STYLE[s.kind]}`} aria-hidden />
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-mono text-xs text-muted">{formatElapsed(s.at)}</span>
                            <span className="rounded bg-fog px-1.5 text-xs font-bold">{SYSTEMS[s.system].short}</span>
                            <span className={s.kind === 'warn' ? 'font-semibold text-move' : ''}>{s.label}</span>
                          </div>
                          {s.detail && <p className="text-sm text-muted">{s.detail}</p>}
                        </li>
                      ))}
                    </ol>
                  </li>
                )
              })}
              <li ref={logEnd} aria-hidden />
            </ol>
          </div>

          {/* findings */}
          <div className={`rounded-2xl border-2 p-4 ${issues.length ? 'border-leave/50 bg-leave/[.05]' : 'border-join/40 bg-join/[.05]'}`}>
            <h4 className="flex items-center gap-2 text-base font-semibold">
              {issues.length ? <ShieldAlert className="text-leave" size={18} /> : <CheckCircle2 className="text-join" size={18} />}
              Auditor findings: {issues.length}
            </h4>
            {issues.length === 0 ? (
              <p className="mt-1 text-sm text-muted">
                {who.status === 'none' ? 'Nothing to audit yet.' : 'Access matches policy. Nothing an auditor would flag.'}
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {issues.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <AlertTriangle size={16} className={`mt-0.5 shrink-0 ${f.severity === 'high' ? 'text-leave' : 'text-move'}`} />
                    <span>
                      <strong>{f.title}.</strong> {f.detail}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
