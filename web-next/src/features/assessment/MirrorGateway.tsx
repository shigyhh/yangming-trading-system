"use client"

import { AnimatePresence } from "framer-motion"
import type { CSSProperties, PointerEvent } from "react"
import { useEffect, useMemo, useRef, useState } from "react"

import { behaviorMirrorSignals, type BehaviorMirrorId, type BehaviorMirrorSignal } from "./behavior-mirrors"
import { cn } from "@/lib/utils"

type GatewayPhase =
  | "openingJudge"
  | "openingSelf"
  | "question"
  | "mirrorArray"
  | "focusing"
  | "subconsciousVisible"
  | "revealed"
  | "thiefVisible"
  | "readyForCycle"

type OrbitSlot = {
  x: number
  y: number
  scale: number
  opacity: number
  blur: number
  zIndex: number
  rotateY: number
  shadow: number
}

type ResonanceLevel = "primary" | "secondary" | "tertiary" | "sleeping"

type MirrorFlow = {
  duration: number
  delay: number
  driftX: number
  driftY: number
  counterX: number
  counterY: number
}

type MirrorMotion = "dart" | "heavy" | "drift" | "swing" | "follow" | "waver" | "lag" | "tremble" | "steady"

const defaultMainMirrorId = "chasing"

const orbitSlotByMirrorId: Record<string, OrbitSlot> = {
  anxiety: { x: -246, y: -652, scale: 0.56, opacity: 0.16, blur: 3.4, zIndex: 12, rotateY: 0, shadow: 0.025 },
  following: { x: -784, y: -374, scale: 0.78, opacity: 0.28, blur: 2.2, zIndex: 24, rotateY: 13, shadow: 0.045 },
  hesitation: { x: 646, y: -526, scale: 0.64, opacity: 0.23, blur: 2.5, zIndex: 18, rotateY: -13, shadow: 0.035 },
  holdingLoss: { x: -832, y: -62, scale: 0.88, opacity: 0.38, blur: 1.45, zIndex: 58, rotateY: 14, shadow: 0.075 },
  chasing: { x: 772, y: 92, scale: 0.86, opacity: 0.44, blur: 0.9, zIndex: 62, rotateY: -14, shadow: 0.085 },
  gambling: { x: -704, y: 556, scale: 0.76, opacity: 0.28, blur: 2.2, zIndex: 54, rotateY: 11, shadow: 0.045 },
  fantasy: { x: 708, y: 438, scale: 0.66, opacity: 0.26, blur: 2.4, zIndex: 28, rotateY: -11, shadow: 0.04 },
  procrastination: { x: 214, y: 694, scale: 0.58, opacity: 0.18, blur: 3.1, zIndex: 16, rotateY: 0, shadow: 0.025 },
  conscience: { x: -44, y: 746, scale: 0.48, opacity: 0.12, blur: 2.8, zIndex: 10, rotateY: 0, shadow: 0.018 },
}

const resonanceByMirrorId: Record<BehaviorMirrorId, Partial<Record<BehaviorMirrorId, ResonanceLevel>>> = {
  chasing: { chasing: "primary", gambling: "secondary", following: "tertiary" },
  holdingLoss: { holdingLoss: "primary", fantasy: "secondary", anxiety: "tertiary" },
  fantasy: { fantasy: "primary", holdingLoss: "secondary", hesitation: "tertiary" },
  gambling: { gambling: "primary", chasing: "secondary", holdingLoss: "tertiary" },
  following: { following: "primary", hesitation: "secondary", chasing: "tertiary" },
  hesitation: { hesitation: "primary", anxiety: "secondary", following: "tertiary" },
  procrastination: { procrastination: "primary", holdingLoss: "secondary", conscience: "tertiary" },
  anxiety: { anxiety: "primary", hesitation: "secondary", chasing: "tertiary" },
  conscience: { conscience: "primary", anxiety: "tertiary", hesitation: "tertiary" },
}

const mirrorFlowById: Record<BehaviorMirrorId, MirrorFlow> = {
  chasing: { duration: 4.8, delay: -1.1, driftX: 8, driftY: -6, counterX: -7, counterY: 5 },
  holdingLoss: { duration: 24.8, delay: -6.2, driftX: -8, driftY: 42, counterX: 10, counterY: 18 },
  fantasy: { duration: 23.6, delay: -8.8, driftX: 64, driftY: -38, counterX: -58, counterY: 34 },
  gambling: { duration: 12.4, delay: -4.1, driftX: -46, driftY: -28, counterX: 56, counterY: 34 },
  following: { duration: 19.8, delay: -10.4, driftX: 42, driftY: -22, counterX: -36, counterY: 26 },
  hesitation: { duration: 8.8, delay: -2.5, driftX: -28, driftY: -18, counterX: 30, counterY: 18 },
  procrastination: { duration: 31.4, delay: -12.8, driftX: 18, driftY: 26, counterX: -16, counterY: -10 },
  anxiety: { duration: 3.4, delay: -0.6, driftX: -5, driftY: 4, counterX: 4, counterY: -5 },
  conscience: { duration: 36.8, delay: -14.2, driftX: 4, driftY: -3, counterX: -3, counterY: 3 },
}

const mirrorMotionById: Record<BehaviorMirrorId, MirrorMotion> = {
  chasing: "dart",
  holdingLoss: "heavy",
  fantasy: "drift",
  gambling: "swing",
  following: "follow",
  hesitation: "waver",
  procrastination: "lag",
  anxiety: "tremble",
  conscience: "steady",
}

const mirrorShortNameById: Record<BehaviorMirrorId, string> = {
  chasing: "追涨",
  holdingLoss: "扛单",
  fantasy: "幻想",
  gambling: "赌性",
  following: "从众",
  hesitation: "犹疑",
  procrastination: "拖延",
  anxiety: "焦虑",
  conscience: "良知",
}

const heartMirrors = behaviorMirrorSignals
const behaviorMirrors = heartMirrors
const conscienceMirror = heartMirrors.find((mirror) => mirror.id === "conscience")

const thiefExplanations: Record<string, string> = {
  贪: "想多拿一点，忘了边界。",
  急: "怕慢一步就失去机会。",
  痴: "把希望当判断。",
  慢: "知道该做，却拖到明天。",
  疑: "不相信自己的规则。",
  惧: "怕失去已有利润。",
  知止: "看见边界，愿意停下。",
  守心: "情绪起时，不把手交出去。",
  执行: "规则到了，就落实到动作。",
}

const sixThiefOrbit = [
  { id: "贪", x: 0, y: -118 },
  { id: "急", x: 102, y: -58 },
  { id: "惧", x: 106, y: 58 },
  { id: "疑", x: 0, y: 122 },
  { id: "慢", x: -106, y: 58 },
  { id: "痴", x: -102, y: -58 },
]

const mirrorTriggerScenes: Record<string, string> = {
  chasing: "行情突然拉升",
  holdingLoss: "价格打到止损",
  fantasy: "走势已经变弱",
  gambling: "刚亏完一笔",
  following: "外界声音变多",
  hesitation: "机会到了计划区",
  procrastination: "收盘又想跳过复盘",
  anxiety: "账户刚有浮盈",
  conscience: "情绪起来了",
}

const subconsciousEchoes: Record<string, string> = {
  chasing: "怕错过。",
  holdingLoss: "怕认错。",
  fantasy: "怕自己错了。",
  gambling: "想翻回来。",
  following: "怕自己负责。",
  hesitation: "怕做错。",
  procrastination: "怕面对。",
  anxiety: "怕利润没了。",
  conscience: "情绪起了，但手可以不动。",
}

