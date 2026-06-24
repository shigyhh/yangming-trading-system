"use client"

import { useEffect, useRef } from "react"

const TAU = Math.PI * 2

const CONFIG = {
  autoplay: true,
  period: 43,
  spinSpeed: 12,
  thoughtSpeed: 0.5,
  thoughts: true,
  reflect: true,
  reflectSquash: 0.5,
  scale: 1,
  dprCap: 2,
} as const

const LOOP_SCALE = CONFIG.period / 43
const LOOP = {
  grow: 18 * LOOP_SCALE,
  holdTop: 4 * LOOP_SCALE,
  fall: 12 * LOOP_SCALE,
  holdBot: 9 * LOOP_SCALE,
}
const LOOP_PERIOD = LOOP.grow + LOOP.holdTop + LOOP.fall + LOOP.holdBot
const INITIAL_PHASE_OFFSET = LOOP.grow * 0.86

const NEBULA = [
  { x: -0.1, y: -0.1, radius: 0.6, color: "232, 199, 126", alpha: 0.05, speedX: 0.013, speedY: 0.009, phase: 0 },
  { x: 0.2, y: 0.04, radius: 0.68, color: "96, 126, 104", alpha: 0.04, speedX: 0.01, speedY: 0.012, phase: 1.7 },
  { x: 0.04, y: -0.22, radius: 0.48, color: "199, 164, 104", alpha: 0.045, speedX: 0.015, speedY: 0.008, phase: 3.1 },
  { x: -0.22, y: 0.1, radius: 0.56, color: "110, 128, 138", alpha: 0.03, speedX: 0.009, speedY: 0.011, phase: 4.4 },
] as const

const NIAN = ["贪", "惧", "涨", "跌", "赌", "悔", "追", "割", "梭", "嗔", "疑", "慌", "急", "怕", "妄", "乱", "进", "退", "得", "失", "痴", "躁", "犹"] as const

type HeroRightWaitingMirrorProps = {
  className?: string
}

type DrawState = {
  width: number
  height: number
  dpr: number
  halfMin: number
  centerX: number
  centerY: number
  waterY: number
  maxRadius: number
  small: boolean
}

type Dust = {
  angle: number
  distance: number
  size: number
  baseAlpha: number
  twinkle: number
  phase: number
  drift: number
}

type SpiralParticle = {
  arm: number
  t: number
  angleOffset: number
  radiusOffset: number
  size: number
  twinkle: number
  phase: number
  warm: number
}

type Flare = {
  x: number
  y: number
  size: number
  life: number
  max: number
}

type Thought = {
  char: (typeof NIAN)[number]
  angle: number
  radius: number
  speed: number
  size: number
  baseAlpha: number
  bob: number
  bobSpeed: number
  sink: number
  submerge: number
  rippled: boolean
  ignited: boolean
  igniteTime: number
}

type ThoughtRipple = {
  x: number
  radius: number
  alpha: number
}

type ThoughtMote = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
}

type CosmosField = {
  dustNear: Dust[]
  dustFar: Dust[]
  spiralThoughts: SpiralParticle[]
  thoughts: Thought[]
  thoughtRipples: ThoughtRipple[]
  thoughtMotes: ThoughtMote[]
  flares: Flare[]
  random: () => number
}

const SPIRAL_THOUGHTS = {
  small: 320,
  large: 680,
} as const

