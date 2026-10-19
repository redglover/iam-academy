import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, CircleAlert, Info, Plus, RotateCcw, Sparkles, TriangleAlert, X } from 'lucide-react'
import { SCENARIOS, score, toScript, type Scenario } from './pipeline'
import { CodeBlock } from '../../components/CodeBlock'
import { useProgress } from '../progress/progress'

const ISSUE_STYLE = {
  error: { icon: CircleAlert, cls: 'text-leave' },
  warn: { icon: TriangleAlert, cls: 'text-move' },
  tip: { icon: Info, cls: 'text-key' },
}

export function PipelineBuilder() {
  const [scenarioId, setScenarioId] = useState<Scenario['id']>('leaver')
  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!
  const [byScenario, setByScenario] = useState<Record<string, string[]>>({ leaver: ['trigger'], joiner: ['trigger'] })
  const ids = byScenario[scenarioId]
  const setIds = (fn: (ids: string[]) => string[]) => setByScenario((m) => ({ ...m, [scenarioId]: fn(m[scenarioId]) }))
  const { award } = useProgress()

  const issues = useMemo(() => scenario.validate(ids), [scenario, ids])
  const pts = score(issues)
  const toolbox = scenario.blocks.filter((b) => !ids.includes(b.id))

  useEffect(() => {
    if (pts === 100 && ids.length > 3) award('pipeline-100')
  }, [pts, ids.length, award])

  const move = (i: number, d: -1 | 1) =>
    setIds((a) => {
      const j = i + d
      if (j < 0 || j >= a.length) return a
      const b = [...a]
      ;[b[i], b[j]] = [b[j], b[i]]
      return b
    })

  return (
    <section className="my-8 rounded-[1.75rem] border-2 border-ink bg-fog p-3 sm:p-5" aria-label="Automation pipeline builder">
      <div className="flex flex-wrap items-center gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => setScenarioId(s.id)}
            aria-pressed={s.id === scenarioId}
            className={`chip py-1.5 font-display text-sm font-semibold ${s.id === scenarioId ? 'border-ink bg-ink text-paper' : 'border-line bg-paper'}`}
          >
            {s.title}
          </button>
        ))}
        <button className="btn btn-ghost ml-auto py-1.5 text-sm" onClick={() => setIds(() => ['trigger'])}>
          <RotateCcw size={15} /> Start over
        </button>
      </div>
      <p className="mt-3 max-w-[68ch]">
        <strong>Goal:</strong> {scenario.goal}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* toolbox */}
        <div className="rounded-2xl border border-line bg-paper p-4">
          <h4 className="text-base font-semibold">Toolbox</h4>
          <p className="text-sm text-muted">Not every block belongs in a good runbook.</p>
          <ul className="mt-3 grid gap-2">
            {toolbox.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => setIds((a) => [...a, b.id])}
                  className="group flex w-full items-start gap-3 rounded-xl border-2 border-dashed border-line px-3 py-2 text-left hover:border-auto hover:bg-auto/5"
                >
                  <Plus size={18} className="mt-0.5 shrink-0 text-auto" />
                  <span>
                    <span className="font-semibold">{b.label}</span>
                    <span className="block text-sm text-muted">{b.hint}</span>
                  </span>
                </button>
              </li>
            ))}
            {!toolbox.length && <li className="text-sm text-muted">Every block is in use. Are you sure they all belong?</li>}
          </ul>
        </div>

        {/* pipeline */}
        <div className="grid content-start gap-4">
          <div className="rounded-2xl border border-line bg-paper p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold">Your pipeline</h4>
              <ScoreMeter pts={pts} />
            </div>
            <ol className="mt-3 grid gap-1.5">
              <AnimatePresence initial={false}>
                {ids.map((id, i) => {
                  const b = scenario.blocks.find((x) => x.id === id)!
                  return (
                    <motion.li
                      key={id}
                      layout
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2 rounded-xl border-2 border-auto/40 bg-auto/[.06] py-1.5 pl-3 pr-1.5"
                    >
                      <span className="w-6 shrink-0 font-display font-bold text-auto">{i + 1}</span>
                      <span className="min-w-0 flex-1 font-semibold">{b.label}</span>
                      <button className="rounded-md p-1.5 hover:bg-ink/10 disabled:opacity-30" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${b.label} up`}>
                        <ArrowUp size={16} />
                      </button>
                      <button className="rounded-md p-1.5 hover:bg-ink/10 disabled:opacity-30" onClick={() => move(i, 1)} disabled={i === ids.length - 1} aria-label={`Move ${b.label} down`}>
                        <ArrowDown size={16} />
                      </button>
                      <button className="rounded-md p-1.5 hover:bg-leave/15" onClick={() => setIds((a) => a.filter((x) => x !== id))} aria-label={`Remove ${b.label}`}>
                        <X size={16} />
                      </button>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ol>
          </div>

          <div className="rounded-2xl border border-line bg-paper p-4" aria-live="polite">
            <h4 className="flex items-center gap-2 text-base font-semibold">
              <Sparkles size={17} className="text-auto" /> Senior engineer review
            </h4>
            {issues.length === 0 ? (
              <p className="mt-2 font-semibold text-join">Ship it. Ordered, idempotent, logged and safe to re-run.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {issues.map((iss, i) => {
                  const S = ISSUE_STYLE[iss.level]
                  return (
                    <li key={i} className="flex gap-2 text-sm">
                      <S.icon size={17} className={`mt-0.5 shrink-0 ${S.cls}`} aria-label={iss.level} />
                      <span>{iss.message}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <CodeBlock title="Generated runbook" lang="powershell" code={toScript(scenario, ids)} />
    </section>
  )
}

function ScoreMeter({ pts }: { pts: number }) {
  const color = pts >= 90 ? 'bg-join' : pts >= 60 ? 'bg-move' : 'bg-leave'
  return (
    <div className="flex items-center gap-2" aria-label={`Score ${pts} of 100`}>
      <div className="h-2.5 w-24 overflow-hidden rounded-full bg-line">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pts}%` }} />
      </div>
      <span className="w-9 text-right font-display font-bold tabular-nums">{pts}</span>
    </div>
  )
}
