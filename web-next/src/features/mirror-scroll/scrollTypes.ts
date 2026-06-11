export type MirrorScrollNodeType =
  | "entry"
  | "report"
  | "growth"
  | "growth_profile"
  | "trade_review"
  | "behavior_loop"
  | "heart_proof"
  | "one_thought_record"
  | "retest"
  | "retest_change"

export interface MirrorScrollNode {
  id: string
  type: MirrorScrollNodeType
  nodeLabel: string
  sourceId: string
  detailHref?: string
  title: string
  summary: string
  thoughtText: string
  actionText: string
  proofText: string
  affectedDimensions: string[]
  tags: string[]
  createdAt: string
  tradeMoment?: string
  os?: string
  reflection?: string
  reflectionFinal?: string
  thief?: string
  mirrorId?: string
  mirrorName?: string
  sceneName?: string
  evidence?: string
  practice?: string
  sealedAt?: string
  completed?: boolean
  isLatest?: boolean
}

export interface MirrorScrollDayGroup {
  dateKey: string
  dateLabel: string
  nodes: MirrorScrollNode[]
}

export interface MirrorScrollSummary {
  dayCount: number
  nodeCount: number
  heartProofCount: number
  oneThoughtRecordCount: number
  tradeReviewCount: number
  behaviorLoopCount: number
  retestCount: number
}

export interface MirrorScrollData {
  summary: MirrorScrollSummary
  groups: MirrorScrollDayGroup[]
  latestNodeId?: string
}
