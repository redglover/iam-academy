import { useEffect, useRef, useState } from 'react'
import { Check, Play, RotateCcw, Timer, X } from 'lucide-react'
import { useProgress } from '../progress/progress'
import { celebrate } from '../../lib/confetti'

interface Line {
  who: string
  job: string
  access: string
  context: string
  /** true = should be revoked */
  risky: boolean
  why: string
}

const LINES: Line[] = [
  { who: 'Ingrid Haugen', job: 'Backend Developer', access: 'GitHub: org member', context: 'Last used: today', risky: false, why: 'Core tool for her job.' },
  { who: 'Ola Nordmann', job: 'Financial Controller', access: 'Salesforce: bulk export', context: 'Granted 2023 when in Sales Ops. Last used: 14 months ago', risky: true, why: 'Leftover from an old job, and bulk export of customer data is a GDPR risk.' },
  { who: 'Kari Lunde', job: 'AP Specialist', access: 'Visma: approve payments', context: 'Also holds: register invoices', risky: true, why: 'SoD conflict: can register and approve the same invoice.' },
  { who: 'Marte Lie', job: 'Head of Sales', access: 'Salesforce: sales user', context: 'Last used: yesterday', risky: false, why: 'Needed to run her team.' },
  { who: 'test.user01', job: 'No owner', access: 'Entra ID: user account', context: 'Created 2021, never signed in', risky: true, why: 'Ownerless test account. Classic orphan.' },
  { who: 'Sanjay Rao', job: 'DevOps Consultant', access: 'GitHub: production deploy', context: 'Contract ended last month, extension pending', risky: true, why: 'Contract has ended. Access must follow the end date, not a pending extension.' },
  { who: 'Lars Berg', job: 'Engineering Manager', access: 'VPN user', context: 'Last used: this week', risky: false, why: 'Normal remote access.' },
  { who: 'Nora Bakke', job: 'HR Business Partner', access: 'HR self-service: HR admin', context: 'Last used: today', risky: false, why: 'Needed for her role in People. Reviewed quarterly as sensitive access.' },
  { who: 'Erik Dahl', job: 'Recruiter', access: 'Entra ID: Global Administrator', context: 'Granted “temporarily” during 2022 migration', risky: true, why: 'Permanent Global Admin for a recruiter. Use PIM or remove.' },
  { who: 'Ingrid Haugen', job: 'Backend Developer', access: 'M365 E3 licence + mailbox', context: 'Birthright', risky: false, why: 'Birthright access for all employees.' },
  { who: 'svc-backup', job: 'Owner: Platform team', access: 'Azure: Backup Contributor', context: 'Credential rotated 30 days ago', risky: false, why: 'Owned, scoped, rotated service identity. This is what good looks like.' },
  { who: 'Ola Nordmann', job: 'Financial Controller', access: 'Visma: approve payments', context: 'Last used: last week', risky: false, why: 'Approving payments is part of the controller role.' },
]

const SECONDS = 60

