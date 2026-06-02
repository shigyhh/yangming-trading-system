import type { PracticeChangeState, PracticeRadarComparison } from "@/features/assessment/practice-change"
import type { DailyGrowthState } from "@/features/assessment/sprint10/trainingTypes"
import type { HeartProof } from "@/features/heart-proof/heartProofTypes"
import type { ArchiveItem } from "@/features/mirror-archive/archiveTypes"
import type { MirrorReport } from "@/features/mirror-report/mirrorReportTypes"
import type { MirrorScrollNode } from "@/features/mirror-scroll/scrollTypes"
import type { TradeReview } from "../../../../packages/contracts/living-mirror"

import type { BehaviorLoop } from "./behaviorLoopTypes"

export type LivingMirrorGrowthSchemaVersion = "living_mirror_growth_profile_v1"

export type LivingMirrorGrowthSourceType =
  | "mirror_report"
  | "daily_growth"
  | "heart_proof"
  | "trade_review"
  | "behavior_loop"
  | "retest_change"

export interface LivingMirrorGrowthEvidence {
  id: string
  sourceType: LivingMirrorGrowthSourceType
  label: string
  summary: string
  createdAt: string
}

export interface LivingMirrorGrowthCountItem {
  label: string
  count: number
  evidenceIds: string[]
}

export interface LivingMirrorGrowthDimension {
  label: string
  weight: number
  sourceTypes: LivingMirrorGrowthSourceType[]
  evidenceIds: string[]
}

export interface LivingMirrorGrowthContinuity {
  completedDays: number
  totalDays: number
  currentStreak: number
  heartProofCount: number
  tradeReviewCount: number
  behaviorLoopCount: number
  retestChangeCount: number
  statusText: string
}

export type LivingMirrorTreeStageKey =
  | "seed"
  | "sprout"
  | "rooted"
  | "branching"
  | "blossoming"
  | "evergreen"

export interface LivingMirrorTreeStage {
  key: LivingMirrorTreeStageKey
  title: string
  treeStage: string
  growthLevel: number
  description: string
  nextActionText: string
}

export interface LivingMirrorGrowthProfileInput {
  mirrorReport?: MirrorReport | null
  dailyGrowth?: DailyGrowthState | null
  practiceChange?: PracticeChangeState | null
  heartProofs?: HeartProof[]
  tradeReviews?: TradeReview[]
  behaviorLoops?: BehaviorLoop[]
  retestComparisons?: PracticeRadarComparison[]
  now?: string
}

export interface LivingMirrorGrowthProfile {
  schemaVersion: LivingMirrorGrowthSchemaVersion
  growth_profile_id: string
  growthProfileId: string
  userId?: string
  anonymousId: string
  reportId?: string
  primaryPersona: string
  secondaryPersona: string
  highFrequencyThought: LivingMirrorGrowthCountItem
  repeatedBehaviors: LivingMirrorGrowthCountItem[]
  affectedDimensions: LivingMirrorGrowthDimension[]
  trainingContinuity: LivingMirrorGrowthContinuity
  heartProofCount: number
  tradeReviewCount: number
  retestSummary: string
  nextCycleFocus: string
  mirrorLifeStage: LivingMirrorTreeStage
  sourceEvidence: LivingMirrorGrowthEvidence[]
  sourceSummary: {
    mirrorReportCount: number
    dailyGrowthCount: number
    heartProofCount: number
    tradeReviewCount: number
    behaviorLoopCount: number
    retestChangeCount: number
    evidenceCount: number
  }
  complianceText: string
  updatedAt: string
}

export type GrowthProfileSchemaVersion = "growth_profile_v1"

export type GrowthProfileStatus = "active"

export type GrowthThoughtType =
  | "fomo"
  | "chase"
  | "wait_pullback"
  | "ask_others"
  | "abandon_plan"
  | "revenge"
  | "fear"
  | "ego"
  | string

export type DailyGrowth = Omit<Partial<DailyGrowthState>, "thoughtType" | "checkinType"> & {
  dailyGrowthId?: string
  growthRecordId?: string
  reportId?: string
  userId?: string
  anonymousId?: string
  trainingDay?: number
  checkinType?: string | null
  thoughtType?: GrowthThoughtType | null
  reflectionText?: string
  isCompleted?: boolean
  completedAt?: string | null
  createdAt?: string
}

export type DailyPractice = DailyGrowth

export interface RetestChange {
  retestId: string
  userId?: string
  anonymousId?: string
  reportId?: string
  baselineScores: Record<string, number>
  currentScores: Record<string, number>
  deltaScores: Record<string, number>
  dimensionChanges?: RetestDimensionChange[]
  improvedDimensions: string[]
  declinedDimensions: string[]
  trainingEvidenceSummary?: string
  createdAt: string
}

export interface RetestDimensionChange {
  key: string
  label: string
  before: number
  after: number
  delta: number
  direction: "improved" | "declined" | "flat"
}

export interface GrowthProfileInput {
  mirrorReport?: MirrorReport | null
  mirrorReports?: MirrorReport[]
  dailyGrowth?: DailyGrowth | null
  dailyGrowthRecords?: DailyGrowth[]
  dailyPracticeRecords?: DailyPractice[]
  heartProofs?: HeartProof[]
  tradeReviews?: TradeReview[]
  retestChanges?: RetestChange[]
  retestComparisons?: PracticeRadarComparison[]
  behaviorLoops?: BehaviorLoop[]
  userId?: string
  anonymousId?: string
  now?: string
}

