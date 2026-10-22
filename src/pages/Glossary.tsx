import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Search } from 'lucide-react'
import { GLOSSARY } from '../data/glossary'
import { moduleMeta } from '../data/moduleIndex'

export function Glossary() {
  const [q, setQ] = useState('')
  const terms = useMemo(() => {
    const s = q.trim().toLowerCase()
    const list = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term))
    return s ? list.filter((t) => t.term.toLowerCase().includes(s) || t.def.toLowerCase().includes(s)) : list
  }, [q])

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Glossary</h1>
      <p className="mt-3 text-xl text-muted">{GLOSSARY.length} terms you will hear in your first month.</p>
      <label className="relative mt-6 block">
        <span className="sr-only">Search terms</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={19} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search, e.g. SCIM or orphan"
          className="w-full rounded-xl border-2 border-ink bg-paper py-3 pl-11 pr-4 text-lg placeholder:text-muted/70"
        />
      </label>
      <dl className="mt-6 divide-y divide-line">
        {terms.map((t) => (
          <div key={t.term} className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
            <dt className="font-display text-lg font-bold">{t.term}</dt>
            <dd>
              {t.def}
              {t.module && (
                <Link to={`/learn/${t.module}`} className="ml-2 whitespace-nowrap text-sm text-key hover:underline">
                  {moduleMeta(t.module)?.title}
                </Link>
              )}
            </dd>
          </div>
        ))}
        {!terms.length && <p className="py-8 text-muted">No terms match “{q}”. Try a shorter word.</p>}
      </dl>
    </div>
  )
}
