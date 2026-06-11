import reflectionV2Entries from "./reflection-v2.json" with { type: "json" }

export type ReflectionV2Entry = {
  itemId: string
  sceneId: string
  sceneName: string
  os: string
  reflection_v2: string
  source?: string
  painPoint?: string
  painLevel?: number | null
}

export type ReflectionSourceItem = {
  id?: string
  itemId?: string
  reflection?: string
  reflection_v2?: string
}

const reflectionV2ByItemId = new Map(
  (reflectionV2Entries as ReflectionV2Entry[]).map((entry) => [entry.itemId, entry]),
)

export function getReflectionV2Entry(itemId: string | undefined) {
  if (!itemId) return undefined
  return reflectionV2ByItemId.get(itemId)
}

export function getReflectionV2(item: ReflectionSourceItem | undefined) {
  if (!item) return ""
  const directReflection = item.reflection_v2?.trim()
  if (directReflection) return directReflection

  const overlayReflection = getReflectionV2Entry(item.itemId ?? item.id)?.reflection_v2?.trim()
  if (overlayReflection) return overlayReflection

  return item.reflection?.trim() ?? ""
}

export function getReflectionFallback(item: ReflectionSourceItem | undefined) {
  return item?.reflection?.trim() ?? ""
}
