import { useMemo, useState } from 'react'
import {
  loadCourseData,
  getCombinedCourseItems,
  type CourseItem,
  type CourseSession,
  type CourseVerb,
  type ComparisonItem,
} from '../lib/course'
import { autoHint } from '../lib/hint'
import { play } from '../lib/audio'
import { addCustomCourseItem, removeCustomCourseItem, useProgress } from '../lib/store'
import type { Item } from '../lib/content'
import { Modal } from './Common'
import { SpeakerIcon } from './Exercises'

export interface CourseProps {
  onStartPractice: (items: CourseItem[]) => void
}

export type CourseFilter = 'all' | 'sessions' | 'verbs' | 'und-aanu' | 'vocab' | 'custom'

const FILTER_PILLS: { id: CourseFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'sessions', label: 'Par cours' },
  { id: 'verbs', label: 'Verbes & -o' },
  { id: 'und-aanu', label: 'Und vs Aanu' },
  { id: 'vocab', label: 'Vocabulaire' },
  { id: 'custom', label: 'Mes ajouts' },
]

function toItem(ci: CourseItem): Item {
  return {
    id: ci.id,
    manglish: ci.manglish,
    fr: ci.fr,
    ml: ci.ml || '',
    hint: ci.hint || '',
    note: ci.note,
  }
}

