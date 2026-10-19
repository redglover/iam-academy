import { AnimatePresence, motion } from 'framer-motion'
import { Lock, Wifi } from 'lucide-react'
import { ENTITLEMENTS, SYSTEMS, type Identity, type SystemId } from './model'

const STATUS: Record<Identity['status'], { label: string; strip: string; text: string }> = {
  none: { label: 'Not hired', strip: 'bg-line', text: 'text-muted' },
  'pre-hire': { label: 'Pre-hire', strip: 'bg-key', text: 'text-key' },
  active: { label: 'Active', strip: 'bg-join', text: 'text-join' },
  terminated: { label: 'Terminated', strip: 'bg-leave', text: 'text-leave' },
}

export function IdBadge({ who, compact = false }: { who: Identity; compact?: boolean }) {
  const s = STATUS[who.status]
  const bySystem = new Map<SystemId, string[]>()
  for (const e of who.entitlements) {
    const sys = ENTITLEMENTS[e].system
    bySystem.set(sys, [...(bySystem.get(sys) ?? []), e])
  }
  const entra = who.accounts.entra
  const liveSessions = Object.values(who.accounts).some((a) => a?.sessions)

  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* lanyard */}
      <div className="mx-auto flex w-24 justify-between" aria-hidden>
        <span className="h-10 w-3 -skew-x-12 bg-key/80" />
        <span className="h-10 w-3 skew-x-12 bg-key/80" />
      </div>
      <div className="relative z-10 mx-auto -mt-1 h-5 w-12 rounded-md border-2 border-ink bg-paper" aria-hidden />
      <article
        className="relative -mt-3 overflow-hidden rounded-[1.6rem] border-2 border-ink bg-paper shadow-badge"
        aria-label={`Access badge for ${who.name}`}
      >
        <div className={`h-3 ${s.strip} transition-colors duration-500`} />
        <div className="mx-auto mt-3 h-2.5 w-14 rounded-full bg-fog ring-1 ring-line" aria-hidden />
        <div className="flex items-start gap-4 px-5 pt-4">
          <div
            className={`grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-fog text-5xl ring-1 ring-line transition ${who.status === 'terminated' ? 'grayscale opacity-60' : ''}`}
            aria-hidden
          >
            {who.emoji}
          </div>
          <div className="min-w-0">
            <p className="font-display text-2xl font-bold leading-tight">{who.name}</p>
            <p className="text-muted">{who.status === 'none' ? 'Candidate' : who.title}</p>
            <p className="text-sm text-muted">{who.department ?? 'No department'}</p>
            <p className={`mt-1 inline-flex items-center gap-1.5 text-sm font-bold ${s.text}`}>
              <span className={`h-2 w-2 rounded-full ${s.strip}`} />
              {s.label}
              {who.type === 'contractor' && <span className="font-normal text-muted">, contractor</span>}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 px-5 text-xs text-muted">
          <span className="font-mono">{who.employeeId}</span>
          <span className="truncate font-mono">{who.status === 'none' ? 'no account' : who.upn}</span>
        </div>

        {!compact && (
          <div className="mt-3 flex flex-wrap gap-2 px-5 text-xs">
            <span className={`chip ${entra?.enabled ? 'border-join/40 text-join' : 'border-line text-muted'}`}>
              <Lock size={12} /> {entra ? (entra.enabled ? 'Sign-in allowed' : 'Sign-in blocked') : 'No account'}
            </span>
            <span className={`chip ${liveSessions ? 'border-move/50 text-move' : 'border-line text-muted'}`}>
              <Wifi size={12} /> {liveSessions ? 'Live sessions' : 'No sessions'}
            </span>
            {who.mailbox !== 'none' && <span className="chip border-line text-muted">Mailbox: {who.mailbox}</span>}
          </div>
        )}

        <div className="mt-4 border-t border-dashed border-line px-5 pb-5 pt-3">
          <p className="text-sm font-semibold">Access</p>
          <div className="mt-2 flex min-h-[3rem] flex-wrap content-start gap-1.5">
            <AnimatePresence initial={false}>
              {who.entitlements.length === 0 && (
                <motion.span key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-muted">
                  Nothing yet
                </motion.span>
              )}
              {[...bySystem.entries()].flatMap(([sys, ents]) =>
                ents.map((e) => {
                  const ent = ENTITLEMENTS[e]
                  const acc = who.accounts[sys]
                  const off = acc && !acc.enabled
                  return (
                    <motion.span
                      layout
                      key={e}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                      className={`chip text-xs ${
                        ent.risk === 'high' ? 'border-leave/50 bg-leave/10' : ent.risk === 'medium' ? 'border-move/50 bg-move/10' : 'border-line bg-fog'
                      } ${off ? 'line-through opacity-50' : ''}`}
                      title={`${SYSTEMS[sys].name}: ${ent.name} (${ent.risk} risk)`}
                    >
                      <span className="font-bold">{SYSTEMS[sys].short}</span> {ent.name}
                    </motion.span>
                  )
                }),
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex items-center justify-between bg-ink px-5 py-2 text-xs text-paper">
          <span className="font-display font-bold">Fjordtech AS</span>
          <span>Manager: {who.manager}</span>
        </div>
      </article>
    </div>
  )
}
