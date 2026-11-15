import { useSyncExternalStore } from 'react'

export interface Progress {
  name: string
  xp: number
  completed: string[]          // path node ids and "dlg:<id>" for dialogues
  perfect: string[]            // lessons finished with no mistakes
  streak: number
  bestStreak: number
  lastDay: string | null       // YYYY-MM-DD of last finished session
  freezeWeek: string | null    // ISO week in which the streak freeze was used
  boxes: Record<string, { box: number; due: number }>  // spaced repetition per item
  misses: Record<string, number>   // how often each item was missed (for "Mes erreurs")
  badges: string[]
  xpByDay: Record<string, number>
  favorites: string[]
  chronoBest: number
  // settings
  showScript: boolean
  dailyGoal: number
  autoplay: boolean
  sfx: boolean
  theme: 'auto' | 'light' | 'dark'
}

const KEY = 'cheri-malayalam-v1'
const fresh: Progress = {
  name: '', xp: 0, completed: [], perfect: [], streak: 0, bestStreak: 0,
  lastDay: null, freezeWeek: null, boxes: {}, misses: {}, badges: [], xpByDay: {}, favorites: [], chronoBest: 0,
  showScript: false, dailyGoal: 30, autoplay: true, sfx: true, theme: 'auto',
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...fresh, ...JSON.parse(raw) }
  } catch { /* storage unavailable */ }
  return { ...fresh }
}

let state = load()
const listeners = new Set<() => void>()

export function getProgress() { return state }

export function setProgress(update: (p: Progress) => Progress) {
  state = update(state)
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ }
  listeners.forEach(l => l())
}

export function resetProgress() { setProgress(p => ({ ...fresh, name: p.name })) }

/** Backup as a file, since progress only lives on this device. */
export function exportProgress(): string { return JSON.stringify({ app: 'cheri-malayalam', v: 1, progress: state }) }
export function importProgress(text: string): boolean {
  try {
    const data = JSON.parse(text)
    if (data?.app !== 'cheri-malayalam' || typeof data.progress !== 'object') return false
    setProgress(() => ({ ...fresh, ...data.progress }))
    return true
  } catch { return false }
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb) },
    () => state,
  )
}