function makeRandom(seed: number) {
  let value = seed

  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

function createDust(count: number, near: boolean, random: () => number): Dust[] {
  return Array.from({ length: count }, () => ({
    angle: random() * TAU,
    distance: (near ? 0.15 : 0.5) + random() * (near ? 0.85 : 0.55),
    size: near ? 0.6 + random() * 1.3 : 0.3 + random() * 0.7,
    baseAlpha: (near ? 0.18 : 0.08) + random() * (near ? 0.45 : 0.22),
    twinkle: 0.3 + random() * 1,
    phase: random() * TAU,
    drift: (random() - 0.5) * (near ? 0.00012 : 0.00005),
  }))
}

function createSpiralThoughts(small: boolean, random: () => number): SpiralParticle[] {
  const count = small ? SPIRAL_THOUGHTS.small : SPIRAL_THOUGHTS.large

  return Array.from({ length: count }, (_, index) => ({
    arm: index % 3,
    t: Math.pow(random(), 0.78),
    angleOffset: (random() - 0.5) * 0.55,
    radiusOffset: (random() - 0.5) * 0.045,
    size: 0.5 + random() * 1.3,
    twinkle: 0.5 + random() * 1.5,
    phase: random() * TAU,
    warm: random(),
  }))
}

function spawnThought(random: () => number): Thought {
  return {
    char: NIAN[Math.floor(random() * NIAN.length)],
    angle: random() * TAU,
    radius: 0.62 + random() * 0.33,
    speed: (random() < 0.5 ? 1 : -1) * (0.02 + random() * 0.04),
    size: 13 + random() * 9,
    baseAlpha: 0.09 + random() * 0.12,
    bob: random() * TAU,
    bobSpeed: 0.3 + random() * 0.5,
    sink: 0.006 + random() * 0.01,
    submerge: 0,
    rippled: false,
    ignited: false,
    igniteTime: 0,
  }
}

function createThoughts(small: boolean, random: () => number): Thought[] {
  return Array.from({ length: small ? 8 : 13 }, () => spawnThought(random))
}

function createCosmosField(small: boolean): CosmosField {
  const random = makeRandom(small ? 1931 : 7309)

  return {
    dustNear: createDust(small ? 32 : 56, true, random),
    dustFar: createDust(small ? 56 : 110, false, random),
    spiralThoughts: createSpiralThoughts(small, random),
    thoughts: createThoughts(small, random),
    thoughtRipples: [],
    thoughtMotes: [],
    flares: [],
    random,
  }
}

function easeIn(value: number) {
  return value * value
}

function easeInOut(value: number) {
  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function bump(value: number, center: number, width: number) {
  return Math.max(0, 1 - Math.abs(value - center) / width)
}

function getAutoPhase(seconds: number) {
  let time = seconds % LOOP_PERIOD

  if (time < LOOP.grow) {
    return easeIn(time / LOOP.grow) * 4
  }

  time -= LOOP.grow
  if (time < LOOP.holdTop) {
    return 4
  }

  time -= LOOP.holdTop
  if (time < LOOP.fall) {
    return 4 - easeInOut(time / LOOP.fall) * 4
  }

  return 0
}

function setupCanvas(canvas: HTMLCanvasElement): DrawState {
  const bounds = canvas.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.dprCap)
  const width = Math.max(1, bounds.width)
  const height = Math.max(1, bounds.height)
  const halfMin = Math.min(width * 0.47, height * 0.34) * CONFIG.scale
  const stackHeight = halfMin + (halfMin * 0.92 + halfMin * CONFIG.reflectSquash + halfMin * 0.15)
  const centerY = (height - stackHeight) * 0.5 + halfMin

  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)

  return {
    width,
    height,
    dpr,
    halfMin,
    centerX: width * 0.5,
    centerY,
    waterY: centerY + halfMin * 0.92,
    maxRadius: halfMin * 0.5,
    small: width < 420 || halfMin < 170,
  }
}

function drawThoughtDust(
  context: CanvasRenderingContext2D,
  state: DrawState,
  time: number,
  dust: Dust[],
  near: boolean,
  bloom: number,
  deltaFrame: number,
) {
  dust.forEach((mote) => {
    mote.angle += mote.drift * deltaFrame

    const radius = mote.distance * state.halfMin * (near ? 0.9 : 1.05)
    const x = state.centerX + Math.cos(mote.angle) * radius
    const y = state.centerY + Math.sin(mote.angle) * radius * 0.92
    const twinkle = 0.6 + Math.sin(time * mote.twinkle + mote.phase) * 0.4
    const alpha = mote.baseAlpha * twinkle * (near ? 1 - bloom * 0.35 : 1)

    context.beginPath()
    context.arc(x, y, mote.size, 0, TAU)
    context.fillStyle = `rgba(234, 228, 210, ${alpha})`
    context.fill()
  })
}

