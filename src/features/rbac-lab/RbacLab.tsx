import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bot, CheckCircle2, Hand, RotateCcw } from 'lucide-react'
import { ENTITLEMENTS, SYSTEMS } from '../jml-sim/model'
import { sodConflicts } from './sod'
import { useProgress } from '../progress/progress'

interface Job {
  id: string
  role: string
  needs: string[]
}

const JOBS: Job[] = [
  { id: 'sales-rep', role: 'Sales Rep', needs: ['crm-sales'] },
  { id: 'sales-ops', role: 'Sales Ops Analyst', needs: ['crm-sales', 'crm-export'] },
  { id: 'ap', role: 'AP Specialist', needs: ['erp-ap-clerk', 'erp-vendor-create'] },
  { id: 'fin-mgr', role: 'Finance Manager', needs: ['erp-pay-approve'] },
]

const CATALOG = ['crm-sales', 'crm-export', 'erp-ap-clerk', 'erp-vendor-create', 'erp-pay-approve', 'git-member', 'git-prod-deploy', 'hris-hr-admin']

// A realistic mess: roles built by copying people over the years.
const START: Record<string, string[]> = {
  'sales-rep': ['crm-sales', 'crm-export'],
  'sales-ops': ['crm-sales'],
  ap: ['erp-ap-clerk', 'erp-vendor-create', 'erp-pay-approve'],
  'fin-mgr': ['erp-pay-approve', 'erp-ap-clerk', 'git-member'],
}

const CAREER = ['sales-rep', 'sales-ops', 'ap', 'fin-mgr']
const YEARS = ['2022', '2023', '2024', '2025']

