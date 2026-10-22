import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Only the UI tests run in jsdom; the engine tests stay in node.
if (typeof window !== 'undefined') {
  afterEach(() => {
    cleanup()
    localStorage.clear()
    window.location.hash = ''
  })

  // jsdom lacks these browser APIs the app touches.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
}
