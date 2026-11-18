import assert from 'node:assert'
import fs from 'node:fs'

const data = JSON.parse(fs.readFileSync('src/content/course.json', 'utf8'))
assert(Array.isArray(data.sessions), 'sessions should be an array')
assert(data.sessions.length >= 7, 'should have at least 7 course dates')
assert(data.grammar && data.grammar.undVsAanu, 'should have undVsAanu grammar')
assert(data.verbs && data.verbs.length >= 14, 'should have 14 verbs table')

// Check specific examples requested by Julie
const allItems = data.sessions.flatMap(s => s.items)
const urangiyo = allItems.find(i => i.manglish.toLowerCase().includes('urangiyo'))
assert(urangiyo, 'Missing "urangiyo" sentence')
const sathyam = allItems.find(i => i.manglish.toLowerCase() === 'sathyam')
assert(sathyam, 'Missing "sathyam" word')
const kallam = allItems.find(i => i.manglish.toLowerCase() === 'kallam')
assert(kallam, 'Missing "kallam" word')

// Check grammar pairs
assert(Array.isArray(data.grammar.undVsAanu.pairs), 'grammar.undVsAanu.pairs should be an array')
assert(data.grammar.undVsAanu.pairs.length >= 3, 'grammar.undVsAanu.pairs should have at least 3 pairs')

// Verify lib exports via Vite SSR loader
import { createServer } from 'vite'
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { loadCourseData, getCourseSessions, getAllCourseItems, getCombinedCourseItems } = await server.ssrLoadModule('/src/lib/course.ts')

const loaded = loadCourseData()
assert.strictEqual(loaded.sessions.length, data.sessions.length)
assert.strictEqual(loaded.verbs.length, data.verbs.length)
assert(loaded.grammar.undVsAanu)

const sessions = getCourseSessions()
assert.strictEqual(sessions.length, data.sessions.length)

const items = getAllCourseItems()
assert.strictEqual(items.length, allItems.length)

const combined = getCombinedCourseItems([
  { id: 'custom-test-1', manglish: 'Chiri', fr: 'Sourire', ml: 'ചിരി' }
])
assert.strictEqual(combined.length, allItems.length + 1)
assert(combined.find(i => i.id === 'custom-test-1'))

await server.close()

console.log('✅ Course content and lib verified:', allItems.length, 'items across', data.sessions.length, 'sessions')
