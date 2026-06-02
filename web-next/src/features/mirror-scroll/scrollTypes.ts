export type MirrorScrollNodeType =
  | "entry"
  | "report"
  | "growth"
  | "growth_profile"
  | "trade_review"
  | "behavior_loop"
  | "heart_proof"
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
  tradeReviewCount: number
  behaviorLoopCount: number
  retestCount: number
}

export interface MirrorScrollData {
  summary: MirrorScrollSummary
  groups: MirrorScrollDayGroup[]
  latestNodeId?: string
}
