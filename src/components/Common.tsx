import { useState, type ReactNode } from 'react'
import { levels, levelFor, liveStreak, xpToday, type LessonResult } from '../lib/game'
import { setProgress, useProgress } from '../lib/store'

/* ---------------- Top stats bar ---------------- */
export function Stats({ onProfile }: { onProfile: () => void }) {
  const p = useProgress()
  const { cur, next, pct } = levelFor(p.xp)
  const streak = liveStreak(p)
  const goalPct = Math.min(1, xpToday(p) / p.dailyGoal)
  return (
    <header className="stats">
      <div className="stat" title="Série de jours"><span className={streak ? 'flame on' : 'flame'}>🔥</span>{streak}</div>
      <button className="level-chip" onClick={onProfile}>
        <span className="lvl">Niv. {cur.n} · {cur.place}</span>
        <span className="xp">{p.xp}{next ? ` / ${next.xp}` : ''} XP</span>
        <span className="mini-bar"><span style={{ width: `${pct * 100}%` }} /></span>
      </button>
      <GoalRing pct={goalPct} />
    </header>
  )
}

export function GoalRing({ pct, size = 40 }: { pct: number; size?: number }) {
  const r = 15, c = 2 * Math.PI * r
  return (
    <div className="goal-ring" style={{ width: size, height: size }} title={`Objectif du jour : ${Math.round(pct * 100)} %`} role="img" aria-label={`Objectif du jour : ${Math.round(pct * 100)} pour cent`}>
      <svg viewBox="0 0 36 36" width={size} height={size} aria-hidden="true">
        <circle cx="18" cy="18" r={r} className="ring-bg" />
        <circle cx="18" cy="18" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 18 18)" />
      </svg>
      <span>{pct >= 1 ? '✓' : '🎯'}</span>
    </div>
  )
}

/* ---------------- Bottom tabs ---------------- */
export type Tab = 'learn' | 'dialogues' | 'practice' | 'lexicon' | 'profile'
const TABS: [Tab, string, string][] = [
  ['learn', '🏝️', 'Apprendre'], ['dialogues', '💬', 'Dialogues'], ['practice', '🎯', 'Entraînement'], ['lexicon', '🔤', 'Traduire'], ['profile', '👤', 'Profil'],
]
export function TabBar({ tab, onTab, badge }: { tab: Tab; onTab: (t: Tab) => void; badge?: Partial<Record<Tab, number>> }) {
  return (
    <nav className="tabbar" aria-label="Navigation">
      <div className="brand" aria-hidden="true"><img src="/favicon.svg" alt="" width="36" height="36" /><span>Chéri<br />Malayalam</span></div>
      {TABS.map(([id, icon, label]) => (
        <button key={id} className={tab === id ? 'on' : ''} onClick={() => onTab(id)} aria-current={tab === id ? 'page' : undefined}>
          <span className="ti">{icon}{badge?.[id] ? <i className="dot">{badge[id]}</i> : null}</span>
          <span className="tl">{label}</span>
        </button>
      ))}
    </nav>
  )
}

