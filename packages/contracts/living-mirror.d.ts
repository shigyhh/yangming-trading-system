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
  | "执念之镜"
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

export type LivingMirrorSurface = "web" | "miniprogram" | "admin" | "server" | "app" | string

export type LivingMirrorLoopStageKey =
  | "enter_heart"
  | "nine_behavior_mirrors"
  | "mirror_report"
  | "trade_review"
  | "living_mirror_growth"
  | "cycle_mirror"
  | "daily_practice"
  | "retest_change"
  | "assistant_handoff"
  | "share_and_global_reflection"

export type LivingMirrorLoopStage = {
  key: LivingMirrorLoopStageKey
  sprint: string
  name: string
  purpose: string
  primarySurface: LivingMirrorSurface
  inputEntities: string[]
  outputEntities: string[]
  nextAction: string
  complianceGuardrail: string
}

export type LivingMirrorClosedLoop = {
  schemaVersion: LivingMirrorSchemaVersion
  name: "照见活镜成长系统" | string
  stages: LivingMirrorLoopStage[]
  sharedEntities: string[]
  webRole: "深度照见引擎" | string
  miniprogramRole: "每日修行陪跑器" | string
  appRole?: "长期陪跑器" | string
  complianceNotice: string
}

export type MirrorSpectrumDirection = "rising" | "falling" | "stable" | string

export type MirrorSpectrumEntry = {
  key: MirrorKey
  mirror: MirrorName
  score: number
  direction: MirrorSpectrumDirection
  evidenceCount: number
  lastTriggeredAt?: string
  note?: string
}

export type PersonalCycleNodeRole = "trigger" | "thought" | "action" | "result" | "retrigger" | string

export type PersonalCycleNode = {
  role: PersonalCycleNodeRole
  text: string
  mirror?: MirrorName
  thieves?: HeartThief[]
  evidenceReviewIds?: string[]
}

export type PersonalCycle = {
  id: string
  userId: string
  source: "assessment" | "trade_review" | "training" | "retest" | string
  mirror: MirrorName
  nodes: PersonalCycleNode[]
  verdict: string
  updatedAt: string
}

export type LivingMirrorGrowthSource =
  | "assessment"
  | "training"
  | "trade_review"
  | "daily_heart_witness"
  | "retest"
  | "assistant_handoff"
  | string

export type LivingMirrorGrowthSignal = {
  id: string
  userId: string
  growthSource: LivingMirrorGrowthSource
  mirror: MirrorName
  delta: number
  thieves?: HeartThief[]
  evidenceId?: string
  note: string
  createdAt: string
}

export type HeartMirrorTree = {
  treeName: "心镜之树" | string
  growthValue: number
  conscienceGrowth: number
  wateringSources: LivingMirrorGrowthSource[]
  lastWateredAt?: string
  milestoneText?: string
}

export type DailyHeartWitness = {
  id: string
  userId: string
  date: string
  thought: string
  mirror: MirrorName
  practiceAction: string
  completed: boolean
  sealText?: string
  createdAt: string
}

export type RetestChange = {
  id: string
  userId: string
  beforeReportId: string
  afterReportId: string
  mirrorDelta: Partial<Record<MirrorKey, number>>
  thiefDelta: ThiefCountMap
  insight: string
  createdAt: string
}

export type ShareCardSnapshot = {
  id: string
  userId: string
  todayHeartWitness: string
  mainMirror: MirrorName
  verdict: string
  practiceAction: string
  inviteCode?: string
  complianceNotice: string
  createdAt: string
}

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
  mirrorSpectrum?: MirrorSpectrumEntry[]
  thieves: HeartThief[]
  riskRadar: RiskRadarItem[]
  typicalLoop: string[]
  typicalCycle?: PersonalCycle
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
  growthSignal?: LivingMirrorGrowthSignal
  createdAt?: string
  completedAt?: string | null
}

export type TradeReviewCrossEndStatusKey =
  | "pending_confirmation"
  | "pending_market_review"
  | "mirrored"
  | "archived"
  | "training_pending"
  | "trained"
  | "retested"
  | string

export type TradeReviewCrossEndStatusText =
  | "待确认"
  | "待回看"
  | "已照见"
  | "已入镜"
  | "待训练"
  | "已训练"
  | "已复测"
  | string

export type TradeReviewCrossEndStatusStep = {
  key: TradeReviewCrossEndStatusKey
  label: TradeReviewCrossEndStatusText
  done: boolean
  current: boolean
  detail: string
  source: "miniprogram" | "web-next" | "server" | "admin" | string
}

