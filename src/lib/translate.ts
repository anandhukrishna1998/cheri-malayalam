/**
 * Offline translator: French ↔ Manglish, using only the app's own content
 * (lesson phrases, dialogue lines, verbs, dictionary). No AI, no network.
 *
 * 1. Phrase search: exact and close matches among all known phrases.
 * 2. Verb recognition: French verbs in any common form (viens, a mangé, boira…)
 *    or Manglish forms (varunnu, vannu, varum, varunnilla, varuka).
 * 3. Word by word: each word looked up in the dictionary; for French input a
 *    Malayalam sentence is assembled (subject first, verb last, right tense).
 */
import { FORMS, FORM_LABEL, dictFr, searchItems, verbs, type Form, type Item, type Verb } from './content'
import { loose } from './answer'

export type Dir = 'fr' | 'ml'
export interface Chip { src: string; item?: Item; text?: string; gloss?: string; note?: string }
export interface VerbHit { verb: Verb; form: Form | null }
export interface Translation {
  exact: Item[]
  related: Item[]
  verbs: VerbHit[]
  words: Chip[]
  built?: { parts: Chip[]; manglish: string; ml: string; label: string }
}

/* ---------------- French normalisation ---------------- */
const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
const lowerFr = (s: string) => s.toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
export const frNorm = (s: string) => stripAccents(lowerFr(s)).replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()
/** Lowercase words keeping accents (needed to tell "mangé" from "mange", "à" from "a"). */
const frWords = (s: string) => lowerFr(s).replace(/\([^)]*\)/g, ' ').split(/[^a-zà-ÿ0-9]+/).filter(Boolean)

const ARTICLES = new Set('le la les l un une des de du d au aux'.split(' '))
const AUX = new Set('ai as a avons avez ont suis es est sommes êtes etes sont'.split(' '))
const NOUN_MARKERS = new Set([...ARTICLES, ...'mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs ce cette ces cet'.split(' ')])
const REFLEXIVE = new Set('me m te t se s nous vous'.split(' '))
const NEG = new Set(['ne', 'n', 'pas', 'jamais'])
const SCORE_STOP = new Set([...ARTICLES, ...AUX, ...'a et en y ce c ca cette ces j je tu il elle on nous vous ils elles me m te t se s lui'.split(' ')])

/* ---------------- French verb forms ---------------- */
// Irregular forms (accents stripped). Regular -er verbs are handled by their stem.
const IRREG: Record<string, string> = {
  kudikkuka: 'boire bois boit buvons buvez boivent bu buvait boirai boiras boira boirons boirez boiront',
  pokuka: 'aller vais vas va allons allez vont alle allee alles allees allait irai iras ira irons irez iront',
  varuka: 'venir viens vient venons venez viennent venu venue venus venait viendrai viendras viendra viendrons viendrez viendront',
  irikkuka: 'asseoir assieds assied assois assoit asseyons asseyez assis assise assiera assierai',
  uranguka: 'dormir dors dort dormons dormez dorment dormi dormait dormirai dormiras dormira',
  cheyyuka: 'faire fais fait faisons faites font faisait ferai feras fera ferons ferez feront',
  kaanuka: 'voir vois voit voyons voyez voient vu vue voyait verrai verras verra verrons verrez verront',
  parayuka: 'dire dis dit disons dites disent disait dirai diras dira dirons direz diront',
  kelkkuka: 'entendre entends entend entendons entendez entendent entendu entendrai entendra',
  padikkuka: 'apprendre apprends apprend apprenons apprenez apprennent appris apprendrai apprendra',
  vaayikkuka: 'lire lis lit lisons lisez lisent lu lisait lirai liras lira lirons',
  ezhuthuka: 'ecrire ecris ecrit ecrivons ecrivez ecrivent ecrivait ecrirai ecrira',
  edukkuka: 'prendre prends prend prenons prenez prennent pris prise prendrai prendras prendra',
  kaathirikkuka: 'attendre attends attend attendons attendez attendent attendu attendrai attendra',
  vilikkuka: 'appelle appelles appellent appellerai appellera',
  orkkuka: 'souvenir souviens souvient souvenons souvenu souviendrai souviendra',
  oduka: 'courir cours court courons courez courent couru courrai courra',
  chirikkuka: 'rire ris rit rions riez rient ri rirai rira',
  thurakkuka: 'ouvrir ouvre ouvres ouvrons ouvrez ouvrent ouvert ouvrirai ouvrira',
}
const PARTICIPLES = new Set('bu alle allee alles allees venu venue venus assis assise dormi fait vu vue dit entendu appris lu ecrit pris prise attendu souvenu couru ri ouvert'.split(' '))
const ER_ENDINGS = new Set('e es ent ons ez er eons eait eant ais ait aient ant era erai eras erons erez eront'.split(' '))
const FUTURE = /(rai|ras|ra|rons|rez|ront)$/

