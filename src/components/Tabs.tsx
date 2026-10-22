// WAI-ARIA tabs: one tab stop for the tab list, arrow keys / Home / End move between tabs and select them.
import { useId, useRef } from 'react'

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  extra,
  children,
}: {
  tabs: readonly (readonly [T, string])[]
  value: T
  onChange: (v: T) => void
  label: string
  /** Shown next to the tab list, outside it. */
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  const id = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const current = tabs.findIndex(([v]) => v === value)

  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = tabs.length - 1
    const next = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: last }[e.key]
    if (next === undefined) return
    e.preventDefault()
    const n = next < 0 ? last : next > last ? 0 : next
    onChange(tabs[n][0])
    refs.current[n]?.focus()
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
          {tabs.map(([v, text], n) => (
            <button
              key={v}
              ref={(el) => (refs.current[n] = el)}
              id={`${id}-tab-${v}`}
              role="tab"
              aria-selected={v === value}
              aria-controls={`${id}-panel`}
              tabIndex={v === value ? 0 : -1}
              onClick={() => onChange(v)}
              className={`chip py-1.5 font-display text-sm font-semibold ${v === value ? 'border-ink bg-ink text-paper' : 'border-line bg-paper'}`}
            >
              {text}
            </button>
          ))}
        </div>
        {extra}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${value}`}>
        {children}
      </div>
    </>
  )
}