export type TradeReview = {
  id: string
  reviewId?: string
  userId: string
  anonymousId?: string
  reportId?: string
  imageUrl: string
  tradeDate: string
  lookupSymbol?: string
  symbolMasked?: string
  marketType?: MarketType
  timeframeKey?: string
  direction?: "buy" | "sell" | "close" | "observe" | string
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
  personalCycle?: PersonalCycle
  reviewText: string
  ocrDraft?: TradeReviewOcrDraft | null
  marketContext?: TradeReviewMarketContext | null
  crossEndStatus?: TradeReviewCrossEndStatusKey
  crossEndStatusText?: TradeReviewCrossEndStatusText
  crossEndStatusSteps?: TradeReviewCrossEndStatusStep[]
  statusUpdatedAt?: string
  createdAt: string
}

export type TradeReviewMarketContextStatus = "ready" | "missing_symbol" | "missing_cache" | "failed" | string

export type TradeReviewMarketContext = {
  schemaVersion: "trade_review_market_context_v1" | string
  status: TradeReviewMarketContextStatus
  marketKey: string
  marketLabel?: string
  timeframeKey: string
  timeframeLabel?: string
  tradeDate: string
  symbolMasked: string
  sourceStatus: string
  positionLabel: string
  dataStart: string
  dataEnd: string
  candleCount: number
  source: string
  rulesSummary: string
  reviewPrompt?: string
  complianceNotice: "仅用于回看当时市场环境与交易心理反应，不构成投资建议。" | string
}

export type TradeReviewOcrStatus =
  | "provider_not_configured"
  | "provider_pending"
  | "pending_confirmation"
  | "confirmed"
  | "failed"
  | string

export type TradeReviewOcrDraft = {
  id: string
  userId?: string
  status: TradeReviewOcrStatus
  provider: string
  confidence: number
  needsUserConfirmation: boolean
  fields: {
    tradeDate: string
    marketType: string
    marketKey?: string
    timeframeKey?: string
    symbol: string
    rawText?: string
  }
  message: string
  complianceNotice: "本内容仅用于交易心理复盘与行为训练，不构成投资建议。" | string
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
  mirrorSpectrum?: MirrorSpectrumEntry[]
  thiefCounts: ThiefCountMap
  growthTrend: LivingMirrorTrendPoint[]
  trainingCompletionRate: number
  loopRelapseCount: number
  conscienceGrowth: number
  heartMirrorTree?: HeartMirrorTree
  lastSignals?: LivingMirrorGrowthSignal[]
  dailyHeartWitness?: DailyHeartWitness
  latestPersonalCycle?: PersonalCycle
  zhixingStability?: ZhixingStability
  tripleReflection?: TripleReflection
  lastUpdated: string
}

export type LivingMirrorProfileSourceRow = {
  key: "assessment" | "kline" | "trade" | string
  name: "九镜测评" | "K线盲练" | "真实复盘" | string
  mirror: MirrorName | string
  statusText: string
  sourceId?: string
}

export type LivingMirrorProfile = {
  schemaVersion: "living_mirror_profile_v1" | string
  userId: string
  currentMainMirror: MirrorName | string
  currentStage: string
  sources: LivingMirrorProfileSourceRow[]
  tripleReflection: TripleReflection
  marketContexts: TradeReviewMarketContext[]
  latestMarketContext: TradeReviewMarketContext | null
  trainingFocus: string
  sourceCounts: {
    assessment: number
    klineBlind: number
    tradeReview: number
  }
  updatedAt: string
  complianceNotice: "本画像仅用于交易心理觉察、复盘训练与行为管理，不构成投资建议。" | string
}

export type ZhixingStabilityDimensionKey =
  | "planClarity"
  | "boundaryExecution"
  | "intradayStability"
  | "reviewCompletion"
  | "trainingCompletion"
  | string

export type ZhixingStabilityDimension = {
  key: ZhixingStabilityDimensionKey
  name: "计划清晰度" | "边界执行度" | "临盘稳定度" | "复盘完成度" | "训练完成度" | string
  score: number
  scoreText: string
  level: string
  sourceText: string
  hint: string
  hasData: boolean
}

export type ZhixingStability = {
  version: "zhixing-stability-v1" | string
  title: "知行稳定度" | string
  total: number
  totalText: string
  level: string
  summary: string
  dimensions: ZhixingStabilityDimension[]
  sourceCounts: {
    tradeReviewCount: number
    klineBlindCount: number
    klineMindCount: number
    trainingDayCount: number
  }
  riskLine: string
  improvementLine: string
  updatedAt: string | number
}

export type TripleReflectionState = "empty" | "insufficient" | "aligned" | "partial" | "conflict" | string

