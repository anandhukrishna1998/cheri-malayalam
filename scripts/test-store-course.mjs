import assert from 'node:assert'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { getProgress, setProgress, resetProgress, exportProgress, importProgress, addCustomCourseItem, removeCustomCourseItem } = await server.ssrLoadModule('/src/lib/store.ts')

// Add custom course item
const p = getProgress()
assert(Array.isArray(p.customCourseItems), 'customCourseItems should default to array')
setProgress(s => ({
  ...s,
  customCourseItems: [...(s.customCourseItems || []), { id: 'custom-1', manglish: 'Chiri', fr: 'Sourire', ml: 'ചിരി', date: '2026-11-20' }]
}))
assert.strictEqual(getProgress().customCourseItems.length, 1)

// Backup & restore retains custom items
const backup = exportProgress()
assert(backup.includes('custom-1'))
assert(backup.includes('Chiri'))

const restored = importProgress(backup)
assert(restored)
assert.strictEqual(getProgress().customCourseItems[0].manglish, 'Chiri')

// Test helper functions
assert.strictEqual(typeof addCustomCourseItem, 'function', 'addCustomCourseItem should be a function')
assert.strictEqual(typeof removeCustomCourseItem, 'function', 'removeCustomCourseItem should be a function')

// Add item with explicit id
addCustomCourseItem({ id: 'custom-2', manglish: 'Vellam', fr: 'Eau', ml: 'വെള്ളം', date: '2026-11-21' })
assert.strictEqual(getProgress().customCourseItems.length, 2)
assert.strictEqual(getProgress().customCourseItems.find(i => i.id === 'custom-2')?.manglish, 'Vellam')

// Add item without explicit id (auto-minted with entropy)
addCustomCourseItem({ manglish: 'Chaya', fr: 'Thé', ml: 'ചായ' })
assert.strictEqual(getProgress().customCourseItems.length, 3)
const chaya = getProgress().customCourseItems.find(i => i.manglish === 'Chaya')
assert(chaya && chaya.id && chaya.id.startsWith('custom-'))
assert.match(chaya.id, /^custom-\d+-[a-z0-9]+$/)

removeCustomCourseItem('custom-1')
assert.strictEqual(getProgress().customCourseItems.length, 2)
assert.strictEqual(getProgress().customCourseItems[0].id, 'custom-2')

// resetProgress should preserve customCourseItems
resetProgress()
assert.strictEqual(getProgress().customCourseItems.length, 2)
assert.strictEqual(getProgress().customCourseItems[0].id, 'custom-2')
assert.strictEqual(getProgress().xp, 0)

await server.close()
console.log('✅ Store custom course items verified')
