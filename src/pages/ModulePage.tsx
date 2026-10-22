import { Link, useParams } from 'react-router'
import { Check, Clock } from 'lucide-react'
import { MODULES, moduleBySlug } from '../data/modules'
import { BlockRenderer } from '../components/BlockRenderer'
import { Quiz } from '../components/Quiz'
import { useProgress } from '../features/progress/progress'
import { toneText } from '../lib/tone'
import { NotFound } from './NotFound'

export function ModulePage() {
  const { slug = '' } = useParams()
  const mod = moduleBySlug(slug)
  const { completed, completeModule } = useProgress()
  if (!mod) return <NotFound slug={slug} />

  const i = MODULES.indexOf(mod)
  const prev = MODULES[i - 1]
  const next = MODULES[i + 1]
  const done = completed.includes(mod.slug)

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="no-print hidden lg:block">
        <nav className="sticky top-24" aria-label="Course">
          <p className="mb-2 font-display font-bold">Course</p>
          <ol className="space-y-0.5">
            {MODULES.map((m, n) => {
              const active = m.slug === mod.slug
              const ok = completed.includes(m.slug)
              return (
                <li key={m.slug}>
                  <Link
                    to={`/learn/${m.slug}`}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-[0.93rem] leading-snug ${active ? 'bg-ink text-paper' : 'hover:bg-ink/5'}`}
                  >
                    <span className={`mt-px grid h-5 w-5 shrink-0 place-items-center rounded-md text-xs font-bold ${ok ? 'bg-join text-on' : active ? 'bg-paper/20' : 'bg-ink/10'}`}>
                      {ok ? <Check size={12} /> : n + 1}
                    </span>
                    {m.title}
                  </Link>
                </li>
              )
            })}
          </ol>
        </nav>
      </aside>

      <article className="min-w-0">
        <header className="mb-8">
          <p className={`font-display text-lg font-bold ${toneText[mod.tone]}`}>
            Module {i + 1} of {MODULES.length}
          </p>
          <h1 className="mt-1 text-4xl font-extrabold sm:text-5xl">{mod.title}</h1>
          <p className="mt-3 max-w-[60ch] text-xl text-muted">{mod.tagline}</p>
          <p className="mt-3 flex items-center gap-3 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <Clock size={15} /> {mod.minutes} min
            </span>
            {done && (
              <span className="inline-flex items-center gap-1 font-semibold text-join">
                <Check size={15} /> Completed
              </span>
            )}
          </p>
        </header>

        <BlockRenderer blocks={mod.blocks} />

        <section className="mt-14" aria-labelledby="quiz-h">
          <h2 id="quiz-h" className="mb-4 text-2xl font-bold sm:text-[1.75rem]">
            Check yourself
          </h2>
          <Quiz key={mod.slug} slug={mod.slug} questions={mod.quiz} onDone={() => completeModule(mod.slug)} />
        </section>

        <nav className="no-print mt-12 grid gap-3 sm:grid-cols-2" aria-label="Module navigation">
          {prev ? (
            <Link to={`/learn/${prev.slug}`} className="rounded-badge border-2 border-line p-4 hover:border-ink">
              <span className="text-sm text-muted">Previous</span>
              <span className="block font-display font-bold">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={`/learn/${next.slug}`} className="rounded-badge border-2 border-ink bg-paper p-4 text-right shadow-lift">
              <span className="text-sm text-muted">Next</span>
              <span className="block font-display font-bold">{next.title}</span>
            </Link>
          )}
        </nav>
      </article>
    </div>
  )
}