export interface GrowthProfileThought {
  thoughtType: GrowthThoughtType
  label: string
  count: number
  weight: number
  evidenceIds: string[]
}

export interface GrowthProfileTrainingContinuity {
  completedGrowthDays: number
  currentStreak: number
  longestStreak: number
  missedDays: number
  trainingConsistencyScore: number
}

export interface GrowthProfileAffectedDimension {
  label: string
  weight: number
  sourceTypes: LivingMirrorGrowthSourceType[]
  evidenceIds: string[]
}

export interface GrowthProfileRepeatedBehavior {
  behaviorType: string
  label: string
  count: number
  evidenceIds: string[]
  thoughtType?: GrowthThoughtType
}

export type GrowthMirrorLifeStageKey =
  | "not_entered"
  | "initial_reflection"
  | "seeing_thought"
  | "guarding_action"
  | "proven"
  | "retested"

export interface GrowthMirrorLifeStage {
  stage: GrowthMirrorLifeStageKey
  label: string
  description: string
}

export interface GrowthProfileNextCycleFocus {
  title: string
  reason: string
  nextActionText: string
  relatedDimensions: string[]
  sourceType?: "behavior_loop" | "thought" | "risk_radar" | "training" | "retest_change"
  sourceId?: string
}

export interface GrowthProfileRetestSummary {
  retestCount: number
  latestRetestId?: string
  baselineScores: Record<string, number>
  currentScores: Record<string, number>
  deltaScores: Record<string, number>
  improvedDimensions: RetestDimensionChange[]
  declinedDimensions: RetestDimensionChange[]
  stableDimensions: RetestDimensionChange[]
  trainingEvidenceSummary: string
  highFrequencyThoughtChange: string
  repeatedBehaviorChange: string
  nextCycleFocus: GrowthProfileNextCycleFocus
  conclusionText: string
}

export interface GrowthProfileDataGap {
  type:
    | "missing_trade_review"
    | "missing_heart_proof"
    | "insufficient_training_days"
    | "missing_retest"
  message: string
}

export interface GrowthProfileAssistantLatestHeartProof {
  heartProofId: string
  sourceType?: string
  sourceId?: string
  thoughtType: string
  thoughtLabel?: string
  reflectionText?: string
  affectedDimensions?: string[]
  proofText: string
  nextActionText: string
  createdAt: string
}

export interface GrowthProfileAssistantTopBehaviorLoop {
  behaviorLoopId: string
  trigger?: string
  thought: string
  action?: string
  result?: string
  selfStory?: string
  repeatCount: number
  riskLevel?: BehaviorLoop["riskLevel"]
  confidence?: number
  loopBreakAction: string
  affectedDimensions: string[]
  firstSeenAt?: string
  lastSeenAt?: string
}

export interface GrowthProfile {
  schemaVersion: GrowthProfileSchemaVersion
  growth_profile_id: string
  growthProfileId: string
  status: GrowthProfileStatus
  userId?: string
  anonymousId: string
  reportId?: string
  assessmentId?: string
  primaryPersona: string
  secondaryPersona: string
  riskRadar?: MirrorReport["riskRadar"]
  sevenDayPrescription: MirrorReport["sevenDayPrescription"]
  recommendedCamp: string
  highFrequencyThoughts: GrowthProfileThought[]
  trainingContinuity: GrowthProfileTrainingContinuity
  affectedDimensions: GrowthProfileAffectedDimension[]
  repeatedBehaviors: GrowthProfileRepeatedBehavior[]
  topBehaviorLoopIds: string[]
  mirrorLifeStage: GrowthMirrorLifeStage
  nextCycleFocus: GrowthProfileNextCycleFocus
  dataGaps: GrowthProfileDataGap[]
  retestTrend: {
    retestCount: number
    improvedDimensions: string[]
    declinedDimensions: string[]
  }
  retestSummary: GrowthProfileRetestSummary
  sourceSummary: {
    mirrorReportCount: number
    dailyGrowthCount: number
    heartProofCount: number
    tradeReviewCount: number
    behaviorLoopCount: number
    retestChangeCount: number
  }
  dailyGrowthCount: number
  heartProofCount: number
  tradeReviewCount: number
  behaviorLoopCount: number
  retestChangeCount: number
  complianceText: string
  computedAt: string
  computedAtHistory: string[]
  updatedAt: string
}

export interface GrowthProfileAssistantHandoffPatch {
  growthProfileId: string
  userId?: string
  anonymousId: string
  reportId?: string
  primaryPersona: string
  secondaryPersona: string
  mirrorLifeStage: GrowthMirrorLifeStage
  latestThought: string
  topThought: string
  latestHeartProof: GrowthProfileAssistantLatestHeartProof | null
  topBehaviorLoop: GrowthProfileAssistantTopBehaviorLoop | null
  affectedDimensions: string[]
  completedGrowthDays: number
  trainingConsistencyScore: number
  heartProofCount: number
  tradeReviewCount: number
  hasTradeReview: boolean
  hasHeartProof: boolean
  hasRetest: boolean
  nextCycleFocus: GrowthProfileNextCycleFocus
  suggestedOpening: string
  forbiddenPhrases: string[]
  complianceText: string
}

export interface GrowthProfileBuildResult {
  growthProfile: GrowthProfile
  behaviorLoops: BehaviorLoop[]
  archiveItemsToUpsert: ArchiveItem[]
  scrollEventsToUpsert: MirrorScrollNode[]
  assistantHandoffPatch: GrowthProfileAssistantHandoffPatch
}
