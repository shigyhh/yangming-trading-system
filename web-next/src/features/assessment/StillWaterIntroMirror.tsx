"use client"

import { useEffect, useRef } from "react"

export function StillWaterIntroMirror({ phase }: { phase: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pulseRef = useRef<(() => void) | null>(null)
  const phaseRef = useRef(phase)
  const agitationRef = useRef(0)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d", { alpha: false })
    const shell = canvas?.parentElement
    if (!canvas || !context || !shell) return undefined

    let width = 0
    let height = 0
    let simWidth = 0
    let simHeight = 0
    let count = 0
    let baseR = new Float32Array(0)
    let baseG = new Float32Array(0)
    let baseB = new Float32Array(0)
    let h0 = new Float32Array(0)
    let h1 = new Float32Array(0)
    let imageData: ImageData | null = null
    let simCanvas = document.createElement("canvas")
    let simContext = simCanvas.getContext("2d")
    let frameId = 0
    let lastAutoDrop = 0
    let pointerIsDown = false
    let lastPointerDrop = 0
    let lastPointerPosition: { x: number; y: number } | null = null
    const scale = 3
    const damp = 0.986

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

    const getPool = () => {
      const radius = Math.min(width * 0.28, height * 0.28, 282)

      return {
        x: width * 0.5,
        y: height * 0.38,
        radius,
      }
    }

    const getTargetAgitation = () => {
      if (phaseRef.current === "openingJudge") return 0.014
      if (phaseRef.current === "openingSelf") return 0.036
      if (phaseRef.current === "question") return 0.13
      return 0.055
    }

    const rebuildBase = () => {
      count = simWidth * simHeight
      baseR = new Float32Array(count)
      baseG = new Float32Array(count)
      baseB = new Float32Array(count)
      h0 = new Float32Array(count)
      h1 = new Float32Array(count)
      imageData = simContext?.createImageData(simWidth, simHeight) ?? null

      const pool = {
        x: simWidth * 0.5,
        y: simHeight * 0.38,
        radius: Math.min(simWidth * 0.28, simHeight * 0.28, 282 / scale),
      }
      const moonX = simWidth * 0.5
      const moonY = simHeight * 0.2
      const moonRadius = Math.max(14, simWidth * 0.075)

      for (let y = 0; y < simHeight; y += 1) {
        for (let x = 0; x < simWidth; x += 1) {
          const index = y * simWidth + x
          const nx = (x - pool.x) / pool.radius
          const ny = (y - pool.y) / (pool.radius * 0.96)
          const distance = Math.sqrt(nx * nx + ny * ny)
          const water = clamp(1 - distance / 1.46, 0, 1) ** 1.9
          const depth = clamp(1 - distance / 0.92, 0, 1)
          const sky = y / simHeight

          let red = 2 + 8 * (1 - sky)
          let green = 6 + 18 * (1 - sky)
          let blue = 9 + 28 * (1 - sky)

          red += (5 + 18 * depth + 7 * (1 - sky) - red) * water
          green += (19 + 48 * depth + 14 * (1 - sky) - green) * water
          blue += (23 + 52 * depth + 18 * (1 - sky) - blue) * water

          const moonDistance = Math.hypot(x - moonX, y - moonY)
          const moon = Math.max(0, 1 - moonDistance / (moonRadius * 2.8)) ** 2.6

          const reflectionX = (x - pool.x) / (moonRadius * 1.55)
          const reflectionY = (y - (moonY - moonRadius * 0.9)) / (simHeight * 0.58)
          const reflectionStart = clamp((y - (moonY - moonRadius * 1.15)) / (moonRadius * 3.2), 0, 1)
          const reflection =
            Math.exp(-reflectionX * reflectionX * 1.65) *
            Math.max(0, 1 - reflectionY) ** 1.74 *
            reflectionStart *
            0.22 *
            water

          const light = moon * 0.34 + reflection
          baseR[index] = red + (214 - red) * light
          baseG[index] = green + (226 - green) * light
          baseB[index] = blue + (232 - blue) * light
        }
      }
    }

    const resize = () => {
      const rect = shell.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(320, Math.round(rect.width))
      height = Math.max(500, Math.round(rect.height))
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      simWidth = Math.max(120, Math.floor(width / scale))
      simHeight = Math.max(170, Math.floor(height / scale))
      simCanvas = document.createElement("canvas")
      simCanvas.width = simWidth
      simCanvas.height = simHeight
      simContext = simCanvas.getContext("2d")
      if (simContext) rebuildBase()
    }

    const drop = (clientX: number, clientY: number, power: number) => {
      const sx = Math.floor(clientX / scale)
      const sy = Math.floor(clientY / scale)

      for (let yy = -3; yy <= 3; yy += 1) {
        for (let xx = -3; xx <= 3; xx += 1) {
          const px = sx + xx
          const py = sy + yy
          if (px < 1 || py < 1 || px >= simWidth - 1 || py >= simHeight - 1) continue
          const distance = Math.sqrt(xx * xx + yy * yy)
          if (distance > 3.2) continue
          h0[py * simWidth + px] += power * (1 - distance / 3.4)
        }
      }
    }

    pulseRef.current = () => {
      const pool = getPool()
      agitationRef.current = Math.max(agitationRef.current, phaseRef.current === "question" ? 0.34 : 0.17)
      drop(pool.x, pool.y, phaseRef.current === "question" ? 220 : 150)
    }

    const pointerPosition = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: (event.clientX - rect.left) * (width / rect.width),
        y: (event.clientY - rect.top) * (height / rect.height),
      }
    }

    const getPointerPressure = (event: PointerEvent) => {
      if (typeof event.pressure === "number" && event.pressure > 0) return event.pressure
      if (event.pointerType === "mouse") return pointerIsDown || event.buttons ? 0.42 : 0.16
      return 0.48
    }

    const stirAtPointer = (event: PointerEvent, mode: "hover" | "press" | "enter") => {
      const position = pointerPosition(event)
      const now = performance.now()
      const minInterval = mode === "press" ? 22 : mode === "enter" ? 0 : 58
      const distance = lastPointerPosition
        ? Math.hypot(position.x - lastPointerPosition.x, position.y - lastPointerPosition.y)
        : 18

      if (mode !== "enter" && now - lastPointerDrop < minInterval && distance < 10) return

      const pressure = getPointerPressure(event)
      const distanceLift = clamp(distance / 58, 0.36, 1)
      const force =
        mode === "press"
          ? (142 + pressure * 230) * distanceLift
          : mode === "enter"
            ? 118
            : (38 + pressure * 78) * distanceLift

      agitationRef.current = Math.min(
        1,
        agitationRef.current +
          (mode === "press" ? 0.14 + pressure * 0.16 : mode === "enter" ? 0.09 : 0.026 + pressure * 0.035),
      )
      drop(position.x, position.y, force)
      lastPointerPosition = position
      lastPointerDrop = now
    }

    const handlePointerEnter = (event: PointerEvent) => {
      stirAtPointer(event, "enter")
    }

    const handlePointerDown = (event: PointerEvent) => {
      pointerIsDown = true
      canvas.setPointerCapture?.(event.pointerId)
      stirAtPointer(event, "press")
    }

    const handlePointerMove = (event: PointerEvent) => {
      stirAtPointer(event, pointerIsDown || event.buttons > 0 ? "press" : "hover")
    }

    const handlePointerUp = (event: PointerEvent) => {
      pointerIsDown = false
      lastPointerPosition = null
      if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    }

    const handlePointerLeave = () => {
      pointerIsDown = false
      lastPointerPosition = null
    }

    const drawLightField = (time: number, agitation: number) => {
      const pool = getPool()
      const pulse = 0.5 + Math.sin(time * 0.42) * 0.5

      context.save()

      const breath = context.createRadialGradient(pool.x, pool.y, pool.radius * 0.1, pool.x, pool.y, pool.radius * 1.65)
      breath.addColorStop(0, `rgba(192, 216, 222, ${0.08 + pulse * 0.032 + agitation * 0.025})`)
      breath.addColorStop(0.48, `rgba(55, 88, 96, ${0.04 + agitation * 0.018})`)
      breath.addColorStop(1, "rgba(5, 12, 16, 0)")
      context.fillStyle = breath
      context.fillRect(0, 0, width, height)

      for (let ring = 0; ring < 8; ring += 1) {
        const radius = pool.radius * (0.18 + ring * 0.125)
        context.beginPath()
        for (let point = 0; point <= 88; point += 1) {
          const progress = point / 88
          const angle = Math.PI * (0.18 + progress * 0.64)
          const wobble =
            1 +
            Math.sin(angle * 4 + time * 0.27 + ring) * (0.01 + agitation * 0.012) +
            Math.sin(angle * 9 - time * 0.19 + ring * 2) * (0.006 + agitation * 0.007)
          const x = pool.x + Math.cos(angle) * radius * 1.46 * wobble
          const y = pool.y + Math.sin(angle) * radius * 0.58 * wobble + ring * 0.8
          if (point === 0) context.moveTo(x, y)
          else context.lineTo(x, y)
        }
        context.strokeStyle = `rgba(190, 212, 220, ${0.022 + agitation * 0.012 - ring * 0.0017})`
        context.lineWidth = 0.7
        context.stroke()
      }
      context.restore()
    }

    const step = (now: number) => {
      if (!simContext || !imageData || !count) {
        frameId = window.requestAnimationFrame(step)
        return
      }

      const time = now / 1000
      const targetAgitation = getTargetAgitation()
      agitationRef.current += (targetAgitation - agitationRef.current) * 0.018
      const agitation = agitationRef.current

      for (let y = 1; y < simHeight - 1; y += 1) {
        const row = y * simWidth
        for (let x = 1; x < simWidth - 1; x += 1) {
          const index = row + x
          const value = ((h0[index - 1] + h0[index + 1] + h0[index - simWidth] + h0[index + simWidth]) * 0.5) - h1[index]
          h1[index] = value * damp
        }
      }

      const data = imageData.data
      for (let y = 0; y < simHeight; y += 1) {
        const row = y * simWidth
        for (let x = 0; x < simWidth; x += 1) {
          const index = row + x
          const gradientX = x > 0 && x < simWidth - 1 ? h1[index - 1] - h1[index + 1] : 0
          const gradientY = y > 0 && y < simHeight - 1 ? h1[index - simWidth] - h1[index + simWidth] : 0
          const livingOffsetX =
            (Math.sin(y * 0.045 + time * 0.55) + Math.sin((x + y) * 0.024 - time * 0.38) * 0.6) *
            (0.25 + agitation * 2.4)
          const livingOffsetY =
            (Math.cos(x * 0.038 - time * 0.48) + Math.sin((x - y) * 0.022 + time * 0.42) * 0.5) *
            (0.18 + agitation * 1.8)
          const sourceX = clamp((x + gradientX * (0.78 + agitation * 0.24) + livingOffsetX) | 0, 0, simWidth - 1)
          const sourceY = clamp((y + gradientY * (0.78 + agitation * 0.24) + livingOffsetY) | 0, 0, simHeight - 1)
          const sourceIndex = sourceY * simWidth + sourceX
          const specular = (gradientX + gradientY) * (5.5 + agitation * 2.8)
          const pixel = index * 4
          data[pixel] = clamp(baseR[sourceIndex] + specular, 0, 255)
          data[pixel + 1] = clamp(baseG[sourceIndex] + specular, 0, 255)
          data[pixel + 2] = clamp(baseB[sourceIndex] + specular, 0, 255)
          data[pixel + 3] = 255
        }
      }

      simContext.putImageData(imageData, 0, 0)
      context.drawImage(simCanvas, 0, 0, simWidth, simHeight, 0, 0, width, height)

      const pool = getPool()
      const outside = context.createRadialGradient(pool.x, pool.y, pool.radius * 0.54, pool.x, pool.y, pool.radius * 1.72)
      outside.addColorStop(0, "rgba(0, 0, 0, 0)")
      outside.addColorStop(0.72, "rgba(0, 0, 0, 0.22)")
      outside.addColorStop(1, "rgba(0, 2, 4, 0.58)")
      context.fillStyle = outside
      context.fillRect(0, 0, width, height)

      const dark = context.createRadialGradient(pool.x, pool.y, pool.radius * 0.1, pool.x, pool.y, pool.radius * 1.58)
      dark.addColorStop(0, "rgba(0, 0, 0, 0.03)")
      dark.addColorStop(0.72, "rgba(0, 0, 0, 0)")
      dark.addColorStop(1, "rgba(0, 0, 0, 0.5)")
      context.fillStyle = dark
      context.fillRect(0, 0, width, height)

      drawLightField(time, agitation)

      const autoInterval = 3450 - agitation * 1200
      if (now - lastAutoDrop > autoInterval) {
        drop(
          pool.x + Math.sin(time * 0.7) * pool.radius * 0.08,
          pool.y + Math.cos(time * 0.6) * pool.radius * 0.06,
          54 + agitation * 64,
        )
        lastAutoDrop = now
      }

      const swap = h0
      h0 = h1
      h1 = swap
      frameId = window.requestAnimationFrame(step)
    }

    resize()
    const pool = getPool()
    drop(pool.x, pool.y, 120)
    frameId = window.requestAnimationFrame(step)
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null
    resizeObserver?.observe(shell)
    canvas.addEventListener("pointerenter", handlePointerEnter)
    canvas.addEventListener("pointerdown", handlePointerDown)
    canvas.addEventListener("pointermove", handlePointerMove)
    canvas.addEventListener("pointerleave", handlePointerLeave)
    canvas.addEventListener("pointercancel", handlePointerLeave)
    window.addEventListener("pointerup", handlePointerUp)

    return () => {
      window.cancelAnimationFrame(frameId)
      pulseRef.current = null
      resizeObserver?.disconnect()
      canvas.removeEventListener("pointerenter", handlePointerEnter)
      canvas.removeEventListener("pointerdown", handlePointerDown)
      canvas.removeEventListener("pointermove", handlePointerMove)
      canvas.removeEventListener("pointerleave", handlePointerLeave)
      canvas.removeEventListener("pointercancel", handlePointerLeave)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [])

  useEffect(() => {
    pulseRef.current?.()
  }, [phase])

  return (
    <>
      <canvas
        ref={canvasRef}
        className="still-water-intro"
        aria-hidden="true"
        onContextMenu={(event) => event.preventDefault()}
      />

      <style jsx>{`
        .still-water-intro {
          position: absolute;
          inset: 0;
          z-index: 0;
          display: block;
          width: 100%;
          height: 100%;
          cursor: pointer;
          opacity: 0.98;
          filter: saturate(0.92) brightness(0.96);
          touch-action: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </>
  )
}
