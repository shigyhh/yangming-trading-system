export type ArchiveItemType =
  | "mirror_report"
  | "growth_profile"
  | "growth_record"
  | "trade_review"
  | "heart_proof"
  | "one_thought_record"
  | "retest"
  | "behavior_loop"
  | "mistake_card"
  | "kline_record"
  | "training_bookmark"
  | "growth_projection"
  | "intervention_event"
  | "execution_plan"
  | "weekly_mirror"
  | "note"
  | string

export interface ArchiveItem {
  archiveItemId: string
  userId?: string
  anonymousId: string
  type: ArchiveItemType
  sourceId: string
  sourceType?: string
  detailHref?: string
  title: string
  summary: string
  tags: string[]
  errorType?: string
  firstThought?: string
  sceneTags?: string[]
  executionResult?: string
  segmentId?: string
  trainingPackId?: string
  createdAt: string
  updatedAt?: string
  metadata?: Record<string, unknown>
}

export interface MirrorArchiveSummary {
  totalCount?: number
  byType?: Record<string, number>
  reportCount: number
  completedDays: number
  heartProofCount: number
  oneThoughtRecordCount: number
  tradeReviewCount: number
  mistakeCardCount?: number
  klineRecordCount?: number
  trainingBookmarkCount?: number
  mirrorReportCount?: number
  growthProjectionCount?: number
  interventionEventCount?: number
  executionPlanCount?: number
  growthProfileCount: number
  retestCount: number
  behaviorLoopCount: number
  currentPersona: string
  retestStatus: string
  updatedAt?: string
}

export interface MirrorArchiveData {
  summary: MirrorArchiveSummary
  sections: {
    reports: ArchiveItem[]
    growthProfiles: ArchiveItem[]
    growthRecords: ArchiveItem[]
    tradeReviews: ArchiveItem[]
    heartProofs: ArchiveItem[]
    oneThoughtRecords: ArchiveItem[]
    retests: ArchiveItem[]
    behaviorLoops: ArchiveItem[]
    mistakeCards?: ArchiveItem[]
    klineRecords?: ArchiveItem[]
    trainingBookmarks?: ArchiveItem[]
    mirrorReports?: ArchiveItem[]
    growthProjections?: ArchiveItem[]
    interventionEvents?: ArchiveItem[]
    executionPlans?: ArchiveItem[]
  }
  allItems: ArchiveItem[]
}
