import { useMemo, useState } from 'react'
import { AI_ERROR_TEXT, aiTranslate, cachedAi, setAiCode, type AiError, type AiTranslation } from '../lib/ai'
import { FORMS, FORM_LABEL, dictCategories, phraseCategories, sourceOf, units, verbs, type Form, type Item, type Verb } from '../lib/content'
import { play, playAndWait } from '../lib/audio'
import { translate, type Chip, type Dir } from '../lib/translate'
import { setProgress, useProgress } from '../lib/store'
import { Modal } from './Common'
import { SpeakerIcon } from './Exercises'

type Filter = 'all' | 'learned' | 'fav' | 'verbs'
const DIR_KEY = 'cheri-translate-dir'
const EXAMPLES: Record<Dir, string[]> = {
  fr: ['venir', "J'ai mal à la tête", 'je vais boire du thé', 'il est venu hier', 'je ne mange pas de poisson'],
  ml: ['varuka', 'Njaan naale varum', 'thala vedanikkunnu', 'veettil', 'vannilla'],
}

function readDir(): Dir {
  try { return localStorage.getItem(DIR_KEY) === 'ml' ? 'ml' : 'fr' } catch { return 'fr' }
}

export function Lexicon() {
  const p = useProgress()
  const [q, setQ] = useState('')
  const [dir, setDirState] = useState<Dir>(readDir)
  const [filter, setFilter] = useState<Filter>('all')
  const [verb, setVerb] = useState<{ v: Verb; form: Form | null } | null>(null)
  const setDir = (d: Dir) => { setDirState(d); try { localStorage.setItem(DIR_KEY, d) } catch { /* private mode */ } }

  const result = useMemo(() => translate(q, dir), [q, dir])
  // AI translation for the current text (cached answers show at once)
  const aiKey = dir + ':' + q.trim()
  const [ai, setAi] = useState<{ key: string; data?: AiTranslation; err?: AiError; loading?: boolean }>({ key: '' })
  const cached = useMemo(() => (q.trim() ? cachedAi(q, dir) : null), [q, dir])
  const aiNow = ai.key === aiKey ? ai : cached ? { key: aiKey, data: cached } : null
  const askAi = async () => {
    const key = aiKey
    setAi({ key, loading: true })
    try { setAi({ key, data: await aiTranslate(q, dir) }) } catch (e) { setAi({ key, err: (typeof e === 'string' ? e : 'failed') as AiError }) }
  }
  const toggleFav = (id: string) => setProgress(s => ({ ...s, favorites: s.favorites.includes(id) ? s.favorites.filter(f => f !== id) : [...s.favorites, id] }))
  const swap = () => {
    const best = result.exact[0]
    if (best) setQ(dir === 'fr' ? best.manglish : best.fr.split(' / ')[0])
    setDir(dir === 'fr' ? 'ml' : 'fr')
  }

  const groups = useMemo(() => [
    ...units.map(u => {
      const seen = new Set<string>()
      return { id: u.id, title: `${u.emoji} ${u.title}`, items: u.lessons.flatMap(l => l.items).filter(i => !i.verb && !seen.has(i.id) && seen.add(i.id)) }
    }),
    ...phraseCategories.map(c => ({ id: `phr-${c.id}`, title: `${c.emoji} ${c.title} · phrases utiles`, items: c.phrases })),
    ...dictCategories.map(c => ({ id: `dict-${c.id}`, title: `${c.emoji} ${c.title} · dictionnaire`, items: c.words })),
  ], [])
  const keep = (i: Item) => filter === 'all' || (filter === 'learned' && !!p.boxes[i.id]) || (filter === 'fav' && p.favorites.includes(i.id))

  const searching = q.trim().length > 0
  const nothing = searching && !result.exact.length && !result.verbs.length && !result.related.length && !result.words.some(w => w.item)

  return (
    <div className="page">
      <header className="page-top"><h1>Traduire</h1></header>

      <div className="tr-box card">
        <div className="tr-dir">
          <span className={dir === 'fr' ? 'on' : ''}>Français</span>
          <button className="tr-swap" onClick={swap} aria-label="Inverser la langue">⇄</button>
          <span className={dir === 'ml' ? 'on' : ''}>Manglish</span>
        </div>
        <div className="tr-input">
          <input className="type-input" type="search" value={q} onChange={e => setQ(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false}
            placeholder={dir === 'fr' ? 'Écris en français…' : 'Écris en manglish…'} aria-label="Texte à traduire" />
        </div>
        {!searching && (
          <div className="tr-examples">
            <small>Essaie :</small>
            {EXAMPLES[dir].map(e => <button key={e} onClick={() => setQ(e)}>{e}</button>)}
          </div>
        )}
      </div>

      {searching && (
        <div className="tr-results">
          {result.exact.map((i, n) => (
            <ResultCard key={i.id} item={i} dir={dir} big={n === 0} fav={p.favorites.includes(i.id)} onFav={() => toggleFav(i.id)} showScript={p.showScript} />
          ))}

          <AiCard state={aiNow} dir={dir} prominent={!result.exact.length} onAsk={askAi} showScript={p.showScript} tooLong={q.trim().length > 300} />

          {result.built && !aiNow?.data && (
            <section className="tr-built card">
              <p className="kicker">Essai mot à mot (approximatif) · {result.built.label}</p>
              <p className="manglish lg">{result.built.manglish}</p>
              {p.showScript && <p className="script" lang="ml">{result.built.ml}</p>}
              <div className="tr-built-row">
                <button className="btn ghost" onClick={async () => { for (const c of result.built!.parts) if (c.item) await playAndWait(c.item) }}>▶ Écouter mot par mot</button>
              </div>
              <p className="small">Assemblé mot par mot, sans l’IA : l’ordre et le temps du verbe sont bons, mais les terminaisons (-il « dans », -kku « à »…) manquent et la phrase peut être fausse. Pour une vraie traduction, demande à l’IA.</p>
            </section>
          )}

          {result.words.length > 0 && !aiNow?.data && (
            <section style={{ order: dir === 'ml' ? 0 : 2 }}>
              <h2 className="lex-head">🧩 Mot à mot</h2>
              <div className="tr-words">
                {result.words.map((c, n) => <WordChip key={n} chip={c} dir={dir} />)}
              </div>
            </section>
          )}

          {result.verbs.map(h => <div key={h.verb.id} style={{ order: 1 }}><VerbCard verb={h.verb} form={h.form} showScript={p.showScript} /></div>)}

          {result.related.length > 0 && (
            <section className="lex-group" style={{ order: 3 }}>
              <h2 className="lex-head">{result.exact.length ? 'Voir aussi' : 'Phrases proches'}</h2>
              {result.related.map(i => <LexRow key={i.id} item={i} fav={p.favorites.includes(i.id)} onFav={() => toggleFav(i.id)} showScript={p.showScript} learned={!!p.boxes[i.id]} source />)}
            </section>
          )}

          {nothing && (
            <p className="empty">
              Pas encore dans le dictionnaire 🙈<br />
              <small>Essaie un mot plus simple, ou {dir === 'fr' ? 'passe en manglish' : 'passe en français'} avec ⇄.</small>
            </p>
          )}
        </div>
      )}

      {!searching && (<>
        <h2 className="lex-title">Lexique</h2>
        <div className="filters" role="tablist">
          {([['all', 'Tout'], ['learned', 'Appris'], ['fav', '⭐ Favoris'], ['verbs', 'Verbes']] as [Filter, string][]).map(([id, l]) => (
            <button key={id} role="tab" aria-selected={filter === id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>{l}</button>
          ))}
        </div>

        {filter === 'verbs' ? (
          <div className="verb-list">
            {verbs.map(v => (
              <button key={v.id} className={`verb-row ${p.boxes[v.forms.pres.id] ? '' : 'new'}`} onClick={() => setVerb({ v, form: null })}>
                <b>{v.fr}</b><span>{v.id}</span><small>›</small>
              </button>
            ))}
          </div>
        ) : groups.map(g => {
          const shown = g.items.filter(keep)
          if (!shown.length) return null
          return (
            <section key={g.id} className="lex-group">
              <h2 className="lex-head">{g.title}</h2>
              {shown.map(i => <LexRow key={i.id} item={i} fav={p.favorites.includes(i.id)} onFav={() => toggleFav(i.id)} showScript={p.showScript} learned={!!p.boxes[i.id] || !g.id.startsWith('u')} />)}
            </section>
          )
        })}
        {filter === 'fav' && p.favorites.length === 0 && <p className="empty">Touche l'étoile ★ à côté d'un mot pour le garder ici.</p>}
      </>)}

      {verb && (
        <Modal onClose={() => setVerb(null)}>
          <VerbCard verb={verb.v} form={verb.form} showScript={p.showScript} plain />
          <button className="btn primary wide" onClick={() => setVerb(null)}>Fermer</button>
        </Modal>
      )}
    </div>
  )
}

function ResultCard({ item, dir, big, fav, onFav, showScript }: { item: Item; dir: Dir; big: boolean; fav: boolean; onFav: () => void; showScript: boolean }) {
  const main = dir === 'fr' ? item.manglish : item.fr
  const other = dir === 'fr' ? item.fr : item.manglish
  return (
    <section className={`tr-card card ${big ? 'big' : ''}`}>
      <div className="tr-card-top">
        <button className="speaker sm" onClick={() => play(item)} aria-label={`Écouter ${item.manglish}`}><SpeakerIcon /></button>
        <div className="tr-card-text">
          <b className={dir === 'fr' ? 'manglish' : ''}>{main}</b>
          {showScript && <span className="script" lang="ml">{item.ml}</span>}
          <small>{other}{dir === 'fr' && <> · <i>{item.hint}</i></>}</small>
        </div>
        <button className={`fav ${fav ? 'on' : ''}`} onClick={onFav} aria-pressed={fav} aria-label="Favori">★</button>
      </div>
      {item.note && <p className="note">💡 {item.note}</p>}
      <p className="tr-src">{sourceOf.get(item.id) ?? ''}</p>
    </section>
  )
}

function VerbCard({ verb, form, showScript, plain }: { verb: Verb; form: Form | null; showScript: boolean; plain?: boolean }) {
  return (
    <section className={plain ? '' : 'tr-verb card'}>
      <p className="kicker">Verbe</p>
      <h2 className="tr-verb-title">{verb.fr} = <span className="manglish">{verb.id.replace('-', ' ')}</span></h2>
      <p className="small">Même forme pour je, tu, il, elle, nous, vous, ils !</p>
      <table className="conj">
        <tbody>
          {FORMS.map(f => (
            <tr key={f} className={form === f ? 'hl' : ''}>
              <th>{FORM_LABEL[f]}</th>
              <td><b>{verb.forms[f].manglish}</b>{showScript && <span className="script" lang="ml"> {verb.forms[f].ml}</span>}<small>{verb.forms[f].fr}</small></td>
              <td><button className="lex-play" onClick={() => play(verb.forms[f])} aria-label={`Écouter ${verb.forms[f].manglish}`}><SpeakerIcon /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function WordChip({ chip, dir }: { chip: Chip; dir: Dir }) {
  const i = chip.item
  if (!i) return <div className="tr-word unknown"><small>{chip.src}</small><b>?</b></div>
  const target = dir === 'fr' ? i.manglish : (chip.gloss ?? i.fr)
  return (
    <button className="tr-word" onClick={() => play(i)} aria-label={`Écouter ${i.manglish}`}>
      <small>{chip.src}</small>
      <b>{target}</b>
      {chip.note && <em>{chip.note}</em>}
    </button>
  )
}

function LexRow({ item: i, fav, onFav, showScript, learned, source }: { item: Item; fav: boolean; onFav: () => void; showScript: boolean; learned: boolean; source?: boolean }) {
  return (
    <div className={`lex-row ${learned ? '' : 'new'}`}>
      <button className="lex-play" onClick={() => play(i)} aria-label={`Écouter ${i.manglish}`}><SpeakerIcon /></button>
      <div className="lex-text">
        <b>{i.manglish}</b>
        {showScript && <span className="script" lang="ml">{i.ml}</span>}
        <small>{i.fr}{source && sourceOf.get(i.id) ? ` · ${sourceOf.get(i.id)}` : ''}</small>
      </div>
      <button className={`fav ${fav ? 'on' : ''}`} onClick={onFav} aria-pressed={fav} aria-label="Favori">★</button>
    </div>
  )
}

function AiCard({ state, dir, prominent, onAsk, showScript, tooLong }: {
  state: { data?: AiTranslation; err?: AiError; loading?: boolean } | null
  dir: Dir; prominent: boolean; onAsk: () => void; showScript: boolean; tooLong: boolean
}) {
  const [code, setCode] = useState('')
  if (tooLong) return <p className="small center">Phrase trop longue pour l’IA (300 caractères maximum).</p>
  if (!state || (!state.data && !state.loading && !state.err)) {
    return prominent
      ? <button className="btn primary wide tr-ai-ask" onClick={onAsk}>✨ Traduire avec l’IA</button>
      : <button className="tr-ai-link" onClick={onAsk}>Pas ce que tu cherches ? ✨ Demander à l’IA</button>
  }
  if (state.loading) return <section className="tr-ai card loading" aria-live="polite"><p className="kicker">✨ Traduction IA</p><p className="tr-ai-wait">L’IA réfléchit…</p></section>
  if (state.err) return (
    <section className="tr-ai card" aria-live="polite">
      <p className="kicker">✨ Traduction IA</p>
      <p>{AI_ERROR_TEXT[state.err]}</p>      {state.err === 'bad-code' && (
        <form className="tr-ai-code" onSubmit={e => { e.preventDefault(); setAiCode(code); onAsk() }}>
          <input className="type-input" value={code} onChange={e => setCode(e.target.value)} placeholder="Code secret" aria-label="Code secret" autoComplete="off" />
          <button className="btn primary" type="submit">OK</button>
        </form>
      )}
      {state.err !== 'bad-code' && state.err !== 'not-configured' && <button className="btn ghost" onClick={onAsk}>Réessayer</button>}
    </section>
  )
  const d = state.data!
  const speakable: Item = { id: 'ai-' + d.manglish, manglish: d.manglish, fr: d.french, ml: d.malayalam, hint: '' }
  return (
    <section className="tr-ai card" aria-live="polite">
      <p className="kicker">✨ Traduction IA · à vérifier avec ton chéri</p>
      <div className="tr-card-top">
        <button className="speaker sm" onClick={() => play(speakable)} aria-label={`Écouter ${d.manglish}`}><SpeakerIcon /></button>
        <div className="tr-card-text">
          <b className={dir === 'fr' ? 'manglish' : ''}>{dir === 'fr' ? d.manglish : d.french}</b>
          {showScript && <span className="script" lang="ml">{d.malayalam}</span>}
          <small>{dir === 'fr' ? d.french : d.manglish}</small>
        </div>
      </div>
      {d.literal && <p className="tr-ai-literal"><b>Mot à mot :</b> {d.literal}</p>}
      {d.words.length > 0 && (
        <div className="tr-words">
          {d.words.map((w, n) => <div key={n} className="tr-word"><small>{w.manglish}</small><b>{w.fr}</b></div>)}
        </div>
      )}
      {d.note && <p className="note">💡 {d.note}</p>}
    </section>
  )
}
