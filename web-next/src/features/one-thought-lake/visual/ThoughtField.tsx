"use client"

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react"
import * as THREE from "three"

import type { OneThoughtLakeEntry } from "@/features/one-thought-lake/oneThoughtLakeEngine"
import { THOUGHT_FIELD_CONFIG, THOUGHT_FIELD_LIMITS, type ThoughtFieldConfig } from "./config"
import { createSeededRandom, fractalNoise2d } from "./noise"
import { thoughtParticleFragmentShader, thoughtParticleVertexShader } from "./shaders"

type ThoughtFieldProps = {
  entries: OneThoughtLakeEntry[]
  onPreview: (entry: OneThoughtLakeEntry | null) => void
  onSelect: (entry: OneThoughtLakeEntry) => void
  selectedEntryId: string | null
}

type ParticleStore = {
  alpha: Float32Array
  color: Float32Array
  depth: Float32Array
  entryIndex: Uint16Array
  geometry: THREE.BufferGeometry
  home: Float32Array
  phase: Float32Array
  position: Float32Array
  radius: Float32Array
  size: Float32Array
  velocity: Float32Array
  xScale: number
  yScale: number
}

type ThreadStore = {
  geometry: THREE.BufferGeometry
  material: THREE.LineBasicMaterial
  pairs: Uint16Array
  position: Float32Array
}

const goldPalette = [
  [0.72, 0.6, 0.32],
  [0.83, 0.74, 0.46],
  [0.95, 0.84, 0.56],
  [0.58, 0.5, 0.28],
] as const

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function createFireTexture() {
  const canvas = document.createElement("canvas")
  canvas.width = 96
  canvas.height = 96
  const context = canvas.getContext("2d")
  if (!context) return new THREE.CanvasTexture(canvas)

  const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 44)
  gradient.addColorStop(0, "rgba(244,223,155,0.92)")
  gradient.addColorStop(0.28, "rgba(212,189,121,0.36)")
  gradient.addColorStop(0.72, "rgba(184,154,85,0.08)")
  gradient.addColorStop(1, "rgba(184,154,85,0)")
  context.fillStyle = gradient
  context.fillRect(0, 0, 96, 96)

  return new THREE.CanvasTexture(canvas)
}

function buildParticles(config: ThoughtFieldConfig, width: number, height: number, entryCount: number) {
  const random = createSeededRandom(config.seed)
  const count = Math.max(240, Math.trunc(config.particleCount))
  const base = Math.min(width, height) * 0.5
  const xScale = base * 1.36
  const yScale = base * 0.74
  const position = new Float32Array(count * 3)
  const home = new Float32Array(count * 3)
  const velocity = new Float32Array(count * 3)
  const color = new Float32Array(count * 3)
  const size = new Float32Array(count)
  const alpha = new Float32Array(count)
  const phase = new Float32Array(count)
  const depth = new Float32Array(count)
  const radius = new Float32Array(count)
  const entryIndex = new Uint16Array(count)

  for (let index = 0; index < count; index += 1) {
    const angle = random() * Math.PI * 2
    const band = random()
    const inMainCloud = band < 0.74
    const nearVoid = random() < 0.035
    const inner = config.innerVoidRadius + (nearVoid ? random() * 0.035 : 0.04)
    const radial = inMainCloud
      ? inner + Math.pow(random(), 0.62) * Math.max(0.05, config.cloudRadius - inner)
      : config.cloudRadius + Math.pow(random(), 0.55) * config.outerScatter
    const contour =
      1 +
      Math.sin(angle * 2.7 + 1.8) * 0.16 +
      Math.sin(angle * 5.2 + 0.4) * 0.1 +
      fractalNoise2d(Math.cos(angle) * 1.7, Math.sin(angle) * 1.7, config.seed, 3) * 0.18
    const r = Math.max(config.innerVoidRadius + 0.038, radial * contour)
    const leftPull = Math.max(0, -Math.cos(angle)) * 0.08
    const rightTrail = Math.max(0, Math.cos(angle)) * 0.13
    const smokeDrift =
      fractalNoise2d(Math.cos(angle) * 2.4 + r, Math.sin(angle) * 2.2 - r, config.seed + 31, 2) * base * 0.052
    const x = Math.cos(angle) * r * xScale * (1 + rightTrail - leftPull) + smokeDrift
    const y =
      Math.sin(angle) * r * yScale * (1 + Math.sin(angle + 0.8) * 0.055) +
      Math.sin(angle * 3.4 + r * 2.1) * base * 0.026
    const z = (random() - 0.5) * 96
    const offset = index * 3
    const palette = goldPalette[Math.floor(random() * goldPalette.length)]
    const bright = random() > 0.975
    const sizeRoll = random()

    position[offset] = x
    position[offset + 1] = y
    position[offset + 2] = z
    home[offset] = x
    home[offset + 1] = y
    home[offset + 2] = z
    color[offset] = palette[0] * (bright ? 1.12 : 0.92 + random() * 0.14)
    color[offset + 1] = palette[1] * (bright ? 1.08 : 0.9 + random() * 0.12)
    color[offset + 2] = palette[2] * (bright ? 1.06 : 0.88 + random() * 0.12)
    size[index] =
      sizeRoll < 0.82
        ? 1.02 + random() * 1.38
        : sizeRoll < 0.975
          ? 2.15 + random() * 2.2
          : 4.15 + random() * 2.4
    alpha[index] = clamp(0.24 + Math.pow(random(), 0.8) * 0.52 + (bright ? 0.18 : 0), 0.24, 0.94)
    phase[index] = random() * Math.PI * 2
    depth[index] = random()
    radius[index] = r
    entryIndex[index] = entryCount ? index % entryCount : 0
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3))
  geometry.setAttribute("aColor", new THREE.BufferAttribute(color, 3))
  geometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1))
  geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1))
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1))
  geometry.setAttribute("aDepth", new THREE.BufferAttribute(depth, 1))

  return { alpha, color, depth, entryIndex, geometry, home, phase, position, radius, size, velocity, xScale, yScale }
}

