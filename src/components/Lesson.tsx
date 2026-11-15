import { useMemo, useRef, useState } from 'react'
import type { Item } from '../lib/content'
import { exerciseItemIds, type Exercise } from '../lib/exercises'
import { preload } from '../lib/audio'
import { sfx } from '../lib/sfx'
import { Build, Choice, Discover, Match, TypeIt } from './Exercises'

const PRAISE = ['Bravo !', 'Super !', 'Kollaam ! (pas mal !)', 'Parfait !', 'Adipoli ! (génial)', 'Très bien !', 'Nannaayi ! (bien joué)']
const COMFORT = ['Presque !', 'Pas grave !', 'Saaramilla ! (pas grave)', 'On la revoit plus tard.']
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]

export interface LessonOutcome { mistakes: number; total: number; answers: { id: string; ok: boolean }[] }

export function Lesson({ title, exercises, items, onClose, onFinish }: {
  title: string; exercises: Exercise[]; items: Item[]; onClose: () => void; onFinish: (o: LessonOutcome) => void
}) {
  useMemo(() => preload(items), [items])
  const [queue, setQueue] = useState(exercises)
  const [idx, setIdx] = useState(0)
  const [feedback, setFeedback] = useState<null | { ok: boolean; text: string; solution?: Item }>(null)
  const [combo, setCombo] = useState(0)
  const mistakes = useRef(0)
  const graded = useRef(0)
  const first = useRef(new Map<string, boolean>())
  const requeued = useRef(new Set<number>())

  const ex = queue[idx]
  const progress = idx / queue.length

  const next = () => {
    setFeedback(null)
    if (idx + 1 >= queue.length) {
      sfx.done()
      onFinish({
        mistakes: mistakes.current, total: graded.current,
        answers: [...first.current].map(([id, ok]) => ({ id, ok })),
      })
    } else setIdx(idx + 1)
  }

  const answer = (ok: boolean, solution?: Item) => {
    graded.current++
    for (const id of exerciseItemIds(ex)) if (!first.current.has(id)) first.current.set(id, ok)
    if (!ok) {
      mistakes.current++
      if (!requeued.current.has(idx)) { requeued.current.add(idx); setQueue(q => [...q, ex]) }
    }
    setCombo(c => ok ? c + 1 : 0)
    if (ok) sfx.right(); else sfx.wrong()
    try { navigator.vibrate?.(ok ? 15 : [30, 40, 30]) } catch { /* */ }
    setFeedback({ ok, text: ok ? pick(PRAISE) : pick(COMFORT), solution })
  }

  return (
    <div className="lesson">
      <header className="lesson-top">
        <button className="icon-btn" onClick={() => { if (confirm('Quitter ? Ta progression dans cette leçon sera perdue.')) onClose() }} aria-label="Quitter">✕</button>
        <div className="bar" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-label="Progression"><div style={{ width: `${progress * 100}%` }} /></div>
        {combo >= 3 && <span className="combo" aria-label={`${combo} bonnes réponses d'affilée`}>🔥{combo}</span>}
      </header>
      <p className="lesson-title">{title}</p>

      <main className="lesson-body" key={idx}>
        {ex.kind === 'discover' && <Discover item={ex.item} onDone={next} />}
        {(ex.kind === 'toFr' || ex.kind === 'toMl' || ex.kind === 'listen' || ex.kind === 'tense' || ex.kind === 'reply') &&
          <Choice ex={ex} onAnswer={answer} locked={!!feedback} />}
        {ex.kind === 'match' && <Match items={ex.items} onAnswer={answer} />}
        {ex.kind === 'build' && <Build ex={ex} onAnswer={answer} locked={!!feedback} />}
        {ex.kind === 'type' && <TypeIt ex={ex} onAnswer={answer} locked={!!feedback} />}
      </main>

      {feedback && (
        <div className={`feedback ${feedback.ok ? 'ok' : 'ko'}`} role="status">
          <div>
            <strong>{feedback.text}</strong>
            {feedback.solution && (
              <p>{feedback.ok ? '' : 'La bonne réponse : '}<b>{feedback.solution.manglish}</b> = {feedback.solution.fr}</p>
            )}
          </div>
          <button className={`btn ${feedback.ok ? 'primary' : 'danger'}`} onClick={next} autoFocus>Continuer</button>
        </div>
      )}
    </div>
  )
}
