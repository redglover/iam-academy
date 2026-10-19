import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, ShieldAlert, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { ACTORS, DEFAULT_OPTIONS, FLOWS, buildFlow, outcome, type Actor, type AttackId, type Credential, type FlowId, type FlowOptions, type StepKind } from './flows'
import { CodeBlock } from '../../components/CodeBlock'
import { Inline } from '../../components/Inline'
import { useProgress } from '../progress/progress'

const KIND: Record<StepKind, { line: string; dot: string; text: string }> = {
  normal: { line: 'bg-key', dot: 'bg-key', text: '' },
  attack: { line: 'bg-leave', dot: 'bg-leave', text: 'text-leave' },
  blocked: { line: 'bg-join', dot: 'bg-join', text: 'text-join' },
  breach: { line: 'bg-leave', dot: 'bg-leave', text: 'text-leave' },
  success: { line: 'bg-join', dot: 'bg-join', text: 'text-join' },
}

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <button
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border-2 border-ink transition-colors ${on ? 'bg-join' : 'bg-line'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-paper ring-1 ring-ink transition-all ${on ? 'left-[1.3rem]' : 'left-0.5'}`} />
      </button>
      <span>
        <span className="font-semibold">{label}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
    </label>
  )
}

export function OAuthSimulator() {
  const [flow, setFlow] = useState<FlowId>('authcode-pkce')
  const [opts, setOpts] = useState<FlowOptions>(DEFAULT_OPTIONS)
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const defended = useRef(new Set<AttackId>())
  const { award } = useProgress()

  const steps = useMemo(() => buildFlow(flow, opts), [flow, opts])
  const result = outcome(steps)
  const step = steps[Math.min(i, steps.length - 1)]
  const atEnd = i >= steps.length - 1
  const actors: Actor[] = opts.attack !== 'none' ? ['user', 'app', 'idp', 'api', 'attacker'] : ['user', 'app', 'idp', 'api']
  const set = (p: Partial<FlowOptions>) => {
    setOpts((o) => ({ ...o, ...p }))
    setI(0)
  }

  useEffect(() => {
    if (!playing) return
    if (atEnd) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setI((n) => n + 1), 1800)
    return () => clearTimeout(t)
  }, [playing, i, atEnd])

  useEffect(() => {
    if (!atEnd || result !== 'blocked') return
    defended.current.add(opts.attack)
    if (defended.current.has('code-interception') && defended.current.has('csrf')) award('oauth-defender')
  }, [atEnd, result, opts.attack, award])

  const col = (a: Actor) => actors.indexOf(a)
  const n = actors.length

  return (
    <section className="my-8 rounded-[1.75rem] border-2 border-ink bg-fog p-3 sm:p-5" aria-label="OAuth flow simulator">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FLOWS) as FlowId[]).map((f) => (
          <button
            key={f}
            onClick={() => {
              setFlow(f)
              set({ attack: 'none' })
            }}
            aria-pressed={f === flow}
            className={`chip py-1.5 font-display text-sm font-semibold ${f === flow ? 'border-ink bg-ink text-paper' : 'border-line bg-paper'}`}
          >
            {FLOWS[f].title}
          </button>
        ))}
      </div>
      <p className="mt-3 max-w-[68ch]">
        <strong>Use it when:</strong> {FLOWS[flow].when}
      </p>

      <div className="mt-4 grid gap-4 rounded-2xl border border-line bg-paper p-4 md:grid-cols-[1fr_1fr]">
        <div className="grid content-start gap-3">
          {flow === 'authcode-pkce' && (
            <>
              <Toggle on={opts.pkce} onChange={(v) => set({ pkce: v })} label="PKCE" hint="Proves the app redeeming the code is the one that asked for it." />
              <Toggle on={opts.state} onChange={(v) => set({ state: v })} label="State parameter" hint="Ties the callback to the request this browser started." />
            </>
          )}
          {flow === 'client-credentials' && (
            <fieldset>
              <legend className="font-semibold">How the app proves who it is</legend>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(['secret', 'certificate', 'managed-identity'] as Credential[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => set({ credential: c })}
                    aria-pressed={opts.credential === c}
                    className={`chip py-1 text-sm ${opts.credential === c ? 'border-ink bg-ink text-paper' : 'border-line'}`}
                  >
                    {c === 'secret' ? 'Client secret' : c === 'certificate' ? 'Certificate' : 'Managed identity'}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {flow === 'device-code' && (
            <Toggle
              on={opts.blockDeviceCode}
              onChange={(v) => set({ blockDeviceCode: v })}
              label="Conditional Access: block device code flow"
              hint="Entra ID policy using the “Authentication flows” condition."
            />
          )}
        </div>
        <label className="block">
          <span className="font-semibold">Attack</span>
          <select
            value={opts.attack}
            onChange={(e) => set({ attack: e.target.value as AttackId })}
            className="mt-1.5 w-full rounded-lg border-2 border-line bg-paper px-2 py-2 font-semibold"
          >
            <option value="none">No attack, the normal flow</option>
            {FLOWS[flow].attacks.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          {opts.attack !== 'none' && (
            <span className={`mt-2 flex items-center gap-1.5 text-sm font-bold ${result === 'breach' ? 'text-leave' : 'text-join'}`}>
              {result === 'breach' ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
              {result === 'breach' ? 'With these settings the attack succeeds.' : 'With these settings the attack is stopped.'}
            </span>
          )}
        </label>
      </div>

      {/* sequence diagram */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-paper p-3">
        <div className="min-w-[560px]">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {actors.map((a) => (
              <div key={a} className={`rounded-xl border-2 px-2 py-1.5 text-center ${a === 'attacker' ? 'border-leave/60 bg-leave/10' : 'border-ink'}`}>
                <p className="font-display text-sm font-bold leading-tight">{ACTORS[a].name}</p>
                <p className="text-xs text-muted">{ACTORS[a].sub}</p>
              </div>
            ))}
          </div>
          <ol className="relative mt-1">
            {/* lifelines */}
            <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} aria-hidden>
              {actors.map((a) => (
                <div key={a} className="mx-auto w-px border-l-2 border-dashed border-line" />
              ))}
            </div>
            {steps.map((s, k) => {
              const a = col(s.from)
              const b = col(s.to)
              const self = a === b
              const lo = Math.min(a, b)
              const span = Math.abs(b - a)
              const active = k === i
              const visited = k <= i
              const K = KIND[s.kind]
              return (
                <li key={k} className="relative h-11">
                  <button
                    onClick={() => setI(k)}
                    className={`absolute inset-y-1 left-0 right-0 rounded-lg transition-colors ${active ? 'bg-key/10 ring-2 ring-key' : 'hover:bg-ink/5'}`}
                    aria-label={`Step ${k + 1}: ${s.title}`}
                    aria-current={active ? 'step' : undefined}
                  />
                  {self ? (
                    <span
                      className={`pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-xs font-bold text-white ${visited ? K.dot : 'bg-line'}`}
                      style={{ left: `${((a + 0.5) / n) * 100}%` }}
                    >
                      {k + 1}
                    </span>
                  ) : (
                    <span
                      className="pointer-events-none absolute top-1/2 flex -translate-y-1/2 items-center"
                      style={{ left: `${((lo + 0.5) / n) * 100}%`, width: `${(span / n) * 100}%`, flexDirection: b > a ? 'row' : 'row-reverse' }}
                    >
                      <span className={`h-[3px] flex-1 ${visited ? K.line : 'bg-line'}`} />
                      <span
                        className={`h-0 w-0 border-y-[6px] border-y-transparent ${b > a ? 'border-l-[9px]' : 'border-r-[9px]'} ${
                          visited ? (K.line === 'bg-key' ? 'border-l-key border-r-key' : K.line === 'bg-join' ? 'border-l-join border-r-join' : 'border-l-leave border-r-leave') : 'border-l-line border-r-line'
                        }`}
                      />
                      <span className={`absolute left-1/2 -top-2.5 -translate-x-1/2 rounded-full px-1.5 text-[11px] font-bold text-white ${visited ? K.dot : 'bg-line'}`}>{k + 1}</span>
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      {/* step detail */}
      <div className="mt-4 rounded-2xl border border-line bg-paper p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">
            Step {i + 1} of {steps.length}: {ACTORS[step.from].sub}
            {step.from !== step.to && ` → ${ACTORS[step.to].sub}`}
          </p>
          <div className="flex gap-1.5">
            <button className="btn py-1 text-sm" onClick={() => setI((k) => Math.max(0, k - 1))} disabled={i === 0} aria-label="Previous step">
              <ChevronLeft size={16} />
            </button>
            <button className="btn py-1 text-sm" onClick={() => (atEnd ? setI(0) : setPlaying((p) => !p))}>
              {atEnd ? <RotateCcw size={15} /> : playing ? <Pause size={15} /> : <Play size={15} />}
              {atEnd ? 'Replay' : playing ? 'Pause' : 'Play'}
            </button>
            <button className="btn btn-key py-1 text-sm" onClick={() => setI((k) => Math.min(steps.length - 1, k + 1))} disabled={atEnd}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <h4 className={`mt-2 flex items-center gap-2 text-xl font-semibold ${KIND[step.kind].text}`}>
          {step.kind === 'success' && <CheckCircle2 size={20} />}
          {step.kind === 'breach' && <ShieldAlert size={20} />}
          {step.kind === 'blocked' && <ShieldCheck size={20} />}
          <Inline text={step.title} />
        </h4>
        <p className="mt-1 max-w-[70ch]">
          <Inline text={step.note} />
        </p>
        {step.http && <CodeBlock title="On the wire" lang="http" code={step.http} />}
      </div>
    </section>
  )
}
