import { useEffect, useMemo, useState } from 'react'
import { FORM_LABEL, speakers, type Item } from '../lib/content'
import type { Exercise } from '../lib/exercises'
import { shuffle } from '../lib/exercises'
import { play } from '../lib/audio'
import { isCorrectManglish } from '../lib/answer'
import { getProgress, useProgress } from '../lib/store'

export type Answer = (ok: boolean, solution?: Item) => void

export function Speaker({ item, size = 'md', auto = false, slow = true }: { item: Item; size?: 'sm' | 'md' | 'lg'; auto?: boolean; slow?: boolean }) {
  useEffect(() => {
    if (!auto || !getProgress().autoplay) return
    const t = setTimeout(() => play(item), 250)
    return () => clearTimeout(t)
  }, [item, auto])
  return (
    <div className="speaker-row">
      <button type="button" className={`speaker ${size}`} onClick={e => { e.stopPropagation(); play(item) }} aria-label={`Écouter « ${item.manglish} »`}>
        <SpeakerIcon />
      </button>
      {slow && <button type="button" className="speaker slow" onClick={e => { e.stopPropagation(); play(item, true) }} aria-label="Écouter lentement">🐢</button>}
    </div>
  )
}

export function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function Script({ item }: { item: Item }) {
  const p = useProgress()
  return p.showScript ? <div className="script" lang="ml">{item.ml}</div> : null
}

function VerbChip({ item }: { item: Item }) {
  if (!item.verb) return null
  return <span className="chip">Verbe « {item.verb.inf} » · {FORM_LABEL[item.verb.form]}</span>
}

/* ---------------- Discover ---------------- */
export function Discover({ item, onDone }: { item: Item; onDone: () => void }) {
  return (
    <div className="ex discover">
      <p className="ex-label">{item.verb ? 'Nouveau verbe' : 'Nouveau mot'}</p>
      <div className="card big-card">
        <VerbChip item={item} />
        <div className="manglish xl">{item.manglish}</div>
        <Script item={item} />
        <div className="fr">{item.fr}</div>
        <div className="hint">🗣️ Se prononce : <b>{item.hint}</b></div>
        <Speaker item={item} size="lg" auto />
        {item.verb && <div className="note">💡 Même forme pour tout le monde : njaan / nee / aval {item.manglish.toLowerCase()}.</div>}
        {item.note && <div className="note">💡 {item.note}</div>}
      </div>
      <div className="ex-footer"><button className="btn primary" onClick={onDone}>J'ai compris</button></div>
    </div>
  )
}

/* ---------------- Multiple choice ---------------- */
type ChoiceEx = Extract<Exercise, { kind: 'toFr' | 'toMl' | 'listen' | 'tense' | 'reply' }>
const TIME_WORD: Record<string, [string, string]> = {
  pres: ['Ippol', 'maintenant'], past: ['Innale', 'hier'], fut: ['Naale', 'demain'], neg: ['', 'ne … pas'],
}

