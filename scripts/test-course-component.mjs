import assert from 'node:assert'
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

console.log('✅ Course component loaded successfully via Vite SSR')
await server.close()
