function getAudioContext(): AudioContext | null {
  const AudioContextConstructor = globalThis.AudioContext
  if (!AudioContextConstructor) return null

  try {
    return new AudioContextConstructor()
  } catch {
    return null
  }
}

async function withAudioContext(play: (context: AudioContext) => void) {
  const context = getAudioContext()
  if (!context) return

  try {
    if (context.state === "suspended") await context.resume()
    play(context)
  } catch {
    // Sound effects are optional enhancement and must never interrupt play.
  } finally {
    window.setTimeout(() => void context.close().catch(() => undefined), 900)
  }
}

export function playCorrectGameSound() {
  void withAudioContext((context) => {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const start = context.currentTime + index * 0.075
      oscillator.type = "triangle"
      oscillator.frequency.setValueAtTime(frequency, start)
      gain.gain.setValueAtTime(0.09, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.2)
    })
  })
}

export function playPickUpGameSound() {
  void withAudioContext((context) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const start = context.currentTime
    oscillator.type = "sine"
    oscillator.frequency.setValueAtTime(400, start)
    oscillator.frequency.exponentialRampToValueAtTime(760, start + 0.1)
    gain.gain.setValueAtTime(0.06, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.1)
  })
}

export function playWrongGameSound() {
  void withAudioContext((context) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const start = context.currentTime
    oscillator.type = "sine"
    oscillator.frequency.setValueAtTime(220, start)
    oscillator.frequency.exponentialRampToValueAtTime(140, start + 0.24)
    gain.gain.setValueAtTime(0.08, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.24)
  })
}