function HeartWaterMirrorPlane({
  phase,
  activeMirrorId,
  onMirrorHit,
}: {
  phase: GatewayPhase
  activeMirrorId: string | null
  onMirrorHit?: (clientX: number, clientY: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ripplesRef = useRef<Array<{ x: number; y: number; r: number; a: number }>>([])
  const energyRef = useRef(0)
  const thoughtWaveRef = useRef(0)

  useEffect(() => {
    if (phase !== "mirrorArray") return

    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const planeWidth = canvas.width / dpr
    const planeHeight = canvas.height / dpr
    const poolY = planeHeight * (planeWidth < 540 ? 0.72 : 0.7)

    thoughtWaveRef.current = 1
    energyRef.current = Math.max(energyRef.current, 0.82)
    ripplesRef.current.push(
      { x: planeWidth * 0.5, y: poolY, r: 2, a: 0.42 },
      { x: planeWidth * 0.5, y: poolY, r: 38, a: 0.18 },
    )
  }, [activeMirrorId, phase])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return undefined

    let width = 0
    let height = 0
    let frameId = 0
    let lastRipple = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(280, Math.round(rect.width))
      height = Math.max(360, Math.round(rect.height))
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

    const drawMirrorReflection = (
      cx: number,
      poolY: number,
      rx: number,
      ry: number,
      time: number,
      mirror: BehaviorMirrorSignal,
      index: number,
    ) => {
      const slot = orbitSlotByMirrorId[mirror.id] ?? orbitSlotByMirrorId.chasing
      const level = getResonanceLevel(activeMirrorId, mirror.id, phase)
      const resonance =
        level === "primary" ? 1 : level === "secondary" ? 0.62 : level === "tertiary" ? 0.38 : mirror.id === "conscience" ? 0.14 : 0.22
      const x = clamp(cx + slot.x * (width < 540 ? 0.34 : 0.48), cx - rx * 0.92, cx + rx * 0.92)
      const baseY = poolY - ry * 0.36 + Math.sin(time * 0.45 + index) * ry * 0.08
      const lineHeight = ry * (0.26 + resonance * 0.74)
      const wobble = Math.sin(time * 1.35 + index * 1.8) * (3 + energyRef.current * 12)
      const alpha = 0.025 + resonance * 0.09
      const tint = mirror.id === "conscience" ? "216, 210, 158" : "145, 194, 205"

      context.save()
      context.beginPath()
      context.ellipse(cx, poolY, rx, ry, 0, 0, Math.PI * 2)
      context.clip()
      const gradient = context.createLinearGradient(x + wobble, baseY - lineHeight * 0.18, x - wobble * 0.4, baseY + lineHeight)
      gradient.addColorStop(0, `rgba(${tint}, 0)`)
      gradient.addColorStop(0.38, `rgba(${tint}, ${alpha})`)
      gradient.addColorStop(1, `rgba(${tint}, 0)`)
      context.strokeStyle = gradient
      context.lineWidth = 10 + resonance * 22
      context.beginPath()
      context.moveTo(x + wobble * 0.35, baseY - lineHeight * 0.2)
      context.lineTo(x - wobble * 0.3, baseY + lineHeight)
      context.stroke()

      const glow = context.createRadialGradient(x + wobble, baseY + lineHeight * 0.35, 0, x + wobble, baseY + lineHeight * 0.35, 28 + resonance * 28)
      glow.addColorStop(0, `rgba(${tint}, ${alpha * 0.9})`)
      glow.addColorStop(1, `rgba(${tint}, 0)`)
      context.fillStyle = glow
      context.beginPath()
      context.ellipse(x + wobble, baseY + lineHeight * 0.35, 18 + resonance * 18, 34 + resonance * 32, 0, 0, Math.PI * 2)
      context.fill()
      context.restore()
    }

    const frame = (now: number) => {
      const time = now / 1000
      const cx = width * 0.5
      const poolY = height * (width < 540 ? 0.72 : 0.7)
      const rx = Math.min(width * (width < 540 ? 0.44 : 0.42), 560)
      const ry = Math.min(height * 0.26, width < 540 ? 132 : 162)
      const gsq = ry / rx
      const breath = 0.5 + Math.sin(time * 0.72) * 0.5
      const energy = energyRef.current
      const thoughtWave = thoughtWaveRef.current

      context.clearRect(0, 0, width, height)

      const nightSky = context.createLinearGradient(0, 0, 0, height)
      nightSky.addColorStop(0, "rgba(0, 4, 8, 0.62)")
      nightSky.addColorStop(0.34, "rgba(1, 8, 10, 0.42)")
      nightSky.addColorStop(0.58, "rgba(3, 9, 7, 0.2)")
      nightSky.addColorStop(1, "rgba(0, 0, 0, 0)")
      context.fillStyle = nightSky
      context.fillRect(0, 0, width, height)

      const skyWash = context.createRadialGradient(cx, poolY, rx * 0.24, cx, poolY - ry * 1.1, rx * 1.62)
      skyWash.addColorStop(0, "rgba(8, 22, 28, 0.14)")
      skyWash.addColorStop(0.52, "rgba(6, 12, 18, 0.075)")
      skyWash.addColorStop(1, "rgba(4, 9, 13, 0)")
      context.fillStyle = skyWash
      context.beginPath()
      context.ellipse(cx, poolY, rx * 1.25, ry * 1.46, 0, 0, Math.PI * 2)
      context.fill()

      const moonX = cx
      const moonY = height * 0.12
      const moonR = Math.min(rx * 0.058, 30)
      const halo = context.createRadialGradient(moonX, moonY, moonR * 0.7, moonX, moonY, moonR * 6.6)
      halo.addColorStop(0, "rgba(210, 224, 230, 0.07)")
      halo.addColorStop(0.34, "rgba(210, 224, 230, 0.028)")
      halo.addColorStop(1, "rgba(210, 224, 230, 0)")
      context.fillStyle = halo
      context.beginPath()
      context.arc(moonX, moonY, moonR * 7.2, 0, Math.PI * 2)
      context.fill()

      const moon = context.createRadialGradient(moonX - moonR * 0.18, moonY - moonR * 0.18, moonR * 0.16, moonX, moonY, moonR)
      moon.addColorStop(0, "rgba(239, 248, 249, 0.38)")
      moon.addColorStop(0.58, "rgba(210, 224, 228, 0.3)")
      moon.addColorStop(1, "rgba(174, 194, 200, 0.055)")
      context.fillStyle = moon
      context.beginPath()
      context.arc(moonX, moonY, moonR, 0, Math.PI * 2)
      context.fill()

      const moonPath = context.createLinearGradient(0, moonY + moonR * 1.1, 0, poolY - ry * 0.78)
      moonPath.addColorStop(0, "rgba(210, 224, 230, 0.024)")
      moonPath.addColorStop(0.62, "rgba(210, 224, 230, 0.01)")
      moonPath.addColorStop(1, "rgba(210, 224, 230, 0)")
      context.fillStyle = moonPath
      context.beginPath()
      context.moveTo(moonX - moonR * 0.22, moonY + moonR * 1.04)
      context.bezierCurveTo(moonX - moonR * 0.8, poolY - ry * 1.78, moonX - rx * 0.08, poolY - ry * 1.18, moonX - rx * 0.12, poolY - ry * 0.78)
      context.lineTo(moonX + rx * 0.12, poolY - ry * 0.78)
      context.bezierCurveTo(moonX + rx * 0.08, poolY - ry * 1.18, moonX + moonR * 0.8, poolY - ry * 1.78, moonX + moonR * 0.22, moonY + moonR * 1.04)
      context.closePath()
      context.fill()

      for (let ray = 0; ray < 7; ray += 1) {
        const progress = ray / 6
        const rayY = moonY + moonR * 2.4 + progress * (poolY - ry * 1.08 - moonY - moonR * 2.4)
        const rayWidth = moonR * (1.1 + progress * 5.8)
        const rayOffset = Math.sin(time * 0.34 + ray * 1.4) * moonR * 0.32
        const rayGradient = context.createLinearGradient(moonX - rayWidth, 0, moonX + rayWidth, 0)
        rayGradient.addColorStop(0, "rgba(210, 224, 230, 0)")
        rayGradient.addColorStop(0.5, `rgba(210, 224, 230, ${0.012 * (1 - progress * 0.42)})`)
        rayGradient.addColorStop(1, "rgba(210, 224, 230, 0)")
        context.fillStyle = rayGradient
        context.fillRect(moonX - rayWidth + rayOffset, rayY, rayWidth * 2, 1.2)
      }

      const horizonY = poolY - ry * 1.02
      context.fillStyle = "rgba(6, 12, 17, 0.18)"
      context.beginPath()
      context.moveTo(cx - rx * 1.18, horizonY + 20)
      context.lineTo(cx - rx * 1.18, horizonY + 2)
      context.quadraticCurveTo(cx - rx * 0.54, horizonY - 14, cx - rx * 0.08, horizonY + 4)
      context.quadraticCurveTo(cx + rx * 0.42, horizonY + 18, cx + rx * 1.18, horizonY - 4)
      context.lineTo(cx + rx * 1.18, horizonY + 38)
      context.closePath()
      context.fill()

      context.save()
      context.beginPath()
      context.ellipse(cx, poolY, rx, ry, 0, 0, Math.PI * 2)
      context.clip()

      const pool = context.createRadialGradient(cx, poolY - ry * 0.14, rx * 0.05, cx, poolY, rx)
      pool.addColorStop(0, "rgba(1, 4, 8, 0.95)")
      pool.addColorStop(0.48, "rgba(4, 18, 27, 0.88)")
      pool.addColorStop(0.84, "rgba(7, 35, 45, 0.82)")
      pool.addColorStop(1, "rgba(13, 47, 58, 0.72)")
      context.fillStyle = pool
      context.beginPath()
      context.ellipse(cx, poolY, rx, ry, 0, 0, Math.PI * 2)
      context.fill()

      const skyReflection = context.createLinearGradient(0, poolY - ry, 0, poolY + ry)
      skyReflection.addColorStop(0, `rgba(27, 58, 70, ${0.14 + breath * 0.025})`)
      skyReflection.addColorStop(0.52, "rgba(4, 12, 18, 0.16)")
      skyReflection.addColorStop(1, "rgba(1, 4, 7, 0.4)")
      context.fillStyle = skyReflection
      context.beginPath()
      context.ellipse(cx, poolY, rx, ry, 0, 0, Math.PI * 2)
      context.fill()

      const depthRadius = Math.min(rx, ry) * (width < 540 ? 0.86 : 0.98)
      const depth = context.createRadialGradient(cx, poolY - ry * 0.08, 0, cx, poolY, depthRadius * 1.68)
      depth.addColorStop(0, "rgba(0, 0, 0, 0.88)")
      depth.addColorStop(0.24, "rgba(0, 2, 4, 0.74)")
      depth.addColorStop(0.54, "rgba(4, 24, 29, 0.34)")
      depth.addColorStop(1, "rgba(4, 30, 40, 0)")
      context.fillStyle = depth
      context.beginPath()
      context.ellipse(cx, poolY - ry * 0.04, depthRadius * 1.4, depthRadius * 0.82, 0, 0, Math.PI * 2)
      context.fill()

      const eventHorizon = context.createRadialGradient(cx, poolY - ry * 0.04, depthRadius * 0.18, cx, poolY - ry * 0.04, depthRadius * 1.15)
      eventHorizon.addColorStop(0, "rgba(0, 0, 0, 0)")
      eventHorizon.addColorStop(0.58, "rgba(0, 0, 0, 0)")
      eventHorizon.addColorStop(0.64, `rgba(184, 148, 63, ${0.05 + breath * 0.03 + energy * 0.04})`)
      eventHorizon.addColorStop(0.7, "rgba(0, 0, 0, 0)")
      eventHorizon.addColorStop(1, "rgba(0, 0, 0, 0)")
      context.fillStyle = eventHorizon
      context.beginPath()
      context.ellipse(cx, poolY - ry * 0.04, depthRadius * 1.12, depthRadius * 0.68, 0, 0, Math.PI * 2)
      context.fill()

      for (let arm = 0; arm < 3; arm += 1) {
        context.beginPath()
        for (let step = 0; step < 42; step += 1) {
          const progress = step / 41
          const angle = time * 0.08 + arm * ((Math.PI * 2) / 3) + progress * 2.9
          const radius = depthRadius * (0.16 + progress * 0.74)
          const x = cx + Math.cos(angle) * radius * 1.06
          const y = poolY - ry * 0.04 + Math.sin(angle) * radius * 0.44
          if (step === 0) context.moveTo(x, y)
          else context.lineTo(x, y)
        }
        context.strokeStyle = `rgba(190, 212, 220, ${0.018 + energy * 0.035})`
        context.lineWidth = 1
        context.stroke()
      }

      for (let wave = 0; wave < 3; wave += 1) {
        const progress = (time * 0.18 + wave * 0.34) % 1
        const ringRy = ry * (1.02 - progress * 0.76)
        const alpha = (0.03 + energy * 0.09) * (1 - progress)
        context.beginPath()
        context.ellipse(cx, poolY - ry * 0.04, ringRy / gsq, ringRy, 0, 0, Math.PI * 2)
        context.strokeStyle = `rgba(190, 212, 220, ${alpha})`
        context.lineWidth = 0.8
        context.stroke()
      }

      context.fillStyle = "rgba(0, 0, 0, 0.78)"
      context.beginPath()
      context.ellipse(cx, poolY - ry * 0.04, depthRadius * 0.22, depthRadius * 0.14, 0, 0, Math.PI * 2)
      context.fill()

      const wobble = 2.2 + energy * 9 + thoughtWave * 18
      for (let k = 0; k < 26; k += 1) {
        const lineY = poolY - ry * 0.84 + k * ((ry * 1.68) / 26)
        const offset =
          Math.sin(lineY * 0.07 + time * 1.6) * wobble * 0.65 +
          Math.sin(lineY * 0.15 - time * 1.1) * wobble * 0.35
        const baseAlpha = Math.max(0, 0.085 * (1 - Math.abs(lineY - poolY) / (ry * 1.12)))
        const alpha = baseAlpha * (1 - thoughtWave * 0.46)
        const lineWidth = moonR * (0.54 + 0.52 * (1 - Math.abs(lineY - poolY) / ry))
        const fragmentCount = thoughtWave > 0.04 ? 3 : 1

        for (let fragment = 0; fragment < fragmentCount; fragment += 1) {
          const fragmentShift = fragmentCount === 1 ? 0 : (fragment - 1) * lineWidth * (0.64 + thoughtWave * 0.18)
          const fragmentWidth = fragmentCount === 1 ? lineWidth * 2 : lineWidth * (0.46 - thoughtWave * 0.08)
          const fragmentJitter = Math.sin(time * 4.4 + k * 1.7 + fragment * 2.2) * thoughtWave * 13
          const fragmentX = moonX + offset + fragmentShift + fragmentJitter
          const glade = context.createLinearGradient(fragmentX - fragmentWidth * 0.5, 0, fragmentX + fragmentWidth * 0.5, 0)
          glade.addColorStop(0, "rgba(206, 224, 230, 0)")
          glade.addColorStop(0.5, `rgba(206, 224, 230, ${alpha * (fragmentCount === 1 ? 1 : 0.82)})`)
          glade.addColorStop(1, "rgba(206, 224, 230, 0)")
          context.fillStyle = glade
          context.fillRect(fragmentX - fragmentWidth * 0.5, lineY - 3, fragmentWidth, 6)
        }
      }

      heartMirrors.forEach((mirror, index) => drawMirrorReflection(cx, poolY, rx, ry, time, mirror, index))

      for (let ring = 0; ring < 4; ring += 1) {
        const ringRy = ry * (0.3 + ring * 0.21) + Math.sin(time * 0.35 + ring) * ry * 0.018
        context.beginPath()
        context.ellipse(cx, poolY, ringRy / gsq, ringRy, 0, 0, Math.PI * 2)
        context.strokeStyle = `rgba(160, 188, 196, ${0.028 + ring * 0.005})`
        context.lineWidth = 0.65
        context.stroke()
      }

      ripplesRef.current.forEach((ripple) => {
        context.beginPath()
        context.ellipse(ripple.x, ripple.y, ripple.r, ripple.r * gsq, 0, 0, Math.PI * 2)
        context.strokeStyle = `rgba(190, 212, 220, ${ripple.a})`
        context.lineWidth = 1
        context.stroke()
        if (ripple.r > 16) {
          context.beginPath()
          context.ellipse(ripple.x, ripple.y, ripple.r * 0.72, ripple.r * 0.72 * gsq, 0, 0, Math.PI * 2)
          context.strokeStyle = `rgba(180, 205, 214, ${ripple.a * 0.56})`
          context.lineWidth = 0.7
          context.stroke()
        }
      })

      const sheen = context.createLinearGradient(0, poolY + ry * 0.18, 0, poolY + ry)
      sheen.addColorStop(0, "rgba(190, 212, 220, 0)")
      sheen.addColorStop(1, `rgba(190, 212, 220, ${0.035 + breath * 0.025})`)
      context.fillStyle = sheen
      context.beginPath()
      context.ellipse(cx, poolY, rx, ry, 0, 0, Math.PI * 2)
      context.fill()
      context.restore()

      context.beginPath()
      context.ellipse(cx, poolY, rx, ry, 0, 0, Math.PI * 2)
      context.strokeStyle = `rgba(196, 160, 80, ${0.2 + breath * 0.08 + energy * 0.08})`
      context.lineWidth = 1.2
      context.stroke()
      context.beginPath()
      context.ellipse(cx, poolY, rx * 1.03, ry * 1.03, 0, 0, Math.PI * 2)
      context.strokeStyle = "rgba(184, 148, 63, 0.07)"
      context.lineWidth = 0.7
      context.stroke()

      if (now - lastRipple > 3400) {
        ripplesRef.current.push({ x: cx, y: poolY, r: 2, a: 0.11 })
        lastRipple = now
      }

      ripplesRef.current = ripplesRef.current
        .map((ripple) => ({ ...ripple, r: ripple.r + 1.25 + energy * 1.35, a: ripple.a * 0.975 }))
        .filter((ripple) => ripple.r < rx * 1.16 && ripple.a > 0.008)
      energyRef.current += (0 - energyRef.current) * 0.018
      thoughtWaveRef.current += (0 - thoughtWaveRef.current) * 0.02

      frameId = window.requestAnimationFrame(frame)
    }

    resize()
    frameId = window.requestAnimationFrame(frame)
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => resize()) : null
    resizeObserver?.observe(canvas)

    return () => {
      window.cancelAnimationFrame(frameId)
      resizeObserver?.disconnect()
    }
  }, [activeMirrorId, phase])

  const addRipple = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    onMirrorHit?.(event.clientX, event.clientY)

    const rect = canvas.getBoundingClientRect()
    const widthRatio = canvas.width / Math.min(window.devicePixelRatio || 1, 2) / rect.width
    const heightRatio = canvas.height / Math.min(window.devicePixelRatio || 1, 2) / rect.height
    const x = (event.clientX - rect.left) * widthRatio
    const y = (event.clientY - rect.top) * heightRatio
    const cx = (canvas.width / Math.min(window.devicePixelRatio || 1, 2)) * 0.5
    const planeHeight = canvas.height / Math.min(window.devicePixelRatio || 1, 2)
    const planeWidth = canvas.width / Math.min(window.devicePixelRatio || 1, 2)
    const rx = Math.min(planeWidth * (planeWidth < 540 ? 0.44 : 0.42), 560)
    const ry = Math.min(planeHeight * 0.26, planeWidth < 540 ? 132 : 162)
    const poolY = planeHeight * (planeWidth < 540 ? 0.72 : 0.7)
    const dx = (x - cx) / rx
    const dy = (y - poolY) / ry
    let rippleX = x
    let rippleY = y

    if (dx * dx + dy * dy > 1) {
      const angle = Math.atan2(dy, dx)
      rippleX = cx + Math.cos(angle) * rx * 0.86
      rippleY = poolY + Math.sin(angle) * ry * 0.86
    }

    ripplesRef.current.push({ x: rippleX, y: rippleY, r: 2, a: 0.5 })
    energyRef.current = Math.min(1.4, energyRef.current + 0.62)
  }

  return (
    <canvas
      ref={canvasRef}
      className="heart-water-plane"
      aria-hidden="true"
      onPointerDown={addRipple}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 12,
        display: "block",
        width: "100%",
        height: "100%",
        cursor: "pointer",
        opacity: 0.98,
        filter: "saturate(0.95) brightness(0.98)",
        pointerEvents: "auto",
        WebkitTapHighlightColor: "transparent",
      }}
    />
  )
}

function splitThought(text: string) {
  if (text.length <= 13) return text
  return text.replace("，", "，\n")
}

function getOuterMirrors(): BehaviorMirrorSignal[] {
  return behaviorMirrors
}

function getMirrorStyle(slot: OrbitSlot) {
  const depth =
    slot.zIndex >= 62 ? 76 : slot.zIndex >= 54 ? 38 : slot.zIndex >= 28 ? -18 : slot.zIndex >= 18 ? -72 : -128
  const sceneX = slot.x * 0.56
  const sceneY = slot.y * 0.3
  const mobileX = slot.x * 0.17
  const mobileY = slot.y * 0.14

  return {
    "--mirror-x": `${sceneX}px`,
    "--mirror-y": `${sceneY}px`,
    "--mirror-mobile-x": `${mobileX}px`,
    "--mirror-mobile-y": `${mobileY}px`,
    "--mirror-pull-x": `${sceneX * 0.88}px`,
    "--mirror-pull-y": `${sceneY * 0.88}px`,
    "--mirror-mobile-pull-x": `${mobileX * 0.86}px`,
    "--mirror-mobile-pull-y": `${mobileY * 0.86}px`,
    "--mirror-depth": `${depth}px`,
    "--mirror-scale": slot.scale,
    "--mirror-opacity": slot.opacity,
    "--mirror-blur": `${slot.blur}px`,
    "--mirror-z-index": slot.zIndex,
    "--mirror-rotate-y": `${slot.rotateY}deg`,
    "--mirror-shadow": slot.shadow,
  } as CSSProperties
}

function getGravityLineStyle(activeMirrorId: string | null, phase: GatewayPhase) {
  if (!activeMirrorId || phase !== "mirrorArray") return {}

  const slot = orbitSlotByMirrorId[activeMirrorId] ?? orbitSlotByMirrorId.chasing
  const x = slot.x * 0.56
  const y = slot.y * 0.3
  const mobileX = slot.x * 0.17
  const mobileY = slot.y * 0.14
  const length = Math.hypot(x, y)
  const mobileLength = Math.hypot(mobileX, mobileY)

  return {
    "--gravity-x": `${x}px`,
    "--gravity-y": `${y}px`,
    "--gravity-length": `${length}px`,
    "--gravity-angle": `${Math.atan2(y, x)}rad`,
    "--gravity-mobile-length": `${mobileLength}px`,
    "--gravity-mobile-angle": `${Math.atan2(mobileY, mobileX)}rad`,
  } as CSSProperties
}

function getResonanceLevel(activeMirrorId: string | null, mirrorId: BehaviorMirrorId, phase: GatewayPhase): ResonanceLevel {
  if (!activeMirrorId || (phase !== "mirrorArray" && phase !== "focusing")) return "sleeping"

  return resonanceByMirrorId[activeMirrorId as BehaviorMirrorId]?.[mirrorId] ?? "sleeping"
}

function getOuterMirrorStyle(mirrorId: BehaviorMirrorId, activeMirrorId: string | null, phase: GatewayPhase) {
  const baseSlot = orbitSlotByMirrorId[mirrorId] ?? orbitSlotByMirrorId.chasing
  const resonanceLevel = getResonanceLevel(activeMirrorId, mirrorId, phase)
  const flow = mirrorFlowById[mirrorId]
  const surfacePulse =
    resonanceLevel === "primary"
      ? { low: 0.68, high: 0.9 }
      : resonanceLevel === "secondary"
        ? { low: 0.52, high: 0.72 }
        : resonanceLevel === "tertiary"
          ? { low: 0.42, high: 0.6 }
          : { low: 0.28, high: 0.46 }
  const slot =
    resonanceLevel === "primary"
      ? {
          ...baseSlot,
          x: baseSlot.x * 1.16,
          y: baseSlot.y * 0.94,
          scale: Math.min(1.06, baseSlot.scale + 0.2),
          opacity: 0.88,
          blur: 0.08,
          zIndex: 66,
          shadow: 0.2,
        }
      : resonanceLevel === "secondary"
        ? {
            ...baseSlot,
            x: baseSlot.x * 1.02,
            y: baseSlot.y * 1.02,
            scale: Math.min(0.98, baseSlot.scale + 0.1),
            opacity: 0.62,
            blur: 0.58,
            zIndex: Math.min(60, baseSlot.zIndex + 8),
            shadow: 0.12,
          }
        : resonanceLevel === "tertiary"
          ? {
              ...baseSlot,
              x: baseSlot.x * 1.08,
              y: baseSlot.y * 1.06,
              scale: Math.min(0.92, baseSlot.scale + 0.04),
              opacity: 0.48,
              blur: 0.95,
              zIndex: baseSlot.zIndex + 4,
              shadow: 0.08,
            }
          : {
              ...baseSlot,
              opacity: Math.max(baseSlot.opacity, mirrorId === "conscience" ? 0.18 : 0.28),
              blur: Math.min(baseSlot.blur, 2.25),
              shadow: Math.max(baseSlot.shadow, mirrorId === "conscience" ? 0.025 : 0.04),
            }

  return {
    ...getMirrorStyle(slot),
    "--mirror-flow-duration": `${flow.duration}s`,
    "--mirror-flow-delay": `${flow.delay}s`,
    "--mirror-drift-x": `${flow.driftX * 0.72}px`,
    "--mirror-drift-y": `${flow.driftY * 0.62}px`,
    "--mirror-counter-x": `${flow.counterX * 0.72}px`,
    "--mirror-counter-y": `${flow.counterY * 0.62}px`,
    "--mirror-breath-duration": `${Math.max(5.2, flow.duration * 0.55)}s`,
    "--side-surface-low": surfacePulse.low,
    "--side-surface-high": surfacePulse.high,
  } as CSSProperties
}

