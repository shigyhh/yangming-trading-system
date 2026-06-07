"use client"

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react"
import { useRouter } from "next/navigation"

import { YangmingA1Mark } from "@/components/brand/yangming-mark"

import styles from "./HomeStillWaterHero.module.css"

type DivePhase = "shore" | "descend" | "arrive" | "drop"

export default function HomeStillWaterHero() {
  const router = useRouter()
  const rootRef = useRef<HTMLElement | null>(null)
  const diveRafRef = useRef<number | null>(null)
  const routeTimerRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const [phase, setPhase] = useState<DivePhase>("shore")
  const [typedThought, setTypedThought] = useState("")

  const ensureAudioContext = useCallback(() => {
    try {
      const AudioCtor =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

      if (!AudioCtor) return null
      if (!audioContextRef.current) audioContextRef.current = new AudioCtor()
      if (audioContextRef.current.state === "suspended") void audioContextRef.current.resume()

      return audioContextRef.current
    } catch {
      return null
    }
  }, [])

  const playSubmergeSound = useCallback(() => {
    const audioContext = ensureAudioContext()
    if (!audioContext) return

    const now = audioContext.currentTime
    const sampleCount = Math.floor(audioContext.sampleRate * 1.35)
    const buffer = audioContext.createBuffer(1, sampleCount, audioContext.sampleRate)
    const channel = buffer.getChannelData(0)

    for (let index = 0; index < sampleCount; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * 0.52
    }

    const noise = audioContext.createBufferSource()
    noise.buffer = buffer

    const lowpass = audioContext.createBiquadFilter()
    lowpass.type = "lowpass"
    lowpass.frequency.setValueAtTime(860, now)
    lowpass.frequency.exponentialRampToValueAtTime(190, now + 1.2)

    const noiseGain = audioContext.createGain()
    noiseGain.gain.setValueAtTime(0.0001, now)
    noiseGain.gain.linearRampToValueAtTime(0.12, now + 0.16)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.32)

    noise.connect(lowpass).connect(noiseGain).connect(audioContext.destination)
    noise.start(now)
    noise.stop(now + 1.35)

    ;[110, 165].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator()
      oscillator.type = "triangle"
      oscillator.frequency.value = frequency

      const gain = audioContext.createGain()
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.linearRampToValueAtTime(index ? 0.035 : 0.07, now + 0.42)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.7)

      const toneFilter = audioContext.createBiquadFilter()
      toneFilter.type = "lowpass"
      toneFilter.frequency.value = 820

      oscillator.connect(gain).connect(toneFilter).connect(audioContext.destination)
      oscillator.start(now)
      oscillator.stop(now + 2.8)
    })
  }, [ensureAudioContext])

  const playArriveTone = useCallback(() => {
    const audioContext = ensureAudioContext()
    if (!audioContext) return

    const now = audioContext.currentTime
    const master = audioContext.createGain()
    const lowpass = audioContext.createBiquadFilter()

    master.gain.value = 0.045
    lowpass.type = "lowpass"
    lowpass.frequency.value = 2500
    master.connect(lowpass).connect(audioContext.destination)

    ;[
      { duration: 2.8, frequency: 294, gain: 0.42 },
      { duration: 1.6, frequency: 812, gain: 0.1 },
    ].forEach((tone) => {
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()

      oscillator.type = "sine"
      oscillator.frequency.value = tone.frequency
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.linearRampToValueAtTime(tone.gain, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.duration)

      oscillator.connect(gain).connect(master)
      oscillator.start(now)
      oscillator.stop(now + tone.duration + 0.08)
    })
  }, [ensureAudioContext])

  const dispatchHomeWaterDive = useCallback((dive: number) => {
    window.dispatchEvent(new CustomEvent("home-water-dive", { detail: { dive } }))
  }, [])

  const dispatchHomeWaterRipple = useCallback(
    (detail: {
      clientX?: number
      clientY?: number
      life?: number
      max?: number
      strength?: number
      x?: number
      y?: number
    }) => {
      const width = window.innerWidth || 1
      const height = window.innerHeight || 1
      const x = detail.x ?? (detail.clientX ?? width * 0.5) / width
      const y = detail.y ?? (detail.clientY ?? height * 0.5) / height

      window.dispatchEvent(
        new CustomEvent("home-water-ripple", {
          detail: {
            life: detail.life,
            max: detail.max,
            strength: detail.strength,
            x,
            y,
          },
        }),
      )
    },
    [],
  )

  const tweenDive = useCallback((to: number, duration: number, after?: () => void) => {
    if (diveRafRef.current) window.cancelAnimationFrame(diveRafRef.current)

    const root = rootRef.current
    const from = Number.parseFloat(root?.style.getPropertyValue("--dive") || "0")
    const start = performance.now()

    function tick(now: number) {
      const raw = Math.min((now - start) / duration, 1)
      const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2
      const nextDive = from + (to - from) * eased
      root?.style.setProperty("--dive", nextDive.toFixed(3))
      dispatchHomeWaterDive(nextDive)

      if (raw < 1) {
        diveRafRef.current = window.requestAnimationFrame(tick)
        return
      }

      after?.()
    }

    diveRafRef.current = window.requestAnimationFrame(tick)
  }, [dispatchHomeWaterDive])

  useEffect(() => {
    return () => {
      if (routeTimerRef.current) window.clearTimeout(routeTimerRef.current)
      if (diveRafRef.current) window.cancelAnimationFrame(diveRafRef.current)
      dispatchHomeWaterDive(0)
    }
  }, [dispatchHomeWaterDive])

  const enterReflect = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return

    event.preventDefault()
    if (phase !== "shore") return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push("/reflect")
      return
    }

    dispatchHomeWaterRipple({
      clientX: event.clientX,
      clientY: event.clientY,
      life: 6200,
      max: Math.max(window.innerWidth, window.innerHeight) * 0.82,
      strength: 0.42,
    })

    setPhase("descend")
    playSubmergeSound()
    tweenDive(1, 2900, () => {
      setPhase("arrive")
      playArriveTone()
    })
  }, [dispatchHomeWaterRipple, phase, playArriveTone, playSubmergeSound, router, tweenDive])

  const submitThought = useCallback(() => {
    if (phase !== "arrive") return

    const cleanThought = typedThought.trim().slice(0, 28)
    if (cleanThought) {
      window.sessionStorage.setItem("yangming:home-dive-thought", cleanThought)
    }

    dispatchHomeWaterRipple({
      life: 5600,
      max: Math.max(window.innerWidth, window.innerHeight) * 0.62,
      strength: 0.38,
      x: 0.5,
      y: 0.52,
    })

    setPhase("drop")
    routeTimerRef.current = window.setTimeout(() => {
      router.push("/reflect")
    }, 1480)
  }, [dispatchHomeWaterRipple, phase, router, typedThought])

  return (
    <section
      ref={rootRef}
      id="hero"
      data-home-roll="hero"
      data-phase={phase}
      aria-label="阳明心学交易系统首屏"
      className={styles.root}
    >
      <div className={styles.diveLayer} aria-hidden="true">
        <span className={styles.diveArc} />
        <span className={`${styles.diveMote} ${styles.moteA}`} />
        <span className={`${styles.diveMote} ${styles.moteB}`} />
        <span className={`${styles.diveMote} ${styles.moteC}`} />
        <span className={`${styles.diveMote} ${styles.moteD}`} />
        <span className={`${styles.diveMote} ${styles.moteE}`} />
        <span className={`${styles.diveMote} ${styles.moteF}`} />
      </div>

      <svg className={styles.inkDefs} aria-hidden="true">
        <defs>
          <filter id="home-still-water-ink" x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.016" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div data-home-roll-plane className={styles.content}>
        <span className={styles.zhaoMark} aria-hidden="true">
          <YangmingA1Mark className={styles.zhaoGlyph} role="presentation" aria-hidden="true" />
        </span>

        <h1 className={styles.title} data-hero-title aria-label="心不静，交易必乱。">
          <span>心不静，</span>
          <span>交易必乱。</span>
        </h1>

        <p className={styles.couplet} aria-label="市场照见价格 · 心镜照见自己">
          <span className={`${styles.coupletPhrase} ${styles.coupletMarket}`}>市场照见价格</span>
          <span className={styles.coupletDot} aria-hidden="true">｜</span>
          <span className={`${styles.coupletPhrase} ${styles.coupletMirror}`}>心镜照见自己</span>
        </p>
        <p className={styles.subcopy}>今天，你起了哪一念？</p>

        <a href="/reflect" className={styles.door} data-no-ripple="true" onClick={enterReflect}>
          <span className={styles.doorMain}>照见一念　→</span>
          <span className={styles.doorLine} aria-hidden="true" />
        </a>
      </div>

      <div className={styles.arrivePanel} aria-hidden={phase !== "arrive"}>
        <p className={styles.arriveQuestion}>
          市场未动，心已先动。
          <br />
          今天，你对自己说的那一句是——
        </p>
        <input
          className={styles.thoughtInput}
          value={typedThought}
          maxLength={28}
          placeholder="写下此刻心里那句话"
          onChange={(event) => setTypedThought(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submitThought()
          }}
        />
        <button type="button" className={styles.dropDoor} onClick={submitThought}>
          落入水中 ↓
        </button>
      </div>

      <div className={styles.dropPanel} aria-hidden={phase !== "drop"}>
        <p className={styles.dropThought}>「{typedThought.trim() || "再等等。"}」</p>
        <p className={styles.dropCopy}>入卷 —— 今日一念，已落入水中</p>
      </div>
    </section>
  )
}
