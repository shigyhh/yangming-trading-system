"use client"

import { Volume2, VolumeX } from "lucide-react"
import { useRef, useState } from "react"

type AmbientState = {
  context: AudioContext
  nodes: AudioScheduledSourceNode[]
  timers: number[]
  master: GainNode
}

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext
  }

const AMBIENT_CONFIG = {
  dropFirstDelay: 4200,
  dropInterval: [7200, 9600] as const,
  masterVolume: 0.018,
  valleyFrequency: 48,
  valleyVolume: 0.012,
  windFilterFrequency: 520,
  windNoiseAmount: 0.22,
  windVolume: 0.038,
  woodFirstDelay: 11000,
  woodInterval: [14000, 21000] as const,
}

export function AmbientSound() {
  const [enabled, setEnabled] = useState(false)
  const audioRef = useRef<AmbientState | null>(null)

  async function toggle() {
    if (audioRef.current) {
      stopAmbient(audioRef.current)
      audioRef.current = null
      setEnabled(false)
      return
    }
    const next = await startAmbient()
    audioRef.current = next
    setEnabled(true)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "关闭环境音" : "开启环境音"}
      title={enabled ? "关闭环境音" : "开启极淡环境音"}
      className="type-level-5 fixed bottom-4 right-4 z-50 inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgba(217,189,122,.1)] bg-[#080807]/44 px-3 text-[0.76rem] text-muted-cream opacity-62 shadow-[0_14px_34px_rgba(0,0,0,.12)] backdrop-blur-2xl transition duration-700 hover:border-[rgba(217,189,122,.24)] hover:text-cream hover:opacity-100 md:bottom-5 md:right-5 md:px-4"
    >
      {enabled ? <Volume2 data-icon="inline-start" /> : <VolumeX data-icon="inline-start" />}
      <span className="hidden md:inline">环境音</span>
      <strong className="hidden text-gold md:inline">{enabled ? "开" : "关"}</strong>
    </button>
  )
}

async function startAmbient(): Promise<AmbientState> {
  const audioWindow = window as AudioWindow
  const AudioContextCtor = audioWindow.AudioContext || audioWindow.webkitAudioContext
  if (!AudioContextCtor) {
    throw new Error("AudioContext is not supported")
  }
  const context = new AudioContextCtor()
  await context.resume()

  const master = context.createGain()
  master.gain.setValueAtTime(0.0001, context.currentTime)
  master.gain.exponentialRampToValueAtTime(AMBIENT_CONFIG.masterVolume, context.currentTime + 1.8)
  master.connect(context.destination)

  const noise = context.createBufferSource()
  const noiseBuffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * AMBIENT_CONFIG.windNoiseAmount
  }
  noise.buffer = noiseBuffer
  noise.loop = true
  const windFilter = context.createBiquadFilter()
  windFilter.type = "lowpass"
  windFilter.frequency.value = AMBIENT_CONFIG.windFilterFrequency
  const windGain = context.createGain()
  windGain.gain.value = AMBIENT_CONFIG.windVolume
  noise.connect(windFilter).connect(windGain).connect(master)
  noise.start()

  const valley = context.createOscillator()
  valley.type = "sine"
  valley.frequency.value = AMBIENT_CONFIG.valleyFrequency
  const valleyGain = context.createGain()
  valleyGain.gain.value = AMBIENT_CONFIG.valleyVolume
  valley.connect(valleyGain).connect(master)
  valley.start()

  const timers: number[] = []
  const scheduleDrop = () => {
    playDrop(context, master)
    timers.push(window.setTimeout(scheduleDrop, randomRange(...AMBIENT_CONFIG.dropInterval)))
  }
  const scheduleWood = () => {
    playWood(context, master)
    timers.push(window.setTimeout(scheduleWood, randomRange(...AMBIENT_CONFIG.woodInterval)))
  }
  timers.push(window.setTimeout(scheduleDrop, AMBIENT_CONFIG.dropFirstDelay))
  timers.push(window.setTimeout(scheduleWood, AMBIENT_CONFIG.woodFirstDelay))

  return { context, master, nodes: [noise, valley], timers }
}

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function playDrop(context: AudioContext, destination: AudioNode) {
  const osc = context.createOscillator()
  const gain = context.createGain()
  osc.type = "sine"
  osc.frequency.setValueAtTime(920 + Math.random() * 260, context.currentTime)
  osc.frequency.exponentialRampToValueAtTime(420, context.currentTime + 0.18)
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.016, context.currentTime + 0.018)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.58)
  osc.connect(gain).connect(destination)
  osc.start()
  osc.stop(context.currentTime + 0.64)
}

function playWood(context: AudioContext, destination: AudioNode) {
  const osc = context.createOscillator()
  const gain = context.createGain()
  const filter = context.createBiquadFilter()
  osc.type = "triangle"
  osc.frequency.setValueAtTime(180, context.currentTime)
  filter.type = "bandpass"
  filter.frequency.value = 420
  filter.Q.value = 9
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.018, context.currentTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28)
  osc.connect(filter).connect(gain).connect(destination)
  osc.start()
  osc.stop(context.currentTime + 0.32)
}

function stopAmbient(audio: AmbientState) {
  audio.timers.forEach((timer) => window.clearTimeout(timer))
  audio.nodes.forEach((node) => {
    try {
      node.stop()
    } catch {}
  })
  audio.master.gain.setTargetAtTime(0.0001, audio.context.currentTime, 0.08)
  window.setTimeout(() => audio.context.close(), 220)
}
