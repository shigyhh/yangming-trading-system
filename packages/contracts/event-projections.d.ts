export type EventProjectionNextAction = "照见一念" | "K线训练" | "轻复盘" | "查看活镜"

export type EventProjectionTodayStatus = "not_seen" | "trained" | "reviewed" | "completed"

export type EventProjectionSourceQuality = {
  server_cache: number
  local_demo: number
  network_error: number
  unknown: number
}

export type LivingMirrorProfile = {
  userId: string
  totalEvents: number
  dominantReaction: string
  repeatedThoughts: string[]
  latestBoundaryState: string
  latestMirrorType: string
  updatedAt: string
}

export type RiskPatternSummary = {
  userId: string
  topRiskPatterns: string[]
  repeatedReactionChoice: string
  recentServerSourceQuality: EventProjectionSourceQuality
  updatedAt: string
}

export type TodayState = {
  userId: string
  status: EventProjectionTodayStatus
  nextAction: EventProjectionNextAction
  progress: {
    totalEvents: number
    klineTrainingCount: number
    reviewCount: number
  }
  updatedAt: string
}

export type LivingMirrorGrowthProjection = {
  schemaVersion: "living_mirror_growth_projection_v1"
  userId: string
  growthProfileId: string
  highFrequencyThoughts: Array<{
    text: string
    count: number
  }>
  repeatedBehaviors: Array<{
    label: string
    count: number
  }>
  affectedDimensions: Array<{
    key: "boundary" | "emotion" | "review" | "discipline" | string
    label: string
    evidenceCount: number
  }>
  trainingContinuity: {
    totalEvents: number
    activeDays: number
    latestRecordedAt: string
    level: "none" | "started" | "steady" | string
  }
  mirrorLifeStage: "seed" | "sprout" | "rooted"
  nextCycleFocus: {
    title: string
    action: string
    reason: string
  }
  dataGaps: Array<{
    key: "heartProof" | "dailyGrowth" | "retest" | string
    label: string
  }>
  topBehaviorLoops: Array<{
    label: string
    count: number
    latestBoundaryState: string
  }>
  zhixingStability: {
    totalText: string
    level: "unknown" | "warming" | "stable" | string
    summary: string
    dimensions: Array<{
      key: string
      label: string
      value: number
    }>
    updatedAt: string
  }
  sourceSummary: {
    klineRecords: number
    tradeReviews: number
    oneThoughtEvents: number
    mirrorReport: boolean
    retests: number
    heartProof: boolean
    dailyGrowth: boolean
  }
  updatedAt: string
  complianceNotice: string
}