/* ---------------- Modal ---------------- */
export function Modal({ children, onClose, className = '' }: { children: ReactNode; onClose: () => void; className?: string }) {
  return (
    <div className="modal-bg" role="dialog" aria-modal="true" onClick={onClose}>
      <div className={`modal ${className}`} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

/* ---------------- Result screen ---------------- */
export function Result({ result, mistakes, total, onDone, chrono }: { result: LessonResult; mistakes: number; total: number; onDone: () => void; chrono?: number }) {
  const [showReward, setShowReward] = useState(result.newRewards.length > 0)
  const [confetti] = useState(() => Array.from({ length: 28 }, () => ({
    x: Math.random() * 100, d: Math.random() * 700, t: 1800 + Math.random() * 1600, r: 200 + Math.random() * 500,
  })))
  const acc = total ? Math.round(((total - mistakes) / total) * 100) : 100
  const lvl = result.levelUp ? levels.find(l => l.n === result.levelUp)! : null
  const p = useProgress()
  return (
    <div className="result">
      <div className="confetti" aria-hidden="true">{confetti.map((c, i) => <i key={i} style={{ left: `${c.x}%`, animationDelay: `${c.d}ms`, animationDuration: `${c.t}ms`, ['--r' as string]: `${c.r}deg` }} />)}</div>
      <h1>{chrono !== undefined ? `${chrono} bonnes réponses !` : mistakes === 0 ? 'Sans faute !' : 'Bien joué !'}</h1>
      <p className="result-sub">{mistakes === 0 ? 'Adipoli ! Tu es incroyable.' : 'Kollaam ! Chaque leçon compte.'}</p>
      <div className="result-cards">
        <div className="rcard xp"><span>XP</span><b>+{result.xpGained}</b></div>
        {chrono !== undefined
          ? <div className="rcard acc"><span>Record</span><b>{p.chronoBest}</b></div>
          : <div className="rcard acc"><span>Précision</span><b>{acc}%</b></div>}
        <div className="rcard streak"><span>Série</span><b>🔥 {result.streak}</b></div>
      </div>
      {result.streakExtended && result.streak > 1 && <p className="pill">Ta série grandit : {result.streak} jours de suite !</p>}
      {result.goalReached && <p className="pill green">🎯 Objectif du jour atteint !</p>}
      {lvl && <div className="levelup">🗺️ Niveau {lvl.n} : bienvenue à <b>{lvl.place}</b> !</div>}
      {result.newBadges.map(b => (
        <div key={b.id} className="badge-new"><span>{b.emoji}</span><div><b>Nouveau badge : {b.title}</b><p>{b.desc}</p></div></div>
      ))}
      <button className="btn primary wide" onClick={onDone}>Continuer</button>

      {showReward && (
        <Modal onClose={() => setShowReward(false)} className="reward">
          <p className="kicker">💌 Récompense débloquée</p>
          {result.newRewards.map(r => <div key={r.level}><h2>{r.title}</h2><p>{r.text}</p></div>)}
          <p className="small">Montre cet écran à ton chéri pour la réclamer 😉</p>
          <button className="btn primary wide" onClick={() => setShowReward(false)}>Génial !</button>
        </Modal>
      )}
    </div>
  )
}

/* ---------------- Pronunciation guide ---------------- */
const GUIDE: [string, string, string][] = [
  ['u', 'comme « ou » dans vous', 'Sukham → sou-kham'],
  ['oo', '« ou » long', 'Onnoode → on-nou-dé'],
  ['e', 'comme « é »', 'Ente → én-té'],
  ['ee', '« i » long', 'Nee → nii'],
  ['aa', '« a » long, on le tient', 'Chaaya → tchaa-ya'],
  ['ai', '« aï » comme dans aïe', 'Kai → kaï'],
  ['ch', 'comme « tch »', 'Chechi → tché-tchi'],
  ['j', 'comme « dj »', 'Joli (travail) → djo-li'],
  ['sh', 'comme « ch » français', 'Shari → cha-ri'],
  ['nj', 'comme « gn » dans montagne', 'Njaan → gnaan'],
  ['th', '« t » doux, langue contre les dents', 'Athe → a-té'],
  ['zh', 'langue repliée vers l’arrière, entre « r » et « l »', 'Kazhichu → ka-zhi-tchou'],
  ['kk, tt, pp…', 'lettre doublée = on appuie plus fort', 'Pathukke → pa-thouk-ké'],
  ['n, m', 'jamais nasal : on prononce bien la consonne', 'Avan → a-vann (pas « avant »)'],
]
export function Guide({ onBack }: { onBack: () => void }) {
  return (
    <div className="page">
      <header className="page-top"><button className="icon-btn" onClick={onBack} aria-label="Retour">←</button><h1>Prononciation</h1></header>
      <p>Le <b>manglish</b>, c'est le malayalam écrit avec notre alphabet. Mais attention : il se lit un peu comme de l'anglais, pas comme du français !</p>
      <div className="guide">
        {GUIDE.map(([k, d, e]) => (
          <div key={k} className="guide-row"><span className="g-key">{k}</span><div><b>{d}</b><small>{e}</small></div></div>
        ))}
      </div>
      <p className="small">Dans les leçons, l'indice « Se prononce » réécrit chaque mot à la française. Les syllabes en MAJUSCULES sont celles où on appuie un peu plus.</p>
    </div>
  )
}

/* ---------------- Onboarding ---------------- */
const GOALS: [number, string, string][] = [[15, 'Tranquille', '5 min / jour'], [30, 'Régulière', '10 min / jour'], [50, 'Sérieuse', '15 min / jour'], [80, 'Intense', '20 min / jour']]
export function GoalPicker() {
  const p = useProgress()
  return (
    <div className="goal-pick" role="radiogroup" aria-label="Objectif quotidien">
      {GOALS.map(([xp, t, d]) => (
        <button key={xp} role="radio" aria-checked={p.dailyGoal === xp} className={p.dailyGoal === xp ? 'on' : ''}
          onClick={() => setProgress(s => ({ ...s, dailyGoal: xp }))}>
          <b>{t}</b><small>{d} · {xp} XP</small>
        </button>
      ))}
    </div>
  )
}

export function Welcome({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  return (
    <div className="welcome">
      {step === 0 ? <>
        <div className="welcome-art" aria-hidden="true">🌴🛶🌴</div>
        <h1>Chéri Malayalam</h1>
        <p>Apprends le malayalam, la langue du Kerala, sans connaître son alphabet : tout est écrit en <b>manglish</b>, avec des lettres que tu connais déjà.</p>
        <label className="setting col">
          <span>Comment tu t'appelles ?</span>
          <input className="type-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ton prénom" />
        </label>
        <button className="btn primary wide" onClick={() => { setProgress(s => ({ ...s, name: name.trim() || 'mon cœur' })); setStep(1) }}>Continuer</button>
      </> : <>
        <h1 className="h-sm">Ton objectif quotidien</h1>
        <p>Combien de temps veux-tu apprendre chaque jour ? Tu pourras changer plus tard.</p>
        <GoalPicker />
        <button className="btn primary wide" onClick={onDone}>C'est parti !</button>
      </>}
    </div>
  )
}