function drawScaledArc(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  draw: () => void,
) {
  context.save()
  context.translate(x, y)
  context.scale(radiusX, radiusY)
  context.beginPath()
  context.arc(0, 0, 1, 0, TAU)
  draw()
  context.restore()
}

function drawCosmos(
  context: CanvasRenderingContext2D,
  state: DrawState,
  field: CosmosField,
  time: number,
  phase: number,
  spin: number,
  zhao: number,
  flash: number,
  deltaFrame: number,
) {
  const { width, height, centerX, centerY, halfMin, maxRadius } = state
  const coreAlpha = clamp(phase, 0, 1)
  const lobeAlpha = bump(phase, 2, 1) * (1 - clamp(phase - 2.6, 0, 1))
  const seedAlpha = bump(phase, 3, 0.8) * (1 - clamp(phase - 3.4, 0, 1))
  const bloom = clamp((phase - 2.5) / 1.5, 0, 1)
  const nestAlpha = (1 - clamp(bloom * 1.5, 0, 1)) * coreAlpha

  let gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, halfMin * 0.5)
  gradient.addColorStop(0, "rgba(2, 6, 4, 0.42)")
  gradient.addColorStop(1, "rgba(2, 6, 4, 0)")
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)

  NEBULA.forEach((cloud) => {
    const x = centerX + (cloud.x + Math.sin(time * cloud.speedX + cloud.phase) * 0.04) * halfMin * 2
    const y = centerY + (cloud.y + Math.cos(time * cloud.speedY + cloud.phase) * 0.04) * halfMin * 2
    const radius = cloud.radius * halfMin * (1 + 0.06 * Math.sin(time * 0.03 + cloud.phase))

    gradient = context.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, `rgba(${cloud.color}, ${cloud.alpha * (1 + bloom * 0.5)})`)
    gradient.addColorStop(0.5, `rgba(${cloud.color}, ${cloud.alpha * 0.4})`)
    gradient.addColorStop(1, `rgba(${cloud.color}, 0)`)
    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)
  })

  drawThoughtDust(context, state, time, field.dustFar, false, bloom, deltaFrame)

  for (let index = 0; index < 3; index += 1) {
    const radius = halfMin * (0.24 + index * 0.12)
    const rotation = time * 0.03 - index * 0.004 + index

    context.save()
    context.translate(centerX, centerY)
    context.rotate(rotation)
    context.scale(1, 0.86)
    context.beginPath()
    context.arc(0, 0, radius, 0, TAU)
    context.strokeStyle = `rgba(199, 164, 104, ${(0.03 - index * 0.006) * (1 - bloom * 0.7)})`
    context.lineWidth = 1
    context.stroke()
    context.restore()
  }

  field.flares.forEach((flare) => {
    const life = Math.sin((Math.PI * flare.life) / flare.max)

    if (life <= 0) {
      return
    }

    context.beginPath()
    context.arc(flare.x, flare.y, flare.size * (0.6 + 0.6 * life), 0, TAU)
    context.fillStyle = `rgba(248, 228, 176, ${0.5 * life})`
    context.fill()
  })

  context.save()
  context.globalCompositeOperation = "lighter"

  if (bloom > 0.01) {
    gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius * 1.3)
    gradient.addColorStop(0, `rgba(232, 199, 126, ${0.09 * bloom})`)
    gradient.addColorStop(0.5, `rgba(199, 164, 104, ${0.045 * bloom})`)
    gradient.addColorStop(1, "rgba(199, 164, 104, 0)")
    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)
  }

  if (lobeAlpha > 0.01) {
    const rotation = time * 0.16
    const offset = halfMin * 0.12
    const warmX = centerX + Math.cos(rotation) * offset
    const warmY = centerY + Math.sin(rotation) * offset
    const coolX = centerX + Math.cos(rotation + Math.PI) * offset
    const coolY = centerY + Math.sin(rotation + Math.PI) * offset

    gradient = context.createRadialGradient(warmX, warmY, 0, warmX, warmY, halfMin * 0.34)
    gradient.addColorStop(0, `rgba(232, 199, 126, ${0.36 * lobeAlpha})`)
    gradient.addColorStop(0.5, `rgba(199, 164, 104, ${0.13 * lobeAlpha})`)
    gradient.addColorStop(1, "rgba(199, 164, 104, 0)")
    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)

    gradient = context.createRadialGradient(coolX, coolY, 0, coolX, coolY, halfMin * 0.34)
    gradient.addColorStop(0, `rgba(2, 5, 3, ${0.5 * lobeAlpha})`)
    gradient.addColorStop(0.55, `rgba(2, 5, 3, ${0.2 * lobeAlpha})`)
    gradient.addColorStop(1, "rgba(2, 5, 3, 0)")
    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)
  }

  if (bloom > 0.01) {
    const wind = 1.05 + zhao * 0.9

    field.spiralThoughts.forEach((particle) => {
      const gate = bloom - particle.t * 0.82

      if (gate <= 0) {
        return
      }

      const gateAlpha = Math.min(1, gate * 3)
      const angle =
        particle.arm * (TAU / 3) +
        particle.t * wind * TAU +
        spin +
        particle.angleOffset * (1 - particle.t * 0.5)
      const radius = (particle.t + particle.radiusOffset) * maxRadius * (0.18 + 0.82 * bloom) * (1 - zhao * 0.5)
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius * 0.92
      const twinkle = 0.65 + Math.sin(time * particle.twinkle + particle.phase) * 0.35
      const alpha = gateAlpha * twinkle * (0.85 - particle.t * 0.42) * (1 + zhao * 0.4)
      const size = particle.size * (0.75 + 0.5 * bloom)
      const tone = particle.warm < 0.5 ? "232, 199, 126" : "234, 228, 210"
      const finalAlpha = particle.warm < 0.5 ? alpha : alpha * 0.9

      context.fillStyle = `rgba(${tone}, ${finalAlpha})`
      context.beginPath()
      context.arc(x, y, size, 0, TAU)
      context.fill()
    })
  }

  if (seedAlpha > 0.01) {
    for (let index = 0; index < 3; index += 1) {
      const angle = index * (TAU / 3) + spin * 0.6
      const radius = halfMin * 0.12
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      gradient = context.createRadialGradient(x, y, 0, x, y, halfMin * 0.13)
      gradient.addColorStop(0, `rgba(248, 228, 176, ${0.48 * seedAlpha})`)
      gradient.addColorStop(0.4, `rgba(199, 164, 104, ${0.16 * seedAlpha})`)
      gradient.addColorStop(1, "rgba(199, 164, 104, 0)")
      context.fillStyle = gradient
      context.fillRect(0, 0, width, height)

      context.beginPath()
      context.arc(x, y, 2, 0, TAU)
      context.fillStyle = `rgba(255, 244, 214, ${0.7 * seedAlpha})`
      context.fill()
    }
  }

  context.restore()

  drawThoughtDust(context, state, time, field.dustNear, true, bloom, deltaFrame)

  const breath = 0.5 + Math.sin(time * 0.3) * 0.5
  const coreRadius = halfMin * (0.038 + 0.06 * coreAlpha + 0.012 * breath)

  if (nestAlpha > 0.05) {
    for (let index = 0; index < 3; index += 1) {
      const angle = index * (TAU / 3) + time * 0.22
      const radius = coreRadius * 1.7
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      context.beginPath()
      context.arc(x, y, 0.9, 0, TAU)
      context.fillStyle = `rgba(232, 199, 126, ${0.55 * nestAlpha})`
      context.fill()
    }
  }

  const glowAlpha = (0.16 + 0.5 * coreAlpha) * (0.82 + 0.18 * breath) * (1 + flash * 0.5 + zhao * 0.4)
  gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius * 4.6)
  gradient.addColorStop(0, `rgba(248, 228, 176, ${glowAlpha})`)
  gradient.addColorStop(0.18, `rgba(232, 199, 126, ${glowAlpha * 0.7})`)
  gradient.addColorStop(0.5, `rgba(199, 164, 104, ${glowAlpha * 0.28})`)
  gradient.addColorStop(1, "rgba(199, 164, 104, 0)")
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)

  context.beginPath()
  context.arc(centerX, centerY, coreRadius * 0.5, 0, TAU)
  context.fillStyle = `rgba(255, 244, 214, ${0.38 + 0.5 * coreAlpha + flash * 0.3 + zhao * 0.2})`
  context.fill()
}

