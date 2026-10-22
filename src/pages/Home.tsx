import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { MODULES } from '../data/modules'
import { PERSONAS, SYSTEMS } from '../features/jml-sim/model'
import { IdBadge } from '../features/jml-sim/IdBadge'
import { useJmlPlayer } from '../features/jml-sim/useJmlPlayer'
import { BADGES, levelFor, useProgress, type BadgeId } from '../features/progress/progress'
import { toneTint } from '../lib/tone'

function HeroBadge() {
  const { who, log, shown, playing, fire, reset } = useJmlPlayer(PERSONAS[0], 160)
  const current = log[log.length - 1]
  const step = current?.steps[Math.max(0, shown - 1)]
  return (
    <div>
      <IdBadge who={who} />
      <div className="mx-auto mt-5 flex max-w-sm flex-wrap justify-center gap-2">
        <button className="btn border-join py-1.5 text-sm" disabled={who.status !== 'none' || playing} onClick={() => fire({ type: 'joiner', dept: 'Engineering' }, 'automated')}>
          Hire Ingrid
        </button>
        <button className="btn border-move py-1.5 text-sm" disabled={who.status !== 'active' || playing} onClick={() => fire({ type: 'mover', dept: who.department === 'Finance' ? 'Sales' : 'Finance' }, 'automated')}>
          Move to {who.department === 'Finance' ? 'Sales' : 'Finance'}
        </button>
        <button className="btn border-leave py-1.5 text-sm" disabled={who.status !== 'active' || playing} onClick={() => fire({ type: 'leaver' }, 'automated')}>
          Terminate
        </button>
        {who.status === 'terminated' && !playing && (
          <button className="btn btn-ghost py-1.5 text-sm" onClick={reset}>
            Start over
          </button>
        )}
      </div>
      <p className="mx-auto mt-3 h-12 max-w-sm text-center text-sm text-muted" aria-live="polite">
        {step ? (
          <>
            <span className="font-bold text-ink">{SYSTEMS[step.system].short}:</span> {step.label}
          </>
        ) : (
          'Press “Hire Ingrid” and watch IAM build her access.'
        )}
      </p>
    </div>
  )
}

function ResetProgress() {
  const { xp, completed, badges, reset } = useProgress()
  const [confirming, setConfirming] = useState(false)
  const [justReset, setJustReset] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const doneRef = useRef<HTMLParagraphElement>(null)
  const returnFocus = useRef(false)

  // Keep keyboard focus somewhere sensible: back on the trigger after Cancel, on the status line after a reset.
  useEffect(() => {
    if (justReset) doneRef.current?.focus()
    else if (!confirming && returnFocus.current) triggerRef.current?.focus()
    returnFocus.current = false
  }, [confirming, justReset])

  const cancel = () => {
    returnFocus.current = true
    setConfirming(false)
  }

  if (justReset)
    return (
      <p ref={doneRef} tabIndex={-1} role="status" className="text-sm font-semibold outline-none">
        Progress reset.
      </p>
    )
  if (!xp && !completed.length && !badges.length) return null
  if (!confirming)
    return (
      <button ref={triggerRef} className="btn btn-ghost py-1.5 text-sm" onClick={() => setConfirming(true)}>
        Reset progress
      </button>
    )
  return (
    <div
      role="alertdialog"
      aria-labelledby="reset-confirm"
      className="flex flex-wrap items-center gap-2 rounded-badge border-2 border-leave p-3"
      onKeyDown={(e) => e.key === 'Escape' && cancel()}
    >
      <p id="reset-confirm" className="text-sm">
        Erase all XP, completed modules, quiz scores, lab missions and badges? This can’t be undone.
      </p>
      <button
        className="btn border-leave py-1.5 text-sm"
        onClick={() => {
          reset()
          setConfirming(false)
          setJustReset(true)
        }}
      >
        Yes, reset
      </button>
      <button className="btn btn-ghost py-1.5 text-sm" onClick={cancel} autoFocus>
        Cancel
      </button>
    </div>
  )
}

