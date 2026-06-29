import type {
  ArchiveIndex,
  ArchiveItem,
  AssistantHandoff,
  DailyHeartWitness,
  LivingMirrorClosedLoop,
  LivingMirrorProfile,
  LivingMirrorStats,
  MirrorArchive,
  MirrorReport,
  PersonalCycle,
  RetestChange,
  ShareCardSnapshot,
  TrainingPrescriptionDispatch,
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

export type DataBindingKLineSamplingResult = {
  segmentId?: string
  segment_id?: string
  trainingPackId?: string
  training_pack_id?: string
  errorType?: string
  error_type?: string
  sceneTags?: string[]
  scene_tags?: string[]
  symbol?: string
  name?: string
  period?: string
  startDate?: string
  start_date?: string
  endDate?: string
  end_date?: string
  fallbackUsed?: boolean
  fallback_used?: boolean
  fallbackReason?: string
  fallback_reason?: string
  source?: string
}

export type DataBindingKLineRecord = {
  day?: number
  recordedAt?: string
  sceneKey?: string
  reactionKey?: string
  sourceType?: string
  source_type?: string
  errorType?: string
  error_type?: string
  sceneTags?: string[]
  scene_tags?: string[]
  trainingPackId?: string
  training_pack_id?: string
  segmentId?: string
  segment_id?: string
  samplingResult?: DataBindingKLineSamplingResult
  sampling_result?: DataBindingKLineSamplingResult
  fallbackUsed?: boolean
  fallback_used?: boolean
  fallbackReason?: string
  fallback_reason?: string
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
  trainingPrescription?: unknown
  training_prescription?: unknown
  executionResult?: string
  execution_result?: string
  repeatCount?: number
  repeat_count?: number
  trainingMistakeCard?: unknown
  training_mistake_card?: unknown
}

export type DataBindingTrainingBookmarkType = "session" | "action" | "mistake_card" | string

export type DataBindingTrainingBookmarkSourceType =
  | "review_focus"
  | "special_training"
  | "custom_session"
  | "basic_blind"
  | string

export type DataBindingTrainingBookmark = {
  id: string
  userId: string
  user_id: string
  bookmarkType: DataBindingTrainingBookmarkType
  bookmark_type: DataBindingTrainingBookmarkType
  sessionId?: string
  session_id?: string
  actionId?: string
  action_id?: string
  barIndex?: number
  bar_index?: number
  sourceType?: DataBindingTrainingBookmarkSourceType
  source_type?: DataBindingTrainingBookmarkSourceType
  errorType?: string
  error_type?: string
  sceneTags?: string[]
  scene_tags?: string[]
  executionResult?: string
  execution_result?: string
  segmentId?: string
  segment_id?: string
  trainingPackId?: string
  training_pack_id?: string
  samplingResult?: DataBindingKLineSamplingResult
  sampling_result?: DataBindingKLineSamplingResult
  symbol?: string
  period?: string
  startDate?: string
  start_date?: string
  endDate?: string
  end_date?: string
  title: string
  note?: string
  enabled: boolean
  createdAt: string
  created_at: string
  updatedAt: string
  updated_at: string
}

export type DataBindingTrainingBookmarkPayload = {
  id?: string
  user?: DataBindingUserProfile
  bookmarkType?: DataBindingTrainingBookmarkType
  bookmark_type?: DataBindingTrainingBookmarkType
  sessionId?: string
  session_id?: string
  actionId?: string
  action_id?: string
  barIndex?: number
  bar_index?: number
  sourceType?: DataBindingTrainingBookmarkSourceType
  source_type?: DataBindingTrainingBookmarkSourceType
  errorType?: string
  error_type?: string
  sceneTags?: string[]
  scene_tags?: string[]
  executionResult?: string
  execution_result?: string
  segmentId?: string
  segment_id?: string
  trainingPackId?: string
  training_pack_id?: string
  samplingResult?: DataBindingKLineSamplingResult
  sampling_result?: DataBindingKLineSamplingResult
  symbol?: string
  period?: string
  startDate?: string
  start_date?: string
  endDate?: string
  end_date?: string
  title?: string
  note?: string
  enabled?: boolean
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

export type DataBindingTrainingBookmarkRequest = {
  user?: DataBindingUserProfile
  bookmark?: DataBindingTrainingBookmarkPayload
  trainingBookmark?: DataBindingTrainingBookmarkPayload
  training_bookmark?: DataBindingTrainingBookmarkPayload
} & DataBindingTrainingBookmarkPayload

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
  living_mirror_profile?: LivingMirrorProfile
  training_prescription?: TrainingPrescriptionDispatch | null
  living_mirror_loop?: LivingMirrorClosedLoop
  admin_user: DataBindingAdminUser
}

export type DataBindingTrainingResponse = {
  user: DataBindingPublicUser
  record: DataBindingTrainingRecord
  living_mirror_stats: LivingMirrorStats
  living_mirror_profile?: LivingMirrorProfile
  training_prescription?: TrainingPrescriptionDispatch | null
  daily_heart_witness?: DailyHeartWitness
  admin_user: DataBindingAdminUser
}

export type DataBindingKLineResponse = {
  user: DataBindingPublicUser
  record: DataBindingKLineRecord
  living_mirror_stats: LivingMirrorStats
  living_mirror_profile?: LivingMirrorProfile
  training_prescription?: TrainingPrescriptionDispatch | null
  personal_cycle?: PersonalCycle
  admin_user: DataBindingAdminUser
}

export type DataBindingTrainingBookmarkResponse = {
  user: DataBindingPublicUser
  training_bookmark: DataBindingTrainingBookmark
  trainingBookmark: DataBindingTrainingBookmark
}

export type DataBindingTrainingBookmarkListResponse = {
  user: DataBindingPublicUser
  training_bookmarks: DataBindingTrainingBookmark[]
  trainingBookmarks: DataBindingTrainingBookmark[]
  count: number
  include_disabled: boolean
  includeDisabled: boolean
}

export type DashboardRange = "7d" | "30d" | "90d" | string

export type DashboardCountItem = {
  key: string
  label: string
  count: number
}

export type DashboardDataGap = {
  type: string
  key?: string
  label: string
  message: string
}

export type DashboardOverview = {
  tradeReviewCount: number
  trade_review_count: number
  klineTrainingCount: number
  kline_training_count: number
  trainingBookmarkCount: number
  training_bookmark_count: number
  interventionEventCount: number
  intervention_event_count: number
  executionPlanCount: number
  execution_plan_count: number
  activeDays: number
  active_days: number
}

export type DashboardExecutionSummary = {
  alignedCount: number
  aligned_count: number
  deviatedCount: number
  deviated_count: number
  unclearCount: number
  unclear_count: number
  sampleCount: number
  sample_count: number
  consistencyRate: number | null
  consistency_rate: number | null
  label: string
}

export type DashboardMistakeSummary = {
  topErrorTypes: DashboardCountItem[]
  top_error_types: DashboardCountItem[]
  totalMistakeCount: number
  total_mistake_count: number
}

export type DashboardFirstThoughtSummary = {
  topFirstThoughts: DashboardCountItem[]
  top_first_thoughts: DashboardCountItem[]
}

export type DashboardTriggerSceneSummary = {
  topTriggerScenes: DashboardCountItem[]
  top_trigger_scenes: DashboardCountItem[]
}

export type DashboardTrainingSummary = {
  bySourceType: DashboardCountItem[]
  by_source_type: DashboardCountItem[]
  byTrainingPack: DashboardCountItem[]
  by_training_pack: DashboardCountItem[]
  bySegment: DashboardCountItem[]
  by_segment: DashboardCountItem[]
  fallbackCount: number
  fallback_count: number
  samplingCount: number
  sampling_count: number
  customSessionCount: number
  custom_session_count: number
}

export type DashboardBookmarkSummary = {
  totalCount: number
  total_count: number
  byType: DashboardCountItem[]
  by_type: DashboardCountItem[]
  latestItems: ArchiveItem[]
  latest_items: ArchiveItem[]
}

export type DashboardInterventionSummary = {
  totalCount: number
  total_count: number
  byTriggerType: DashboardCountItem[]
  by_trigger_type: DashboardCountItem[]
  byUserResponse: DashboardCountItem[]
  by_user_response: DashboardCountItem[]
}

export type DashboardExecutionPlanSummary = {
  totalCount: number
  total_count: number
  enabledCount: number
  enabled_count: number
  byErrorType: DashboardCountItem[]
  by_error_type: DashboardCountItem[]
}

export type DashboardArchiveSummary = {
  totalCount: number
  total_count: number
  byType: Record<string, number>
  by_type: Record<string, number>
}

export type DashboardTrendBucket = {
  key: string
  date?: string
  weekStart?: string
  week_start?: string
  tradeReviewCount: number
  trade_review_count: number
  klineTrainingCount: number
  kline_training_count: number
  trainingBookmarkCount: number
  training_bookmark_count: number
  executionSampleCount: number
  execution_sample_count: number
  consistencyRate: number | null
  consistency_rate: number | null
}

export type DashboardTrendSummary = {
  daily: DashboardTrendBucket[]
  weekly: DashboardTrendBucket[]
  executionConsistencyTrend: DashboardTrendBucket[]
  execution_consistency_trend: DashboardTrendBucket[]
  mistakeTrend: DashboardCountItem[]
  mistake_trend: DashboardCountItem[]
  trainingTrend: DashboardCountItem[]
  training_trend: DashboardCountItem[]
}

export type DashboardSummary = {
  schemaVersion: "dashboard_summary_v1" | string
  schema_version: "dashboard_summary_v1" | string
  userId: string
  user_id: string
  range: DashboardRange
  dateFrom: string
  date_from: string
  dateTo: string
  date_to: string
  generatedAt: string
  generated_at: string
  overview: DashboardOverview
  execution: DashboardExecutionSummary
  mistakes: DashboardMistakeSummary
  firstThoughts: DashboardFirstThoughtSummary
  first_thoughts: DashboardFirstThoughtSummary
  triggerScenes: DashboardTriggerSceneSummary
  trigger_scenes: DashboardTriggerSceneSummary
  training: DashboardTrainingSummary
  bookmarks: DashboardBookmarkSummary
  interventions: DashboardInterventionSummary
  executionPlans: DashboardExecutionPlanSummary
  execution_plans: DashboardExecutionPlanSummary
  archive: DashboardArchiveSummary
  trends: DashboardTrendSummary
  dataGaps: DashboardDataGap[]
  data_gaps: DashboardDataGap[]
}

export type DashboardSummaryResponse = {
  user: DataBindingPublicUser
  dashboard_summary: DashboardSummary
  dashboardSummary: DashboardSummary
}

export type WeeklyMirrorSummary = {
  schemaVersion: "weekly_mirror_summary_v1" | string
  schema_version: "weekly_mirror_summary_v1" | string
  userId: string
  user_id: string
  weekStart: string
  week_start: string
  weekEnd: string
  week_end: string
  generatedAt: string
  generated_at: string
  topErrorTypes: DashboardCountItem[]
  top_error_types: DashboardCountItem[]
  topFirstThoughts: DashboardCountItem[]
  top_first_thoughts: DashboardCountItem[]
  topTriggerScenes: DashboardCountItem[]
  top_trigger_scenes: DashboardCountItem[]
  executionConsistency: DashboardExecutionSummary
  execution_consistency: DashboardExecutionSummary
  repeatCount: number
  repeat_count: number
  trainingCount: number
  training_count: number
  tradeReviewCount: number
  trade_review_count: number
  bookmarkCount: number
  bookmark_count: number
  progressHighlights: string[]
  progress_highlights: string[]
  nextWeekTrainingPlan: string[]
  next_week_training_plan: string[]
  dataGaps: DashboardDataGap[]
  data_gaps: DashboardDataGap[]
}

export type WeeklyMirrorSummaryResponse = {
  user: DataBindingPublicUser
  weekly_mirror_summary: WeeklyMirrorSummary
  weeklyMirrorSummary: WeeklyMirrorSummary
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
  living_mirror_profile?: LivingMirrorProfile
  training_prescription?: TrainingPrescriptionDispatch | null
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
  training_bookmarks: DataBindingTrainingBookmark[]
  trainingBookmarks: DataBindingTrainingBookmark[]
  trade_reviews: TradeReview[]
  living_mirror_stats: LivingMirrorStats | null
  living_mirror_profile: LivingMirrorProfile | null
  training_prescription: TrainingPrescriptionDispatch | null
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
  archive_index?: ArchiveIndex
  archiveIndex?: ArchiveIndex
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
    crossEndStatus?: string
    crossEndStatusText?: string
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
  living_mirror_profile: LivingMirrorProfile
  training_prescription?: TrainingPrescriptionDispatch | null
  personal_cycle?: PersonalCycle
  admin_user: DataBindingAdminUser
}

export type DataBindingTrainingPrescriptionResponse = {
  user: DataBindingPublicUser
  training_prescription: TrainingPrescriptionDispatch
  living_mirror_profile?: LivingMirrorProfile | null
  admin_user?: DataBindingAdminUser
}

export type DataBindingShareCardResponse = {
  user?: DataBindingPublicUser
  share_card: DataBindingShareCard
}

export type DataBindingInviteSourceStatsResponse = {
  inviteSources: DataBindingInviteSourceStats[]
}
