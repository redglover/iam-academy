import { AlertTriangle, Briefcase, Lightbulb, MapPin } from 'lucide-react'
import { Inline } from './Inline'

const STYLES = {
  tip: { icon: Lightbulb, cls: 'border-join/40 bg-join/[.07]', ic: 'text-join' },
  warn: { icon: AlertTriangle, cls: 'border-leave/40 bg-leave/[.07]', ic: 'text-leave' },
  field: { icon: Briefcase, cls: 'border-auto/40 bg-auto/[.07]', ic: 'text-auto' },
  norway: { icon: MapPin, cls: 'border-key/40 bg-key/[.07]', ic: 'text-key' },
}

export function Callout({ kind, title, text }: { kind: keyof typeof STYLES; title: string; text: string }) {
  const s = STYLES[kind]
  const Icon = s.icon
  return (
    <div role="note" className={`my-6 flex max-w-[72ch] gap-3 rounded-badge border-l-4 border p-4 ${s.cls}`}>
      <Icon className={`mt-0.5 shrink-0 ${s.ic}`} size={20} aria-hidden />
      <div>
        <p className="font-display font-semibold">{title}</p>
        <p className="mt-1 text-[0.98rem]">
          <Inline text={text} />
        </p>
      </div>
    </div>
  )
}