interface FrVerb { verb: Verb; infs: string[]; stems: string[]; forms: Set<string> }
const frVerbs: FrVerb[] = verbs.map(v => {
  // "se souvenir / penser à" → ["souvenir", "penser"]
  const infs = v.fr.split('/').map(p => frNorm(p).split(' ').filter(w => w.length > 2 && w !== 'amour').pop() ?? '').filter(Boolean)
  const stems = infs.filter(w => w.endsWith('er')).map(w => w.slice(0, -2))
  return { verb: v, infs, stems, forms: new Set((IRREG[v.id] ?? '').split(' ').filter(Boolean)) }
})

function matchFrVerb(t: string): FrVerb | null {
  for (const fv of frVerbs) {
    if (fv.infs.includes(t) || fv.forms.has(t)) return fv
    for (const st of fv.stems) if (st.length >= 3 && t.startsWith(st) && ER_ENDINGS.has(t.slice(st.length))) return fv
  }
  return null
}

/* ---------------- Malayalam negatives built from past / future ---------------- */
function negOf(item: Item, from: 'past' | 'fut'): { manglish: string; ml: string } {
  const m = item.manglish, s = item.ml
  if (from === 'past') {
    // vannu → vannilla, poyi → poyilla ; വന്നു → വന്നില്ല, പോയി → പോയില്ല
    const manglish = m.endsWith('u') ? m.slice(0, -1) + 'illa' : m + 'lla'
    const ml = s.endsWith('ു') ? s.slice(0, -1) + 'ില്ല' : s + 'ല്ല'
    return { manglish, ml }
  }
  // varum → varilla ; വരും → വരില്ല
  return { manglish: m.replace(/um$/, 'illa'), ml: s.replace(/ും$/, 'ില്ല') }
}

/* ---------------- Indexes ---------------- */
const frVariants = (i: Item) => { const extra = dictFr.get(i.id) ?? ''; return [...new Set([i.fr, ...i.fr.split('/'), ...extra.split('/')].map(frNorm).filter(Boolean))] }
const mlVariants = (i: Item) => [i.manglish, ...(i.accept ?? [])].map(loose)

// French word or short expression → items (dictionary words first)
const frIndex = new Map<string, Item[]>()
const add = (m: Map<string, Item[]>, k: string, i: Item) => {
  if (!k) return
  const list = m.get(k) ?? []
  if (!list.some(x => x.manglish === i.manglish)) list.push(i)
  m.set(k, list)
}
for (const i of searchItems) {
  if (i.verb || i.speaker) continue
  for (const v of frVariants(i)) {
    const words = v.split(' ').filter(w => !ARTICLES.has(w))
    if (words.length && words.length <= 3) add(frIndex, words.join(' '), i)
  }
}
add(frIndex, 'j', frIndex.get('je')?.[0] as Item)

// Manglish word → items
const mlIndex = new Map<string, Item[]>()
for (const i of searchItems) {
  if (i.speaker) continue
  if (i.manglish.trim().split(/\s+/).length === 1) for (const v of mlVariants(i)) add(mlIndex, v, i)
}
const mlVerbIndex = new Map<string, VerbHit>()
for (const v of verbs) {
  mlVerbIndex.set(loose(v.id), { verb: v, form: null })
  for (const f of FORMS) mlVerbIndex.set(loose(v.forms[f].manglish), { verb: v, form: f })
  mlVerbIndex.set(loose(negOf(v.forms.past, 'past').manglish), { verb: v, form: 'past' })
  mlVerbIndex.set(loose(negOf(v.forms.fut, 'fut').manglish), { verb: v, form: 'fut' })
}

// Common Manglish endings, longest first, with their French meaning.
const SUFFIXES: [string, string][] = [
  ['ilekku', 'vers / à'], ['inte', 'de (à qui)'], ['ude', 'de (à qui)'], ['aano', 'est-ce… ?'], ['aanu', 'c’est'],
  ['illa', 'ne… pas'], ['ile', 'dans le'], ['il', 'dans / à'], ['kku', 'à / pour'], ['yum', 'et / aussi'], ['um', 'et / aussi'],
  ['yo', '? (question)'], ['o', '? (question)'], ['e', '(complément)'],
]

/* ---------------- Scoring helpers ---------------- */
const same = (a: string, b: string) => a === b || (a.length > 3 && b.length > 3 && a.replace(/[sxe]$/, '') === b.replace(/[sxe]$/, ''))
function dice(q: string[], t: string[]): number {
  if (!q.length || !t.length) return 0
  const hits = q.filter(w => t.some(x => same(w, x))).length
  return (2 * hits) / (q.length + t.length)
}

