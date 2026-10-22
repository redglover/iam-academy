import { describe, expect, it } from 'vitest'
import { MODULES } from '../data/modules'
import { hasGraduated } from '../features/progress/progress'

const slugs = MODULES.map((m) => m.slug)

describe('graduate badge', () => {
  it('requires every current module', () => {
    expect(hasGraduated(slugs)).toBe(true)
    expect(hasGraduated(slugs.slice(1))).toBe(false)
  })

  it('ignores stale slugs from renamed modules', () => {
    expect(hasGraduated([...slugs.slice(1), 'old-renamed-slug'])).toBe(false)
  })

  it('ignores duplicates', () => {
    expect(hasGraduated(['a', 'a'], ['a', 'b'])).toBe(false)
  })
})