function buildThreads(particles: ParticleStore, config: ThoughtFieldConfig) {
  const random = createSeededRandom(config.seed + 99)
  const count = particles.position.length / 3
  const maxPairs = Math.max(0, Math.trunc(config.maxThreads))
  const pairs: number[] = []
  const grid = new Map<string, number[]>()
  const cellSize = Math.max(34, Math.min(particles.xScale, particles.yScale) * 0.1)

  for (let index = 0; index < count; index += 3) {
    const offset = index * 3
    const x = particles.home[offset]
    const y = particles.home[offset + 1]
    const keyX = Math.floor(x / cellSize)
    const keyY = Math.floor(y / cellSize)

    for (let gx = keyX - 1; gx <= keyX + 1; gx += 1) {
      for (let gy = keyY - 1; gy <= keyY + 1; gy += 1) {
        const candidates = grid.get(`${gx}:${gy}`)
        if (!candidates) continue
        for (const candidate of candidates) {
          if (pairs.length / 2 >= maxPairs) break
          const candidateOffset = candidate * 3
          const dx = x - particles.home[candidateOffset]
          const dy = y - particles.home[candidateOffset + 1]
          const distance = Math.hypot(dx, dy)
          if (distance > 24 && distance < cellSize * 1.06 && random() < 0.07) {
            pairs.push(index, candidate)
          }
        }
      }
    }

    const key = `${keyX}:${keyY}`
    const bucket = grid.get(key) ?? []
    bucket.push(index)
    grid.set(key, bucket)
  }

  const pairArray = new Uint16Array(pairs)
  const position = new Float32Array((pairArray.length / 2) * 4 * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3))
  const material = new THREE.LineBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: 0xb89a55,
    depthWrite: false,
    opacity: config.threadOpacity,
    transparent: true,
  })

  return { geometry, material, pairs: pairArray, position }
}

