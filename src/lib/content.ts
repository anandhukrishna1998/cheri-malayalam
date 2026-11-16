import s1 from '../content/section1.json'
import s2 from '../content/section2.json'
import s3 from '../content/section3.json'
import s4 from '../content/section4.json'
import verbsData from '../content/verbs.json'
import dialoguesData from '../content/dialogues.json'
import rewardsData from '../content/rewards.json'
import dictionaryData from '../content/dictionary.json'
import { autoHint, slug } from './hint'

/* ---------- Types ---------- */
export type Form = 'pres' | 'past' | 'fut' | 'neg'
export const FORMS: Form[] = ['pres', 'past', 'fut', 'neg']
export const FORM_LABEL: Record<Form, string> = { pres: 'présent', past: 'passé', fut: 'futur', neg: 'négatif' }

export interface Item {
  id: string
  manglish: string
  fr: string
  hint: string
  ml: string
  note?: string
  accept?: string[]
  verb?: { id: string; form: Form; inf: string }
  speaker?: string
}
export interface Verb { id: string; fr: string; ml: string; forms: Record<Form, Item> }
export interface Lesson { id: string; title: string; items: Item[]; verbs: Verb[]; forms: Form[] }
export interface Unit {
  id: string; title: string; place: string; emoji: string; intro: string; boss: string
  tips: string[]; lessons: Lesson[]; section: Section; index: number
}
export interface Section { id: string; title: string; subtitle: string; units: Unit[]; index: number }
export interface Dialogue { id: string; title: string; emoji: string; scene: string; after: string; lines: Item[] }
export interface Reward { level: number; title: string; text: string }

/* ---------- Raw JSON shapes ---------- */
type RawTuple = [string, string, string, string?]
type RawItem = RawTuple | { id?: string; manglish: string; fr: string; ml: string; hint?: string; note?: string; accept?: string[] }
interface RawLesson { id: string; title: string; items?: RawItem[]; verbs?: string[]; forms?: string[] }
interface RawUnit { id: string; title: string; place: string; emoji: string; intro: string; boss?: string; tips?: string[]; lessons: RawLesson[] }
interface RawSection { id: string; title: string; subtitle: string; units: RawUnit[] }
type RawVerb = { id: string; fr: string; ml: string } & Record<Form, [string, string, string]>

function toItem(r: RawItem): Item {
  if (Array.isArray(r)) {
    const [manglish, fr, ml, note] = r
    return { id: slug(manglish), manglish, fr, ml, hint: autoHint(manglish), ...(note ? { note } : {}) }
  }
  return { ...r, id: r.id ?? slug(r.manglish), hint: r.hint ?? autoHint(r.manglish) }
}

/* ---------- Verbs ---------- */
export const verbs: Verb[] = (verbsData as RawVerb[]).map(v => ({
  id: v.id, fr: v.fr, ml: v.ml,
  forms: Object.fromEntries(FORMS.map(f => {
    const [manglish, fr, ml] = v[f]
    const item: Item = {
      id: `v-${v.id}-${f}`, manglish, fr, ml, hint: autoHint(manglish),
      verb: { id: v.id, form: f, inf: v.fr },
    }
    return [f, item]
  })) as Record<Form, Item>,
}))
export const verbById = new Map(verbs.map(v => [v.id, v]))

/* ---------- Sections, units, lessons ---------- */
export const sections: Section[] = ([s1, s2, s3, s4] as RawSection[]).map((rs, si) => {
  const section: Section = { id: rs.id, title: rs.title, subtitle: rs.subtitle, units: [], index: si }
  section.units = rs.units.map(ru => {
    const unit = { ...ru, boss: ru.boss ?? 'Défi', tips: ru.tips ?? [], section, index: 0 } as unknown as Unit
    unit.lessons = ru.lessons.map(rl => {
      const lv = (rl.verbs ?? []).map(id => {
        const v = verbById.get(id)
        if (!v) throw new Error(`Verbe inconnu « ${id} » dans ${rl.id}`)
        return v
      })
      const forms = (rl.forms ?? (lv.length ? ['pres'] : [])) as Form[]
      const verbItems = forms.flatMap(f => lv.map(v => v.forms[f]))
      return { id: rl.id, title: rl.title, verbs: lv, forms, items: [...verbItems, ...(rl.items ?? []).map(toItem)] }
    })
    return unit
  })
  return section
})
export const units: Unit[] = sections.flatMap(s => s.units)
units.forEach((u, i) => { u.index = i })

