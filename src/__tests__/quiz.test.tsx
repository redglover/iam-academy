import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Quiz, shuffledOrder } from '../components/Quiz'
import { ProgressProvider } from '../features/progress/progress'
import type { Question } from '../data/types'

vi.mock('../lib/confetti', () => ({ celebrate: vi.fn() }))

const question = (q: string): Question => ({ q, options: ['zero', 'one', 'two', 'three'], answer: 1, explain: 'Because.' })
const optionTexts = () => screen.getAllByRole('radio').map((b) => b.textContent?.slice(1))

const renderQuiz = (questions: Question[], onDone = () => {}) =>
  render(
    <ProgressProvider>
      <Quiz slug="fundamentals" questions={questions} onDone={onDone} />
    </ProgressProvider>,
  )

afterEach(() => vi.restoreAllMocks())

describe('shuffledOrder()', () => {
  it('returns a permutation of the option indices', () => {
    for (let n = 0; n < 50; n++) expect([...shuffledOrder(4)].sort()).toEqual([0, 1, 2, 3])
  })

  it('puts every index in every slot over many shuffles', () => {
    const seen = new Set<string>()
    for (let n = 0; n < 500; n++) shuffledOrder(4).forEach((idx, slot) => seen.add(`${idx}@${slot}`))
    expect(seen.size).toBe(16)
  })
})

describe('Quiz', () => {
  it('shows options in shuffled order and still scores the correct one', () => {
    // Math.random() = 0 always swaps with slot 0: [0,1,2,3] -> [1,2,3,0]
    vi.spyOn(Math, 'random').mockReturnValue(0)
    renderQuiz([question('Q1')])
    expect(optionTexts()).toEqual(['one', 'two', 'three', 'zero'])
    fireEvent.click(screen.getByRole('radio', { name: /one/ }))
    expect(screen.getByText('Correct.')).toBeTruthy()
    expect(screen.getByRole('radio', { name: /one/ }).getAttribute('aria-checked')).toBe('true')
  })

  it('marks a wrong pick as wrong after shuffling', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    renderQuiz([question('Q1')])
    // Slot B now holds "two", which is not the answer even though content index 1 is.
    fireEvent.click(screen.getAllByRole('radio')[1])
    expect(screen.getByText('Not quite.')).toBeTruthy()
  })

  it('reshuffles for each question and on retake, and counts correct answers', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    renderQuiz([question('Q1'), question('Q2')])
    fireEvent.click(screen.getByRole('radio', { name: /one/ }))
    // Math.random() just under 1 never swaps: original order.
    random.mockReturnValue(0.999)
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }))
    // AnimatePresence keeps the previous question mounted until its exit animation ends.
    await waitFor(() => expect(screen.queryByText('Q1')).toBeNull())
    expect(optionTexts()).toEqual(['zero', 'one', 'two', 'three'])
    fireEvent.click(screen.getByRole('radio', { name: /one/ }))
    fireEvent.click(screen.getByRole('button', { name: 'See result' }))
    expect(screen.getByText('2 of 2')).toBeTruthy()
    random.mockReturnValue(0)
    fireEvent.click(screen.getByRole('button', { name: /Retake quiz/ }))
    expect(optionTexts()).toEqual(['one', 'two', 'three', 'zero'])
  })
})