export function Choice({ ex, onAnswer, locked }: { ex: ChoiceEx; onAnswer: Answer; locked: boolean }) {
  const [picked, setPicked] = useState<string | null>(null)
  useEffect(() => setPicked(null), [ex])
  const showMl = ex.kind === 'toMl' || ex.kind === 'tense' || ex.kind === 'reply'
  const choose = (o: Item) => {
    if (locked) return
    setPicked(o.id)
    play(showMl ? o : ex.item)
    onAnswer(o.id === ex.item.id, ex.item)
  }
  const label = {
    toFr: 'Que veut dire ceci ?', toMl: 'Comment dit-on en malayalam ?', listen: 'Écoute et choisis la traduction',
    tense: 'Choisis le bon temps', reply: 'Que réponds-tu ?',
  }[ex.kind]
  return (
    <div className="ex">
      <p className="ex-label">{label}</p>
      <div className="prompt">
        {ex.kind === 'toFr' && <><VerbChip item={ex.item} /><div className="manglish xl">{ex.item.manglish}</div><Script item={ex.item} /><Speaker item={ex.item} auto /></>}
        {ex.kind === 'toMl' && <><VerbChip item={ex.item} /><div className="fr xl">« {ex.item.fr} »</div></>}
        {ex.kind === 'listen' && <Speaker item={ex.item} size="lg" auto />}
        {ex.kind === 'tense' && ex.item.verb && (
          <>
            <div className="manglish lg">Njaan {TIME_WORD[ex.item.verb.form][0].toLowerCase()}{TIME_WORD[ex.item.verb.form][0] ? ' ' : ''}____</div>
            <div className="fr">({TIME_WORD[ex.item.verb.form][1]} · {ex.item.verb.inf})</div>
          </>
        )}
        {ex.kind === 'reply' && (
          <>
            <p className="small">💬 {ex.dialogue}</p>
            {ex.context ? (
              <div className="bubble them">
                <span className="who">{speakers[ex.context.speaker!]?.emoji} {ex.context.speaker}</span>
                <b>{ex.context.manglish}</b><small>{ex.context.fr}</small>
                <Speaker item={ex.context} size="sm" auto slow={false} />
              </div>
            ) : <p className="small">C'est toi qui commences !</p>}
            <p className="small">Tu veux dire : <b>« {ex.item.fr} »</b></p>
          </>
        )}
      </div>
      <div className="options">
        {ex.options.map(o => {
          const state = locked && o.id === ex.item.id ? 'right' : picked === o.id && o.id !== ex.item.id ? 'wrong' : ''
          return (
            <button key={o.id} className={`option ${state}`} onClick={() => choose(o)} disabled={locked}>
              {showMl ? o.manglish : o.fr}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ---------------- Match pairs ---------------- */
export function Match({ items, onAnswer }: { items: Item[]; onAnswer: Answer }) {
  const left = useMemo(() => shuffle(items), [items])
  const right = useMemo(() => shuffle(items), [items])
  const [selL, setSelL] = useState<string | null>(null)
  const [selR, setSelR] = useState<string | null>(null)
  const [done, setDone] = useState<string[]>([])
  const [bad, setBad] = useState(false)
  const [errors, setErrors] = useState(0)

  useEffect(() => {
    if (!selL || !selR) return
    if (selL === selR) {
      const nd = [...done, selL]
      setDone(nd); setSelL(null); setSelR(null)
      if (nd.length === items.length) onAnswer(errors === 0)
    } else {
      setBad(true); setErrors(e => e + 1)
      const t = setTimeout(() => { setBad(false); setSelL(null); setSelR(null) }, 600)
      return () => clearTimeout(t)
    }
  }, [selL, selR]) // eslint-disable-line react-hooks/exhaustive-deps

  const cls = (id: string, side: 'L' | 'R') => {
    if (done.includes(id)) return 'tile done'
    const sel = side === 'L' ? selL : selR
    if (sel === id) return bad ? 'tile wrong' : 'tile selected'
    return 'tile'
  }
  return (
    <div className="ex">
      <p className="ex-label">Relie les paires</p>
      <div className="match">
        <div className="col">
          {left.map(i => (
            <button key={i.id} className={cls(i.id, 'L')} disabled={done.includes(i.id)}
              onClick={() => { play(i); setSelL(i.id) }}>{i.manglish}</button>
          ))}
        </div>
        <div className="col">
          {right.map(i => (
            <button key={i.id} className={cls(i.id, 'R')} disabled={done.includes(i.id)}
              onClick={() => setSelR(i.id)}>{i.fr}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Build the sentence ---------------- */
export function Build({ ex, onAnswer, locked }: { ex: Extract<Exercise, { kind: 'build' }>; onAnswer: Answer; locked: boolean }) {
  const [chosen, setChosen] = useState<number[]>([])
  useEffect(() => setChosen([]), [ex])
  const sentence = chosen.map(i => ex.tiles[i]).join(' ')
  const check = () => onAnswer(isCorrectManglish(sentence, ex.item), ex.item)
  return (
    <div className="ex">
      <p className="ex-label">Construis la phrase</p>
      <div className="prompt"><div className="fr xl">« {ex.item.fr} »</div></div>
      <div className="build-line">
        {chosen.length === 0 && <span className="placeholder">Touche les mots dans l'ordre…</span>}
        {chosen.map((ti, k) => (
          <button key={k} className="tile word" disabled={locked} onClick={() => setChosen(chosen.filter((_, j) => j !== k))}>{ex.tiles[ti]}</button>
        ))}
      </div>
      <div className="bank">
        {ex.tiles.map((w, i) => (
          <button key={i} className={`tile word ${chosen.includes(i) ? 'used' : ''}`} disabled={locked || chosen.includes(i)}
            onClick={() => setChosen([...chosen, i])}>{w}</button>
        ))}
      </div>
      <p className="tip">Astuce : en malayalam, le verbe va à la fin.</p>
      {!locked && <div className="ex-footer"><button className="btn primary" disabled={!chosen.length} onClick={check}>Vérifier</button></div>}
    </div>
  )
}

/* ---------------- Type it ---------------- */
export function TypeIt({ ex, onAnswer, locked }: { ex: Extract<Exercise, { kind: 'type' }>; onAnswer: Answer; locked: boolean }) {
  const [val, setVal] = useState('')
  useEffect(() => setVal(''), [ex])
  const check = () => { if (val.trim()) onAnswer(isCorrectManglish(val, ex.item), ex.item) }
  return (
    <div className="ex">
      <p className="ex-label">Écris en manglish</p>
      <div className="prompt">
        <VerbChip item={ex.item} />
        <div className="fr xl">« {ex.item.fr} »</div>
        <Speaker item={ex.item} />
      </div>
      <input className="type-input" value={val} onChange={e => setVal(e.target.value)} disabled={locked}
        onKeyDown={e => e.key === 'Enter' && !locked && check()}
        autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="off" placeholder="Écris ici…" aria-label="Ta réponse" />
      <p className="tip">Pas de panique pour l'orthographe : « aa » ou « a », « th » ou « t », c'est accepté.</p>
      {!locked && <div className="ex-footer"><button className="btn primary" disabled={!val.trim()} onClick={check}>Vérifier</button></div>}
    </div>
  )
}