/* ---------------- Main ---------------- */
export function translate(query: string, dir: Dir): Translation {
  const q = query.trim()
  const empty: Translation = { exact: [], related: [], verbs: [], words: [] }
  if (!q) return empty
  return dir === 'fr' ? fromFrench(q) : fromManglish(q)
}

function rankPhrases(score: (i: Item) => number) {
  const scored = searchItems.map(i => ({ i, s: score(i) })).filter(x => x.s > 0)
  // Ties: lesson phrases first, then dictionary, then dialogue lines; shorter first.
  const rank = (i: Item) => (i.speaker ? 2 : i.id.startsWith('w-') ? 1 : 0)
  scored.sort((a, b) => b.s - a.s || rank(a.i) - rank(b.i) || a.i.manglish.length - b.i.manglish.length)
  const seen = new Set<string>()
  const uniq = scored.filter(({ i }) => { const k = loose(i.manglish) + '|' + frNorm(i.fr); return seen.has(k) ? false : (seen.add(k), true) })
  return {
    exact: uniq.filter(x => x.s >= 100).map(x => x.i).slice(0, 4),
    related: uniq.filter(x => x.s < 100 && x.s >= 40).map(x => x.i).slice(0, 8),
  }
}

function fromFrench(q: string): Translation {
  const qn = frNorm(q)
  const qContent = qn.split(' ').filter(w => !SCORE_STOP.has(w))
  const { exact, related } = rankPhrases(i => {
    const vs = frVariants(i)
    if (vs.includes(qn)) return 100
    const best = Math.max(...vs.map(v => dice(qContent.length ? qContent : qn.split(' '), v.split(' ').filter(w => !SCORE_STOP.has(w)))))
    return best >= 0.4 ? Math.round(best * 90) : 0
  })

  // Word by word
  const raw = frWords(q)
  const norm = raw.map(stripAccents)
  const words: Chip[] = []
  const found: { kind: 'verb' | 'word'; chip: Chip; fv?: FrVerb; tense?: Form | 'inf'; subject?: boolean }[] = []
  const neg = norm.some(w => w === 'pas' || w === 'jamais')
  let auxSeen = false
  for (let k = 0; k < norm.length; k++) {
    const w = norm[k], orig = raw[k]
    if (AUX.has(orig) && !(orig === 'a' && raw[k - 1] === 'à')) { auxSeen = true; continue }
    if (ARTICLES.has(w) || NEG.has(w) || orig === 'à') continue
    if (REFLEXIVE.has(w) && k + 1 < norm.length && matchFrVerb(norm[k + 1])) continue
    // Longest dictionary expression first (pomme de terre, grand frère…)
    let hit: Item[] | undefined, len = 0
    for (let n = 3; n >= 1 && !hit; n--) {
      if (k + n > norm.length) continue
      const span = norm.slice(k, k + n)
      if (n > 1 && (ARTICLES.has(span[n - 1]) || span.some(x => matchFrVerb(x)))) continue
      const key = span.filter(x => !ARTICLES.has(x)).join(' ')
      if (frIndex.has(key)) { hit = frIndex.get(key); len = n }
    }
    const fv = !NOUN_MARKERS.has(norm[k - 1] ?? '') ? matchFrVerb(w) : null
    if (fv && !(hit && len > 1)) {
      const isInf = fv.infs.includes(w)
      const isPart = PARTICIPLES.has(w) || /(é|ée|és|ées)$/.test(orig)
      const auxBefore = auxSeen || raw.slice(0, k).some(x => AUX.has(x))
      const tense: Form | 'inf' = auxBefore && isPart ? 'past' : isInf ? 'inf' : FUTURE.test(w) && !fv.forms.has(w.replace(FUTURE, '')) ? 'fut' : 'pres'
      const chip: Chip = { src: orig, item: fv.verb.forms.pres, note: `verbe ${fv.verb.fr}` }
      words.push(chip)
      found.push({ kind: 'verb', chip, fv, tense })
      continue
    }
    if (hit) {
      const src = raw.slice(k, k + len).join(' ')
      const chip: Chip = { src, item: hit[0], note: hit.length > 1 ? `aussi : ${hit.slice(1, 3).map(h => h.manglish).join(', ')}` : undefined }
      words.push(chip)
      found.push({ kind: 'word', chip, subject: ['je', 'j', 'moi', 'tu', 'toi', 'il', 'elle', 'nous', 'vous', 'ils', 'elles'].includes(w) })
      k += len - 1
      continue
    }
    words.push({ src: orig })
  }

  // Verb cards: every verb mentioned
  const verbHits: VerbHit[] = []
  const vf = found.filter(f => f.fv)
  // « je vais manger » : aller is only a helper, manger is in the future
  const futurProche = vf.length >= 2 && vf[0].fv!.verb.id === 'pokuka' && vf[vf.length - 1].tense === 'inf'
  for (const f of vf) {
    if (futurProche && f === vf[0]) continue
    let form: Form | null = futurProche ? 'fut' : f.tense === 'inf' ? null : (f.tense as Form)
    if (neg && form === 'pres') form = 'neg'
    if (!verbHits.some(h => h.verb === f.fv!.verb)) verbHits.push({ verb: f.fv!.verb, form })
  }

  // Assemble a Malayalam sentence: subject, other words, verb last.
  let built: Translation['built']
  const vfound = found.filter(f => f.kind === 'verb')
  if (found.length >= 2 && vfound.length && !exact.length) {
    // "je vais manger" → futur proche of the second verb
    let main = vfound[vfound.length - 1]
    let tense = main.tense === 'inf' ? 'pres' : main.tense as Form
    if (vfound.length >= 2 && vfound[0].fv!.verb.id === 'pokuka' && main.tense === 'inf') tense = 'fut'
    if (vfound.length >= 2 && vfound[0].tense === 'past' && main.tense === 'inf') { main = vfound[vfound.length - 1]; tense = 'past' }
    const v = main.fv!.verb
    let vform: { manglish: string; ml: string } = v.forms[tense]
    if (neg) vform = tense === 'pres' ? v.forms.neg : negOf(v.forms[tense], tense as 'past' | 'fut')
    const verbChip: Chip = { src: main.chip.src, text: vform.manglish.toLowerCase(), gloss: vform.ml, item: neg || tense === 'neg' ? undefined : v.forms[tense] }
    const others = found.filter(f => f.kind === 'word')
    const ordered = [...others.filter(f => f.subject), ...others.filter(f => !f.subject)].map(f => f.chip)
    const parts = [...ordered, verbChip]
    const text = (c: Chip) => c.text ?? c.item!.manglish
    const manglish = parts.map((c, n) => n ? text(c).toLowerCase() : text(c)).join(' ')
    const ml = parts.map(c => c.gloss ?? c.item!.ml).join(' ')
    const label = `${neg ? 'négatif · ' : ''}${FORM_LABEL[tense]}`
    built = { parts, manglish: manglish.charAt(0).toUpperCase() + manglish.slice(1), ml, label }
  }

  return { exact, related, verbs: verbHits, words: exact.length ? [] : words, built }
}

