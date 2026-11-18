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
  // 1. Load Common module and verify TABS and TabBar
  const commonModule = await server.ssrLoadModule('/src/components/Common.tsx')
  assert(commonModule, 'Common module should load successfully')
  assert(Array.isArray(commonModule.TABS), 'Common module should export TABS array')
  assert.strictEqual(commonModule.TABS.length, 6, 'TABS should contain exactly 6 tabs')

  const coursTab = commonModule.TABS.find(t => t[0] === 'cours')
  assert(coursTab, "TABS should contain 'cours' tab")
  assert.strictEqual(coursTab[0], 'cours')
  assert.strictEqual(coursTab[1], '📝')
  assert.strictEqual(coursTab[2], 'Mon cours')

  // TabBar rendering
  const tabBarHtml = renderToString(
    createElement(commonModule.TabBar, {
      tab: 'cours',
      onTab: () => {},
      badge: { practice: 3 },
    })
  )

  assert(tabBarHtml.includes('Mon cours'), 'TabBar should render "Mon cours" label')
  assert(tabBarHtml.includes('📝'), 'TabBar should render "📝" icon')
  assert(tabBarHtml.includes('Apprendre'), 'TabBar should render "Apprendre" label')
  assert(tabBarHtml.includes('Dialogues'), 'TabBar should render "Dialogues" label')
  assert(tabBarHtml.includes('Entraînement'), 'TabBar should render "Entraînement" label')
  assert(tabBarHtml.includes('Traduire'), 'TabBar should render "Traduire" label')
  assert(tabBarHtml.includes('Profil'), 'TabBar should render "Profil" label')
  assert(tabBarHtml.includes('aria-current="page"'), 'Active tab should have aria-current="page"')
  assert(tabBarHtml.includes('class="on"'), 'Active tab should have class="on"')

  // 2. Setup progress and load App module
  const storeModule = await server.ssrLoadModule('/src/lib/store.ts')
  storeModule.setProgress(p => ({ ...p, name: 'Julie' }))

  const appModule = await server.ssrLoadModule('/src/App.tsx')
  assert(appModule && typeof appModule.default === 'function', 'App component should be exported as default')

  const appHtml = renderToString(createElement(appModule.default, { initialTab: 'cours' }))

  assert(appHtml.includes('has-tabs'), 'App should render has-tabs layout')
  assert(appHtml.includes('Mon cours de malayalam'), 'App should render Course hero when tab is cours')
  assert(appHtml.includes('Les cours de Julie avec son professeur'), 'App should render Course subtitle')
  assert(appHtml.includes('Mon cours'), 'App should include Mon cours tab button in TabBar')

  console.log('✅ Navigation and TabBar verified via Vite SSR successfully')
} finally {
  await server.close()
}