function updateThreads(threads: ThreadStore, particles: ParticleStore, time: number) {
  const source = particles.position
  let write = 0

  for (let index = 0; index < threads.pairs.length; index += 2) {
    const first = threads.pairs[index] * 3
    const second = threads.pairs[index + 1] * 3
    const x1 = source[first]
    const y1 = source[first + 1]
    const z1 = source[first + 2]
    const x2 = source[second]
    const y2 = source[second + 1]
    const z2 = source[second + 2]
    const dx = x2 - x1
    const dy = y2 - y1
    const length = Math.hypot(dx, dy) || 1
    const bend = Math.sin(time * 0.46 + index * 0.37) * 4.6
    const mx = (x1 + x2) * 0.5 - (dy / length) * bend
    const my = (y1 + y2) * 0.5 + (dx / length) * bend
    const mz = (z1 + z2) * 0.5 + Math.sin(time * 0.4 + index) * 3

    threads.position[write++] = x1
    threads.position[write++] = y1
    threads.position[write++] = z1
    threads.position[write++] = mx
    threads.position[write++] = my
    threads.position[write++] = mz
    threads.position[write++] = mx
    threads.position[write++] = my
    threads.position[write++] = mz
    threads.position[write++] = x2
    threads.position[write++] = y2
    threads.position[write++] = z2
  }

  threads.geometry.attributes.position.needsUpdate = true
}

function updateParticles(
  particles: ParticleStore,
  config: ThoughtFieldConfig,
  time: number,
  pointer: { active: boolean; x: number; y: number },
) {
  const position = particles.position
  const home = particles.home
  const velocity = particles.velocity
  const speed = config.animationSpeed
  const innerVoid = config.innerVoidRadius

  for (let index = 0; index < position.length / 3; index += 1) {
    const offset = index * 3
    const x = position[offset]
    const y = position[offset + 1]
    const z = position[offset + 2]
    const hx = home[offset]
    const hy = home[offset + 1]
    const hz = home[offset + 2]
    const phase = particles.phase[index]
    const nx = fractalNoise2d(index * 0.013 + time * 0.035, phase + time * 0.024, config.seed, 2)
    const ny = fractalNoise2d(phase + time * 0.022, index * 0.011 - time * 0.028, config.seed + 17, 2)
    const normalizedDistance = Math.hypot(x / particles.xScale, y / particles.yScale)
    const safeDistance = Math.max(normalizedDistance, 0.001)
    const tangentX = -(y / particles.yScale) / safeDistance
    const tangentY = (x / particles.xScale) / safeDistance
    const leftWeight = clamp(-x / (particles.xScale * 0.68), 0, 1)
    const rightWeight = clamp(x / (particles.xScale * 0.7), 0, 1)
    const centerStillness = 1 - clamp(Math.abs(x) / (particles.xScale * 0.36), 0, 1)
    const breath = Math.sin(time * 0.28 + phase) * 0.0028
    let fx =
      nx * 0.038 * speed +
      tangentX * 0.006 * speed +
      (hx - x) * config.returnStrength +
      hx * breath
    let fy =
      ny * 0.034 * speed +
      tangentY * 0.004 * speed +
      (hy - y) * config.returnStrength +
      hy * breath
    let fz = (hz - z) * config.returnStrength * 0.72 + Math.sin(time * 0.45 + phase) * 0.025

    if (normalizedDistance < innerVoid + 0.042) {
      const push = (innerVoid + 0.054 - normalizedDistance) * 1.6
      fx += (x / particles.xScale / safeDistance) * push
      fy += (y / particles.yScale / safeDistance) * push
    }

    if (leftWeight > 0) {
      fx += Math.sin(time * 2.1 + phase * 2.1) * 0.056 * config.monkeyMindStrength * leftWeight
      fy += Math.abs(Math.sin(time * 2.9 + phase)) * 0.076 * config.monkeyMindStrength * leftWeight
    }

    if (rightWeight > 0) {
      fx +=
        (Math.sin(time * 1.02 + phase) * 0.066 + 0.032) *
        config.horseMindStrength *
        rightWeight
      fy += Math.sin(time * 0.82 + phase * 0.7) * 0.018 * config.horseMindStrength * rightWeight
    }

    if (pointer.active) {
      const dx = x - pointer.x
      const dy = y - pointer.y
      const distance = Math.hypot(dx, dy)
      if (distance < 120 && distance > 1) {
        const force = (1 - distance / 120) * 0.038
        fx += (dx / distance) * force
        fy += (dy / distance) * force
      }
    }

    fx *= 1 - centerStillness * 0.36
    fy *= 1 - centerStillness * 0.36

    velocity[offset] = (velocity[offset] + fx) * 0.925
    velocity[offset + 1] = (velocity[offset + 1] + fy) * 0.925
    velocity[offset + 2] = (velocity[offset + 2] + fz) * 0.91
    position[offset] += velocity[offset]
    position[offset + 1] += velocity[offset + 1]
    position[offset + 2] += velocity[offset + 2]
  }

  particles.geometry.attributes.position.needsUpdate = true
}

