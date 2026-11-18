import { getAllCourseItems, type CourseItem } from './course'
import { allItems, type Item } from './content'
import { shuffle, type Exercise } from './exercises'

export const words = (s: string): string[] =>
  s.replace(/[?!.,/:;()«»"]/g, ' ').trim().split(/\s+/).filter(Boolean)

export const isPhrase = (i: CourseItem | Item): boolean => {
  const w = words(i.manglish)
  return w.length >= 2 && w.length <= 10 && !i.manglish.includes('/')
}

function toItem(ci: CourseItem | Item): Item {
  return {
    id: ci.id,
    manglish: ci.manglish,
    fr: ci.fr,
    ml: ci.ml || '',
    hint: ci.hint || '',
    note: ci.note,
  }
}

let cachedFallback: Item[] | null = null
function getFallbackItems(): Item[] {
  if (!cachedFallback) {
    try {
      const courseItems = getAllCourseItems().map(toItem)
      cachedFallback = [...courseItems, ...allItems]
    } catch {
      cachedFallback = [...allItems]
    }
  }
  return cachedFallback
}

function getWordPool(pool: Item[], fallback: Item[]): string[] {
  const all = [...pool, ...fallback]
  return Array.from(new Set(all.flatMap(i => words(i.manglish))))
}

function getOptions(item: Item, pool: Item[], fallback: Item[], n = 4): Item[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
  const seenFr = new Set([item.fr.trim().toLowerCase()])
  const seenMl = new Set([norm(item.manglish)])
  const picked: Item[] = []

  const isPhraseItem = isPhrase(item)
  const sameShape = (c: Item) => isPhrase(c) === isPhraseItem

  const poolSame = shuffle(pool.filter(sameShape))
  const poolOther = shuffle(pool.filter(c => !sameShape(c)))
  const fallbackSame = shuffle(fallback.filter(sameShape))
  const fallbackOther = shuffle(fallback)

  const candidates = [...poolSame, ...poolOther, ...fallbackSame, ...fallbackOther]

  for (const c of candidates) {
    if (picked.length >= n - 1) break
    const frNorm = c.fr.trim().toLowerCase()
    const mlNorm = norm(c.manglish)
    if (seenFr.has(frNorm) || seenMl.has(mlNorm)) continue
    seenFr.add(frNorm)
    seenMl.add(mlNorm)
    picked.push(c)
  }

  return shuffle([item, ...picked])
}

function createBuildExercise(item: Item, wordPool: string[]): Exercise {
  const own = words(item.manglish)
  const ownLower = new Set(own.map(w => w.toLowerCase()))
  const availableDistractors = shuffle(
    wordPool.filter(w => !ownLower.has(w.toLowerCase()) && w.length > 1)
  )
  const distractorCount = Math.min(3, Math.max(2, 6 - own.length))
  const distractors = [...new Set(availableDistractors)].slice(0, distractorCount)
  const tiles = shuffle([...own, ...distractors])
  return { kind: 'build', item, tiles }
}

function createToFrExercise(item: Item, pool: Item[], fallback: Item[]): Exercise {
  return {
    kind: 'toFr',
    item,
    options: getOptions(item, pool, fallback, 4),
  }
}

function createToMlExercise(item: Item, pool: Item[], fallback: Item[]): Exercise {
  return {
    kind: 'toMl',
    item,
    options: getOptions(item, pool, fallback, 4),
  }
}

function createListenExercise(item: Item, pool: Item[], fallback: Item[]): Exercise {
  return {
    kind: 'listen',
    item,
    options: getOptions(item, pool, fallback, 4),
  }
}

function createMatchExercise(pool: Item[], count = 4): Exercise | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
  const seenFr = new Set<string>()
  const seenMl = new Set<string>()
  const picked: Item[] = []

  const single = shuffle(pool.filter(i => !isPhrase(i)))
  const phrases = shuffle(pool.filter(i => isPhrase(i)))
  const candidates = [...single, ...phrases]

  for (const c of candidates) {
    if (picked.length >= count) break
    const frKey = c.fr.trim().toLowerCase()
    const mlKey = norm(c.manglish)
    if (seenFr.has(frKey) || seenMl.has(mlKey)) continue
    seenFr.add(frKey)
    seenMl.add(mlKey)
    picked.push(c)
  }

  if (picked.length < 2) return null
  return { kind: 'match', items: picked }
}

/**
 * Generates an interactive Duolingo / Drops style exercise set from CourseItem list.
 * Supports:
 * - Translation from French ➔ Manglish: 'build' with scrambled word tiles (for phrases) or 'toMl' (single words)
 * - Translation from Manglish ➔ French: 'toFr'
 * - Word matching pairs: 'match'
 * - Audio listening: 'listen'
 */
export function generateCourseExercises(items: CourseItem[], count = 12): Exercise[] {
  if (!items || items.length === 0 || count <= 0) return []

  const pool = items.map(toItem)
  const fallback = getFallbackItems()
  const wordPool = getWordPool(pool, fallback)

  // Determine how many match exercises we want
  let desiredMatches = 0
  if (pool.length >= 2) {
    if (count >= 10) desiredMatches = 2
    else if (count >= 4) desiredMatches = 1
  }

  const matches: Exercise[] = []
  const usedForMatch = new Set<string>()

  for (let m = 0; m < desiredMatches; m++) {
    const availableForMatch = pool.filter(i => !usedForMatch.has(i.id))
    const matchEx = createMatchExercise(
      availableForMatch.length >= 2 ? availableForMatch : pool,
      4
    )
    if (matchEx && matchEx.kind === 'match') {
      matches.push(matchEx)
      matchEx.items.forEach(i => usedForMatch.add(i.id))
    }
  }

  const nonMatchCount = count - matches.length
  const singleExercises: Exercise[] = []

  const phrases = pool.filter(isPhrase)
  const singles = pool.filter(i => !isPhrase(i))

  let phraseIdx = 0
  let singleIdx = 0
  let anyIdx = 0

  const shuffledPhrases = shuffle(phrases)
  const shuffledSingles = shuffle(singles)
  const shuffledPool = shuffle(pool)

  const nextPhrase = (): Item => {
    if (shuffledPhrases.length === 0) return nextAny()
    const item = shuffledPhrases[phraseIdx % shuffledPhrases.length]
    phraseIdx++
    return item
  }

  const nextSingle = (): Item => {
    if (shuffledSingles.length === 0) return nextAny()
    const item = shuffledSingles[singleIdx % shuffledSingles.length]
    singleIdx++
    return item
  }

  const nextAny = (): Item => {
    const item = shuffledPool[anyIdx % shuffledPool.length]
    anyIdx++
    return item
  }

  for (let i = 0; i < nonMatchCount; i++) {
    const step = i % 4
    if (step === 0) {
      // Manglish -> French (toFr)
      const item = nextAny()
      singleExercises.push(createToFrExercise(item, pool, fallback))
    } else if (step === 1) {
      // French -> Manglish (prefer build with phrase if available)
      if (phrases.length > 0) {
        const item = nextPhrase()
        singleExercises.push(createBuildExercise(item, wordPool))
      } else {
        const item = nextAny()
        singleExercises.push(
          isPhrase(item)
            ? createBuildExercise(item, wordPool)
            : createToMlExercise(item, pool, fallback)
        )
      }
    } else if (step === 2) {
      // Listen
      const item = nextAny()
      singleExercises.push(createListenExercise(item, pool, fallback))
    } else {
      // French -> Manglish (prefer toMl with single word if available, else build)
      if (singles.length > 0) {
        const item = nextSingle()
        singleExercises.push(createToMlExercise(item, pool, fallback))
      } else {
        const item = nextAny()
        singleExercises.push(
          isPhrase(item)
            ? createBuildExercise(item, wordPool)
            : createToMlExercise(item, pool, fallback)
        )
      }
    }
  }

  // Insert matches at balanced intervals
  const result: Exercise[] = [...singleExercises]
  if (matches.length === 1) {
    const insertAt = Math.floor(result.length / 2)
    result.splice(insertAt, 0, matches[0])
  } else if (matches.length === 2) {
    const firstAt = Math.floor(result.length / 3)
    result.splice(firstAt, 0, matches[0])
    const secondAt = Math.floor((result.length * 2) / 3)
    result.splice(secondAt, 0, matches[1])
  }

  return result
}

// Alias for convenience
export const courseExercises = generateCourseExercises
