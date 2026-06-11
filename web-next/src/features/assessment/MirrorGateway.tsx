"use client"

import type { FormEvent, PointerEvent as ReactPointerEvent } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import HeartLakeEngine, { type LakeMode } from "./HeartLakeEngine"
import OneThoughtRitualFlow from "./OneThoughtRitualFlow"
import { StillWaterIntroMirror } from "./StillWaterIntroMirror"

type MirrorGatewayProps = {
  onComplete: (mirrorId: string) => void
}

type GatewayPhase =
  | "waterStill"
  | "waterSeeing"
  | "thoughtRising"
  | "mirrorsResponding"
  | "mainMirrorAbsorbing"
  | "emotionalPayoff"
  | "thiefRevealed"
  | "heartSeal"
  | "conscienceReady"
  | "conscienceClearing"
  | "complete"

type MirrorId =
  | "chasing"
  | "holdingLoss"
  | "fantasy"
  | "gambling"
  | "following"
  | "hesitation"
  | "procrastination"
  | "anxiety"
  | "conscience"

type MirrorSpec = {
  id: MirrorId
  name: string
  angle: number
  radiusX: number
  radiusY: number
  size: number
  speed: number
  phase: number
  depth: number
  resonance: "primary" | "secondary" | "tertiary" | "quiet" | "conscience"
}

type Ripple = {
  x: number
  y: number
  r: number
  a: number
  speed: number
  seed: number
}

type CanvasGeometry = {
  width: number
  height: number
  cx: number
  moonX: number
  moonY: number
  moonR: number
  lakeY: number
  lakeRx: number
  lakeRy: number
}

type RitualCopy = {
  kicker: string
  main: string
  sub?: string
  seal?: string
}

type PreludeStep = "market" | "question" | "clear"

const MAIN_MIRROR_ID: MirrorId = "chasing"
const STILL_WATER_ENTRY_ANCHOR = "still-water-intro-mirror"
const QUESTION_REVEAL_DELAY_MS = 3400
const PRELUDE_SINK_DELAY_MS = 13200
const PRELUDE_ENTRY_DELAY_MS = 2300

const getNow = () => (typeof performance !== "undefined" ? performance.now() : Date.now())

const phaseOrder: GatewayPhase[] = [
  "waterStill",
  "waterSeeing",
  "thoughtRising",
  "mirrorsResponding",
  "mainMirrorAbsorbing",
  "emotionalPayoff",
  "thiefRevealed",
  "heartSeal",
  "conscienceReady",
  "conscienceClearing",
  "complete",
]

const phaseAutoDelay: Partial<Record<GatewayPhase, number>> = {
  waterStill: 1050,
  waterSeeing: 1180,
  thoughtRising: 2300,
  mainMirrorAbsorbing: 900,
  emotionalPayoff: 4200,
  thiefRevealed: 3100,
  heartSeal: 3000,
  conscienceClearing: 3500,
}

const mirrorSpecs: MirrorSpec[] = [
  {
    id: "chasing",
    name: "追涨之镜",
    angle: -0.18,
    radiusX: 0.46,
    radiusY: 0.15,
    size: 1.08,
    speed: 0.055,
    phase: 0.3,
    depth: 0.62,
    resonance: "primary",
  },
  {
    id: "holdingLoss",
    name: "扛单之镜",
    angle: Math.PI * 0.78,
    radiusX: 0.52,
    radiusY: 0.17,
    size: 0.86,
    speed: 0.018,
    phase: 1.8,
    depth: 0.12,
    resonance: "quiet",
  },
  {
    id: "fantasy",
    name: "幻想之镜",
    angle: Math.PI * 0.28,
    radiusX: 0.5,
    radiusY: 0.2,
    size: 0.72,
    speed: 0.026,
    phase: 2.7,
    depth: -0.22,
    resonance: "quiet",
  },
  {
    id: "gambling",
    name: "赌性之镜",
    angle: Math.PI * 1.18,
    radiusX: 0.55,
    radiusY: 0.18,
    size: 0.82,
    speed: 0.04,
    phase: 4.1,
    depth: 0.34,
    resonance: "secondary",
  },
  {
    id: "following",
    name: "从众之镜",
    angle: Math.PI * 1.66,
    radiusX: 0.54,
    radiusY: 0.16,
    size: 0.78,
    speed: 0.034,
    phase: 5.2,
    depth: 0.2,
    resonance: "tertiary",
  },
  {
    id: "hesitation",
    name: "犹疑之镜",
    angle: Math.PI * 0.54,
    radiusX: 0.48,
    radiusY: 0.2,
    size: 0.74,
    speed: 0.046,
    phase: 3.6,
    depth: -0.12,
    resonance: "quiet",
  },
  {
    id: "procrastination",
    name: "拖延之镜",
    angle: Math.PI * 1.46,
    radiusX: 0.44,
    radiusY: 0.19,
    size: 0.66,
    speed: 0.022,
    phase: 2.2,
    depth: -0.42,
    resonance: "quiet",
  },
  {
    id: "anxiety",
    name: "焦虑之镜",
    angle: Math.PI * 1.92,
    radiusX: 0.4,
    radiusY: 0.2,
    size: 0.7,
    speed: 0.058,
    phase: 0.9,
    depth: -0.36,
    resonance: "quiet",
  },
  {
    id: "conscience",
    name: "良知之镜",
    angle: Math.PI * 0.98,
    radiusX: 0.36,
    radiusY: 0.24,
    size: 0.68,
    speed: 0.018,
    phase: 2.9,
    depth: -0.52,
    resonance: "conscience",
  },
]

const thiefDetails = [
  { word: "贪", detail: "想抓住更多。" },
  { word: "急", detail: "怕慢一步就失去机会。" },
]

