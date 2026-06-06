export type ThoughtFieldConfig = {
  animationSpeed: number
  backgroundGrain: number
  centerFireIntensity: number
  cloudRadius: number
  goldIntensity: number
  horseMindStrength: number
  innerVoidRadius: number
  maxThreads: number
  mistOpacity: number
  monkeyMindStrength: number
  outerScatter: number
  particleCount: number
  pixelRatioMax: number
  returnStrength: number
  seed: number
  threadOpacity: number
}

export const THOUGHT_FIELD_CONFIG: ThoughtFieldConfig = {
  animationSpeed: 0.56,
  backgroundGrain: 0.16,
  centerFireIntensity: 0.62,
  cloudRadius: 0.61,
  goldIntensity: 1.32,
  horseMindStrength: 0.82,
  innerVoidRadius: 0.235,
  maxThreads: 72,
  mistOpacity: 0.16,
  monkeyMindStrength: 0.88,
  outerScatter: 0.3,
  particleCount: 1240,
  pixelRatioMax: 2,
  returnStrength: 0.018,
  seed: 20260606,
  threadOpacity: 0.042,
}

export const THOUGHT_FIELD_LIMITS = {
  animationSpeed: { min: 0.15, max: 1.25, step: 0.01 },
  backgroundGrain: { min: 0, max: 0.34, step: 0.01 },
  centerFireIntensity: { min: 0.1, max: 1, step: 0.01 },
  cloudRadius: { min: 0.42, max: 0.82, step: 0.01 },
  goldIntensity: { min: 0.35, max: 1.25, step: 0.01 },
  horseMindStrength: { min: 0, max: 1.5, step: 0.01 },
  innerVoidRadius: { min: 0.1, max: 0.34, step: 0.01 },
  mistOpacity: { min: 0, max: 0.38, step: 0.01 },
  monkeyMindStrength: { min: 0, max: 1.5, step: 0.01 },
  outerScatter: { min: 0.05, max: 0.42, step: 0.01 },
  particleCount: { min: 520, max: 1400, step: 20 },
  returnStrength: { min: 0.004, max: 0.04, step: 0.001 },
  threadOpacity: { min: 0, max: 0.14, step: 0.005 },
} as const
