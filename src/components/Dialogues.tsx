import { useEffect, useRef, useState } from 'react'
import { dialogues, speakers, units, type Dialogue } from '../lib/content'
import { dialogueUnlocked } from '../lib/game'
import { playAndWait, stop } from '../lib/audio'
import { useProgress } from '../lib/store'
import { Script, Speaker } from './Exercises'

export function DialogueList({ onOpen }: { onOpen: (d: Dialogue) => void }) {
  const p = useProgress()
  return (
    <div className="page">
      <header className="page-top"><h1>Dialogues</h1></header>
      <p className="muted">De vraies petites conversations du quotidien. Écoute-les, puis joue ton rôle !</p>
      <div className="dlg-list">
        {dialogues.map(d => {
          const open = dialogueUnlocked(p, d.after)
          const done = p.completed.includes(`dlg:${d.id}`)
          const after = units.find(u => u.id === d.after)!
          return (
            <button key={d.id} className={`dlg-card ${open ? '' : 'locked'}`} disabled={!open} onClick={() => onOpen(d)}>
              <span className="dlg-emoji" aria-hidden="true">{open ? d.emoji : '🔒'}</span>
              <span className="dlg-text">
                <b>{d.title}{done && ' ✓'}</b>
                <small>{open ? d.scene : `Débloqué après l'étape ${after.index + 1} « ${after.title} »`}</small>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function DialogueView({ d, onBack, onPractice }: { d: Dialogue; onBack: () => void; onPractice: () => void }) {
  const [showFr, setShowFr] = useState(true)
  const [playing, setPlaying] = useState<number | null>(null)
  const cancel = useRef(false)
  useEffect(() => () => { cancel.current = true; stop() }, [])

  const playAll = async () => {
    if (playing !== null) { cancel.current = true; stop(); setPlaying(null); return }
    cancel.current = false
    for (let i = 0; i < d.lines.length; i++) {
      if (cancel.current) break
      setPlaying(i)
      document.getElementById(`line-${i}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      await playAndWait(d.lines[i])
      await new Promise(r => setTimeout(r, 450))
    }
    setPlaying(null)
  }

  return (
    <div className="page dlg-page">
      <header className="page-top"><button className="icon-btn" onClick={onBack} aria-label="Retour">←</button><h1>{d.emoji} {d.title}</h1></header>
      <p className="muted">{d.scene}</p>
      <div className="dlg-tools">
        <button className="btn ghost" onClick={playAll}>{playing !== null ? '⏹ Arrêter' : '▶️ Tout écouter'}</button>
        <label className="toggle"><input type="checkbox" checked={showFr} onChange={e => setShowFr(e.target.checked)} /> Traduction</label>
      </div>
      <div className="chat">
        {d.lines.map((l, i) => {
          const me = l.speaker === 'Toi'
          return (
            <div key={l.id} id={`line-${i}`} className={`bubble ${me ? 'me' : 'them'} ${playing === i ? 'playing' : ''}`}>
              <span className="who">{speakers[l.speaker!]?.emoji} {l.speaker}</span>
              <b>{l.manglish}</b>
              <Script item={l} />
              {showFr && <small>{l.fr}</small>}
              <Speaker item={l} size="sm" />
            </div>
          )
        })}
      </div>
      <div className="sticky-cta"><button className="btn primary wide" onClick={onPractice}>🎭 Jouer mon rôle</button></div>
    </div>
  )
}