const SKILLS: { skill: string; where: string; slug: string }[] = [
  { skill: 'Running and improving the JML process', where: 'Joiner, Mover, Leaver in practice', slug: 'jml' },
  { skill: 'Automating with PowerShell, Graph API and SCIM', where: 'Automating IAM', slug: 'automation' },
  { skill: 'OAuth 2.0 / OpenID Connect and app registrations', where: 'OAuth 2.0 and OpenID Connect', slug: 'oauth' },
  { skill: 'SAML SSO: setup, certificates and troubleshooting', where: 'SAML single sign-on', slug: 'saml' },
  { skill: 'SCIM provisioning and Entra attribute mappings', where: 'SCIM provisioning', slug: 'scim' },
  { skill: 'Conditional Access design and rollout', where: 'Conditional Access', slug: 'ca' },
  { skill: 'Entra PIM: eligible roles, approvals, standing access', where: 'PIM in practice', slug: 'pim' },
  { skill: 'Role design (RBAC/ABAC) and SoD', where: 'Roles, attributes and groups', slug: 'access-models' },
  { skill: 'Access reviews and governance reporting', where: 'Governance', slug: 'governance' },
  { skill: 'Entra ID, Conditional Access, PIM', where: 'Privileged access', slug: 'privileged' },
  { skill: 'GDPR, NSM and ISO 27001 requirements', where: 'Compliance and the Norwegian context', slug: 'compliance' },
]

export function Home() {
  const { completed, xp, badges } = useProgress()
  const lvl = levelFor(xp)
  const nextModule = MODULES.find((m) => !completed.includes(m.slug)) ?? MODULES[0]

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-start gap-12 px-4 pb-16 pt-10 md:grid-cols-[1.15fr_1fr] md:pt-12">
        <div>
          <h1 className="text-[2.6rem] md:mt-20 font-extrabold leading-[1.02] sm:text-6xl lg:text-[4.2rem]">
            Learn IAM by running a company’s access.
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg text-muted sm:text-xl">
            Hire, move and terminate people at Fjordtech AS, a fictional Norwegian company, and see what identity and access management does at every
            step. Thirteen short modules, ten hands-on labs, and a real sign-in playground. No sign-up.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={`/learn/${nextModule.slug}`} className="btn btn-key px-5 py-3 text-lg">
              {completed.length ? `Continue: ${nextModule.title}` : 'Start the course'}
            </Link>
            <Link to="/labs#jml" className="btn px-5 py-3 text-lg">
              Open the JML simulator
            </Link>
          </div>
        </div>
        <HeroBadge />
      </section>

      <section className="border-y border-line bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold sm:text-4xl">The course</h2>
              <p className="mt-2 text-muted">Each module ends with a short quiz. Pass it to complete the module.</p>
            </div>
            <div className="min-w-[14rem]">
              <p className="text-sm">
                <strong>{lvl.name}</strong>
                {lvl.next && <span className="text-muted">, next: {lvl.next}</span>}
              </p>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-key transition-all" style={{ width: `${Math.round(lvl.pct * 100)}%` }} />
              </div>
            </div>
          </div>
          <ol className="mt-8 grid gap-3 md:grid-cols-2">
            {MODULES.map((m, i) => {
              const done = completed.includes(m.slug)
              return (
                <li key={m.slug}>
                  <Link to={`/learn/${m.slug}`} className="group flex h-full gap-4 rounded-badge border-2 border-line p-4 transition-colors hover:border-ink">
                    <span
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display text-lg font-bold ${done ? 'bg-join text-white' : `${toneTint[m.tone]} text-ink`}`}
                    >
                      {done ? <Check size={20} /> : i + 1}
                    </span>
                    <span>
                      <span className="block font-display text-lg font-bold leading-snug group-hover:underline">{m.title}</span>
                      <span className="block text-[0.95rem] text-muted">{m.tagline}</span>
                      <span className="mt-1 block text-sm text-muted">{m.minutes} min</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-3xl font-bold sm:text-4xl">What IAM engineer jobs ask for, and where you learn it</h2>
        <div className="mt-6 overflow-x-auto rounded-badge border border-line bg-paper">
          <table className="w-full text-left">
            <tbody>
              {SKILLS.map((s) => (
                <tr key={s.skill} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3 align-top font-semibold">{s.skill}</td>
                  <td className="px-4 py-3">
                    <Link to={`/learn/${s.slug}`} className="text-key underline-offset-2 hover:underline">
                      {s.where}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <h2 className="text-3xl font-bold sm:text-4xl">Badges</h2>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted">
            {badges.length} of {Object.keys(BADGES).length} unlocked. Progress is saved in this browser only.
          </p>
          <ResetProgress />
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(BADGES) as BadgeId[]).map((id) => {
            const b = BADGES[id]
            const got = badges.includes(id)
            return (
              <li key={id} className={`rounded-badge border-2 p-4 ${got ? 'border-ink bg-paper' : 'border-dashed border-line'}`}>
                <span className={`text-3xl ${got ? '' : 'grayscale opacity-40'}`} aria-hidden>
                  {b.emoji}
                </span>
                <p className="mt-2 font-display font-bold">{b.name}</p>
                <p className="text-sm text-muted">{b.how}</p>
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}
