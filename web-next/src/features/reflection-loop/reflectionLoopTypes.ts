export type LivingMirrorLoopNodeId =
  | "enter_reflection"
  | "mirror_manifestation"
  | "mirror_report"
  | "daily_growth"
  | "trade_review"
  | "growth_profile"
  | "behavior_loop"
  | "retest_change"
  | "assistant_handoff"
  | "share_global"
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
  completedGrowthDays: number
  hasTradeReview: boolean
  hasGrowthProfile: boolean
  hasBehaviorLoop: boolean
  hasRetest: boolean
  hasAssistantHandoff: boolean
  hasShareOrGlobalReflection: boolean
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
