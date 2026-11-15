import { getProgress } from './store'

/** Tiny synthesized sound effects — no audio files needed. */
let ctx: AudioContext | null = null
function tone(freqs: number[], dur = 0.12, type: OscillatorType = 'sine', gap = 0.09) {
  if (!getProgress().sfx) return
  try {
    ctx ??= new AudioContext()
    const t0 = ctx.currentTime
    freqs.forEach((f, i) => {
      const o = ctx!.createOscillator()
      const g = ctx!.createGain()
      o.type = type; o.frequency.value = f
      const s = t0 + i * gap
      g.gain.setValueAtTime(0.0001, s)
      g.gain.exponentialRampToValueAtTime(0.18, s + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, s + dur)
      o.connect(g).connect(ctx!.destination)
      o.start(s); o.stop(s + dur + 0.02)
    })
  } catch { /* audio not available */ }
}

export const sfx = {
  right: () => tone([660, 880], 0.14, 'sine'),
  wrong: () => tone([220, 180], 0.16, 'triangle', 0.1),
  done: () => tone([523, 659, 784, 1047], 0.2, 'sine', 0.11),
}
