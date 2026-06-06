export type SeededRandom = () => number

export function createSeededRandom(seed: number): SeededRandom {
  let state = seed >>> 0

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function valueNoise2d(x: number, y: number, seed = 0) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)

  const a = hash(ix, iy, seed)
  const b = hash(ix + 1, iy, seed)
  const c = hash(ix, iy + 1, seed)
  const d = hash(ix + 1, iy + 1, seed)

  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1
}

export function fractalNoise2d(x: number, y: number, seed = 0, octaves = 3) {
  let amplitude = 0.5
  let frequency = 1
  let total = 0
  let normalizer = 0

  for (let index = 0; index < octaves; index += 1) {
    total += valueNoise2d(x * frequency, y * frequency, seed + index * 131) * amplitude
    normalizer += amplitude
    amplitude *= 0.52
    frequency *= 2.04
  }

  return total / normalizer
}

function hash(x: number, y: number, seed: number) {
  let value = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)
  value = (value ^ (value >>> 13)) >>> 0
  value = Math.imul(value, 1274126177)
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress
}
