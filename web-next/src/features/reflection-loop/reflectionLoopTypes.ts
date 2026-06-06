export type LivingMirrorLoopNodeId =
  | "enter_reflection"
  | "mirror_manifestation"
  | "mirror_report"
  | "daily_thought"
  | "reflection_back"
  | "heart_thief"
  | "heart_proof"
  | "daily_practice"
  | "conscience_seal"
  | "trade_review"
  | "mirror_archive"
  | "mirror_scroll"
  | "retest_change"
  | "next_enter_reflection"

export type LivingMirrorLoopStatus = "done" | "active" | "locked"

export type LivingMirrorLoopPrinciple =
  | "以交易照人心"
  | "以复盘照行为"
  | "以训练照变化"
  | "以活镜照成长"

export interface LoopNode {
  id: LivingMirrorLoopNodeId
  index: number
  title: string
  subtitle: string
  principle: LivingMirrorLoopPrinciple
  outputObject: string
  route?: string
  status?: LivingMirrorLoopStatus
}

export interface LivingMirrorLoopInput {
  hasAssessment: boolean
  hasPersonaResult: boolean
  hasMirrorReport: boolean
  hasDailyThought: boolean
  hasReflectionBack: boolean
  hasHeartThief: boolean
  hasHeartProof: boolean
  hasDailyPractice: boolean
  hasConscienceSeal: boolean
  hasMirrorArchive: boolean
  hasMirrorScroll: boolean
  completedGrowthDays: number
  hasTradeReview: boolean
  hasBehaviorLoop: boolean
  hasRetest: boolean
}

export interface LivingMirrorLoopNode extends LoopNode {
  description: string
  sprintLabel: string
  sprintDisplayLabel: string
  artifactLabel: string
  status: LivingMirrorLoopStatus
}

export interface LivingMirrorLoopSummary {
  activeNode: LivingMirrorLoopNode
  doneCount: number
  lockedCount: number
  totalCount: number
  isClosed: boolean
  nextEvidenceText: string
  activeActionText: string
}
