"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"

import styles from "./HomeWaterStage.module.css"

type Ripple = {
  life: number
  max: number
  start: number
  strength: number
  x: number
  y: number
}

type Glow = {
  alpha: number
  phase: number
  radius: number
  speed: number
  x: number
  y: number
}

type Mote = {
  alpha: number
  life: number
  radius: number
  speed: number
  start: number
  x: number
  y: number
}

type WaterRippleEvent = CustomEvent<{
  life?: number
  max?: number
  strength?: number
  x?: number
  y?: number
}>

type WaterDiveEvent = CustomEvent<{
  dive?: number
}>

const glows: Glow[] = [
  { alpha: 0.108, phase: 0, radius: 0.44, speed: 0.045, x: 0.3, y: 0.4 },
  { alpha: 0.078, phase: 2.1, radius: 0.34, speed: 0.035, x: 0.64, y: 0.6 },
  { alpha: 0.058, phase: 4.2, radius: 0.29, speed: 0.03, x: 0.5, y: 0.32 },
]

function lightTint() {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 9) return { alpha: 0.058, color: "255,198,150" }
  if (hour >= 9 && hour < 16) return { alpha: 0.032, color: "200,224,224" }
  if (hour >= 16 && hour < 19) return { alpha: 0.068, color: "255,174,114" }
  return { alpha: 0.04, color: "120,150,184" }
}

function drawGlow(context: CanvasRenderingContext2D, glow: Glow, width: number, height: number, elapsed: number) {
  const phase = elapsed * 0.001 * glow.speed + glow.phase
  const centerX = (glow.x + Math.sin(phase) * 0.04) * width
  const centerY = (glow.y + Math.cos(phase * 0.8) * 0.03) * height
  const radius = glow.radius * Math.max(width, height) * (1 + Math.sin(phase * 1.3) * 0.06)
  const alpha = glow.alpha * (0.7 + 0.3 * Math.sin(phase * 0.9))
  const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)

  gradient.addColorStop(0, `rgba(150,178,184,${alpha})`)
  gradient.addColorStop(0.5, `rgba(120,150,162,${alpha * 0.4})`)
  gradient.addColorStop(1, "rgba(0,0,0,0)")

  context.fillStyle = gradient
  context.beginPath()
  context.arc(centerX, centerY, radius, 0, Math.PI * 2)
  context.fill()
}

function drawRipple(context: CanvasRenderingContext2D, ripple: Ripple, now: number) {
  const progress = Math.min(Math.max((now - ripple.start) / ripple.life, 0), 1)
  const eased = 1 - Math.pow(1 - progress, 2)
  const radius = ripple.max * eased
  const centerX = ripple.x
  const centerY = ripple.y
  const alpha = Math.pow(1 - progress, 1.12) * ripple.strength

  for (let index = 0; index < 3; index += 1) {
    const ringRadius = radius - index * (9 + progress * 9)
    if (ringRadius <= 0) continue

    const ringAlpha = index === 0 ? 0.48 : index === 1 ? 0.24 : 0.1

    context.strokeStyle = `rgba(196,216,212,${alpha * ringAlpha})`
    context.lineWidth = index === 0 ? 1 : 0.68
    context.beginPath()
    context.arc(centerX, centerY, ringRadius, 0, Math.PI * 2)
    context.stroke()
  }
}

function drawStillWaterGlints(context: CanvasRenderingContext2D, width: number, height: number, elapsed: number) {
  const baseY = height * 0.68

  for (let index = 0; index < 5; index += 1) {
    const phase = elapsed * 0.00013 + index * 1.7
    const centerX = width * (0.28 + index * 0.14 + Math.sin(phase) * 0.018)
    const y = baseY + Math.sin(phase * 1.35) * height * 0.055 + index * height * 0.018
    const length = width * (0.1 + index * 0.026)
    const alpha = 0.028 + Math.sin(phase * 1.8) * 0.012
    const gradient = context.createLinearGradient(centerX - length, y, centerX + length, y)

    gradient.addColorStop(0, "rgba(238,230,210,0)")
    gradient.addColorStop(0.5, `rgba(238,230,210,${alpha})`)
    gradient.addColorStop(1, "rgba(238,230,210,0)")

    context.strokeStyle = gradient
    context.lineWidth = index === 0 ? 1.2 : 0.8
    context.beginPath()
    context.moveTo(centerX - length, y)
    context.quadraticCurveTo(centerX, y + Math.sin(phase) * 2.4, centerX + length, y + Math.cos(phase) * 1.8)
    context.stroke()
  }
}

function createAutoRipple(width: number, height: number, now: number): Ripple {
  const x = (0.18 + Math.random() * 0.64) * width
  const y = (0.2 + Math.random() * 0.58) * height

  return {
    life: 5400 + Math.random() * 1500,
    max: 120 + Math.random() * 120,
    start: now,
    strength: 0.32,
    x,
    y,
  }
}

function createMote(width: number, height: number, now: number, dive = 0): Mote {
  return {
    alpha: 0.09 + Math.random() * 0.11 + dive * 0.08,
    life: 4200 + Math.random() * 3600,
    radius: 0.8 + Math.random() * 2.4,
    speed: 0.015 + Math.random() * 0.05 + dive * 0.035,
    start: now,
    x: Math.random() * width,
    y: height + 12 + Math.random() * height * 0.12,
  }
}

