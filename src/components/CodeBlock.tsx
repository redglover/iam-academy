import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Inline } from './Inline'

export function CodeBlock({ title, code, lang, notes }: { title: string; code: string; lang: string; notes?: string[] }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked */
    }
  }
  return (
    <figure className="my-6 overflow-hidden rounded-badge border border-line bg-[#141833] text-[#E6E9F8]">
      <figcaption className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
        <span className="font-display text-sm font-semibold">{title}</span>
        <span className="flex items-center gap-2">
          <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs">{lang}</span>
          <button onClick={copy} className="rounded-md p-1.5 hover:bg-white/10" aria-label="Copy code">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </span>
      </figcaption>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
      {notes && (
        <ul className="space-y-1.5 border-t border-white/10 bg-white/[.03] px-4 py-3 text-sm text-[#C4C9E6]">
          {notes.map((n, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-[#A791FF]" aria-hidden>
                ▸
              </span>
              <span className="[&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1">
                <Inline text={n} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  )
}
