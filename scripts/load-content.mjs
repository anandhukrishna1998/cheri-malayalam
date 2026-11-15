// Loads src/lib/content.ts through Vite, so scripts use exactly the same rules as the app.
import { createServer } from 'vite'

export async function loadContent() {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true } })
  try { return await server.ssrLoadModule('/src/lib/content.ts') } finally { await server.close() }
}
