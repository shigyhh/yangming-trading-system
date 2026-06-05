"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"

export type LakeMode =
  | "still"
  | "thought"
  | "chase"
  | "hold"
  | "fantasy"
  | "gamble"
  | "herd"
  | "hesitate"
  | "delay"
  | "anxiety"
  | "liangzhi"

type LakeState = {
  speed: number
  freq: number
  whirlpool: number
  shininess: number
  bloom: number
  maskWidth: number
  colorR: number
  colorG: number
  colorB: number
}

type HeartLakeEngineProps = {
  lakeMode: LakeMode
  triggerRippleKey?: number
  className?: string
  onRipple?: () => void
  opacity?: number
  moonPathIntensity?: number
  bloomScale?: number
  rippleEnabled?: boolean
}

const LAKE_STATES: Record<LakeMode, LakeState> = {
  still: {
    speed: 0.18,
    freq: 0.75,
    whirlpool: 0,
    shininess: 260,
    bloom: 1.5,
    maskWidth: 0.55,
    colorR: 0.82,
    colorG: 0.92,
    colorB: 1,
  },
  thought: {
    speed: 0.38,
    freq: 1,
    whirlpool: 0,
    shininess: 180,
    bloom: 2.15,
    maskWidth: 0.58,
    colorR: 0.86,
    colorG: 0.94,
    colorB: 1,
  },
  chase: {
    speed: 1.25,
    freq: 1.55,
    whirlpool: 0,
    shininess: 110,
    bloom: 4,
    maskWidth: 0.8,
    colorR: 1,
    colorG: 0.82,
    colorB: 0.48,
  },
  hold: {
    speed: 0.12,
    freq: 1.05,
    whirlpool: 0.35,
    shininess: 150,
    bloom: 2.5,
    maskWidth: 0.55,
    colorR: 0.58,
    colorG: 0.68,
    colorB: 0.78,
  },
  fantasy: {
    speed: 0.38,
    freq: 0.9,
    whirlpool: 0.1,
    shininess: 90,
    bloom: 3,
    maskWidth: 0.95,
    colorR: 0.68,
    colorG: 0.78,
    colorB: 0.9,
  },
  gamble: {
    speed: 1.55,
    freq: 1.9,
    whirlpool: 0.18,
    shininess: 60,
    bloom: 5.2,
    maskWidth: 1,
    colorR: 1,
    colorG: 0.62,
    colorB: 0.34,
  },
  herd: {
    speed: 0.85,
    freq: 2.2,
    whirlpool: 0,
    shininess: 220,
    bloom: 3.4,
    maskWidth: 1.05,
    colorR: 0.72,
    colorG: 0.82,
    colorB: 0.86,
  },
  hesitate: {
    speed: 0.32,
    freq: 1.45,
    whirlpool: 0,
    shininess: 330,
    bloom: 2.8,
    maskWidth: 0.5,
    colorR: 0.76,
    colorG: 0.86,
    colorB: 0.96,
  },
  delay: {
    speed: 0.08,
    freq: 0.7,
    whirlpool: 0.05,
    shininess: 80,
    bloom: 1.7,
    maskWidth: 0.7,
    colorR: 0.42,
    colorG: 0.46,
    colorB: 0.52,
  },
  anxiety: {
    speed: 0.95,
    freq: 3,
    whirlpool: 0,
    shininess: 420,
    bloom: 3.4,
    maskWidth: 0.6,
    colorR: 0.78,
    colorG: 0.82,
    colorB: 0.92,
  },
  liangzhi: {
    speed: 0.1,
    freq: 0.55,
    whirlpool: 0,
    shininess: 300,
    bloom: 2.2,
    maskWidth: 0.45,
    colorR: 0.88,
    colorG: 0.94,
    colorB: 1,
  },
}

