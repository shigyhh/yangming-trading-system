import type {
  AssistantHandoff,
  DailyHeartWitness,
  LivingMirrorClosedLoop,
  LivingMirrorStats,
  MirrorArchive,
  MirrorReport,
  PersonalCycle,
  RetestChange,
  ShareCardSnapshot,
  TradeReview,
} from "./living-mirror"

export type DataBindingRiskRadarItem = {
  key: string
  label: string
  value: number
  description?: string
}

export type DataBindingTypeProfile = {
  key: string
  label: string
  poeticName?: string
  summary?: string
  risk?: string
  training?: string
  score?: number
}

export type DataBindingAssessmentReport = {
  schemaVersion?: "assessment_report_v1" | string
  reportId?: string
  userId?: string
  createdAt: string
  conclusion?: string
  totalQuestions?: number
  answeredCount?: number
  primaryPersonality?: {
    type: string
    label: string
    poeticName?: string
    summary: string
    score: number
  }
  secondaryPersonality?: {
    type: string
    label: string
    poeticName?: string
    summary: string
    score: number
  }
  primaryType: DataBindingTypeProfile
  secondaryType: DataBindingTypeProfile
  riskRadar: DataBindingRiskRadarItem[]
  emotionalTriggers?: Array<{
    key: string
    label: string
    description: string
    firstThought?: string
  }>
  trainingPrescription7Days?: Array<{
    day: number
    theme: string
    action: string
    reflectionPrompt: string
  }>
  campSuggestion?: {
    name: string
    reason: string
    focus: string
  }
  complianceNotice?: string
  metadata?: {
    source?: string
    assessmentVersion?: string
    scoringVersion?: string
    contentVersion?: string
  }
  firstThought?: string
  firstThoughtDisplay?: string
  trainingDirection: string
  disclaimer: string
  scores?: Record<string, number>
}

export type DataBindingUserProfile = {
  userId: string
  maskedPhone: string
  phoneTail?: string
  nickname?: string
  inviteSource?: string
  sourceChannel?: string
}

export type DataBindingPublicUser = {
  id: string
  merged_ids?: string[]
  phone: string
  phone_tail?: string
  nickname?: string
  invite_source?: string
  source_channel?: string
  created_at?: string
  updated_at?: string
}

export type DataBindingTrainingRecord = {
  day: number
  dateKey?: string
  title: string
  note: string
  actions?: string[]
  status?: "completed" | "missed"
  recordedAt?: string
  checkIn?: "preparing_trade" | "observe_only" | "already_traded" | string
  cultivationText?: string
}

export type DataBindingKLineRecord = {
  day?: number
  recordedAt?: string
  sceneKey?: string
  reactionKey?: string
  scene: string
  reaction: string
  disciplineAction: string
  feedback?: string
  reactionTimeMs?: number
  processScores?: {
    planExecution: number
    boundaryKeeping: number
    impulseDelay: number
    emotionalStability: number
    reviewCompletion: number
  }
  processInsight?: string
  trainingSuggestion?: string
}

export type DataBindingRetestComparison = {
  key: string
  label: string
  before: number
  after: number
  delta: number
}

export type DataBindingAssistantSummary = {
  phone: string
  primaryType: string
  secondaryType: string
  riskLabel: string
  riskValue: number
  trainingCamp: string
  priority: "优先承接" | "常规跟进" | "自训练观察" | string
  focus: string
  script: string
  created_at: string
}

export type DataBindingAssistantStatus = "待承接" | "已承接" | "待复盘" | "已完成"

export type DataBindingAssistantHandoff = {
  status: DataBindingAssistantStatus
  owner: string
  handoffAt: string
  note: string
}

export type DataBindingAssistantHandoffPayload = {
  status?: DataBindingAssistantStatus
  owner?: string
  note?: string
  handoffAt?: string
  handoff_at?: string
}

export type DataBindingFeishuSyncState = {
  status: "pending" | "dry_run" | "success" | "failed" | string
  target?: string
  synced_at?: string
  error?: string
}

export type DataBindingShareCard = {
  id: string
  user_id: string
  title: string
  subtitle: string
  conclusion: string
  primaryType: string
  secondaryType: string
  riskLabel: string
  trainingFocus: string
  inviteCode: string
  sourceChannel: string
  channel: string
  cta: string
  shareText: string
  shareUrl: string
  compliance: string
  created_at: string
  updated_at: string
}

export type DataBindingInviteSourceStats = {
  source: string
  sourceChannel: string
  userCount: number
  assessmentCount: number
  trainingStartedCount: number
  trainingCompletedCount: number
  retestCount: number
  assistantHandoffCount: number
  shareCardCount: number
  lastAssessmentAt: string
  topPrimaryTypes: Array<{ label: string; count: number }>
  note: string
}

export type DataBindingAssessmentPayload = {
  user: DataBindingUserProfile
  report: DataBindingAssessmentReport
  answers?: Array<{ questionId: string; optionId: string }>
  questionOrder?: string[]
  source?: "web-next" | "miniprogram" | "admin" | string
}

export type DataBindingTrainingPayload = {
  user: DataBindingUserProfile
  record: DataBindingTrainingRecord
  practiceState?: unknown
  source?: "web-next" | "miniprogram" | "admin" | string
}

