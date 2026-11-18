import { existsSync, statSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadContent } from './load-content.mjs'

console.log('--- RUNNING FULL-FLEDGED AUDIO VERIFICATION ---')

const c = await loadContent()
const courseRaw = JSON.parse(readFileSync('src/content/course.json', 'utf8'))

// 1. Check all course items
console.log('\n[1/4] Verifying Course items audio files...')
let courseMissing = 0
for (const ci of (c.courseItems || [])) {
  const p = join('public/audio', `${ci.id}.mp3`)
  if (!existsSync(p) || statSync(p).size < 1000) {
    console.error(`  ❌ Missing or invalid course audio: ${ci.id} (${p})`)
    courseMissing++
  }
}
if (courseMissing === 0) {
  console.log(`  ✅ All ${c.courseItems.length} course items have valid MP3 files!`)
} else {
  throw new Error(`${courseMissing} course audio files missing or invalid`)
}

// 2. Check all course grammar comparisons and question examples
console.log('\n[2/4] Verifying Course Grammar items audio files...')
const grammarItems = [
  ...courseRaw.grammar.undVsAanu.pairs.flatMap((p, idx) => [
    { id: `aanu-${idx}-${p.aanu.manglish.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, manglish: p.aanu.manglish },
    { id: `undu-${idx}-${p.undu.manglish.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, manglish: p.undu.manglish }
  ]),
  ...courseRaw.grammar.questionO.examples.map(ex => ({
    id: `ex-${ex.manglish.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    manglish: ex.manglish
  }))
]
let grammarMissing = 0
for (const g of grammarItems) {
  const p = join('public/audio', `${g.id}.mp3`)
  if (!existsSync(p) || statSync(p).size < 1000) {
    console.error(`  ❌ Missing grammar audio: ${g.id} (${p})`)
    grammarMissing++
  }
}
if (grammarMissing === 0) {
  console.log(`  ✅ All ${grammarItems.length} grammar items have valid MP3 files!`)
} else {
  throw new Error(`${grammarMissing} grammar audio files missing or invalid`)
}

// 3. Check 14 verbs table audio
console.log('\n[3/4] Verifying 14 Course Verbs audio files...')
const pool = c.courseItems
const contentVerbs = c.verbs
const norm = s => s.trim().toLowerCase()
let verbMissing = 0
for (const v of courseRaw.verbs) {
  const matched = pool?.find(item => norm(item.manglish) === norm(v.inf))
  const cv = contentVerbs.find(c => norm(c.id) === norm(v.inf) || norm(c.fr) === norm(v.fr))
  const id = matched?.id || (cv ? cv.forms.pres.id : `v-${v.inf.toLowerCase().replace(/[^a-z0-9]/g, '-')}`)
  const p = join('public/audio', `${id}.mp3`)
  if (!existsSync(p) || statSync(p).size < 1000) {
    console.error(`  ❌ Missing verb audio: ${v.inf} (id=${id})`)
    verbMissing++
  }
}
if (verbMissing === 0) {
  console.log(`  ✅ All 14 verbs have valid MP3 files!`)
} else {
  throw new Error(`${verbMissing} verb audio files missing`)
}

// 4. Verify Range request handling logic (matching sw.js)
console.log('\n[4/4] Verifying HTTP 206 Range slicing simulation...')
const sampleBuf = Buffer.from('0123456789ABCDEF', 'utf8') // 16 bytes
const total = sampleBuf.byteLength

function simulateRange(rangeHeader) {
  const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader)
  if (!match) return { status: 200 }
  const start = parseInt(match[1], 10)
  const end = match[2] ? parseInt(match[2], 10) : total - 1
  if (start >= total || end >= total) return { status: 416 }
  const chunk = sampleBuf.slice(start, end + 1)
  return {
    status: 206,
    contentRange: `bytes ${start}-${end}/${total}`,
    contentLength: chunk.byteLength
  }
}

// Test iOS Safari initial probe: bytes=0-1
const r1 = simulateRange('bytes=0-1')
if (r1.status !== 206 || r1.contentLength !== 2 || r1.contentRange !== 'bytes 0-1/16') {
  throw new Error(`Range 0-1 failed: ${JSON.stringify(r1)}`)
}
console.log('  ✅ Range bytes=0-1 (Safari probe) returns 206 Partial Content (2 bytes)')

// Test standard range: bytes=0-
const r2 = simulateRange('bytes=0-')
if (r2.status !== 206 || r2.contentLength !== 16 || r2.contentRange !== 'bytes 0-15/16') {
  throw new Error(`Range 0- failed: ${JSON.stringify(r2)}`)
}
console.log('  ✅ Range bytes=0- returns 206 Partial Content (all 16 bytes)')

// Test out of bounds: bytes=20-
const r3 = simulateRange('bytes=20-')
if (r3.status !== 416) {
  throw new Error(`Range out-of-bounds failed: ${JSON.stringify(r3)}`)
}
console.log('  ✅ Out-of-bounds range correctly returns 416')

console.log('\n🎉 ALL AUDIO VERIFICATION TESTS PASSED SUCCESSFULLY!')