const waterVertexShader = `
  uniform float u_time;
  uniform float u_speed;
  uniform float u_freq;
  uniform float u_whirlpool;
  uniform float u_rippleEnabled;
  uniform vec2 u_rippleCenter;
  uniform float u_rippleStartTime;
  uniform float u_rippleStrength;

  varying vec2 vSurfacePosition;
  varying vec3 vWorldPosition;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float waterHeight(vec2 p, float time) {
    vec2 q = p * 0.055;
    float breath = 0.72 + 0.28 * sin(time * 0.31);
    float low =
      sin(p.y * 0.145 + time * (0.18 + u_speed * 0.12)) * 0.035 +
      sin((p.x * 0.21 + p.y * 0.08) - time * 0.16) * 0.028;
    float mid =
      (noise(q * vec2(2.7, 6.1) + vec2(time * 0.025, -time * 0.052)) - 0.5) * 0.18;
    float fine =
      sin(p.y * (0.8 + u_freq * 0.34) + p.x * 0.18 + time * (0.55 + u_speed * 0.32)) * 0.018;
    float swirl = 0.0;

    if (u_whirlpool > 0.001) {
      float r = length(p * vec2(0.045, 0.022));
      float a = atan(p.y, p.x);
      swirl = sin(a * 3.0 + r * 18.0 - time * 0.55) * exp(-r * 1.8) * u_whirlpool * 0.12;
    }

    return (low + mid + fine + swirl) * breath;
  }

  float rippleHeight(vec2 p, float time) {
    float age = time - u_rippleStartTime;
    if (u_rippleEnabled < 0.5 || age <= 0.0 || age > 4.8) {
      return 0.0;
    }

    float dist = length(p - u_rippleCenter);
    float radius = age * (2.7 + u_rippleStrength * 1.15);
    float width = mix(0.28, 0.74, u_rippleStrength);
    float ring = exp(-pow((dist - radius) / width, 2.0));
    float wake = exp(-dist * 0.09) * exp(-age * 1.25);

    return (ring * sin(dist * 3.4 - age * 8.2) * 0.11 + wake * 0.035) *
      exp(-age * 0.42) *
      u_rippleStrength;
  }

  void main() {
    vSurfacePosition = position.xy;

    vec3 displacedPosition = position;
    displacedPosition.z += waterHeight(position.xy, u_time);
    displacedPosition.z += rippleHeight(position.xy, u_time);

    vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
    vWorldPosition = worldPosition.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const waterFragmentShader = `
  precision highp float;

  uniform float u_time;
  uniform float u_speed;
  uniform float u_freq;
  uniform float u_whirlpool;
  uniform float u_shininess;
  uniform float u_bloom;
  uniform float u_maskWidth;
  uniform float u_moonPathIntensity;
  uniform float u_bloomScale;
  uniform float u_entryProgress;
  uniform float u_rippleEnabled;
  uniform vec2 u_rippleCenter;
  uniform float u_rippleStartTime;
  uniform float u_rippleStrength;
  uniform vec3 u_moonColor;

  varying vec2 vSurfacePosition;
  varying vec3 vWorldPosition;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float waterHeight(vec2 p, float time) {
    vec2 q = p * 0.055;
    float breath = 0.72 + 0.28 * sin(time * 0.31);
    float low =
      sin(p.y * 0.145 + time * (0.18 + u_speed * 0.12)) * 0.035 +
      sin((p.x * 0.21 + p.y * 0.08) - time * 0.16) * 0.028;
    float mid =
      (noise(q * vec2(2.7, 6.1) + vec2(time * 0.025, -time * 0.052)) - 0.5) * 0.18;
    float fine =
      sin(p.y * (0.8 + u_freq * 0.34) + p.x * 0.18 + time * (0.55 + u_speed * 0.32)) * 0.018;
    float swirl = 0.0;

    if (u_whirlpool > 0.001) {
      float r = length(p * vec2(0.045, 0.022));
      float a = atan(p.y, p.x);
      swirl = sin(a * 3.0 + r * 18.0 - time * 0.55) * exp(-r * 1.8) * u_whirlpool * 0.12;
    }

    return (low + mid + fine + swirl) * breath;
  }

  float rippleHeight(vec2 p, float time) {
    float age = time - u_rippleStartTime;
    if (u_rippleEnabled < 0.5 || age <= 0.0 || age > 4.8) {
      return 0.0;
    }

    float dist = length(p - u_rippleCenter);
    float radius = age * (2.7 + u_rippleStrength * 1.15);
    float width = mix(0.28, 0.74, u_rippleStrength);
    float ring = exp(-pow((dist - radius) / width, 2.0));
    float wake = exp(-dist * 0.09) * exp(-age * 1.25);

    return (ring * sin(dist * 3.4 - age * 8.2) * 0.11 + wake * 0.035) *
      exp(-age * 0.42) *
      u_rippleStrength;
  }

  vec3 normalFromHeight(vec2 p, float time) {
    float eps = 0.34;
    float left = waterHeight(p - vec2(eps, 0.0), time) + rippleHeight(p - vec2(eps, 0.0), time);
    float right = waterHeight(p + vec2(eps, 0.0), time) + rippleHeight(p + vec2(eps, 0.0), time);
    float back = waterHeight(p - vec2(0.0, eps), time) + rippleHeight(p - vec2(0.0, eps), time);
    float front = waterHeight(p + vec2(0.0, eps), time) + rippleHeight(p + vec2(0.0, eps), time);

    return normalize(vec3(left - right, back - front, eps * 1.85));
  }

  float moonBandLayer(
    vec2 p,
    float rowScale,
    float seed,
    float baseWidth,
    float baseHeight,
    float threshold,
    float nearLayer,
    float farLayer
  ) {
    float rowCoord = p.y * rowScale + sin(p.x * 0.05 + u_time * 0.035 + seed) * 0.28;
    float row = floor(rowCoord);
    float localY = fract(rowCoord);
    float chance = hash(vec2(row, seed));
    float rowCenter = mix(0.22, 0.78, hash(vec2(row + seed * 1.71, seed * 2.13)));
    float line = exp(-pow((localY - rowCenter) / baseHeight, 2.0) * 1.4);
    float lateral = mix(2.2, 0.22, farLayer) * (0.84 + nearLayer * 0.65);
    float offset =
      (hash(vec2(row, seed * 4.17)) - 0.5) * lateral +
      sin(u_time * 0.026 + row * 0.31 + seed) * mix(0.22, 0.035, farLayer);
    float width = max(0.08, baseWidth * (0.78 + hash(vec2(row, seed * 6.83)) * 0.86));
    width *= (1.0 + nearLayer * 1.7) * mix(1.0, 0.34, farLayer);
    float xShape = exp(-pow((p.x - offset) / width, 2.0));
    float keep = smoothstep(threshold, 1.0, chance);
    float shimmer = 0.78 + 0.22 * sin(u_time * (0.23 + chance * 0.28) + row * 0.47 + seed);

    return xShape * line * keep * shimmer;
  }

  void main() {
    vec2 p = vSurfacePosition;
    float depth = smoothstep(-54.0, 62.0, p.y);
    float nearLayer = 1.0 - depth;
    float farLayer = depth;
    float midLayer = smoothstep(-42.0, -8.0, p.y) * (1.0 - smoothstep(20.0, 62.0, p.y));
    float entryReveal = smoothstep(0.0, 0.52, u_entryProgress - depth * 0.72);

    vec3 localNormal = normalFromHeight(p, u_time);
    vec3 normal = normalize(vec3(localNormal.x, localNormal.z, -localNormal.y));
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 moonDir = normalize(vec3(-0.08, 0.74, 0.67));
    vec3 reflectDir = reflect(-moonDir, normal);

    float specular = pow(max(dot(reflectDir, viewDir), 0.0), mix(24.0, u_shininess, depth));

    float pathWidth = mix(9.2, 0.42, depth) * u_maskWidth;
    float centerWeight = exp(-pow(abs(p.x) / pathWidth, 2.0));
    float verticalWeight = smoothstep(-58.0, -38.0, p.y) * (1.0 - smoothstep(58.0, 74.0, p.y));
    float moonPathMask = centerWeight * verticalWeight * u_moonPathIntensity * entryReveal;

    vec2 bandUV = vec2(
      p.x + sin(p.y * 0.045 + u_time * 0.04) * 0.24,
      p.y + u_time * (0.11 + u_speed * 0.035)
    );

    float largePatch =
      moonBandLayer(bandUV, 0.082, 3.1, 2.35, 0.17, 0.3, nearLayer, farLayer) +
      moonBandLayer(bandUV + vec2(0.42, 2.1), 0.112, 9.4, 1.82, 0.125, 0.38, nearLayer, farLayer);
    float mediumPatch =
      moonBandLayer(bandUV + vec2(-0.32, 1.4), 0.19, 15.7, 1.28, 0.09, 0.43, nearLayer, farLayer) +
      moonBandLayer(bandUV + vec2(0.18, 3.2), 0.28, 22.2, 0.92, 0.068, 0.5, nearLayer, farLayer);
    float shardPatch =
      moonBandLayer(bandUV + vec2(0.14, 0.9), 0.55, 31.3, 0.54, 0.045, 0.5, nearLayer, farLayer) +
      moonBandLayer(bandUV + vec2(-0.22, 2.6), 0.86, 44.1, 0.38, 0.032, 0.56, nearLayer, farLayer);

    float moonPath =
      largePatch * (1.05 * nearLayer + 0.22 * midLayer) +
      mediumPatch * (0.52 + 0.42 * midLayer) +
      shardPatch * (0.34 + 0.82 * farLayer);
    moonPath *= moonPathMask * (0.25 + specular * 1.22);

    float rippleAge = u_time - u_rippleStartTime;
    float rippleRing = 0.0;

    if (u_rippleEnabled > 0.5 && rippleAge > 0.0 && rippleAge < 4.8) {
      float dist = length(p - u_rippleCenter);
      float radius = rippleAge * (2.7 + u_rippleStrength * 1.15);
      float width = mix(0.32, 0.82, u_rippleStrength);
      rippleRing = exp(-pow((dist - radius) / width, 2.0)) * exp(-rippleAge * 0.72) * u_rippleStrength;
    }

    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.2);
    float depthShade = smoothstep(-64.0, 74.0, p.y);
    vec3 deepWater = vec3(0.004, 0.011, 0.017);
    vec3 nearWater = vec3(0.012, 0.029, 0.04);
    vec3 waterColor = mix(nearWater, deepWater, depthShade);
    waterColor += vec3(0.018, 0.044, 0.06) * fresnel * (0.35 + 0.65 * (1.0 - depth));
    waterColor += vec3(0.012, 0.024, 0.028) * noise(p * vec2(0.035, 0.075) + vec2(0.0, u_time * 0.018));

    vec3 finalColor = waterColor;
    finalColor += u_moonColor * moonPath * u_bloom * u_bloomScale * 0.78;
    finalColor += u_moonColor * rippleRing * (0.04 + centerWeight * 0.055);
    finalColor = min(finalColor, vec3(0.86));

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

