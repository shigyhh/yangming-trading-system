import reflectionFinalEntries from "@/content/reflections/reflection-final-shenji-zeyou.json" with { type: "json" }

export const REFLECTION_CONTENT_VERSION = "reflection_final_shenji_zeyou_v1"

export type ReflectionFinalEntry = {
  sceneId: string
  itemId: string
  tradeMoment: string
  os: string
  reflectionFinal: string
  finalSource: string
  painLevel: number | null
  painPoint: string
  sourceFile: string
  version: typeof REFLECTION_CONTENT_VERSION
  finalReason?: string
  reviewNote?: string
}

export type ReflectionKeySource = {
  sceneId?: string
  itemId?: string
  id?: string
  thoughtId?: string
}

export function createReflectionKey(sceneId: string, itemId: string) {
  return `${sceneId}:${itemId}`
}

const allReflections = reflectionFinalEntries as ReflectionFinalEntry[]
const reflectionsByKey = new Map(
  allReflections.map((entry) => [createReflectionKey(entry.sceneId, entry.itemId), entry]),
)
const reflectionsByScene = allReflections.reduce<Map<string, ReflectionFinalEntry[]>>((map, entry) => {
  const entries = map.get(entry.sceneId) ?? []
  entries.push(entry)
  map.set(entry.sceneId, entries)
  return map
}, new Map())

export function getReflection(sceneId: string, itemId: string) {
  return reflectionsByKey.get(createReflectionKey(sceneId, itemId))
}

export function getReflectionByKey(key: string) {
  return reflectionsByKey.get(key)
}

export function getReflectionsByScene(sceneId: string) {
  return reflectionsByScene.get(sceneId) ?? []
}

export function getAllReflections() {
  return allReflections
}

export function getReflectionForItem(item: ReflectionKeySource | undefined) {
  if (!item?.sceneId) return undefined
  const itemId = item.itemId ?? item.thoughtId ?? item.id
  if (!itemId) return undefined
  return getReflection(item.sceneId, itemId)
}

export function getReflectionFinalText(item: ReflectionKeySource | undefined) {
  return getReflectionForItem(item)?.reflectionFinal ?? ""
}
