import adminMockUsers from "./admin-mock-data.json"

export const adminAssistantStatuses = ["待承接", "已承接", "待复盘", "已完成"] as const
export type AdminAssistantStatus = (typeof adminAssistantStatuses)[number]
export type AdminUserSortKey = "assessment_desc" | "assessment_asc" | "assistant_priority" | "training_progress"

export type AdminAssistantHandoff = {
  status: AdminAssistantStatus
  owner: string
  handoffAt: string
  note: string
}

export type AdminUserFilters = {
  q: string
  assistantStatus: string
  trainingStatus: string
  riskLabel: string
  inviteSource: string
  sort: AdminUserSortKey
}

export type AdminAssistantSummary = {
  phone: string
  primaryType: string
  secondaryType: string
  riskLabel: string
  riskValue: number
  trainingCamp: string
  priority: string
  focus: string
  script: string
  created_at: string
}

export type AdminFeishuSync = {
  status: string
  target?: string
  synced_at?: string
  error?: string
}

export type AdminShareCard = {
  id: string
  primaryType: string
  secondaryType: string
  riskLabel: string
  inviteCode: string
  shareUrl: string
  created_at: string
}

export type AdminLivingMirrorStats = {
  mirrorScores: Record<string, number>
  thiefCounts: Record<string, number>
  trainingCompletionRate: number
  loopRelapseCount: number
  conscienceGrowth: number
  lastUpdated: string
}

export type AdminTradeReview = {
  id: string
  tradeDate: string
  detectedMirror: string
  strongestThought: string
  reviewText: string
  behaviorTags: string[]
  createdAt: string
}

