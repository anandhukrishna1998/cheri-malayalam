import { allItems, dialogues, path, rewards, sections, units } from './content'
import type { Progress } from './store'

/* ---------- Levels: a journey across Kerala ---------- */
export const levels = [
  { n: 1, place: 'Kochi', xp: 0 },
  { n: 2, place: 'Alleppey', xp: 80 },
  { n: 3, place: 'Munnar', xp: 220 },
  { n: 4, place: 'Varkala', xp: 420 },
  { n: 5, place: 'Kozhikode', xp: 700 },
  { n: 6, place: 'Thrissur', xp: 1050 },
  { n: 7, place: 'Wayanad', xp: 1500 },
  { n: 8, place: 'Kannur', xp: 2050 },
  { n: 9, place: 'Kovalam', xp: 2700 },
  { n: 10, place: 'Thiruvananthapuram', xp: 3500 },
]

export function levelFor(xp: number) {
  let cur = levels[0]
  for (const l of levels) if (xp >= l.xp) cur = l
  const next = levels.find(l => l.xp > xp) ?? null
  const pct = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1
  return { cur, next, pct }
}

/* ---------- Dates & streak ---------- */
export function today(d = new Date()) {
  const z = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}
export function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return today(d) }
function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000)
}
function isoWeek(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return `${d.getUTCFullYear()}-W${Math.ceil(((+d - +y0) / 86400000 + 1) / 7)}`
}

/** Streak as it stands today (0 if broken), without mutating. */
export function liveStreak(p: Progress): number {
  if (!p.lastDay) return 0
  const gap = daysBetween(p.lastDay, today())
  if (gap <= 1) return p.streak
  if (gap === 2 && p.freezeWeek !== isoWeek(today())) return p.streak
  return 0
}
export function freezeAvailable(p: Progress) { return p.freezeWeek !== isoWeek(today()) }
export function xpToday(p: Progress) { return p.xpByDay[today()] ?? 0 }

/* ---------- Unlocking ---------- */
export function isUnlocked(p: Progress, index: number) {
  return index === 0 || p.completed.includes(path[index - 1].id)
}
export function currentIndex(p: Progress) {
  const i = path.findIndex(n => !p.completed.includes(n.id))
  return i === -1 ? path.length - 1 : i
}
export const unitDone = (p: Progress, uid: string) => p.completed.includes(`${uid}-boss`)
export const dialogueUnlocked = (p: Progress, after: string) => unitDone(p, after)
export const dialoguesDone = (p: Progress) => dialogues.filter(d => p.completed.includes(`dlg:${d.id}`)).length

/* ---------- Spaced repetition (Leitner) ---------- */
const INTERVALS_H = [0, 12, 24, 72, 168, 336, 720]
export function reviewItem(boxes: Progress['boxes'], id: string, correct: boolean): Progress['boxes'] {
  const prev = boxes[id]?.box ?? 0
  const box = correct ? Math.min(prev + 1, INTERVALS_H.length - 1) : 1
  return { ...boxes, [id]: { box, due: Date.now() + INTERVALS_H[box] * 3600000 } }
}
const teachable = new Set(allItems.map(i => i.id))
export function learnedItems(p: Progress) { return allItems.filter(i => p.boxes[i.id]) }
export function dueItems(p: Progress) {
  const now = Date.now()
  return allItems.filter(i => p.boxes[i.id] && p.boxes[i.id].due <= now)
}
export function weakItems(p: Progress) {
  return allItems.filter(i => (p.misses[i.id] ?? 0) > 0).sort((a, b) => (p.misses[b.id] ?? 0) - (p.misses[a.id] ?? 0))
}
export function learnedCount(p: Progress) { return Object.keys(p.boxes).filter(id => teachable.has(id)).length }
export function learnedVerbForms(p: Progress) { return learnedItems(p).filter(i => i.verb) }

