export type InsightIntensity = 1 | 2 | 3 | 4 | 5

export type InsightSceneStatus = "draft" | "active" | "archived"

export type InsightRecord = {
  sceneId: string
  sceneName: string
  mirrorId: string
  intensity: InsightIntensity
  thought: string
  reflection: string
  thief: string
  evidence: string
  practice: string
}

export type InsightSceneFile = {
  schemaVersion: 1
  sceneId: string
  sceneName: string
  sceneOrder: number
  status: InsightSceneStatus
  records: InsightRecord[]
}

export const INSIGHT_ENGINE_TARGET_SCENE_COUNT = 36

export const INSIGHT_ENGINE_RECORD_FIELDS = [
  "sceneId",
  "sceneName",
  "mirrorId",
  "intensity",
  "thought",
  "reflection",
  "thief",
  "evidence",
  "practice",
] as const

export function isInsightIntensity(value: number): value is InsightIntensity {
  return value >= 1 && value <= 5 && Number.isInteger(value)
}

export function makeInsightKey(record: Pick<InsightRecord, "sceneId" | "mirrorId" | "intensity">) {
  return `${record.sceneId}:${record.mirrorId}:${record.intensity}`
}
