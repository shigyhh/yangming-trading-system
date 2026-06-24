import type { AdminUserRecord } from "./admin-data"
import { getAdminFollowUp } from "./admin-data"

export const assistantCandidateDryRunComplianceText =
  "助教承接候选仅用于交易心理训练与行为复盘；本轮只读演练，不发送提醒，不提供投资建议。"

export type AssistantCandidatePriority = "high" | "medium" | "low"

export type AssistantCandidateReasonCode =
  | "pending_handoff"
  | "pending_review"
  | "training_not_started"
  | "training_in_progress"
  | "review_missing"
  | "loop_repeated"

export type AssistantCandidateDryRunItem = {
  candidateId: string
  userId: string
  phoneMasked: string
  assistantStatus: AdminUserRecord["assistant"]["status"]
  priority: AssistantCandidatePriority
  score: number
  focus: string
  candidateReasonCodes: AssistantCandidateReasonCode[]
  reasonText: string
  suggestedNextStep: string
  dryRun: true
  complianceText: string
}

export type AssistantCandidateDryRunResult = {
  generatedAt: string
  totalCandidates: number
  dryRun: true
  candidates: AssistantCandidateDryRunItem[]
  complianceText: string
}

export function buildAssistantCandidateDryRun(
  users: AdminUserRecord[],
  options: { limit?: number; generatedAt?: string } = {},
): AssistantCandidateDryRunResult {
  const generatedAt = options.generatedAt || new Date().toISOString()
  const limit = Math.max(1, options.limit || 6)
  const candidates = users
    .map((user) => buildCandidate(user))
    .filter((candidate): candidate is AssistantCandidateDryRunItem => Boolean(candidate))
    .sort((left, right) => right.score - left.score || left.userId.localeCompare(right.userId))
    .slice(0, limit)

  return {
    generatedAt,
    totalCandidates: candidates.length,
    dryRun: true,
    candidates,
    complianceText: assistantCandidateDryRunComplianceText,
  }
}

function buildCandidate(user: AdminUserRecord): AssistantCandidateDryRunItem | null {
  const candidateReasonCodes = getCandidateReasonCodes(user)
  if (!candidateReasonCodes.length) return null

  const followUp = getAdminFollowUp(user)
  const score = followUp.score + getReasonScore(candidateReasonCodes)

  return {
    candidateId: `assistant_candidate_${user.id}`,
    userId: user.id,
    phoneMasked: maskAdminPhone(user.phone),
    assistantStatus: user.assistant.status,
    priority: getPriority(score),
    score,
    focus: followUp.label,
    candidateReasonCodes,
    reasonText: followUp.reason,
    suggestedNextStep: getSuggestedNextStep(candidateReasonCodes),
    dryRun: true,
    complianceText: assistantCandidateDryRunComplianceText,
  }
}

function getCandidateReasonCodes(user: AdminUserRecord): AssistantCandidateReasonCode[] {
  const codes: AssistantCandidateReasonCode[] = []

  if (user.assistant.status === "待承接") codes.push("pending_handoff")
  if (user.assistant.status === "待复盘") codes.push("pending_review")
  if (user.trainingRecords.length === 0) codes.push("training_not_started")
  if (user.trainingRecords.length > 0 && user.trainingRecords.length < 7) codes.push("training_in_progress")
  if (!(user.tradeReviews || []).length) codes.push("review_missing")
  if ((user.livingMirrorStats?.loopRelapseCount || 0) > 0) codes.push("loop_repeated")

  return codes
}

function getReasonScore(codes: AssistantCandidateReasonCode[]) {
  return codes.reduce((score, code) => {
    if (code === "pending_handoff") return score + 90
    if (code === "pending_review") return score + 70
    if (code === "loop_repeated") return score + 45
    if (code === "review_missing") return score + 35
    if (code === "training_not_started") return score + 30
    if (code === "training_in_progress") return score + 20
    return score
  }, 0)
}

function getPriority(score: number): AssistantCandidatePriority {
  if (score >= 430) return "high"
  if (score >= 300) return "medium"
  return "low"
}

function getSuggestedNextStep(codes: AssistantCandidateReasonCode[]) {
  if (codes.includes("pending_handoff")) return "先分配助教，确认用户最近一次照见记录与训练状态。"
  if (codes.includes("pending_review")) return "先查看训练记录，再引导用户补一笔真实复盘。"
  if (codes.includes("loop_repeated")) return "先看重复念头与行为循环，只做觉察和训练承接。"
  if (codes.includes("training_not_started")) return "先确认是否愿意开启七日训练，不做行情判断。"
  return "先观察今日修行与复盘记录，再决定是否进入人工承接。"
}

function maskAdminPhone(value: string) {
  const digits = value.replace(/\D/g, "")
  if (digits.length >= 7) return `${digits.slice(0, 3)}****${digits.slice(-4)}`
  return "***"
}