export function ReviewGame() {
  const [state, setState] = useState<'idle' | 'playing' | 'done'>('idle')
  const [decisions, setDecisions] = useState<Record<number, 'keep' | 'revoke'>>({})
  const [left, setLeft] = useState(SECONDS)
  // WCAG 2.2.1: a time limit must be possible to turn off.
  const [timed, setTimed] = useState(true)
  const { award, addXp } = useProgress()
  const firstDecision = useRef<HTMLButtonElement>(null)
  const resultBox = useRef<HTMLDivElement>(null)

  // Move focus into the round when it starts (the Start button is replaced by the timer) and to the result when it ends.
  useEffect(() => {
    if (state === 'playing') firstDecision.current?.focus()
    if (state === 'done') resultBox.current?.focus()
  }, [state])

  useEffect(() => {
    if (state !== 'playing' || !timed) return
    if (left <= 0) {
      setState('done')
      return
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [state, left, timed])

  const decided = Object.keys(decisions).length
  useEffect(() => {
    if (state === 'playing' && decided === LINES.length) setState('done')
  }, [decided, state])

  const caught = LINES.filter((l, i) => l.risky && decisions[i] === 'revoke').length
  const wrongRevokes = LINES.filter((l, i) => !l.risky && decisions[i] === 'revoke').length
  const totalRisky = LINES.filter((l) => l.risky).length

  useEffect(() => {
    if (state !== 'done') return
    addXp(caught * 10)
    if (caught === totalRisky && wrongRevokes === 0) {
      award('review-ace')
      celebrate()
    }
  }, [state]) // run once when the round ends

  const start = () => {
    setDecisions({})
    setLeft(SECONDS)
    setState('playing')
  }

  return (
    <section className="my-8 rounded-[1.75rem] border-2 border-ink bg-fog p-3 sm:p-5" aria-label="Access review game">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Q3 access review: Fjordtech</h3>
          <p className="text-sm text-muted">You are the reviewer. Keep or revoke each line.</p>
        </div>
        {state === 'playing' ? (
          <span className={`chip py-1 font-display text-base font-bold tabular-nums ${timed && left <= 10 ? 'border-leave text-leave' : 'border-ink'}`}>
            <Timer size={16} /> {timed ? `${left}s` : 'No time limit'}
          </span>
        ) : (
          <span className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--key))]" checked={!timed} onChange={(e) => setTimed(!e.target.checked)} />
              No time limit
            </label>
            <button className="btn btn-key" onClick={start}>
              {state === 'idle' ? <Play size={16} /> : <RotateCcw size={16} />}
              {state === 'idle' ? 'Start review' : 'Review again'}
            </button>
          </span>
        )}
      </div>
      <p className="sr-only" aria-live="assertive">
        {state === 'playing' && timed && (left === 30 || left === 10) ? `${left} seconds left` : ''}
      </p>

      {state === 'done' && (
        <div className="mt-4 rounded-2xl border-2 border-ink bg-paper p-4" role="status" tabIndex={-1} ref={resultBox}>
          <p className="font-display text-2xl font-bold">
            Caught {caught} of {totalRisky} risky lines
          </p>
          <p className="text-muted">
            {wrongRevokes > 0 ? `${wrongRevokes} legitimate access line${wrongRevokes > 1 ? 's' : ''} revoked: that breaks people’s work and erodes trust in reviews. ` : 'No legitimate access revoked. '}
            {decided < LINES.length && `${LINES.length - decided} line${LINES.length - decided > 1 ? 's' : ''} left undecided. In real life those usually get auto-revoked or escalated.`}
          </p>
        </div>
      )}

      {state !== 'idle' && (
        <ul className="mt-4 grid gap-2">
          {LINES.map((l, i) => {
            const d = decisions[i]
            const reveal = state === 'done'
            const right = reveal && d !== undefined && (d === 'revoke') === l.risky
            const nameId = `review-line-${i}`
            return (
              <li
                key={i}
                className={`rounded-2xl border-2 bg-paper p-3 transition-colors ${
                  reveal ? (right ? 'border-join/50' : 'border-leave/50') : d ? 'border-ink/30' : 'border-line'
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p id={nameId}>
                      <strong>{l.who}</strong> <span className="text-muted">({l.job})</span>
                    </p>
                    <p id={`${nameId}-access`} className="font-semibold">
                      {l.access}
                    </p>
                    <p className="text-sm text-muted">{l.context}</p>
                  </div>
                  <div className="flex gap-1.5" role="group" aria-labelledby={`${nameId} ${nameId}-access`}>
                    <button
                      ref={i === 0 ? firstDecision : undefined}
                      disabled={state !== 'playing'}
                      onClick={() => setDecisions((m) => ({ ...m, [i]: 'keep' }))}
                      aria-pressed={d === 'keep'}
                      className={`inline-flex items-center gap-1 rounded-lg border-2 px-3 py-1.5 text-sm font-semibold ${d === 'keep' ? 'border-join bg-join text-on' : 'border-line'}`}
                    >
                      <Check size={15} /> Keep
                    </button>
                    <button
                      disabled={state !== 'playing'}
                      onClick={() => setDecisions((m) => ({ ...m, [i]: 'revoke' }))}
                      aria-pressed={d === 'revoke'}
                      className={`inline-flex items-center gap-1 rounded-lg border-2 px-3 py-1.5 text-sm font-semibold ${d === 'revoke' ? 'border-leave bg-leave text-on' : 'border-line'}`}
                    >
                      <X size={15} /> Revoke
                    </button>
                  </div>
                </div>
                {reveal && (
                  <p className={`mt-2 text-sm ${l.risky ? 'text-leave' : 'text-join'}`}>
                    <strong className="text-ink">{d === undefined ? 'Undecided. ' : right ? 'Your call was right. ' : 'Your call was wrong. '}</strong>
                    {l.risky ? 'Should be revoked. ' : 'Legitimate. '}
                    <span className="text-ink">{l.why}</span>
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
