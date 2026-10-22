import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Quiz, shuffledOrder } from '../components/Quiz'
import { ProgressProvider } from '../features/progress/progress'
import type { Question } from '../data/types'

vi.mock('../lib/confetti', () => ({ celebrate: vi.fn() }))

const question = (q: string): Question => ({ q, options: ['zero', 'one', 'two', 'three'], answer: 1, explain: 'Because.' })
// Answer buttons are named "<letter>: <text>", plus the verdict once answered.
const options = () => within(screen.getByRole('group', { name: /^Q\d$/ })).getAllByRole('button')
const option = (text: string) => screen.getByRole('button', { name: new RegExp(`^[A-D]: ${text}\\b`) })
const optionTexts = () => options().map((b) => b.lastElementChild?.textContent?.replace(/^[A-D]: /, ''))

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
    fireEvent.click(option('one'))
    expect(screen.getByText('Correct.')).toBeTruthy()
    expect(option('one').textContent).toContain('(your answer, correct)')
  })

  it('marks a wrong pick as wrong after shuffling', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    renderQuiz([question('Q1')])
    // Slot B now holds "two", which is not the answer even though content index 1 is.
    fireEvent.click(options()[1])
    expect(screen.getByText('Not quite. The answer is A.')).toBeTruthy()
    expect(option('two').textContent).toContain('(your answer, wrong)')
    expect(option('one').textContent).toContain('(correct answer)')
  })

  it('keeps the options focusable after answering and moves focus to the feedback', () => {
    renderQuiz([question('Q1')])
    fireEvent.click(option('one'))
    for (const b of options()) {
      expect(b.hasAttribute('disabled')).toBe(false)
      expect(b.getAttribute('aria-disabled')).toBe('true')
    }
    expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Correct.' }))
    // A second click on an answered question changes nothing.
    fireEvent.click(options().find((b) => b !== option('one'))!)
    expect(screen.getByText('Correct.')).toBeTruthy()
  })

  it('reshuffles for each question and on retake, and counts correct answers', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    renderQuiz([question('Q1'), question('Q2')])
    fireEvent.click(option('one'))
    // Math.random() just under 1 never swaps: original order.
    random.mockReturnValue(0.999)
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }))
    // AnimatePresence keeps the previous question mounted until its exit animation ends.
    await waitFor(() => expect(screen.queryByText('Q1')).toBeNull())
    expect(optionTexts()).toEqual(['zero', 'one', 'two', 'three'])
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Q2' }))
    fireEvent.click(option('one'))
    fireEvent.click(screen.getByRole('button', { name: 'See result' }))
    expect(screen.getByText('2 of 2')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('status'))
    random.mockReturnValue(0)
    fireEvent.click(screen.getByRole('button', { name: /Retake quiz/ }))
    expect(optionTexts()).toEqual(['one', 'two', 'three', 'zero'])
  })
})
