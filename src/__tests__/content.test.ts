import { describe, expect, it } from 'vitest'
import { GLOSSARY } from '../data/glossary'
import { INTERVIEW } from '../data/interview'
import { MODULES } from '../data/modules'

const slugs = new Set(MODULES.map((m) => m.slug))
const questions = MODULES.flatMap((m) => m.quiz.map((q) => ({ slug: m.slug, ...q })))

/** Every string anywhere inside a value, so links in any block type are found. */
const strings = (v: unknown): string[] =>
  typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []

const duplicates = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i)

describe('content integrity', () => {
  it('quiz answer indices point at an existing option', () => {
    const bad = questions.filter((q) => !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length)
    expect(bad.map((q) => `${q.slug}: ${q.q}`)).toEqual([])
  })

  it('internal #/learn/ links point to existing modules', () => {
    const sources = [...MODULES, ...GLOSSARY, ...INTERVIEW]
    const targets = strings(sources).flatMap((s) => [...s.matchAll(/#\/learn\/([^)\s#?/]+)/g)].map((m) => m[1]))
    expect(targets.filter((t) => !slugs.has(t))).toEqual([])
  })

  it('glossary terms link to existing modules', () => {
    const missing = GLOSSARY.filter((t) => t.module !== undefined && !slugs.has(t.module))
    expect(missing.map((t) => `${t.term} → ${t.module}`)).toEqual([])
  })

  it('module slugs are unique', () => {
    expect(duplicates(MODULES.map((m) => m.slug))).toEqual([])
  })

  it('glossary terms are unique', () => {
    expect(duplicates(GLOSSARY.map((t) => t.term.trim().toLowerCase()))).toEqual([])
  })

  it('correct answers are spread across positions', () => {
    const counts = new Map<number, number>()
    for (const q of questions) counts.set(q.answer, (counts.get(q.answer) ?? 0) + 1)
    const top = Math.max(...counts.values())
    // A learner who always picks the most common position should not pass half the quizzes.
    expect(top / questions.length).toBeLessThanOrEqual(0.5)
  })
})
