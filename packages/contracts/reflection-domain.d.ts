export type ReflectionDomainSchemaVersion = "reflection_domain_v1"

export type ReflectionSourcePlatform =
  | "web-next"
  | "miniprogram"
  | "admin"
  | "server"
  | "app"
  | string

export type MirrorName =
  | "追涨之镜"
  | "扛单之镜"
  | "幻想之镜"
  | "执念之镜"
  | "从众之镜"
  | "犹疑之镜"
  | "拖延之镜"
  | "焦虑之镜"
  | "良知之镜"

export type HeartThief = "贪" | "急" | "惧" | "痴" | "疑" | "慢" | "昧" | "守心" | string

export type ReflectionComplianceText =
  | "本系统仅用于交易心理觉察、行为训练与复盘，不构成任何投资建议"
  | string

export type ReflectionEntityBase = {
  id: string
  userId: string
  anonymousId: string
  sourceId: string
  sourcePlatform: ReflectionSourcePlatform
  createdAt: string
}

export type RiskRadarPoint = {
  key: string
  label: string
  value: number
  mirror?: MirrorName
  note?: string
}

export type SevenDayGrowthPrescription = {
  day: number
  mirror: MirrorName
  title: string
  action: string
  reflectionPrompt: string
}

export type Assessment = ReflectionEntityBase & {
  schemaVersion: ReflectionDomainSchemaVersion
  status: "started" | "completed" | "abandoned" | string
  entryName: "入照心" | string
  scenario: string
  firstThought: string
  resonantMirror?: MirrorName
  revealedThieves: HeartThief[]
  answerIds: string[]
  completedAt?: string | null
  complianceText: ReflectionComplianceText
}

export type MirrorReport = ReflectionEntityBase & {
  schemaVersion: ReflectionDomainSchemaVersion
  reportId: string
  assessmentId: string
  primaryPersona: string
  secondaryPersona: string
  confidenceScore: number
  headline: string
  coreProblem: string
  highRiskScenario: string
  verdict: string
  mainMirror: MirrorName
  subMirror: MirrorName
  thieves: HeartThief[]
  riskRadar: RiskRadarPoint[] | {
    impulse: number
    fear: number
    ego: number
    stopLossExecution: number
    reviewAbility: number
    systemConsistency: number
    riskControl: number
    independentJudgment: number
  }
  typicalLoop: string[]
  sevenDayPrescription: SevenDayGrowthPrescription[] | Array<{
    day: number
    title: string
    action: string
    completionStandard: string
  }>
  recommendedCamp: string
  campSuggestion: {
    level: "self_practice" | "assistant_followup" | "camp_recommended" | string
    title: string
    reason: string
    focus: string
  }
  complianceText: ReflectionComplianceText
}

export type DailyGrowthState = ReflectionEntityBase & {
  schemaVersion: ReflectionDomainSchemaVersion
  reportId?: string
  trainingDay: number
  dateKey: string
  checkinType: "ready" | "observe" | "traded" | null
  thoughtType: "fomo" | "chase" | "wait_pullback" | "ask_others" | "abandon_plan" | string | null
  thoughtLabel: string
  reflectionText: string
  completedDays: number
  klineMindCount: number
  reflectionCount: number
  remainingDays: number
  isRetestUnlocked: boolean
  evidenceItems: string[]
  affectedDimensions: string[]
  completedAt?: string | null
  complianceText: ReflectionComplianceText
}

export type TradeReview = ReflectionEntityBase & {
  schemaVersion: ReflectionDomainSchemaVersion
  reviewId?: string
  imageUrls: string[]
  tradeDate: string
  marketType?: "stock" | "a_share" | "us_stock" | "crypto" | "futures" | "forex" | "fund" | "other" | string
  direction?: "buy" | "sell" | "close" | "observe" | string
  symbolMasked?: string
  wasPlanned?: boolean | null
  buyReason: string
  sellReason: string
  strongestThought: string
  emotionIntensity?: number
  hadExitRule?: boolean | null
  changedPlanDuringTrade?: boolean | null
  postTradeReaction?: "regret" | "relief" | "anger" | "numb" | "clear" | "other" | string | null
  exposedRisk?: string
  nextAction?: string
  resultOptional?: "profit" | "loss" | "flat" | "not_disclosed" | string
  detectedMirror: MirrorName
  detectedThieves: HeartThief[]
  behaviorTags: string[]
  reviewText: string
  linkedGrowthRecordId?: string
  complianceText: ReflectionComplianceText
}

export type HeartProof = ReflectionEntityBase & {
  schemaVersion: ReflectionDomainSchemaVersion
  heartProofId: string
  sourceType: "daily_growth" | "trade_review" | "retest" | "camp" | string
  reportId?: string
  trainingDay?: number
  thoughtType: string
  behaviorType?: string
  affectedDimensions: string[]
  proofText: string
  nextActionText: string
  growthStateId?: string
  dateKey: string
  thoughtLabel: string
  actionText?: string
  reflectionText: string
  proofSentence?: string
  copiedAt?: string | null
  complianceText: ReflectionComplianceText
}

export type ArchiveItem = ReflectionEntityBase & {
  schemaVersion: ReflectionDomainSchemaVersion
  itemType:
    | "assessment"
    | "mirror_report"
    | "daily_growth"
    | "trade_review"
    | "heart_proof"
    | "retest"
    | "assistant_handoff"
    | "share_card"
    | string
  title: string
  summary: string
  linkedEntityId: string
  tags: string[]
  occurredAt: string
  complianceText: ReflectionComplianceText
}

export type ScrollEvent = ReflectionEntityBase & {
  schemaVersion: ReflectionDomainSchemaVersion
  scrollId: string
  eventType:
    | "enter_reflection"
    | "mirror_resonance"
    | "report_generated"
    | "growth_completed"
    | "trade_review_saved"
    | "archive_opened"
    | "share_card_created"
    | string
  volumeName: string
  position: number
  payload?: Record<string, unknown>
  complianceText: ReflectionComplianceText
}

export type AssistantHandoff = ReflectionEntityBase & {
  schemaVersion: ReflectionDomainSchemaVersion
  handoffId: string
  phone?: string
  reportId?: string
  primaryPersona: string
  secondaryPersona: string
  riskLevel: string
  latestThought: string
  latestHeartProof: string
  completedDays: number
  hasTradeReview: boolean
  hasRetest: boolean
  recommendedCamp: string
  suggestedOpening: string
  forbiddenPhrases: string[]
  complianceText: ReflectionComplianceText
}

export type ShareCard = ReflectionEntityBase & {
  schemaVersion: ReflectionDomainSchemaVersion
  shareCardId: string
  cardType: "mirror_report_card" | "heart_proof_card" | "retest_change_card" | string
  sourceType: "mirror_report" | "heart_proof" | "retest" | string
  title: string
  subtitle: string
  quote: string
  mirrorName?: MirrorName
  verdict?: string
  heartProofText?: string
  inviteCode?: string
  ctaText: string
  shareText: string
  imageUrl?: string
  complianceText: ReflectionComplianceText
}
