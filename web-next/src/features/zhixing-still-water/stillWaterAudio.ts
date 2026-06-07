import type { MutableRefObject } from "react"

export function ensureStillWaterAudio(ref: MutableRefObject<AudioContext | null>) {
  if (typeof window === "undefined") return null

  try {
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return null
    if (!ref.current) ref.current = new AudioCtor()
    if (ref.current.state === "suspended") void ref.current.resume()
    return ref.current
  } catch {
    return null
  }
}

export function playStillWaterChime(ref: MutableRefObject<AudioContext | null>) {
  const ctx = ensureStillWaterAudio(ref)
  if (!ctx) return

  const now = ctx.currentTime
  const master = ctx.createGain()
  const lowpass = ctx.createBiquadFilter()

  master.gain.value = 0.34
  lowpass.type = "lowpass"
  lowpass.frequency.value = 2400
  master.connect(lowpass).connect(ctx.destination)

  ;[
    [196, 0.46, 4.8],
    [294, 0.16, 2.8],
    [528, 0.055, 1.4],
  ].forEach(([frequency, gain, decay]) => {
    const oscillator = ctx.createOscillator()
    const envelope = ctx.createGain()

    oscillator.type = "sine"
    oscillator.frequency.value = frequency
    envelope.gain.setValueAtTime(0.0001, now)
    envelope.gain.linearRampToValueAtTime(gain, now + 0.018)
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + decay)
    oscillator.connect(envelope).connect(master)
    oscillator.start(now)
    oscillator.stop(now + decay + 0.18)
  })
}
