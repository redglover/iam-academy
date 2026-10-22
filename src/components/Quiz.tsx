import { useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { Check, RotateCcw, X } from 'lucide-react'
import type { Question } from '../data/types'
import { useProgress } from '../features/progress/progress'
import { celebrate } from '../lib/confetti'

// Fisher-Yates shuffle of option indices, so the correct answer is not always in the same slot.
export function shuffledOrder(length: number): number[] {
  const order = Array.from({ length }, (_, n) => n)
  for (let n = length - 1; n > 0; n--) {
    const k = Math.floor(Math.random() * (n + 1))
    ;[order[n], order[k]] = [order[k], order[n]]
  }
  return order
}

export function Quiz({ slug, questions, onDone }: { slug: string; questions: Question[]; onDone: () => void }) {
  const { recordQuiz } = useProgress()
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [finished, setFinished] = useState(false)
  // order[slot] is the index into q.options shown in that slot; reshuffled every time a question is shown.
  const [order, setOrder] = useState(() => shuffledOrder(questions[0]?.options.length ?? 0))

  const q = questions[i]

  // picked and the slot comparisons below use display slots; the answer is remapped from content order.
  const answerSlot = order.indexOf(q.answer)

  const choose = (slot: number) => {
    if (picked !== null) return
    setPicked(slot)
    if (slot === answerSlot) setCorrect((c) => c + 1)
  }

  const next = () => {
    if (i + 1 < questions.length) {
      setI(i + 1)
      setOrder(shuffledOrder(questions[i + 1].options.length))
      setPicked(null)
      return
    }
    setFinished(true)
    recordQuiz(slug, correct, questions.length)
    if (correct / questions.length >= 0.6) {
      celebrate()
      onDone()
    }
  }

  const restart = () => {
    setI(0)
    setOrder(shuffledOrder(questions[0].options.length))
    setPicked(null)
    setCorrect(0)
    setFinished(false)
  }

  if (finished) {
    const pass = correct / questions.length >= 0.6
    return (
      <div className="panel p-6" role="status">
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
        <m.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}>
          <h3 className="mt-1 text-xl font-semibold sm:text-2xl">{q.q}</h3>
          <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Answers">
            {order.map((o, n) => {
              const isAnswer = n === answerSlot
              const isPicked = n === picked
              const state =
                picked === null ? 'border-line hover:border-key hover:bg-key/5' : isAnswer ? 'border-join bg-join/10' : isPicked ? 'border-leave bg-leave/10' : 'border-line opacity-60'
              return (
                <button
                  key={o}
                  role="radio"
                  aria-checked={isPicked}
                  disabled={picked !== null}
                  onClick={() => choose(n)}
                  className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${state}`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-current/30 font-display text-sm font-bold">
                    {picked !== null && isAnswer ? <Check size={16} className="text-join" /> : picked !== null && isPicked ? <X size={16} className="text-leave" /> : String.fromCharCode(65 + n)}
                  </span>
                  <span>{q.options[o]}</span>
                </button>
              )
            })}
          </div>
          {picked !== null && (
            <div className="mt-4 rounded-xl bg-ink/[.04] p-4" aria-live="polite">
              <p className="font-display font-semibold">{picked === answerSlot ? 'Correct.' : 'Not quite.'}</p>
              <p className="mt-1">{q.explain}</p>
              <button className="btn btn-key mt-4" onClick={next} autoFocus>
                {i + 1 < questions.length ? 'Next question' : 'See result'}
              </button>
            </div>
          )}
        </m.div>
      </AnimatePresence>
    </div>
  )
}