export function ThoughtField({ entries, onPreview, onSelect, selectedEntryId }: ThoughtFieldProps) {
  const canvasMountRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const entriesRef = useRef(entries)
  const onPreviewRef = useRef(onPreview)
  const onSelectRef = useRef(onSelect)
  const selectedEntryIdRef = useRef(selectedEntryId)
  const hoverEntryIdRef = useRef<string | null>(null)
  const pointerRef = useRef({
    active: false,
    fieldX: 0,
    fieldY: 0,
    hovering: false,
    screenX: 0,
    screenY: 0,
    startX: 0,
    startY: 0,
    travel: 0,
  })
  const pausedRef = useRef(false)
  const resetSignalRef = useRef(0)
  const [showDebug, setShowDebug] = useState(false)
  const [config, setConfig] = useState<ThoughtFieldConfig>(THOUGHT_FIELD_CONFIG)

  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  useEffect(() => {
    onPreviewRef.current = onPreview
  }, [onPreview])

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    selectedEntryIdRef.current = selectedEntryId
  }, [selectedEntryId])

  useEffect(() => {
    const mount = canvasMountRef.current
    if (!mount) return
    const mountNode = mount

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 16 / 9, 1, 2000)
    camera.position.set(0, 0, 760)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, preserveDrawingBuffer: true })
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    rendererRef.current = renderer
    mountNode.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    const particleMaterial = new THREE.ShaderMaterial({
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fragmentShader: thoughtParticleFragmentShader,
      transparent: true,
      uniforms: {
        uGoldIntensity: { value: config.goldIntensity },
        uPixelRatio: { value: 1 },
        uTime: { value: 0 },
      },
      vertexShader: thoughtParticleVertexShader,
    })

    let particles: ParticleStore | null = null
    let points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null
    let threads: ThreadStore | null = null
    let threadLines: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null
    const fireTexture = createFireTexture()
    const fire = new THREE.Sprite(
      new THREE.SpriteMaterial({
        blending: THREE.AdditiveBlending,
        color: 0xf4df9b,
        depthWrite: false,
        map: fireTexture,
        opacity: config.centerFireIntensity * 0.32,
        transparent: true,
      }),
    )
    fire.scale.set(18, 18, 1)
    fire.position.set(0, -2, 18)
    scene.add(fire)

    function disposeField() {
      if (points) group.remove(points)
      if (threadLines) group.remove(threadLines)
      particles?.geometry.dispose()
      threads?.geometry.dispose()
      threads?.material.dispose()
      points = null
      threadLines = null
      particles = null
      threads = null
    }

    function buildField() {
      disposeField()
      const width = Math.max(640, mountNode.clientWidth)
      const height = Math.max(360, mountNode.clientHeight)
      particles = buildParticles(config, width, height, Math.max(1, entriesRef.current.length))
      points = new THREE.Points(particles.geometry, particleMaterial)
      group.add(points)

      threads = buildThreads(particles, config)
      threadLines = new THREE.LineSegments(threads.geometry, threads.material)
      group.add(threadLines)
    }

    function resize() {
      const width = Math.max(320, mountNode.clientWidth)
      const height = Math.max(180, mountNode.clientHeight)
      const dpr = Math.min(window.devicePixelRatio || 1, config.pixelRatioMax)
      renderer.setPixelRatio(dpr)
      renderer.setSize(width, height, false)
      particleMaterial.uniforms.uPixelRatio.value = dpr
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    function updateHover(frame: number) {
      if (!particles || !pointerRef.current.hovering || frame % 5 !== 0) return

      const width = mountNode.clientWidth || 1
      const height = mountNode.clientHeight || 1
      const pointer = pointerRef.current
      const projected = new THREE.Vector3()
      let nearestIndex = -1
      let nearestDistance = 96

      for (let index = 0; index < particles.position.length / 3; index += 1) {
        const offset = index * 3
        projected.set(particles.position[offset], particles.position[offset + 1], particles.position[offset + 2])
        projected.project(camera)
        const screenX = (projected.x * 0.5 + 0.5) * width
        const screenY = (-projected.y * 0.5 + 0.5) * height
        const distance = Math.hypot(screenX - pointer.screenX, screenY - pointer.screenY)
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestIndex = index
        }
      }

      const entry = nearestIndex >= 0 ? entriesRef.current[particles.entryIndex[nearestIndex]] ?? null : null
      const nextId = entry?.id ?? null
      if (hoverEntryIdRef.current !== nextId) {
        hoverEntryIdRef.current = nextId
        onPreviewRef.current(entry)
      }
    }

    resize()
    buildField()

    let animationFrame = 0
    let frame = 0
    const clock = new THREE.Clock()

    function animate() {
      animationFrame = window.requestAnimationFrame(animate)
      if (pausedRef.current) {
        renderer.render(scene, camera)
        return
      }

      frame += 1
      const time = clock.getElapsedTime() * config.animationSpeed
      particleMaterial.uniforms.uTime.value = time
      particleMaterial.uniforms.uGoldIntensity.value = config.goldIntensity
      if (threadLines) threadLines.material.opacity = config.threadOpacity
      fire.material.opacity = config.centerFireIntensity * (0.22 + Math.sin(time * 0.9) * 0.04 + 0.1)
      fire.scale.setScalar(16 + Math.sin(time * 0.7) * 1.6)

      if (particles) {
        updateParticles(particles, config, time, {
          active: pointerRef.current.active,
          x: pointerRef.current.fieldX,
          y: pointerRef.current.fieldY,
        })
      }
      if (threads && particles) updateThreads(threads, particles, time)
      updateHover(frame)
      renderer.render(scene, camera)
    }

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize)
    observer?.observe(mountNode)
    window.addEventListener("resize", resize)
    animationFrame = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener("resize", resize)
      observer?.disconnect()
      disposeField()
      particleMaterial.dispose()
      fire.material.dispose()
      fireTexture.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      rendererRef.current = null
    }
  }, [config, resetSignalRef.current])

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const pointer = pointerRef.current
    pointer.hovering = true
    pointer.screenX = event.clientX - rect.left
    pointer.screenY = event.clientY - rect.top
    pointer.fieldX = pointer.screenX - rect.width / 2
    pointer.fieldY = -(pointer.screenY - rect.height / 2)
    if (pointer.active) {
      pointer.travel += Math.abs(event.clientX - pointer.startX) + Math.abs(event.clientY - pointer.startY)
      pointer.startX = event.clientX
      pointer.startY = event.clientY
    }
  }, [])

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    pointerRef.current = {
      active: true,
      fieldX: event.clientX - rect.left - rect.width / 2,
      fieldY: -(event.clientY - rect.top - rect.height / 2),
      hovering: true,
      screenX: event.clientX - rect.left,
      screenY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      travel: 0,
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    const hovered = hoverEntryIdRef.current
    pointerRef.current.active = false
    if (hovered && pointerRef.current.travel < 18) {
      const entry = entriesRef.current.find((item) => item.id === hovered)
      if (entry) onSelectRef.current(entry)
    }
  }, [])

  const handlePointerLeave = useCallback(() => {
    pointerRef.current.hovering = false
    pointerRef.current.active = false
    hoverEntryIdRef.current = null
    onPreviewRef.current(null)
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code === "Space") {
        event.preventDefault()
        pausedRef.current = !pausedRef.current
      }
      if (event.key.toLowerCase() === "h") setShowDebug((current) => !current)
      if (event.key.toLowerCase() === "r") {
        resetSignalRef.current += 1
        setConfig((current) => ({ ...current }))
      }
      if (event.key.toLowerCase() === "s") {
        const canvas = rendererRef.current?.domElement
        if (!canvas) return
        const link = document.createElement("a")
        link.download = "wan-nian-gui-xin.png"
        link.href = canvas.toDataURL("image/png")
        link.click()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  function updateConfig<Key extends keyof ThoughtFieldConfig>(key: Key, value: number) {
    setConfig((current) => ({
      ...current,
      [key]: key === "particleCount" ? Math.trunc(value) : value,
    }))
  }

  return (
    <section className="thought-field" aria-label="万念归心动态心湖">
      <div
        ref={canvasMountRef}
        className="thought-field-canvas"
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <div
        className="thought-field-mist"
        style={
          {
            "--grain-opacity": config.backgroundGrain,
            "--mist-opacity": config.mistOpacity,
          } as CSSProperties
        }
      />
      {showDebug ? (
        <div className="thought-debug-panel">
          {(
            [
              "particleCount",
              "innerVoidRadius",
              "cloudRadius",
              "outerScatter",
              "goldIntensity",
              "threadOpacity",
              "mistOpacity",
              "animationSpeed",
              "monkeyMindStrength",
              "horseMindStrength",
              "returnStrength",
              "centerFireIntensity",
              "backgroundGrain",
            ] as const
          ).map((key) => {
            const limit = THOUGHT_FIELD_LIMITS[key]
            return (
              <label key={key}>
                <span>{key}</span>
                <input
                  type="range"
                  min={limit.min}
                  max={limit.max}
                  step={limit.step}
                  value={config[key]}
                  onChange={(event) => updateConfig(key, Number(event.target.value))}
                />
              </label>
            )
          })}
          <p>Space 暂停 · H 隐藏 · R 重置 · S 截图</p>
        </div>
      ) : null}

      <style jsx>{`
        .thought-field {
          position: absolute;
          left: 50%;
          top: 60%;
          z-index: 1;
          width: min(82rem, 88vw);
          aspect-ratio: 16 / 9;
          max-height: 62svh;
          transform: translate(-50%, -50%);
          user-select: none;
        }

        .thought-field-canvas,
        .thought-field-mist {
          position: absolute;
          inset: 0;
          border-radius: 42%;
        }

        .thought-field-canvas {
          z-index: 2;
          cursor: default;
          overflow: hidden;
          touch-action: none;
        }

        .thought-field-canvas :global(canvas) {
          display: block;
          width: 100%;
          height: 100%;
        }

        .thought-field-mist {
          z-index: 1;
          pointer-events: none;
          opacity: var(--mist-opacity);
          background:
            radial-gradient(ellipse at 48% 52%, rgba(216, 183, 111, 0.08), transparent 34%),
            radial-gradient(ellipse at 35% 46%, rgba(18, 35, 29, 0.42), transparent 36%),
            radial-gradient(ellipse at 66% 56%, rgba(95, 132, 117, 0.13), transparent 42%);
          filter: blur(10px);
          mix-blend-mode: screen;
        }

        .thought-field-mist::after {
          content: "";
          position: absolute;
          inset: -12%;
          opacity: var(--grain-opacity);
          background-image:
            radial-gradient(circle at 12% 22%, rgba(244, 235, 221, 0.24) 0 1px, transparent 1px),
            radial-gradient(circle at 76% 64%, rgba(216, 183, 111, 0.18) 0 1px, transparent 1px);
          background-size: 47px 43px, 61px 59px;
          mask-image: radial-gradient(ellipse at center, black 22%, transparent 72%);
        }

        .thought-debug-panel {
          position: absolute;
          right: 0;
          top: 2.8rem;
          z-index: 6;
          display: grid;
          gap: 0.46rem;
          width: min(19rem, 78vw);
          border: 1px solid rgba(216, 183, 111, 0.13);
          border-radius: 1rem;
          background: rgba(4, 6, 5, 0.78);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
          padding: 0.82rem;
          backdrop-filter: blur(18px);
        }

        .thought-debug-panel label {
          display: grid;
          grid-template-columns: 8.4rem minmax(0, 1fr);
          gap: 0.6rem;
          align-items: center;
          color: rgba(220, 212, 195, 0.52);
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 0.68rem;
        }

        .thought-debug-panel input {
          width: 100%;
          accent-color: #b89a55;
        }

        .thought-debug-panel p {
          margin: 0.25rem 0 0;
          color: rgba(216, 183, 111, 0.46);
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 0.66rem;
          letter-spacing: 0.08em;
        }

        @media (max-width: 720px) {
          .thought-field {
            position: relative;
            left: auto;
            top: auto;
            width: min(100vw, 42rem);
            max-height: none;
            margin: 0.4rem auto 0;
            transform: none;
          }
        }
      `}</style>
    </section>
  )
}
