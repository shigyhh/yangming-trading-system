export type ArchiveItemType =
  | "mirror_report"
  | "growth_profile"
  | "growth_record"
  | "trade_review"
  | "heart_proof"
  | "one_thought_record"
  | "retest"
  | "behavior_loop"

export interface ArchiveItem {
  archiveItemId: string
  userId?: string
  anonymousId: string
  type: ArchiveItemType
  sourceId: string
  detailHref?: string
  title: string
  summary: string
  tags: string[]
  createdAt: string
}

export interface MirrorArchiveSummary {
  reportCount: number
  completedDays: number
  heartProofCount: number
  oneThoughtRecordCount: number
  tradeReviewCount: number
  growthProfileCount: number
  retestCount: number
  behaviorLoopCount: number
  currentPersona: string
  retestStatus: string
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
  }
  allItems: ArchiveItem[]
}