export function RbacLab() {
  const [roles, setRoles] = useState<Record<string, string[]>>(START)
  const { award } = useProgress()

  const toggle = (job: string, ent: string) =>
    setRoles((r) => ({ ...r, [job]: r[job].includes(ent) ? r[job].filter((e) => e !== ent) : [...r[job], ent] }))

  const report = useMemo(
    () =>
      JOBS.map((j) => {
        const has = roles[j.id]
        return {
          job: j,
          missing: j.needs.filter((n) => !has.includes(n)),
          excess: has.filter((e) => !j.needs.includes(e)),
          sod: sodConflicts(has),
        }
      }),
    [roles],
  )
  const problems = report.reduce((n, r) => n + r.missing.length + r.excess.length + r.sod.length, 0)

  useEffect(() => {
    if (problems === 0) award('rbac-clean')
  }, [problems, award])

  return (
    <section className="my-8 rounded-[1.75rem] border-2 border-ink bg-fog p-3 sm:p-5" aria-label="RBAC lab">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Fix Fjordtech’s business roles</h3>
        <button className="btn btn-ghost py-1.5 text-sm" onClick={() => setRoles(START)}>
          <RotateCcw size={15} /> Reset
        </button>
      </div>
      <p className="mt-1 max-w-[68ch] text-[0.98rem]">
        Each column is a business role. Tick the entitlements it should contain. The goal is every job gets what it needs, nothing it doesn’t, and no
        toxic combinations.
      </p>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="p-3 text-left font-display">Entitlement</th>
              {JOBS.map((j) => (
                <th key={j.id} className="p-3 text-center font-display">
                  {j.role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATALOG.map((ent) => {
              const e = ENTITLEMENTS[ent]
              return (
                <tr key={ent} className="border-b border-line/60 last:border-0">
                  <th scope="row" className="p-3 text-left font-normal">
                    <span className="rounded bg-fog px-1.5 text-xs font-bold">{SYSTEMS[e.system].short}</span> {e.name}
                    {e.risk === 'high' && <span className="ml-1.5 text-xs font-bold text-leave">high risk</span>}
                  </th>
                  {JOBS.map((j) => {
                    const on = roles[j.id].includes(ent)
                    return (
                      <td key={j.id} className="p-2 text-center">
                        <button
                          onClick={() => toggle(j.id, ent)}
                          aria-pressed={on}
                          aria-label={`${e.name} in ${j.role}`}
                          className={`h-8 w-8 rounded-lg border-2 font-bold transition-colors ${on ? 'border-ink bg-move text-on' : 'border-muted/70 hover:border-ink'}`}
                        >
                          <span aria-hidden>{on ? '✓' : ''}</span>
                        </button>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2" aria-live="polite">
        {report.map((r) => {
          const ok = !r.missing.length && !r.excess.length && !r.sod.length
          return (
            <div key={r.job.id} className={`rounded-xl border-2 bg-paper p-3 text-sm ${ok ? 'border-join/40' : 'border-leave/40'}`}>
              <p className="flex items-center gap-1.5 font-display font-semibold">
                {ok ? <CheckCircle2 size={16} className="text-join" role="img" aria-label="OK:" /> : <AlertTriangle size={16} className="text-leave" role="img" aria-label="Problems:" />} {r.job.role}
              </p>
              {ok && <p className="text-muted">Least privilege, no conflicts.</p>}
              {r.missing.map((m) => (
                <p key={m}>Missing: {ENTITLEMENTS[m].name}. People in this job can’t work.</p>
              ))}
              {r.excess.map((m) => (
                <p key={m}>Excess: {ENTITLEMENTS[m].name}. Nobody in this job needs it.</p>
              ))}
              {r.sod.map((s) => (
                <p key={s.id} className="text-leave">
                  {s.id}: {s.why}
                </p>
              ))}
            </div>
          )
        })}
      </div>

      <PrivilegeCreep />
    </section>
  )
}

function PrivilegeCreep() {
  const [year, setYear] = useState(0)
  const [auto, setAuto] = useState(false)
  const held = auto ? JOBS.find((j) => j.id === CAREER[year])!.needs : [...new Set(CAREER.slice(0, year + 1).flatMap((id) => JOBS.find((j) => j.id === id)!.needs))]
  const current = JOBS.find((j) => j.id === CAREER[year])!
  const conflicts = sodConflicts(held)
  const excess = held.filter((e) => !current.needs.includes(e))

  return (
    <div className="mt-6 rounded-2xl border border-line bg-paper p-4">
      <h3 className="text-lg font-semibold">Watch privilege creep happen</h3>
      <p className="mt-1 max-w-[68ch] text-[0.98rem]">Ola changes jobs every year. Step through his career and compare manual and automated movers.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border-2 border-ink p-0.5" role="group" aria-label="How movers are handled">
          <button onClick={() => setAuto(false)} aria-pressed={!auto} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-sm font-semibold ${!auto ? 'bg-move text-on' : 'text-muted'}`}>
            <Hand size={14} /> Manual movers
          </button>
          <button onClick={() => setAuto(true)} aria-pressed={auto} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-sm font-semibold ${auto ? 'bg-auto text-on' : 'text-muted'}`}>
            <Bot size={14} /> Automated movers
          </button>
        </div>
        <ol className="flex flex-wrap gap-1.5" aria-label="Ola’s career">
          {CAREER.map((id, i) => (
            <li key={id}>
              <button
                onClick={() => setYear(i)}
                aria-current={i === year ? 'step' : undefined}
                className={`chip py-1 text-sm ${i === year ? 'border-ink bg-ink text-paper' : i < year ? 'border-ink/40' : 'border-line text-muted'}`}
              >
                {YEARS[i]}: {JOBS.find((j) => j.id === id)!.role}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {held.map((e) => (
          <span key={e} className={`chip text-sm ${excess.includes(e) ? 'border-leave/50 bg-leave/10' : 'border-join/40 bg-join/10'}`}>
            {ENTITLEMENTS[e].name}
            <span className="sr-only">{excess.includes(e) ? ' (left over)' : ' (needed)'}</span>
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm" aria-live="polite">
        {excess.length === 0 ? (
          <span className="text-join">Ola holds exactly what his current job needs.</span>
        ) : (
          <span className="text-leave">
            {excess.length} entitlement{excess.length > 1 ? 's' : ''} left over from old jobs
            {conflicts.length > 0 && `, including SoD conflict ${conflicts.map((c) => c.id).join(', ')}: ${conflicts[0].why}`}.
          </span>
        )}
      </p>
    </div>
  )
}