/* ---------- Badges ---------- */
export interface Badge { id: string; emoji: string; title: string; desc: string; test: (p: Progress) => boolean }
const sectionDone = (p: Progress, si: number) => sections[si].units.every(u => unitDone(p, u.id))
export const badges: Badge[] = [
  { id: 'first', emoji: '🌱', title: 'Premier pas', desc: 'Finir ta première leçon', test: p => p.completed.length >= 1 },
  { id: 'perfect', emoji: '💎', title: 'Sans faute', desc: 'Une leçon sans aucune erreur', test: p => p.perfect.length >= 1 },
  { id: 'perfect10', emoji: '👑', title: 'Perfectionniste', desc: '10 leçons sans faute', test: p => p.perfect.length >= 10 },
  { id: 'goal', emoji: '🎯', title: 'Objectif atteint', desc: 'Atteindre ton objectif du jour', test: p => (p.xpByDay[today()] ?? 0) >= p.dailyGoal },
  { id: 'streak3', emoji: '🔥', title: '3 jours de suite', desc: 'Apprendre 3 jours d’affilée', test: p => p.bestStreak >= 3 },
  { id: 'streak7', emoji: '🌶️', title: 'Une semaine épicée', desc: '7 jours d’affilée', test: p => p.bestStreak >= 7 },
  { id: 'streak30', emoji: '🌋', title: 'Un mois de feu', desc: '30 jours d’affilée', test: p => p.bestStreak >= 30 },
  { id: 'words50', emoji: '📚', title: '50 mots', desc: 'Apprendre 50 mots ou phrases', test: p => learnedCount(p) >= 50 },
  { id: 'words150', emoji: '📖', title: '150 mots', desc: 'Apprendre 150 mots ou phrases', test: p => learnedCount(p) >= 150 },
  { id: 'words300', emoji: '🏆', title: '300 mots', desc: 'Apprendre 300 mots ou phrases', test: p => learnedCount(p) >= 300 },
  { id: 'verbs20', emoji: '🏃', title: 'Les verbes, ça roule', desc: 'Apprendre 20 formes de verbes', test: p => learnedVerbForms(p).length >= 20 },
  { id: 'verbs80', emoji: '💪', title: 'Pro des verbes', desc: 'Apprendre 80 formes de verbes', test: p => learnedVerbForms(p).length >= 80 },
  { id: 'dialog1', emoji: '💬', title: 'Première conversation', desc: 'Finir un dialogue', test: p => dialoguesDone(p) >= 1 },
  { id: 'dialog5', emoji: '🗣️', title: 'Bavarde', desc: 'Finir 5 dialogues', test: p => dialoguesDone(p) >= 5 },
  { id: 'chrono15', emoji: '⚡', title: 'Éclair', desc: '15 bonnes réponses au défi chrono', test: p => p.chronoBest >= 15 },
  { id: 'u1', emoji: '🙏', title: 'Namaskaaram !', desc: `Finir « ${units[0].title} »`, test: p => unitDone(p, 'u1') },
  { id: 'u3', emoji: '🍛', title: 'Approuvée par Amma', desc: `Finir « ${units[2].title} »`, test: p => unitDone(p, 'u3') },
  { id: 's1', emoji: '🌴', title: 'Bases solides', desc: `Finir la section « ${sections[0].title} »`, test: p => sectionDone(p, 0) },
  { id: 's2', emoji: '🛶', title: 'Vie quotidienne', desc: `Finir la section « ${sections[1].title} »`, test: p => sectionDone(p, 1) },
  { id: 's3', emoji: '🐘', title: 'Vraie Malayali', desc: `Finir la section « ${sections[2].title} »`, test: p => sectionDone(p, 2) },
  { id: 's4', emoji: '💍', title: 'Prête pour le Kerala', desc: `Finir la section « ${sections[3].title} »`, test: p => sectionDone(p, 3) },
]

/* ---------- Finishing a session ---------- */
export type SessionKind = 'lesson' | 'boss' | 'review' | 'dialogue' | 'chrono'
export interface LessonResult {
  xpGained: number
  newBadges: Badge[]
  levelUp: number | null
  newRewards: typeof rewards
  streak: number
  streakExtended: boolean
  goalReached: boolean
}

export function finishSession(
  p: Progress,
  opts: { nodeId: string | null; kind: SessionKind; mistakes: number; total: number; answers: { id: string; ok: boolean }[]; chronoScore?: number },
): { next: Progress; result: LessonResult } {
  const t = today()
  let streak = p.streak
  let freezeWeek = p.freezeWeek
  let extended = false
  if (p.lastDay !== t) {
    const gap = p.lastDay ? daysBetween(p.lastDay, t) : 99
    if (gap === 1) streak += 1
    else if (gap === 2 && freezeAvailable(p)) { streak += 1; freezeWeek = isoWeek(t) }
    else streak = 1
    extended = true
  }

  const { nodeId, kind, mistakes, total, answers } = opts
  let xp: number
  if (kind === 'chrono') xp = Math.min(30, opts.chronoScore ?? 0)
  else {
    const accuracy = total ? (total - mistakes) / total : 1
    const base = { lesson: 15, boss: 30, review: 12, dialogue: 20 }[kind]
    xp = Math.round((base + (mistakes === 0 ? 5 : 0)) * (0.5 + accuracy / 2))
    const replay = nodeId !== null && p.completed.includes(nodeId)
    if (replay) xp = Math.max(5, Math.round(xp / 2))
  }

  let boxes = p.boxes
  const misses = { ...p.misses }
  for (const a of answers) {
    boxes = reviewItem(boxes, a.id, a.ok)
    if (!a.ok) misses[a.id] = (misses[a.id] ?? 0) + 1
    else if (misses[a.id]) { misses[a.id] -= 1; if (!misses[a.id]) delete misses[a.id] }
  }

  const before = p.xpByDay[t] ?? 0
  const next: Progress = {
    ...p,
    xp: p.xp + xp,
    xpByDay: { ...p.xpByDay, [t]: before + xp },
    completed: nodeId && !p.completed.includes(nodeId) ? [...p.completed, nodeId] : p.completed,
    perfect: nodeId && kind !== 'chrono' && mistakes === 0 && !p.perfect.includes(nodeId) ? [...p.perfect, nodeId] : p.perfect,
    streak, bestStreak: Math.max(p.bestStreak, streak), lastDay: t, freezeWeek, boxes, misses,
    chronoBest: Math.max(p.chronoBest, opts.chronoScore ?? 0),
  }
  const newBadges = badges.filter(b => !p.badges.includes(b.id) && b.test(next))
  next.badges = [...p.badges, ...newBadges.map(b => b.id)]

  const lvBefore = levelFor(p.xp).cur.n
  const lvAfter = levelFor(next.xp).cur.n
  return {
    next,
    result: {
      xpGained: xp, newBadges,
      levelUp: lvAfter > lvBefore ? lvAfter : null,
      newRewards: rewards.filter(r => r.level > lvBefore && r.level <= lvAfter),
      streak, streakExtended: extended,
      goalReached: before < p.dailyGoal && before + xp >= p.dailyGoal,
    },
  }
}