function fromManglish(q: string): Translation {
  const qWords = q.split(/\s+/).map(loose).filter(Boolean)
  const whole = loose(q)
  const { exact, related } = rankPhrases(i => {
    if (mlVariants(i).includes(whole)) return 100
    const t = i.manglish.split(/\s+/).map(loose).filter(Boolean)
    const d = dice(qWords, t)
    return d >= 0.4 ? Math.round(d * 90) : 0
  })

  const verbHits: VerbHit[] = []
  const words: Chip[] = q.split(/\s+/).filter(w => loose(w)).map(src => {
    const l = loose(src)
    const vh = mlVerbIndex.get(l)
    if (vh) {
      if (!verbHits.some(h => h.verb === vh.verb)) verbHits.push(vh)
      const negWord = l.endsWith('ila') && vh.form !== 'neg'
      const form = vh.form ? vh.verb.forms[vh.form] : null
      return { src, item: form ?? vh.verb.forms.pres, gloss: vh.form ? `${form!.fr}${negWord ? ' (négatif)' : ''}` : vh.verb.fr, note: `verbe ${vh.verb.fr}` }
    }
    const direct = mlIndex.get(l)
    if (direct) return { src, item: direct[0], gloss: direct[0].fr }
    for (const [suf, meaning] of SUFFIXES) {
      const ls = loose(suf)
      if (!l.endsWith(ls) || l.length - ls.length < 2) continue
      const root = l.slice(0, -ls.length)
      // veettil → veedu : a final t often comes from d (veedu → veett-)
      for (const cand of [root, root + 'u', root + 'a', root + 'm', root + 'i', root.replace(/t$/, 'd') + 'u']) {
        const r = mlIndex.get(cand)
        if (r) return { src, item: r[0], gloss: r[0].fr, note: `-${suf} = ${meaning}` }
        const rv = mlVerbIndex.get(cand)
        if (rv) {
          if (!verbHits.some(h => h.verb === rv.verb)) verbHits.push(rv)
          return { src, item: rv.verb.forms[rv.form ?? 'pres'], gloss: rv.verb.fr, note: `-${suf} = ${meaning}` }
        }
      }
    }
    return { src }
  })

  return { exact, related, verbs: verbHits, words: exact.length ? [] : words }
}
