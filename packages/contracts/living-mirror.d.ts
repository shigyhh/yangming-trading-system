export type LivingMirrorSchemaVersion = "living_mirror_v1"

export type SourcePlatform = "web-next" | "miniprogram" | "admin" | "server" | "app" | string

export type MirrorKey =
  | "chasing"
  | "holding_loss"
  | "fantasy"
  | "gambling"
  | "following"
  | "hesitation"
  | "procrastination"
  | "anxiety"
  | "conscience"

export type MirrorName =
  | "追涨之镜"
  | "扛单之镜"
  | "幻想之镜"
  | "赌性之镜"
  | "从众之镜"
  | "犹疑之镜"
  | "拖延之镜"
  | "焦虑之镜"
  | "良知之镜"

export type HeartThief = "贪" | "急" | "惧" | "痴" | "疑" | "慢" | "昧" | "守心" | string

export type MarketType =
  | "a_share"
  | "us_stock"
  | "crypto"
  | "futures"
  | "forex"
  | "fund"
  | "other"
  | string

export type CampSuggestionLevel = "self_practice" | "assistant_followup" | "camp_recommended" | string

export type User = {
  id: string
  phone: string
  createdAt: string
  inviteCode?: string
  channel?: string
}

export type RiskRadarItem = {
  key: string
  label: string
  value: number
  mirror?: MirrorName
  note?: string
}

export type SevenDayPrescriptionItem = {
  day: number
  mirror: MirrorName
  title: string
  action: string
  reflectionPrompt: string
}

export type CampSuggestion = {
  level: CampSuggestionLevel
  title: string
  reason: string
  focus: string
}

export type MirrorReport = {
  id: string
  userId: string
  schemaVersion: LivingMirrorSchemaVersion
  verdict: string
  mainMirror: MirrorName
  subMirror: MirrorName
  thieves: HeartThief[]
  riskRadar: RiskRadarItem[]
  typicalLoop: string[]
  sevenDayPrescription: SevenDayPrescriptionItem[]
  campSuggestion: CampSuggestion
  complianceNotice: "本报告用于交易心理觉察与训练，不构成投资建议" | string
  createdAt: string
}

export type TrainingRecord = {
  id: string
  userId: string
  date: string
  mirror: MirrorName
  action: string
  completed: boolean
  note: string
  createdAt?: string
  completedAt?: string | null
}

export type TradeReview = {
  id: string
  userId: string
  imageUrl: string
  tradeDate: string
  symbolMasked?: string
  marketType?: MarketType
  buyReason: string
  sellReason: string
  strongestThought: string
  detectedMirror: MirrorName
  detectedThieves: HeartThief[]
  behaviorTags: string[]
  reviewText: string
  createdAt: string
}

export type MirrorScoreMap = Record<MirrorKey, number>

export type ThiefCountMap = Partial<Record<HeartThief, number>>

export type LivingMirrorTrendPoint = {
  date: string
  mirrorScores: Partial<MirrorScoreMap>
  conscienceGrowth: number
  trainingCompletionRate: number
  loopRelapseCount: number
}

export type LivingMirrorStats = {
  userId: string
  schemaVersion: LivingMirrorSchemaVersion
  mirrorScores: MirrorScoreMap
  thiefCounts: ThiefCountMap
  growthTrend: LivingMirrorTrendPoint[]
  trainingCompletionRate: number
  loopRelapseCount: number
  conscienceGrowth: number
  lastUpdated: string
}

export type AssistantHandoffStatus = "pending" | "accepted" | "reviewing" | "closed" | string

export type AssistantHandoff = {
  id: string
  userId: string
  phone: string
  mainMirror: MirrorName
  subMirror: MirrorName
  riskTags: string[]
  recentReviewSummary: string
  suggestedTrainingAction: string
  campSuggestion: string
  suggestedScript: string
  complianceReminder: "仅交易心理训练，不提供买卖建议" | string
  feishuSynced: boolean
  status?: AssistantHandoffStatus
  createdAt: string
}

export type MirrorArchive = {
  user: User
  reports: MirrorReport[]
  trainingRecords: TrainingRecord[]
  tradeReviews: TradeReview[]
  livingMirrorStats: LivingMirrorStats
  retestReports: MirrorReport[]
  inviteCode?: string
  assistantHandoff?: AssistantHandoff | null
}

export type TradeReviewMappingRule = {
  thoughtPattern: string
  mirror: MirrorName
  thieves: HeartThief[]
  behaviorTags: string[]
}

export type GlobalReflectionEntry = {
  id: string
  dateKey: string
  thought: string
  anonymousMainMirror: MirrorName
  anonymousThieves: HeartThief[]
  anonymousScenario: string
  country?: string
  language: "zh-CN" | "en" | "zh-TW" | "ja" | "ko" | "es" | string
  createdAt: string
}

export type GlobalMirrorHeatmapRow = {
  marketType: MarketType
  country?: string
  language?: string
  mirror: MirrorName
  count: number
  percentage: number
  complianceNotice: "仅为交易心理觉察数据，不构成投资建议" | string
}

