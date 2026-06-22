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
