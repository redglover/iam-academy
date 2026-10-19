import { ArrowDown, ArrowRight } from 'lucide-react'
import type { DiagramId } from '../data/types'

export function Diagram({ id }: { id: DiagramId }) {
  if (id === 'lifecycle') return <IdentityAccounts />
  if (id === 'jml-flow') return <JmlMatrix />
  return <AutomationArch />
}

function IdentityAccounts() {
  const accounts = [
    ['Entra ID', 'ingrid.haugen@fjordtech.no'],
    ['Microsoft 365', 'mailbox + E3 licence'],
    ['GitHub', 'ihaugen-fjordtech (SCIM)'],
    ['Visma ERP', 'IHAUGEN'],
    ['VPN', 'via group GRP-VPN-Users'],
  ]
  return (
    <figure className="my-8">
      <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1.3fr]">
        <div className="panel p-5">
          <p className="text-sm text-muted">Identity</p>
          <p className="mt-1 font-display text-2xl font-bold">Ingrid Haugen</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">Employee ID</dt>
            <dd className="font-mono">E10421</dd>
            <dt className="text-muted">Department</dt>
            <dd>Engineering</dd>
            <dt className="text-muted">Manager</dt>
            <dd>Lars Berg</dd>
            <dt className="text-muted">Source</dt>
            <dd>HR system</dd>
          </dl>
        </div>
        <div className="flex justify-center text-key" aria-hidden>
          <ArrowRight className="hidden md:block" size={28} />
          <ArrowDown className="md:hidden" size={28} />
        </div>
        <ul className="grid gap-2">
          {accounts.map(([sys, val]) => (
            <li key={sys} className="flex items-baseline justify-between gap-3 rounded-xl border border-line bg-paper px-4 py-2.5">
              <span className="font-display font-semibold">{sys}</span>
              <span className="truncate font-mono text-xs text-muted">{val}</span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-3 text-sm text-muted">One identity, many accounts. The employee ID is what links them.</figcaption>
    </figure>
  )
}

const COLS = ['HR system', 'IGA engine', 'Entra ID', 'Apps (SCIM)']
const ROWS: { label: string; tone: string; dot: string; cells: string[] }[] = [
  {
    label: 'Joiner',
    tone: 'border-join/40',
    dot: 'bg-join',
    cells: ['New worker, start date', 'Match on employee ID, pick roles', 'Create account (disabled), add groups', 'Accounts created from group membership'],
  },
  {
    label: 'Mover',
    tone: 'border-move/40',
    dot: 'bg-move',
    cells: ['Department or title changes', 'Recalculate roles, diff old vs new', 'Remove old groups, add new ones', 'Old app roles removed, new ones added'],
  },
  {
    label: 'Leaver',
    tone: 'border-leave/40',
    dot: 'bg-leave',
    cells: ['End date reached', 'Start leaver workflow', 'Disable, revoke sessions, strip groups', 'Accounts set active = false'],
  },
]

function JmlMatrix() {
  return (
    <figure className="my-8">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-2 text-sm">
          <thead>
            <tr>
              <th className="w-24" />
              {COLS.map((c, i) => (
                <th key={c} scope="col" className="text-left font-display font-semibold">
                  <span className="text-muted">{i + 1}.</span> {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label}>
                <th scope="row" className="text-left align-middle font-display text-base font-bold">
                  <span className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${r.dot}`} aria-hidden />
                    {r.label}
                  </span>
                </th>
                {r.cells.map((c, i) => (
                  <td key={i} className={`rounded-xl border-2 bg-paper p-3 align-top ${r.tone}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="mt-2 text-sm text-muted">Each HR event flows left to right through the same chain. Only the action changes.</figcaption>
    </figure>
  )
}

function Node({ title, sub, cls = '' }: { title: string; sub: string; cls?: string }) {
  return (
    <div className={`rounded-xl border-2 bg-paper px-4 py-3 ${cls}`}>
      <p className="font-display font-semibold">{title}</p>
      <p className="text-sm text-muted">{sub}</p>
    </div>
  )
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1 px-1 text-xs text-muted md:flex-col md:justify-center">
      <ArrowRight className="hidden text-auto md:block" size={20} aria-hidden />
      <ArrowDown className="text-auto md:hidden" size={18} aria-hidden />
      <span className="font-mono">{label}</span>
    </div>
  )
}

function AutomationArch() {
  return (
    <figure className="my-8">
      <div className="flex flex-col items-stretch gap-1 md:flex-row md:items-center">
        <Node title="HR system" sub="Workday, Visma, SuccessFactors" cls="border-key/50" />
        <Arrow label="webhook / API" />
        <Node title="Integration layer" sub="IGA, Lifecycle Workflows, Logic App, Function" cls="border-auto/60" />
        <Arrow label="Graph API" />
        <Node title="Entra ID + AD" sub="accounts, groups, licences" cls="border-key/50" />
        <Arrow label="SCIM 2.0" />
        <Node title="SaaS apps" sub="GitHub, Salesforce, Slack…" cls="border-join/50" />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Node title="Audit log" sub="every action: who, what, when, why. Sent to SIEM." cls="border-dashed border-line" />
        <Node title="Service desk ticket" sub="fallback for systems with no API, tracked to closure" cls="border-dashed border-line" />
      </div>
      <figcaption className="mt-2 text-sm text-muted">A typical Microsoft-centric automation chain. Each arrow is something you build, monitor and fix.</figcaption>
    </figure>
  )
}
