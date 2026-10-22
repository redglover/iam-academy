import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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
      <ProgressProvider>
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
  ['/no-such-page', 'Page not found'],
  ['/learn/no-such-module', 'Module not found'],
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

describe('reset progress', () => {
  it('asks for confirmation before clearing progress on the home page', async () => {
    localStorage.setItem('iam-progress-v1', JSON.stringify({ xp: 150, completed: ['jml'], quizBest: { jml: 100 }, badges: ['first-quiz'] }))
    localStorage.setItem('iam-ca-missions', JSON.stringify(['m1', 'm2']))
    window.location.hash = '#/'
    render(<App />)
    await screen.findAllByRole('heading', { level: 1, name: /Learn IAM by running/ })
    expect(screen.getByText(/1 of \d+ unlocked/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reset progress' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText(/1 of \d+ unlocked/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset progress' })).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'Reset progress' }))
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Reset progress' })).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'Reset progress' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, reset' }))
    expect(screen.getByText(/0 of \d+ unlocked/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reset progress' })).toBeNull()
    expect(screen.getByRole('status')).toHaveFocus()
    expect(JSON.parse(localStorage.getItem('iam-progress-v1')!)).toMatchObject({ xp: 0, completed: [], badges: [] })
    expect(localStorage.getItem('iam-ca-missions')).toBeNull()
  })
})
