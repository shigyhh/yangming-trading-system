import type { MirrorName } from "../../../../packages/contracts/living-mirror"

export type BehaviorLoopSourceType = "trade_review" | "heart_proof" | "daily_growth" | "mirror_report"
export type BehaviorLoopRiskLevel = "low" | "medium" | "high"

export interface BehaviorLoopEvidenceSource {
  sourceType: BehaviorLoopSourceType
  sourceId: string
  label: string
  createdAt: string
}

export interface BehaviorLoop {
  id: string
  behavior_loop_id: string
  behaviorLoopId: string
  userId?: string
  anonymousId: string
  reportId?: string
  signature?: string
  sourceType: BehaviorLoopSourceType
  sourceId: string
  sourceMirror: MirrorName | string
  trigger: string
  thought: string
  action: string
  result: string
  selfStory: string
  repeatCount: number
  affectedDimensions: string[]
  repeatRisk: string
  riskLevel?: BehaviorLoopRiskLevel
  confidence?: number
  loopBreakAction: string
  evidenceIds?: string[]
  evidenceSources: BehaviorLoopEvidenceSource[]
  firstSeenAt?: string
  lastSeenAt?: string
  createdAt: string
  updatedAt: string
  complianceText: string
}
