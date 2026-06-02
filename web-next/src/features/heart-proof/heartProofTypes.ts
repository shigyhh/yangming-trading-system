export type HeartProofSourceType = "daily_growth" | "trade_review" | "retest" | "camp"

export interface HeartProof {
  id: string
  heartProofId: string
  userId?: string
  anonymousId: string
  sourceType: HeartProofSourceType
  sourceId: string
  reportId?: string
  trainingDay?: number
  thoughtType: string
  thoughtLabel?: string
  behaviorType?: string
  reflectionText: string
  affectedDimensions: string[]
  proofText: string
  nextActionText: string
  complianceText: string
  createdAt: string
}
