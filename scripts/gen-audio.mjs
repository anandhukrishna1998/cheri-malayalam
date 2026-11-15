// Generates public/audio/<id>.mp3 for every phrase that has no audio yet.
// Your own recordings win: any existing file is left untouched.
// Usage: npm run audio
// Dialogue lines use a male or female voice depending on the speaker.
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { existsSync, mkdirSync, copyFileSync, rmSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadContent } from './load-content.mjs'

const VOICES = { f: 'ml-IN-SobhanaNeural', m: 'ml-IN-MidhunNeural' }
const c = await loadContent()
const jobs = [
  ...[...c.allItems, ...c.dictionaryOnly].map(i => ({ item: i, voice: VOICES.f })),
  ...c.dialogues.flatMap(d => d.lines.map(i => ({ item: i, voice: VOICES[c.speakers[i.speaker]?.voice ?? 'f'] }))),
].filter(j => !existsSync(join('public/audio', `${j.item.id}.mp3`)))

const out = 'public/audio'
mkdirSync(out, { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
console.log(`${jobs.length} audio files to generate…`)

let made = 0
const failed = []
async function run({ item, voice }) {
  const target = join(out, `${item.id}.mp3`)
  for (let attempt = 1; attempt <= 5; attempt++) {
    const tmp = mkdtempSync(join(tmpdir(), 'cheri-tts-'))
    try {
      const tts = new MsEdgeTTS()
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
      const { audioFilePath } = await tts.toFile(tmp, item.ml, { rate: 0.9 })
      copyFileSync(audioFilePath, target)
      try { tts.close() } catch { /* */ }
      made++
      if (made % 25 === 0) console.log(`  ${made}/${jobs.length}`)
      return
    } catch {
      await sleep(1500 * attempt)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  }
  failed.push(item.id)
}

// 3 at a time
const queue = [...jobs]
await Promise.all([0, 1, 2].map(async () => { while (queue.length) { await run(queue.shift()); await sleep(250) } }))
console.log(`${made} new audio files. ${failed.length ? 'Failed (run again): ' + failed.join(', ') : 'All phrases have audio.'}`)
