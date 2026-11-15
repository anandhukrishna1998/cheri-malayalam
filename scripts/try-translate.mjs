// Quick manual test of the translator. Usage: node scripts/try-translate.mjs
import { createServer } from 'vite'
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { translate } = await server.ssrLoadModule('/src/lib/translate.ts')
const cases = [
  ['fr', 'venir'], ['fr', "J'ai mal à la tête"], ['fr', 'mal de tête'], ['fr', 'je viens demain'], ['fr', 'il est venu hier'],
  ['fr', 'je mange du riz'], ['fr', 'je vais boire du thé'], ['fr', "je ne mange pas de poisson"], ['fr', 'tu as mangé ?'],
  ['fr', 'merci'], ['fr', 'la maison'], ['fr', 'pomme de terre'], ['fr', 'je bois de l\'eau'], ['fr', 'il pleut'],
  ['ml', 'varuka'], ['ml', 'vannu'], ['ml', 'thala vedanikkunnu'], ['ml', 'njaan naale varum'], ['ml', 'veettil'], ['ml', 'Nanni'], ['ml', 'ninakku sukhamaano'], ['ml', 'njaan vannilla'],
]
for (const [dir, q] of cases) {
  const t = translate(q, dir)
  const show = i => `${i.manglish} = ${i.fr}`
  console.log(`\n[${dir}] ${q}`)
  if (t.exact.length) console.log('  exact :', t.exact.map(show).join(' | '))
  if (t.verbs.length) console.log('  verbs :', t.verbs.map(v => `${v.verb.id}(${v.form ?? 'inf'})`).join(', '))
  if (t.built) console.log('  built :', t.built.manglish, '·', t.built.ml, '·', t.built.label)
  if (t.words.length) console.log('  words :', t.words.map(w => `${w.src}→${w.text ?? w.item?.manglish ?? '?'}${w.gloss ? '(' + w.gloss + ')' : ''}${w.note ? '[' + w.note + ']' : ''}`).join('  '))
  if (t.related.length) console.log('  close :', t.related.slice(0, 3).map(show).join(' | '))
}
await server.close()
