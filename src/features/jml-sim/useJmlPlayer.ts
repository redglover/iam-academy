import { useCallback, useEffect, useRef, useState } from 'react'
import { emptyIdentity, type Identity, type Persona } from './model'
import { plan, runAll, type HrEvent, type Mode, type Step } from './engine'

export interface LogEntry {
  event: HrEvent
  mode: Mode
  steps: Step[]
}

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Plays a JML plan one step at a time so learners can follow along. */
export function useJmlPlayer(persona: Persona, speedMs = 420) {
  const [base, setBase] = useState<Identity>(() => emptyIdentity(persona))
  const [log, setLog] = useState<LogEntry[]>([])
  const [shown, setShown] = useState(0)
  const timer = useRef<number>()

  const current = log.length ? log[log.length - 1] : null
  const steps = current?.steps ?? []
  const who = runAll(base, steps.slice(0, shown))
  const playing = shown < steps.length

  useEffect(() => {
    if (!playing) return
    timer.current = window.setTimeout(() => setShown((n) => n + 1), reducedMotion() ? 0 : speedMs)
    return () => window.clearTimeout(timer.current)
  }, [playing, shown, speedMs])

  const fire = useCallback(
    (event: HrEvent, mode: Mode) => {
      // Commit whatever is on screen as the new starting point.
      const start = runAll(base, steps)
      const next = plan(event, start, persona, mode)
      setBase(start)
      setLog((l) => [...l, { event, mode, steps: next }])
      setShown(0)
    },
    [base, steps, persona],
  )

  const skip = useCallback(() => setShown(steps.length), [steps.length])

  const reset = useCallback(() => {
    setBase(emptyIdentity(persona))
    setLog([])
    setShown(0)
  }, [persona])

  useEffect(() => {
    reset()
  }, [reset])

  return { who, log, shown, playing, fire, skip, reset }
}
