import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { load, save } from '../../lib/storage'

export const BADGES = {
  'first-quiz': { name: 'First steps', emoji: '🎓', how: 'Finish your first quiz' },
  'perfect-quiz': { name: 'Flawless', emoji: '💯', how: 'Get every answer right in a quiz' },
  'jml-auto': { name: 'Automator', emoji: '🤖', how: 'Run a full joiner → mover → leaver in automated mode' },
  'jml-manual': { name: 'Learned the hard way', emoji: '🔥', how: 'Find 3+ issues in manual mode' },
  'pipeline-100': { name: 'Runbook reviewer', emoji: '🛠️', how: 'Score 100 on a pipeline' },
  'rbac-clean': { name: 'Role architect', emoji: '🧩', how: 'Build roles with zero SoD conflicts or excess access' },
  'oauth-defender': { name: 'Token guardian', emoji: '🛡️', how: 'Stop both authorization code attacks in the OAuth simulator' },
  'oauth-real': { name: 'Signed in for real', emoji: '🔑', how: 'Complete a real sign-in in the OAuth playground' },
  'saml-defender': { name: 'Assertion checker', emoji: '📜', how: 'Handle all four SAML scenarios safely in the simulator' },
  'saml-inspector': { name: 'SAML tracer', emoji: '🔍', how: 'Decode a SAML message in the inspector' },
  'scim-cycle': { name: 'Provisioner', emoji: '🔄', how: 'See a create, an update and a deactivate in SCIM provisioning cycles' },
  'scim-console': { name: 'API whisperer', emoji: '📡', how: 'Send a successful request in the SCIM console' },
  'ca-detective': { name: 'What If detective', emoji: '🕵️', how: 'Try 5 different sign-ins in the Conditional Access What If tool' },
  'ca-architect': { name: 'Policy architect', emoji: '🏛️', how: 'Complete every Conditional Access mission' },
  'pim-activator': { name: 'Just in time', emoji: '⏱️', how: 'See an approved PIM activation through to automatic expiry' },
  'pim-cleaner': { name: 'Zero standing privilege', emoji: '🧹', how: 'Clear every high finding in the PIM clean-up' },
  'review-ace': { name: 'Eagle-eyed reviewer', emoji: '🦅', how: 'Catch every risky line in the access review' },
  graduate: { name: 'IAM graduate', emoji: '🏅', how: 'Complete every module' },
} as const

export type BadgeId = keyof typeof BADGES

interface State {
  xp: number
  completed: string[]
  quizBest: Record<string, number>
  badges: BadgeId[]
}

interface Ctx extends State {
  addXp: (n: number) => void
  completeModule: (slug: string) => void
  recordQuiz: (slug: string, correct: number, total: number) => void
  award: (b: BadgeId) => void
  reset: () => void
  lastBadge: BadgeId | null
  clearLastBadge: () => void
}

const KEY = 'iam-progress-v1'
const empty: State = { xp: 0, completed: [], quizBest: {}, badges: [] }
const ProgressContext = createContext<Ctx | null>(null)

export function ProgressProvider({ children, totalModules }: { children: ReactNode; totalModules: number }) {
  const [state, setState] = useState<State>(() => ({ ...empty, ...load<State>(KEY, empty) }))
  const [lastBadge, setLastBadge] = useState<BadgeId | null>(null)

  useEffect(() => save(KEY, state), [state])

  const award = useCallback((b: BadgeId) => {
    setState((s) => {
      if (s.badges.includes(b)) return s
      setLastBadge(b)
      return { ...s, badges: [...s.badges, b], xp: s.xp + 50 }
    })
  }, [])

  const addXp = useCallback((n: number) => setState((s) => ({ ...s, xp: s.xp + n })), [])

  const completeModule = useCallback(
    (slug: string) => {
      setState((s) => {
        if (s.completed.includes(slug)) return s
        const completed = [...s.completed, slug]
        return { ...s, completed, xp: s.xp + 100 }
      })
    },
    [],
  )

  useEffect(() => {
    if (state.completed.length >= totalModules) award('graduate')
  }, [state.completed.length, totalModules, award])

  const recordQuiz = useCallback(
    (slug: string, correct: number, total: number) => {
      setState((s) => ({
        ...s,
        xp: s.xp + correct * 20,
        quizBest: { ...s.quizBest, [slug]: Math.max(s.quizBest[slug] ?? 0, Math.round((correct / total) * 100)) },
      }))
      award('first-quiz')
      if (correct === total) award('perfect-quiz')
    },
    [award],
  )

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      addXp,
      completeModule,
      recordQuiz,
      award,
      reset: () => setState(empty),
      lastBadge,
      clearLastBadge: () => setLastBadge(null),
    }),
    [state, addXp, completeModule, recordQuiz, award, lastBadge],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress outside provider')
  return ctx
}

export function levelFor(xp: number) {
  const levels = [
    { min: 0, name: 'Visitor badge' },
    { min: 200, name: 'Junior admin' },
    { min: 600, name: 'IAM engineer' },
    { min: 1200, name: 'Senior IAM engineer' },
    { min: 2000, name: 'Identity architect' },
  ]
  let i = 0
  while (i + 1 < levels.length && xp >= levels[i + 1].min) i++
  const next = levels[i + 1]
  return { name: levels[i].name, next: next?.name, pct: next ? (xp - levels[i].min) / (next.min - levels[i].min) : 1 }
}
