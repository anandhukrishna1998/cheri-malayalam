// Checks the lesson files for mistakes. Usage: npm run check
import { existsSync } from 'node:fs'
import { loadContent } from './load-content.mjs'

const c = await loadContent()
const problems = []
const warnings = []

// Same id used for two different phrases
const byId = new Map()
for (const u of c.units) for (const l of u.lessons) for (const i of l.items) {
  const prev = byId.get(i.id)
  if (prev && (prev.manglish !== i.manglish || prev.fr !== i.fr)) problems.push(`Id « ${i.id} » utilisé pour deux phrases différentes (${l.id})`)
  byId.set(i.id, i)
  if (!i.ml || !i.fr || !i.manglish) problems.push(`Champ manquant pour « ${i.id} » (${l.id})`)
}
// Same Manglish with different meanings (confusing in quizzes)
const byManglish = new Map()
for (const i of c.allItems) {
  const k = i.manglish.toLowerCase().replace(/[^a-z]/g, '')
  const prev = byManglish.get(k)
  if (prev && prev.fr !== i.fr && !(prev.verb || i.verb)) warnings.push(`« ${i.manglish} » a deux sens : « ${prev.fr} » et « ${i.fr} »`)
  byManglish.set(k, i)
}
// Dialogues unlock after a real unit
const unitIds = new Set(c.units.map(u => u.id))
for (const d of c.dialogues) {
  if (!unitIds.has(d.after)) problems.push(`Dialogue « ${d.id} » : unité « ${d.after} » inconnue`)
  for (const l of d.lines) if (!c.speakers[l.speaker]) problems.push(`Dialogue « ${d.id} » : personnage « ${l.speaker} » inconnu`)
}
// Audio
const all = [...c.allItems, ...c.dialogues.flatMap(d => d.lines), ...c.dictionaryOnly]
// Dictionary: same word listed twice with different meanings
const dictSeen = new Map()
for (const w of c.dictionaryOnly) {
  if (!w.manglish || !w.fr || !w.ml) problems.push(`Dictionnaire : champ manquant pour « ${w.id} »`)
  const prev = dictSeen.get(w.id)
  if (prev && prev.fr !== w.fr) problems.push(`Dictionnaire : « ${w.manglish} » listé deux fois avec deux sens`)
  dictSeen.set(w.id, w)
}
const missing = all.filter(i => !existsSync(`public/audio/${i.id}.mp3`)).map(i => i.id)

const lessons = c.path.length
console.log(`${c.sections.length} sections · ${c.units.length} unités · ${lessons} leçons · ${c.verbs.length} verbes · ${c.dialogues.length} dialogues · ${c.dictCategories.reduce((n, x) => n + x.words.length, 0)} mots au dictionnaire · ${all.length} phrases avec audio`)
for (const w of warnings) console.log('⚠️ ', w)
if (missing.length) console.log(`🔇 ${missing.length} phrases sans audio (lance « npm run audio ») : ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '…' : ''}`)
for (const p of problems) console.log('❌', p)
if (problems.length) process.exit(1)
console.log('✅ Contenu OK')