function drawThoughts(
  context: CanvasRenderingContext2D,
  state: DrawState,
  field: CosmosField,
  time: number,
  bloom: number,
  zhao: number,
  now: number,
  whirl: number,
  waveStart: number,
  deltaSeconds: number,
  deltaFrame: number,
) {
  const { centerX, centerY, halfMin, waterY } = state
  const waveAge = now - waveStart
  const waveDuration = 2.1
  const waveActive = waveAge >= 0 && waveAge < waveDuration + 0.6
  const waveFraction = (waveAge / waveDuration) * 1.4

  if (waveActive && waveFraction < 1.5) {
    const waveRadius = waveFraction * halfMin
    const waveAlpha = (1 - clamp(waveFraction / 1.4, 0, 1)) * 0.22
    const gradient = context.createRadialGradient(centerX, centerY, Math.max(0, waveRadius - halfMin * 0.16), centerX, centerY, waveRadius)

    gradient.addColorStop(0, "rgba(199, 164, 104, 0)")
    gradient.addColorStop(1, `rgba(232, 199, 126, ${waveAlpha * 0.5})`)
    context.fillStyle = gradient
    context.beginPath()
    context.arc(centerX, centerY, waveRadius, 0, TAU)
    context.fill()

    context.beginPath()
    context.arc(centerX, centerY, waveRadius, 0, TAU)
    context.strokeStyle = `rgba(236, 205, 135, ${waveAlpha})`
    context.lineWidth = 1.4
    context.stroke()
  }

  context.textAlign = "center"
  context.textBaseline = "middle"

  field.thoughts.forEach((thought) => {
    thought.angle += thought.speed * (0.25 + whirl * 9) * deltaSeconds * CONFIG.thoughtSpeed

    if (!thought.ignited && waveActive && waveFraction > thought.radius) {
      thought.ignited = true
      thought.igniteTime = now
    }

    thought.submerge = clamp(thought.submerge + (thought.ignited ? thought.sink : -0.02) * deltaFrame, 0, 1)

    const orbitRadius = thought.radius * halfMin
    const originX = centerX + Math.cos(thought.angle) * orbitRadius
    const originY = centerY + Math.sin(thought.angle) * orbitRadius * 0.82 + Math.sin(time * thought.bobSpeed + thought.bob) * 4
    const eased = thought.submerge * thought.submerge * (3 - 2 * thought.submerge)
    const sway = Math.sin(thought.submerge * 5 + thought.bob) * thought.submerge * 16
    const x = originX + sway
    const y = originY * (1 - eased) + waterY * eased
    const sinceIgnited = thought.ignited ? now - thought.igniteTime : 0
    const flash = thought.ignited ? Math.exp(-sinceIgnited * 2.6) : 0
    const lit = thought.ignited ? Math.max(0.5, 1 - thought.submerge) : zhao * 0.25
    const fade = 1 - clamp((thought.submerge - 0.8) / 0.2, 0, 1)
    const alpha = (thought.baseAlpha * (1 + bloom * 0.8) + lit * 0.65 + flash * 0.5) * fade

    if (alpha > 0.01) {
      context.font = `300 ${thought.size}px var(--font-noto-serif-sc), "Source Han Serif SC", "Noto Serif SC", "Songti SC", serif`
      context.fillStyle = lit > 0.3 || flash > 0.1 ? `rgba(236, 205, 135, ${alpha})` : `rgba(234, 228, 210, ${alpha})`
      context.fillText(thought.char, x, y)
    }

    if (thought.submerge > 0.9 && !thought.rippled) {
      thought.rippled = true
      field.thoughtRipples.push({ x, radius: 0.01, alpha: 0.4 })

      for (let index = 0; index < 5; index += 1) {
        field.thoughtMotes.push({
          x: x + (field.random() - 0.5) * 8,
          y: waterY,
          vx: (field.random() - 0.5) * 0.5,
          vy: -(0.05 + field.random() * 0.25),
          life: 0,
          max: 0.7 + field.random() * 0.7,
        })
      }
    }

    if (thought.submerge < 0.3) {
      thought.rippled = false
    }

    if (thought.submerge >= 1 && zhao < 0.2) {
      Object.assign(thought, spawnThought(field.random))
    }
  })

  context.textAlign = "start"
  context.textBaseline = "alphabetic"

  field.thoughtMotes.forEach((mote) => {
    mote.x += mote.vx * deltaFrame
    mote.y += mote.vy * deltaFrame
    mote.vy += 0.004 * deltaFrame
    mote.life += 0.016 * deltaFrame

    const remain = 1 - mote.life / mote.max
    if (remain <= 0) {
      return
    }

    context.beginPath()
    context.arc(mote.x, mote.y, 0.8 * remain + 0.3, 0, TAU)
    context.fillStyle = `rgba(232, 199, 126, ${0.4 * remain})`
    context.fill()
  })

  field.thoughtMotes = field.thoughtMotes.filter((mote) => mote.life < mote.max)
}

