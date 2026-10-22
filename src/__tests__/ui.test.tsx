import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import App from '../App'
import { Lab } from '../components/BlockRenderer'
import { ProgressProvider } from '../features/progress/progress'
import { MODULES } from '../data/modules'
import type { LabId } from '../data/types'

const LAB_IDS: LabId[] = ['jml', 'pipeline', 'rbac', 'review', 'oauth', 'saml', 'saml-inspector', 'scim', 'ca', 'pim']

// React logs render errors (and act() warnings) through console.error; any of those fails the smoke test.
function watchConsoleErrors() {
  const spy = vi.spyOn(console, 'error')
  return () => {
    const calls = spy.mock.calls.map((c) => c.map(String).join(' '))
    spy.mockRestore()
    expect(calls).toEqual([])
  }
}

describe('lab smoke tests', () => {
  it.each(LAB_IDS)('%s lab renders', async (id) => {
    const done = watchConsoleErrors()
    const { container } = render(
      <ProgressProvider totalModules={MODULES.length}>
        <Lab id={id} />
      </ProgressProvider>,
    )
    // Lab is lazy: wait for the Suspense fallback to be replaced by the lab itself.
    await vi.waitFor(() => expect(container.querySelector('.animate-pulse')).toBeNull(), { timeout: 5000 })
    expect(container.textContent?.trim()).not.toBe('')
    done()
  })
})

const ROUTES: [string, string | RegExp][] = [
  ['/', /Learn IAM by running/],
  ['/labs', 'Labs'],
  ['/glossary', 'Glossary'],
  ['/cheat-sheet', 'Cheat sheet'],
  ['/oauth-playground', 'OAuth playground'],
  ['/no-such-page', /Learn IAM by running/],
  ...MODULES.map((m): [string, string] => [`/learn/${m.slug}`, m.title]),
]

describe('route smoke tests', () => {
  it.each(ROUTES)('%s renders', async (path, heading) => {
    const done = watchConsoleErrors()
    window.location.hash = `#${path}`
    render(<App />)
    expect(await screen.findAllByRole('heading', { level: 1, name: heading })).not.toHaveLength(0)
    // Pages with labs (module pages, /labs) render them lazily; let them settle before checking for errors.
    await vi.waitFor(() => expect(document.querySelector('main .animate-pulse')).toBeNull(), { timeout: 5000 })
    done()
  })
})

describe('labs page loads labs on demand', () => {
  // A controllable IntersectionObserver: tests decide which cards are on screen.
  const observed = new Map<Element, IntersectionObserverCallback>()
  function scrollIntoViewOf(id: string) {
    const el = document.getElementById(id)!
    act(() => observed.get(el)?.([{ target: el, isIntersecting: true } as unknown as IntersectionObserverEntry], {} as IntersectionObserver))
  }
  beforeEach(() => {
    observed.clear()
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(private cb: IntersectionObserverCallback) {}
        observe(el: Element) { observed.set(el, this.cb) }
        disconnect() { for (const [el, cb] of observed) if (cb === this.cb) observed.delete(el) }
      },
    )
    window.location.hash = '#/labs'
  })
  afterEach(() => vi.unstubAllGlobals())

  it('renders every card without loading any lab', async () => {
    render(<App />)
    expect(await screen.findAllByRole('heading', { level: 2 })).toHaveLength(LAB_IDS.length)
    expect(screen.getAllByRole('button', { name: /^Open the / })).toHaveLength(LAB_IDS.length)
    expect(document.querySelector('main .animate-pulse')).toBeNull()
  })

  it('loads a lab when it scrolls into view', async () => {
    const done = watchConsoleErrors()
    render(<App />)
    scrollIntoViewOf('review')
    expect(screen.queryByRole('button', { name: 'Open the Access review game' })).toBeNull()
    await vi.waitFor(() => expect(document.querySelector('main .animate-pulse')).toBeNull(), { timeout: 5000 })
    expect(screen.getAllByRole('button', { name: /^Open the / })).toHaveLength(LAB_IDS.length - 1)
    done()
  })

  it('loads a lab when the reader opens it', async () => {
    const done = watchConsoleErrors()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Open the SAML inspector' }))
    await vi.waitFor(() => expect(document.querySelector('main .animate-pulse')).toBeNull(), { timeout: 5000 })
    expect(screen.getAllByRole('button', { name: /^Open the / })).toHaveLength(LAB_IDS.length - 1)
    done()
  })
})
