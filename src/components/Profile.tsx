import { useRef } from 'react'
import { rewards, path } from '../lib/content'
import { badges, daysAgo, dialoguesDone, freezeAvailable, learnedCount, learnedVerbForms, levelFor, levels, liveStreak } from '../lib/game'
import { exportProgress, importProgress, resetProgress, setProgress, useProgress, type Progress } from '../lib/store'
import { GoalPicker } from './Common'

const DAY = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

export function Profile({ onGuide }: { onGuide: () => void }) {
  const p = useProgress()
  const { cur } = levelFor(p.xp)
  const fileRef = useRef<HTMLInputElement>(null)

  const week = Array.from({ length: 7 }, (_, k) => {
    const d = daysAgo(6 - k)
    return { d, xp: p.xpByDay[d] ?? 0, label: DAY[new Date(d + 'T12:00:00').getDay()] }
  })
  const max = Math.max(p.dailyGoal, ...week.map(w => w.xp))
  const lessonsDone = p.completed.filter(id => !id.startsWith('dlg:')).length

  const download = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `cheri-malayalam-sauvegarde-${daysAgo(0)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const upload = async (f: File | undefined) => {
    if (!f) return
    const ok = importProgress(await f.text())
    alert(ok ? 'Progression restaurée !' : 'Ce fichier n’est pas une sauvegarde valide.')
  }
  const set = <K extends keyof Progress>(k: K, v: Progress[K]) => setProgress(s => ({ ...s, [k]: v }))

  return (
    <div className="page">
      <header className="page-top"><h1>{p.name || 'Mon voyage'}</h1></header>

      <div className="profile-stats">
        <div><b>{p.xp}</b><span>XP</span></div>
        <div><b>{liveStreak(p)}</b><span>jours de suite</span></div>
        <div><b>{learnedCount(p)}</b><span>mots appris</span></div>
        <div><b>{lessonsDone}/{path.length}</b><span>leçons</span></div>
        <div><b>{learnedVerbForms(p).length}</b><span>formes de verbes</span></div>
        <div><b>{dialoguesDone(p)}</b><span>dialogues</span></div>
      </div>

      <h2>Cette semaine</h2>
      <div className="week-chart" role="img" aria-label={`XP des 7 derniers jours : ${week.map(w => w.xp).join(', ')}`}>
        <div className="goal-line" style={{ bottom: `${(p.dailyGoal / max) * 100}%` }}><span>objectif</span></div>
        {week.map(w => (
          <div key={w.d} className="wc-col">
            <div className="wc-bar-wrap"><div className={`wc-bar ${w.xp >= p.dailyGoal ? 'hit' : ''}`} style={{ height: `${(w.xp / max) * 100}%` }} title={`${w.xp} XP`} /></div>
            <small>{w.label}</small>
          </div>
        ))}
      </div>
      <p className="small center">{freezeAvailable(p) ? '🧊 Tu as 1 jour de repos cette semaine : ta série ne cassera pas si tu oublies un jour.' : '🧊 Jour de repos déjà utilisé cette semaine.'} Meilleure série : {p.bestStreak} jour{p.bestStreak > 1 ? 's' : ''}.</p>

      <h2>La route du Kerala</h2>
      <ol className="levels">
        {levels.map(l => (
          <li key={l.n} className={l.n <= cur.n ? 'reached' : ''}><span>{l.n <= cur.n ? '📍' : '○'}</span>Niv. {l.n} · {l.place}<small>{l.xp} XP</small></li>
        ))}
      </ol>

      <h2>Récompenses 💌</h2>
      <div className="rewards">
        {rewards.map(r => {
          const open = cur.n >= r.level
          return (
            <div key={r.level} className={`reward-card ${open ? 'open' : ''}`}>
              <small>Niveau {r.level} · {levels.find(l => l.n === r.level)?.place}</small>
              <b>{open ? r.title : 'Surprise…'}</b>
              <p>{open ? r.text : 'Continue à apprendre pour la découvrir.'}</p>
            </div>
          )
        })}
      </div>

      <h2>Badges · {p.badges.filter(b => badges.some(x => x.id === b)).length}/{badges.length}</h2>
      <div className="badges">
        {badges.map(b => {
          const has = p.badges.includes(b.id)
          return <div key={b.id} className={`badge ${has ? 'has' : ''}`}><span>{has ? b.emoji : '🔒'}</span><b>{b.title}</b><small>{b.desc}</small></div>
        })}
      </div>

      <h2>Réglages</h2>
      <div className="settings">
        <p className="set-label">Objectif quotidien</p>
        <GoalPicker />
        <label className="setting"><input type="checkbox" checked={p.autoplay} onChange={e => set('autoplay', e.target.checked)} /><span>Lire l'audio automatiquement</span></label>
        <label className="setting"><input type="checkbox" checked={p.sfx} onChange={e => set('sfx', e.target.checked)} /><span>Sons de bonne / mauvaise réponse</span></label>
        <label className="setting"><input type="checkbox" checked={p.showScript} onChange={e => set('showScript', e.target.checked)} /><span>Afficher aussi l'écriture malayalam (മലയാളം)</span></label>
        <p className="set-label">Thème</p>
        <div className="filters">
          {([['auto', 'Auto'], ['light', '☀️ Clair'], ['dark', '🌙 Sombre']] as [Progress['theme'], string][]).map(([v, l]) => (
            <button key={v} className={p.theme === v ? 'on' : ''} onClick={() => set('theme', v)}>{l}</button>
          ))}
        </div>
        <label className="setting col"><span>Ton prénom</span>
          <input className="type-input" value={p.name} onChange={e => set('name', e.target.value)} />
        </label>
        <button className="btn ghost wide" onClick={onGuide}>🗣️ Guide de prononciation</button>

        <p className="set-label">Sauvegarde</p>
        <p className="small">Ta progression est enregistrée sur ce téléphone uniquement. Fais une sauvegarde de temps en temps, ou avant de changer de téléphone.</p>
        <div className="row-btns">
          <button className="btn ghost" onClick={download}>⬇️ Sauvegarder</button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>⬆️ Restaurer</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e => upload(e.target.files?.[0])} />
        </div>
        <button className="btn ghost danger-text wide" onClick={() => { if (confirm('Tout recommencer depuis le début ? Ta progression sera effacée.')) resetProgress() }}>Recommencer à zéro</button>
      </div>
    </div>
  )
}
