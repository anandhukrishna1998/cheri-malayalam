import { useEffect, useRef, useState } from 'react'
import { path, sections, type PathNode, type Unit } from '../lib/content'
import { currentIndex, dueItems, isUnlocked, xpToday } from '../lib/game'
import { useProgress } from '../lib/store'
import { Modal } from './Common'

export function Learn({ onStart, onReview, onGuide }: { onStart: (n: PathNode) => void; onReview: () => void; onGuide: () => void }) {
  const p = useProgress()
  const curIdx = currentIndex(p)
  const cur = path[curIdx]
  const due = dueItems(p)
  const [tips, setTips] = useState<Unit | null>(null)
  const curRef = useRef<HTMLLIElement>(null)
  const allDone = p.completed.includes(path[path.length - 1].id)

  useEffect(() => {
    if (curIdx > 2) curRef.current?.scrollIntoView({ block: 'center' })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const left = Math.max(0, p.dailyGoal - xpToday(p))
  return (
    <div className="home">
      <section className="hello">
        <h1>Namaskaaram{p.name ? `, ${p.name}` : ''} !</h1>
        <p>{left > 0 ? `Encore ${left} XP pour ton objectif du jour.` : 'Objectif du jour atteint. Adipoli ! 🎉'}</p>
        <div className="hero card">
          <div>
            <p className="kicker">{allDone ? 'Tout est terminé !' : `Étape ${cur.unit.index + 1} · ${cur.unit.title}`}</p>
            <b>{allDone ? 'Rejoue tes leçons préférées' : cur.boss ? `Défi : ${cur.unit.boss}` : cur.lesson!.title}</b>
          </div>
          {!allDone && <button className="btn primary" onClick={() => onStart(cur)}>{p.completed.length ? 'Continuer' : 'Commencer'}</button>}
        </div>
        <div className="hello-actions">
          {due.length >= 3 && <button className="btn gold" onClick={onReview}>🔁 Révision · {due.length}</button>}
          <button className="btn ghost" onClick={onGuide}>🗣️ Prononciation</button>
        </div>
      </section>

      {sections.map(s => {
        const sNodes = path.filter(n => n.unit.section.id === s.id)
        const done = sNodes.filter(n => p.completed.includes(n.id)).length
        return (
          <section key={s.id} className="section">
            <div className="section-head">
              <p className="kicker">Section {s.index + 1}</p>
              <h2>{s.title}</h2>
              <p>{s.subtitle}</p>
              <div className="mini-bar wide"><span style={{ width: `${(done / sNodes.length) * 100}%` }} /></div>
              <small>{done} / {sNodes.length} leçons</small>
            </div>

            {s.units.map(u => {
              const nodes = path.filter(n => n.unit.id === u.id)
              return (
                <div key={u.id} className="unit">
                  <div className={`unit-head u${u.index % 4}`}>
                    <span className="unit-emoji" aria-hidden="true">{u.emoji}</span>
                    <div className="unit-text">
                      <p className="unit-kicker">Étape {u.index + 1} · {u.place}</p>
                      <h3>{u.title}</h3>
                      <p>{u.intro}</p>
                    </div>
                    {u.tips.length > 0 && <button className="tips-btn" onClick={() => setTips(u)} aria-label={`Astuces : ${u.title}`}>📖</button>}
                  </div>
                  <ol className="trail">
                    {nodes.map((n, k) => {
                      const gi = path.indexOf(n)
                      const isDone = p.completed.includes(n.id)
                      const open = isUnlocked(p, gi)
                      const isCur = gi === curIdx && !isDone
                      const offset = [0, 1, 2, 1][k % 4]
                      return (
                        <li key={n.id} className={`stop off${offset}`} ref={isCur ? curRef : undefined}>
                          <button
                            className={`node ${isDone ? 'done' : ''} ${isCur ? 'current' : ''} ${n.boss ? 'boss' : ''}`}
                            disabled={!open}
                            onClick={() => onStart(n)}
                            aria-label={`${n.boss ? 'Défi : ' + u.boss : n.lesson!.title}${isDone ? ' (terminé)' : open ? '' : ' (verrouillé)'}`}
                          >
                            {n.boss ? (isDone ? '👑' : '⭐') : isDone ? (p.perfect.includes(n.id) ? '★' : '✓') : open ? k + 1 : '🔒'}
                          </button>
                          <span className="node-label">
                            {isCur && <em>{p.completed.length ? 'Ici' : 'Commencer'}</em>}
                            {n.boss ? `Défi : ${u.boss}` : n.lesson!.title}
                            {n.lesson && n.lesson.verbs.length > 0 && <small className="tag">verbes</small>}
                          </span>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              )
            })}
          </section>
        )
      })}

      {tips && (
        <Modal onClose={() => setTips(null)}>
          <p className="kicker">📖 Astuces · {tips.title}</p>
          {tips.tips.map((t, i) => <p key={i} className="tip-text">{t}</p>)}
          <button className="btn primary wide" onClick={() => setTips(null)}>Compris !</button>
        </Modal>
      )}
    </div>
  )
}
