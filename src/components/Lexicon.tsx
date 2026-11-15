import { useMemo, useState } from 'react'
import { FORMS, FORM_LABEL, units, verbs, type Item, type Verb } from '../lib/content'
import { loose } from '../lib/answer'
import { play } from '../lib/audio'
import { setProgress, useProgress } from '../lib/store'
import { Modal } from './Common'
import { SpeakerIcon } from './Exercises'

type Filter = 'all' | 'learned' | 'fav' | 'verbs'

export function Lexicon() {
  const p = useProgress()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [verb, setVerb] = useState<Verb | null>(null)

  const match = (i: Item) => {
    if (!q.trim()) return true
    const needle = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    const fr = i.fr.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    return fr.includes(needle) || i.manglish.toLowerCase().includes(needle) || (loose(q).length > 2 && loose(i.manglish).includes(loose(q)))
  }
  const keep = (i: Item) => match(i) && (filter === 'all' || (filter === 'learned' && !!p.boxes[i.id]) || (filter === 'fav' && p.favorites.includes(i.id)))

  const groups = useMemo(() => units.map(u => {
    const seen = new Set<string>()
    const items = u.lessons.flatMap(l => l.items).filter(i => !i.verb && !seen.has(i.id) && seen.add(i.id))
    return { u, items }
  }), [])

  const toggleFav = (id: string) => setProgress(s => ({ ...s, favorites: s.favorites.includes(id) ? s.favorites.filter(f => f !== id) : [...s.favorites, id] }))

  const verbList = verbs.filter(v => !q.trim() || match(v.forms.pres) || v.fr.toLowerCase().includes(q.toLowerCase()) || FORMS.some(f => match(v.forms[f])))

  return (
    <div className="page">
      <header className="page-top"><h1>Lexique</h1></header>
      <input className="type-input search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher en français ou en manglish…" aria-label="Chercher" />
      <div className="filters" role="tablist">
        {([['all', 'Tout'], ['learned', 'Appris'], ['fav', '⭐ Favoris'], ['verbs', 'Verbes']] as [Filter, string][]).map(([id, l]) => (
          <button key={id} role="tab" aria-selected={filter === id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>{l}</button>
        ))}
      </div>

      {filter === 'verbs' ? (
        <div className="verb-list">
          {verbList.map(v => (
            <button key={v.id} className={`verb-row ${p.boxes[v.forms.pres.id] ? '' : 'new'}`} onClick={() => setVerb(v)}>
              <b>{v.fr}</b><span>{v.forms.pres.manglish}</span><small>›</small>
            </button>
          ))}
        </div>
      ) : (<>
        {q.trim() && filter === 'all' && verbList.length > 0 && (
          <section className="lex-group">
            <h2 className="lex-head">🏃 Verbes</h2>
            <div className="verb-list">
              {verbList.map(v => (
                <button key={v.id} className={`verb-row ${p.boxes[v.forms.pres.id] ? '' : 'new'}`} onClick={() => setVerb(v)}>
                  <b>{v.fr}</b><span>{v.forms.pres.manglish}</span><small>›</small>
                </button>
              ))}
            </div>
          </section>
        )}
        {groups.map(({ u, items }) => {
          const shown = items.filter(keep)
          if (!shown.length) return null
          return (
            <section key={u.id} className="lex-group">
              <h2 className="lex-head">{u.emoji} {u.title}</h2>
              {shown.map(i => (
                <div key={i.id} className={`lex-row ${p.boxes[i.id] ? '' : 'new'}`}>
                  <button className="lex-play" onClick={() => play(i)} aria-label={`Écouter ${i.manglish}`}><SpeakerIcon /></button>
                  <div className="lex-text">
                    <b>{i.manglish}</b>
                    {p.showScript && <span className="script" lang="ml">{i.ml}</span>}
                    <small>{i.fr}</small>
                  </div>
                  <button className={`fav ${p.favorites.includes(i.id) ? 'on' : ''}`} onClick={() => toggleFav(i.id)} aria-pressed={p.favorites.includes(i.id)} aria-label="Favori">★</button>
                </div>
              ))}
            </section>
          )
        })}
      </>)}
      {filter === 'fav' && p.favorites.length === 0 && <p className="empty">Touche l'étoile ★ à côté d'un mot pour le garder ici.</p>}

      {verb && (
        <Modal onClose={() => setVerb(null)}>
          <p className="kicker">Verbe</p>
          <h2>{verb.fr}</h2>
          <p className="small">Même forme pour je, tu, il, elle, nous, vous, ils !</p>
          <table className="conj">
            <tbody>
              {FORMS.map(f => (
                <tr key={f}>
                  <th>{FORM_LABEL[f]}</th>
                  <td><b>{verb.forms[f].manglish}</b>{p.showScript && <span className="script" lang="ml"> {verb.forms[f].ml}</span>}<small>{verb.forms[f].fr}</small></td>
                  <td><button className="lex-play" onClick={() => play(verb.forms[f])} aria-label={`Écouter ${verb.forms[f].manglish}`}><SpeakerIcon /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn primary wide" onClick={() => setVerb(null)}>Fermer</button>
        </Modal>
      )}
    </div>
  )
}
