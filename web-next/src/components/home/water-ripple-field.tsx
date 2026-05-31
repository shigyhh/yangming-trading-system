"use client"

import { useEffect, useRef } from "react"

type Ripple = {
  biasAngle: number
  duration: number
  driftX: number
  driftY: number
  maxRadius: number
  ovalX: number
  ovalY: number
  seed: number
  start: number
  tilt: number
  x: number
  y: number
}

const MAX_ACTIVE_RIPPLES = 2
const BLOCKED_INTERACTIVE_SELECTOR =
  "a,button,input,textarea,select,label,summary,[role='button'],[data-no-ripple='true'],[data-ripple-block='true']"

function shouldIgnoreTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(BLOCKED_INTERACTIVE_SELECTOR))
}

function isInsideActiveHero(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("#hero"))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function easeOutSoft(value: number) {
  return 1 - Math.pow(1 - value, 2)
}

function easeInOutSine(value: number) {
  return -(Math.cos(Math.PI * value) - 1) / 2
}

function getSafeProgress(now: number, ripple: Ripple) {
  if (!Number.isFinite(ripple.duration) || ripple.duration <= 0) return 1

  const progress = (now - ripple.start) / ripple.duration
  if (!Number.isFinite(progress)) return 1

  return clamp(progress, 0, 1)
}

function rotatePoint(x: number, y: number, angle: number) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  }
}

function drawOrganicRing(
  context: CanvasRenderingContext2D,
  ripple: Ripple,
  progress: number,
  index: number
) {
  const localProgress = clamp((progress - index * 0.14) / 0.86, 0, 1)
  if (localProgress <= 0 || localProgress >= 1) return

  const pulse = Math.sin(localProgress * Math.PI * 2.2 + ripple.seed) * 0.028
  const waveProgress = Math.max(0, easeOutSoft(localProgress) + pulse)
  const radius = 8 + Math.max(0, ripple.maxRadius) * waveProgress
  if (!Number.isFinite(radius) || radius <= 0) return

  const alpha = Math.pow(1 - localProgress, 1.68) * (0.15 - index * 0.028)
  if (!Number.isFinite(alpha) || alpha <= 0) return

  const segments = 14
  const centerX = ripple.x + ripple.driftX * easeInOutSine(localProgress)
  const centerY = ripple.y + ripple.driftY * easeInOutSine(localProgress)
  if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) return

  context.save()
  context.globalCompositeOperation = "source-over"
  context.shadowBlur = 14
  context.shadowColor = `rgba(216,183,111,${alpha * 0.32})`
  context.lineWidth = 0.72 + (1 - localProgress) * 0.72
  context.lineCap = "round"
  context.lineJoin = "round"

  for (let arc = 0; arc < 5; arc += 1) {
    const start =
      ripple.seed * 0.27 +
      index * 0.39 +
      arc * ((Math.PI * 2) / 5) +
      Math.sin(ripple.seed + arc * 1.7) * 0.38
    const arcLength = 0.28 + Math.sin(ripple.seed * 1.7 + arc * 1.9) * 0.09
    const bias = (Math.cos(start - ripple.biasAngle) + 1) / 2
    const earlyFade = arc % 2 === 0 ? 1 - localProgress * 0.48 : 1 - localProgress * 0.18
    const segmentAlpha = alpha * (0.3 + bias * 0.52) * Math.max(earlyFade, 0)
    if (!Number.isFinite(segmentAlpha) || segmentAlpha < 0.008) continue

    context.strokeStyle = `rgba(232,207,145,${segmentAlpha})`
    context.beginPath()

    for (let step = 0; step <= segments; step += 1) {
      const part = step / segments
      const angle = start + arcLength * part
      const breath =
        Math.sin(angle * 1.7 + ripple.seed + progress * 0.55) * (4 + localProgress * 8.5) +
        Math.sin(angle * 4.9 + ripple.seed * 1.7 + arc) * 2.8 +
        Math.sin(angle * 9.2 + index + localProgress * 1.4) * 1.7
      const wobble = 1 + Math.sin(angle * 3.1 + ripple.seed) * 0.032
      const rawX = Math.cos(angle) * (radius + breath) * ripple.ovalX * wobble
      const rawY = Math.sin(angle) * (radius + breath * ripple.ovalY) * ripple.ovalY
      const rotated = rotatePoint(rawX, rawY, ripple.tilt)
      const x = centerX + rotated.x
      const y = centerY + rotated.y

      if (step === 0) {
        context.moveTo(x, y)
      } else {
        context.lineTo(x, y)
      }
    }

    context.stroke()
  }

  context.restore()
}

export function WaterRippleField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ripplesRef = useRef<Ripple[]>([])
  const frameRef = useRef<number>(0)
  const sizeRef = useRef({ dpr: 1, height: 0, width: 0 })

  useEffect(() => {
    const canvasElement = canvasRef.current
    if (!canvasElement) return

    const drawingContext = canvasElement.getContext("2d", { alpha: true })
    if (!drawingContext) return

    const canvas = canvasElement
    const context = drawingContext
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = window.innerWidth
      const height = window.innerHeight

      sizeRef.current = { dpr, height, width }
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function animate(now: number) {
      const { dpr } = sizeRef.current
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)

      ripplesRef.current = ripplesRef.current.filter((ripple) => {
        const progress = getSafeProgress(now, ripple)
        if (progress >= 1) return false
        if (progress <= 0) return true

        drawOrganicRing(context, ripple, progress, 0)
        drawOrganicRing(context, ripple, progress, 1)
        drawOrganicRing(context, ripple, progress, 2)

        return true
      })

      if (ripplesRef.current.length > 0) {
        frameRef.current = window.requestAnimationFrame(animate)
      } else {
        frameRef.current = 0
      }
    }

    function startAnimation() {
      if (!frameRef.current) {
        frameRef.current = window.requestAnimationFrame(animate)
      }
    }

    function createRipple(event: PointerEvent) {
      if (reduceMotion.matches || (event.button && event.button !== 0)) return
      if (shouldIgnoreTarget(event.target)) return
      if (!isInsideActiveHero(event.target)) return

      const shortSide = Math.min(window.innerWidth, window.innerHeight)
      const radiusBase = shortSide < 720 ? 180 : 220
      const seed = Math.random() * Math.PI * 2
      const ripple: Ripple = {
        biasAngle: seed + Math.random() * Math.PI,
        duration: 2600,
        driftX: Math.cos(seed * 1.4) * (10 + Math.random() * 12),
        driftY: Math.sin(seed * 1.2) * (7 + Math.random() * 10),
        maxRadius: radiusBase + Math.random() * (shortSide < 720 ? 72 : 100),
        ovalX: 0.88 + Math.random() * 0.22,
        ovalY: 0.72 + Math.random() * 0.18,
        seed,
        start: performance.now(),
        tilt: Math.sin(seed) * 0.34,
        x: event.clientX,
        y: event.clientY,
      }

      ripplesRef.current = [...ripplesRef.current.slice(-(MAX_ACTIVE_RIPPLES - 1)), ripple]
      startAnimation()
    }

    resize()
    window.addEventListener("resize", resize, { passive: true })
    window.addEventListener("pointerdown", createRipple, { passive: true })

    return () => {
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointerdown", createRipple)
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
      ripplesRef.current = []
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[4]"
    />
  )
}