export type DataBindingKLinePayload = {
  user: DataBindingUserProfile
  record: DataBindingKLineRecord
  source?: "web-next" | "miniprogram" | "admin" | string
}

export type DataBindingRetestPayload = {
  user: DataBindingUserProfile
  report: DataBindingAssessmentReport
  comparison?: DataBindingRetestComparison[]
  source?: "web-next" | "miniprogram" | "admin" | string
}

export type DataBindingTradeReviewPayload = {
  user: DataBindingUserProfile
  review: TradeReview
  source?: "web-next" | "miniprogram" | "admin" | string
}

export type DataBindingAssessmentResponse = {
  user: DataBindingPublicUser
  report: DataBindingAssessmentReport
  mirror_report: MirrorReport
  living_mirror_stats: LivingMirrorStats
  living_mirror_loop?: LivingMirrorClosedLoop
  admin_user: DataBindingAdminUser
}

export type DataBindingTrainingResponse = {
  user: DataBindingPublicUser
  record: DataBindingTrainingRecord
  living_mirror_stats: LivingMirrorStats
  daily_heart_witness?: DailyHeartWitness
  admin_user: DataBindingAdminUser
}

export type DataBindingKLineResponse = {
  user: DataBindingPublicUser
  record: DataBindingKLineRecord
  living_mirror_stats: LivingMirrorStats
  personal_cycle?: PersonalCycle
  admin_user: DataBindingAdminUser
}

export type DataBindingRetestResponse = {
  user: DataBindingPublicUser
  retest: {
    id: string
    saved_at: string
    source: string
    report: DataBindingAssessmentReport
    comparison: DataBindingRetestComparison[]
  }
  comparison: DataBindingRetestComparison[]
  living_mirror_stats: LivingMirrorStats
  retest_change?: RetestChange
  admin_user: DataBindingAdminUser
}

export type DataBindingShareCardPayload = {
  channel?: string
  source_channel?: string
}

export type DataBindingUserSummaryResponse = {
  user: DataBindingPublicUser
  report: DataBindingAssessmentReport | null
  mirror_report: MirrorReport | null
  training_records: DataBindingTrainingRecord[]
  kline_records: DataBindingKLineRecord[]
  trade_reviews: TradeReview[]
  living_mirror_stats: LivingMirrorStats | null
  living_mirror_loop?: LivingMirrorClosedLoop
  daily_heart_witnesses?: DailyHeartWitness[]
  personal_cycles?: PersonalCycle[]
  retest_changes?: RetestChange[]
  retests: Array<{
    id: string
    saved_at: string
    source: string
    report: DataBindingAssessmentReport
    comparison: DataBindingRetestComparison[]
  }>
  retest_comparison: DataBindingRetestComparison[]
  assistant_summary: DataBindingAssistantSummary | null
  feishu_sync: DataBindingFeishuSyncState | null
  share_card: DataBindingShareCard | null
  share_cards?: ShareCardSnapshot[]
  admin_user?: DataBindingAdminUser
  mirror_archive?: MirrorArchive
}

export type DataBindingFeishuSyncResponse = {
  assistant_summary: DataBindingAssistantSummary | null
  feishu_sync: DataBindingFeishuSyncState | null
  result: {
    sent?: boolean
    dry_run?: boolean
    target?: string
    error?: string
    request_payload?: unknown
  }
}

export type DataBindingAssistantHandoffResponse = {
  user: DataBindingPublicUser
  assistant: DataBindingAssistantHandoff
}

export type DataBindingAdminTrainingRecord = {
  day: string
  date: string
  status: "已完成" | "进行中" | "未开始" | "未完成" | string
  action: string
  reflection: string
}

export type DataBindingAdminKLineRecord = {
  day: string
  date: string
  scene: string
  reaction: string
  disciplineAction: string
}

export type DataBindingAdminRetestComparison = {
  key: string
  label: string
  before: number
  after: number
  delta: number
}

export type DataBindingAdminUser = {
  id: string
  phone: string
  assessmentTime: string
  primaryType: string
  secondaryType: string
  riskLabel: string
  campSuggestion: string
  trainingStatus: string
  inviteSource: string
  assistant: DataBindingAssistantHandoff
  assistantSummary?: DataBindingAssistantSummary | null
  feishuSync?: DataBindingFeishuSyncState | null
  shareCard?: DataBindingShareCard | null
  mirrorReport?: MirrorReport | null
  livingMirrorStats?: LivingMirrorStats | null
  tradeReviews?: Array<{
    id: string
    tradeDate: string
    detectedMirror: string
    strongestThought: string
    reviewText: string
    behaviorTags: string[]
    createdAt: string
  }>
  assistantHandoff?: AssistantHandoff | null
  trainingRecords: DataBindingAdminTrainingRecord[]
  klineRecords: DataBindingAdminKLineRecord[]
  retestComparisons: DataBindingAdminRetestComparison[]
}

export type DataBindingTradeReviewResponse = {
  user: DataBindingPublicUser
  review: TradeReview
  living_mirror_stats: LivingMirrorStats
  personal_cycle?: PersonalCycle
  admin_user: DataBindingAdminUser
}

export type DataBindingShareCardResponse = {
  user?: DataBindingPublicUser
  share_card: DataBindingShareCard
}

export type DataBindingInviteSourceStatsResponse = {
  inviteSources: DataBindingInviteSourceStats[]
}
