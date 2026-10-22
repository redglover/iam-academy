import { StrictMode, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { MODULES } from '../data/modules'
import { ProgressProvider, useProgress } from '../features/progress/progress'

// StrictMode double-invokes updaters and effects in development, which is where an impure award() would show.
const wrapper = ({ children }: { children: ReactNode }) => (
  <StrictMode>
    <ProgressProvider>{children}</ProgressProvider>
  </StrictMode>
)
const setup = () => renderHook(() => useProgress(), { wrapper })

describe('award()', () => {
  it('awards a badge once, with 50 XP and a toast', () => {
    const { result } = setup()
    act(() => result.current.award('oauth-real'))
    expect(result.current.badges).toEqual(['oauth-real'])
    expect(result.current.xp).toBe(50)
    expect(result.current.lastBadge).toBe('oauth-real')
  })

  it('ignores repeat awards, also within one batch', () => {
    const { result } = setup()
    act(() => {
      result.current.award('oauth-real')
      result.current.award('oauth-real')
    })
    act(() => result.current.clearLastBadge())
    act(() => result.current.award('oauth-real'))
    expect(result.current.badges).toEqual(['oauth-real'])
    expect(result.current.xp).toBe(50)
    expect(result.current.lastBadge).toBeNull()
  })

  it('awards first-quiz and perfect-quiz once each for a perfect quiz', () => {
    const { result } = setup()
    act(() => result.current.recordQuiz('fundamentals', 3, 3))
    expect(result.current.badges).toEqual(['first-quiz', 'perfect-quiz'])
    expect(result.current.xp).toBe(3 * 20 + 2 * 50)
  })

  it('lets a badge be earned again after reset, also in the same batch', () => {
    const { result } = setup()
    act(() => result.current.award('oauth-real'))
    act(() => {
      result.current.reset()
      result.current.award('oauth-real')
    })
    expect(result.current.badges).toEqual(['oauth-real'])
    expect(result.current.xp).toBe(50)
  })

  it('awards graduate once when the last module is completed', () => {
    const { result } = setup()
    act(() => MODULES.forEach((m) => result.current.completeModule(m.slug)))
    expect(result.current.badges).toEqual(['graduate'])
    expect(result.current.xp).toBe(MODULES.length * 100 + 50)
    expect(result.current.lastBadge).toBe('graduate')
  })
})
