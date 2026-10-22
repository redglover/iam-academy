import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProgressProvider } from '../features/progress/progress'
import { MODULES } from '../data/modules'
import { ModulePage } from '../pages/ModulePage'
import { NotFound } from '../pages/NotFound'

const render = (path: string) =>
  renderToString(
    <ProgressProvider totalModules={MODULES.length}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<p>home</p>} />
          <Route path="/learn/:slug" element={<ModulePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    </ProgressProvider>,
  )

describe('not-found page', () => {
  // Links and module content use layout effects, which React warns about when rendering to a string.
  const quiet = vi.spyOn(console, 'error')
  beforeAll(() => quiet.mockImplementation(() => {}))
  afterAll(() => quiet.mockRestore())

  it('shows for unknown routes, with a link home', () => {
    const html = render('/no-such-page')
    expect(html).toContain('Page not found')
    expect(html).toContain('/no-such-page')
    expect(html).toContain('href="/"')
  })

  it('shows for an invalid module slug instead of redirecting home', () => {
    const html = render('/learn/not-a-module')
    expect(html).toContain('Module not found')
    expect(html).toContain('not-a-module')
    expect(html).toContain('href="/"')
  })

  it('still renders real modules', () => {
    const html = render(`/learn/${MODULES[0].slug}`)
    expect(html).toContain(MODULES[0].title)
    expect(html).not.toContain('not found')
  })
})
