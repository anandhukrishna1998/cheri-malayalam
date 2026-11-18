import assert from 'node:assert'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

// Load Course module through Vite SSR
const courseModule = await server.ssrLoadModule('/src/components/Course.tsx')

assert(courseModule, 'Course module should load successfully')
assert(typeof courseModule.Course === 'function', 'Course should be a function component')
assert(typeof courseModule.default === 'function', 'Course should also be exported as default')

// Verify full HTML rendering via renderToString
const html = renderToString(createElement(courseModule.Course, { onStartPractice: () => {} }))

assert(html && html.length > 1000, 'Rendered HTML should have content')
assert(html.includes('Mon cours de malayalam'), 'HTML must contain hero title "Mon cours de malayalam"')
assert(html.includes('Les cours de Julie avec son professeur'), 'HTML must contain subtitle')
assert(html.includes('UND vs AANU') || html.includes('UNDU (ഉണ്ട്) vs AANU (ആണ്)'), 'HTML must contain UND vs AANU reference')
assert(html.includes('Tableau des 14 verbes'), 'HTML must contain "Tableau des 14 verbes"')
assert(html.includes('questions familières en -O') || html.includes('Questions familières en -O'), 'HTML must contain questions en -o card')
assert(html.includes('aria-pressed'), 'Filter pills must have aria-pressed attributes')

console.log('✅ Course component loaded and rendered to string successfully via Vite SSR (HTML length: ' + html.length + ')')
await server.close()