function drawStillWaterReflection(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: DrawState,
  time: number,
  stir: number,
  reduceMotion: boolean,
) {
  if (!CONFIG.reflect) {
    return
  }

  const { width, height, dpr, centerX, halfMin, waterY, small } = state
  const factor = CONFIG.reflectSquash
  const stripHeight = small ? 4 : 3
  const sourceHeight = stripHeight / factor

  context.save()
  context.setTransform(1, 0, 0, 1, 0, 0)

  for (let y = waterY; y < height; y += stripHeight) {
    const sourceTop = waterY - (y + stripHeight - waterY) / factor

    if (sourceTop < 0) {
      break
    }

    const depth = (y - waterY) / (height - waterY)
    const amplitude = (reduceMotion ? 0.4 : 0.25 + stir * 8) * (0.4 + 0.7 * depth)
    const offsetX = Math.sin(y * 0.045 + time * 1.1 + depth * 3) * amplitude + Math.sin(y * 0.11 - time * 0.7) * amplitude * 0.4
    const alpha = 0.42 * (1 - depth * 0.72) * (1 - stir * 0.22)

    context.globalAlpha = Math.max(0, alpha)
    context.drawImage(
      canvas,
      0,
      sourceTop * dpr,
      width * dpr,
      sourceHeight * dpr,
      offsetX * dpr,
      y * dpr,
      width * dpr,
      (stripHeight + 1) * dpr,
    )
  }

  context.globalAlpha = 1
  context.restore()

  context.save()
  context.translate(centerX, waterY)
  context.scale(halfMin * 1.4, halfMin * 0.13)
  const waterGlow = context.createRadialGradient(0, 0, 0, 0, 0, 1)
  waterGlow.addColorStop(0, `rgba(199, 164, 104, ${0.04 * (1 - stir * 0.6)})`)
  waterGlow.addColorStop(1, "rgba(199, 164, 104, 0)")
  context.fillStyle = waterGlow
  context.fillRect(-2, -2, 4, 4)
  context.restore()
}

