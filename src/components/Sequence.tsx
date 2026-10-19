// Shared building blocks for the protocol simulators (OAuth, SAML): sequence diagram, step player, toggles.
import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, ShieldAlert, ShieldCheck } from 'lucide-react'
import { CodeBlock } from './CodeBlock'
import { Inline } from './Inline'

export type SeqKind = 'normal' | 'attack' | 'blocked' | 'breach' | 'success'

export interface SeqStep {
  from: string
  to: string
  kind: SeqKind
  title: string
  note: string
  http?: string
}

export interface SeqActor {
  id: string
  name: string
  sub: string
  danger?: boolean
}

const KIND: Record<SeqKind, { line: string; arrow: string; text: string }> = {
  normal: { line: 'bg-key', arrow: 'border-l-key border-r-key', text: '' },
  attack: { line: 'bg-leave', arrow: 'border-l-leave border-r-leave', text: 'text-leave' },
  blocked: { line: 'bg-join', arrow: 'border-l-join border-r-join', text: 'text-join' },
  breach: { line: 'bg-leave', arrow: 'border-l-leave border-r-leave', text: 'text-leave' },
  success: { line: 'bg-join', arrow: 'border-l-join border-r-join', text: 'text-join' },
}

export function seqOutcome(steps: SeqStep[]): 'breach' | 'blocked' | 'success' {
  if (steps.some((s) => s.kind === 'breach')) return 'breach'
  if (steps.some((s) => s.kind === 'blocked')) return 'blocked'
  return 'success'
}

export function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
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

/** Step index plus autoplay. Resets when `resetKey` changes. */
export function useStepPlayer(count: number, resetKey: unknown) {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const atEnd = i >= count - 1

  useEffect(() => {
    setI(0)
    setPlaying(false)
  }, [resetKey])

  useEffect(() => {
    if (!playing) return
    if (atEnd) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setI((n) => n + 1), 1800)
    return () => clearTimeout(t)
  }, [playing, i, atEnd])

  return { i: Math.min(i, count - 1), setI, playing, setPlaying, atEnd }
}

export function SequenceDiagram({ actors, steps, current, onSelect }: { actors: SeqActor[]; steps: SeqStep[]; current: number; onSelect: (i: number) => void }) {
  const n = actors.length
  const col = (id: string) => actors.findIndex((a) => a.id === id)
  const grid = { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-paper p-3">
      <div className="min-w-[560px]">
        <div className="grid gap-2" style={grid}>
          {actors.map((a) => (
            <div key={a.id} className={`rounded-xl border-2 px-2 py-1.5 text-center ${a.danger ? 'border-leave/60 bg-leave/10' : 'border-ink'}`}>
              <p className="font-display text-sm font-bold leading-tight">{a.name}</p>
              <p className="text-xs text-muted">{a.sub}</p>
            </div>
          ))}
        </div>
        <ol className="relative mt-1">
          <div className="pointer-events-none absolute inset-0 grid" style={grid} aria-hidden>
            {actors.map((a) => (
              <div key={a.id} className="mx-auto w-px border-l-2 border-dashed border-line" />
            ))}
          </div>
          {steps.map((s, k) => {
            const a = col(s.from)
            const b = col(s.to)
            const lo = Math.min(a, b)
            const active = k === current
            const visited = k <= current
            const K = KIND[s.kind]
            return (
              <li key={k} className="relative h-11">
                <button
                  onClick={() => onSelect(k)}
                  className={`absolute inset-y-1 left-0 right-0 rounded-lg transition-colors ${active ? 'bg-key/10 ring-2 ring-key' : 'hover:bg-ink/5'}`}
                  aria-label={`Step ${k + 1}: ${s.title.replace(/\*/g, '')}`}
                  aria-current={active ? 'step' : undefined}
                />
                {a === b ? (
                  <span
                    className={`pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-xs font-bold text-white ${visited ? K.line : 'bg-line'}`}
                    style={{ left: `${((a + 0.5) / n) * 100}%` }}
                  >
                    {k + 1}
                  </span>
                ) : (
                  <span
                    className="pointer-events-none absolute top-1/2 flex -translate-y-1/2 items-center"
                    style={{ left: `${((lo + 0.5) / n) * 100}%`, width: `${(Math.abs(b - a) / n) * 100}%`, flexDirection: b > a ? 'row' : 'row-reverse' }}
                  >
                    <span className={`h-[3px] flex-1 ${visited ? K.line : 'bg-line'}`} />
                    <span
                      className={`h-0 w-0 border-y-[6px] border-y-transparent ${b > a ? 'border-l-[9px]' : 'border-r-[9px]'} ${visited ? K.arrow : 'border-l-line border-r-line'}`}
                    />
                    <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-1.5 text-[11px] font-bold text-white ${visited ? K.line : 'bg-line'}`}>
                      {k + 1}
                    </span>
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

export function StepDetail({
  steps,
  actors,
  player,
}: {
  steps: SeqStep[]
  actors: SeqActor[]
  player: ReturnType<typeof useStepPlayer>
}) {
  const { i, setI, playing, setPlaying, atEnd } = player
  const step = steps[i]
  const name = (id: string) => actors.find((a) => a.id === id)?.sub ?? id
  return (
    <div className="mt-4 rounded-2xl border border-line bg-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Step {i + 1} of {steps.length}: {name(step.from)}
          {step.from !== step.to && ` → ${name(step.to)}`}
        </p>
        <div className="flex gap-1.5">
          <button className="btn py-1 text-sm" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} aria-label="Previous step">
            <ChevronLeft size={16} />
          </button>
          <button className="btn py-1 text-sm" onClick={() => (atEnd ? setI(0) : setPlaying(!playing))}>
            {atEnd ? <RotateCcw size={15} /> : playing ? <Pause size={15} /> : <Play size={15} />}
            {atEnd ? 'Replay' : playing ? 'Pause' : 'Play'}
          </button>
          <button className="btn btn-key py-1 text-sm" onClick={() => setI(Math.min(steps.length - 1, i + 1))} disabled={atEnd}>
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
      {step.http && <CodeBlock title="On the wire" lang={step.http.trimStart().startsWith('<') ? 'xml' : 'http'} code={step.http} />}
    </div>
  )
}

export function AttackVerdict({ result }: { result: 'breach' | 'blocked' | 'success' }) {
  return (
    <span className={`mt-2 flex items-center gap-1.5 text-sm font-bold ${result === 'breach' ? 'text-leave' : 'text-join'}`}>
      {result === 'breach' ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
      {result === 'breach' ? 'With these settings the attack succeeds.' : 'With these settings the attack is stopped.'}
    </span>
  )
}
