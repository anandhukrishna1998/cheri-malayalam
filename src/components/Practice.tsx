import { useEffect, useMemo, useRef, useState } from 'react'
import type { Item } from '../lib/content'
import { shuffle } from '../lib/exercises'
import { dueItems, learnedItems, learnedVerbForms, weakItems } from '../lib/game'
import { play } from '../lib/audio'
import { sfx } from '../lib/sfx'
import { useProgress } from '../lib/store'

export type PracticeMode = 'review' | 'weak' | 'listen' | 'verbs' | 'chrono'

export function PracticeHub({ onStart }: { onStart: (mode: PracticeMode) => void }) {
  const p = useProgress()
  const learned = learnedItems(p).length
  const modes: { id: PracticeMode; emoji: string; title: string; desc: string; count: number; min: number }[] = [
    { id: 'review', emoji: '🔁', title: 'Révision du jour', desc: 'Les mots qu’il est temps de revoir, pour ne pas les oublier.', count: dueItems(p).length, min: 1 },
    { id: 'weak', emoji: '🩹', title: 'Mes erreurs', desc: 'Les mots qui te posent le plus de problèmes.', count: weakItems(p).length, min: 1 },
    { id: 'listen', emoji: '👂', title: 'Écoute intensive', desc: 'Uniquement à l’oreille : entraîne ta compréhension.', count: learned, min: 4 },
    { id: 'verbs', emoji: '🏃', title: 'Les verbes', desc: 'Présent, passé, futur, négatif : choisis la bonne forme.', count: learnedVerbForms(p).length, min: 2 },
    { id: 'chrono', emoji: '⚡', title: 'Défi chrono', desc: `60 secondes, un maximum de bonnes réponses. Record : ${p.chronoBest}`, count: learned, min: 8 },
  ]
  return (
    <div className="page">
      <header className="page-top"><h1>Entraînement</h1></header>
      <p className="muted">Tu connais {learned} mots et phrases. Entraîne-toi comme tu veux !</p>
      <div className="practice-grid">
        {modes.map(m => {
          const ok = m.count >= m.min
          return (
            <button key={m.id} className={`practice-card ${ok ? '' : 'locked'}`} disabled={!ok} onClick={() => onStart(m.id)}>
              <span className="pe" aria-hidden="true">{m.emoji}</span>
              <b>{m.title}{ok && m.id !== 'chrono' && m.id !== 'listen' ? ` · ${m.count}` : ''}</b>
              <small>{ok ? m.desc : m.id === 'review' ? 'Rien à revoir pour l’instant. Reviens plus tard !' : m.id === 'weak' ? 'Aucune erreur à retravailler. Bravo !' : 'Termine d’abord quelques leçons.'}</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ---------------- 60-second challenge ---------------- */
export function Chrono({ pool, onClose, onFinish }: { pool: Item[]; onClose: () => void; onFinish: (score: number, answers: { id: string; ok: boolean }[]) => void }) {
  const [left, setLeft] = useState(60)
  const [score, setScore] = useState(0)
  const [i, setI] = useState(0)
  const [flash, setFlash] = useState<'' | 'ok' | 'ko'>('')
  const answers = useRef<{ id: string; ok: boolean }[]>([])
  const order = useMemo(() => shuffle(pool), [pool])
  const item = order[i % order.length]
  const opts = useMemo(() => {
    const others = shuffle(pool.filter(o => o.fr !== item.fr)).slice(0, 3)
    return shuffle([item, ...others])
  }, [item, pool])

  useEffect(() => {
    if (left <= 0) { sfx.done(); onFinish(score, answers.current); return }
    const t = setTimeout(() => setLeft(l => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left]) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (o: Item) => {
    const ok = o.id === item.id
    answers.current.push({ id: item.id, ok })
    if (ok) { setScore(s => s + 1); sfx.right() } else sfx.wrong()
    setFlash(ok ? 'ok' : 'ko')
    setTimeout(() => setFlash(''), 250)
    setI(n => n + 1)
  }

  return (
    <div className="lesson chrono">
      <header className="lesson-top">
        <button className="icon-btn" onClick={onClose} aria-label="Quitter">✕</button>
        <div className="bar timer" role="timer" aria-label={`${left} secondes`}><div style={{ width: `${(left / 60) * 100}%` }} /></div>
        <span className="chrono-score">⚡ {score}</span>
      </header>
      <div className={`chrono-card ${flash}`}>
        <div className="manglish xl">{item.manglish}</div>
        <button className="speaker sm" onClick={() => play(item)} aria-label="Écouter">🔊</button>
      </div>
      <div className="options">
        {opts.map(o => <button key={o.id + i} className="option" onClick={() => pick(o)}>{o.fr}</button>)}
      </div>
      <p className="tip">{left} s</p>
    </div>
  )
}
