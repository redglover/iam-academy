import { Lab } from '../components/BlockRenderer'
import type { LabId } from '../data/types'

const LABS: { id: LabId; title: string; text: string }[] = [
  { id: 'jml', title: 'JML simulator', text: 'Hire, transfer and terminate Fjordtech employees. Compare manual tickets with automated IAM and read the auditor’s findings.' },
  { id: 'pipeline', title: 'Automation pipeline builder', text: 'Assemble a joiner or leaver runbook from blocks, get it reviewed, and read the PowerShell it becomes.' },
  { id: 'rbac', title: 'RBAC lab', text: 'Fix messy business roles, remove SoD conflicts, and watch privilege creep build up over a career.' },
  { id: 'review', title: 'Access review game', text: 'Sixty seconds, twelve access lines. Catch the risky ones without breaking anyone’s work.' },
]

export function Labs() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Labs</h1>
      <p className="mt-3 max-w-[60ch] text-xl text-muted">The hands-on parts of the course in one place. Each lab also appears inside its module, next to the theory.</p>
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Jump to lab">
        {LABS.map((l) => (
          <a key={l.id} href={`#/labs#${l.id}`} className="chip border-ink bg-paper py-1.5 font-semibold" onClick={(e) => { e.preventDefault(); document.getElementById(l.id)?.scrollIntoView({ behavior: 'smooth' }) }}>
            {l.title}
          </a>
        ))}
      </nav>
      {LABS.map((l) => (
        <section key={l.id} id={l.id} className="mt-14 scroll-mt-20">
          <h2 className="text-3xl font-bold">{l.title}</h2>
          <p className="mt-2 max-w-[65ch] text-muted">{l.text}</p>
          <Lab id={l.id} />
        </section>
      ))}
    </div>
  )
}
