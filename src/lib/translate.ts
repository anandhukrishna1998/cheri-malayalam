/**
 * Offline translator: French ↔ Manglish, using only the app's own content
 * (lesson phrases, phrasebook, dialogue lines, verbs, dictionary). No AI, no network.
 *
 * 1. Phrase search: exact and close matches among all known phrases.
 * 2. Verb recognition: French verbs in any common form (viens, a mangé, boira…)
 *    or Manglish forms (varunnu, vannu, varum, varunnilla, varuka).
 * 3. Word by word: each word looked up in the dictionary; for French input a
 *    Malayalam sentence is assembled (subject first, verb last, right tense).
 */
import { FORMS, FORM_LABEL, dictFr, feelingForms, placeForms, searchItems, verbs, type Form, type Item, type Verb } from './content'
import { loose } from './answer'

const mlKey = (manglish: string) => manglish.toLowerCase().replace(/[^a-z]/g, '')

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
  pokuka: 'aller vais vas va allons allez vont alle allee alles allees allait irai iras ira irons irez iront partir pars part partons partez partent parti partie partira partirai',
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
  iranguka: 'descendre descends descend descendons descendez descendent descendu descendue descendra sortir sors sort sortons sortez sortent sorti sortie sortira',
  ayakkuka: 'envoie envoies envoient envoyons envoyez enverrai enverras enverra',
  manassilaakuka: 'comprendre comprends comprend comprenons comprenez comprennent compris comprendrai comprendra',
  vilkkuka: 'vendre vends vend vendons vendez vendent vendu vendrai vendra',
  ishtappeduka: 'plaire plait plu plaira',
  odikkuka: 'conduire conduis conduit conduisons conduisez conduisent conduirai conduira',
  vaykkuka: 'mettre mets met mettons mettez mettent mis mise mettrai mettra',
  jeevikkuka: 'vivre vis vit vivons vivez vivent vecu vivrai vivra',
  'thirichu-varuka': 'revenir reviens revient revenons revenez reviennent revenu revenue reviendrai reviendra',
  kazhiyuka: 'finir finis finit finissons finissez finissent fini finie finira finirai terminer',
  eriyuka: 'jette jettes jettent jettera jetterai',
  vishwasikkuka: 'croire crois croit croyons croyez croient cru crue croira croirai',
  aalochikkuka: 'reflechir reflechis reflechit reflechissons reflechissez reflechissent reflechi reflechira',
  shramikkuka: 'essaie essaies essaient essaye essayons essayez essaiera essaierai',
  nashtappeduka: 'perdre perds perd perdons perdez perdent perdu perdue perdra perdrai',
  kittuka: 'recevoir recois recoit recevons recevez recoivent recu recue recevra recevrai obtenir obtiens obtient obtenu',
  santhoshikkuka: 'rejouir rejouis rejouit rejoui',
  porikkuka: 'frire frit frits',
  niraykkuka: 'remplir remplis remplit remplissons remplissez remplissent rempli remplie remplira',
  thudaykkuka: 'essuyer essuie essuies essuient essuyons essuyez essuye essuiera',
  vrithiyaakkuka: 'nettoie nettoies nettoient nettoierai nettoiera',
  keduthuka: 'eteindre eteins eteint eteignons eteignez eteignent eteindra eteindrai',
  'thirichu-kodukkuka': 'rendre rends rend rendons rendez rendent rendu rendra rendrai',
  janikkuka: 'naitre nait nee nes naitra',
  valaruka: 'grandir grandis grandit grandissons grandissent grandi grandira',
  marikkuka: 'mourir meurs meurt mourons mourez meurent mort morte mourra',
  'uttaram-parayuka': 'repondre reponds repond repondons repondez repondent repondu repondra',
  'nuna-parayuka': 'mentir mens ment mentons mentez mentent menti mentira',
  aakuka: 'devenir deviens devient devenons devenez deviennent devenu devenue deviendra',
  kadikkuka: 'mordre mords mord mordons mordez mordent mordu mordra',
  vevikkuka: 'cuire cuis cuit cuisons cuisent cuira',
  ariyuka: 'savoir sais sait savons savez savent su saurai saura connaitre connais connait connaissons connu connaitra',
}
const PARTICIPLES = new Set('fini finie cru crue reflechi perdu perdue recu recue rejoui rempli remplie essuye eteint rendu nee nes grandi mort morte repondu menti devenu devenue mordu cuit parti partie su connu descendu descendue sorti sortie compris vendu conduit vecu revenu revenue mis mise plu bu alle allee alles allees venu venue venus assis assise dormi fait vu vue dit entendu appris lu ecrit pris prise attendu souvenu couru ri ouvert'.split(' '))
const ER_ENDINGS = new Set('e es ent ons ez er eons eait eant ais ait aient ant era erai eras erons erez eront'.split(' '))
const FUTURE = /(rai|ras|ra|rons|rez|ront)$/