function drawThoughtRipples(
  context: CanvasRenderingContext2D,
  field: CosmosField,
  state: DrawState,
  deltaFrame: number,
) {
  const { halfMin, waterY } = state

  field.thoughtRipples.forEach((ripple) => {
    ripple.radius += 0.0045 * deltaFrame
    ripple.alpha *= Math.pow(0.965, deltaFrame)

    for (let index = 0; index < 2; index += 1) {
      const radius = ripple.radius * halfMin * (1 - index * 0.42)

      if (radius <= 0) {
        continue
      }

      drawScaledArc(context, ripple.x, waterY, radius, radius * 0.28, () => {
        context.strokeStyle = `rgba(199, 164, 104, ${ripple.alpha * (1 - index * 0.45)})`
        context.lineWidth = 1
        context.stroke()
      })
    }
  })

  field.thoughtRipples = field.thoughtRipples.filter((ripple) => ripple.alpha > 0.02)
}

function drawSoftFeatherMask(context: CanvasRenderingContext2D, state: DrawState) {
  const { width, centerX, centerY, halfMin, waterY } = state
  const top = centerY - halfMin * 1.3
  const bottom = CONFIG.reflect ? waterY + CONFIG.reflectSquash * (waterY - centerY + halfMin * 1.3) : centerY + halfMin * 1.22
  const maskY = (top + bottom) / 2
  const radiusY = (bottom - top) / 2
  const radiusX = Math.min(width * 0.48, halfMin * 1.32)

  context.globalCompositeOperation = "destination-in"
  context.save()
  context.translate(centerX, maskY)
  context.scale(radiusX, radiusY)

  const mask = context.createRadialGradient(0, 0, 0, 0, 0, 1)
  mask.addColorStop(0, "rgba(0, 0, 0, 1)")
  mask.addColorStop(0.52, "rgba(0, 0, 0, 1)")
  mask.addColorStop(0.75, "rgba(0, 0, 0, 0.7)")
  mask.addColorStop(0.9, "rgba(0, 0, 0, 0.2)")
  mask.addColorStop(1, "rgba(0, 0, 0, 0)")
  context.fillStyle = mask
  context.fillRect(-3, -3, 6, 6)

  context.restore()
  context.globalCompositeOperation = "source-over"
}