function compToItem(c: ComparisonItem, prefix: string): Item {
  return {
    id: `${prefix}-${c.manglish.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    manglish: c.manglish,
    fr: c.fr,
    ml: c.ml,
    hint: autoHint(c.manglish),
    note: c.explanation,
  }
}

function exToItem(ex: { manglish: string; fr: string; ml: string }): Item {
  return {
    id: `ex-${ex.manglish.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    manglish: ex.manglish,
    fr: ex.fr,
    ml: ex.ml,
    hint: autoHint(ex.manglish),
  }
}

function verbToItem(v: CourseVerb): Item {
  return {
    id: `v-${v.inf.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    manglish: v.inf,
    fr: v.fr,
    ml: '',
    hint: autoHint(v.inf),
  }
}

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const [, m, d] = parts
    return `${parseInt(d, 10)}/${parseInt(m, 10)}`
  }
  return dateStr
}

export function Course({ onStartPractice }: CourseProps) {
  const p = useProgress()
  const courseData = useMemo(() => loadCourseData(), [])
  const { sessions, verbs, grammar } = courseData

  const customItems = useMemo(
    () => p.customCourseItems || [],
    [p.customCourseItems]
  )

  const combinedItems = useMemo(
    () => getCombinedCourseItems(customItems),
    [customItems]
  )

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<CourseFilter>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [collapsedSessions, setCollapsedSessions] = useState<Record<string, boolean>>({})

  // Form state for adding custom items
  const [formFr, setFormFr] = useState('')
  const [formManglish, setFormManglish] = useState('')
  const [formMl, setFormMl] = useState('')
  const [formNote, setFormNote] = useState('')
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [formError, setFormError] = useState('')

  const toggleSession = (id: string) => {
    setCollapsedSessions(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const allOpen = sessions.every(s => !collapsedSessions[s.id])
  const toggleAll = () => {
    const nextCollapsed = allOpen
    const updated: Record<string, boolean> = {}
    sessions.forEach(s => {
      updated[s.id] = nextCollapsed
    })
    setCollapsedSessions(updated)
  }

  // Filter items based on active pill and search query
  const filteredItems = useMemo(() => {
    let pool = combinedItems

    if (filter === 'custom') {
      pool = combinedItems.filter(i => i.category === 'Mes ajouts')
    } else if (filter === 'verbs') {
      pool = combinedItems.filter(
        i =>
          i.category === 'Verbes' ||
          i.category === 'Verbes & -o' ||
          i.manglish.endsWith('o?') ||
          i.manglish.endsWith('o')
      )
    } else if (filter === 'und-aanu') {
      pool = combinedItems.filter(
        i =>
          i.category === 'Und vs Aanu' ||
          i.manglish.toLowerCase().includes('aanu') ||
          i.manglish.toLowerCase().includes('undu') ||
          i.manglish.toLowerCase().includes('alla') ||
          i.manglish.toLowerCase().includes('illa')
      )
    } else if (filter === 'vocab') {
      pool = combinedItems.filter(
        i =>
          i.category !== 'Verbes' &&
          i.category !== 'Verbes & -o' &&
          i.category !== 'Und vs Aanu'
      )
    }

    const q = search.trim().toLowerCase()
    if (q) {
      pool = pool.filter(
        i =>
          i.manglish.toLowerCase().includes(q) ||
          i.fr.toLowerCase().includes(q) ||
          (i.note && i.note.toLowerCase().includes(q)) ||
          (i.hint && i.hint.toLowerCase().includes(q)) ||
          (i.ml && i.ml.includes(q))
      )
    }

    return pool
  }, [combinedItems, filter, search])

  // Items to use when launching practice
  const practiceItems = filteredItems.length > 0 ? filteredItems : combinedItems

  const handleStartPractice = () => {
    onStartPractice(practiceItems)
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formFr.trim() || !formManglish.trim()) {
      setFormError('Le français et le manglish sont obligatoires.')
      return
    }

    addCustomCourseItem({
      fr: formFr.trim(),
      manglish: formManglish.trim(),
      ml: formMl.trim() || undefined,
      note: formNote.trim() || undefined,
      date: formDate.trim() || new Date().toISOString().slice(0, 10),
    })

    setFormFr('')
    setFormManglish('')
    setFormMl('')
    setFormNote('')
    setFormDate(new Date().toISOString().slice(0, 10))
    setFormError('')
    setShowAddModal(false)
  }

  const handleDeleteCustomItem = (id: string, manglish: string) => {
    if (window.confirm(`Supprimer « ${manglish} » de tes ajouts ?`)) {
      removeCustomCourseItem(id)
    }
  }

  const isSearching = search.trim().length > 0

  return (
    <div className="page course-page">
      {/* 1. Hero */}
      <section className="course-hero card">
        <div className="course-hero-top">
          <p className="kicker">Cahier d'apprentissage</p>
          <h1>Mon cours de malayalam</h1>
          <p className="subtitle">Les cours de Julie avec son professeur</p>
        </div>

        <div className="course-hero-stats">
          <span className="chip">
            📖 {combinedItems.length} expressions & mots
          </span>
          <span className="chip">
            📅 {sessions.length} séances
          </span>
          {customItems.length > 0 && (
            <span className="chip">
              ✍️ {customItems.length} ajout{customItems.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="course-hero-actions">
          <button
            type="button"
            className="btn primary"
            onClick={handleStartPractice}
            title="Lancer une session d'entraînement"
          >
            ▶ S'entraîner sur mon cours ({practiceItems.length})
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setShowAddModal(true)}
            title="Ajouter un mot ou une phrase"
          >
            + Ajouter un mot / une phrase
          </button>
        </div>
      </section>

      {/* 2. Search & Filter Bar */}
      <div className="course-search-wrap">
        <input
          className="type-input"
          type="search"
          placeholder="Rechercher en français, manglish, notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Recherche dans mon cours"
        />
        {isSearching && (
          <button
            type="button"
            className="course-search-clear"
            onClick={() => setSearch('')}
            aria-label="Effacer la recherche"
          >
            ✕
          </button>
        )}
      </div>

      <nav className="course-filters" aria-label="Filtres du cours">
        {FILTER_PILLS.map(p => (
          <button
            key={p.id}
            type="button"
            className={filter === p.id ? 'on' : ''}
            onClick={() => setFilter(p.id)}
          >
            {p.label}
          </button>
        ))}
      </nav>

      {/* Search results view when user types a query */}
      {isSearching && (
        <section className="course-section">
          <div className="course-search-results-head">
            <h3>
              {filteredItems.length} résultat{filteredItems.length > 1 ? 's' : ''} pour « {search} »
            </h3>
          </div>
          {filteredItems.length === 0 ? (
            <div className="empty">
              <p>Aucun mot ni phrase ne correspond à cette recherche.</p>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setSearch('')}
              >
                Effacer la recherche
              </button>
            </div>
          ) : (
            <div className="course-items-list">
              {filteredItems.map(item => (
                <CourseItemCard
                  key={item.id}
                  item={item}
                  showScript={p.showScript}
                  onDelete={
                    item.category === 'Mes ajouts'
                      ? () => handleDeleteCustomItem(item.id, item.manglish)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3. Dedicated Grammar & Verb Cards (shown according to active filter and when not searching) */}
      {!isSearching && (filter === 'all' || filter === 'und-aanu') && (
        <section className="course-section">
          <UndVsAanuCard grammar={grammar.undVsAanu} showScript={p.showScript} />
        </section>
      )}

      {!isSearching && (filter === 'all' || filter === 'verbs') && grammar.questionO && (
        <section className="course-section">
          <QuestionOCard grammar={grammar.questionO} showScript={p.showScript} />
        </section>
      )}

      {!isSearching && (filter === 'all' || filter === 'verbs') && (
        <section className="course-section">
          <VerbTableCard verbs={verbs} />
        </section>
      )}

      {/* 4. Chronological Course Sessions */}
      {!isSearching && (filter === 'all' || filter === 'sessions' || filter === 'vocab') && (
        <section className="course-section">
          <div className="course-section-bar">
            <h2>Séances de cours chronologiques</h2>
            <button
              type="button"
              className="btn ghost small-btn"
              onClick={toggleAll}
            >
              {allOpen ? 'Tout replier' : 'Tout déplier'}
            </button>
          </div>

          <div className="course-sessions-list">
            {sessions.map(session => (
              <SessionAccordion
                key={session.id}
                session={session}
                collapsed={!!collapsedSessions[session.id]}
                onToggle={() => toggleSession(session.id)}
                showScript={p.showScript}
                filter={filter}
              />
            ))}
          </div>
        </section>
      )}

      {/* 5. Custom Items Section (Mes ajouts) */}
      {!isSearching && (filter === 'all' || filter === 'custom') && (
        <section className="course-section">
          <div className="course-section-bar">
            <h2>
              Mes ajouts personnels {customItems.length > 0 ? `(${customItems.length})` : ''}
            </h2>
            <button
              type="button"
              className="btn ghost small-btn"
              onClick={() => setShowAddModal(true)}
            >
              + Ajouter
            </button>
          </div>

          {customItems.length === 0 ? (
            <div className="card course-custom-empty">
              <p>Tu n'as pas encore ajouté de mot personnel.</p>
              <button
                type="button"
                className="btn primary"
                onClick={() => setShowAddModal(true)}
              >
                + Ajouter ton premier mot
              </button>
            </div>
          ) : (
            <div className="course-items-list">
              {combinedItems
                .filter(i => i.category === 'Mes ajouts')
                .map(item => (
                  <CourseItemCard
                    key={item.id}
                    item={item}
                    showScript={p.showScript}
                    onDelete={() => handleDeleteCustomItem(item.id, item.manglish)}
                  />
                ))}
            </div>
          )}
        </section>
      )}

      {/* 6. Add Word/Sentence Modal */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)} className="add-modal">
          <div className="add-modal-header">
            <h2>Ajouter un mot ou une phrase</h2>
            <p className="subtitle">
              Enregistre les expressions apprises avec ton professeur pour les réviser.
            </p>
          </div>

          {formError && <p className="danger-text">{formError}</p>}

          <form onSubmit={handleAddSubmit} className="add-modal-form">
            <div className="add-modal-field">
              <label htmlFor="course-fr">Traduction en français *</label>
              <input
                id="course-fr"
                type="text"
                required
                placeholder="ex: Bonne nuit, Comment vas-tu ?"
                value={formFr}
                onChange={e => setFormFr(e.target.value)}
                autoFocus
              />
            </div>

            <div className="add-modal-field">
              <label htmlFor="course-manglish">Manglish (phonétique latine) *</label>
              <input
                id="course-manglish"
                type="text"
                required
                placeholder="ex: Shubharathri, Sugamano ?"
                value={formManglish}
                onChange={e => setFormManglish(e.target.value)}
              />
              {formManglish.trim() && (
                <span className="field-hint">
                  Prononciation estimée : <b>{autoHint(formManglish)}</b>
                </span>
              )}
            </div>

            <div className="add-modal-field">
              <label htmlFor="course-ml">Écriture malayalam (optionnel)</label>
              <input
                id="course-ml"
                type="text"
                placeholder="ex: ശുഭരാത്രി"
                value={formMl}
                onChange={e => setFormMl(e.target.value)}
              />
            </div>

            <div className="add-modal-field">
              <label htmlFor="course-note">Note / contexte d'utilisation (optionnel)</label>
              <textarea
                id="course-note"
                placeholder="ex: Utilisé le soir avant d'aller dormir"
                value={formNote}
                onChange={e => setFormNote(e.target.value)}
              />
            </div>

            <div className="add-modal-field">
              <label htmlFor="course-date">Date du cours</label>
              <input
                id="course-date"
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
              />
            </div>

            <div className="add-modal-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setShowAddModal(false)}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn primary"
                disabled={!formFr.trim() || !formManglish.trim()}
              >
                Enregistrer
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

/* ---------------- Subcomponents ---------------- */

interface CourseItemCardProps {
  item: CourseItem
  showScript: boolean
  onDelete?: () => void
}

function CourseItemCard({ item, showScript, onDelete }: CourseItemCardProps) {
  return (
    <article className="course-card">
      <button
        type="button"
        className="course-play"
        onClick={() => play(toItem(item))}
        aria-label={`Écouter « ${item.manglish} »`}
      >
        <SpeakerIcon />
      </button>

      <div className="course-card-content">
        <div className="course-card-top-line">
          <b className="course-card-manglish">{item.manglish}</b>
          {item.hint && <span className="course-card-hint">[{item.hint}]</span>}
        </div>

        {showScript && item.ml && (
          <span className="script course-card-script" lang="ml">
            {item.ml}
          </span>
        )}

        <span className="course-card-fr">{item.fr}</span>

        {item.note && (
          <span className="course-card-note">💡 {item.note}</span>
        )}
      </div>

      {onDelete && (
        <button
          type="button"
          className="course-card-delete"
          onClick={onDelete}
          aria-label={`Supprimer « ${item.manglish} »`}
          title="Supprimer"
        >
          ✕
        </button>
      )}
    </article>
  )
}

interface SessionAccordionProps {
  session: CourseSession
  collapsed: boolean
  onToggle: () => void
  showScript: boolean
  filter: CourseFilter
}

function SessionAccordion({
  session,
  collapsed,
  onToggle,
  showScript,
  filter,
}: SessionAccordionProps) {
  // Filter items in session if vocab filter is selected
  const items = useMemo(() => {
    if (filter === 'vocab') {
      return session.items.filter(
        i =>
          i.category !== 'Verbes' &&
          i.category !== 'Verbes & -o' &&
          i.category !== 'Und vs Aanu'
      )
    }
    return session.items
  }, [session.items, filter])

  if (items.length === 0) return null

  return (
    <div className="course-session-wrap">
      <button
        type="button"
        className="course-section-head"
        onClick={onToggle}
        aria-expanded={!collapsed}
      >
        <div className="course-section-title">
          <span>{session.emoji}</span>
          <span>{session.title}</span>
          <span className="course-section-badge">
            {formatShortDate(session.date)} · {items.length} mot{items.length > 1 ? 's' : ''}
          </span>
        </div>
        <span className="course-section-chevron">
          {collapsed ? '▼' : '▲'}
        </span>
      </button>

      {!collapsed && (
        <div className="course-section-body">
          {session.intro && (
            <p className="course-session-intro">{session.intro}</p>
          )}
          <div className="course-items-list">
            {items.map(item => (
              <CourseItemCard
                key={item.id}
                item={item}
                showScript={showScript}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface UndVsAanuCardProps {
  grammar: {
    title: string
    ruleAanu: string
    ruleUndu: string
    pairs: { aanu: ComparisonItem; undu: ComparisonItem }[]
  }
  showScript: boolean
}

function UndVsAanuCard({ grammar, showScript }: UndVsAanuCardProps) {
  return (
    <div className="grammar-box card">
      <div className="grammar-box-head">
        <span className="kicker">Grammaire essentielle</span>
        <h2>⚖️ {grammar.title}</h2>
      </div>

      <div className="grammar-rules-grid">
        <div className="grammar-rule-card aanu">
          <div className="grammar-rule-header">
            <span>AANU (ആണ്)</span>
            <span className="grammar-rule-neg">Négation : ALLA (അല്ല)</span>
          </div>
          <p className="grammar-rule-text">{grammar.ruleAanu}</p>
        </div>

        <div className="grammar-rule-card undu">
          <div className="grammar-rule-header">
            <span>UNDU (ഉണ്ട്)</span>
            <span className="grammar-rule-neg">Négation : ILLA (ഇല്ല)</span>
          </div>
          <p className="grammar-rule-text">{grammar.ruleUndu}</p>
        </div>
      </div>

      <p className="grammar-tip">
        💡 <b>Astuce mnémotechnique</b> : Si tu peux remplacer par « se trouve » ou « j'ai », utilise <b>UNDU</b>. Si tu définis la nature, le nom ou le métier (« c'est / est un »), utilise <b>AANU</b>.
      </p>

      <div className="grammar-pairs-wrap">
        <h4>Exemples comparatifs face à face :</h4>
        <div className="grammar-pairs-list">
          {grammar.pairs.map((pair, idx) => (
            <div key={idx} className="grammar-pair-row">
              <div className="grammar-pair-item">
                <button
                  type="button"
                  className="course-play"
                  onClick={() => play(compToItem(pair.aanu, `aanu-${idx}`))}
                  aria-label={`Écouter « ${pair.aanu.manglish} »`}
                >
                  <SpeakerIcon />
                </button>
                <div className="grammar-pair-text">
                  <span className="grammar-chip-tag aanu">AANU</span>
                  <b>{pair.aanu.manglish}</b>
                  {showScript && pair.aanu.ml && (
                    <span className="script" lang="ml">
                      {pair.aanu.ml}
                    </span>
                  )}
                  <small>{pair.aanu.fr}</small>
                  {pair.aanu.explanation && (
                    <span className="explanation">👉 {pair.aanu.explanation}</span>
                  )}
                </div>
              </div>

              <div className="grammar-pair-item">
                <button
                  type="button"
                  className="course-play"
                  onClick={() => play(compToItem(pair.undu, `undu-${idx}`))}
                  aria-label={`Écouter « ${pair.undu.manglish} »`}
                >
                  <SpeakerIcon />
                </button>
                <div className="grammar-pair-text">
                  <span className="grammar-chip-tag undu">UNDU</span>
                  <b>{pair.undu.manglish}</b>
                  {showScript && pair.undu.ml && (
                    <span className="script" lang="ml">
                      {pair.undu.ml}
                    </span>
                  )}
                  <small>{pair.undu.fr}</small>
                  {pair.undu.explanation && (
                    <span className="explanation">👉 {pair.undu.explanation}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface QuestionOCardProps {
  grammar: {
    title: string
    rule: string
    examples: { manglish: string; fr: string; ml: string }[]
  }
  showScript: boolean
}

function QuestionOCard({ grammar, showScript }: QuestionOCardProps) {
  return (
    <div className="grammar-box card">
      <div className="grammar-box-head">
        <span className="kicker">Oral &amp; conversation</span>
        <h2>🗣️ {grammar.title}</h2>
      </div>

      <p className="grammar-rule-text">{grammar.rule}</p>

      <div className="question-o-list">
        {grammar.examples.map((ex, idx) => (
          <div key={idx} className="question-o-item">
            <button
              type="button"
              className="course-play"
              onClick={() => play(exToItem(ex))}
              aria-label={`Écouter « ${ex.manglish} »`}
            >
              <SpeakerIcon />
            </button>
            <div className="question-o-text">
              <b>{ex.manglish}</b>
              {showScript && ex.ml && (
                <span className="script" lang="ml">
                  {ex.ml}
                </span>
              )}
              <small>{ex.fr}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface VerbTableCardProps {
  verbs: CourseVerb[]
}

function VerbTableCard({ verbs }: VerbTableCardProps) {
  return (
    <div className="grammar-box card">
      <div className="grammar-box-head">
        <span className="kicker">Conjugaison complète</span>
        <h2>🏃 Tableau des 14 verbes d'action</h2>
        <p className="subtitle">
          Toutes les formes clés : infinitif, présent (-unnu), passé, futur (-um), question en -o, et impératif.
        </p>
      </div>

      <div className="verb-table-wrap">
        <table className="verb-table">
          <thead>
            <tr>
              <th>Verbe &amp; Sens</th>
              <th>Présent (-unnu)</th>
              <th>Passé</th>
              <th>Futur (-um)</th>
              <th>Question (-o)</th>
              <th>Impératif</th>
              <th>Audio</th>
            </tr>
          </thead>
          <tbody>
            {verbs.map((v, i) => (
              <tr key={i}>
                <td>
                  <b className="v-inf">{v.inf}</b>
                  <div className="small muted">{v.fr}</div>
                </td>
                <td>{v.pres}</td>
                <td>{v.past}</td>
                <td>{v.fut}</td>
                <td>
                  <span className="v-chip">{v.question}</span>
                </td>
                <td>
                  <b>{v.imperative}</b>
                </td>
                <td>
                  <button
                    type="button"
                    className="course-play sm"
                    onClick={() => play(verbToItem(v))}
                    aria-label={`Écouter « ${v.inf} »`}
                    title={`Écouter ${v.inf}`}
                  >
                    <SpeakerIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Course
