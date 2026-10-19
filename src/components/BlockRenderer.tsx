import { lazy, Suspense } from 'react'
import type { Block, LabId } from '../data/types'
import { Inline } from './Inline'
import { CodeBlock } from './CodeBlock'
import { Callout } from './Callout'
import { Diagram } from './Diagrams'
import { toneBg, toneSoft, toneText } from '../lib/tone'

const LABS: Record<LabId, React.LazyExoticComponent<() => JSX.Element>> = {
  jml: lazy(() => import('../features/jml-sim/JmlSimulator').then((m) => ({ default: m.JmlSimulator }))),
  pipeline: lazy(() => import('../features/automation/PipelineBuilder').then((m) => ({ default: m.PipelineBuilder }))),
  rbac: lazy(() => import('../features/rbac-lab/RbacLab').then((m) => ({ default: m.RbacLab }))),
  review: lazy(() => import('../features/review/ReviewGame').then((m) => ({ default: m.ReviewGame }))),
  saml: lazy(() => import('../features/saml/SamlSimulator').then((m) => ({ default: m.SamlSimulator }))),
  'saml-inspector': lazy(() => import('../features/saml/SamlInspector').then((m) => ({ default: m.SamlInspector }))),
  oauth: lazy(() => import('../features/oauth/OAuthSimulator').then((m) => ({ default: m.OAuthSimulator }))),
}

export function Lab({ id }: { id: LabId }) {
  const C = LABS[id]
  return (
    <Suspense fallback={<div className="my-8 h-64 animate-pulse rounded-[1.75rem] bg-line/40" />}>
      <C />
    </Suspense>
  )
}

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="prose-iam">
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'p':
            return (
              <p key={i}>
                <Inline text={b.text} />
              </p>
            )
          case 'h':
            return (
              <h2 key={i} className="mb-2 mt-12 text-2xl font-bold sm:text-[1.75rem]">
                {b.text}
              </h2>
            )
          case 'list': {
            const Tag = b.ordered ? 'ol' : 'ul'
            return (
              <Tag key={i} className="my-4 max-w-[68ch] space-y-2">
                {b.items.map((it, n) => (
                  <li key={n} className="flex gap-3">
                    <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-key" aria-hidden />
                    <span>
                      <Inline text={it} />
                    </span>
                  </li>
                ))}
              </Tag>
            )
          }
          case 'callout':
            return <Callout key={i} kind={b.kind} title={b.title} text={b.text} />
          case 'code':
            return <CodeBlock key={i} title={b.title} lang={b.lang} code={b.code} notes={b.notes} />
          case 'table':
            return (
              <div key={i} className="my-6 overflow-x-auto rounded-badge border border-line bg-paper">
                <table className="w-full min-w-[520px] text-left text-[0.95rem]">
                  <thead>
                    <tr className="border-b border-line">
                      {b.head.map((h) => (
                        <th key={h} scope="col" className="px-4 py-3 font-display font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, n) => (
                      <tr key={n} className="border-b border-line/60 align-top last:border-0">
                        {r.map((c, k) => (
                          <td key={k} className={`px-4 py-3 ${k === 0 ? 'font-semibold' : ''}`}>
                            <Inline text={c} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'compare':
            return (
              <div key={i} className={`my-6 grid gap-3 ${b.items.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                {b.items.map((it) => (
                  <div key={it.title} className={`rounded-badge border-2 p-4 ${toneSoft[it.tone]}`}>
                    <p className={`font-display text-lg font-bold ${toneText[it.tone]}`}>{it.title}</p>
                    <p className="mt-1 text-[0.98rem]">
                      <Inline text={it.text} />
                    </p>
                  </div>
                ))}
              </div>
            )
          case 'timeline':
            return (
              <ol key={i} className="my-6 max-w-[72ch]">
                {b.items.map((it, n) => (
                  <li key={n} className="relative grid grid-cols-[6.5rem_1fr] gap-4 pb-5 last:pb-0 sm:grid-cols-[8rem_1fr]">
                    <span className="pt-0.5 text-right font-display font-bold">{it.when}</span>
                    <span className="relative border-l-2 border-line pl-5">
                      <span className={`absolute -left-[7px] top-2 h-3 w-3 rounded-full ring-4 ring-fog ${toneBg[it.tone]}`} aria-hidden />
                      <Inline text={it.what} />
                    </span>
                  </li>
                ))}
              </ol>
            )
          case 'lab':
            return <Lab key={i} id={b.lab} />
          case 'diagram':
            return <Diagram key={i} id={b.id} />
        }
      })}
    </div>
  )
}
