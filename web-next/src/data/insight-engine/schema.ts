export type InsightIntensity = 1 | 2 | 3 | 4 | 5

export type InsightSceneStatus = "draft" | "active" | "archived"

export type InsightContentItem = {
  id: string
  tradeMoment: string
  os: string
  hiddenThought: string
  reflection: string
  reflection_v2?: string
  reflectionFinal?: string
  intensity: InsightIntensity
}

export type InsightContentRecord = {
  sceneId: string
  sceneName: string
  mirrorId: string
  thief: string
  items: InsightContentItem[]
  thiefExplain: string[]
  evidences: string[]
  practices: string[]
  coreStatement: string
}

export type InsightRecord = {
  action: string
  scene: string
  thought: string
  hiddenThought?: string
  mirror: string
  thief: string
  evidence: string
  practice: string
}

export type InsightUploadKind = "成交记录" | "持仓记录" | "交割单" | "截图"

export type InsightDetectedScene = {
  action: string
  sceneId: string
  sceneName: string
}

export type InsightSceneThiefDetail = {
  thief: string
  explanation: string[]
}

export type InsightSceneFile = {
  schemaVersion: 1
  sceneId: string
  sceneName: string
  sceneOrder: number
  status: InsightSceneStatus
  mirrorId: string
  thief: string
  thiefDetails?: InsightSceneThiefDetail[]
  items: InsightContentItem[]
  thiefExplain: string[]
  evidences: string[]
  practices: string[]
  coreStatement: string
}

export const INSIGHT_ENGINE_TARGET_SCENE_COUNT = 36

export const INSIGHT_ENGINE_CONTENT_RECORD_FIELDS = [
  "id",
  "tradeMoment",
  "os",
  "hiddenThought",
  "reflection",
  "intensity",
] as const

export const INSIGHT_RECORD_FIELDS = [
  "action",
  "scene",
  "thought",
  "hiddenThought",
  "mirror",
  "thief",
  "evidence",
  "practice",
] as const

export const INSIGHT_UPLOAD_KINDS: InsightUploadKind[] = ["成交记录", "持仓记录", "交割单", "截图"]

export function isInsightIntensity(value: number): value is InsightIntensity {
  return value >= 1 && value <= 5 && Number.isInteger(value)
}

export function makeInsightKey(
  scene: Pick<InsightContentRecord, "sceneId" | "mirrorId">,
  item: Pick<InsightContentItem, "id" | "intensity">,
) {
  return `${scene.sceneId}:${scene.mirrorId}:${item.id}:${item.intensity}`
}