export default function HeartLakeEngine({
  lakeMode,
  triggerRippleKey = 0,
  className = "",
  onRipple,
  opacity = 1,
  moonPathIntensity = 1,
  bloomScale = 1,
  rippleEnabled = true,
}: HeartLakeEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const targetRef = useRef<LakeState>(LAKE_STATES[lakeMode])
  const currentRef = useRef<LakeState>({ ...LAKE_STATES[lakeMode] })
  const controlTargetRef = useRef({ moonPathIntensity, bloomScale })
  const controlCurrentRef = useRef({ moonPathIntensity, bloomScale })
  const rippleEnabledRef = useRef(rippleEnabled)
  const timeRef = useRef(0)
  const waterMeshRef = useRef<THREE.Mesh | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const pointerRef = useRef(new THREE.Vector2())
  const waterPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const rippleRef = useRef({
    centerX: 0,
    centerY: -18,
    startTime: -10,
    strength: 0,
  })
  const lastPointerRippleRef = useRef({
    x: 0,
    y: 0,
    at: 0,
  })

  useEffect(() => {
    targetRef.current = LAKE_STATES[lakeMode]
  }, [lakeMode])

  useEffect(() => {
    controlTargetRef.current = { moonPathIntensity, bloomScale }
  }, [bloomScale, moonPathIntensity])

  useEffect(() => {
    rippleEnabledRef.current = rippleEnabled
  }, [rippleEnabled])

  useEffect(() => {
    if (!rippleEnabled || triggerRippleKey === 0) return

    rippleRef.current = {
      centerX: 0,
      centerY: -18,
      startTime: timeRef.current,
      strength: 0.72,
    }

    onRipple?.()
  }, [onRipple, rippleEnabled, triggerRippleKey])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    })

    renderer.setClearColor(new THREE.Color("#05090d"), 1)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.82

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2("#05090d", 0.018)

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 220)
    camera.position.set(0, 6.2, 18)
    camera.lookAt(0, 0.15, -34)
    cameraRef.current = camera

    const uniforms = {
      u_time: { value: 0 },
      u_speed: { value: currentRef.current.speed },
      u_freq: { value: currentRef.current.freq },
      u_whirlpool: { value: currentRef.current.whirlpool },
      u_shininess: { value: currentRef.current.shininess },
      u_bloom: { value: currentRef.current.bloom },
      u_maskWidth: { value: currentRef.current.maskWidth },
      u_moonPathIntensity: { value: moonPathIntensity },
      u_bloomScale: { value: bloomScale },
      u_entryProgress: { value: 0 },
      u_rippleEnabled: { value: rippleEnabled ? 1 : 0 },
      u_rippleCenter: { value: new THREE.Vector2(0, -18) },
      u_rippleStartTime: { value: -10 },
      u_rippleStrength: { value: 0 },
      u_moonColor: {
        value: new THREE.Color(currentRef.current.colorR, currentRef.current.colorG, currentRef.current.colorB),
      },
    }

    const waterGeometry = new THREE.PlaneGeometry(92, 164, 180, 260)
    const waterMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      depthWrite: false,
      depthTest: false,
    })
    const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial)

    waterMesh.rotation.x = -Math.PI / 2
    waterMesh.position.set(0, 0, -38)
    scene.add(waterMesh)
    waterMeshRef.current = waterMesh

    const moonGlow = new THREE.Mesh(
      new THREE.CircleGeometry(4.8, 64),
      new THREE.MeshBasicMaterial({
        color: "#d8edf4",
        transparent: true,
        opacity: 0.02,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )

    moonGlow.position.set(0, 3.8, -58)
    moonGlow.lookAt(camera.position)
    scene.add(moonGlow)

    const renderPass = new RenderPass(scene, camera)
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.28, 0.76, 0.18)
    const composer = new EffectComposer(renderer)

    composer.addPass(renderPass)
    composer.addPass(bloomPass)

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth)
      const height = Math.max(1, canvas.clientHeight)
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.65)

      renderer.setPixelRatio(pixelRatio)
      renderer.setSize(width, height, false)
      composer.setPixelRatio(pixelRatio)
      composer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    const startedAt = performance.now()
    const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor
    let animationFrameId = 0

    const render = () => {
      resize()

      const time = (performance.now() - startedAt) / 1000
      timeRef.current = time

      const current = currentRef.current
      const target = targetRef.current
      const factor = 0.035

      current.speed = lerp(current.speed, target.speed, factor)
      current.freq = lerp(current.freq, target.freq, factor)
      current.whirlpool = lerp(current.whirlpool, target.whirlpool, factor)
      current.shininess = lerp(current.shininess, target.shininess, factor)
      current.bloom = lerp(current.bloom, target.bloom, factor)
      current.maskWidth = lerp(current.maskWidth, target.maskWidth, factor)
      current.colorR = lerp(current.colorR, target.colorR, factor)
      current.colorG = lerp(current.colorG, target.colorG, factor)
      current.colorB = lerp(current.colorB, target.colorB, factor)

      const controlCurrent = controlCurrentRef.current
      const controlTarget = controlTargetRef.current
      controlCurrent.moonPathIntensity = lerp(controlCurrent.moonPathIntensity, controlTarget.moonPathIntensity, factor)
      controlCurrent.bloomScale = lerp(controlCurrent.bloomScale, controlTarget.bloomScale, factor)

      uniforms.u_time.value = time
      uniforms.u_speed.value = current.speed
      uniforms.u_freq.value = current.freq
      uniforms.u_whirlpool.value = current.whirlpool
      uniforms.u_shininess.value = current.shininess
      uniforms.u_bloom.value = current.bloom
      uniforms.u_maskWidth.value = current.maskWidth
      uniforms.u_moonPathIntensity.value = controlCurrent.moonPathIntensity
      uniforms.u_bloomScale.value = controlCurrent.bloomScale
      uniforms.u_entryProgress.value = Math.min(1, time / 4.4)
      uniforms.u_rippleEnabled.value = rippleEnabledRef.current ? 1 : 0
      uniforms.u_rippleCenter.value.set(rippleRef.current.centerX, rippleRef.current.centerY)
      uniforms.u_rippleStartTime.value = rippleRef.current.startTime
      uniforms.u_rippleStrength.value = rippleRef.current.strength
      uniforms.u_moonColor.value.setRGB(current.colorR, current.colorG, current.colorB)
      bloomPass.strength = 0.18 + current.bloom * controlCurrent.bloomScale * 0.045

      composer.render()
      animationFrameId = window.requestAnimationFrame(render)
    }

    resize()
    animationFrameId = window.requestAnimationFrame(render)
    window.addEventListener("resize", resize)

    return () => {
      window.removeEventListener("resize", resize)
      window.cancelAnimationFrame(animationFrameId)
      composer.dispose()
      waterGeometry.dispose()
      waterMaterial.dispose()
      moonGlow.geometry.dispose()
      ;(moonGlow.material as THREE.Material).dispose()
      renderer.dispose()
      waterMeshRef.current = null
      cameraRef.current = null
    }
  }, [bloomScale, moonPathIntensity, rippleEnabled])

  const pointerToWater = (clientX: number, clientY: number) => {
    if (!rippleEnabled) return

    const canvas = canvasRef.current
    const camera = cameraRef.current
    const waterMesh = waterMeshRef.current

    if (!canvas || !camera || !waterMesh) return

    const rect = canvas.getBoundingClientRect()
    pointerRef.current.set(((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1))
    raycasterRef.current.setFromCamera(pointerRef.current, camera)

    const hit = new THREE.Vector3()

    if (!raycasterRef.current.ray.intersectPlane(waterPlaneRef.current, hit)) return

    const localHit = waterMesh.worldToLocal(hit.clone())

    return {
      x: localHit.x,
      y: localHit.y,
    }
  }

  const triggerPointerRipple = (
    clientX: number,
    clientY: number,
    kind: "move" | "press",
    pressure = 0,
  ) => {
    if (!rippleEnabled) return

    const waterPoint = pointerToWater(clientX, clientY)
    if (!waterPoint) return

    if (kind === "move") {
      const now = performance.now()
      const last = lastPointerRippleRef.current
      const dx = clientX - last.x
      const dy = clientY - last.y
      const distance = Math.hypot(dx, dy)

      if (now - last.at < 170 || distance < 22) return

      lastPointerRippleRef.current = {
        x: clientX,
        y: clientY,
        at: now,
      }
    }

    const baseStrength = kind === "press" ? 0.74 : 0.2
    const pressureStrength = Math.max(0, Math.min(1, pressure || 0)) * 0.36

    rippleRef.current = {
      centerX: waterPoint.x,
      centerY: waterPoint.y,
      startTime: timeRef.current,
      strength: Math.min(1, baseStrength + pressureStrength),
    }

    onRipple?.()
  }

  return (
    <canvas
      ref={canvasRef}
      onPointerMove={(event) => triggerPointerRipple(event.clientX, event.clientY, "move", event.pressure)}
      onPointerDown={(event) => triggerPointerRipple(event.clientX, event.clientY, "press", event.pressure)}
      className={`absolute inset-0 h-full w-full touch-none ${className}`}
      style={{
        cursor: "default",
        opacity,
        transition: "opacity 1600ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
      aria-hidden="true"
    />
  )
}