export type AdminInviteSourceStats = {
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

export type AdminTrainingRecord = {
  day: string
  date: string
  status: "已完成" | "进行中" | "未开始" | "未完成"
  action: string
  reflection: string
  reflectionFinal?: string
}

export type AdminKLineRecord = {
  day: string
  date: string
  scene: string
  reaction: string
  disciplineAction: string
}

export type AdminRetestRadarChange = {
  key: string
  label: string
  before: number
  after: number
  delta: number
}

export type AdminRetestChange = {
  before: string
  after: string
  changeNote: string
}

export type AdminReport = {
  title: string
  heartThief: string
  summary: string
  yangmingReminder: string
  trainingDirection: string
}

export type AdminUserRecord = {
  id: string
  phone: string
  assessmentTime: string
  primaryType: string
  secondaryType: string
  riskLabel: string
  campSuggestion: string
  trainingStatus: string
  inviteSource: string
  assistant: AdminAssistantHandoff
  assistantSummary?: AdminAssistantSummary | null
  feishuSync?: AdminFeishuSync | null
  shareCard?: AdminShareCard | null
  livingMirrorStats?: AdminLivingMirrorStats | null
  tradeReviews?: AdminTradeReview[]
  report: AdminReport
  trainingRecords: AdminTrainingRecord[]
  klineRecords?: AdminKLineRecord[]
  retestComparisons?: AdminRetestRadarChange[]
  retestChange: AdminRetestChange
}

export const adminUsers = adminMockUsers as AdminUserRecord[]

export const adminApiEndpoints = [
  "POST /api/v1/data-binding/assessment-report",
  "GET /api/v1/data-binding/users/:user_id/report",
  "POST /api/v1/data-binding/users/:user_id/training-records",
  "POST /api/v1/data-binding/users/:user_id/kline-records",
  "POST /api/v1/data-binding/users/:user_id/trade-reviews",
  "POST /api/v1/data-binding/users/:user_id/retests",
  "GET /api/v1/data-binding/users/:user_id/retest-comparison",
  "GET|POST /api/v1/data-binding/users/:user_id/training-prescription",
  "GET /api/v1/admin/users",
  "GET /api/v1/admin/users/:user_id",
  "POST /api/v1/admin/users/:user_id/assistant-handoff",
  "POST /api/v1/admin/users/:user_id/feishu-sync",
  "GET /api/v1/admin/invite-sources",
  "GET|POST /api/v1/data-binding/users/:user_id/share-card",
]

export function getAdminUsers() {
  return adminUsers
}

export function getAdminUserById(id: string) {
  return adminUsers.find((user) => user.id === id)
}

export function getAdminSummary(users: AdminUserRecord[] = adminUsers) {
  return {
    totalUsers: users.length,
    pendingHandoff: users.filter((user) => user.assistant.status === "待承接").length,
    handedOff: users.filter((user) => user.assistant.status !== "待承接").length,
    pendingReview: users.filter((user) => user.assistant.status === "待复盘").length,
    completedHandoff: users.filter((user) => user.assistant.status === "已完成").length,
    inTraining: users.filter((user) => user.trainingRecords.length > 0).length,
    pendingTraining: users.filter((user) => user.trainingRecords.length === 0).length,
  }
}

export function normalizeAdminFilters(searchParams: Record<string, string | string[] | undefined> = {}): AdminUserFilters {
  const sort = getSingleParam(searchParams.sort)

  return {
    q: getSingleParam(searchParams.q).slice(0, 60),
    assistantStatus: getSingleParam(searchParams.assistant_status),
    trainingStatus: getSingleParam(searchParams.training_status),
    riskLabel: getSingleParam(searchParams.risk_label),
    inviteSource: getSingleParam(searchParams.invite_source),
    sort: isAdminSortKey(sort) ? sort : "assessment_desc",
  }
}

export function getAdminFilterOptions(users: AdminUserRecord[]) {
  return {
    assistantStatuses: adminAssistantStatuses,
    trainingStatuses: uniqueSorted(users.map((user) => user.trainingStatus)),
    riskLabels: uniqueSorted(users.map((user) => user.riskLabel)),
    inviteSources: uniqueSorted(users.map((user) => user.inviteSource)),
  }
}

export function filterAdminUsers(users: AdminUserRecord[], filters: AdminUserFilters) {
  const q = filters.q.trim().toLowerCase()

  return users
    .filter((user) => {
      const searchable = [
        user.phone,
        user.primaryType,
        user.secondaryType,
        user.riskLabel,
        user.campSuggestion,
        user.trainingStatus,
        ...(user.klineRecords || []).map((record) => `${record.scene} ${record.reaction} ${record.disciplineAction}`),
        ...(user.retestComparisons || []).map((record) => `${record.label} ${record.before} ${record.after} ${record.delta}`),
        user.inviteSource,
        user.assistant.status,
        user.assistant.owner,
      ].join(" ").toLowerCase()

      if (q && !searchable.includes(q)) return false
      if (filters.assistantStatus && user.assistant.status !== filters.assistantStatus) return false
      if (filters.trainingStatus && user.trainingStatus !== filters.trainingStatus) return false
      if (filters.riskLabel && user.riskLabel !== filters.riskLabel) return false
      if (filters.inviteSource && user.inviteSource !== filters.inviteSource) return false
      return true
    })
    .sort((left, right) => compareAdminUsers(left, right, filters.sort))
}

export function getAdminFollowUp(user: AdminUserRecord) {
  if (user.assistant.status === "待承接") {
    return {
      label: "优先承接",
      reason: user.trainingRecords.length ? "已开始训练但仍未分配助教" : "完成测评后尚未承接",
      score: 400,
    }
  }

  if (user.assistant.status === "待复盘") {
    return {
      label: "等待复盘",
      reason: "助教已承接，需要查看训练记录与复测变化",
      score: 320,
    }
  }

  if (user.trainingRecords.length === 0) {
    return {
      label: "启动训练",
      reason: "已承接但七日训练尚未开始",
      score: 260,
    }
  }

  if (user.assistant.status === "已完成") {
    return {
      label: "阶段完成",
      reason: "本轮承接已完成，后续观察复测变化",
      score: 80,
    }
  }

  return {
    label: "持续跟进",
    reason: "观察每日训练、K 线记录与复测变化",
    score: 180,
  }
}

export async function getAdminUsersForPage() {
  const remoteUsers = await fetchAdminUsers()

  if (remoteUsers.length) {
    return {
      users: remoteUsers,
      source: "server-api" as const,
    }
  }

  return {
    users: getAdminUsers(),
    source: "local-mock" as const,
  }
}

export async function getAdminInviteSourcesForPage() {
  const remoteInviteSources = await fetchAdminInviteSources()

  if (remoteInviteSources.length) {
    return {
      inviteSources: remoteInviteSources,
      source: "server-api" as const,
    }
  }

  return {
    inviteSources: buildMockInviteSources(adminUsers),
    source: "local-mock" as const,
  }
}

export async function getAdminUserByIdForPage(id: string) {
  const remoteUser = await fetchAdminUserById(id)
  if (remoteUser) return { user: remoteUser, source: "server-api" as const }

  return {
    user: getAdminUserById(id),
    source: "local-mock" as const,
  }
}

async function fetchAdminUsers() {
  const data = await fetchAdminJson<{ users?: AdminUserRecord[] }>("/api/v1/admin/users")
  return Array.isArray(data?.users) ? data.users : []
}

async function fetchAdminUserById(id: string) {
  const data = await fetchAdminJson<{ user?: AdminUserRecord }>(`/api/v1/admin/users/${encodeURIComponent(id)}`)
  return data?.user
}

async function fetchAdminInviteSources() {
  const data = await fetchAdminJson<{ inviteSources?: AdminInviteSourceStats[] }>("/api/v1/admin/invite-sources")
  return Array.isArray(data?.inviteSources) ? data.inviteSources : []
}

function buildMockInviteSources(users: AdminUserRecord[]): AdminInviteSourceStats[] {
  const groups = new Map<string, AdminInviteSourceStats>()

  users.forEach((user) => {
    const source = user.inviteSource || "未标记来源"
    const existing = groups.get(source) || {
      source,
      sourceChannel: source,
      userCount: 0,
      assessmentCount: 0,
      trainingStartedCount: 0,
      trainingCompletedCount: 0,
      retestCount: 0,
      assistantHandoffCount: 0,
      shareCardCount: 0,
      lastAssessmentAt: "",
      topPrimaryTypes: [],
      note: "本地 mock 仅用于后台预览，不做收益归因。",
    }
    existing.userCount += 1
    existing.assessmentCount += user.assessmentTime ? 1 : 0
    existing.trainingStartedCount += user.trainingRecords.length > 0 ? 1 : 0
    existing.trainingCompletedCount += user.trainingRecords.length >= 7 ? 1 : 0
    existing.assistantHandoffCount += user.assistant.status !== "待承接" ? 1 : 0
    existing.lastAssessmentAt = latestTime(existing.lastAssessmentAt, user.assessmentTime)
    existing.topPrimaryTypes = mergePrimaryType(existing.topPrimaryTypes, user.primaryType)
    groups.set(source, existing)
  })

  return Array.from(groups.values()).sort((a, b) => b.assessmentCount - a.assessmentCount)
}

function mergePrimaryType(items: Array<{ label: string; count: number }>, label: string) {
  const next = [...items]
  const existing = next.find((item) => item.label === label)
  if (existing) existing.count += 1
  else next.push({ label, count: 1 })
  return next.sort((a, b) => b.count - a.count).slice(0, 3)
}

function latestTime(left: string, right: string) {
  if (!right) return left
  if (!left) return right
  return new Date(right).getTime() > new Date(left).getTime() ? right : left
}

function compareAdminUsers(left: AdminUserRecord, right: AdminUserRecord, sort: AdminUserSortKey) {
  if (sort === "assessment_asc") return adminTimeValue(left.assessmentTime) - adminTimeValue(right.assessmentTime)
  if (sort === "assistant_priority") return getAdminFollowUp(right).score - getAdminFollowUp(left).score || adminTimeValue(right.assessmentTime) - adminTimeValue(left.assessmentTime)
  if (sort === "training_progress") return trainingProgressValue(right) - trainingProgressValue(left) || adminTimeValue(right.assessmentTime) - adminTimeValue(left.assessmentTime)
  return adminTimeValue(right.assessmentTime) - adminTimeValue(left.assessmentTime)
}

function trainingProgressValue(user: AdminUserRecord) {
  const match = user.trainingStatus.match(/第\s*(\d+)/)
  return match ? Number(match[1]) : user.trainingRecords.length
}

function adminTimeValue(value: string) {
  return new Date(value.replace(" ", "T")).getTime() || 0
}

function getSingleParam(value: string | string[] | undefined) {
  return String(Array.isArray(value) ? value[0] || "" : value || "").trim()
}

function isAdminSortKey(value: string): value is AdminUserSortKey {
  return value === "assessment_desc" || value === "assessment_asc" || value === "assistant_priority" || value === "training_progress"
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN"))
}

async function fetchAdminJson<T>(path: string): Promise<T | null> {
  const baseUrl = getAdminApiBaseUrl()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 450)

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      signal: controller.signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || data?.ok === false) return null
    return data as T
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function getAdminApiBaseUrl() {
  return (process.env.YM_API_BASE_URL || process.env.NEXT_PUBLIC_YM_API_BASE_URL || "http://127.0.0.1:8787").replace(/\/$/, "")
}