export function MirrorGateway({ onComplete }: { onComplete: (mirrorId: string) => void }) {
  const [phase, setPhase] = useState<GatewayPhase>("openingJudge")
  const [activeMirrorId, setActiveMirrorId] = useState<string | null>(defaultMainMirrorId)
  const [hoveredMirrorId, setHoveredMirrorId] = useState<string | null>(null)
  const [touchIntensity, setTouchIntensity] = useState(0)
  const touchStartXRef = useRef<number | null>(null)
  const pressureTimerRef = useRef<number | null>(null)
  const pressureReleaseTimerRef = useRef<number | null>(null)
  const activeMirror = useMemo(() => heartMirrors.find((mirror) => mirror.id === activeMirrorId) ?? null, [activeMirrorId])
  const outerMirrors = useMemo(() => getOuterMirrors(), [])
  const showArray =
    phase === "mirrorArray" ||
    phase === "focusing" ||
    phase === "subconsciousVisible" ||
    phase === "revealed" ||
    phase === "thiefVisible" ||
    phase === "readyForCycle"
  const revealIsComplete = phase === "revealed" || phase === "thiefVisible" || phase === "readyForCycle"
  const mirrorBaseScale = phase === "mirrorArray" ? 1 : 1.13
  const mirrorRestScale = mirrorBaseScale + touchIntensity * 0.025
  const mirrorPeakScale = mirrorRestScale + 0.015
  const mirrorBrightnessLow = revealIsComplete ? 1 : 0.92
  const mirrorBrightnessHigh = revealIsComplete ? 1.1 : 1.08
  const mirrorLayer = useMemo(() => {
    if (!activeMirror) return { label: "", text: "此刻这一念\n正在浮上来。", note: "" }

    if (phase === "focusing") return { label: "", text: "", note: "" }
    if (phase === "subconsciousVisible") {
      return { label: "", text: subconsciousEchoes[activeMirror.id], note: "" }
    }
    if (phase === "revealed") return { label: "行为镜", text: mirrorShortNameById[activeMirror.id], note: activeMirror.behavior }
    if (phase === "thiefVisible") {
      if (activeMirror.id === "conscience") {
        return { label: "良知", text: activeMirror.thief.join(" / "), note: "六贼无所依，此心不随。" }
      }

      return { label: "心贼", text: activeMirror.thief.join(" / "), note: "病根不是行情，是这一念牵动了手。" }
    }
    if (phase === "readyForCycle") return { label: "判词", text: activeMirror.verdict, note: "" }

    return { label: "", text: splitThought(activeMirror.thought), note: "" }
  }, [activeMirror, phase])
  const introCopy =
    phase === "openingJudge"
      ? "先不判断行情。"
      : phase === "openingSelf"
        ? "先看见自己。"
        : "此刻最先浮上来的那一念，是什么？"

  useEffect(() => {
    if (phase === "openingJudge") {
      const timer = window.setTimeout(() => setPhase("openingSelf"), 1050)
      return () => window.clearTimeout(timer)
    }

    if (phase === "openingSelf") {
      const timer = window.setTimeout(() => setPhase("question"), 1120)
      return () => window.clearTimeout(timer)
    }

    if (phase === "question") {
      const timer = window.setTimeout(() => setPhase("mirrorArray"), 1280)
      return () => window.clearTimeout(timer)
    }

    if (phase === "focusing") {
      const timer = window.setTimeout(() => setPhase("subconsciousVisible"), 820)
      return () => window.clearTimeout(timer)
    }

    if (phase === "subconsciousVisible") {
      const timer = window.setTimeout(() => setPhase("revealed"), 1050)
      return () => window.clearTimeout(timer)
    }

    if (phase === "revealed") {
      const timer = window.setTimeout(() => setPhase("thiefVisible"), 1050)
      return () => window.clearTimeout(timer)
    }

    if (phase === "thiefVisible") {
      const timer = window.setTimeout(() => setPhase("readyForCycle"), 1100)
      return () => window.clearTimeout(timer)
    }

    return undefined
  }, [phase])

  useEffect(() => {
    return () => {
      if (pressureTimerRef.current) window.clearInterval(pressureTimerRef.current)
      if (pressureReleaseTimerRef.current) window.clearTimeout(pressureReleaseTimerRef.current)
    }
  }, [])

  const stopPressurePulse = () => {
    if (pressureTimerRef.current) window.clearInterval(pressureTimerRef.current)
    pressureTimerRef.current = null

    if (pressureReleaseTimerRef.current) window.clearTimeout(pressureReleaseTimerRef.current)
    pressureReleaseTimerRef.current = window.setTimeout(() => setTouchIntensity(0), 720)
  }

  const startPressurePulse = (event: PointerEvent<HTMLElement>) => {
    if (pressureReleaseTimerRef.current) window.clearTimeout(pressureReleaseTimerRef.current)
    if (pressureTimerRef.current) window.clearInterval(pressureTimerRef.current)

    const initialPressure = event.pressure && event.pressure > 0 ? event.pressure : 0.34
    setTouchIntensity(Math.min(1, Math.max(0.18, initialPressure)))

    const startTime = performance.now()
    pressureTimerRef.current = window.setInterval(() => {
      const fallbackPressure = 0.34 + Math.min(0.5, (performance.now() - startTime) / 2200)
      setTouchIntensity((current) => Math.min(1, Math.max(current, fallbackPressure)))
    }, 90)
  }

  const updatePressurePulse = (event: PointerEvent<HTMLElement>) => {
    if (!event.pressure || event.pressure <= 0) return
    setTouchIntensity(Math.min(1, Math.max(0.18, event.pressure)))
  }

  const focusMirror = (mirrorId: string) => {
    const nextIndex = heartMirrors.findIndex((mirror) => mirror.id === mirrorId)
    if (nextIndex < 0) return

    setActiveMirrorId(mirrorId)
    setPhase("focusing")
  }

  const revealCurrentMirror = () => {
    if (!activeMirror) return
    setPhase("focusing")
  }

  const focusMirrorAtPoint = (clientX: number, clientY: number) => {
    if (phase !== "mirrorArray") return

    const mirrors = Array.from(document.querySelectorAll<HTMLElement>(".heart-mirror-side"))
    const hitMirror = mirrors.find((mirror) => {
      const rect = mirror.getBoundingClientRect()
      const touchPad = 14

      return (
        clientX >= rect.left - touchPad &&
        clientX <= rect.right + touchPad &&
        clientY >= rect.top - touchPad &&
        clientY <= rect.bottom + touchPad
      )
    })

    const mirrorId = hitMirror?.dataset.mirrorId
    if (mirrorId) focusMirror(mirrorId)
  }

  const focusAdjacent = (direction: -1 | 1) => {
    const currentIndex = Math.max(
      0,
      behaviorMirrors.findIndex((mirror) => mirror.id === activeMirrorId),
    )
    const nextIndex = (currentIndex + direction + behaviorMirrors.length) % behaviorMirrors.length
    focusMirror(behaviorMirrors[nextIndex].id)
  }

  const showDeepEcho =
    activeMirror &&
    (phase === "revealed" || phase === "thiefVisible")

  return (
    <section className={cn("nine-heart-mirror", `is-${phase}`)} aria-label="九面行为心镜">
      <div className="gateway-atmosphere" aria-hidden="true">
        <span className="gateway-mist mist-left" />
        <span className="gateway-mist mist-right" />
        <span className="gateway-mountain mountain-back" />
        <span className="gateway-mountain mountain-front" />
        <span className="gateway-star-line star-line-one" />
        <span className="gateway-star-line star-line-two" />
        <i className="gateway-particle particle-one" />
        <i className="gateway-particle particle-two" />
        <i className="gateway-particle particle-three" />
        <i className="gateway-particle particle-four" />
      </div>

      {phase === "openingJudge" || phase === "openingSelf" || phase === "question" ? (
        <div className="gateway-empty-stage">
          <div className="empty-heart-mirror" aria-hidden="true">
            <span className="empty-water" />
            <span key={`empty-ripple-${phase}`} className="empty-ripple" />
          </div>

          <p key={phase} className="empty-copy">{introCopy}</p>
        </div>
      ) : null}

      {showArray ? (
        <div className="gateway-array-stage">
          <div
            className="mirror-orbit-field"
            aria-live="polite"
            onTouchStart={(event) => {
              touchStartXRef.current = event.touches[0]?.clientX ?? null
            }}
            onTouchEnd={(event) => {
              const startX = touchStartXRef.current
              touchStartXRef.current = null
              if (startX === null || phase !== "mirrorArray") return

              const endX = event.changedTouches[0]?.clientX ?? startX
              const deltaX = endX - startX
              if (Math.abs(deltaX) > 34) focusAdjacent(deltaX > 0 ? -1 : 1)
            }}
            onClick={(event) => {
              if (phase !== "mirrorArray") return

              focusMirrorAtPoint(event.clientX, event.clientY)
            }}
          >
            <div className="gravity-fog" aria-hidden="true" />
            <HeartWaterMirrorPlane phase={phase} activeMirrorId={activeMirrorId} onMirrorHit={focusMirrorAtPoint} />
            <div className="heart-lake-title" aria-hidden="true">
              <span>心 月</span>
              <small>良知之光</small>
            </div>
            <div className="heart-lake-touch-hint" aria-hidden="true">轻触心湖，水先动，镜自现。</div>
            <div className="orbit-ring orbit-ring-deep" aria-hidden="true" />
            <div className="orbit-ring orbit-ring-back" aria-hidden="true" />

            {phase === "mirrorArray" && activeMirror ? (
              <div className="causal-hint">
                <span>触发场景</span>
                <strong>{mirrorTriggerScenes[activeMirror.id]}</strong>
              </div>
            ) : null}

            {phase === "mirrorArray" && activeMirror ? (
              <span className="gravity-line" style={getGravityLineStyle(activeMirror.id, phase)} aria-hidden="true" />
            ) : null}

            <div
              className={cn("heart-lake-voice", phase !== "mirrorArray" && "is-absorbed")}
              style={{
                "--lake-voice-rest-scale": mirrorRestScale,
                "--lake-voice-peak-scale": mirrorPeakScale,
                "--lake-voice-brightness-low": mirrorBrightnessLow,
                "--lake-voice-brightness-high": mirrorBrightnessHigh,
              } as CSSProperties}
              onPointerDown={startPressurePulse}
              onPointerMove={updatePressurePulse}
              onPointerUp={stopPressurePulse}
              onPointerCancel={stopPressurePulse}
              onPointerLeave={stopPressurePulse}
              aria-label="本心水镜，照见当前一念"
            >
              <span className="lake-deep-reflection" aria-hidden="true">
                <span>{showDeepEcho ? subconsciousEchoes[activeMirror.id] : ""}</span>
              </span>
              <span className="lake-voice-undercurrent" aria-hidden="true" />
              {phase === "focusing" ? (
                <span className="mirror-silence" aria-hidden="true" />
              ) : (
                <span
                  className={cn(
                    "mirror-layer",
                    phase === "mirrorArray" && "is-thought",
                    phase === "subconsciousVisible" && "is-subconscious",
                  )}
                >
                  {mirrorLayer.label ? <small>{mirrorLayer.label}</small> : null}
                  <span>{mirrorLayer.text}</span>
                  {mirrorLayer.note ? <em>{mirrorLayer.note}</em> : null}
                </span>
              )}
            </div>

            <div className="orbit-ring orbit-ring-front" aria-hidden="true" />

            <div className="orbit-mirrors" aria-hidden={phase !== "mirrorArray"}>
              {outerMirrors.map((mirror) => {
                const resonanceLevel = getResonanceLevel(activeMirrorId, mirror.id, phase)

                return (
                  <button
                    key={mirror.id}
                    type="button"
                    className={cn(
                      "heart-mirror-side",
                      resonanceLevel === "primary" && "is-resonant",
                      resonanceLevel === "secondary" && "is-secondary-resonant",
                      resonanceLevel === "tertiary" && "is-tertiary-resonant",
                      mirror.id === "conscience" && "is-conscience",
                      `motion-${mirrorMotionById[mirror.id]}`,
                      hoveredMirrorId === mirror.id && "is-hovered",
                      phase !== "mirrorArray" && "is-retreating",
                    )}
                    style={{
                      ...getOuterMirrorStyle(mirror.id, activeMirrorId, phase),
                    }}
                    data-mirror-id={mirror.id}
                    onMouseEnter={() => setHoveredMirrorId(mirror.id)}
                    onMouseLeave={() => setHoveredMirrorId((current) => (current === mirror.id ? null : current))}
                    onPointerEnter={() => setHoveredMirrorId(mirror.id)}
                    onPointerMove={() => setHoveredMirrorId(mirror.id)}
                    onPointerLeave={() => setHoveredMirrorId((current) => (current === mirror.id ? null : current))}
                    onFocus={() => setHoveredMirrorId(mirror.id)}
                    onBlur={() => setHoveredMirrorId((current) => (current === mirror.id ? null : current))}
                    onClick={() => {
                      if (phase === "mirrorArray") focusMirror(mirror.id)
                    }}
                    aria-label={
                      resonanceLevel === "primary"
                        ? `当前共鸣，照见${mirrorShortNameById[mirror.id]}`
                        : `照见潜在行为镜：${mirrorShortNameById[mirror.id]}`
                    }
                  >
                    <span className="side-mirror-surface" aria-hidden="true" />
                    <span className="side-mirror-glint" aria-hidden="true" />
                    <span className="side-mirror-name" aria-hidden="true">{mirrorShortNameById[mirror.id]}</span>
                  </button>
                )
              })}
            </div>

            {activeMirror && (phase === "thiefVisible" || phase === "readyForCycle") ? (
              <div
                className={cn(
                  "six-thief-orbit",
                  phase === "readyForCycle" && "is-cycling",
                  activeMirror.id === "conscience" && "is-quieted",
                )}
                aria-hidden="true"
              >
                <span className="thief-cycle-ring" />
                {sixThiefOrbit.map((thief) => {
                  const active = activeMirror.thief.includes(thief.id)

                  return (
                    <span
                      key={thief.id}
                      className={cn("thief-star", active && "is-active")}
                      style={{
                        "--thief-x": `${thief.x}px`,
                        "--thief-y": `${thief.y}px`,
                      } as CSSProperties}
                    >
                      {thief.id}
                    </span>
                  )
                })}
                {activeMirror.id === "conscience" ? (
                  <span className="virtue-orbit">
                    <i>知止</i>
                    <i>守心</i>
                    <i>执行</i>
                  </span>
                ) : null}
              </div>
            ) : null}

            {conscienceMirror && phase === "readyForCycle" && activeMirror?.id !== "conscience" ? (
              <div
                className="hidden-conscience is-awake"
              >
                <span>良知开始显影。</span>
                <small>看见情绪，仍按规则行动。</small>
              </div>
            ) : null}
          </div>

          <AnimatePresence mode="wait">
            {phase === "focusing" && activeMirror ? (
              <div
                key="thought-visible"
                className="mirror-reveal-copy mirror-reveal-copy-quiet is-visible"
              >
                <p className="reveal-label">镜面沉默</p>
              </div>
            ) : null}

            {phase === "subconsciousVisible" ? (
              <div
                key="subconscious-visible"
                className="mirror-reveal-copy mirror-reveal-copy-quiet is-visible"
              >
                <p className="reveal-label">水面下，有一句话先浮上来。</p>
              </div>
            ) : null}

            {phase === "revealed" ? (
              <div
                key="mirror-visible"
                className="mirror-reveal-copy is-visible"
              >
                <p className="behavior-proof">{activeMirror?.behavior}</p>
              </div>
            ) : null}

            {phase === "thiefVisible" ? (
              <div
                key="thief-visible"
                className="mirror-reveal-copy is-visible"
              >
                {activeMirror?.id === "conscience" ? (
                  <>
                    <p className="reveal-label">良知显影</p>
                    <p className="conscience-copy">知止 / 守心 / 执行</p>
                  </>
                ) : (
                  <>
                    <p className="reveal-label">心贼显现</p>
                    <div className="thief-root-list">
                      {activeMirror?.thief.map((thief) => (
                        <p key={thief}>
                          <span>{thief}</span>
                          {thiefExplanations[thief] ?? "这一念正在牵动你的手。"}
                        </p>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </AnimatePresence>

          {phase === "readyForCycle" ? (
            <button type="button" onClick={() => activeMirror && onComplete(activeMirror.id)} className="mirror-action-script mt-8">
              进入循环之镜
            </button>
          ) : phase === "mirrorArray" ? (
            <button type="button" onClick={revealCurrentMirror} className="mirror-action-script mirror-action-main mt-7">
              照见此念
            </button>
          ) : null}
        </div>
      ) : null}

      <style jsx>{`
        .nine-heart-mirror {
          position: relative;
          display: flex;
          width: 100%;
          min-height: calc(100svh - 2.5rem);
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background:
            radial-gradient(ellipse at 50% 68%, rgba(7, 19, 22, 0.4), transparent 38%),
            radial-gradient(ellipse at 50% 16%, rgba(20, 31, 31, 0.2), transparent 42%),
            linear-gradient(180deg, #000306 0%, #010506 38%, #030604 66%, #000101 100%);
          text-align: center;
        }

        .nine-heart-mirror::before {
          content: "";
          position: absolute;
          inset: -22% -46%;
          background:
            radial-gradient(circle at 50% 17%, rgba(210, 224, 230, 0.035), transparent 18%),
            radial-gradient(circle at 50% 46%, rgba(0, 0, 0, 0.58), transparent 24%),
            radial-gradient(circle at 50% 42%, rgba(88, 113, 103, 0.035), transparent 36%),
            radial-gradient(ellipse at 50% 82%, rgba(2, 9, 12, 0.52), transparent 58%);
          filter: blur(4px);
          opacity: 0.84;
          animation: gateway-breath 11s ease-in-out infinite;
          pointer-events: none;
        }

        .gateway-atmosphere {
          position: absolute;
          inset: -30% -54%;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .gateway-atmosphere::before,
        .gateway-atmosphere::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .gateway-atmosphere::before {
          background:
            radial-gradient(circle at 18% 34%, rgba(180, 157, 93, 0.18) 0 1px, transparent 2px),
            radial-gradient(circle at 78% 30%, rgba(180, 157, 93, 0.16) 0 1px, transparent 2px),
            radial-gradient(circle at 62% 76%, rgba(127, 37, 25, 0.16) 0 1px, transparent 2px),
            radial-gradient(circle at 30% 84%, rgba(180, 157, 93, 0.13) 0 1px, transparent 2px);
          opacity: 0.72;
          animation: far-dust-drift 28s ease-in-out infinite;
        }

        .gateway-atmosphere::after {
          inset: -2% 2%;
          background:
            linear-gradient(180deg, rgba(0, 2, 5, 0.72), rgba(0, 4, 6, 0.22) 42%, rgba(0, 0, 0, 0.52)),
            radial-gradient(ellipse at 50% 44%, rgba(3, 11, 14, 0.3), transparent 56%);
          filter: blur(22px);
          opacity: 0.74;
          animation: nebula-breathe 18s ease-in-out infinite;
        }

        .gateway-mist,
        .gateway-mountain,
        .gateway-star-line,
        .gateway-particle {
          position: absolute;
          display: block;
          pointer-events: none;
        }

        .gateway-mist {
          border-radius: 999px;
          filter: blur(18px);
          opacity: 0.45;
        }

        .mist-left {
          left: -3%;
          top: 12%;
          width: 62%;
          height: 26%;
          background: radial-gradient(ellipse, rgba(80, 112, 110, 0.08), transparent 68%);
          animation: mist-drift 18s ease-in-out infinite;
        }

        .mist-right {
          right: -4%;
          bottom: 8%;
          width: 66%;
          height: 30%;
          background: radial-gradient(ellipse, rgba(95, 132, 117, 0.1), transparent 70%);
          animation: mist-drift 22s ease-in-out infinite reverse;
        }

        .gateway-mountain {
          left: 50%;
          bottom: -3%;
          width: min(112vw, 560px);
          height: 118px;
          border-radius: 48% 52% 0 0;
          background: linear-gradient(180deg, rgba(22, 23, 19, 0), rgba(7, 7, 6, 0.78));
          clip-path: polygon(0 72%, 12% 56%, 27% 68%, 43% 38%, 56% 62%, 70% 32%, 83% 58%, 100% 44%, 100% 100%, 0 100%);
          opacity: 0.34;
          transform: translateX(-50%);
        }

        .mountain-front {
          bottom: -1%;
          width: min(120vw, 620px);
          height: 96px;
          opacity: 0.24;
          transform: translateX(-50%) scaleX(1.08);
        }

        .gateway-star-line {
          left: 50%;
          top: 49%;
          width: min(114vw, 560px);
          height: 164px;
          border: 1px solid rgba(180, 157, 93, 0.075);
          border-radius: 50%;
          transform: translate(-50%, -50%) rotate(-12deg);
        }

        .star-line-two {
          width: min(98vw, 486px);
          height: 118px;
          border-style: dashed;
          border-color: rgba(127, 37, 25, 0.12);
          transform: translate(-50%, -50%) rotate(18deg);
        }

        .gateway-particle {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(180, 157, 93, 0.72);
          box-shadow: 0 0 14px rgba(180, 157, 93, 0.28);
          opacity: 0.58;
          transition: transform 820ms cubic-bezier(0.22, 1, 0.36, 1), opacity 820ms ease;
          animation: particle-drift 15s linear infinite;
        }

        .particle-one {
          left: 16%;
          top: 26%;
        }

        .particle-two {
          right: 17%;
          top: 31%;
          animation-duration: 18s;
          animation-delay: -5s;
        }

        .particle-three {
          left: 26%;
          bottom: 23%;
          background: rgba(127, 37, 25, 0.66);
          animation-duration: 20s;
          animation-delay: -8s;
        }

        .particle-four {
          right: 31%;
          bottom: 18%;
          animation-duration: 22s;
          animation-delay: -11s;
        }

        .is-focusing .gateway-particle,
        .is-subconsciousVisible .gateway-particle,
        .is-revealed .gateway-particle,
        .is-thiefVisible .gateway-particle,
        .is-readyForCycle .gateway-particle {
          opacity: 0.78;
          animation-duration: 24s;
        }

        .is-focusing .particle-one,
        .is-subconsciousVisible .particle-one,
        .is-revealed .particle-one,
        .is-thiefVisible .particle-one,
        .is-readyForCycle .particle-one {
          transform: translate(34px, 42px);
        }

        .is-focusing .particle-two,
        .is-subconsciousVisible .particle-two,
        .is-revealed .particle-two,
        .is-thiefVisible .particle-two,
        .is-readyForCycle .particle-two {
          transform: translate(-38px, 36px);
        }

        .is-focusing .particle-three,
        .is-subconsciousVisible .particle-three,
        .is-revealed .particle-three,
        .is-thiefVisible .particle-three,
        .is-readyForCycle .particle-three {
          transform: translate(32px, -38px);
        }

        .is-focusing .particle-four,
        .is-subconsciousVisible .particle-four,
        .is-revealed .particle-four,
        .is-thiefVisible .particle-four,
        .is-readyForCycle .particle-four {
          transform: translate(-24px, -34px);
        }

        .gateway-empty-stage,
        .gateway-array-stage {
          position: relative;
          z-index: 1;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          animation: gateway-stage-in 760ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .gateway-empty-stage {
          --empty-mirror-size: clamp(196px, 56vw, 252px);
          --empty-copy-space: clamp(8.6rem, 22svh, 14rem);
          width: 100%;
          min-height: min(86svh, 720px);
          margin-left: 0;
          display: grid;
          grid-template-rows: var(--empty-mirror-size) var(--empty-copy-space);
          align-content: center;
          justify-items: center;
          gap: clamp(28px, 6svh, 46px);
        }

        .empty-heart-mirror {
          position: relative;
          display: grid;
          width: var(--empty-mirror-size);
          height: var(--empty-mirror-size);
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(216, 183, 111, 0.42);
          border-radius: 50%;
          background:
            linear-gradient(132deg, rgba(255, 255, 255, 0.13), transparent 19%, transparent 76%, rgba(255, 255, 255, 0.04)),
            radial-gradient(circle at 43% 31%, rgba(242, 235, 220, 0.14), transparent 18%),
            radial-gradient(circle at 50% 56%, rgba(95, 132, 117, 0.32), transparent 56%),
            linear-gradient(145deg, rgba(14, 43, 40, 0.92), rgba(5, 8, 8, 0.98));
          box-shadow:
            0 34px 96px rgba(0, 0, 0, 0.5),
            0 0 72px rgba(180, 157, 93, 0.13),
            inset 0 0 74px rgba(0, 0, 0, 0.58),
            inset 0 0 0 9px rgba(216, 183, 111, 0.055);
          animation: empty-mirror-rise 1.8s cubic-bezier(0.22, 1, 0.36, 1) both;
          outline: 1px solid rgba(216, 183, 111, 0.12);
          outline-offset: 8px;
        }

        .empty-heart-mirror::before {
          content: "";
          position: absolute;
          inset: 16px;
          border: 1px dashed rgba(220, 212, 195, 0.105);
          border-radius: inherit;
        }

        .empty-water {
          position: absolute;
          inset: 13%;
          border-radius: inherit;
          background:
            radial-gradient(circle at 50% 48%, rgba(216, 183, 111, 0.13), transparent 58%),
            repeating-radial-gradient(circle, rgba(220, 212, 195, 0.065) 0 1px, transparent 1px 15px);
          opacity: 0.48;
          animation: water-pulse 4.8s ease-in-out infinite;
        }

        .empty-ripple {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 52px;
          height: 52px;
          border: 1px solid rgba(216, 183, 111, 0.42);
          border-radius: 50%;
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.5);
          animation: empty-ripple-out 1.25s ease-out forwards;
        }

        .empty-copy {
          display: grid;
          min-height: var(--empty-copy-space);
          place-items: start center;
          margin: 0;
          font-family: var(--font-world);
          max-width: 9em;
          font-size: clamp(2.05rem, 9.4vw, 3.16rem);
          font-weight: 300;
          line-height: 1.42;
          letter-spacing: 0.11em;
          color: rgba(242, 235, 220, 0.82);
          animation: thought-rise 760ms cubic-bezier(0.22, 1, 0.36, 1) both;
          transform: translateX(0.055em);
        }

        .mirror-orbit-field {
          position: relative;
          width: 100vw;
          height: min(104svh, 680px);
          min-height: 560px;
          max-height: 720px;
          margin: 0 auto;
          perspective: 1540px;
          transform-style: preserve-3d;
        }

        .heart-water-plane {
          position: absolute;
          inset: 0;
          z-index: 12;
          display: block;
          width: 100%;
          height: 100%;
          cursor: pointer;
          opacity: 0.98;
          filter: saturate(0.9) brightness(0.9);
          pointer-events: auto;
          -webkit-tap-highlight-color: transparent;
        }

        .heart-lake-title {
          position: absolute;
          left: 0;
          right: 0;
          top: 0.92rem;
          z-index: 40;
          display: grid;
          gap: 0.22rem;
          font-family: var(--font-function);
          font-size: clamp(0.7rem, 2.55vw, 0.92rem);
          font-weight: 600;
          letter-spacing: 0.44em;
          color: rgba(214, 224, 228, 0.44);
          text-align: center;
          text-indent: 0.42em;
          text-shadow: 0 0 18px rgba(206, 224, 230, 0.08);
          pointer-events: none;
          animation: thought-rise 1.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .heart-lake-title span,
        .heart-lake-title small {
          display: block;
        }

        .heart-lake-title small {
          font-size: 0.5rem;
          font-weight: 500;
          letter-spacing: 0.2em;
          color: rgba(216, 183, 111, 0.42);
          text-indent: 0.2em;
        }

        .heart-lake-touch-hint {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 1.05rem;
          z-index: 72;
          font-family: var(--font-function);
          font-size: clamp(0.62rem, 2.1vw, 0.74rem);
          line-height: 1.7;
          letter-spacing: 0.16em;
          color: rgba(180, 195, 200, 0.36);
          text-align: center;
          pointer-events: none;
        }

        .heart-lake-voice {
          --lake-voice-rest-scale: 1;
          --lake-voice-peak-scale: 1.015;
          --lake-voice-brightness-low: 0.94;
          --lake-voice-brightness-high: 1.08;
          position: absolute;
          left: 50%;
          top: 63%;
          z-index: 66;
          display: grid;
          width: min(82%, 480px);
          min-height: 132px;
          place-items: center;
          color: rgba(242, 235, 220, 0.82);
          text-align: center;
          transform: translate(-50%, -50%) scale(var(--lake-voice-rest-scale));
          transition:
            opacity 620ms ease,
            filter 620ms ease,
            transform 820ms cubic-bezier(0.22, 1, 0.36, 1);
          animation: lake-voice-breathe 5.8s ease-in-out infinite;
          pointer-events: none;
        }

        .heart-lake-voice.is-absorbed {
          top: 62%;
        }

        .lake-voice-undercurrent {
          position: absolute;
          inset: 22% 8%;
          z-index: 0;
          border-radius: 50%;
          background:
            radial-gradient(ellipse at 50% 50%, rgba(216, 183, 111, 0.13), transparent 28%),
            radial-gradient(ellipse at 50% 60%, rgba(95, 132, 117, 0.14), transparent 60%);
          opacity: 0.38;
          filter: blur(14px);
          transform: scale(0.92);
          animation: lake-undercurrent-breathe 6.4s ease-in-out infinite;
          pointer-events: none;
        }

        .lake-deep-reflection {
          position: absolute;
          left: 50%;
          top: 58%;
          z-index: 1;
          display: grid;
          width: min(16em, 78%);
          place-items: center;
          opacity: 0;
          filter: blur(10px);
          transform: translate(-50%, -50%) translateY(32px) scale(0.96);
          transition:
            opacity 780ms ease,
            filter 780ms ease,
            transform 780ms cubic-bezier(0.22, 1, 0.36, 1);
          pointer-events: none;
        }

        .lake-deep-reflection span {
          font-family: var(--font-function);
          font-size: clamp(0.76rem, 2.4vw, 0.94rem);
          font-weight: 600;
          line-height: 1.5;
          letter-spacing: 0.18em;
          color: rgba(216, 183, 111, 0.42);
        }

        .is-subconsciousVisible .lake-deep-reflection,
        .is-revealed .lake-deep-reflection,
        .is-thiefVisible .lake-deep-reflection {
          opacity: 0.72;
          filter: blur(0.6px);
          transform: translate(-50%, -50%) translateY(56px) scale(1);
        }

        .heart-lake-voice .mirror-layer,
        .heart-lake-voice .mirror-silence {
          z-index: 3;
        }

        .heart-lake-voice .mirror-layer > span {
          font-size: clamp(1.16rem, 4.8vw, 1.52rem);
          line-height: 1.62;
          text-shadow:
            0 0 22px rgba(206, 224, 230, 0.1),
            0 12px 34px rgba(0, 0, 0, 0.42);
        }

        .heart-lake-voice .mirror-layer:not(.is-thought) > span {
          font-size: clamp(1.44rem, 6.2vw, 2rem);
        }

        .is-readyForCycle .heart-lake-voice .mirror-layer > span {
          max-width: 16em;
          font-family: var(--font-narrative);
          font-size: clamp(1.02rem, 4vw, 1.28rem);
          line-height: 1.72;
          letter-spacing: 0.045em;
          color: rgba(242, 235, 220, 0.78);
        }

        .is-readyForCycle .heart-lake-voice .mirror-layer small {
          margin-bottom: 0.34rem;
          opacity: 0.72;
        }

        .heart-lake-voice .mirror-layer em {
          color: rgba(220, 212, 195, 0.56);
        }

        .gravity-fog {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 4;
          width: min(84vw, 520px);
          height: min(84vw, 520px);
          border-radius: 50%;
          background:
            radial-gradient(circle, rgba(0, 0, 0, 0.22), transparent 31%),
            radial-gradient(circle, rgba(95, 132, 117, 0.07), transparent 58%),
            radial-gradient(circle, rgba(216, 183, 111, 0.045), transparent 72%);
          opacity: 0.76;
          filter: blur(12px);
          transform: translate(-50%, -50%) translateZ(-210px);
          pointer-events: none;
        }

        .causal-hint {
          position: absolute;
          left: calc(50% - clamp(132px, 35vw, 176px));
          top: calc(50% - clamp(120px, 32vw, 154px));
          z-index: 72;
          display: grid;
          gap: 0.18rem;
          max-width: 9.8em;
          padding-left: 0.8rem;
          text-align: left;
          transform: translateZ(92px);
          pointer-events: none;
          animation: thought-rise 780ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .causal-hint::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0.18rem;
          bottom: 0.18rem;
          width: 1px;
          background: linear-gradient(180deg, rgba(180, 157, 93, 0), rgba(180, 157, 93, 0.5), rgba(180, 157, 93, 0));
          opacity: 0.58;
        }

        .causal-hint span {
          font-family: var(--font-function);
          font-size: 0.58rem;
          font-weight: 600;
          line-height: 1.25;
          letter-spacing: 0.18em;
          color: rgba(180, 157, 93, 0.54);
        }

        .causal-hint strong {
          font-family: var(--font-narrative);
          font-size: clamp(0.78rem, 2.4vw, 0.92rem);
          font-weight: 300;
          line-height: 1.48;
          letter-spacing: 0.06em;
          color: rgba(242, 220, 168, 0.76);
        }

        .orbit-ring {
          position: absolute;
          left: 50%;
          top: 70%;
          width: min(142vw, 1080px);
          height: min(52vw, 360px);
          border: 1px solid rgba(180, 157, 93, 0.04);
          border-radius: 50%;
          pointer-events: none;
          transform-style: preserve-3d;
        }

        .orbit-ring::before,
        .orbit-ring::after {
          content: "";
          position: absolute;
          inset: 8% -9%;
          border: 1px solid rgba(180, 157, 93, 0.036);
          border-radius: inherit;
          pointer-events: none;
        }

        .orbit-ring::after {
          inset: 20% -18%;
          border-color: rgba(127, 37, 25, 0.052);
          border-style: dashed;
        }

        .orbit-ring-deep {
          z-index: 6;
          width: min(160vw, 1220px);
          height: min(58vw, 410px);
          opacity: 0.18;
          border-color: rgba(95, 132, 117, 0.036);
          transform: translate(-50%, -50%) translateZ(-260px) rotateX(70deg) rotateZ(31deg);
          filter: blur(1.1px);
        }

        .orbit-ring-back {
          z-index: 8;
          opacity: 0.26;
          transform: translate(-50%, -50%) translateZ(-178px) rotateX(65deg) rotateZ(-15deg);
          filter: blur(0.32px);
        }

        .orbit-ring-front {
          z-index: 70;
          width: min(148vw, 1120px);
          height: min(43vw, 300px);
          opacity: 0.2;
          border-color: rgba(216, 183, 111, 0.07);
          transform: translate(-50%, -50%) translateZ(128px) rotateX(68deg) rotateZ(16deg);
          mix-blend-mode: screen;
          filter: blur(0.05px);
        }

        .orbit-ring-front::before {
          inset: 15% -12%;
          border-color: rgba(216, 183, 111, 0.066);
        }

        .orbit-ring-front::after {
          inset: 29% -22%;
          border-color: rgba(127, 37, 25, 0.066);
        }

        .gravity-line {
          --gravity-current-length: var(--gravity-length);
          --gravity-current-angle: var(--gravity-angle);
          position: absolute;
          left: 50%;
          top: 70%;
          z-index: 46;
          width: var(--gravity-current-length);
          height: 1px;
          background: linear-gradient(90deg, rgba(216, 183, 111, 0.2), rgba(216, 183, 111, 0.044), transparent);
          opacity: 0.34;
          transform: translateY(-50%) rotate(var(--gravity-current-angle));
          transform-origin: left center;
          filter: blur(0.2px);
          pointer-events: none;
          animation: gravity-line-listen 3.8s ease-in-out infinite;
        }

        .gravity-line::before {
          content: "";
          position: absolute;
          left: 0;
          top: 50%;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(216, 183, 111, 0.16), transparent 66%);
          opacity: 0.72;
          transform: translate(-50%, -50%);
        }

        .orbit-mirrors {
          position: absolute;
          inset: 0;
          z-index: 34;
          transform-style: preserve-3d;
          pointer-events: none;
        }

        .is-focusing .orbit-mirrors,
        .is-subconsciousVisible .orbit-mirrors,
        .is-revealed .orbit-mirrors,
        .is-thiefVisible .orbit-mirrors,
        .is-readyForCycle .orbit-mirrors {
          opacity: 0.2;
        }

        .heart-mirror-main,
        .heart-mirror-side {
          border: 1px solid rgba(216, 183, 111, 0.31);
          background:
            linear-gradient(132deg, rgba(255, 255, 255, 0.13), transparent 19%, transparent 76%, rgba(255, 255, 255, 0.04)),
            radial-gradient(circle at 43% 31%, rgba(242, 235, 220, 0.12), transparent 18%),
            radial-gradient(circle at 50% 56%, rgba(95, 132, 117, 0.3), transparent 56%),
            repeating-radial-gradient(circle, rgba(220, 212, 195, 0.045) 0 1px, transparent 1px 15px),
            linear-gradient(145deg, rgba(14, 43, 40, 0.88), rgba(5, 8, 8, 0.98));
          color: rgba(242, 235, 220, 0.78);
          box-shadow:
            0 26px 72px rgba(0, 0, 0, 0.42),
            inset 0 1px 0 rgba(255, 255, 255, 0.07);
          font: inherit;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .heart-mirror-main {
          --touch-intensity: 0;
          --touch-highlight-alpha: 0.1;
          --touch-highlight-soft: 0.055;
          --touch-glint-alpha: 0.11;
          --touch-glint-soft: 0.06;
          --touch-water-alpha: 0.28;
          --touch-water-soft: 0.15;
          --touch-ripple-alpha: 0.2;
          --touch-reflection-alpha: 0.08;
          --touch-deep-opacity: 0.28;
          --touch-deep-blur: 2.4px;
          --touch-deep-scale: 0.94;
          --touch-shift: 0px;
          --mirror-rest-scale: 1;
          --mirror-peak-scale: 1.015;
          --mirror-brightness-low: 0.95;
          --mirror-brightness-high: 1.08;
          --mirror-glow-low: 0.12;
          --mirror-glow-high: 0.2;
          position: absolute;
          left: 50%;
          top: 70%;
          z-index: 50;
          display: grid;
          width: clamp(184px, 52vw, 222px);
          aspect-ratio: 1;
          height: auto;
          transform: translate(-50%, -50%) scale(var(--mirror-rest-scale));
          place-items: center;
          overflow: hidden;
          border-radius: 50%;
          isolation: isolate;
          background:
            radial-gradient(circle at 50% 34%, rgba(217, 236, 244, 0.16), transparent 25%),
            radial-gradient(circle at 50% 57%, rgba(55, 98, 111, 0.22), transparent 68%),
            linear-gradient(145deg, rgba(8, 24, 34, 0.96), rgba(2, 7, 12, 0.99));
          transition:
            border-color 640ms ease,
            box-shadow 640ms ease,
            transform 820ms cubic-bezier(0.22, 1, 0.36, 1);
          animation: mirror-breathe 5.8s ease-in-out infinite;
          cursor: default;
          outline: 1px solid rgba(216, 183, 111, 0.1);
          outline-offset: 7px;
        }

        .heart-mirror-main::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background:
            radial-gradient(circle at 50% 33%, rgba(222, 238, 244, 0.2), transparent 24%),
            radial-gradient(ellipse at 50% 56%, rgba(202, 234, 242, 0.08), transparent 42%),
            radial-gradient(circle at 50% 50%, transparent 0 40%, rgba(216, 183, 111, 0.045) 43%, transparent 47%);
          opacity: 0.38;
          mix-blend-mode: screen;
          pointer-events: none;
        }

        .mirror-water-canvas {
          position: absolute;
          inset: 5%;
          z-index: 1;
          width: 90%;
          height: 90%;
          border-radius: 50%;
          opacity: 0.96;
          mix-blend-mode: normal;
          pointer-events: none;
          filter: saturate(0.95) brightness(1.08);
          transform: scale(1.02);
        }

        .mirror-moon {
          position: absolute;
          left: 50%;
          top: 18%;
          z-index: 1;
          width: 34%;
          aspect-ratio: 1;
          border-radius: 50%;
          background:
            radial-gradient(circle at 48% 38%, rgba(238, 250, 252, 0.88), rgba(211, 233, 240, 0.5) 48%, rgba(155, 184, 194, 0.16) 76%, transparent 78%);
          opacity: 0.42;
          filter: blur(0.35px);
          transform: translate(-50%, -50%);
          box-shadow:
            0 0 28px rgba(196, 225, 236, 0.18),
            0 0 70px rgba(196, 225, 236, 0.08);
          mix-blend-mode: screen;
          pointer-events: none;
          animation: moon-still-breathe 8.8s ease-in-out infinite;
        }

        .mirror-moon-reflection {
          position: absolute;
          left: 50%;
          top: 43%;
          z-index: 1;
          width: 20%;
          height: 30%;
          border-radius: 50% 50% 46% 46%;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(238, 250, 252, 0.48), rgba(215, 239, 246, 0.2) 30%, transparent 74%),
            linear-gradient(180deg, rgba(238, 250, 252, 0.24), transparent 78%);
          opacity: 0.38;
          filter: blur(2.4px);
          transform: translateX(-50%);
          mix-blend-mode: screen;
          pointer-events: none;
          animation: moon-reflection-breathe 7.2s ease-in-out infinite;
        }

        .mirror-living-water {
          position: absolute;
          inset: 7%;
          z-index: 0;
          border-radius: inherit;
          background:
            radial-gradient(circle at 50% 50%, transparent 0 26%, rgba(95, 132, 117, 0.12) 28%, transparent 58%),
            radial-gradient(ellipse at 46% 32%, rgba(242, 235, 220, 0.032), transparent 18%),
            repeating-radial-gradient(circle at 50% 50%, rgba(220, 212, 195, 0.032) 0 1px, transparent 1px 14px);
          opacity: 0.34;
          filter: blur(0.35px);
          mix-blend-mode: screen;
          pointer-events: none;
          animation: living-water-breathe 6.2s ease-in-out infinite;
        }

        .mirror-depth-chamber {
          position: absolute;
          inset: 13%;
          z-index: 0;
          border-radius: inherit;
          background:
            radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.96), rgba(1, 3, 3, 0.9) 24%, transparent 36%),
            radial-gradient(circle at 50% 55%, rgba(4, 18, 18, 0.78), rgba(3, 7, 7, 0.5) 48%, transparent 68%),
            repeating-radial-gradient(circle at 50% 50%, rgba(220, 212, 195, 0.028) 0 1px, transparent 1px 18px);
          box-shadow:
            inset 0 0 58px rgba(0, 0, 0, 0.72),
            inset 0 0 120px rgba(0, 0, 0, 0.34);
          opacity: 0.28;
          transform: scale(0.95);
          pointer-events: none;
          animation: depth-chamber-breathe 7.4s ease-in-out infinite;
        }

        .mirror-event-horizon {
          position: absolute;
          inset: 8%;
          z-index: 1;
          border-radius: inherit;
          background:
            radial-gradient(circle, transparent 61%, rgba(216, 183, 111, 0.12) 62%, transparent 66%),
            conic-gradient(from 210deg, transparent, rgba(216, 183, 111, 0.1), transparent 34%, rgba(95, 132, 117, 0.08), transparent 72%, rgba(127, 37, 25, 0.06), transparent);
          opacity: 0.34;
          mix-blend-mode: screen;
          pointer-events: none;
          animation: event-horizon-breathe 6.4s ease-in-out infinite;
        }

        .mirror-vortex {
          position: absolute;
          inset: 28%;
          z-index: 1;
          border-radius: inherit;
          background:
            radial-gradient(circle, rgba(0, 0, 0, 0.98) 0 27%, transparent 42%),
            conic-gradient(from 140deg, rgba(216, 183, 111, 0.075), transparent 18%, rgba(95, 132, 117, 0.06), transparent 45%, rgba(216, 183, 111, 0.045), transparent 78%, rgba(127, 37, 25, 0.045), transparent);
          opacity: 0.18;
          filter: blur(0.25px);
          mix-blend-mode: screen;
          pointer-events: none;
          animation: vortex-turn 18s linear infinite;
        }

        .mirror-inner-stillness {
          position: absolute;
          inset: 31%;
          z-index: 1;
          border-radius: inherit;
          background:
            radial-gradient(circle, rgba(0, 0, 0, 0.54), transparent 34%),
            radial-gradient(circle, rgba(95, 132, 117, 0.12), transparent 70%);
          opacity: 0.44;
          filter: blur(0.45px);
          pointer-events: none;
          animation: inner-stillness-listen 5.8s ease-in-out infinite;
        }

        .mirror-rim-inscription {
          position: absolute;
          left: 50%;
          top: 14%;
          z-index: 4;
          font-family: var(--font-function);
          font-size: 0.56rem;
          font-weight: 600;
          letter-spacing: 0.2em;
          color: rgba(180, 157, 93, 0.3);
          opacity: 0.46;
          transform: translateX(-50%);
          pointer-events: none;
          transition: opacity 720ms ease, filter 720ms ease;
        }

        .is-focusing .mirror-rim-inscription,
        .is-subconsciousVisible .mirror-rim-inscription,
        .is-revealed .mirror-rim-inscription,
        .is-thiefVisible .mirror-rim-inscription,
        .is-readyForCycle .mirror-rim-inscription {
          opacity: 0.22;
          filter: blur(0.4px);
        }

        .heart-mirror-main:hover,
        .heart-mirror-main:focus-visible {
          border-color: rgba(216, 183, 111, 0.55);
          outline-color: rgba(216, 183, 111, 0.2);
          box-shadow:
            0 32px 88px rgba(0, 0, 0, 0.5),
            0 0 82px rgba(180, 157, 93, 0.16),
            inset 0 0 76px rgba(0, 0, 0, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .mirror-deep-reflection {
          position: absolute;
          inset: 0;
          z-index: 1;
          display: grid;
          place-items: end center;
          padding-bottom: 38px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 68%, rgba(5, 8, 8, 0.28), transparent 44%),
            repeating-radial-gradient(circle, rgba(220, 212, 195, 0.035) 0 1px, transparent 1px 14px);
          opacity: calc(var(--touch-deep-opacity) + 0.18);
          filter: blur(0.9px);
          transform: scale(var(--touch-deep-scale));
          pointer-events: none;
        }

        .mirror-deep-reflection span {
          max-width: 10em;
          font-family: var(--font-function);
          font-size: 0.72rem;
          line-height: 1.52;
          letter-spacing: 0.12em;
          color: rgba(216, 183, 111, 0.48);
          transform: translateY(4px);
        }

        .is-focusing .mirror-deep-reflection {
          opacity: 0;
          filter: blur(6px);
        }

        .is-subconsciousVisible .mirror-deep-reflection,
        .is-revealed .mirror-deep-reflection,
        .is-thiefVisible .mirror-deep-reflection,
        .is-readyForCycle .mirror-deep-reflection {
          opacity: 0.12;
        }

        .is-subconsciousVisible .mirror-deep-reflection {
          opacity: 0.62;
          filter: blur(0.45px);
          transform: scale(0.98) translateY(-2px);
        }

        .mirror-front-reflection {
          position: absolute;
          inset: -22% -18% 46%;
          z-index: 5;
          border-radius: 50%;
          background:
            radial-gradient(ellipse at 42% 28%, rgba(242, 235, 220, var(--touch-reflection-alpha)), transparent 36%),
            radial-gradient(ellipse at 62% 44%, rgba(95, 132, 117, 0.042), transparent 46%);
          opacity: 0.055;
          transform: translateX(var(--touch-shift));
          animation: front-reflection-glide 10.8s ease-in-out infinite;
          mix-blend-mode: screen;
          pointer-events: none;
        }

        .heart-mirror-main.is-absorbed {
          border-color: rgba(216, 183, 111, 0.46);
          box-shadow:
            0 34px 104px rgba(0, 0, 0, 0.52),
            0 0 76px rgba(180, 157, 93, 0.14),
            inset 0 0 74px rgba(0, 0, 0, 0.58),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .heart-mirror-main::after {
          content: "";
          position: absolute;
          inset: 19%;
          border-radius: inherit;
          background: radial-gradient(circle, rgba(216, 183, 111, 0.13), transparent 62%);
          opacity: 0;
          transform: scale(0.62);
          pointer-events: none;
        }

        .is-focusing .heart-mirror-main::after {
          animation: mirror-ripple 880ms ease-out forwards;
        }

        .is-subconsciousVisible .heart-mirror-main::after,
        .is-revealed .heart-mirror-main::after,
        .is-thiefVisible .heart-mirror-main::after {
          animation: mirror-ripple 1.05s ease-out forwards;
        }

        .is-readyForCycle .heart-mirror-main {
          animation-duration: 8.2s;
        }

        .is-mirrorArray .heart-mirror-main::after {
          animation: mirror-breath-ripple 5.6s ease-in-out infinite;
        }

        .mirror-water-ripple {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 70%;
          height: 70%;
          border: 1px solid rgba(216, 183, 111, var(--touch-ripple-alpha));
          border-radius: 50%;
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.3);
          pointer-events: none;
        }

        .mirror-water-ripple-one {
          animation: mirror-surface-ripple 1.3s ease-out forwards, mirror-surface-ripple 3.6s ease-out 2s infinite;
        }

        .mirror-water-ripple-two {
          animation: mirror-surface-ripple 1.3s ease-out 420ms forwards, mirror-surface-ripple 3.9s ease-out 3.1s infinite;
        }

        .mirror-water-ripple-three {
          animation: mirror-surface-ripple 1.3s ease-out 820ms forwards, mirror-surface-ripple 4.2s ease-out 4s infinite;
        }

        .is-focusing .mirror-water-ripple {
          border-color: rgba(216, 183, 111, 0.46);
        }

        .is-focusing .mirror-water-ripple-one {
          animation: mirror-click-ripple 1.05s ease-out forwards;
        }

        .is-focusing .mirror-water-ripple-two {
          animation: mirror-click-ripple 1.05s ease-out 160ms forwards;
        }

        .is-focusing .mirror-water-ripple-three {
          animation: mirror-click-ripple 1.05s ease-out 300ms forwards;
        }

        .mirror-crack {
          position: absolute;
          z-index: 2;
          inset: 20%;
          opacity: 0;
          background:
            linear-gradient(118deg, transparent 0 44%, rgba(220, 212, 195, 0.14) 45%, transparent 47%),
            linear-gradient(32deg, transparent 0 54%, rgba(220, 212, 195, 0.11) 55%, transparent 57%);
          filter: blur(0.2px);
          transform: scale(0.7);
        }

        .mirror-layer,
        .mirror-silence {
          position: relative;
          z-index: 3;
          display: grid;
          width: 82%;
          place-items: center;
          white-space: pre-line;
          animation: thought-rise 920ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .mirror-layer small {
          margin-bottom: 0.5rem;
          font-family: var(--font-function);
          font-size: 0.64rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: rgba(180, 157, 93, 0.66);
        }

        .mirror-layer > span {
          font-family: var(--font-narrative);
          font-size: clamp(1.05rem, 4.8vw, 1.28rem);
          font-weight: 300;
          line-height: 1.62;
          letter-spacing: 0.045em;
          color: rgba(242, 235, 220, 0.88);
        }

        .mirror-layer:not(.is-thought) > span {
          font-family: var(--font-world);
          font-size: clamp(1.28rem, 6vw, 1.72rem);
          line-height: 1.42;
          letter-spacing: 0.1em;
          color: rgba(242, 220, 168, 0.88);
          text-shadow: 0 0 22px rgba(216, 183, 111, 0.14);
        }

        .mirror-layer.is-subconscious {
          width: 74%;
          animation: subconscious-reflection-rise 960ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .mirror-layer.is-subconscious > span {
          font-family: var(--font-function);
          font-size: clamp(0.86rem, 3vw, 1.02rem);
          font-weight: 600;
          line-height: 1.5;
          letter-spacing: 0.16em;
          color: rgba(216, 183, 111, 0.64);
          text-shadow: 0 0 20px rgba(216, 183, 111, 0.14);
        }

        .mirror-layer em {
          max-width: 14em;
          margin-top: 0.7rem;
          font-family: var(--font-function);
          font-size: 0.64rem;
          font-style: normal;
          line-height: 1.62;
          letter-spacing: 0.045em;
          color: rgba(220, 212, 195, 0.48);
        }

        .mirror-silence {
          width: 42%;
          height: 42%;
          border-radius: 50%;
          background:
            radial-gradient(circle, rgba(216, 183, 111, 0.12), transparent 46%),
            repeating-radial-gradient(circle, rgba(220, 212, 195, 0.08) 0 1px, transparent 1px 13px);
          opacity: 0.54;
          animation: silence-pulse 820ms ease-in-out both;
        }

        .is-revealed .mirror-crack,
        .is-thiefVisible .mirror-crack,
        .is-readyForCycle .mirror-crack {
          animation: crack-reveal 820ms ease-out forwards;
        }

        .mirror-thought,
        .mirror-name {
          position: relative;
          z-index: 2;
          display: block;
        }

        .mirror-thought {
          width: 82%;
          align-self: center;
          white-space: pre-line;
          font-family: var(--font-narrative);
          font-size: clamp(1.08rem, 5vw, 1.28rem);
          font-weight: 300;
          line-height: 1.68;
          letter-spacing: 0.045em;
          color: rgba(242, 235, 220, 0.88);
          animation: thought-rise 960ms cubic-bezier(0.22, 1, 0.36, 1) both;
          transition:
            opacity 720ms ease,
            transform 720ms cubic-bezier(0.22, 1, 0.36, 1),
            filter 720ms ease;
        }

        .mirror-name {
          min-height: 1.5em;
          align-self: center;
          font-family: var(--font-world);
          font-size: clamp(1.45rem, 6.8vw, 2.08rem);
          font-weight: 300;
          letter-spacing: 0.13em;
          color: rgba(216, 183, 111, 0.76);
          transform: translateX(0.06em);
          animation: name-reveal 620ms ease both;
        }

        .is-focusing .mirror-thought {
          opacity: 0.68;
          filter: blur(0.6px);
          transform: translateY(-4px);
        }

        .is-revealed .mirror-thought,
        .is-thiefVisible .mirror-thought,
        .is-readyForCycle .mirror-thought {
          opacity: 0.17;
          filter: blur(1.6px);
          transform: translateY(-30px) scale(0.92);
        }

        .is-revealed .mirror-name,
        .is-thiefVisible .mirror-name,
        .is-readyForCycle .mirror-name {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 90%;
          transform: translate(-50%, -50%) translateX(0.06em);
          color: rgba(242, 220, 168, 0.9);
          text-shadow: 0 0 22px rgba(216, 183, 111, 0.16);
        }

        .heart-mirror-side {
          --mirror-hover-scale: 1;
          --mirror-flow-duration: 16s;
          --mirror-flow-delay: 0s;
          --mirror-drift-x: 5px;
          --mirror-drift-y: -6px;
          --mirror-counter-x: -4px;
          --mirror-counter-y: 4px;
          --mirror-scene-x: var(--mirror-x);
          --mirror-scene-y: var(--mirror-y);
          --mirror-current-pull-x: var(--mirror-pull-x);
          --mirror-current-pull-y: var(--mirror-pull-y);
          --mirror-depth: -48px;
          --mirror-breath-duration: 8s;
          --side-surface-low: 0.28;
          --side-surface-high: 0.46;
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: var(--mirror-z-index);
          display: grid;
          width: clamp(62px, 14vw, 82px);
          height: clamp(78px, 17vw, 104px);
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(216, 183, 111, 0.3);
          border-radius: 50%;
          opacity: var(--mirror-opacity);
          pointer-events: auto;
          filter: blur(var(--mirror-blur));
          background:
            linear-gradient(140deg, rgba(85, 66, 36, 0.5), rgba(16, 13, 9, 0.72)),
            radial-gradient(ellipse at 50% 54%, rgba(216, 183, 111, 0.1), transparent 62%);
          box-shadow:
            0 18px 46px rgba(0, 0, 0, 0.34),
            0 0 28px rgba(180, 157, 93, var(--mirror-shadow)),
            inset 0 0 0 5px rgba(216, 183, 111, 0.045),
            inset 0 1px 0 rgba(255, 255, 255, 0.07);
          scale: var(--mirror-hover-scale);
          transform: translate(-50%, -50%) translate3d(var(--mirror-scene-x), var(--mirror-scene-y), var(--mirror-depth)) scale(var(--mirror-scale)) rotateY(var(--mirror-rotate-y));
          transform-style: preserve-3d;
          transition:
            opacity 520ms ease,
            scale 220ms cubic-bezier(0.22, 1, 0.36, 1),
            transform 820ms cubic-bezier(0.22, 1, 0.36, 1),
            border-color 520ms ease,
            filter 520ms ease;
          animation: subconscious-float var(--mirror-flow-duration) ease-in-out var(--mirror-flow-delay) infinite;
        }

        .heart-mirror-side::before {
          content: "";
          position: absolute;
          inset: 8%;
          border-radius: inherit;
          background:
            radial-gradient(ellipse at 50% 52%, rgba(11, 36, 34, 0.82), rgba(5, 8, 8, 0.86) 62%, transparent 64%),
            repeating-radial-gradient(ellipse at 50% 52%, rgba(220, 212, 195, 0.045) 0 1px, transparent 1px 12px);
          box-shadow:
            inset 0 0 32px rgba(0, 0, 0, 0.68),
            inset 0 0 0 1px rgba(216, 183, 111, 0.18);
          opacity: 0.76;
          pointer-events: none;
        }

        .heart-mirror-side::after {
          content: "";
          position: absolute;
          inset: 15% 19% 58% 19%;
          border-radius: inherit;
          background: linear-gradient(105deg, transparent, rgba(242, 235, 220, 0.16), transparent);
          opacity: 0.46;
          transform: rotate(-12deg);
          pointer-events: none;
        }

        .side-mirror-surface {
          position: absolute;
          inset: 14%;
          z-index: 1;
          border-radius: inherit;
          background:
            radial-gradient(circle at 45% 35%, rgba(242, 235, 220, 0.1), transparent 19%),
            radial-gradient(ellipse at 50% 58%, rgba(95, 132, 117, 0.18), transparent 62%),
            repeating-radial-gradient(ellipse at 50% 54%, rgba(220, 212, 195, 0.035) 0 1px, transparent 1px 11px);
          opacity: var(--side-surface-low);
          pointer-events: none;
          animation: side-surface-breathe var(--mirror-breath-duration) ease-in-out var(--mirror-flow-delay) infinite;
        }

        .side-mirror-glint {
          position: absolute;
          left: 19%;
          top: 32%;
          z-index: 2;
          display: block;
          width: 62%;
          height: 1px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(242, 235, 220, 0.18), transparent);
          opacity: 0.54;
          transform: rotate(-14deg);
        }

        .side-mirror-name {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 3;
          width: 5.8em;
          font-family: var(--font-function);
          font-size: 0.5rem;
          font-weight: 600;
          line-height: 1.35;
          letter-spacing: 0.08em;
          color: rgba(242, 220, 168, 0.66);
          opacity: 0.48;
          transform: translate(-50%, -50%);
          transition:
            opacity 220ms ease,
            transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
          pointer-events: none;
        }

        .heart-mirror-side.is-conscience {
          opacity: 0.14;
          filter: blur(1.8px);
        }

        .is-readyForCycle .heart-mirror-side.is-conscience,
        .hidden-conscience.is-awake {
          opacity: 0.58;
          filter: blur(0);
        }

        .heart-mirror-side:hover,
        .heart-mirror-side:focus-visible,
        .heart-mirror-side.is-hovered {
          --mirror-hover-scale: 1.08;
          opacity: 0.78;
          border-color: rgba(216, 183, 111, 0.34);
          outline: none;
          filter: blur(0.1px) brightness(1.12);
          box-shadow:
            0 18px 50px rgba(0, 0, 0, 0.42),
            0 0 24px rgba(216, 183, 111, 0.07),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .heart-mirror-side.is-resonant {
          opacity: 0.86;
          border-color: rgba(216, 183, 111, 0.56);
          filter: blur(0) brightness(1.14);
          box-shadow:
            0 22px 64px rgba(0, 0, 0, 0.46),
            0 0 44px rgba(180, 157, 93, 0.16),
            inset 0 0 0 5px rgba(216, 183, 111, 0.07),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
          animation:
            subconscious-float var(--mirror-flow-duration) ease-in-out var(--mirror-flow-delay) infinite,
            resonant-mirror-breathe 4.8s ease-in-out infinite;
        }

        .heart-mirror-side.motion-dart {
          animation-name: mirror-dart-float;
          animation-timing-function: cubic-bezier(0.3, 0, 0.18, 1);
        }

        .heart-mirror-side.motion-heavy {
          animation-name: mirror-heavy-float;
          animation-timing-function: cubic-bezier(0.45, 0, 0.3, 1);
        }

        .heart-mirror-side.motion-swing {
          animation-name: mirror-swing-float;
        }

        .heart-mirror-side.motion-follow {
          animation-name: mirror-follow-float;
        }

        .heart-mirror-side.motion-waver {
          animation-name: mirror-waver-float;
        }

        .heart-mirror-side.motion-lag {
          animation-name: mirror-lag-float;
        }

        .heart-mirror-side.motion-tremble {
          animation-name: mirror-tremble-float;
        }

        .heart-mirror-side.motion-steady {
          animation-name: mirror-steady-float;
        }

        .heart-mirror-side.is-resonant.motion-dart {
          animation:
            mirror-dart-float var(--mirror-flow-duration) cubic-bezier(0.3, 0, 0.18, 1) var(--mirror-flow-delay) infinite,
            resonant-mirror-breathe 4.8s ease-in-out infinite;
        }

        .heart-mirror-side.is-resonant.motion-heavy {
          animation:
            mirror-heavy-float var(--mirror-flow-duration) cubic-bezier(0.45, 0, 0.3, 1) var(--mirror-flow-delay) infinite,
            resonant-mirror-breathe 5.6s ease-in-out infinite;
        }

        .heart-mirror-side.is-resonant.motion-swing {
          animation:
            mirror-swing-float var(--mirror-flow-duration) ease-in-out var(--mirror-flow-delay) infinite,
            resonant-mirror-breathe 4.9s ease-in-out infinite;
        }

        .heart-mirror-side.is-resonant.motion-follow {
          animation:
            mirror-follow-float var(--mirror-flow-duration) ease-in-out var(--mirror-flow-delay) infinite,
            resonant-mirror-breathe 5.1s ease-in-out infinite;
        }

        .heart-mirror-side.is-resonant.motion-waver {
          animation:
            mirror-waver-float var(--mirror-flow-duration) ease-in-out var(--mirror-flow-delay) infinite,
            resonant-mirror-breathe 4.7s ease-in-out infinite;
        }

        .heart-mirror-side.is-resonant.motion-lag {
          animation:
            mirror-lag-float var(--mirror-flow-duration) ease-in-out var(--mirror-flow-delay) infinite,
            resonant-mirror-breathe 5.8s ease-in-out infinite;
        }

        .heart-mirror-side.is-resonant.motion-tremble {
          animation:
            mirror-tremble-float var(--mirror-flow-duration) ease-in-out var(--mirror-flow-delay) infinite,
            resonant-mirror-breathe 4.6s ease-in-out infinite;
        }

        .heart-mirror-side.is-resonant.motion-steady {
          animation:
            mirror-steady-float var(--mirror-flow-duration) ease-in-out var(--mirror-flow-delay) infinite,
            resonant-mirror-breathe 6.4s ease-in-out infinite;
        }

        .heart-mirror-side.is-resonant .side-mirror-name {
          opacity: 0.92;
          color: rgba(242, 220, 168, 0.9);
        }

        .heart-mirror-side.is-resonant .side-mirror-surface {
          opacity: 0.84;
        }

        .heart-mirror-side.is-secondary-resonant {
          opacity: 0.62;
          border-color: rgba(216, 183, 111, 0.42);
          filter: blur(0.45px) brightness(1.08);
          box-shadow:
            0 19px 54px rgba(0, 0, 0, 0.42),
            0 0 30px rgba(180, 157, 93, 0.1),
            inset 0 0 0 5px rgba(216, 183, 111, 0.055),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .heart-mirror-side.is-secondary-resonant .side-mirror-name {
          opacity: 0.74;
          color: rgba(242, 220, 168, 0.78);
        }

        .heart-mirror-side.is-tertiary-resonant {
          opacity: 0.48;
          border-color: rgba(216, 183, 111, 0.34);
          filter: blur(0.85px) brightness(1.04);
        }

        .heart-mirror-side.is-tertiary-resonant .side-mirror-name {
          opacity: 0.58;
        }

        .heart-mirror-side:hover .side-mirror-name,
        .heart-mirror-side:focus-visible .side-mirror-name,
        .heart-mirror-side.is-hovered .side-mirror-name {
          opacity: 0.88;
          transform: translate(-50%, -50%) scale(1.02);
        }

        .slot-top {
          left: 50%;
          top: 3%;
          z-index: 15;
          opacity: 0.42;
          filter: blur(1.2px);
          transform: translate(-50%, -50%) translateZ(-120px) scale(0.72);
          animation: mirror-float-a 12s ease-in-out infinite;
        }

        .slot-upper-right {
          left: 78%;
          top: 16%;
          z-index: 28;
          opacity: 0.62;
          filter: blur(0.6px);
          transform: translate(-50%, -50%) translateZ(-44px) scale(0.86) rotateY(-10deg);
          animation: mirror-float-b 13s ease-in-out infinite;
        }

        .slot-right {
          left: 91%;
          top: 50%;
          z-index: 38;
          opacity: 0.76;
          filter: blur(0.2px);
          transform: translate(-50%, -50%) translateZ(20px) scale(0.96) rotateY(-12deg);
          animation: mirror-float-c 14s ease-in-out infinite;
        }

        .slot-lower-right {
          left: 78%;
          top: 84%;
          z-index: 34;
          opacity: 0.66;
          filter: blur(0.5px);
          transform: translate(-50%, -50%) translateZ(-28px) scale(0.9) rotateY(-9deg);
          animation: mirror-float-a 15s ease-in-out infinite reverse;
        }

        .slot-bottom {
          left: 50%;
          top: 97%;
          z-index: 20;
          opacity: 0.46;
          filter: blur(1px);
          transform: translate(-50%, -50%) translateZ(-96px) scale(0.76);
          animation: mirror-float-b 16s ease-in-out infinite reverse;
        }

        .slot-lower-left {
          left: 22%;
          top: 84%;
          z-index: 34;
          opacity: 0.66;
          filter: blur(0.5px);
          transform: translate(-50%, -50%) translateZ(-28px) scale(0.9) rotateY(9deg);
          animation: mirror-float-c 13s ease-in-out infinite reverse;
        }

        .slot-left {
          left: 9%;
          top: 50%;
          z-index: 38;
          opacity: 0.76;
          filter: blur(0.2px);
          transform: translate(-50%, -50%) translateZ(20px) scale(0.96) rotateY(12deg);
          animation: mirror-float-a 14s ease-in-out infinite;
        }

        .slot-upper-left {
          left: 22%;
          top: 16%;
          z-index: 28;
          opacity: 0.62;
          filter: blur(0.6px);
          transform: translate(-50%, -50%) translateZ(-44px) scale(0.86) rotateY(10deg);
          animation: mirror-float-b 15s ease-in-out infinite;
        }

        .is-focusing .heart-mirror-side,
        .is-subconsciousVisible .heart-mirror-side,
        .is-revealed .heart-mirror-side,
        .is-thiefVisible .heart-mirror-side,
        .is-readyForCycle .heart-mirror-side {
          opacity: 0.1;
          transform: translate(-50%, -50%) translate3d(var(--mirror-scene-x), var(--mirror-scene-y), var(--mirror-depth)) scale(0.62);
          filter: blur(2.8px);
        }

        .is-focusing .heart-mirror-side.is-resonant {
          opacity: 0.46;
          transform: translate(-50%, -50%) translate3d(var(--mirror-current-pull-x), var(--mirror-current-pull-y), 84px) scale(0.74);
          filter: blur(0.25px) brightness(1.1);
          border-color: rgba(216, 183, 111, 0.44);
        }

        .six-thief-orbit {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 68;
          width: 1px;
          height: 1px;
          pointer-events: none;
          transform: translate(-50%, -50%) translateZ(104px);
          animation: thief-field-rise 760ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .thief-cycle-ring {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 258px;
          height: 168px;
          border: 1px solid rgba(127, 37, 25, 0.12);
          border-radius: 50%;
          background:
            conic-gradient(
              from 22deg,
              transparent 0 9%,
              rgba(127, 37, 25, 0.14) 10% 11%,
              transparent 12% 25%,
              rgba(127, 37, 25, 0.12) 26% 27%,
              transparent 28% 42%,
              rgba(127, 37, 25, 0.12) 43% 44%,
              transparent 45% 59%,
              rgba(127, 37, 25, 0.12) 60% 61%,
              transparent 62% 76%,
              rgba(127, 37, 25, 0.12) 77% 78%,
              transparent 79% 92%,
              rgba(127, 37, 25, 0.14) 93% 94%,
              transparent 95% 100%
            );
          opacity: 0;
          transform: translate(-50%, -50%) rotate(-8deg);
          transition: opacity 860ms ease, filter 860ms ease;
        }

        .thief-cycle-ring::after {
          content: "";
          position: absolute;
          right: 7%;
          top: 31%;
          width: 7px;
          height: 7px;
          border-right: 1px solid rgba(196, 91, 62, 0.34);
          border-top: 1px solid rgba(196, 91, 62, 0.34);
          opacity: 0.36;
          transform: rotate(34deg);
        }

        .six-thief-orbit.is-cycling .thief-cycle-ring {
          opacity: 0.78;
          filter: drop-shadow(0 0 18px rgba(127, 37, 25, 0.12));
          animation: thief-cycle-breathe 5.2s ease-in-out infinite;
        }

        .thief-star {
          position: absolute;
          left: 50%;
          top: 50%;
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border: 1px solid rgba(127, 37, 25, 0.22);
          border-radius: 50%;
          background:
            radial-gradient(circle, rgba(127, 37, 25, 0.14), rgba(8, 6, 5, 0.28) 64%, transparent 70%);
          color: rgba(220, 212, 195, 0.38);
          font-family: var(--font-world);
          font-size: 0.88rem;
          line-height: 1;
          opacity: 0.48;
          filter: blur(0.7px);
          transform: translate(-50%, -50%) translate(var(--thief-x), var(--thief-y)) scale(0.86);
          box-shadow:
            inset 0 0 18px rgba(0, 0, 0, 0.48),
            0 0 18px rgba(127, 37, 25, 0.08);
          transition:
            border-color 680ms ease,
            color 680ms ease,
            opacity 680ms ease,
            filter 680ms ease,
            transform 880ms cubic-bezier(0.22, 1, 0.36, 1);
          animation: thief-star-drift 6.8s ease-in-out infinite;
        }

        .thief-star.is-active {
          border-color: rgba(196, 91, 62, 0.58);
          background:
            radial-gradient(circle, rgba(127, 37, 25, 0.32), rgba(35, 10, 7, 0.38) 64%, transparent 72%);
          color: rgba(232, 132, 96, 0.88);
          opacity: 0.92;
          filter: blur(0);
          transform: translate(-50%, -50%) translate(var(--thief-x), var(--thief-y)) scale(1);
          box-shadow:
            inset 0 0 18px rgba(0, 0, 0, 0.5),
            0 0 22px rgba(127, 37, 25, 0.18);
        }

        .six-thief-orbit.is-cycling .thief-star {
          opacity: 0.68;
          filter: blur(0.2px);
        }

        .six-thief-orbit.is-cycling .thief-star.is-active {
          opacity: 1;
          animation:
            thief-star-drift 6.8s ease-in-out infinite,
            thief-active-pulse 2.8s ease-in-out infinite;
        }

        .six-thief-orbit.is-quieted .thief-star {
          border-color: rgba(180, 157, 93, 0.18);
          background:
            radial-gradient(circle, rgba(180, 157, 93, 0.08), rgba(8, 8, 6, 0.22) 64%, transparent 72%);
          color: rgba(220, 212, 195, 0.22);
          opacity: 0.22;
          filter: blur(1.2px);
        }

        .six-thief-orbit.is-quieted .thief-cycle-ring {
          opacity: 0.12;
          filter: blur(1.2px);
        }

        .virtue-orbit {
          position: absolute;
          left: 50%;
          top: 50%;
          display: flex;
          gap: 12px;
          width: max-content;
          align-items: center;
          white-space: nowrap;
          transform: translate(-50%, -50%) translateY(142px);
          color: rgba(216, 183, 111, 0.68);
          font-family: var(--font-function);
          font-size: 0.62rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-shadow: 0 0 18px rgba(216, 183, 111, 0.12);
        }

        .virtue-orbit i {
          font-style: normal;
          opacity: 0;
          animation: virtue-rise 680ms ease forwards;
        }

        .virtue-orbit i:nth-child(2) {
          animation-delay: 180ms;
        }

        .virtue-orbit i:nth-child(3) {
          animation-delay: 360ms;
        }

        .is-focusing .heart-mirror-main {
          --mirror-glow-low: 0.18;
          --mirror-glow-high: 0.24;
          border-color: rgba(216, 183, 111, 0.58);
          box-shadow:
            0 34px 104px rgba(0, 0, 0, 0.54),
            0 0 92px rgba(180, 157, 93, 0.18),
            inset 0 0 82px rgba(0, 0, 0, 0.62),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .hidden-conscience {
          position: absolute;
          left: 50%;
          top: 51%;
          z-index: 1;
          display: grid;
          gap: 8px;
          font-family: var(--font-world);
          font-size: 0.9rem;
          font-weight: 300;
          letter-spacing: 0.16em;
          color: rgba(216, 183, 111, 0.42);
          opacity: 0.16;
          transform: translate(-50%, -50%) translateY(108px);
          transition:
            opacity 800ms ease,
            filter 800ms ease,
            transform 800ms cubic-bezier(0.22, 1, 0.36, 1);
          pointer-events: none;
        }

        .hidden-conscience small {
          font-family: var(--font-function);
          font-size: 0.68rem;
          letter-spacing: 0.12em;
          color: rgba(220, 212, 195, 0.34);
        }

        .hidden-conscience.is-awake {
          opacity: 0.84;
          filter: blur(0);
          transform: translate(-50%, -50%) translateY(132px);
          text-shadow: 0 0 18px rgba(216, 183, 111, 0.2);
        }

        .mirror-reveal-copy {
          min-height: 122px;
          margin-top: 1rem;
          opacity: 0;
          transform: translateY(12px);
          filter: blur(8px);
          transition:
            opacity 620ms ease,
            transform 620ms cubic-bezier(0.22, 1, 0.36, 1),
            filter 620ms ease;
        }

        .mirror-reveal-copy.is-visible {
          opacity: 1;
          transform: translateY(0);
          filter: blur(0);
        }

        .mirror-reveal-copy-quiet {
          min-height: 64px;
        }

        .reveal-label {
          margin: 0;
          font-family: var(--font-function);
          font-size: 0.72rem;
          letter-spacing: 0.18em;
          color: rgba(180, 157, 93, 0.62);
        }

        .thought-proof {
          margin: 0.42rem auto 0;
          max-width: 19em;
          font-family: var(--font-narrative);
          font-size: clamp(1.06rem, 4.6vw, 1.22rem);
          font-weight: 300;
          line-height: 1.78;
          letter-spacing: 0.045em;
          color: rgba(242, 235, 220, 0.76);
        }

        .reveal-name {
          margin: 0.4rem 0 0;
          font-family: var(--font-world);
          font-size: clamp(2rem, 8.8vw, 2.75rem);
          font-weight: 300;
          line-height: 1.12;
          letter-spacing: 0.14em;
          color: rgba(216, 183, 111, 0.82);
          transform: translateX(0.07em);
        }

        .behavior-proof {
          max-width: 18em;
          margin: 0.72rem auto 0;
          font-family: var(--font-narrative);
          font-size: clamp(0.98rem, 4.1vw, 1.12rem);
          font-weight: 300;
          line-height: 1.72;
          letter-spacing: 0.045em;
          color: rgba(220, 212, 195, 0.68);
        }

        .thief-root-list {
          display: grid;
          max-width: 22em;
          margin: 0.78rem auto 0;
          gap: 10px;
        }

        .thief-root-list p {
          margin: 0;
          font-family: var(--font-narrative);
          font-size: clamp(0.95rem, 3.9vw, 1.08rem);
          font-weight: 300;
          line-height: 1.7;
          letter-spacing: 0.04em;
          color: rgba(220, 212, 195, 0.68);
        }

        .thief-root-list span {
          display: inline-grid;
          min-width: 2.1em;
          height: 2.1em;
          margin-right: 0.56rem;
          place-items: center;
          border: 1px solid rgba(127, 37, 25, 0.5);
          border-radius: 50%;
          background: rgba(127, 37, 25, 0.18);
          color: rgba(218, 108, 80, 0.9);
          font-family: var(--font-world);
          font-size: 0.9em;
          letter-spacing: 0;
          box-shadow: 0 0 18px rgba(127, 37, 25, 0.11);
          animation: seal-mark-drop 560ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .heart-verdict,
        .conscience-copy,
        .heart-thief-mark {
          margin: 0.55rem auto 0;
          max-width: 22em;
          font-family: var(--font-narrative);
          font-size: clamp(1rem, 4.4vw, 1.16rem);
          font-weight: 300;
          line-height: 1.86;
          letter-spacing: 0.045em;
          color: rgba(220, 212, 195, 0.72);
        }

        .heart-thief-mark {
          font-family: var(--font-function);
          font-size: 0.78rem;
          line-height: 1.6;
          letter-spacing: 0.14em;
          color: rgba(180, 157, 93, 0.62);
        }

        .conscience-copy {
          color: rgba(216, 183, 111, 0.68);
        }

        .mirror-hint {
          margin: 1.5rem 0 0;
          font-family: var(--font-function);
          font-size: 0.72rem;
          letter-spacing: 0.16em;
          color: rgba(220, 212, 195, 0.34);
        }

        .mirror-action-script {
          position: relative;
          z-index: 88;
          display: inline-flex;
          width: min(100%, 430px);
          min-height: 52px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(216, 183, 111, 0.28);
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 0%, rgba(216, 183, 111, 0.12), transparent 48%),
            rgba(5, 5, 4, 0.24);
          color: rgba(242, 235, 220, 0.82);
          cursor: pointer;
          font-family: var(--font-function);
          font-size: 0.92rem;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-align: center;
          text-decoration: none;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 18px 52px rgba(0, 0, 0, 0.24);
          transition:
            border-color 260ms ease,
            color 260ms ease,
            background 260ms ease,
            transform 180ms ease;
          -webkit-tap-highlight-color: transparent;
        }

        .mirror-action-script:active {
          transform: scale(0.985);
        }

        .mirror-action-main {
          box-shadow:
            0 18px 52px rgba(0, 0, 0, 0.28),
            0 0 42px rgba(180, 157, 93, 0.1);
        }

        @keyframes mist-drift {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(18px, -10px, 0) scale(1.08);
          }
        }

        @keyframes far-dust-drift {
          0%,
          100% {
            opacity: 0.48;
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            opacity: 0.78;
            transform: translate3d(22px, -16px, 0) scale(1.04);
          }
        }

        @keyframes nebula-breathe {
          0%,
          100% {
            opacity: 0.55;
            transform: scale(0.98);
          }

          50% {
            opacity: 0.82;
            transform: scale(1.04);
          }
        }

        @keyframes particle-drift {
          0% {
            opacity: 0.26;
            margin-top: 0;
          }

          50% {
            opacity: 0.72;
            margin-top: -12px;
          }

          100% {
            opacity: 0.26;
            margin-top: 0;
          }
        }

        @keyframes gateway-stage-in {
          from {
            opacity: 0;
            filter: blur(10px);
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        @keyframes gateway-breath {
          0%,
          100% {
            opacity: 0.54;
            transform: scale(1);
          }

          50% {
            opacity: 0.84;
            transform: scale(1.035);
          }
        }

        @keyframes empty-mirror-rise {
          from {
            opacity: 0;
            transform: scale(0.86);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes water-pulse {
          0%,
          100% {
            opacity: 0.28;
            transform: scale(0.86);
          }

          50% {
            opacity: 0.52;
            transform: scale(1.08);
          }
        }

        @keyframes living-water-breathe {
          0%,
          100% {
            opacity: 0.38;
            filter: blur(0.3px);
            transform: scale(0.96);
          }

          50% {
            opacity: 0.66;
            filter: blur(0);
            transform: scale(1.035);
          }
        }

        @keyframes lake-voice-breathe {
          0%,
          100% {
            filter: brightness(var(--lake-voice-brightness-low)) blur(0);
            transform: translate(-50%, -50%) scale(var(--lake-voice-rest-scale));
          }

          50% {
            filter: brightness(var(--lake-voice-brightness-high)) blur(0.1px);
            transform: translate(-50%, -50%) scale(var(--lake-voice-peak-scale));
          }
        }

        @keyframes lake-undercurrent-breathe {
          0%,
          100% {
            opacity: 0.22;
            transform: scale(0.88);
          }

          50% {
            opacity: 0.46;
            transform: scale(1.05);
          }
        }

        @keyframes depth-chamber-breathe {
          0%,
          100% {
            opacity: 0.16;
            transform: scale(0.94);
          }

          50% {
            opacity: 0.32;
            transform: scale(0.985);
          }
        }

        @keyframes moon-still-breathe {
          0%,
          100% {
            opacity: 0.34;
            transform: translate(-50%, -50%) scale(0.98);
          }

          50% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(1.025);
          }
        }

        @keyframes moon-reflection-breathe {
          0%,
          100% {
            opacity: 0.28;
            transform: translateX(-50%) scaleY(0.92);
          }

          50% {
            opacity: 0.46;
            transform: translateX(-50%) scaleY(1.08);
          }
        }

        @keyframes inner-stillness-listen {
          0%,
          100% {
            opacity: 0.34;
            transform: scale(0.92);
          }

          50% {
            opacity: 0.58;
            transform: scale(1.04);
          }
        }

        @keyframes orbit-drift {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes mirror-float-a {
          0%,
          100% {
            margin-top: 0;
            margin-left: 0;
          }

          50% {
            margin-top: -7px;
            margin-left: 5px;
          }
        }

        @keyframes mirror-float-b {
          0%,
          100% {
            margin-top: 0;
            margin-left: 0;
          }

          50% {
            margin-top: 6px;
            margin-left: -4px;
          }
        }

        @keyframes mirror-float-c {
          0%,
          100% {
            margin-top: 0;
            margin-left: 0;
          }

          50% {
            margin-top: -4px;
            margin-left: -6px;
          }
        }

        @keyframes subconscious-float {
          0%,
          100% {
            margin-top: 0;
            margin-left: 0;
          }

          42% {
            margin-top: var(--mirror-drift-y);
            margin-left: var(--mirror-drift-x);
          }

          72% {
            margin-top: var(--mirror-counter-y);
            margin-left: var(--mirror-counter-x);
          }
        }

        @keyframes mirror-dart-float {
          0%,
          100% {
            margin-top: 0;
            margin-left: 0;
          }

          12% {
            margin-top: -2px;
            margin-left: 3px;
          }

          18% {
            margin-top: var(--mirror-drift-y);
            margin-left: var(--mirror-drift-x);
          }

          28% {
            margin-top: 3px;
            margin-left: -2px;
          }

          44% {
            margin-top: var(--mirror-counter-y);
            margin-left: var(--mirror-counter-x);
          }

          58% {
            margin-top: -3px;
            margin-left: 4px;
          }

          76% {
            margin-top: 0;
            margin-left: var(--mirror-drift-x);
          }
        }

        @keyframes mirror-heavy-float {
          0%,
          100% {
            margin-top: 0;
            margin-left: 0;
          }

          38% {
            margin-top: var(--mirror-drift-y);
            margin-left: 0;
          }

          52%,
          62% {
            margin-top: var(--mirror-drift-y);
            margin-left: 0;
          }

          72% {
            margin-top: 0;
            margin-left: var(--mirror-counter-x);
          }
        }

        @keyframes mirror-swing-float {
          0%,
          100% {
            margin-top: 0;
            margin-left: 0;
          }

          32% {
            margin-top: var(--mirror-drift-y);
            margin-left: var(--mirror-drift-x);
            scale: 1.08;
          }

          66% {
            margin-top: var(--mirror-counter-y);
            margin-left: var(--mirror-counter-x);
            scale: 0.92;
          }
        }

        @keyframes mirror-follow-float {
          0%,
          100% {
            margin-top: 0;
            margin-left: 0;
          }

          46% {
            margin-top: var(--mirror-drift-y);
            margin-left: var(--mirror-drift-x);
          }

          58% {
            margin-top: calc(var(--mirror-drift-y) * 0.6);
            margin-left: calc(var(--mirror-drift-x) * 1.22);
          }

          78% {
            margin-top: 0;
            margin-left: var(--mirror-counter-x);
          }
        }

        @keyframes mirror-waver-float {
          0%,
          100% {
            margin-top: 0;
            margin-left: 0;
          }

          24% {
            margin-top: var(--mirror-drift-y);
            margin-left: var(--mirror-counter-x);
          }

          36% {
            margin-top: calc(var(--mirror-drift-y) * -0.42);
            margin-left: calc(var(--mirror-counter-x) * -0.72);
          }

          48% {
            margin-top: var(--mirror-counter-y);
            margin-left: var(--mirror-drift-x);
          }

          72% {
            margin-top: 0;
            margin-left: var(--mirror-counter-x);
          }
        }

        @keyframes mirror-lag-float {
          0%,
          18%,
          28%,
          100% {
            margin-top: 0;
            margin-left: 0;
          }

          58% {
            margin-top: var(--mirror-drift-y);
            margin-left: var(--mirror-drift-x);
          }

          68%,
          76% {
            margin-top: var(--mirror-drift-y);
            margin-left: var(--mirror-drift-x);
          }

          84% {
            margin-top: var(--mirror-counter-y);
            margin-left: 0;
          }
        }

        @keyframes mirror-tremble-float {
          0%,
          100% {
            margin-top: 0;
            margin-left: 0;
          }

          20% {
            margin-top: var(--mirror-drift-y);
            margin-left: var(--mirror-drift-x);
          }

          26% {
            margin-top: calc(var(--mirror-drift-y) * -0.8);
            margin-left: calc(var(--mirror-drift-x) * -0.8);
          }

          35% {
            margin-top: 0;
            margin-left: var(--mirror-counter-x);
          }

          48% {
            margin-top: calc(var(--mirror-counter-y) * -0.7);
            margin-left: 3px;
          }

          64% {
            margin-top: var(--mirror-counter-y);
            margin-left: 0;
          }
        }

        @keyframes mirror-steady-float {
          0%,
          100% {
            margin-top: 0;
            margin-left: 0;
          }

          50% {
            margin-top: 1px;
            margin-left: -1px;
          }
        }

        @keyframes resonant-mirror-breathe {
          0%,
          100% {
            opacity: 0.76;
            filter: blur(0.18px) brightness(1.06);
          }

          50% {
            opacity: 0.92;
            filter: blur(0) brightness(1.18);
          }
        }

        @keyframes side-surface-breathe {
          0%,
          100% {
            opacity: var(--side-surface-low);
            transform: scale(0.985);
          }

          50% {
            opacity: var(--side-surface-high);
            transform: scale(1.025);
          }
        }

        @keyframes gravity-line-listen {
          0%,
          100% {
            opacity: 0.14;
            filter: blur(0.45px);
          }

          50% {
            opacity: 0.38;
            filter: blur(0.1px);
          }
        }

        @keyframes mirror-ripple {
          0% {
            opacity: 0.56;
            transform: scale(0.46);
          }

          100% {
            opacity: 0;
            transform: scale(1.72);
          }
        }

        @keyframes empty-ripple-out {
          0% {
            opacity: 0.56;
            transform: translate(-50%, -50%) scale(0.42);
          }

          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(3.05);
          }
        }

        @keyframes mirror-breath-ripple {
          0%,
          100% {
            opacity: 0.1;
            transform: scale(0.58);
          }

          50% {
            opacity: 0.42;
            transform: scale(1.34);
          }
        }

        @keyframes mirror-breathe {
          0%,
          100% {
            filter: brightness(var(--mirror-brightness-low));
            transform: translate(-50%, -50%) scale(var(--mirror-rest-scale));
            box-shadow:
              0 26px 72px rgba(0, 0, 0, 0.42),
              0 0 50px rgba(180, 157, 93, var(--mirror-glow-low)),
              inset 0 0 68px rgba(0, 0, 0, 0.56),
              inset 0 1px 0 rgba(255, 255, 255, 0.07);
          }

          50% {
            filter: brightness(var(--mirror-brightness-high));
            transform: translate(-50%, -50%) scale(var(--mirror-peak-scale));
            box-shadow:
              0 30px 82px rgba(0, 0, 0, 0.5),
              0 0 76px rgba(180, 157, 93, var(--mirror-glow-high)),
              inset 0 0 78px rgba(0, 0, 0, 0.62),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
          }
        }

        @keyframes mirror-surface-ripple {
          0% {
            opacity: 0.18;
            transform: translate(-50%, -50%) scale(0.3);
          }

          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.15);
          }
        }

        @keyframes mirror-click-ripple {
          0% {
            opacity: 0.42;
            transform: translate(-50%, -50%) scale(1.36);
          }

          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.18);
          }
        }

        @keyframes event-horizon-breathe {
          0%,
          100% {
            opacity: 0.46;
            transform: scale(0.985) rotate(0deg);
          }

          50% {
            opacity: 0.74;
            transform: scale(1.018) rotate(1.5deg);
          }
        }

        @keyframes vortex-turn {
          from {
            transform: rotate(0deg) scale(0.96);
          }

          to {
            transform: rotate(360deg) scale(0.96);
          }
        }

        @keyframes front-reflection-glide {
          0%,
          100% {
            opacity: 0.028;
            margin-left: -10px;
            margin-top: -3px;
          }

          50% {
            opacity: 0.07;
            margin-left: 10px;
            margin-top: 3px;
          }
        }

        @keyframes subconscious-reflection-rise {
          from {
            opacity: 0;
            filter: blur(9px);
            transform: translateY(16px) scale(0.94);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0) scale(1);
          }
        }

        @keyframes silence-pulse {
          0% {
            opacity: 0;
            filter: blur(10px);
            transform: scale(0.72);
          }

          100% {
            opacity: 0.58;
            filter: blur(0);
            transform: scale(1);
          }
        }

        @keyframes seal-mark-drop {
          from {
            opacity: 0;
            filter: blur(5px);
            transform: translateY(-8px) scale(1.18) rotate(-8deg);
          }

          70% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(1px) scale(0.96) rotate(-8deg);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0) scale(1) rotate(-8deg);
          }
        }

        @keyframes thief-field-rise {
          from {
            opacity: 0;
            filter: blur(12px);
            transform: translate(-50%, -50%) translateZ(84px) scale(0.78);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translate(-50%, -50%) translateZ(104px) scale(1);
          }
        }

        @keyframes thief-cycle-breathe {
          0%,
          100% {
            opacity: 0.42;
            transform: translate(-50%, -50%) rotate(-8deg) scale(0.96);
          }

          50% {
            opacity: 0.82;
            transform: translate(-50%, -50%) rotate(-5deg) scale(1.04);
          }
        }

        @keyframes thief-star-drift {
          0%,
          100% {
            margin-top: 0;
            margin-left: 0;
          }

          50% {
            margin-top: -5px;
            margin-left: 4px;
          }
        }

        @keyframes thief-active-pulse {
          0%,
          100% {
            box-shadow:
              inset 0 0 18px rgba(0, 0, 0, 0.5),
              0 0 18px rgba(127, 37, 25, 0.14);
          }

          50% {
            box-shadow:
              inset 0 0 18px rgba(0, 0, 0, 0.5),
              0 0 30px rgba(196, 91, 62, 0.24);
          }
        }

        @keyframes virtue-rise {
          from {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(8px);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        @keyframes thought-rise {
          from {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        @keyframes crack-reveal {
          0% {
            opacity: 0;
            transform: scale(0.7);
          }

          45% {
            opacity: 0.68;
          }

          100% {
            opacity: 0.22;
            transform: scale(1.18);
          }
        }

        @keyframes name-reveal {
          from {
            opacity: 0;
            filter: blur(8px);
            transform: translateX(0.06em) translateY(8px);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateX(0.06em) translateY(0);
          }
        }

        @media (max-width: 390px) {
          .mirror-orbit-field {
            height: min(92svh, 590px);
            min-height: 520px;
          }

          .heart-lake-voice {
            top: 64%;
            width: 84%;
            min-height: 118px;
          }

          .heart-mirror-side {
            width: 46px;
            height: 58px;
          }

          .empty-copy {
            font-size: 1.84rem;
          }
        }

        @media (min-width: 768px) {
          .mirror-orbit-field {
            width: 100vw;
            height: min(88svh, 760px);
            min-height: 620px;
            max-height: 780px;
          }

          .heart-lake-voice {
            top: 62.5%;
            width: min(58%, 520px);
          }

          .causal-hint {
            left: calc(50% - clamp(160px, 19vw, 206px));
            top: calc(50% - clamp(138px, 16vw, 166px));
          }
        }

        @media (max-width: 640px) {
          .mirror-orbit-field {
            width: 100vw;
            height: min(92svh, 620px);
            min-height: 540px;
          }

          .heart-lake-title {
            top: 0.9rem;
          }

          .heart-lake-touch-hint {
            bottom: 0.75rem;
          }

          .heart-lake-voice {
            top: 64%;
            width: 86%;
            min-height: 124px;
          }

          .heart-mirror-side {
            --mirror-scene-x: var(--mirror-mobile-x);
            --mirror-scene-y: var(--mirror-mobile-y);
            width: 52px;
            height: 66px;
          }

          .heart-lake-voice .mirror-layer > span {
            font-size: clamp(1.02rem, 4.8vw, 1.28rem);
          }

          .is-readyForCycle .heart-lake-voice .mirror-layer > span {
            max-width: 14em;
            font-size: clamp(0.96rem, 4.2vw, 1.12rem);
            line-height: 1.72;
          }

          .virtue-orbit {
            transform: translate(-50%, -50%) translateY(128px);
            gap: 10px;
            font-size: 0.58rem;
          }

          .causal-hint {
            left: calc(50% - clamp(126px, 34vw, 148px));
            top: calc(50% - clamp(114px, 30vw, 132px));
          }

          .mirror-layer > span {
            font-size: clamp(1rem, 4.6vw, 1.18rem);
            line-height: 1.58;
          }

          .mirror-layer:not(.is-thought) > span {
            font-size: clamp(1.18rem, 5.6vw, 1.52rem);
          }

          .mirror-action-script {
            min-height: 48px;
          }

          .side-mirror-name {
            width: 5.4em;
            font-size: 0.42rem;
            letter-spacing: 0.08em;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .nine-heart-mirror::before,
          .gateway-empty-stage,
          .gateway-array-stage,
          .empty-heart-mirror,
          .empty-water,
          .orbit-mirrors,
          .heart-water-plane,
          .heart-lake-voice,
          .lake-voice-undercurrent,
          .lake-deep-reflection,
          .mirror-water-canvas,
          .mirror-moon,
          .mirror-moon-reflection,
          .mirror-living-water,
          .mirror-depth-chamber,
          .mirror-inner-stillness,
          .side-mirror-surface,
          .heart-mirror-main::after,
          .mirror-water-ripple,
          .empty-ripple,
          .mirror-crack,
          .mirror-thought,
          .mirror-name,
          .mirror-layer.is-subconscious,
          .six-thief-orbit,
          .thief-cycle-ring,
          .thief-star,
          .virtue-orbit i,
          .heart-mirror-side.is-resonant {
            animation: none !important;
            filter: none !important;
          }
        }
      `}</style>
    </section>
  )
}