/* ---------- Dialogues ---------- */
const dd = dialoguesData as unknown as { speakers: Record<string, { voice: string; emoji: string }>; dialogues: { id: string; title: string; emoji: string; scene: string; after: string; lines: [string, string, string, string][] }[] }
export const speakers = dd.speakers
export const dialogues: Dialogue[] = dd.dialogues.map(d => ({
  ...d,
  lines: d.lines.map(([speaker, manglish, fr, ml], i) => ({
    id: `d-${d.id}-${i + 1}`, manglish, fr, ml, hint: autoHint(manglish), speaker,
  })),
}))

export const rewards = rewardsData as Reward[]

/* ---------- Flat lookups ---------- */
const lessonItems = units.flatMap(u => u.lessons.flatMap(l => l.items))
const seen = new Map<string, Item>()
for (const i of lessonItems) if (!seen.has(i.id)) seen.set(i.id, i)
/** Every teachable item (lessons + all verb forms), unique by id. */
export const allItems: Item[] = [...seen.values()]
for (const v of verbs) for (const f of FORMS) if (!seen.has(v.forms[f].id)) allItems.push(v.forms[f])
export const itemById = new Map<string, Item>([...allItems, ...dialogues.flatMap(d => d.lines)].map(i => [i.id, i]))
export const unitOfItem = new Map<string, Unit>()
for (const u of units) for (const l of u.lessons) for (const i of l.items) if (!unitOfItem.has(i.id)) unitOfItem.set(i.id, u)

/* ---------- The learning path ---------- */
export interface PathNode { id: string; unit: Unit; lesson?: Lesson; boss?: boolean }
export const path: PathNode[] = units.flatMap(u => [
  ...u.lessons.map(l => ({ id: l.id, unit: u, lesson: l })),
  { id: `${u.id}-boss`, unit: u, boss: true },
])
export function itemsForNode(node: PathNode): Item[] {
  if (!node.boss) return node.lesson!.items
  const m = new Map<string, Item>()
  for (const l of node.unit.lessons) for (const i of l.items) m.set(i.id, i)
  return [...m.values()]
}
export const totalLessons = path.length

/* ---------- Dictionary (single words, for translation & lexicon) ---------- */
export interface DictCategory { id: string; title: string; emoji: string; words: Item[] }
const dictRaw = dictionaryData as { categories: { id: string; title: string; emoji: string; words: [string, string, string][] }[] }
const lessonByLoose = new Map(allItems.map(i => [i.manglish.toLowerCase().replace(/[^a-z]/g, ''), i]))
/** Extra French meanings the dictionary gives to words already taught in lessons. */
export const dictFr = new Map<string, string>()
/** Words already taught in a lesson reuse the lesson item (and its audio). */
export const dictCategories: DictCategory[] = dictRaw.categories.map(c => ({
  id: c.id, title: c.title, emoji: c.emoji,
  words: c.words.map(([manglish, fr, ml]) => {
    const known = lessonByLoose.get(manglish.toLowerCase().replace(/[^a-z]/g, ''))
    if (known) { dictFr.set(known.id, fr); return known }
    return { id: `w-${slug(manglish)}`, manglish, fr, ml, hint: autoHint(manglish) }
  }),
}))
/** Dictionary words that are not lesson items (they need their own audio). */
export const dictionaryOnly: Item[] = [...new Map(dictCategories.flatMap(c => c.words).filter(w => w.id.startsWith('w-')).map(w => [w.id, w])).values()]

/** Where an item comes from, for display in search results. */
export const sourceOf = new Map<string, string>()
for (const u of units) for (const l of u.lessons) for (const i of l.items) if (!sourceOf.has(i.id)) sourceOf.set(i.id, i.verb ? 'Verbe' : `Leçon · ${u.title}`)
for (const d of dialogues) for (const l of d.lines) sourceOf.set(l.id, `Dialogue · ${d.title}`)
for (const c of dictCategories) for (const w of c.words) if (!sourceOf.has(w.id)) sourceOf.set(w.id, `Dictionnaire · ${c.title}`)
for (const v of verbs) for (const f of FORMS) if (!sourceOf.has(v.forms[f].id)) sourceOf.set(v.forms[f].id, 'Verbe')
for (const w of dictionaryOnly) itemById.set(w.id, w)

/** Everything the translator can search. */
export const searchItems: Item[] = [...allItems, ...dialogues.flatMap(d => d.lines), ...dictionaryOnly]
