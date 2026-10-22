import { describe, expect, it } from 'vitest'
import { MODULES } from '../data/modules'
import { MODULE_INDEX } from '../data/moduleIndex'

describe('module index', () => {
  it('lists every module, in course order', () => {
    expect(MODULE_INDEX.map((m) => m.slug)).toEqual(MODULES.map((m) => m.slug))
  })
})
