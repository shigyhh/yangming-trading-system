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
  { alpha: 0.1, phase: 0, radius: 0.42, speed: 0.05, x: 0.3, y: 0.42 },
  { alpha: 0.075, phase: 2.1, radius: 0.34, speed: 0.04, x: 0.62, y: 0.58 },
  { alpha: 0.06, phase: 4.2, radius: 0.3, speed: 0.035, x: 0.48, y: 0.3 },
]

function lightTint() {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 9) return { alpha: 0.06, color: "255,198,150" }
  if (hour >= 9 && hour < 16) return { alpha: 0.035, color: "200,224,224" }
  if (hour >= 16 && hour < 19) return { alpha: 0.075, color: "255,174,114" }
  return { alpha: 0.045, color: "120,150,184" }
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
  const alpha = (1 - progress) * ripple.strength

  for (let index = 0; index < 3; index += 1) {
    const ringRadius = radius - index * 9
    if (ringRadius <= 0) continue

    const ringAlpha = index === 0 ? 0.48 : index === 1 ? 0.24 : 0.1

    context.strokeStyle = `rgba(196,216,212,${alpha * ringAlpha})`
    context.lineWidth = index === 0 ? 1 : 0.68
    context.beginPath()
    context.arc(ripple.x, ripple.y, ringRadius, 0, Math.PI * 2)
    context.stroke()
  }
}

function createAutoRipple(width: number, height: number, now: number): Ripple {
  return {
    life: 5200,
    max: 90 + Math.random() * 70,
    start: now,
    strength: 0.32,
    x: (0.2 + Math.random() * 0.6) * width,
    y: (0.25 + Math.random() * 0.5) * height,
  }
}

export function HomeWaterStage() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ripplesRef = useRef<Ripple[]>([])
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
    let nextAuto = 5200 + Math.random() * 4200
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

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

      context.clearRect(0, 0, width, height)
      context.globalCompositeOperation = "screen"

      glows.forEach((glow) => drawGlow(context, glow, width, height, elapsed))

      ripplesRef.current = ripplesRef.current.filter((ripple) => now - ripple.start < ripple.life)
      ripplesRef.current.forEach((ripple) => drawRipple(context, ripple, now))

      if (!reduceMotion.matches && elapsed > nextAuto) {
        nextAuto = elapsed + 6200 + Math.random() * 5200
        ripplesRef.current.push(createAutoRipple(width, height, now))
      }

      frame = window.requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener("resize", resize, { passive: true })

    if (reduceMotion.matches) {
      glows.forEach((glow) => drawGlow(context, glow, width, height, elapsed))
    } else {
      frame = window.requestAnimationFrame(draw)
    }

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

      ripplesRef.current.push({
        life: detail.life ?? 5600,
        max: detail.max ?? Math.min(width, height) * 0.5,
        start: performance.now(),
        strength: detail.strength ?? 0.34,
        x: (detail.x ?? 0.5) * width,
        y: (detail.y ?? 0.5) * height,
      })
    }

    function updateDive(event: Event) {
      const nextDive = Math.max(0, Math.min((event as WaterDiveEvent).detail?.dive ?? 0, 1))
      diveRef.current = nextDive
      rootRef.current?.style.setProperty("--water-dive", nextDive.toFixed(3))
    }

    function createPointerRipple(event: PointerEvent) {
      const target = event.target as HTMLElement | null
      if (target?.closest("a,button,input,textarea,select,[data-no-ripple='true']")) return

      ripplesRef.current.push({
        life: 5600,
        max: 150,
        start: performance.now(),
        strength: 0.42,
        x: event.clientX,
        y: event.clientY,
      })
    }

    window.addEventListener("home-water-ripple", addRipple)
    window.addEventListener("home-water-dive", updateDive)
    window.addEventListener("pointerdown", createPointerRipple, { passive: true })

    return () => {
      window.removeEventListener("home-water-ripple", addRipple)
      window.removeEventListener("home-water-dive", updateDive)
      window.removeEventListener("pointerdown", createPointerRipple)
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
      <div className={styles.tintLayer} />
      <div className={styles.vignetteLayer} />
      <div className={styles.deepLayer} />
    </div>
  )
}
