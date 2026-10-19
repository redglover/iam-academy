import { Printer } from 'lucide-react'
import { INTERVIEW } from '../data/interview'

const SHEET: { title: string; tone: string; items: string[] }[] = [
  {
    title: 'Joiner',
    tone: 'border-join',
    items: ['Trigger: HR hire event, about 14 days before start', 'Match on employee ID (rehire check)', 'Create account disabled, unique UPN', 'Birthright + role-based access, no tickets', 'Temporary Access Pass to the manager', 'Enable on start date 06:00'],
  },
  {
    title: 'Mover',
    tone: 'border-move',
    items: ['Trigger: department, title or manager change', 'Recalculate roles from the new job', 'Remove old access (grace period, defined)', 'Add new role access', 'Micro-certification by the new manager'],
  },
  {
    title: 'Leaver',
    tone: 'border-leave',
    items: ['Trigger: end date (or immediately if hostile)', 'Disable, then revoke sessions', 'Remove groups, which deactivates SaaS via SCIM', 'Mailbox to shared, then remove licence', 'Notify manager, log everything', 'Delete after the retention period'],
  },
  {
    title: 'Automation checklist',
    tone: 'border-auto',
    items: ['Event-driven + scheduled reconciliation', 'Idempotent, desired-state logic', 'Managed identity, least-privilege Graph scopes', 'Retry with backoff on HTTP 429', 'Dry-run mode and safety thresholds', 'Structured audit log to SIEM'],
  },
  {
    title: 'OAuth / OIDC',
    tone: 'border-key',
    items: ['User signs in: auth code + PKCE', 'No user (scripts): client credentials', 'No browser: device code (block it if unused)', 'Implicit and password (ROPC): never', 'ID token = for the app, access token = for the API', 'Check state, nonce, iss, aud, exp', 'Secret < certificate < managed identity'],
  },
  {
    title: 'SAML',
    tone: 'border-auto',
    items: ['IdP signs, SP verifies with IdP certificate', 'Entity ID = Identifier, ACS = Reply URL', 'SP checks: signature, audience, recipient, time, InResponseTo, one-time use', 'Track signing certificate expiry (3 years)', 'SAML signs in, SCIM deprovisions', 'Debug with SAML-tracer'],
  },
  {
    title: 'Principles',
    tone: 'border-key',
    items: ['Least privilege and need-to-know', 'Separation of duties', 'Zero trust: verify every request', 'Every account and group has an owner', 'No standing admin rights (PIM)'],
  },
  {
    title: 'Numbers to know',
    tone: 'border-key',
    items: ['Leaver: access gone within 1 hour', 'Privileged reviews: quarterly', 'Standard reviews: yearly', 'Break-glass accounts: 2', 'Orphan accounts: 0'],
  },
]

export function CheatSheet() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold sm:text-5xl">Cheat sheet</h1>
          <p className="mt-3 text-xl text-muted">The whole course on one page. Print it before an interview.</p>
        </div>
        <button className="btn no-print" onClick={() => window.print()}>
          <Printer size={17} /> Print
        </button>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SHEET.map((s) => (
          <section key={s.title} className={`panel border-t-[6px] p-5 ${s.tone}`}>
            <h2 className="text-xl font-bold">{s.title}</h2>
            <ul className="mt-3 space-y-1.5 text-[0.97rem]">
              {s.items.map((it) => (
                <li key={it} className="flex gap-2">
                  <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-ink/50" aria-hidden />
                  {it}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <h2 className="mt-16 text-3xl font-bold">Interview practice</h2>
      <p className="mt-2 text-muted">Try answering out loud first, then open the model answer.</p>
      <div className="mt-6 grid gap-3">
        {INTERVIEW.map((x) => (
          <details key={x.q} className="panel group p-5 open:border-ink">
            <summary className="cursor-pointer list-none font-display text-lg font-bold marker:hidden">
              <span className="mr-2 inline-block text-key transition-transform group-open:rotate-90" aria-hidden>
                ▸
              </span>
              {x.q}
            </summary>
            <p className="mt-3 max-w-[72ch] pl-6">{x.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