export type TripleReflectionRow = {
  key: "assessment" | "kline" | "trade" | string
  name: "九镜测评" | "K线盲练" | "真实交易记录" | "真实记录" | string
  mirror: MirrorName | string
  statusText: string
}

export type TripleReflectionSourceSummary = {
  key: "assessment" | "kline" | "trade" | string
  name: string
  mirror?: MirrorName | string
  statusText: string
}

export type TripleReflection = {
  version: "triple-reflection-v1" | string
  title: "三证互照" | string
  state: TripleReflectionState
  stateLabel: string
  mainMirror: MirrorName | string
  rows: TripleReflectionRow[]
  conclusion: string
  unifiedConclusion?: string
  proofLine?: string
  evidenceLevel?: "empty" | "insufficient" | "medium" | "strong" | "calibration" | string
  evidenceLevelText?: string
  matchedSources?: TripleReflectionSourceSummary[]
  conflictSources?: TripleReflectionSourceSummary[]
  missingSources?: TripleReflectionSourceSummary[]
  nextCalibration?: string
  prescription: string
  updatedAt: string | number
}

export type TrainingPrescriptionStep = {
  key: string
  label: string
  action: string
  completed?: boolean
}

export type TrainingPrescriptionKLinePractice = {
  marketKey: string
  timeframeKey: string
  symbolMasked?: string
  actionText: string
  reason: string
}

export type TrainingPrescriptionDispatch = {
  schemaVersion: "training_prescription_v1" | string
  id: string
  userId: string
  source: SourcePlatform
  status: "ready" | "dispatched" | "received" | string
  day: number
  mirror: MirrorName | string
  title: string
  reason: string
  action: string
  reflectionPrompt: string
  klinePractice?: TrainingPrescriptionKLinePractice
  steps: TrainingPrescriptionStep[]
  sourceProfile?: {
    currentMainMirror?: MirrorName | string
    evidenceLevelText?: string
    proofLine?: string
  }
  createdAt: string
  dispatchedAt?: string
  receivedAt?: string
  complianceNotice: "本处方仅用于交易心理训练与复盘管理，不构成投资建议。" | string
}

export type LivingMirrorGrowthProfile = {
  schemaVersion: "living_mirror_growth_profile_v1"
  growth_profile_id: string
  growthProfileId?: string
  userId?: string
  anonymousId: string
  reportId?: string
  primaryPersona: string
  secondaryPersona: string
  highFrequencyThought: {
    label: string
    count: number
    evidenceIds: string[]
  }
  repeatedBehaviors: Array<{
    label: string
    count: number
    evidenceIds: string[]
  }>
  affectedDimensions: Array<{
    label: string
    weight: number
    sourceTypes: string[]
    evidenceIds: string[]
  }>
  trainingContinuity: {
    completedDays: number
    totalDays: number
    currentStreak: number
    heartProofCount: number
    tradeReviewCount: number
    behaviorLoopCount?: number
    retestChangeCount: number
    statusText: string
  }
  heartProofCount?: number
  tradeReviewCount?: number
  retestSummary?: string
  nextCycleFocus?: string
  mirrorLifeStage: {
    key: string
    title: string
    treeStage: string
    growthLevel: number
    description: string
    nextActionText: string
  }
  complianceText: "本成长谱仅用于交易心理觉察、复盘训练与行为管理，不构成投资建议。" | string
  updatedAt: string
}

export type BehaviorLoopEvidenceSource = {
  sourceType: "trade_review" | "heart_proof" | "daily_growth" | "mirror_report" | string
  sourceId: string
  label: string
  createdAt: string
}

export type BehaviorLoop = {
  id: string
  behavior_loop_id: string
  behaviorLoopId?: string
  userId?: string
  anonymousId: string
  sourceType: "trade_review" | "heart_proof" | "daily_growth" | "mirror_report" | string
  sourceId: string
  sourceMirror: MirrorName | string
  trigger: string
  thought: string
  action: string
  result: string
  selfStory: string
  repeatCount: number
  affectedDimensions: string[]
  repeatRisk: string
  loopBreakAction: string
  evidenceSources: BehaviorLoopEvidenceSource[]
  complianceText: "仅用于交易行为复盘与心理训练，不构成任何投资建议。" | string
  createdAt: string
  updatedAt: string
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
  dailyHeartWitnesses?: DailyHeartWitness[]
  personalCycles?: PersonalCycle[]
  retestChanges?: RetestChange[]
  retestReports: MirrorReport[]
  inviteCode?: string
  shareCards?: ShareCardSnapshot[]
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
