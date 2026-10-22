import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { Lab } from '../components/BlockRenderer'
import type { LabId } from '../data/types'

const LABS: { id: LabId; title: string; text: string }[] = [
  { id: 'jml', title: 'JML simulator', text: 'Hire, transfer and terminate Fjordtech employees. Compare manual tickets with automated IAM and read the auditor’s findings.' },
  { id: 'pipeline', title: 'Automation pipeline builder', text: 'Assemble a joiner or leaver runbook from blocks, get it reviewed, and read the PowerShell it becomes.' },
  { id: 'oauth', title: 'OAuth flow simulator', text: 'Step through authorization code + PKCE, client credentials and device code, message by message. Then switch on attacks and see which settings stop them.' },
  { id: 'saml', title: 'SAML flow simulator', text: 'SP- and IdP-initiated SAML sign-in, with the SP’s checks as switches. Forge, replay and redirect assertions, and survive a certificate expiry.' },
  { id: 'saml-inspector', title: 'SAML inspector', text: 'Paste a SAMLResponse or SAMLRequest and see it decoded: NameID, attributes, audience, validity window, signature and certificate thumbprint.' },
  { id: 'scim', title: 'SCIM lab', text: 'Run Entra-style provisioning cycles against a SCIM server in your browser. Make JML changes and watch the requests, or send your own in the console.' },
  { id: 'ca', title: 'Conditional Access lab', text: 'Run sign-ins through Fjordtech’s policy set in a What If tool, then build your own policies in six missions checked by test sign-ins.' },
  { id: 'pim', title: 'PIM lab', text: 'Activate a privileged role with justification, ticket, phishing-resistant MFA and approval, watch it expire, then clean up a tenant full of standing admins.' },
  { id: 'rbac', title: 'RBAC lab', text: 'Fix messy business roles, remove SoD conflicts, and watch privilege creep build up over a career.' },
  { id: 'review', title: 'Access review game', text: 'Sixty seconds, twelve access lines. Catch the risky ones without breaking anyone’s work.' },
]

// Each lab's code loads when its card nears the viewport or the reader opens it, not all ten on page open.
function LabCard({ id, title, text, open, onOpen }: { id: LabId; title: string; text: string; open: boolean; onOpen: (id: LabId) => void }) {
  const ref = useRef<HTMLElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  // Opening removes the button. If it had focus (a reader tabbing onto it) or was pressed, move focus
  // to its card, just before the lab, instead of letting it fall back to the page.
  const refocus = useRef(false)
  const openSelf = useCallback(() => {
    refocus.current = !!button.current && button.current === document.activeElement
    onOpen(id)
  }, [id, onOpen])
  useEffect(() => {
    if (open && refocus.current) ref.current?.focus({ preventScroll: true })
    refocus.current = false
  }, [open])
  useEffect(() => {
    if (open) return
    const el = ref.current
    // Preload only below the viewport: a lab growing above the reader would shift what they are looking at.
    // Browsers without IntersectionObserver just get the lab straight away.
    if (!el || typeof IntersectionObserver === 'undefined') return openSelf()
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && openSelf(), { rootMargin: '0px 0px 300px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [open, openSelf])
  return (
    <section ref={ref} id={id} tabIndex={-1} aria-labelledby={`${id}-title`} className="mt-14 scroll-mt-20 outline-none">
      <h2 id={`${id}-title`} className="text-3xl font-bold">{title}</h2>
      <p className="mt-2 max-w-[65ch] text-muted">{text}</p>
      {open ? (
        <Lab id={id} />
      ) : (
        <div className="my-8 flex h-64 items-center justify-center rounded-[1.75rem] border-2 border-dashed border-line">
          <button ref={button} className="btn btn-key" onClick={() => { openSelf(); refocus.current = true }} aria-label={`Open the ${title}`}>
            Open lab
          </button>
        </div>
      )}
    </section>
  )
}

export function Labs() {
  const [opened, setOpened] = useState<ReadonlySet<LabId>>(new Set())
  const openLab = useCallback((id: LabId) => setOpened((s) => (s.has(id) ? s : new Set(s).add(id))), [])

  // After a jump, labs loading around the target change the page height. Keep the target in place
  // until anything else scrolls the page (the reader, the browser or assistive tech).
  const { hash } = useLocation()
  const pinned = useRef<string | null>(hash.slice(1) || null)
  const pinnedTop = useRef(0)
  const page = useRef<HTMLDivElement>(null)
  const pin = useCallback(() => {
    const el = pinned.current && document.getElementById(pinned.current)
    if (!el) return
    el.scrollIntoView()
    pinnedTop.current = el.getBoundingClientRect().top
  }, [])
  useEffect(() => {
    if (!page.current || typeof ResizeObserver === 'undefined') return
    pin()
    const ro = new ResizeObserver(pin)
    ro.observe(page.current)
    // Our own scrolls and the browser's scroll anchoring leave the target where it was; any other scroll moves it.
    const onScroll = () => {
      const el = pinned.current && document.getElementById(pinned.current)
      if (el && Math.abs(el.getBoundingClientRect().top - pinnedTop.current) > 1) pinned.current = null
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [pin])
  const jumpTo = (id: LabId) => {
    openLab(id)
    pinned.current = id
    pin()
    // Move keyboard focus to the lab as well, so Tab continues inside it rather than in the jump links.
    document.getElementById(id)?.focus({ preventScroll: true })
  }

  return (
    <div ref={page} className="mx-auto max-w-6xl px-4 pt-10">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Labs</h1>
      <p className="mt-3 max-w-[60ch] text-xl text-muted">The hands-on parts of the course in one place. Each lab also appears inside its module, next to the theory.</p>
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Jump to lab">
        {LABS.map((l) => (
          <a key={l.id} href={`#/labs#${l.id}`} className="chip border-ink bg-paper py-1.5 font-semibold" onClick={(e) => { e.preventDefault(); jumpTo(l.id) }}>
            {l.title}
          </a>
        ))}
      </nav>
      {LABS.map((l) => (
        <LabCard key={l.id} {...l} open={opened.has(l.id)} onOpen={openLab} />
      ))}
    </div>
  )
}