function drawMote(context: CanvasRenderingContext2D, mote: Mote, now: number, delta: number) {
  const age = now - mote.start
  const progress = Math.min(age / mote.life, 1)
  const alpha = Math.sin(progress * Math.PI) * mote.alpha

  mote.y -= mote.speed * delta
  mote.x += Math.sin(age * 0.0013 + mote.radius) * 0.08

  const gradient = context.createRadialGradient(mote.x, mote.y, 0, mote.x, mote.y, mote.radius * 4)
  gradient.addColorStop(0, `rgba(205,225,222,${alpha * 0.74})`)
  gradient.addColorStop(1, "rgba(0,0,0,0)")

  context.fillStyle = gradient
  context.beginPath()
  context.arc(mote.x, mote.y, mote.radius * 4, 0, Math.PI * 2)
  context.fill()
}

export function HomeWaterStage() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ripplesRef = useRef<Ripple[]>([])
  const motesRef = useRef<Mote[]>([])
  const diveRef = useRef(0)
  const [tint] = useState(lightTint)

  useEffect(() => {
    const canvasElement = canvasRef.current
    if (!canvasElement) return

    const canvasNode: HTMLCanvasElement = canvasElement
    const context = canvasNode.getContext("2d")!

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let width = 0
    let height = 0
    let frame = 0
    let last = performance.now()
    let elapsed = 0
    let nextAuto = performance.now() + 1100
    let nextMote = performance.now() + 600
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25)

    function resize() {
      const rect = canvasNode.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvasNode.width = Math.floor(width * dpr)
      canvasNode.height = Math.floor(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function draw(now: number) {
      const delta = Math.min(now - last, 50)
      last = now
      elapsed += delta
      const dive = diveRef.current

      context.clearRect(0, 0, width, height)
      context.globalCompositeOperation = "screen"

      glows.forEach((glow) => drawGlow(context, glow, width, height, elapsed))
      drawStillWaterGlints(context, width, height, elapsed)

      if (!reduceMotion.matches && now > nextMote) {
        const cadence = dive > 0.04 ? 120 + Math.random() * 120 : 1450 + Math.random() * 2200
        nextMote = now + cadence
        motesRef.current.push(createMote(width, height, now, dive))
      }

      motesRef.current = motesRef.current.filter((mote) => now - mote.start < mote.life)
      motesRef.current.forEach((mote) => drawMote(context, mote, now, delta))

      ripplesRef.current = ripplesRef.current.filter((ripple) => now - ripple.start < ripple.life)
      ripplesRef.current.forEach((ripple) => drawRipple(context, ripple, now))

      if (!reduceMotion.matches && now > nextAuto) {
        nextAuto = now + 2100 + Math.random() * 3400
        const ripple = createAutoRipple(width, height, now)
        ripplesRef.current.push(ripple)
      }

      frame = window.requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener("resize", resize, { passive: true })
    frame = window.requestAnimationFrame(draw)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("resize", resize)
      ripplesRef.current = []
    }
  }, [])

  useEffect(() => {
    function addRipple(event: Event) {
      const detail = (event as WaterRippleEvent).detail ?? {}
      const width = window.innerWidth || 1
      const height = window.innerHeight || 1
      const x = (detail.x ?? 0.5) * width
      const y = (detail.y ?? 0.5) * height

      const ripple = {
        life: detail.life ?? 5600,
        max: detail.max ?? Math.min(width, height) * 0.5,
        start: performance.now(),
        strength: detail.strength ?? 0.34,
        x,
        y,
      }

      ripplesRef.current.push(ripple)
    }

    function updateDive(event: Event) {
      const nextDive = Math.max(0, Math.min((event as WaterDiveEvent).detail?.dive ?? 0, 1))
      diveRef.current = nextDive
      rootRef.current?.style.setProperty("--water-dive", nextDive.toFixed(3))
    }

    function createPointerRipple(event: PointerEvent) {
      const target = event.target as HTMLElement | null
      if (target?.closest("a,button,input,textarea,select,[data-no-ripple='true']")) return

      const ripple = {
        life: 5200,
        max: 116 + Math.random() * 76,
        start: performance.now(),
        strength: 0.28,
        x: event.clientX,
        y: event.clientY,
      }

      ripplesRef.current.push(ripple)
    }

    window.addEventListener("home-water-ripple", addRipple)
    window.addEventListener("home-water-dive", updateDive)
    window.addEventListener("pointerdown", createPointerRipple, { passive: true })

    return () => {
      window.removeEventListener("home-water-ripple", addRipple)
      window.removeEventListener("home-water-dive", updateDive)
      window.removeEventListener("pointerdown", createPointerRipple)
      motesRef.current = []
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className={styles.root}
      aria-hidden="true"
      style={
        {
          "--still-water-tint": tint.color,
          "--still-water-tint-alpha": tint.alpha,
        } as CSSProperties
      }
    >
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.surfaceLayer} />
      <div className={styles.tintLayer} />
      <div className={styles.stillWaterPlane} />
      <div className={styles.deepLayer} />
      <div className={styles.vignetteLayer} />
    </div>
  )
}
