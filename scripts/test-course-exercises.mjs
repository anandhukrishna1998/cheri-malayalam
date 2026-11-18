import assert from 'node:assert'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { getCombinedCourseItems } = await server.ssrLoadModule('/src/lib/course.ts')
const { generateCourseExercises } = await server.ssrLoadModule('/src/lib/courseExercises.ts')

const items = getCombinedCourseItems([])
assert(items.length > 50)
const exercises = generateCourseExercises(items, 15)
assert(exercises.length === 15)

// Must have sentence building tiles, translation to Manglish, translation to French, and match
const kinds = new Set(exercises.map(e => e.kind))
assert(kinds.has('toMl') || kinds.has('build'), 'Must have toMl or build')
assert(kinds.has('toFr'), 'Must have toFr')

// Check Julie example specifically: Est-ce que tu as dormi ? -> Ni urangiyo ?
const urangiEx = generateCourseExercises(items.filter(i => i.manglish.includes('urangiyo')), 2)
assert(urangiEx.length > 0)

// More comprehensive checks
// 1. Check generated exercises format
for (const ex of exercises) {
  assert(ex.kind, 'Exercise must have a kind')
  if (ex.kind === 'match') {
    assert(Array.isArray(ex.items) && ex.items.length >= 2, 'Match exercise must have at least 2 items')
  } else if (ex.kind === 'build') {
    assert(ex.item, 'Build exercise must have an item')
    assert(Array.isArray(ex.tiles) && ex.tiles.length >= 2, 'Build exercise must have tiles')
    // Words of the target manglish should be present in tiles
    const words = ex.item.manglish.replace(/[?!.,]/g, '').split(/\s+/).filter(Boolean)
    for (const w of words) {
      assert(ex.tiles.includes(w), `Tiles must contain word "${w}"`)
    }
  } else {
    assert(ex.item, `${ex.kind} exercise must have an item`)
    assert(Array.isArray(ex.options) && ex.options.length >= 2, `${ex.kind} exercise must have options`)
    assert(ex.options.some(o => o.id === ex.item.id), 'Options must include the correct answer item')
  }
}

// 2. Generate a larger set and verify we get varied exercise kinds (toFr, build/toMl, match, listen)
const largeSet = generateCourseExercises(items, 25)
const largeKinds = new Set(largeSet.map(e => e.kind))
assert(largeKinds.has('toFr'), 'Large exercise set must contain toFr')
assert(largeKinds.has('toMl') || largeKinds.has('build'), 'Large exercise set must contain toMl or build')
assert(largeKinds.has('match'), 'Large exercise set should contain match when pool is large enough')
assert(largeKinds.has('listen'), 'Large exercise set should contain listen')

// 3. Graceful handling of empty or 1-item arrays
assert.deepStrictEqual(generateCourseExercises([], 10), [])
const singleEx = generateCourseExercises([items[0]], 3)
assert(singleEx.length > 0)

await server.close()
console.log('✅ Course exercise generator verified')