interface FrVerb { verb: Verb; infs: string[]; stems: string[]; forms: Set<string> }
const frVerbs: FrVerb[] = verbs.map(v => {
  // "se souvenir / penser à" → ["souvenir", "penser"]
  const infs = v.fr.split('/').map(p => frNorm(p).split(' ').filter(w => w.length > 2 && w !== 'amour').pop() ?? '').filter(Boolean)
  const stems = infs.filter(w => w.endsWith('er')).map(w => w.slice(0, -2))
  return { verb: v, infs, stems, forms: new Set((IRREG[v.id] ?? '').split(' ').filter(Boolean)) }
})

function matchFrVerb(t: string, reflexive = false): FrVerb | null {
  const hits = frVerbs.filter(fv => fv.infs.includes(t) || fv.forms.has(t) ||
    fv.stems.some(st => st.length >= 3 && t.startsWith(st) && ER_ENDINGS.has(t.slice(st.length))))
  if (hits.length < 2) return hits[0] ?? null
  const isRefl = (fv: FrVerb) => /^(se |s')/.test(fv.verb.fr)
  return hits.find(fv => isRefl(fv) === reflexive) ?? hits[0]
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
// « on » = nous (inclusive)
for (const i of frIndex.get('nous') ?? []) if (i.manglish === 'Nammal') add(frIndex, 'on', i)

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

/* ---------------- Malayalam building blocks ---------------- */
type MlForm = { manglish: string; ml: string }
const SUBJECT_WORDS = new Set(['je', 'j', 'moi', 'tu', 'toi', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles'])
const ENIKKU = { manglish: 'Enikku', ml: 'എനിക്ക്' }
const NINAKKU = { manglish: 'Ninakku', ml: 'നിനക്ക്' }
const NAMUKKU = { manglish: 'Namukku', ml: 'നമുക്ക്' }
const AVARKKU = { manglish: 'Avarkku', ml: 'അവർക്ക്' }
/** Dative subject (« à moi… ») used with venam (vouloir), pattum (pouvoir) and feelings. */
const DATIVE: Record<string, MlForm> = {
  je: ENIKKU, j: ENIKKU, moi: ENIKKU, tu: NINAKKU, toi: NINAKKU,
  il: { manglish: 'Avanu', ml: 'അവന്' }, elle: { manglish: 'Avalkku', ml: 'അവൾക്ക്' },
  nous: NAMUKKU, on: NAMUKKU, vous: { manglish: 'Ningalkku', ml: 'നിങ്ങൾക്ക്' }, ils: AVARKKU, elles: AVARKKU,
}
const WANT = new Set('veux veut voulons voulez veulent voudrais voudrait voudrions voudriez voudraient aimerais aimerait'.split(' '))
const CAN = new Set('peux peut pouvons pouvez peuvent pourrais pourrait pourrions pourriez pourraient'.split(' '))
const PREPS = new Set(['à', 'au', 'aux', 'dans', 'chez', 'en', 'vers'])
const SKIP = new Set(['ce', 'que', 'qu', 'est-ce', 'y'])
/** Verbs of movement take « vers » (veettilekku) instead of « à / dans » (veettil). */
const MOTION = new Set(['pokuka', 'varuka', 'thirichu-varuka', 'konduvaruka', 'ayakkuka'])
/** Verbs whose subject is in the dative: « je comprends » → Enikku manassilaakunnu, « je sais » → Enikku ariyaam. */
const DATIVE_VERBS = new Set(['manassilaakuka', 'ariyuka', 'ishtappeduka', 'kittuka', 'nashtappeduka', 'pedikkuka'])
/** « avec toi » → ninte koode */
const WITH: Record<string, MlForm> = {
  moi: { manglish: 'ente koode', ml: 'എന്റെ കൂടെ' }, toi: { manglish: 'ninte koode', ml: 'നിന്റെ കൂടെ' },
  lui: { manglish: 'avante koode', ml: 'അവന്റെ കൂടെ' }, elle: { manglish: 'avalude koode', ml: 'അവളുടെ കൂടെ' },
  nous: { manglish: 'nammude koode', ml: 'നമ്മുടെ കൂടെ' }, vous: { manglish: 'ningalude koode', ml: 'നിങ്ങളുടെ കൂടെ' },
  eux: { manglish: 'avarude koode', ml: 'അവരുടെ കൂടെ' }, elles: { manglish: 'avarude koode', ml: 'അവരുടെ കൂടെ' },
}
/** Question words: with them, the verb keeps its normal form (Nee eppol varum?). */
const QWORDS = new Set(['evide', 'evideyaanu', 'eppol', 'enthaa', 'enthu', 'enthaanu', 'aaraa', 'aaru', 'engane', 'enthinu', 'ethra', 'ethu'])
const BE = ['suis', 'es', 'est', 'sommes', 'êtes', 'sont']
/** Names that keep their capital letter inside a sentence. */
const PROPER = /^(France|Frans|India|Keralam|Keralath|Kochi|Paris|Marie)/
/** Time words come right after the subject in Malayalam: Njaan innale kadappurathekku poyi. */
const TIME = new Set(['innu', 'naale', 'innale', 'ippol', 'pinne', 'raavile', 'uchaykku', 'vaikunneram', 'raathri', 'innuraathri', 'innuraavile', 'eppozhum', 'ennum', 'udane', 'pinneedu', 'munpu', 'shesham'])
/** Verbs whose grammatical subject is the thing, not the person (« mon travail est fini »). */
const NO_SUBJECT_VERBS = new Set(['kazhiyuka', 'theeruka', 'avasaanikkuka'])

/** kazhikkuka → kazhikk / കഴിക്ക */
const stemOf = (v: Verb): MlForm => ({ manglish: v.id.replace(/-/g, ' ').replace(/uka$/, ''), ml: v.ml.replace(/ുക$/, '') })
const plus = (s: MlForm, m: string, ml: string): MlForm => ({ manglish: s.manglish + m, ml: s.ml + ml })
/** Yes/no question: varunnu → varunno, varum → varumo, poyi → poyo, undu → undo, venam → venamo. */
function asQuestion(f: MlForm): MlForm {
  const m = f.manglish, s = f.ml
  // poyi → poyo, but urangi → urangiyo
  if (/yi$/.test(m) && s.endsWith('യി')) return { manglish: m.slice(0, -1) + 'o', ml: s.slice(0, -1) + 'ോ' }
  if (/i$/.test(m) && s.endsWith('ി')) return { manglish: m + 'yo', ml: s + 'യോ' }
  const manglish = /u$/.test(m) ? m.slice(0, -1) + 'o' : /m$/.test(m) ? m + 'o' : m
  const ml = /[ു്]$/.test(s) ? s.slice(0, -1) + 'ോ' : s.endsWith('ം') ? s.slice(0, -1) + 'മോ' : s
  return { manglish, ml }
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
  const question = /\?\s*$/.test(q) || /^est ce que/.test(qn)
  const neg = norm.some(w => w === 'pas' || w === 'jamais')
  type Found = { kind: 'verb' | 'word'; chip: Chip; fv?: FrVerb; tense?: Form | 'inf'; subject?: string; place?: { loc: [string, string]; to: [string, string] }; prep?: boolean; feel?: [string, string]; lead?: boolean; qword?: boolean }
  const words: Chip[] = []
  const found: Found[] = []
  let modal: 'want' | 'can' | 'lets' | 'must' | null = null
  let weather = false, hasQWord = false, whereQ = false
  let auxSeen = false, pendingPrep = false, existential = false
  const isInfVerb = (t: string | undefined) => !!t && !!matchFrVerb(t)?.infs.includes(t)

  for (let k = 0; k < norm.length; k++) {
    const w = norm[k], orig = raw[k]
    // « je veux / je peux / il faut / allons + verbe », « il y a »
    if (WANT.has(w)) { modal = 'want'; continue }
    if (CAN.has(w)) { modal = 'can'; continue }
    if (w === 'faut' && norm[k - 1] === 'il') { modal = 'must'; continue }
    if ((w === 'allons' || (w === 'va' && norm[k - 1] === 'on')) && isInfVerb(norm[k + 1])) { modal = 'lets'; continue }
    // « allons au marché » : allons is the verb itself (aller), as a proposal
    if (w === 'allons' && k === 0) modal = 'lets'
    // « il fait froid / chaud » → Thanuppaanu / Choodaanu
    if (w === 'fait' && norm[k - 1] === 'il') { weather = true; continue }
    if (w === 'il' && (norm[k + 1] === 'y' || norm[k + 1] === 'faut')) continue
    if (w === 'y' && norm[k + 1] === 'a') { existential = true; k++; continue }
    if (w === 'avec' && WITH[norm[k + 1]]) {
      const f = WITH[norm[k + 1]]
      const chip: Chip = { src: `${orig} ${raw[k + 1]}`, text: f.manglish, gloss: f.ml }
      words.push(chip)
      found.push({ kind: 'word', chip, lead: true })
      k++
      continue
    }
    if (w === 'on' && modal === 'lets') continue
    if (AUX.has(orig) && !(orig === 'a' && raw[k - 1] === 'à')) { auxSeen = true; continue }
    if (PREPS.has(orig)) { pendingPrep = true; continue }
    if (ARTICLES.has(w) || NEG.has(w) || (SKIP.has(w) && !frIndex.has(`${w} ${norm[k + 1]}`))) continue
    if (w === 'il' && norm[k + 1] === 'fait') continue
    const reflexive = REFLEXIVE.has(norm[k - 1] ?? '')
    if (REFLEXIVE.has(w) && w !== 'nous' && w !== 'vous' && k + 1 < norm.length && matchFrVerb(norm[k + 1], true)) continue
    // « appelle-moi » : moi / toi right after an order is the object (enne / ninne)
    // also « je rêve de toi » / « je pense à toi » : moi / toi after a verb is the object
    if ((w === 'moi' || w === 'toi') && ((k === 1 && matchFrVerb(norm[0])) || found.some(f => f.kind === 'verb'))) {
      const o = w === 'moi' ? { manglish: 'enne', ml: 'എന്നെ' } : { manglish: 'ninne', ml: 'നിന്നെ' }
      const chip: Chip = { src: orig, text: o.manglish, gloss: o.ml }
      words.push(chip)
      found.push({ kind: 'word', chip, lead: true })
      continue
    }
    // Longest dictionary expression first (pomme de terre, grand frère…); for single words also try
    // the masculine / singular form (fatiguée → fatigue, maisons → maison).
    let hit: Item[] | undefined, len = 0
    for (let n = 3; n >= 1 && !hit; n--) {
      if (k + n > norm.length) continue
      const span = norm.slice(k, k + n)
      if (n > 1 && (ARTICLES.has(span[n - 1]) || span.some(x => matchFrVerb(x) || WANT.has(x) || CAN.has(x) || AUX.has(x)))) continue
      const key = span.filter(x => !ARTICLES.has(x)).join(' ')
      // masculine / singular fallbacks only for longer words (so « mère » never becomes « mer »)
      const keys = n === 1 ? [key, ...[key.replace(/s$/, ''), key.replace(/x$/, '')].filter(x => x !== key && x.length >= 3), ...[key.replace(/e$/, ''), key.replace(/es$/, '')].filter(x => x !== key && x.length >= 5)] : [key]
      const found1 = keys.find(x => x && frIndex.has(x))
      if (found1) { hit = frIndex.get(found1); len = n }
    }
    const fv = !NOUN_MARKERS.has(norm[k - 1] ?? '') && !SUBJECT_WORDS.has(w) ? matchFrVerb(w, reflexive) : null
    if (fv && !(hit && len > 1)) {
      const isInf = fv.infs.includes(w)
      const isPart = PARTICIPLES.has(w) || /(é|ée|és|ées)$/.test(orig)
      const auxBefore = auxSeen || raw.slice(0, k).some(x => AUX.has(x))
      const tense: Form | 'inf' = auxBefore && isPart ? 'past' : isInf ? 'inf' : FUTURE.test(w) && !fv.forms.has(w.replace(FUTURE, '')) ? 'fut' : 'pres'
      const chip: Chip = { src: orig, item: fv.verb.forms.pres, note: `verbe ${fv.verb.fr}` }
      words.push(chip)
      found.push({ kind: 'verb', chip, fv, tense })
      pendingPrep = false
      continue
    }
    if (hit) {
      const src = raw.slice(k, k + len).join(' ')
      const item = hit[0]
      const chip: Chip = { src, item, note: hit.length > 1 ? `aussi : ${hit.slice(1, 3).map(h => h.manglish).join(', ')}` : undefined }
      const place = placeForms.get(mlKey(item.manglish))
      if (place && pendingPrep) chip.note = `${place.loc[0]} = à / dans · ${place.to[0]} = vers`
      words.push(chip)
      if (QWORDS.has(mlKey(item.manglish))) hasQWord = true
      if (orig === 'où') whereQ = true
      found.push({ kind: 'word', chip, subject: SUBJECT_WORDS.has(w) ? w : undefined, place, prep: pendingPrep, feel: feelingForms.get(mlKey(item.manglish)), qword: QWORDS.has(mlKey(item.manglish)) || orig === 'où' })
      pendingPrep = false
      k += len - 1
      continue
    }
    words.push({ src: orig })
  }

  // Verb cards: every verb mentioned
  const verbHits: VerbHit[] = []
  const vf = found.filter(f => f.fv)
  // « je vais manger » : aller is only a helper, manger is in the future
  const futurProche = !modal && vf.length >= 2 && vf[0].fv!.verb.id === 'pokuka' && vf[vf.length - 1].tense === 'inf'
  for (const f of vf) {
    if (futurProche && f === vf[0]) continue
    let form: Form | null = modal ? null : futurProche ? 'fut' : f.tense === 'inf' ? null : (f.tense as Form)
    if (neg && form === 'pres') form = 'neg'
    if (!verbHits.some(h => h.verb === f.fv!.verb)) verbHits.push({ verb: f.fv!.verb, form })
  }

  // Assemble a Malayalam sentence (only when no ready-made phrase matched).
  let built: Translation['built']
  if (!exact.length && found.length) {
    const subj = found.find(f => f.subject)
    const dat = subj ? DATIVE[subj.subject!] : undefined
    // « avec toi » goes right after the subject: Njaan ninte koode kadal nokkunnu
    // Order after the subject: « avec toi » / object pronouns, then time words, then the rest.
    const rankOf = (f: Found) => (f.lead ? 0 : TIME.has(mlKey(f.chip.item?.manglish ?? '')) ? 1 : 2)
    const nouns = found.filter(f => f.kind === 'word' && !f.subject).sort((a, b) => rankOf(a) - rankOf(b))
    const vfound = found.filter(f => f.kind === 'verb')
    const motion = vfound.some(f => MOTION.has(f.fv!.verb.id))
    const nounChip = (f: Found): Chip => {
      if (f.place && f.prep) { const [m, ml] = motion ? f.place.to : f.place.loc; return { src: f.chip.src, text: m, gloss: ml, item: f.chip.item } }
      return f.chip
    }
    const formChip = (src: string, f: MlForm, item?: Item): Chip => {
      const g = question && !hasQWord ? asQuestion(f) : f
      return { src, text: g.manglish.toLowerCase(), gloss: g.ml, item }
    }
    const fromMl = (f: MlForm, src = ''): Chip => ({ src, text: f.manglish, gloss: f.ml })
    let parts: Chip[] | null = null
    let label = ''

    const main = vfound.length ? vfound[vfound.length - 1] : undefined
    // « on regarde un film ? » is a proposal: Namukku padam kaanaamo?
    if (!modal && subj?.subject === 'on' && question && main) modal = 'lets'
    // « parle doucement » (verb first, no subject) is an order: Pathukke samsaarikkoo
    const imperative = !!main && !subj && !modal && !question && main.tense === 'pres' && raw[0] === main.chip.src
    if (modal && main) {
      // « je veux manger » → Enikku kazhikkanam ; « je peux venir » → Enikku varaan pattum ; « allons manger » → Namukku kazhikkaam
      const v = main.fv!.verb, s = stemOf(v)
      const f = modal === 'want' || modal === 'must' ? (neg ? plus(s, 'anda', 'ണ്ട') : plus(s, 'anam', 'ണം'))
        : modal === 'can' ? (neg ? plus(s, 'aan pattilla', 'ാൻ പറ്റില്ല') : plus(s, 'aan pattum', 'ാൻ പറ്റും'))
        : plus(s, 'aam', 'ാം')
      const who = modal === 'lets' ? NAMUKKU : dat
      parts = [...(who ? [fromMl(who, subj?.chip.src)] : []), ...nouns.map(nounChip), formChip(main.chip.src, f)]
      label = { want: 'vouloir', must: 'il faut', can: 'pouvoir', lets: 'proposition (on…)' }[modal] + (neg ? ' · négatif' : '')
    } else if (modal === 'want' && nouns.length) {
      // « je veux du thé » → Enikku chaaya venam
      parts = [...(dat ? [fromMl(dat, subj?.chip.src)] : []), ...nouns.map(nounChip), formChip('', neg ? { manglish: 'venda', ml: 'വേണ്ട' } : { manglish: 'venam', ml: 'വേണം' })]
      label = 'vouloir'
    } else if (whereQ && subj && !main) {
      parts = [subj.chip, ...nouns.filter(f => !f.qword).map(nounChip), fromMl({ manglish: 'evideyaa', ml: 'എവിടെയാ' }, 'où')]
      label = 'où ?'
    } else if (!main && subj && BE.some(b => raw.includes(b)) && nouns.some(f => f.place && f.prep)) {
      const be = neg ? { manglish: 'alla', ml: 'അല്ല' } : { manglish: 'aanu', ml: 'ആണ്' }
      parts = [subj.chip, ...nouns.map(nounChip), formChip('être', be)]
      label = 'être (lieu)'
    } else if (existential && nouns.length && !main) {
      // « il y a du thé ? » → Chaaya undo?
      parts = [...nouns.map(nounChip), formChip('il y a', neg ? { manglish: 'illa', ml: 'ഇല്ല' } : { manglish: 'undu', ml: 'ഉണ്ട്' })]
      label = 'il y a'
    } else if (weather && !main && nouns.some(f => f.feel)) {
      // « il fait froid » → Thanuppaanu
      const fe = nouns.find(f => f.feel)!
      const n = fe.chip.item!
      const pred: MlForm = neg ? { manglish: `${n.manglish.toLowerCase()} illa`, ml: `${n.ml} ഇല്ല` }
        : { manglish: n.manglish.toLowerCase().replace(/u$/, '') + 'aanu', ml: n.ml.replace(/്$/, '') + 'ാണ്' }
      parts = [...nouns.filter(f => f !== fe).map(nounChip), formChip(fe.chip.src, pred, n)]
      if (parts.length === 1) parts[0] = { ...parts[0], text: parts[0].text!.charAt(0).toUpperCase() + parts[0].text!.slice(1) }
      label = 'météo'
    } else if (imperative && main) {
      // polite order: verb stem + -oo (samsaarikkoo, pokoo) ; « ne … pas » : -aruthu (samsaarikkaruthu)
      const v = main.fv!.verb, s = stemOf(v)
      const f = neg ? plus(s, 'aruthu', 'രുത്') : v.id === 'varuka' ? { manglish: 'vaa', ml: 'വാ' } : plus(s, 'oo', 'ൂ')
      parts = [...nouns.map(nounChip), formChip(main.chip.src, f)]
      label = neg ? 'interdiction' : 'impératif (poli)'
    } else if (!main && nouns.some(f => f.feel)) {
      // « je suis fatiguée » → Enikku ksheenamaanu ; « tu as faim ? » → Ninakku vishakkunno?
      const fe = nouns.find(f => f.feel)!
      const others = nouns.filter(f => f !== fe)
      const pred: MlForm = neg ? { manglish: `${fe.chip.item!.manglish.toLowerCase()} illa`, ml: `${fe.chip.item!.ml} ഇല്ല` } : { manglish: fe.feel![0], ml: fe.feel![1] }
      parts = [fromMl(dat ?? ENIKKU, subj?.chip.src), ...others.map(nounChip), formChip(fe.chip.src, pred, fe.chip.item)]
      label = 'sentiment'
    } else if (main && found.length >= 2) {
      // Subject, other words, verb last, in the right tense.
      let tense = main.tense === 'inf' ? 'pres' : main.tense as Form
      if (futurProche) tense = 'fut'
      if (vfound.length >= 2 && vfound[0].tense === 'past' && main.tense === 'inf') tense = 'past'
      const v = main.fv!.verb
      let vform: MlForm = v.forms[tense]
      if (neg) vform = tense === 'pres' ? v.forms.neg : negOf(v.forms[tense], tense as 'past' | 'fut')
      const ordered = [...nouns.filter(f => f.subject), ...found.filter(f => f.kind === 'word' && f.subject), ...nouns]
      const uniq = [...new Set(ordered)]
      // « j'ai fini mon travail » → Ente joli kazhinju (the work is the subject; no « Njaan »)
      const subjects = NO_SUBJECT_VERBS.has(v.id) && nouns.length ? []
        : uniq.filter(f => f.subject).map(f => DATIVE_VERBS.has(v.id) && DATIVE[f.subject!] ? fromMl(DATIVE[f.subject!], f.chip.src) : f.chip)
      parts = [...subjects, ...uniq.filter(f => !f.subject).map(nounChip), formChip(main.chip.src, vform, neg || question ? undefined : v.forms[tense])]
      label = `${neg ? 'négatif · ' : ''}${FORM_LABEL[tense]}`
    }

    if (parts && (parts.length >= 2 || modal || weather || imperative)) {
      const text = (c: Chip) => (c.text ?? c.item!.manglish).replace(/[?!.,]+$/, '')
      const gloss = (c: Chip) => (c.gloss ?? c.item!.ml).replace(/[?!.,]+$/, '')
      let manglish = parts.map((c, n) => (n && !PROPER.test(text(c)) ? text(c).toLowerCase() : text(c))).join(' ')
      let ml = parts.map(gloss).join(' ')
      if (question) { manglish += '?'; ml += '?' }
      built = { parts, manglish: manglish.charAt(0).toUpperCase() + manglish.slice(1), ml, label: question ? `${label} · question` : label }
    }
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
