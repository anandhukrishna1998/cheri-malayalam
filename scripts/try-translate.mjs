// Quick manual test of the translator. Usage: node scripts/try-translate.mjs
import { createServer } from 'vite'
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { translate } = await server.ssrLoadModule('/src/lib/translate.ts')
const cases = [
  ['fr', 'venir'], ['fr', "J'ai mal à la tête"], ['fr', 'je viens demain'], ['fr', 'il est venu hier'],
  ['fr', 'je mange du riz'], ['fr', 'je vais boire du thé'], ['fr', 'je ne mange pas de poisson'],
  ['fr', 'je suis fatiguée'], ['fr', "j'ai faim"], ['fr', 'tu as froid ?'], ['fr', "je n'ai pas peur"],
  ['fr', 'je veux manger'], ['fr', 'je veux du thé'], ['fr', 'je ne veux pas dormir'], ['fr', 'tu veux venir ?'],
  ['fr', 'je peux venir demain'], ['fr', 'je ne peux pas venir'], ['fr', "tu peux m'aider ?"],
  ['fr', 'allons manger'], ['fr', 'on va à la plage'], ['fr', 'il faut partir'],
  ['fr', 'il y a du thé ?'], ['fr', "il n'y a pas d'eau"],
  ['fr', 'tu viens ?'], ['fr', 'tu as mangé ?'], ['fr', 'tu viendras demain ?'],
  ['fr', 'je suis à la maison'], ['fr', 'je vais à la maison'], ['fr', 'je travaille au bureau'], ['fr', 'il habite en France'],
  ['fr', 'je me lave'], ['fr', 'je lave la vaisselle'], ['fr', 'je comprends'], ['fr', 'je sais'],
  ['fr', 'mon téléphone est cassé'], ['fr', 'je regarde la mer avec toi'], ['fr', "j'ai acheté un sari rouge"],
  ['fr', 'il fait très chaud'], ['fr', 'on mange dehors ce soir'], ['fr', "c'est quoi le mot de passe wifi"],
  ['ml', 'njaan veettil vannilla'], ['ml', 'Enikku ksheenamaanu'], ['ml', 'Namukku pokaam'],
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
