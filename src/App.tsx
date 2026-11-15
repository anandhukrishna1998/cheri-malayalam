import { useEffect, useState } from 'react'
import { itemsForNode, type Dialogue, type Item, type PathNode } from './lib/content'
import { dialogueExercises, lessonExercises, reviewExercises, type Exercise } from './lib/exercises'
import { dueItems, finishSession, learnedItems, learnedVerbForms, weakItems, type LessonResult, type SessionKind } from './lib/game'
import { getProgress, setProgress, useProgress } from './lib/store'
import { Lesson, type LessonOutcome } from './components/Lesson'
import { Guide, Result, Stats, TabBar, Welcome, type Tab } from './components/Common'
import { Learn } from './components/Learn'
import { DialogueList, DialogueView } from './components/Dialogues'
import { Chrono, PracticeHub, type PracticeMode } from './components/Practice'
import { Lexicon } from './components/Lexicon'
import { Profile } from './components/Profile'

type Overlay =
  | null
  | { name: 'guide' }
  | { name: 'dialogue'; d: Dialogue }
  | { name: 'lesson'; nodeId: string | null; kind: SessionKind; title: string; exercises: Exercise[]; items: Item[]; back: Overlay }
  | { name: 'chrono'; pool: Item[] }
  | { name: 'result'; result: LessonResult; outcome: LessonOutcome; chrono?: number; back: Overlay }

export default function App() {
  const p = useProgress()
  const [tab, setTab] = useState<Tab>('learn')
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [welcomed, setWelcomed] = useState(!!p.name)

  // Theme
  useEffect(() => {
    const root = document.documentElement
    if (p.theme === 'auto') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', p.theme)
  }, [p.theme])

  useEffect(() => { window.scrollTo(0, 0) }, [tab, overlay?.name])

  if (!welcomed) return <div className="app"><Welcome onDone={() => setWelcomed(true)} /></div>

  /* ----- starting sessions ----- */
  const startNode = (node: PathNode) => {
    const items = itemsForNode(node)
    const replay = p.completed.includes(node.id)
    setOverlay({
      name: 'lesson', nodeId: node.id, kind: node.boss ? 'boss' : 'lesson', items, back: null,
      title: node.boss ? `⭐ Défi : ${node.unit.boss}` : node.lesson!.title,
      exercises: node.boss || replay ? reviewExercises(items, node.boss ? 16 : 12) : lessonExercises(items),
    })
  }
  const startPractice = (mode: PracticeMode) => {
    if (mode === 'chrono') { setOverlay({ name: 'chrono', pool: learnedItems(p) }); return }
    const items = mode === 'review' ? dueItems(p).slice(0, 14)
      : mode === 'weak' ? weakItems(p).slice(0, 12)
      : mode === 'verbs' ? learnedVerbForms(p)
      : learnedItems(p)
    const title = { review: '🔁 Révision', weak: '🩹 Mes erreurs', listen: '👂 Écoute intensive', verbs: '🏃 Les verbes' }[mode]
    setOverlay({
      name: 'lesson', nodeId: null, kind: 'review', items, title, back: null,
      exercises: reviewExercises(items, 12, mode === 'listen' ? 'listen' : mode === 'verbs' ? 'verbs' : 'mixed'),
    })
  }
  const startDialogue = (d: Dialogue) => setOverlay({
    name: 'lesson', nodeId: `dlg:${d.id}`, kind: 'dialogue', items: d.lines, title: `🎭 ${d.title}`,
    exercises: dialogueExercises(d), back: { name: 'dialogue', d },
  })

  const finish = (o: Extract<Overlay, { name: 'lesson' }>, outcome: LessonOutcome) => {
    const { next, result } = finishSession(getProgress(), { nodeId: o.nodeId, kind: o.kind, ...outcome })
    setProgress(() => next)
    setOverlay({ name: 'result', result, outcome, back: o.back })
  }
  const finishChrono = (score: number, answers: { id: string; ok: boolean }[]) => {
    const outcome = { mistakes: answers.filter(a => !a.ok).length, total: answers.length, answers }
    const { next, result } = finishSession(getProgress(), { nodeId: null, kind: 'chrono', chronoScore: score, ...outcome })
    setProgress(() => next)
    setOverlay({ name: 'result', result, outcome, chrono: score, back: null })
  }

  /* ----- full-screen overlays ----- */
  if (overlay?.name === 'lesson') return (
    <div className="app">
      <Lesson key={overlay.title + overlay.exercises.length} title={overlay.title} exercises={overlay.exercises} items={overlay.items}
        onClose={() => setOverlay(overlay.back)} onFinish={o => finish(overlay, o)} />
    </div>
  )
  if (overlay?.name === 'chrono') return <div className="app"><Chrono pool={overlay.pool} onClose={() => setOverlay(null)} onFinish={finishChrono} /></div>
  if (overlay?.name === 'result') return (
    <div className="app">
      <Result result={overlay.result} mistakes={overlay.outcome.mistakes} total={overlay.outcome.total} chrono={overlay.chrono} onDone={() => setOverlay(overlay.back)} />
    </div>
  )

  const due = dueItems(p).length
  return (
    <div className="app has-tabs">
      {overlay?.name === 'guide' && <Guide onBack={() => setOverlay(null)} />}
      {overlay?.name === 'dialogue' && <DialogueView d={overlay.d} onBack={() => setOverlay(null)} onPractice={() => startDialogue(overlay.d)} />}
      {!overlay && <>
        {tab === 'learn' && <><Stats onProfile={() => setTab('profile')} /><Learn onStart={startNode} onReview={() => startPractice('review')} onGuide={() => setOverlay({ name: 'guide' })} /></>}
        {tab === 'dialogues' && <DialogueList onOpen={d => setOverlay({ name: 'dialogue', d })} />}
        {tab === 'practice' && <PracticeHub onStart={startPractice} />}
        {tab === 'lexicon' && <Lexicon />}
        {tab === 'profile' && <Profile onGuide={() => setOverlay({ name: 'guide' })} />}
      </>}
      <TabBar tab={tab} onTab={t => { setOverlay(null); setTab(t) }} badge={{ practice: due >= 3 ? due : 0 }} />
    </div>
  )
}
