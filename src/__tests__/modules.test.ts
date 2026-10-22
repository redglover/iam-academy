import { describe, expect, it } from 'vitest'
import { MODULES } from '../data/modules'
import { MODULE_INDEX } from '../data/moduleIndex'

describe('module index', () => {
  it('lists every module, in course order', () => {
    expect(MODULE_INDEX.map((m) => m.slug)).toEqual(MODULES.map((m) => m.slug))
  })
})

describe('module content', () => {
  it.each(MODULES.map((m) => [m.slug, m]))('%s has at least 4 quiz questions with valid answers', (_, m) => {
    expect(m.quiz.length).toBeGreaterThanOrEqual(4)
    for (const q of m.quiz) {
      expect(q.answer).toBeGreaterThanOrEqual(0)
      expect(q.answer).toBeLessThan(q.options.length)
    }
  })
})