const ritualCopyByPhase: Record<GatewayPhase, RitualCopy> = {
  waterStill: {
    kicker: "水面入静",
    main: "先不判断行情。",
  },
  waterSeeing: {
    kicker: "水面入静",
    main: "先看见这一念。",
  },
  thoughtRising: {
    kicker: "触发场景：行情突然拉升",
    main: "「再不上车就来不及了。」",
    sub: "这一念，从水底浮上来。",
  },
  mirrorsResponding: {
    kicker: "九镜响应",
    main: "追涨之镜正在发亮。",
    sub: "赌性之镜、从众之镜随之微动；良知之镜仍在远处。",
  },
  mainMirrorAbsorbing: {
    kicker: "照见此念",
    main: "追涨之镜入湖。",
    sub: "先停一息，不急着定名。",
  },
  emotionalPayoff: {
    kicker: "照回情绪收益",
    main: "你怕的不是错过行情。\n你怕的是错过之后，\n那个“又慢了一步”的自己。",
    sub: "镜子只是照回来，不替你评判。",
  },
  thiefRevealed: {
    kicker: "心贼现形",
    main: "贪 · 急",
    sub: "贪：想抓住更多。\n急：怕慢一步就失去机会。",
  },
  heartSeal: {
    kicker: "今日心证",
    main: "心随涨动",
    sub: "一念怕错过，便已离规则。",
  },
  conscienceReady: {
    kicker: "良知收束",
    main: "按住水面 · 致良知",
    sub: "让浊气散开，让月影复圆。",
  },
  conscienceClearing: {
    kicker: "致良知",
    main: "知善知恶是良知\n为善去恶是格物",
    sub: "心湖复静，九镜归远。",
  },
  complete: {
    kicker: "今日已照见",
    main: "今日已照见",
    sub: "怕错过\n↓\n追涨\n↓\n被套\n↓\n不甘\n↓\n再次追涨",
    seal: "生成心镜报告",
  },
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

function easeInOut(value: number) {
  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function getPhaseIndex(phase: GatewayPhase) {
  return phaseOrder.indexOf(phase)
}

function isAtLeast(phase: GatewayPhase, target: GatewayPhase) {
  return getPhaseIndex(phase) >= getPhaseIndex(target)
}

function getGeometry(width: number, height: number): CanvasGeometry {
  const mobile = width < 640
  const lakeRx = Math.min(width * (mobile ? 0.72 : 0.54), mobile ? 460 : 880)
  const lakeRy = Math.min(height * (mobile ? 0.13 : 0.15), lakeRx * 0.34)

  return {
    width,
    height,
    cx: width * 0.5,
    moonX: width * 0.5,
    moonY: height * (mobile ? 0.16 : 0.13),
    moonR: Math.min(width * (mobile ? 0.075 : 0.052), 58),
    lakeY: height * (mobile ? 0.58 : 0.6),
    lakeRx,
    lakeRy,
  }
}

function drawOrganicEllipse(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  time: number,
  seed: number,
) {
  context.beginPath()
  for (let point = 0; point <= 128; point += 1) {
    const angle = (point / 128) * Math.PI * 2
    const wobble =
      1 +
      Math.sin(angle * 3 + time * 0.62 + seed) * 0.018 +
      Math.sin(angle * 7 - time * 0.38 + seed * 1.7) * 0.012
    const px = x + Math.cos(angle) * rx * wobble
    const py = y + Math.sin(angle) * ry * wobble
    if (point === 0) context.moveTo(px, py)
    else context.lineTo(px, py)
  }
}

function drawMoon(
  context: CanvasRenderingContext2D,
  geometry: CanvasGeometry,
  time: number,
  disturbance: number,
  clarity: number,
) {
  const { moonX, moonY, moonR } = geometry
  const glow = context.createRadialGradient(moonX, moonY, moonR * 0.3, moonX, moonY, moonR * 5)
  glow.addColorStop(0, `rgba(232, 236, 228, ${0.17 + clarity * 0.11})`)
  glow.addColorStop(0.28, `rgba(210, 224, 222, ${0.05 + clarity * 0.04})`)
  glow.addColorStop(1, "rgba(210, 224, 222, 0)")
  context.fillStyle = glow
  context.beginPath()
  context.arc(moonX, moonY, moonR * 5, 0, Math.PI * 2)
  context.fill()

  const segmentCount = disturbance > 0.18 ? 18 : 1
  const moonGradient = context.createRadialGradient(
    moonX - moonR * 0.28,
    moonY - moonR * 0.3,
    moonR * 0.12,
    moonX,
    moonY,
    moonR,
  )
  moonGradient.addColorStop(0, `rgba(245, 242, 226, ${0.88 + clarity * 0.1})`)
  moonGradient.addColorStop(0.62, `rgba(210, 218, 210, ${0.6 + clarity * 0.18})`)
  moonGradient.addColorStop(1, `rgba(142, 154, 154, ${0.32 + clarity * 0.16})`)

  if (segmentCount === 1) {
    context.fillStyle = moonGradient
    context.beginPath()
    context.arc(moonX, moonY, moonR, 0, Math.PI * 2)
    context.fill()
  } else {
    context.save()
    context.fillStyle = moonGradient
    for (let index = 0; index < segmentCount; index += 1) {
      const start = (index / segmentCount) * Math.PI * 2
      const end = ((index + 0.72) / segmentCount) * Math.PI * 2
      const shift = Math.sin(time * 1.8 + index * 1.7) * moonR * 0.09 * disturbance
      context.beginPath()
      context.moveTo(moonX + shift, moonY)
      context.arc(moonX + shift, moonY, moonR, start, end)
      context.closePath()
      context.globalAlpha = 0.72 + clarity * 0.16
      context.fill()
    }
    context.restore()
  }

  context.beginPath()
  context.arc(moonX, moonY, moonR * 1.16, 0, Math.PI * 2)
  context.strokeStyle = `rgba(216, 224, 210, ${0.12 + clarity * 0.08})`
  context.lineWidth = 0.8
  context.stroke()
}

function drawBackground(context: CanvasRenderingContext2D, geometry: CanvasGeometry, time: number) {
  const { width, height, cx, lakeY, lakeRx, lakeRy, moonX, moonY, moonR } = geometry

  const sky = context.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, "#020607")
  sky.addColorStop(0.36, "#050b0c")
  sky.addColorStop(0.68, "#060806")
  sky.addColorStop(1, "#000101")
  context.fillStyle = sky
  context.fillRect(0, 0, width, height)

  const upperMist = context.createRadialGradient(cx, height * 0.3, 0, cx, height * 0.3, width * 0.55)
  upperMist.addColorStop(0, "rgba(95, 132, 117, 0.075)")
  upperMist.addColorStop(0.42, "rgba(17, 28, 28, 0.12)")
  upperMist.addColorStop(1, "rgba(0, 0, 0, 0)")
  context.fillStyle = upperMist
  context.fillRect(0, 0, width, height)

  const mountainY = lakeY - lakeRy * 1.05
  context.fillStyle = "rgba(8, 12, 12, 0.58)"
  context.beginPath()
  context.moveTo(0, mountainY + lakeRy * 0.4)
  context.lineTo(0, mountainY + lakeRy * 0.05)
  context.quadraticCurveTo(width * 0.18, mountainY - lakeRy * 0.38, width * 0.36, mountainY - lakeRy * 0.1)
  context.quadraticCurveTo(width * 0.55, mountainY + lakeRy * 0.16, width * 0.72, mountainY - lakeRy * 0.28)
  context.quadraticCurveTo(width * 0.87, mountainY - lakeRy * 0.5, width, mountainY - lakeRy * 0.08)
  context.lineTo(width, mountainY + lakeRy * 0.56)
  context.closePath()
  context.fill()

  const moonPath = context.createLinearGradient(0, moonY + moonR * 1.5, 0, lakeY - lakeRy * 0.8)
  moonPath.addColorStop(0, "rgba(218, 226, 220, 0.05)")
  moonPath.addColorStop(0.74, "rgba(218, 226, 220, 0.012)")
  moonPath.addColorStop(1, "rgba(218, 226, 220, 0)")
  context.fillStyle = moonPath
  context.beginPath()
  context.moveTo(moonX - moonR * 0.3, moonY + moonR * 1.1)
  context.bezierCurveTo(moonX - lakeRx * 0.1, lakeY - lakeRy * 2.5, cx - lakeRx * 0.16, lakeY - lakeRy, cx - lakeRx * 0.18, lakeY)
  context.lineTo(cx + lakeRx * 0.18, lakeY)
  context.bezierCurveTo(cx + lakeRx * 0.16, lakeY - lakeRy, moonX + lakeRx * 0.1, lakeY - lakeRy * 2.5, moonX + moonR * 0.3, moonY + moonR * 1.1)
  context.closePath()
  context.fill()

  for (let star = 0; star < 56; star += 1) {
    const x = ((Math.sin(star * 93.41) + 1) * 0.5) * width
    const y = ((Math.cos(star * 41.17) + 1) * 0.5) * height * 0.62
    const alpha = 0.04 + ((Math.sin(time * 0.5 + star) + 1) * 0.5) * 0.11
    context.fillStyle = `rgba(216, 224, 218, ${alpha})`
    context.beginPath()
    context.arc(x, y, star % 4 === 0 ? 1.1 : 0.65, 0, Math.PI * 2)
    context.fill()
  }
}

function drawLake(
  context: CanvasRenderingContext2D,
  geometry: CanvasGeometry,
  time: number,
  ripples: Ripple[],
  disturbance: number,
  clarity: number,
  holdProgress: number,
) {
  const { cx, lakeY, lakeRx, lakeRy, moonR } = geometry
  const gsq = lakeRy / lakeRx

  context.save()
  context.beginPath()
  context.ellipse(cx, lakeY, lakeRx, lakeRy, 0, 0, Math.PI * 2)
  context.clip()

  const lake = context.createRadialGradient(cx, lakeY - lakeRy * 0.12, lakeRx * 0.02, cx, lakeY, lakeRx)
  lake.addColorStop(0, `rgba(2, 8, 12, ${0.92 - clarity * 0.08})`)
  lake.addColorStop(0.44, "rgba(4, 20, 28, 0.78)")
  lake.addColorStop(0.78, "rgba(6, 42, 52, 0.48)")
  lake.addColorStop(1, "rgba(10, 48, 58, 0.16)")
  context.fillStyle = lake
  context.beginPath()
  context.ellipse(cx, lakeY, lakeRx, lakeRy, 0, 0, Math.PI * 2)
  context.fill()

  const moonGlow = context.createRadialGradient(cx, lakeY - lakeRy * 0.12, 0, cx, lakeY - lakeRy * 0.08, lakeRx * 0.42)
  moonGlow.addColorStop(0, `rgba(245, 232, 190, ${0.12 + clarity * 0.26 - disturbance * 0.08})`)
  moonGlow.addColorStop(0.42, `rgba(216, 183, 111, ${0.06 + clarity * 0.12})`)
  moonGlow.addColorStop(1, "rgba(216, 183, 111, 0)")
  context.fillStyle = moonGlow
  context.beginPath()
  context.ellipse(cx, lakeY - lakeRy * 0.08, lakeRx * 0.42, lakeRy * 0.72, 0, 0, Math.PI * 2)
  context.fill()

  const wobble = 1.8 + disturbance * 24 + holdProgress * 3
  const fragments = disturbance > 0.4 ? 4 : disturbance > 0.18 ? 2 : 1
  for (let line = 0; line < 30; line += 1) {
    const y = lakeY - lakeRy * 0.82 + line * ((lakeRy * 1.64) / 30)
    const distance = Math.abs(y - lakeY) / (lakeRy * 1.02)
    const baseAlpha = Math.max(0, (0.1 + clarity * 0.12) * (1 - distance))
    const offset =
      Math.sin(y * 0.07 + time * 1.3) * wobble * 0.5 +
      Math.sin(y * 0.15 - time * 0.9) * wobble * 0.3
    const lineWidth = moonR * (0.68 + (1 - distance) * 1.2)

    for (let fragment = 0; fragment < fragments; fragment += 1) {
      const split = fragments === 1 ? 0 : (fragment - (fragments - 1) / 2) * lineWidth * 1.4
      const fragmentWidth = fragments === 1 ? lineWidth * 2.2 : lineWidth * 0.58
      const x = cx + offset + split + Math.sin(time * 3 + fragment + line) * disturbance * 10
      const gradient = context.createLinearGradient(x - fragmentWidth, 0, x + fragmentWidth, 0)
      gradient.addColorStop(0, "rgba(232, 228, 210, 0)")
      gradient.addColorStop(0.5, `rgba(232, 228, 210, ${baseAlpha * (1 - disturbance * 0.24)})`)
      gradient.addColorStop(1, "rgba(232, 228, 210, 0)")
      context.fillStyle = gradient
      context.fillRect(x - fragmentWidth, y - 2.5, fragmentWidth * 2, 5)
    }
  }

  if (disturbance > 0.32) {
    const mud = context.createRadialGradient(cx, lakeY, lakeRx * 0.12, cx, lakeY, lakeRx * 0.75)
    mud.addColorStop(0, `rgba(50, 34, 24, ${0.08 * disturbance})`)
    mud.addColorStop(0.5, `rgba(28, 18, 14, ${0.1 * disturbance})`)
    mud.addColorStop(1, "rgba(28, 18, 14, 0)")
    context.fillStyle = mud
    context.beginPath()
    context.ellipse(cx, lakeY, lakeRx * 0.82, lakeRy * 0.86, 0, 0, Math.PI * 2)
    context.fill()
  }

  if (holdProgress > 0.02) {
    context.beginPath()
    context.ellipse(cx, lakeY, lakeRx * holdProgress, lakeRy * holdProgress, 0, 0, Math.PI * 2)
    context.strokeStyle = `rgba(245, 232, 190, ${0.32 * (1 - holdProgress)})`
    context.lineWidth = 1.2
    context.stroke()
  }

  ripples.forEach((ripple) => {
    drawOrganicEllipse(context, ripple.x, ripple.y, ripple.r, ripple.r * gsq, time, ripple.seed)
    context.strokeStyle = `rgba(206, 224, 230, ${ripple.a})`
    context.lineWidth = 0.8
    context.stroke()
  })

  context.restore()

  context.beginPath()
  context.ellipse(cx, lakeY, lakeRx, lakeRy, 0, 0, Math.PI * 2)
  context.strokeStyle = `rgba(216, 183, 111, ${0.1 + clarity * 0.09})`
  context.lineWidth = 1
  context.stroke()
}

function drawMirror(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number,
  resonance: MirrorSpec["resonance"],
  name: string,
  time: number,
) {
  const isGood = resonance === "conscience"
  const isPrimary = resonance === "primary"
  const isSecondary = resonance === "secondary" || resonance === "tertiary"
  const glowColor = isGood ? "210, 214, 178" : isPrimary ? "216, 183, 111" : isSecondary ? "188, 148, 80" : "160, 190, 194"
  const surface = context.createRadialGradient(x - size * 0.28, y - size * 0.32, size * 0.08, x, y, size)
  surface.addColorStop(0, `rgba(242, 235, 220, ${0.06 + alpha * 0.14})`)
  surface.addColorStop(0.46, `rgba(8, 34, 36, ${0.6 + alpha * 0.16})`)
  surface.addColorStop(1, `rgba(4, 8, 8, ${0.78 + alpha * 0.12})`)
  context.fillStyle = surface
  context.beginPath()
  context.ellipse(x, y, size * 0.82, size, 0, 0, Math.PI * 2)
  context.fill()

  context.beginPath()
  context.ellipse(x, y, size * 0.82, size, 0, 0, Math.PI * 2)
  context.strokeStyle = `rgba(${glowColor}, ${0.12 + alpha * 0.42})`
  context.lineWidth = isPrimary ? 1.25 : 0.75
  context.stroke()

  context.beginPath()
  context.arc(x - size * 0.2, y - size * 0.24, size * 0.44, Math.PI * 1.1, Math.PI * 1.75)
  context.strokeStyle = `rgba(242, 235, 220, ${0.04 + alpha * 0.12})`
  context.lineWidth = 0.7
  context.stroke()

  if (alpha > 0.2) {
    context.beginPath()
    context.ellipse(x, y, size * (0.94 + Math.sin(time * 1.4) * 0.01), size * 1.14, 0, 0, Math.PI * 2)
    context.strokeStyle = `rgba(${glowColor}, ${alpha * (isPrimary ? 0.28 : 0.12)})`
    context.lineWidth = 0.7
    context.stroke()
  }

  if (alpha > 0.18) {
    context.font = `${clamp(size * 0.26, 10, 14)}px "Songti SC", "Noto Serif SC", serif`
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.fillStyle = `rgba(242, 220, 168, ${isPrimary ? alpha * 0.78 : alpha * 0.38})`
    context.fillText(name, x, y + size * 1.42)
  }
}

function drawNineMirrors(
  context: CanvasRenderingContext2D,
  geometry: CanvasGeometry,
  phase: GatewayPhase,
  time: number,
  phaseProgress: number,
) {
  if (!isAtLeast(phase, "mirrorsResponding") || phase === "complete") return

  const { cx, lakeY, lakeRx, lakeRy } = geometry
  const show = phase === "mirrorsResponding" ? easeOutCubic(phaseProgress) : 1
  const absorbing = phase === "mainMirrorAbsorbing" ? easeInOut(phaseProgress) : phase === "emotionalPayoff" || phase === "thiefRevealed" || phase === "heartSeal" || phase === "conscienceReady" || phase === "conscienceClearing" ? 1 : 0
  const retreat = phase === "conscienceClearing" ? easeOutCubic(phaseProgress) : 0

  const sorted = [...mirrorSpecs].sort((a, b) => a.depth - b.depth)
  sorted.forEach((mirror) => {
    const theta = mirror.angle + time * mirror.speed
    const driftX = Math.cos(theta) * lakeRx * mirror.radiusX
    const driftY = Math.sin(theta) * lakeRy * mirror.radiusY
    const bob = Math.sin(time * 0.8 + mirror.phase) * lakeRy * 0.06
    const baseX = cx + driftX
    const baseY = lakeY + driftY - lakeRy * 0.98 + bob
    const centerX = cx
    const centerY = lakeY - lakeRy * 0.08
    const isMain = mirror.id === MAIN_MIRROR_ID
    const x = isMain ? baseX + (centerX - baseX) * absorbing : baseX
    const y = isMain ? baseY + (centerY - baseY) * absorbing : baseY
    const depthAlpha = mirror.depth > 0 ? 1 : 0.72
    const resonanceAlpha =
      mirror.resonance === "primary"
        ? 0.95
        : mirror.resonance === "secondary"
          ? 0.44
          : mirror.resonance === "tertiary"
            ? 0.34
            : mirror.resonance === "conscience"
              ? 0.26
              : 0.16
    const fadeOut = isMain ? 1 - absorbing * 0.78 : 1 - absorbing * 0.78
    const alpha = clamp(show * resonanceAlpha * depthAlpha * fadeOut * (1 - retreat * 0.8), 0, 1)
    const size = lakeRx * 0.055 * mirror.size * (isMain ? 1 + show * 0.28 - absorbing * 0.2 : 1)

    if (alpha <= 0.015) return
    drawMirror(context, x, y, size, alpha, mirror.resonance, mirror.name, time)
  })
}

function drawThiefSeal(
  context: CanvasRenderingContext2D,
  geometry: CanvasGeometry,
  phase: GatewayPhase,
  time: number,
  phaseProgress: number,
) {
  if (!isAtLeast(phase, "thiefRevealed")) return

  const { cx, lakeY, lakeRx, lakeRy } = geometry
  const alpha =
    phase === "thiefRevealed"
      ? easeOutCubic(phaseProgress)
      : phase === "heartSeal"
        ? 1
        : phase === "conscienceReady"
          ? 0.68
          : phase === "conscienceClearing"
            ? 1 - easeOutCubic(phaseProgress) * 0.82
            : 0
  if (alpha <= 0.01) return

  const sealSize = Math.min(lakeRx * 0.13, 94)
  const x = cx
  const y = lakeY - lakeRy * 0.12
  const seal = context.createRadialGradient(x, y, 0, x, y, sealSize)
  seal.addColorStop(0, `rgba(127, 37, 25, ${0.22 * alpha})`)
  seal.addColorStop(0.56, `rgba(80, 20, 14, ${0.1 * alpha})`)
  seal.addColorStop(1, "rgba(127, 37, 25, 0)")
  context.fillStyle = seal
  context.beginPath()
  context.ellipse(x, y, sealSize, sealSize * 0.62, -0.08, 0, Math.PI * 2)
  context.fill()

  thiefDetails.forEach((item, index) => {
    const tx = x + (index === 0 ? -sealSize * 0.42 : sealSize * 0.42)
    const ty = y + Math.sin(time * 1.1 + index) * 2
    context.font = `${Math.min(sealSize * 0.38, 30)}px "Songti SC", "Noto Serif SC", serif`
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.fillStyle = `rgba(196, 91, 62, ${0.74 * alpha})`
    context.fillText(item.word, tx, ty)
  })

  context.beginPath()
  context.ellipse(x, y, sealSize * 1.18, sealSize * 0.72, 0, 0, Math.PI * 2)
  context.strokeStyle = `rgba(196, 91, 62, ${0.2 * alpha})`
  context.lineWidth = 0.8
  context.stroke()
}

function RitualCanvas({
  phase,
  phaseStartedAt,
  holdProgress,
  pulse,
  onWaterPointerDown,
  onWaterPointerUp,
}: {
  phase: GatewayPhase
  phaseStartedAt: number
  holdProgress: number
  pulse: number
  onWaterPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => void
  onWaterPointerUp: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const phaseRef = useRef(phase)
  const phaseStartedAtRef = useRef(phaseStartedAt)
  const holdProgressRef = useRef(holdProgress)
  const pulseRef = useRef(pulse)
  const ripplesRef = useRef<Ripple[]>([])
  const lastRippleAtRef = useRef(0)

  useEffect(() => {
    phaseRef.current = phase
    phaseStartedAtRef.current = phaseStartedAt
  }, [phase, phaseStartedAt])

  useEffect(() => {
    holdProgressRef.current = holdProgress
  }, [holdProgress])

  useEffect(() => {
    pulseRef.current = pulse
  }, [pulse])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return undefined

    let width = 0
    let height = 0
    let frameId = 0
    let lastPulse = pulseRef.current

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(320, Math.round(rect.width))
      height = Math.max(520, Math.round(rect.height))
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const addCenterRipple = (alpha = 0.24, speed = 1.26) => {
      const geometry = getGeometry(width, height)
      ripplesRef.current.push({
        x: geometry.cx,
        y: geometry.lakeY,
        r: 2,
        a: alpha,
        speed,
        seed: Math.random() * 12,
      })
    }

    const frame = (now: number) => {
      const time = now / 1000
      const geometry = getGeometry(width, height)
      const phaseValue = phaseRef.current
      const elapsed = now - phaseStartedAtRef.current
      const phaseProgress = clamp(elapsed / (phaseAutoDelay[phaseValue] ?? 2400), 0, 1)
      const hold = holdProgressRef.current

      if (pulseRef.current !== lastPulse) {
        addCenterRipple(phaseValue === "mainMirrorAbsorbing" ? 0.44 : 0.32, phaseValue === "mainMirrorAbsorbing" ? 1.9 : 1.42)
        lastPulse = pulseRef.current
      }

      const disturbedByPhase =
        phaseValue === "thoughtRising"
          ? 0.42 * easeOutCubic(phaseProgress)
          : phaseValue === "mirrorsResponding"
            ? 0.32
            : phaseValue === "mainMirrorAbsorbing"
              ? 0.72 * Math.sin(phaseProgress * Math.PI)
              : phaseValue === "emotionalPayoff"
                ? 0.42
                : phaseValue === "thiefRevealed"
                  ? 0.58
                  : phaseValue === "heartSeal"
                    ? 0.28 * (1 - phaseProgress * 0.4)
                    : phaseValue === "conscienceReady"
                      ? 0.22
                      : phaseValue === "conscienceClearing"
                        ? 0.18 * (1 - easeOutCubic(phaseProgress)) * (1 - hold * 0.6)
                        : 0.06
      const clarity =
        phaseValue === "conscienceClearing"
          ? 0.48 + easeOutCubic(phaseProgress) * 0.52
          : phaseValue === "complete"
            ? 1
            : phaseValue === "heartSeal"
              ? 0.58 + phaseProgress * 0.28
              : phaseValue === "waterStill" || phaseValue === "waterSeeing"
                ? 0.86
                : 0.55

      context.clearRect(0, 0, width, height)
      drawBackground(context, geometry, time)
      drawMoon(context, geometry, time, disturbedByPhase, clarity)
      drawLake(context, geometry, time, ripplesRef.current, disturbedByPhase, clarity, hold)

      if (phaseValue === "thoughtRising") {
        const rise = easeOutCubic(phaseProgress)
        const glow = context.createRadialGradient(geometry.cx, geometry.lakeY - geometry.lakeRy * (0.12 + rise * 1.2), 0, geometry.cx, geometry.lakeY - geometry.lakeRy * (0.12 + rise * 1.2), geometry.lakeRx * 0.22)
        glow.addColorStop(0, `rgba(216, 183, 111, ${0.14 * (1 - rise * 0.2)})`)
        glow.addColorStop(1, "rgba(216, 183, 111, 0)")
        context.fillStyle = glow
        context.beginPath()
        context.ellipse(geometry.cx, geometry.lakeY - geometry.lakeRy * (0.12 + rise * 1.2), geometry.lakeRx * 0.22, geometry.lakeRy * 0.58, 0, 0, Math.PI * 2)
        context.fill()
      }

      drawNineMirrors(context, geometry, phaseValue, time, phaseProgress)
      drawThiefSeal(context, geometry, phaseValue, time, phaseProgress)

      const naturalInterval = phaseValue === "thoughtRising" ? 1400 : phaseValue === "mainMirrorAbsorbing" ? 360 : 2700
      if (now - lastRippleAtRef.current > naturalInterval) {
        addCenterRipple(phaseValue === "mainMirrorAbsorbing" ? 0.36 : 0.12, phaseValue === "mainMirrorAbsorbing" ? 1.8 : 1.12)
        lastRippleAtRef.current = now
      }

      ripplesRef.current = ripplesRef.current
        .map((ripple) => ({
          ...ripple,
          r: ripple.r + ripple.speed + disturbedByPhase * 1.1,
          a: ripple.a * (phaseValue === "conscienceClearing" ? 0.968 : 0.976),
        }))
        .filter((ripple) => ripple.a > 0.008 && ripple.r < geometry.lakeRx * 1.18)

      frameId = window.requestAnimationFrame(frame)
    }

    resize()
    frameId = window.requestAnimationFrame(frame)
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null
    resizeObserver?.observe(canvas)

    return () => {
      window.cancelAnimationFrame(frameId)
      resizeObserver?.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="nine-mirror-canvas"
      aria-hidden="true"
      onPointerDown={onWaterPointerDown}
      onPointerUp={onWaterPointerUp}
      onPointerCancel={onWaterPointerUp}
      onPointerLeave={onWaterPointerUp}
      onContextMenu={(event) => event.preventDefault()}
    />
  )
}

export function MirrorGateway({ onComplete }: MirrorGatewayProps) {
  const [phase, setPhase] = useState<GatewayPhase>("waterStill")
  const [phaseStartedAt, setPhaseStartedAt] = useState(getNow)
  const [holdProgress, setHoldProgress] = useState(0)
  const [isHoldingWater, setIsHoldingWater] = useState(false)
  const [pulse, setPulse] = useState(0)
  const [showZhaoxinFlow, setShowZhaoxinFlow] = useState(false)
  const [isLakeSettled, setIsLakeSettled] = useState(false)
  const [lakeMode, setLakeMode] = useState<LakeMode>("still")
  const [rippleKey, setRippleKey] = useState(0)
  const [preludeStep, setPreludeStep] = useState<PreludeStep>("market")
  const [preludeThoughtInput, setPreludeThoughtInput] = useState("")
  const [sinkingThoughtText, setSinkingThoughtText] = useState("")
  const [isPreludeHovering, setIsPreludeHovering] = useState(false)
  const [isPreludeFocused, setIsPreludeFocused] = useState(false)
  const holdFrameRef = useRef<number | null>(null)
  const preludeThoughtInputRef = useRef("")
  const preludeSinkStartedRef = useRef(false)
  const preludeEnterTimerRef = useRef<number | null>(null)
  const currentCopy = ritualCopyByPhase[phase]
  const canHoldWater = false
  const canEnterCycle = false
  const hasPreludeThought = preludeThoughtInput.trim().length > 0
  const isPreludePaused = preludeStep === "question" && (isPreludeHovering || isPreludeFocused)
  const stillWaterPhase = preludeStep === "market" ? "openingSelf" : preludeStep === "clear" ? "firstRipple" : "question"

  const copyClassName = useMemo(
    () =>
      cn(
        "ritual-copy",
        phase === "thoughtRising" && "is-thought",
        phase === "emotionalPayoff" && "is-payoff",
        phase === "thiefRevealed" && "is-thief",
        phase === "heartSeal" && "is-heart-seal",
        phase === "conscienceClearing" && "is-conscience",
        phase === "complete" && "is-complete",
      ),
    [phase],
  )

  const goToPhase = useCallback((nextPhase: GatewayPhase) => {
    setPhase(nextPhase)
    setPhaseStartedAt(getNow())
    if (nextPhase !== "conscienceReady") {
      setIsHoldingWater(false)
      setHoldProgress(0)
    }
  }, [])

  const enterThoughtLake = useCallback(() => {
    setPulse((current) => current + 1)
    setLakeMode("thought")
    setRippleKey((current) => current + 1)
    setIsLakeSettled(false)
    setShowZhaoxinFlow(true)
  }, [])

  const beginPreludeThoughtSink = useCallback(() => {
    if (showZhaoxinFlow || preludeSinkStartedRef.current) return

    preludeSinkStartedRef.current = true
    setSinkingThoughtText(preludeThoughtInputRef.current.trim())
    setPreludeStep("clear")
    setPulse((current) => current + 1)
    setRippleKey((current) => current + 1)

    if (preludeEnterTimerRef.current !== null) {
      window.clearTimeout(preludeEnterTimerRef.current)
    }

    preludeEnterTimerRef.current = window.setTimeout(() => {
      enterThoughtLake()
      preludeEnterTimerRef.current = null
    }, PRELUDE_ENTRY_DELAY_MS)
  }, [enterThoughtLake, showZhaoxinFlow])

  const handlePreludeThoughtChange = (value: string) => {
    setPreludeThoughtInput(value)
    preludeThoughtInputRef.current = value
  }

  const handlePreludeThoughtSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    beginPreludeThoughtSink()
  }

  useEffect(() => {
    if (!showZhaoxinFlow) return undefined

    const timer = window.setTimeout(() => setIsLakeSettled(true), 3600)

    return () => window.clearTimeout(timer)
  }, [showZhaoxinFlow])

  useEffect(() => {
    if (showZhaoxinFlow) return undefined

    if (preludeStep === "market") {
      const timer = window.setTimeout(() => setPreludeStep("question"), QUESTION_REVEAL_DELAY_MS)

      return () => window.clearTimeout(timer)
    }

    if (preludeStep === "question" && !isPreludePaused) {
      const timer = window.setTimeout(() => beginPreludeThoughtSink(), PRELUDE_SINK_DELAY_MS)

      return () => window.clearTimeout(timer)
    }

    return undefined
  }, [beginPreludeThoughtSink, isPreludePaused, preludeStep, showZhaoxinFlow])

  useEffect(() => {
    return () => {
      if (preludeEnterTimerRef.current !== null) {
        window.clearTimeout(preludeEnterTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!canHoldWater || !isHoldingWater) return undefined

    let last = getNow()
    const tick = (now: number) => {
      const delta = now - last
      last = now
      setHoldProgress((current) => {
        const next = clamp(current + delta / 1650, 0, 1)
        if (next >= 1) {
          setIsHoldingWater(false)
          window.setTimeout(() => goToPhase("conscienceClearing"), 60)
        }
        return next
      })
      holdFrameRef.current = window.requestAnimationFrame(tick)
    }

    holdFrameRef.current = window.requestAnimationFrame(tick)
    return () => {
      if (holdFrameRef.current) window.cancelAnimationFrame(holdFrameRef.current)
    }
  }, [canHoldWater, goToPhase, isHoldingWater])

  const updateLakeMode = useCallback((mode: LakeMode) => {
    setLakeMode(mode)
  }, [])

  const triggerZhaoxinRipple = useCallback(() => {
    setRippleKey((current) => current + 1)
  }, [])

  const startHolding = () => {
    if (!canHoldWater) return
    setIsHoldingWater(true)
    setPulse((current) => current + 1)
  }

  const stopHolding = () => {
    setIsHoldingWater(false)
    if (canHoldWater) {
      setHoldProgress((current) => current * 0.78)
    }
  }

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (canHoldWater) {
      event.currentTarget.setPointerCapture?.(event.pointerId)
      startHolding()
    }
  }

  const handleCanvasPointerUp = () => {
    stopHolding()
  }

  return (
    <section
      className={cn("moon-heart-gateway", `is-${phase}`, showZhaoxinFlow && "is-zhaoxin-flow")}
      data-lake-state={showZhaoxinFlow ? (isLakeSettled ? "settled" : "arriving") : "prelude"}
      data-lake-mode={lakeMode}
      aria-label="照入此心"
      data-flow-anchor={STILL_WATER_ENTRY_ANCHOR}
    >
      <StillWaterIntroMirror phase={stillWaterPhase} />

      {showZhaoxinFlow ? (
        <>
          <HeartLakeEngine
            lakeMode={lakeMode}
            triggerRippleKey={rippleKey}
            opacity={lakeMode === "liangzhi" ? 0.64 : lakeMode === "still" ? 0.72 : isLakeSettled ? 0.82 : 0.7}
            moonPathIntensity={lakeMode === "liangzhi" ? 0.34 : lakeMode === "still" ? 0.58 : isLakeSettled ? 0.7 : 0.48}
            bloomScale={lakeMode === "liangzhi" ? 0.42 : isLakeSettled ? 0.72 : 0.48}
            className="mirror-gateway-heart-lake"
          />
          <OneThoughtRitualFlow
            initialScene="surge"
            initialIntensity={3}
            onLakeModeChange={updateLakeMode}
            onRipple={triggerZhaoxinRipple}
          />
        </>
      ) : null}

      {!showZhaoxinFlow ? (
        <div key={preludeStep} className={`still-water-gateway-copy is-${preludeStep}`} aria-live="polite">
          {preludeStep === "market" ? (
            <h1>
              行情留在屏幕。
              <br />
              <br />
              这一刻，
              <br />
              <br />
              往心里走一步。
            </h1>
          ) : null}
          {preludeStep === "question" ? (
            <div className="thought-sink-panel">
              <h1>此刻,你心里最先冒出来的,是什么念头?</h1>
              <form
                className="thought-sink-form"
                data-has-value={hasPreludeThought ? "true" : "false"}
                data-paused={isPreludePaused ? "true" : "false"}
                onSubmit={handlePreludeThoughtSubmit}
                onMouseEnter={() => setIsPreludeHovering(true)}
                onMouseLeave={() => setIsPreludeHovering(false)}
                onFocusCapture={() => setIsPreludeFocused(true)}
                onBlurCapture={(event) => {
                  const nextTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null
                  if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
                    setIsPreludeFocused(false)
                  }
                }}
              >
                <label className="thought-sink-label" htmlFor="prelude-thought-input">
                  写下此刻的一念……
                </label>
                <div className="thought-sink-input-shell">
                  <input
                    id="prelude-thought-input"
                    className="thought-sink-input"
                    value={preludeThoughtInput}
                    onChange={(event) => handlePreludeThoughtChange(event.target.value)}
                    placeholder="写下此刻的一念……"
                    autoComplete="off"
                    maxLength={36}
                  />
                  <div className="thought-shadow-stack" aria-hidden="true">
                    <span className="thought-shadow-option">比如：我次奥，又被套了</span>
                    <span className="thought-shadow-option">比如：怎么又卖飞了</span>
                    <span className="thought-shadow-option">比如：再割，大腿都没了</span>
                    <span className="thought-shadow-option">比如：回本我就走</span>
                    <span className="thought-shadow-option">比如：又赚了，快翻倍了</span>
                    <span className="thought-shadow-option">比如：亏太多了，继续拿着吧</span>
                    <span className="thought-shadow-option">比如：什么时候才能回本啊</span>
                  </div>
                </div>
              </form>
            </div>
          ) : null}
          {preludeStep === "clear" ? (
            <div
              className={cn("thought-sink-release", sinkingThoughtText ? "has-thought" : "is-empty")}
              aria-hidden={!sinkingThoughtText}
            >
              {sinkingThoughtText ? <span>{sinkingThoughtText}</span> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {phase === "thiefRevealed" ? (
        <div key="thief-detail" className="thief-detail" aria-label="心贼解释">
          {thiefDetails.map((item) => (
            <span key={item.word}>
              <b>{item.word}</b>
              {item.detail}
            </span>
          ))}
        </div>
      ) : null}

      {canHoldWater ? (
        <button
          type="button"
          className="ritual-action hold-action"
          onPointerDown={startHolding}
          onPointerUp={stopHolding}
          onPointerCancel={stopHolding}
          onPointerLeave={stopHolding}
          aria-label="按住水面，致良知"
        >
          <span style={{ transform: `scaleX(${Math.max(0.04, holdProgress)})` }} />
          按住水面 · 致良知
        </button>
      ) : null}

      {canEnterCycle ? (
        <button type="button" className="ritual-action cycle-action" onClick={() => onComplete(MAIN_MIRROR_ID)}>
          {currentCopy.seal}
        </button>
      ) : null}

      <style jsx>{`
        .moon-heart-gateway {
          position: relative;
          width: 100%;
          max-width: 100vw;
          min-height: calc(100svh - 2.5rem);
          overflow: hidden;
          isolation: isolate;
          background:
            radial-gradient(ellipse at 50% 58%, rgba(19, 45, 45, 0.32), transparent 42%),
            linear-gradient(180deg, #020607 0%, #050706 64%, #000101 100%);
          color: rgba(244, 235, 221, 0.92);
          text-align: center;
        }

        .moon-heart-gateway::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 4;
          background:
            radial-gradient(ellipse at 50% 50%, transparent 0 50%, rgba(0, 0, 0, 0.42) 82%, rgba(0, 0, 0, 0.86)),
            linear-gradient(180deg, rgba(0, 0, 0, 0.38), transparent 22%, transparent 70%, rgba(0, 0, 0, 0.62));
          pointer-events: none;
        }

        :global(.nine-mirror-canvas) {
          position: absolute;
          inset: 0;
          z-index: 1;
          display: block;
          width: 100%;
          height: 100%;
          cursor: pointer;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        .moon-heart-gateway :global(.still-water-intro) {
          z-index: 0;
          transition:
            opacity 1800ms cubic-bezier(0.16, 1, 0.3, 1),
            filter 1800ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .moon-heart-gateway.is-zhaoxin-flow :global(.still-water-intro) {
          opacity: 0.5;
          filter: brightness(0.9) blur(0.4px);
        }

        .moon-heart-gateway.is-zhaoxin-flow[data-lake-state="settled"] :global(.still-water-intro) {
          opacity: 0.32;
          filter: brightness(0.72) blur(1.8px);
        }

        .moon-heart-gateway.is-zhaoxin-flow[data-lake-mode="liangzhi"] :global(.still-water-intro) {
          opacity: 0.12;
          filter: brightness(0.42) blur(3px);
        }

        .moon-heart-gateway :global(.mirror-gateway-heart-lake) {
          z-index: 2;
          mix-blend-mode: normal;
          pointer-events: auto;
          filter: saturate(0.86) brightness(0.88) blur(2.2px);
          transform: scale(1.025);
          transform-origin: 50% 54%;
          transition:
            filter 3200ms cubic-bezier(0.16, 1, 0.3, 1),
            transform 4200ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .moon-heart-gateway[data-lake-state="settled"] :global(.mirror-gateway-heart-lake) {
          filter: saturate(0.92) brightness(0.96) blur(0);
          transform: scale(1);
        }

        .moon-heart-gateway[data-lake-mode="liangzhi"] :global(.mirror-gateway-heart-lake) {
          filter: saturate(0.82) brightness(0.72) blur(0.4px);
        }

        .moon-heart-gateway.is-zhaoxin-flow :global(.zhaoxin-ritual-flow) {
          position: absolute;
          inset: 0;
          width: 100%;
          min-height: 100%;
          margin-left: 0;
          transform: none;
        }

        .still-water-gateway-copy {
          position: absolute;
          left: 50%;
          top: clamp(66%, 73svh, 78%);
          z-index: 9;
          width: min(36rem, calc(100vw - 2rem));
          transform: translate(-50%, -50%);
          text-align: center;
          pointer-events: none;
        }

        .still-water-gateway-copy h1 {
          margin: 0;
          color: rgba(232, 228, 210, 0.92);
          font-family: var(--font-narrative);
          font-size: clamp(1.18rem, 2.7vw, 2.35rem);
          font-weight: 360;
          font-variation-settings: "wght" 360;
          line-height: 1.72;
          letter-spacing: 0.085em;
          text-shadow: 0 0 52px rgba(0, 0, 0, 0.6);
          animation: still-copy-rise 1180ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .still-water-gateway-copy.is-question {
          top: clamp(64%, 71svh, 76%);
          width: min(44rem, calc(100vw - 2rem));
          pointer-events: auto;
        }

        .still-water-gateway-copy.is-clear {
          top: clamp(64%, 70svh, 76%);
        }

        .thought-sink-panel {
          display: grid;
          gap: clamp(0.8rem, 1.8svh, 1.08rem);
          pointer-events: auto;
        }

        .thought-sink-panel h1 {
          font-size: clamp(1.04rem, 2.08vw, 1.86rem);
          line-height: 1.5;
        }

        .thought-sink-form {
          display: grid;
          gap: clamp(0.64rem, 1.45svh, 0.9rem);
          width: min(29rem, calc(100vw - 3.5rem));
          margin: 0 auto;
          pointer-events: auto;
        }

        .thought-sink-label {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0 0 0 0);
          white-space: nowrap;
        }

        .thought-sink-input-shell {
          position: relative;
          height: clamp(3.5rem, 6.3svh, 4.25rem);
          overflow: hidden;
          border: 1px solid rgba(216, 183, 111, 0.3);
          border-radius: 999px;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(244, 235, 221, 0.055), transparent 56%),
            radial-gradient(ellipse at 50% 100%, rgba(216, 183, 111, 0.08), transparent 66%),
            linear-gradient(180deg, rgba(31, 27, 17, 0.52), rgba(4, 7, 6, 0.82) 48%, rgba(2, 4, 4, 0.9));
          box-shadow:
            0 14px 42px rgba(0, 0, 0, 0.42),
            0 0 0 1px rgba(216, 183, 111, 0.045),
            inset 0 1px 0 rgba(255, 255, 255, 0.075);
        }

        .thought-sink-input-shell::before {
          content: "";
          position: absolute;
          pointer-events: none;
        }

        .thought-sink-input-shell::before {
          inset: 1px;
          border-radius: inherit;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.052), transparent 35%, rgba(216, 183, 111, 0.042));
          opacity: 0.5;
        }

        .thought-sink-input {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          padding: 0.5rem 1.55rem 1rem;
          border: 0;
          outline: 0;
          background: transparent;
          color: rgba(244, 235, 221, 0.94);
          font-family: var(--font-narrative);
          font-size: clamp(0.92rem, 1.65vw, 1.12rem);
          font-weight: 360;
          line-height: 1.32;
          letter-spacing: 0.07em;
          text-align: center;
          text-shadow: 0 0 24px rgba(0, 0, 0, 0.42);
        }

        .thought-sink-input::placeholder {
          color: rgba(242, 220, 168, 0.58);
        }

        .thought-sink-input-shell:focus-within {
          border-color: rgba(242, 220, 168, 0.48);
          box-shadow:
            0 16px 48px rgba(0, 0, 0, 0.46),
            0 0 26px rgba(216, 183, 111, 0.09),
            0 0 0 1px rgba(216, 183, 111, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .thought-shadow-stack {
          position: absolute;
          right: 1.55rem;
          bottom: 0.42rem;
          left: 1.55rem;
          z-index: 1;
          height: 0.95rem;
          perspective: 800px;
          color: rgba(232, 228, 210, 0.22);
          font-family: var(--font-function);
          font-size: clamp(0.62rem, 1.12vw, 0.72rem);
          letter-spacing: 0.08em;
          pointer-events: none;
          transition: opacity 520ms ease;
        }

        .thought-sink-form[data-has-value="true"] .thought-shadow-stack {
          opacity: 0;
        }

        .thought-sink-form[data-paused="true"] .thought-sink-input-shell {
          border-color: rgba(242, 220, 168, 0.42);
          box-shadow:
            0 16px 48px rgba(0, 0, 0, 0.44),
            0 0 24px rgba(216, 183, 111, 0.075),
            inset 0 1px 0 rgba(255, 255, 255, 0.09);
        }

        .thought-shadow-option {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          opacity: 0;
          filter: blur(5px);
          transform: translateY(-0.75rem) rotateX(-50deg);
          transform-origin: center;
          animation: thought-shadow-turn 22.4s ease-in-out infinite;
        }

        .thought-shadow-option:nth-child(2) {
          animation-delay: 3.2s;
        }

        .thought-shadow-option:nth-child(3) {
          animation-delay: 6.4s;
        }

        .thought-shadow-option:nth-child(4) {
          animation-delay: 9.6s;
        }

        .thought-shadow-option:nth-child(5) {
          animation-delay: 12.8s;
        }

        .thought-shadow-option:nth-child(6) {
          animation-delay: 16s;
        }

        .thought-shadow-option:nth-child(7) {
          animation-delay: 19.2s;
        }

        .thought-sink-release {
          position: relative;
          display: grid;
          min-height: clamp(7rem, 17svh, 10rem);
          place-items: center;
        }

        .thought-sink-release::before,
        .thought-sink-release::after {
          content: "";
          position: absolute;
          width: min(18rem, 58vw);
          aspect-ratio: 1 / 0.34;
          border: 1px solid rgba(232, 228, 210, 0.13);
          border-radius: 50%;
          opacity: 0;
          filter: blur(3px);
          animation: thought-sink-ripple 2300ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .thought-sink-release::after {
          width: min(12rem, 42vw);
          animation-delay: 220ms;
        }

        .thought-sink-release.is-empty::before {
          border-color: rgba(232, 228, 210, 0.16);
        }

        .thought-sink-release span {
          color: rgba(244, 235, 221, 0.88);
          font-family: var(--font-narrative);
          font-size: clamp(1.18rem, 2.8vw, 2.1rem);
          font-weight: 360;
          letter-spacing: 0.09em;
          text-shadow: 0 0 42px rgba(0, 0, 0, 0.56);
          animation: thought-sink-text 2300ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .ritual-copy {
          position: absolute;
          left: 50%;
          top: clamp(50%, 57svh, 59%);
          z-index: 9;
          display: grid;
          width: min(88vw, 720px);
          gap: 0.82rem;
          transform: translate(-50%, -50%);
          animation: copy-rise 920ms cubic-bezier(0.22, 1, 0.36, 1) both;
          pointer-events: none;
        }

        .ritual-copy small {
          font-family: var(--font-function);
          font-size: clamp(0.68rem, 1.8vw, 0.82rem);
          font-weight: 600;
          letter-spacing: 0.18em;
          color: rgba(216, 183, 111, 0.68);
          text-indent: 0.18em;
        }

        .ritual-copy h1 {
          margin: 0;
          white-space: pre-line;
          font-family: var(--font-world);
          font-size: clamp(2rem, 6.8vw, 4.4rem);
          font-weight: 300;
          line-height: 1.34;
          letter-spacing: 0.06em;
          color: rgba(244, 235, 221, 0.96);
          text-shadow: 0 0 58px rgba(0, 0, 0, 0.62);
        }

        .ritual-copy p {
          margin: 0 auto;
          max-width: min(82vw, 34em);
          white-space: pre-line;
          font-family: var(--font-narrative);
          font-size: clamp(0.92rem, 2.4vw, 1.12rem);
          font-weight: 300;
          line-height: 1.72;
          letter-spacing: 0.06em;
          color: rgba(220, 212, 195, 0.6);
        }

        .ritual-copy.is-thought {
          top: clamp(54%, 60svh, 62%);
        }

        .ritual-copy.is-thought h1 {
          font-size: clamp(1.72rem, 5.6vw, 3.35rem);
          animation: thought-from-water 1.28s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .ritual-copy.is-payoff {
          top: clamp(52%, 58svh, 60%);
          width: min(88vw, 780px);
        }

        .ritual-copy.is-payoff h1 {
          font-family: var(--font-narrative);
          font-size: clamp(1.62rem, 4.8vw, 3.1rem);
          line-height: 1.58;
          letter-spacing: 0.04em;
        }

        .ritual-copy.is-thief h1 {
          color: rgba(196, 91, 62, 0.88);
          letter-spacing: 0.2em;
          text-indent: 0.2em;
          text-shadow:
            0 0 28px rgba(127, 37, 25, 0.22),
            0 22px 58px rgba(0, 0, 0, 0.76);
        }

        .ritual-copy.is-heart-seal h1,
        .ritual-copy.is-conscience h1 {
          color: rgba(242, 220, 168, 0.92);
        }

        .ritual-copy.is-complete {
          top: 50%;
        }

        .ritual-copy.is-complete h1 {
          font-size: clamp(2.1rem, 6vw, 3.8rem);
          color: rgba(242, 220, 168, 0.92);
        }

        .ritual-copy.is-complete p {
          margin-top: 0.3rem;
          font-size: clamp(1rem, 2.5vw, 1.22rem);
          line-height: 1.64;
          color: rgba(244, 235, 221, 0.72);
        }

        .thief-detail {
          position: absolute;
          left: 50%;
          top: calc(58% + clamp(110px, 15svh, 150px));
          z-index: 9;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.7rem;
          width: min(86vw, 520px);
          transform: translateX(-50%);
          animation: copy-rise 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
          pointer-events: none;
        }

        .thief-detail span {
          display: inline-flex;
          align-items: center;
          gap: 0.34rem;
          padding: 0.48rem 0.74rem;
          border: 1px solid rgba(127, 37, 25, 0.28);
          border-radius: 999px;
          background: rgba(18, 12, 10, 0.26);
          font-family: var(--font-function);
          font-size: clamp(0.72rem, 1.7vw, 0.82rem);
          letter-spacing: 0.08em;
          color: rgba(220, 212, 195, 0.62);
        }

        .thief-detail b {
          font-family: var(--font-world);
          font-weight: 400;
          color: rgba(196, 91, 62, 0.88);
        }

        .ritual-action {
          position: absolute;
          left: 50%;
          bottom: clamp(4.4rem, 8.6svh, 6.8rem);
          z-index: 10;
          min-width: min(58vw, 340px);
          min-height: 60px;
          padding: 0 2.4rem;
          overflow: hidden;
          border: 1px solid rgba(216, 183, 111, 0.48);
          border-radius: 999px;
          background:
            linear-gradient(180deg, rgba(48, 43, 28, 0.72), rgba(10, 11, 8, 0.84)),
            radial-gradient(ellipse at 50% 0%, rgba(216, 183, 111, 0.18), transparent 66%);
          color: rgba(242, 220, 168, 0.92);
          font-family: var(--font-narrative);
          font-size: clamp(0.92rem, 1.8vw, 1.12rem);
          font-weight: 400;
          letter-spacing: 0.46em;
          text-indent: 0.46em;
          box-shadow:
            0 18px 54px rgba(0, 0, 0, 0.54),
            0 0 34px rgba(216, 183, 111, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
          transform: translateX(-50%);
          transition:
            transform 180ms ease,
            border-color 240ms ease,
            filter 240ms ease;
          -webkit-tap-highlight-color: transparent;
        }

        .ritual-action-hint {
          position: absolute;
          left: 50%;
          bottom: clamp(1.9rem, 4svh, 3rem);
          z-index: 10;
          width: min(86vw, 28rem);
          margin: 0;
          transform: translateX(-50%);
          color: rgba(220, 212, 195, 0.34);
          font-family: var(--font-narrative);
          font-size: clamp(0.78rem, 1.45vw, 0.95rem);
          font-weight: 360;
          line-height: 1.8;
          letter-spacing: 0.08em;
          text-align: center;
          pointer-events: none;
        }

        .ritual-action:hover,
        .ritual-action:focus-visible {
          border-color: rgba(242, 220, 168, 0.68);
          filter: brightness(1.08);
          outline: none;
        }

        .ritual-action:active {
          transform: translateX(-50%) translateY(2px);
        }

        .hold-action {
          background:
            linear-gradient(180deg, rgba(38, 34, 22, 0.72), rgba(12, 14, 10, 0.82)),
            radial-gradient(ellipse at 50% 0%, rgba(216, 183, 111, 0.18), transparent 66%);
          color: rgba(242, 220, 168, 0.9);
          touch-action: none;
        }

        .hold-action span {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 100%;
          background: linear-gradient(90deg, rgba(216, 183, 111, 0.26), rgba(95, 132, 117, 0.18));
          opacity: 0.72;
          transform-origin: left center;
          pointer-events: none;
        }

        .cycle-action {
          bottom: clamp(1.1rem, 3.4svh, 2.4rem);
        }

        @keyframes copy-rise {
          from {
            opacity: 0;
            filter: blur(12px);
            transform: translate(-50%, calc(-50% + 22px));
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translate(-50%, -50%);
          }
        }

        @keyframes still-copy-rise {
          from {
            opacity: 0;
            filter: blur(16px);
            transform: translateY(24px);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        @keyframes thought-shadow-turn {
          0%,
          100% {
            opacity: 0;
            filter: blur(5px);
            transform: translateY(-0.75rem) rotateX(-50deg);
          }

          5%,
          12% {
            opacity: 1;
            filter: blur(0.5px);
            transform: translateY(0) rotateX(0deg);
          }

          18% {
            opacity: 0;
            filter: blur(6px);
            transform: translateY(0.75rem) rotateX(50deg);
          }
        }

        @keyframes thought-sink-text {
          0% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0) scale(1);
          }

          58% {
            opacity: 0.42;
          }

          100% {
            opacity: 0;
            filter: blur(15px);
            transform: translateY(4.8rem) scale(0.86);
          }
        }

        @keyframes thought-sink-ripple {
          0% {
            opacity: 0;
            filter: blur(3px);
            transform: scale(0.28);
          }

          22% {
            opacity: 0.42;
          }

          100% {
            opacity: 0;
            filter: blur(9px);
            transform: scale(1.32);
          }
        }

        @keyframes thought-from-water {
          from {
            opacity: 0;
            filter: blur(16px);
            transform: translateY(42px) scale(0.96);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 640px) {
          .moon-heart-gateway {
            min-height: calc(100svh - 1.25rem);
          }

          .ritual-title {
            top: 0.95rem;
            gap: 0.62rem;
            font-size: 0.62rem;
            letter-spacing: 0.14em;
          }

          .ritual-title i {
            width: 2.2rem;
          }

          .ritual-copy {
            top: 58%;
            width: 90vw;
          }

          .ritual-copy h1 {
            font-size: clamp(1.78rem, 8vw, 2.55rem);
            line-height: 1.42;
          }

          .ritual-copy.is-payoff h1 {
            font-size: clamp(1.34rem, 6.4vw, 2rem);
            line-height: 1.68;
          }

          .ritual-copy.is-thief h1 {
            font-size: clamp(2rem, 10vw, 2.85rem);
          }

          .ritual-copy p {
            font-size: 0.84rem;
          }

          .thief-detail {
            top: calc(58% + 130px);
            gap: 0.46rem;
          }

          .thief-detail span {
            font-size: 0.68rem;
            padding: 0.42rem 0.58rem;
          }

          .ritual-action {
            min-width: min(82vw, 340px);
            min-height: 52px;
            padding: 0 1.5rem;
            font-size: 0.86rem;
          }

          .still-water-gateway-copy {
            top: clamp(62%, 70svh, 76%);
            width: min(90vw, 34rem);
          }

          .still-water-gateway-copy.is-question {
            top: clamp(62%, 70svh, 76%);
          }

          .thought-sink-panel h1 {
            font-size: clamp(1rem, 4.6vw, 1.32rem);
            letter-spacing: 0.055em;
          }

          .thought-sink-form {
            width: min(78vw, 24rem);
          }

          .thought-sink-input-shell {
            height: 3.7rem;
          }

          .thought-sink-input {
            padding-inline: 1.25rem;
            padding-bottom: 0.86rem;
            font-size: 0.92rem;
          }

          .thought-shadow-stack {
            right: 1.05rem;
            bottom: 0.36rem;
            left: 1.05rem;
            font-size: 0.62rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ritual-copy,
          .ritual-copy.is-thought h1,
          .thief-detail,
          .thought-shadow-option,
          .thought-sink-release::before,
          .thought-sink-release::after,
          .thought-sink-release span {
            animation: none !important;
            filter: none !important;
          }
        }
      `}</style>
    </section>
  )
}
