import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, RotateCcw, X } from 'lucide-react'
import type { Question } from '../data/types'
import { useProgress } from '../features/progress/progress'
import { celebrate } from '../lib/confetti'

export function Quiz({ slug, questions, onDone }: { slug: string; questions: Question[]; onDone: () => void }) {
  const { recordQuiz } = useProgress()
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [finished, setFinished] = useState(false)

  // Where keyboard focus goes once the next render has mounted it. The question heading mounts late (AnimatePresence waits
  // for the exit animation), so focus is applied from ref callbacks rather than an effect.
  const focusNext = useRef<'question' | 'feedback' | 'result' | null>(null)
  const focusOnMount = (target: 'question' | 'feedback' | 'result') => (el: HTMLElement | null) => {
    if (el && focusNext.current === target) {
      focusNext.current = null
      el.focus()
    }
  }

  const q = questions[i]

  const choose = (n: number) => {
    if (picked !== null) return
    focusNext.current = 'feedback'
    setPicked(n)
    if (n === q.answer) setCorrect((c) => c + 1)
  }

  const next = () => {
    if (i + 1 < questions.length) {
      focusNext.current = 'question'
      setI(i + 1)
      setPicked(null)
      return
    }
    focusNext.current = 'result'
    setFinished(true)
    recordQuiz(slug, correct, questions.length)
    if (correct / questions.length >= 0.6) {
      celebrate()
      onDone()
    }
  }

  const restart = () => {
    focusNext.current = 'question'
    setI(0)
    setPicked(null)
    setCorrect(0)
    setFinished(false)
  }

  if (finished) {
    const pass = correct / questions.length >= 0.6
    return (
      <div className="panel p-6" role="status" tabIndex={-1} ref={focusOnMount('result')}>
        <p className="font-display text-3xl font-bold">
          {correct} of {questions.length}
        </p>
        <p className="mt-2 text-muted">
          {pass ? 'Module complete. Your progress is saved in this browser.' : 'Get at least 60 % to complete the module. Re-read the parts you missed and try again.'}
        </p>
        <button className="btn mt-4" onClick={restart}>
          <RotateCcw size={16} /> Retake quiz
        </button>
      </div>
    )
  }

  return (
    <div className="panel p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2" aria-hidden>
        {questions.map((_, n) => (
          <span key={n} className={`h-1.5 flex-1 rounded-full ${n < i ? 'bg-key' : n === i ? 'bg-key/50' : 'bg-line'}`} />
        ))}
      </div>
      <p className="text-sm text-muted">
        Question {i + 1} of {questions.length}
      </p>
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}>
          <h3 id={`${slug}-q`} className="mt-1 text-xl font-semibold sm:text-2xl" tabIndex={-1} ref={focusOnMount('question')}>
            {q.q}
          </h3>
          {/* Plain buttons in a group: one click answers, so there is no radio-style selection to move with arrow keys. */}
          <div className="mt-4 grid gap-2" role="group" aria-labelledby={`${slug}-q`}>
            {q.options.map((o, n) => {
              const isAnswer = n === q.answer
              const isPicked = n === picked
              const state =
                picked === null ? 'border-line hover:border-key hover:bg-key/5' : isAnswer ? 'border-join bg-join/10' : isPicked ? 'border-leave bg-leave/10' : 'border-line opacity-60'
              return (
                // aria-disabled rather than disabled after answering: the options stay focusable and readable, with their verdict.
                <button
                  key={n}
                  aria-disabled={picked !== null}
                  onClick={() => choose(n)}
                  className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${state} ${picked !== null ? 'cursor-default' : ''}`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-current/30 font-display text-sm font-bold" aria-hidden>
                    {picked !== null && isAnswer ? <Check size={16} className="text-join" /> : picked !== null && isPicked ? <X size={16} className="text-leave" /> : String.fromCharCode(65 + n)}
                  </span>
                  <span>
                    <span className="sr-only">{String.fromCharCode(65 + n)}: </span>
                    {o}
                    {picked !== null && (isAnswer || isPicked) && (
                      <span className="sr-only">{isAnswer && isPicked ? ' (your answer, correct)' : isAnswer ? ' (correct answer)' : ' (your answer, wrong)'}</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
          {picked !== null && (
            // Focus moves here after answering, so the verdict and explanation are read first; Tab then reaches "Next".
            <div
              className="mt-4 rounded-xl bg-ink/[.04] p-4"
              role="group"
              aria-labelledby={`${slug}-verdict`}
              aria-describedby={`${slug}-explain`}
              tabIndex={-1}
              ref={focusOnMount('feedback')}
            >
              <p id={`${slug}-verdict`} className="font-display font-semibold">
                {picked === q.answer ? 'Correct.' : `Not quite. The answer is ${String.fromCharCode(65 + q.answer)}.`}
              </p>
              <p id={`${slug}-explain`} className="mt-1">
                {q.explain}
              </p>
              <button className="btn btn-key mt-4" onClick={next}>
                {i + 1 < questions.length ? 'Next question' : 'See result'}
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
