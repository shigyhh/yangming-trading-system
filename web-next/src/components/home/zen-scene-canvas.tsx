"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

export function ZenSceneCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const isMobile = window.matchMedia("(max-width: 720px)").matches
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      canvas,
      powerPreference: "low-power",
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.25))

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100)
    camera.position.set(0, 0, 7)

    const particleCount = isMobile ? 46 : 118
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    for (let index = 0; index < particleCount; index += 1) {
      const layer = Math.random()
      const radius = 2.2 + Math.random() * 5.6
      const angle = Math.random() * Math.PI * 2
      positions[index * 3] = Math.cos(angle) * radius
      positions[index * 3 + 1] = (Math.random() - 0.5) * 5
      positions[index * 3 + 2] = -layer * 5.2 + Math.sin(angle) * 0.58

      const goldMix = Math.random() * 0.7
      colors[index * 3] = 0.42 + goldMix * 0.38
      colors[index * 3 + 1] = 0.52 + goldMix * 0.18
      colors[index * 3 + 2] = 0.46 - goldMix * 0.1
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: isMobile ? 0.02 : 0.024,
      transparent: true,
      opacity: isMobile ? 0.12 : 0.18,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const particles = new THREE.Points(geometry, material)
    scene.add(particles)

    let frame = 0
    let disposed = false
    const started = performance.now()
    const rippleResponse = {
      started: -Infinity,
      x: 0,
      y: 0,
    }

    function resize() {
      const width = window.innerWidth
      const height = window.innerHeight
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
    }

    function render(now: number) {
      if (disposed) return
      const time = (now - started) / 1000
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
      const scroll = window.scrollY / max
      const responseAge = (now - rippleResponse.started) / 1500
      const response =
        responseAge >= 0 && responseAge < 1
          ? Math.sin(responseAge * Math.PI) * Math.pow(1 - responseAge, 0.65)
          : 0

      particles.rotation.y =
        Math.sin(time * 0.028) * 0.06 + scroll * 0.035 + rippleResponse.x * response * 0.018
      particles.rotation.x = Math.cos(time * 0.022) * 0.024 + rippleResponse.y * response * 0.012
      particles.position.x = rippleResponse.x * response * 0.045
      particles.position.y = -rippleResponse.y * response * 0.03
      material.opacity =
        (isMobile ? 0.1 : 0.16) + Math.sin((time * Math.PI) / 12) * 0.018 + response * 0.026
      renderer.render(scene, camera)
      frame = window.requestAnimationFrame(render)
    }

    function handleMindRipple(event: Event) {
      const detail = (event as CustomEvent<{ x: number; y: number }>).detail
      rippleResponse.started = performance.now()
      rippleResponse.x = (detail?.x ?? 0.5) - 0.5
      rippleResponse.y = (detail?.y ?? 0.5) - 0.5
    }

    resize()
    window.addEventListener("resize", resize, { passive: true })
    window.addEventListener("mind-ripple", handleMindRipple)
    frame = window.requestAnimationFrame(render)

    return () => {
      disposed = true
      window.cancelAnimationFrame(frame)
      window.removeEventListener("resize", resize)
      window.removeEventListener("mind-ripple", handleMindRipple)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 h-screen w-screen opacity-35 mix-blend-screen md:opacity-45"
      aria-hidden="true"
    />
  )
}