function HeroRightWaitingMirror({ className = "" }: HeroRightWaitingMirrorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext("2d")

    if (!context) {
      return
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    let reduceMotion = motionQuery.matches
    let drawState = setupCanvas(canvas)
    let field = createCosmosField(drawState.small)
    let animationFrame = 0
    let startTime = performance.now() / 1000 - INITIAL_PHASE_OFFSET
    let lastTime = performance.now() / 1000
    let previousPhase = 0
    let zhao = 0
    let lastZhaoTarget = 0
    let waveStart = -99
    let flash = 0
    let spinAngle = 0

    const resize = () => {
      const nextState = setupCanvas(canvas)

      if (nextState.small !== drawState.small) {
        field = createCosmosField(nextState.small)
      }

      drawState = nextState
      startTime = performance.now() / 1000 - INITIAL_PHASE_OFFSET
    }

    const drawFrame = () => {
      const now = performance.now() / 1000
      const time = reduceMotion ? 0 : now
      const deltaSeconds = reduceMotion ? 0 : Math.min(0.05, Math.max(0, now - lastTime))
      const deltaFrame = reduceMotion ? 0 : deltaSeconds * 60
      lastTime = now

      const phase = CONFIG.autoplay && !reduceMotion ? getAutoPhase(now - startTime) : 3.35
      const returning = phase < previousPhase - 0.0008
      previousPhase = phase

      const zhaoTarget = returning && phase > 0.4 ? 1 : 0
      if (zhaoTarget === 1 && lastZhaoTarget === 0) {
        waveStart = now
      }
      lastZhaoTarget = zhaoTarget

      zhao += (zhaoTarget - zhao) * (1 - Math.pow(0.95, deltaFrame))
      flash = now - waveStart >= 0 ? Math.exp(-(now - waveStart) * 2.8) : 0

      const bloom = clamp((phase - 2.5) / 1.5, 0, 1)
      const stir = Math.min(1, bloom * 0.7)
      const whirl = Math.pow(bloom, 1) + stir * 0.4
      spinAngle += (0.03 + whirl * 1.2) * deltaSeconds * CONFIG.spinSpeed

      context.setTransform(drawState.dpr, 0, 0, drawState.dpr, 0, 0)
      context.clearRect(0, 0, drawState.width, drawState.height)

      if (!reduceMotion && field.random() < 0.04 * deltaFrame) {
        const angle = field.random() * TAU
        const distance = (0.18 + field.random() * 0.82) * drawState.halfMin

        field.flares.push({
          x: drawState.centerX + Math.cos(angle) * distance,
          y: drawState.centerY + Math.sin(angle) * distance * 0.92,
          life: 0,
          max: 1.1 + field.random() * 1.6,
          size: 0.7 + field.random() * 1.3,
        })
      }

      field.flares.forEach((flare) => {
        flare.life += 0.016 * deltaFrame
      })
      field.flares = field.flares.filter((flare) => flare.life < flare.max)

      drawCosmos(context, drawState, field, time, phase, spinAngle, zhao, flash, deltaFrame)
      if (CONFIG.thoughts) {
        drawThoughts(context, drawState, field, time, bloom, zhao, now, whirl, waveStart, deltaSeconds, deltaFrame)
      }
      drawStillWaterReflection(context, canvas, drawState, time, stir, reduceMotion)
      drawThoughtRipples(context, field, drawState, deltaFrame)
      drawSoftFeatherMask(context, drawState)

      if (!reduceMotion) {
        animationFrame = window.requestAnimationFrame(drawFrame)
      }
    }

    const observer = new ResizeObserver(resize)
    const handleMotionChange = () => {
      reduceMotion = motionQuery.matches
      lastTime = performance.now() / 1000
      window.cancelAnimationFrame(animationFrame)
      drawFrame()
    }

    observer.observe(canvas)
    motionQuery.addEventListener("change", handleMotionChange)
    resize()
    drawFrame()

    return () => {
      window.cancelAnimationFrame(animationFrame)
      observer.disconnect()
      motionQuery.removeEventListener("change", handleMotionChange)
    }
  }, [])

  return (
    <figure className={`hero-right-waiting-mirror ${className}`} aria-label="待照心镜，观心系统待照一念">
      <div className="waiting-mirror-plate" aria-hidden="true">
        <canvas ref={canvasRef} className="waiting-mirror-canvas" />
      </div>

      <style jsx>{`
        .hero-right-waiting-mirror {
          pointer-events: none;
          position: relative;
          display: grid;
          width: clamp(24rem, 42vw, 50rem);
          max-width: min(50rem, 62vw);
          justify-items: center;
          opacity: 0.96;
          transform: translateY(clamp(1.5rem, 3.6vh, 2.5rem));
        }

        .waiting-mirror-plate {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1.6;
          overflow: visible;
        }

        .waiting-mirror-canvas {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        @media (max-width: 768px) {
          .hero-right-waiting-mirror {
            width: clamp(9rem, 36vw, 12rem);
            max-width: 42vw;
            opacity: 0.5;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-right-waiting-mirror {
            opacity: 0.82;
          }
        }
      `}</style>
    </figure>
  )
}

export default HeroRightWaitingMirror
