import { allItems, FORMS, verbById, type Dialogue, type Form, type Item } from './content'

export type Exercise =
  | { kind: 'discover'; item: Item }
  | { kind: 'toFr'; item: Item; options: Item[] }     // see Manglish, pick French
  | { kind: 'toMl'; item: Item; options: Item[] }     // see French, pick Manglish
  | { kind: 'listen'; item: Item; options: Item[] }   // hear it, pick French
  | { kind: 'match'; items: Item[] }
  | { kind: 'build'; item: Item; tiles: string[] }
  | { kind: 'type'; item: Item }
  | { kind: 'tense'; item: Item; options: Item[] }    // pick the right tense of a verb
  | { kind: 'reply'; item: Item; context: Item | null; options: Item[]; dialogue: string } // what do you answer?

export const shuffle = <T,>(a: T[]): T[] => {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

function options(item: Item, pool: Item[], n = 4): Item[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
  const seen = new Set([item.fr, norm(item.manglish)])
  const pick: Item[] = []
  // Prefer distractors of the same kind (verb form vs. phrase), then anything.
  const sameKind = (c: Item) => !!c.verb === !!item.verb
  const candidates = [...shuffle(pool.filter(sameKind)), ...shuffle(pool), ...shuffle(allItems.filter(sameKind)), ...shuffle(allItems)]
  for (const c of candidates) {
    if (pick.length >= n - 1) break
    if (seen.has(c.fr) || seen.has(norm(c.manglish))) continue
    seen.add(c.fr); seen.add(norm(c.manglish)); pick.push(c)
  }
  return shuffle([item, ...pick])
}

const words = (s: string) => s.replace(/[?!.,]/g, '').split(/\s+/).filter(Boolean)
const isPhrase = (i: Item) => words(i.manglish).length >= 2 && words(i.manglish).length <= 7

function build(item: Item): Exercise {
  const own = words(item.manglish)
  const extra = shuffle(allItems.flatMap(i => words(i.manglish)).filter(w => !own.includes(w)))
  const distractors = [...new Set(extra)].slice(0, Math.min(3, Math.max(2, 7 - own.length)))
  return { kind: 'build', item, tiles: shuffle([...own, ...distractors]) }
}

/** "Choose the tense" — only offers forms up to the latest one the lesson teaches. */
function tense(item: Item, maxForm: Form = 'neg'): Exercise | null {
  if (!item.verb) return null
  const v = verbById.get(item.verb.id)!
  const allowed = FORMS.slice(0, FORMS.indexOf(maxForm) + 1)
  if (allowed.length < 2) return null
  return { kind: 'tense', item, options: shuffle(allowed.map(f => v.forms[f])) }
}

function practice(item: Item, pool: Item[], maxForm?: Form): Exercise[] {
  const ex: Exercise[] = [
    { kind: 'toMl', item, options: options(item, pool) },
    { kind: 'listen', item, options: options(item, pool) },
  ]
  if (isPhrase(item)) ex.push(build(item))
  const t = tense(item, maxForm)
  if (t) ex.push(t)
  return ex
}

const maxFormOf = (items: Item[]): Form | undefined => {
  const idx = Math.max(-1, ...items.filter(i => i.verb).map(i => FORMS.indexOf(i.verb!.form)))
  return idx >= 0 ? FORMS[idx] : undefined
}

/** A new lesson: discover each item, then mixed practice. */
export function lessonExercises(items: Item[]): Exercise[] {
  const out: Exercise[] = []
  items.forEach((item, i) => {
    out.push({ kind: 'discover', item })
    out.push({ kind: 'toFr', item, options: options(item, items) })
    if (i % 2 === 1) out.push({ kind: 'toMl', item: items[i - 1], options: options(items[i - 1], items) })
  })
  const maxForm = maxFormOf(items)
  const mixed = shuffle(items.flatMap(i => practice(i, items, maxForm)))
  const typing = shuffle(items.filter(i => !isPhrase(i))).slice(0, 2).map(item => ({ kind: 'type', item }) as Exercise)
  const tail = shuffle([...mixed.slice(0, Math.min(10, 4 + items.length)), ...typing])
  if (items.length >= 4) tail.splice(Math.floor(tail.length / 2), 0, { kind: 'match', items: shuffle(items).slice(0, 4) })
  return [...out, ...tail]
}

/** Boss, replay or review session: no new cards, harder mix. */
export function reviewExercises(items: Item[], max = 14, mode: 'mixed' | 'listen' | 'verbs' = 'mixed'): Exercise[] {
  const chosen = shuffle(items).slice(0, Math.max(4, Math.min(items.length, max - 2)))
  if (mode === 'listen') return chosen.map(item => ({ kind: 'listen', item, options: options(item, items) }) as Exercise)
  if (mode === 'verbs') return chosen.flatMap(item => {
    const t = tense(item)
    return t ? [t] : [{ kind: 'toMl', item, options: options(item, items) } as Exercise]
  })
  const ex: Exercise[] = chosen.map((item, i) => {
    const r = (i + Math.floor(Math.random() * 3)) % 5
    if (r === 0 && isPhrase(item)) return build(item)
    if (r === 4 && item.verb) { const t = tense(item); if (t) return t }
    if (r === 0 || r === 3) return { kind: 'type', item }
    if (r === 1) return { kind: 'listen', item, options: options(item, items) }
    return { kind: 'toMl', item, options: options(item, items) }
  })
  if (chosen.length >= 4) {
    ex.splice(2, 0, { kind: 'match', items: chosen.slice(0, 4) })
    if (chosen.length >= 8) ex.push({ kind: 'match', items: chosen.slice(4, 8) })
  }
  return ex
}

/** Dialogue practice: answer each of your lines, understand the others. */
export function dialogueExercises(d: Dialogue): Exercise[] {
  const ex: Exercise[] = []
  d.lines.forEach((line, i) => {
    const prev = i > 0 ? d.lines[i - 1] : null
    if (line.speaker === 'Toi') {
      ex.push({ kind: 'reply', item: line, context: prev, options: options(line, d.lines.filter(l => l.speaker === 'Toi').concat(d.lines), 3), dialogue: d.title })
    } else {
      ex.push({ kind: 'listen', item: line, options: options(line, d.lines) })
    }
  })
  const toi = d.lines.filter(l => l.speaker === 'Toi' && isPhrase(l))
  if (toi.length) ex.push(build(shuffle(toi)[0]))
  return ex
}

export function exerciseItemIds(e: Exercise): string[] {
  return e.kind === 'match' ? e.items.map(i => i.id) : [e.item.id]
}
