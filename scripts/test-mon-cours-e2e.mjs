import assert from 'node:assert'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

try {
  // 1. Verify course dataset & course lib
  const { loadCourseData, getCourseSessions, getAllCourseItems, getCombinedCourseItems } = await server.ssrLoadModule('/src/lib/course.ts')
  const courseData = loadCourseData()
  assert(courseData.sessions.length >= 8, 'Expected at least 8 course sessions')
  assert(courseData.verbs.length === 14, 'Expected exactly 14 verbs')
  assert(courseData.grammar.undVsAanu.pairs.length >= 3, 'Expected at least 3 comparative pairs in UND vs AANU')

  // Check Julie's specific requested items
  const allItems = getAllCourseItems()
  const urangiyo = allItems.find(i => i.manglish.toLowerCase() === 'ni urangiyo ?' || i.manglish.toLowerCase() === 'ni urangiyo?')
  assert(urangiyo, 'Missing "Ni urangiyo ?" in course items')
  assert(urangiyo.fr.toLowerCase().includes('dormi'), 'Expected French translation for "Ni urangiyo ?"')

  const avalUrangiyo = allItems.find(i => i.manglish.toLowerCase().includes('aval ivide urangiyo'))
  assert(avalUrangiyo, 'Missing "Aval ivide urangiyo ?" in course items')

  const sathyam = allItems.find(i => i.manglish.toLowerCase() === 'sathyam')
  assert(sathyam, 'Missing "sathyam" word')
  assert(sathyam.fr.toLowerCase().includes('vérité'), 'Expected French "Vérité" for sathyam')

  const kallam = allItems.find(i => i.manglish.toLowerCase() === 'kallam')
  assert(kallam, 'Missing "kallam" word')
  assert(kallam.fr.toLowerCase().includes('mensonge'), 'Expected French "Mensonge" for kallam')

  // 2. Verify Duolingo/Drop style quiz engine
  const { generateCourseExercises } = await server.ssrLoadModule('/src/lib/courseExercises.ts')
  const exercises = generateCourseExercises(allItems, 20)
  assert.strictEqual(exercises.length, 20, 'Expected 20 generated exercises')

  // Verify build tile exercises exist for phrases
  const buildEx = exercises.find(e => e.kind === 'build')
  assert(buildEx, 'Expected build tile exercises')
  assert(buildEx.tiles.length >= 2, 'Build exercise must contain multiple tiles')

  // Julie's exact sentence quiz generation
  const julieSentenceEx = generateCourseExercises([urangiyo, avalUrangiyo], 4)
  assert(julieSentenceEx.some(e => e.kind === 'build' || e.kind === 'toMl' || e.kind === 'toFr'))

  // 3. Verify Store persistence & custom course items
  const { getProgress, setProgress, addCustomCourseItem, removeCustomCourseItem, exportProgress, importProgress } = await server.ssrLoadModule('/src/lib/store.ts')
  addCustomCourseItem({
    id: 'test-custom-cours-1',
    manglish: 'Penne',
    fr: 'Fille / Chérie',
    ml: 'പെണ്ണേ',
    date: '2026-11-19',
    note: 'Appris en cours particulier',
  })

  const combined = getCombinedCourseItems(getProgress().customCourseItems)
  const foundCustom = combined.find(i => i.id === 'test-custom-cours-1')
  assert(foundCustom, 'Custom item must be included in combined course items')
  assert.strictEqual(foundCustom.manglish, 'Penne')

  // Export & import roundtrip
  const exported = exportProgress()
  assert(exported.includes('test-custom-cours-1'))
  assert(exported.includes('Penne'))
  const imported = importProgress(exported)
  assert(imported, 'Import must succeed')
  assert(getProgress().customCourseItems.some(i => i.id === 'test-custom-cours-1'))

  // Cleanup custom item
  removeCustomCourseItem('test-custom-cours-1')
  assert(!getProgress().customCourseItems.some(i => i.id === 'test-custom-cours-1'))

  // 4. Verify Course UI SSR rendering
  const courseComponentModule = await server.ssrLoadModule('/src/components/Course.tsx')
  const courseHtml = renderToString(createElement(courseComponentModule.Course, { onStartPractice: () => {} }))
  assert(courseHtml.includes('Mon cours de malayalam'), 'Rendered HTML must contain title')
  assert(courseHtml.includes('Les cours de Julie avec son professeur'), 'Rendered HTML must contain subtitle')
  assert(courseHtml.includes('UND vs AANU'), 'Rendered HTML must contain UND vs AANU card')
  assert(courseHtml.includes('Tableau des 14 verbes'), 'Rendered HTML must contain 14 verbs table')

  // 5. Verify Translator search
  const { translate } = await server.ssrLoadModule('/src/lib/translate.ts')
  const trSathyam = translate('sathyam', 'ml')
  assert(trSathyam.exact.some(i => i.manglish.toLowerCase() === 'sathyam'))

  const trUrangiyo = translate('Est-ce que tu as dormi ?', 'fr')
  assert(trUrangiyo.exact.some(i => i.manglish.toLowerCase().includes('urangiyo')))

  // 6. Verify Navigation tab bar with 6 tabs
  const commonModule = await server.ssrLoadModule('/src/components/Common.tsx')
  assert.strictEqual(commonModule.TABS.length, 6, 'Must have 6 tabs in TABS array')
  assert(commonModule.TABS.some(t => t[0] === 'cours'), 'Must include "cours" tab')

  console.log('🎉 ALL MON COURS E2E TESTS PASSED SUCCESSFULLY!')
} finally {
  await server.close()
}
